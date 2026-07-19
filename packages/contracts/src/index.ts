import { z } from "zod";
import { createHash } from "node:crypto";

export const SCHEMA_VERSION = "1" as const;
export const idSchema = z.string().min(3).max(160);
export const isoDateSchema = z.string().datetime();
export const relativePathSchema = z.string().min(1).max(4096).refine((value) => !value.startsWith("/") && !value.includes("\0") && !value.split("/").includes(".."), "expected a safe repository-relative path");

const SENSITIVE_KEY = /(?:authorization|credential|password|passwd|secret|api[_-]?key|database[_-]?url|private[_-]?key|auth$|token$)/i;
const SENSITIVE_VALUES = [
  /\b(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|GITHUB_TOKEN|NPM_TOKEN|DATABASE_URL)\b\s*[:=]\s*["']?[^\s"',}\\]{8,}["']?/gi,
  /\b(?:api[_-]?key|secret|token|password|database[_-]?url)\b\s*[:=]\s*["']?[^\s"',}\\]{8,}["']?/gi,
  /\bAuthorization\s*:\s*Bearer\s+[A-Za-z0-9._~+/=-]{12,}/gi,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /\b(?:sk(?:-proj)?|ghp|github_pat)[_-][A-Za-z0-9_-]{12,}\b/g
];

export function redactSensitiveString(value: string): { text: string; redacted: boolean } {
  let text = value; let redacted = false;
  for (const pattern of SENSITIVE_VALUES) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) { redacted = true; pattern.lastIndex = 0; text = text.replace(pattern, "[REDACTED_SECRET]"); }
  }
  return { text, redacted };
}

export function redactSensitiveValue(value: unknown, depth = 0): unknown {
  if (depth > 32) return "[TRUNCATED_DEPTH]";
  if (typeof value === "string") return redactSensitiveString(value).text;
  if (Array.isArray(value)) return value.map((item) => redactSensitiveValue(item, depth + 1));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, SENSITIVE_KEY.test(key) ? "[REDACTED_SECRET]" : redactSensitiveValue(item, depth + 1)]));
  return value;
}

export const evidenceRefSchema = z.object({
  id: idSchema,
  kind: z.enum(["file", "symbol", "test", "runtime", "review", "user", "git"]),
  path: relativePathSchema.optional(),
  symbol: z.string().max(512).optional(),
  contentHash: z.string().min(8).optional(),
  artifactId: idSchema.optional(),
  note: z.string().max(2048).optional()
}).strict();
export type EvidenceRef = z.infer<typeof evidenceRefSchema>;

export const evidenceArtifactSchema = z.object({
  id: idSchema,
  kind: z.enum(["test", "runtime", "review"]),
  source: z.enum(["command", "app-server", "hook", "user-confirmed"]),
  contentHash: z.string().length(64),
  createdAt: isoDateSchema,
  exitCode: z.number().int().nullable().optional(),
  command: z.array(z.string().max(4096)).max(64).optional(),
  redactedOutput: z.string().max(64_000),
  verified: z.boolean()
}).strict();
export type EvidenceArtifact = z.infer<typeof evidenceArtifactSchema>;

export const invalidationKeySchema = z.object({
  kind: z.enum(["repository", "worktree", "branch", "commit", "file", "symbol-signature", "symbol-body", "graph", "config", "test-artifact", "engine", "manual"]),
  key: z.string().min(1).max(4096),
  expected: z.string().max(4096).optional()
}).strict();
export type InvalidationKey = z.infer<typeof invalidationKeySchema>;

export const worktreeStateSchema = z.object({
  id: idSchema,
  repositoryId: idSchema,
  canonicalPath: z.string().min(1),
  branch: z.string().nullable(),
  headCommit: z.string().nullable(),
  dirtyDigest: z.string(),
  dirty: z.boolean()
}).strict();
export type WorktreeState = z.infer<typeof worktreeStateSchema>;

export const repositoryIdentitySchema = z.object({
  id: idSchema,
  canonicalRoot: z.string().min(1),
  gitCommonDir: z.string().optional(),
  remoteFingerprint: z.string().optional(),
  initialCommitFingerprint: z.string().optional(),
  ignoreDigest: z.string()
}).strict();
export type RepositoryIdentity = z.infer<typeof repositoryIdentitySchema>;

export const symbolSchema = z.object({
  id: idSchema,
  path: relativePathSchema,
  name: z.string().min(1),
  kind: z.enum(["class", "function", "method", "interface", "type", "variable", "import", "test", "module"]),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  signatureHash: z.string(),
  bodyHash: z.string(),
  confidence: z.number().min(0).max(1)
}).strict();
export type SymbolRecord = z.infer<typeof symbolSchema>;

export const graphEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: z.enum(["imports", "exports", "calls", "tests", "defines", "configures"]),
  confidence: z.number().min(0).max(1)
}).strict();
export type GraphEdge = z.infer<typeof graphEdgeSchema>;

export const fileSnapshotSchema = z.object({
  path: relativePathSchema,
  absolutePath: z.string(),
  contentHash: z.string(),
  size: z.number().int().nonnegative(),
  language: z.enum(["typescript", "javascript", "python", "text"]),
  parser: z.string(),
  confidence: z.number().min(0).max(1),
  tokenEstimate: z.number().int().nonnegative(),
  excerpt: z.string(),
  symbols: z.array(symbolSchema),
  imports: z.array(z.string()),
  exports: z.array(z.string()),
  calls: z.array(z.string()),
  isTest: z.boolean(),
  secretRedacted: z.boolean()
}).strict();
export type FileSnapshot = z.infer<typeof fileSnapshotSchema>;

export const indexSnapshotSchema = z.object({
  id: idSchema,
  repository: repositoryIdentitySchema,
  worktree: worktreeStateSchema,
  indexedAt: isoDateSchema,
  engineVersion: z.string(),
  files: z.array(fileSnapshotSchema),
  edges: z.array(graphEdgeSchema),
  stats: z.object({
    scanned: z.number().int().nonnegative(),
    parsed: z.number().int().nonnegative(),
    reused: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    changed: z.number().int().nonnegative(),
    removed: z.number().int().nonnegative(),
    invalidated: z.number().int().nonnegative(),
    durationMs: z.number().nonnegative()
  }).strict()
}).strict();
export type IndexSnapshot = z.infer<typeof indexSnapshotSchema>;

export const taskPhaseSchema = z.enum(["task-classification", "broad-exploration", "targeted-retrieval", "architecture", "implementation", "test-generation", "debugging", "security-review", "final-verification", "documentation"]);
export type TaskPhase = z.infer<typeof taskPhaseSchema>;

export const taskAnalysisSchema = z.object({
  id: idSchema,
  repositoryId: idSchema,
  snapshotId: idSchema,
  taskText: z.string().min(1).max(64_000),
  intent: z.enum(["debugging", "change", "refactor", "test", "review", "documentation", "unknown"]),
  terms: z.array(z.string()),
  explicitPaths: z.array(relativePathSchema),
  symbols: z.array(z.string()),
  risk: z.object({ complexity: z.number(), blastRadius: z.number(), uncertainty: z.number(), security: z.number(), migration: z.number(), contextBreadth: z.number() }).strict(),
  createdAt: isoDateSchema
}).strict();
export type TaskAnalysis = z.infer<typeof taskAnalysisSchema>;

export const contextSignals = ["taskRelevance", "graphProximity", "freshness", "confidence", "riskImportance", "testEvidence", "priorUsefulness", "tokenPenalty"] as const;
export type ContextSignal = typeof contextSignals[number];
export const capsuleItemSchema = z.object({
  id: idSchema,
  sourceType: z.enum(["file", "symbol", "test", "config", "memory", "history"]),
  locator: z.object({ path: relativePathSchema, symbol: z.string().optional(), range: z.tuple([z.number().int().positive(), z.number().int().positive()]).optional() }).strict(),
  contentHash: z.string(),
  headCommit: z.string().nullable(),
  branch: z.string().nullable(),
  freshness: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  estimatedTokens: z.number().int().nonnegative(),
  score: z.number().nonnegative(),
  scoreBreakdown: z.record(z.enum(contextSignals), z.number()),
  reason: z.string(),
  excerpt: z.string(),
  provenance: z.array(evidenceRefSchema).min(1),
  invalidationKeys: z.array(invalidationKeySchema).min(1),
  trust: z.enum(["repository-data", "verified-memory"])
}).strict();
export type CapsuleItem = z.infer<typeof capsuleItemSchema>;

export const contextCapsuleSchema = z.object({
  id: idSchema,
  taskAnalysisId: idSchema,
  snapshotId: idSchema,
  parentCapsuleId: idSchema.optional(),
  phase: taskPhaseSchema,
  budgetTokens: z.number().int().positive(),
  estimatedTokens: z.number().int().nonnegative(),
  createdAt: isoDateSchema,
  triggerEvidence: evidenceRefSchema.optional(),
  items: z.array(capsuleItemSchema),
  excluded: z.array(z.object({ path: relativePathSchema, score: z.number(), reason: z.string() }).strict()),
  status: z.enum(["current", "stale", "superseded"])
}).strict();
export type ContextCapsule = z.infer<typeof contextCapsuleSchema>;

export const durableMemorySchema = z.object({
  id: idSchema,
  repositoryId: idSchema,
  worktreeId: idSchema.optional(),
  branch: z.string().nullable(),
  headCommit: z.string().nullable(),
  type: z.enum(["architecture-decision", "code-invariant", "api-contract", "product-constraint", "security-boundary", "failed-approach", "test-proven-behavior", "deployment-convention", "user-confirmed-preference"]),
  summary: z.string().min(1).max(16_000),
  evidence: z.array(evidenceRefSchema),
  creationSource: z.enum(["user", "test", "review", "codex", "import"]),
  confidence: z.number().min(0).max(1),
  lastVerifiedAt: isoDateSchema.nullable(),
  invalidationConditions: z.array(invalidationKeySchema),
  status: z.enum(["candidate", "verified", "stale", "superseded", "rejected"]),
  supersedes: z.array(idSchema).optional(),
  supersededBy: idSchema.optional()
}).strict();
export type DurableMemory = z.infer<typeof durableMemorySchema>;

export const modelSelectionSchema = z.object({ model: z.string().min(1), reasoningEffort: z.string().min(1) }).strict();
export const catalogModelSchema = z.object({ id: z.string().min(1), displayName: z.string().optional(), isDefault: z.boolean().default(false), hidden: z.boolean().default(false), supportedReasoningEfforts: z.array(z.string()), defaultReasoningEffort: z.string().optional() }).strict();
export type CatalogModel = z.infer<typeof catalogModelSchema>;
export const routeDecisionSchema = z.object({
  id: idSchema,
  phase: taskPhaseSchema,
  catalogSnapshotId: idSchema,
  recommended: modelSelectionSchema,
  requested: modelSelectionSchema.optional(),
  effective: modelSelectionSchema.optional(),
  effectiveEvidenceId: idSchema.optional(),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()),
  fallback: modelSelectionSchema,
  escalationConditions: z.array(z.string()),
  budgetImplication: z.enum(["lower", "normal", "higher", "unknown"])
}).strict();
export type RouteDecision = z.infer<typeof routeDecisionSchema>;

export const runEventSchema = z.object({
  runId: idSchema,
  sequence: z.number().int().nonnegative(),
  occurredAt: isoDateSchema,
  source: z.enum(["kerno", "mcp", "hook", "app-server", "test", "review"]),
  type: z.string().min(1),
  redactedPayload: z.unknown(),
  rawArtifactHash: z.string().optional()
}).strict();
export type RunEvent = z.infer<typeof runEventSchema>;

const nullableMetric = z.number().nonnegative().nullable();
export const benchmarkRunSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: idSchema,
  recordedAt: isoDateSchema,
  experiment: z.enum(["context-controlled", "full-system"]),
  condition: z.enum(["plain-codex", "codex-with-kerno-capsule", "plain-default-workflow", "kerno-phase-routing"]),
  task: z.object({
    id: z.string().min(1), text: z.string().min(1), repository: z.string().min(1), license: z.string().min(1),
    startingCommit: z.string().min(1), branch: z.string().min(1), successCriteria: z.array(z.string()).min(1), testCommands: z.array(z.string()).min(1)
  }).strict(),
  environment: z.object({
    platform: z.string(), architecture: z.string(), node: z.string(), codex: z.string(), recordedFrom: z.enum(["live-app-server", "recorded-real-run"]),
    profileIsolation: z.enum(["verified-clean", "unverified"]).default("unverified"),
    profileEvidenceHash: z.string().nullable().default(null)
  }).strict(),
  model: z.object({ requested: z.string().nullable(), reasoningEffort: z.string().nullable(), effective: z.string().nullable(), truthLabel: z.enum(["not-requested", "requested-unconfirmed", "rerouted", "verified"]) }).strict(),
  permissions: z.string().min(1),
  kernoConfiguration: z.object({ capsuleBudget: z.number().int().positive(), initialCapsuleId: idSchema, childCapsuleId: idSchema.nullable(), routingPolicy: z.string() }).strict().nullable(),
  finalStatus: z.enum(["passed", "failed", "partial", "timeout", "unavailable"]),
  tests: z.object({ passed: z.boolean(), exitCode: z.number().int().nullable(), artifactHash: z.string(), outputTail: z.string() }).strict(),
  metrics: z.object({
    taskSuccess: nullableMetric.default(null), testsPassed: nullableMetric.default(null), totalTokens: nullableMetric, filesOpened: nullableMetric, repeatedReads: nullableMetric, toolCalls: nullableMetric,
    contextExpansions: nullableMetric, latencyMs: nullableMetric, changedLines: nullableMetric,
    timeToFirstValidPatchMs: nullableMetric.default(null), unnecessaryChangedLines: nullableMetric, reviewerFindings: nullableMetric, staleContextMistakes: nullableMetric.default(null)
  }).strict(),
  review: z.object({ status: z.enum(["passed", "failed", "not-observed", "unavailable"]), artifactHash: z.string().nullable(), summary: z.string() }).strict(),
  artifacts: z.object({ events: z.string().nullable(), diff: z.string().nullable(), tests: z.string(), review: z.string().nullable() }).strict(),
  artifactHashes: z.object({ events: z.string().nullable(), diff: z.string().nullable(), tests: z.string().nullable(), review: z.string().nullable() }).strict().default({ events: null, diff: null, tests: null, review: null }),
  limitations: z.array(z.string())
}).strict();
export type BenchmarkRun = z.infer<typeof benchmarkRunSchema>;

export const benchmarkReportSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION), generatedAt: isoDateSchema, runCount: z.number().int().nonnegative(), runs: z.array(benchmarkRunSchema),
  comparisons: z.array(z.object({
    taskId: z.string(), experiment: z.string(), baselineRunId: idSchema.nullable(), kernoRunId: idSchema.nullable(),
    fairness: z.object({ passed: z.boolean(), mismatches: z.array(z.string()) }).strict(),
    outcomes: z.object({
      baseline: z.object({ finalStatus: z.string(), testsPassed: z.boolean(), testArtifactHash: z.string(), reviewStatus: z.string(), reviewerFindings: z.number().nullable() }).strict().nullable(),
      kerno: z.object({ finalStatus: z.string(), testsPassed: z.boolean(), testArtifactHash: z.string(), reviewStatus: z.string(), reviewerFindings: z.number().nullable() }).strict().nullable()
    }).strict(),
    metrics: z.record(z.string(), z.object({ baseline: z.number().nullable(), kerno: z.number().nullable() }).strict())
  }).strict())
}).strict();
export type BenchmarkReport = z.infer<typeof benchmarkReportSchema>;

export const toolResultSchema = <T extends z.ZodTypeAny>(data: T) => z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  requestId: idSchema,
  repository: z.object({ id: idSchema, worktreeId: idSchema, branch: z.string().nullable(), head: z.string().nullable() }).strict(),
  data,
  warnings: z.array(z.object({ code: z.string(), message: z.string() }).strict())
}).strict();

export const indexRepositoryInputSchema = z.object({ root: z.string().min(1).max(4096), mode: z.enum(["incremental", "full"]).default("incremental"), languages: z.array(z.string().min(1).max(64)).max(32).optional() }).strict();
export const repositoryStatusInputSchema = z.object({ repositoryId: idSchema, worktreeId: idSchema.optional() }).strict();
export const analyzeTaskInputSchema = z.object({ repositoryId: idSchema, worktreeId: idSchema.optional(), taskText: z.string().min(1).max(64_000) }).strict();
export const buildCapsuleInputSchema = z.object({ taskAnalysisId: idSchema, phase: taskPhaseSchema.optional(), budgetTokens: z.number().int().min(128).max(64_000).optional() }).strict();
export const expansionEvidenceSchema = z.object({ kind: z.enum(["test_failure", "runtime", "unresolved_dependency", "review"]), artifactId: idSchema, text: z.string().min(1).max(64_000), paths: z.array(relativePathSchema).max(64).optional(), symbols: z.array(z.string().max(512)).max(64).optional() }).strict();
export const expandContextInputSchema = z.object({ capsuleId: idSchema, evidence: expansionEvidenceSchema, additionalBudgetTokens: z.number().int().min(128).max(3000).optional() }).strict();
export const explainContextInputSchema = z.object({ capsuleId: idSchema, itemIds: z.array(idSchema).max(256).optional() }).strict();
export const impactAnalysisInputSchema = z.object({ repositoryId: idSchema, targets: z.array(z.object({ path: relativePathSchema.optional(), symbol: z.string().max(512).optional() }).strict()).min(1).max(128), depth: z.number().int().min(1).max(4).default(2) }).strict();
export const recordDecisionInputSchema = z.object({
  repositoryId: idSchema,
  type: durableMemorySchema.shape.type,
  summary: durableMemorySchema.shape.summary,
  scope: z.enum(["repository", "branch", "worktree"]),
  evidence: z.array(evidenceRefSchema).max(256),
  invalidationConditions: z.array(invalidationKeySchema).max(256),
  userConfirmed: z.boolean().optional(),
  supersedes: z.array(idSchema).max(64).optional()
}).strict();
export const recordOutcomeInputSchema = z.object({
  runId: idSchema, status: z.enum(["passed", "failed", "partial"]), tests: z.array(evidenceRefSchema).max(128), review: z.array(evidenceRefSchema).max(128), changedFiles: z.array(relativePathSchema).max(512),
  artifacts: z.array(z.object({ kind: z.enum(["test", "runtime", "review"]), source: z.enum(["command", "app-server", "hook", "user-confirmed"]), output: z.string().max(64_000), exitCode: z.number().int().nullable().optional(), command: z.array(z.string().max(4096)).max(64).optional() }).strict()).max(32).optional()
}).strict().refine((value) => Buffer.byteLength(JSON.stringify(value), "utf8") <= 64 * 1024, "record outcome input exceeds 64 KiB");
export const invalidateContextInputSchema = z.object({ repositoryId: idSchema, trigger: z.object({ kind: z.enum(["branch_change", "file_change", "symbol_change", "manual"]), key: z.string().max(4096).optional() }).strict(), memoryIds: z.array(idSchema).max(256).optional(), dryRun: z.boolean().default(true) }).strict();
export const routeTaskInputSchema = z.object({ taskAnalysisId: idSchema, phase: taskPhaseSchema, catalogSnapshotId: idSchema, preferences: z.object({ latency: z.enum(["fast", "balanced", "depth"]).optional(), efficiencyModel: z.string().min(1).max(160).optional(), depthModel: z.string().min(1).max(160).optional() }).strict().optional() }).strict();
export const compareRunsInputSchema = z.object({ baselineRunId: idSchema, kernoRunId: idSchema }).strict();

export type KernoErrorCode = "INVALID_INPUT" | "OUTSIDE_REPOSITORY" | "SYMLINK_ESCAPE" | "REPOSITORY_NOT_ENROLLED" | "INDEX_BUSY" | "STALE_SNAPSHOT" | "UNKNOWN_ID" | "BUDGET_EXCEEDED" | "NO_COMPATIBLE_MODEL" | "UNVERIFIED_EVIDENCE" | "FAIRNESS_MISMATCH" | "INTERNAL_ERROR";
export class KernoError extends Error {
  constructor(public code: KernoErrorCode, message: string, public retryable = false, public details?: unknown) { super(message); this.name = "KernoError"; }
}

export function stableId(prefix: string, value: string): string {
  return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 32)}`;
}
