"use client";
import { sectionLabel } from "../../src/passport/labels";
import { memo, useEffect, useRef, useState } from "react";
import type { Passport, Resolution } from "../../src/workspace/state";
import { activeCategories } from "../../src/passport/active-categories";
import { sectionOrder } from "../../src/workspace/state";
import { CategoryMultiSelect } from "./category-multi-select";
import type { AgentInput } from "../../src/agent/types";
import type { Card, Section } from "../../src/passport/model";
import type { TasteComparison } from "../../src/qloo/compare";
import { createLatestRequest } from "../../src/workspace/latest-request";
import { audienceAgeBands, type AudienceAgeBand, type DiscoveryGoal, type QueryPreferences } from "../../src/qloo/query-plan";
import { ResultMetrics, WhyEvidence } from "./intelligence-evidence";
import { priceLabel } from "../../src/passport/pricing";
import { suggestedMatches } from "../../src/passport/matching";
import { isPlaceSection } from "../../src/passport/model";
import { Icon } from "./passport";
import FirstWeek from './first-week';
import CommonGroundThemes from './common-ground-themes';
import {commonGroundStarters,sharedHangout,hangoutExplanation,meaningfulSharedThemes,nearbySharedPlaces} from '../../src/passport/common-ground';
const modes: { id: DiscoveryGoal; name: string; detail: string; icon: string }[] = [
  {
    id: "discover",
    name: "For you",
    detail: "Recommendations shaped by your confirmed interests.",
    icon: "heart",
  },
  {
    id: "trending",
    name: "Trending for you",
    detail:
      "Taste-led suggestions with trend ranking; this does not show popularity history.",
    icon: "star",
  },
  {
    id: "hidden-gems",
    name: "Hidden gems",
    detail: "Favor quality signals and exclude the most popular results when data is available.",
    icon: "globe",
  },
  {
    id: "safe-bets",
    name: "Safe bets",
    detail: "For places, require a listed rating of at least 4/5 and favor quality signals.",
    icon: "check",
  },
  {
    id: "surprise",
    name: "Surprise me",
    detail: "Explore broader cultural connections while keeping your explicit requirements.",
    icon: "arrow",
  },
];
export default memo(function TasteIntelligence({
  passport,
  cartoKey='',
  busy,
  onRefine,
  view = "preferences",
  onPreferences,
  partnerSample = [],
}: {
  passport: Passport;
  cartoKey?: string;
  busy: boolean;
  onRefine: (input: AgentInput) => void;
  view?: "preferences" | "together";
  onPreferences?: () => void;
  partnerSample?: string[];
}) {
  const [section, setSection] = useState<Section>(()=>sectionOrder.find(s=>passport.cards.some(c=>c.section===s)) ?? "Eat");
  const [selectedSections,setSelectedSections]=useState<Section[]>(()=>[sectionOrder.find(s=>passport.cards.some(c=>c.section===s)) ?? "Eat"]);
  const currentCategories=activeCategories(passport.session,passport.cards);
  const available:Section[]=view==="together"?[...new Set<Section>([...currentCategories,"Eat","Coffee","Culture"])]:currentCategories;
  const availableKey=available.join(",");
  useEffect(()=>{if(available.length&&!available.includes(section))setSection(available[0]);},[availableKey,section]);
  useEffect(()=>setSelectedSections(current=>{
    const kept=current.filter(category=>available.includes(category));
    return kept.length?kept:available.slice(0,1);
  }),[availableKey]);
  const prefs = passport.session?.queryPreferences?.[section];
  const [goal, setGoal] = useState<DiscoveryGoal>(
    () => prefs?.goal ?? "discover",
  );
  const [audienceAge,setAudienceAge]=useState<AudienceAgeBand|"all">(prefs?.audienceAge??"all");
  const [price, setPrice] = useState(() => prefs?.priceMax?.toString() ?? "4");
  const [rating, setRating] = useState(
    () => prefs?.businessRatingMin?.toString() ?? "",
  );
  const [area, setArea] = useState(prefs?.locationQuery ?? ""),
    [avoidArea, setAvoidArea] = useState(prefs?.excludeLocation ?? ""),
    [source, setSource] = useState(prefs?.requiredExternalSources?.[0] ?? ""),
    [reviews, setReviews] = useState(prefs?.tripAdvisorReviewCountMin?.toString() ?? "");
  const preferenceSnapshot = JSON.stringify(prefs ?? {});
  useEffect(() => {
    const current: QueryPreferences = JSON.parse(preferenceSnapshot);
    setGoal(current.goal ?? "discover");
    setAudienceAge(current.audienceAge??"all");
    setPrice(current.priceMax?.toString() ?? "4");
    setRating(current.businessRatingMin?.toString() ?? "");
    setArea(current.locationQuery ?? "");
    setAvoidArea(current.excludeLocation ?? "");
    setSource(current.requiredExternalSources?.[0] ?? "");
    setReviews(current.tripAdvisorReviewCountMin?.toString() ?? "");
  }, [section, preferenceSnapshot, passport.agent?.revision]);
  const [partner, setPartner] = useState(()=>partnerSample.length?partnerSample.slice(0,3):[""]);
  useEffect(()=>{if(partnerSample.length)setPartner(current=>current.length===1&&!current[0]?partnerSample.slice(0,3):current);},[partnerSample.join('|')]);
  const [expandedMatch, setExpandedMatch] = useState<number>();
  const [resolution, setResolution] = useState<Resolution>();
  const [ids, setIds] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [together, setTogether] = useState<{
    comparison: TasteComparison;
    cards: Card[];
    partner?: string[];
    exchange?: {person:string;theme?:string;card?:Card;cards?:Card[]}[];
    partnerSignals?:{id:string;name:string}[];
    failedSections?:Section[];
    notice: string;
  }>();
  const [jointLocked,setJointLocked]=useState(false);
  const [sharedAnchorId,setSharedAnchorId]=useState('all');
  const [sharedRadius,setSharedRadius]=useState(3000);
  const anchors=passport.cards.filter(card=>isPlaceSection(card.section)&&Number.isFinite(card.intelligence?.location?.latitude)&&Number.isFinite(card.intelligence?.location?.longitude));
  const sharedAnchor=sharedAnchorId==='all'?undefined:anchors.find(card=>card.id===sharedAnchorId)??anchors[0];
  const sharedCards=nearbySharedPlaces(together?.cards??[],sharedAnchor,sharedRadius);
  const [debug, setDebug] = useState<unknown>();
  const hasEntityProfile = passport.selected.some(candidate => !candidate.id.startsWith("urn:tag:"));
  const profileScope = `${passport.agent?.sessionId ?? ""}|${passport.agent?.revision ?? ""}|${passport.city}|${passport.selected.map(item => item.id).join(",")}`;
  const currentProfileScope = useRef(profileScope);
  currentProfileScope.current = profileScope;
  const comparisonRequests = useRef<ReturnType<typeof createLatestRequest> | null>(null);
  if (!comparisonRequests.current) comparisonRequests.current = createLatestRequest();
  useEffect(() => {
    comparisonRequests.current?.cancel();
    setResolution(undefined);
    setIds({});
    setTogether(undefined);
    setDebug(undefined);
    setError("");
    setLoading(false);
    return () => comparisonRequests.current?.cancel();
  }, [profileScope]);
  async function post(path: string, body: unknown, signal?: AbortSignal) {
    const r = await fetch(path, {
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(75_000)])
        : AbortSignal.timeout(75_000),
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const b = await r.json();
    if (!r.ok) throw Error(b.error ?? "Please try again.");
    return b;
  }
  async function resolvePartner() {
    const scope = profileScope;
    const request = comparisonRequests.current!.start();
    setLoading(true);
    setError("");
    setTogether(undefined);
    try {
      const matches = await post("/api/agent/resolve", { seeds: partner.map(value=>value.trim()).filter(Boolean) }, request.signal);
      if (!comparisonRequests.current?.isCurrent(request) || currentProfileScope.current !== scope) return;
      setResolution(matches);
      setExpandedMatch(undefined);
      setIds(suggestedMatches(matches.items.map((item: Resolution["items"][number]) => ({ ...item, candidates: item.candidates.filter(candidate => !candidate.id.startsWith("urn:tag:")) }))));
    } catch {
      if (!comparisonRequests.current?.isCurrent(request) || currentProfileScope.current !== scope) return;
      setError(
        "Could not find that interest. Try a specific artist, film, book or brand.",
      );
    } finally {
      if (comparisonRequests.current?.isCurrent(request)) {
        comparisonRequests.current.cancel();
        setLoading(false);
      }
    }
  }
  async function commonGround() {
    if (!passport.agent || !resolution) return;
    const scope = profileScope;
    const request = comparisonRequests.current!.start();
    setLoading(true);
    setError("");
    try {
      const comparison = await post("/api/agent/intelligence", {
        ...passport.agent,
        action: "together",
        token: resolution.token,
        ids: [...new Set(Object.values(ids))],
        sections: selectedSections,
      }, request.signal);
      if (!comparisonRequests.current?.isCurrent(request) || currentProfileScope.current !== scope) return;
      setTogether(comparison);
    } catch (e) {
      if (!comparisonRequests.current?.isCurrent(request) || currentProfileScope.current !== scope) return;
      setError(
        e instanceof Error
          ? e.message
          : "Comparison is unavailable. Your Passport is preserved.",
      );
    } finally {
      if (comparisonRequests.current?.isCurrent(request)) {
        comparisonRequests.current.cancel();
        setLoading(false);
      }
    }
  }
  return (
    <section className="taste-intelligence" aria-label={view === "together" ? "Together" : "Your discovery preferences"}>
      <div className="intelligence-content">
        <div className="intelligence-intro"><div><span className="micro-label">{view === "together" ? "TOGETHER" : "MAKE IT YOURS"}</span><h2>{view === "together" ? "Find your next yes, together." : "Your city. Your kind of day."}</h2><p>{view === "together" ? "One thing they love is enough to find a shared starting point." : "Choose one or more categories to refresh together. Your other discoveries stay put."}</p></div><span className="intelligence-intro-mark" aria-hidden="true"><Icon name={view === "together" ? "People" : "sliders"} size={44}/></span></div>
        <CategoryMultiSelect label={view === "together" ? "Categories to find together" : "Categories to update"}
          available={available} selected={selectedSections} disabled={busy||loading} onChange={next=>{
            setSelectedSections(next);
            const focus=next[0];setSection(focus);
            const pref=passport.session?.queryPreferences?.[focus];setGoal(pref?.goal??"discover");setAudienceAge(pref?.audienceAge??"all");setPrice(pref?.priceMax?.toString()??"4");setRating(pref?.businessRatingMin?.toString()??"");setArea(pref?.locationQuery??"");setAvoidArea(pref?.excludeLocation??"");setSource(pref?.requiredExternalSources?.[0]??"");setReviews(pref?.tripAdvisorReviewCountMin?.toString()??"");setTogether(undefined);
          }}/>
        <form
          hidden={view !== "preferences"}
          className="intelligence-preferences"
          onSubmit={(e) => {
            e.preventDefault();
            onRefine({
              discovery: {
                sections: selectedSections,
                preferences: {
                  goal,
                  audienceAge,
                  ...(selectedSections.every(isPlaceSection) && price ? { priceMax: Number(price) } : {}),
                  ...(selectedSections.every(isPlaceSection) && rating ? { businessRatingMin: Number(rating) } : {}),
                  ...(selectedSections.every(isPlaceSection) && area.trim()
                    ? { locationQuery: area.trim(), radius: 0 }
                    : {}),
                  ...(selectedSections.every(isPlaceSection) && avoidArea.trim()
                    ? { excludeLocation: avoidArea.trim() }
                    : {}),
                  ...(selectedSections.every(isPlaceSection) && source ? { requiredExternalSources: [source] } : {}),
                  ...(selectedSections.every(isPlaceSection) && reviews
                    ? { tripAdvisorReviewCountMin: Number(reviews) }
                    : {}),
                },
              },
            });
          }}
        >
          <div className="preference-style-heading"><div className="preference-section-heading"><span className="micro-label">CHOOSE THE FEEL</span><strong>What sounds good today?</strong></div><button type="button" className="quiet-button preference-pick" disabled={busy||loading} onClick={()=>{const choices=modes.filter(mode=>mode.id!==goal);setGoal(choices[Math.floor(Math.random()*choices.length)].id);}}><Icon name="star" size={17}/> Pick a direction</button></div>
          <div
            className="intelligence-modes"
            role="group"
            aria-label="Discovery style"
          >
            {modes.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={busy || loading}
                aria-pressed={goal === m.id}
                onClick={() => setGoal(m.id)}
              >
                <Icon name={m.icon} size={21}/><strong>{m.name}</strong><small className="sr-only">{m.detail}</small>
              </button>
            ))}
          </div>
          <p className="preference-style-description" role="status"><strong>{modes.find(m=>m.id===goal)?.name}</strong><span>{modes.find(m=>m.id===goal)?.detail}</span></p>
          <p className="sr-only">{modes.find((m) => m.id === goal)?.detail} Choose Update suggestions to apply it.</p>
          <details className="advanced-taste-filters audience-lens-control">
            <summary>Optional audience lens</summary>
            <p className="helper">Explore how an age group changes cultural recommendations. This is an audience signal, not your age or a prediction of what you will enjoy. Your confirmed tastes and explicit filters still apply.</p>
            <label>Audience group to explore
              <select value={audienceAge} disabled={busy||loading} onChange={event=>setAudienceAge(event.target.value as AudienceAgeBand|"all")}>
                <option value="all">No audience lens</option>
                {audienceAgeBands.map(band=><option key={band} value={band}>{band.replace("24_and_younger","24 or younger").replace("55_and_older","55 or older").replace(/_to_/g,"–")}</option>)}
              </select>
            </label>
          </details>
          {selectedSections.every(isPlaceSection) && (
            <div className="intelligence-filters"><div className="preference-section-heading"><span className="micro-label">MAKE IT PRACTICAL</span><strong>Set your limits</strong></div>
              <label>
                Maximum budget
                <select
                  value={price}
                  aria-label="Maximum price"
                  onChange={(e) => {
                    const value = e.target.value;
                    setPrice(value);
                    // This form has one explicit Apply action. Changing a select
                    // must never launch an unseen overlapping refinement.
                  }}
                  disabled={busy || loading}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option value={n} key={n}>
                      {n === 4
                        ? "Any budget"
                        : `${priceLabel(n)}${n > 1 ? " or less" : ""}`}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Minimum rating
                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  disabled={busy || loading}
                >
                  <option value="">Keep current preference</option>
                  <option value="4">4 / 5</option>
                  <option value="4.5">4.5 / 5</option>
                </select>
              </label>
            </div>
          )}
          {selectedSections.every(isPlaceSection) && (
            <details className="advanced-taste-filters">
              <summary>Location and more preferences</summary>
              <p className="helper">
                Use named areas within {passport.city}. Exclusions are resolved
                by the recommendation service; ambiguous areas may need a more
                specific name. Provider listings do not establish booking
                availability.
              </p>
              <div className="intelligence-filters">
                <label>
                  Only in this area
                  <input
                    maxLength={100}
                    value={area}
                    placeholder="Keep current area"
                    disabled={busy || loading}
                    onChange={(e) => setArea(e.target.value)}
                  />
                </label>
                <label>
                  Avoid this area
                  <input
                    maxLength={100}
                    value={avoidArea}
                    placeholder="A named neighborhood"
                    disabled={busy || loading}
                    onChange={(e) => setAvoidArea(e.target.value)}
                  />
                </label>
                <label>
                  Provider listing
                  <select
                    value={source}
                    disabled={busy || loading}
                    onChange={(e) => setSource(e.target.value)}
                  >
                    <option value="">Keep current preference</option>
                    <option value="michelin">Michelin listing</option>
                    <option value="resy">Resy listing</option>
                    <option value="tablet">Tablet listing</option>
                  </select>
                </label>
                <label>
                  Minimum Tripadvisor review count
                  <input
                    type="number"
                    min="0"
                    max="10000000"
                    step="1"
                    value={reviews}
                    placeholder="Keep current preference"
                    disabled={busy || loading}
                    onChange={(e) => setReviews(e.target.value)}
                  />
                </label>
              </div>
            </details>
          )}
          {prefs && (
            <details className="active-preferences"><summary>Current settings in Discover</summary><p><strong>{modes.find(m=>m.id===(prefs.goal??"discover"))?.name ?? "For you"}</strong>
              {prefs.priceMax && prefs.priceMax < 4 ? ` · ${priceLabel(prefs.priceMax)} or less` : " · No maximum budget"}
              {prefs.priceMin ? ` · minimum ${priceLabel(prefs.priceMin)}` : ""}
              {prefs.businessRatingMin
                ? ` · business rating ≥ ${prefs.businessRatingMin}`
                : ""}
              {prefs.locationQuery ? ` · in ${prefs.locationQuery}` : ""}
              {prefs.excludeLocation ? ` · excluding ${prefs.excludeLocation}` : ""}
              {prefs.requiredExternalSources?.length ? ` · requested listing: ${prefs.requiredExternalSources.join(", ")} (availability not verified)` : ""}
              {prefs.tripAdvisorReviewCountMin !== undefined ? ` · at least ${prefs.tripAdvisorReviewCountMin} Tripadvisor reviews requested` : ""}
              {prefs.audienceAge && prefs.audienceAge!=="all" ? ` · audience lens ${prefs.audienceAge.replace("24_and_younger","24 or younger").replace("55_and_older","55 or older").replace(/_to_/g,"–")}` : ""}. Your
              other categories stay unchanged.</p>
            </details>
          )}
          <button
            className="primary-button intelligence-apply"
            disabled={busy || loading || !passport.agent}
          >
            {busy ? "Finding your next fit…" : <>Update suggestions <Icon name="arrow" size={17}/></>}
          </button>
        </form>
        <section className="together-reveal" hidden={view !== "together"} aria-label="Find common ground">
          <details className="common-ground-setup" open={!together}><summary>{together ? "Change interests or preferences" : "Choose who you’re exploring with"}</summary>
          <div className="together-preference-summary"><div><strong>{selectedSections.map(sectionLabel).join(", ")} in {passport.city}</strong><p className="helper">The matching categories’ existing filters carry into the shared search. No single score is used to claim compatibility.</p></div><button type="button" className="quiet-button" onClick={onPreferences}>Review preferences</button></div>
          <div className="together-heading"><div><span className="micro-label">A LITTLE OF YOU. A LITTLE OF THEM.</span><h3>Find something you’ll both want to try</h3><p>Add one thing they love. Confirm the match, then explore places together.</p></div><img src="/illustrations/together-passports.svg" width="230" height="160" alt="" aria-hidden="true" loading="lazy" decoding="async" /></div>
          <div className="together-two-profiles"><div><strong>Person 1 · your confirmed tastes</strong><p>{passport.selected.map(taste=>taste.name).join(' · ')}</p></div></div>
          <p className="helper">Start with one. Add more if you like. Your Passport and preferences stay yours.</p>
          {!hasEntityProfile && <p role="status">Add a named artist, film, book or brand to your Passport to use Together.</p>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void resolvePartner();
            }}
          >
            <div className="partner-interests">
              {partner.map((value, i) => (
                <label key={i}>
                  {i === 0 ? "Something they love" : `Another interest (optional) ${i + 1}`}
                  <input
                    required={i === 0}
                    maxLength={100}
                    value={value}
                    placeholder={["An artist", "A film", "A book or brand"][i]}
                    disabled={busy || loading}
                    onChange={(e) => {
                      setPartner((p) =>
                        p.map((s, j) => (j === i ? e.target.value : s)),
                      );
                      setResolution(undefined);
                      setIds({});
                      setTogether(undefined);
                    }}
                  />
                  {i > 0 && <button type="button" className="text-button" disabled={busy||loading} onClick={()=>{setPartner(current=>current.filter((_,index)=>index!==i));setResolution(undefined);setIds({});setTogether(undefined);}}>Remove</button>}
                </label>
              ))}
            </div>
            {partner.length < 3 && <button type="button" className="quiet-button" disabled={busy||loading} onClick={()=>setPartner(current=>[...current,""])}>Add another interest</button>}
            <button type="submit" className={resolution ? "quiet-button" : "primary-button"} disabled={busy || loading || !partner.some(value=>value.trim())}>
              {loading ? "Finding common ground…" : resolution ? "Look up interests again" : "Find their interests"}
            </button>
          </form>
          {resolution && !together && (
            <div className="partner-matches">
              <h3>Are these the interests they meant?</h3><p className="helper">We suggest a match when its name is clear. Tap Change to choose a different result.</p>
              {resolution.items.map((item, i) => (
                <section key={i}>
                  <h4>{item.query}</h4>
                  {ids[i] && expandedMatch!==i ? <div className="partner-selection">
                    <div><strong>{item.candidates.find(c=>c.id===ids[i])?.name}</strong><small>{item.candidates.find(c=>c.id===ids[i])?.detail}</small></div>
                    <button type="button" className="quiet-button" disabled={loading||busy} onClick={()=>setExpandedMatch(i)}>Change match</button>
                  </div> : <div className="partner-choice-list" role="group" aria-label={`Matches for ${item.query}`}>
                    {item.candidates.filter(c=>!c.id.startsWith("urn:tag:")).map(candidate=><button key={candidate.id} type="button" disabled={busy||loading} aria-pressed={ids[i]===candidate.id} onClick={()=>{setIds(v=>({...v,[i]:candidate.id}));setExpandedMatch(undefined);}}><strong>{candidate.name}</strong><small>{candidate.detail}</small></button>)}
                  </div>}
                  {!item.candidates.some(c => !c.id.startsWith("urn:tag:")) && (
                    <p>No named entity match. Use a specific artist, film, book or brand; cuisine concepts cannot be used as the other person's entity profile.</p>
                  )}
                </section>
              ))}
              <button
                className="primary-button"
                disabled={
                  busy ||
                  loading ||
                  !Object.values(ids).length || !selectedSections.length
                }
                onClick={() => void commonGround()}
              >
                Find something for both of us
              </button>
              <p className="helper">Uses {new Set(Object.values(ids)).size} selected interest{new Set(Object.values(ids)).size===1?'':'s'}. Interests without a selected match are not included. Choose a match above to include them.</p>
            </div>
          )}
          </details>
          {together && (
            <section className="together-results" aria-label="Your common ground">
              <div className="shared-story"><span className="micro-label">YOUR COMMON GROUND</span><h3>Find somewhere you both love</h3><p>Start with one returned place, then explore what each of you could introduce.</p></div>
              {(()=>{const first=passport.selected[0]?.name??'your taste',second=together.partner?.[0]??'their taste';const hangout=sharedHangout(sharedCards,together.comparison,passport.selected,together.partnerSignals??[]);return <div className="shared-hangout">
                <span className="micro-label">BEST PLACE TO START</span>{hangout?<><h4>{hangout.card.name}</h4><p>{hangout.card.address??`Returned place in ${passport.city}`}</p><p>{hangoutExplanation(hangout)}</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([hangout.card.name,hangout.card.address,passport.city].filter(Boolean).join(', '))}`} target="_blank" rel="noopener noreferrer">Check this place ↗</a></>:<p>No verified place was returned for these interests. Try another category or taste.</p>}
                <details className="common-ground-more"><summary>Conversation starters</summary><ol>{commonGroundStarters(together.comparison,first,second).map(starter=><li key={starter}>{starter}</li>)}</ol></details>
              </div>;})()}
              {!sharedCards.length && <p role="status">No verified shared places fit the selected categories and area. Change a category, starting place or distance to try again.</p>}
              {together.exchange&&<section className="taste-exchange" aria-label="One discovery to show each other"><span className="micro-label">BEYOND THE OVERLAP</span><h4>Show each other something new</h4><p>Each idea comes from a separate confirmed-interest search. These are introductions to try, not exclusive preferences; both searches may overlap. A personal theme is shown only when it also appears on the returned listing.</p><div className="taste-exchange-grid">{together.exchange.map(item=><article key={item.person}><small>{item.person==='you'?'Your pick to introduce':'Their pick to introduce'}</small>{item.card?<><strong>{item.card.name}</strong><p>{item.card.address??`Returned in ${passport.city}`}</p><span>{item.theme?`A returned personal-profile theme: ${item.theme}`:'From this person’s confirmed cultural interests.'}</span></>:<p>{item.theme?`No verified place was returned for “${item.theme}” in this category.`:'No distinct personal introduction was available in the returned places.'}</p>}</article>)}</div></section>}
              <details className="common-ground-more common-ground-places"><summary>More places to try</summary><div className="together-categories">
                {selectedSections.map(category=>{
                  const cards=sharedCards.filter(card=>card.section===category).slice(0,3);
                  if(!cards.length)return null;
                  return <section className="together-category" key={category}><h4>{sectionLabel(category)} you could enjoy together</h4><div className="together-cards">
                {cards.map((card) => (
                  <article key={card.id}>
                    <span className="shared-result-status">{card.evidence?.strategyNote?.startsWith("Broader local") ? "Broader local option" : card.evidence?.result.tags.some(tag=>meaningfulSharedThemes(together.comparison).some(shared=>!shared.broad&&shared.id===tag.id)) ? "Shared theme on this result" : "From your shared-interest search"}</span>
                    <h4>{card.name}</h4>
                    <p>{card.address ?? card.section}</p>
                    <ResultMetrics card={card} />
                    <a href={isPlaceSection(card.section) ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([card.name,card.address,passport.city].filter(Boolean).join(", "))}` : `https://www.google.com/search?q=${encodeURIComponent(card.name + " " + card.section)}`} target="_blank" rel="noopener noreferrer">{isPlaceSection(card.section) ? "Check location and availability ↗" : "Learn about this discovery ↗"}</a>
                    <details>
                      <summary>Returned taste evidence</summary>
                      <WhyEvidence card={card} confirmedIds={[...passport.selected,...(together.partnerSignals??[])].map(taste=>taste.id)} />
                    </details>
                  </article>
                ))}
                  </div></section>;
                })}
              </div></details>
              <details className="common-ground-more common-ground-why"><summary>Why these choices connect your tastes</summary><CommonGroundThemes comparison={together.comparison} cards={sharedCards} you={passport.selected} partner={together.partnerSignals??[]}/></details>
              <details className="common-ground-more common-ground-distance"><summary>Narrow choices by distance</summary><div className="shared-area-controls"><label>Start near<select disabled={jointLocked} value={sharedAnchorId==='all'?'all':sharedAnchor?.id??'all'} onChange={event=>setSharedAnchorId(event.target.value)}><option value="all">Anywhere in this city</option>{anchors.map(card=><option key={card.id} value={card.id}>{card.name}</option>)}</select></label>{sharedAnchor&&<label>Distance from this place<select disabled={jointLocked||!sharedAnchor} value={sharedRadius} onChange={event=>setSharedRadius(Number(event.target.value))}><option value={1500}>1.5 km</option><option value={3000}>3 km</option><option value={5000}>5 km</option></select></label>}<p>{jointLocked?'Unlock your shared-week stops before changing the search area. ':''}{sharedAnchor?'Distance is straight-line from this returned place. Places without coordinates are omitted. Check travel time and venue availability.':'Choose a returned place to narrow the list by distance. City and category requirements still apply.'}</p>{!sharedCards.length&&<p role="status">{sharedAnchor?'No returned shared place fits this area. Choose a wider distance or another starting place.':'No verified shared place was returned for these categories and requirements. Try another category or change a requirement.'}</p>}</div></details>
              <details className="common-ground-week"><summary>Plan a first week together</summary>
              <p className="helper">Week coverage uses all validated places returned by each person’s searches and the joint searches—not just the preview cards. Missing categories remain open; select Food, Coffee & cafés and Places & culture before comparing for a fuller local week.</p>
              <FirstWeek key={`${together.comparison.recordedAt}:${sharedAnchor?.id??'all'}:${sharedRadius}`} passport={passport} cartoKey={cartoKey} onLocksChange={setJointLocked} roots={{
                you:nearbySharedPlaces(together.exchange?.filter(item=>item.person==='you').flatMap(item=>item.cards??(item.card?[item.card]:[]))??[],sharedAnchor,sharedRadius),
                partner:nearbySharedPlaces(together.exchange?.filter(item=>item.person==='them').flatMap(item=>item.cards??(item.card?[item.card]:[]))??[],sharedAnchor,sharedRadius),
                both:sharedCards,
              }}/></details>
              <p role="status">{together.notice}</p>{Boolean(together.failedSections?.length)&&<p role="status">Some searches could not finish: {together.failedSections!.map(sectionLabel).join(", ")}. Other returned choices are preserved; compare again to retry.</p>}
              <details className="together-differences"><summary>See each person’s distinct tastes</summary>
                <p>
                  More your taste:{" "}
                  {together.comparison.aOnly.map((t) => t.name).join(", ") ||
                    "No separate themes available"}
                </p>
                <p>
                  More their taste:{" "}
                  {together.comparison.bOnly.map((t) => t.name).join(", ") ||
                    "No separate themes available"}
                </p>
              </details>

            </section>
          )}
          {loading && <p className="together-loading" role="status">Finding connections between both sets of interests…</p>}
          <p className="helper">This is a temporary comparison, not a compatibility score. Check current venue details before going.</p>
        </section>
        {error && <p role="alert">{error}</p>}
        {process.env.NODE_ENV === "development" && (
          <details className="query-debug">
            <summary>Development query inspector</summary>
            <button
              className="quiet-button"
              onClick={() => {
                void post("/api/agent/intelligence", {
                  ...passport.agent,
                  action: "debug",
                })
                  .then(setDebug)
                  .catch(() =>
                    setDebug({
                      message:
                        "Enable QLOO_DEBUG_UI=1 on the development server to inspect private, bounded responses.",
                    }),
                  );
              }}
            >
              Inspect applied queries
            </button>
            {debug !== undefined && <pre>{JSON.stringify(debug, null, 2)}</pre>}
          </details>
        )}
      </div>
    </section>
  );
});
