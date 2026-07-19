import { execFile as execFileCallback } from "node:child_process";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join, parse, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { KernoError } from "@kerno/contracts";
import { KernoService, startHttpServer } from "@kerno/daemon";
import { inspectRepository, redactSecrets } from "@kerno/indexer";

const execFile = promisify(execFileCallback);
const HELP = `Kerno — evidence-backed context control for Codex

Usage: kerno <command> [options]

Commands:
  init                  Create local Kerno state and .kernoignore
  doctor                Check runtime, storage, plugin, and repository health
  index [--full]        Index the current or --root repository
  status                Show repository and index status
  analyze --task TEXT   Classify a task
  capsule --task-id ID  Build a bounded context capsule
  explain --capsule ID  Explain capsule provenance and scores
  expand                Expand from a persisted --artifact and --evidence
  invalidate            Preview invalidation; add --apply to persist it
  serve                 Start the loopback read-only HTTP/SSE daemon
  demo                  Regenerate the deterministic judge replay
  benchmark             Run a live --baseline or --kerno benchmark
  data-export           Export redacted local state
  data-delete           Delete only a verified Kerno-owned data directory

Global options: --root PATH --data PATH --json --help
`;

type CliIO = { out: (value: string) => void; err: (value: string) => void };
const defaultIO: CliIO = { out: (value) => process.stdout.write(value), err: (value) => process.stderr.write(value) };
function valueAfter(args: string[], name: string): string | undefined { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }
function emit(io: CliIO, value: unknown, json: boolean): void { io.out(json ? `${JSON.stringify(value, null, 2)}\n` : typeof value === "string" ? `${value}\n` : `${JSON.stringify(value, null, 2)}\n`); }
async function exists(path: string): Promise<boolean> { return access(path).then(() => true, () => false); }
function isInside(parent: string, candidate: string): boolean { return candidate === parent || candidate.startsWith(`${parent}${sep}`); }

export function assertSafeDataDirectory(dataDir: string, repositoryRoot: string): void {
  const target = resolve(dataDir); const root = resolve(repositoryRoot); const home = resolve(homedir()); const filesystemRoot = parse(target).root;
  if (target === filesystemRoot || target === home || target === root || isInside(target, root) || isInside(target, home)) throw new KernoError("INVALID_INPUT", `Refusing destructive data path: ${target}`);
  if (basename(target) !== ".kerno") throw new KernoError("INVALID_INPUT", "Data deletion is limited to a directory named .kerno");
}
async function runFixedNpm(root: string, args: string[]): Promise<void> { await execFile("npm", args, { cwd: root, maxBuffer: 16 * 1024 * 1024 }); }

export async function runCli(argv: string[], io: CliIO = defaultIO): Promise<number> {
  const args = [...argv]; const command = args.shift() ?? "help"; const json = args.includes("--json");
  if (command === "help" || command === "--help" || args.includes("--help")) { io.out(HELP); return 0; }
  const root = resolve(valueAfter(args, "--root") ?? process.cwd());
  const dataDir = resolve(valueAfter(args, "--data") ?? process.env.KERNO_DATA_DIR ?? join(root, ".kerno"));
  try {
    if (command === "data-delete") {
      if (!args.includes("--yes")) throw new KernoError("INVALID_INPUT", "Data deletion requires --yes");
      assertSafeDataDirectory(dataDir, root);
      if (!(await exists(join(dataDir, ".kerno-owned")))) throw new KernoError("INVALID_INPUT", `Refusing to delete unmarked directory ${dataDir}`);
      await rm(dataDir, { recursive: true, force: false }); emit(io, { deleted: dataDir, recoverable: false }, json); return 0;
    }
    await mkdir(dataDir, { recursive: true, mode: 0o700 });
    const marker = join(dataDir, ".kerno-owned"); if (!(await exists(marker))) await writeFile(marker, "kerno-local-data-v1\n", { flag: "wx", mode: 0o600 });
    if (command === "init") {
      const ignorePath = join(root, ".kernoignore");
      if (!(await exists(ignorePath))) await writeFile(ignorePath, ".env\n.env.*\n*.pem\n*.key\n", { flag: "wx", mode: 0o600 });
      emit(io, { initialized: true, root, dataDir, ignoreFile: ignorePath }, json); return 0;
    }
    const service = new KernoService({ databasePath: join(dataDir, "kerno.db") });
    try {
      const repository = async () => inspectRepository(root);
      if (command === "doctor") {
        const pluginRoot = join(root, "plugins/kerno");
        const checks = { node: process.version, root, git: (await repository()).worktree.headCommit !== null, storage: service.store.health(), pluginManifest: await exists(join(pluginRoot, ".codex-plugin/plugin.json")), bundledMcp: await exists(join(pluginRoot, "dist/kerno-mcp.cjs")) };
        emit(io, { ok: checks.storage.ok && checks.pluginManifest && checks.bundledMcp, checks }, json); return checks.pluginManifest && checks.bundledMcp ? 0 : 3;
      }
      if (command === "index") emit(io, await service.index({ root, mode: args.includes("--full") ? "full" : "incremental" }), json);
      else if (command === "status") { const inspected = await repository(); emit(io, service.status({ repositoryId: valueAfter(args, "--repository") ?? inspected.repository.id, worktreeId: inspected.worktree.id }), json); }
      else if (command === "analyze") { const inspected = await repository(); emit(io, service.analyze({ repositoryId: valueAfter(args, "--repository") ?? inspected.repository.id, worktreeId: inspected.worktree.id, taskText: valueAfter(args, "--task") ?? "" }), json); }
      else if (command === "capsule") emit(io, service.buildCapsule({ taskAnalysisId: valueAfter(args, "--task-id"), budgetTokens: Number(valueAfter(args, "--budget") ?? 2500) }), json);
      else if (command === "explain") emit(io, service.explain({ capsuleId: valueAfter(args, "--capsule"), itemIds: valueAfter(args, "--item") ? [valueAfter(args, "--item")] : undefined }), json);
      else if (command === "expand") emit(io, service.expand({ capsuleId: valueAfter(args, "--capsule"), evidence: { kind: "test_failure", artifactId: valueAfter(args, "--artifact"), text: valueAfter(args, "--evidence") ?? "" } }), json);
      else if (command === "invalidate") { const inspected = await repository(); emit(io, service.invalidate({ repositoryId: valueAfter(args, "--repository") ?? inspected.repository.id, trigger: { kind: "manual", key: valueAfter(args, "--reason") ?? "CLI manual invalidation" }, dryRun: !args.includes("--apply") }), json); }
      else if (command === "data-export") {
        const out = resolve(valueAfter(args, "--out") ?? "kerno-export.json");
        const payload = { exportedAt: new Date().toISOString(), repositories: service.store.list("snapshot"), tasks: service.store.list("task"), capsules: service.store.list("capsule"), memories: service.store.list("memory"), routes: service.store.list("route"), artifacts: service.store.list("artifact") };
        await writeFile(out, `${redactSecrets(JSON.stringify(payload, null, 2)).text}\n`, { mode: 0o600 }); emit(io, { exported: out }, json);
      } else if (command === "serve") { const handle = await startHttpServer(service, { port: Number(valueAfter(args, "--port") ?? 0) }); emit(io, { url: handle.url, token: handle.token }, true); await new Promise(() => {}); }
      else if (command === "demo") { await runFixedNpm(root, ["run", "demo:record"]); emit(io, { recorded: join(root, "benchmarks/recorded-results/canonical-run.json") }, json); }
      else if (command === "benchmark") { const condition = args.includes("--kerno") ? "--kerno" : "--baseline"; await runFixedNpm(root, ["run", "benchmark:live", "--", condition]); emit(io, { completed: condition.slice(2) }, json); }
      else throw new KernoError("INVALID_INPUT", `Unknown command: ${command}`);
      return 0;
    } finally { if (command !== "serve") service.close(); }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error); io.err(json ? `${JSON.stringify({ error: message })}\n` : `Kerno: ${message}\n`);
    return error instanceof KernoError && error.code === "INVALID_INPUT" ? 2 : 1;
  }
}
