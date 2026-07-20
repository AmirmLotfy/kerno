# Kerno architecture

## Product boundary

Kerno is a local context-intelligence service with two Codex integrations. Plugin Mode exposes a skill and STDIO MCP tools but only recommends model changes. Orchestrator Mode owns separate Codex App Server threads and can request a live-discovered model and reasoning effort. The dashboard is an evidence reader, not a second control plane.

`@kerno/brand` is the sole visual-system dependency. It exports typed color/chart values and semantic CSS tokens; plugin, dashboard, documentation, social, Open Graph, and Devpost assets are generated from its canonical SVG directory and verified where packaging requires copies.

```text
plugin skill ─┐                           ┌─ SQLite/WAL daemon store
CLI ─────────┼─> KernoService ──────────┼─ process-scoped plugin run store
MCP STDIO ───┘       │                   ├─ durable local experience settings
MCP Apps component <─┤                   └─ append-only normalized events
                     ├─ safe indexer → symbols/edges/hashes
                     ├─ task/context/memory/invalidation
                     └─ route policy/catalog snapshots

App Server STDIO <─ orchestrator ─> implementation/debug/review threads
dashboard <──────── loopback HTTP/SSE or sanitized generated replay
```

## Package ownership

| Package | Responsibility | Must not do |
|---|---|---|
| `brand` | Canonical primitives, semantic theme tokens, chart palette, Context Core and marketing vectors | Duplicate product truth, embed metrics, or use component-local colors |
| `contracts` | Branded IDs, Zod entities, events, MCP/benchmark schemas | Domain decisions or I/O |
| `indexer` | Safe discovery, Git identity, hashes, JS/TS/Python parsing, graph edges | Execute repository scripts or follow symlinks |
| `core` | Classification, candidate scoring, capsules, memory, invalidation, routing | Transport-specific behavior |
| `storage` | Migrations, WAL, transactions, leases, FTS5, repository adapters | Recompute domain rules |
| `daemon` | `KernoService`, loopback HTTP snapshots, ordered SSE | Expose mutation over P0 HTTP |
| `mcp-server` | Sixteen strict STDIO tools, one MCP Apps UI resource, and structured errors | Shell-command inputs, source writes, or invented runtime state |
| `orchestrator` | App Server initialize/catalog/threads/turns/events/review | Assume catalog entries or claim unobserved effective models |
| `cli` | Human operations, JSON output, explicit export/delete | Silent destructive actions |
| `eval` | Fairness checks, metric derivation, JSON/CSV/Markdown/dashboard reports | Fill missing values with zero |
| `dashboard` | Read-only evidence and product states | Fabricate graph, runtime, or comparison data |

## Core data flow

1. Enrollment resolves the root, Git common directory, worktree, branch, commit, dirty digest, and ignore digest.
2. Indexing discovers only allowed files, hashes content, reuses unchanged snapshots, parses symbols/relationships, then invalidates dependent knowledge transactionally.
3. Task analysis extracts intent, entities, paths, errors, acceptance cues, and risk dimensions.
4. Capsule construction retrieves exact, lexical, graph, test, configuration, history, and currently verified-memory candidates.
5. Selection ranks marginal value per estimated token, deduplicates, honors the budget, and returns excluded alternatives.
6. A persisted test/runtime/review artifact may create a bounded immutable child capsule.
7. Outcomes and memories change only from persisted evidence or explicit user confirmation.

## Context score

```text
benefit =
  .30 task relevance + .15 graph proximity + .10 freshness + .10 confidence
  + .12 risk importance + .12 test evidence + .11 prior usefulness

context value = benefit / (1 + 1.5 × item token estimate / capsule budget)
```

Token estimates use `ceil(characters / 4)` and remain labeled estimates. Stable locators and IDs make ties deterministic.

## Persistence and transactions

The daemon uses versioned SQLite migrations, foreign keys, WAL, bounded busy timeouts, and repository-scoped indexing leases. A snapshot becomes current only after file/symbol/edge changes and invalidations commit. Corruption/migration tests reject incompatible state rather than resetting silently.

The plugin bundle uses a portable atomic JSON adapter because native module resolution from a copied plugin cache is unreliable. It writes a temporary file, flushes, renames, and maintains a recovery backup. Installed plugin MCP processes use process-scoped run files so concurrent Codex hosts cannot overwrite one shared run document. Onboarding and experience preferences use a separate owner-controlled atomic settings file and are opened only for a bounded read or write, allowing those preferences to survive fresh tasks without merging unrelated run state. Durable cross-task engineering memory remains the daemon SQLite store's responsibility. These are compatibility adapters, not second domain models.

## MCP contract surface

`kerno_index_repository`, `kerno_repository_status`, `kerno_analyze_task`, `kerno_build_context_capsule`, `kerno_expand_context`, `kerno_explain_context`, `kerno_impact_analysis`, `kerno_record_decision`, `kerno_record_outcome`, `kerno_invalidate_context`, `kerno_discover_models`, `kerno_route_task`, and `kerno_compare_runs` parse strict inputs, reject unknown fields, cap aggregate payloads, and return structured repository identity, data, and warnings. `kerno_get_settings`, `kerno_update_settings`, and `kerno_render_panel` add the explicit local experience surface.

Read/write truth: indexing, analyses, capsules, memory/outcome/invalidation, routing logs, and comparisons write Kerno-local state only. Model discovery starts only the fixed local App Server command and may consume authenticated capacity. No MCP tool accepts a caller-supplied command or writes repository source.

## Orchestration truth model

Startup is `initialize` → `initialized` → `model/list`. Kerno saves the catalog and validates each requested effort. A phase turn records:

- `Recommended`: Kerno policy output.
- `Requested`: accepted thread/turn request.
- `Effective`: only an explicit effective/reroute event; otherwise requested-unconfirmed.
- tool/file/plan/review/usage/failure events with sequence and timestamps.

Implementation may use workspace-write only within the user-authorized fixture/workspace. Exploration and independent review are read-only. Review runs in a fresh thread without the implementer transcript.

## HTTP and UI

The daemon binds `127.0.0.1`, generates an ephemeral bearer token, applies strict origin checks, and exposes read-only repository/capsule/run/comparison snapshots plus ordered SSE. The replay path uses the same UI schema and carries a persistent truth label, timestamp, source commit, and artifact hash.

The MCP server registers `ui://kerno/run-panel.html` as a self-contained `text/html;profile=mcp-app` resource. Only `kerno_render_panel` advertises that template, keeping data tools decoupled from presentation. The component reads validated structured output, escapes all repository-derived text, makes no network requests, and can call only the explicit Kerno settings/render tools exposed by the host. Its browser host harness supports inline and host-provided fullscreen presentation.

That resource is not, by itself, a registered Codex app. The current plugin has no `.app.json` or `apps` manifest field because Kerno has not registered a ChatGPT developer-mode app and has no assigned `plugin_asdk_app…` ID. Its MCP transport is local STDIO rather than a deployed streaming HTTPS `/mcp` endpoint. Consequently the installed plugin currently exposes structured tool output inside Codex; the working visual surface is the React dashboard. No documented extension point exists for an always-docked custom Codex sidebar or a Kerno page inside Codex's global Settings, so Kerno does not claim either.

First-run completion and preferences are stored locally. Capsule budget, expansion limit, and routing preference feed real domain behavior; theme, density, and estimate visibility affect only the component harness until the app registration path is completed. Telemetry remains a schema-level literal `false`.

## Failure handling

- Parser failure: generic lower-confidence evidence, never semantic precision.
- SQLite/plugin-cache incompatibility: documented portable store.
- App Server unavailable/auth/capacity: explicit Plugin Mode recommendation or replay, never simulated routing.
- Missing metric/reviewer event: `null`/unavailable, never zero/success.
- Stale snapshot or branch mismatch: invalidate conservatively and require re-index.

The CLI/daemon SQLite store and plugin portable store implement the same domain rules but are distinct local processes unless launched with the same configured portable state path. The default judge replay is intentionally generated in-process; P0 does not claim a continuously connected live dashboard control plane.
