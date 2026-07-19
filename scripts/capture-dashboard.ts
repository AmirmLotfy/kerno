import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const server = spawn(process.execPath, [resolve("node_modules/vite/bin/vite.js"), "preview", "--config", resolve("apps/dashboard/vite.config.ts"), "--host", "127.0.0.1", "--port", "4173"], { cwd: resolve("apps/dashboard"), stdio: "ignore" });
try {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { if ((await fetch("http://127.0.0.1:4173")).ok) break; } catch { /* wait for local preview */ }
    await new Promise((done) => setTimeout(done, 100));
  }
  const browser = await chromium.launch({ headless: true });
  try {
    await mkdir(resolve("docs/assets/screenshots"), { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    await page.addInitScript(() => window.localStorage.setItem("kerno-theme", "light"));
    await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
    await page.screenshot({ path: resolve("docs/assets/screenshots/dashboard-home-light.png"), fullPage: true });
    await page.getByRole("button", { name: "Context" }).click();
    await page.screenshot({ path: resolve("plugins/kerno/assets/screenshot.png"), fullPage: true });
    await page.screenshot({ path: resolve("docs/assets/screenshots/dashboard-context-light.png"), fullPage: true });
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await page.screenshot({ path: resolve("plugins/kerno/assets/screenshot-dark.png"), fullPage: true });
    await page.screenshot({ path: resolve("docs/assets/screenshots/dashboard-context-dark.png"), fullPage: true });
  } finally { await browser.close(); }
  process.stdout.write("Captured light and dark dashboard product screenshots.\n");
} finally { server.kill("SIGTERM"); }
