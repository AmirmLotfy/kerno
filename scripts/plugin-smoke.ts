import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";

const transport = new StdioClientTransport({ command: process.execPath, args: [resolve("plugins/kerno/dist/kerno-mcp.cjs")], env: { ...process.env, KERNO_DATA_DIR: resolve(".kerno-cache/plugin-smoke-data"), KERNO_MCP_STANDALONE: "1", KERNO_STORAGE: "json" } });
const client = new Client({ name: "kerno-plugin-smoke", version: "0.1.0" });
try {
  await client.connect(transport);
  const tools = await client.listTools();
  if (tools.tools.length !== 13) throw new Error(`Expected 13 Kerno tools, got ${tools.tools.length}`);
  const indexed = await client.callTool({ name: "kerno_index_repository", arguments: { root: resolve("fixtures/relaycart-ts/seed"), mode: "incremental" } });
  if (indexed.isError) throw new Error(`Bundled index tool failed: ${JSON.stringify(indexed.content)}`);
  process.stdout.write(`Bundled plugin MCP exposed ${tools.tools.length} tools and indexed the fixture through its portable store.\n`);
} finally { await client.close(); }
