import readline from "node:readline";
const lines = readline.createInterface({ input: process.stdin });
const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
let threadSequence = 0; let turnSequence = 0;
lines.on("line", (line) => {
  const message = JSON.parse(line);
  if (message.method === "initialize") send({ id: message.id, result: { userAgent: "fake", codexHome: "/tmp", platformFamily: "unix", platformOs: "test" } });
  if (message.method === "model/list") send({ id: message.id, result: { data: [
    { id: "m-efficient", model: "efficient-model", displayName: "Efficient", hidden: false, isDefault: true, supportedReasoningEfforts: [{ reasoningEffort: "low" }, { reasoningEffort: "medium" }], defaultReasoningEffort: "medium" },
    { id: "m-depth", model: "depth-model", displayName: "Depth", hidden: false, isDefault: false, supportedReasoningEfforts: [{ reasoningEffort: "high" }, { reasoningEffort: "xhigh" }], defaultReasoningEffort: "high" }
  ] } });
  if (message.method === "thread/start") send({ id: message.id, result: { thread: { id: `thread_fake_${++threadSequence}` }, model: message.params.model } });
  if (message.method === "thread/fork") send({ id: message.id, result: { thread: { id: "thread_forked" } } });
  if (message.method === "thread/resume") send({ id: message.id, result: { thread: { id: message.params.threadId } } });
  if (message.method === "turn/start") {
    const turnId = `turn_fake_${++turnSequence}`;
    send({ id: message.id, result: { turn: { id: turnId, status: "inProgress", items: [] } } });
    send({ method: "turn/started", params: { threadId: message.params.threadId, turn: { id: turnId } } });
    send({ method: "thread/tokenUsage/updated", params: { threadId: message.params.threadId, turnId, tokenUsage: { total: { totalTokens: 321, inputTokens: 240, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 81, reasoningOutputTokens: 20 }, last: { totalTokens: 321 }, modelContextWindow: 10000 } } });
    send({ method: "model/rerouted", params: { threadId: message.params.threadId, turnId, fromModel: message.params.model, toModel: "fallback-live-model", reason: "availability" } });
    send({ method: "turn/completed", params: { threadId: message.params.threadId, turn: { id: turnId, status: "completed", items: [] } } });
  }
});
