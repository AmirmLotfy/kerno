#!/usr/bin/env node
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const eventName = process.argv[2] ?? "unknown";
let input = "";
for await (const chunk of process.stdin) {
  input += chunk;
  if (input.length > 64 * 1024) break;
}
try {
  const payload = input ? JSON.parse(input) : {};
  const safe = {
    occurredAt: new Date().toISOString(),
    eventName,
    sessionId: typeof payload.session_id === "string" ? payload.session_id.slice(0, 160) : undefined,
    toolName: typeof payload.tool_name === "string" ? payload.tool_name.slice(0, 160) : undefined,
    status: typeof payload.status === "string" ? payload.status.slice(0, 80) : undefined
  };
  const dataDir = process.env.PLUGIN_DATA;
  if (dataDir) {
    await mkdir(dataDir, { recursive: true, mode: 0o700 });
    await appendFile(join(dataDir, "hook-events.jsonl"), `${JSON.stringify(safe)}\n`, { mode: 0o600 });
  }
} catch {
  // Advisory hook: fail open and never block Codex.
}
process.exit(0);
