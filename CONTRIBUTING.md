# Contributing

Use Node 22.13+ or 24 LTS and `npm install`. Read `AGENTS.md` before changing code.

Keep domain rules in `packages/core`, validate process boundaries with strict Zod schemas, treat repository input as untrusted, and retain failing benchmark artifacts. Add focused tests and run `npm run typecheck && npm test` before opening a change.

Do not introduce hosted dependencies, telemetry, embeddings, or new language parsers into P0 without an explicit delivery decision. Contributions are accepted under Apache-2.0.
