import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { execFile as execFileCallback } from "node:child_process";
import { lstat, open, readFile, realpath, readdir } from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import ignore from "ignore";
import ts from "typescript";
import { parser as pythonParser } from "@lezer/python";
import type { FileSnapshot, GraphEdge, IndexSnapshot, RepositoryIdentity, SymbolRecord, WorktreeState } from "@kerno/contracts";
import { KernoError, redactSensitiveString, stableId } from "@kerno/contracts";

const execFile = promisify(execFileCallback);
const MAX_FILE_SIZE = 1024 * 1024;
const ENGINE_VERSION = "0.1.0";
const ALWAYS_IGNORE = [
  ".git/", ".kerno/", ".kerno-cache/", "node_modules/", "dist/", "coverage/", "build/", ".next/", "__pycache__/",
  ".env", ".env.*", ".envrc", ".npmrc", ".pypirc", ".netrc", ".git-credentials", ".dockercfg", "**/.docker/config.json",
  "**/.aws/credentials", "**/.config/gcloud/application_default_credentials.json", "credentials.json", "service-account*.json",
  "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519", "*.pem", "*.key", "*.p12", "*.pfx", "*.jks", "*.keystore", "*.kdbx",
  "*.tfstate", "*.tfstate.*", "*.min.js", "*.map"
];

export type PreviousFile = Pick<FileSnapshot, "path" | "contentHash"> & { snapshot: FileSnapshot };

export type IndexOptions = {
  mode?: "incremental" | "full";
  previous?: Map<string, PreviousFile>;
};

export type IndexableRepositoryFile = {
  absolutePath: string;
  buffer: Buffer;
  contentHash: string;
};

function sha256(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function normalizePath(path: string): string { return path.split(sep).join("/"); }
function languageFor(path: string): FileSnapshot["language"] {
  const ext = extname(path).toLowerCase();
  if ([".ts", ".tsx", ".mts", ".cts"].includes(ext)) return "typescript";
  if ([".js", ".jsx", ".mjs", ".cjs"].includes(ext)) return "javascript";
  if (ext === ".py") return "python";
  return "text";
}
function isLikelyBinary(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8_192));
  return sample.includes(0);
}

export async function readIndexableRepositoryFile(root: string, path: string): Promise<IndexableRepositoryFile | null> {
  const absolute = assertWithinRepository(root, path);
  const stat = await lstat(absolute).catch(() => null);
  if (!stat || !stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_FILE_SIZE) return null;
  const handle = await open(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)).catch((error) => {
    if ((error as NodeJS.ErrnoException).code === "ELOOP") throw new KernoError("SYMLINK_ESCAPE", `Refusing symlinked file: ${path}`);
    throw error;
  });
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.size > MAX_FILE_SIZE) return null;
    const resolved = await realpath(absolute);
    if (resolved !== root && !resolved.startsWith(`${root}${sep}`)) throw new KernoError("SYMLINK_ESCAPE", `Resolved path escaped repository: ${path}`);
    const buffer = await handle.readFile();
    if (isLikelyBinary(buffer)) return null;
    return { absolutePath: resolved, buffer, contentHash: sha256(buffer) };
  } finally {
    await handle.close();
  }
}
export function redactSecrets(value: string): { text: string; redacted: boolean } {
  return redactSensitiveString(value);
}

async function git(root: string, args: string[]): Promise<string | null> {
  try { return (await execFile("git", ["-C", root, ...args], { maxBuffer: 16 * 1024 * 1024 })).stdout.trim(); }
  catch { return null; }
}

async function discoverNonGit(root: string): Promise<string[]> {
  const output: string[] = [];
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      const rel = normalizePath(relative(root, absolute));
      if (ALWAYS_IGNORE.some((pattern) => pattern.endsWith("/") && (`${rel}/`).includes(pattern))) continue;
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) output.push(rel);
    }
  }
  await visit(root);
  return output;
}

async function discoverFiles(root: string): Promise<string[]> {
  const tracked = await git(root, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]);
  const candidates = tracked === null ? await discoverNonGit(root) : tracked.split("\0").filter(Boolean).map(normalizePath);
  const matcher = ignore().add(ALWAYS_IGNORE);
  try { matcher.add(await readFile(join(root, ".gitignore"), "utf8")); } catch { /* optional */ }
  try { matcher.add(await readFile(join(root, ".kernoignore"), "utf8")); } catch { /* optional */ }
  return candidates.filter((path) => !matcher.ignores(path)).sort();
}

export async function inspectRepository(inputRoot: string): Promise<{ repository: RepositoryIdentity; worktree: WorktreeState; paths: string[] }> {
  if (!inputRoot || inputRoot.includes("\0")) throw new KernoError("INVALID_INPUT", "Repository root is invalid");
  const requested = resolve(inputRoot);
  const root = await realpath(requested).catch(() => { throw new KernoError("OUTSIDE_REPOSITORY", "Repository root does not exist"); });
  const stat = await lstat(root);
  if (!stat.isDirectory()) throw new KernoError("INVALID_INPUT", "Repository root must be a directory");
  const branch = await git(root, ["branch", "--show-current"]);
  const head = await git(root, ["rev-parse", "HEAD"]);
  const common = await git(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  const dirtyText = await git(root, ["status", "--porcelain=v1", "-z"]);
  const remote = await git(root, ["config", "--get", "remote.origin.url"]);
  const initial = await git(root, ["rev-list", "--max-parents=0", "HEAD"]);
  const ignoreText = await readFile(join(root, ".kernoignore"), "utf8").catch(() => "");
  const repoId = stableId("repo", `${common ?? root}:${remote ? sha256(remote.replace(/\/\/[^/@]+@/, "//")) : "local"}:${initial ?? "unborn"}`);
  const paths = await discoverFiles(root);
  return {
    repository: {
      id: repoId,
      canonicalRoot: root,
      ...(common ? { gitCommonDir: common } : {}),
      ...(remote ? { remoteFingerprint: sha256(remote.replace(/\/\/[^/@]+@/, "//")) } : {}),
      ...(initial ? { initialCommitFingerprint: sha256(initial) } : {}),
      ignoreDigest: sha256(`${ALWAYS_IGNORE.join("\n")}\n${ignoreText}`)
    },
    worktree: {
      id: stableId("worktree", root), repositoryId: repoId, canonicalPath: root,
      branch: branch || null, headCommit: head || null,
      dirtyDigest: sha256(dirtyText ?? ""), dirty: Boolean(dirtyText)
    },
    paths
  };
}

function nodeLines(source: ts.SourceFile, node: ts.Node): [number, number] {
  return [source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, source.getLineAndCharacterOfPosition(node.getEnd()).line + 1];
}
function parseTs(path: string, content: string, language: "typescript" | "javascript"): { symbols: SymbolRecord[]; imports: string[]; exports: string[]; calls: string[] } {
  const kind = language === "typescript" ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, kind);
  const symbols: SymbolRecord[] = [];
  const imports: string[] = [];
  const exports: string[] = [];
  const calls: string[] = [];
  const add = (node: ts.Node, name: string, symbolKind: SymbolRecord["kind"], signature = "") => {
    const [startLine, endLine] = nodeLines(source, node);
    symbols.push({ id: stableId("sym", `${path}:${name}:${startLine}`), path, name, kind: symbolKind, startLine, endLine, signatureHash: sha256(signature || name), bodyHash: sha256(node.getText(source)), confidence: 0.95 });
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) { imports.push(node.moduleSpecifier.text); add(node, node.moduleSpecifier.text, "import"); }
    else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) exports.push(node.moduleSpecifier.text);
    else if (ts.isClassDeclaration(node) && node.name) add(node, node.name.text, "class", node.members.map((m) => m.name?.getText(source) ?? "").join(","));
    else if (ts.isInterfaceDeclaration(node)) add(node, node.name.text, "interface", node.members.map((m) => m.getText(source).split("{")[0]).join(";"));
    else if (ts.isTypeAliasDeclaration(node)) add(node, node.name.text, "type", node.type.getText(source));
    else if (ts.isFunctionDeclaration(node) && node.name) add(node, node.name.text, "function", node.parameters.map((p) => p.getText(source)).join(","));
    else if (ts.isMethodDeclaration(node) && node.name) add(node, node.name.getText(source), "method", node.parameters.map((p) => p.getText(source)).join(","));
    else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) add(node, node.name.text, "variable");
    else if (ts.isCallExpression(node) && ["test", "it", "describe"].includes(node.expression.getText(source))) {
      const first = node.arguments[0];
      if (first && ts.isStringLiteralLike(first)) add(node, first.text, "test");
    } else if (ts.isCallExpression(node)) calls.push(node.expression.getText(source).split(".").at(-1) ?? node.expression.getText(source));
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { symbols, imports: [...new Set(imports)], exports: [...new Set(exports)], calls: [...new Set(calls)] };
}

function parsePython(path: string, content: string): { symbols: SymbolRecord[]; imports: string[]; exports: string[]; calls: string[]; recovered: boolean } {
  const tree = pythonParser.parse(content);
  const symbols: SymbolRecord[] = [];
  const imports: string[] = [];
  let recovered = false;
  const lines = content.split("\n");
  const lineOf = (position: number) => content.slice(0, position).split("\n").length;
  const cursor = tree.cursor();
  do {
    const type = cursor.type.name;
    if (cursor.type.isError) recovered = true;
    if (["FunctionDefinition", "ClassDefinition"].includes(type)) {
      const text = content.slice(cursor.from, cursor.to);
      const name = /^(?:async\s+)?(?:def|class)\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(text)?.[1];
      if (name) {
        const startLine = lineOf(cursor.from); const endLine = lineOf(cursor.to);
        symbols.push({ id: stableId("sym", `${path}:${name}:${startLine}`), path, name, kind: type === "ClassDefinition" ? "class" : name.startsWith("test_") ? "test" : "function", startLine, endLine, signatureHash: sha256(lines[startLine - 1] ?? name), bodyHash: sha256(text), confidence: 0.9 });
      }
    }
    if (["ImportStatement", "ImportFromStatement"].includes(type)) {
      const text = content.slice(cursor.from, cursor.to);
      const match = /(?:from\s+([\w.]+)|import\s+([\w.]+))/.exec(text);
      if (match?.[1] || match?.[2]) imports.push(match[1] ?? match[2] ?? "");
    }
  } while (cursor.next());
  const calls = [...content.matchAll(/\b([A-Za-z_][A-Za-z0-9_.]*)\s*\(/g)].map((match) => match[1]!.split(".").at(-1)!).filter((name) => !["def", "class", "if", "for", "while"].includes(name));
  return { symbols, imports: [...new Set(imports)], exports: [], calls: [...new Set(calls)], recovered };
}

function parseFile(path: string, content: string, language: FileSnapshot["language"]): Pick<FileSnapshot, "symbols" | "imports" | "exports" | "calls" | "parser" | "confidence"> {
  if (language === "typescript" || language === "javascript") return { ...parseTs(path, content, language), parser: "typescript-compiler-api", confidence: 0.95 };
  if (language === "python") { const parsed = parsePython(path, content); return { ...parsed, parser: parsed.recovered ? "lezer-python-recovery" : "lezer-python", confidence: parsed.recovered ? 0.55 : 0.9 }; }
  return { symbols: [], imports: [], exports: [], calls: [], parser: "generic-text", confidence: 0.55 };
}

function resolveImport(fromPath: string, target: string, paths: Set<string>): string | null {
  let base: string;
  if (fromPath.endsWith(".py")) {
    const relative = target.match(/^(\.+)(.*)$/);
    if (relative) {
      const levels = relative[1]!.length; const modulePath = relative[2]!.replaceAll(".", "/");
      const parentSegments = fromPath.split("/").slice(0, -levels);
      base = normalizePath([...parentSegments, modulePath].filter(Boolean).join("/"));
    } else base = normalizePath(target.replaceAll(".", "/"));
  } else {
    if (!target.startsWith(".")) return null;
    base = normalizePath(resolve("/", fromPath, "..", target).slice(1));
  }
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.py`, `${base}/index.ts`, `${base}/__init__.py`]) if (paths.has(candidate)) return candidate;
  return null;
}

export async function indexRepository(root: string, options: IndexOptions = {}): Promise<IndexSnapshot> {
  const started = performance.now();
  const { repository, worktree, paths } = await inspectRepository(root);
  const previous = options.previous ?? new Map();
  const files: FileSnapshot[] = [];
  let parsed = 0, reused = 0, skipped = 0, changed = 0;
  for (const path of paths) {
    if (isAbsolute(path) || path.includes("\0") || path.split("/").includes("..")) { skipped += 1; continue; }
    const indexable = await readIndexableRepositoryFile(repository.canonicalRoot, path);
    if (!indexable) { skipped += 1; continue; }
    const { absolutePath: resolved, buffer, contentHash: hash } = indexable;
    const old = previous.get(path);
    const reusable = old?.contentHash === hash && Array.isArray(old.snapshot.exports) && Array.isArray(old.snapshot.calls);
    if (options.mode !== "full" && reusable) { files.push(old.snapshot); reused += 1; continue; }
    const raw = buffer.toString("utf8");
    const { text, redacted } = redactSecrets(raw);
    const language = languageFor(path);
    const parsedFile = parseFile(path, text, language);
    const excerpt = text.length <= 16_000 ? text : `${text.slice(0, 16_000)}\n…[truncated]`;
    files.push({ path, absolutePath: resolved, contentHash: hash, size: buffer.length, language, ...parsedFile, tokenEstimate: Math.ceil(text.length / 4), excerpt, isTest: /(^|\/)(test|tests|__tests__)(\/|\.)|\.(test|spec)\./i.test(path), secretRedacted: redacted });
    parsed += 1; if (!old || old.contentHash !== hash) changed += 1;
  }
  const pathSet = new Set(files.map((file) => file.path));
  const edges: GraphEdge[] = [];
  const symbolsByName = new Map<string, SymbolRecord[]>();
  for (const symbol of files.flatMap((file) => file.symbols)) symbolsByName.set(symbol.name, [...(symbolsByName.get(symbol.name) ?? []), symbol]);
  for (const file of files) {
    for (const imported of file.imports) {
      const target = resolveImport(file.path, imported, pathSet);
      if (target) edges.push({ from: file.path, to: target, type: "imports", confidence: file.confidence });
    }
    for (const exported of file.exports) {
      const target = resolveImport(file.path, exported, pathSet);
      if (target) edges.push({ from: file.path, to: target, type: "exports", confidence: file.confidence });
    }
    for (const called of file.calls) for (const target of symbolsByName.get(called) ?? []) if (target.path !== file.path) edges.push({ from: file.path, to: target.id, type: "calls", confidence: Math.min(file.confidence, target.confidence) * 0.8 });
    for (const symbol of file.symbols) edges.push({ from: file.path, to: symbol.id, type: "defines", confidence: symbol.confidence });
    if (file.isTest) {
      for (const target of file.imports.map((item) => resolveImport(file.path, item, pathSet)).filter((item): item is string => Boolean(item))) edges.push({ from: file.path, to: target, type: "tests", confidence: 0.95 });
    }
  }
  const removed = [...previous.keys()].filter((path) => !pathSet.has(path)).length;
  const indexedAt = new Date().toISOString();
  return {
    id: stableId("snapshot", `${repository.id}:${worktree.branch}:${worktree.headCommit}:${worktree.dirtyDigest}:${indexedAt}`),
    repository, worktree, indexedAt, engineVersion: ENGINE_VERSION, files, edges,
    stats: { scanned: paths.length, parsed, reused, skipped, changed, removed, invalidated: changed + removed, durationMs: Math.round(performance.now() - started) }
  };
}

export function assertWithinRepository(root: string, candidate: string): string {
  if (!candidate || candidate.includes("\0") || isAbsolute(candidate) || candidate.split(/[\\/]/).includes("..")) throw new KernoError("OUTSIDE_REPOSITORY", "Path must be repository-relative");
  const absolute = resolve(root, candidate);
  if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) throw new KernoError("OUTSIDE_REPOSITORY", "Path escaped repository");
  return absolute;
}
