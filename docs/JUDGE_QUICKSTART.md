# Judge quickstart

## Fast replay (under five minutes)

```bash
npm install
npm run package:plugin
npm run judge
```

Open `http://127.0.0.1:4173`. Inspect the capsule, select an item for “Why included,” view the child capsule, open Timeline, then Comparison and Benchmark & limits. The persistent replay label and limitations are part of the product.

## Plugin

Add this repository’s `.agents/plugins/marketplace.json` as a local marketplace in Codex desktop or CLI, install Kerno, review/trust `plugins/kerno/hooks/hooks.json`, refresh Codex, and begin a new task. The plugin bundle expects `plugins/kerno/dist/kerno-mcp.cjs`; `npm run package:plugin` creates it. If cache-relative execution is unavailable, run `npm run setup:judge` and use the generated absolute-path fallback.

Plugin Mode can build capsules and recommend `/model` and `/reasoning` choices. It cannot silently switch the parent task model.

## Live Orchestrator preflight

```bash
codex app-server generate-json-schema --out .kerno-cache/app-server-schema
npm run test:app-server:live
```

This uses the signed-in Codex CLI, consumes real model capacity, starts a read-only phase thread, and writes an evidence artifact. Model availability is discovered at runtime.

Supported/tested locally: macOS, Node 22.13. CI targets macOS/Linux on Node 22/24. Do not claim Windows until a clean-room run succeeds.
