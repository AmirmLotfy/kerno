# Kerno submission image set

These images are captures of the running local Kerno dashboard. They are not design mockups. The fixture views are persistently labeled **DETERMINISTIC FIXTURE REPLAY**; the routing-evidence capture includes a separate **RECORDED REAL APP SERVER RUN** panel. The two evidence sources must not be described as one live run.

## Recommended Devpost gallery order

1. [`kerno-real-home.png`](assets/submission/kerno-real-home.png) — repository identity, recorded task, index state, test outcome, and lifecycle evidence.
2. [`kerno-real-context-capsule.png`](assets/submission/kerno-real-context-capsule.png) — bounded 2,500-token capsule, ranked evidence, provenance, score, freshness, and confidence.
3. [`kerno-real-expansion-invalidation.png`](assets/submission/kerno-real-expansion-invalidation.png) — failing test, targeted child-capsule expansion, passing tests, and stale-context invalidation in one evidence chain.
4. [`kerno-real-routing-evidence.png`](assets/submission/kerno-real-routing-evidence.png) — replay recommendation separated from a retained real App Server turn. The real panel records four discovered models, the requested `gpt-5.6-sol / low` route, completed turn status, observed token usage, and the truthful `requested-unconfirmed` runtime label.

## Supporting captures

- [`kerno-real-context-full.png`](assets/submission/kerno-real-context-full.png) — full-height capsule inspector.
- [`kerno-real-routing.png`](assets/submission/kerno-real-routing.png) — routing-policy overview.
- [`kerno-real-routing-full.png`](assets/submission/kerno-real-routing-full.png) — full-height routing view.
- [`kerno-real-evidence-timeline.png`](assets/submission/kerno-real-evidence-timeline.png) — top of the evidence timeline.

## Thumbnail and social assets

- Devpost 3:2 thumbnail: [`kerno-devpost-thumbnail.png`](assets/brand/kerno-devpost-thumbnail.png)
- Open Graph image: [`kerno-open-graph.png`](assets/brand/kerno-open-graph.png)
- Social avatar: [`social-avatar.png`](assets/brand/social-avatar.png)

The thumbnail is an original vector-derived marketing asset, not a product screenshot. It contains no benchmark number or third-party model logo.

## Truthful captions

- **Home:** “Kerno indexes an unfamiliar repository, builds a bounded context capsule, and preserves the evidence chain from failure to verified fixture behavior.”
- **Context:** “Every selected item carries a score breakdown, provenance, freshness, confidence, estimated token cost, and invalidation conditions.”
- **Expansion:** “A real fixture test failure names the missing transaction boundary; Kerno adds only that evidence, reruns the pinned tests, and later invalidates the stale parent capsule.”
- **Routing:** “Kerno separates policy recommendation, requested model, effective-model evidence, and result. The retained App Server turn completed, but no effective/reroute event was emitted, so the model remains requested-unconfirmed.”

Do not caption the fixture replay as live Codex execution, do not call the requested model effective, and do not infer benchmark improvement from an unavailable comparison.
