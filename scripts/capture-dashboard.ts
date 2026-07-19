import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const server = spawn(process.execPath, [resolve("node_modules/vite/bin/vite.js"), "preview", "--config", resolve("apps/dashboard/vite.config.ts"), "--host", "127.0.0.1", "--port", "4173"], { cwd: resolve("apps/dashboard"), stdio: "ignore" });
try {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { if ((await fetch("http://127.0.0.1:4173")).ok) break; } catch { /* wait for local preview */ }
    await new Promise((done) => setTimeout(done, 100));
  }
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
    await page.screenshot({ path: resolve("plugins/kerno/assets/screenshot.png"), fullPage: true });
  } finally { await browser.close(); }
  process.stdout.write("Captured plugin judge screenshot.\n");
} finally { server.kill("SIGTERM"); }
