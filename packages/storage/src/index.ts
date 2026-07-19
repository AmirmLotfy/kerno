import Database from "better-sqlite3";
import { chmodSync, closeSync, constants, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, parse, resolve, sep } from "node:path";
import { KernoError, redactSensitiveValue } from "@kerno/contracts";
import type { ContextCapsule, DurableMemory, IndexSnapshot, RouteDecision, RunEvent, TaskAnalysis } from "@kerno/contracts";

export type EntityKind = "snapshot" | "task" | "capsule" | "memory" | "evidence" | "invalidation" | "route" | "outcome" | "run" | "benchmark" | "comparison" | "catalog" | "artifact";

export interface StateStore {
  close(): void;
  transaction<T>(operation: () => T): T;
  acquireLease(repositoryId: string, owner: string, ttlMs?: number): boolean;
  releaseLease(repositoryId: string, owner: string): void;
  put(kind: EntityKind, id: string, value: unknown, repositoryId?: string, status?: string): void;
  get<T>(kind: EntityKind, id: string): T | undefined;
  list<T>(kind: EntityKind, repositoryId?: string): T[];
  updateStatus(kind: EntityKind, id: string, status: string): void;
  delete(kind: EntityKind, id: string): boolean;
  health(): { ok: true; backend: "sqlite" | "json"; schemaVersion: number; integrity: string };
  saveSnapshot(snapshot: IndexSnapshot): void;
  latestSnapshot(repositoryId: string, worktreeId?: string): IndexSnapshot | undefined;
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

const OWNER_DIRECTORY_MODE = 0o700;
const OWNER_FILE_MODE = 0o600;

function safePersistedValue<T>(value: T): T { return redactSensitiveValue(value) as T; }
function isCurrentOwner(uid: number): boolean { return typeof process.getuid !== "function" || uid === process.getuid(); }
function assertNoNestedSymlinks(path: string): void {
  const absolute = resolve(path); const root = parse(absolute).root; let current = root;
  for (const [index, component] of absolute.slice(root.length).split(sep).filter(Boolean).entries()) {
    current = join(current, component);
    if (index === 0 || !existsSync(current)) continue; // Permit OS-managed root aliases such as macOS /var -> /private/var.
    if (lstatSync(current).isSymbolicLink()) throw new KernoError("SYMLINK_ESCAPE", `Refusing symlinked Kerno state ancestor: ${current}`);
  }
}
function assertSafeStatePath(path: string): void {
  const parent = dirname(path);
  assertNoNestedSymlinks(parent);
  mkdirSync(parent, { recursive: true, mode: OWNER_DIRECTORY_MODE });
  assertNoNestedSymlinks(parent);
  const parentStat = lstatSync(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink() || !isCurrentOwner(parentStat.uid)) throw new KernoError("SYMLINK_ESCAPE", `Refusing non-owner-controlled Kerno state directory: ${parent}`);
  chmodSync(parent, OWNER_DIRECTORY_MODE);
  if (!existsSync(path)) return;
  const stateStat = lstatSync(path);
  if (!stateStat.isFile() || stateStat.isSymbolicLink() || stateStat.nlink !== 1 || !isCurrentOwner(stateStat.uid)) throw new KernoError("SYMLINK_ESCAPE", `Refusing symlinked Kerno state file or non-owner-controlled path: ${path}`);
  chmodSync(path, OWNER_FILE_MODE);
}
function hardenSqliteFiles(path: string): void {
  for (const candidate of [path, `${path}-wal`, `${path}-shm`]) if (existsSync(candidate)) {
    const stat = lstatSync(candidate);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || !isCurrentOwner(stat.uid)) throw new KernoError("SYMLINK_ESCAPE", `Refusing unsafe SQLite state file: ${candidate}`);
    chmodSync(candidate, OWNER_FILE_MODE);
  }
}

export class SqliteStateStore {
  readonly db: Database.Database;
  private readonly path: string;
  constructor(path = ":memory:") {
    this.path = path;
    if (path !== ":memory:") assertSafeStatePath(path);
    try { this.db = new Database(path); }
    catch (error) { throw new Error(`Kerno storage could not open ${path}: ${error instanceof Error ? error.message : String(error)}`); }
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("busy_timeout = 5000");
    this.migrate();
    if (path !== ":memory:") hardenSqliteFiles(path);
    const integrity = this.db.pragma("quick_check", { simple: true });
    if (integrity !== "ok") { this.db.close(); throw new Error(`Kerno storage integrity check failed: ${String(integrity)}`); }
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
      CREATE TABLE IF NOT EXISTS repositories (
        id TEXT PRIMARY KEY, canonical_root TEXT NOT NULL, git_common_dir TEXT, remote_fingerprint TEXT,
        initial_commit_fingerprint TEXT, ignore_digest TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS worktrees (
        id TEXT PRIMARY KEY, repository_id TEXT NOT NULL, canonical_path TEXT NOT NULL, branch TEXT,
        head_commit TEXT, dirty_digest TEXT NOT NULL, dirty INTEGER NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS symbols (
        snapshot_id TEXT NOT NULL, id TEXT NOT NULL, repository_id TEXT NOT NULL, path TEXT NOT NULL,
        name TEXT NOT NULL, kind TEXT NOT NULL, signature_hash TEXT NOT NULL, body_hash TEXT NOT NULL,
        confidence REAL NOT NULL, json TEXT NOT NULL, PRIMARY KEY (snapshot_id, id)
      );
      CREATE TABLE IF NOT EXISTS edges (
        snapshot_id TEXT NOT NULL, repository_id TEXT NOT NULL, source TEXT NOT NULL, target TEXT NOT NULL,
        type TEXT NOT NULL, confidence REAL NOT NULL, PRIMARY KEY (snapshot_id, source, target, type)
      );
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY, repository_id TEXT NOT NULL, status TEXT NOT NULL, branch TEXT,
        head_commit TEXT, type TEXT NOT NULL, confidence REAL NOT NULL, json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS evidence (
        memory_id TEXT NOT NULL, evidence_id TEXT NOT NULL, kind TEXT NOT NULL, path TEXT,
        content_hash TEXT, artifact_id TEXT, json TEXT NOT NULL, PRIMARY KEY (memory_id, evidence_id)
      );
      CREATE TABLE IF NOT EXISTS invalidations (
        memory_id TEXT NOT NULL, kind TEXT NOT NULL, key TEXT NOT NULL, expected TEXT,
        PRIMARY KEY (memory_id, kind, key)
      );
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY, repository_id TEXT, created_at TEXT NOT NULL, status TEXT, json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS benchmarks (
        id TEXT PRIMARY KEY, repository_id TEXT, created_at TEXT NOT NULL, json TEXT NOT NULL
      );
    `);
    this.db.prepare("INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (1, ?)").run(new Date().toISOString());
    this.db.prepare("INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (2, ?)").run(new Date().toISOString());
  }

  close(): void { this.db.close(); if (this.path !== ":memory:") hardenSqliteFiles(this.path); }
  transaction<T>(operation: () => T): T { return this.db.transaction(operation)(); }

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
    const safeValue = safePersistedValue(value);
    const record = safeValue as { createdAt?: string; indexedAt?: string };
    const createdAt = record.createdAt ?? record.indexedAt ?? new Date().toISOString();
    const json = JSON.stringify(safeValue);
    this.db.prepare(`INSERT INTO entities(kind,id,repository_id,created_at,status,json) VALUES (?,?,?,?,?,?)
      ON CONFLICT(kind,id) DO UPDATE SET repository_id=excluded.repository_id,status=excluded.status,json=excluded.json`)
      .run(kind, id, repositoryId ?? null, createdAt, status ?? null, json);
    if (kind === "run") this.db.prepare("INSERT OR REPLACE INTO runs(id,repository_id,created_at,status,json) VALUES (?,?,?,?,?)").run(id, repositoryId ?? null, createdAt, status ?? null, json);
    if (kind === "benchmark") this.db.prepare("INSERT OR REPLACE INTO benchmarks(id,repository_id,created_at,json) VALUES (?,?,?,?)").run(id, repositoryId ?? null, createdAt, json);
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
  delete(kind: EntityKind, id: string): boolean {
    return this.db.transaction(() => {
      if (kind === "memory") {
        this.db.prepare("DELETE FROM evidence WHERE memory_id = ?").run(id);
        this.db.prepare("DELETE FROM invalidations WHERE memory_id = ?").run(id);
        this.db.prepare("DELETE FROM memories WHERE id = ?").run(id);
      }
      if (kind === "run") this.db.prepare("DELETE FROM runs WHERE id = ?").run(id);
      if (kind === "benchmark") this.db.prepare("DELETE FROM benchmarks WHERE id = ?").run(id);
      return this.db.prepare("DELETE FROM entities WHERE kind = ? AND id = ?").run(kind, id).changes > 0;
    })();
  }
  health(): { ok: true; backend: "sqlite"; schemaVersion: number; integrity: string } {
    const row = this.db.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations").get() as { version: number };
    return { ok: true, backend: "sqlite", schemaVersion: row.version, integrity: String(this.db.pragma("quick_check", { simple: true })) };
  }

  saveSnapshot(snapshot: IndexSnapshot): void {
    const safeSnapshot = safePersistedValue(snapshot);
    this.db.transaction(() => {
      this.put("snapshot", safeSnapshot.id, safeSnapshot, safeSnapshot.repository.id);
      this.db.prepare(`INSERT INTO repositories(id,canonical_root,git_common_dir,remote_fingerprint,initial_commit_fingerprint,ignore_digest,updated_at)
        VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET canonical_root=excluded.canonical_root,git_common_dir=excluded.git_common_dir,
        remote_fingerprint=excluded.remote_fingerprint,initial_commit_fingerprint=excluded.initial_commit_fingerprint,ignore_digest=excluded.ignore_digest,updated_at=excluded.updated_at`)
        .run(safeSnapshot.repository.id, safeSnapshot.repository.canonicalRoot, safeSnapshot.repository.gitCommonDir ?? null, safeSnapshot.repository.remoteFingerprint ?? null, safeSnapshot.repository.initialCommitFingerprint ?? null, safeSnapshot.repository.ignoreDigest, safeSnapshot.indexedAt);
      this.db.prepare(`INSERT INTO worktrees(id,repository_id,canonical_path,branch,head_commit,dirty_digest,dirty,updated_at)
        VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET branch=excluded.branch,head_commit=excluded.head_commit,dirty_digest=excluded.dirty_digest,dirty=excluded.dirty,updated_at=excluded.updated_at`)
        .run(safeSnapshot.worktree.id, safeSnapshot.repository.id, safeSnapshot.worktree.canonicalPath, safeSnapshot.worktree.branch, safeSnapshot.worktree.headCommit, safeSnapshot.worktree.dirtyDigest, safeSnapshot.worktree.dirty ? 1 : 0, safeSnapshot.indexedAt);
      const insertFile = this.db.prepare("INSERT OR REPLACE INTO file_snapshots(snapshot_id,repository_id,path,content_hash,json) VALUES (?,?,?,?,?)");
      const insertSearch = this.db.prepare("INSERT INTO file_search(repository_id,snapshot_id,path,symbols,excerpt) VALUES (?,?,?,?,?)");
      const insertSymbol = this.db.prepare("INSERT OR REPLACE INTO symbols(snapshot_id,id,repository_id,path,name,kind,signature_hash,body_hash,confidence,json) VALUES (?,?,?,?,?,?,?,?,?,?)");
      const insertEdge = this.db.prepare("INSERT OR REPLACE INTO edges(snapshot_id,repository_id,source,target,type,confidence) VALUES (?,?,?,?,?,?)");
      this.db.prepare("DELETE FROM file_search WHERE repository_id = ? AND snapshot_id = ?").run(safeSnapshot.repository.id, safeSnapshot.id);
      this.db.prepare("DELETE FROM symbols WHERE snapshot_id = ?").run(safeSnapshot.id);
      this.db.prepare("DELETE FROM edges WHERE snapshot_id = ?").run(safeSnapshot.id);
      for (const file of safeSnapshot.files) {
        insertFile.run(safeSnapshot.id, safeSnapshot.repository.id, file.path, file.contentHash, JSON.stringify(file));
        insertSearch.run(safeSnapshot.repository.id, safeSnapshot.id, file.path, file.symbols.map((symbol) => symbol.name).join(" "), file.excerpt);
        for (const symbol of file.symbols) insertSymbol.run(safeSnapshot.id, symbol.id, safeSnapshot.repository.id, symbol.path, symbol.name, symbol.kind, symbol.signatureHash, symbol.bodyHash, symbol.confidence, JSON.stringify(symbol));
      }
      for (const edge of safeSnapshot.edges) insertEdge.run(safeSnapshot.id, safeSnapshot.repository.id, edge.from, edge.to, edge.type, edge.confidence);
    })();
  }
  latestSnapshot(repositoryId: string, worktreeId?: string): IndexSnapshot | undefined { return this.list<IndexSnapshot>("snapshot", repositoryId).find((snapshot) => !worktreeId || snapshot.worktree.id === worktreeId); }
  snapshots(repositoryId: string): IndexSnapshot[] { return this.list<IndexSnapshot>("snapshot", repositoryId); }
  saveTask(task: TaskAnalysis): void { this.put("task", task.id, task, task.repositoryId); }
  task(id: string): TaskAnalysis | undefined { return this.get("task", id); }
  saveCapsule(capsule: ContextCapsule, repositoryId: string): void { this.put("capsule", capsule.id, capsule, repositoryId, capsule.status); }
  capsule(id: string): ContextCapsule | undefined { return this.get("capsule", id); }
  capsules(repositoryId: string): ContextCapsule[] { return this.list("capsule", repositoryId); }
  saveMemory(memory: DurableMemory): void {
    const safeMemory = safePersistedValue(memory);
    this.db.transaction(() => {
      this.put("memory", safeMemory.id, safeMemory, safeMemory.repositoryId, safeMemory.status);
      this.db.prepare("INSERT OR REPLACE INTO memories(id,repository_id,status,branch,head_commit,type,confidence,json) VALUES (?,?,?,?,?,?,?,?)")
        .run(safeMemory.id, safeMemory.repositoryId, safeMemory.status, safeMemory.branch, safeMemory.headCommit, safeMemory.type, safeMemory.confidence, JSON.stringify(safeMemory));
      this.db.prepare("DELETE FROM evidence WHERE memory_id = ?").run(safeMemory.id);
      this.db.prepare("DELETE FROM invalidations WHERE memory_id = ?").run(safeMemory.id);
      const evidence = this.db.prepare("INSERT INTO evidence(memory_id,evidence_id,kind,path,content_hash,artifact_id,json) VALUES (?,?,?,?,?,?,?)");
      for (const item of safeMemory.evidence) evidence.run(safeMemory.id, item.id, item.kind, item.path ?? null, item.contentHash ?? null, item.artifactId ?? null, JSON.stringify(item));
      const invalidation = this.db.prepare("INSERT INTO invalidations(memory_id,kind,key,expected) VALUES (?,?,?,?)");
      for (const key of safeMemory.invalidationConditions) invalidation.run(safeMemory.id, key.kind, key.key, key.expected ?? null);
    })();
  }
  memories(repositoryId: string): DurableMemory[] { return this.list("memory", repositoryId); }
  saveRoute(route: RouteDecision, repositoryId: string): void { this.put("route", route.id, route, repositoryId); }
  saveCatalog(id: string, catalog: unknown): void { this.put("catalog", id, { id, createdAt: new Date().toISOString(), ...(catalog as Record<string, unknown>) }); }
  catalog<T>(id: string): T | undefined { return this.get("catalog", id); }

  appendEvent(event: RunEvent): void {
    const safeEvent = safePersistedValue(event);
    this.db.prepare("INSERT OR REPLACE INTO events(run_id,sequence,occurred_at,source,type,json) VALUES (?,?,?,?,?,?)")
      .run(safeEvent.runId, safeEvent.sequence, safeEvent.occurredAt, safeEvent.source, safeEvent.type, JSON.stringify(safeEvent));
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
  private transactionDepth = 0;
  private readonly lockPath: string;
  private closed = false;
  constructor(private path: string) {
    assertSafeStatePath(path);
    this.lockPath = `${path}.lock`;
    this.acquireExclusiveLock();
    const backup = `${path}.bak`;
    try {
      if (existsSync(backup)) {
        const backupStat = lstatSync(backup);
        if (!backupStat.isFile() || backupStat.isSymbolicLink() || backupStat.nlink !== 1 || !isCurrentOwner(backupStat.uid)) throw new KernoError("SYMLINK_ESCAPE", `Refusing unsafe Kerno state backup: ${backup}`);
        chmodSync(backup, OWNER_FILE_MODE);
      }
      try { this.state = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) as JsonState : { schemaVersion: 1, entities: [], events: [] }; }
      catch (error) {
        try { this.state = JSON.parse(readFileSync(backup, "utf8")) as JsonState; }
        catch { throw new Error(`Kerno portable storage is corrupt at ${path}: ${error instanceof Error ? error.message : String(error)}`); }
      }
      if (this.state.schemaVersion !== 1 || !Array.isArray(this.state.entities) || !Array.isArray(this.state.events)) throw new Error(`Kerno portable storage has an unsupported or corrupt schema at ${path}`);
      this.state = safePersistedValue(this.state);
    } catch (error) {
      this.releaseExclusiveLock();
      throw error;
    }
  }
  private acquireExclusiveLock(): void {
    const tryCreate = (): boolean => {
      try {
        const descriptor = openSync(this.lockPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0), OWNER_FILE_MODE);
        try { writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })}\n`); fsyncSync(descriptor); }
        finally { closeSync(descriptor); }
        chmodSync(this.lockPath, OWNER_FILE_MODE); return true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        return false;
      }
    };
    if (tryCreate()) return;
    const stat = lstatSync(this.lockPath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || !isCurrentOwner(stat.uid)) throw new KernoError("SYMLINK_ESCAPE", `Refusing unsafe Kerno portable storage lock: ${this.lockPath}`);
    let ownerPid: number | undefined;
    try { ownerPid = Number((JSON.parse(readFileSync(this.lockPath, "utf8")) as { pid?: unknown }).pid); } catch { /* actionable busy error below */ }
    if (Number.isSafeInteger(ownerPid) && ownerPid! > 0) {
      try { process.kill(ownerPid!, 0); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ESRCH") { unlinkSync(this.lockPath); if (tryCreate()) return; }
      }
    }
    throw new KernoError("INDEX_BUSY", `Portable Kerno state is already open by another process; close the other Kerno MCP/CLI process or remove a verified stale lock at ${this.lockPath}`, true);
  }
  private releaseExclusiveLock(): void {
    if (!existsSync(this.lockPath)) return;
    try {
      const owner = JSON.parse(readFileSync(this.lockPath, "utf8")) as { pid?: unknown };
      if (owner.pid === process.pid) unlinkSync(this.lockPath);
    } catch { /* Never remove an unverifiable lock. */ }
  }
  private persist(): void {
    if (this.transactionDepth > 0) return;
    assertSafeStatePath(this.path);
    const temp = `${this.path}.${process.pid}.tmp`; const backup = `${this.path}.bak`;
    if (existsSync(backup)) {
      const backupStat = lstatSync(backup);
      if (!backupStat.isFile() || backupStat.isSymbolicLink() || backupStat.nlink !== 1 || !isCurrentOwner(backupStat.uid)) throw new KernoError("SYMLINK_ESCAPE", `Refusing unsafe Kerno state backup: ${backup}`);
    }
    if (existsSync(this.path)) {
      const current = readFileSync(this.path);
      const backupDescriptor = openSync(backup, constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | (constants.O_NOFOLLOW ?? 0), OWNER_FILE_MODE);
      try { writeFileSync(backupDescriptor, current); fsyncSync(backupDescriptor); }
      finally { closeSync(backupDescriptor); }
      chmodSync(backup, OWNER_FILE_MODE);
    }
    const descriptor = openSync(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0), OWNER_FILE_MODE);
    try { writeFileSync(descriptor, `${JSON.stringify(this.state)}\n`); fsyncSync(descriptor); }
    finally { closeSync(descriptor); }
    renameSync(temp, this.path);
    chmodSync(this.path, OWNER_FILE_MODE);
    if (existsSync(temp)) unlinkSync(temp);
  }
  transaction<T>(operation: () => T): T {
    const before = structuredClone(this.state); this.transactionDepth += 1;
    try { const result = operation(); this.transactionDepth -= 1; if (this.transactionDepth === 0) this.persist(); return result; }
    catch (error) { this.state = before; this.transactionDepth -= 1; throw error; }
  }
  close(): void { if (this.closed) return; try { this.persist(); } finally { this.closed = true; this.releaseExclusiveLock(); } }
  acquireLease(repositoryId: string, owner: string, ttlMs = 30_000): boolean { const current = this.leases.get(repositoryId); if (current && current.expiresAt >= Date.now()) return false; this.leases.set(repositoryId, { owner, expiresAt: Date.now() + ttlMs }); return true; }
  releaseLease(repositoryId: string, owner: string): void { if (this.leases.get(repositoryId)?.owner === owner) this.leases.delete(repositoryId); }
  put(kind: EntityKind, id: string, value: unknown, repositoryId?: string, status?: string): void {
    const safeValue = safePersistedValue(value);
    const record = safeValue as { createdAt?: string; indexedAt?: string }; const index = this.state.entities.findIndex((entity) => entity.kind === kind && entity.id === id);
    const next: JsonEntity = { kind, id, createdAt: record.createdAt ?? record.indexedAt ?? new Date().toISOString(), value: safeValue, ...(repositoryId ? { repositoryId } : {}), ...(status ? { status } : {}) };
    if (index >= 0) this.state.entities[index] = next; else this.state.entities.push(next); this.persist();
  }
  get<T>(kind: EntityKind, id: string): T | undefined { return this.state.entities.find((entity) => entity.kind === kind && entity.id === id)?.value as T | undefined; }
  list<T>(kind: EntityKind, repositoryId?: string): T[] { return this.state.entities.filter((entity) => entity.kind === kind && (!repositoryId || entity.repositoryId === repositoryId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((entity) => entity.value as T); }
  updateStatus(kind: EntityKind, id: string, status: string): void { const entity = this.state.entities.find((item) => item.kind === kind && item.id === id); if (!entity) return; entity.status = status; entity.value = { ...entity.value, status }; this.persist(); }
  delete(kind: EntityKind, id: string): boolean { const before = this.state.entities.length; this.state.entities = this.state.entities.filter((entity) => entity.kind !== kind || entity.id !== id); if (this.state.entities.length !== before) this.persist(); return this.state.entities.length !== before; }
  health(): { ok: true; backend: "json"; schemaVersion: number; integrity: string } { return { ok: true, backend: "json", schemaVersion: this.state.schemaVersion, integrity: "ok" }; }
  saveSnapshot(snapshot: IndexSnapshot): void { this.put("snapshot", snapshot.id, snapshot, snapshot.repository.id); }
  latestSnapshot(repositoryId: string, worktreeId?: string): IndexSnapshot | undefined { return this.list<IndexSnapshot>("snapshot", repositoryId).find((snapshot) => !worktreeId || snapshot.worktree.id === worktreeId); }
  snapshots(repositoryId: string): IndexSnapshot[] { return this.list("snapshot", repositoryId); }
  saveTask(task: TaskAnalysis): void { this.put("task", task.id, task, task.repositoryId); }
  task(id: string): TaskAnalysis | undefined { return this.get("task", id); }
  saveCapsule(capsule: ContextCapsule, repositoryId: string): void { this.put("capsule", capsule.id, capsule, repositoryId, capsule.status); }
  capsule(id: string): ContextCapsule | undefined { return this.get("capsule", id); }
  capsules(repositoryId: string): ContextCapsule[] { return this.list("capsule", repositoryId); }
  saveMemory(memory: DurableMemory): void { this.put("memory", memory.id, memory, memory.repositoryId, memory.status); }
  memories(repositoryId: string): DurableMemory[] { return this.list("memory", repositoryId); }
  saveRoute(route: RouteDecision, repositoryId: string): void { this.put("route", route.id, route, repositoryId); }
  saveCatalog(id: string, catalog: unknown): void { this.put("catalog", id, { id, createdAt: new Date().toISOString(), ...(catalog as Record<string, unknown>) }); }
  catalog<T>(id: string): T | undefined { return this.get("catalog", id); }
  appendEvent(event: RunEvent): void { const safeEvent = safePersistedValue(event); const index = this.state.events.findIndex((item) => item.runId === safeEvent.runId && item.sequence === safeEvent.sequence); if (index >= 0) this.state.events[index] = safeEvent; else this.state.events.push(safeEvent); this.persist(); }
  events(runId: string): RunEvent[] { return this.state.events.filter((event) => event.runId === runId).sort((a, b) => a.sequence - b.sequence); }
  nextEventSequence(runId: string): number { return this.events(runId).reduce((max, event) => Math.max(max, event.sequence), -1) + 1; }
  search(repositoryId: string, snapshotId: string, query: string, limit = 30): string[] {
    const snapshot = this.get<IndexSnapshot>("snapshot", snapshotId); if (!snapshot || snapshot.repository.id !== repositoryId) return [];
    const terms = query.toLowerCase().split(/\s+/).filter((term) => term.length >= 2);
    return snapshot.files.map((file) => ({ path: file.path, score: terms.filter((term) => `${file.path} ${file.symbols.map((symbol) => symbol.name).join(" ")} ${file.excerpt}`.toLowerCase().includes(term)).length })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, limit).map((item) => item.path);
  }
}
