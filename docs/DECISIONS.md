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
- Decision: SQLite/WAL is the normal embedded store; the self-contained plugin bundle uses a validated, process-scoped atomic JSON store because native-addon resolution is unreliable in plugin caches and multiple Codex hosts must not share a long-lived whole-file writer lock. Durable cross-task state belongs to the daemon SQLite store.
- Consequence: Portable writes use temporary files, fsync, rename, and backup recovery; SQLite remains the richer daemon/CLI backend.

## ADR-009 — Industrial editorial visual direction

- Date: 2026-07-19
- Status: accepted
- Decision: Use warm paper, ink, signal orange, verified green, strong evidence hierarchy, and restrained motion.
- Consequence: The product reads as an engineering instrument rather than a generic analytics dashboard.

## ADR-010 — Preserve unfavorable benchmark outcomes

- Date: 2026-07-19
- Status: accepted
- Decision: Retain complete real pairs even when Kerno uses more tokens, tools, or latency. Separate context-controlled and routing experiments.
- Consequence: The first real pair is published as partial and unfavorable on several efficiency metrics; no percentage headline or generalized claim is permitted.

## ADR-011 — Sanitize checked evidence without rewriting measurements

- Date: 2026-07-19
- Status: accepted
- Decision: Checked-in App Server and benchmark artifacts replace local home/workspace/temp prefixes but preserve events, results, and derived values.
- Consequence: Reports link repository-relative artifacts; source-private paths are not publication evidence.

## ADR-012 — Truth-labeled replay as the default judge path

- Date: 2026-07-19
- Status: accepted
- Decision: `npm run judge` opens a deterministic local proof loop; authenticated live orchestration is separate.
- Consequence: Judges can understand the product without capacity risk, while the UI never presents replayed data as a live model run.

## ADR-013 — Context Core and a canonical warm token system

- Date: 2026-07-19
- Status: accepted; supersedes ADR-009’s underspecified palette and typographic K treatment
- Decision: Use `@kerno/brand` as the sole editable source for oxide, warm graphite, ivory, stone, aubergine, semantic, dark, and chart tokens. Replace the typographic K with the container-free Context Core; allow a graphite container only for launcher-scale assets.
- Consequence: Dashboard components consume semantic aliases, green is restricted to true success, review is aubergine, Baseline/Kerno are stone/oxide, plugin and marketing copies are generated from canonical SVGs, and automated checks reject old colors or divergent mirrors.

## ADR-014 — Trusted artifacts originate inside the execution boundary

- Date: 2026-07-19
- Status: accepted; strengthens ADR-004
- Decision: MCP callers may attach descriptions, but only artifacts created by Kerno-controlled execution or an explicit trusted internal adapter can verify memory, outcomes, or expansion evidence.
- Consequence: Caller-supplied `verified` flags, exit codes, and prose cannot promote a claim; nested secrets are redacted before persistence and events.

## ADR-015 — Revoke fairness when isolation provenance is absent

- Date: 2026-07-19
- Status: accepted; corrects ADR-010’s earlier pair wording
- Decision: A context-controlled pair requires a verified clean profile, profile-evidence hash, and hashes for raw events, diff, tests, and review. Historical results lacking those fields remain retained but fail fairness validation.
- Consequence: The dashboard and reports show raw observations under `FAIRNESS UNVERIFIED` and make no causal Kerno-versus-baseline claim.

## ADR-016 — Live route failure is product evidence

- Date: 2026-07-19
- Status: accepted
- Decision: Authentication, capacity, usage-limit, and App Server failures are retained and displayed separately from deterministic replay. A requested model remains requested-unconfirmed without effective/reroute evidence.
- Consequence: A capacity failure cannot make the reliable replay appear live. The latest smoke completed, but still remains `requested-unconfirmed` without an effective/reroute event.

## ADR-017 — Artifact-bound comparisons and immutable attempts

- Date: 2026-07-20
- Status: accepted; closes the fairness gap in ADR-015
- Decision: Current benchmark runs use immutable pair IDs, auth-only temporary Codex profiles, task-manifest hashes, content hashes for events/diff/tests/review/receipt, and artifact-derived metrics. A pair/condition directory may never be overwritten; a retry requires a new pair ID.
- Consequence: Three context-controlled pairs and one separate routing pair now pass the mechanical fairness gate. The one-run-per-condition sample remains a case study, the failed Python pair remains visible, and one pre-fix overwritten timeout is disclosed because its raw files cannot be reconstructed.
