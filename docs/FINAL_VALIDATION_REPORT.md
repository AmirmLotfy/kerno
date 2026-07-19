# Final validation report

Validation candidate completed: **July 19, 2026 at 12:18 PM PDT / 10:18 PM Africa/Cairo / 7:18 PM UTC**. The final isolated-clone commit is recorded after the clean-room run.

## 1. Executive readiness result

**NOT READY FOR SUBMISSION.** The local product, plugin, MCP surface, dashboard, security controls, live App Server smoke, deterministic replay, and current engineering gates pass. Submission readiness remains blocked by an incomplete three-task benchmark matrix, zero comparison pairs satisfying the strengthened fairness gate, absence of an effective-model/reroute event, and required external repository/video/Session-ID/form/eligibility evidence.

No Devpost project was registered, created, edited, or submitted. Nothing was pushed, published, deployed, uploaded, or made public.

## 2. Exact commit tested

- Product candidate commit: `[RECORDED AFTER FINAL LOCAL COMMIT]`.
- Branch: `main`.
- Clean-room method: local `git clone --no-hardlinks` into an isolated temporary directory.
- A documentation-only validation follow-up may succeed the product commit; the report distinguishes the tested product commit from that follow-up.

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
| Working project | Pass locally | Index → capsule → failure → expansion → pass → invalidation is tested and replayable |
| Meaningful Codex/GPT-5.6 use | Pass with runtime caveat | Root collaboration documented; real catalog/request/completion/usage retained; effective model remains unconfirmed |
| Public `<3:00` YouTube video with English audio | Blocked | Timed script and real screenshots exist; no video or signed-out URL |
| Repository URL and judge access | Blocked | No final URL or public/private sharing confirmation |
| README/setup/license | Pass locally | README, Apache-2.0 license, judge path, collaboration narrative |
| Primary `/feedback` Session ID | Blocked | User has not run `/feedback` and recorded its ID |
| Plugin/dev-tool install and no-rebuild path | Pass locally | Marketplace install, package, replay, and quickstart documented |
| Authenticated form fields | Blocked | Exact logged-in labels/values remain unavailable; drafts do not invent them |
| Eligibility/team authority | Blocked on human confirmation | Personal/team/sanctions/conflict facts require human confirmation |

The controlling deadline remains Tuesday, July 21, 2026 at 5:00 PM PDT / Wednesday, July 22 at 3:00 AM Africa/Cairo. Official rules control the conflicts recorded in `docs/HACKATHON_COMPLIANCE.md`.

## 5. Judging-criteria evidence matrix

| Criterion | Evidence | Remaining risk |
|---|---|---|
| Technological Implementation | Strict domain/storage/indexer/MCP/plugin/orchestrator code; 57 deterministic tests; real catalog/request/completion/usage evidence | Effective model not independently confirmed; benchmark matrix incomplete |
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

The deterministic replay does not claim live Codex implementation or independent review; unavailable evidence remains unavailable.

## 7. Clean-room validation

**Pending final isolated rerun.** The exact result and tested product commit are filled only after the committed candidate passes the documented judge path.

## 8. Plugin validation

- Repository-local marketplace is discoverable and the installed cache matches the source skill/MCP bundle.
- The plugin archive contains the manifest, skill, MCP config/executable, reviewed optional hooks, license, and warm Context Core assets.
- The bundled STDIO MCP exposes 13 tools and indexes the fixture through portable storage.
- The current plugin-creator Python validator cannot run because its host Python lacks PyYAML; package inspection, marketplace install/cache comparison, and MCP smoke are the recorded substitutes. No dependency was installed to conceal that tooling limitation.

## 9. MCP validation

- Inputs reject unknown/oversized fields and aggregate payloads above 64 KiB.
- Repository/root/symlink/hardlink/ownership containment and fixed-command model discovery are tested.
- Caller-provided artifact prose, exit codes, and `verified` fields cannot verify memory or outcomes.
- No MCP tool accepts an arbitrary shell command or writes repository source.

## 10. Model-routing validation

- Live `model/list` discovered four available entries.
- Policy selected and requested `gpt-5.6-sol` with `low` effort from that live catalog.
- The accepted App Server turn completed and emitted observed usage; the latest recorded total was 33,781 tokens.
- No effective-model or reroute event was emitted. The dashboard therefore shows `requested-unconfirmed` rather than asserting the requested model was effective.
- Plugin Mode remains a recommendation/manual fallback. No silent parent-model switching is claimed.

This passes live discovery/request/completion handling but does **not** satisfy the acceptance criterion that the displayed effective route match independently observed runtime identity.

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

Completed and cross-linked: `README.md`, `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, architecture, decisions, threat model, benchmark protocol, judge quickstart, Codex collaboration, hackathon compliance, demo script, Devpost draft, brand system/audit, submission image guide, P0 audit, and this report. Exact authenticated Devpost labels remain unavailable and are not invented.

## 16. Demo rehearsal result

- Deterministic evidence reset and preflight pass.
- Preflight proves failure → targeted expansion → passing test → stale invalidation, chronological events, truth labels, benchmark fairness failure, retained runtime evidence, and required assets.
- Real dashboard screenshots cover Home, capsule, routing evidence, lifecycle, expansion, and invalidation.
- Final script targets 2:48 with a hard stop at 2:55 and describes the completed-but-unconfirmed route accurately.
- No video with captured English audio was recorded or uploaded.

## 17. Remaining limitations

- Effective model identity remains `requested-unconfirmed` because the runtime emitted no effective/reroute event.
- Dashboard combines deterministic replay with separately labeled retained App Server evidence rather than one continuous live workflow.
- CLI/daemon SQLite and plugin portable JSON are separate stores unless configured to share a path.
- Outcome-driven ranking utility is not implemented; prior usefulness remains neutral and labeled unavailable.
- JS/TS/Python relationship extraction is useful but not compiler-complete semantic analysis.
- Linux and Windows are not locally verified; Windows is not claimed.

## 18. Remaining non-blocking issues

- Plugin creator’s Python validator requires unavailable PyYAML.
- Native SQLite installation prints a transitive `prebuild-install` deprecation warning but succeeds on the tested runtime.
- Formal manual screen-reader testing and broader language parsing remain future work.
- Same-UID filesystem state can change after safety checks; writes use containment/ownership/link checks but cannot eliminate every TOCTOU race.

## 19. External placeholders still required

- `[REQUIRED FINAL REPOSITORY URL]`
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

**NOT READY.** The local product is operational and judge-demonstrable. Release remains blocked until the fairness-valid three-task evaluation (plus separate routing experiment), effective-model evidence or an explicitly accepted criteria waiver, public repository access, public sub-three-minute video, primary `/feedback` Session ID, authenticated form check, and entrant/team confirmation are complete.
