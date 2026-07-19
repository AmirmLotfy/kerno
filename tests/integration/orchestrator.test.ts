import { afterEach, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { AppServerClient, CodexPhaseOrchestrator, classifyTurnFailure } from "@kerno/orchestrator";
import { analyzeTask, routeTask } from "@kerno/core";

const fake = fileURLToPath(new URL("../fixtures/fake-app-server.mjs", import.meta.url));
const fakeExit = fileURLToPath(new URL("../fixtures/fake-app-server-exit.mjs", import.meta.url));
const fakeHang = fileURLToPath(new URL("../fixtures/fake-app-server-hang.mjs", import.meta.url));
const cwd = fileURLToPath(new URL("../../fixtures/relaycart-ts/seed", import.meta.url));

describe("App Server orchestration", () => {
  const open: CodexPhaseOrchestrator[] = [];
  afterEach(async () => { while (open.length) await open.pop()!.close(); });
  it("discovers models, accepts an explicit route, and records a reroute as effective", async () => {
    const orchestrator = new CodexPhaseOrchestrator({ command: process.execPath, args: [fake] }); open.push(orchestrator);
    const catalog = await orchestrator.initialize();
    expect(catalog.models.map((model) => model.id)).toEqual(["efficient-model", "depth-model"]);
    const task = analyzeTask("repo_fake", "snapshot_fake", "Review the transaction fix for security and correctness");
    const route = routeTask(task, "final-verification", catalog.catalogSnapshotId, catalog.models);
    const run = await orchestrator.runPhase({ runId: "run_fake", phase: "final-verification", route, cwd, prompt: "Review this capsule" });
    expect(run.route.requested).toEqual(route.recommended);
    expect(run.route.effective?.model).toBe("fallback-live-model");
    expect(run.modelState.label).toBe("rerouted");
    expect(run.outcome.status).toBe("completed");
    expect(run.events.some((event) => event.type === "thread/tokenUsage/updated")).toBe(true);
  });
  it("returns structured unavailable evidence when App Server exits", async () => {
    const orchestrator = new CodexPhaseOrchestrator({ command: process.execPath, args: [fakeExit], requestTimeoutMs: 2_000 }); open.push(orchestrator);
    const catalog = await orchestrator.initialize(); const task = analyzeTask("repo_exit", "snapshot_exit", "inspect transaction risk");
    const route = routeTask(task, "broad-exploration", catalog.catalogSnapshotId, catalog.models);
    const run = await orchestrator.runPhase({ runId: "run_exit", phase: "broad-exploration", route, cwd, prompt: "inspect" });
    expect(run.failureKind).toBe("unavailable");
    expect(run.outcome.error).toMatchObject({ message: "App Server exited with code 7" });
  });
  it("interrupts a timed-out accepted turn and returns structured failure evidence", async () => {
    const orchestrator = new CodexPhaseOrchestrator({ command: process.execPath, args: [fakeHang], requestTimeoutMs: 500 }); open.push(orchestrator);
    const catalog = await orchestrator.initialize(); const task = analyzeTask("repo_hang", "snapshot_hang", "inspect transaction risk");
    const route = routeTask(task, "broad-exploration", catalog.catalogSnapshotId, catalog.models);
    const run = await orchestrator.runPhase({ runId: "run_hang", phase: "broad-exploration", route, cwd, prompt: "inspect" });
    expect(run.outcome.status).toBe("failed");
    expect(run.failureKind).toBe("timeout");
    expect(run.outcome.error).toMatchObject({ message: expect.stringContaining("did not complete before timeout") });
  });
  it("routes exploration, implementation, and fresh review as distinct phase threads", async () => {
    const persisted: unknown[] = []; const orchestrator = new CodexPhaseOrchestrator({ command: process.execPath, args: [fake], eventSink: (event) => persisted.push(event) }); open.push(orchestrator);
    const catalog = await orchestrator.initialize(); const task = analyzeTask("repo_workflow", "snapshot_workflow", "Fix the transaction retry bug and verify it");
    const exploration = routeTask(task, "broad-exploration", catalog.catalogSnapshotId, catalog.models);
    const implementation = routeTask(task, "implementation", catalog.catalogSnapshotId, catalog.models);
    const review = routeTask(task, "final-verification", catalog.catalogSnapshotId, catalog.models);
    const workflow = await orchestrator.runWorkflow({ runId: "run_workflow", cwd, exploration: { route: exploration, prompt: "explore" }, implementation: { route: implementation, prompt: "implement" }, review: { route: review, diff: "diff", acceptance: "tests pass" } });
    expect(workflow.exploration.route.recommended.model).toBe("efficient-model");
    expect(workflow.review.route.recommended.model).toBe("depth-model");
    expect(workflow.review.runId).toContain("_review"); expect(persisted.length).toBeGreaterThan(3);
  });
  it("classifies operational failures without pretending success", () => {
    expect(classifyTurnFailure("failed", { message: "workspace is out of credits" })).toBe("usage-limit");
    expect(classifyTurnFailure("failed", { message: "authentication required" })).toBe("authentication");
  });
  it("rejects malformed model catalogs instead of coercing them", async () => {
    const client = new AppServerClient();
    client.request = async () => ({ data: [{ isDefault: true, supportedReasoningEfforts: [{ unexpected: "value" }] }] });
    await expect(client.listModels()).rejects.toThrow();
  });
  it("accepts forward-compatible thread metadata while validating required route fields", async () => {
    const client = new AppServerClient();
    client.request = async () => ({
      thread: { id: "thread_forward", extra: { future: true }, historyMode: "full" },
      model: "efficient-model",
      runtimeWorkspaceRoots: [cwd],
      activePermissionProfile: { type: "disabled" },
      multiAgentMode: "default"
    });
    await expect(client.startThread({ model: "efficient-model", cwd, mode: "read-only" })).resolves.toMatchObject({ threadId: "thread_forward", acceptedModel: "efficient-model" });
  });
});
