# Judge quickstart

## Requirements

- Tested locally: macOS on Node 22.13.1, npm, Git.
- CI matrix: macOS/Linux, Node 22 and 24.
- Supported runtime range: Node `>=22.13 <25`.
- Windows: unverified and not claimed.
- Replay: no Codex authentication; network is needed only to install npm packages from an empty cache.
- Live mode: installed and signed-in Codex CLI, network access, and available account capacity.

Setup usually takes a few minutes on a warm npm cache; no duration is guaranteed. Replay generation and dashboard startup are normally seconds. Live Codex phases depend on model availability and capacity.

## Three-command judge path

### Zero-install replay

Open [https://itkerno.site](https://itkerno.site). This public deployment is a static, read-only rendering reproducibly generated from the checked-in fixture and separately labeled retained App Server evidence. It does not index a judge repository, execute Codex, upload source, or claim to be live. The local path below is the authoritative reproduction path for the current comparison matrix.

### Local product and plugin

```bash
npm install
npm run doctor
npm run judge
```

Open `http://127.0.0.1:4173`. The default is a reproducibly generated, read-only `DETERMINISTIC FIXTURE REPLAY`, created from real local indexing, a real pinned test failure, targeted expansion, passing pinned tests, and hash invalidation. It is not a recording of Codex model usage.

The dashboard follows the operating-system theme on first launch and offers a persistent Light/Dark control in the header. Both modes render the same evidence; theme changes never alter run or benchmark data.

Judge tour:

1. Home: repository identity, language mix, freshness, indexed files/symbols, outcome, and lifecycle.
2. Context: ranked items, excluded candidates, “Why included,” score breakdown, provenance, invalidation keys, and child capsule.
3. Routing: policy recommendation plus explicit unavailable/requested/effective distinctions.
4. Timeline: test failure, expansion, passing result, and stale capsule.
5. Comparison: three fairness-valid context pairs, the retained failed Python pair, and one separately labeled full-system routing pair.
6. Limits: measured, estimated, experimental, unavailable, replay/live, and platform labels.
7. Use `Judge state tour` to inspect every empty/loading/success/failure state.

Non-blocking check:

```bash
npm run judge -- --check
```

## Install the local Codex plugin

```bash
npm run package:plugin
npm run plugin:smoke
```

Install from the repository-local marketplace, refresh/restart Codex, and begin a new task:

```bash
codex plugin marketplace add .
codex plugin add kerno@personal
codex plugin list
```

The plugin contains the skill and cache-portable MCP executable/configuration.
Its process-scoped portable store prevents concurrent Codex hosts from overwriting one shared JSON file; durable cross-task state uses the daemon's SQLite store. The bundled smoke covers index → fresh status → task → capsule. Plugin Mode does not trust caller-supplied claims that tests passed; verified expansion in the judge replay is produced by the trusted local evaluation harness and is labeled as deterministic replay evidence. Orchestrator Mode binds phase/test/review events to retained App Server artifacts.

The reviewed hooks under `plugins/kerno/hooks/` are optional. Current plugin validation rejects an explicit manifest `hooks` field, so Kerno does not pretend they are auto-packaged. If cache-relative MCP execution fails, run:

```bash
npm run setup:judge
```

Then follow the printed project-scoped MCP path. Ask Codex:

> Use Kerno to diagnose this task with the smallest verified context. Explain every inclusion and expand only from test evidence.

Plugin Mode recommends models only. It cannot silently switch the parent task; use `/model` and `/reasoning` transparently.

## Live Orchestrator path

```bash
codex --version
codex app-server generate-json-schema --out .kerno-cache/app-server-schema
npm run test:app-server:live
npm run judge:live
```

This calls live `model/list`, requests only supported effort values, consumes real capacity, and writes sanitized evidence. “Requested” is not presented as “Effective” without a runtime event. Authentication, capacity, or App Server unavailability produces an actionable failure and leaves replay available.

Final validation discovered four catalog entries, accepted a `gpt-5.6-sol`/`low` request, completed the turn, and recorded usage. No effective-model or reroute event was emitted, so Kerno truthfully retains the route as `requested-unconfirmed` rather than claiming which model executed it.

## Troubleshooting

- Unsupported Node/native SQLite error: use Node 22.13+ or 24 LTS and rerun `npm install`.
- Plugin not visible: confirm marketplace path, rebuild the bundle, reinstall/refresh, and start a new task.
- MCP bundle missing: `npm run package:plugin`.
- App Server auth/capacity failure: keep the result unavailable and use replay; do not retry indefinitely.
- Port 4173 busy: stop the conflicting local process or run `npm run build --workspace @kerno/dashboard` and select another Vite preview port.
- Stale database: run the CLI with a new explicit `--data` directory; do not delete an unknown directory.

## Cleanup and uninstall

Uninstalling intentionally preserves Kerno state. Inspect/export before deleting:

```bash
codex plugin remove kerno@personal
node packages/cli/dist/main.cjs data-export --root . --data .kerno --out kerno-export.json
node packages/cli/dist/main.cjs data-delete --root . --data .kerno --yes
```

`data-delete` refuses broad or non-Kerno-owned paths.

## Clean-room record

**Passed on July 19, 2026 at 5:32 PM PDT** from product commit `1f71d4d0dbb0776313ef1b91d6ed6507cc83a790` in a fresh, non-hardlinked macOS clone on Node 22.13.1. The clone ran:

```bash
npm ci
npm run doctor
npm run judge -- --check
npm test
npm run build
npm run audit:secrets
npm run audit:licenses
npm run audit:links
npm audit --audit-level=high
npm run test:e2e
npm run test:a11y
npm run package:plugin
npm run plugin:smoke
npm run demo:preflight
```

Result: 354 packages installed with zero vulnerabilities; doctor/storage/plugin bundle passed; the judge replay built; 66 deterministic tests passed; seven full Playwright flows plus three focused accessibility flows passed; all workspaces built; brand, 20-pair contrast, secret, 320-package license, 30-file local-link, dependency, package, replay-preflight, and 13-tool MCP smoke gates passed. Generated replay/report files changed inside the isolated clone by design and were not copied back. Linux remains CI-configured but not locally exercised in this report.
