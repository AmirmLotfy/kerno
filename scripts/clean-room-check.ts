import { spawn } from "node:child_process";
async function run(command: string, args: string[]): Promise<void> { const child = spawn(command, args, { stdio: "inherit" }); const code = await new Promise<number | null>((done) => child.once("exit", done)); if (code !== 0) throw new Error(`${command} failed with ${code}`); }
await run("npm", ["run", "typecheck"]);
await run("npm", ["run", "lint"]);
await run("npm", ["test"]);
await run("npm", ["run", "judge", "--", "--check"]);
await run("npm", ["run", "test:e2e"]);
await run("npm", ["run", "demo:screenshot"]);
await run("npm", ["run", "package:plugin"]);
await run("npm", ["run", "plugin:smoke"]);
process.stdout.write("Clean-room-equivalent local gate passed. A separate fresh macOS/Linux clone is still required before release.\n");
