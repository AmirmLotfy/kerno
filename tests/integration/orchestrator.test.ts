import { afterEach, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { CodexPhaseOrchestrator } from "@kerno/orchestrator";
import { analyzeTask, routeTask } from "@kerno/core";

const fake = fileURLToPath(new URL("../fixtures/fake-app-server.mjs", import.meta.url));
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
});
