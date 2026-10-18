"use client";
import { useRef, useState } from 'react';
import type { Passport } from '../../src/workspace/state';
import type { AgentInput } from '../../src/agent/types';
import type { AnalysisKind, AnalysisResult, HeatPoint } from '../../src/qloo/analysis';

export default function TasteAnalysis({passport,busy,onRefine}:{passport:Passport;busy:boolean;onRefine:(input:AgentInput)=>void}) {
  const [results,setResults]=useState<Partial<Record<AnalysisKind,AnalysisResult>>>({});
  const [loading,setLoading]=useState<AnalysisKind>();
  const [error,setError]=useState('');
  const active=useRef(false);
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
    <div className="section-heading"><div><span className="micro-label">A DIFFERENT WAY TO EXPLORE</span><h2 id="analysis-title">Your tastes, across the city.</h2></div></div>
    <p>Explore cultural associations and areas with stronger audience affinity for your confirmed interests.</p>
    <div className="analysis-actions">
      <button disabled={busy||Boolean(loading)} onClick={()=>void load('taste')}>{loading==='taste'?'Finding taste connections…':'Explore my taste connections'}</button>
      <button disabled={busy||Boolean(loading)} onClick={()=>void load('heatmap')}>{loading==='heatmap'?'Mapping your interests…':`Find areas to explore in ${passport.city}`}</button>
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
        <button disabled={busy||Boolean(loading)} onClick={()=>nearby(point)}>Find dining nearby</button>
      </article>)}</div><p className="helper">Nearby dining searches within 1.5 km of the selected point while keeping your current dining preferences. Results depend on local coverage.</p></>:<p>No geographic affinity data was returned.</p>}
    </div>}
    <details className="audience-context"><summary>Optional audience context</summary><p>Aggregate age and gender affinity associated with each interest. These values are not audience percentages and do not identify or predict your demographics.</p>
      <button disabled={busy||Boolean(loading)} onClick={()=>void load('demographics')}>{loading==='demographics'?'Reading audience context…':'Show audience context'}</button>
      {demo&&(!demo.records.length?<p>No audience context was returned.</p>:demo.records.map(record=><div className="analysis-result" key={record.id}><h4>{passport.selected.find(s=>s.id.toLowerCase()===record.id.toLowerCase())?.name ?? 'Returned interest'}</h4>
        <dl className="audience-values">{Object.entries({...record.age,...record.gender}).map(([label,value])=><div key={label}><dt>{label.replaceAll('_',' ')}</dt><dd>{value>0?'+':''}{value.toFixed(2)} affinity</dd></div>)}</dl>
      </div>))}
    </details>
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
