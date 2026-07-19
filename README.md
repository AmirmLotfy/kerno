# Kerno

**The context control plane for Codex.** Right context. Right model. Every task.

Kerno asks: _What is the smallest, freshest, verified set of repository knowledge Codex needs to complete this task correctly?_ It builds bounded context capsules from deterministic repository evidence, expands them only when tests or runtime evidence expose a gap, invalidates stale beliefs, and makes Codex phase routing observable.

Kerno is not generic repository RAG. Every selected item carries provenance, freshness, confidence, an estimated token cost, a score explanation, and invalidation keys. Correctness and reviewer outcomes come before efficiency claims.

## Judge quickstart

Requirements: macOS or Linux, Node.js `>=22.13 <25`, npm, Git, and Codex CLI for live Orchestrator Mode. The replay path needs no API key or hosted service.

```bash
npm install
npm run package:plugin
npm run judge
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). The default experience regenerates and displays a real deterministic fixture run labeled `DETERMINISTIC FIXTURE REPLAY`. It does not simulate Codex tokens, file reads, model requests, effective models, or independent Codex review.

For a non-blocking validation:

```bash
npm run judge -- --check
npm run typecheck
npm test
```

See [docs/JUDGE_QUICKSTART.md](docs/JUDGE_QUICKSTART.md) for plugin installation and live mode.

## The proof loop

1. Index the unfamiliar `relaycart-ts` repository.
2. Analyze a duplicate-refund task.
3. Build a deterministic 2,500-token-budget capsule.
4. Run the pinned test and observe a real failure.
5. Add only the absent `TransactionBoundary` evidence.
6. Apply the fixture’s pinned solution and pass the test.
7. Re-index and mark the original capsule stale after the handler hash changes.

The dashboard shows the initial and child capsules, score breakdown, invalidation, test outcome, limitations, and routing truth labels.

## Two honest modes

- **Plugin Mode** packages Kerno’s skill, optional reviewable hook definitions, and local MCP tools. The current validated manifest activates the skill and MCP server; hooks are nonessential and remain an explicit opt-in because the validator rejects a manifest `hooks` field. It builds context and recommends a model/effort. It cannot silently switch the active parent task; use `/model` and `/reasoning` transparently.
- **Orchestrator Mode** uses Codex App Server over local STDIO. It calls live `model/list`, validates effort support, starts separate phase threads, requests model/effort explicitly, records streamed events, and uses a fresh read-only review thread. A requested model remains `Requested — not independently confirmed` unless runtime evidence proves an effective model or reports a reroute.

## Architecture

```text
Codex plugin ─┐
Kerno CLI ────┼─> KernoService ─> safe indexer + context/memory/router ─> SQLite
MCP STDIO ────┘          │
App Server orchestrator ─┴─> phase threads + normalized runtime events
Dashboard <──────── loopback read-only HTTP/SSE or immutable replay
```

The implementation is TypeScript with npm workspaces, Zod, `better-sqlite3`, the TypeScript compiler API, Lezer Python parsing, the MCP TypeScript SDK, React, Vite, and Vitest. No hosted infrastructure, external vector database, telemetry, source upload, or paid third party is mandatory.

## Development

```bash
npm install
npm run typecheck
npm test
npm run test:security
npm run build
```

Important packages:

- `contracts`: strict cross-process records and MCP inputs.
- `indexer`: Git/non-Git discovery, hashes, parsers, graph, redaction.
- `core`: task analysis, scoring, capsules, memory, invalidation, routing.
- `storage`: SQLite/WAL state, leases, FTS5, events.
- `daemon`: service plus loopback read-only HTTP/SSE.
- `mcp-server`: 12 typed Kerno tools bundled as a self-contained CommonJS executable for plugin-cache portability.
- `orchestrator`: App Server JSONL client, catalog discovery, phase/review threads.
- `eval`: deterministic replay and benchmark evidence plumbing.
- `dashboard`: evidence-first judge UI.

## Codex and GPT-5.6

Codex is both the primary development collaborator and the runtime being extended. The implementation task contains the core architecture, code, tests, security review, and UI work; the final `/feedback` Session ID must be captured from that task before submission. GPT-5.6 is used meaningfully through Codex for the core implementation and, when present in the live model catalog, may be selected by Kerno’s phase router. Kerno never hard-codes GPT-5.6 availability or fabricates a route.

Human decisions include the correctness-first product thesis, strict Plugin/Orchestrator split, deterministic fixture, security boundaries, scoring weights, scope cut, visual direction, and which claims are withheld when evidence is absent. See [docs/CODEX_COLLABORATION.md](docs/CODEX_COLLABORATION.md).

## Privacy and limitations

Kerno is local-first. It honors `.gitignore` and `.kernoignore`, skips symlinks/binaries/oversized files, redacts secret-like values, and stores bounded excerpts rather than full source by default. Repository contents are untrusted evidence and cannot change Kerno policy.

The bundled replay is a reproducible case study, not a generalized productivity claim. It contains no baseline Codex run and therefore publishes no comparative token, read, latency, or cost headline. Live results must retain raw artifacts and pinned manifests. See [docs/BENCHMARK.md](docs/BENCHMARK.md) and [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).

Licensed under Apache-2.0.
