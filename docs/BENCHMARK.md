# Benchmark protocol and results

## Purpose

Kerno evaluates correctness first, then observed context behavior. Context-controlled runs pin the same live catalog model and reasoning effort in both conditions. The routing experiment is reported separately so model selection is not confused with capsule quality.

## Pre-registered tasks

| Task | Repository | Kind | Context-controlled result |
|---|---|---|---|
| `refund-debug` | original Apache-2.0 `relaycart-ts` | cross-module debugging | fair pair; both conditions passed 3 tests and review |
| `refund-transaction-change` | original Apache-2.0 `relaycart-ts` | interface/feature change | fair pair; both conditions passed 4 tests and review |
| `queue-retry-refactor` | original Apache-2.0 `gatehouse-python` | interface/refactor with tests | fair pair; both conditions failed the pinned test and had one review finding |

The fixtures are substantial original samples rather than copied third-party source. Their task manifests, acceptance commands, and Apache-2.0 license are checked in.

## Fairness and provenance

Each current pair records an immutable pair ID, identical task text, generated starting commit, branch, permissions, acceptance command, model ID, and reasoning effort. Each condition runs from an auth-only temporary Codex profile with no plugins, hooks, MCP configuration, or prior repository context. The profile evidence and task manifest are hashed. Tests, events, diff, review, receipt, and derived run records carry content hashes.

The Kerno condition receives only its deterministic task-conditioned capsule. It receives no hidden solution. Missing metrics are `null`, not zero. Exact cost is omitted. New runs refuse to overwrite an existing pair/condition artifact; retries require a new pair ID.

## Current context-controlled case study

All numbers below are actual retained App Server observations. They are a three-task case study with one run per condition, not a generalized productivity claim.

| Task | Outcome | Baseline tokens | Kerno tokens | Baseline tools | Kerno tools | Baseline latency | Kerno latency | Changed lines B/K |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| `refund-debug` | both passed 3 tests; 0 findings | 88,788 | 33,952 | 3 | 1 | 64,083 ms | 44,002 ms | 17 / 7 |
| `refund-transaction-change` | both passed 4 tests; 0 findings | 103,661 | 51,768 | 4 | 1 | 75,879 ms | 71,652 ms | 24 / 13 |
| `queue-retry-refactor` | both failed; 1 finding each | 103,783 | 50,757 | 3 | 1 | 79,175 ms | 81,317 ms | 23 / 15 |

Correctness-passing pairs: **2/3**. The unfavorable Python result is retained and displayed. Files opened, repeated reads, time to first valid patch, unnecessary changed lines, and stale-context mistakes are unavailable because the emitted events do not provide a defensible measurement for those fields.

## Separate full-system routing experiment

`pair_routing_refund_20260720` compares a plain default workflow with Kerno phase routing on `refund-debug`. Both conditions passed three tests and independent review.

| Metric | Plain default workflow | Kerno phase routing |
|---|---:|---:|
| Observed tokens | 82,053 | 50,800 |
| Tool calls | 3 | 1 |
| Inclusive latency | 203,095 ms | 102,717 ms |
| Changed lines | 16 | 7 |
| Reviewer findings | 0 | 0 |

Kerno requested `gpt-5.6-sol/low` for implementation and `gpt-5.6-sol/ultra` for final verification from the live catalog. Both phase turns completed. The runtime emitted no effective-model or reroute event, so the dashboard labels both requests **Requested — not independently confirmed**. This is not presented as proof that the requested model was effective.

## Retained history and known collection incident

Sixteen real runs are retained: eight strengthened artifact-derived runs and eight earlier legacy attempts. Legacy attempts remain `fairness unverified` because they predate immutable pair IDs, auth-only profile evidence, and artifact-bound receipts.

During validation, one timed-out full-system Kerno attempt was overwritten by a retry because the first harness version used a stable output directory. Its raw files are no longer available, so no metrics from that attempt are reported. The runner now refuses any overwrite before consuming model capacity. This limitation is disclosed rather than reconstructed from console output.

## Metric sources

- Tokens: `thread/tokenUsage/updated` only.
- Tool calls: completed command, MCP, collaboration, dynamic-tool, or web-search items.
- Expansion: immutable child-capsule events.
- Latency: monotonic process time from benchmark start through final review recording.
- Changed lines: Git numstat derived from the retained patch.
- Tests: exact allowlisted command, exit status, output, and hash.
- Reviewer findings: parseable fresh-thread JSON only.

## Reproduction

Live conditions consume Codex capacity. Use a new pair ID for each attempt:

```bash
npm run benchmark:live -- --baseline --experiment context-controlled --task refund-debug --pair-id pair_example_refund
npm run benchmark:live -- --kerno --experiment context-controlled --task refund-debug --pair-id pair_example_refund

npm run benchmark:live -- --baseline --experiment full-system --task refund-debug --pair-id pair_example_routing
npm run benchmark:live -- --kerno --experiment full-system --task refund-debug --pair-id pair_example_routing

npm run benchmark:sanitize
npm run benchmark:report
```

Outputs live under `benchmarks/recorded-results/live/`; JSON, CSV, Markdown, and dashboard exports live under `benchmarks/reports/`. `npm run demo:reset` regenerates the replay and dashboard data from retained artifacts.

## Interpretation

The strengthened matrix is complete and fairness-valid, but its sample size is one run per condition/task. Two tasks passed in both conditions; the Python task failed in both. The observed token/tool/line reductions are promising case-study observations, not population estimates. No exact monetary cost is claimed.
