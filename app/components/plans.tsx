"use client";
import { calendarFile, cityDate, savedStopActivity, type SavedPlan } from "../../src/account/plans";
import { outingActivities } from "../../src/passport/day-out";
import { firstWeekIcs } from "../../src/passport/first-week";
import { type SavedFirstWeek } from "../../src/account/first-weeks";
import { cityTimeZone } from "../../src/account/plans";

export function downloadCalendar(plan: SavedPlan) {
  const url = URL.createObjectURL(new Blob([calendarFile(plan)], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = "faveroam-plan.ics"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function UpcomingPlans({ plans, weeks=[], busy, error, editableCity, onEdit, onEditWeek, onDelete, onDeleteWeek=()=>{}, onRetry }: {
  plans: SavedPlan[]; weeks?:SavedFirstWeek[]; busy: boolean; error: string;
  editableCity?:string; onEdit?:(plan:SavedPlan)=>void;
  onEditWeek?:(week:SavedFirstWeek)=>void; onDelete: (id: string) => void; onDeleteWeek?:(id:string)=>void; onRetry: () => void;
}) {
  const upcoming = plans.filter((p) => p.scheduled_date >= cityDate(p.city))
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date) || (a.stop_times?.[0] ?? "").localeCompare(b.stop_times?.[0] ?? ""));
  const upcomingWeeks=weeks.filter(week=>week.days.some(day=>day.date>=cityDate(week.city))).sort((a,b)=>a.start_date.localeCompare(b.start_date));
  return <section className="upcoming-plans" aria-label="Your upcoming plans">
    <p className="helper">Your own outings, saved by date and suggested local time. Check opening hours and travel before going; these are not bookings.</p>
    {error&&<div role="alert"><p>{error}</p><button className="quiet-button" disabled={busy} onClick={onRetry}>Try again</button></div>}
    {!upcoming.length&&!upcomingWeeks.length&&!error?<div className="library-empty"><h3>Your next good day starts here.</h3><p>Build a Passport, open Plan a day out or First Week, choose a date, and save your plans.</p></div>:<>
      {upcomingWeeks.map(week=><article className="saved-plan saved-first-week" key={`week:${week.id}`}>
        <div className="plan-date"><span>{new Date(`${week.start_date}T12:00:00Z`).toLocaleDateString(undefined,{month:"short",timeZone:"UTC"})}</span><strong>{week.start_date.slice(-2)}</strong></div>
        <div className="plan-details"><span className="micro-label">SEVEN-DAY PLAN</span><h3>First Week in {week.city}</h3>
          <p>Starting {new Date(`${week.start_date}T12:00:00Z`).toLocaleDateString(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric",timeZone:"UTC"})} · Local time in {week.city}</p>
          <div className="saved-week-days">{week.days.map((day,index)=><details key={day.date}><summary>Day {index+1} · {day.title}</summary><ol>{day.stops.map(stop=><li key={`${day.date}:${stop.activity}`}><strong>{stop.time} · {outingActivities.find(activity=>activity.id===stop.activity)?.label??stop.activity}</strong><span>{stop.card?.name??"Open stop — no place selected"}{stop.card?.address?` · ${stop.card.address}`:""}</span></li>)}</ol></details>)}</div>
          <div className="plan-actions">{onEditWeek&&editableCity===week.city&&<button className="quiet-button" disabled={busy} onClick={()=>onEditWeek(week)}>Open week</button>}<button className="quiet-button" onClick={()=>{const url=URL.createObjectURL(new Blob([firstWeekIcs(week.days,week.time_zone||cityTimeZone(week.city))],{type:"text/calendar;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download="faveroam-first-week.ics";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Add to calendar</button><button className="text-button" disabled={busy} onClick={()=>onDeleteWeek(week.id)}>Delete week</button></div>
          {editableCity!==week.city&&<p className="helper">Open a Passport for {week.city} to edit this week.</p>}
        </div>
      </article>)}
      {upcoming.map((plan) => <article className="saved-plan" key={plan.id}>
        <div className="plan-date"><span>{new Date(`${plan.scheduled_date}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", timeZone: "UTC" })}</span><strong>{plan.scheduled_date.slice(-2)}</strong></div>
        <div className="plan-details"><h3>A day out in {plan.city}</h3>
          <p>{new Date(`${plan.scheduled_date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })} · {plan.time_zone === "UTC" ? "UTC" : `Local time in ${plan.city}`}</p>
          <ol>{plan.stops.map((stop,index) => <li key={stop.id}><strong>{plan.stop_times?.[index] ? `${plan.stop_times[index]} · ` : ""}{stop.name}</strong><span>{outingActivities.find(activity=>activity.id===savedStopActivity(stop))?.label??stop.section}{stop.address ? ` · ${stop.address}` : ""}</span></li>)}</ol>
          <div className="plan-actions">{onEdit&&editableCity===plan.city&&<button className="quiet-button" disabled={busy} onClick={()=>onEdit(plan)}>Edit</button>}<button className="quiet-button" onClick={() => downloadCalendar(plan)}>Add to calendar</button>
            <button className="text-button" disabled={busy} onClick={() => onDelete(plan.id)}>Delete plan</button></div>
        </div>
      </article>)}
      </>}
  </section>;
}
