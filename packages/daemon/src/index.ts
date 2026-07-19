import { createHash, randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import { join } from "node:path";
import type { ContextCapsule, DurableMemory, EvidenceRef, IndexSnapshot, RunEvent } from "@kerno/contracts";
import {
  KernoError, analyzeTaskInputSchema, buildCapsuleInputSchema, compareRunsInputSchema, expandContextInputSchema,
  explainContextInputSchema, impactAnalysisInputSchema, indexRepositoryInputSchema, invalidateContextInputSchema,
  recordDecisionInputSchema, recordOutcomeInputSchema, repositoryStatusInputSchema, routeTaskInputSchema, stableId
} from "@kerno/contracts";
import { analyzeTask, buildContextCapsule, createMemory, expandContextCapsule, explainCapsule, hashArtifact, invalidateMemory, routeTask } from "@kerno/core";
import { indexRepository, inspectRepository, redactSecrets, type PreviousFile } from "@kerno/indexer";
import { JsonStateStore, SqliteStateStore, type StateStore } from "@kerno/storage";

export type KernoServiceOptions = { databasePath?: string; storage?: "sqlite" | "json" };

export class KernoService {
  readonly store: StateStore;
  private roots = new Map<string, string>();
  constructor(options: KernoServiceOptions = {}) { this.store = options.storage === "json" ? new JsonStateStore(options.databasePath ?? join(process.cwd(), ".kerno", "kerno-state.json")) : new SqliteStateStore(options.databasePath ?? ":memory:"); }
  close(): void { this.store.close(); }

  private snapshotFor(repositoryId: string): IndexSnapshot {
    const snapshot = this.store.latestSnapshot(repositoryId);
    if (!snapshot) throw new KernoError("REPOSITORY_NOT_ENROLLED", `Repository ${repositoryId} has not been indexed`);
    return snapshot;
  }
  private repositoryForTask(taskAnalysisId: string): { task: ReturnType<typeof analyzeTask>; snapshot: IndexSnapshot } {
    const task = this.store.task(taskAnalysisId);
    if (!task) throw new KernoError("UNKNOWN_ID", `Unknown task analysis ${taskAnalysisId}`);
    const snapshot = this.store.get<IndexSnapshot>("snapshot", task.snapshotId);
    if (!snapshot) throw new KernoError("STALE_SNAPSHOT", `Snapshot ${task.snapshotId} is unavailable`);
    return { task, snapshot };
  }

  async index(input: unknown): Promise<IndexSnapshot> {
    const parsed = indexRepositoryInputSchema.parse(input);
    const inspected = await inspectRepository(parsed.root);
    const owner = stableId("lease", `${process.pid}:${Date.now()}`);
    if (!this.store.acquireLease(inspected.repository.id, owner)) throw new KernoError("INDEX_BUSY", "Repository index is already in progress", true);
    try {
      const previousSnapshot = this.store.latestSnapshot(inspected.repository.id);
      const previous = new Map<string, PreviousFile>();
      for (const file of previousSnapshot?.files ?? []) previous.set(file.path, { path: file.path, contentHash: file.contentHash, snapshot: file });
      const snapshot = await indexRepository(parsed.root, { mode: parsed.mode, previous });
      this.store.saveSnapshot(snapshot);
      this.roots.set(snapshot.repository.id, snapshot.repository.canonicalRoot);
      if (previousSnapshot) this.applyAutomaticInvalidation(previousSnapshot, snapshot);
      return snapshot;
    } finally { this.store.releaseLease(inspected.repository.id, owner); }
  }

  private applyAutomaticInvalidation(previous: IndexSnapshot, current: IndexSnapshot): void {
    for (const memory of this.store.memories(current.repository.id)) {
      const next = invalidateMemory(memory, previous, current);
      if (next.status !== memory.status) this.store.saveMemory(next);
    }
    const changed = new Map(current.files.map((file) => [file.path, file.contentHash]));
    for (const capsule of this.store.capsules(current.repository.id)) {
      const incompatibleBranch = capsule.items.some((item) => item.branch !== current.worktree.branch);
      const staleFile = capsule.items.some((item) => changed.get(item.locator.path) !== item.contentHash);
      if (incompatibleBranch || staleFile) this.store.updateStatus("capsule", capsule.id, "stale");
    }
  }

  status(input: unknown): unknown {
    const { repositoryId } = repositoryStatusInputSchema.parse(input);
    const snapshot = this.snapshotFor(repositoryId);
    return { repositoryId, branch: snapshot.worktree.branch, head: snapshot.worktree.headCommit, dirty: snapshot.worktree.dirty, freshness: snapshot.indexedAt, indexCounts: { files: snapshot.files.length, symbols: snapshot.files.reduce((sum, file) => sum + file.symbols.length, 0), edges: snapshot.edges.length }, warnings: snapshot.files.some((file) => file.secretRedacted) ? ["Secret-like values were redacted from indexed excerpts"] : [] };
  }

  analyze(input: unknown): ReturnType<typeof analyzeTask> {
    const parsed = analyzeTaskInputSchema.parse(input);
    const snapshot = this.snapshotFor(parsed.repositoryId);
    const task = analyzeTask(parsed.repositoryId, snapshot.id, parsed.taskText);
    this.store.saveTask(task); return task;
  }
  buildCapsule(input: unknown): ContextCapsule {
    const parsed = buildCapsuleInputSchema.parse(input);
    const { task, snapshot } = this.repositoryForTask(parsed.taskAnalysisId);
    const capsule = buildContextCapsule(task, snapshot, { ...(parsed.phase ? { phase: parsed.phase } : {}), ...(parsed.budgetTokens ? { budgetTokens: parsed.budgetTokens } : {}) });
    this.store.saveCapsule(capsule, task.repositoryId); return capsule;
  }
  expand(input: unknown): ContextCapsule {
    const parsed = expandContextInputSchema.parse(input);
    const parent = this.store.capsule(parsed.capsuleId);
    if (!parent) throw new KernoError("UNKNOWN_ID", `Unknown capsule ${parsed.capsuleId}`);
    if (["test_failure", "review"].includes(parsed.evidence.kind) && !parsed.evidence.artifactId) throw new KernoError("UNVERIFIED_EVIDENCE", `${parsed.evidence.kind} expansion requires an artifact id`);
    let expansionDepth = 0; let ancestor: ContextCapsule | undefined = parent;
    while (ancestor.parentCapsuleId) { expansionDepth += 1; ancestor = this.store.capsule(ancestor.parentCapsuleId); if (!ancestor) break; }
    if (expansionDepth >= 3) throw new KernoError("BUDGET_EXCEEDED", "Automatic context expansion is capped at three child capsules; human escalation is required");
    const { task, snapshot } = this.repositoryForTask(parent.taskAnalysisId);
    const evidence: EvidenceRef & { text: string; verified: boolean } = {
      id: parsed.evidence.artifactId ?? stableId("evidence", `${parent.id}:${parsed.evidence.kind}:${parsed.evidence.text}`),
      kind: parsed.evidence.kind === "test_failure" ? "test" : parsed.evidence.kind === "review" ? "review" : "runtime",
      ...(parsed.evidence.paths?.[0] ? { path: parsed.evidence.paths[0] } : {}),
      ...(parsed.evidence.symbols?.[0] ? { symbol: parsed.evidence.symbols[0] } : {}),
      ...(parsed.evidence.artifactId ? { artifactId: parsed.evidence.artifactId } : {}),
      note: parsed.evidence.text.slice(0, 2048), text: parsed.evidence.text, verified: parsed.evidence.verified
    };
    const child = expandContextCapsule(parent, task, snapshot, evidence, parsed.additionalBudgetTokens);
    this.store.updateStatus("capsule", parent.id, "superseded");
    this.store.saveCapsule(child, task.repositoryId); return child;
  }
  explain(input: unknown): unknown { const parsed = explainContextInputSchema.parse(input); const capsule = this.store.capsule(parsed.capsuleId); if (!capsule) throw new KernoError("UNKNOWN_ID", `Unknown capsule ${parsed.capsuleId}`); return explainCapsule(capsule, parsed.itemIds); }
  impact(input: unknown): unknown {
    const parsed = impactAnalysisInputSchema.parse(input); const snapshot = this.snapshotFor(parsed.repositoryId);
    const seeds = new Set<string>();
    for (const target of parsed.targets) {
      if (target.path) seeds.add(target.path);
      if (target.symbol) for (const file of snapshot.files) if (file.symbols.some((symbol) => symbol.name === target.symbol)) seeds.add(file.path);
    }
    const found = new Map<string, { path: string; distance: number; via: string }>();
    let frontier = [...seeds];
    for (let depth = 1; depth <= parsed.depth; depth += 1) {
      const next: string[] = [];
      for (const edge of snapshot.edges) if (frontier.includes(edge.to) || frontier.includes(edge.from)) {
        const path = frontier.includes(edge.to) ? edge.from : edge.to;
        if (snapshot.files.some((file) => file.path === path) && !seeds.has(path) && !found.has(path)) { found.set(path, { path, distance: depth, via: edge.type }); next.push(path); }
      }
      frontier = next;
    }
    return { targets: [...seeds], dependents: [...found.values()], tests: [...found.values()].filter((item) => snapshot.files.find((file) => file.path === item.path)?.isTest), confidence: seeds.size ? 0.85 : 0.35 };
  }
  recordDecision(input: unknown): DurableMemory {
    const parsed = recordDecisionInputSchema.parse(input); const snapshot = this.snapshotFor(parsed.repositoryId);
    const source = parsed.userConfirmed ? "user" : parsed.evidence.some((item) => item.kind === "test") ? "test" : "codex";
    const memory = createMemory({ repositoryId: parsed.repositoryId, ...(parsed.scope === "worktree" ? { worktreeId: snapshot.worktree.id } : {}), branch: parsed.scope === "repository" ? null : snapshot.worktree.branch, headCommit: snapshot.worktree.headCommit, type: parsed.type, summary: parsed.summary, evidence: parsed.evidence, invalidationConditions: parsed.invalidationConditions, creationSource: source, ...(parsed.userConfirmed !== undefined ? { userConfirmed: parsed.userConfirmed } : {}) });
    this.store.saveMemory(memory); return memory;
  }
  recordOutcome(input: unknown): unknown {
    const parsed = recordOutcomeInputSchema.parse(input);
    if (parsed.status === "passed" && !parsed.tests.some((test) => test.kind === "test" && test.artifactId)) throw new KernoError("UNVERIFIED_EVIDENCE", "Passed outcomes require a test artifact");
    const outcome = { id: stableId("outcome", `${parsed.runId}:${hashArtifact(parsed)}`), createdAt: new Date().toISOString(), ...parsed };
    this.store.put("outcome", outcome.id, outcome); return outcome;
  }
  invalidate(input: unknown): unknown {
    const parsed = invalidateContextInputSchema.parse(input); const affected = [...this.store.memories(parsed.repositoryId).filter((memory) => !parsed.memoryIds || parsed.memoryIds.includes(memory.id)), ...this.store.capsules(parsed.repositoryId)];
    if (!parsed.dryRun) for (const entity of affected) {
      if ("summary" in entity) this.store.saveMemory({ ...entity, status: "stale" });
      else this.store.updateStatus("capsule", entity.id, "stale");
    }
    return { affected: affected.map((entity) => entity.id), reasons: [parsed.trigger.kind, parsed.trigger.key].filter(Boolean), applied: !parsed.dryRun };
  }
  route(input: unknown): ReturnType<typeof routeTask> {
    const parsed = routeTaskInputSchema.parse(input); const { task } = this.repositoryForTask(parsed.taskAnalysisId);
    const decision = routeTask(task, parsed.phase, parsed.catalogSnapshotId, parsed.models, parsed.preferences);
    this.store.saveCatalog(parsed.catalogSnapshotId, parsed.models); this.store.saveRoute(decision, task.repositoryId); return decision;
  }
  compare(input: unknown): unknown {
    const parsed = compareRunsInputSchema.parse(input); const baseline = this.store.get<any>("run", parsed.baselineRunId); const kerno = this.store.get<any>("run", parsed.kernoRunId);
    if (!baseline || !kerno) throw new KernoError("UNKNOWN_ID", "Both runs must exist");
    const fairnessFields = ["taskId", "startingCommit", "permissions", "modelClass"];
    const mismatches = fairnessFields.filter((field) => baseline.manifest?.[field] !== kerno.manifest?.[field]);
    if (mismatches.length) throw new KernoError("FAIRNESS_MISMATCH", `Run manifests differ: ${mismatches.join(", ")}`);
    const metrics = ["taskSuccess", "testsPassed", "threadTokens", "filesOpened", "repeatedReads", "toolCalls", "timeToFirstValidPatchMs", "totalLatencyMs", "unnecessaryChangedLines", "reviewerFindings", "staleContextMistakes", "contextExpansionCount"];
    const comparison = { id: stableId("comparison", `${baseline.id}:${kerno.id}`), createdAt: new Date().toISOString(), baselineRunId: baseline.id, kernoRunId: kerno.id, fairness: { passed: true, checked: fairnessFields }, metrics: Object.fromEntries(metrics.map((metric) => [metric, { baseline: baseline.metrics?.[metric] ?? null, kerno: kerno.metrics?.[metric] ?? null, evidence: [baseline.artifacts?.[metric], kerno.artifacts?.[metric]].filter(Boolean) }])) };
    this.store.put("comparison", comparison.id, comparison); return comparison;
  }

  emit(runId: string, source: RunEvent["source"], type: string, payload: unknown): RunEvent {
    const redacted = redactSecrets(JSON.stringify(payload));
    const event: RunEvent = { runId, sequence: this.store.nextEventSequence(runId), occurredAt: new Date().toISOString(), source, type, redactedPayload: JSON.parse(redacted.text), rawArtifactHash: createHash("sha256").update(JSON.stringify(payload)).digest("hex") };
    this.store.appendEvent(event); return event;
  }
}

export type HttpServerHandle = { server: Server; url: string; token: string; close: () => Promise<void> };
export async function startHttpServer(service: KernoService, options: { port?: number; host?: string } = {}): Promise<HttpServerHandle> {
  const token = randomBytes(24).toString("base64url"); const host = options.host ?? "127.0.0.1";
  const server = createServer((request, response) => {
    const origin = request.headers.origin;
    if (origin && !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) { response.writeHead(403).end("Forbidden origin"); return; }
    if (request.headers.authorization !== `Bearer ${token}`) { response.writeHead(401).end("Unauthorized"); return; }
    if (request.method !== "GET") { response.writeHead(405).end("Read-only API"); return; }
    const url = new URL(request.url ?? "/", `http://${host}`); const parts = url.pathname.split("/").filter(Boolean);
    try {
      let data: unknown;
      if (parts[0] === "v1" && parts[1] === "repositories" && parts[2]) data = service.status({ repositoryId: parts[2] });
      else if (parts[0] === "v1" && parts[1] === "capsules" && parts[2]) data = service.store.capsule(parts[2]);
      else if (parts[0] === "v1" && parts[1] === "runs" && parts[2] && parts[3] === "events") {
        response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", "access-control-allow-origin": origin ?? "http://127.0.0.1" });
        for (const event of service.store.events(parts[2])) response.write(`id: ${event.sequence}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
        response.end(); return;
      } else if (parts[0] === "v1" && parts[1] === "runs" && parts[2]) data = service.store.get("run", parts[2]);
      else if (parts[0] === "v1" && parts[1] === "comparisons" && parts[2]) data = service.store.get("comparison", parts[2]);
      else { response.writeHead(404).end("Not found"); return; }
      if (!data) { response.writeHead(404).end("Not found"); return; }
      response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": origin ?? "http://127.0.0.1" }); response.end(JSON.stringify(data));
    } catch (error) { response.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" })); }
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(options.port ?? 0, host, resolve); });
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Failed to bind HTTP server");
  return { server, url: `http://${host}:${address.port}`, token, close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
}

export function defaultDatabaseFor(root: string): string { return join(root, ".kerno", "kerno.db"); }
