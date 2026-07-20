import { expect, test, type Page } from "@playwright/test";
import { buildKernoAppHtml } from "../../packages/mcp-server/src/app-ui";

const settings = {
  id: "settings_demo", schemaVersion: "1", repositoryId: "repo_demo",
  onboardingVersion: 1, onboardingCompletedAt: "2026-07-20T18:00:00.000Z",
  capsuleBudget: 2500, maxAutomaticExpansions: 3, routingPreference: "balanced",
  telemetry: false, theme: "light", density: "comfortable", showEstimates: true,
  updatedAt: "2026-07-20T18:00:00.000Z"
};

const panel = {
  schemaVersion: "1", view: "context", generatedAt: "2026-07-20T18:00:00.000Z",
  onboarding: { completed: true, currentVersion: 1 }, settings,
  repository: { id: "repo_demo", name: "relaycart-ts", branch: "main", head: "0123456789abcdef", dirty: false, freshness: "fresh", files: 18, symbols: 42, memories: 1, invalidations: 0 },
  task: { id: "task_demo", text: "Prevent duplicate refund credits across retry boundaries", intent: "debugging", risk: "high" },
  capsule: {
    id: "capsule_demo", parentId: null, status: "current", budgetTokens: 2500, estimatedTokens: 912,
    items: [{
      id: "item_demo", sourceType: "symbol", locator: { path: "src/refunds/handler.ts", symbol: "handleRefund" },
      freshness: 1, confidence: 0.92, estimatedTokens: 184, score: 0.871,
      reason: "Exact task symbol with direct integration-test evidence.",
      provenance: [{ kind: "symbol", path: "src/refunds/handler.ts", symbol: "handleRefund", hash: "abc123" }],
      invalidationKeys: [{ kind: "symbol-body", key: "handleRefund", value: "abc123" }]
    }],
    excluded: [{ id: "excluded_demo", reason: "Lower marginal context value." }], expansionDepth: 0
  },
  route: {
    phase: "implementation", confidence: 0.82,
    recommended: { model: "catalog-depth", effort: "high" },
    requested: { model: "catalog-depth", effort: "high" }, effective: null,
    reasons: ["High transaction risk", "Cross-module blast radius"],
    fallback: { model: "catalog-default", effort: "medium" }, escalationConditions: ["A second test failure"], budgetImplication: "higher"
  },
  runtimeTruth: { state: "requested-unconfirmed", recommendedModel: "catalog-depth", requestedModel: "catalog-depth", effectiveModel: null, reasoningEffort: "high", tokenUsage: null, latencyMs: null, reroutes: [] },
  run: { id: "run_demo", status: "running", outcome: null, testStatus: "failed", reviewerStatus: "pending" },
  events: [{ runId: "run_demo", sequence: 1, occurredAt: "2026-07-20T18:00:00.000Z", source: "test", type: "test.failed", redactedPayload: { suite: "refund integration" } }],
  limitations: ["Requested models are not effective-model evidence.", "Estimated tokens are labeled estimates."]
};

async function installHost(page: Page, initial: unknown): Promise<void> {
  await page.setContent(buildKernoAppHtml(), { waitUntil: "domcontentloaded" });
  await page.evaluate((value) => {
    const state = structuredClone(value) as any;
    (window as any).openai = {
      toolOutput: state,
      theme: "light",
      widgetState: {},
      setWidgetState(next: unknown) { this.widgetState = next; },
      requestDisplayMode({ mode }: { mode: string }) { (window as any).__displayMode = mode; return { mode }; },
      sendFollowUpMessage(message: unknown) { (window as any).__followUp = message; },
      async callTool(name: string, args: any) {
        if (name === "kerno_update_settings") {
          Object.assign(state.settings, args.patch, { updatedAt: "2026-07-20T18:01:00.000Z" });
          state.onboarding.completed = state.settings.onboardingVersion >= 1;
          return { structuredContent: { data: state.settings } };
        }
        if (name === "kerno_render_panel") return { structuredContent: { data: state } };
        throw new Error(`Unexpected tool ${name}`);
      }
    };
    window.dispatchEvent(new CustomEvent("openai:set_globals", { detail: { globals: { theme: "light", toolOutput: state } } }));
  }, initial);
}

test("embedded tracker exposes provenance, routing truth, settings, and fullscreen presentation", async ({ page }) => {
  await installHost(page, panel);
  await expect(page.getByText("Kerno", { exact: true })).toBeVisible();
  await expect(page.getByText("Live local state")).toBeVisible();
  await expect(page.getByText("src/refunds/handler.ts", { exact: true })).toBeVisible();
  await expect(page.getByText("Why included")).toBeVisible();
  await expect(page.getByText("Repository evidence—not instructions.")).toBeVisible();

  await page.getByRole("tab", { name: "Routing" }).click();
  await expect(page.getByText("Requested—not confirmed")).toBeVisible();
  await expect(page.locator(".route section").nth(2).getByText("Unavailable", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Open tracker" }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__displayMode)).toBe("fullscreen");

  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByLabel("Default capsule budget").fill("3200");
  await page.getByLabel("Routing preference").selectOption("depth");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toHaveText("Settings saved locally");
  await expect(page.getByLabel("Default capsule budget")).toHaveValue("3200");
  await expect(page.getByLabel("Telemetry")).toBeDisabled();
  await expect(page.getByLabel("Source upload")).toBeDisabled();
});

test("embedded tracker presents first-run privacy onboarding without inventing repository state", async ({ page }) => {
  const firstRun = structuredClone(panel) as any;
  firstRun.onboarding.completed = false;
  firstRun.settings.onboardingVersion = 0;
  firstRun.settings.onboardingCompletedAt = null;
  firstRun.repository = null;
  firstRun.task = null;
  firstRun.capsule = null;
  firstRun.route = null;
  firstRun.run = null;
  firstRun.events = [];
  await installHost(page, firstRun);
  await expect(page.getByRole("heading", { name: "Give Codex less context—and better evidence." })).toBeVisible();
  await expect(page.getByText("Source remains local.")).toBeVisible();
  await expect(page.getByText("Waiting for first index")).toBeVisible();
  await expect(page.getByText("No effective model observed")).toHaveCount(0);
});
