# P0 gap audit

Audit timestamp: July 19, 2026 at 12:59 AM PDT / 10:59 AM Africa/Cairo / 7:59 AM UTC.

Status meanings: **Pass** is exercised and evidenced; **Partial** has working foundations but misses a required proof or product surface; **Fail** is absent. This matrix is updated as gaps close and is intentionally stricter than the deterministic vertical-slice test.

| P0 area | Status at audit | Root cause / evidence | Required closure |
|---|---|---|---|
| Live compliance grounding | Pass | Official pages rechecked; no controlling change; plugin unavailable | Recheck immediately before authorized submission |
| Installable plugin and local marketplace | Partial for inline UI; pass for skill/MCP | Cachebuster, validators, real reinstall, cache/source hash match, 16-tool bundle, component resource contract, and browser harness pass. Installed manifest inspection proves `apps: null` and no `.app.json`; local MCP is STDIO only. | Deploy or tunnel a streaming MCP endpoint, create the developer-mode app, wire its real ID through `.app.json`, reinstall, and observe the host before claiming inline UI. |
| Core contracts and schema validation | Pass | Strict Zod contract tests pass | Maintain boundary tests |
| SQLite migrations and portable store | Pass | Migration, integrity, recovery, WAL, lease, and normalized-table tests pass | Fresh database gate remains mandatory |
| Safe incremental JS/TS/Python indexing | Pass | Parser, ignore, symlink, secret, branch, and zero-reparse tests pass | Do not overstate call-graph precision |
| Bounded capsule, provenance, exclusions, scoring | Pass | Unit and vertical integration tests pass | Surface all details in dashboard |
| Evidence-backed memory and invalidation | Pass | Candidate/verified/stale/superseded and branch/file/symbol tests pass | Surface counts and supersession in UI |
| Evidence-driven expansion | Pass | Genuine failing test produces transaction-only child capsule | Preserve immutable artifacts |
| Trusted model discovery and routing | Partial | Live `model/list`, accepted GPT-5.6 request, completed turn, and token usage recorded; no effective/reroute event was emitted; forged catalogs rejected | Preserve `requested-unconfirmed` until runtime evidence identifies the effective model |
| Live writable phase and independent review | Pass for retained benchmark evidence | Latest retained task pair produced passing patches and fresh review threads; the latest standalone route smoke completed but did not independently confirm effective model identity | Keep task/review and model-identity claims separate |
| HTTP/SSE daemon | Pass | Loopback auth/origin/ordered-event integration tests pass | Document live connection parameters |
| Dashboard required states and views | Partial | Evidence-first replay works, but lifecycle states, live data adapter, full route detail, excluded candidates, and measured comparison need implementation | Implement state gallery, live/replay adapter, route/context/comparison completeness |
| First substantial fixture | Pass | `relaycart-ts` has seven modules, concurrency/restart/public-contract tests, and Apache-compatible project license | Keep deterministic commits |
| Second substantial fixture | Fail | `gatehouse-python` contains metadata only | Build licensed multi-module Python repository and pinned task/tests |
| Three-task benchmark harness | Partial | Manifests and one live smoke exist; no six-cell baseline/Kerno result set, CSV, Markdown, or dashboard dataset | Implement runner/exporter; retain failures and null metrics |
| Fair context-versus-routing experiments | Partial | Separate manifests exist but have no complete recorded run matrix | Enforce fairness fields and report experiment class |
| One-command judge flow | Partial | `npm run judge` works; root `npm run doctor` and actual clean-clone automation are missing | Add doctor script, clean clone, diagnostics, cleanup docs |
| Documentation set | Partial | Required files exist but architecture, security, benchmark, collaboration, demo, submission, and troubleshooting are too terse | Expand and link every required field honestly |
| Third-party attribution and license audit | Fail | No attribution inventory or automated dependency-license check | Add `THIRD_PARTY_NOTICES.md`, fixture licenses, audit script |
| Dependency and secret audit | Partial | Runtime controls/tests exist; release commands do not yet run dependency audit and checked-artifact secret scan | Add deterministic audit scripts and gate |
| Dashboard accessibility/performance/responsiveness | Partial | Responsive CSS and reduced motion exist; no formal audit/state accessibility coverage | Run technical audit and fix P0/P1 findings |
| Replay and demo assets | Partial | Real deterministic replay and screenshot exist; demo script is outdated and no recording fixture/cut list exists | Regenerate assets and complete timed script |
| Devpost submission draft | Partial | Placeholders are honest but required narrative fields are missing | Complete every requested draft field without inventing URLs/IDs |
| Clean-room platform evidence | Partial | Local clean-room-equivalent gate passes on macOS Node 22; no actual clean clone or Linux execution | Run local isolated clone; leave Linux pending unless exercised |
| Judging alignment | Partial | Thesis is strong; benchmark/impact evidence and first-launch design are incomplete | Close dashboard/evaluation gaps before polish freeze |

## Judging alignment at audit

| Criterion | Status | Evidence | Blocking gap |
|---|---|---|---|
| Technological Implementation | Pass with evidence gap | Working plugin, MCP, indexer, context loop, live model discovery, tests | Successful live writable/review artifact and benchmark matrix |
| Design | Partial | Distinctive evidence-first replay dashboard | Complete lifecycle states, first launch, accessibility, and live/replay distinctions |
| Potential Impact | Partial | Clear developer problem and correctness-first thesis | Real baseline comparison across three tasks |
| Quality of the Idea | Pass | Evidence-backed context, invalidation, progressive expansion, and routing are visibly distinct from RAG | Preserve novelty through measurable outcomes |

## Closure status after judge-readiness pass

Updated July 19, 2026 after the complete local gate.

| Former gap | Current status | Closure evidence / remaining blocker |
|---|---|---|
| Dashboard states and views | **Pass** | All 16 requested lifecycle states, six views, truth labels, desktop/mobile Playwright, and production build pass. |
| Second substantial fixture | **Pass** | Original Apache-2.0 `gatehouse-python` has multiple modules, imports, interface refactor, failing seed, passing pinned solution, and indexer integration coverage. |
| Benchmark exporter | **Pass** | Strict run schema plus JSON, CSV, Markdown, dashboard exports; missing values remain null. |
| Three-task App Server matrix | **Pass** | Three current context-controlled pairs and one separate full-system routing pair are retained; the failed Python pair remains visible. |
| Fairness proof | **Pass with sample-size caveat** | Current pairs use immutable pair IDs, auth-only profiles, matching task/commit/model/effort where required, and hash-bound receipts/artifacts. Each task has one run per condition. |
| Live writable phase / review | **Pass** | Latest same-task pair produced passing patches and fresh independent reviews with zero findings; earlier failed reviews remain retained and drove transaction-invariant corrections. |
| Root doctor / judge path | **Pass locally** | `npm run doctor`, `npm run judge -- --check`, CLI/plugin/MCP/E2E paths pass. |
| Actual fresh clone | **Pass on macOS** | Non-hardlinked clone of `6a8ab81` passed fresh `npm ci`, package-before-doctor, judge check, 72 deterministic tests, builds, nine E2E flows including the component host harness, 16-tool/UI-resource plugin smoke, replay preflight, audits, and zero-vulnerability dependency scan. This does not prove Codex app registration or host rendering. |
| Documentation and submission drafts | **Pass for local content** | README, architecture, benchmark, security, collaboration, quickstart, Devpost draft, and timed demo script are complete and honest. External URLs/Session ID remain required. |
| Attribution/license/secret/dependency audits | **Pass locally** | 320 installed packages resolved to allowed licenses, secret scan passed, and npm reported zero vulnerabilities. |
| Dashboard technical audit | **Pass with P1 notes** | 18/20; no P0 finding. Formal screen-reader conformance remains P1. |
| Demo assets | **Partial / release blocker** | Recording fixture, final screenshot, script, fallback, and checklists exist. Public `<3:00` video has not been recorded/uploaded. |
| Submission identifiers and eligibility | **Blocked on external/human input** | Repository URL, video URL, primary `/feedback` ID, exact authenticated field labels, and entrant eligibility confirmation remain unavailable. |

Kerno is internally operational and judge-demonstrable. Effective-model identity remains honestly `requested-unconfirmed`, not a broken acceptance claim: the supported interface accepted and completed the requested routes but emitted no stronger identity event. Submission remains blocked only by the public video, primary `/feedback` Session ID, authenticated human form choices, and entrant/team eligibility confirmation. Linux remains CI-configured but locally unverified; Windows is not claimed.
