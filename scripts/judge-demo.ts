import { spawn } from "node:child_process";

async function run(command: string, args: string[]): Promise<void> { const child = spawn(command, args, { stdio: "inherit" }); const code = await new Promise<number | null>((done) => child.once("exit", done)); if (code !== 0) throw new Error(`${command} failed with ${code}`); }
await run("npm", ["run", "demo:record"]);
await run("npm", ["run", "build", "--workspace", "@kerno/dashboard"]);
if (process.argv.includes("--check")) { process.stdout.write("Judge replay built successfully.\n"); process.exit(0); }
process.stdout.write("Starting Kerno judge replay at http://127.0.0.1:4173\n");
await run("npm", ["run", "preview", "--workspace", "@kerno/dashboard", "--", "--host", "127.0.0.1", "--port", "4173"]);
