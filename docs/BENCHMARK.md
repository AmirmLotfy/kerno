# Benchmark methodology

Three pinned tasks cover duplicate-refund debugging, a cross-module transaction change, and a Python retry-policy refactor. Manifests freeze prompt, fixture state, permissions, model class, acceptance behavior, and module allowlist before recording.

Two experiments are distinct:

1. Context-controlled: identical model ID/effort, prompt, commit, permissions, and tests; plain Codex versus Kerno capsule.
2. Full-system: plain default single-model flow versus Kerno phase routing; labeled system-level, not causal context-only evidence.

Raw JSONL events, test output, diff, manifest, and report receive SHA-256 hashes. All final runs, including failures, are retained. Metrics derive only from observable artifacts. Missing data is null/“Not observed,” never zero. Cost is omitted without verified prices and billable usage.

`npm run demo:record` records a deterministic fixture replay only. It proves indexing/capsule/expansion/test/invalidation behavior and explicitly does not serve as a Codex baseline comparison. Live comparative numbers are not publishable until both pinned conditions are recorded.
