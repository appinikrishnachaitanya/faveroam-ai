"use client";
import { useState } from "react";
import type { Passport } from "../../src/workspace/state";
import { weekendOptions, weekendStops, weekendText } from "../../src/passport/weekend";

export default function WeekendPlan({ passport, disabled }: { passport: Passport; disabled: boolean }) {
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [omitted, setOmitted] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState("");
  const options = weekendOptions(passport.cards, passport.city);
  const stops = weekendStops.map((stop) => {
    const pool = options.filter((card) => card.section === stop.section);
    // Explicit choices that disappear after refinement require a new choice.
    const selected = choices[stop.section]
      ? pool.find((card) => card.id === choices[stop.section])
      : pool[0];
    return { ...stop, pool, selected: omitted[stop.section] ? undefined : selected };
  });
  const selected = stops.flatMap((stop) => stop.selected ? [stop.selected] : []);
  function download() {
    const url = URL.createObjectURL(new Blob([weekendText(passport.city, selected)], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "tastepassport-weekend.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Weekend plan downloaded. Keep this copy for your visit.");
  }
  return <details className="secondary-reveal weekend-reveal">
    <summary>My first weekend in {passport.city}</summary>
    <div className="weekend-plan">
      <span className="micro-label">MAKE THE CITY YOURS</span>
      <h2>A little familiar. A little discovery.</h2>
      <p>A suggested sequence from your real discoveries. Change one stop without changing the others. Your edits stay in this open Passport; download a copy to keep them.</p>
      <p className="helper">Check opening hours, travel times, prices and availability before going. This is not a timed route or a reservation.</p>
      <ol className="weekend-stops">
        {stops.map((stop) => <li key={stop.section}>
          <h3>{stop.label}</h3>
          <label htmlFor={`weekend-${stop.section}`}>{stop.section}</label>
          <select id={`weekend-${stop.section}`} disabled={disabled || !stop.pool.length}
            value={stop.selected?.id ?? ""}
            onChange={(event) => {
              const id = event.target.value;
              setChoices((old) => ({ ...old, [stop.section]: id }));
              setOmitted((old) => ({ ...old, [stop.section]: !id }));
              setStatus(`${stop.section} updated. Your other choices stay the same.`);
            }}>
            <option value="">{stop.pool.length ? "Leave this stop open" : "No local discoveries available yet"}</option>
            {stop.pool.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
          </select>
          {stop.selected && <>
            <p>{stop.selected.address || "Address not provided in this discovery."}</p>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([stop.selected.name, stop.selected.address, passport.city].filter(Boolean).join(", "))}`} target="_blank" rel="noopener noreferrer">Look up location &amp; hours ↗</a>
            <details><summary>Why this stop?</summary><p>Returned by Qloo for your Passport. This sequence keeps the existing discovery order within each category; it does not introduce a new ranking.</p><small>Query receipt: {stop.selected.evidence?.queryId}</small></details>
          </>}
          {!stop.selected && stop.pool.length > 0 && <p className="helper">Choose a discovery above, or keep this stop open. A previous choice may have changed after refinement.</p>}
        </li>)}
      </ol>
      <button className="primary-button" onClick={download} disabled={disabled || !selected.length}>Download my weekend</button>
      <p role="status">{status}</p>
    </div>
  </details>;
}
