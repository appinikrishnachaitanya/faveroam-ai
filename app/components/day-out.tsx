"use client";
import { useState } from "react";
import type { Passport } from "../../src/workspace/state";
import {
  dayOutOptions,
  dayOutStops,
  dayOutText,
} from "../../src/passport/day-out";
import { cityDate, nextWeekend } from "../../src/account/plans";
import { accountRequest, showNotice } from "../../src/account/browser";

export default function DayOutPlan({
  passport,
  disabled,
  signedIn = false,
}: {
  passport: Passport;
  disabled: boolean;
  signedIn?: boolean;
}) {
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [omitted, setOmitted] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState("");
  const [date, setDate] = useState(() => nextWeekend(passport.city));
  const [saving, setSaving] = useState(false);
  const options = dayOutOptions(passport.cards, passport.city);
  const stops = dayOutStops.map((stop) => {
    const pool = options.filter((card) => card.section === stop.section);
    // A choice removed by refinement requires explicit reselection.
    const selected = choices[stop.section]
      ? pool.find((card) => card.id === choices[stop.section])
      : pool[0];
    return {
      ...stop,
      pool,
      selected: omitted[stop.section] ? undefined : selected,
    };
  });
  const selected = stops.flatMap((stop) =>
    stop.selected ? [stop.selected] : [],
  );

  function download() {
    const blob = new Blob([dayOutText(passport.city, selected, date)], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tastepassport-day-out.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Your day-out plan is downloaded. Keep it for your visit.");
    showNotice("Your plan is downloaded.");
  }
  async function savePlan() {
    if (!signedIn) {
      setStatus(
        "Sign in to save this plan. Your chosen date and stops will stay here.",
      );
      window.dispatchEvent(new Event("tastepassport:open-account"));
      return;
    }
    if (!passport.agent) return;
    setSaving(true);
    try {
      await accountRequest("/api/account/plans", {
        sessionId: passport.agent.sessionId,
        revision: passport.agent.revision,
        ids: selected.map((s) => s.id),
        date,
      });
      setStatus(
        "Saved! Open Upcoming plans in the navigation to find it again.",
      );
      showNotice("Your plan is saved to Upcoming plans.");
      window.dispatchEvent(new Event("tastepassport:plans-updated"));
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Could not save your plan.";
      setStatus(text);
      showNotice(text, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="secondary-reveal day-out-reveal">
      <summary>Plan a day out in {passport.city}</summary>
      <div className="day-out-plan">
        <span className="micro-label">MAKE THE CITY YOURS</span>
        <h2>Coffee, culture, and a good meal.</h2>
        <p>
          Choose a coffee stop, something to see, and somewhere to eat from your
          suggestions. Swap or skip any stop, then download your plan to keep
          it.
        </p>
        <p className="helper">
          Check opening hours, travel times, prices and availability before
          going. This is not a timed route or a reservation.
        </p>
        <div className="plan-schedule">
          <label htmlFor="plan-date">
            When are you going?
            <input
              id="plan-date"
              type="date"
              min={cityDate(passport.city)}
              value={date}
              disabled={disabled || saving}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <button
            className="quiet-button"
            type="button"
            disabled={disabled || saving}
            onClick={() => setDate(nextWeekend(passport.city))}
          >
            Next weekend
          </button>
          <p className="helper">
            Dates are local to {passport.city}. Saving again for the same city
            and date updates that plan.
          </p>
        </div>
        <ol className="day-out-stops">
          {stops.map((stop) => (
            <li key={stop.section}>
              <h3>{stop.label}</h3>
              <label htmlFor={`day-out-${stop.section}`}>{stop.section}</label>
              <select
                id={`day-out-${stop.section}`}
                disabled={disabled || saving || !stop.pool.length}
                value={stop.selected?.id ?? ""}
                onChange={(event) => {
                  const id = event.target.value;
                  setChoices((old) => ({ ...old, [stop.section]: id }));
                  setOmitted((old) => ({ ...old, [stop.section]: !id }));
                  setStatus(
                    `${stop.section} updated. Your other choices stay the same.`,
                  );
                }}
              >
                <option value="">
                  {stop.pool.length ? "Leave this stop open" : "No matches yet"}
                </option>
                {stop.pool.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
              {!stop.pool.length && (
                <p className="helper">
                  No local suggestions here yet. Try adjusting this category, or
                  leave the stop open.
                </p>
              )}
              {stop.selected && (
                <>
                  <p>
                    {stop.selected.address ||
                      "Address not provided in this discovery."}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      [stop.selected.name, stop.selected.address, passport.city]
                        .filter(Boolean)
                        .join(", "),
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Look up location &amp; hours ↗
                  </a>
                  <details>
                    <summary>Why this stop?</summary>
                    <p>
                      This place came from your personalized suggestions. Change
                      it using the menu above, or leave this stop open.
                    </p>
                    <small>Suggested for your confirmed interests.</small>
                  </details>
                </>
              )}
              {!stop.selected && stop.pool.length > 0 && (
                <p className="helper">
                  Choose a discovery above, or keep this stop open. A previous
                  choice may have changed after refinement.
                </p>
              )}
            </li>
          ))}
        </ol>
        <div className="plan-save-actions">
          <button
            className="quiet-button download-plan"
            onClick={download}
            disabled={disabled || !selected.length}
          >
            Download my plan
          </button>
          <button
            className="primary-button"
            disabled={disabled || saving || !selected.length || !date}
            onClick={() => void savePlan()}
          >
            {saving
              ? "Saving your plan…"
              : signedIn
                ? "Save to Upcoming plans"
                : "Sign in to save plan"}
          </button>
        </div>
        <p role="status">{status}</p>
      </div>
    </details>
  );
}
