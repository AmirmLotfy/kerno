import { chromium } from "@playwright/test";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

type Render = { source: string; name: string; width: number; height: number };
const sourceRoot = resolve("packages/brand/assets");
const renderRoot = resolve(".kerno-cache/brand-renders");
const destinations = [resolve("apps/dashboard/public/brand"), resolve("docs/assets/brand"), resolve("plugins/kerno/assets")];

const renders: Render[] = [
  { source: "context-core-favicon.svg", name: "favicon-32.png", width: 32, height: 32 },
  { source: "context-core-launcher.svg", name: "launcher-180.png", width: 180, height: 180 },
  { source: "context-core-launcher.svg", name: "launcher-512.png", width: 512, height: 512 },
  { source: "kerno-social-avatar.svg", name: "social-avatar.png", width: 512, height: 512 },
  { source: "kerno-open-graph.svg", name: "kerno-open-graph.png", width: 1200, height: 630 },
  { source: "kerno-devpost-thumbnail.svg", name: "kerno-devpost-thumbnail.png", width: 900, height: 600 }
];

await Promise.all([renderRoot, ...destinations].map((directory) => mkdir(directory, { recursive: true })));
const browser = await chromium.launch({ headless: true });
try {
  for (const render of renders) {
    const svg = await readFile(resolve(sourceRoot, render.source), "utf8");
    const output = resolve(renderRoot, render.name);
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const page = await browser.newPage({ viewport: { width: render.width, height: render.height }, deviceScaleFactor: 1 });
      try {
        await page.setContent(`<style>html,body{margin:0;width:${render.width}px;height:${render.height}px;overflow:hidden}svg{display:block;width:100%;height:100%}</style>${svg}`, { waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => document.fonts.status === "loaded" && document.querySelector("svg") !== null);
        await page.screenshot({ path: output, omitBackground: true, animations: "disabled", timeout: 15_000 });
        lastError = undefined;
        await page.close();
        break;
      } catch (error) {
        lastError = error;
        await page.close().catch(() => undefined);
      }
    }
    if (lastError) throw new Error(`Failed to render ${render.name} after 3 attempts`, { cause: lastError });
    for (const destination of destinations) await copyFile(output, resolve(destination, render.name));
  }
} finally {
  await browser.close();
}

process.stdout.write(`Rendered ${renders.length} Kerno raster brand assets from canonical SVGs.\n`);
