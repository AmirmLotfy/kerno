import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { benchmarkCsv, benchmarkMarkdown, buildBenchmarkReport, normalizeRecordedRunMetrics } from "@kerno/eval";
import type { RunEvent } from "@kerno/contracts";

const liveRoot = fileURLToPath(new URL("../benchmarks/recorded-results/live", import.meta.url));
const reportRoot = fileURLToPath(new URL("../benchmarks/reports", import.meta.url));
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const runs: unknown[] = [];
for (const entry of await readdir(liveRoot, { withFileTypes: true }).catch(() => [])) {
  if (!entry.isDirectory()) continue;
  const path = join(liveRoot, entry.name, "run.json");
  try {
    const raw = JSON.parse(await readFile(path, "utf8"));
    const eventRelative = raw.artifacts?.events;
    let normalized = raw;
    if (typeof eventRelative === "string") {
      const eventPath = resolve(projectRoot, eventRelative);
      if (!eventPath.startsWith(`${resolve(projectRoot)}${sep}`)) throw new Error("event artifact escaped the repository");
      const body = await readFile(eventPath, "utf8");
      if (raw.artifactHashes?.events && createHash("sha256").update(body).digest("hex") !== raw.artifactHashes.events) throw new Error("event artifact hash mismatch");
      normalized = normalizeRecordedRunMetrics(raw, JSON.parse(body) as RunEvent[]);
    }
    runs.push(normalized);
  } catch (error) { process.stderr.write(`Skipped ${path}: ${error instanceof Error ? error.message : String(error)}\n`); }
}
const report = buildBenchmarkReport(runs); await mkdir(reportRoot, { recursive: true });
await writeFile(join(reportRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
await writeFile(join(reportRoot, "report.csv"), benchmarkCsv(report), { mode: 0o600 });
await writeFile(join(reportRoot, "REPORT.md"), benchmarkMarkdown(report), { mode: 0o600 });
await writeFile(join(reportRoot, "dashboard.json"), `${JSON.stringify({ generatedAt: report.generatedAt, runs: report.runs, comparisons: report.comparisons }, null, 2)}\n`, { mode: 0o600 });
process.stdout.write(`Built benchmark JSON, CSV, Markdown, and dashboard exports from ${report.runCount} real runs.\n`);
