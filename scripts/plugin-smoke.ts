import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";

const transport = new StdioClientTransport({ command: process.execPath, args: [resolve("plugins/kerno/dist/kerno-mcp.cjs")], env: { ...process.env, KERNO_DATA_DIR: resolve(".kerno-cache/plugin-smoke-data"), KERNO_MCP_STANDALONE: "1", KERNO_STORAGE: "json", KERNO_STATE_SCOPE: "process" } });
const client = new Client({ name: "kerno-plugin-smoke", version: "0.1.0" });
try {
  await client.connect(transport);
  const tools = await client.listTools();
  if (tools.tools.length !== 16) throw new Error(`Expected 16 Kerno tools, got ${tools.tools.length}`);
  const resources = await client.listResources();
  if (!resources.resources.some((resource) => resource.uri === "ui://kerno/run-panel.html")) throw new Error("Bundled MCP does not expose the Kerno Apps UI resource");
  const app = await client.readResource({ uri: "ui://kerno/run-panel.html" });
  if (!String((app.contents[0] as any)?.text ?? "").includes("Unavailable values are never inferred")) throw new Error("Bundled Kerno Apps UI resource is invalid");
  const indexed = await client.callTool({ name: "kerno_index_repository", arguments: { root: resolve("fixtures/relaycart-ts/seed"), mode: "incremental" } });
  if (indexed.isError) throw new Error(`Bundled index tool failed: ${JSON.stringify(indexed.content)}`);
  const repository = (indexed.structuredContent as any)?.data?.repository;
  const worktree = (indexed.structuredContent as any)?.data?.worktree;
  if (!repository?.id || !worktree?.id) throw new Error("Bundled index tool returned no repository identity");
  const status = await client.callTool({ name: "kerno_repository_status", arguments: { repositoryId: repository.id, worktreeId: worktree.id } });
  if (status.isError || (status.structuredContent as any)?.data?.snapshotStatus !== "current") throw new Error(`Bundled status tool did not report a fresh snapshot: ${JSON.stringify(status.content)}`);
  const analyzed = await client.callTool({ name: "kerno_analyze_task", arguments: { repositoryId: repository.id, worktreeId: worktree.id, taskText: "Fix the duplicate refund webhook credit without changing the public API" } });
  if (analyzed.isError) throw new Error(`Bundled task analysis failed: ${JSON.stringify(analyzed.content)}`);
  const taskAnalysisId = (analyzed.structuredContent as any)?.data?.id;
  const capsule = await client.callTool({ name: "kerno_build_context_capsule", arguments: { taskAnalysisId, budgetTokens: 2500 } });
  if (capsule.isError || !(capsule.structuredContent as any)?.data?.items?.length) throw new Error(`Bundled capsule tool failed: ${JSON.stringify(capsule.content)}`);
  const panel = await client.callTool({ name: "kerno_render_panel", arguments: { view: "context", repositoryId: repository.id, capsuleId: (capsule.structuredContent as any)?.data?.id } });
  if (panel.isError || (panel.structuredContent as any)?.data?.mode !== "live-local-state") throw new Error(`Bundled Kerno panel failed: ${JSON.stringify(panel.content)}`);
  process.stdout.write(`Bundled plugin MCP exposed ${tools.tools.length} tools, one MCP Apps component resource, and completed index → fresh status → task → capsule → structured panel state through its portable store.\n`);
} finally { await client.close(); }
