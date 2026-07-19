import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { KernoService } from "@kerno/daemon";
import { routeTask } from "@kerno/core";
import { benchmarkReportSchema, benchmarkRunSchema, type BenchmarkReport, type BenchmarkRun } from "@kerno/contracts";

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
  const temp = await mkdtemp(join(tmpdir(), "kerno-replay-"));
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
    const task = service.analyze({ repositoryId: firstIndex.repository.id, taskText });
    const initial = service.buildCapsule({ taskAnalysisId: task.id, budgetTokens: 2500 });
    const failing = await testFixture(worktree);
    if (failing.passed) throw new Error("Canonical fixture must fail before the solution is applied");
    const failingArtifact = service.recordArtifact({ kind: "test", source: "command", output: failing.output, exitCode: failing.exitCode, command: [process.execPath, "--test", "--experimental-strip-types", "tests/refund.integration.test.ts", "tests/atomicity.integration.test.ts"] });
    const child = service.expand({ capsuleId: initial.id, evidence: { kind: "test_failure", artifactId: failingArtifact.id, text: "TransactionBoundary is required to atomically couple the ledger credit and idempotency marker", symbols: ["TransactionBoundary"] } });
    const solution = await readFile(options.solutionPath, "utf8");
    await writeFile(join(worktree, "src/webhooks/refund-handler.ts"), solution, { mode: 0o600 });
    const passing = await testFixture(worktree);
    if (!passing.passed) throw new Error(`Canonical solution did not pass: ${passing.output.slice(0, 1000)}`);
    const changedIndex = await service.index({ root: worktree, mode: "incremental" });
    const storedInitial = service.store.capsule(initial.id);
    const models = [
      { id: "catalog-default", displayName: "Catalog default", isDefault: true, hidden: false, supportedReasoningEfforts: ["low", "medium", "high"], defaultReasoningEffort: "medium" },
      { id: "catalog-depth", displayName: "Catalog depth role", isDefault: false, hidden: false, supportedReasoningEfforts: ["high", "xhigh"], defaultReasoningEffort: "high" }
    ];
    const route = routeTask(task, "implementation", "catalog_replay_policy_example", models);
    const timeline = [
      { type: "index.completed", at: firstIndex.indexedAt, detail: `${firstIndex.stats.parsed} files parsed` },
      { type: "index.incremental", at: secondIndex.indexedAt, detail: `${secondIndex.stats.reused} unchanged files reused; ${secondIndex.stats.parsed} reparsed` },
      { type: "capsule.created", at: initial.createdAt, detail: `${initial.items.length} items · ${initial.estimatedTokens} estimated tokens` },
      { type: "route.recommended", at: initial.createdAt, detail: `${route.recommended.model} · ${route.recommended.reasoningEffort}; no runtime request in replay` },
      { type: "test.failed", at: new Date().toISOString(), detail: "TransactionBoundary evidence missing" },
      { type: "capsule.expanded", at: child.createdAt, detail: child.items.map((item) => item.locator.path).join(", ") },
      { type: "test.passed", at: new Date().toISOString(), detail: "3/3 pinned integration assertions passed" },
      { type: "review.unavailable", at: new Date().toISOString(), detail: "No independent Codex review ran in deterministic replay" },
      { type: "context.invalidated", at: changedIndex.indexedAt, detail: `Initial capsule is ${storedInitial?.status ?? "unknown"} after handler hash changed` }
    ];
    const resultWithoutHash = {
      schemaVersion: "1" as const, label: "DETERMINISTIC FIXTURE REPLAY" as const, recordedAt: new Date().toISOString(), source: { fixture: "relaycart-ts", task: "refund-debug" },
      repository: { id: firstIndex.repository.id, name: "relaycart-ts", branch: firstIndex.worktree.branch, head: firstIndex.worktree.headCommit, dirty: firstIndex.worktree.dirty, files: firstIndex.files.length, symbols: firstIndex.files.reduce((sum, file) => sum + file.symbols.length, 0), indexFreshness: changedIndex.indexedAt, unchangedReparsed: secondIndex.stats.parsed, languageBreakdown: Object.fromEntries([...new Set(firstIndex.files.map((file) => file.language))].map((language) => [language, firstIndex.files.filter((file) => file.language === language).length])), memoryCount: service.store.memories(firstIndex.repository.id).length, invalidationCount: storedInitial?.status === "stale" ? 1 : 0 },
      task, initialCapsule: initial, childCapsule: child,
      route: { ...route, requested: null, effective: null, availableModels: models, runtimeEvents: [], tokenUsage: null, latencyMs: null, result: "not-observed", truthLabel: "RECOMMENDED ONLY — no App Server turn in deterministic replay" },
      tests: { before: { passed: failing.passed, durationMs: failing.durationMs, artifactHash: failing.artifactHash }, after: { passed: passing.passed, durationMs: passing.durationMs, artifactHash: passing.artifactHash } },
      review: { kind: "not-observed", passed: null, findings: null, limitations: "A live Orchestrator Mode run uses a separate read-only Codex thread; this replay does not simulate one." },
      invalidation: { capsuleId: initial.id, status: storedInitial?.status ?? "unknown", changedFiles: changedIndex.files.filter((file) => firstIndex.files.find((old) => old.path === file.path)?.contentHash !== file.contentHash).map((file) => file.path) },
      metrics: { taskSuccess: null, testsPassed: passing.passed ? 3 : 0, threadTokens: null, filesOpened: null, repeatedReads: null, toolCalls: null, timeToFirstValidPatchMs: null, totalLatencyMs: null, unnecessaryChangedLines: null, reviewerFindings: null, staleContextMistakes: null, contextExpansionCount: 1 }, timeline
    };
    return { ...resultWithoutHash, artifactHash: createHash("sha256").update(JSON.stringify(resultWithoutHash)).digest("hex") };
  } finally { service.close(); await rm(temp, { recursive: true, force: true }); }
}

const comparableMetrics = ["totalTokens", "filesOpened", "repeatedReads", "toolCalls", "contextExpansions", "latencyMs", "changedLines", "unnecessaryChangedLines", "reviewerFindings"] as const;

export function buildBenchmarkReport(rawRuns: unknown[]): BenchmarkReport {
  const runs = rawRuns.map((run) => benchmarkRunSchema.parse(run));
  const keys = [...new Set(runs.map((run) => `${run.experiment}:${run.task.id}`))];
  const comparisons = keys.map((key) => {
    const [experiment, taskId] = key.split(":", 2) as [BenchmarkRun["experiment"], string];
    const candidates = runs.filter((run) => run.experiment === experiment && run.task.id === taskId).sort((left, right) => right.recordedAt.localeCompare(left.recordedAt));
    const baselineCondition = experiment === "context-controlled" ? "plain-codex" : "plain-default-workflow";
    const kernoCondition = experiment === "context-controlled" ? "codex-with-kerno-capsule" : "kerno-phase-routing";
    const baseline = candidates.find((run) => run.condition === baselineCondition);
    const kerno = candidates.find((run) => run.condition === kernoCondition);
    const fairnessFields: Array<[string, unknown, unknown]> = baseline && kerno ? [
      ["task text", baseline.task.text, kerno.task.text], ["starting commit", baseline.task.startingCommit, kerno.task.startingCommit],
      ["permissions", baseline.permissions, kerno.permissions],
      ...(experiment === "context-controlled" ? [["model", baseline.model.requested, kerno.model.requested], ["reasoning effort", baseline.model.reasoningEffort, kerno.model.reasoningEffort]] as Array<[string, unknown, unknown]> : [])
    ] : [];
    const mismatches = fairnessFields.filter(([, left, right]) => left !== right).map(([field]) => field);
    return {
      taskId, experiment, baselineRunId: baseline?.id ?? null, kernoRunId: kerno?.id ?? null,
      fairness: { passed: Boolean(baseline && kerno) && mismatches.length === 0, mismatches: baseline && kerno ? mismatches : ["missing condition"] },
      metrics: Object.fromEntries(comparableMetrics.map((metric) => [metric, { baseline: baseline?.metrics[metric] ?? null, kerno: kerno?.metrics[metric] ?? null }]))
    };
  });
  return benchmarkReportSchema.parse({ schemaVersion: "1", generatedAt: new Date().toISOString(), runCount: runs.length, runs, comparisons });
}

function csvCell(value: unknown): string { const text = value === null || value === undefined ? "" : String(value); return `"${text.replaceAll('"', '""')}"`; }
export function benchmarkCsv(report: BenchmarkReport): string {
  const headers = ["run_id", "task_id", "experiment", "condition", "repository", "license", "starting_commit", "model_requested", "reasoning_effort", "model_effective", "final_status", "tests_passed", ...comparableMetrics];
  const rows = report.runs.map((run) => [run.id, run.task.id, run.experiment, run.condition, run.task.repository, run.task.license, run.task.startingCommit, run.model.requested, run.model.reasoningEffort, run.model.effective, run.finalStatus, run.tests.passed, ...comparableMetrics.map((metric) => run.metrics[metric])]);
  return `${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

export function benchmarkMarkdown(report: BenchmarkReport): string {
  const lines = ["# Kerno benchmark report", "", `Generated: ${report.generatedAt}`, "", `Recorded real runs: **${report.runCount}**. Missing values are unavailable, never zero.`, "", "| Task | Experiment | Baseline | Kerno | Fair |", "|---|---|---:|---:|---|", ...report.comparisons.map((item) => `| ${item.taskId} | ${item.experiment} | ${item.baselineRunId ?? "Not recorded"} | ${item.kernoRunId ?? "Not recorded"} | ${item.fairness.passed ? "Yes" : `No — ${item.fairness.mismatches.join(", ")}`} |`), "", "## Runs", "", "| Run | Task | Condition | Status | Tests | Tokens | Latency | Review |", "|---|---|---|---|---|---:|---:|---|", ...report.runs.map((run) => `| ${run.id} | ${run.task.id} | ${run.condition} | ${run.finalStatus} | ${run.tests.passed ? "Passed" : "Failed"} | ${run.metrics.totalTokens ?? "Unavailable"} | ${run.metrics.latencyMs ?? "Unavailable"} | ${run.review.status} |`), "", "No causal or generalized productivity claim is made without complete fair pairs and repeated runs."];
  return `${lines.join("\n")}\n`;
}
