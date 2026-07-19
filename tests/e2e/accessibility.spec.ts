import { expect, test } from "@playwright/test";

test("brand tokens, theme control, focus, and touch targets remain accessible", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", /light|dark/);

  const tokens = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return {
      brand: styles.getPropertyValue("--kerno-orange-500").trim(),
      background: styles.getPropertyValue("--kerno-ivory").trim(),
      secondary: styles.getPropertyValue("--kerno-aubergine-500").trim()
    };
  });
  expect(tokens).toEqual({ brand: "#E85D2A", background: "#F7F3EC", secondary: "#673A52" });

  const imagesLoaded = await page.locator("img").evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0));
  expect(imagesLoaded).toBe(true);

  const theme = page.getByRole("button", { name: /Switch to .* theme/ });
  const before = await page.locator("html").getAttribute("data-theme");
  await theme.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", before === "light" ? "dark" : "light");
  await expect(theme).toHaveAttribute("aria-pressed", before === "light" ? "true" : "false");

  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    return active ? getComputedStyle(active).outlineStyle : "none";
  });
  expect(focus).not.toBe("none");

  const undersized = await page.locator("button, select").evaluateAll((controls) => controls.filter((control) => {
    const element = control as HTMLElement;
    const rect = element.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden";
    return visible && (rect.width < 44 || rect.height < 44);
  }).map((control) => `${control.tagName}:${control.textContent?.trim()}`));
  expect(undersized).toEqual([]);
});

test("truth states and comparison series never rely on color alone", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Comparison" }).click();
  await expect(page.getByText("Plain Codex baseline", { exact: true })).toBeVisible();
  await expect(page.getByText("Kerno", { exact: true }).last()).toBeVisible();
  await page.getByRole("button", { name: "Limits" }).click();
  for (const label of ["Measured", "Estimated", "Experimental", "Unavailable"]) await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
});
