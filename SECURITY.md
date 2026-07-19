# Security policy

Kerno is local-first and does not upload repository source or telemetry by default. Report vulnerabilities privately to the repository owner before public disclosure.

Security-sensitive defaults: real-path root enrollment, symlink exclusion, fixed-argument Git invocation, `.gitignore` and `.kernoignore`, 1 MiB file cap, binary exclusion, secret redaction, strict Zod inputs, no MCP command fields, loopback-only HTTP with an ephemeral bearer token and strict origins, advisory fail-open hooks, and no sandbox widening.

Use `npm run test:security` before reporting a fix. See `docs/THREAT_MODEL.md` for assets, attackers, controls, and residual risk.
