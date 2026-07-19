import { fileURLToPath } from "node:url";
import { CodexPhaseOrchestrator } from "@kerno/orchestrator";
import { analyzeTask, routeTask } from "@kerno/core";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const orchestrator = new CodexPhaseOrchestrator({ requestTimeoutMs: 180_000 });
try {
  const catalog = await orchestrator.initialize();
  const task = analyzeTask("repo_live_smoke", "snapshot_live_smoke", "Inspect the refund handler in read-only mode and identify its transaction risk in one sentence.");
  const route = routeTask(task, "broad-exploration", catalog.catalogSnapshotId, catalog.models, { latency: "fast" });
  const result = await orchestrator.runPhase({ runId: "run_live_smoke", phase: "broad-exploration", route, cwd: fileURLToPath(new URL("../fixtures/relaycart-ts/seed", import.meta.url)), prompt: "Read only src/webhooks/refund-handler.ts and state the transaction risk in one concise sentence. Do not edit files." });
  const artifact = { recordedAt: new Date().toISOString(), catalog: { id: catalog.catalogSnapshotId, models: catalog.models }, phase: result };
  const out = fileURLToPath(new URL("../benchmarks/recorded-results/app-server-live-smoke.json", import.meta.url)); await mkdir(dirname(out), { recursive: true }); await writeFile(out, `${JSON.stringify(artifact, null, 2)}\n`, { mode: 0o600 });
  if (result.outcome.status !== "completed") {
    process.stderr.write(`Live App Server protocol reached an accepted ${result.modelState.requested} turn, but execution ended ${result.outcome.status}: ${JSON.stringify(result.outcome.error)}\n`);
    process.exitCode = 2;
  } else process.stdout.write(`Live App Server smoke passed. Requested ${result.modelState.requested}; state ${result.modelState.label}.\n`);
} finally { await orchestrator.close(); }
