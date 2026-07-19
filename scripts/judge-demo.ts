import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function run(command: string, args: string[]): Promise<void> { const child = spawn(command, args, { stdio: "inherit" }); const code = await new Promise<number | null>((done) => child.once("exit", done)); if (code !== 0) throw new Error(`${command} failed with ${code}`); }
const live = process.argv.includes("--live");
if (live) {
  process.stdout.write("Running a real read-only Codex App Server route before opening the dashboard. This consumes account capacity.\n");
  const startedAt = Date.now();
  await run("npm", ["run", "test:app-server:live"]);
  const liveArtifactPath = fileURLToPath(new URL("../benchmarks/recorded-results/app-server-live-smoke.json", import.meta.url));
  const artifact = JSON.parse(await readFile(liveArtifactPath, "utf8")) as { recordedAt?: string; phase?: { outcome?: { status?: string } } };
  const recordedAt = artifact.recordedAt ? Date.parse(artifact.recordedAt) : Number.NaN;
  if (!Number.isFinite(recordedAt) || recordedAt < startedAt - 1_000 || artifact.phase?.outcome?.status !== "completed") throw new Error("Live judge evidence is missing, stale, or incomplete; refusing to present the replay as live-backed");
}
await run("npm", ["run", "demo:record"]);
await run("npm", ["run", "build", "--workspace", "@kerno/dashboard"]);
if (process.argv.includes("--check")) { process.stdout.write("Judge replay built successfully.\n"); process.exit(0); }
process.stdout.write(`Starting Kerno ${live ? "live-evidence plus replay" : "judge replay"} at http://127.0.0.1:4173\n`);
await run("npm", ["run", "preview", "--workspace", "@kerno/dashboard", "--", "--host", "127.0.0.1", "--port", "4173"]);
