# Kerno Codex plugin

Kerno packages the context skill, reviewable advisory hook definitions, and a local STDIO MCP server. Current plugin validation rejects an explicit `hooks` manifest field, so hook activation is optional and separate from the working skill/MCP path. Plugin Mode builds and explains context and recommends model/effort choices; it does not silently switch the active parent task model.

From the repository root run `npm install`, `npm run package:plugin`, then install Kerno from the repository marketplace at `.agents/plugins/marketplace.json`. Review the hook definitions, refresh Codex, and start a new task.

Uninstalling the plugin preserves local Kerno data. Use the repository CLI’s explicit export/delete commands to manage that data.

Kerno’s Context Core launcher, light/dark wordmarks, monochrome marks, social/marketing art, and product screenshots are generated from the canonical `@kerno/brand` package. The manifest uses the contained launcher for the plugin surface and separate container-free horizontal marks for light and dark presentation.

## What appears inside Codex

On supported Codex plugin surfaces, Kerno provides its branded directory card and details page, three starter prompts, the `kerno-context` skill, structured MCP tools, approval annotations, and reviewable optional hooks. The dashboard remains a local web product surface opened by `npm run judge`; it is not presented as an embedded Codex panel.

OpenAI supports optional custom ChatGPT UI for an MCP-backed app through the Apps SDK. That would be a separate app layer with decoupled tools and rendering, not a cosmetic toggle on this local plugin. Kerno keeps that enhancement outside the release-candidate path until its inspection workflow and host support can be tested end to end.
