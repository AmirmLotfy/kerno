import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { KernoService, startHttpServer } from "@kerno/daemon";

const args = process.argv.slice(2); const command = args.shift() ?? "help";
const option = (name: string) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
const root = resolve(option("--root") ?? process.cwd());
const dataDir = resolve(option("--data") ?? process.env.KERNO_DATA_DIR ?? join(root, ".kerno"));

async function main(): Promise<void> {
  if (command === "help") { process.stdout.write("Kerno CLI\n\nCommands: index, status, analyze, capsule, expand, serve, data-export, data-delete\n"); return; }
  if (command === "data-delete") {
    if (!args.includes("--yes")) throw new Error("Data deletion requires --yes");
    await rm(dataDir, { recursive: true, force: true }); process.stdout.write(`Deleted local Kerno data at ${dataDir}. This is not recoverable unless separately backed up.\n`); return;
  }
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  const service = new KernoService({ databasePath: join(dataDir, "kerno.db") });
  try {
    if (command === "index") console.log(JSON.stringify(await service.index({ root, mode: args.includes("--full") ? "full" : "incremental" }), null, 2));
    else if (command === "status") console.log(JSON.stringify(service.status({ repositoryId: option("--repository") }), null, 2));
    else if (command === "analyze") console.log(JSON.stringify(service.analyze({ repositoryId: option("--repository"), taskText: option("--task") ?? "" }), null, 2));
    else if (command === "capsule") console.log(JSON.stringify(service.buildCapsule({ taskAnalysisId: option("--task-id"), budgetTokens: Number(option("--budget") ?? 2500) }), null, 2));
    else if (command === "expand") console.log(JSON.stringify(service.expand({ capsuleId: option("--capsule"), evidence: { kind: "test_failure", artifactId: option("--artifact"), text: option("--evidence") ?? "", verified: true } }), null, 2));
    else if (command === "data-export") { const out = resolve(option("--out") ?? "kerno-export.json"); const payload = { exportedAt: new Date().toISOString(), repositories: service.store.list("snapshot"), tasks: service.store.list("task"), capsules: service.store.list("capsule"), memories: service.store.list("memory"), routes: service.store.list("route") }; await writeFile(out, JSON.stringify(payload, null, 2), { mode: 0o600 }); process.stdout.write(`Exported redacted Kerno state to ${out}\n`); }
    else if (command === "serve") { const handle = await startHttpServer(service, { port: Number(option("--port") ?? 0) }); process.stdout.write(`${JSON.stringify({ url: handle.url, token: handle.token })}\n`); await new Promise(() => {}); }
    else throw new Error(`Unknown command: ${command}`);
  } finally { if (command !== "serve") service.close(); }
}
main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exit(1); });
