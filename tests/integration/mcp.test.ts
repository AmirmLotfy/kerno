import { afterEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { fileURLToPath } from "node:url";
import { createKernoMcpServer } from "../../packages/mcp-server/src/main";
import { KernoService } from "@kerno/daemon";

const fixture = fileURLToPath(new URL("../../fixtures/relaycart-ts/seed", import.meta.url));

describe("MCP contract", () => {
  const resources: Array<{ close(): void | Promise<void> }> = [];
  afterEach(async () => { while (resources.length) await resources.pop()!.close(); });

  it("exposes all typed tools and runs the index/capsule path", async () => {
    const service = new KernoService(); resources.push(service);
    const server = createKernoMcpServer(service); resources.push(server);
    const client = new Client({ name: "kerno-test", version: "0.1.0" }); resources.push(client);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const tools = await client.listTools();
    expect(tools.tools).toHaveLength(12);
    expect(tools.tools.find((tool) => tool.name === "kerno_repository_status")?.annotations?.readOnlyHint).toBe(true);
    const indexed = await client.callTool({ name: "kerno_index_repository", arguments: { root: fixture, mode: "incremental" } });
    expect(indexed.isError).not.toBe(true);
    const envelope = indexed.structuredContent as any;
    expect(envelope.schemaVersion).toBe("1");
    expect(envelope.data.files.length).toBeGreaterThan(3);
  });
});
