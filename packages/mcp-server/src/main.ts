import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, join, parse, resolve, sep } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z, ZodError, type ZodTypeAny } from "zod";
import {
  analyzeTaskInputSchema, buildCapsuleInputSchema, compareRunsInputSchema, expandContextInputSchema,
  explainContextInputSchema, impactAnalysisInputSchema, indexRepositoryInputSchema, invalidateContextInputSchema,
  KernoError, recordDecisionInputSchema, recordOutcomeInputSchema, repositoryStatusInputSchema, routeTaskInputSchema,
  SCHEMA_VERSION, stableId
} from "@kerno/contracts";
import { KernoService } from "@kerno/daemon";
import { AppServerClient } from "@kerno/orchestrator";

type ToolSpec = {
  name: string; title: string; description: string; schema: ZodTypeAny; readOnly: boolean; destructive?: boolean;
  run: (service: KernoService, input: any) => unknown | Promise<unknown>;
};

const MAX_MCP_INPUT_BYTES = 64 * 1024;
const MAX_MCP_OUTPUT_BYTES = 4 * 1024 * 1024;
function assertNoNestedSymlinks(path: string): void {
  const absolute = resolve(path); const root = parse(absolute).root; let current = root;
  for (const [index, component] of absolute.slice(root.length).split(sep).filter(Boolean).entries()) {
    current = join(current, component);
    if (index === 0 || !existsSync(current)) continue;
    if (lstatSync(current).isSymbolicLink()) throw new KernoError("SYMLINK_ESCAPE", `Refusing symlinked Kerno data ancestor: ${current}`);
  }
}

export const KERNO_TOOL_SPECS: ToolSpec[] = [
  { name: "kerno_index_repository", title: "Index repository", description: "Safely enroll or incrementally index a local repository. Reads source and writes only Kerno local state. Returns counts and identity, never repository excerpts.", schema: indexRepositoryInputSchema, readOnly: false, run: async (service, input) => {
    const snapshot = await service.index(input);
    return { snapshotId: snapshot.id, repository: snapshot.repository, worktree: snapshot.worktree, stats: snapshot.stats, warnings: snapshot.files.some((file) => file.secretRedacted) ? ["Secret-like values were redacted"] : [] };
  } },
  { name: "kerno_repository_status", title: "Repository status", description: "Report branch, commit, dirty state, index freshness, and counts.", schema: repositoryStatusInputSchema, readOnly: true, run: (service, input) => service.status(input) },
  { name: "kerno_analyze_task", title: "Analyze task", description: "Classify a task and derive deterministic complexity, blast-radius, uncertainty, and risk signals.", schema: analyzeTaskInputSchema, readOnly: false, run: (service, input) => service.analyze(input) },
  { name: "kerno_build_context_capsule", title: "Build context capsule", description: "Build a bounded, task-conditioned capsule with provenance and score explanations.", schema: buildCapsuleInputSchema, readOnly: false, run: (service, input) => service.buildCapsule(input) },
  { name: "kerno_expand_context", title: "Expand context", description: "Create an immutable child capsule from verified test, runtime, dependency, or review evidence.", schema: expandContextInputSchema, readOnly: false, run: (service, input) => service.expand(input) },
  { name: "kerno_explain_context", title: "Explain context", description: "Explain score contributions, provenance, and invalidation conditions for capsule items.", schema: explainContextInputSchema, readOnly: true, run: (service, input) => service.explain(input) },
  { name: "kerno_impact_analysis", title: "Impact analysis", description: "Find bounded typed-graph dependents, tests, and contracts for files or symbols.", schema: impactAnalysisInputSchema, readOnly: true, run: (service, input) => service.impact(input) },
  { name: "kerno_record_decision", title: "Record evidence-backed decision", description: "Record a local memory. Agent prose remains a candidate unless test evidence or explicit user confirmation verifies it.", schema: recordDecisionInputSchema, readOnly: false, run: (service, input) => service.recordDecision(input) },
  { name: "kerno_record_outcome", title: "Record outcome", description: "Record a run outcome only when linked test/review artifacts support the claimed state.", schema: recordOutcomeInputSchema, readOnly: false, run: (service, input) => service.recordOutcome(input) },
  { name: "kerno_invalidate_context", title: "Invalidate context", description: "Preview invalidation by default. Applying invalidation changes only Kerno local state and requires an explicit non-dry-run call.", schema: invalidateContextInputSchema, readOnly: false, destructive: true, run: (service, input) => service.invalidate(input) },
  { name: "kerno_discover_models", title: "Discover Codex models", description: "Query the local Codex App Server model/list catalog and persist it. If App Server is unavailable in Plugin Mode, return an explicit manual fallback without inventing a catalog, recommendation, or effective model.", schema: z.object({}).strict(), readOnly: false, run: async (service) => {
    const client = new AppServerClient({ requestTimeoutMs: 30_000 });
    try { await client.initialize(); const catalog = await client.listModels(); service.recordCatalog(catalog.catalogSnapshotId, catalog.models, "app-server"); return { available: true, catalogSnapshotId: catalog.catalogSnapshotId, models: catalog.models, recommendationStatus: "catalog-backed", effectiveModel: null }; }
    catch { return { available: false, catalogSnapshotId: null, models: [], recommendationStatus: "unavailable", effectiveModel: null, fallback: { mode: "manual", commands: ["/model", "/reasoning"], note: "Continue on the current model or choose manually; no route was inferred without a live catalog." } }; }
    finally { await client.close(); }
  } },
  { name: "kerno_route_task", title: "Recommend route", description: "Choose a model and reasoning effort from a catalog previously captured from App Server model/list. Caller-invented catalogs are rejected. This recommendation does not switch a Plugin Mode parent task.", schema: routeTaskInputSchema, readOnly: false, run: (service, input) => service.route(input) },
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
        if (Buffer.byteLength(JSON.stringify(input), "utf8") > MAX_MCP_INPUT_BYTES) throw new KernoError("INVALID_INPUT", "MCP tool input exceeds 64 KiB");
        const data = await spec.run(service, input);
        const result = { schemaVersion: SCHEMA_VERSION, requestId: stableId("request", `${spec.name}:${Date.now()}:${Math.random()}`), repository: contextFor(service, input, data), data, warnings: [] as Array<{ code: string; message: string }> };
        const serialized = JSON.stringify(result, null, 2);
        if (Buffer.byteLength(serialized, "utf8") > MAX_MCP_OUTPUT_BYTES) throw new KernoError("BUDGET_EXCEEDED", "MCP tool output exceeds 4 MiB; narrow the request or lower the capsule budget");
        return { content: [{ type: "text" as const, text: serialized }], structuredContent: result };
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
  const dataDir = resolve(process.env.KERNO_DATA_DIR ?? join(process.cwd(), ".kerno"));
  assertNoNestedSymlinks(dataDir);
  if (existsSync(dataDir) && lstatSync(dataDir).isSymbolicLink()) throw new KernoError("SYMLINK_ESCAPE", `Refusing symlinked Kerno data directory: ${dataDir}`);
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  assertNoNestedSymlinks(dataDir);
  const expectedDataDir = join(realpathSync(resolve(dataDir, "..")), basename(dataDir));
  if (lstatSync(dataDir).isSymbolicLink() || realpathSync(dataDir) !== expectedDataDir) throw new KernoError("SYMLINK_ESCAPE", `Kerno data directory must resolve directly: ${dataDir}`);
  chmodSync(dataDir, 0o700);
  const directoryStat = lstatSync(dataDir);
  if (!directoryStat.isDirectory() || (typeof process.getuid === "function" && directoryStat.uid !== process.getuid())) throw new KernoError("SYMLINK_ESCAPE", `Kerno data directory must be an owner-controlled directory: ${dataDir}`);
  const marker = join(dataDir, ".kerno-owned");
  if (existsSync(marker) && lstatSync(marker).isSymbolicLink()) throw new KernoError("SYMLINK_ESCAPE", `Refusing symlinked Kerno marker: ${marker}`);
  if (!existsSync(marker)) writeFileSync(marker, "kerno-local-data-v1\n", { flag: "wx", mode: 0o600 });
  const portable = process.env.KERNO_STORAGE === "json";
  const markerStat = lstatSync(marker);
  if (!markerStat.isFile() || markerStat.nlink !== 1 || (typeof process.getuid === "function" && markerStat.uid !== process.getuid()) || readFileSync(marker, "utf8") !== "kerno-local-data-v1\n") throw new KernoError("SYMLINK_ESCAPE", `Kerno ownership marker is not an owner-controlled regular file: ${marker}`);
  chmodSync(marker, 0o600);
  const databasePath = join(dataDir, portable ? "kerno-state.json" : "kerno.db");
  for (const localPath of [databasePath, `${databasePath}.bak`, `${databasePath}-wal`, `${databasePath}-shm`, `${databasePath}-journal`]) {
    if (!existsSync(localPath)) continue;
    const stat = lstatSync(localPath);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1 || (typeof process.getuid === "function" && stat.uid !== process.getuid())) throw new KernoError("SYMLINK_ESCAPE", `Refusing non-owner-controlled Kerno state file: ${localPath}`);
    chmodSync(localPath, 0o600);
  }
  const service = new KernoService({ databasePath, ...(portable ? { storage: "json" as const } : {}) });
  const server = createKernoMcpServer(service);
  await server.connect(new StdioServerTransport());
  const stop = async () => { await server.close(); service.close(); process.exit(0); };
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
}

const entry = process.env.KERNO_MCP_STANDALONE === "1";
if (entry) runStdioServer().catch((error) => { process.stderr.write(`Kerno MCP failed: ${error instanceof Error ? error.message : String(error)}\n`); process.exit(1); });
