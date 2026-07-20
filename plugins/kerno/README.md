# Kerno Codex plugin

Kerno packages the context skill, reviewable advisory hook definitions, and a local STDIO MCP server. The MCP server also contains a self-contained MCP Apps component resource, but the current plugin does **not** declare an `apps` manifest because no ChatGPT developer-mode app ID or streaming HTTPS MCP endpoint has been registered. Current plugin validation rejects an explicit `hooks` manifest field, so hook activation is optional and separate from the working skill/MCP path. Plugin Mode builds and explains context and recommends model/effort choices; it does not silently switch the active parent task model.

From the repository root run `npm install`, `npm run package:plugin`, then install Kerno from the repository marketplace at `.agents/plugins/marketplace.json`. Review the hook definitions, refresh Codex, and start a new task.

Uninstalling the plugin preserves local Kerno data. Use the repository CLI’s explicit export/delete commands to manage that data.

Kerno’s Context Core launcher, light/dark wordmarks, monochrome marks, social/marketing art, and product screenshots are generated from the canonical `@kerno/brand` package. Codex-facing plugin surfaces use only the container-free Context Core: the simplified micro icon in the composer and the full light/dark icon variants on the plugin card. Contained launcher assets remain reserved for launcher and favicon contexts.

## What appears inside Codex today

The installed plugin contributes a Kerno card, starter prompts, the Kerno Context skill, and 16 structured MCP tools. In a new task, `kerno_render_panel` currently returns structured onboarding, repository, capsule, routing, timeline, and settings state as a tool result. It does **not** currently render an inline visual panel.

The repository contains a browser-tested component resource designed to include:

- first-run local-first onboarding;
- repository/index overview;
- context capsule and “Why included” inspector;
- recommendation/request/effective-model truth labels;
- observed event timeline;
- settings for the real capsule budget, expansion ceiling, routing preference, theme, density, and estimate visibility.

The component is supplied as a standard `text/html;profile=mcp-app` resource and reads only structured, redacted Kerno tool output. It makes no network requests and cannot silently switch the active parent model. Its host harness passes, but that does not prove Codex host rendering.

The working visual product surface is the React dashboard available through `npm run judge` and at [itkerno.site](https://itkerno.site) for the read-only replay.

To enable genuine inline UI, Kerno must expose a streaming HTTPS MCP endpoint (or a development tunnel), be created as a developer-mode app, receive a real `plugin_asdk_app…` identifier, add `.app.json` plus the plugin manifest `apps` field, and then be reinstalled. Kerno will not invent that ID or claim host rendering before this path is completed and observed.

The plugin exposes 16 tools: the original 13 repository/context/routing tools plus `kerno_get_settings`, `kerno_update_settings`, and `kerno_render_panel`. Run state remains process-scoped for safe plugin-cache portability; onboarding and experience settings use a separate owner-controlled atomic store so they survive fresh tasks without merging unrelated run state.
