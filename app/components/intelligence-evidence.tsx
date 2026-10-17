"use client";
import { useState } from "react";
import type { Card } from "../../src/passport/model";
import type { TasteResult } from "../../src/qloo/normalizer";
export function ResultMetrics({ card }: { card: Card }) {
  const m = card.intelligence,
    point = card.trend?.points.at(-1);
  if (!m && !point) return null;
  return (
    <div
      className="result-metrics"
      aria-label="Returned recommendation details"
    >
      {m?.quality.businessRating !== undefined && (
        <span>{m.quality.businessRating.toFixed(1)} business rating</span>
      )}
      {m?.commercial.priceLevel !== undefined && (
        <span>{"$".repeat(m.commercial.priceLevel)} price level</span>
      )}
      {card.trend?.status && (
        <span>
          {card.trend.status === "rising"
            ? "Rising ↑"
            : card.trend.status === "cooling"
              ? "Cooling ↓"
              : "Established"}
        </span>
      )}
    </div>
  );
}
export function WhyEvidence({
  card,
  session,
}: {
  card: Card;
  session?: { sessionId: string; revision: number };
}) {
  const [details, setDetails] = useState<TasteResult>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [explanation, setExplanation] = useState<string[]>([]);
  const m = card.intelligence,
    point = card.trend?.points.at(-1),
    inputs = card.evidence?.inputs ?? [];
  async function more() {
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/agent/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...session,
          action: "details",
          entityId: card.id,
        }),
      });
      const b = await r.json();
      if (!r.ok) throw Error(b.error);
      setDetails(b.details);
    } catch {
      setError("More details are unavailable. Your suggestion is still here.");
    } finally {
      setLoading(false);
    }
  }
  async function explain() {
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/agent/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...session,
          action: "explain",
          entityId: card.id,
        }),
      });
      const b = await r.json();
      if (!r.ok) throw Error();
      setExplanation(b.sentences);
    } catch {
      setError(
        "The returned evidence above is still available. Please try the explanation again later.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="why-evidence">
      {!!m?.taste.contributingSignals.length && (
        <section>
          <h5>What influenced this match</h5>
          <p>
            Contribution scores returned for this suggestion. They are not the
            chance you will like it and may not sum to 100%.
          </p>
          <ul className="contribution-list">
            {m.taste.contributingSignals.map((s) => (
              <li key={s.id}>
                <span>
                  {inputs.find((i) => i.id.toLowerCase() === s.id.toLowerCase())
                    ?.name ?? "Confirmed interest"}
                </span>
                <strong>{(s.contribution * 100).toFixed(1)}%</strong>
                <meter
                  min="0"
                  max="1"
                  value={s.contribution}
                  aria-label="Contribution"
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      <dl className="evidence-metrics">
        {m?.taste.affinity !== undefined && (
          <>
            <dt>Taste affinity</dt>
            <dd>
              {m.taste.affinity.toFixed(3)}{" "}
              <small>raw score, not a percentage</small>
            </dd>
          </>
        )}
        {m?.quality.businessRating !== undefined && (
          <>
            <dt>Business rating</dt>
            <dd>{m.quality.businessRating}/5</dd>
          </>
        )}
        {m?.quality.qlooRating !== undefined && (
          <>
            <dt>Qloo rating</dt>
            <dd>{m.quality.qlooRating}/5</dd>
          </>
        )}
        {m?.quality.qualityScore !== undefined && (
          <>
            <dt>Quality score</dt>
            <dd>
              {m.quality.qualityScore} <small>returned scale</small>
            </dd>
          </>
        )}
        {m?.quality.popularity !== undefined && (
          <>
            <dt>Popularity percentile</dt>
            <dd>
              {(m.quality.popularity * 100).toFixed(1)}{" "}
              <small>not a taste match</small>
            </dd>
          </>
        )}
        {m?.commercial.priceLevel !== undefined && (
          <>
            <dt>Price category</dt>
            <dd>
              {"$".repeat(m.commercial.priceLevel)}{" "}
              <small>check actual prices</small>
            </dd>
          </>
        )}
        {m?.externalProof.tripadvisorRating !== undefined && (
          <>
            <dt>Tripadvisor rating</dt>
            <dd>
              {m.externalProof.tripadvisorRating}/5{" "}
              {m.externalProof.tripadvisorReviewCount !== undefined
                ? `· ${m.externalProof.tripadvisorReviewCount} reviews`
                : ""}
            </dd>
          </>
        )}
        {m?.externalProof.resyRating !== undefined && (
          <>
            <dt>Resy rating</dt>
            <dd>{m.externalProof.resyRating}/5</dd>
          </>
        )}
        {m?.location.distance !== undefined &&
          card.evidence?.params["filter.location"]?.startsWith("POINT(") && (
            <>
              <dt>Distance from search point</dt>
              <dd>{m.location.distance} m</dd>
            </>
          )}
        {point?.rank !== undefined && (
          <>
            <dt>Popularity rank</dt>
            <dd>{point.rank}</dd>
          </>
        )}
        {point?.velocity !== undefined && (
          <>
            <dt>Rank velocity</dt>
            <dd>
              {point.velocity} <small>raw Qloo metric</small>
            </dd>
          </>
        )}
        {point?.populationPercentDelta !== undefined && (
          <>
            <dt>Population change</dt>
            <dd>
              {point.populationPercentDelta} <small>raw Qloo metric</small>
            </dd>
          </>
        )}
      </dl>
      {card.trend?.points.length ? (
        <p className="helper">
          Trend period: {card.trend.startDate}–{card.trend.endDate}. Latest
          observation: {point?.date}. Labels follow population change; rank
          velocity is shown without assuming its direction.
        </p>
      ) : card.trendUnavailable ? (
        <p className="helper">
          Historical trend data is unavailable for this suggestion. Its taste
          recommendation remains available.
        </p>
      ) : null}
      {!!card.evidence?.diagnostics?.dropped.length && (
        <div className="unapplied-settings">
          <h5>Settings that could not be applied</h5>
          <ul>
            {card.evidence.diagnostics.dropped.map((d) => (
              <li key={d.parameter}>
                {d.parameter}: {d.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!!card.evidence?.diagnostics?.unverified?.length && (
        <p className="helper">
          Some requested filters cannot be independently verified from this
          result’s metadata: {card.evidence.diagnostics.unverified.join(", ")}.
          A submitted filter is not proof of a missing rating, provider listing
          or precise location match.
        </p>
      )}
      {card.evidence?.params && (
        <details>
          <summary>Filters and ranking used</summary>
          <p>
            Filters request eligibility; biases influence ranking. A successful
            request does not establish missing result metadata.
          </p>
          <dl className="evidence-metrics">
            {Object.entries(card.evidence.params)
              .filter(
                ([k]) =>
                  !/signal.interests|filter.type|filter.tags|exclude.entities|take|explainability/.test(
                    k,
                  ),
              )
              .map(([k, v]) => (
                <div key={k}>
                  <dt>
                    {k.startsWith("bias.") ? "Ranking signal" : "Filter"}: {k}
                  </dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
        </details>
      )}
      {session && (
        <button
          type="button"
          className="text-button"
          disabled={loading}
          onClick={() => void more()}
        >
          {loading ? "Finding more details…" : "More place details"}
        </button>
      )}
      {session && (
        <button
          type="button"
          className="text-button"
          disabled={loading}
          onClick={() => void explain()}
        >
          Explain my match
        </button>
      )}
      {!!explanation.length && (
        <ul>
          {explanation.map((sentence) => (
            <li key={sentence}>{sentence}</li>
          ))}
        </ul>
      )}
      {error && <p role="status">{error}</p>}
      {details?.description && <p>{details.description}</p>}
    </div>
  );
}
