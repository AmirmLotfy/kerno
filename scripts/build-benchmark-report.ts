import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { benchmarkCsv, benchmarkMarkdown, buildBenchmarkReport } from "@kerno/eval";

const liveRoot = fileURLToPath(new URL("../benchmarks/recorded-results/live", import.meta.url));
const reportRoot = fileURLToPath(new URL("../benchmarks/reports", import.meta.url));
const runs: unknown[] = [];
for (const entry of await readdir(liveRoot, { withFileTypes: true }).catch(() => [])) {
  if (!entry.isDirectory()) continue;
  const path = join(liveRoot, entry.name, "run.json");
  try { runs.push(JSON.parse(await readFile(path, "utf8"))); } catch (error) { process.stderr.write(`Skipped ${path}: ${error instanceof Error ? error.message : String(error)}\n`); }
}
const report = buildBenchmarkReport(runs); await mkdir(reportRoot, { recursive: true });
await writeFile(join(reportRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
await writeFile(join(reportRoot, "report.csv"), benchmarkCsv(report), { mode: 0o600 });
await writeFile(join(reportRoot, "REPORT.md"), benchmarkMarkdown(report), { mode: 0o600 });
await writeFile(join(reportRoot, "dashboard.json"), `${JSON.stringify({ generatedAt: report.generatedAt, runs: report.runs, comparisons: report.comparisons }, null, 2)}\n`, { mode: 0o600 });
process.stdout.write(`Built benchmark JSON, CSV, Markdown, and dashboard exports from ${report.runCount} real runs.\n`);
