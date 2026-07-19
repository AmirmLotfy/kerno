import { createHash } from "node:crypto";
import { chmod, lstat, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { redactSensitiveString, redactSensitiveValue } from "@kerno/contracts";

const projectRoot = fileURLToPath(new URL("../", import.meta.url)).replace(/\/$/, "");
const benchmarkRoot = join(projectRoot, "benchmarks");
const home = process.env.HOME;

function sanitize(text: string): string {
  let result = text.replaceAll(projectRoot, "[WORKSPACE]");
  if (home) result = result.replaceAll(home, "[HOME]");
  return redactSensitiveString(result
    .replace(/(?:file:\/\/)?\/?private\/var\/folders\/[^\s"']+\/T\/[^\s"']+/g, "[TEMP]")
    .replace(/(?:file:\/\/)?\/var\/folders\/[^\s"']+\/T\/[^\s"']+/g, "[TEMP]")
    .replace(/(?:file:\/\/)?\/tmp\/[^\s"']+/g, "[TEMP]")).text;
}

function sanitizeStructured(path: string, text: string): string {
  const sanitized = sanitize(text);
  if (path.endsWith(".json")) {
    const parsed = JSON.parse(sanitized); const redacted = redactSensitiveValue(parsed);
    if (sanitized === text && JSON.stringify(redacted) === JSON.stringify(parsed)) return text;
    return `${JSON.stringify(redacted, null, 2)}\n`;
  }
  if (path.endsWith(".jsonl")) {
    const lines = sanitized.split(/\r?\n/).filter(Boolean); const redactedLines = lines.map((line) => JSON.stringify(redactSensitiveValue(JSON.parse(line))));
    if (sanitized === text && redactedLines.every((line, index) => line === lines[index])) return text;
    return `${redactedLines.join("\n")}\n`;
  }
  return sanitized;
}

async function walk(directory: string): Promise<string[]> {
  const paths: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await walk(path));
    else if (entry.isFile() && /\.(?:json|jsonl|txt|patch|md|csv)$/.test(entry.name)) paths.push(path);
  }
  return paths;
}

let changed = 0;
const changedPaths: string[] = [];
const artifactPaths = (await walk(benchmarkRoot)).sort((left, right) => Number(left.endsWith("/run.json")) - Number(right.endsWith("/run.json")) || left.localeCompare(right));
for (const path of artifactPaths) {
  if ((await stat(path)).size > 20 * 1024 * 1024) throw new Error(`Refusing to sanitize oversized artifact: ${path}`);
  const before = await readFile(path, "utf8");
  let after = sanitizeStructured(path, before);
  if (path.endsWith("/run.json")) {
    const run = JSON.parse(after);
    for (const key of ["events", "diff", "tests", "review"] as const) {
      if (typeof run.artifacts?.[key] === "string") run.artifacts[key] = run.artifacts[key].replace(/^\[WORKSPACE\]\//, "");
    }
    run.artifactHashes ??= {};
    for (const key of ["events", "diff", "tests", "review"] as const) if (typeof run.artifacts?.[key] === "string") {
      const artifactPath = resolve(projectRoot, run.artifacts[key]);
      if (!artifactPath.startsWith(`${resolve(projectRoot)}${sep}`)) throw new Error(`Refusing out-of-repository ${key} artifact: ${artifactPath}`);
      const artifactStat = await lstat(artifactPath); if (!artifactStat.isFile() || artifactStat.isSymbolicLink() || artifactStat.size > 20 * 1024 * 1024) throw new Error(`Refusing unsafe ${key} artifact: ${artifactPath}`);
      run.artifactHashes[key] = createHash("sha256").update(await readFile(artifactPath)).digest("hex");
    }
    if (run.artifactHashes.tests && run.tests) run.tests.artifactHash = run.artifactHashes.tests;
    if (run.artifactHashes.review && run.review) run.review.artifactHash = run.artifactHashes.review;
    after = `${JSON.stringify(run, null, 2)}\n`;
  }
  if (after !== before) {
    await writeFile(path, after, { mode: 0o600 });
    changed += 1;
    changedPaths.push(relative(projectRoot, path));
  }
  await chmod(path, 0o600);
}
process.stdout.write(`Sanitized ${changed} recorded benchmark artifact(s); source evidence and metrics were unchanged.${changedPaths.length ? ` Changed: ${changedPaths.join(", ")}.` : ""}\n`);
