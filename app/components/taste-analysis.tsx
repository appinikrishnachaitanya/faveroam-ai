"use client";
import { sectionLabel } from "../../src/passport/labels";
import AudienceContext from './audience-context';
import { Icon } from "./passport";
import { CategoryMultiSelect } from "./category-multi-select";
import { memo, useEffect, useRef, useState } from 'react';
import type { Passport } from '../../src/workspace/state';
import { activeCategories } from "../../src/passport/active-categories";
import { curatedThemes, themeCategories, relevantThemes, themeKind } from "../../src/passport/taste-themes";
import type { Section } from '../../src/passport/model';
import type { AgentInput } from '../../src/agent/types';
import { buildAreaGuide } from '../../src/passport/area-guide';
import { formatReturnedRating } from '../../src/passport/rating-display';
import type { AnalysisKind, AnalysisResult } from '../../src/qloo/analysis';

export default memo(function TasteAnalysis({passport,busy,onRefine}:{passport:Passport;busy:boolean;onRefine:(input:AgentInput)=>void}) {
  const [results,setResults]=useState<Partial<Record<AnalysisKind,AnalysisResult>>>({});
  const scope=[passport.agent?.sessionId ?? '',passport.city,...passport.selected.map(i=>i.id)].join('|');
  const latestScope=useRef(scope);
  latestScope.current=scope;
  const [resultScope,setResultScope]=useState(scope);
  const [loading,setLoading]=useState<AnalysisKind>();
  const [error,setError]=useState('');
  const [themeNotice,setThemeNotice]=useState('');
  const [themeId,setThemeId]=useState('');
  // Start from the full confirmed profile; users can narrow the selection.
  const [interestIds,setInterestIds]=useState<string[]>(()=>passport.selected.map(interest=>interest.id));
  const categories=activeCategories(passport.session,passport.cards);
  const [themeSections,setThemeSections]=useState<Section[]>(()=>[categories.find(section=>section==='Movies') ?? categories[0] ?? 'Eat']);
  const active=useRef(false);
  useEffect(()=>{
    setInterestIds(passport.selected.map(interest=>interest.id));
    setResults({});setResultScope(scope);setThemeId('');setError('');setThemeNotice('');
  },[scope]);

  async function load(kind:AnalysisKind) {
    if(!passport.agent || !interestIds.length || active.current || busy)return;
    active.current=true;setLoading(kind);setError('');setThemeNotice('');
    try {
      const response=await fetch('/api/agent/intelligence',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({...passport.agent,action:'analysis',kind,interestIds}),signal:AbortSignal.timeout(65000)});
      const data=await response.json();
      if(!response.ok)throw Error(typeof data.error==='string' ? data.error : 'Analysis is unavailable.');
      if (latestScope.current !== scope) return;
      setResultScope(scope);
      setResults(current=>({...current,[kind]:data.analysis}));
      if(kind==='taste'){
        const unavailable=Array.isArray(data.themeStatus?.unavailable)?data.themeStatus.unavailable:[];
        const noConnections=Array.isArray(data.themeStatus?.noConnections)?data.themeStatus.noConnections:[];
        const notes=[...(unavailable.length?[`A theme lookup could not finish for ${unavailable.join(', ')}.`]:[]),...(noConnections.length?[`No distinct theme was returned for ${noConnections.join(', ')}.`]:[])];
        if(notes.length)setThemeNotice(`${notes.join(' ')} The interests with results are labelled on each theme.`);
      }
      if(kind==='taste')setThemeId('');
    }catch (e) {if(latestScope.current===scope)setError(e instanceof Error && /session|latest version|changed/i.test(e.message) ? 'Your Passport was updated. Reopen Taste Insights and try again.' : 'Taste Insights could not load right now. Please try again; your Passport is unchanged.');}
    finally {active.current=false;setLoading(undefined);}
  }
  const visible: Partial<Record<AnalysisKind,AnalysisResult>> = scope === resultScope ? results : {};
  const taste=visible.taste?.kind==='taste'?visible.taste:undefined;
  const themes=taste ? relevantThemes(taste.tags, passport.selected.filter(interest=>interestIds.includes(interest.id))) : [];
  const themeKey=(theme:typeof themes[number])=>`${theme.sourceInterestId??'combined'}:${theme.id}`;
  const selectedTheme=themes.find(theme=>themeKey(theme)===themeId);
  const themeMatches=selectedTheme?passport.cards.filter(card=>card.evidence?.result.tags.some(tag=>tag.id===selectedTheme.id)).slice(0,3):[];
  const themeOptions=themeCategories(selectedTheme,categories);
  const effectiveThemeSections=themeSections.filter(section=>themeOptions.includes(section)).slice(0,3);
  if(!effectiveThemeSections.length && themeOptions[0])effectiveThemeSections.push(themeOptions[0]);
  const diverseThemes=curatedThemes(themes,12);
  const primaryThemes=diverseThemes.slice(0,6);
  const additionalThemes=diverseThemes.slice(6);
  const heat=visible.heatmap?.kind==='heatmap'?visible.heatmap:undefined;
  const areas=heat ? buildAreaGuide(heat.points,passport.cards) : [];
  function exploreTheme() {
    if (!selectedTheme || busy || !effectiveThemeSections.length) return;
    onRefine({discovery:{sections:effectiveThemeSections,preferences:{inspirationTags:[selectedTheme.id],inspirationName:selectedTheme.name}}});
  }
  function nearby(point:{latitude:number;longitude:number}) {
    onRefine({discovery:{sections:['Eat'],preferences:{locationPoint:`POINT(${point.longitude} ${point.latitude})`,radius:1500}}});
  }
  return <section className="taste-analysis" aria-labelledby="analysis-title">
    <div className="analysis-intro"><span className="analysis-emblem" aria-hidden="true"><Icon name="star" size={28}/></span><div><span className="micro-label">MAKE THE CITY FEEL MORE LIKE YOU</span><h2 id="analysis-title">Find your next direction.</h2><p>Turn what you love into a new direction. Find a theme, or pick a starting place and explore food nearby.</p></div><img className="insight-illustration" src="/illustrations/taste-threads.svg" width="160" height="110" alt="" aria-hidden="true" loading="lazy" decoding="async"/></div>
    <ol className="insight-steps" aria-label="How Taste Insights works"><li><span>01</span>Choose your tastes</li><li><span>02</span>Find a connection</li><li><span>03</span>Explore it in Discover</li></ol>
    <fieldset className="analysis-interest-picker" disabled={busy||Boolean(loading)}>
      <legend>Choose the interests to explore</legend>
        <p>Select one or more of your confirmed interests. We check each one separately so a strong food signal can’t drown out your music or film interests.</p>
      <div className="analysis-interest-options">
        {passport.selected.map(interest=><label key={interest.id} className={interestIds.includes(interest.id)?"selected":""}>
          <input type="checkbox" checked={interestIds.includes(interest.id)} onChange={event=>{
            setInterestIds(previous=>event.target.checked?[...previous,interest.id]:previous.filter(id=>id!==interest.id));
            setResults({});setThemeId('');setError('');setThemeNotice('');
          }}/><span>{interest.name}</span>
        </label>)}
      </div>
      <div className="analysis-selection-summary"><small>{interestIds.length} of {passport.selected.length} selected</small>{passport.selected.length>1 && interestIds.length<passport.selected.length && <button type="button" onClick={()=>{setInterestIds(passport.selected.map(interest=>interest.id));setResults({});setThemeId('');setError('');setThemeNotice('');}}>Use all my tastes</button>}</div>
    </fieldset>
    <div className="analysis-actions">
      <button className="analysis-action" aria-pressed={Boolean(taste)} disabled={busy||Boolean(loading)||!interestIds.length} onClick={()=>void load('taste')}><Icon name="star" size={22}/><span><strong>{loading==='taste'?'Finding taste connections…':'Explore a new side of my taste'}</strong><small>Find returned connections for each selected interest, then use one to discover something new.</small></span><Icon name="arrow" size={18}/></button>
      <button className="analysis-action" aria-pressed={Boolean(heat)} disabled={busy||Boolean(loading)||!interestIds.length} onClick={()=>void load('heatmap')}><Icon name="pin" size={22}/><span><strong>{loading==='heatmap'?'Finding a place to start…':`Start from a place in ${passport.city}`}</strong><small>See a named place from your discoveries, then search for food nearby.</small></span><Icon name="arrow" size={18}/></button>
    </div>
    {!interestIds.length&&<p role="status">Choose at least one interest to see relevant insights.</p>}
    {error&&<p role="alert">{error}</p>}
    {themeNotice&&<p className="theme-source-notice" role="status">{themeNotice}</p>}
    {loading&&<p role="status">Looking for patterns in your confirmed tastes…</p>}
    {taste&&<div className="analysis-result"><span className="micro-label">THE THREADS BETWEEN YOUR FAVORITES</span><h3>Your taste themes</h3><p>We checked each selected favorite separately. The label on every theme shows which one it came from; these are audience associations, not personality predictions.</p>
      {themes.length ? <>
        <div className="taste-theme-list" role="group" aria-label="Choose a taste theme">
          {primaryThemes.map(tag => <button key={`${tag.sourceInterestId??'combined'}:${tag.id}`} type="button"
            aria-pressed={themeId === themeKey(tag)} disabled={busy} onClick={() => setThemeId(themeKey(tag))}>
            <small>{themeKind(tag)}{tag.sourceInterestName?` · from ${tag.sourceInterestName}`:''}</small><strong>{tag.name}</strong>
          </button>)}
        </div>
        {additionalThemes.length>0 && <details className="additional-themes"><summary>See {additionalThemes.length} more themes</summary><div className="taste-theme-list">{additionalThemes.map(tag=><button key={themeKey(tag)} type="button" aria-pressed={themeId===themeKey(tag)} disabled={busy} onClick={()=>setThemeId(themeKey(tag))}><small>{themeKind(tag)}{tag.sourceInterestName?` · from ${tag.sourceInterestName}`:''}</small><strong>{tag.name}</strong></button>)}</div></details>}
        {selectedTheme&&<section className="theme-direction" aria-label="Your selected discovery direction"><p className="selected-theme-summary" role="status"><strong>{selectedTheme.sourceInterestName??passport.selected.filter(interest=>interestIds.includes(interest.id)).map(interest=>interest.name).join(' + ')} → {selectedTheme.name}</strong><span>{selectedTheme.sourceInterestName?`This returned connection was found for ${selectedTheme.sourceInterestName} on its own.`:'This association was returned for your selected tastes together.'}</span></p><h4>Where this could take you</h4>{themeMatches.length?<><p>These current discoveries carry this exact theme in their returned tags.</p><ul>{themeMatches.map(card=><li key={card.id}><strong>{card.name}</strong><small>{sectionLabel(card.section)}{card.address?` · ${card.address}`:''}</small></li>)}</ul></>:<p>Your current discoveries don’t carry this exact tag. Explore it below to look for new choices; results aren’t guaranteed.</p>}<p className="helper">This adds a soft inspiration signal, not an exact-match filter. The first choices may stay the same. Your budget, dietary requirements, location and other explicit filters stay in place.</p></section>}
        <div className="theme-next-step">
          <CategoryMultiSelect label="Explore theme in" available={themeOptions} selected={effectiveThemeSections} onChange={setThemeSections} disabled={busy||Boolean(loading)}/>
          <button disabled={busy || !themeId || Boolean(loading) || !effectiveThemeSections.length} onClick={exploreTheme}>
            Find discoveries in this direction <Icon name="arrow" size={16}/>
          </button>
        </div>
        <p className="helper">Choose a returned theme and one or more relevant categories. We’ll search each selected category with that theme and keep the other results. A theme may have no local matches.</p>
      </> : <div className="theme-empty-state"><strong>No clear new connection for this selection yet.</strong><p>Choose a different favorite above, try your tastes together, or start from a nearby place.</p><button type="button" disabled={busy||Boolean(loading)} onClick={()=>void load('heatmap')}>Find a place to start <Icon name="arrow" size={16}/></button><small>Your Discover results haven’t changed.</small></div>}

    </div>}
    {heat&&<div className="analysis-result area-guide"><span className="micro-label">TURN A PLACE INTO AN OUTING</span>
      <h3>Start somewhere you can actually visit</h3>
      <h4>Nearby Passport discoveries</h4>
      <p>{areas.some(area=>area.fromAreaSignal)
        ? "These are named places already in your Passport near suggested areas. Pick one as a starting point, then see food nearby."
        : "We couldn't match an area to your current places, so start with one of these existing discoveries."}</p>
      {areas.length ? <div className="area-choices">{areas.map(area=><article key={area.anchor.id}>
        <span className="micro-label">{area.fromAreaSignal ? "NEAR A TASTE-CONNECTED AREA" : "FROM YOUR DISCOVERIES"}</span>
        <h4>Start at {area.anchor.name}</h4>
        <p>{area.anchor.address || area.anchor.intelligence?.location?.address || `${sectionLabel(area.anchor.section)} in ${passport.city}`}</p>
        <p className="area-place-details">{sectionLabel(area.anchor.section)}{area.anchor.intelligence?.quality?.businessRating !== undefined ? ` · ★ ${formatReturnedRating(area.anchor.intelligence.quality.businessRating)} / 5` : ""}</p>
        {area.nearby.length > 0 && <div className="area-nearby"><strong>Also nearby</strong><ul>{area.nearby.map(place=><li key={place.id}>{place.name}<small>{sectionLabel(place.section)}</small></li>)}</ul></div>}
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([area.anchor.name,area.anchor.address,passport.city].filter(Boolean).join(', '))}`} target="_blank" rel="noreferrer">Open this place on the map ↗</a>
        {area.point && <button disabled={busy||Boolean(loading)} onClick={()=>nearby(area.point!)}>Find food around here</button>}
      </article>)}</div> : <p>No local places are available to preview yet. Find food in Discover, then return to explore where to start.</p>}
      <p className="helper">“Find food around here” searches within 1.5 km of the named place and keeps your food preferences. Check routes and hours before going.</p>
    </div>}
    <AudienceContext interests={passport.selected.filter(interest=>interestIds.includes(interest.id))} records={visible.demographics?.kind==='demographics'?visible.demographics.records:undefined} loading={loading==='demographics'} disabled={busy||Boolean(loading)} onLoad={()=>void load('demographics')}/>
  </section>;
});
