import { cp, mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";

async function run(command: string, args: string[]): Promise<void> {
  const child = spawn(command, args, { stdio: "inherit" }); const code = await new Promise<number | null>((done) => child.once("exit", done)); if (code !== 0) throw new Error(`${command} failed with ${code}`);
}
await run("npm", ["run", "build", "--workspace", "@kerno/mcp-server"]);
await rm("plugins/kerno/dist", { recursive: true, force: true });
await mkdir("plugins/kerno/dist", { recursive: true });
await cp("packages/mcp-server/dist/main.cjs", "plugins/kerno/dist/kerno-mcp.cjs");
await mkdir("dist", { recursive: true });
await run("npm", ["pack", "./plugins/kerno", "--pack-destination", "./dist"]);
process.stdout.write("Packaged plugin with bundled MCP executable.\n");
