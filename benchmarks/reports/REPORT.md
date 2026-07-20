# Kerno benchmark report

Generated: 2026-07-20T00:30:02.116Z

Recorded real runs: **16**. Missing values are unavailable, never zero.

| Pair | Task | Experiment | Baseline | Kerno | Fair |
|---|---|---|---:|---:|---|
| pair_queue_retry_20260720 | queue-retry-refactor | context-controlled | benchmark_155679cdfedd10341a6487e8fd6d81e0 | benchmark_241d4ecb22537b8de3bce91638935875 | Yes |
| pair_routing_refund_20260720 | refund-debug | full-system | benchmark_18d8e89f8d2f148f9fac43a81e725033 | benchmark_e438933536c5e86176d9a984c069da92 | Yes |
| Unpaired legacy | refund-debug | context-controlled | benchmark_1dwiafn | benchmark_19jkde7 | No — immutable pair ID missing, duplicate condition in pair, artifact-derived provenance missing, profile isolation unverified, profile evidence missing |
| pair_refund_receipt_20260720 | refund-transaction-change | context-controlled | benchmark_a3fba40f3b886e3555cd281ec9beb493 | benchmark_2279dc4b712d446bc94ed475b46762a7 | Yes |
| pair_refund_debug_20260720 | refund-debug | context-controlled | benchmark_fd147c1a5358ee986ffaf2667e0680ff | benchmark_f2002f3691bab70a1276d6f5404f2df1 | Yes |

## Runs

| Run | Pair | Provenance | Task | Condition | Status | Tests | Tokens | Inclusive latency | Review |
|---|---|---|---|---|---|---|---:|---:|---|
| benchmark_155679cdfedd10341a6487e8fd6d81e0 | pair_queue_retry_20260720 | artifact-derived | queue-retry-refactor | plain-codex | failed | Failed | 103783 | 79175 | failed |
| benchmark_18d8e89f8d2f148f9fac43a81e725033 | pair_routing_refund_20260720 | artifact-derived | refund-debug | plain-default-workflow | passed | Passed | 82053 | 203095 | passed |
| benchmark_19jkde7 | Unpaired | legacy-unverified | refund-debug | codex-with-kerno-capsule | passed | Passed | 95383 | 107289 | passed |
| benchmark_1crq47p | Unpaired | legacy-unverified | refund-debug | codex-with-kerno-capsule | partial | Passed | 95206 | 95371 | failed |
| benchmark_1dbgx40 | Unpaired | legacy-unverified | refund-debug | plain-codex | partial | Passed | 113569 | 89044 | failed |
| benchmark_1dwiafn | Unpaired | legacy-unverified | refund-debug | plain-codex | passed | Passed | 93670 | 71922 | passed |
| benchmark_1yh5ycw | Unpaired | legacy-unverified | refund-debug | codex-with-kerno-capsule | partial | Passed | 115807 | 127116 | failed |
| benchmark_2279dc4b712d446bc94ed475b46762a7 | pair_refund_receipt_20260720 | artifact-derived | refund-transaction-change | codex-with-kerno-capsule | passed | Passed | 51768 | 71652 | passed |
| benchmark_241d4ecb22537b8de3bce91638935875 | pair_queue_retry_20260720 | artifact-derived | queue-retry-refactor | codex-with-kerno-capsule | failed | Failed | 50757 | 81317 | failed |
| benchmark_a3fba40f3b886e3555cd281ec9beb493 | pair_refund_receipt_20260720 | artifact-derived | refund-transaction-change | plain-codex | passed | Passed | 103661 | 75879 | passed |
| benchmark_c5vvsi | Unpaired | legacy-unverified | refund-debug | plain-codex | partial | Passed | 110300 | 107059 | failed |
| benchmark_e438933536c5e86176d9a984c069da92 | pair_routing_refund_20260720 | artifact-derived | refund-debug | kerno-phase-routing | passed | Passed | 50800 | 102717 | passed |
| benchmark_f2002f3691bab70a1276d6f5404f2df1 | pair_refund_debug_20260720 | artifact-derived | refund-debug | codex-with-kerno-capsule | passed | Passed | 33952 | 44002 | passed |
| benchmark_fd147c1a5358ee986ffaf2667e0680ff | pair_refund_debug_20260720 | artifact-derived | refund-debug | plain-codex | passed | Passed | 88788 | 64083 | passed |
| benchmark_jkyxs4 | Unpaired | legacy-unverified | refund-debug | codex-with-kerno-capsule | partial | Passed | 134979 | 119785 | unavailable |
| benchmark_vqexyg | Unpaired | legacy-unverified | refund-debug | plain-codex | partial | Passed | 91587 | 77242 | failed |

No causal or generalized productivity claim is made without complete fair pairs and repeated runs.
