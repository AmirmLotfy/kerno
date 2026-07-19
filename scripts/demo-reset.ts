import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function run(command: string, args: string[]): Promise<void> {
  const child = spawn(command, args, { stdio: "inherit" });
  const code = await new Promise<number | null>((resolve) => child.once("exit", resolve));
  if (code !== 0) throw new Error(`${command} ${args.join(" ")} failed with ${code ?? "no status"}`);
}

const cache = fileURLToPath(new URL("../.kerno-cache/demo", import.meta.url));
await rm(cache, { recursive: true, force: true });
await run("npm", ["run", "benchmark:report"]);
await run("npm", ["run", "demo:record"]);
process.stdout.write("Demo evidence reset from retained artifacts and the deterministic fixture.\n");
