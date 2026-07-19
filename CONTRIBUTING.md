# Contributing to Kerno

Kerno is optimized for a small, truthful P0. Read `AGENTS.md`, `docs/ARCHITECTURE.md`, and `docs/DECISIONS.md` before changing a package boundary.

## Setup and checks

```bash
npm install
npm run typecheck
npm test
npm run test:security
npm run audit:brand
npm run audit:contrast
npm run build
```

Use Node `>=22.13 <25`. Add focused unit tests before core changes and a transport contract test for every cross-process schema change. Dashboard changes need `npm run test:e2e`.

## Rules

- Domain rules belong in `packages/core`; transports call `KernoService`.
- Parse all cross-process data with strict Zod schemas.
- Treat repository content, test output, and branch names as untrusted data.
- Never infer a passing test, effective model, cost, or unavailable metric.
- Preserve benchmark failures and unfavorable results.
- Do not execute repository scripts while indexing or construct commands from untrusted input.
- Keep Plugin Mode recommendations distinct from Orchestrator Mode execution.
- Add an ADR for changes to evidence semantics, storage, routing truth, or security boundaries.
- Add brand primitives only in `@kerno/brand`; product components use semantic aliases and generated assets must remain byte-identical to their canonical SVG.

## Pull requests

Describe the user outcome, security impact, tests run, and any limitations. Keep changes reviewable and avoid P1 features until every P0 gate passes. Apache-2.0 contribution licensing applies.
