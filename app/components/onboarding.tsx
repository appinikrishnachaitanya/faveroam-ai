"use client";
import { useState } from "react";
import type { Candidate } from "../../src/passport/model";
import type { Familiarity } from "../../src/passport/evidence";
import type { Resolution } from "../../src/workspace/state";
import { destinations, typeLabel } from "../../src/workspace/state";
import { Icon } from "./passport";

export function StepIndicator({ step }: { step: number }) {
  return (
    <ol className="step-indicator" aria-label="Build your Passport">
      {["Your move", "Your tastes", "Your Passport"].map((label, index) => (
        <li
          key={label}
          aria-current={step === index + 1 ? "step" : undefined}
          className={step >= index + 1 ? "reached" : ""}
        >
          <span>
            {step > index + 1 ? <Icon name="check" size={12} /> : index + 1}
          </span>
          {label}
        </li>
      ))}
    </ol>
  );
}
function friendlyType(candidate: Candidate) {
  if (candidate.id.startsWith("urn:tag:"))
    return candidate.id.includes(":cuisine:") ? "Cuisine" : "Interest";
  return typeLabel(candidate);
}
const suggestions = [
  "A.R. Rahman",
  "Interstellar",
  "Indian cuisine",
  "Specialty coffee",
  "Independent bookstores",
];
export function MoveForm({
  city,
  origin,
  draft,
  disabled,
  onCity,
  onOrigin,
  onDraft,
  onSubmit,
}: {
  city: string;
  origin: string;
  draft: string[];
  disabled: boolean;
  onCity: (value: string) => void;
  onOrigin: (value: string) => void;
  onDraft: (values: string[]) => void;
  onSubmit: () => void;
}) {
  const [input, setInput] = useState("");
  const add = (text: string) => {
    const value = text.trim();
    if (
      value &&
      value.length <= 100 &&
      draft.length < 5 &&
      !draft.some((t) => t.toLowerCase() === value.toLowerCase())
    ) {
      onDraft([...draft, value]);
      setInput("");
    }
  };
  return (
    <section className="move-onboarding" aria-labelledby="move-title">
      <div className="onboarding-heading">
        <span className="micro-label">
          MAKE YOUR NEXT CHAPTER FEEL LIKE YOU
        </span>
        <h1 id="move-title">
          Build your
          <br />
          <em>TastePassport</em>
        </h1>
        <p>Tell us where you’re moving and a few things you already love.</p>
        <div className="onboarding-story">
          <div className="journey-emblem" aria-hidden="true"><Icon name="globe" size={76} /><span>TASTE TRAVELS WITH YOU</span></div>
          <ul>
            <li><Icon name="check" size={16} /> Your tastes, explicitly confirmed</li>
            <li><Icon name="check" size={16} /> Real discoveries. Visible connections.</li>
            <li><Icon name="check" size={16} /> Places to try and a day out to plan</li>
          </ul>
        </div>
      </div>
      <form
        className="move-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="move-fields">
          <label htmlFor="origin">
            From <span>Optional</span>
            <div className="field-with-icon">
              <Icon name="globe" />
              <input
                id="origin"
                value={origin}
                placeholder="Bengaluru"
                maxLength={80}
                disabled={disabled}
                onChange={(e) => onOrigin(e.target.value)}
              />
            </div>
          </label>
          <span className="move-arrow" aria-hidden="true">
            <Icon name="arrow" size={22} />
          </span>
          <label htmlFor="destination">
            Moving to <span>5 supported cities</span>
            <div className="field-with-icon">
              <Icon name="pin" />
              <select
                id="destination"
                value={city}
                disabled={disabled}
                required
                onChange={(e) => onCity(e.target.value)}
              >
                <option value="">Choose a city</option>
                {destinations.map((destination) => (
                  <option key={destination}>{destination}</option>
                ))}
              </select>
            </div>
          </label>
        </div>
        <div className="taste-entry">
          <h2>What already feels like you?</h2>
          <p>Music, films, food, cafés, books… add 3–5 things you love.</p>
          <div className="taste-input-shell">
            <div className="taste-chips">
              {draft.map((taste, index) => (
                <span className="taste-chip" key={taste}>
                  {taste}
                  <button
                    type="button"
                    aria-label={`Remove ${taste}`}
                    disabled={disabled}
                    onClick={() => onDraft(draft.filter((_, i) => i !== index))}
                  >
                    <Icon name="close" size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="taste-add-row">
              <label htmlFor="taste-input" className="sr-only">
                Add a taste
              </label>
              <input
                id="taste-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    add(input);
                  }
                }}
                placeholder={
                  draft.length >= 5
                    ? "Five tastes ready to discover"
                    : "A favorite artist, film or food…"
                }
                maxLength={100}
                disabled={disabled || draft.length >= 5}
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Add taste"
                disabled={disabled || !input.trim() || draft.length >= 5}
                onClick={() => add(input)}
              >
                <Icon name="plus" />
              </button>
            </div>
          </div>
          <div className="taste-suggestions">
            <span>Need a little inspiration?</span>
            {suggestions
              .filter(
                (t) => !draft.some((d) => d.toLowerCase() === t.toLowerCase()),
              )
              .map((taste) => (
                <button
                  type="button"
                  key={taste}
                  disabled={disabled || draft.length >= 5}
                  onClick={() => add(taste)}
                >
                  <Icon name="plus" size={12} />
                  {taste}
                </button>
              ))}
          </div>
          <p className="taste-count" aria-live="polite">
            {draft.length}/5 tastes
            {draft.length < 3
              ? ` · Add ${3 - draft.length} more to start`
              : " · Ready to discover"}
          </p>
        </div>
        <button
          className="primary-button build-map"
          type="submit"
          disabled={disabled || !city || draft.length < 3 || draft.length > 5}
        >
          Find my taste matches <Icon name="arrow" />
        </button>
        <p className="onboarding-footnote">
          Carry what you love into somewhere new.
        </p>
      </form>
    </section>
  );
}
export function TasteConfirmation({
  items,
  chosen,
  disabled,
  complete,
  mode,
  onMode,
  onChoose,
  onRemove,
  onReplace,
  onBack,
  onSubmit,
}: {
  items: { item: Resolution["items"][number]; index: number }[];
  chosen: Record<number, string>;
  disabled: boolean;
  complete: boolean;
  mode: Familiarity;
  onMode: (mode: Familiarity) => void;
  onChoose: (index: number, id: string) => void;
  onRemove: (index: number) => void;
  onReplace: () => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <section
      className="taste-confirmation"
      aria-labelledby="confirmation-title"
    >
      <div className="onboarding-heading">
        <span className="micro-label">MAKE SURE WE GOT IT RIGHT</span>
        <h1 id="confirmation-title">
          Confirm your
          <br />
          <em>interests</em>
        </h1>
        <p>Choose the match you meant. Your Passport starts with you.</p>
      </div>
      <div className="confirmation-list">
        {items.map(({ item, index }) => {
          const selected = item.candidates.find((c) => c.id === chosen[index]);
          return (
            <article
              className={`confirmation-card ${selected ? "confirmed" : ""}`}
              key={index}
            >
              <div className="confirmation-card-heading">
                <span className="confirmation-mark">
                  <Icon name={selected ? "check" : "star"} />
                </span>
                <div>
                  <strong>{selected?.name ?? item.query}</strong>
                  <small>
                    {selected
                      ? friendlyType(selected)
                      : item.candidates.length
                        ? "Choose your match"
                        : "No match found"}
                  </small>
                </div>
                <button
                  className="icon-button"
                  aria-label={`Remove ${item.query}`}
                  disabled={disabled}
                  onClick={() => onRemove(index)}
                >
                  <Icon name="close" size={15} />
                </button>
              </div>
              {item.candidates.length ? (
                <label className="inline-match">
                  <span className="sr-only">Match for {item.query}</span>
                  <select
                    disabled={disabled}
                    value={chosen[index] ?? ""}
                    onChange={(e) => onChoose(index, e.target.value)}
                  >
                    <option value="" disabled>
                      Select the one you love
                    </option>
                    {item.candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {friendlyType(c)}
                        {c.id.startsWith("urn:tag:")
                          ? ""
                          : c.detail
                            ? ` · ${c.detail.slice(0, 70)}`
                            : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="helper">
                  Try a more specific name or remove this taste.
                </p>
              )}
              <button
                className="text-button replace-taste"
                disabled={disabled}
                onClick={onReplace}
              >
                Replace taste
              </button>
            </article>
          );
        })}
      </div>
      <fieldset className="initial-mode">
        <legend>How should your new city feel?</legend>
        <div className="initial-mode-options">
          {(["familiar", "balanced", "explore"] as Familiarity[]).map(
            (value) => (
              <button
                type="button"
                key={value}
                disabled={disabled}
                aria-pressed={mode === value}
                onClick={() => onMode(value)}
              >
                <span className="mode-orbit" />
                <strong>
                  {value === "familiar"
                    ? "Feels like home"
                    : value === "balanced"
                      ? "Balanced"
                      : "Help me explore"}
                </strong>
                <small>
                  {value === "familiar"
                    ? "Start with what you love"
                    : value === "balanced"
                      ? "A little familiar, a little new"
                      : "Find your next favorite"}
                </small>
              </button>
            ),
          )}
        </div>
      </fieldset>
      <div className="confirmation-actions">
        <button className="quiet-button" onClick={onBack} disabled={disabled}>
          Back
        </button>
        <button
          className="primary-button"
          onClick={onSubmit}
          disabled={disabled || !complete}
        >
          Create my TastePassport <Icon name="arrow" />
        </button>
      </div>
      {!complete && (
        <p className="helper confirmation-help">
          Confirm at least three different tastes to continue.
        </p>
      )}
    </section>
  );
}
