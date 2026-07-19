import { createHash, randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import { join } from "node:path";
import type { CatalogModel, ContextCapsule, DurableMemory, EvidenceArtifact, EvidenceRef, IndexSnapshot, RunEvent } from "@kerno/contracts";
import {
  KernoError, analyzeTaskInputSchema, buildCapsuleInputSchema, compareRunsInputSchema, expandContextInputSchema,
  explainContextInputSchema, impactAnalysisInputSchema, indexRepositoryInputSchema, invalidateContextInputSchema,
  recordDecisionInputSchema, recordOutcomeInputSchema, redactSensitiveValue, repositoryStatusInputSchema, routeTaskInputSchema, stableId
} from "@kerno/contracts";
import { analyzeTask, buildContextCapsule, createMemory, expandContextCapsule, explainCapsule, hashArtifact, invalidateMemory, routeTask } from "@kerno/core";
import { indexRepository, inspectRepository, readIndexableRepositoryFile, redactSecrets, type PreviousFile } from "@kerno/indexer";
import { JsonStateStore, SqliteStateStore, type StateStore } from "@kerno/storage";

export type KernoServiceOptions = { databasePath?: string; storage?: "sqlite" | "json" };

export class KernoService {
  readonly store: StateStore;
  private roots = new Map<string, string>();
  private eventListeners = new Map<string, Set<(event: RunEvent) => void>>();
  constructor(options: KernoServiceOptions = {}) { this.store = options.storage === "json" ? new JsonStateStore(options.databasePath ?? join(process.cwd(), ".kerno", "kerno-state.json")) : new SqliteStateStore(options.databasePath ?? ":memory:"); }
  close(): void { this.store.close(); }

  private snapshotFor(repositoryId: string, worktreeId?: string): IndexSnapshot {
    const snapshot = this.store.latestSnapshot(repositoryId, worktreeId);
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
      const previousSnapshot = this.store.latestSnapshot(inspected.repository.id, inspected.worktree.id);
      const previous = new Map<string, PreviousFile>();
      for (const file of previousSnapshot?.files ?? []) previous.set(file.path, { path: file.path, contentHash: file.contentHash, snapshot: file });
      const snapshot = await indexRepository(parsed.root, { mode: parsed.mode, previous });
      this.store.transaction(() => {
        this.store.saveSnapshot(snapshot);
        if (previousSnapshot) this.applyAutomaticInvalidation(previousSnapshot, snapshot);
      });
      this.roots.set(snapshot.repository.id, snapshot.repository.canonicalRoot);
      return snapshot;
    } finally { this.store.releaseLease(inspected.repository.id, owner); }
  }

  recordArtifact(input: { kind: EvidenceArtifact["kind"]; source: EvidenceArtifact["source"]; output: string; exitCode?: number | null; command?: string[]; trusted?: boolean }): EvidenceArtifact {
    if (Buffer.byteLength(input.output, "utf8") > 4 * 1024 * 1024) throw new KernoError("INVALID_INPUT", "Evidence artifact output exceeds 4 MiB");
    const contentHash = createHash("sha256").update(input.output).digest("hex");
    const redacted = redactSecrets(input.output).text.slice(0, 64_000);
    const createdAt = new Date().toISOString();
    const safeCommand = input.command?.map((part) => redactSecrets(part).text.slice(0, 4096)).slice(0, 64);
    const verified = input.trusted === true && input.source !== "user-confirmed";
    const artifact: EvidenceArtifact = {
      id: stableId("artifact", JSON.stringify({ kind: input.kind, source: input.source, contentHash, exitCode: input.exitCode ?? null, command: safeCommand ?? null, verified, createdAt })), kind: input.kind, source: input.source,
      contentHash, createdAt, redactedOutput: redacted, verified,
      ...(input.exitCode !== undefined ? { exitCode: input.exitCode } : {}),
      ...(safeCommand ? { command: safeCommand } : {})
    };
    this.store.put("artifact", artifact.id, artifact);
    return artifact;
  }
  artifact(id: string): EvidenceArtifact | undefined { return this.store.get("artifact", id); }

  private canonicalEvidence(evidence: EvidenceRef[]): EvidenceRef[] {
    return (redactSensitiveValue(evidence) as EvidenceRef[]).map((item) => {
      if (!item.artifactId) return item;
      const artifact = this.artifact(item.artifactId);
      if (!artifact) throw new KernoError("UNVERIFIED_EVIDENCE", `Unknown evidence artifact ${item.artifactId}`);
      if (artifact.kind !== item.kind) throw new KernoError("UNVERIFIED_EVIDENCE", `Artifact ${artifact.id} is ${artifact.kind}, not ${item.kind}`);
      if (item.contentHash && item.contentHash !== artifact.contentHash) throw new KernoError("UNVERIFIED_EVIDENCE", `Artifact ${artifact.id} content hash does not match persisted evidence`);
      const output = artifact.redactedOutput;
      return {
        id: stableId("evidence", `${artifact.id}:${artifact.contentHash}`),
        kind: artifact.kind,
        ...(item.path && output.includes(item.path) ? { path: item.path } : {}),
        ...(item.symbol && output.toLowerCase().includes(item.symbol.toLowerCase()) ? { symbol: item.symbol } : {}),
        artifactId: artifact.id,
        contentHash: artifact.contentHash,
        note: `${artifact.source} artifact recorded ${artifact.createdAt}`
      };
    });
  }
  recordCatalog(catalogSnapshotId: string, models: CatalogModel[], source: "app-server"): void {
    if (source !== "app-server" || !models.length) throw new KernoError("NO_COMPATIBLE_MODEL", "Catalog must originate from a non-empty App Server model/list response");
    this.store.saveCatalog(catalogSnapshotId, { source, models });
  }

  private applyAutomaticInvalidation(previous: IndexSnapshot, current: IndexSnapshot): void {
    for (const memory of this.store.memories(current.repository.id)) {
      if (memory.worktreeId && memory.worktreeId !== current.worktree.id) continue;
      if (!memory.worktreeId && memory.branch && memory.branch !== previous.worktree.branch) continue;
      let next = invalidateMemory(memory, previous, current);
      if (next.status === "verified") for (const key of next.invalidationConditions.filter((condition) => condition.kind === "test-artifact")) {
        const artifact = this.artifact(key.key);
        if (!artifact?.verified || artifact.kind !== "test" || artifact.exitCode !== 0 || (key.expected && artifact.contentHash !== key.expected)) { next = { ...next, status: "stale" }; break; }
      }
      if (next.status !== memory.status) this.store.saveMemory(next);
    }
    const changed = new Map(current.files.map((file) => [file.path, file.contentHash]));
    for (const capsule of this.store.capsules(current.repository.id)) {
      const capsuleSnapshot = this.store.get<IndexSnapshot>("snapshot", capsule.snapshotId);
      if (capsuleSnapshot?.worktree.id !== current.worktree.id) continue;
      const incompatibleBranch = capsule.items.some((item) => item.branch !== current.worktree.branch);
      const staleFile = capsule.items.some((item) => {
        if (item.sourceType !== "memory") return changed.get(item.locator.path) !== item.contentHash;
        const memoryId = item.invalidationKeys.find((key) => key.kind === "manual" && key.key.startsWith("memory:"))?.key.slice("memory:".length);
        return !memoryId || !this.store.memories(current.repository.id).some((memory) => memory.id === memoryId && memory.status === "verified" && createHash("sha256").update(memory.summary).digest("hex") === item.contentHash);
      });
      if (incompatibleBranch || staleFile) this.store.updateStatus("capsule", capsule.id, "stale");
    }
  }

  private async snapshotIsFresh(snapshot: IndexSnapshot): Promise<boolean> {
    const current = await inspectRepository(snapshot.repository.canonicalRoot);
    if (current.repository.id !== snapshot.repository.id || current.worktree.id !== snapshot.worktree.id || current.repository.ignoreDigest !== snapshot.repository.ignoreDigest || current.worktree.branch !== snapshot.worktree.branch || current.worktree.headCommit !== snapshot.worktree.headCommit || current.worktree.dirtyDigest !== snapshot.worktree.dirtyDigest) return false;
    const snapshotPaths = new Set(snapshot.files.map((file) => file.path));
    for (const path of current.paths) if (!snapshotPaths.has(path) && await readIndexableRepositoryFile(snapshot.repository.canonicalRoot, path)) return false;
    for (const file of snapshot.files) {
      const currentFile = await readIndexableRepositoryFile(snapshot.repository.canonicalRoot, file.path);
      if (!currentFile || currentFile.contentHash !== file.contentHash) return false;
    }
    return true;
  }

  private currentMemories(snapshot: IndexSnapshot): DurableMemory[] {
    const memories = this.store.memories(snapshot.repository.id);
    for (const memory of memories) {
      let next = invalidateMemory(memory, snapshot, snapshot);
      if (next.status === "verified") for (const key of next.invalidationConditions.filter((condition) => condition.kind === "test-artifact")) {
        const artifact = this.artifact(key.key);
        if (!artifact?.verified || artifact.kind !== "test" || artifact.exitCode !== 0 || (key.expected && artifact.contentHash !== key.expected)) { next = { ...next, status: "stale" }; break; }
      }
      if (next.status !== memory.status) this.store.saveMemory(next);
    }
    return this.store.memories(snapshot.repository.id);
  }

  async status(input: unknown): Promise<unknown> {
    const { repositoryId, worktreeId } = repositoryStatusInputSchema.parse(input);
    const snapshot = this.snapshotFor(repositoryId, worktreeId);
    const current = await this.snapshotIsFresh(snapshot);
    return { repositoryId, branch: snapshot.worktree.branch, head: snapshot.worktree.headCommit, dirty: snapshot.worktree.dirty, freshness: snapshot.indexedAt, snapshotStatus: current ? "current" : "stale", indexCounts: { files: snapshot.files.length, symbols: snapshot.files.reduce((sum, file) => sum + file.symbols.length, 0), edges: snapshot.edges.length }, warnings: [...(snapshot.files.some((file) => file.secretRedacted) ? ["Secret-like values were redacted from indexed excerpts"] : []), ...(!current ? ["Repository changed after indexing; re-index before building a capsule"] : [])] };
  }

  analyze(input: unknown): ReturnType<typeof analyzeTask> {
    const parsed = analyzeTaskInputSchema.parse(input);
    const snapshot = this.snapshotFor(parsed.repositoryId, parsed.worktreeId);
    const task = analyzeTask(parsed.repositoryId, snapshot.id, redactSecrets(parsed.taskText).text);
    this.store.saveTask(task); return task;
  }
  async buildCapsule(input: unknown): Promise<ContextCapsule> {
    const parsed = buildCapsuleInputSchema.parse(input);
    const { task, snapshot } = this.repositoryForTask(parsed.taskAnalysisId);
    if (!(await this.snapshotIsFresh(snapshot))) throw new KernoError("STALE_SNAPSHOT", "Repository changed after task analysis; re-index before building a capsule");
    const capsule = buildContextCapsule(task, snapshot, { ...(parsed.phase ? { phase: parsed.phase } : {}), ...(parsed.budgetTokens ? { budgetTokens: parsed.budgetTokens } : {}), memories: this.currentMemories(snapshot) });
    this.store.saveCapsule(capsule, task.repositoryId); return capsule;
  }
  async expand(input: unknown): Promise<ContextCapsule> {
    const parsed = expandContextInputSchema.parse(input);
    const parent = this.store.capsule(parsed.capsuleId);
    if (!parent) throw new KernoError("UNKNOWN_ID", `Unknown capsule ${parsed.capsuleId}`);
    const artifact = this.artifact(parsed.evidence.artifactId);
    if (!artifact) throw new KernoError("UNVERIFIED_EVIDENCE", `Unknown evidence artifact ${parsed.evidence.artifactId}`);
    const expectedKind = parsed.evidence.kind === "test_failure" ? "test" : parsed.evidence.kind === "review" ? "review" : "runtime";
    if (artifact.kind !== expectedKind) throw new KernoError("UNVERIFIED_EVIDENCE", `Artifact ${artifact.id} is ${artifact.kind}, not ${expectedKind}`);
    if (!artifact.verified) throw new KernoError("UNVERIFIED_EVIDENCE", `Artifact ${artifact.id} was not created by a trusted execution boundary`);
    if (parsed.evidence.kind === "test_failure" && (artifact.exitCode === null || artifact.exitCode === undefined || artifact.exitCode === 0)) throw new KernoError("UNVERIFIED_EVIDENCE", `Artifact ${artifact.id} is not a failing test result`);
    if (parent.status !== "current") throw new KernoError("STALE_SNAPSHOT", `Cannot expand ${parent.status} capsule ${parent.id}`);
    let expansionDepth = 0; let ancestor: ContextCapsule | undefined = parent;
    while (ancestor.parentCapsuleId) { expansionDepth += 1; ancestor = this.store.capsule(ancestor.parentCapsuleId); if (!ancestor) break; }
    if (expansionDepth >= 3) throw new KernoError("BUDGET_EXCEEDED", "Automatic context expansion is capped at three child capsules; human escalation is required");
    const { task, snapshot } = this.repositoryForTask(parent.taskAnalysisId);
    const latest = this.store.latestSnapshot(task.repositoryId, snapshot.worktree.id);
    if (latest?.id !== snapshot.id || !(await this.snapshotIsFresh(snapshot))) throw new KernoError("STALE_SNAPSHOT", "Repository changed after the parent capsule; re-index before expanding context");
    const safeArtifactText = artifact.redactedOutput.slice(0, 64_000);
    const evidence: EvidenceRef & { text: string; verified: boolean } = {
      id: parsed.evidence.artifactId ?? stableId("evidence", `${parent.id}:${parsed.evidence.kind}:${parsed.evidence.text}`),
      kind: parsed.evidence.kind === "test_failure" ? "test" : parsed.evidence.kind === "review" ? "review" : "runtime",
      ...(parsed.evidence.paths?.find((path) => safeArtifactText.includes(path)) ? { path: parsed.evidence.paths.find((path) => safeArtifactText.includes(path)) } : {}),
      ...(parsed.evidence.symbols?.find((symbol) => safeArtifactText.toLowerCase().includes(symbol.toLowerCase())) ? { symbol: parsed.evidence.symbols.find((symbol) => safeArtifactText.toLowerCase().includes(symbol.toLowerCase())) } : {}),
      artifactId: artifact.id,
      contentHash: artifact.contentHash,
      note: safeArtifactText.slice(0, 2048), text: safeArtifactText, verified: artifact.verified
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
    const suppliedEvidence = parsed.evidence.length ? parsed.evidence : parsed.userConfirmed ? [{ id: stableId("evidence", `${parsed.repositoryId}:${parsed.summary}`), kind: "user" as const, note: "explicit caller confirmation" }] : [];
    const evidence = this.canonicalEvidence(suppliedEvidence);
    const verifiedArtifacts = evidence.flatMap((item) => item.kind === "test" && item.artifactId ? [this.artifact(item.artifactId)] : []).filter((artifact): artifact is EvidenceArtifact => Boolean(artifact?.kind === "test" && artifact.verified && artifact.exitCode === 0));
    const verifiedTestEvidence = verifiedArtifacts.length > 0;
    const source = parsed.userConfirmed ? "user" : verifiedTestEvidence ? "test" : "codex";
    const superseded = (parsed.supersedes ?? []).map((id) => {
      const previous = this.store.get<DurableMemory>("memory", id);
      if (!previous || previous.repositoryId !== parsed.repositoryId) throw new KernoError("UNKNOWN_ID", `Cannot supersede unknown memory ${id}`);
      return previous;
    });
    const artifactInvalidations = verifiedArtifacts.map((artifact) => ({ kind: "test-artifact" as const, key: artifact.id, expected: artifact.contentHash }));
    const invalidationConditions = [...parsed.invalidationConditions, ...artifactInvalidations.filter((candidate) => !parsed.invalidationConditions.some((existing) => existing.kind === candidate.kind && existing.key === candidate.key))];
    const memory = createMemory({ repositoryId: parsed.repositoryId, ...(parsed.scope === "worktree" ? { worktreeId: snapshot.worktree.id } : {}), branch: parsed.scope === "repository" ? null : snapshot.worktree.branch, headCommit: snapshot.worktree.headCommit, type: parsed.type, summary: redactSecrets(parsed.summary).text, evidence, invalidationConditions, creationSource: source, ...(parsed.userConfirmed !== undefined ? { userConfirmed: parsed.userConfirmed } : {}), ...(parsed.supersedes?.length ? { supersedes: parsed.supersedes } : {}) });
    this.store.transaction(() => {
      this.store.saveMemory(memory);
      for (const previous of superseded) this.store.saveMemory({ ...previous, status: "superseded", supersededBy: memory.id });
    });
    return memory;
  }
  recordOutcome(input: unknown): unknown {
    const parsed = recordOutcomeInputSchema.parse(input);
    const artifacts = (parsed.artifacts ?? []).map((artifact) => this.recordArtifact({ kind: artifact.kind, source: artifact.source, output: artifact.output, ...(artifact.exitCode !== undefined ? { exitCode: artifact.exitCode } : {}), ...(artifact.command ? { command: artifact.command } : {}), trusted: false }));
    const tests = this.canonicalEvidence(parsed.tests);
    const review = this.canonicalEvidence(parsed.review);
    if (parsed.status === "passed" && !tests.some((test) => {
      const artifact = test.artifactId ? this.artifact(test.artifactId) ?? artifacts.find((candidate) => candidate.id === test.artifactId) : undefined;
      return test.kind === "test" && artifact?.kind === "test" && artifact.verified && artifact.exitCode === 0;
    })) throw new KernoError("UNVERIFIED_EVIDENCE", "Passed outcomes require a persisted successful test artifact");
    const fields = { runId: parsed.runId, status: parsed.status, tests, review, changedFiles: parsed.changedFiles };
    const outcome = { id: stableId("outcome", `${parsed.runId}:${hashArtifact(parsed)}`), createdAt: new Date().toISOString(), ...fields, artifacts };
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
    const catalog = this.store.catalog<{ source: "app-server"; models: CatalogModel[] }>(parsed.catalogSnapshotId);
    if (!catalog || catalog.source !== "app-server") throw new KernoError("NO_COMPATIBLE_MODEL", `Unknown or untrusted catalog ${parsed.catalogSnapshotId}`);
    const decision = routeTask(task, parsed.phase, parsed.catalogSnapshotId, catalog.models, parsed.preferences);
    this.store.saveRoute(decision, task.repositoryId); return decision;
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
    const redactedPayload = redactSensitiveValue(payload);
    const event: RunEvent = { runId, sequence: this.store.nextEventSequence(runId), occurredAt: new Date().toISOString(), source, type, redactedPayload, rawArtifactHash: createHash("sha256").update(JSON.stringify(payload)).digest("hex") };
    this.store.appendEvent(event); for (const listener of this.eventListeners.get(runId) ?? []) listener(event); return event;
  }
  subscribe(runId: string, listener: (event: RunEvent) => void): () => void {
    const listeners = this.eventListeners.get(runId) ?? new Set(); listeners.add(listener); this.eventListeners.set(runId, listeners);
    return () => { listeners.delete(listener); if (!listeners.size) this.eventListeners.delete(runId); };
  }
}

export type HttpServerHandle = { server: Server; url: string; token: string; close: () => Promise<void> };
export async function startHttpServer(service: KernoService, options: { port?: number; host?: string } = {}): Promise<HttpServerHandle> {
  const token = randomBytes(24).toString("base64url"); const host = options.host ?? "127.0.0.1";
  if (!["127.0.0.1", "localhost", "::1"].includes(host)) throw new KernoError("INVALID_INPUT", "Kerno HTTP may bind only to a loopback address");
  const server = createServer(async (request, response) => {
    const origin = request.headers.origin;
    if (origin && !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) { response.writeHead(403).end("Forbidden origin"); return; }
    if (request.headers.authorization !== `Bearer ${token}`) { response.writeHead(401).end("Unauthorized"); return; }
    if (request.method !== "GET") { response.writeHead(405).end("Read-only API"); return; }
    const url = new URL(request.url ?? "/", `http://${host}`); const parts = url.pathname.split("/").filter(Boolean);
    try {
      let data: unknown;
      if (parts[0] === "v1" && parts[1] === "repositories" && parts[2]) data = await service.status({ repositoryId: parts[2] });
      else if (parts[0] === "v1" && parts[1] === "capsules" && parts[2]) data = service.store.capsule(parts[2]);
      else if (parts[0] === "v1" && parts[1] === "runs" && parts[2] && parts[3] === "events") {
        response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", "access-control-allow-origin": origin ?? "http://127.0.0.1" });
        response.flushHeaders();
        for (const event of service.store.events(parts[2])) response.write(`id: ${event.sequence}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
        const unsubscribe = service.subscribe(parts[2], (event) => response.write(`id: ${event.sequence}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
        const heartbeat = setInterval(() => response.write(": keepalive\n\n"), 15_000);
        request.once("close", () => { clearInterval(heartbeat); unsubscribe(); }); return;
      } else if (parts[0] === "v1" && parts[1] === "runs" && parts[2]) data = service.store.get("run", parts[2]);
      else if (parts[0] === "v1" && parts[1] === "comparisons" && parts[2]) data = service.store.get("comparison", parts[2]);
      else { response.writeHead(404).end("Not found"); return; }
      if (!data) { response.writeHead(404).end("Not found"); return; }
      response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": origin ?? "http://127.0.0.1" }); response.end(JSON.stringify(data));
    } catch (error) { response.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" })); }
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(options.port ?? 0, host, resolve); });
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Failed to bind HTTP server");
  const urlHost = host === "::1" ? "[::1]" : host;
  return { server, url: `http://${urlHost}:${address.port}`, token, close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
}

export function defaultDatabaseFor(root: string): string { return join(root, ".kerno", "kerno.db"); }
