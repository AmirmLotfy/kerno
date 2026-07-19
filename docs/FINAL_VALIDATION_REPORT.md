# Final validation report

Status: local P0 implementation gate passed; external submission gates remain.

Recorded local environment: macOS, Node 22.13.1, npm 10.9.2, Codex CLI 0.145.0-alpha.18. The installed alpha version is not treated as general API evidence; generated schemas and stable documented methods define the adapter.

Required final entries:

- Git implementation commits: `fcaf60e535fb70a22f0dd4dcdd6f70b61851415b` (`feat: build Kerno context control plane`), `532eb7c` (`feat: complete operational Kerno P0 slice`), and `3f8c5b8` (`fix: preserve App Server timeout evidence`).
- Working tree before the initial commit: all 108 project files are new; no pre-existing source was present.
- Node 22/24 CI: workflow configured; pending remote CI.
- macOS local clean-room-equivalent gate: passed on Node 22.13.1.
- Separate fresh macOS clone: pending release URL.
- Linux clean clone: pending.
- TypeScript typecheck and ESLint: passed.
- Vitest: 14 files, 30 tests passed.
- Playwright dashboard E2E: 1 test passed.
- Plugin validator: passed for `0.1.0+codex.20260719074757`; `kerno@personal` is installed and enabled from the repository marketplace.
- Bundled MCP smoke: 12 tools exposed and fixture indexed through the portable persistent store.
- Plugin archive SHA-256: `16ec46f773df518c6ffa2c4367c1542fb2b992e8afc2873496c51e120e8cb69a`.
- Canonical replay file SHA-256: `4c73af4275f2972d27d810143aeb968d47c2880bd9c9fdbabe86b552c16ea7f9`.
- Canonical replay internal artifact hash: `b722f8a59aea8dfa12a5346f07692533a7b43ab7b12652d9ad766a054cc0f466`.
- Plugin screenshot SHA-256: `222c1413d0619f2a0176118f49f8f4ad1fc738d351f65b65549e993dc185abf0`.
- Canonical proof: branch `main`; 5 initial items / 917 estimated tokens; genuine failing concurrency/restart tests; one 501-token transaction-boundary child item; 3 pinned assertions pass after the solution; original capsule becomes stale after the handler hash changes.
- Live App Server artifact: `benchmarks/recorded-results/app-server-live-smoke.json` proves live catalog discovery and a completed read-only `gpt-5.6-sol` exploration turn with tool and token-usage events. The model remains `requested-unconfirmed` because no effective-model or reroute event was emitted.
- Live artifact SHA-256: `9b8944c47f92feb36992d498728a4b3a0a1b8860fd7f44d8b4d1318cc4b050c3`.
- A disposable writable live implementation benchmark reached an accepted turn but exceeded the configured five-minute completion timeout before independent review; no successful live implementation/review artifact is claimed. The adapter now interrupts timed-out accepted turns and returns structured `timeout` evidence, covered by a hanging-server regression test.
- Full local type/lint/unit/integration/contract/security/E2E/package/judge gate: passed.
- Repository/video URLs and signed-out verification: pending.
- Primary `/feedback` Session ID: pending.

Known limitation: the deterministic judge replay contains no baseline Codex run and does not claim observed tokens, file reads, tool calls, requested/effective model, or independent Codex review.
