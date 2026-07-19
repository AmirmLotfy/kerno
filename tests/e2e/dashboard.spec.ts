import { expect, test } from "@playwright/test";

test("judge replay exposes the proof loop and truthful limitations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("DETERMINISTIC FIXTURE REPLAY")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Exactly-once refunds, proved from evidence." })).toBeVisible();
  await expect(page.getByText("src/transactions/transaction-boundary.ts", { exact: true })).toBeVisible();
  await expect(page.getByText("Never inferred from recommendation", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Comparison" }).click();
  await expect(page.getByRole("heading", { name: "Correctness first. Missing data stays missing." })).toBeVisible();
  await expect(page.getByText("This artifact proves Kerno’s deterministic context loop, not a Codex-versus-Kerno performance claim.")).toBeVisible();
  await page.getByRole("button", { name: "Benchmark & limits" }).click();
  await expect(page.getByRole("heading", { name: "Claims bounded by their evidence." })).toBeVisible();
  await expect(page.getByText("No baseline Codex run is embedded.", { exact: true })).toBeVisible();
});
