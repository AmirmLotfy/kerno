# Threat model

## Assets and trust boundaries

Assets: source and secrets, Git metadata, Kerno state, verified memories, App Server events, benchmark evidence, plugin configuration, and the loopback bearer token.

Boundaries: repository enrollment; filesystem discovery; parsers; Git subprocesses; MCP input/output; hook input; SQLite/portable state; App Server JSONL; dashboard HTTP/SSE; export/delete; recorded artifacts.

## Adversaries and abuse cases

- A malicious repository author uses traversal, symlinks, oversized/binary files, hostile branch names, or generated paths to escape scope or exhaust resources.
- Source/test text contains prompt injection that attempts to change policy, approvals, routing, or tool behavior.
- A malformed MCP caller sends unknown fields, oversized strings, invalid IDs, deep graphs, or command-like input.
- A local process probes the loopback API or steals a bearer token from logs.
- Hooks leak command output or block/alter task completion.
- A benchmark artifact leaks credentials/private paths or represents requested routing as effective routing.
- A caller asserts that a test passed or a memory is verified without evidence.

## Controls

| Threat | Control | Verification |
|---|---|---|
| Path traversal / outside root | `realpath`, `lstat`, containment recheck, NUL/absolute rejection | security path suite |
| Symlink / TOCTOU | symlinks skipped by default; resolved paths checked before read | symlink escape tests |
| Ignored/generated/binary/large input | `.gitignore`, `.kernoignore`, fixed built-ins, binary detection, 1 MiB cap | indexer/security fixtures |
| Repository prompt injection | source delimited and labeled untrusted; content cannot set policy | malicious-content tests |
| Command injection | Git via fixed `execFile` arguments; MCP has no command fields; indexing executes no scripts | contract and hostile-input tests |
| Secret leakage | pattern redaction before persistence/output/export; checked artifacts sanitized; local path scan | redaction, secret scan |
| Forged evidence | only trusted internal execution may mark an artifact verified; caller annotations, exit codes, and unknown IDs cannot prove outcomes | evidence/outcome tests |
| Cross-branch stale memory | repository/worktree/branch/commit/file/symbol keys; conservative stale state | invalidation tests |
| Loopback access | `127.0.0.1`, ephemeral bearer token, strict origin/CORS, no token logs | HTTP security tests |
| Hook abuse | allowlisted metadata, short timeout, fail open, opt-in, no source mutation | hook tests and documented disable path |
| App Server privilege widening | local STDIO and caller-provided sandbox only; Kerno never widens approvals | adapter tests |
| Misleading model/metric UI | separate recommended/requested/effective, reroute overrides, null stays unavailable | contract/UI tests |
| Dangerous deletion | only Kerno-owned verified directory, explicit `--yes`, root/home refusal | CLI security tests |

## Data lifecycle

No source upload or telemetry is enabled. State remains under the selected local data directory. `data-export` emits redacted JSON. `data-delete --yes` deletes only a verified Kerno-owned directory; plugin uninstall preserves data. Recorded benchmark exports are sanitized of home/workspace/temp paths and retain limitations.

## Residual risk

Pattern redaction cannot prove every secret is absent. Local SQLite/JSON state is permission-restricted but not encrypted at rest. Parser heuristics can omit or misclassify relationships. File-system state can change between checks despite containment defenses. Codex may independently load legitimate repository instructions such as `AGENTS.md`; Kerno prevents retrieved excerpts from gaining new authority but cannot alter Codex’s native instruction hierarchy. Live model identity may remain requested-unconfirmed when the runtime emits no effective-model event.

## Security release gate

Run `npm run test:security`, `npm run audit:secrets`, `npm audit --audit-level=high`, plugin/MCP smoke tests, and the clean judge path. Any path escape, credential, arbitrary-command, token/origin, or evidence-forgery finding blocks release.
