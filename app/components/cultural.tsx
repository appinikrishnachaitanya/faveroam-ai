"use client";
import { useState } from "react";
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
          <span className="micro-label">SET YOUR CULTURAL PACE</span>
          <h2 id="familiarity-title">Feels like home. Room to explore.</h2>
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
            <strong>{mode[0].toUpperCase() + mode.slice(1)}</strong>
            <small>
              {mode === "familiar"
                ? "Direct cultural matches"
                : mode === "balanced"
                  ? "Familiar + adjacent"
                  : "Broader taste connections"}
            </small>
          </button>
        ))}
      </div>
      <p className="mode-caption">
        {applied === "familiar"
          ? "Confirmed category tastes stay as direct filters."
          : applied === "balanced"
            ? "Two Qloo query pools blend direct and adjacent discoveries when supported."
            : "Profile tastes become cultural signals rather than narrow filters. Explicit refinement requirements stay fixed."}{" "}
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
}
export function ComparisonPanel({
  baseline,
  cards,
}: {
  baseline?: ModelBaseline;
  cards: Card[];
}) {
  if (!baseline) return null;
  const grounded = cards.filter((c) => c.evidence?.result.id === c.id);
  return (
    <section className="comparison-panel" aria-labelledby="comparison-title">
      <span className="micro-label">WHAT CHANGES WHEN QLOO IS ADDED?</span>
      <h2 id="comparison-title">A suggestion, or a cultural bridge?</h2>
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
  cards,
  available,
}: {
  session: TastePassportSession;
  cards: Card[];
  available: boolean;
}) {
  const [baseline, setBaseline] = useState<ModelBaseline>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!available && !baseline) return null;
  async function compare() {
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
      if (data.baseline?.source !== "model-only") throw Error();
      setBaseline(data.baseline);
    } catch {
      setError(
        "The comparison is unavailable right now. Your Passport is still here.",
      );
    } finally {
      setBusy(false);
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
      <ComparisonPanel baseline={baseline} cards={cards} />
    </>
  );
}
