"use client";
import { useEffect, useRef, useState } from "react";
import type { AgentInput, TastePassportSession } from "../../src/agent/types";
import type { Card, Section } from "../../src/passport/model";
import { familiarities } from "../../src/passport/evidence";
import { sectionOrder } from "../../src/workspace/state";
export function FamiliarityControl({
  session,
  disabled,
  onChange,
}: {
  session: TastePassportSession;
  disabled: boolean;
  onChange: (input: AgentInput) => void;
}) {
  const [section, setSection] = useState<Section>("Eat");
  const applied = session.categoryModes[section] ?? session.discoveryMode;
  return (
    <section className="familiarity-panel" aria-labelledby="familiarity-title">
      <div className="panel-heading">
        <div>
          <span className="micro-label">YOUR KIND OF DISCOVERY</span>
          <h2 id="familiarity-title">How should your city feel?</h2>
        </div>
        <label className="mode-category">
          Apply to
          <select
            aria-label="Discovery style category"
            disabled={disabled}
            value={section}
            onChange={(e) => setSection(e.target.value as Section)}
          >
            {sectionOrder.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="familiarity-axis">
        <span>Feels Like Home</span>
        <span>Help Me Explore</span>
      </div>
      <div
        className="familiarity-options"
        role="group"
        aria-label="Familiarity mode"
      >
        {familiarities.map((mode) => (
          <button
            key={mode}
            aria-pressed={applied === mode}
            disabled={disabled}
            onClick={() => onChange({ familiarity: { mode, section } })}
          >
            <span className="mode-orbit" aria-hidden="true" />
            <strong>
              {mode === "familiar"
                ? "Feels like home"
                : mode === "balanced"
                  ? "Balanced"
                  : "Help me explore"}
            </strong>
            <small>
              {mode === "familiar"
                ? "Start with what you love"
                : mode === "balanced"
                  ? "A little familiar, a little new"
                  : "Find your next favorite"}
            </small>
          </button>
        ))}
      </div>
      <p className="mode-caption">
        {applied === "familiar"
          ? "Keep your favorite cultural threads close."
          : applied === "balanced"
            ? "Enjoy familiar favorites alongside fresh discoveries."
            : "Explore further while keeping a connection to your tastes."}{" "}
        Changes update {section} only.
      </p>
    </section>
  );
}
export interface ModelBaseline {
  text: string;
  model: string;
  generatedAt: string;
  source: "model-only";
  request?: string;
}
export function ComparisonPanel({
  baseline,
  cards,
}: {
  baseline?: ModelBaseline;
  cards: Card[];
}) {
  if (!baseline) return null;
  const grounded = cards.filter(
    (c) => c.evidence?.source === "Qloo" && c.evidence?.result.id === c.id,
  );
  return (
    <section className="comparison-panel" aria-labelledby="comparison-title">
      <span className="micro-label">WHAT CHANGES WHEN QLOO IS ADDED?</span>
      <h2 id="comparison-title">A suggestion, or a cultural bridge?</h2>
      {baseline.request && (
        <blockquote className="comparison-request">
          <span>THE SAME USER REQUEST</span>
          {baseline.request}
        </blockquote>
      )}
      <div className="comparison-columns">
        <article>
          <span className="comparison-label">
            Generic AI · Model-only baseline
          </span>
          <p className="baseline-disclaimer">
            Generated live without Qloo tools. Unverified model output; it never
            becomes a Passport card.
          </p>
          <p className="baseline-text">{baseline.text}</p>
          <small>
            {baseline.model} ·{" "}
            {new Date(baseline.generatedAt).toLocaleDateString()}
          </small>
        </article>
        <article>
          <span className="comparison-label">TastePassport + Qloo</span>
          <h3>
            {grounded.length} auditable{" "}
            {grounded.length === 1 ? "discovery" : "discoveries"}
          </h3>
          <p>
            Resolved cultural IDs, actual query inputs, returned entities and
            category metadata. Inspect the evidence on each card.
          </p>
          <ul>
            {grounded.slice(0, 3).map((c) => (
              <li key={c.id}>
                {c.name}
                <small>
                  {c.section} ·{" "}
                  {c.evidence!.locality === "physical-city"
                    ? c.evidence!.destination
                    : "City audience context"}
                </small>
              </li>
            ))}
          </ul>
        </article>
      </div>
      <table>
        <caption>How the sources differ</caption>
        <thead>
          <tr>
            <th>Dimension</th>
            <th>Model-only</th>
            <th>With Qloo</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Specificity", "Generated prose", "Returned entity IDs and types"],
            [
              "Grounded signals",
              "Taste names in the prompt",
              "Confirmed entity/tag IDs in the query",
            ],
            [
              "Cross-domain",
              "Model associations, unverified",
              "Recorded cultural inputs across domains",
            ],
            [
              "Location",
              "Requested city, unverified",
              "Place filters and returned locality; artist audience context",
            ],
            [
              "Evidence",
              "No Qloo receipts",
              "Query receipts and returned metadata",
            ],
          ].map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) =>
                i === 0 ? (
                  <th key={i} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={i}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
export function ModelComparison({
  session,
  available,
}: {
  session: TastePassportSession;
  available: boolean;
}) {
  const [baseline, setBaseline] = useState<ModelBaseline>();
  const [comparedCards, setComparedCards] = useState<Card[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    setBaseline(undefined);
    setComparedCards([]);
    setError("");
    setBusy(false);
    return () => {
      generation.current++;
    };
  }, [session.id, session.comparison?.revision]);
  if (!available || !session.comparison) return null;
  async function compare() {
    const started = generation.current;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/agent/comparison", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      if (!response.ok) throw Error();
      const data = await response.json();
      if (
        data.baseline?.source !== "model-only" ||
        typeof data.baseline.request !== "string" ||
        data.baseline.request !== data.comparison?.request ||
        !Array.isArray(data.comparison.cards)
      )
        throw Error();
      if (started !== generation.current) return;
      setComparedCards(data.comparison.cards);
      setBaseline(data.baseline);
    } catch {
      if (started !== generation.current) return;
      setError(
        "The comparison is unavailable right now. Your Passport is still here.",
      );
    } finally {
      if (started === generation.current) setBusy(false);
    }
  }
  return (
    <>
      <div className="compare-control">
        <button
          className="quiet-button"
          disabled={busy}
          onClick={() => void compare()}
        >
          {busy
            ? "Generating a live model-only baseline…"
            : "See what Qloo adds"}
        </button>
        {error && <p role="status">{error}</p>}
      </div>
      <ComparisonPanel baseline={baseline} cards={comparedCards} />
    </>
  );
}
