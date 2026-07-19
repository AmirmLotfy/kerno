import { createInterface } from "node:readline";

const lines = createInterface({ input: process.stdin });
lines.on("line", (line) => {
  const message = JSON.parse(line);
  if (message.id === undefined) return;
  let result = {};
  if (message.method === "initialize") result = {};
  else if (message.method === "model/list") result = { data: [{ model: "hang-model", displayName: "Hang model", isDefault: true, supportedReasoningEfforts: [{ reasoningEffort: "low" }], defaultReasoningEffort: "low" }] };
  else if (message.method === "thread/start") result = { thread: { id: "thread_hang" }, model: "hang-model" };
  else if (message.method === "turn/start") result = { turn: { id: "turn_hang" } };
  else if (message.method === "turn/interrupt") result = {};
  process.stdout.write(`${JSON.stringify({ id: message.id, result })}\n`);
});
