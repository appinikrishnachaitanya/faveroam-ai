"use client";
import { useState } from "react";
import type { Card } from "../../src/passport/model";
import type { TasteResult } from "../../src/qloo/normalizer";
import { priceLabel } from "../../src/passport/pricing";
export function ResultMetrics({ card }: { card: Card }) {
  const m = card.intelligence,
    point = card.trend?.points.at(-1);
  if (
    m?.quality.businessRating === undefined &&
    !priceLabel(m?.commercial.priceLevel) &&
    !card.trend?.status
  )
    return null;
  return (
    <div
      className="result-metrics"
      aria-label="Returned recommendation details"
    >
      {m?.quality.businessRating !== undefined && (
        <span
          aria-label={`Rated ${m.quality.businessRating.toFixed(1)} out of 5`}
        >
          ★ {m.quality.businessRating.toFixed(1)} / 5
        </span>
      )}
      {priceLabel(m?.commercial.priceLevel) && (
        <span>{priceLabel(m?.commercial.priceLevel)}</span>
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
  const connected =
    m?.taste.contributingSignals
      .flatMap((signal) => {
        const input = inputs.find(
          (i) => i.id.toLowerCase() === signal.id.toLowerCase(),
        );
        return input ? [input.name] : [];
      })
      .slice(0, 3) ?? [];
  return (
    <div className="why-evidence">
      {!!connected.length && (
        <p>Connected to {connected.join(", ")} in your interests.</p>
      )}
      <dl className="evidence-metrics">
        {priceLabel(m?.commercial.priceLevel) && (
          <>
            <dt>Typical budget</dt>
            <dd>{priceLabel(m?.commercial.priceLevel)}</dd>
          </>
        )}
        {m?.quality.businessRating !== undefined && (
          <>
            <dt>Rating</dt>
            <dd>{m.quality.businessRating} / 5</dd>
          </>
        )}
        {m?.externalProof.tripadvisorRating !== undefined && (
          <>
            <dt>Tripadvisor</dt>
            <dd>
              {m.externalProof.tripadvisorRating} / 5
              {m.externalProof.tripadvisorReviewCount !== undefined
                ? ` · ${m.externalProof.tripadvisorReviewCount} reviews`
                : ""}
            </dd>
          </>
        )}
      </dl>
      {card.trend?.points.length ? (
        <p className="helper">
          Popularity history from {card.trend.startDate} to {card.trend.endDate}
          .
        </p>
      ) : null}
      {!!card.evidence?.diagnostics?.dropped.length && (
        <p className="helper">
          Some requested preferences are unavailable for this kind of
          suggestion. Your other preferences were kept.
        </p>
      )}
      {m?.commercial.priceLevel !== undefined && (
        <p className="helper">
          Budget categories are relative. Check current menus and prices before
          going.
        </p>
      )}
      {session && (
        <div className="why-actions">
          <button
            type="button"
            className="text-button"
            disabled={loading}
            onClick={() => void more()}
          >
            {loading ? "Finding more details…" : "More details"}
          </button>
          <button
            type="button"
            className="text-button"
            disabled={loading}
            onClick={() => void explain()}
          >
            Explain my match
          </button>
        </div>
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
