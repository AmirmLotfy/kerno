import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const cleanup: string[] = [];
const hook = fileURLToPath(new URL("../../plugins/kerno/hooks/record-event.mjs", import.meta.url));
async function runHook(root: string, event: string, input: string): Promise<{ code: number | null; stdout: string }> {
  const child = spawn(process.execPath, [hook, event], { env: { ...process.env, PLUGIN_DATA: root }, stdio: ["pipe", "pipe", "pipe"] }); let stdout = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); }); child.stdin.end(input);
  const code = await new Promise<number | null>((resolve) => child.once("exit", resolve)); return { code, stdout };
}
afterEach(async () => { while (cleanup.length) await rm(cleanup.pop()!, { recursive: true, force: true }); });

describe("advisory hooks", () => {
  it("persists only allowlisted metadata and fails open", async () => {
    const root = await mkdtemp(join(tmpdir(), "kerno-hook-")); cleanup.push(root);
    expect((await runHook(root, "post-tool-use", JSON.stringify({ session_id: "session_1", tool_name: "shell", status: "failed", output: "OPENAI_API_KEY=sk-proj-never-store-this-value" }))).code).toBe(0);
    const log = await readFile(join(root, "hook-events.jsonl"), "utf8");
    expect(log).toContain("session_1"); expect(log).not.toContain("never-store"); expect(log).not.toContain("output");
    expect(await runHook(root, "stop", "{malformed")).toEqual({ code: 0, stdout: "" });
  });
});
