import { createHash, randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import { basename, join } from "node:path";
import type { BenchmarkRun, CatalogModel, ContextCapsule, DurableMemory, EvidenceArtifact, EvidenceRef, IndexSnapshot, KernoPanelData, KernoSettings, RouteDecision, RunEvent, TaskAnalysis } from "@kerno/contracts";
import {
  benchmarkRunSchema, KernoError, analyzeTaskInputSchema, buildCapsuleInputSchema, compareRunsInputSchema, expandContextInputSchema,
  explainContextInputSchema, getKernoSettingsInputSchema, impactAnalysisInputSchema, indexRepositoryInputSchema, invalidateContextInputSchema,
  kernoPanelDataSchema, kernoSettingsSchema, recordDecisionInputSchema, recordOutcomeInputSchema, redactSensitiveValue,
  renderKernoPanelInputSchema, repositoryStatusInputSchema, routeTaskInputSchema, stableId, updateKernoSettingsInputSchema
} from "@kerno/contracts";
import { analyzeTask, buildContextCapsule, createMemory, expandContextCapsule, explainCapsule, hashArtifact, invalidateMemory, routeTask } from "@kerno/core";
import { indexRepository, inspectRepository, readIndexableRepositoryFile, redactSecrets, type PreviousFile } from "@kerno/indexer";
import { JsonStateStore, SqliteStateStore, type StateStore } from "@kerno/storage";

export type KernoServiceOptions = { databasePath?: string; storage?: "sqlite" | "json"; settingsPath?: string };
const KERNO_ONBOARDING_VERSION = 1;

export class KernoService {
  readonly store: StateStore;
  private readonly settingsPath: string | undefined;
  private roots = new Map<string, string>();
  private eventListeners = new Map<string, Set<(event: RunEvent) => void>>();
  constructor(options: KernoServiceOptions = {}) {
    this.store = options.storage === "json" ? new JsonStateStore(options.databasePath ?? join(process.cwd(), ".kerno", "kerno-state.json")) : new SqliteStateStore(options.databasePath ?? ":memory:");
    this.settingsPath = options.settingsPath;
  }
  close(): void { this.store.close(); }

  private settingsId(repositoryId?: string): string { return stableId("settings", repositoryId ?? "global"); }
  private storedSettings(id: string): KernoSettings | undefined {
    if (!this.settingsPath) return this.store.get<KernoSettings>("settings", id);
    const settingsStore = new JsonStateStore(this.settingsPath);
    try { return settingsStore.get<KernoSettings>("settings", id); }
    finally { settingsStore.close(); }
  }
  private persistSettings(settings: KernoSettings, repositoryId?: string): void {
    if (!this.settingsPath) { this.store.put("settings", settings.id, settings, repositoryId); return; }
    const settingsStore = new JsonStateStore(this.settingsPath);
    try { settingsStore.put("settings", settings.id, settings, repositoryId); }
    finally { settingsStore.close(); }
  }
  private defaultSettings(repositoryId?: string): KernoSettings {
    const global = repositoryId ? this.storedSettings(this.settingsId()) : undefined;
    return kernoSettingsSchema.parse({
      id: this.settingsId(repositoryId), schemaVersion: "1", repositoryId: repositoryId ?? null,
      onboardingVersion: global?.onboardingVersion ?? 0, onboardingCompletedAt: global?.onboardingCompletedAt ?? null,
      capsuleBudget: global?.capsuleBudget ?? 2500,
      maxAutomaticExpansions: global?.maxAutomaticExpansions ?? 3, routingPreference: global?.routingPreference ?? "balanced",
      telemetry: false, theme: global?.theme ?? "system", density: global?.density ?? "comfortable",
      showEstimates: global?.showEstimates ?? true, updatedAt: new Date().toISOString()
    });
  }

  getSettings(input: unknown = {}): KernoSettings {
    const { repositoryId } = getKernoSettingsInputSchema.parse(input);
    const stored = this.storedSettings(this.settingsId(repositoryId));
    return stored ? kernoSettingsSchema.parse(stored) : this.defaultSettings(repositoryId);
  }

  updateSettings(input: unknown): KernoSettings {
    const parsed = updateKernoSettingsInputSchema.parse(input);
    const current = this.getSettings({ ...(parsed.repositoryId ? { repositoryId: parsed.repositoryId } : {}) });
    const next = kernoSettingsSchema.parse({ ...current, ...parsed.patch, telemetry: false, updatedAt: new Date().toISOString() });
    this.persistSettings(next, parsed.repositoryId);
    return next;
  }

  panel(input: unknown): KernoPanelData {
    const parsed = renderKernoPanelInputSchema.parse(input);
    const requestedCapsule = parsed.capsuleId ? this.store.capsule(parsed.capsuleId) : undefined;
    const capsuleTask = requestedCapsule ? this.store.task(requestedCapsule.taskAnalysisId) : undefined;
    const repositoryId = parsed.repositoryId ?? capsuleTask?.repositoryId ?? this.store.list<IndexSnapshot>("snapshot")[0]?.repository.id;
    const snapshot = repositoryId ? this.store.latestSnapshot(repositoryId) : undefined;
    const settings = this.getSettings({ ...(repositoryId ? { repositoryId } : {}) });
    const capsule = requestedCapsule ?? (repositoryId ? this.store.capsules(repositoryId)[0] : undefined);
    const task = capsule ? this.store.task(capsule.taskAnalysisId) : repositoryId ? this.store.list<TaskAnalysis>("task", repositoryId)[0] : undefined;
    const route = repositoryId ? this.store.list<RouteDecision>("route", repositoryId)[0] : undefined;
    const run = parsed.runId ? this.store.get<Record<string, any>>("run", parsed.runId) : repositoryId ? this.store.list<Record<string, any>>("run", repositoryId)[0] : this.store.list<Record<string, any>>("run")[0];
    const runId = typeof run?.id === "string" ? run.id : undefined;
    const events = runId ? this.store.events(runId).slice(-500) : [];
    const observedEffective = typeof run?.model?.effective === "string" && ["verified", "rerouted"].includes(String(run?.model?.truthLabel)) ? run.model.effective : route?.effective?.model ?? null;
    const requestedModel = typeof run?.model?.requested === "string" ? run.model.requested : route?.requested?.model ?? null;
    const recommendedModel = route?.recommended.model ?? null;
    const reasoningEffort = typeof run?.model?.reasoningEffort === "string" ? run.model.reasoningEffort : route?.effective?.reasoningEffort ?? route?.requested?.reasoningEffort ?? route?.recommended.reasoningEffort ?? null;
    const runtimeState = observedEffective ? "effective-observed" : requestedModel ? "requested-unconfirmed" : recommendedModel ? "recommended-only" : "unavailable";
    const testStatus = run?.tests?.passed === true ? "passed" : run?.tests?.passed === false ? "failed" : run?.finalStatus === "partial" ? "partial" : "unavailable";
    const memories = repositoryId ? this.store.memories(repositoryId) : [];
    const staleCapsules = repositoryId ? this.store.capsules(repositoryId).filter((item) => item.status === "stale") : [];
    const panel = {
      schemaVersion: "1" as const, generatedAt: new Date().toISOString(), view: parsed.view, mode: "live-local-state" as const,
      onboarding: { completed: settings.onboardingVersion >= KERNO_ONBOARDING_VERSION, currentVersion: KERNO_ONBOARDING_VERSION }, settings,
      repository: snapshot ? {
        id: snapshot.repository.id, name: basename(snapshot.repository.canonicalRoot), branch: snapshot.worktree.branch,
        head: snapshot.worktree.headCommit, dirty: snapshot.worktree.dirty, indexedAt: snapshot.indexedAt,
        files: snapshot.files.length, symbols: snapshot.files.reduce((sum, file) => sum + file.symbols.length, 0), edges: snapshot.edges.length,
        memoryCount: memories.length, staleMemoryCount: memories.filter((memory) => memory.status === "stale").length,
        invalidationCount: staleCapsules.length + memories.filter((memory) => memory.status === "stale" || memory.status === "superseded").length
      } : null,
      task: task ? { id: task.id, text: task.taskText, intent: task.intent, createdAt: task.createdAt } : null,
      capsule: capsule ?? null, route: route ?? null,
      runtimeTruth: {
        state: runtimeState, recommendedModel, requestedModel, effectiveModel: observedEffective, reasoningEffort,
        tokenUsage: typeof run?.metrics?.totalTokens === "number" ? run.metrics.totalTokens : null,
        latencyMs: typeof run?.metrics?.latencyMs === "number" ? run.metrics.latencyMs : null
      },
      run: runId ? { id: runId, status: String(run?.finalStatus ?? run?.status ?? "unknown"), testStatus, reviewStatus: String(run?.review?.status ?? "unavailable"), eventCount: events.length } : null,
      events,
      limitations: [
        "Plugin Mode recommends models but cannot silently switch the active parent task model.",
        ...(runtimeState === "requested-unconfirmed" ? ["The requested model is not independently confirmed by runtime evidence."] : []),
        ...(runtimeState === "unavailable" ? ["No App Server route evidence is available for this local state."] : []),
        "Token usage and latency are shown only when observed; unavailable values are not inferred."
      ]
    };
    return kernoPanelDataSchema.parse(panel);
  }

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
    const settings = this.getSettings({ repositoryId: task.repositoryId });
    const capsule = buildContextCapsule(task, snapshot, { ...(parsed.phase ? { phase: parsed.phase } : {}), budgetTokens: parsed.budgetTokens ?? settings.capsuleBudget, memories: this.currentMemories(snapshot) });
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
    const { task, snapshot } = this.repositoryForTask(parent.taskAnalysisId);
    const settings = this.getSettings({ repositoryId: task.repositoryId });
    let expansionDepth = 0; let ancestor: ContextCapsule | undefined = parent;
    while (ancestor.parentCapsuleId) { expansionDepth += 1; ancestor = this.store.capsule(ancestor.parentCapsuleId); if (!ancestor) break; }
    if (expansionDepth >= settings.maxAutomaticExpansions) throw new KernoError("BUDGET_EXCEEDED", `Automatic context expansion is capped at ${settings.maxAutomaticExpansions} child capsule${settings.maxAutomaticExpansions === 1 ? "" : "s"}; human escalation is required`);
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
    const configured = this.getSettings({ repositoryId: task.repositoryId }).routingPreference;
    const preferences = parsed.preferences ?? { latency: configured === "efficiency" ? "fast" as const : configured === "depth" ? "depth" as const : "balanced" as const };
    const decision = routeTask(task, parsed.phase, parsed.catalogSnapshotId, catalog.models, preferences);
    this.store.saveRoute(decision, task.repositoryId); return decision;
  }
  compare(input: unknown): unknown {
    const parsed = compareRunsInputSchema.parse(input); const baselineRaw = this.store.get<BenchmarkRun>("run", parsed.baselineRunId); const kernoRaw = this.store.get<BenchmarkRun>("run", parsed.kernoRunId);
    const baseline = baselineRaw ? benchmarkRunSchema.parse(baselineRaw) : undefined; const kerno = kernoRaw ? benchmarkRunSchema.parse(kernoRaw) : undefined;
    if (!baseline || !kerno) throw new KernoError("UNKNOWN_ID", "Both runs must exist");
    const fairnessFields: Array<[string, unknown, unknown]> = [
      ["pair ID", baseline.pairId, kerno.pairId], ["experiment", baseline.experiment, kerno.experiment], ["task ID", baseline.task.id, kerno.task.id], ["task text", baseline.task.text, kerno.task.text],
      ["starting commit", baseline.task.startingCommit, kerno.task.startingCommit], ["repository", baseline.task.repository, kerno.task.repository], ["permissions", baseline.permissions, kerno.permissions],
      ["profile evidence", baseline.environment.profileEvidenceHash, kerno.environment.profileEvidenceHash], ["test commands", JSON.stringify(baseline.task.testCommands), JSON.stringify(kerno.task.testCommands)]
    ];
    if (baseline.experiment === "context-controlled") fairnessFields.push(["requested model", baseline.model.requested, kerno.model.requested], ["reasoning effort", baseline.model.reasoningEffort, kerno.model.reasoningEffort]);
    const mismatches = fairnessFields.filter(([, left, right]) => left !== right).map(([field]) => field);
    if (!baseline.pairId || !kerno.pairId) mismatches.push("immutable pair ID missing");
    if (baseline.provenance.mode !== "artifact-derived" || kerno.provenance.mode !== "artifact-derived") mismatches.push("artifact-derived provenance missing");
    if (baseline.provenance.taskManifestHash !== kerno.provenance.taskManifestHash) mismatches.push("task manifest provenance");
    if (baseline.environment.profileIsolation !== "verified-clean" || kerno.environment.profileIsolation !== "verified-clean") mismatches.push("profile isolation unverified");
    if (mismatches.length) throw new KernoError("FAIRNESS_MISMATCH", `Run manifests differ: ${mismatches.join(", ")}`);
    const metrics = ["taskSuccess", "testsPassed", "totalTokens", "filesOpened", "repeatedReads", "toolCalls", "contextExpansions", "timeToFirstValidPatchMs", "latencyMs", "changedLines", "unnecessaryChangedLines", "reviewerFindings", "staleContextMistakes"] as const;
    const comparison = { id: stableId("comparison", `${baseline.id}:${kerno.id}`), createdAt: new Date().toISOString(), pairId: baseline.pairId, baselineRunId: baseline.id, kernoRunId: kerno.id, fairness: { passed: true, checked: fairnessFields.map(([field]) => field) }, outcomes: { baseline: { finalStatus: baseline.finalStatus, testsPassed: baseline.tests.passed, reviewStatus: baseline.review.status }, kerno: { finalStatus: kerno.finalStatus, testsPassed: kerno.tests.passed, reviewStatus: kerno.review.status } }, metrics: Object.fromEntries(metrics.map((metric) => [metric, { baseline: baseline.metrics[metric], kerno: kerno.metrics[metric], evidence: { baselineReceipt: baseline.provenance.receiptHash, kernoReceipt: kerno.provenance.receiptHash } }])) };
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
