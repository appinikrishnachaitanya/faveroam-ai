"use client";
import { useRef, useState } from 'react';
import type { Passport } from '../../src/workspace/state';
import type { AgentInput } from '../../src/agent/types';
import type { TrendResult } from "../../src/qloo/trending";
import type { AnalysisKind, AnalysisResult, HeatPoint } from '../../src/qloo/analysis';

export default function TasteAnalysis({passport,busy,onRefine}:{passport:Passport;busy:boolean;onRefine:(input:AgentInput)=>void}) {
  const [results,setResults]=useState<Partial<Record<AnalysisKind,AnalysisResult>>>({});
  const [loading,setLoading]=useState<AnalysisKind>();
  const [error,setError]=useState('');
  const active=useRef(false);
  const trendChoices=passport.cards.filter(card=>["Music","Eat","Coffee","Culture","Lifestyle"].includes(card.section)).slice(0,30);
  const [trendId,setTrendId]=useState("");
  const [trend,setTrend]=useState<TrendResult>();
  const [trendBusy,setTrendBusy]=useState(false);
  async function loadTrend() {
    if (!passport.agent || active.current || busy) return;
    active.current=true;setTrendBusy(true);setTrend(undefined);setError("");
    try {
      const response=await fetch("/api/agent/intelligence",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...passport.agent,action:"trends",entityId:trendId || trendChoices[0]?.id}),signal:AbortSignal.timeout(65000)});
      const data=await response.json();
      if(!response.ok)throw Error(data.error || "Historical trends are unavailable.");
      setTrend(data.trend);
    } catch(error){setError(error instanceof Error?error.message:"Historical trends are unavailable.");}
    finally{active.current=false;setTrendBusy(false);}
  }
  async function load(kind:AnalysisKind) {
    if(!passport.agent || active.current || busy)return;
    active.current=true;setLoading(kind);setError('');
    try {
      const response=await fetch('/api/agent/intelligence',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({...passport.agent,action:'analysis',kind}),signal:AbortSignal.timeout(65000)});
      const data=await response.json();
      if(!response.ok)throw Error();
      setResults(current=>({...current,[kind]:data.analysis}));
    }catch {setError('This analysis could not finish. Your Passport is unchanged; please retry.');}
    finally {active.current=false;setLoading(undefined);}
  }
  const taste=results.taste?.kind==='taste'?results.taste:undefined;
  const heat=results.heatmap?.kind==='heatmap'?results.heatmap:undefined;
  const demo=results.demographics?.kind==='demographics'?results.demographics:undefined;
  function nearby(point:HeatPoint) {
    onRefine({discovery:{section:'Eat',preferences:{locationPoint:`POINT(${point.longitude} ${point.latitude})`,radius:1500}}});
  }
  return <section className="taste-analysis" aria-labelledby="analysis-title">
    <div className="section-heading"><div><span className="micro-label">A DIFFERENT WAY TO EXPLORE</span><h2 id="analysis-title">Taste themes, heatmap & audience insights.</h2></div></div>
    <p>Explore cultural associations and areas with stronger audience affinity for your confirmed interests.</p>
    <div className="analysis-actions">
      <button disabled={busy||Boolean(loading)||trendBusy} onClick={()=>void load('taste')}>{loading==='taste'?'Finding taste connections…':'Explore my taste connections'}</button>
      <button disabled={busy||Boolean(loading)||trendBusy} onClick={()=>void load('heatmap')}>{loading==='heatmap'?'Mapping your interests…':`Heatmap · areas to explore in ${passport.city}`}</button>
    </div>
    {error&&<p role="alert">{error}</p>}
    {loading&&<p role="status">Looking for patterns in your confirmed tastes…</p>}
    {taste&&<div className="analysis-result"><h3>Connected cultural themes</h3><p>Returned associations across your selected interests. These describe cultural connections, not your personality.</p>
      {taste.tags.length?<ul className="taste-theme-list">{taste.tags.map(tag=><li key={tag.id}>{tag.name}</li>)}</ul>:<p>No taste themes were returned for this combination.</p>}
    </div>}
    {heat&&<div className="analysis-result"><h3>Areas to explore</h3><p>Relative audience affinity across {passport.city}. This is a geographic affinity plot, not live crowds, venue availability, or a street map.</p>
      {heat.points.length?<><AffinityPlot points={heat.points}/><p className="helper">Darker dots indicate stronger affinity within this result. Nearby cells may represent the same area.</p>
      <div className="area-choices">{distinctAreas(heat.points).map((point,index)=><article key={`${point.latitude}:${point.longitude}`}><h4>Explore area {index+1}</h4>
        <p>{point.latitude.toFixed(3)}, {point.longitude.toFixed(3)}</p>
        <a href={`https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`} target="_blank" rel="noreferrer">View area on map ↗</a>
        <button disabled={busy||Boolean(loading)||trendBusy} onClick={()=>nearby(point)}>Find dining nearby</button>
      </article>)}</div><p className="helper">Nearby dining searches within 1.5 km of the selected point while keeping your current dining preferences. Results depend on local coverage.</p></>:<p>No geographic affinity data was returned.</p>}
    </div>}
    <details className="audience-context"><summary>Demographics · optional audience context</summary><p>Aggregate age and gender affinity associated with each interest. These values are not audience percentages and do not identify or predict your demographics.</p>
      <button disabled={busy||Boolean(loading)||trendBusy} onClick={()=>void load('demographics')}>{loading==='demographics'?'Reading audience context…':'Show audience context'}</button>
      {demo&&(!demo.records.length?<p>No audience context was returned.</p>:demo.records.map(record=><div className="analysis-result" key={record.id}><h4>{passport.selected.find(s=>s.id.toLowerCase()===record.id.toLowerCase())?.name ?? 'Returned interest'}</h4>
        <dl className="audience-values">{Object.entries({...record.age,...record.gender}).map(([label,value])=><div key={label}><dt>{label.replaceAll('_',' ')}</dt><dd>{value>0?'+':''}{value.toFixed(2)} affinity</dd></div>)}</dl>
      </div>))}
    </details>
    <section className="trend-analysis" aria-label="Historical trends"><h3>Trend analysis</h3>
      <p>Check returned popularity history for an artist or place. History may be empty or unavailable; Trending for you in Preferences uses trend ranking separately.</p>
      {trendChoices.length ? <><label>Discovery to analyse<select value={trendId || trendChoices[0]?.id} disabled={busy||Boolean(loading)||trendBusy} onChange={e=>{setTrendId(e.target.value);setTrend(undefined);}}>{trendChoices.map(card=><option key={card.id} value={card.id}>{card.name}</option>)}</select></label>
      <button disabled={busy||Boolean(loading)||trendBusy} onClick={()=>void loadTrend()}>{trendBusy?"Reading popularity history…":"Load trend history"}</button></>:<p>Generate artist or place discoveries to check their history.</p>}
      {trend&&<div className="analysis-result">{trend.points.length?<><p>{trend.startDate} to {trend.endDate}</p><div className="trend-table"><table><thead><tr><th>Date</th><th>Population percentile</th><th>Rank</th></tr></thead><tbody>{trend.points.slice(-30).map((point,index)=><tr key={index}><td>{point.date}</td><td>{point.populationPercentile ?? "Unavailable"}</td><td>{point.rank ?? "Unavailable"}</td></tr>)}</tbody></table></div></>:<p>No historical points were returned for this discovery.</p>}</div>}
    </section>
  </section>;
}

function distinctAreas(points:HeatPoint[]) {
  const chosen:HeatPoint[]=[];
  for(const p of [...points].sort((a,b)=>b.affinity-a.affinity)) {
    if(chosen.every(q=>Math.hypot((q.longitude-p.longitude)*Math.cos(p.latitude*Math.PI/180),q.latitude-p.latitude)*111>1.5))chosen.push(p);
    if(chosen.length===3)break;
  }
  return chosen;
}
function AffinityPlot({points}:{points:HeatPoint[]}) {
  const xs=points.map(p=>p.longitude),ys=points.map(p=>p.latitude),values=points.map(p=>p.affinity);
  const west=Math.min(...xs),east=Math.max(...xs),south=Math.min(...ys),north=Math.max(...ys),low=Math.min(...values),high=Math.max(...values);
  const longitudeScale=Math.max(.01,Math.cos((north+south)/2*Math.PI/180));
  const scale=Math.min(620/Math.max(.001,(east-west)*longitudeScale),240/Math.max(.001,north-south));
  const width=(east-west)*longitudeScale*scale,height=(north-south)*scale;
  return <svg className="affinity-plot" viewBox="0 0 700 300" role="img" aria-label={`Geographic affinity plot of ${points.length} returned points; north is up`}>
    <title>Audience affinity across the city</title><text x="24" y="24">N ↑</text>
    {points.map((p,i)=><circle key={i} cx={350-width/2+(p.longitude-west)*longitudeScale*scale} cy={150-height/2+(north-p.latitude)*scale} r="3.5" fill="currentColor" opacity={.2+.8*(high===low?1:(p.affinity-low)/(high-low))}><title>{`${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)} · relative affinity ${p.affinity.toFixed(3)}`}</title></circle>)}
  </svg>;
}
