import { createHash } from "node:crypto";
import type { CapsuleItem, CatalogModel, ContextCapsule, DurableMemory, EvidenceRef, FileSnapshot, IndexSnapshot, RouteDecision, TaskAnalysis, TaskPhase } from "@kerno/contracts";
import { KernoError, stableId } from "@kerno/contracts";

const STOP = new Set(["the", "a", "an", "and", "or", "to", "of", "in", "on", "if", "at", "for", "without", "with", "can", "make", "this", "that", "is", "be", "before", "after", "not"]);
const RISK_TERMS = {
  security: ["security", "auth", "secret", "token", "permission", "injection", "encryption"],
  migration: ["migration", "schema", "database", "backfill", "deploy"],
  broad: ["cross-module", "architecture", "public api", "refactor", "transaction", "concurrency", "exactly-once"]
};

export function tokenize(value: string): string[] {
  return [...new Set(value.toLowerCase().replace(/[^a-z0-9_./-]+/g, " ").split(/\s+/).filter((term) => term.length >= 2 && !STOP.has(term)))];
}
function includesAny(value: string, terms: string[]): boolean { return terms.some((term) => value.includes(term)); }
function clamp(value: number): number { return Math.max(0, Math.min(1, value)); }

export function analyzeTask(repositoryId: string, snapshotId: string, taskText: string): TaskAnalysis {
  if (!taskText.trim()) throw new KernoError("INVALID_INPUT", "Task text is required");
  const lower = taskText.toLowerCase();
  const intent: TaskAnalysis["intent"] = includesAny(lower, ["bug", "fix", "fails", "error", "duplicate", "retry"]) ? "debugging"
    : includesAny(lower, ["refactor", "rename", "extract"]) ? "refactor"
      : includesAny(lower, ["test", "coverage"]) ? "test"
        : includesAny(lower, ["review", "audit"]) ? "review"
          : includesAny(lower, ["document", "readme"]) ? "documentation" : "change";
  const explicitPaths = [...taskText.matchAll(/(?:^|\s)([\w.-]+(?:\/[\w.-]+)+\.[A-Za-z0-9]+)/g)].map((match) => match[1]!).filter((path) => !path.split("/").includes(".."));
  const symbols = [...taskText.matchAll(/\b[A-Z][A-Za-z0-9_]{2,}\b|\b[a-z_][A-Za-z0-9_]+\([^)]*\)/g)].map((match) => match[0].replace(/\(.*$/, ""));
  const terms = tokenize(taskText);
  const security = includesAny(lower, RISK_TERMS.security) ? 0.85 : 0.15;
  const migration = includesAny(lower, RISK_TERMS.migration) ? 0.8 : 0.1;
  const broad = includesAny(lower, RISK_TERMS.broad);
  const complexity = clamp(0.25 + (broad ? 0.35 : 0) + (intent === "debugging" ? 0.15 : 0) + (terms.length > 20 ? 0.15 : 0));
  const blastRadius = clamp(0.2 + (broad ? 0.4 : 0) + (lower.includes("public api") ? 0.25 : 0));
  const uncertainty = clamp(0.25 + (intent === "debugging" ? 0.25 : 0) + (explicitPaths.length === 0 ? 0.15 : 0));
  return {
    id: stableId("task", `${repositoryId}:${snapshotId}:${taskText}`), repositoryId, snapshotId, taskText, intent,
    terms, explicitPaths, symbols,
    risk: { complexity, blastRadius, uncertainty, security, migration, contextBreadth: broad ? 0.75 : 0.35 },
    createdAt: new Date().toISOString()
  };
}

type Candidate = { file: FileSnapshot; item: CapsuleItem; eligible: boolean };
function termRelevance(task: TaskAnalysis, file: FileSnapshot): number {
  const pathAndSymbols = `${file.path} ${file.symbols.map((symbol) => symbol.name).join(" ")}`.toLowerCase();
  const exact = task.explicitPaths.includes(file.path) ? 1 : 0;
  const matches = task.terms.filter((term) => pathAndSymbols.includes(term)).length;
  const symbolMatches = task.symbols.filter((symbol) => pathAndSymbols.includes(symbol.toLowerCase())).length;
  return clamp(Math.max(exact, (matches / Math.max(5, task.terms.length)) * 2.2 + symbolMatches * 0.25));
}
function graphDistances(snapshot: IndexSnapshot, seeds: Set<string>, maxDepth: number): Map<string, number> {
  const symbolPath = new Map(snapshot.files.flatMap((file) => file.symbols.map((symbol) => [symbol.id, file.path] as const)));
  const asPath = (locator: string) => snapshot.files.some((file) => file.path === locator) ? locator : symbolPath.get(locator);
  const result = new Map<string, number>();
  const queue = [...seeds].map((path) => ({ path, distance: 0 }));
  while (queue.length) {
    const next = queue.shift()!;
    if (result.has(next.path) || next.distance > maxDepth) continue;
    result.set(next.path, next.distance);
    for (const edge of snapshot.edges) {
      const from = asPath(edge.from); const to = asPath(edge.to);
      if (from === next.path && to) queue.push({ path: to, distance: next.distance + 1 });
      if (to === next.path && from) queue.push({ path: from, distance: next.distance + 1 });
    }
  }
  return result;
}
function riskImportance(task: TaskAnalysis, file: FileSnapshot): number {
  const text = `${file.path} ${file.symbols.map((symbol) => symbol.name).join(" ")}`.toLowerCase();
  const critical = includesAny(text, ["security", "auth", "transaction", "migration", "schema", "ledger", "idempotency", "permission"]);
  return clamp((task.risk.security + task.risk.migration + task.risk.blastRadius) / 3 + (critical ? 0.25 : 0));
}
function reasonFor(file: FileSnapshot, relevance: number, graph: number, test: number): string {
  const reasons: string[] = [];
  if (relevance >= 0.55) reasons.push("direct task or symbol match");
  else if (relevance > 0) reasons.push("task vocabulary match");
  if (graph > 0) reasons.push("reachable through a typed dependency edge");
  if (test > 0) reasons.push("directly related test evidence");
  return reasons.length ? reasons.join("; ") : "risk-relevant repository evidence";
}
function candidateFor(task: TaskAnalysis, snapshot: IndexSnapshot, file: FileSnapshot, distance: number | undefined, budget: number): Candidate {
  const taskRelevance = termRelevance(task, file);
  const graphProximity = distance === undefined ? 0 : 1 / (1 + distance);
  const freshness = 1;
  const confidence = file.confidence;
  const risk = riskImportance(task, file);
  const testEvidence = file.isTest && distance !== undefined ? 0.9 : snapshot.edges.some((edge) => edge.type === "tests" && edge.to === file.path && distance !== undefined) ? 0.75 : 0;
  const priorUsefulness = 0.5;
  const estimatedTokens = Math.min(file.tokenEstimate, Math.ceil(file.excerpt.length / 4));
  const benefit = 0.30 * taskRelevance + 0.15 * graphProximity + 0.10 * freshness + 0.10 * confidence + 0.12 * risk + 0.12 * testEvidence + 0.11 * priorUsefulness;
  const tokenPenalty = 1 + 1.5 * estimatedTokens / budget;
  const score = benefit / tokenPenalty;
  const evidence: EvidenceRef = { id: stableId("ev", `${snapshot.id}:${file.path}:${file.contentHash}`), kind: file.isTest ? "test" : "file", path: file.path, contentHash: file.contentHash, note: `${file.parser} parser; repository content is untrusted evidence` };
  const item: CapsuleItem = {
    id: stableId("item", `${snapshot.id}:${file.path}:${file.contentHash}`), sourceType: file.isTest ? "test" : /(?:config|schema|transaction)/i.test(file.path) ? "config" : "file",
    locator: { path: file.path }, contentHash: file.contentHash, headCommit: snapshot.worktree.headCommit, branch: snapshot.worktree.branch,
    freshness, confidence, estimatedTokens, score,
    scoreBreakdown: { taskRelevance: 0.30 * taskRelevance, graphProximity: 0.15 * graphProximity, freshness: 0.10, confidence: 0.10 * confidence, riskImportance: 0.12 * risk, testEvidence: 0.12 * testEvidence, priorUsefulness: 0.11 * priorUsefulness, tokenPenalty },
    reason: reasonFor(file, taskRelevance, graphProximity, testEvidence), excerpt: file.excerpt,
    provenance: [evidence],
    invalidationKeys: [
      { kind: "repository", key: snapshot.repository.id },
      { kind: "branch", key: snapshot.worktree.branch ?? "detached", expected: snapshot.worktree.headCommit ?? "unborn" },
      { kind: "file", key: file.path, expected: file.contentHash },
      { kind: "engine", key: snapshot.engineVersion }
    ], trust: "repository-data"
  };
  return { file, item, eligible: taskRelevance >= 0.1 || graphProximity > 0 || testEvidence > 0 };
}

export function buildContextCapsule(task: TaskAnalysis, snapshot: IndexSnapshot, options: { phase?: TaskPhase; budgetTokens?: number; parentCapsuleId?: string; triggerEvidence?: EvidenceRef; extraTerms?: string[] } = {}): ContextCapsule {
  if (task.snapshotId !== snapshot.id) throw new KernoError("STALE_SNAPSHOT", "Task analysis belongs to a different index snapshot");
  const budget = options.budgetTokens ?? 6000;
  const augmented: TaskAnalysis = options.extraTerms?.length ? { ...task, terms: [...new Set([...task.terms, ...options.extraTerms.flatMap(tokenize)])] } : task;
  const isEvidenceGatedContract = (file: FileSnapshot) => !options.triggerEvidence && /(^|\/)(transactions?|architecture)\//i.test(file.path) && !task.terms.includes("transaction") && !task.explicitPaths.includes(file.path);
  const direct = new Set(snapshot.files.filter((file) => !isEvidenceGatedContract(file) && (termRelevance(augmented, file) >= 0.3 || task.explicitPaths.includes(file.path))).map((file) => file.path));
  const distances = graphDistances(snapshot, direct, options.triggerEvidence ? 3 : 1);
  const candidates = snapshot.files.map((file) => {
    const candidate = candidateFor(augmented, snapshot, file, distances.get(file.path), budget);
    return isEvidenceGatedContract(file) ? { ...candidate, eligible: false } : candidate;
  }).sort((a, b) => {
    const triggerMatch = (candidate: Candidate) => options.triggerEvidence && ((options.triggerEvidence.path && candidate.file.path === options.triggerEvidence.path) || (options.triggerEvidence.symbol && candidate.file.symbols.some((symbol) => symbol.name.toLowerCase() === options.triggerEvidence!.symbol!.toLowerCase())));
    return Number(Boolean(triggerMatch(b))) - Number(Boolean(triggerMatch(a))) || b.item.score - a.item.score || a.file.path.localeCompare(b.file.path);
  });
  const items: CapsuleItem[] = [];
  const excluded: ContextCapsule["excluded"] = [];
  let used = 0;
  for (const candidate of candidates) {
    if (!candidate.eligible) { excluded.push({ path: candidate.file.path, score: candidate.item.score, reason: "below initial evidence threshold; available for evidence-driven expansion" }); continue; }
    if (used + candidate.item.estimatedTokens > budget) { excluded.push({ path: candidate.file.path, score: candidate.item.score, reason: "capsule token budget" }); continue; }
    const duplicate = items.some((item) => item.contentHash === candidate.item.contentHash || item.locator.path === candidate.item.locator.path);
    if (duplicate) { excluded.push({ path: candidate.file.path, score: candidate.item.score, reason: "deduplicated" }); continue; }
    items.push(candidate.item); used += candidate.item.estimatedTokens;
  }
  const createdAt = new Date().toISOString();
  const identity = `${task.id}:${snapshot.id}:${options.parentCapsuleId ?? "root"}:${options.triggerEvidence?.id ?? "initial"}:${items.map((item) => item.id).join(",")}`;
  return {
    id: stableId("capsule", identity), taskAnalysisId: task.id, snapshotId: snapshot.id,
    ...(options.parentCapsuleId ? { parentCapsuleId: options.parentCapsuleId } : {}),
    phase: options.phase ?? "targeted-retrieval", budgetTokens: budget, estimatedTokens: used, createdAt,
    ...(options.triggerEvidence ? { triggerEvidence: options.triggerEvidence } : {}),
    items, excluded, status: "current"
  };
}

export function expandContextCapsule(parent: ContextCapsule, task: TaskAnalysis, snapshot: IndexSnapshot, evidence: EvidenceRef & { text: string; verified: boolean }, additionalBudgetTokens?: number): ContextCapsule {
  if (!evidence.verified) throw new KernoError("UNVERIFIED_EVIDENCE", "Context expansion requires verified evidence");
  if (parent.snapshotId !== snapshot.id) throw new KernoError("STALE_SNAPSHOT", "Cannot expand a capsule built from a stale snapshot");
  const budget = Math.min(3000, additionalBudgetTokens ?? Math.max(128, Math.floor(parent.budgetTokens * 0.5)));
  const childOnly = buildContextCapsule(task, snapshot, { phase: "debugging", budgetTokens: budget, parentCapsuleId: parent.id, triggerEvidence: evidence, extraTerms: [evidence.text, evidence.symbol ?? "", evidence.path ?? ""] });
  const existing = new Set(parent.items.map((item) => item.id));
  const evidenceTerms = tokenize(evidence.text);
  const additions = childOnly.items.filter((item) => !existing.has(item.id) && evidenceTerms.some((term) => `${item.locator.path} ${item.excerpt.slice(0, 4000)}`.toLowerCase().includes(term)));
  if (!additions.length) throw new KernoError("BUDGET_EXCEEDED", "Verified evidence did not identify any new bounded context");
  return { ...childOnly, items: additions, estimatedTokens: additions.reduce((sum, item) => sum + item.estimatedTokens, 0), excluded: childOnly.excluded };
}

export function explainCapsule(capsule: ContextCapsule, itemIds?: string[]): Array<{ item: CapsuleItem; strongestSignals: string[]; invalidatedWhen: string[] }> {
  const selected = itemIds?.length ? capsule.items.filter((item) => itemIds.includes(item.id)) : capsule.items;
  return selected.map((item) => ({
    item,
    strongestSignals: Object.entries(item.scoreBreakdown).filter(([name]) => name !== "tokenPenalty").sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, value]) => `${name}: ${value.toFixed(3)}`),
    invalidatedWhen: item.invalidationKeys.map((key) => `${key.kind}:${key.key}${key.expected ? ` no longer equals ${key.expected.slice(0, 12)}` : " changes"}`)
  }));
}

export function createMemory(input: {
  repositoryId: string; worktreeId?: string; branch: string | null; headCommit: string | null;
  type: DurableMemory["type"]; summary: string; evidence: EvidenceRef[]; invalidationConditions: DurableMemory["invalidationConditions"];
  creationSource: DurableMemory["creationSource"]; userConfirmed?: boolean; supersedes?: string[];
}): DurableMemory {
  const verifiedByTest = input.creationSource === "test" && input.evidence.some((evidence) => evidence.kind === "test" && evidence.artifactId);
  const userVerified = input.creationSource === "user" && input.userConfirmed === true;
  const status: DurableMemory["status"] = verifiedByTest || userVerified ? "verified" : "candidate";
  const now = new Date().toISOString();
  return {
    id: stableId("memory", `${input.repositoryId}:${input.type}:${input.summary}:${now}`), repositoryId: input.repositoryId,
    ...(input.worktreeId ? { worktreeId: input.worktreeId } : {}), branch: input.branch, headCommit: input.headCommit,
    type: input.type, summary: input.summary, evidence: input.evidence, creationSource: input.creationSource,
    confidence: status === "verified" ? 0.9 : 0.5, lastVerifiedAt: status === "verified" ? now : null,
    invalidationConditions: input.invalidationConditions, status,
    ...(input.supersedes?.length ? { supersedes: input.supersedes } : {})
  };
}

export function invalidateMemory(memory: DurableMemory, previous: IndexSnapshot, current: IndexSnapshot): DurableMemory {
  if (memory.status !== "verified") return memory;
  if (memory.worktreeId && memory.worktreeId !== current.worktree.id) return { ...memory, status: "stale" };
  if (memory.branch && memory.branch !== current.worktree.branch) return { ...memory, status: "stale" };
  for (const key of memory.invalidationConditions) {
    if (key.kind === "file") {
      const file = current.files.find((candidate) => candidate.path === key.key);
      if (!file || (key.expected && file.contentHash !== key.expected)) return { ...memory, status: "stale" };
    }
    if (key.kind === "symbol-signature" || key.kind === "symbol-body") {
      const symbol = current.files.flatMap((file) => file.symbols).find((candidate) => candidate.id === key.key || `${candidate.path}:${candidate.name}` === key.key);
      const actual = key.kind === "symbol-signature" ? symbol?.signatureHash : symbol?.bodyHash;
      if (!actual || (key.expected && actual !== key.expected)) return { ...memory, status: "stale" };
    }
  }
  void previous;
  return memory;
}

const EFFORT_ORDER = ["none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"];
function effortAt(model: CatalogModel, mode: "lowest" | "default" | "highest"): string {
  const supported = [...model.supportedReasoningEfforts].sort((a, b) => EFFORT_ORDER.indexOf(a) - EFFORT_ORDER.indexOf(b));
  if (!supported.length) throw new KernoError("NO_COMPATIBLE_MODEL", `Model ${model.id} exposes no supported reasoning efforts`);
  if (mode === "lowest") return supported[0]!;
  if (mode === "highest") return supported.at(-1)!;
  return model.defaultReasoningEffort && supported.includes(model.defaultReasoningEffort) ? model.defaultReasoningEffort : supported[Math.floor(supported.length / 2)]!;
}
export function routeTask(task: TaskAnalysis, phase: TaskPhase, catalogSnapshotId: string, rawModels: CatalogModel[], preferences?: { latency?: "fast" | "balanced" | "depth" | undefined; efficiencyModel?: string | undefined; depthModel?: string | undefined }): RouteDecision {
  const models = rawModels.filter((model) => !model.hidden && model.supportedReasoningEfforts.length);
  if (!models.length) throw new KernoError("NO_COMPATIBLE_MODEL", "Live model catalog has no compatible models");
  const need = clamp(0.20 * task.risk.complexity + 0.20 * task.risk.blastRadius + 0.20 * task.risk.uncertainty + 0.20 * task.risk.security + 0.10 * task.risk.migration + 0.10 * task.risk.contextBreadth + (["architecture", "security-review", "final-verification"].includes(phase) ? 0.15 : 0) - (["broad-exploration", "targeted-retrieval"].includes(phase) ? 0.15 : 0));
  const defaultModel = models.find((model) => model.isDefault) ?? models[0]!;
  const configuredDepth = models.find((model) => model.id === preferences?.depthModel);
  const configuredEfficiency = models.find((model) => model.id === preferences?.efficiencyModel);
  const depth = configuredDepth ?? [...models].sort((a, b) => EFFORT_ORDER.indexOf(effortAt(b, "highest")) - EFFORT_ORDER.indexOf(effortAt(a, "highest")))[0]!;
  const efficiency = configuredEfficiency ?? defaultModel;
  const wantsDepth = ["architecture", "security-review", "final-verification"].includes(phase) || need >= 0.65 || preferences?.latency === "depth";
  const wantsEfficiency = ["task-classification", "broad-exploration", "targeted-retrieval", "documentation"].includes(phase) || preferences?.latency === "fast";
  const chosen = wantsDepth ? depth : wantsEfficiency ? efficiency : defaultModel;
  const effortMode = wantsDepth ? "highest" : wantsEfficiency ? "lowest" : "default";
  const recommended = { model: chosen.id, reasoningEffort: effortAt(chosen, effortMode) };
  const fallback = { model: defaultModel.id, reasoningEffort: effortAt(defaultModel, "default") };
  return {
    id: stableId("route", `${task.id}:${phase}:${catalogSnapshotId}:${recommended.model}:${recommended.reasoningEffort}`), phase, catalogSnapshotId,
    recommended, confidence: configuredDepth || configuredEfficiency || models.length > 1 ? 0.86 : 0.62,
    reasons: [`phase=${phase}`, `computed need=${need.toFixed(2)}`, wantsDepth ? "risk or verification requires the depth role" : wantsEfficiency ? "bounded retrieval favors the efficiency role" : "balanced implementation role"],
    fallback, escalationConditions: ["test failure", "runtime contradiction", "widening blast radius", "high-severity reviewer finding"],
    budgetImplication: wantsDepth ? "higher" : wantsEfficiency ? "lower" : "normal"
  };
}

export function hashArtifact(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
