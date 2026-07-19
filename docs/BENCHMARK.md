# Benchmark protocol and results

## Purpose

Kerno evaluates correctness first, then observed context behavior. It separates a context-controlled experiment from a routing experiment so model choice is not confused with capsule quality.

## Pre-registered tasks

| Task | Repository | Kind | Current status |
|---|---|---|---|
| `refund-debug` | original Apache-2.0 `relaycart-ts` | cross-module debugging | one real paired run retained |
| `queue-retry-refactor` | original Apache-2.0 `gatehouse-python` | interface/refactor with tests | deterministic fixture and tests complete; no App Server pair yet |
| `refund-transaction-change` | `relaycart-ts` | feature/test addition | manifest only; pinned live pair incomplete |

At least three paired task runs are required before final release. No third-party/open-source repository is checked in; the substantial Python fixture is original and license-safe. This avoids an unverified license/source dependency, but does not waive the three-task requirement.

## Fairness

Context-controlled pairs use the same task text, generated starting commit, branch, permissions, acceptance commands, live catalog model ID, and reasoning effort. The Kerno condition receives only a task-conditioned capsule and child evidence; it receives no hidden solution. The baseline profile must not have the Kerno plugin installed. Routing experiments are reported separately.

All attempts, failures, timeouts, and unfavorable results remain. Missing events are `null`; exact cost is omitted. Source commits are deterministic local fixture commits because benchmark worktrees are generated at run time with fixed author/date metadata.

## Recorded real pair: refund-debug

- Conditions: `plain-codex`, `codex-with-kerno-capsule`.
- Runtime: Codex App Server, macOS arm64, Node v22.13.1.
- Requested model/effort: `gpt-5.6-sol` / `low`, selected from live `model/list`.
- Effective model: not independently confirmed; no effective/reroute event was observed.
- Outcome: both pinned test suites passed; both final statuses are `partial` because independent review evidence was incomplete.
- Fairness validation: passed with no mismatches.

| Measured metric | Plain Codex | Kerno | Interpretation |
|---|---:|---:|---|
| Total observed thread tokens | 91,587 | 134,979 | Kerno worse in this pair |
| Unique observable files | 6 | 2 | Kerno narrower |
| Repeated observable reads | 2 | 0 | Kerno fewer |
| Tool calls | 11 | 18 | Kerno worse |
| Context expansions | 0 | 1 | expected proof loop |
| Latency | 77,242 ms | 119,785 ms | Kerno worse |
| Changed lines | 16 | 16 | equal |
| Unnecessary changed lines | unavailable | unavailable | not inferred |
| Reviewer findings | 2 | unavailable | not comparable |

This single pair is a case study, not a performance claim. Files/reads cover observable command events and may undercount internal runtime reads. The baseline reviewer phase failed; Kerno review was unavailable. Those limitations prevent a pass status.

## Metric sources

- Tokens: `thread/tokenUsage/updated` only.
- Files/repeated reads: canonical paths observed in completed command/tool items; coverage disclosed.
- Tool calls: completed App Server item events.
- Expansion: immutable child-capsule events.
- Latency: monotonic process time from run start to terminal recording.
- Changed lines: Git numstat.
- Test status: exact command, exit status, output hash.
- Reviewer findings: parseable fresh-thread JSON only.

## Reproduction

Use a signed-in Codex CLI. Running live conditions consumes real capacity.

```bash
# Remove Kerno from the benchmark profile before baseline.
KERNO_BENCHMARK_TIMEOUT_MS=120000 npm run benchmark:live -- --baseline

# Reinstall/enable Kerno before its condition.
KERNO_BENCHMARK_TIMEOUT_MS=120000 npm run benchmark:live -- --kerno

npm run benchmark:sanitize
npm run benchmark:report
```

Outputs: nested run JSON/events/diff/test/review artifacts under `benchmarks/recorded-results/live/`, plus JSON, CSV, Markdown, and dashboard data under `benchmarks/reports/`.

## Release blocker

The harness exports the required formats and one real fair pair, but the three-task matrix and separate routing experiment are not complete. Kerno is not benchmark-complete or submission-ready until those runs are retained and reported without cherry-picking.
