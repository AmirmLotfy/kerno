# Architecture decision records

## ADR-001 — Correctness before token reduction

- Date: 2026-07-19
- Status: accepted
- Decision: Lead with passing tests, stale-belief prevention, and independent review. Token/read reduction is secondary evidence.
- Consequence: Missing metrics remain unavailable and the deterministic replay makes no comparative productivity claim.

## ADR-002 — Separate Plugin and Orchestrator modes

- Date: 2026-07-19
- Status: accepted
- Decision: Plugin Mode recommends models; only App Server Orchestrator Mode performs explicit model/effort routing.
- Consequence: UI stores recommended, requested, and runtime-effective states separately.

## ADR-003 — Deterministic repository intelligence first

- Date: 2026-07-19
- Status: accepted
- Decision: Use Git identity, hashes, syntax parsing, typed edges, tests, lexical evidence, and verified memory before embeddings.
- Consequence: No vector database, hosted service, or paid third party is required for P0.

## ADR-004 — Persist observed evidence, never caller assertions

- Date: 2026-07-19
- Status: accepted
- Decision: Test/runtime/review artifacts are hashed, redacted, and stored before they can trigger expansion, verify memory, or support a passed outcome.
- Consequence: Unknown IDs and caller-controlled `verified` fields are rejected.

## ADR-005 — Worktree-aware conservative invalidation

- Date: 2026-07-19
- Status: accepted
- Decision: Incremental state is keyed by repository and worktree; branch/file/symbol mismatches make knowledge stale transactionally.
- Consequence: Kerno may discard reusable context rather than silently cross a compatibility boundary.

## ADR-006 — App Server STDIO is the P0 orchestration spine

- Date: 2026-07-19
- Status: accepted
- Decision: Use stable STDIO JSONL, runtime `model/list`, explicit thread/turn settings, and version-matched schemas. Experimental transports/APIs are optional only.
- Consequence: SDK/WebSocket/dynamic-tool dependencies cannot block the demo.

## ADR-007 — Read-only evidence dashboard

- Date: 2026-07-19
- Status: accepted
- Decision: Dashboard mutations are out of P0; CLI/MCP own explicit state changes.
- Consequence: The UI can focus on capsule explanations, timelines, route truth, tests, comparisons, and limitations.

## ADR-008 — Portable plugin store fallback

- Date: 2026-07-19
- Status: accepted
- Decision: SQLite/WAL is the normal embedded store; the self-contained plugin bundle uses a validated atomic JSON store because native-addon resolution is unreliable in plugin caches.
- Consequence: Portable writes use temporary files, fsync, rename, and backup recovery; SQLite remains the richer daemon/CLI backend.

## ADR-009 — Industrial editorial visual direction

- Date: 2026-07-19
- Status: accepted
- Decision: Use warm paper, ink, signal orange, verified green, strong evidence hierarchy, and restrained motion.
- Consequence: The product reads as an engineering instrument rather than a generic analytics dashboard.
