# Tool approvals

Status, explanation, and impact analysis are read-only. Indexing reads repository files and writes Kerno’s local database. Task analysis, capsule creation, outcomes, decisions, routing, and comparison write only local Kerno state. Applying manual invalidation requires a non-dry-run call and explicit user intent.

`kerno_discover_models` starts the local Codex App Server with a fixed command, returns a sanitized live catalog snapshot, and may consume authenticated account capacity. It does not execute repository text or switch the current parent task. `kerno_route_task` remains a recommendation until an explicit Orchestrator turn accepts the selection, and the model remains requested-unconfirmed unless runtime evidence establishes an effective model or reroute.

The thirteen P0 tools are: `kerno_index_repository`, `kerno_repository_status`, `kerno_analyze_task`, `kerno_build_context_capsule`, `kerno_expand_context`, `kerno_explain_context`, `kerno_impact_analysis`, `kerno_record_decision`, `kerno_record_outcome`, `kerno_invalidate_context`, `kerno_discover_models`, `kerno_route_task`, and `kerno_compare_runs`.
