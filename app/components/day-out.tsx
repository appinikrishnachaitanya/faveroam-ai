"use client";
import { useState } from "react";
import type { Passport } from "../../src/workspace/state";
import { dayOutOptions, dayOutStops, dayOutText } from "../../src/passport/day-out";

export default function DayOutPlan({
  passport,
  disabled,
}: {
  passport: Passport;
  disabled: boolean;
}) {
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [omitted, setOmitted] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState("");
  const options = dayOutOptions(passport.cards, passport.city);
  const stops = dayOutStops.map((stop) => {
    const pool = options.filter((card) => card.section === stop.section);
    // A choice removed by refinement requires explicit reselection.
    const selected = choices[stop.section]
      ? pool.find((card) => card.id === choices[stop.section])
      : pool[0];
    return { ...stop, pool, selected: omitted[stop.section] ? undefined : selected };
  });
  const selected = stops.flatMap((stop) => stop.selected ? [stop.selected] : []);

  function download() {
    const blob = new Blob([dayOutText(passport.city, selected)], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tastepassport-day-out.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Your day-out plan is downloaded. Keep it for your visit.");
  }

  return (
    <details className="secondary-reveal day-out-reveal">
      <summary>Plan a day out in {passport.city}</summary>
      <div className="day-out-plan">
        <span className="micro-label">MAKE THE CITY YOURS</span>
        <h2>Coffee, culture, and a good meal.</h2>
        <p>
          Choose a coffee stop, something to see, and somewhere to eat from your
          suggestions. Swap or skip any stop, then download your plan to keep it.
        </p>
        <p className="helper">
          Check opening hours, travel times, prices and availability before going.
          This is not a timed route or a reservation.
        </p>
        <ol className="day-out-stops">
          {stops.map((stop) => (
            <li key={stop.section}>
              <h3>{stop.label}</h3>
              <label htmlFor={`day-out-${stop.section}`}>{stop.section}</label>
              <select
                id={`day-out-${stop.section}`}
                disabled={disabled || !stop.pool.length}
                value={stop.selected?.id ?? ""}
                onChange={(event) => {
                  const id = event.target.value;
                  setChoices((old) => ({ ...old, [stop.section]: id }));
                  setOmitted((old) => ({ ...old, [stop.section]: !id }));
                  setStatus(`${stop.section} updated. Your other choices stay the same.`);
                }}
              >
                <option value="">
                  {stop.pool.length ? "Leave this stop open" : "No matches yet"}
                </option>
                {stop.pool.map((card) => (
                  <option key={card.id} value={card.id}>{card.name}</option>
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
                  <p>{stop.selected.address || "Address not provided in this discovery."}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      [stop.selected.name, stop.selected.address, passport.city]
                        .filter(Boolean).join(", "),
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
        <button
          className="primary-button"
          onClick={download}
          disabled={disabled || !selected.length}
        >
          Download my plan
        </button>
        <p role="status">{status}</p>
      </div>
    </details>
  );
}
