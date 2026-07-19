import { describe, expect, it } from "vitest";
import { analyzeTask, buildContextCapsule, routeTask } from "@kerno/core";
import { indexRepository } from "@kerno/indexer";
import { fileURLToPath } from "node:url";

const fixture = fileURLToPath(new URL("../../fixtures/relaycart-ts/seed", import.meta.url));
const taskText = "A retried refund.succeeded webhook can credit a customer twice if the first delivery commits the ledger entry but times out before the idempotency marker. Make handling exactly-once at the application boundary without changing the public API.";

describe("context engine", () => {
  it("builds a deterministic bounded capsule with provenance", async () => {
    const snapshot = await indexRepository(fixture);
    const task = analyzeTask(snapshot.repository.id, snapshot.id, taskText);
    const first = buildContextCapsule(task, snapshot, { budgetTokens: 2500 });
    const second = buildContextCapsule(task, snapshot, { budgetTokens: 2500 });
    expect(first.estimatedTokens).toBeLessThanOrEqual(2500);
    expect(first.items.length).toBeGreaterThan(0);
    expect(first.items.every((item) => item.provenance.length && item.reason && item.invalidationKeys.length)).toBe(true);
    expect(first.items.map((item) => item.locator.path)).toEqual(second.items.map((item) => item.locator.path));
    expect(first.items.some((item) => item.locator.path.includes("transaction-boundary"))).toBe(false);
  });

  it("selects only a live catalog model and supported effort", async () => {
    const snapshot = await indexRepository(fixture);
    const task = analyzeTask(snapshot.repository.id, snapshot.id, taskText);
    const models = [
      { id: "efficient", isDefault: true, hidden: false, supportedReasoningEfforts: ["low", "medium"], defaultReasoningEffort: "medium" },
      { id: "deep", isDefault: false, hidden: false, supportedReasoningEfforts: ["medium", "high", "xhigh"], defaultReasoningEffort: "high" }
    ];
    const route = routeTask(task, "final-verification", "catalog_live", models);
    expect(route.recommended).toEqual({ model: "deep", reasoningEffort: "xhigh" });
  });
});
