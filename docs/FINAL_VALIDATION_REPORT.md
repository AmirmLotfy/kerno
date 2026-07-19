# Final validation report

Validation date: July 19, 2026. Status: **local product and clean-clone gates pass; submission-blocking evidence remains**.

## Validated build

- Code/evidence commit: `42da0212064adda5dd40b1176be5f542395a3b7c` (`feat: complete judge-ready Kerno evidence experience`).
- Environment: macOS arm64, Node 22.13.1, npm 10.9.2, Codex CLI 0.145.0-alpha.18.
- Plugin: `kerno@personal` version `0.1.0+codex.20260719083445`, installed from the repository-local marketplace.
- The installed alpha CLI version is not treated as public API evidence; Kerno uses documented stable App Server methods and generated schemas.

## Passed gates

- Formatting hygiene, ESLint, strict TypeScript.
- 16 Vitest files / 33 tests: unit, schema, storage/migration/integrity, parser/indexer, context, memory/invalidation, MCP, CLI, hooks/security, HTTP/SSE, orchestrator adapter, Python fixture, and complete operational slice.
- 2 Playwright tests: all 16 product states/six views at desktop and a 375×812 responsive/overflow flow.
- All npm workspace builds; dashboard production bundle ~214.35 kB JS / ~67.01 kB gzip and ~14.73 kB CSS / ~3.77 kB gzip.
- Plugin creator validator; cache-busted plugin; 12-tool bundled MCP smoke with fixture indexing through portable persistence.
- CLI doctor: Git, SQLite schema version 2/integrity, manifest, and MCP bundle healthy.
- Deterministic judge replay, clean migration, canonical failure → expansion → passing test → invalidation flow.
- Secret scan; 320 installed top-level/transitive packages passed permissive-license policy; `npm audit --audit-level=high` found zero vulnerabilities.
- Actual non-hardlinked fresh macOS clone of `42da021`: `npm ci`, doctor, judge, tests, builds, audits, and E2E all passed.

## Artifact hashes

- Plugin archive `dist/kerno-codex-plugin-0.1.0.tgz`: `96f5279440c78a04fc485cc2c5f923731ed6f86758fd29419ce920f8b48c94ca`.
- Canonical replay JSON: `d9029fa066139db1ba53689ff6fbf16a372664668b960afdddd930fb6ed59182`.
- Plugin screenshot: `dd5e31478028ce0b0d9c4d994acd8ca19ea14e0d6ae738beca1fa4c4c920f60e`.
- Benchmark report JSON: `939a6bb1f88d965568453bd203919f9453c6ceb1777cc7756e466a43b09b5a03`.
- Plain-Codex run JSON: `21b0d4a7277600bf2a5dbe0205dda3e2ee0db2773adf14b4e2f120d12fef8702`.
- Kerno run JSON: `2c2dd2be171623f251ea4cacffb4ab547bd24219f614abc58db8c81bcced2d01`.

## Canonical proof

`relaycart-ts` indexes seven files and 46 symbols; unchanged re-index reparses zero files. The initial capsule contains five items / 917 estimated tokens. A genuine failing concurrency/restart test persists evidence and adds one 501-token transaction-boundary child item. The pinned solution passes three assertions and preserves the public event shape. Re-indexing the changed handler marks the original capsule stale from its source hash.

## Real App Server evidence

- Live catalog discovery returned `gpt-5.6-sol`; a completed read-only exploration turn recorded tool and token-usage events. No effective-model/reroute event appeared, so it remains requested-unconfirmed.
- A real context-controlled `refund-debug` pair used the same task/generated commit/permissions/requested model/effort. Both conditions passed tests and remain `partial` because structured independent review evidence was failed/unavailable.
- Plain vs Kerno: 91,587 vs 134,979 observed tokens; 6 vs 2 files; 2 vs 0 repeated reads; 11 vs 18 tools; 77,242 vs 119,785 ms; 16 vs 16 changed lines. Kerno is worse on tokens/tools/latency in this pair. No cost or generalized benefit is claimed.

## Remaining blockers

1. Only one of three required paired benchmark tasks is recorded; the routing experiment is incomplete.
2. No retained Kerno run has a successful parseable fresh-review result.
3. Linux CI/clean-clone result has not run remotely; Windows is unverified and not claimed.
4. The public repository URL, public `<3:00` YouTube URL, and signed-out verification do not exist yet.
5. The primary `/feedback` Session ID must be captured from this root implementation task.
6. Entrant/team eligibility and exact authenticated Devpost form labels require human/authenticated confirmation.
7. No Devpost write has been performed or authorized.

Kerno is operational and judge-demonstrable, but this report does **not** call it submission-ready.
