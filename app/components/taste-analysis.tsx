"use client";
import { Icon } from "./passport";
import { displayTags } from "../../src/qloo/explanation";
import { useRef, useState } from 'react';
import type { Passport } from '../../src/workspace/state';
import { sectionOrder } from '../../src/workspace/state';
import type { Section } from '../../src/passport/model';
import type { AgentInput } from '../../src/agent/types';
import type { AnalysisKind, AnalysisResult, HeatPoint } from '../../src/qloo/analysis';

export default function TasteAnalysis({passport,busy,onRefine}:{passport:Passport;busy:boolean;onRefine:(input:AgentInput)=>void}) {
  const [results,setResults]=useState<Partial<Record<AnalysisKind,AnalysisResult>>>({});
  const [loading,setLoading]=useState<AnalysisKind>();
  const [error,setError]=useState('');
  const [themeId,setThemeId]=useState('');
  const categories=sectionOrder.filter(section=>!passport.session?.hiddenCategories.includes(section));
  const [themeSection,setThemeSection]=useState<Section>(()=>categories.find(section=>section==='Movies') ?? categories[0] ?? 'Eat');
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
      if(kind==='taste')setThemeId('');
    }catch {setError('This analysis could not finish. Your Passport is unchanged; please retry.');}
    finally {active.current=false;setLoading(undefined);}
  }
  const taste=results.taste?.kind==='taste'?results.taste:undefined;
  const heat=results.heatmap?.kind==='heatmap'?results.heatmap:undefined;
  const demo=results.demographics?.kind==='demographics'?results.demographics:undefined;
  function exploreTheme() {
    if (!themeId || busy) return;
    const existing = passport.session?.queryPreferences?.[themeSection]?.includeTags ?? [];
    onRefine({discovery:{section:themeSection,preferences:{includeTags:[...new Set([...existing,themeId])]}}});
  }
  function nearby(point:HeatPoint) {
    onRefine({discovery:{section:'Eat',preferences:{locationPoint:`POINT(${point.longitude} ${point.latitude})`,radius:1500}}});
  }
  return <section className="taste-analysis" aria-labelledby="analysis-title">
    <div className="analysis-intro"><span className="analysis-emblem" aria-hidden="true"><Icon name="star" size={28}/></span><div><span className="micro-label">MAKE THE CITY FEEL MORE LIKE YOU</span><h2 id="analysis-title">Follow your taste. Find your next corner.</h2><p>See the connections behind your interests, or choose an area to explore next. Your discoveries stay here while you look around.</p></div></div>
    <div className="analysis-actions">
      <button className="analysis-action" aria-pressed={Boolean(taste)} disabled={busy||Boolean(loading)} onClick={()=>void load('taste')}><Icon name="star" size={22}/><span><strong>{loading==='taste'?'Finding taste connections…':'Find my taste themes'}</strong><small>Discover cultural threads in the things you love.</small></span><Icon name="arrow" size={18}/></button>
      <button className="analysis-action" aria-pressed={Boolean(heat)} disabled={busy||Boolean(loading)} onClick={()=>void load('heatmap')}><Icon name="pin" size={22}/><span><strong>{loading==='heatmap'?'Mapping your interests…':`Find an area in ${passport.city}`}</strong><small>Choose a starting point, then find dining nearby.</small></span><Icon name="arrow" size={18}/></button>
    </div>
    {error&&<p role="alert">{error}</p>}
    {loading&&<p role="status">Looking for patterns in your confirmed tastes…</p>}
    {taste&&<div className="analysis-result"><span className="micro-label">THE THREADS BETWEEN YOUR FAVORITES</span><h3>Your taste themes</h3><p>Use these connections as inspiration for what to try next. They describe associations between your interests, rather than your personality.</p>
      {displayTags(taste.tags).length ? <>
        <div className="taste-theme-list" role="group" aria-label="Choose a taste theme">
          {displayTags(taste.tags).map(tag => <button key={tag.id} type="button"
            aria-pressed={themeId === tag.id} disabled={busy} onClick={() => setThemeId(tag.id)}>
            {tag.name}
          </button>)}
        </div>
        <div className="theme-next-step">
          <label>Explore this theme in
            <select value={themeSection} disabled={busy} onChange={event => setThemeSection(event.target.value as Section)}>
              {categories.map(section => <option key={section}>{section}</option>)}
            </select>
          </label>
          <button disabled={busy || !themeId || Boolean(loading)} onClick={exploreTheme}>
            Find {themeSection.toLowerCase()} with this theme <Icon name="arrow" size={16}/>
          </button>
        </div>
        <p className="helper">Choose a returned theme and a category. We’ll search using that theme while keeping this category’s current preferences. A theme may have no local matches.</p>
      </> : <p>No taste themes were returned for this combination. You can still browse your discoveries or explore an area.</p>}

    </div>}
    {heat&&<div className="analysis-result"><span className="micro-label">PICK YOUR NEXT STARTING POINT</span><h3>Areas to explore in {passport.city}</h3><p>These areas have stronger audience affinity for your interests. Open one on the map, then find nearby dining with your current preferences.</p>
      {heat.points.length?<><AffinityPlot points={heat.points}/><p className="helper">Darker dots show stronger cultural audience affinity in this result. This is an affinity plot, not a street map or a view of live crowds.</p>
      <div className="area-choices">{distinctAreas(heat.points).map((point,index)=><article key={`${point.latitude}:${point.longitude}`}><h4>Explore area {index+1}</h4>
        <p>{point.latitude.toFixed(3)}, {point.longitude.toFixed(3)}</p>
        <a href={`https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`} target="_blank" rel="noreferrer">View area on map ↗</a>
        <button disabled={busy||Boolean(loading)} onClick={()=>nearby(point)}>Find dining nearby</button>
      </article>)}</div><p className="helper">Nearby dining searches within 1.5 km of the selected point while keeping your current dining preferences. Results depend on local coverage.</p></>:<p>No geographic affinity data was returned.</p>}
    </div>}
    <details className="audience-context"><summary>Curious who shares these interests?</summary><p>Optional aggregate audience patterns for each interest. This does not describe you, change your recommendations or show audience percentages.</p>
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
