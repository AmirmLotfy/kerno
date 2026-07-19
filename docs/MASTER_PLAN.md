# Kerno master plan

Status: approved implementation baseline. Updated July 19, 2026 after the live compliance refresh.

## Winning thesis

Kerno is the context control plane for Codex. It compiles a task into the smallest fresh, evidence-backed repository context; tests that context against runtime reality; expands only when evidence exposes a gap; invalidates stale beliefs; and routes distinct work phases through observable Codex threads.

Kerno is not generic repository RAG. Its defensible loop is:

```text
task → classification → bounded capsule → Codex phase → test/runtime evidence
     → targeted expansion or invalidation → independent verification → outcome learning
```

The primary user is a developer working with Codex in a medium or large long-lived repository who repeatedly pays for rediscovery, stale assumptions, broad reads, and one-size-fits-all model selection.

## Canonical demonstration

The `relaycart-ts` fixture contains webhook, ledger, idempotency, transaction, and integration-test modules. Concurrent `refund.succeeded` deliveries can credit twice. The initial capsule intentionally omits the transaction contract. A real concurrent test fails, its persisted artifact triggers a transaction-only child capsule, the approved patch passes concurrency/restart/public-shape tests, a fresh phase thread reviews the result when Codex execution is available, and re-indexing invalidates the original capsule.

The dashboard leads with correctness and preserves unavailable values. A deterministic fixture replay may be used for judging, but it must never simulate model use, token usage, a baseline, or independent Codex review.

## P0 scope

- Installable repository-local Codex plugin, skill, reviewed hooks, and bundled STDIO MCP server.
- TypeScript/npm-workspaces local-first architecture.
- JS/TS and Python indexing with generic text fallback, Git/worktree identity, ignores, hashes, symbols, imports, exports, calls, tests, and confidence labels.
- SQLite/WAL domain storage plus a crash-safer portable plugin store.
- Task analysis, deterministic scoring, token budgeting, provenance, explanations, excluded candidates, and evidence-driven child capsules.
- Evidence registry, verified/candidate/stale/superseded memory states, branch/file/symbol invalidation, export, and safe deletion.
- Plugin Mode recommendations kept distinct from Orchestrator Mode execution.
- App Server STDIO model discovery, supported effort selection, separate phase threads, reroute/usage/tool/file events, failure classification, and fresh review thread.
- Read-only loopback HTTP/SSE and an evidence-first React dashboard.
- Two fixtures, three registered benchmark tasks, deterministic replay, live benchmark harness, and raw-artifact truthfulness.
- Unit, contract, database, parser, integration, security, CLI, orchestration, dashboard, and complete operational-slice tests.
- One-command judge replay, package validation, clean-room gate, and complete judge/submission documentation.

P1 includes richer language coverage, graph visualization, optional embeddings, more trials, and smarter verified outcome utility. P2 excludes cloud sync, enterprise auth, billing, hosted multi-tenancy, universal parsing, speculative autonomous learning, and deep IDE integrations.

## Architecture

```text
Codex plugin ─┐
Kerno CLI ────┼─> KernoService ─> index/context/memory/router ─> SQLite/portable store
MCP STDIO ────┘          │
App Server orchestrator ─┴─> explicit phase threads + normalized events
Dashboard <──────────── loopback HTTP/SSE or immutable generated replay
Evaluation <─────────── pinned fixtures, manifests, tests, diffs, raw events
```

Dependency direction is contracts → core/indexer → storage → daemon → MCP/CLI/orchestrator → evaluation. The dashboard consumes contracts and never recomputes domain truth.

## Context and memory policy

The context-value score is:

```text
benefit = 0.30 relevance + 0.15 graph proximity + 0.10 freshness
        + 0.10 confidence + 0.12 risk + 0.12 test evidence
        + 0.11 prior usefulness

context value = benefit / (1 + 1.5 × item tokens / capsule budget)
```

All values are normalized. Token counts based on characters are labeled estimates. Selection is deterministic, budget-bounded, deduplicated, and provenance-bearing. Expansion requires a persisted test/runtime/review artifact and creates an immutable child capsule. Repository text and test output remain untrusted evidence.

Only verified memory is retrieved by default. Agent prose creates candidates. Test claims require a persisted matching artifact; user decisions require explicit confirmation. Worktree, branch, commit, file hash, symbol signature/body, graph/config/test artifact, and engine-version keys invalidate conservatively.

## Model routing boundary

Plugin Mode cannot silently change its parent model. It builds context, recommends a live-known model/effort, and uses transparent `/model` and `/reasoning` fallback.

Orchestrator Mode calls App Server `model/list`, stores the catalog provenance, validates efforts, and uses explicit `thread/start` and `turn/start` requests. Exploration favors the efficient live role; implementation escalates with risk; architecture/security/final verification use the depth role. Requested and effective models are distinct. Effective is set only from runtime evidence such as `model/rerouted`.

## Security defaults

- Source remains local; no telemetry or upload by default.
- Realpath containment, no-follow file access, symlink exclusion, `.gitignore`, `.kernoignore`, binary/size limits, and fixed Git arguments.
- Strict Zod schemas, bounded arrays/text, no MCP shell-command inputs, and summary-only index output.
- Secret filtering at indexing, task/memory persistence, hooks, events, export, and dashboard boundaries.
- Loopback-only bearer-protected read API and ordered SSE.
- Advisory, timeout-bounded, reviewable hooks that fail open.
- Kerno never widens Codex sandbox or approval policy.

## Evaluation and acceptance

Context-controlled comparisons keep task, commit, permissions, model/effort, and target behavior equal. Full-system comparisons are labeled separately. Metrics come from raw App Server/test/diff artifacts; unavailable is never zero. Cost is omitted without verified pricing and billable usage.

P0 is done when a clean clone installs; the plugin exposes its skill/tools; unchanged re-indexing reparses zero files; every capsule item explains provenance/freshness/confidence/cost/reason/invalidation; failed evidence creates a targeted child; branch/file changes invalidate safely; live routing uses only `model/list`; review uses a fresh thread; the dashboard reflects real or clearly labeled replay data; all tests and packaging pass; and the under-three-minute demo can prove the loop.

## Delivery gates

1. Core operational slice before UI polish.
2. Live catalog and one accepted routed turn before route UI claims.
3. Invalidation tests before durable-memory breadth.
4. Frozen prompts/commits/formulas before final benchmarks.
5. Clean-room plugin/replay/live preflight before video.
6. Repository access, public video, README/license, `/feedback` Session ID, and every authenticated field before submission.

Current validation evidence boundary: live `model/list` returned four models, accepted a `gpt-5.6-sol`/`low` request, and completed the turn. No effective-model or reroute event was emitted, so the displayed route remains `requested-unconfirmed`; completion is not proof that the requested model was the effective model. Historical benchmark artifacts contain completed implementation/review attempts but lack the clean-profile provenance required for a fair comparison, so fair baseline claims must not be inferred.
