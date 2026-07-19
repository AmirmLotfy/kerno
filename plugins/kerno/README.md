# Kerno Codex plugin

Kerno packages the context skill, reviewable advisory hook definitions, and a local STDIO MCP server. Current plugin validation rejects an explicit `hooks` manifest field, so hook activation is optional and separate from the working skill/MCP path. Plugin Mode builds and explains context and recommends model/effort choices; it does not silently switch the active parent task model.

From the repository root run `npm install`, `npm run package:plugin`, then install Kerno from the repository marketplace at `.agents/plugins/marketplace.json`. Review the hook definitions, refresh Codex, and start a new task.

Uninstalling the plugin preserves local Kerno data. Use the repository CLI’s explicit export/delete commands to manage that data.

Kerno’s Context Core launcher, light/dark wordmarks, monochrome marks, social/marketing art, and product screenshots are generated from the canonical `@kerno/brand` package. The manifest uses the contained launcher for the plugin surface and separate container-free horizontal marks for light and dark presentation.
