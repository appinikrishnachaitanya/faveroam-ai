"use client";
import { sectionLabel } from "../../src/passport/labels";
import { useEffect, useState } from "react";
import type { Passport, Resolution } from "../../src/workspace/state";
import { activeCategories } from "../../src/passport/active-categories";
import { sectionOrder } from "../../src/workspace/state";
import type { AgentInput } from "../../src/agent/types";
import type { Card, Section } from "../../src/passport/model";
import type { TasteComparison } from "../../src/qloo/compare";
import type { DiscoveryGoal, QueryPreferences } from "../../src/qloo/query-plan";
import { CandidateChoices } from "./disambiguation";
import { ResultMetrics, WhyEvidence } from "./intelligence-evidence";
import { priceLabel } from "../../src/passport/pricing";
import { suggestedMatches } from "../../src/passport/matching";
import { isPlaceSection } from "../../src/passport/model";
const modes: { id: DiscoveryGoal; name: string; detail: string }[] = [
  {
    id: "discover",
    name: "For you",
    detail: "Recommendations shaped by your confirmed interests.",
  },
  {
    id: "trending",
    name: "Trending for you",
    detail:
      "Taste-led suggestions with trend ranking; this does not show popularity history.",
  },
  {
    id: "hidden-gems",
    name: "Hidden gems",
    detail: "Find quality suggestions beyond the most popular choices.",
  },
  {
    id: "safe-bets",
    name: "Safe bets",
    detail: "Well-rated places that connect to your interests.",
  },
  {
    id: "surprise",
    name: "Surprise me",
    detail:
      "Try something a little different, with your interests as the starting point.",
  },
];
export default function TasteIntelligence({
  passport,
  busy,
  onRefine,
  view = "preferences",
  onPreferences,
}: {
  passport: Passport;
  busy: boolean;
  onRefine: (input: AgentInput) => void;
  view?: "preferences" | "together";
  onPreferences?: () => void;
}) {
  const [section, setSection] = useState<Section>(()=>sectionOrder.find(s=>passport.cards.some(c=>c.section===s)) ?? "Eat");
  const available=activeCategories(passport.session,passport.cards);
  const availableKey=available.join(",");
  useEffect(()=>{if(available.length&&!available.includes(section))setSection(available[0]);},[availableKey,section]);
  const prefs = passport.session?.queryPreferences?.[section];
  const [goal, setGoal] = useState<DiscoveryGoal>(
    () => prefs?.goal ?? "discover",
  );
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
    setPrice(current.priceMax?.toString() ?? "4");
    setRating(current.businessRatingMin?.toString() ?? "");
    setArea(current.locationQuery ?? "");
    setAvoidArea(current.excludeLocation ?? "");
    setSource(current.requiredExternalSources?.[0] ?? "");
    setReviews(current.tripAdvisorReviewCountMin?.toString() ?? "");
  }, [section, preferenceSnapshot]);
  const [partner, setPartner] = useState(["", "", ""]);
  const [expandedMatch, setExpandedMatch] = useState<number>();
  const [resolution, setResolution] = useState<Resolution>();
  const [ids, setIds] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [together, setTogether] = useState<{
    comparison: TasteComparison;
    cards: Card[];
    notice: string;
  }>();
  const [debug, setDebug] = useState<unknown>();
  const hasEntityProfile = passport.selected.some(candidate => !candidate.id.startsWith("urn:tag:"));
  async function post(path: string, body: unknown) {
    const r = await fetch(path, {
      signal: AbortSignal.timeout(75_000),
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const b = await r.json();
    if (!r.ok) throw Error(b.error ?? "Please try again.");
    return b;
  }
  async function resolvePartner() {
    setLoading(true);
    setError("");
    setTogether(undefined);
    try {
      const matches = await post("/api/agent/resolve", { seeds: partner });
      setResolution(matches);
      setExpandedMatch(undefined);
      setIds(suggestedMatches(matches.items.map((item: Resolution["items"][number]) => ({ ...item, candidates: item.candidates.filter(candidate => !candidate.id.startsWith("urn:tag:")) }))));
    } catch {
      setError(
        "Could not find those interests. Use three different named films, artists, books or brands.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function commonGround() {
    if (!passport.agent || !resolution) return;
    setLoading(true);
    setError("");
    try {
      setTogether(
        await post("/api/agent/intelligence", {
          ...passport.agent,
          action: "together",
          token: resolution.token,
          ids: Object.values(ids),
          section,
        }),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Comparison is unavailable. Your Passport is preserved.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="taste-intelligence" aria-label={view === "together" ? "Together" : "Your discovery preferences"}>
      <div className="intelligence-content">
        <div className="intelligence-intro"><span className="micro-label">{view === "together" ? "TWO TASTES. ONE SHARED PLAN." : "YOUR DISCOVERIES. YOUR CHOICE."}</span><h2>{view === "together" ? "Find something you can both enjoy." : "Make these discoveries fit your day."}</h2><p>{view === "together" ? "Bring their interests. Find common ground without changing your individual Passport." : "Choose a category, adjust what matters, and keep your other categories unchanged."}</p></div>
        <label className="intelligence-section">
          Category
          <select
            value={section}
            disabled={busy || loading}
            onChange={(e) => {
              setSection(e.target.value as Section);
              const next =
                passport.session?.queryPreferences?.[e.target.value as Section];
              setGoal(next?.goal ?? "discover");
              setPrice(next?.priceMax?.toString() ?? "4");
              setRating(next?.businessRatingMin?.toString() ?? "");
              setArea(next?.locationQuery ?? "");
              setAvoidArea(next?.excludeLocation ?? "");
              setSource(next?.requiredExternalSources?.[0] ?? "");
              setReviews(next?.tripAdvisorReviewCountMin?.toString() ?? "");
              setTogether(undefined);
            }}
          >
            {available
              .map((s) => (
                <option key={s} value={s}>{sectionLabel(s)}</option>
              ))}
          </select>
        </label>
        <form
          hidden={view !== "preferences"}
          className="intelligence-preferences"
          onSubmit={(e) => {
            e.preventDefault();
            onRefine({
              discovery: {
                section,
                preferences: {
                  goal,
                  ...(price ? { priceMax: Number(price) } : {}),
                  ...(rating ? { businessRatingMin: Number(rating) } : {}),
                  ...(area.trim()
                    ? { locationQuery: area.trim(), radius: 0 }
                    : {}),
                  ...(avoidArea.trim()
                    ? { excludeLocation: avoidArea.trim() }
                    : {}),
                  ...(source ? { requiredExternalSources: [source] } : {}),
                  ...(reviews
                    ? { tripAdvisorReviewCountMin: Number(reviews) }
                    : {}),
                },
              },
            });
          }}
        >
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
                {m.name}
              </button>
            ))}
          </div>
          <p className="helper">{modes.find((m) => m.id === goal)?.detail} Changes apply only after you choose Update suggestions.</p>
          {isPlaceSection(section) && (
            <div className="intelligence-filters">
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
          {isPlaceSection(section) && (
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
            <p className="helper">
              Active settings: {prefs.goal ?? "For you"}
              {prefs.priceMax && prefs.priceMax < 4 ? ` · ${priceLabel(prefs.priceMax)} or less` : " · No maximum budget"}
              {prefs.priceMin ? ` · minimum ${priceLabel(prefs.priceMin)}` : ""}
              {prefs.businessRatingMin
                ? ` · business rating ≥ ${prefs.businessRatingMin}`
                : ""}
              {prefs.locationQuery ? ` · in ${prefs.locationQuery}` : ""}
              {prefs.excludeLocation ? ` · excluding ${prefs.excludeLocation}` : ""}
              {prefs.requiredExternalSources?.length ? ` · requested listing: ${prefs.requiredExternalSources.join(", ")} (availability not verified)` : ""}
              {prefs.tripAdvisorReviewCountMin !== undefined ? ` · at least ${prefs.tripAdvisorReviewCountMin} Tripadvisor reviews requested` : ""}. Your
              other chapter settings stay unchanged.
            </p>
          )}
          <button
            className="primary-button"
            disabled={busy || loading || !passport.agent}
          >
            {busy ? "Finding your next fit…" : "Update suggestions"}
          </button>
        </form>
        <section className="together-reveal" hidden={view !== "together"} aria-label="Find common ground">
          <div className="together-preference-summary"><div><strong>{sectionLabel(section)} in {passport.city}</strong><p className="helper">Your current preferences for this category carry into the shared search{prefs?.priceMax && prefs.priceMax < 4 ? ` · ${priceLabel(prefs.priceMax)} or less` : ""}{prefs?.businessRatingMin ? ` · rating ${prefs.businessRatingMin}+` : ""}.</p></div><button type="button" className="quiet-button" onClick={onPreferences}>Review preferences</button></div>
          <div className="together-heading"><div><span className="micro-label">TWO TASTES. A SHARED DISCOVERY.</span><h3>1. Add what they love</h3></div><img src="/illustrations/together-passports.svg" width="440" height="260" alt="" aria-hidden="true" loading="lazy" /></div>
          <p>
            Add three named artists, films, books or brands they enjoy, then
            confirm the matches. Cuisine and dietary concepts are supported in
            your Passport preferences, but cannot be used as Together comparison inputs.
            Your profile needs at least one named entity too. Avoid personal details.
          </p>
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
                  Their interest {i + 1}
                  <input
                    required
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
                </label>
              ))}
            </div>
            <button className={resolution ? "quiet-button" : "primary-button"} disabled={busy || loading || !hasEntityProfile}>
              {loading ? "Finding common ground…" : resolution ? "Look up interests again" : "Find their interests"}
            </button>
          </form>
          {resolution && !together && (
            <div className="partner-matches">
              <h3>2. Confirm their interests</h3><p className="helper">Confirm three distinct interests. Exact matches are suggested; change any match below.</p>
              {resolution.items.map((item, i) => (
                <section key={i}>
                  <h4>{item.query}</h4>
                  {ids[i] && expandedMatch!==i ? <div className="partner-selection">
                    <div><strong>{item.candidates.find(c=>c.id===ids[i])?.name}</strong><small>{item.candidates.find(c=>c.id===ids[i])?.detail}</small></div>
                    <button type="button" className="quiet-button" disabled={loading||busy} onClick={()=>setExpandedMatch(i)}>Change match</button>
                  </div> : <CandidateChoices disabled={busy||loading} query={item.query} candidates={item.candidates.filter(c=>!c.id.startsWith("urn:tag:"))} selected={ids[i]}
                    onSelect={id=>{setIds(v=>({...v,[i]:id}));setExpandedMatch(undefined);}} />}
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
                  Object.keys(ids).length !== 3 ||
                  new Set(Object.values(ids)).size !== 3
                }
                onClick={() => void commonGround()}
              >
                Find something for both of us
              </button>
            </div>
          )}
          {together && (
            <section className="together-results" aria-label="Your common ground">
              <button type="button" className="text-button" onClick={()=>setTogether(undefined)}>Edit confirmed interests</button>
              <h3>Your common ground</h3>
              <div className="common-tags">
                {together.comparison.shared.slice(0, 8).map((t) => (
                  <span key={t.id}>{t.name}</span>
                ))}
              </div>
              <p role="status">{together.notice}</p>
              <div className="together-differences">
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
              </div>
              <div className="together-cards">
                {together.cards.slice(0,6).map((card) => (
                  <article key={card.id}>
                    <h4>{card.name}</h4>
                    <p>{card.address ?? card.section}</p>
                    <ResultMetrics card={card} />
                    <a href={isPlaceSection(card.section) ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([card.name,card.address,passport.city].filter(Boolean).join(", "))}` : `https://www.google.com/search?q=${encodeURIComponent(card.name + " " + card.section)}`} target="_blank" rel="noopener noreferrer">{isPlaceSection(card.section) ? "Check location and availability ↗" : "Learn about this discovery ↗"}</a>
                    <details>
                      <summary>Why this works together</summary>
                      <WhyEvidence card={card} />
                    </details>
                  </article>
                ))}
              </div>
            </section>
          )}
          {loading && <p className="together-loading" role="status">Finding connections between both sets of interests…</p>}
          <p className="helper">
            Shared taste analysis considers both profiles. It does not measure
            relationship compatibility. This comparison is temporary and is not
            saved with your account.
          </p>
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
}
