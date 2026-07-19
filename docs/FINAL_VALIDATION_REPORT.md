# Final validation report

Validation date: July 19, 2026. Status: **local product and clean-clone gates pass; submission-blocking evidence remains**.

## Validated build

- Validated base commit: `89d51fbff416e498b0f4a54960f411e47ba101f5`; the repository-wide brand change was validated in the working tree before its local commit.
- Environment: macOS arm64, Node 22.13.1, npm 10.9.2, Codex CLI 0.145.0-alpha.18.
- Plugin: `kerno@personal` version `0.1.0+codex.20260719085859`, installed from the repository-local marketplace.
- The installed alpha CLI version is not treated as public API evidence; Kerno uses documented stable App Server methods and generated schemas.

## Passed gates

- Formatting hygiene, ESLint, strict TypeScript.
- 17 Vitest files / 36 tests: unit, brand contract, schema, storage/migration/integrity, parser/indexer, context, memory/invalidation, MCP, CLI, hooks/security, HTTP/SSE, orchestrator adapter, Python fixture, and complete operational slice.
- 4 Playwright tests: all 16 product states/six views, 375×812 responsive/overflow, light/dark theme control, image loading, 44 px targets, keyboard focus, and non-color truth/series labels.
- All npm workspace builds; dashboard production bundle 216.64 kB JS / 67.67 kB gzip and 26.95 kB CSS / 5.49 kB gzip.
- Brand asset generation and mirror validation; 20 required WCAG contrast pairs; SVG base-icon restrictions; favicon/launcher/social/Open Graph/Devpost dimensions; repository-wide obsolete-color and broken-reference audit.
- Plugin creator validator; cache-busted plugin; 12-tool bundled MCP smoke with fixture indexing through portable persistence.
- CLI doctor: Git, SQLite schema version 2/integrity, manifest, and MCP bundle healthy.
- Deterministic judge replay, clean migration, canonical failure → expansion → passing test → invalidation flow.
- Secret scan; 320 installed top-level/transitive packages passed permissive-license policy; `npm audit --audit-level=high` found zero vulnerabilities.
- The prior non-hardlinked fresh macOS clone of the base product passed. The current brand change passed the repository’s clean-room-equivalent local gate; a separate fresh clone of the final brand commit remains required before release.

## Artifact hashes

- Plugin archive `dist/kerno-codex-plugin-0.1.0.tgz`: `67b641fef47fd84ccbee2002e8f90dccdedce28da1f10f99a7b3fd6409ccceb4`.
- Canonical replay JSON: `b7dba4eea6b2eac4adc441a94770c4fc28b40c6e9c2b68fae6262685fe29a885`.
- Canonical brand tokens: `ed9429ce10fc507ff9718fd5335e9b96083c7f504367cbe20689174c20a21a13`.
- Context Core primary SVG: `d7f3822e5862b53f701537ef4712c80f4a9e6829772b80ac17c420988657f1a3`.
- Light plugin screenshot: `195aaea09d19537803fd9980d41c9da164d045700e19ef9fc33acfebfbd75990`.
- Dark plugin screenshot: `2672af9bad89ce224539922e29b04fd61f317608cab0f657c21cd8b4d929de36`.
- Open Graph PNG: `d5b37ca72a3cbc70d0fb451a99c33c46c24336c8ad7be718bb7c4fb8bfc8d489`.
- Devpost 3:2 PNG: `f71073b8c2b9c8873786d77b5db57fb96f7c5e5c5f6680fd6a9deaa00a63fc57`.
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
2. A separate fresh clone of the final brand commit and remote Linux CI have not run; Windows is unverified and not claimed.
3. The public repository URL, public `<3:00` YouTube URL, and signed-out verification do not exist yet.
4. The primary `/feedback` Session ID must be captured from this root implementation task.
5. Entrant/team eligibility and exact authenticated Devpost form labels require human/authenticated confirmation.
6. No Devpost write has been performed or authorized.

Kerno is operational and judge-demonstrable, but this report does **not** call it submission-ready.
