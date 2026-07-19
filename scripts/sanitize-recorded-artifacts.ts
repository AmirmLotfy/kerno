import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { redactSensitiveString } from "@kerno/contracts";

const projectRoot = fileURLToPath(new URL("../", import.meta.url)).replace(/\/$/, "");
const benchmarkRoot = join(projectRoot, "benchmarks");
const home = process.env.HOME;

function sanitize(text: string): string {
  let result = text.replaceAll(projectRoot, "[WORKSPACE]");
  if (home) result = result.replaceAll(home, "[HOME]");
  return redactSensitiveString(result
    .replace(/\/?private\/var\/folders\/[^\s"']+\/T\/kerno-live-benchmark-[A-Za-z0-9_-]+/g, "[BENCHMARK_TMP]")
    .replace(/\/var\/folders\/[^\s"']+\/T\/kerno-live-benchmark-[A-Za-z0-9_-]+/g, "[BENCHMARK_TMP]")
    .replace(/\/tmp\/xcrun_db-[A-Za-z0-9_-]+/g, "[TEMP]/xcrun_db-[redacted]")).text;
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
for (const path of await walk(benchmarkRoot)) {
  if ((await stat(path)).size > 20 * 1024 * 1024) throw new Error(`Refusing to sanitize oversized artifact: ${path}`);
  const before = await readFile(path, "utf8");
  let after = sanitize(before);
  if (path.endsWith("/run.json")) {
    const run = JSON.parse(after);
    for (const key of ["events", "diff", "tests", "review"] as const) {
      if (typeof run.artifacts?.[key] === "string") run.artifacts[key] = run.artifacts[key].replace(/^\[WORKSPACE\]\//, "");
    }
    after = `${JSON.stringify(run, null, 2)}\n`;
  }
  if (after !== before) {
    await writeFile(path, after, { mode: 0o600 });
    changed += 1;
  }
}
process.stdout.write(`Sanitized ${changed} recorded benchmark artifact(s); source evidence and metrics were unchanged.\n`);
