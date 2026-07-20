import { lstat, readdir, readFile, realpath, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { benchmarkCsv, benchmarkMarkdown, buildBenchmarkReport, normalizeRecordedRunFromArtifacts, normalizeRecordedRunMetrics, type BenchmarkArtifactBodies } from "@kerno/eval";
import type { RunEvent } from "@kerno/contracts";

const liveRoot = fileURLToPath(new URL("../benchmarks/recorded-results/live", import.meta.url));
const reportRoot = fileURLToPath(new URL("../benchmarks/reports", import.meta.url));
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const canonicalProjectRoot = await realpath(projectRoot);
const maxArtifactBytes = 16 * 1024 * 1024;
async function readVerifiedArtifact(path: string, label: string): Promise<string> {
  let current = resolve(projectRoot);
  for (const component of path.slice(current.length + 1).split(sep).filter(Boolean)) {
    current = join(current, component); const componentStat = await lstat(current);
    if (componentStat.isSymbolicLink()) throw new Error(`${label} artifact path contains a symlink`);
  }
  const canonical = await realpath(path);
  if (canonical !== canonicalProjectRoot && !canonical.startsWith(`${canonicalProjectRoot}${sep}`)) throw new Error(`${label} artifact escaped the repository`);
  const artifactStat = await lstat(path);
  if (!artifactStat.isFile() || artifactStat.size > maxArtifactBytes) throw new Error(`${label} artifact is not a bounded regular file`);
  return readFile(path, "utf8");
}
const runs: unknown[] = [];
for (const entry of await readdir(liveRoot, { withFileTypes: true }).catch(() => [])) {
  if (!entry.isDirectory()) continue;
  const path = join(liveRoot, entry.name, "run.json");
  try {
    const raw = JSON.parse(await readVerifiedArtifact(path, "run"));
    const bodies: Partial<Record<"events" | "diff" | "tests" | "review" | "receipt", string>> = {};
    for (const kind of ["events", "diff", "tests", "review", "receipt"] as const) {
      const relativePath = raw.artifacts?.[kind]; const expectedHash = raw.artifactHashes?.[kind];
      if (typeof expectedHash !== "string") continue;
      if (typeof relativePath !== "string") throw new Error(`${kind} artifact path is missing for its claimed hash`);
      const artifactPath = resolve(projectRoot, relativePath);
      if (!artifactPath.startsWith(`${resolve(projectRoot)}${sep}`)) throw new Error(`${kind} artifact escaped the repository`);
      const body = await readVerifiedArtifact(artifactPath, kind);
      if (createHash("sha256").update(body).digest("hex") !== expectedHash) throw new Error(`${kind} artifact hash mismatch`);
      bodies[kind] = body;
    }
    if (raw.artifactHashes?.tests && raw.tests?.artifactHash !== raw.artifactHashes.tests) throw new Error("test result hash does not match the verified test artifact");
    if (raw.artifactHashes?.review && raw.review?.artifactHash !== raw.artifactHashes.review) throw new Error("review result hash does not match the verified review artifact");
    let normalized: unknown;
    if (bodies.receipt) {
      if (!bodies.events || bodies.diff === undefined || !bodies.tests || bodies.review === undefined) throw new Error("artifact-derived run is missing a required raw artifact");
      const taskManifestPath = join(projectRoot, "benchmarks", "tasks", `${String(raw.task?.id ?? "")}.json`);
      const taskManifestBody = await readVerifiedArtifact(taskManifestPath, "task manifest");
      const taskManifest = JSON.parse(taskManifestBody);
      if (taskManifest.id !== raw.task?.id) throw new Error("task manifest identity mismatch");
      normalized = normalizeRecordedRunFromArtifacts(raw, bodies as BenchmarkArtifactBodies, { expectedTaskManifestHash: createHash("sha256").update(taskManifestBody).digest("hex") });
    } else normalized = bodies.events ? normalizeRecordedRunMetrics(raw, JSON.parse(bodies.events) as RunEvent[]) : raw;
    runs.push(normalized);
  } catch (error) { process.stderr.write(`Skipped ${path}: ${error instanceof Error ? error.message : String(error)}\n`); }
}
const report = buildBenchmarkReport(runs); await mkdir(reportRoot, { recursive: true });
await writeFile(join(reportRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
await writeFile(join(reportRoot, "report.csv"), benchmarkCsv(report), { mode: 0o600 });
await writeFile(join(reportRoot, "REPORT.md"), benchmarkMarkdown(report), { mode: 0o600 });
await writeFile(join(reportRoot, "dashboard.json"), `${JSON.stringify({ generatedAt: report.generatedAt, runs: report.runs, comparisons: report.comparisons }, null, 2)}\n`, { mode: 0o600 });
process.stdout.write(`Built benchmark JSON, CSV, Markdown, and dashboard exports from ${report.runCount} real runs.\n`);
