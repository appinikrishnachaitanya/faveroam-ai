"use client";
import { useState } from "react";
import type { Passport, Resolution } from "../../src/workspace/state";
import { sectionOrder } from "../../src/workspace/state";
import type { AgentInput } from "../../src/agent/types";
import type { Card, Section } from "../../src/passport/model";
import type { TasteComparison } from "../../src/qloo/compare";
import type { DiscoveryGoal } from "../../src/qloo/query-plan";
import { CandidateChoices } from "./disambiguation";
import { ResultMetrics, WhyEvidence } from "./intelligence-evidence";
import { priceLabel } from "../../src/passport/pricing";
import { suggestedMatches } from "../../src/passport/matching";
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
      "Taste-led suggestions with trend ranking. Historical data is shown when available.",
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
  expanded,
}: {
  passport: Passport;
  busy: boolean;
  onRefine: (input: AgentInput) => void;
  expanded?: boolean;
}) {
  const [section, setSection] = useState<Section>("Eat");
  const prefs = passport.session?.queryPreferences?.[section];
  const [goal, setGoal] = useState<DiscoveryGoal>(
    () => prefs?.goal ?? "discover",
  );
  const [price, setPrice] = useState(() => prefs?.priceMax?.toString() ?? "4");
  const [rating, setRating] = useState(
    () => prefs?.businessRatingMin?.toString() ?? "",
  );
  const [area, setArea] = useState(""),
    [avoidArea, setAvoidArea] = useState(""),
    [source, setSource] = useState(""),
    [reviews, setReviews] = useState("");
  const [partner, setPartner] = useState(["", "", ""]);
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
      setIds(suggestedMatches(matches.items));
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
    <details className="secondary-reveal taste-intelligence" open={expanded}>
      <summary>Make it more you · discover together</summary>
      <div className="intelligence-content">
        <h2>Find your next favorite.</h2>
        <p>
          Find what fits your budget, explore a different mood, or meet someone
          else halfway.
        </p>
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
              setTogether(undefined);
            }}
          >
            {sectionOrder
              .filter((s) => !passport.session?.hiddenCategories.includes(s))
              .map((s) => (
                <option key={s}>{s}</option>
              ))}
          </select>
        </label>
        <form
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
          <p className="helper">{modes.find((m) => m.id === goal)?.detail}</p>
          {section !== "Music" && (
            <div className="intelligence-filters">
              <label>
                Budget
                <select
                  value={price}
                  aria-label="Maximum price"
                  onChange={(e) => {
                    const value = e.target.value;
                    setPrice(value);
                    if (value)
                      onRefine({
                        discovery: {
                          section,
                          preferences: { priceMax: Number(value) },
                        },
                      });
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
          {section !== "Music" && (
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
              {prefs.priceMax ? ` · ${priceLabel(prefs.priceMax)} budget` : ""}
              {prefs.businessRatingMin
                ? ` · business rating ≥ ${prefs.businessRatingMin}`
                : ""}
              {prefs.locationQuery ? ` · ${prefs.locationQuery}` : ""}. Your
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
        <details className="together-reveal">
          <summary>Together · find common ground</summary>
          <h3>What could you both enjoy?</h3>
          <p>
            Add three of their interests, choose the intended matches, then
            explore shared tastes. Use cultural interests, without names or
            personal details.
          </p>
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
            <button className="quiet-button" disabled={busy || loading}>
              {loading ? "Finding common ground…" : "Find their interests"}
            </button>
          </form>
          {resolution && (
            <div className="partner-matches">
              {resolution.items.map((item, i) => (
                <section key={i}>
                  <h4>{item.query}</h4>
                  <CandidateChoices
                    query={item.query}
                    candidates={item.candidates.filter(
                      (c) => !c.id.startsWith("urn:tag:"),
                    )}
                    selected={ids[i]}
                    onSelect={(id) => setIds((v) => ({ ...v, [i]: id }))}
                  />
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
            <section aria-label="Your common ground">
              <h3>Your common ground</h3>
              <div className="common-tags">
                {together.comparison.shared.slice(0, 8).map((t) => (
                  <span key={t.id}>{t.name}</span>
                ))}
              </div>
              <p role="status">{together.notice}</p>
              <div className="together-differences">
                <p>
                  Your distinct returned interests:{" "}
                  {together.comparison.aOnly.map((t) => t.name).join(", ") ||
                    "No separate tags returned"}
                </p>
                <p>
                  Their distinct returned interests:{" "}
                  {together.comparison.bOnly.map((t) => t.name).join(", ") ||
                    "No separate tags returned"}
                </p>
              </div>
              <div className="together-cards">
                {together.cards.map((card) => (
                  <article key={card.id}>
                    <h4>{card.name}</h4>
                    <p>{card.address ?? card.section}</p>
                    <ResultMetrics card={card} />
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([card.name,card.address,passport.city].filter(Boolean).join(", "))}`} target="_blank" rel="noopener noreferrer">Check location and availability ↗</a>
                    <details>
                      <summary>Why this works together</summary>
                      <WhyEvidence card={card} />
                    </details>
                  </article>
                ))}
              </div>
            </section>
          )}
          <p className="helper">
            Shared taste analysis considers both profiles. It does not measure
            relationship compatibility. This comparison is temporary and is not
            saved with your account.
          </p>
        </details>
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
    </details>
  );
}
