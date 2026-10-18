"use client";
import { useState, useEffect } from "react";
import type { Card } from "../../src/passport/model";
import type { Passport } from "../../src/workspace/state";
import {
  dayOutOptions,
  dayOutText,
  stopDistance,
  nearbyOutingOptions,
  outingActivities,
  activityMatches,
} from "../../src/passport/day-out";
import { evidenceFacts } from "../../src/qloo/explanation";
import { cityDate, cityTimeZone, nextWeekend } from "../../src/account/plans";
import { accountRequest, showNotice } from "../../src/account/browser";

export default function DayOutPlan({
  passport,
  disabled,
  signedIn = false,
  expanded,
  onFindActivity,
}: {
  passport: Passport;
  disabled: boolean;
  signedIn?: boolean;
  expanded?: boolean;
  onFindActivity?: (id:string)=>void;
}) {
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [omitted, setOmitted] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState("");
  const [date, setDate] = useState(() => cityDate(passport.city));
  const [saving, setSaving] = useState(false);
  const requestOrder = passport.session?.outingActivities?.filter(id=>outingActivities.some(a=>a.id===id));
  const [activities, setActivities] = useState<string[]>(()=>requestOrder?.length ? requestOrder : ["Coffee","Culture","Eat"].filter(id=>dayOutOptions(passport.cards,passport.city).some(c=>activityMatches(c,id))));
  const orderKey=requestOrder?.join(',') ?? '';
  useEffect(()=>{if(orderKey)setActivities(orderKey.split(','));},[orderKey]);
  const options = dayOutOptions(passport.cards, passport.city);
  let previousStop:Card | undefined;
  const stops = activities.map(id => ({ ...outingActivities.find(a => a.id === id)!, id })).map((stop) => {
    const pool = nearbyOutingOptions(options.filter((card) => activityMatches(card, stop.id)),previousStop);
    // A choice removed by refinement requires explicit reselection.
    const selected = choices[stop.id]
      ? pool.find((card) => card.id === choices[stop.id])
      : pool[0];
    const chosen=omitted[stop.id] ? undefined : selected;
    const distance=previousStop && chosen ? stopDistance(previousStop,chosen) : undefined;
    if(chosen)previousStop=chosen;
    return {...stop,pool,selected:chosen,distance};
  });
  const selected = stops.flatMap((stop) =>
    stop.selected ? [stop.selected] : [],
  );
  const duplicateStops = new Set(selected.map(card => card.id)).size !== selected.length;

  function moveActivity(id: string, direction: -1 | 1) {
    setActivities(current => {
      const index = current.indexOf(id);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= current.length) return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }

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
    <details className="secondary-reveal day-out-reveal" open={expanded}>
      <summary>Plan a day out in {passport.city}</summary>
      <div className="day-out-plan">
        <span className="micro-label">MAKE THE CITY YOURS</span>
        <h2>
          Build your first outing.
        </h2>
        <p role="status">
          {selected.length} of {activities.length} stops selected.
          {selected.length < activities.length
            ? " This is a partial plan; leave a stop open or refine that category."
            : " Check locations and hours before going."}
        </p>
        <p>
          Choose your activities and their order. Swap or skip any stop without changing the others.
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
            onClick={() => {
              const weekend = nextWeekend(passport.city);
              setDate(weekend);
              setStatus(
                `Your plan is set for ${new Date(`${weekend}T12:00:00Z`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}.`,
              );
            }}
          >
            Next weekend
          </button>
          <p className="helper">
            Dates use {cityTimeZone(passport.city) === "UTC" ? "UTC until a destination time zone is available" : `local time in ${passport.city}`}. Saving again for the same city
            and date updates that plan.
          </p>
        </div>
        <fieldset className="outing-activities"><legend>What would you like to do?</legend>
          {outingActivities.map(activity => <label key={activity.id}><input type="checkbox" checked={activities.includes(activity.id)} disabled={disabled || saving} onChange={e => {setActivities(old => e.target.checked ? [...old, activity.id] : old.filter(id => id !== activity.id)); if(e.target.checked && !options.some(card=>activityMatches(card,activity.id))) onFindActivity?.(activity.id);}} />{activity.label}</label>)}
        </fieldset>
        <ol className="day-out-stops">
          {stops.map((stop, index) => (
            <li key={stop.id}>
              <h3>{stop.label}</h3>
              <div className="outing-order">
                <button type="button" className="quiet-button"
                  disabled={disabled || saving || index === 0}
                  aria-label={`Move ${stop.label} earlier`}
                  onClick={() => moveActivity(stop.id, -1)}>↑ Earlier</button>
                <button type="button" className="quiet-button"
                  disabled={disabled || saving || index === stops.length - 1}
                  aria-label={`Move ${stop.label} later`}
                  onClick={() => moveActivity(stop.id, 1)}>↓ Later</button>
              </div>
              <label htmlFor={`day-out-${stop.id}`}>{stop.label}</label>
              <select
                id={`day-out-${stop.id}`}
                disabled={disabled || saving || !stop.pool.length}
                value={stop.selected?.id ?? ""}
                onChange={(event) => {
                  const id = event.target.value;
                  setChoices((old) => ({ ...old, [stop.id]: id }));
                  setOmitted((old) => ({ ...old, [stop.id]: !id }));
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
                  {onFindActivity && <button type="button" className="quiet-button" disabled={disabled||saving} onClick={()=>onFindActivity(stop.id)}>Find {stop.label.toLowerCase()} options</button>}
                </p>
              )}
              {stop.distance !== undefined && <p className="helper">{stop.distance.toFixed(1)} km straight-line from the previous stop. Check transport and travel time.</p>}
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
                    {evidenceFacts(stop.selected).slice(0,4).map(fact => <p key={fact}>{fact}</p>)}
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
        {selected.some(
          (card, index) =>
            index > 0 && (stopDistance(selected[index - 1], card) ?? 0) > 15,
        ) && (
          <p role="status">
            Some stops are more than 15 km apart in a straight line. Consider a
            closer choice and check transport before going.
          </p>
        )}
        <div className="plan-save-actions">
          {duplicateStops && <p role="alert">Choose different venues for each activity, or leave a repeated stop open.</p>}
          <button
            className="quiet-button download-plan"
            onClick={download}
            disabled={disabled || !selected.length || duplicateStops}
          >
            {selected.length === 3
              ? "Download my plan"
              : "Download partial plan"}
          </button>
          <button
            className="primary-button"
            disabled={disabled || saving || !selected.length || !date || duplicateStops}
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
