# Hackathon compliance

## Truth brief

Latest refresh: **July 19, 2026 at 10:27 AM PDT / 8:27 PM Africa/Cairo / 5:27 PM UTC**. Approximately 54.5 hours remained. No substantive requirement changed from the prior grounding.

The requested Devpost Hackathons plugin was checked first and was not callable: no Devpost/Hackathons capability existed in the active tool catalog. The refresh therefore used the authoritative official pages directly. The public pages continued to expose the same deadline, required-tool language, and participation guidance. No Devpost write was performed.

- Phase: registration and submissions open.
- Controlling deadline: Tuesday, July 21, 2026 at 5:00 PM PDT / Wednesday, July 22, 2026 at 3:00 AM EEST.
- Category: Developer Tools.
- Required technology: meaningful, evidenced use of both Codex and GPT-5.6.
- Required deliverables: working project, category and description, public YouTube demo, repository URL, the primary implementation task's `/feedback` Codex Session ID, and every authenticated submission field.
- Video: use the stricter official-rules interpretation—public and shorter than 3:00. Target 2:40–2:50.
- Repository: public with an appropriate license, or private and shared before the deadline with `testing@devpost.com` and `build-week-event@openai.com`.
- README: installation, sample data, supported platforms, run/test and no-rebuild judge paths, Codex collaboration, important human decisions, and specific GPT-5.6/Codex contributions.
- Developer-tool testing: document installation and supported platforms and provide the packaged plugin plus a no-rebuild judge path. Kerno provides a built local replay and a separate authenticated live path.
- Judging: Stage 1 checks theme fit, viability, and required-tool use. Stage 2 equally weighs Technological Implementation, Design, Potential Impact, and Quality of the Idea; Technological Implementation is the first tie-break.
- Eligibility: each entrant must independently confirm age of majority, residence, sanctions, ownership, conflicts of interest, and team-representative authority.

No Devpost write has been performed. The exact authenticated form labels remain an execution-time check, and any submission action requires explicit user authorization.

## Source table

| Source | Retrieved | Use |
|---|---:|---|
| [Official Rules](https://openai.devpost.com/rules) | Grounding timestamp | Controlling contractual source for deadline, eligibility, deliverables, judging, testing, and prizes |
| [Hackathon overview](https://openai.devpost.com/) | Grounding timestamp | Tracks, overview requirements, judging summary, and prizes |
| [Resources](https://openai.devpost.com/resources) | Grounding timestamp | Credits, setup, support, and demo tips |
| [Host updates](https://openai.devpost.com/updates) | Grounding timestamp | Current announcements |
| [Latest deadline tips](https://openai.devpost.com/updates/45371-tuesday-last-minute-tips) | Grounding timestamp | Deadline correction and last-minute guidance |
| [FAQ](https://openai.devpost.com/details/faqs) | Grounding timestamp | Tool, video, Session ID, plugin, and submission clarifications |
| [Schedule](https://openai.devpost.com/details/dates) | Grounding timestamp | Secondary schedule; conflicts with Rules on judging dates |
| [Submission form](https://devpost.com/submit-to/30223-openai-build-week/manage/submissions) | Grounding timestamp | Logged-out check; authenticated labels unavailable |
| [Supported countries](https://developers.openai.com/api/docs/supported-countries) | July 19, 2026 | Egypt support cross-check |
| [Codex documentation](https://learn.chatgpt.com/docs/app-server) | Grounding timestamp | Current supported Codex integration behavior |

## Final July 19 refresh log

| Checked item | Change since prior brief | Controlling source | Resulting action |
|---|---|---|---|
| Announcements | No newer requirement-changing announcement was visible; the Tuesday deadline correction remains the relevant update | Official host updates; Rules if an update conflicts | Keep the Tuesday deadline and four-hour submission buffer |
| Rules and eligibility | No observed change | Official Rules | No scope change; human eligibility confirmation remains required |
| Dates | No observed change to submission deadline; Rules/schedule judging-period conflict remains | Official Rules | Deadline remains July 21, 5:00 PM PDT / July 22, 3:00 AM Cairo |
| Judging criteria | No observed change | Official Rules and overview | Preserve equal alignment to implementation, design, impact, and idea quality |
| Resources | No new credit availability observed | Official Resources | Keep replay path independent of event credits |
| Submission requirements | No observed change | Official Rules and FAQ | Preserve public under-three-minute video, repository access, and `/feedback` Session ID requirements |
| Submission fields | Authenticated labels still unavailable without entering the managed submission flow | Authenticated Devpost form | Keep polished drafts and placeholders; verify every actual field after the user authorizes draft access; invent no labels or values |
| Devpost plugin | Still absent from the callable tool catalog | Active Codex tool catalog; Rules define it as optional | Continue with official sources; do not install or write to Devpost |

## Conflict log

| Conflict | Controlling decision |
|---|---|
| Rules list judging July 22–August 5; schedule lists July 22–August 9 | Rules control. Keep judge access available beyond the listed judging period. |
| An earlier update named Monday; Rules, overview, calendar, and the correction name Tuesday | Tuesday, July 21 at 5:00 PM PDT controls. |
| Rules/overview require a public video; a tip permits unlisted | Public controls. |
| Rules require less than three minutes; FAQ says three minutes or under | Keep it below 3:00. |
| Overview presents the Devpost plugin as a participation step; Rules call it optional | Optional; Kerno does not depend on it. |
| A pre-existing-project clause says Codex “and/or” GPT-5.6; principal requirements and FAQ require both | Evidence meaningful use of both. |
| Overview advertised a credit request period; Resources say event credits are exhausted | Assume no event credits. Final live validation failed with `usageLimitExceeded`; Kerno’s deterministic judge replay remains independent of hackathon credits. |
| Rules require all authenticated fields; logged-out access does not reveal their exact labels | Open the authenticated draft early, record every label, and invent none. |

## Final submission checklist

- Re-check Rules, announcements, Resources, and the authenticated form with a new timestamp.
- Confirm entrant and team eligibility.
- Ensure every invited teammate accepts before the deadline.
- Confirm repository visibility or both private-repository judge invitations.
- Keep the free judge path available without restriction through August 5, 2026 at 5:00 PM PDT / August 6 at 3:00 AM Cairo.
- Ensure all submitted materials are English or include an English translation.
- Run the final clean-room checks and verify artifact hashes.
- Add the public repository URL, public YouTube URL, and primary `/feedback` Session ID.
- Verify the video signed out: public, English audio, working demo, and under 3:00.
- Verify the packaged plugin and replay from a fresh judge profile.
- Verify installation and runtime behavior match what the video depicts; submission edits stop at the deadline.
- Obtain explicit user authorization before creating, updating, or submitting any Devpost entry.

## Final compliance state

| Requirement | State | Evidence or blocker |
|---|---|---|
| Working Developer Tools project | Pass locally | Deterministic vertical slice, plugin bundle, MCP, dashboard, and tests exist |
| Meaningful Codex and GPT-5.6 use | Partial | Root implementation collaboration is documented; retained App Server evidence requested a live-discovered GPT-5.6 model but did not independently confirm the effective model |
| Installation, supported platforms, no-rebuild test path | Pass locally | `README.md`, `docs/JUDGE_QUICKSTART.md`, plugin archive, replay mode |
| Repository access | Blocked externally | Final repository URL and public/private judge access are not configured |
| README and license | Pass locally | Apache-2.0 repository and required setup/collaboration material exist |
| Public YouTube video under 3:00 with English audio | Blocked externally | Script is complete; video has not been recorded, uploaded, or checked signed out |
| Primary `/feedback` Session ID | Blocked externally | User must run `/feedback` in this root implementation task and record the returned ID |
| Authenticated submission fields | Blocked externally | Exact logged-in labels and completed values are unavailable; no Devpost write was authorized |
| Entrant/team eligibility | Blocked on human confirmation | Residence list includes Egypt, but age, sanctions, ownership, conflicts, and representative authority are not machine-verifiable |

**Compliance decision:** locally demonstrable, but **NOT READY for submission** until the repository/video/Session-ID/form/eligibility blockers are resolved. No Devpost registration, project creation, edit, or submission occurred during this validation.
