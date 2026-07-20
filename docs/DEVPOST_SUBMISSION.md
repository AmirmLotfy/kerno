# Devpost submission draft — do not submit from this file

No registration, project creation, submission edit, or submission action is authorized. Replace bracketed placeholders only with verified values.

## Project fields

- **Project name:** Kerno
- **Tagline:** The context control plane for Codex.
- **Category:** Developer Tools
- **Repository:** `https://github.com/AmirmLotfy/kerno`
- **Judge demo:** `https://kerno-codex.vercel.app`
- **Demo video:** `[REQUIRED PUBLIC YOUTUBE URL, UNDER 3:00]`
- **Primary Codex Session ID:** `[REQUIRED — run /feedback in the root implementation task]`
- **Built with:** TypeScript, Node.js, npm workspaces, Codex, GPT-5.6, Codex App Server, Codex plugins, MCP, SQLite, Zod, React, Vite, Vitest, Playwright, Git
- **3:2 thumbnail asset:** `docs/assets/brand/kerno-devpost-thumbnail.png` (900×600, original Kerno artwork, no metrics)
- **Open Graph asset:** `docs/assets/brand/kerno-open-graph.png` (1200×630, original Kerno artwork, no metrics)

## Screenshot gallery and recommended order

Use the images in this order so the deterministic proof loop is established before the separately retained runtime evidence:

1. `docs/assets/submission/kerno-real-plugin-codex.png` — authentic installed Codex plugin detail showing one MCP server, one Kerno Context skill, and three review-gated hooks. The image is cropped to exclude account/sidebar details and otherwise unaltered.
2. `docs/assets/submission/kerno-real-public-dashboard.png` — authentic signed-out capture of the public Vercel replay.
3. `docs/assets/submission/kerno-real-public-routing.png` — authentic signed-out capture of the public routing view with the retained App Server evidence label.
4. `docs/assets/submission/kerno-real-home.png` — deterministic fixture replay overview and evidence-backed lifecycle; no live Codex turn is claimed.
5. `docs/assets/submission/kerno-real-context-capsule.png` — deterministic initial capsule, estimated token budget, provenance, and ranked evidence.
6. `docs/assets/submission/kerno-real-expansion-invalidation.png` — deterministic failing-test expansion and later source-hash invalidation.
7. `docs/assets/submission/kerno-real-evidence-timeline.png` — chronological deterministic evidence chain, including unavailable review/orchestration states.
8. `docs/assets/submission/kerno-real-routing-evidence.png` — policy recommendation from replay beside a **separate real App Server evidence** panel; requested and effective model states remain distinct.
The `*-full.png` variants are long-form inspection captures, not the preferred gallery thumbnails. Never caption the routing screenshot as though the real App Server event applied the deterministic fixture solution.

## Short pitch

Kerno gives Codex the smallest fresh, verified repository context for each task, expands it only from evidence, invalidates stale beliefs, and makes phase-level model routing observable.

## Full project description

Coding agents repeatedly reopen the same files, rediscover architecture, carry stale assumptions across branches, and use one model/effort for every phase. Kerno is a local-first truth-maintenance and model-orchestration layer for Codex. It indexes repository structure deterministically, compiles each task into an explainable bounded context capsule, observes tests and runtime evidence, expands only around a concrete gap, records evidence-backed memories, and invalidates conclusions when their source hashes or scopes change.

Kerno’s dashboard shows why every item was included, what it costs in estimated context, what makes it stale, what model was recommended/requested/effectively observed, and which evidence produced the outcome. A same-task benchmark format compares plain Codex and Codex with Kerno without hiding failed or unfavorable runs.

## Inspiration

The painful part of agentic coding is often not code generation; it is maintaining the right beliefs about a changing repository. We wanted a system that could admit its initial context was incomplete, repair that context from tests, and prove the result.

## What it does

Kerno safely indexes JavaScript/TypeScript and Python, classifies tasks, ranks deterministic evidence, builds capsules, explains provenance and score components, expands from persisted artifacts, invalidates stale memory, recommends or executes supported phase routing, starts an independent review thread, and exposes real/replayed evidence in a local dashboard.

## How it was built

Kerno is a TypeScript/npm-workspaces monorepo. A strict domain service composes safe Git-aware indexing, SQLite/WAL state, lexical/graph/test retrieval, evidence-backed memory, invalidation, routing policy, MCP, CLI, App Server STDIO, HTTP/SSE, React, and reproducible evaluation exports. Plugin-cache mode uses an atomic portable store because native SQLite resolution is unreliable after plugin copying.

## How Codex was used

Codex was the primary implementation collaborator: it inspected official interfaces, created and revised code/tests/docs, exercised MCP/plugin/App Server/CLI/dashboard paths, and corrected issues from real tool output. Focused agents researched compliance/capabilities and audited architecture/security/P0 gaps; the root task reconciled their work. Human decisions controlled product scope, security, evidence semantics, evaluation fairness, and final claims.

## How GPT-5.6 was used

GPT-5.6 powered the main Codex implementation work and was discovered/requested in the retained live App Server benchmark. Kerno does not assume availability and does not claim an effective model without runtime proof.

## Technical challenges

- Keeping plugin recommendations distinct from actual parent-model control.
- Packaging MCP portably when native SQLite cannot be assumed in a plugin cache.
- Making branch/file/symbol invalidation conservative without discarding all repository knowledge.
- Deriving metrics only from observable App Server events.
- Preserving test/runtime text as untrusted evidence while still using it to expand context.
- Creating a judge replay that is reliable but never presented as live Codex execution.

## Accomplishments

- One deterministic failure → targeted child capsule → passing patch → invalidation loop.
- Thirteen strict MCP contracts and a locally installable Codex plugin.
- Live catalog discovery and explicit phase orchestration with honest route labels.
- Evidence-first dashboard covering all empty/loading/success/failure states.
- Three fairness-valid context-controlled pairs, one separate full-system routing pair, hash-bound raw artifacts, and retained unfavorable outcomes.
- Local-first security controls and reproducible tests/artifacts.

## What was learned

Context quality is falsifiable: a failing test can prove a capsule incomplete. “Requested model” and “effective model” must remain separate. Token reduction is not guaranteed. Early runs lacked clean-profile provenance, so Kerno retained them as legacy-unverified evidence and rebuilt the matrix with auth-only profiles and hash-bound receipts. The Python task then failed in both strengthened conditions; keeping that result made the evaluation more honest.

## What is next

Repeat the current three-task case study to improve statistical confidence, validate Windows only if tested, and then explore optional parsers and embeddings without weakening evidence/invalidation semantics.

## Judge test field

```text
Zero-install replay: https://kerno-codex.vercel.app. It is a read-only deterministic replay with separately labeled real App Server evidence and receives no repository source. The hosted URL currently serves the prior validated comparison build; the current 16-run matrix is available through the local judge path. For local/plugin testing, use Node >=22.13 <25, npm, and Git; run npm install, npm run doctor, npm run judge, then open http://127.0.0.1:4173. Live mode requires a signed-in Codex CLI and is documented in docs/JUDGE_QUICKSTART.md. All replay/live/model/estimate/unavailable/fairness states are labeled in the UI.
```

## Plugin/developer-tool installation field

```text
Run npm run package:plugin and npm run plugin:smoke. Then run `codex plugin marketplace add .` and `codex plugin add kerno@personal`, refresh Codex, and start a new task. If cache-relative MCP launch fails, run npm run setup:judge for the documented project-scoped fallback.
```

## Supported-platform field

```text
Tested locally on macOS with Node 22.13. CI targets macOS/Linux on Node 22 and 24. Windows is not claimed. Replay needs no account; live orchestration requires Codex authentication and network/model capacity.
```

## Final authenticated-form checklist

- `[x]` Record exact authenticated field labels and IDs without editing the draft.
- `[ ]` Select Submitter Type and Country of Residence from the live form based on human confirmation.
- `[x]` Verify repository access signed out at `https://github.com/AmirmLotfy/kerno`.
- `[x]` Verify the public judge replay signed out at `https://kerno-codex.vercel.app`.
- `[ ]` Verify video public, signed out, English audio, and duration `< 3:00`.
- `[ ]` Add primary `/feedback` Session ID.
- `[ ]` Re-run clean-room and final validation from release commit.
- `[ ]` Confirm every metric matches retained artifacts.
- `[ ]` Obtain explicit user authorization before any Devpost write.
