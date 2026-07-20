# Final validation report

Validation refreshed: **July 19, 2026 at 5:32 PM PDT / July 20, 2026 at 3:32 AM Africa/Cairo / July 20, 2026 at 12:32 AM UTC**.

## 1. Executive readiness result

**PRODUCT RELEASE CANDIDATE: PASS. HACKATHON SUBMISSION: NOT READY.** The code, plugin, MCP server, dashboard, deterministic judge path, signed-in App Server path, three-task evaluation, documentation, security gates, and fresh-clone validation pass. The remaining blockers are external: a public English-audio YouTube video shorter than three minutes, the primary root-task `/feedback` Session ID, authenticated human form choices, and entrant/team eligibility confirmation.

No Devpost field, package, release, or video was created or published in this pass. The already-authorized public GitHub repository was updated. `https://itkerno.site` is the canonical public replay URL; current source and the local judge flow remain the authoritative reproduction paths.

Custom-domain deployment validation completed July 20, 2026 at 5:09 AM Africa/Cairo. Vercel deployment `dpl_2fj2a4hdYQpGqaG4FvZUPtzZK8Ri` is `Ready`; the apex returns HTTP 200, `www` returns a permanent HTTP 308 redirect to the apex, canonical/Open Graph metadata uses `https://itkerno.site`, and the public benchmark artifact contains the current 16 retained runs. No Devpost field was edited.

## 2. Exact commit tested

- Release-candidate product commit: `1f71d4d0dbb0776313ef1b91d6ed6507cc83a790`.
- Branch: `main`.
- Clean-room method: local `git clone --no-hardlinks` into `/tmp/kerno-rc-clean.Q6xEy8/Kerno`.
- The final documentation commit may differ only by this report, quickstart validation record, and release metadata. Its lightweight gates are rerun separately and the final hash is reported to the user.

## 3. Environment tested

- macOS arm64.
- Node `v22.13.1`; npm `10.9.2`; Git `2.50.1 (Apple Git-155)`.
- Codex CLI `0.145.0-alpha.18`.
- Kerno `0.1.0`; plugin manifest cachebuster `0.1.0+codex.20260720002200`.
- CI targets macOS/Linux on Node 22 and 24. Linux was not exercised locally; Windows is not claimed.

## 4. Hackathon compliance matrix

| Requirement | State | Evidence / blocker |
|---|---|---|
| Developer Tools category | Pass | Positioning and field draft use Developer Tools |
| Working project | Pass | Index → capsule → failing test → targeted expansion → pass → review → invalidation is automated and replayable |
| Meaningful Codex/GPT-5.6 use | Pass, Session ID pending | Root implementation collaboration and live GPT-5.6 phase requests are documented; runtime truth labels remain conservative |
| Public `<3:00` YouTube video with English audio | **Blocked externally** | Script, shot list, screenshots, and reset path exist; no video URL |
| Repository and judge access | Pass | `https://github.com/AmirmLotfy/kerno` and `https://itkerno.site` |
| README/setup/license | Pass | Setup, sample fixtures, no-build judge path, collaboration narrative, and Apache-2.0 license |
| Primary `/feedback` Session ID | **Blocked externally** | User must run `/feedback` in this root implementation task |
| Plugin installation/platform/test path | Pass | Marketplace install, packaged bundle, smoke, quickstart, and replay/live paths |
| Authenticated submission fields | **Blocked on human action** | Drafts are complete; country/submitter/video/Session ID need human confirmation and authorized entry |
| Eligibility/team authority | **Blocked on human confirmation** | Age, sanctions, conflicts, ownership, and representative facts are not machine-verifiable |

The controlling deadline remains Tuesday, July 21, 2026 at 5:00 PM PDT / Wednesday, July 22 at 3:00 AM Africa/Cairo.

## 5. Judging-criteria evidence matrix

| Criterion | Evidence | Residual risk |
|---|---|---|
| Technological Implementation | Strict contracts/storage/indexer/MCP/plugin/App Server code; 66 deterministic tests; 13-tool bundle; real catalog, route, usage, tests, and review artifacts | Effective model identity is absent from runtime events and is labeled `requested-unconfirmed` |
| Design | Warm Context Core identity; complete product-state tour; responsive light/dark dashboard; seven browser and 20 contrast checks | Final video still needs to deliver the experience succinctly |
| Potential Impact | Specific repository-truth problem; three fairness-valid task pairs; correctness and unfavorable result shown first | One run per condition is a case study, not statistical proof |
| Quality of the Idea | Falsifiable capsules, provenance, progressive expansion, conservative invalidation, phase routing, independent verification | Outcome utility learning remains intentionally neutral in P0 |

## 6. Functional validation

- Clean install, doctor, schema-v2 SQLite integrity, migrations/WAL/leases, and all workspace builds pass.
- The seven-file/48-symbol TypeScript fixture reindexes unchanged code with zero reparses.
- A 1,094-estimated-token initial capsule stays inside a 2,500-token budget and exposes provenance, reasons, scores, freshness, confidence, exclusions, and invalidation keys.
- A genuine failed test creates one targeted 327-estimated-token transaction-contract child item; three pinned assertions then pass.
- A handler hash change makes the original capsule stale.
- JS/TS, Python, and lower-confidence generic parsing; memory states; branch/commit/file/symbol/worktree invalidation; CLI; HTTP/SSE; MCP; App Server; reviewer; and comparison paths are covered.

## 7. Clean-room validation

**Passed** from commit `1f71d4d0dbb0776313ef1b91d6ed6507cc83a790` in a fresh non-hardlinked clone.

The clone ran `npm ci`, `npm run doctor`, `npm run judge -- --check`, 66 deterministic tests, all workspace builds, seven E2E tests, three focused accessibility tests, plugin packaging/smoke, replay preflight, brand/contrast/secret/license/link audits, and `npm audit --audit-level=high`. It installed 354 packages, found zero vulnerabilities, and required no source edit or manual repair.

Generated timestamped replay/report files changed in the clone by design and were not copied back.

## 8. Plugin validation

- Installed and enabled as `kerno@personal`, version `0.1.0+codex.20260720002200`.
- Manifest, Context skill, cache-portable MCP executable/config, optional reviewed hooks, license, warm Context Core assets, starter prompts, and screenshots are packaged.
- Bundled MCP exposes 13 tools and completes index → fresh status → task → capsule.
- The real Codex plugin surface is captured at `docs/assets/submission/kerno-real-plugin-codex.png`.
- The plugin-creator Python validator could not run because host Python lacks PyYAML. No dependency was installed. Package inspection, successful Codex reinstall/listing, manifest tests, and MCP smoke are the substitute evidence.

Clean-clone SHA-256:

- Plugin archive: `187ec2f1e8d18c99163be49a729690fdedbbe9910579c8b6fd55469e8b008679`.
- Generated replay: `aac898d67d0658d7bda8039df70e23313ffaae7aba79aa46687b3bb89e4b7489`.
- Retained runtime evidence: `2b28c04268532b792f267cc7e694b13e98f76c9d3c0ea792289766dcd9f66b74`.
- Generated benchmark report: `4fcb09185b2421c3a10d397a63a8174fa51939e77de240d8d57ea0b353c3327b`.

## 9. MCP validation

- Strict schemas reject unknown, oversized, cross-repository, stale, and malformed inputs.
- Repository containment, symlink/hardlink/ownership checks, ignore rules, redaction, and output bounds are tested.
- No MCP tool accepts a shell command or writes repository source.
- Caller prose/exit codes cannot promote verified memory or outcomes.
- `kerno_compare_runs` consumes imported artifact-derived run entities and returns fairness/evidence-linked metrics; its integration contract passes.

## 10. Model-routing validation

- Live `model/list` discovered four entries.
- Latest smoke requested `gpt-5.6-sol/low`, completed, and recorded 33,859 observed tokens.
- The full-system Kerno run requested `gpt-5.6-sol/low` for implementation and `gpt-5.6-sol/ultra` for final verification; both completed, tests passed, and fresh review passed.
- No effective-model or reroute event arrived. Kerno displays `Requested — not independently confirmed`; no simulated or inferred effective model is shown.
- Plugin Mode recommends/manual-falls back. Only Orchestrator Mode starts explicit App Server phase turns.

## 11. Benchmark integrity

- Sixteen real runs are retained: eight strengthened artifact-derived runs and eight legacy-unverified attempts.
- Three current context-controlled pairs pass the mechanical fairness gate. Two tasks pass in both conditions; `queue-retry-refactor` fails in both and remains visible with one reviewer finding per condition.
- One separate full-system routing pair passes tests and review in both conditions.
- Current artifacts bind task manifest, auth-only profile evidence, events, diff, tests, review, receipt, and derived metrics by hash.
- Missing reads/files/time-to-valid-patch/unnecessary-line metrics remain unavailable, not zero.
- One timed-out routing attempt was overwritten before immutable-attempt enforcement existed. Its raw files cannot be recovered, so no metrics from it are reported. Future overwrites are rejected before capacity is consumed.
- No exact cost, percentage headline, or generalized productivity claim is made.

## 12. Security results

No unresolved critical or high-severity finding remains. Tests cover hostile paths, symlink/hardlink escape, ignored/secret files, malformed and oversized MCP input, caller-forged evidence, malicious repository instructions, log/export redaction, state ownership, loopback token/origin controls, hook timeouts, and fixed command invocation. Secret scan passed.

Residual risks: pattern redaction cannot recognize every secret; parsers are heuristic; same-UID filesystem TOCTOU cannot be eliminated; local state is permission-restricted but not encrypted at rest.

## 13. Privacy results

Source and telemetry stay local by default. There is no hosted backend, vector service, source upload, or opt-out telemetry. Repository excerpts are bounded/untrusted; safe exports redact paths/secrets and omit source/output. HTTP binds to loopback with an ephemeral bearer token. Explicit export and ownership-checked deletion are documented.

## 14. Dependency and license results

- `npm audit --audit-level=high`: zero vulnerabilities.
- 320 installed top-level/transitive packages pass the license policy.
- Root/plugin licenses are byte-identical Apache-2.0.
- Fixtures and brand assets are original; third-party notices are present.

## 15. Documentation results

README, LICENSE, SECURITY, CONTRIBUTING, architecture, decisions, threat model, benchmark, judge quickstart, Codex collaboration, compliance, demo, Devpost draft, brand system/audit, P0 gap audit, and this report are complete and cross-linked. Exact authenticated fields 27945–27951 remain recorded without modifying Devpost.

## 16. Demo rehearsal result

- `demo:reset`, `demo:preflight`, and real screenshot capture pass.
- Screens show Home, capsule/Why included, full-system phase requests, live smoke, test expansion, invalidation, and comparison.
- Script targets 2:55 maximum and keeps deterministic replay, real App Server evidence, estimates, unavailable values, and requested/effective model states distinct.
- No public video or signed-out video verification exists yet.

## 17. Remaining limitations

- Effective model identity remains `requested-unconfirmed` because the runtime emitted no effective/reroute event.
- The hosted dashboard is replay-only; local repository intelligence and orchestration do not upload source.
- Plugin process-scoped portable JSON and daemon SQLite have different durability boundaries.
- Plugin Mode does not accept caller-asserted test output as trusted evidence; trusted expansion is demonstrated through the local evaluation/orchestration boundary.
- One benchmark run per condition/task is insufficient for statistical generalization.
- Outcome-driven prior usefulness stays neutral; parser relationships are not compiler-complete semantic analysis.
- Linux is CI-configured but locally unverified; Windows is not claimed.

## 18. Remaining non-blocking issues

- Plugin-creator validation requires unavailable PyYAML.
- `prebuild-install` emits a transitive deprecation warning; native SQLite succeeds on the tested runtime.
- Formal manual screen-reader testing and more language parsers remain future work.

## 19. External placeholders still required

- `[REQUIRED PUBLIC YOUTUBE URL UNDER 3:00]`
- `[REQUIRED PRIMARY /feedback SESSION ID]`
- `[REQUIRED AUTHENTICATED DEVPOST FIELD CHECK]`
- `[REQUIRED ENTRANT/TEAM ELIGIBILITY CONFIRMATION]`

Complete URLs: `https://github.com/AmirmLotfy/kerno` and `https://itkerno.site`.

## 20. Final reproduction commands

```bash
npm ci
npm run doctor
npm run judge

npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:a11y
npm run package:plugin
npm run plugin:smoke
npm run demo:preflight
npm run audit:brand
npm run audit:contrast
npm run audit:secrets
npm run audit:licenses
npm run audit:links
npm audit --audit-level=high
```

Signed-in live evidence:

```bash
npm run test:app-server:live
npm run judge:live
```

## 21. READY or NOT READY decision

**NOT READY FOR DEVPOST SUBMISSION.** Kerno is an internally passing release candidate with no known blocking product, evaluation, security, documentation, or local judge-path defect. Submission remains blocked by the required public video, primary `/feedback` Session ID, authenticated human form choices, and eligibility/team confirmation. The stale-but-working Vercel replay is not a rules blocker, but the current deployment should be promoted before relying on its comparison scene. Do not submit until the four required gates pass.
