import { execFile as execFileCallback } from "node:child_process";
import { access, chmod, lstat, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join, parse, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { KernoError, redactSensitiveValue } from "@kerno/contracts";
import { KernoService, startHttpServer } from "@kerno/daemon";
import { inspectRepository } from "@kerno/indexer";

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
function isCurrentOwner(uid: number): boolean { return typeof process.getuid !== "function" || uid === process.getuid(); }
function commonAncestor(left: string, right: string): string {
  const a = resolve(left); const b = resolve(right); const root = parse(a).root;
  if (root !== parse(b).root) return root;
  const aParts = a.slice(root.length).split(sep).filter(Boolean); const bParts = b.slice(root.length).split(sep).filter(Boolean); const common: string[] = [];
  for (let index = 0; index < Math.min(aParts.length, bParts.length) && aParts[index] === bParts[index]; index += 1) common.push(aParts[index]!);
  return join(root, ...common);
}
async function assertNoSymlinkBelow(anchor: string, target: string): Promise<void> {
  let current = resolve(anchor);
  for (const component of relative(current, resolve(target)).split(sep).filter(Boolean)) {
    current = join(current, component); const stat = await lstat(current).catch(() => null);
    if (stat?.isSymbolicLink()) throw new KernoError("SYMLINK_ESCAPE", `Refusing symlinked Kerno data ancestor: ${current}`);
  }
}

export function assertSafeDataDirectory(dataDir: string, repositoryRoot: string): void {
  const target = resolve(dataDir); const root = resolve(repositoryRoot); const home = resolve(homedir()); const filesystemRoot = parse(target).root;
  if (target === filesystemRoot || target === home || target === root || isInside(target, root) || isInside(target, home)) throw new KernoError("INVALID_INPUT", `Refusing destructive data path: ${target}`);
}
async function prepareDataDirectory(dataDir: string, repositoryRoot: string): Promise<void> {
  const target = resolve(dataDir);
  const trustAnchor = commonAncestor(repositoryRoot, target); await assertNoSymlinkBelow(trustAnchor, target);
  const parent = resolve(target, "..");
  const parentBefore = await lstat(parent).catch(() => null);
  if (parentBefore?.isSymbolicLink()) throw new KernoError("SYMLINK_ESCAPE", `Refusing symlinked parent of Kerno data directory: ${parent}`);
  const before = await lstat(target).catch(() => null);
  if (before?.isSymbolicLink()) throw new KernoError("SYMLINK_ESCAPE", `Refusing symlinked Kerno data directory: ${target}`);
  await mkdir(target, { recursive: true, mode: 0o700 });
  await assertNoSymlinkBelow(trustAnchor, target);
  const after = await lstat(target); const parentAfter = await lstat(parent);
  if (!parentAfter.isDirectory() || parentAfter.isSymbolicLink() || !isCurrentOwner(parentAfter.uid)) throw new KernoError("SYMLINK_ESCAPE", `Refusing unsafe parent of Kerno data directory: ${parent}`);
  const expected = join(await realpath(parent), basename(target));
  if (!after.isDirectory() || after.isSymbolicLink() || !isCurrentOwner(after.uid) || await realpath(target) !== expected) throw new KernoError("SYMLINK_ESCAPE", `Kerno data directory must resolve directly and be owner-controlled: ${target}`);
  await chmod(target, 0o700);
  const marker = join(target, ".kerno-owned");
  const markerStat = await lstat(marker).catch(() => null);
  if (markerStat && (!markerStat.isFile() || markerStat.isSymbolicLink() || markerStat.nlink !== 1 || !isCurrentOwner(markerStat.uid))) throw new KernoError("SYMLINK_ESCAPE", `Refusing unsafe Kerno ownership marker: ${marker}`);
  if (!markerStat) await writeFile(marker, "kerno-local-data-v1\n", { flag: "wx", mode: 0o600 });
  await chmod(marker, 0o600);
}
function safeExportValue(value: unknown, repositoryRoot: string): unknown {
  if (Array.isArray(value)) return value.map((item) => safeExportValue(item, repositoryRoot));
  if (value && typeof value === "object") return redactSensitiveValue(Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => {
    if (["excerpt", "redactedOutput"].includes(key)) return [key, "[OMITTED_FROM_SAFE_EXPORT]"];
    if (["canonicalRoot", "canonicalPath"].includes(key)) return [key, "[REPOSITORY_ROOT]"];
    if (["absolutePath", "gitCommonDir"].includes(key)) return [key, "[LOCAL_PATH]"];
    return [key, safeExportValue(item, repositoryRoot)];
  })));
  if (typeof value !== "string") return value;
  const home = homedir();
  return redactSensitiveValue(value
    .replaceAll(repositoryRoot, "[REPOSITORY_ROOT]")
    .replaceAll(home, "[HOME]")
    .replace(/\/?private\/var\/folders\/[^\s"']+\/T\/[^\s"']+/g, "[TEMP]")
    .replace(/\/var\/folders\/[^\s"']+\/T\/[^\s"']+/g, "[TEMP]")
    .replace(/\/tmp\/[^\s"']+/g, "[TEMP]"));
}
async function runFixedNpm(root: string, args: string[]): Promise<void> { await execFile("npm", args, { cwd: root, maxBuffer: 16 * 1024 * 1024 }); }
async function commandOutput(command: string, args: string[]): Promise<string | null> { try { return (await execFile(command, args, { maxBuffer: 4 * 1024 * 1024 })).stdout.trim(); } catch { return null; } }

export async function runCli(argv: string[], io: CliIO = defaultIO): Promise<number> {
  const args = [...argv]; const command = args.shift() ?? "help"; const json = args.includes("--json");
  if (command === "help" || command === "--help" || args.includes("--help")) { io.out(HELP); return 0; }
  const root = resolve(valueAfter(args, "--root") ?? process.cwd());
  const dataDir = resolve(valueAfter(args, "--data") ?? process.env.KERNO_DATA_DIR ?? join(root, ".kerno"));
  try {
    if (command === "data-delete") {
      if (!args.includes("--yes")) throw new KernoError("INVALID_INPUT", "Data deletion requires --yes");
      assertSafeDataDirectory(dataDir, root);
      const marker = join(dataDir, ".kerno-owned");
      const parent = resolve(dataDir, ".."); const parentStat = await lstat(parent); const dataStat = await lstat(dataDir).catch(() => null); const markerStat = await lstat(marker).catch(() => null);
      if (!dataStat) throw new KernoError("INVALID_INPUT", `Refusing to delete unmarked directory ${dataDir}`);
      if (parentStat.isSymbolicLink() || !isCurrentOwner(parentStat.uid) || dataStat.isSymbolicLink() || !dataStat.isDirectory() || !isCurrentOwner(dataStat.uid) || markerStat?.isSymbolicLink() || (markerStat && (markerStat.nlink !== 1 || !isCurrentOwner(markerStat.uid)))) throw new KernoError("SYMLINK_ESCAPE", `Refusing non-owner-controlled Kerno data path ${dataDir}`);
      const expected = join(await realpath(parent), basename(dataDir));
      await assertNoSymlinkBelow(commonAncestor(root, dataDir), dataDir);
      if (await realpath(dataDir) !== expected) throw new KernoError("SYMLINK_ESCAPE", `Refusing symlinked data directory ${dataDir}`);
      if (!markerStat?.isFile() || (await readFile(marker, "utf8")) !== "kerno-local-data-v1\n") throw new KernoError("INVALID_INPUT", `Refusing to delete unmarked directory ${dataDir}`);
      await rm(dataDir, { recursive: true, force: false }); emit(io, { deleted: dataDir, recoverable: false }, json); return 0;
    }
    await prepareDataDirectory(dataDir, root);
    if (command === "init") {
      const ignorePath = join(root, ".kernoignore");
      if (!(await exists(ignorePath))) await writeFile(ignorePath, ".env\n.env.*\n*.pem\n*.key\n", { flag: "wx", mode: 0o600 });
      emit(io, { initialized: true, root, dataDir, ignoreFile: ignorePath }, json); return 0;
    }
    const portable = process.env.KERNO_STORAGE === "json";
    const service = new KernoService({ databasePath: join(dataDir, portable ? "kerno-state.json" : "kerno.db"), ...(portable ? { storage: "json" as const } : {}) });
    try {
      const repository = async () => inspectRepository(root);
      if (command === "doctor") {
        const pluginRoot = join(root, "plugins/kerno");
        const [npmVersion, gitVersion, codexVersion, pluginList] = await Promise.all([commandOutput("npm", ["--version"]), commandOutput("git", ["--version"]), commandOutput("codex", ["--version"]), commandOutput("codex", ["plugin", "list"])]);
        const [major, minor] = process.versions.node.split(".").map(Number); const nodeSupported = (major === 22 && (minor ?? 0) >= 13) || major === 23 || major === 24;
        const checks = { node: { version: process.version, supported: nodeSupported, required: ">=22.13 <25" }, npm: npmVersion, git: gitVersion, codex: codexVersion, root, storage: service.store.health(), pluginManifest: await exists(join(pluginRoot, ".codex-plugin/plugin.json")), bundledMcp: await exists(join(pluginRoot, "dist/kerno-mcp.cjs")), pluginInstalled: pluginList?.includes("kerno@personal") ?? false, liveAuthentication: "not checked; run npm run test:app-server:live" };
        const ok = nodeSupported && Boolean(npmVersion && gitVersion && codexVersion) && checks.storage.ok && checks.pluginManifest && checks.bundledMcp;
        const actions = [...(!checks.pluginInstalled ? ["Install kerno@personal from the repository marketplace, then restart Codex and start a new task."] : []), ...(!nodeSupported ? ["Use Node 22.13+ or Node 24 LTS."] : [])];
        emit(io, { ok, checks, actions }, json); return ok ? 0 : 3;
      }
      if (command === "index") emit(io, await service.index({ root, mode: args.includes("--full") ? "full" : "incremental" }), json);
      else if (command === "status") { const inspected = await repository(); emit(io, await service.status({ repositoryId: valueAfter(args, "--repository") ?? inspected.repository.id, worktreeId: inspected.worktree.id }), json); }
      else if (command === "analyze") { const inspected = await repository(); emit(io, service.analyze({ repositoryId: valueAfter(args, "--repository") ?? inspected.repository.id, worktreeId: inspected.worktree.id, taskText: valueAfter(args, "--task") ?? "" }), json); }
      else if (command === "capsule") emit(io, await service.buildCapsule({ taskAnalysisId: valueAfter(args, "--task-id"), budgetTokens: Number(valueAfter(args, "--budget") ?? 2500) }), json);
      else if (command === "explain") emit(io, service.explain({ capsuleId: valueAfter(args, "--capsule"), itemIds: valueAfter(args, "--item") ? [valueAfter(args, "--item")] : undefined }), json);
      else if (command === "expand") emit(io, await service.expand({ capsuleId: valueAfter(args, "--capsule"), evidence: { kind: "test_failure", artifactId: valueAfter(args, "--artifact"), text: valueAfter(args, "--evidence") ?? "" } }), json);
      else if (command === "invalidate") { const inspected = await repository(); emit(io, service.invalidate({ repositoryId: valueAfter(args, "--repository") ?? inspected.repository.id, trigger: { kind: "manual", key: valueAfter(args, "--reason") ?? "CLI manual invalidation" }, dryRun: !args.includes("--apply") }), json); }
      else if (command === "data-export") {
        const requestedOut = valueAfter(args, "--out"); if (!requestedOut) throw new KernoError("INVALID_INPUT", "data-export requires an explicit --out path");
        const out = resolve(requestedOut);
        const outStat = await lstat(out).catch(() => null); if (outStat) throw new KernoError("INVALID_INPUT", `Refusing to overwrite existing export ${out}`);
        const payload = { exportedAt: new Date().toISOString(), repositories: service.store.list("snapshot"), tasks: service.store.list("task"), capsules: service.store.list("capsule"), memories: service.store.list("memory"), routes: service.store.list("route"), artifacts: service.store.list("artifact") };
        await writeFile(out, `${JSON.stringify(safeExportValue(payload, root), null, 2)}\n`, { flag: "wx", mode: 0o600 }); await chmod(out, 0o600); emit(io, { exported: out }, json);
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
