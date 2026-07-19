import readline from "node:readline";
const lines = readline.createInterface({ input: process.stdin });
const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
lines.on("line", (line) => {
  const message = JSON.parse(line);
  if (message.method === "initialize") send({ id: message.id, result: { userAgent: "fake", codexHome: "/tmp", platformFamily: "unix", platformOs: "test" } });
  if (message.method === "model/list") send({ id: message.id, result: { data: [
    { id: "m-efficient", model: "efficient-model", displayName: "Efficient", hidden: false, isDefault: true, supportedReasoningEfforts: [{ reasoningEffort: "low" }, { reasoningEffort: "medium" }], defaultReasoningEffort: "medium" },
    { id: "m-depth", model: "depth-model", displayName: "Depth", hidden: false, isDefault: false, supportedReasoningEfforts: [{ reasoningEffort: "high" }, { reasoningEffort: "xhigh" }], defaultReasoningEffort: "high" }
  ] } });
  if (message.method === "thread/start") send({ id: message.id, result: { thread: { id: "thread_fake" }, model: message.params.model } });
  if (message.method === "thread/fork") send({ id: message.id, result: { thread: { id: "thread_forked" } } });
  if (message.method === "thread/resume") send({ id: message.id, result: { thread: { id: message.params.threadId } } });
  if (message.method === "turn/start") {
    send({ id: message.id, result: { turn: { id: "turn_fake", status: "inProgress", items: [] } } });
    send({ method: "turn/started", params: { threadId: message.params.threadId, turn: { id: "turn_fake" } } });
    send({ method: "thread/tokenUsage/updated", params: { threadId: message.params.threadId, turnId: "turn_fake", tokenUsage: { total: { totalTokens: 321, inputTokens: 240, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 81, reasoningOutputTokens: 20 }, last: { totalTokens: 321 }, modelContextWindow: 10000 } } });
    send({ method: "model/rerouted", params: { threadId: message.params.threadId, turnId: "turn_fake", fromModel: message.params.model, toModel: "fallback-live-model", reason: "availability" } });
    send({ method: "turn/completed", params: { threadId: message.params.threadId, turn: { id: "turn_fake", status: "completed", items: [] } } });
  }
});
