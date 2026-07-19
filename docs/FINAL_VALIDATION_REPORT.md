# Final validation report

Validation date: July 19, 2026. Status: **local product and clean-clone gates pass; submission-blocking evidence remains**.

## Validated build

- Code/evidence commit: `1b6955edc68b6092900cb3651c191a907764683c` (`fix: make refund proof durable under independent review`).
- Environment: macOS arm64, Node 22.13.1, npm 10.9.2, Codex CLI 0.145.0-alpha.18.
- Plugin: `kerno@personal` version `0.1.0+codex.20260719085859`, installed from the repository-local marketplace.
- The installed alpha CLI version is not treated as public API evidence; Kerno uses documented stable App Server methods and generated schemas.

## Passed gates

- Formatting hygiene, ESLint, strict TypeScript.
- 16 Vitest files / 33 tests: unit, schema, storage/migration/integrity, parser/indexer, context, memory/invalidation, MCP, CLI, hooks/security, HTTP/SSE, orchestrator adapter, Python fixture, and complete operational slice.
- 2 Playwright tests: all 16 product states/six views at desktop and a 375×812 responsive/overflow flow.
- All npm workspace builds; dashboard production bundle ~214.39 kB JS / ~67.01 kB gzip and ~14.73 kB CSS / ~3.77 kB gzip.
- Plugin creator validator; cache-busted plugin; 12-tool bundled MCP smoke with fixture indexing through portable persistence.
- CLI doctor: Git, SQLite schema version 2/integrity, manifest, and MCP bundle healthy.
- Deterministic judge replay, clean migration, canonical failure → expansion → passing test → invalidation flow.
- Secret scan; 320 installed top-level/transitive packages passed permissive-license policy; `npm audit --audit-level=high` found zero vulnerabilities.
- Actual non-hardlinked fresh macOS clone of `1b6955e`: `npm ci`, doctor, judge, tests, builds, audits, and E2E all passed.

## Artifact hashes

- Plugin archive `dist/kerno-codex-plugin-0.1.0.tgz`: `046d80b0dd61e94b52a497d6d9eecf7f0f36fb157ab268059d64a2c1c6ee0266`.
- Canonical replay JSON: `6782e19f808ad6c1cc155a36730ea48b9b3ddec92345066bc6c16dd3ccbd1747`.
- Plugin screenshot: `0d4cbf41c9a2aaaf06d9043f8607c4d5c8d0b0f8cac66cfd60f84599d48a7cea`.
- Benchmark report JSON: `2e2de79259df1d6e9c417b8734061ae8cbe57db1c1cd481ca290fa63fa0aca15`.
- Latest Plain-Codex run JSON: `85af967ce0e0d0585e953172e6cd5e3f2edd181af3b0313aeab03992f045fa94`.
- Latest Kerno run JSON: `6169cbdf4071e7afb533ceea7dbee4e42261daf69137478195c92e3e6abd00c2`.

## Canonical proof

`relaycart-ts` indexes seven files and 47 symbols; unchanged re-index reparses zero files. The initial capsule contains five items / 1,094 estimated tokens. A genuine failing concurrency/restart/stale-marker test persists evidence and adds one 327-token transaction-boundary child item. The pinned solution passes three tests, preserves the public event shape, and makes the durable ledger’s unique event operation authoritative. Re-indexing the changed handler marks the original capsule stale from its source hash.

## Real App Server evidence

- Live catalog discovery returned `gpt-5.6-sol`; a completed read-only exploration turn recorded tool and token-usage events. No effective-model/reroute event appeared, so it remains requested-unconfirmed.
- The latest real context-controlled `refund-debug` pair used the same task/generated commit/permissions/requested model/effort. Both conditions passed tests and fresh independent review with zero findings. Six prior partial runs are retained; their reviews drove corrections from process-local state to durable ledger uniqueness and from an authoritative marker to a repairable cache.
- Plain vs Kerno: 93,670 vs 95,383 observed tokens; 6 vs 2 files; 2 vs 0 repeated reads; 12 vs 11 tools; 71,922 vs 107,289 ms; 16 vs 16 changed lines; 0 vs 0 reviewer findings. Kerno is worse on tokens/latency and better on observed file breadth/repeated reads/tool calls in this pair. No cost or generalized benefit is claimed.

## Remaining blockers

1. Only one of three required paired benchmark tasks is recorded; the routing experiment is incomplete.
2. Linux CI/clean-clone result has not run remotely; Windows is unverified and not claimed.
3. The public repository URL, public `<3:00` YouTube URL, and signed-out verification do not exist yet.
4. The primary `/feedback` Session ID must be captured from this root implementation task.
5. Entrant/team eligibility and exact authenticated Devpost form labels require human/authenticated confirmation.
6. No Devpost write has been performed or authorized.

Kerno is operational and judge-demonstrable, but this report does **not** call it submission-ready.
