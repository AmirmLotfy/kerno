import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const out = resolve(".kerno-cache/app-server-schema"); await mkdir(out, { recursive: true });
const child = spawn("codex", ["app-server", "generate-json-schema", "--out", out], { stdio: "inherit" });
const code = await new Promise<number | null>((resolveCode) => child.once("exit", resolveCode));
if (code !== 0) process.exit(code ?? 1);
