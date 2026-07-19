# Threat model

## Assets and boundaries

Assets are repository source, secrets, Git metadata, Kerno state, model/runtime events, benchmark artifacts, and the loopback bearer token. Boundaries exist at repository enrollment, parsers, Git subprocesses, MCP input/output, hooks, SQLite, App Server STDIO, HTTP/SSE, and export/delete commands.

## Threats

Malicious paths, symlink/TOCTOU escapes, prompt injection in source or test output, secret leakage, hostile branch names, malformed/oversized MCP input, arbitrary command execution, hook exfiltration, unauthorized loopback access, and misleading model/metric states.

## Controls

Kerno realpaths enrolled roots, skips symlinks, rejects traversal/absolute/NUL paths, caps files and inputs, filters ignored/binary/generated content, invokes Git with fixed arguments, executes no repository scripts while indexing, redacts secret-like values before persistence/output, binds HTTP to loopback with a bearer token and origin restrictions, uses local STDIO for App Server/MCP, never widens permissions, and labels repository/test content as untrusted evidence.

Hooks record only allowlisted metadata, time out quickly, fail open, and can be disabled. Uninstall preserves data; CLI export and `data-delete --yes` are explicit.

## Residual risk

Pattern redaction is not complete secret detection. Parser bugs can misclassify relationships. Codex may independently load legitimate repository instructions such as `AGENTS.md`; Kerno prevents retrieved excerpts from gaining additional authority but cannot remove Codex’s native instruction hierarchy.
