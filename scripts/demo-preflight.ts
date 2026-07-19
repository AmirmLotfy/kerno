import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const replayPath = fileURLToPath(new URL("../apps/dashboard/public/replay.json", import.meta.url));
const benchmarkPath = fileURLToPath(new URL("../apps/dashboard/public/benchmark.json", import.meta.url));
const runtimePath = fileURLToPath(new URL("../apps/dashboard/public/runtime-evidence.json", import.meta.url));
const assets = [
  "../docs/assets/screenshots/dashboard-context-light.png",
  "../docs/assets/brand/kerno-horizontal-light.svg",
  "../docs/assets/brand/kerno-horizontal-dark.svg",
  "../docs/assets/brand/kerno-devpost-thumbnail.png"
].map((path) => fileURLToPath(new URL(path, import.meta.url)));

const replay = z.object({
  label: z.literal("DETERMINISTIC FIXTURE REPLAY"), artifactHash: z.string().min(32),
  timeline: z.array(z.object({ type: z.string(), at: z.string(), detail: z.string() })).min(1),
  tests: z.object({ before: z.object({ passed: z.literal(false) }), after: z.object({ passed: z.literal(true) }) }),
  invalidation: z.object({ status: z.literal("stale") })
}).passthrough().parse(JSON.parse(await readFile(replayPath, "utf8")));
const replayText = JSON.stringify(replay);
if (/(?:file:\/\/|\/Users\/|\/?private\/var\/folders\/|\/var\/folders\/|\/tmp\/)/.test(replayText)) throw new Error("Replay contains an unsanitized absolute or temporary path");
for (let index = 1; index < replay.timeline.length; index += 1) {
  if (Date.parse(replay.timeline[index]!.at) < Date.parse(replay.timeline[index - 1]!.at)) throw new Error("Replay events are not chronological");
}
const benchmark = z.object({ comparisons: z.array(z.object({ fairness: z.object({ passed: z.boolean() }) }).passthrough()) }).passthrough().parse(JSON.parse(await readFile(benchmarkPath, "utf8")));
const runtime = z.object({ available: z.boolean(), label: z.string(), modelState: z.string().optional() }).passthrough().parse(JSON.parse(await readFile(runtimePath, "utf8")));
for (const asset of assets) await access(asset);
process.stdout.write(JSON.stringify({
  replay: "passed", replayArtifactHash: replay.artifactHash, benchmarkComparisons: benchmark.comparisons.length,
  fairComparisons: benchmark.comparisons.filter((item) => item.fairness.passed).length,
  runtimeEvidence: runtime.available ? runtime.label : "unavailable", runtimeModelState: runtime.modelState ?? "unavailable",
  assets: "present", video: "not recorded or verified by this command"
}, null, 2) + "\n");
