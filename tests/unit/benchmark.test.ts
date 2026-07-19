import { describe, expect, it } from "vitest";
import { benchmarkCsv, benchmarkMarkdown, buildBenchmarkReport } from "@kerno/eval";

function run(condition: "plain-codex" | "codex-with-kerno-capsule", overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "1", id: `benchmark_${condition.replaceAll("-", "_")}`, recordedAt: "2026-07-19T00:00:00.000Z", experiment: "context-controlled", condition,
    task: { id: "task-one", text: "Fix the task", repository: "fixture", license: "Apache-2.0", startingCommit: "abc123", branch: "main", successCriteria: ["tests pass"], testCommands: ["npm test"] },
    environment: { platform: "test", architecture: "test", node: "v22", codex: "codex-test", recordedFrom: "recorded-real-run", profileIsolation: "verified-clean", profileEvidenceHash: "profile-hash" },
    model: { requested: "model-live", reasoningEffort: "low", effective: null, truthLabel: "requested-unconfirmed" }, permissions: "workspace-write:no-network:never-approve",
    kernoConfiguration: condition === "codex-with-kerno-capsule" ? { capsuleBudget: 2500, initialCapsuleId: "capsule_one", childCapsuleId: null, routingPolicy: "pinned" } : null,
    finalStatus: "passed", tests: { passed: true, exitCode: 0, artifactHash: "hash", outputTail: "ok" }, metrics: { taskSuccess: 1, testsPassed: 1, totalTokens: 100, filesOpened: 3, repeatedReads: 0, toolCalls: 4, contextExpansions: condition === "codex-with-kerno-capsule" ? 1 : 0, timeToFirstValidPatchMs: null, latencyMs: 1000, changedLines: 4, unnecessaryChangedLines: 0, reviewerFindings: 0, staleContextMistakes: 0 }, review: { status: "passed", artifactHash: "review-hash", summary: "no findings" }, artifacts: { events: "events.json", diff: "diff.patch", tests: "tests.txt", review: "review.txt" }, artifactHashes: { events: "events-hash", diff: "diff-hash", tests: "tests-hash", review: "review-hash" }, limitations: [], ...overrides
  };
}

describe("benchmark reporting", () => {
  it("builds a fair comparison without inventing missing metrics", () => {
    const report = buildBenchmarkReport([run("plain-codex"), run("codex-with-kerno-capsule")]);
    expect(report.runCount).toBe(2); expect(report.comparisons[0]?.fairness).toEqual({ passed: true, mismatches: [] });
    expect(benchmarkCsv(report)).toContain('"totalTokens"'); expect(benchmarkMarkdown(report)).toContain("No causal or generalized productivity claim");
  });

  it("marks an incomplete comparison unfair", () => {
    const report = buildBenchmarkReport([run("plain-codex")]);
    expect(report.comparisons[0]?.fairness).toEqual({ passed: false, mismatches: ["missing condition"] });
    expect(report.comparisons[0]!.metrics.totalTokens!.kerno).toBeNull();
  });
});
