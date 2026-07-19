import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { recordCanonicalReplay } from "@kerno/eval";

const replay = await recordCanonicalReplay({
  fixtureRoot: fileURLToPath(new URL("../fixtures/relaycart-ts/seed", import.meta.url)),
  solutionPath: fileURLToPath(new URL("../fixtures/relaycart-ts/solution/refund-handler.ts", import.meta.url))
});
const outputs = [
  fileURLToPath(new URL("../benchmarks/recorded-results/canonical-run.json", import.meta.url)),
  fileURLToPath(new URL("../apps/dashboard/public/replay.json", import.meta.url))
];
for (const output of outputs) { await mkdir(dirname(output), { recursive: true }); await writeFile(output, `${JSON.stringify(replay, null, 2)}\n`, { mode: 0o600 }); }
process.stdout.write(`Recorded real deterministic fixture evidence ${replay.artifactHash}\n`);
