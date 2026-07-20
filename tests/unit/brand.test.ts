import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chartPalette, comparisonPalette, darkPalette, kernoPalette, semanticPalette } from "@kerno/brand";

describe("Kerno brand contract", () => {
  it("keeps oxide, graphite, ivory, and aubergine as the product identity", () => {
    expect(kernoPalette.orange[500]).toBe("#E85D2A");
    expect(kernoPalette.graphite[900]).toBe("#1C1B1A");
    expect(kernoPalette.ivory).toBe("#F7F3EC");
    expect(kernoPalette.aubergine[500]).toBe("#673A52");
  });

  it("reserves semantic success and uses the required comparison series", () => {
    expect(semanticPalette.success).toBe("#397052");
    expect(comparisonPalette).toEqual({ baseline: "#B9AEA1", kerno: "#E85D2A" });
    expect(new Set(chartPalette).size).toBe(chartPalette.length);
  });

  it("uses warm dark surfaces rather than a blue-black theme", () => {
    expect(darkPalette.background).toBe("#141312");
    expect(darkPalette.surface).toBe("#1C1B1A");
    expect(darkPalette.primary).toBe("#F0703E");
  });

  it("publishes an absolute Open Graph image that exists in dashboard public assets", async () => {
    const dashboardRoot = fileURLToPath(new URL("../../apps/dashboard/", import.meta.url));
    const html = await readFile(`${dashboardRoot}index.html`, "utf8");
    expect(html).toContain('rel="canonical" href="https://itkerno.site/"');
    expect(html).toContain('property="og:url" content="https://itkerno.site/"');
    expect(html).toContain('property="og:image" content="https://itkerno.site/brand/kerno-open-graph.png"');
    await expect(readFile(`${dashboardRoot}public/brand/kerno-open-graph.png`)).resolves.toBeInstanceOf(Buffer);
  });

  it("uses the container-free Context Core on every Codex plugin identity surface", async () => {
    const manifestPath = fileURLToPath(new URL("../../plugins/kerno/.codex-plugin/plugin.json", import.meta.url));
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    expect(manifest.interface.composerIcon).toBe("./assets/icon-micro.svg");
    expect(manifest.interface.logo).toBe("./assets/icon.svg");
    expect(manifest.interface.logoDark).toBe("./assets/icon-dark.svg");
  });
});
