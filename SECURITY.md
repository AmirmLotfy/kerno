# Security policy

Kerno is local-first and uploads neither repository source nor telemetry by default. Please report suspected vulnerabilities privately to the repository owner before public disclosure. No public security contact URL is claimed until the repository is published.

## Supported security surface

The current P0 protects the local indexer, SQLite/portable state, STDIO MCP boundary, App Server adapter, advisory hooks, loopback HTTP/SSE API, recorded artifacts, and data export/delete commands. Run `npm run test:security`, `npm run audit:secrets`, and `npm audit --audit-level=high` before reporting or releasing a fix.

## Defaults

- Canonical real-path enrollment and repository-root containment.
- Symlink, binary, generated-directory, and file-size exclusion.
- `.gitignore` plus `.kernoignore` handling.
- Fixed-argument Git invocation; no repository scripts during indexing.
- Strict Zod inputs, unknown-field rejection, length/output/depth bounds.
- Secret redaction before storage, MCP output, logs, and checked replay artifacts.
- Repository and test text labeled as untrusted evidence.
- Loopback-only HTTP, ephemeral bearer token, strict origins, no token logging.
- Advisory hooks with short timeouts, fail-open behavior, and no source writes.
- App Server local STDIO; no sandbox or approval widening.
- Explicit export and guarded data deletion; telemetry remains opt-in and unimplemented.

## Responsible handling

Include the affected version, reproduction steps, impact, and any suggested mitigation. Do not include live credentials or private repository source in reports. Kerno does not promise that pattern-based redaction detects every secret; rotate any credential that may have entered a log.

See [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) for boundaries, abuse cases, controls, verification, and residual risk.
