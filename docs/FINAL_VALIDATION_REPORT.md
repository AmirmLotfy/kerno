# Final validation report

Validation refreshed: **July 19, 2026 at 3:20 PM PDT / July 20, 2026 at 1:20 AM Africa/Cairo / July 19, 2026 at 10:20 PM UTC**.

## 1. Executive readiness result

**NOT READY FOR SUBMISSION.** The local service slice, plugin index/capsule path, MCP surface, dashboard, security controls, live App Server request, deterministic replay, and current engineering gates pass. Submission readiness remains blocked by the missing trusted-artifact handoff for Plugin Mode, an unreachable public compare-runs workflow, an incomplete three-task benchmark matrix with zero fairness-valid pairs, absence of an effective-model/reroute event, and required video/Session-ID/form/eligibility evidence.

No Devpost project was registered, created, edited, or submitted. The user explicitly authorized a public GitHub repository and Vercel judge deployment; those are live. No package, release, tag, video, or Devpost field was published.

## 2. Exact commit tested

- Product candidate commit: `5909062714b8bc38090571609bf9f9cf725a357f`.
- Branch: `main`.
- Clean-room method: local `git clone --no-hardlinks` into an isolated temporary directory.
- This report is a documentation-only follow-up to the tested product commit; no product code changed after the isolated run.

## 3. Environment tested

- macOS arm64.
- Node `v22.13.1`; npm `10.9.2`; Git `2.50.1 (Apple Git-155)`.
- Codex CLI `0.145.0-alpha.18`.
- Kerno `0.1.0`; local plugin installed from the repository marketplace.
- Linux CI is configured but was not exercised locally. Windows is unverified and not claimed.

## 4. Hackathon compliance matrix

| Requirement | State | Evidence / blocker |
|---|---|---|
| Developer Tools category | Pass | Positioning and draft select Developer Tools |
| Working project | Partial | Index → capsule → trusted in-process failure → expansion → pass → invalidation is tested and replayable; Plugin Mode lacks a public trusted-artifact handoff |
| Meaningful Codex/GPT-5.6 use | Pass with runtime caveat | Root collaboration documented; real catalog/request/completion/usage retained; effective model remains unconfirmed |
| Public `<3:00` YouTube video with English audio | Blocked | Timed script and real screenshots exist; no video or signed-out URL |
| Repository URL and judge access | Pass | Public repository: `https://github.com/AmirmLotfy/kerno`; public replay: `https://kerno-codex.vercel.app` |
| README/setup/license | Pass locally | README, Apache-2.0 license, judge path, collaboration narrative |
| Primary `/feedback` Session ID | Blocked | User has not run `/feedback` and recorded its ID |
| Plugin/dev-tool install and no-rebuild path | Pass locally | Marketplace install, package, replay, and quickstart documented |
| Authenticated form fields | Partial | Exact fields 27945–27951 are recorded; human selections, video URL, Session ID, and authorized form write remain |
| Eligibility/team authority | Blocked on human confirmation | Personal/team/sanctions/conflict facts require human confirmation |

The controlling deadline remains Tuesday, July 21, 2026 at 5:00 PM PDT / Wednesday, July 22 at 3:00 AM Africa/Cairo. Official rules control the conflicts recorded in `docs/HACKATHON_COMPLIANCE.md`.

## 5. Judging-criteria evidence matrix

| Criterion | Evidence | Remaining risk |
|---|---|---|
| Technological Implementation | Strict domain/storage/indexer/MCP/plugin/orchestrator code; 63 deterministic tests; real catalog/request/completion/usage evidence | Plugin trusted-artifact handoff and public comparison workflow are incomplete; effective model is not independently confirmed |
| Design | Warm editorial identity, complete product states, responsive dashboard, accessibility and contrast checks, real submission screenshots | Final video has not demonstrated the experience to judges |
| Potential Impact | Specific long-lived-repository problem; correctness-first replay and measurable harness | No fairness-valid multi-task comparative result |
| Quality of the Idea | Provenance, falsifiable capsules, targeted expansion, conservative invalidation, honest routing/review boundaries | Outcome-driven rank learning remains unimplemented and labeled unavailable |

## 6. Functional validation

Passed in the working candidate:

- Clean install, doctor, schema-v2 SQLite creation/integrity, and all workspace builds.
- Seven-file / 48-symbol TypeScript fixture index; unchanged re-index reparses zero files.
- Five-item / 1,094-estimated-token initial capsule within a 2,500 budget.
- Genuine failing test artifact followed by one 327-estimated-token transaction-contract child item.
- Three pinned assertions pass after the deterministic solution.
- Handler hash change marks the original capsule stale.
- JS/TS, Python, and lower-confidence generic parsing; memory states/supersession; branch/commit/file/worktree invalidation.
- CLI, loopback HTTP/SSE, 13-tool MCP, App Server adapter, and full operational slice.
- Snapshot freshness ignores intentionally skipped binaries while detecting newly added indexable files.
- Capsule IDs remain immutable across phase, budget, parent, and evidence variants; artifact IDs remain distinct across pass/fail evidence.
- Portable storage rejects concurrent writers, and installed plugin MCP processes use isolated portable files so separate Codex hosts cannot overwrite one JSON document.

The deterministic replay does not claim live Codex implementation or independent review; unavailable evidence remains unavailable.

Blocking functional boundaries: the public plugin/CLI surface cannot yet convert a sandbox-observed test result into a trusted Kerno artifact, so the public MCP cannot independently complete the failed-test → verified expansion/outcome loop. `kerno_compare_runs` also has no complete public workflow for creating the run entities it compares. The in-process operational test and replay are real, but they do not erase these integration gaps.

## 7. Clean-room validation

**Passed** at product commit `5909062714b8bc38090571609bf9f9cf725a357f` in a fresh, non-hardlinked macOS clone under an isolated temporary directory.

The clone ran `npm ci`, `npm run doctor`, `npm run judge -- --check`, the complete `npm run clean-room` gate, secret/license/link audits, and `npm audit --omit=dev --audit-level=high`. Results: 354 packages installed; schema-v2 doctor passed; 63 tests passed; all workspaces built; five Playwright product/accessibility/responsive checks passed; 20 contrast pairs passed; 13-tool MCP smoke passed; brand, secret, 320-package license, and 30-file link audits passed; the dependency audit found zero vulnerabilities.

The judge and screenshot commands intentionally regenerated timestamped replay/report/image artifacts inside the isolated clone. The run completed without manual repair, source edit, credential, or hidden setup step. Generated timestamp differences are expected and were not copied back as product-source changes.

## 8. Plugin validation

- Repository-local marketplace is discoverable and the installed cache matches the source skill/MCP bundle.
- The plugin archive contains the manifest, skill, MCP config/executable, reviewed optional hooks, license, and warm Context Core assets.
- The bundled STDIO MCP exposes 13 tools and completes index → fresh status → task → capsule through portable storage.
- The installed plugin was captured in the real Codex plugin surface; the privacy-safe crop is `docs/assets/submission/kerno-real-plugin-codex.png`.
- Plugin portable state is process-scoped for concurrency safety; durable cross-task state uses the daemon SQLite store.
- The current plugin-creator Python validator cannot run because its host Python lacks PyYAML; package inspection, marketplace install/cache comparison, and MCP smoke are the recorded substitutes. No dependency was installed to conceal that tooling limitation.

Generated artifact SHA-256 evidence from the isolated clone:

- Plugin archive: `d56acd0d7e246d9013303dcd8327c5d77f8dc31514432af8b340682e65f7a1d1`.
- Generated canonical replay: `0fa1ad44e3514769373b3ae0e24cfc41260ebc049e1c0889992bc925f01d78e0`.
- Retained live App Server evidence: `cc89066822745684006a05464a9b8e16f75725e4da1f46f5af2da029910a17bb`.
- Generated benchmark report: `c0481448a0101537d423a2a57dbbb29505be66a427b323d90367299368bdf432`.

## 9. MCP validation

- Inputs reject unknown/oversized fields and aggregate payloads above 64 KiB.
- Repository/root/symlink/hardlink/ownership containment and fixed-command model discovery are tested.
- Caller-provided artifact prose, exit codes, and `verified` fields cannot verify memory or outcomes.
- No MCP tool accepts an arbitrary shell command or writes repository source.
- The plugin MCP deliberately refuses caller assertions as trusted test evidence. A sandbox-attested App Server/hook receipt path is not implemented yet; this is blocking, not waived.

## 10. Model-routing validation

- Live `model/list` discovered four available entries.
- Policy selected and requested `gpt-5.6-sol` with `low` effort from that live catalog.
- After a forward-compatibility schema fix, the accepted App Server turn completed and emitted two observed usage updates; the final recorded total was 33,859 tokens.
- No effective-model or reroute event was emitted. The dashboard therefore shows `requested-unconfirmed` rather than asserting the requested model was effective.
- Plugin Mode remains a recommendation/manual fallback. No silent parent-model switching is claimed.

This passes live discovery/request/completion handling and the public Vercel routing view displays the same requested route and truth label. It does **not** satisfy the acceptance criterion that an independently observed effective model match the requested/displayed route.

## 11. Benchmark integrity

- Eight real historical attempts are retained, including failures, timeouts, unfavorable results, tests, diffs, and review findings.
- One latest same-task pair has passing tests and zero reviewer findings in both conditions.
- The strengthened validator rejects the pair: `profile isolation unverified` and `profile evidence missing`.
- Raw observations are 93,670 vs 95,383 tokens, 6 vs 2 observable files, 2 vs 0 repeated reads, 7 vs 8 qualifying tool calls, and 71,922 vs 107,289 ms latency. They are **not** causal comparative results.
- No exact cost, percentage improvement, or generalized benefit is claimed.
- Two additional task pairs and a separate routing experiment are missing.

**Blocking result:** zero benchmark comparisons pass the final fairness gate.

## 12. Security results

Fixed and verified during red-team:

- Caller-forged artifact verification and outcome promotion.
- Symlink, deep-ancestor, hardlink, and ownership escape paths in Kerno state handling.
- Nested secret-file exclusion and recursive log/export redaction.
- Aggregate MCP input/output limits and guarded export/delete.
- Stale-snapshot, branch/commit, exact-memory-ID, and expansion-evidence invalidation gaps.
- Stable-ID collision risk by replacing 32-bit FNV identifiers with 128-bit-truncated SHA-256 identifiers.
- Immutable capsule/artifact identity gaps that previously allowed phase/budget or pass/fail variants to overwrite one another.
- Portable JSON lost-update risk through exclusive writer locking; installed plugin MCP processes use isolated files to avoid cross-host lock contention.
- Forward-compatible App Server metadata parsing while preserving validation of every field Kerno relies on.
- Loopback token/origin controls, hostile paths, malicious repository instructions, oversized/binary files, and advisory-hook failure behavior.

No unresolved critical security finding remains. Residual risks: pattern redaction is incomplete by nature, parsers are heuristic, same-UID filesystem TOCTOU cannot be eliminated, and local state is permission-restricted but not encrypted at rest.

## 13. Privacy results

- Source and telemetry remain local by default; no hosted backend, vector service, or source upload.
- Repository excerpts are bounded and treated as untrusted data.
- Events/exports redact secrets and canonical local paths; safe export omits stored excerpts/output.
- HTTP binds only to loopback with an ephemeral bearer token.
- Plugin uninstall preserves data intentionally; explicit export and ownership-checked deletion are documented.

## 14. Dependency and license results

- `npm audit --audit-level=high`: zero vulnerabilities.
- License policy: 320 installed top-level/transitive packages passed.
- Kerno and original fixtures: Apache-2.0.
- Third-party notices exist. Brand and screenshot assets are original repository-generated assets with no invented metrics or third-party model logos.

## 15. Documentation results

Completed and cross-linked: `README.md`, `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, architecture, decisions, threat model, benchmark protocol, judge quickstart, Codex collaboration, hackathon compliance, demo script, Devpost draft, brand system/audit, submission image guide, P0 audit, and this report. Exact authenticated Devpost fields 27945–27951 are recorded without writing the draft.

## 16. Demo rehearsal result

- Deterministic evidence reset and preflight pass.
- Preflight proves failure → targeted expansion → passing test → stale invalidation, chronological events, truth labels, benchmark fairness failure, retained runtime evidence, and required assets.
- Real dashboard screenshots cover Home, capsule, routing evidence, lifecycle, expansion, and invalidation.
- A privacy-safe real Codex plugin capture and signed-out public Vercel Home/Routing captures are included.
- Final script targets 2:48 with a hard stop at 2:55 and describes the completed-but-unconfirmed route accurately.
- No video with captured English audio was recorded or uploaded.

## 17. Remaining limitations

- Effective model identity remains `requested-unconfirmed` because the runtime emitted no effective/reroute event.
- Dashboard combines deterministic replay with separately labeled retained App Server evidence rather than one continuous live workflow.
- CLI/daemon SQLite and plugin portable JSON are separate stores unless configured to share a path.
- Process-scoped plugin storage does not provide durable cross-task memory; use the daemon SQLite store for that behavior.
- Plugin Mode lacks a sandbox-attested public route for creating trusted test artifacts; verified expansion/outcome remains internal/orchestrator-handoff work.
- `kerno_compare_runs` is not reachable from a complete public run-recording workflow and its public metric contract needs alignment with the benchmark schema.
- Outcome-driven ranking utility is not implemented; prior usefulness remains neutral and labeled unavailable.
- JS/TS/Python relationship extraction is useful but not compiler-complete semantic analysis.
- Linux and Windows are not locally verified; Windows is not claimed.

## 18. Remaining non-blocking issues

- Plugin creator’s Python validator requires unavailable PyYAML.
- Native SQLite installation prints a transitive `prebuild-install` deprecation warning but succeeds on the tested runtime.
- Formal manual screen-reader testing and broader language parsing remain future work.
- Same-UID filesystem state can change after safety checks; writes use containment/ownership/link checks but cannot eliminate every TOCTOU race.

## 19. External placeholders still required

- Public repository (complete): `https://github.com/AmirmLotfy/kerno`
- Public judge replay (complete): `https://kerno-codex.vercel.app`
- `[REQUIRED PUBLIC YOUTUBE URL UNDER 3:00]`
- `[REQUIRED PRIMARY /feedback SESSION ID]`
- `[REQUIRED AUTHENTICATED DEVPOST FIELD CHECK]`
- `[REQUIRED ENTRANT/TEAM ELIGIBILITY CONFIRMATION]`

## 20. Final reproduction commands

```bash
npm ci
npm run doctor
npm run judge

npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run test:security
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

Live evidence, for a signed-in Codex installation with available capacity:

```bash
npm run test:app-server:live
npm run judge:live
```

## 21. READY or NOT READY decision

**NOT READY.** The product is locally operational and publicly judge-demonstrable, but P0 release remains blocked until the Plugin Mode trusted-artifact handoff and public compare-runs workflow are complete, the fairness-valid three-task evaluation plus separate routing experiment exists, effective-model evidence is available or the acceptance criterion is explicitly revised, the public sub-three-minute video is verified, the primary `/feedback` Session ID is recorded, and human form/eligibility confirmations are complete.
