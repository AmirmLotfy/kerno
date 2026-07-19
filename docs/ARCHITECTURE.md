# Architecture

Kerno centers one deterministic `KernoService`. The indexer enrolls canonical roots, reads Git state with fixed arguments, filters ignored/unsafe content, hashes files, parses JS/TS and Python, and emits typed edges. SQLite stores immutable snapshots, capsules, memories, routes, outcomes, and append-only events.

The context engine extracts task features, scores exact/symbol/graph/test evidence, applies a token budget, explains inclusion and exclusion, and creates immutable child capsules only from verified artifacts. Memory is candidate by default; tests or explicit user confirmation can verify it. File, symbol, branch, worktree, and engine keys invalidate it conservatively. SQLite/WAL is the default service store; the self-contained plugin bundle uses a persistent JSON adapter behind the same `StateStore` contract to avoid native-addon failures in plugin caches.

Plugin Mode exposes this loop through a Codex skill and 12 STDIO MCP tools. Orchestrator Mode is separate: a local JSONL App Server client discovers the live model catalog, starts explicit phase turns, records accepted requests and runtime events, and sends verification to a new read-only thread.

The dashboard is read-only. It consumes loopback HTTP/SSE snapshots or an immutable replay using the same truth labels.
