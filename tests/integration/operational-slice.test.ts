import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { execFile as execFileCallback } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { KernoService, startHttpServer } from "@kerno/daemon";
import { createKernoMcpServer } from "../../packages/mcp-server/src/main.js";
import { CodexPhaseOrchestrator } from "@kerno/orchestrator";

const execFile = promisify(execFileCallback);
const fixture = fileURLToPath(new URL("../../fixtures/relaycart-ts/seed", import.meta.url));
const solution = fileURLToPath(new URL("../../fixtures/relaycart-ts/solution/refund-handler.ts", import.meta.url));
const fake = fileURLToPath(new URL("../fixtures/fake-app-server.mjs", import.meta.url));
const cleanup: string[] = []; const resources: Array<{ close(): void | Promise<void> }> = [];
afterEach(async () => { while (resources.length) await resources.pop()!.close(); while (cleanup.length) await rm(cleanup.pop()!, { recursive: true, force: true }); });

function data(result: any): any { expect(result.isError).not.toBe(true); return result.structuredContent.data; }
async function targetTest(root: string): Promise<{ exitCode: number; output: string }> {
  try { const result = await execFile(process.execPath, ["--test", "--experimental-strip-types", "tests/refund.integration.test.ts", "tests/atomicity.integration.test.ts"], { cwd: root }); return { exitCode: 0, output: `${result.stdout}\n${result.stderr}` }; }
  catch (error: any) { return { exitCode: typeof error.code === "number" ? error.code : 1, output: `${error.stdout ?? ""}\n${error.stderr ?? error.message ?? ""}` }; }
}

describe("complete operational vertical slice", () => {
  it("connects MCP, evidence, selective expansion, phase routing, review, daemon events, patch verification, and invalidation", async () => {
    const temp = await mkdtemp(join(tmpdir(), "kerno-operational-")); cleanup.push(temp); const root = join(temp, "relaycart-ts"); await cp(fixture, root, { recursive: true });
    await execFile("git", ["init", "-b", "main"], { cwd: root }); await execFile("git", ["add", "."], { cwd: root });
    await execFile("git", ["-c", "user.name=Kerno Test", "-c", "user.email=test@local.invalid", "commit", "-m", "fixture"], { cwd: root });

    const service = new KernoService(); resources.push(service); const server = createKernoMcpServer(service); resources.push(server);
    const client = new Client({ name: "codex-operational-test", version: "0.1.0" }); resources.push(client);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair(); await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const indexed = data(await client.callTool({ name: "kerno_index_repository", arguments: { root, mode: "incremental" } }));
    expect(indexed.stats.parsed).toBeGreaterThan(0); expect(indexed.files).toBeUndefined();
    const task = data(await client.callTool({ name: "kerno_analyze_task", arguments: { repositoryId: indexed.repository.id, worktreeId: indexed.worktree.id, taskText: "A concurrent refund.succeeded retry can credit twice. Preserve the public API and make the application boundary exactly-once." } }));
    const capsule = data(await client.callTool({ name: "kerno_build_context_capsule", arguments: { taskAnalysisId: task.id, budgetTokens: 2500 } }));
    expect(capsule.items.every((item: any) => item.reason && item.provenance.length)).toBe(true);
    expect(capsule.items.some((item: any) => item.locator.path === "src/transactions/transaction-boundary.ts")).toBe(false);

    const failing = await targetTest(root); expect(failing.exitCode).not.toBe(0);
    const trustedFailure = service.recordArtifact({ kind: "test", source: "command", output: failing.output, exitCode: failing.exitCode, command: ["node", "--test"], trusted: true });
    const child = data(await client.callTool({ name: "kerno_expand_context", arguments: { capsuleId: capsule.id, evidence: { kind: "test_failure", artifactId: trustedFailure.id, text: "TransactionBoundary must serialize the ledger credit and idempotency marker", symbols: ["TransactionBoundary"] } } }));
    const expandedPaths = child.items.map((item: any) => item.locator.path);
    expect(expandedPaths).toContain("src/transactions/transaction-boundary.ts");
    expect(expandedPaths.length).toBeLessThanOrEqual(2);

    const persistedEvents: any[] = []; const orchestrator = new CodexPhaseOrchestrator({ command: process.execPath, args: [fake], eventSink: (event) => { persistedEvents.push(event); service.store.appendEvent(event); } }); resources.push(orchestrator);
    const catalog = await orchestrator.initialize(); service.recordCatalog(catalog.catalogSnapshotId, catalog.models, "app-server");
    const explorationRoute = data(await client.callTool({ name: "kerno_route_task", arguments: { taskAnalysisId: task.id, phase: "broad-exploration", catalogSnapshotId: catalog.catalogSnapshotId } }));
    const implementationRoute = data(await client.callTool({ name: "kerno_route_task", arguments: { taskAnalysisId: task.id, phase: "implementation", catalogSnapshotId: catalog.catalogSnapshotId } }));
    const reviewRoute = data(await client.callTool({ name: "kerno_route_task", arguments: { taskAnalysisId: task.id, phase: "final-verification", catalogSnapshotId: catalog.catalogSnapshotId } }));
    const workflow = await orchestrator.runWorkflow({ runId: "run_operational", cwd: root, exploration: { route: explorationRoute, prompt: "Explore only the capsule" }, implementation: { route: implementationRoute, prompt: "Implement from the expanded capsule" }, review: { route: reviewRoute, diff: "pending fixture patch", acceptance: "concurrent and restart tests pass" } });
    expect(new Set([workflow.exploration.threadId, workflow.implementation.threadId, workflow.review.threadId]).size).toBe(3);
    expect(explorationRoute.recommended.model).toBe("efficient-model"); expect(reviewRoute.recommended.model).toBe("depth-model");

    await writeFile(join(root, "src/webhooks/refund-handler.ts"), await readFile(solution, "utf8"), "utf8");
    const passing = await targetTest(root); expect(passing.exitCode).toBe(0); service.recordArtifact({ kind: "test", source: "command", output: passing.output, exitCode: 0, command: ["node", "--test"], trusted: true });
    await client.callTool({ name: "kerno_index_repository", arguments: { root, mode: "incremental" } });

    const http = await startHttpServer(service); resources.push(http);
    const capsuleResponse = await fetch(`${http.url}/v1/capsules/${capsule.id}`, { headers: { authorization: `Bearer ${http.token}` } });
    expect(capsuleResponse.status).toBe(200); expect((await capsuleResponse.json() as any).status).toBe("stale");
    expect(persistedEvents.some((event) => event.type === "thread/tokenUsage/updated")).toBe(true);
  }, 30_000);
});
