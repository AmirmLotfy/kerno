import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Replay = any;
const tabs = ["Current run", "Repository", "Timeline", "Comparison", "Benchmark & limits"] as const;
const fmt = (value: unknown) => value === null || value === undefined ? "Not observed" : typeof value === "boolean" ? value ? "Passed" : "Failed" : String(value);
const short = (value?: string | null) => value ? value.slice(0, 10) : "unborn";

function App() {
  const [data, setData] = useState<Replay>(); const [error, setError] = useState(""); const [tab, setTab] = useState<typeof tabs[number]>("Current run"); const [selected, setSelected] = useState<any>();
  useEffect(() => { fetch("/replay.json").then((response) => { if (!response.ok) throw new Error("Replay artifact is unavailable. Run npm run demo:record."); return response.json(); }).then(setData).catch((reason) => setError(reason.message)); }, []);
  useEffect(() => { if (data?.initialCapsule?.items?.length && !selected) setSelected(data.initialCapsule.items[0]); }, [data, selected]);
  if (error) return <main className="loading"><p className="eyebrow">Kerno / evidence unavailable</p><h1>Replay could not be loaded.</h1><p>{error}</p></main>;
  if (!data) return <main className="loading"><p className="eyebrow">Kerno / loading evidence</p><div className="loader" /></main>;
  const repo = data.repository; const task = data.task; const capsule = data.initialCapsule; const child = data.childCapsule;
  return <div className="shell">
    <header className="masthead">
      <a className="brand" href="#" aria-label="Kerno home"><span className="mark">K</span><span>Kerno</span></a>
      <div className="truth-banner"><span className="status-dot" />{data.label}<small>hash {short(data.artifactHash)}</small></div>
      <div className="repo-lockup"><b>relaycart-ts</b><span>{repo.branch ?? "detached"} · {short(repo.head)}</span></div>
    </header>
    <nav className="tabs" aria-label="Kerno views">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {tab === "Current run" && <main className="workspace">
      <section className="task-hero">
        <div><p className="eyebrow">Run 01 / debugging / high transaction risk</p><h1>Exactly-once refunds,<br/><em>proved from evidence.</em></h1></div>
        <p className="task-copy">{task.taskText}</p>
        <div className="outcome"><span>Outcome</span><strong>{data.tests.after.passed ? "Verified" : "Failed"}</strong><small>Target test {data.tests.after.passed ? "passes" : "fails"}; {data.review.findings.length} reviewer findings</small></div>
      </section>
      <section className="run-grid">
        <div className="capsule-panel panel">
          <div className="section-heading"><div><p className="eyebrow">Initial capsule</p><h2>{capsule.items.length} items · {capsule.estimatedTokens} est. tokens</h2></div><span className="confidence">budget {capsule.budgetTokens}</span></div>
          <div className="capsule-list">{capsule.items.map((item: any, index: number) => <button key={item.id} className={`capsule-row ${selected?.id === item.id ? "selected" : ""}`} onClick={() => setSelected(item)}>
            <span className="rank">{String(index + 1).padStart(2, "0")}</span><span className="file"><b>{item.locator.symbol ?? item.locator.path.split("/").at(-1)}</b><small>{item.locator.path}</small></span><span className="score">{item.score.toFixed(3)}<small>value</small></span><span className="tokens">{item.estimatedTokens}<small>tok est.</small></span>
          </button>)}</div>
          <div className="expansion"><span className="expansion-icon">↳</span><div><p className="eyebrow">Evidence-triggered expansion</p><b>{child.items.map((item: any) => item.locator.path).join(", ")}</b><small>Added after failing test named <code>TransactionBoundary</code>; +{child.estimatedTokens} estimated tokens.</small></div></div>
        </div>
        <aside className="why panel">
          <p className="eyebrow">Why included</p><h2>{selected?.locator?.path?.split("/").at(-1)}</h2><p className="reason">{selected?.reason}</p>
          <dl><div><dt>Freshness</dt><dd>{Math.round((selected?.freshness ?? 0) * 100)}% <span>hash matched</span></dd></div><div><dt>Confidence</dt><dd>{Math.round((selected?.confidence ?? 0) * 100)}% <span>{selected?.provenance?.[0]?.note?.split(";")[0]}</span></dd></div><div><dt>Trust</dt><dd>Evidence <span>repository data</span></dd></div></dl>
          <h3>Score composition</h3><div className="signals">{selected && Object.entries(selected.scoreBreakdown).filter(([key]) => key !== "tokenPenalty").sort((a: any,b: any)=>b[1]-a[1]).slice(0,5).map(([key,value]: any)=><div key={key}><span>{key.replace(/[A-Z]/g,(m:string)=>` ${m.toLowerCase()}`)}</span><i><i style={{width:`${Math.min(100,value*350)}%`}}/></i><b>{value.toFixed(3)}</b></div>)}</div>
          <h3>Invalidated when</h3><ul className="keys">{selected?.invalidationKeys?.map((key:any)=><li key={`${key.kind}:${key.key}`}><span>{key.kind}</span>{key.key}{key.expected ? ` ≠ ${short(key.expected)}` : " changes"}</li>)}</ul>
        </aside>
      </section>
      <section className="route-strip"><div><p className="eyebrow">Model routing truth</p><h2>{data.route.recommended.model}</h2><span>{data.route.recommended.reasoningEffort} effort · recommended</span></div><div className="route-arrow">→</div><div><p>Requested</p><strong>Not observed</strong><small>No App Server turn in this replay</small></div><div className="route-arrow muted">→</div><div><p>Effective</p><strong>Not observed</strong><small>Never inferred from recommendation</small></div></section>
    </main>}
    {tab === "Repository" && <Repository data={data}/>} {tab === "Timeline" && <Timeline data={data}/>} {tab === "Comparison" && <Comparison data={data}/>} {tab === "Benchmark & limits" && <Limits data={data}/>}
    <footer><span>Kerno 0.1.0</span><span>Local-first · no telemetry · source remains local</span><span>Recorded {new Date(data.recordedAt).toLocaleString()}</span></footer>
  </div>;
}

function Repository({data}:{data:Replay}) { const r=data.repository; return <main className="page"><p className="eyebrow">Repository overview</p><h1>Index truth, not index theater.</h1><div className="stat-grid"><Stat n={r.files} label="files"/><Stat n={r.symbols} label="symbols"/><Stat n={r.unchangedReparsed} label="unchanged reparsed"/><Stat n={data.invalidation.status} label="old capsule state"/></div><section className="wide panel"><h2>Current identity</h2><dl className="identity"><div><dt>Repository</dt><dd>{r.id}</dd></div><div><dt>Branch / commit</dt><dd>{r.branch ?? "detached"} / {fmt(r.head)}</dd></div><div><dt>Dirty worktree</dt><dd>{fmt(r.dirty)}</dd></div><div><dt>Index freshness</dt><dd>{r.indexFreshness}</dd></div><div><dt>Invalidated evidence</dt><dd>{data.invalidation.changedFiles.join(", ")}</dd></div></dl></section></main> }
function Timeline({data}:{data:Replay}) { return <main className="page"><p className="eyebrow">Unified run timeline</p><h1>One task. Every consequential event.</h1><ol className="timeline">{data.timeline.map((event:any,index:number)=><li key={`${event.type}:${index}`}><span>{String(index+1).padStart(2,"0")}</span><div><p>{event.type}</p><b>{event.detail}</b><small>{new Date(event.at).toLocaleTimeString()}</small></div></li>)}</ol></main> }
const metricLabels:Record<string,string>={taskSuccess:"Task success",testsPassed:"Tests passed",threadTokens:"Observed thread tokens",filesOpened:"Observable files opened",repeatedReads:"Observable repeated reads",toolCalls:"Tool calls",timeToFirstValidPatchMs:"Time to first valid patch",totalLatencyMs:"Measured fixture latency",unnecessaryChangedLines:"Unnecessary changed lines",reviewerFindings:"Reviewer findings",staleContextMistakes:"Stale-context mistakes caught",contextExpansionCount:"Context expansions"};
function Comparison({data}:{data:Replay}) { return <main className="page"><p className="eyebrow">Baseline comparison</p><h1>Correctness first. Missing data stays missing.</h1><div className="comparison-head"><span>Metric</span><b>Plain Codex baseline</b><b>Kerno deterministic fixture</b></div><div className="comparison-table">{Object.entries(data.metrics).map(([key,value])=><div key={key}><span>{metricLabels[key]??key}</span><strong>Not recorded</strong><strong className={key==="taskSuccess"&&value?"good":""}>{fmt(value)}</strong></div>)}</div><p className="disclosure">This artifact proves Kerno’s deterministic context loop, not a Codex-versus-Kerno performance claim. Run the live benchmark harness from pinned manifests before publishing comparative numbers.</p></main> }
function Limits({data}:{data:Replay}) { return <main className="page"><p className="eyebrow">Benchmark & limitations</p><h1>Claims bounded by their evidence.</h1><div className="limits-grid"><section className="panel"><h2>What this run proves</h2><ul><li>Unchanged indexing reparses zero files.</li><li>The initial capsule is bounded and provenance-bearing.</li><li>A real failing test triggers the transaction child capsule.</li><li>The solution passes the pinned integration test.</li><li>A changed source hash makes the old capsule stale.</li></ul></section><section className="panel warning"><h2>What it does not prove</h2><ul><li>No baseline Codex run is embedded.</li><li>No token, read, or tool-call metric was observed.</li><li>The displayed model is a policy recommendation only.</li><li>The replay verifier is deterministic, not a Codex review thread.</li><li>Generalized productivity claims require repeated live trials.</li></ul></section></div><p className="artifact">Artifact SHA-256<br/><code>{data.artifactHash}</code></p></main> }
function Stat({n,label}:{n:any,label:string}) { return <div className="stat"><strong>{n}</strong><span>{label}</span></div> }
createRoot(document.getElementById("root")!).render(<StrictMode><App/></StrictMode>);
