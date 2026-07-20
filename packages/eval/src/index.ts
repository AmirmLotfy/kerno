import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { KernoService } from "@kerno/daemon";
import { routeTask } from "@kerno/core";
import { benchmarkPhaseRouteSchema, benchmarkReportSchema, benchmarkRunSchema, idSchema, runEventSchema, type BenchmarkReport, type BenchmarkRun, type RunEvent } from "@kerno/contracts";

const execFile = promisify(execFileCallback);
export type DemoReplay = Awaited<ReturnType<typeof recordCanonicalReplay>>;

async function testFixture(root: string): Promise<{ passed: boolean; output: string; durationMs: number; artifactHash: string; exitCode: number }> {
  const started = performance.now();
  try {
    const result = await execFile(process.execPath, ["--test", "--experimental-strip-types", "tests/refund.integration.test.ts", "tests/atomicity.integration.test.ts"], { cwd: root, maxBuffer: 4 * 1024 * 1024 });
    const output = `${result.stdout}\n${result.stderr}`; return { passed: true, output, durationMs: Math.round(performance.now() - started), artifactHash: createHash("sha256").update(output).digest("hex"), exitCode: 0 };
  } catch (error: any) {
    const output = `${error.stdout ?? ""}\n${error.stderr ?? error.message ?? ""}`; return { passed: false, output, durationMs: Math.round(performance.now() - started), artifactHash: createHash("sha256").update(output).digest("hex"), exitCode: typeof error.code === "number" ? error.code : 1 };
  }
}

export async function recordCanonicalReplay(options: { fixtureRoot: string; solutionPath: string }): Promise<{
  schemaVersion: "1"; label: "DETERMINISTIC FIXTURE REPLAY"; recordedAt: string; source: { fixture: string; task: string };
  repository: unknown; task: unknown; initialCapsule: unknown; childCapsule: unknown; route: unknown; tests: unknown; review: unknown; invalidation: unknown; metrics: unknown; timeline: unknown[]; artifactHash: string;
}> {
  const temp = await realpath(await mkdtemp(join(tmpdir(), "kerno-replay-")));
  const worktree = join(temp, "relaycart-ts"); await cp(options.fixtureRoot, worktree, { recursive: true });
  const gitEnv = { ...process.env, GIT_AUTHOR_NAME: "Kerno Replay", GIT_AUTHOR_EMAIL: "replay@local.invalid", GIT_COMMITTER_NAME: "Kerno Replay", GIT_COMMITTER_EMAIL: "replay@local.invalid", GIT_AUTHOR_DATE: "2026-07-19T00:00:00Z", GIT_COMMITTER_DATE: "2026-07-19T00:00:00Z" };
  await execFile("git", ["init", "-b", "main"], { cwd: worktree, env: gitEnv });
  await execFile("git", ["add", "."], { cwd: worktree, env: gitEnv });
  await execFile("git", ["commit", "-m", "fixture-v1"], { cwd: worktree, env: gitEnv });
  const service = new KernoService();
  try {
    const firstIndex = await service.index({ root: worktree, mode: "incremental" });
    const secondIndex = await service.index({ root: worktree, mode: "incremental" });
    const taskText = "A retried refund.succeeded webhook can credit a customer twice if the first delivery commits the ledger entry but times out before the idempotency marker. Make handling exactly-once at the application boundary without changing the public API.";
    // The second incremental index is the current snapshot. Binding the task to
    // firstIndex would make an otherwise identical snapshot stale as soon as the
    // second index commits.
    const task = service.analyze({ repositoryId: secondIndex.repository.id, worktreeId: secondIndex.worktree.id, taskText });
    const initial = await service.buildCapsule({ taskAnalysisId: task.id, budgetTokens: 2500 });
    const models = [
      { id: "catalog-default", displayName: "Catalog default", isDefault: true, hidden: false, supportedReasoningEfforts: ["low", "medium", "high"], defaultReasoningEffort: "medium" },
      { id: "catalog-depth", displayName: "Catalog depth role", isDefault: false, hidden: false, supportedReasoningEfforts: ["high", "xhigh"], defaultReasoningEffort: "high" }
    ];
    const route = routeTask(task, "implementation", "catalog_replay_policy_example", models);
    const routeAt = new Date().toISOString();
    const failing = await testFixture(worktree);
    const failedAt = new Date().toISOString();
    if (failing.passed) throw new Error("Canonical fixture must fail before the solution is applied");
    const failingArtifact = service.recordArtifact({ kind: "test", source: "command", output: failing.output, exitCode: failing.exitCode, command: [process.execPath, "--test", "--experimental-strip-types", "tests/refund.integration.test.ts", "tests/atomicity.integration.test.ts"], trusted: true });
    const child = await service.expand({ capsuleId: initial.id, evidence: { kind: "test_failure", artifactId: failingArtifact.id, text: "TransactionBoundary is required to atomically couple the ledger credit and idempotency marker", symbols: ["TransactionBoundary"] } });
    const solution = await readFile(options.solutionPath, "utf8");
    await writeFile(join(worktree, "src/webhooks/refund-handler.ts"), solution, { mode: 0o600 });
    const passing = await testFixture(worktree);
    const passedAt = new Date().toISOString();
    if (!passing.passed) throw new Error(`Canonical solution did not pass: ${passing.output.slice(0, 1000)}`);
    const reviewUnavailableAt = new Date().toISOString();
    const changedIndex = await service.index({ root: worktree, mode: "incremental" });
    const storedInitial = service.store.capsule(initial.id);
    const recordedAt = new Date().toISOString();
    const timeline = [
      { type: "index.completed", at: firstIndex.indexedAt, detail: `${firstIndex.stats.parsed} files parsed` },
      { type: "index.incremental", at: secondIndex.indexedAt, detail: `${secondIndex.stats.reused} unchanged files reused; ${secondIndex.stats.parsed} reparsed` },
      { type: "task.analyzed", at: task.createdAt, detail: `${task.intent} task bound to current snapshot ${secondIndex.id}` },
      { type: "capsule.created", at: initial.createdAt, detail: `${initial.items.length} items · ${initial.estimatedTokens} estimated tokens` },
      { type: "route.recommended", at: routeAt, detail: `${route.recommended.model} · ${route.recommended.reasoningEffort}; no runtime request in replay` },
      { type: "test.failed", at: failedAt, detail: "TransactionBoundary evidence missing" },
      { type: "capsule.expanded", at: child.createdAt, detail: child.items.map((item) => item.locator.path).join(", ") },
      { type: "test.passed", at: passedAt, detail: "3/3 pinned integration assertions passed" },
      { type: "review.unavailable", at: reviewUnavailableAt, detail: "No independent Codex review ran in deterministic replay" },
      { type: "context.invalidated", at: changedIndex.indexedAt, detail: `Initial capsule is ${storedInitial?.status ?? "unknown"} after handler hash changed` },
      { type: "replay.recorded", at: recordedAt, detail: "Deterministic evidence replay completed; no Codex orchestration or independent review was run" }
    ].map((event, index) => ({ ...event, index })).sort((left, right) => Date.parse(left.at) - Date.parse(right.at) || left.index - right.index).map(({ index: _index, ...event }) => event);
    const resultWithoutHash = {
      schemaVersion: "1" as const, label: "DETERMINISTIC FIXTURE REPLAY" as const, recordedAt, source: { fixture: "relaycart-ts", task: "refund-debug" },
      repository: { id: changedIndex.repository.id, currentSnapshotId: changedIndex.id, taskSnapshotId: secondIndex.id, snapshotStatus: "current", name: "relaycart-ts", branch: changedIndex.worktree.branch, head: changedIndex.worktree.headCommit, dirty: changedIndex.worktree.dirty, startingCommit: firstIndex.worktree.headCommit, files: changedIndex.files.length, symbols: changedIndex.files.reduce((sum, file) => sum + file.symbols.length, 0), indexFreshness: changedIndex.indexedAt, unchangedReparsed: secondIndex.stats.parsed, languageBreakdown: Object.fromEntries([...new Set(changedIndex.files.map((file) => file.language))].map((language) => [language, changedIndex.files.filter((file) => file.language === language).length])), memoryCount: service.store.memories(changedIndex.repository.id).length, invalidationCount: storedInitial?.status === "stale" ? 1 : 0 },
      task, initialCapsule: initial, childCapsule: child,
      route: { ...route, requested: null, effective: null, availableModels: models, runtimeEvents: [], tokenUsage: null, latencyMs: null, result: "not-observed", truthLabel: "RECOMMENDED ONLY — no App Server turn in deterministic replay" },
      tests: { before: { passed: failing.passed, durationMs: failing.durationMs, artifactHash: failing.artifactHash }, after: { passed: passing.passed, durationMs: passing.durationMs, artifactHash: passing.artifactHash } },
      review: { kind: "not-observed", passed: null, findings: null, limitations: "A live Orchestrator Mode run uses a separate read-only Codex thread; this replay does not simulate one." },
      invalidation: { capsuleId: initial.id, status: storedInitial?.status ?? "unknown", changedFiles: changedIndex.files.filter((file) => firstIndex.files.find((old) => old.path === file.path)?.contentHash !== file.contentHash).map((file) => file.path) },
      metrics: { taskSuccess: null, testsPassed: passing.passed ? 3 : 0, threadTokens: null, filesOpened: null, repeatedReads: null, toolCalls: null, timeToFirstValidPatchMs: null, totalLatencyMs: null, unnecessaryChangedLines: null, reviewerFindings: null, staleContextMistakes: null, contextExpansionCount: 1 }, timeline
    };
    const serialized = JSON.stringify(resultWithoutHash)
      .replaceAll(`file://${worktree}`, "[REPLAY_WORKTREE]")
      .replaceAll(worktree, "[REPLAY_WORKTREE]")
      .replaceAll(`file://${temp}`, "[TEMP]")
      .replaceAll(temp, "[TEMP]");
    const sanitized = JSON.parse(serialized) as typeof resultWithoutHash;
    return { ...sanitized, artifactHash: createHash("sha256").update(JSON.stringify(sanitized)).digest("hex") };
  } finally { service.close(); await rm(temp, { recursive: true, force: true }); }
}

const comparableMetrics = ["taskSuccess", "testsPassed", "totalTokens", "filesOpened", "repeatedReads", "toolCalls", "contextExpansions", "timeToFirstValidPatchMs", "latencyMs", "changedLines", "unnecessaryChangedLines", "reviewerFindings", "staleContextMistakes"] as const;

const observableToolItemTypes = new Set(["commandExecution", "mcpToolCall", "collaborationToolCall", "dynamicToolCall", "webSearch"]);
export function countObservableToolCalls(events: RunEvent[]): number {
  return events.filter((event) => event.type === "item/completed" && observableToolItemTypes.has(String((event.redactedPayload as any)?.item?.type ?? ""))).length;
}

const artifactHashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const benchmarkReceiptSchema = z.object({
  schemaVersion: z.literal("1"), runId: idSchema, pairId: idSchema, recordedAt: benchmarkRunSchema.shape.recordedAt,
  experiment: benchmarkRunSchema.shape.experiment, condition: benchmarkRunSchema.shape.condition,
  taskManifestHash: artifactHashSchema, task: benchmarkRunSchema.shape.task,
  environment: benchmarkRunSchema.shape.environment, model: benchmarkRunSchema.shape.model,
  permissions: benchmarkRunSchema.shape.permissions, kernoConfiguration: benchmarkRunSchema.shape.kernoConfiguration,
  implementation: z.object({ failureKind: z.enum(["usage-limit", "authentication", "unavailable", "timeout", "turn-failed"]).nullable(), route: benchmarkPhaseRouteSchema.optional() }).strict(),
  test: z.object({ command: z.string().min(1), exitCode: z.number().int(), startedAt: benchmarkRunSchema.shape.recordedAt, completedAt: benchmarkRunSchema.shape.recordedAt }).strict(),
  review: z.object({ failureKind: z.enum(["usage-limit", "authentication", "unavailable", "timeout", "turn-failed"]).nullable(), route: benchmarkPhaseRouteSchema.optional() }).strict(),
  timing: z.object({ startedAt: benchmarkRunSchema.shape.recordedAt, completedAt: benchmarkRunSchema.shape.recordedAt, totalLatencyMs: z.number().int().nonnegative() }).strict(),
  contextExpansions: z.number().int().nonnegative(),
  artifactHashes: z.object({ events: artifactHashSchema, diff: artifactHashSchema, tests: artifactHashSchema, review: artifactHashSchema }).strict()
}).strict();
export type BenchmarkReceipt = z.infer<typeof benchmarkReceiptSchema>;
export type BenchmarkArtifactBodies = { events: string; diff: string; tests: string; review: string; receipt: string };

function hashText(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function lastTokenUsage(events: RunEvent[]): number | null {
  const payload: any = events.filter((event) => event.type === "thread/tokenUsage/updated").at(-1)?.redactedPayload;
  return typeof payload?.tokenUsage?.total?.totalTokens === "number" ? payload.tokenUsage.total.totalTokens : null;
}
function parseEventArtifact(body: string): { implementation: RunEvent[]; review: RunEvent[] } {
  const parsed = JSON.parse(body);
  if (Array.isArray(parsed)) return { implementation: runEventSchema.array().parse(parsed), review: [] };
  return z.object({ schemaVersion: z.literal("1"), implementation: runEventSchema.array(), review: runEventSchema.array() }).strict().parse(parsed);
}
function testCount(output: string): number | null {
  const tap = [...output.matchAll(/^# pass (\d+)$/gm)].at(-1)?.[1];
  if (tap !== undefined) return Number(tap);
  const unittest = [...output.matchAll(/^Ran (\d+) tests? in /gm)].at(-1)?.[1];
  return unittest === undefined ? null : Number(unittest);
}
function outputSupportsSuccess(output: string): boolean {
  const tapFail = [...output.matchAll(/^# fail (\d+)$/gm)].at(-1)?.[1];
  if (tapFail !== undefined) return Number(tapFail) === 0 && testCount(output) !== null;
  return /^OK(?:\s|$)/m.test(output) && testCount(output) !== null;
}
function parseReviewArtifact(body: string, unavailable: boolean): { status: BenchmarkRun["review"]["status"]; summary: string; findings: number | null } {
  if (unavailable) return { status: "unavailable", summary: body.slice(0, 4000), findings: null };
  const fenced = body.match(/\{[\s\S]*\}/)?.[0];
  try {
    const parsed = JSON.parse(fenced ?? body);
    if (!Array.isArray(parsed.findings)) return { status: "not-observed", summary: body.slice(0, 4000), findings: null };
    const findings = parsed.findings.length;
    return { status: parsed.status === "passed" && findings === 0 ? "passed" : "failed", summary: body.slice(0, 4000), findings };
  } catch { return { status: "not-observed", summary: body.slice(0, 4000), findings: null }; }
}
function changedLines(diff: string): number {
  return diff.split(/\r?\n/).filter((line) => (line.startsWith("+") && !line.startsWith("+++")) || (line.startsWith("-") && !line.startsWith("---"))).length;
}

export function normalizeRecordedRunFromArtifacts(rawRun: unknown, bodies: BenchmarkArtifactBodies, options: { expectedTaskManifestHash?: string } = {}): BenchmarkRun {
  const raw = benchmarkRunSchema.parse(rawRun);
  const receipt = benchmarkReceiptSchema.parse(JSON.parse(bodies.receipt));
  const receiptHash = hashText(bodies.receipt);
  if (raw.artifactHashes.receipt !== receiptHash) throw new Error("receipt artifact hash mismatch");
  if (raw.pairId !== null && raw.pairId !== receipt.pairId) throw new Error("run pair ID does not match its receipt");
  if (options.expectedTaskManifestHash && receipt.taskManifestHash !== options.expectedTaskManifestHash) throw new Error("task manifest hash does not match the pre-registered task");
  for (const kind of ["events", "diff", "tests", "review"] as const) {
    const actual = hashText(bodies[kind]);
    if (receipt.artifactHashes[kind] !== actual || raw.artifactHashes[kind] !== actual) throw new Error(`${kind} artifact hash mismatch`);
  }
  if (!receipt.task.testCommands.includes(receipt.test.command)) throw new Error("test evidence command is not a pre-registered acceptance command");
  const events = parseEventArtifact(bodies.events);
  const testsPassed = receipt.test.exitCode === 0;
  if (testsPassed && !outputSupportsSuccess(bodies.tests)) throw new Error("successful test exit is not corroborated by the test artifact");
  if (!testsPassed && outputSupportsSuccess(bodies.tests)) throw new Error("failed test exit contradicts the test artifact");
  const review = parseReviewArtifact(bodies.review, receipt.review.failureKind !== null);
  const finalStatus: BenchmarkRun["finalStatus"] = receipt.implementation.failureKind === "timeout" ? "timeout"
    : receipt.implementation.failureKind ? "unavailable"
      : testsPassed && review.status === "passed" ? "passed" : testsPassed ? "partial" : "failed";
  const taskSuccess = !testsPassed || review.status === "failed" ? 0 : review.status === "passed" ? 1 : null;
  const derivedFields = ["finalStatus", "tests", "taskSuccess", "testsPassed", "totalTokens", "toolCalls", "latencyMs", "changedLines", "review", "reviewerFindings", "contextExpansions"] as const;
  return benchmarkRunSchema.parse({
    ...raw,
    id: receipt.runId, pairId: receipt.pairId, recordedAt: receipt.recordedAt, experiment: receipt.experiment, condition: receipt.condition,
    task: receipt.task, environment: receipt.environment, model: receipt.model, phaseRoutes: [receipt.implementation.route, receipt.review.route].filter((route): route is NonNullable<typeof route> => Boolean(route)), permissions: receipt.permissions, kernoConfiguration: receipt.kernoConfiguration,
    finalStatus,
    tests: { passed: testsPassed, exitCode: receipt.test.exitCode, artifactHash: receipt.artifactHashes.tests, outputTail: bodies.tests.slice(-4000) },
    metrics: {
      taskSuccess, testsPassed: testCount(bodies.tests), totalTokens: lastTokenUsage(events.implementation), filesOpened: null, repeatedReads: null,
      toolCalls: countObservableToolCalls(events.implementation), contextExpansions: receipt.contextExpansions, timeToFirstValidPatchMs: null,
      latencyMs: receipt.timing.totalLatencyMs, changedLines: changedLines(bodies.diff), unnecessaryChangedLines: null,
      reviewerFindings: review.findings, staleContextMistakes: null
    },
    review: { status: review.status, artifactHash: receipt.artifactHashes.review, summary: review.summary },
    provenance: { mode: "artifact-derived", receiptHash, taskManifestHash: receipt.taskManifestHash, derivedFields: [...derivedFields] },
    limitations: [...raw.limitations.filter((item) => item !== "Legacy run metadata was not derived from a hashed receipt."), "Metrics and status were reconstructed from hash-bound raw artifacts and the inclusive run receipt."]
  });
}

/** Historical compatibility only. Legacy metadata remains explicitly ineligible for fair pairing. */
export function normalizeRecordedRunMetrics(rawRun: unknown, events: RunEvent[]): BenchmarkRun {
  const run = benchmarkRunSchema.parse(rawRun);
  return benchmarkRunSchema.parse({ ...run, provenance: { mode: "legacy-unverified", receiptHash: null, taskManifestHash: null, derivedFields: ["toolCalls"] }, metrics: { ...run.metrics, toolCalls: countObservableToolCalls(events) }, limitations: [...run.limitations, "Legacy run metadata was not derived from a hashed receipt."] });
}

export function buildBenchmarkReport(rawRuns: unknown[]): BenchmarkReport {
  const runs = rawRuns.map((run) => benchmarkRunSchema.parse(run));
  const keys = [...new Set(runs.map((run) => `${run.experiment}:${run.task.id}:${run.pairId ?? "unpaired"}`))];
  const comparisons = keys.map((key) => {
    const [experiment, taskId, encodedPairId] = key.split(":", 3) as [BenchmarkRun["experiment"], string, string];
    const pairId = encodedPairId === "unpaired" ? null : encodedPairId;
    const candidates = runs.filter((run) => run.experiment === experiment && run.task.id === taskId && run.pairId === pairId).sort((left, right) => right.recordedAt.localeCompare(left.recordedAt));
    const baselineCondition = experiment === "context-controlled" ? "plain-codex" : "plain-default-workflow";
    const kernoCondition = experiment === "context-controlled" ? "codex-with-kerno-capsule" : "kerno-phase-routing";
    const baselineRuns = candidates.filter((run) => run.condition === baselineCondition);
    const kernoRuns = candidates.filter((run) => run.condition === kernoCondition);
    const baseline = baselineRuns[0]; const kerno = kernoRuns[0];
    const fairnessFields: Array<[string, unknown, unknown]> = baseline && kerno ? [
      ["task text", baseline.task.text, kerno.task.text], ["starting commit", baseline.task.startingCommit, kerno.task.startingCommit],
      ["repository", baseline.task.repository, kerno.task.repository], ["license", baseline.task.license, kerno.task.license],
      ["branch", baseline.task.branch, kerno.task.branch], ["success criteria", JSON.stringify(baseline.task.successCriteria), JSON.stringify(kerno.task.successCriteria)],
      ["test commands", JSON.stringify(baseline.task.testCommands), JSON.stringify(kerno.task.testCommands)], ["permissions", baseline.permissions, kerno.permissions],
      ["platform", baseline.environment.platform, kerno.environment.platform], ["architecture", baseline.environment.architecture, kerno.environment.architecture],
      ["Node runtime", baseline.environment.node, kerno.environment.node], ["Codex runtime", baseline.environment.codex, kerno.environment.codex],
      ["recording source", baseline.environment.recordedFrom, kerno.environment.recordedFrom], ["profile evidence", baseline.environment.profileEvidenceHash, kerno.environment.profileEvidenceHash],
      ...(experiment === "context-controlled" ? [["model", baseline.model.requested, kerno.model.requested], ["reasoning effort", baseline.model.reasoningEffort, kerno.model.reasoningEffort]] as Array<[string, unknown, unknown]> : [])
    ] : [];
    const mismatches = fairnessFields.filter(([, left, right]) => left !== right).map(([field]) => field);
    if (!pairId) mismatches.push("immutable pair ID missing");
    if (baselineRuns.length > 1 || kernoRuns.length > 1) mismatches.push("duplicate condition in pair");
    if (baseline && kerno && (baseline.provenance.mode !== "artifact-derived" || kerno.provenance.mode !== "artifact-derived")) mismatches.push("artifact-derived provenance missing");
    if (baseline && kerno && baseline.provenance.taskManifestHash !== kerno.provenance.taskManifestHash) mismatches.push("task manifest provenance");
    if (baseline && kerno && (baseline.environment.profileIsolation !== "verified-clean" || kerno.environment.profileIsolation !== "verified-clean")) mismatches.push("profile isolation unverified");
    if (baseline && kerno && (!baseline.environment.profileEvidenceHash || !kerno.environment.profileEvidenceHash)) mismatches.push("profile evidence missing");
    if (baseline && kerno && ([baseline, kerno].some((run) => !run.artifactHashes.events || !run.artifactHashes.diff || !run.artifactHashes.tests || !run.artifactHashes.review))) mismatches.push("artifact hashes unverified");
    if (baseline && kerno && ([baseline, kerno].some((run) => run.tests.artifactHash !== run.artifactHashes.tests || run.review.artifactHash !== run.artifactHashes.review))) mismatches.push("artifact result hashes inconsistent");
    const outcome = (run: BenchmarkRun | undefined) => run ? { finalStatus: run.finalStatus, testsPassed: run.tests.passed, testArtifactHash: run.tests.artifactHash, reviewStatus: run.review.status, reviewerFindings: run.metrics.reviewerFindings } : null;
    return {
      pairId, taskId, experiment, baselineRunId: baseline?.id ?? null, kernoRunId: kerno?.id ?? null,
      fairness: { passed: Boolean(baseline && kerno) && mismatches.length === 0, mismatches: baseline && kerno ? mismatches : ["missing condition"] },
      outcomes: { baseline: outcome(baseline), kerno: outcome(kerno) },
      metrics: Object.fromEntries(comparableMetrics.map((metric) => [metric, { baseline: baseline?.metrics[metric] ?? null, kerno: kerno?.metrics[metric] ?? null }]))
    };
  });
  return benchmarkReportSchema.parse({ schemaVersion: "1", generatedAt: new Date().toISOString(), runCount: runs.length, runs, comparisons });
}

function csvCell(value: unknown): string { const text = value === null || value === undefined ? "" : String(value); return `"${text.replaceAll('"', '""')}"`; }
export function benchmarkCsv(report: BenchmarkReport): string {
  const headers = ["run_id", "pair_id", "provenance", "task_id", "experiment", "condition", "repository", "license", "starting_commit", "model_requested", "reasoning_effort", "model_effective", "final_status", "tests_passed", ...comparableMetrics];
  const rows = report.runs.map((run) => [run.id, run.pairId, run.provenance.mode, run.task.id, run.experiment, run.condition, run.task.repository, run.task.license, run.task.startingCommit, run.model.requested, run.model.reasoningEffort, run.model.effective, run.finalStatus, run.tests.passed, ...comparableMetrics.map((metric) => run.metrics[metric])]);
  return `${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

export function benchmarkMarkdown(report: BenchmarkReport): string {
  const lines = ["# Kerno benchmark report", "", `Generated: ${report.generatedAt}`, "", `Recorded real runs: **${report.runCount}**. Missing values are unavailable, never zero.`, "", "| Pair | Task | Experiment | Baseline | Kerno | Fair |", "|---|---|---|---:|---:|---|", ...report.comparisons.map((item) => `| ${item.pairId ?? "Unpaired legacy"} | ${item.taskId} | ${item.experiment} | ${item.baselineRunId ?? "Not recorded"} | ${item.kernoRunId ?? "Not recorded"} | ${item.fairness.passed ? "Yes" : `No — ${item.fairness.mismatches.join(", ")}`} |`), "", "## Runs", "", "| Run | Pair | Provenance | Task | Condition | Status | Tests | Tokens | Inclusive latency | Review |", "|---|---|---|---|---|---|---|---:|---:|---|", ...report.runs.map((run) => `| ${run.id} | ${run.pairId ?? "Unpaired"} | ${run.provenance.mode} | ${run.task.id} | ${run.condition} | ${run.finalStatus} | ${run.tests.passed ? "Passed" : "Failed"} | ${run.metrics.totalTokens ?? "Unavailable"} | ${run.metrics.latencyMs ?? "Unavailable"} | ${run.review.status} |`), "", "No causal or generalized productivity claim is made without complete fair pairs and repeated runs."];
  return `${lines.join("\n")}\n`;
}
