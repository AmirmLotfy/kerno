import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterEach, describe, expect, it } from "vitest";

const cleanup: string[] = [];
afterEach(async () => { while (cleanup.length) await rm(cleanup.pop()!, { recursive: true, force: true }); });

async function startClient(dataDir: string, name: string): Promise<Client> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", resolve("packages/mcp-server/src/main.ts")],
    cwd: resolve("."),
    env: {
      ...process.env,
      KERNO_DATA_DIR: dataDir,
      KERNO_MCP_STANDALONE: "1",
      KERNO_STORAGE: "json",
      KERNO_STATE_SCOPE: "process"
    } as Record<string, string>,
    stderr: "pipe"
  });
  const client = new Client({ name, version: "0.1.0" });
  await client.connect(transport);
  return client;
}

describe("concurrent plugin tasks", () => {
  it("shares owner-controlled settings without transient INDEX_BUSY failures", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "kerno-concurrent-plugin-")); cleanup.push(dataDir);
    const clients = await Promise.all([startClient(dataDir, "kerno-concurrency-a"), startClient(dataDir, "kerno-concurrency-b")]);
    try {
      const calls = Array.from({ length: 40 }, (_, index) => clients.map((client, clientIndex) =>
        index % 10 === 0
          ? client.callTool({ name: "kerno_update_settings", arguments: { patch: { capsuleBudget: 2500 + index + clientIndex } } })
          : client.callTool({ name: "kerno_render_panel", arguments: { view: "overview" } })
      )).flat();
      const results = await Promise.all(calls);
      expect(results).toHaveLength(80);
      expect(results.filter((result) => result.isError)).toEqual([]);
      expect(results.map((result) => JSON.stringify(result)).join("\n")).not.toContain("INDEX_BUSY");
      await Promise.all([
        clients[0]!.callTool({ name: "kerno_update_settings", arguments: { patch: { capsuleBudget: 4321 } } }),
        clients[1]!.callTool({ name: "kerno_update_settings", arguments: { patch: { routingPreference: "depth" } } })
      ]);
      const panel = await clients[0]!.callTool({ name: "kerno_render_panel", arguments: { view: "settings" } });
      expect((panel.structuredContent as any)?.data.settings).toMatchObject({ capsuleBudget: 4321, routingPreference: "depth" });
    } finally {
      await Promise.all(clients.map((client) => client.close()));
    }
  }, 30_000);
});
