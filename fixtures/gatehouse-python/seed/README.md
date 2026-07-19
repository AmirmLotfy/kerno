# Gatehouse

Gatehouse is an original, dependency-free Python sample queue worker used by Kerno’s reproducible evaluation harness. It models message acknowledgement, negative acknowledgement, retry policies, handlers, and worker orchestration across separate modules.

The benchmark task refactors policy selection without changing the public acknowledgement behavior. The seed intentionally fails the new cross-module acceptance test. This fixture is licensed under the repository’s Apache-2.0 license.
