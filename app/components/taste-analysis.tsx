"use client";
import { Icon } from "./passport";
import { displayTags } from "../../src/qloo/explanation";
import { useEffect, useRef, useState } from 'react';
import type { Passport } from '../../src/workspace/state';
import { sectionOrder } from '../../src/workspace/state';
import type { Section } from '../../src/passport/model';
import type { AgentInput } from '../../src/agent/types';
import { buildAreaGuide } from '../../src/passport/area-guide';
import { plotHeatmap } from '../../src/passport/heatmap-plot';
import { formatReturnedRating } from '../../src/passport/rating-display';
import type { AnalysisKind, AnalysisResult } from '../../src/qloo/analysis';

export default function TasteAnalysis({passport,busy,onRefine}:{passport:Passport;busy:boolean;onRefine:(input:AgentInput)=>void}) {
  const [results,setResults]=useState<Partial<Record<AnalysisKind,AnalysisResult>>>({});
  const scope=[passport.agent?.sessionId ?? '',passport.city,...passport.selected.map(i=>i.id)].join('|');
  const latestScope=useRef(scope);
  latestScope.current=scope;
  const [resultScope,setResultScope]=useState(scope);
  const [loading,setLoading]=useState<AnalysisKind>();
  const [error,setError]=useState('');
  const [themeId,setThemeId]=useState('');
  // Start with one interest. Users explicitly choose any other combination.
  const [interestIds,setInterestIds]=useState<string[]>(()=>passport.selected[0]?[passport.selected[0].id]:[]);
  const categories=sectionOrder.filter(section=>!passport.session?.hiddenCategories.includes(section));
  const [themeSection,setThemeSection]=useState<Section>(()=>categories.find(section=>section==='Movies') ?? categories[0] ?? 'Eat');
  const active=useRef(false);
  useEffect(()=>{
    setInterestIds(passport.selected[0] ? [passport.selected[0].id] : []);
    setResults({});setResultScope(scope);setThemeId('');setError('');
  },[scope]);

  async function load(kind:AnalysisKind) {
    if(!passport.agent || !interestIds.length || active.current || busy)return;
    active.current=true;setLoading(kind);setError('');
    try {
      const response=await fetch('/api/agent/intelligence',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({...passport.agent,action:'analysis',kind,interestIds}),signal:AbortSignal.timeout(65000)});
      const data=await response.json();
      if(!response.ok)throw Error(typeof data.error==='string' ? data.error : 'Analysis is unavailable.');
      if (latestScope.current !== scope) return;
      setResultScope(scope);
      setResults(current=>({...current,[kind]:data.analysis}));
      if(kind==='taste')setThemeId('');
    }catch (e) {if(latestScope.current===scope)setError(e instanceof Error && /session|latest version|changed/i.test(e.message) ? 'Your Passport was updated. Reopen Taste Insights and try again.' : 'Taste Insights could not load right now. Please try again; your Passport is unchanged.');}
    finally {active.current=false;setLoading(undefined);}
  }
  const visible: Partial<Record<AnalysisKind,AnalysisResult>> = scope === resultScope ? results : {};
  const taste=visible.taste?.kind==='taste'?visible.taste:undefined;
  const heat=visible.heatmap?.kind==='heatmap'?visible.heatmap:undefined;
  const plot=heat ? plotHeatmap(heat.points) : undefined;
  const areas=heat ? buildAreaGuide(heat.points,passport.cards) : [];
  const demo=visible.demographics?.kind==='demographics'?visible.demographics:undefined;
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
    <fieldset className="analysis-interest-picker" disabled={busy||Boolean(loading)}>
      <legend>Choose the interests to explore</legend>
      <p>Select one or more of your confirmed interests. Insights are generated for exactly this selection, not every possible combination.</p>
      <div className="analysis-interest-options">
        {passport.selected.map(interest=><label key={interest.id} className={interestIds.includes(interest.id)?"selected":""}>
          <input type="checkbox" checked={interestIds.includes(interest.id)} onChange={event=>{
            setInterestIds(previous=>event.target.checked?[...previous,interest.id]:previous.filter(id=>id!==interest.id));
            setResults({});setThemeId('');setError('');
          }}/><span>{interest.name}</span>
        </label>)}
      </div>
      <small>{interestIds.length} of {passport.selected.length} selected</small>
    </fieldset>
    <div className="analysis-actions">
      <button className="analysis-action" aria-pressed={Boolean(taste)} disabled={busy||Boolean(loading)||!interestIds.length} onClick={()=>void load('taste')}><Icon name="star" size={22}/><span><strong>{loading==='taste'?'Finding taste connections…':'Find my taste themes'}</strong><small>Discover cultural threads in the things you love.</small></span><Icon name="arrow" size={18}/></button>
      <button className="analysis-action" aria-pressed={Boolean(heat)} disabled={busy||Boolean(loading)||!interestIds.length} onClick={()=>void load('heatmap')}><Icon name="pin" size={22}/><span><strong>{loading==='heatmap'?'Mapping your interests…':`Find an area in ${passport.city}`}</strong><small>Choose a starting point, then find dining nearby.</small></span><Icon name="arrow" size={18}/></button>
    </div>
    {!interestIds.length&&<p role="status">Choose at least one interest to see relevant insights.</p>}
    {error&&<p role="alert">{error}</p>}
    {loading&&<p role="status">Looking for patterns in your confirmed tastes…</p>}
    {taste&&<div className="analysis-result"><span className="micro-label">THE THREADS BETWEEN YOUR FAVORITES</span><h3>Your taste themes</h3><p>Based on {passport.selected.filter(interest=>interestIds.includes(interest.id)).map(interest=>interest.name).join(" + ")}. These are cultural associations, not personality predictions.</p>
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
      <h3>Geographic taste signals in {passport.city}</h3>
      {plot ? <div className="taste-map-panel">
        <p><strong>Qloo geographic affinity</strong> · {plot.points.length} distinct returned locations</p>
        <svg className="taste-heatplot" viewBox="0 0 100 100" role="img" aria-label={`Schematic coordinate plot showing ${plot.points.length} Qloo affinity locations in ${passport.city}. Darker circles indicate stronger relative affinity among the returned points.`}>
          <rect x="0" y="0" width="100" height="100" rx="6" fill="#e9eee5"/>
          {[25,50,75].map(v=><g key={v}><line x1={v} y1="6" x2={v} y2="94" stroke="#c4cec2" strokeWidth=".2"/><line x1="6" y1={v} x2="94" y2={v} stroke="#c4cec2" strokeWidth=".2"/></g>)}
          {plot.points.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={2.4+3*p.intensity} fill="#255847" fillOpacity={0.20+0.62*p.intensity} stroke="#f0f4ed" strokeWidth=".25"/>) }
          <text x="3" y="6" fontSize="4" fill="#3e544e">N ↑</text>
        </svg>
        <div className="taste-map-legend"><span>Lower relative affinity</span><div className="taste-map-scale" aria-hidden="true"/><span>Higher relative affinity</span></div>
        <p className="helper">Real Qloo coordinates shown on a schematic plot, not a street map. Color is relative to the points returned for these interests—not a rating, audience percentage or chance you'll enjoy a venue. Use the place links below for navigation.</p>
        <div className="taste-map-point-list">{plot.points.slice().sort((a,b)=>b.intensity-a.intensity).slice(0,3).map((p,i)=><button key={i} disabled={busy||Boolean(loading)} onClick={()=>nearby(p)} type="button">Explore around {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}</button>)}</div>
      </div> : <p className="helper">Qloo didn't return enough valid geographic coordinates to plot these interests. Your Passport discoveries remain available below.</p>}
      <h4>Nearby Passport discoveries</h4>
      <p>{areas.some(area=>area.fromAreaSignal)
        ? "Some existing Passport places are within 1.5 km of a returned geographic affinity point. Proximity alone does not establish a personal taste match."
        : "We couldn’t connect the suggested areas to places in your current Passport. Start with these taste-led discoveries instead."}</p>
      {areas.length ? <div className="area-choices">{areas.map(area=><article key={area.anchor.id}>
        <span className="micro-label">{area.fromAreaSignal ? "NEAR A RETURNED AFFINITY POINT" : "FROM YOUR DISCOVERIES"}</span>
        <h4>Start at {area.anchor.name}</h4>
        <p>{area.anchor.address || area.anchor.intelligence?.location.address || `${area.anchor.section} in ${passport.city}`}</p>
        <p className="area-place-details">{area.anchor.section}{area.anchor.intelligence?.quality.businessRating !== undefined ? ` · ★ ${formatReturnedRating(area.anchor.intelligence.quality.businessRating)} / 5 (Qloo-reported business rating)` : ""}</p>
        {area.nearby.length > 0 && <div className="area-nearby"><strong>Also nearby</strong><ul>{area.nearby.map(place=><li key={place.id}>{place.name}<small>{place.section}</small></li>)}</ul></div>}
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([area.anchor.name,area.anchor.address,passport.city].filter(Boolean).join(', '))}`} target="_blank" rel="noreferrer">Open this place on the map ↗</a>
        {area.point && <button disabled={busy||Boolean(loading)} onClick={()=>nearby(area.point!)}>Find dining around here</button>}
      </article>)}</div> : <p>No local places are available to preview yet. Find dining in Discover, then return to explore where to start.</p>}
      <p className="helper">“Find dining around here” searches within 1.5 km of the named place and keeps your dining preferences. Nearby means straight-line distance; check routes, opening hours and availability before going.</p>
    </div>}
    <details className="audience-context"><summary>Audience patterns (optional research)</summary><p>This is extra context, not a recommendation about you. See which age or gender categories are most strongly associated with these interests in Qloo's returned data. These are not audience counts, personal traits, or proof of who will enjoy something. To find something useful to do next, choose a related taste theme above and explore it in a category.</p>
      <button disabled={busy||Boolean(loading)||!interestIds.length} onClick={()=>void load('demographics')}>{loading==='demographics'?'Reading audience context…':'Show audience context'}</button>
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
