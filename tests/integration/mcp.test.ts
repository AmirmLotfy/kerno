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
    expect(tools.tools).toHaveLength(13);
    expect(tools.tools.find((tool) => tool.name === "kerno_repository_status")?.annotations?.readOnlyHint).toBe(true);
    const indexed = await client.callTool({ name: "kerno_index_repository", arguments: { root: fixture, mode: "incremental" } });
    expect(indexed.isError).not.toBe(true);
    const envelope = indexed.structuredContent as any;
    expect(envelope.schemaVersion).toBe("1");
    expect(envelope.data.stats.scanned).toBeGreaterThan(3);
    expect(envelope.data.files).toBeUndefined();
    expect(JSON.stringify(envelope.data)).not.toContain("A timeout here allows");
  });

  it("compares CLI-importable artifact-derived run records through MCP", async () => {
    const service = new KernoService(); resources.push(service);
    const server = createKernoMcpServer(service); resources.push(server);
    const client = new Client({ name: "kerno-compare-test", version: "0.1.0" }); resources.push(client);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const run = (condition: "plain-codex" | "codex-with-kerno-capsule", totalTokens: number) => ({
      schemaVersion: "1", id: condition === "plain-codex" ? "run_baseline" : "run_kerno", pairId: "pair_mcp_compare", recordedAt: "2026-07-20T00:00:00.000Z", experiment: "context-controlled", condition,
      task: { id: "task_compare", text: "Fix the task", repository: "fixture", license: "Apache-2.0", startingCommit: "abc123", branch: "main", successCriteria: ["tests pass"], testCommands: ["npm test"] },
      environment: { platform: "test", architecture: "test", node: "v22", codex: "codex-test", recordedFrom: "live-app-server", profileIsolation: "verified-clean", profileEvidenceHash: "profile_evidence" },
      model: { requested: "model-live", reasoningEffort: "low", effective: null, truthLabel: "requested-unconfirmed" }, permissions: "workspace-write:no-network:never-approve",
      kernoConfiguration: condition === "plain-codex" ? null : { capsuleBudget: 2500, initialCapsuleId: "capsule_compare", childCapsuleId: null, routingPolicy: "pinned" },
      finalStatus: "passed", tests: { passed: true, exitCode: 0, artifactHash: "tests-hash", outputTail: "ok" },
      metrics: { taskSuccess: 1, testsPassed: 1, totalTokens, filesOpened: null, repeatedReads: null, toolCalls: 1, contextExpansions: 0, timeToFirstValidPatchMs: null, latencyMs: 1000, changedLines: 4, unnecessaryChangedLines: null, reviewerFindings: 0, staleContextMistakes: null },
      review: { status: "passed", artifactHash: "review-hash", summary: "no findings" }, artifacts: { events: "events.json", diff: "diff.patch", tests: "tests.txt", review: "review.txt", receipt: "receipt.json" },
      artifactHashes: { events: "events-hash", diff: "diff-hash", tests: "tests-hash", review: "review-hash", receipt: "receipt-hash" },
      provenance: { mode: "artifact-derived", receiptHash: "a".repeat(64), taskManifestHash: "b".repeat(64), derivedFields: ["totalTokens"] }, limitations: []
    });
    service.store.put("run", "run_baseline", run("plain-codex", 200)); service.store.put("run", "run_kerno", run("codex-with-kerno-capsule", 120));
    const compared = await client.callTool({ name: "kerno_compare_runs", arguments: { baselineRunId: "run_baseline", kernoRunId: "run_kerno" } });
    expect(compared.isError).not.toBe(true); expect((compared.structuredContent as any).data).toMatchObject({ pairId: "pair_mcp_compare", fairness: { passed: true }, metrics: { totalTokens: { baseline: 200, kerno: 120 } } });
  });
});
