# Kerno Codex plugin

Kerno packages the context skill, reviewable advisory hook definitions, a local STDIO MCP server, and a self-contained MCP Apps interface. Current plugin validation rejects an explicit `hooks` manifest field, so hook activation is optional and separate from the working skill/MCP path. Plugin Mode builds and explains context and recommends model/effort choices; it does not silently switch the active parent task model.

From the repository root run `npm install`, `npm run package:plugin`, then install Kerno from the repository marketplace at `.agents/plugins/marketplace.json`. Review the hook definitions, refresh Codex, and start a new task.

Uninstalling the plugin preserves local Kerno data. Use the repository CLI’s explicit export/delete commands to manage that data.

Kerno’s Context Core launcher, light/dark wordmarks, monochrome marks, social/marketing art, and product screenshots are generated from the canonical `@kerno/brand` package. Codex-facing plugin surfaces use only the container-free Context Core: the simplified micro icon in the composer and the full light/dark icon variants on the plugin card. Contained launcher assets remain reserved for launcher and favicon contexts.

## What appears inside Codex

On MCP Apps-compatible Codex desktop surfaces, `kerno_render_panel` renders a real Kerno component inline with the task. It includes:

- first-run local-first onboarding;
- repository/index overview;
- context capsule and “Why included” inspector;
- recommendation/request/effective-model truth labels;
- observed event timeline;
- settings for the real capsule budget, expansion ceiling, routing preference, theme, density, and estimate visibility.

The component is supplied as a standard `text/html;profile=mcp-app` resource and reads only structured, redacted Kerno tool output. It makes no network requests and cannot silently switch the active parent model. Unsupported hosts and the terminal CLI fall back to the same structured tool result in text form.

The larger React dashboard remains available through `npm run judge` for the full replay, benchmark comparison, and presentation-oriented judge tour. It is complementary to the embedded tracker, not a fake substitute for it.

The plugin exposes 16 tools: the original 13 repository/context/routing tools plus `kerno_get_settings`, `kerno_update_settings`, and `kerno_render_panel`. Run state remains process-scoped for safe plugin-cache portability; onboarding and experience settings use a separate owner-controlled atomic store so they survive fresh tasks without merging unrelated run state.
