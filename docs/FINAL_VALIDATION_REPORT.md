# Final validation report

Status: local P0 implementation gate passed; external submission gates remain.

Recorded local environment: macOS, Node 22.13.1, npm 10.9.2, Codex CLI 0.145.0-alpha.18. The installed alpha version is not treated as general API evidence; generated schemas and stable documented methods define the adapter.

Required final entries:

- Git implementation commit: `fcaf60e535fb70a22f0dd4dcdd6f70b61851415b` (`feat: build Kerno context control plane`).
- Working tree before the initial commit: all 108 project files are new; no pre-existing source was present.
- Node 22/24 CI: workflow configured; pending remote CI.
- macOS local clean-room-equivalent gate: passed on Node 22.13.1.
- Separate fresh macOS clone: pending release URL.
- Linux clean clone: pending.
- TypeScript typecheck and ESLint: passed.
- Vitest: 10 files, 19 tests passed.
- Playwright dashboard E2E: 1 test passed.
- Plugin validator: passed for `0.1.0+codex.20260719022604`.
- Bundled MCP smoke: 12 tools exposed and fixture indexed through the portable persistent store.
- Plugin archive SHA-256: `173558c2a102d57b55afc618c6ff3c3a0ecc3614f3f10500fa224cc822981837`.
- Canonical replay file SHA-256: `f7700b04e318e02c676ffa83ee1973976c598e42a866afc1be68d734d28d2803`.
- Canonical replay internal artifact hash: `35dffd4f98bccaaa3a3c8a7756b2820923f8302791255df464d6eee0e8735ab3`.
- Plugin screenshot SHA-256: `5a507f815c1785d505cb2aeec76a65c2e59a2b109ca0c8192b6355a6bcd1dacc`.
- Canonical proof: branch `main` at fixture commit `63a9eb695127797e707dbcd0bcc8fadab262fb2b`; 4 initial items / 623 estimated tokens; failing test; transaction-only child capsule; passing test; original capsule stale after handler change.
- Live App Server artifact: `benchmarks/recorded-results/app-server-live-smoke.json` proves live catalog discovery and an accepted `gpt-5.6-sol` request. Model execution failed with the observed `usageLimitExceeded` / out-of-credits error; no successful model outcome, token usage, or effective model is claimed.
- Live artifact SHA-256: `cb9bf17ac7fa2ba5fe28e22ccbdfc13691255219cee4253101ea1a8bcf4189d4`.
- Full local type/lint/unit/integration/contract/security/E2E/package/judge gate: passed.
- Repository/video URLs and signed-out verification: pending.
- Primary `/feedback` Session ID: pending.

Known limitation: the deterministic judge replay contains no baseline Codex run and does not claim observed tokens, file reads, tool calls, requested/effective model, or independent Codex review.
