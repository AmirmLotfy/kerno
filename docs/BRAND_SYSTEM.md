# Kerno brand system

Kerno’s visual identity is warm, engineered, editorial, and local-first. It avoids the blue/cyan/teal language of generic AI products and reserves semantic color for actual status.

## Context Core

The Context Core symbol contains three levels of repository knowledge: an outer repository layer, a selected-context layer, and a compact verified core. A detached oxide segment represents removing noise and extracting only what the task needs. The negative space is suggestive without becoming a typographic K.

The base mark is flat, container-free, gradient-free, shadow-free, and readable at 16 px. The favicon, launcher, and social avatar are the only approved container applications. Base variants contain no text; the horizontal wordmark uses a restrained neo-grotesk system stack.

## Canonical palette

| Role | Token | Value |
|---|---|---|
| Primary accent | `--kerno-orange-500` | `#E85D2A` |
| Primary dark | `--kerno-graphite-900` | `#1C1B1A` |
| Background | `--kerno-ivory` | `#F7F3EC` |
| Card surface | `--kerno-surface` | `#FFFDF9` |
| Muted surface | `--kerno-surface-muted` | `#F0EBE3` |
| Border | `--kerno-stone` | `#DCD4C9` |
| Secondary accent | `--kerno-aubergine-500` | `#673A52` |

The full orange, graphite, stone, aubergine, semantic, dark, and chart ramps live in `packages/brand/src/tokens.css` and have typed equivalents in `packages/brand/src/index.ts`.

## Semantic API

Components use `background`, `surface`, `surfaceRaised`, `surfaceMuted`, `textPrimary`, `textSecondary`, `textMuted`, `border`, `borderStrong`, `brandPrimary`, `brandPrimaryHover`, `brandPrimarySoft`, `brandSecondary`, `brandSecondarySoft`, `focus`, `success`, `warning`, `error`, and `info` through the CSS names `--color-*`. Context expansion has its own light/dark alias because a pale apricot surface is not legible in dark mode.

Green is used only for passing tests, healthy validation, or confirmed completion. Measured data uses graphite, experimental behavior uses aubergine, estimates use oxide, and unavailable data uses a dashed warm-gray treatment.

## Product-state mapping

- Primary action, selected capsule, active route, and Kerno comparison series: oxide orange.
- Planned route: stone rule and an explicit `planned` label.
- Completed route: graphite rule plus completion text/icon where supported.
- Independent reviewer and review evidence: aubergine.
- Context expansion: apricot/oxide with explicit expansion copy.
- Invalidation/stale state: semantic warning with a persistent text label.
- Baseline: warm-gray hatch plus `Plain Codex baseline`; Kerno: solid oxide plus `Kerno`.
- Local-first/privacy: graphite and text, not green.

## Theme behavior

Light mode uses ivory background, soft-white surfaces, graphite text, stone borders, and low-opacity neutral shadows. Dark mode uses warm near-black, brown-charcoal raised surfaces, ivory text, oxide active states, and softened aubergine reviewer states. The dashboard follows system preference on first launch and stores only the explicit local theme choice.

## Accessibility

- All required normal-text pairs meet WCAG AA at 4.5:1 or better.
- Focus/non-text indicators meet 3:1 or better.
- Oxide CTA surfaces use graphite labels; orange text uses the darker 700 token in light mode.
- Dark semantic foregrounds are dedicated accessible variants rather than the darker light-theme values.
- Status and chart series include labels, borders, hatching, icons, or checks; color is never the sole signal.
- Interactive controls target at least 44×44 CSS pixels and reduced motion is honored.

Run `npm run audit:contrast`, `npm run audit:brand`, and `npm run test:a11y` to validate these rules.

## Asset inventory

Canonical vectors are in `packages/brand/assets/`. `npm run brand:assets` generates synchronized plugin/dashboard/documentation copies and raster favicon, launcher, avatar, Open Graph, and Devpost deliverables. Do not hand-edit generated mirrors.

Approved preview paths:

- Light dashboard: `docs/assets/screenshots/dashboard-context-light.png`
- Dark dashboard: `docs/assets/screenshots/dashboard-context-dark.png`
- Open Graph: `docs/assets/brand/kerno-open-graph.png`
- Devpost 3:2 thumbnail: `docs/assets/brand/kerno-devpost-thumbnail.png`
- Social avatar: `docs/assets/brand/social-avatar.png`
