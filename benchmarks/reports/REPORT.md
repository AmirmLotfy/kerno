# Kerno benchmark report

Generated: 2026-07-19T22:08:14.758Z

Recorded real runs: **8**. Missing values are unavailable, never zero.

| Task | Experiment | Baseline | Kerno | Fair |
|---|---|---:|---:|---|
| refund-debug | context-controlled | benchmark_1dwiafn | benchmark_19jkde7 | No — profile isolation unverified, profile evidence missing |

## Runs

| Run | Task | Condition | Status | Tests | Tokens | Latency | Review |
|---|---|---|---|---|---:|---:|---|
| benchmark_19jkde7 | refund-debug | codex-with-kerno-capsule | passed | Passed | 95383 | 107289 | passed |
| benchmark_1crq47p | refund-debug | codex-with-kerno-capsule | partial | Passed | 95206 | 95371 | failed |
| benchmark_1dbgx40 | refund-debug | plain-codex | partial | Passed | 113569 | 89044 | failed |
| benchmark_1dwiafn | refund-debug | plain-codex | passed | Passed | 93670 | 71922 | passed |
| benchmark_1yh5ycw | refund-debug | codex-with-kerno-capsule | partial | Passed | 115807 | 127116 | failed |
| benchmark_c5vvsi | refund-debug | plain-codex | partial | Passed | 110300 | 107059 | failed |
| benchmark_jkyxs4 | refund-debug | codex-with-kerno-capsule | partial | Passed | 134979 | 119785 | unavailable |
| benchmark_vqexyg | refund-debug | plain-codex | partial | Passed | 91587 | 77242 | failed |

No causal or generalized productivity claim is made without complete fair pairs and repeated runs.
