import readline from "node:readline";
const lines = readline.createInterface({ input: process.stdin });
const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
lines.on("line", (line) => {
  const message = JSON.parse(line);
  if (message.method === "initialize") send({ id: message.id, result: {} });
  if (message.method === "model/list") send({ id: message.id, result: { data: [{ model: "only-model", displayName: "Only", hidden: false, isDefault: true, supportedReasoningEfforts: [{ reasoningEffort: "low" }], defaultReasoningEffort: "low" }] } });
  if (message.method === "thread/start") send({ id: message.id, result: { thread: { id: "thread_exit" }, model: message.params.model } });
  if (message.method === "turn/start") { send({ id: message.id, result: { turn: { id: "turn_exit", status: "inProgress" } } }); setTimeout(() => process.exit(7), 10); }
});
