import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ZodError, type ZodTypeAny } from "zod";
import {
  analyzeTaskInputSchema, buildCapsuleInputSchema, compareRunsInputSchema, expandContextInputSchema,
  explainContextInputSchema, impactAnalysisInputSchema, indexRepositoryInputSchema, invalidateContextInputSchema,
  KernoError, recordDecisionInputSchema, recordOutcomeInputSchema, repositoryStatusInputSchema, routeTaskInputSchema,
  SCHEMA_VERSION, stableId
} from "@kerno/contracts";
import { KernoService } from "@kerno/daemon";

type ToolSpec = {
  name: string; title: string; description: string; schema: ZodTypeAny; readOnly: boolean; destructive?: boolean;
  run: (service: KernoService, input: any) => unknown | Promise<unknown>;
};

export const KERNO_TOOL_SPECS: ToolSpec[] = [
  { name: "kerno_index_repository", title: "Index repository", description: "Safely enroll or incrementally index a local repository. Reads source and writes only Kerno local state.", schema: indexRepositoryInputSchema, readOnly: false, run: (service, input) => service.index(input) },
  { name: "kerno_repository_status", title: "Repository status", description: "Report branch, commit, dirty state, index freshness, and counts.", schema: repositoryStatusInputSchema, readOnly: true, run: (service, input) => service.status(input) },
  { name: "kerno_analyze_task", title: "Analyze task", description: "Classify a task and derive deterministic complexity, blast-radius, uncertainty, and risk signals.", schema: analyzeTaskInputSchema, readOnly: false, run: (service, input) => service.analyze(input) },
  { name: "kerno_build_context_capsule", title: "Build context capsule", description: "Build a bounded, task-conditioned capsule with provenance and score explanations.", schema: buildCapsuleInputSchema, readOnly: false, run: (service, input) => service.buildCapsule(input) },
  { name: "kerno_expand_context", title: "Expand context", description: "Create an immutable child capsule from verified test, runtime, dependency, or review evidence.", schema: expandContextInputSchema, readOnly: false, run: (service, input) => service.expand(input) },
  { name: "kerno_explain_context", title: "Explain context", description: "Explain score contributions, provenance, and invalidation conditions for capsule items.", schema: explainContextInputSchema, readOnly: true, run: (service, input) => service.explain(input) },
  { name: "kerno_impact_analysis", title: "Impact analysis", description: "Find bounded typed-graph dependents, tests, and contracts for files or symbols.", schema: impactAnalysisInputSchema, readOnly: true, run: (service, input) => service.impact(input) },
  { name: "kerno_record_decision", title: "Record evidence-backed decision", description: "Record a local memory. Agent prose remains a candidate unless test evidence or explicit user confirmation verifies it.", schema: recordDecisionInputSchema, readOnly: false, run: (service, input) => service.recordDecision(input) },
  { name: "kerno_record_outcome", title: "Record outcome", description: "Record a run outcome only when linked test/review artifacts support the claimed state.", schema: recordOutcomeInputSchema, readOnly: false, run: (service, input) => service.recordOutcome(input) },
  { name: "kerno_invalidate_context", title: "Invalidate context", description: "Preview invalidation by default. Applying invalidation changes only Kerno local state and requires an explicit non-dry-run call.", schema: invalidateContextInputSchema, readOnly: false, destructive: true, run: (service, input) => service.invalidate(input) },
  { name: "kerno_route_task", title: "Recommend route", description: "Choose a model and reasoning effort from the supplied live catalog. This recommendation does not switch a Plugin Mode parent task.", schema: routeTaskInputSchema, readOnly: false, run: (service, input) => service.route(input) },
  { name: "kerno_compare_runs", title: "Compare runs", description: "Compare immutable baseline and Kerno runs after enforcing fairness fields; unavailable metrics remain null.", schema: compareRunsInputSchema, readOnly: false, run: (service, input) => service.compare(input) }
];

function contextFor(service: KernoService, input: any, data: any): { id: string; worktreeId: string; branch: string | null; head: string | null } {
  if (data?.repository && data?.worktree) return { id: data.repository.id, worktreeId: data.worktree.id, branch: data.worktree.branch, head: data.worktree.headCommit };
  let repositoryId = input.repositoryId as string | undefined;
  if (!repositoryId && input.taskAnalysisId) repositoryId = service.store.task(input.taskAnalysisId)?.repositoryId;
  if (!repositoryId && input.capsuleId) {
    const capsule = service.store.capsule(input.capsuleId); if (capsule) repositoryId = service.store.task(capsule.taskAnalysisId)?.repositoryId;
  }
  if (repositoryId) { const snapshot = service.store.latestSnapshot(repositoryId); if (snapshot) return { id: repositoryId, worktreeId: snapshot.worktree.id, branch: snapshot.worktree.branch, head: snapshot.worktree.headCommit }; }
  return { id: "repo_unknown", worktreeId: "worktree_unknown", branch: null, head: null };
}

export function createKernoMcpServer(service: KernoService): McpServer {
  const server = new McpServer({ name: "kerno", version: "0.1.0" });
  for (const spec of KERNO_TOOL_SPECS) {
    server.registerTool(spec.name, {
      title: spec.title, description: spec.description, inputSchema: spec.schema,
      annotations: { title: spec.title, readOnlyHint: spec.readOnly, destructiveHint: spec.destructive ?? false, idempotentHint: spec.readOnly, openWorldHint: false }
    }, async (input) => {
      try {
        const data = await spec.run(service, input);
        const result = { schemaVersion: SCHEMA_VERSION, requestId: stableId("request", `${spec.name}:${Date.now()}:${Math.random()}`), repository: contextFor(service, input, data), data, warnings: [] as Array<{ code: string; message: string }> };
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }], structuredContent: result };
      } catch (error) {
        const known = error instanceof KernoError ? error : error instanceof ZodError ? new KernoError("INVALID_INPUT", error.message) : new KernoError("INTERNAL_ERROR", error instanceof Error ? error.message : "Unknown error");
        const payload = { code: known.code, message: known.message, retryable: known.retryable, ...(known.details ? { details: known.details } : {}) };
        return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
      }
    });
  }
  return server;
}

export async function runStdioServer(): Promise<void> {
  const dataDir = process.env.KERNO_DATA_DIR ?? join(process.cwd(), ".kerno");
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const portable = process.env.KERNO_STORAGE === "json";
  const service = new KernoService({ databasePath: join(dataDir, portable ? "kerno-state.json" : "kerno.db"), ...(portable ? { storage: "json" as const } : {}) });
  const server = createKernoMcpServer(service);
  await server.connect(new StdioServerTransport());
  const stop = async () => { await server.close(); service.close(); process.exit(0); };
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
}

const entry = process.env.KERNO_MCP_STANDALONE === "1";
if (entry) runStdioServer().catch((error) => { process.stderr.write(`Kerno MCP failed: ${error instanceof Error ? error.message : String(error)}\n`); process.exit(1); });
