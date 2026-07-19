import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ContextCapsule, DurableMemory, IndexSnapshot, RouteDecision, RunEvent, TaskAnalysis } from "@kerno/contracts";

type EntityKind = "snapshot" | "task" | "capsule" | "memory" | "route" | "outcome" | "run" | "comparison" | "catalog";

export interface StateStore {
  close(): void;
  acquireLease(repositoryId: string, owner: string, ttlMs?: number): boolean;
  releaseLease(repositoryId: string, owner: string): void;
  put(kind: EntityKind, id: string, value: unknown, repositoryId?: string, status?: string): void;
  get<T>(kind: EntityKind, id: string): T | undefined;
  list<T>(kind: EntityKind, repositoryId?: string): T[];
  updateStatus(kind: EntityKind, id: string, status: string): void;
  saveSnapshot(snapshot: IndexSnapshot): void;
  latestSnapshot(repositoryId: string): IndexSnapshot | undefined;
  snapshots(repositoryId: string): IndexSnapshot[];
  saveTask(task: TaskAnalysis): void;
  task(id: string): TaskAnalysis | undefined;
  saveCapsule(capsule: ContextCapsule, repositoryId: string): void;
  capsule(id: string): ContextCapsule | undefined;
  capsules(repositoryId: string): ContextCapsule[];
  saveMemory(memory: DurableMemory): void;
  memories(repositoryId: string): DurableMemory[];
  saveRoute(route: RouteDecision, repositoryId: string): void;
  saveCatalog(id: string, models: unknown): void;
  catalog<T>(id: string): T | undefined;
  appendEvent(event: RunEvent): void;
  events(runId: string): RunEvent[];
  nextEventSequence(runId: string): number;
  search(repositoryId: string, snapshotId: string, query: string, limit?: number): string[];
}

export class SqliteStateStore {
  readonly db: Database.Database;
  constructor(path = ":memory:") {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("busy_timeout = 5000");
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS entities (
        kind TEXT NOT NULL,
        id TEXT NOT NULL,
        repository_id TEXT,
        created_at TEXT NOT NULL,
        status TEXT,
        json TEXT NOT NULL,
        PRIMARY KEY (kind, id)
      );
      CREATE INDEX IF NOT EXISTS idx_entities_repo_kind ON entities(repository_id, kind, created_at DESC);
      CREATE TABLE IF NOT EXISTS file_snapshots (
        snapshot_id TEXT NOT NULL,
        repository_id TEXT NOT NULL,
        path TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        json TEXT NOT NULL,
        PRIMARY KEY (snapshot_id, path)
      );
      CREATE INDEX IF NOT EXISTS idx_files_repo_path ON file_snapshots(repository_id, path);
      CREATE TABLE IF NOT EXISTS events (
        run_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        occurred_at TEXT NOT NULL,
        source TEXT NOT NULL,
        type TEXT NOT NULL,
        json TEXT NOT NULL,
        PRIMARY KEY (run_id, sequence)
      );
      CREATE TABLE IF NOT EXISTS leases (
        repository_id TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS file_search USING fts5(repository_id UNINDEXED, snapshot_id UNINDEXED, path, symbols, excerpt, tokenize='unicode61');
    `);
    this.db.prepare("INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (1, ?)").run(new Date().toISOString());
  }

  close(): void { this.db.close(); }

  acquireLease(repositoryId: string, owner: string, ttlMs = 30_000): boolean {
    const now = Date.now();
    return this.db.transaction(() => {
      this.db.prepare("DELETE FROM leases WHERE expires_at < ?").run(now);
      try { this.db.prepare("INSERT INTO leases(repository_id, owner, expires_at) VALUES (?, ?, ?)").run(repositoryId, owner, now + ttlMs); return true; }
      catch { return false; }
    })();
  }
  releaseLease(repositoryId: string, owner: string): void { this.db.prepare("DELETE FROM leases WHERE repository_id = ? AND owner = ?").run(repositoryId, owner); }

  put(kind: EntityKind, id: string, value: unknown, repositoryId?: string, status?: string): void {
    const record = value as { createdAt?: string; indexedAt?: string };
    this.db.prepare(`INSERT INTO entities(kind,id,repository_id,created_at,status,json) VALUES (?,?,?,?,?,?)
      ON CONFLICT(kind,id) DO UPDATE SET repository_id=excluded.repository_id,status=excluded.status,json=excluded.json`)
      .run(kind, id, repositoryId ?? null, record.createdAt ?? record.indexedAt ?? new Date().toISOString(), status ?? null, JSON.stringify(value));
  }
  get<T>(kind: EntityKind, id: string): T | undefined {
    const row = this.db.prepare("SELECT json FROM entities WHERE kind = ? AND id = ?").get(kind, id) as { json: string } | undefined;
    return row ? JSON.parse(row.json) as T : undefined;
  }
  list<T>(kind: EntityKind, repositoryId?: string): T[] {
    const rows = repositoryId
      ? this.db.prepare("SELECT json FROM entities WHERE kind = ? AND repository_id = ? ORDER BY created_at DESC").all(kind, repositoryId)
      : this.db.prepare("SELECT json FROM entities WHERE kind = ? ORDER BY created_at DESC").all(kind);
    return (rows as Array<{ json: string }>).map((row) => JSON.parse(row.json) as T);
  }
  updateStatus(kind: EntityKind, id: string, status: string): void {
    const current = this.get<any>(kind, id);
    if (!current) return;
    current.status = status;
    this.db.prepare("UPDATE entities SET status = ?, json = ? WHERE kind = ? AND id = ?").run(status, JSON.stringify(current), kind, id);
  }

  saveSnapshot(snapshot: IndexSnapshot): void {
    this.db.transaction(() => {
      this.put("snapshot", snapshot.id, snapshot, snapshot.repository.id);
      const insertFile = this.db.prepare("INSERT OR REPLACE INTO file_snapshots(snapshot_id,repository_id,path,content_hash,json) VALUES (?,?,?,?,?)");
      const insertSearch = this.db.prepare("INSERT INTO file_search(repository_id,snapshot_id,path,symbols,excerpt) VALUES (?,?,?,?,?)");
      this.db.prepare("DELETE FROM file_search WHERE repository_id = ? AND snapshot_id = ?").run(snapshot.repository.id, snapshot.id);
      for (const file of snapshot.files) {
        insertFile.run(snapshot.id, snapshot.repository.id, file.path, file.contentHash, JSON.stringify(file));
        insertSearch.run(snapshot.repository.id, snapshot.id, file.path, file.symbols.map((symbol) => symbol.name).join(" "), file.excerpt);
      }
    })();
  }
  latestSnapshot(repositoryId: string): IndexSnapshot | undefined { return this.list<IndexSnapshot>("snapshot", repositoryId)[0]; }
  snapshots(repositoryId: string): IndexSnapshot[] { return this.list<IndexSnapshot>("snapshot", repositoryId); }
  saveTask(task: TaskAnalysis): void { this.put("task", task.id, task, task.repositoryId); }
  task(id: string): TaskAnalysis | undefined { return this.get("task", id); }
  saveCapsule(capsule: ContextCapsule, repositoryId: string): void { this.put("capsule", capsule.id, capsule, repositoryId, capsule.status); }
  capsule(id: string): ContextCapsule | undefined { return this.get("capsule", id); }
  capsules(repositoryId: string): ContextCapsule[] { return this.list("capsule", repositoryId); }
  saveMemory(memory: DurableMemory): void { this.put("memory", memory.id, memory, memory.repositoryId, memory.status); }
  memories(repositoryId: string): DurableMemory[] { return this.list("memory", repositoryId); }
  saveRoute(route: RouteDecision, repositoryId: string): void { this.put("route", route.id, route, repositoryId); }
  saveCatalog(id: string, models: unknown): void { this.put("catalog", id, { id, createdAt: new Date().toISOString(), models }); }
  catalog<T>(id: string): T | undefined { return this.get("catalog", id); }

  appendEvent(event: RunEvent): void {
    this.db.prepare("INSERT OR REPLACE INTO events(run_id,sequence,occurred_at,source,type,json) VALUES (?,?,?,?,?,?)")
      .run(event.runId, event.sequence, event.occurredAt, event.source, event.type, JSON.stringify(event));
  }
  events(runId: string): RunEvent[] {
    const rows = this.db.prepare("SELECT json FROM events WHERE run_id = ? ORDER BY sequence").all(runId) as Array<{ json: string }>;
    return rows.map((row) => JSON.parse(row.json) as RunEvent);
  }
  nextEventSequence(runId: string): number {
    const row = this.db.prepare("SELECT COALESCE(MAX(sequence), -1) + 1 AS next FROM events WHERE run_id = ?").get(runId) as { next: number };
    return row.next;
  }
  search(repositoryId: string, snapshotId: string, query: string, limit = 30): string[] {
    const safe = query.split(/\s+/).filter((term) => /^[A-Za-z0-9_.-]{2,}$/.test(term)).slice(0, 12).map((term) => `"${term.replaceAll('"', '')}"`).join(" OR ");
    if (!safe) return [];
    const rows = this.db.prepare("SELECT path FROM file_search WHERE repository_id = ? AND snapshot_id = ? AND file_search MATCH ? ORDER BY bm25(file_search) LIMIT ?").all(repositoryId, snapshotId, safe, limit) as Array<{ path: string }>;
    return rows.map((row) => row.path);
  }
}

type JsonEntity = { kind: EntityKind; id: string; repositoryId?: string; createdAt: string; status?: string; value: any };
type JsonState = { schemaVersion: 1; entities: JsonEntity[]; events: RunEvent[] };

/** Portable plugin-cache fallback. It preserves the StateStore contract without a native addon. */
export class JsonStateStore implements StateStore {
  private state: JsonState;
  private leases = new Map<string, { owner: string; expiresAt: number }>();
  constructor(private path: string) {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.state = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) as JsonState : { schemaVersion: 1, entities: [], events: [] };
  }
  private persist(): void { writeFileSync(this.path, `${JSON.stringify(this.state)}\n`, { mode: 0o600 }); }
  close(): void { this.persist(); }
  acquireLease(repositoryId: string, owner: string, ttlMs = 30_000): boolean { const current = this.leases.get(repositoryId); if (current && current.expiresAt >= Date.now()) return false; this.leases.set(repositoryId, { owner, expiresAt: Date.now() + ttlMs }); return true; }
  releaseLease(repositoryId: string, owner: string): void { if (this.leases.get(repositoryId)?.owner === owner) this.leases.delete(repositoryId); }
  put(kind: EntityKind, id: string, value: unknown, repositoryId?: string, status?: string): void {
    const record = value as { createdAt?: string; indexedAt?: string }; const index = this.state.entities.findIndex((entity) => entity.kind === kind && entity.id === id);
    const next: JsonEntity = { kind, id, createdAt: record.createdAt ?? record.indexedAt ?? new Date().toISOString(), value, ...(repositoryId ? { repositoryId } : {}), ...(status ? { status } : {}) };
    if (index >= 0) this.state.entities[index] = next; else this.state.entities.push(next); this.persist();
  }
  get<T>(kind: EntityKind, id: string): T | undefined { return this.state.entities.find((entity) => entity.kind === kind && entity.id === id)?.value as T | undefined; }
  list<T>(kind: EntityKind, repositoryId?: string): T[] { return this.state.entities.filter((entity) => entity.kind === kind && (!repositoryId || entity.repositoryId === repositoryId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((entity) => entity.value as T); }
  updateStatus(kind: EntityKind, id: string, status: string): void { const entity = this.state.entities.find((item) => item.kind === kind && item.id === id); if (!entity) return; entity.status = status; entity.value = { ...entity.value, status }; this.persist(); }
  saveSnapshot(snapshot: IndexSnapshot): void { this.put("snapshot", snapshot.id, snapshot, snapshot.repository.id); }
  latestSnapshot(repositoryId: string): IndexSnapshot | undefined { return this.list<IndexSnapshot>("snapshot", repositoryId)[0]; }
  snapshots(repositoryId: string): IndexSnapshot[] { return this.list("snapshot", repositoryId); }
  saveTask(task: TaskAnalysis): void { this.put("task", task.id, task, task.repositoryId); }
  task(id: string): TaskAnalysis | undefined { return this.get("task", id); }
  saveCapsule(capsule: ContextCapsule, repositoryId: string): void { this.put("capsule", capsule.id, capsule, repositoryId, capsule.status); }
  capsule(id: string): ContextCapsule | undefined { return this.get("capsule", id); }
  capsules(repositoryId: string): ContextCapsule[] { return this.list("capsule", repositoryId); }
  saveMemory(memory: DurableMemory): void { this.put("memory", memory.id, memory, memory.repositoryId, memory.status); }
  memories(repositoryId: string): DurableMemory[] { return this.list("memory", repositoryId); }
  saveRoute(route: RouteDecision, repositoryId: string): void { this.put("route", route.id, route, repositoryId); }
  saveCatalog(id: string, models: unknown): void { this.put("catalog", id, { id, createdAt: new Date().toISOString(), models }); }
  catalog<T>(id: string): T | undefined { return this.get("catalog", id); }
  appendEvent(event: RunEvent): void { const index = this.state.events.findIndex((item) => item.runId === event.runId && item.sequence === event.sequence); if (index >= 0) this.state.events[index] = event; else this.state.events.push(event); this.persist(); }
  events(runId: string): RunEvent[] { return this.state.events.filter((event) => event.runId === runId).sort((a, b) => a.sequence - b.sequence); }
  nextEventSequence(runId: string): number { return this.events(runId).reduce((max, event) => Math.max(max, event.sequence), -1) + 1; }
  search(repositoryId: string, snapshotId: string, query: string, limit = 30): string[] {
    const snapshot = this.get<IndexSnapshot>("snapshot", snapshotId); if (!snapshot || snapshot.repository.id !== repositoryId) return [];
    const terms = query.toLowerCase().split(/\s+/).filter((term) => term.length >= 2);
    return snapshot.files.map((file) => ({ path: file.path, score: terms.filter((term) => `${file.path} ${file.symbols.map((symbol) => symbol.name).join(" ")} ${file.excerpt}`.toLowerCase().includes(term)).length })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, limit).map((item) => item.path);
  }
}
