"use client";
import { Icon } from "./passport";
import { displayTags } from "../../src/qloo/explanation";
import { useRef, useState } from 'react';
import type { Passport } from '../../src/workspace/state';
import { sectionOrder } from '../../src/workspace/state';
import type { Section } from '../../src/passport/model';
import type { AgentInput } from '../../src/agent/types';
import { buildAreaGuide } from '../../src/passport/area-guide';
import type { AnalysisKind, AnalysisResult } from '../../src/qloo/analysis';

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
  const areas=heat ? buildAreaGuide(heat.points,passport.cards) : [];
  const demo=results.demographics?.kind==='demographics'?results.demographics:undefined;
  function exploreTheme() {
    if (!themeId || busy) return;
    const existing = passport.session?.queryPreferences?.[themeSection]?.includeTags ?? [];
    onRefine({discovery:{section:themeSection,preferences:{includeTags:[...new Set([...existing,themeId])]}}});
  }
  function nearby(point:{latitude:number;longitude:number}) {
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
    {heat&&<div className="analysis-result area-guide"><span className="micro-label">TURN A PLACE INTO AN OUTING</span>
      <h3>Places to start exploring in {passport.city}</h3>
      <p>{areas.some(area=>area.fromAreaSignal)
        ? "These discoveries sit near areas connected to your tastes. Start at a place you like, then see what else is nearby."
        : "We couldn’t connect the suggested areas to places in your current Passport. Start with these taste-led discoveries instead."}</p>
      {areas.length ? <div className="area-choices">{areas.map(area=><article key={area.anchor.id}>
        <span className="micro-label">{area.fromAreaSignal ? "NEAR A TASTE-CONNECTED AREA" : "FROM YOUR DISCOVERIES"}</span>
        <h4>Start at {area.anchor.name}</h4>
        <p>{area.anchor.address || area.anchor.intelligence?.location.address || `${area.anchor.section} in ${passport.city}`}</p>
        <p className="area-place-details">{area.anchor.section}{area.anchor.intelligence?.quality.businessRating !== undefined ? ` · ★ ${area.anchor.intelligence.quality.businessRating.toFixed(1)} / 5` : ""}</p>
        {area.nearby.length > 0 && <div className="area-nearby"><strong>Also nearby</strong><ul>{area.nearby.map(place=><li key={place.id}>{place.name}<small>{place.section}</small></li>)}</ul></div>}
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([area.anchor.name,area.anchor.address,passport.city].filter(Boolean).join(', '))}`} target="_blank" rel="noreferrer">Open this place on the map ↗</a>
        {area.point && <button disabled={busy||Boolean(loading)} onClick={()=>nearby(area.point!)}>Find dining around here</button>}
      </article>)}</div> : <p>No local places are available to preview yet. Find dining in Discover, then return to explore where to start.</p>}
      <p className="helper">“Find dining around here” searches within 1.5 km of the named place and keeps your dining preferences. Nearby means straight-line distance; check routes, opening hours and availability before going.</p>
    </div>}
    <details className="audience-context"><summary>Curious who shares these interests?</summary><p>Optional audience patterns for each interest. These show the strongest associations within the returned groups, not audience size or facts about you. Your recommendations stay unchanged.</p>
      <button disabled={busy||Boolean(loading)} onClick={()=>void load('demographics')}>{loading==='demographics'?'Reading audience context…':'Show audience context'}</button>
      {demo&&(!demo.records.length?<p>No audience context was returned.</p>:demo.records.map(record=><div className="analysis-result" key={record.id}><h4>{passport.selected.find(s=>s.id.toLowerCase()===record.id.toLowerCase())?.name ?? 'Returned interest'}</h4>
        <dl className="audience-values">{([["Most associated age group",record.age],["Most associated gender",record.gender]] as const).map(([label,values])=>{
          const entries=Object.entries(values).sort((a,b)=>b[1]-a[1]);
          if(!entries.length)return null;
          return <div key={String(label)}><dt>{String(label)}</dt><dd>{entries.filter(([,value])=>value===entries[0][1]).map(([key])=>key.replaceAll('_',' ')).join(' / ')}</dd></div>;
        })}</dl>
      </div>))}
    </details>
  </section>;
}
