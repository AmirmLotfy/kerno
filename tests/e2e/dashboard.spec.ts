import { expect, test } from "@playwright/test";

test("judge replay exposes every product state and the evidence views", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("DETERMINISTIC FIXTURE REPLAY")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Exactly-once refunds/ })).toBeVisible();
  await expect(page.getByText("Fresh against the recorded worktree")).toBeVisible();

  const picker = page.getByLabel("Judge state tour");
  for (const state of [
    "First launch", "No repository", "Indexing", "Repository ready", "Task received",
    "Capsule generated", "Context expanded", "Route selected", "Orchestration running",
    "Test failed", "Test passed", "Context invalidated", "Run completed",
    "Baseline comparison", "Recoverable error", "Unrecoverable error"
  ]) {
    await picker.selectOption({ label: state });
    await expect(picker).toHaveValue(/.+/);
  }

  await picker.selectOption({ label: "Run completed" });
  await page.getByRole("button", { name: "Context" }).click();
  await expect(page.getByRole("heading", { name: "Small enough to inspect. Complete enough to challenge." })).toBeVisible();
  await expect(page.getByText("Why included")).toBeVisible();
  await expect(page.getByText("Excluded candidates")).toBeVisible();

  await page.getByRole("button", { name: "Routing" }).click();
  await expect(page.getByRole("heading", { name: "Recommendation, request, and runtime truth never collapse into one label." })).toBeVisible();
  await expect(page.getByText("Policy catalog example")).toBeVisible();
  await expect(page.getByText("RECORDED REAL APP SERVER RUN")).toBeVisible();

  await page.getByRole("button", { name: "Comparison" }).click();
  await expect(page.getByRole("heading", { name: "Correctness first. Missing data stays missing." })).toBeVisible();

  await page.getByRole("button", { name: "Limits" }).click();
  await expect(page.getByRole("heading", { name: "Claims bounded by their evidence." })).toBeVisible();
  await expect(page.getByText("Independent review in the deterministic replay", { exact: true })).toBeVisible();
});

test("judge views remain usable on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Exactly-once refunds/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Context" }).click();
  await expect(page.getByText("Why included")).toBeVisible();
  await page.getByRole("button", { name: "Comparison" }).click();
  await expect(page.getByRole("heading", { name: "Correctness first. Missing data stays missing." })).toBeVisible();
});
