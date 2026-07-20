import { afterEach, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { KernoService } from "@kerno/daemon";
import { buildKernoAppHtml } from "../../packages/mcp-server/src/app-ui";

const fixture = fileURLToPath(new URL("../../fixtures/relaycart-ts/seed", import.meta.url));

describe("embedded Kerno experience", () => {
  const services: KernoService[] = [];
  const cleanup: string[] = [];
  afterEach(async () => { while (services.length) services.pop()!.close(); while (cleanup.length) await rm(cleanup.pop()!, { recursive: true, force: true }); });

  it("ships a self-contained, syntactically valid MCP Apps component", () => {
    const html = buildKernoAppHtml();
    const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
    expect(script).toBeTruthy();
    expect(() => new Function(script!)).not.toThrow();
    expect(html).toContain("First-run setup");
    expect(html).toContain("Kerno settings");
    expect(html).toContain("Model-routing truth");
    expect(html).not.toContain("fetch(");
  });

  it("persists onboarding settings separately from process-scoped plugin run state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "kerno-experience-")); cleanup.push(directory);
    const settingsPath = join(directory, "settings.json");
    const first = new KernoService({ storage: "json", databasePath: join(directory, "run-a.json"), settingsPath });
    first.updateSettings({ patch: { onboardingVersion: 1, onboardingCompletedAt: "2026-07-20T00:00:00.000Z", theme: "dark" } });
    first.close();
    const second = new KernoService({ storage: "json", databasePath: join(directory, "run-b.json"), settingsPath }); services.push(second);
    expect(second.getSettings({})).toMatchObject({ onboardingVersion: 1, theme: "dark", telemetry: false });
  });

  it("starts with truthful onboarding defaults and persists explicit local settings", async () => {
    const service = new KernoService(); services.push(service);
    const initial = service.panel({ view: "onboarding" });
    expect(initial).toMatchObject({ mode: "live-local-state", onboarding: { completed: false }, repository: null, runtimeTruth: { state: "unavailable" } });
    expect(initial.settings).toMatchObject({ telemetry: false, capsuleBudget: 2500, routingPreference: "balanced" });

    const snapshot = await service.index({ root: fixture, mode: "incremental" });
    const updated = service.updateSettings({ repositoryId: snapshot.repository.id, patch: { onboardingVersion: 1, onboardingCompletedAt: "2026-07-20T00:00:00.000Z", capsuleBudget: 3000, routingPreference: "depth" } });
    expect(updated).toMatchObject({ repositoryId: snapshot.repository.id, telemetry: false, capsuleBudget: 3000, routingPreference: "depth" });

    const panel = service.panel({ view: "overview", repositoryId: snapshot.repository.id });
    expect(panel).toMatchObject({ onboarding: { completed: true }, repository: { id: snapshot.repository.id, files: snapshot.files.length }, runtimeTruth: { state: "unavailable", effectiveModel: null } });
    expect(panel.limitations.join(" ")).toContain("cannot silently switch");
  });

  it("renders a real capsule and keeps recommendations distinct from runtime evidence", async () => {
    const service = new KernoService(); services.push(service);
    const snapshot = await service.index({ root: fixture, mode: "incremental" });
    const task = service.analyze({ repositoryId: snapshot.repository.id, worktreeId: snapshot.worktree.id, taskText: "Fix duplicate refund credits without changing the public API" });
    const capsule = await service.buildCapsule({ taskAnalysisId: task.id, budgetTokens: 2500 });
    service.recordCatalog("catalog_experience", [{ id: "model-balanced", isDefault: true, hidden: false, supportedReasoningEfforts: ["low", "high"], defaultReasoningEffort: "low" }], "app-server");
    service.route({ taskAnalysisId: task.id, phase: "implementation", catalogSnapshotId: "catalog_experience" });

    const panel = service.panel({ view: "context", repositoryId: snapshot.repository.id, capsuleId: capsule.id });
    expect(panel.capsule?.id).toBe(capsule.id);
    expect(panel.capsule?.items.length).toBeGreaterThan(0);
    expect(panel.runtimeTruth).toMatchObject({ state: "recommended-only", recommendedModel: "model-balanced", requestedModel: null, effectiveModel: null });
  });
});
