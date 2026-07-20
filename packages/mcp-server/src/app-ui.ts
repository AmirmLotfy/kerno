import { kernoAppTokenCss } from "@kerno/brand";

export const KERNO_APP_RESOURCE_URI = "ui://kerno/run-panel.html";

export function buildKernoAppHtml(): string {
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Kerno run panel</title>
  <style>
    ${kernoAppTokenCss}
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: var(--background); color: var(--text-primary); }
    body { font-family: "Avenir Next", "Helvetica Neue", ui-sans-serif, sans-serif; font-size: 14px; }
    button, input, select { font: inherit; }
    button, select, input { color: inherit; }
    button:focus-visible, select:focus-visible, input:focus-visible { outline: 3px solid var(--brand-primary); outline-offset: 2px; }
    .app { width: 100%; min-height: 320px; background: var(--surface); border: 1px solid var(--border-strong); box-shadow: 0 14px 38px var(--shadow); }
    .masthead { display: grid; grid-template-columns: 1fr auto; align-items: center; min-height: 64px; padding: 12px 16px; border-bottom: 1px solid var(--border-strong); background: var(--surface); }
    .brand { display: inline-flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 680; letter-spacing: -.035em; }
    .mark { width: 30px; height: 30px; color: var(--text-primary); flex: 0 0 auto; }
    .mark .extract, .mark .core { color: var(--brand-primary); }
    .masthead-actions { display: flex; gap: 8px; }
    .icon-button, .button { border: 1px solid var(--border-strong); background: var(--surface); min-height: 38px; padding: 0 12px; cursor: pointer; font-weight: 650; }
    .icon-button:hover, .button:hover { background: var(--surface-muted); }
    .button.primary { background: var(--brand-primary); border-color: var(--brand-primary); color: var(--on-brand-primary); }
    .button.primary:hover { background: var(--brand-primary-hover); }
    .button.secondary { border-color: var(--text-secondary); }
    .button:disabled { cursor: not-allowed; opacity: .55; }
    .truthbar { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; min-height: 40px; padding: 8px 16px; border-bottom: 1px solid var(--border); background: var(--brand-primary-soft); font-size: 11px; }
    .truthbar strong { text-transform: uppercase; letter-spacing: .08em; }
    .truthbar span:last-child { color: var(--text-muted); }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--brand-primary); }
    .tabs { display: flex; gap: 22px; overflow-x: auto; padding: 0 16px; border-bottom: 1px solid var(--border); background: var(--surface); }
    .tab { min-height: 44px; border: 0; border-bottom: 3px solid transparent; background: transparent; padding: 0; cursor: pointer; color: var(--text-secondary); white-space: nowrap; }
    .tab[aria-selected="true"] { color: var(--text-primary); border-bottom-color: var(--brand-primary); font-weight: 700; }
    .content { padding: clamp(16px, 3.5vw, 30px); }
    .eyebrow, .label { color: var(--text-muted); font: 750 10px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; text-transform: uppercase; letter-spacing: .1em; }
    h1, h2, h3, p { margin-top: 0; }
    h1 { max-width: 680px; margin-bottom: 14px; font-size: clamp(28px, 5vw, 48px); line-height: 1.02; letter-spacing: -.05em; }
    h2 { font-size: 20px; letter-spacing: -.025em; }
    h3 { font-size: 13px; }
    p { color: var(--text-secondary); line-height: 1.55; }
    code, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .hero { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(230px, .7fr); gap: 30px; align-items: end; }
    .hero-actions { display: flex; gap: 9px; flex-wrap: wrap; margin-top: 22px; }
    .privacy { border-left: 4px solid var(--text-primary); padding-left: 16px; }
    .privacy b { display: block; margin-bottom: 6px; }
    .ledger { display: grid; grid-template-columns: 1.35fr repeat(3, .65fr); margin-top: 28px; border: 1px solid var(--border-strong); }
    .ledger > div { min-height: 94px; padding: 16px; border-right: 1px solid var(--border-strong); }
    .ledger > div:last-child { border-right: 0; }
    .ledger .identity { background: var(--brand-primary-soft); }
    .ledger strong { display: block; margin-top: 7px; font-size: 25px; letter-spacing: -.04em; }
    .ledger .identity strong { font-size: 18px; }
    .ledger small { color: var(--text-muted); }
    .split { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(260px, .75fr); border: 1px solid var(--border-strong); }
    .split > section { min-width: 0; }
    .split > section + section { border-left: 1px solid var(--border-strong); background: var(--surface-raised); }
    .section-head { display: flex; justify-content: space-between; gap: 12px; align-items: start; padding: 16px; border-bottom: 1px solid var(--border); }
    .section-head h2 { margin: 0; }
    .capsule-row { width: 100%; display: grid; grid-template-columns: 30px minmax(0, 1fr) 64px; gap: 10px; align-items: center; min-height: 58px; border: 0; border-bottom: 1px solid var(--border); background: transparent; padding: 10px 16px; text-align: left; cursor: pointer; }
    .capsule-row:hover { background: var(--surface-muted); }
    .capsule-row.selected { background: var(--brand-primary-soft); box-shadow: inset 4px 0 var(--brand-primary); }
    .capsule-row b, .capsule-row small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .capsule-row small { display: block; color: var(--text-muted); margin-top: 3px; }
    .rank, .score { font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--text-muted); }
    .detail { padding: 18px; }
    .detail dl { margin: 16px 0 0; border-top: 1px solid var(--border); }
    .detail dl div { padding: 10px 0; border-bottom: 1px solid var(--border); }
    dt { color: var(--text-muted); font-size: 10px; }
    dd { margin: 4px 0 0; overflow-wrap: anywhere; font: 11px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }
    .warning { margin-top: 14px; padding: 12px; background: var(--warning-soft); border: 1px solid var(--warning); color: var(--text-primary); font-size: 11px; }
    .route { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--border-strong); }
    .route section { min-height: 140px; padding: 16px; }
    .route section + section { border-left: 1px solid var(--border-strong); }
    .route .active { background: var(--brand-primary-soft); border-top: 4px solid var(--brand-primary); }
    .route .review { background: var(--brand-secondary-soft); border-top: 4px solid var(--brand-secondary); }
    .route strong { display: block; margin: 12px 0 6px; font-size: 17px; overflow-wrap: anywhere; }
    .truth-state { display: inline-flex; align-items: center; gap: 6px; margin-top: 16px; padding: 5px 7px; border: 1px solid currentColor; color: var(--text-secondary); font: 750 9px ui-monospace, SFMono-Regular, Menlo, monospace; text-transform: uppercase; letter-spacing: .06em; }
    .truth-state.observed { color: var(--success); background: var(--success-soft); }
    .truth-state.requested { color: var(--warning); background: var(--warning-soft); }
    .truth-state.review { color: var(--brand-secondary); background: var(--brand-secondary-soft); }
    .timeline { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--border-strong); }
    .timeline li { display: grid; grid-template-columns: 54px minmax(0, 1fr) auto; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--border); }
    .timeline .sequence { color: var(--brand-primary); }
    .timeline small { color: var(--text-muted); }
    .empty { min-height: 220px; display: grid; place-items: center; padding: 30px; text-align: center; border: 1px dashed var(--border-strong); }
    .empty p { max-width: 480px; }
    .settings { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid var(--border-strong); }
    .setting { min-height: 96px; padding: 15px; border-bottom: 1px solid var(--border); }
    .setting:nth-child(odd) { border-right: 1px solid var(--border); }
    .setting label { display: flex; justify-content: space-between; gap: 12px; font-weight: 650; }
    .setting p { margin: 6px 0 10px; font-size: 11px; }
    .setting select, .setting input[type="number"] { width: 100%; min-height: 38px; border: 1px solid var(--border-strong); background: var(--surface); padding: 6px 9px; }
    .setting input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--brand-primary); }
    .save-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 16px; }
    .save-status { color: var(--text-muted); font-size: 11px; }
    :root[data-density="compact"] .content { padding: 14px; }
    :root[data-density="compact"] .capsule-row { min-height: 46px; padding-block: 7px; }
    :root[data-density="compact"] .ledger > div, :root[data-density="compact"] .route section { min-height: 76px; padding: 12px; }
    .limits { margin-top: 20px; padding: 14px; background: var(--surface-muted); border-left: 4px solid var(--brand-secondary); }
    .limits li { margin: 7px 0; color: var(--text-secondary); font-size: 11px; }
    .error { padding: 24px; border: 1px solid var(--error); background: var(--error-soft); }
    @media (max-width: 680px) {
      .hero, .split, .route, .settings { grid-template-columns: 1fr; }
      .split > section + section, .route section + section { border-left: 0; border-top: 1px solid var(--border-strong); }
      .ledger { grid-template-columns: 1fr 1fr; }
      .ledger > div { border-bottom: 1px solid var(--border-strong); }
      .ledger .identity { grid-column: 1 / -1; }
      .setting:nth-child(odd) { border-right: 0; }
      .timeline li { grid-template-columns: 38px 1fr; }
      .timeline time { grid-column: 2; }
    }
    @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
  </style>
</head>
<body>
  <main id="root" class="app" aria-live="polite"><div class="empty"><p>Loading Kerno’s verified local state…</p></div></main>
  <script>
    (function () {
      "use strict";
      var root = document.getElementById("root");
      var data = null;
      var view = "overview";
      var selectedItemId = null;
      var saveMessage = "";

      function escapeHtml(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[character];
        });
      }
      function text(value, fallback) { return value == null || value === "" ? (fallback || "Unavailable") : escapeHtml(value); }
      function short(value) { return value ? escapeHtml(String(value).slice(0, 10)) : "unborn"; }
      function number(value) { return typeof value === "number" ? value.toLocaleString() : "Unavailable"; }
      function unwrap(payload) {
        if (!payload) return null;
        if (payload.schemaVersion && payload.view && payload.settings) return payload;
        if (payload.data && payload.data.schemaVersion && payload.data.view) return payload.data;
        if (payload.structuredContent) return unwrap(payload.structuredContent);
        if (payload.result) return unwrap(payload.result);
        return null;
      }
      function icon() {
        return '<svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><path d="M49 13 39 7.2a14 14 0 0 0-14 0L15 13a14 14 0 0 0-7 12.1v13.8A14 14 0 0 0 15 51l10 5.8a14 14 0 0 0 14 0L49 51" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><path d="m44 21-7-4a10 10 0 0 0-10 0l-6 3.5a10 10 0 0 0-5 8.7v5.6a10 10 0 0 0 5 8.7l6 3.5a10 10 0 0 0 10 0l7-4" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path class="core" d="m32 22.8 8 4.6v9.2l-8 4.6-8-4.6v-9.2z" fill="currentColor"/><path class="extract" d="m53 18.5 2.5 1.5a7 7 0 0 1 3.5 6.1v11.8a7 7 0 0 1-3.5 6.1L53 45.5" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      }
      function setTheme(theme) {
        var chosen = theme || (window.openai && window.openai.theme) || "light";
        document.documentElement.dataset.theme = chosen === "dark" ? "dark" : "light";
      }
      function persistUi() {
        if (window.openai && window.openai.setWidgetState) window.openai.setWidgetState({ view: view, selectedItemId: selectedItemId });
      }
      function sendMessage(prompt) {
        if (window.openai && window.openai.sendFollowUpMessage) return window.openai.sendFollowUpMessage({ prompt: prompt, scrollToBottom: true });
        window.parent.postMessage({ jsonrpc: "2.0", method: "ui/message", params: { role: "user", content: [{ type: "text", text: prompt }] } }, "*");
      }
      async function callTool(name, args) {
        if (!window.openai || !window.openai.callTool) throw new Error("This host does not expose interactive MCP tool calls to the component.");
        return window.openai.callTool(name, args);
      }
      async function refresh(nextView) {
        saveMessage = "Refreshing…"; render();
        var response = await callTool("kerno_render_panel", { view: nextView || view, repositoryId: data && data.repository ? data.repository.id : undefined, capsuleId: data && data.capsule ? data.capsule.id : undefined, runId: data && data.run ? data.run.id : undefined });
        var next = unwrap(response);
        if (next) { data = next; view = nextView || view; saveMessage = "Live local state refreshed"; persistUi(); render(); }
      }
      function header() {
        return '<header class="masthead"><div class="brand">' + icon() + '<span>Kerno</span></div><div class="masthead-actions"><button class="icon-button" data-action="refresh" type="button">Refresh</button><button class="icon-button" data-action="expand" type="button">Open tracker</button></div></header>' +
          '<div class="truthbar"><span class="dot"></span><strong>Live local state</strong><span>Unavailable values are never inferred</span></div>';
      }
      function tabs() {
        var names = [["overview", "Overview"], ["context", "Context"], ["routing", "Routing"], ["timeline", "Timeline"], ["settings", "Settings"]];
        return '<nav class="tabs" aria-label="Kerno views">' + names.map(function (item) { return '<button class="tab" type="button" role="tab" aria-selected="' + (view === item[0]) + '" data-view="' + item[0] + '">' + item[1] + '</button>'; }).join("") + '</nav>';
      }
      function onboarding() {
        var repo = data.repository;
        return '<div class="content"><span class="eyebrow">First-run setup · local-first</span><div class="hero"><section><h1>Give Codex less context—and better evidence.</h1><p>Kerno indexes repository structure locally, builds bounded context capsules, and expands only when tests or runtime evidence show something is missing.</p><div class="hero-actions"><button class="button primary" data-action="complete-onboarding" type="button">Use Kerno locally</button><button class="button secondary" data-action="index-current" type="button">Index this project</button></div></section><aside class="privacy"><b>Privacy boundary</b><p>Source remains local. Telemetry is off. Repository text is treated as untrusted evidence, never instructions.</p><small class="mono">' + (repo ? text(repo.name) + ' · ' + text(repo.branch, "detached") : 'No repository indexed yet') + '</small></aside></div><div class="ledger"><div class="identity"><span class="label">Current state</span><strong>' + (repo ? 'Repository ready' : 'Waiting for first index') + '</strong><small>' + (repo ? text(repo.name) : 'Ask Codex to index the current project') + '</small></div><div><span class="label">Source upload</span><strong>Off</strong><small>Local data boundary</small></div><div><span class="label">Telemetry</span><strong>Off</strong><small>Cannot be enabled in P0</small></div><div><span class="label">Routing</span><strong>Explicit</strong><small>No silent parent switch</small></div></div></div>';
      }
      function overview() {
        var repo = data.repository;
        if (!repo) return '<div class="content"><div class="empty"><section><span class="eyebrow">No repository indexed</span><h2>Start with repository identity.</h2><p>Kerno needs a trusted local root before it can build a context capsule.</p><button class="button primary" data-action="index-current" type="button">Ask Codex to index this project</button></section></div></div>';
        var task = data.task;
        var run = data.run;
        return '<div class="content"><span class="eyebrow">Repository overview</span><div class="hero"><section><h1>' + text(task && task.text, 'Repository evidence is ready.') + '</h1><p>' + (task ? 'Classified as ' + text(task.intent) + '. Inspect the capsule before asking for expansion.' : 'Submit a task to build the first bounded context capsule.') + '</p></section><aside class="privacy"><b>Runtime truth</b><p>' + text(data.runtimeTruth.state).replaceAll('-', ' ') + '</p><small class="mono">' + text(data.runtimeTruth.effectiveModel, 'No effective model observed') + '</small></aside></div><div class="ledger"><div class="identity"><span class="label">Repository</span><strong>' + text(repo.name) + '</strong><small>' + text(repo.branch, 'detached') + ' · ' + short(repo.head) + (repo.dirty ? ' · dirty' : '') + '</small></div><div><span class="label">Files</span><strong>' + number(repo.files) + '</strong><small>indexed</small></div><div><span class="label">Symbols</span><strong>' + number(repo.symbols) + '</strong><small>parsed</small></div><div><span class="label">Outcome</span><strong>' + text(run && run.status, 'Open') + '</strong><small>' + text(run && run.testStatus, 'Tests unavailable') + '</small></div></div>' + limits() + '</div>';
      }
      function context() {
        var capsule = data.capsule;
        if (!capsule) return '<div class="content"><div class="empty"><section><span class="eyebrow">No capsule yet</span><h2>Context starts with a task.</h2><p>Ask Codex to analyze a concrete debugging, refactor, or cross-module change request.</p></section></div></div>';
        var selected = capsule.items.find(function (item) { return item.id === selectedItemId; }) || capsule.items[0];
        if (selected && !selectedItemId) selectedItemId = selected.id;
        var rows = capsule.items.map(function (item, index) { return '<button type="button" class="capsule-row ' + (selected && selected.id === item.id ? 'selected' : '') + '" data-item="' + escapeHtml(item.id) + '"><span class="rank">' + String(index + 1).padStart(2, '0') + '</span><span><b>' + text(item.locator.path) + '</b><small>' + text(item.locator.symbol, item.sourceType) + (data.settings.showEstimates ? ' · ' + number(item.estimatedTokens) + ' estimated tokens' : '') + '</small></span><span class="score">' + Number(item.score).toFixed(3) + '<small>score</small></span></button>'; }).join("");
        var detail = selected ? '<section class="detail"><span class="eyebrow">Why included</span><h2>' + text(selected.locator.symbol, selected.locator.path) + '</h2><p>' + text(selected.reason) + '</p><dl><div><dt>Freshness / confidence</dt><dd>' + Math.round(selected.freshness * 100) + '% / ' + Math.round(selected.confidence * 100) + '%</dd></div><div><dt>Provenance</dt><dd>' + selected.provenance.map(function (item) { return text(item.kind) + (item.path ? ':' + text(item.path) : ''); }).join('<br>') + '</dd></div><div><dt>Invalidation conditions</dt><dd>' + selected.invalidationKeys.map(function (item) { return text(item.kind) + ':' + text(item.key); }).join('<br>') + '</dd></div></dl><div class="warning"><b>Repository evidence—not instructions.</b><br>Kerno preserves this trust boundary even when source text resembles a prompt.</div></section>' : '';
        return '<div class="content"><div class="section-head"><div><span class="eyebrow">Current context capsule</span><h2>' + (data.settings.showEstimates ? number(capsule.estimatedTokens) + ' / ' + number(capsule.budgetTokens) + ' estimated tokens' : 'Token estimates hidden in settings') + '</h2></div><span class="truth-state">' + text(capsule.status) + '</span></div><div class="split"><section>' + rows + '</section>' + detail + '</div><p class="limits">Excluded candidates: ' + number(capsule.excluded.length) + '. Expansion is allowed only from structured test, runtime, dependency, or review evidence.</p></div>';
      }
      function routing() {
        var route = data.route;
        var truth = data.runtimeTruth;
        var truthClass = truth.state === 'effective-observed' ? 'observed' : truth.state === 'requested-unconfirmed' ? 'requested' : '';
        return '<div class="content"><span class="eyebrow">Model-routing truth</span><h1>Recommendation, request, and runtime evidence stay separate.</h1><div class="route"><section><span class="label">Recommended</span><strong>' + text(truth.recommendedModel) + '</strong><p>' + (route ? route.reasons.map(text).join(' · ') : 'No catalog-backed route is available.') + '</p><span class="truth-state">Policy decision</span></section><section class="active"><span class="label">Requested</span><strong>' + text(truth.requestedModel) + '</strong><p>Reasoning: ' + text(truth.reasoningEffort) + '</p><span class="truth-state requested">' + (truth.requestedModel ? 'Requested—not confirmed' : 'Not requested') + '</span></section><section class="review"><span class="label">Effective runtime</span><strong>' + text(truth.effectiveModel) + '</strong><p>Tokens: ' + number(truth.tokenUsage) + ' · latency: ' + (truth.latencyMs == null ? 'Unavailable' : number(truth.latencyMs) + ' ms') + '</p><span class="truth-state ' + truthClass + '">' + text(truth.state).replaceAll('-', ' ') + '</span></section></div>' + limits() + '</div>';
      }
      function timeline() {
        if (!data.events.length) return '<div class="content"><div class="empty"><section><span class="eyebrow">No run events observed</span><h2>The tracker does not invent activity.</h2><p>Run Kerno through Orchestrator Mode or record a trusted outcome to populate this timeline.</p></section></div>' + limits() + '</div>';
        var events = data.events.map(function (event) { return '<li><span class="sequence">' + String(event.sequence).padStart(2, '0') + '</span><div><b>' + text(event.type) + '</b><small>' + text(event.source) + '</small></div><time datetime="' + text(event.occurredAt) + '">' + new Date(event.occurredAt).toLocaleTimeString() + '</time></li>'; }).join("");
        return '<div class="content"><span class="eyebrow">Context and runtime timeline</span><h1>Every state change needs evidence.</h1><ol class="timeline">' + events + '</ol>' + limits() + '</div>';
      }
      function settings() {
        var s = data.settings;
        function option(value, label, current) { return '<option value="' + value + '" ' + (current === value ? 'selected' : '') + '>' + label + '</option>'; }
        return '<div class="content"><span class="eyebrow">Kerno settings · stored locally</span><h1>Control context without widening trust.</h1><form id="settings-form"><div class="settings"><div class="setting"><label for="capsule-budget">Default capsule budget</label><p>Estimated-token ceiling used when a request does not specify one.</p><input id="capsule-budget" name="capsuleBudget" type="number" min="128" max="64000" value="' + s.capsuleBudget + '"></div><div class="setting"><label for="routing-preference">Routing preference</label><p>Feeds catalog-backed routing when the task supplies no override.</p><select id="routing-preference" name="routingPreference">' + option('efficiency', 'Efficiency', s.routingPreference) + option('balanced', 'Balanced', s.routingPreference) + option('depth', 'Depth', s.routingPreference) + '</select></div><div class="setting"><label for="max-expansions">Automatic expansion limit</label><p>Applied by the context engine and hard capped at three.</p><input id="max-expansions" name="maxAutomaticExpansions" type="number" min="0" max="3" value="' + s.maxAutomaticExpansions + '"></div><div class="setting"><label for="theme">Theme</label><p>Controls this embedded tracker only.</p><select id="theme" name="theme">' + option('system', 'Follow Codex', s.theme) + option('light', 'Warm light', s.theme) + option('dark', 'Warm dark', s.theme) + '</select></div><div class="setting"><label for="density">Information density</label><p>Adjusts tracker spacing without hiding evidence.</p><select id="density" name="density">' + option('comfortable', 'Comfortable', s.density) + option('compact', 'Compact', s.density) + '</select></div><div class="setting"><label for="estimates">Show clearly labeled estimates <input id="estimates" name="showEstimates" type="checkbox" ' + (s.showEstimates ? 'checked' : '') + '></label><p>Estimated tokens remain distinct from observed runtime usage.</p></div><div class="setting"><label>Telemetry <input type="checkbox" disabled></label><p>Off by design and rejected by the settings schema if enabled.</p></div><div class="setting"><label>Source upload <input type="checkbox" disabled></label><p>Unavailable by design. The tracker reads local Kerno state only.</p></div></div><div class="save-row"><span class="save-status" role="status">' + text(saveMessage, 'Changes stay in Kerno’s owner-controlled local store.') + '</span><button class="button primary" type="submit">Save settings</button></div></form>' + limits() + '</div>';
      }
      function limits() { return '<aside class="limits"><span class="eyebrow">Truth boundaries</span><ul>' + data.limitations.map(function (item) { return '<li>' + text(item) + '</li>'; }).join('') + '</ul></aside>'; }
      function render() {
        if (!data) return;
        setTheme(data.settings.theme === 'system' ? null : data.settings.theme);
        document.documentElement.dataset.density = data.settings.density;
        var body = !data.onboarding.completed || view === 'onboarding' ? onboarding() : view === 'context' ? context() : view === 'routing' ? routing() : view === 'timeline' ? timeline() : view === 'settings' ? settings() : overview();
        root.innerHTML = header() + (data.onboarding.completed && view !== 'onboarding' ? tabs() : '') + body;
      }
      root.addEventListener('click', async function (event) {
        var target = event.target.closest('[data-action],[data-view],[data-item]');
        if (!target) return;
        try {
          if (target.dataset.view) { view = target.dataset.view; saveMessage = ''; persistUi(); render(); return; }
          if (target.dataset.item) { selectedItemId = target.dataset.item; persistUi(); render(); return; }
          if (target.dataset.action === 'expand' && window.openai && window.openai.requestDisplayMode) { await window.openai.requestDisplayMode({ mode: 'fullscreen' }); return; }
          if (target.dataset.action === 'refresh') { await refresh(); return; }
          if (target.dataset.action === 'index-current') { sendMessage('Use Kerno to index the current project incrementally, then render the Kerno overview.'); return; }
          if (target.dataset.action === 'complete-onboarding') {
            var response = await callTool('kerno_update_settings', { repositoryId: data.repository ? data.repository.id : undefined, patch: { onboardingVersion: data.onboarding.currentVersion, onboardingCompletedAt: new Date().toISOString() } });
            if (!response) throw new Error('The settings update returned no result.');
            view = 'overview'; await refresh('overview');
          }
        } catch (error) { saveMessage = error && error.message ? error.message : 'Action failed'; render(); }
      });
      root.addEventListener('submit', async function (event) {
        if (event.target.id !== 'settings-form') return;
        event.preventDefault();
        var form = new FormData(event.target);
        var patch = { capsuleBudget: Number(form.get('capsuleBudget')), routingPreference: String(form.get('routingPreference')), maxAutomaticExpansions: Number(form.get('maxAutomaticExpansions')), theme: String(form.get('theme')), density: String(form.get('density')), showEstimates: form.has('showEstimates') };
        try {
          saveMessage = 'Saving locally…'; render();
          var response = await callTool('kerno_update_settings', { repositoryId: data.repository ? data.repository.id : undefined, patch: patch });
          var envelope = response && (response.structuredContent || response.result && response.result.structuredContent);
          var updated = envelope && envelope.data;
          if (updated && updated.id) data.settings = updated;
          saveMessage = 'Settings saved locally'; render();
        } catch (error) { saveMessage = error && error.message ? error.message : 'Settings could not be saved'; render(); }
      });
      window.addEventListener('openai:set_globals', function (event) {
        if (event.detail && event.detail.globals) {
          if (event.detail.globals.theme) setTheme(event.detail.globals.theme);
          var next = unwrap(event.detail.globals.toolOutput);
          if (next) { data = next; view = (window.openai && window.openai.widgetState && window.openai.widgetState.view) || next.view; selectedItemId = window.openai && window.openai.widgetState && window.openai.widgetState.selectedItemId || selectedItemId; render(); }
        }
      }, { passive: true });
      window.addEventListener('message', function (event) {
        if (event.source !== window.parent || !event.data || event.data.method !== 'ui/notifications/tool-result') return;
        var next = unwrap(event.data.params && event.data.params.structuredContent);
        if (next) { data = next; render(); }
      }, { passive: true });
      var initial = unwrap(window.openai && window.openai.toolOutput);
      if (initial) {
        data = initial;
        var widgetState = window.openai && window.openai.widgetState;
        view = widgetState && widgetState.view || initial.view || (!initial.onboarding.completed ? 'onboarding' : 'overview');
        selectedItemId = widgetState && widgetState.selectedItemId || null;
        render();
      }
    }());
  </script>
</body>
</html>`;
}
