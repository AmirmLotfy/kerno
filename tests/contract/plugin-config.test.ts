import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Codex MCP launch configuration", () => {
  it("uses the portable store for the bundled project-scoped server", async () => {
    const config = await readFile(".codex/config.toml", "utf8");
    expect(config).toContain('KERNO_MCP_STANDALONE = "1"');
    expect(config).toContain('KERNO_STORAGE = "json"');
    expect(config).toContain('KERNO_STATE_SCOPE = "process"');
  });

  it("uses the portable store in the installed plugin companion config", async () => {
    const config = JSON.parse(await readFile("plugins/kerno/.mcp.json", "utf8"));
    expect(config.mcpServers.kerno).toMatchObject({
      command: "node",
      args: ["./dist/kerno-mcp.cjs"],
      cwd: "."
    });
    expect(config.mcpServers.kerno.env).toMatchObject({
      KERNO_MCP_STANDALONE: "1",
      KERNO_STORAGE: "json",
      KERNO_STATE_SCOPE: "process"
    });
  });
});
