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
  await expect(page.getByText("HASH-BOUND FULL-SYSTEM RUN")).toBeVisible();
  await expect(page.getByText(/Final Verification/)).toBeVisible();
  await expect(page.getByText("RECORDED REAL APP SERVER RUN")).toBeVisible();

  await page.getByRole("button", { name: "Comparison" }).click();
  await expect(page.getByRole("heading", { name: "Correct outcomes. Fair pair. Metrics unlocked." })).toBeVisible();
  await expect(page.getByRole("heading", { name: /3 \/ 3 task pairs retained/ })).toBeVisible();
  await expect(page.getByText(/3 \/ 3 fairness-valid; 2 \/ 3 correctness-passing/)).toBeVisible();

  await page.getByRole("button", { name: "Limits" }).click();
  await expect(page.getByRole("heading", { name: "Claims bounded by their evidence." })).toBeVisible();
  await expect(page.getByText("Independent review in the deterministic replay", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Kerno home" }).click();
  await expect(page.getByRole("heading", { name: /Exactly-once refunds/ })).toBeVisible();
  await expect(page.getByText("Orchestration Running · not observed in replay", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Home" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", { name: "Small enough to inspect. Complete enough to challenge." })).toBeVisible();

  await page.getByRole("button", { name: "Timeline" }).click();
  const replay = await page.evaluate(async () => (await fetch("/replay.json")).json());
  expect(replay.timeline.map((event: any) => Date.parse(event.at))).toEqual([...replay.timeline.map((event: any) => Date.parse(event.at))].sort((a, b) => a - b));
  await expect(page.getByText("replay.recorded", { exact: true })).toBeVisible();
});

test("judge views remain usable on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Exactly-once refunds/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Context" }).click();
  await expect(page.getByText("Why included")).toBeVisible();
  await expect(page.locator(".capsule-row .tokens").first()).toBeVisible();
  await page.getByRole("button", { name: "Comparison" }).click();
  await expect(page.getByRole("heading", { name: "Correct outcomes. Fair pair. Metrics unlocked." })).toBeVisible();
});

test("optional benchmark and runtime artifacts preserve absent and failed truth states", async ({ page }) => {
  await page.route("**/benchmark.json", async (route) => route.fulfill({ status: 500, body: "unavailable" }));
  await page.route("**/runtime-evidence.json", async (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto("/?state=baseline-available");
  await expect(page.getByText("The benchmark artifact failed to load: Benchmark request failed (500)")).toBeVisible();
  await expect(page.getByText("LOAD FAILED")).toBeVisible();

  await page.getByRole("button", { name: "Comparison" }).click();
  await expect(page.getByRole("heading", { name: "Run matrix failed to load" })).toBeVisible();
  await expect(page.getByText("0 / 3 task pairs retained")).toHaveCount(0);

  await page.getByRole("button", { name: "Routing" }).click();
  await expect(page.getByRole("heading", { name: "No retained runtime artifact." })).toBeVisible();

  await page.getByRole("button", { name: "Limits" }).click();
  await expect(page.getByText("Benchmark evidence failed to load: Benchmark request failed (500)", { exact: true })).toBeVisible();
});

test("optional artifacts do not report zero while still loading", async ({ page }) => {
  await page.route("**/benchmark.json", async (route) => new Promise<void>((resolve) => setTimeout(() => route.fulfill({ status: 404, body: "" }).then(resolve), 1_500)));
  await page.route("**/runtime-evidence.json", async (route) => new Promise<void>((resolve) => setTimeout(() => route.fulfill({ status: 404, body: "" }).then(resolve), 1_500)));
  await page.goto("/");
  await page.getByRole("button", { name: "Comparison" }).click();
  await expect(page.getByRole("heading", { name: "Loading retained run matrix…" })).toBeVisible();
  await expect(page.getByText("0 / 3 task pairs retained")).toHaveCount(0);
});
