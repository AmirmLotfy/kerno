# Kerno visual identity audit and migration

Audit date: 2026-07-19. Scope: tracked dashboard, plugin, manifest, documentation, screenshot, metadata, and submission assets. Generated `dist/`, dependency contents, and immutable benchmark evidence were inspected for exposure but are not editable brand sources.

## Baseline inventory

The pre-migration repository had exactly four editable color sources:

| Source | Findings |
|---|---|
| `apps/dashboard/src/styles.css` | 19 raw hex values, including general-purpose blue and green variables, warm-but-noncanonical neutrals, inline focus colors, chart-like signal bars, status backgrounds, and the K letter treatment |
| `apps/dashboard/index.html` | One stale warm background value in `theme-color`; no favicon or Open Graph metadata |
| `plugins/kerno/assets/icon.svg` and `logo.svg` | Generic typographic K, graphite/orange values outside the approved system, and an enclosed icon treatment used as the only mark |
| `plugins/kerno/.codex-plugin/plugin.json` | Stale brand color and one logo reused for both light and dark surfaces |

There were no Tailwind color classes, chart-library theme files, RGB/HSL values, user-facing gradients, documentation images beyond the dashboard screenshot, social assets, Open Graph art, or Devpost thumbnail. The dashboard screenshot therefore inherited every obsolete source value.

Baseline raw colors: `#171612`, `#191814`, `#246a50`, `#345d73`, `#654b3e`, `#6d685e`, `#93411f`, `#9b3f34`, `#c9c1b1`, `#d9d2c4`, `#dce7eb`, `#dce9df`, `#e7dfcf`, `#e8e2d7`, `#eee7da`, `#ef6837`, `#efdad5`, `#f36b32`, `#f3efe5`, `#f7dfd1`, `#fbf8ef`, and `#fffaf0`.

## Migration plan and result

1. Establish `@kerno/brand` as the only editable primitive, semantic, dark-theme, and chart-token source.
2. Make the dashboard consume semantic aliases rather than raw colors.
3. Replace the K with the container-free Context Core; use a graphite container only for favicon, launcher, and avatar contexts.
4. Generate plugin, dashboard, documentation, social, Open Graph, and Devpost copies from canonical SVGs and hash-check mirrors.
5. Map measured, estimated, experimental, unavailable, success, warning, error, expansion, invalidation, active route, and reviewer states by label and geometry as well as color.
6. Add explicit light/dark switching with a warm graphite dark theme.
7. Regenerate real dashboard screenshots and update metadata/manifest references.
8. Enforce contrast, asset integrity, broken references, and obsolete-color absence in automated checks.

Status: implemented. `npm run audit:brand` rejects every baseline color, raw component color, missing required asset, noncanonical plugin mirror, broken manifest reference, and text/filter/gradient inside base icon variants.
