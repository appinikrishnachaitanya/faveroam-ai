"use client";
import { sectionLabel } from "../../src/passport/labels";
import { useEffect, useState } from "react";
import { sectionOrder } from "../../src/workspace/state";
import type { AgentInput, AgentState, Constraint } from "../../src/agent/types";
import type { Section } from "../../src/passport/model";
export default function GuidedRefinement({
  session,
  disabled,
  onApply,
}: {
  session: AgentState;
  disabled: boolean;
  onApply: (input: AgentInput) => void;
}) {
  const [section, setSection] = useState<Section>("Eat");
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  useEffect(
    () => setConstraints(session.categoryConstraints[section] ?? []),
    [session.revision, section, session.categoryConstraints],
  );
  const toggle = (value: Constraint) =>
    setConstraints((current) =>
      current.includes(value)
        ? current.filter((c) => c !== value)
        : [...current, value],
    );
  return (
    <section className="guided-panel" aria-labelledby="guided-title">
      <div className="small-heading">
        <h2 id="guided-title">Refine your Passport</h2>
        <span>Guided mode</span>
      </div>
      <label htmlFor="guided-category">Category</label>
      <select
        id="guided-category"
        value={section}
        disabled={disabled}
        onChange={(e) => setSection(e.target.value as Section)}
      >
        {sectionOrder.map((s) => (
          <option key={s} value={s}>{sectionLabel(s)}</option>
        ))}
      </select>
      {session.hiddenCategories?.includes(section) && (
        <p className="helper">
          Applying a refinement brings this category back.
        </p>
      )}
      <fieldset disabled={disabled}>
        <legend>Preferences</legend>
        {section !== "Music" && (
          <label>
            <input
              type="checkbox"
              checked={constraints.includes("crowded")}
              onChange={() => toggle("crowded")}
            />{" "}
            Quiet atmosphere
          </label>
        )}
        <label>
          <input
            type="checkbox"
            checked={constraints.includes("mainstream")}
            onChange={() => toggle("mainstream")}
          />{" "}
          Less mainstream
        </label>
      </fieldset>
      {section !== "Music" && (
        <fieldset disabled={disabled}>
          <legend>Avoid</legend>
          <label>
            <input
              type="checkbox"
              checked={constraints.includes("touristy")}
              onChange={() => toggle("touristy")}
            />
            Touristy places
          </label>
        </fieldset>
      )}
      <p className="helper">
        Quiet looks for atmosphere descriptions, not live crowd levels.
        Less mainstream favors less popular options. Your city and confirmed
        interests stay the same.
      </p>
      <button
        className="primary-button"
        disabled={disabled}
        onClick={() => onApply({ guided: { section, constraints } })}
      >
        Apply refinement
      </button>
    </section>
  );
}
export function RefinementRecovery({
  session,
  disabled,
  onApply,
}: {
  session: AgentState;
  disabled: boolean;
  onApply: (input: AgentInput) => void;
}) {
  return (
    <>
      {session.recovery?.map((section) => (
        <section className="refinement-recovery" key={section} role="status">
          <h3>Let’s adjust your {sectionLabel(section).toLowerCase()} search</h3>
          <p>
            Current requirements: {[
              ...session.tags.filter(tag=>[...(session.categoryTags?.[section] ?? []),...(session.queryPreferences?.[section]?.includeTags ?? [])].includes(tag.id)).map(tag=>tag.name),
              ...(session.queryPreferences?.[section]?.priceMax ? [`budget up to ${session.queryPreferences[section]!.priceMax}/4`] : []),
              ...(session.queryPreferences?.[section]?.businessRatingMin ? [`rating ${session.queryPreferences[section]!.businessRatingMin}+`] : []),
            ].join(", ") || "your confirmed tastes"}. Your existing discoveries remain available. Broader taste matching keeps these requirements; it does not guarantee availability.
          </p>
          <div>
            {(
              [
                {
                  action: "keep-concept",
                  label:
                    section === "Eat"
                      ? `Keep ${session.tags.find((t) => session.categoryTags?.Eat?.includes(t.id) && /cuisine/i.test(t.id))?.name ?? "cuisine"}`
                      : "Keep cultural tastes",
                },
                { action: "relax-quiet", label: "Try without the quietness preference" },
                { action: "allow-popular", label: "Include popular places" },

              ] as const
            ).filter(({action}) => {
              const constraints=session.categoryConstraints[section] ?? [];
              return action==="relax-quiet" ? constraints.some(value=>value==="crowded"||value==="atmosphere")
                : action==="allow-popular" ? constraints.some(value=>value==="mainstream"||value==="touristy") : constraints.length>0;
            }).map(({ action, label }) => (
              <button
                key={action}
                className="quiet-button"
                disabled={disabled}
                onClick={() => onApply({ recovery: { section, action } })}
              >
                {label}
              </button>
            ))}
            {(session.categoryModes?.[section] ?? session.discoveryMode) !== "explore" && <button className="quiet-button" disabled={disabled} onClick={()=>onApply({familiarity:{section,mode:"explore"}})}>Explore broader taste matches</button>}
          </div>
        </section>
      ))}
    </>
  );
}
