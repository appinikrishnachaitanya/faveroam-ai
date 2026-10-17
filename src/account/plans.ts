import type { Card } from "../passport/model.ts";
import type { AgentState } from "../agent/types.ts";
import { dayOutOptions } from "../passport/day-out.ts";

export interface SavedPlan {
  id: string;
  city: string;
  scheduled_date: string;
  time_zone: string;
  stops: Card[];
  created_at: string;
}
const zones: Record<string, string> = {
  Toronto: "America/Toronto",
  "New York City": "America/New_York",
  London: "Europe/London",
  Paris: "Europe/Paris",
  Tokyo: "Asia/Tokyo",
};
export function cityTimeZone(city: string) {
  return zones[city.split(",")[0].trim()] ?? "UTC";
}
export function cityDate(city: string, now = new Date()) {
  const zone = cityTimeZone(city);
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function nextWeekend(city: string, now = new Date()) {
  const date = new Date(`${cityDate(city, now)}T12:00:00Z`);
  const days = (6 - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + (days || 7));
  return date.toISOString().slice(0, 10);
}
/** Client submits IDs only; names/addresses/evidence always come from trusted session state. */
export function planFromSession(state: AgentState, input: unknown, now = new Date()) {
  const b = input as { revision?: unknown; ids?: unknown; date?: unknown } | null;
  if (!b || b.revision !== state.revision) throw Error("Your Passport changed. Try saving the latest plan.");
  if (!Array.isArray(b.ids) || !b.ids.length || b.ids.length > 3 || b.ids.some((id) => typeof id !== "string") || new Set(b.ids).size !== b.ids.length)
    throw Error("Choose between one and three different stops.");
  if (typeof b.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) throw Error("Choose a valid date.");
  const parsed = new Date(`${b.date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== b.date || b.date < cityDate(state.city, now))
    throw Error("Choose today or a future date in your destination.");
  const available = dayOutOptions(state.cards.filter((c) => !state.hiddenCategories?.includes(c.section)), state.city);
  const stops = b.ids.map((id) => available.find((card) => card.id === id));
  if (stops.some((card) => !card) || new Set(stops.map((c) => c!.section)).size !== stops.length)
    throw Error("A stop changed. Choose one current suggestion per category.");
  const plan = { city: state.city, scheduled_date: b.date, time_zone: cityTimeZone(state.city), stops: structuredClone(stops as Card[]) };
  if (new TextEncoder().encode(JSON.stringify(plan.stops)).length > 120000) throw Error("This plan is too large to save.");
  return plan;
}
export function calendarFile(plan: Pick<SavedPlan, "id" | "city" | "scheduled_date" | "stops">) {
  const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n|\r/g, "\\n").replace(/[,;]/g, (v) => `\\${v}`);
  const next = new Date(`${plan.scheduled_date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const description = [...plan.stops.map((s) => `${s.name}${s.address ? ` — ${s.address}` : ""}`), "Personal plan, not a reservation. Check opening hours and availability."].join("\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TastePassport//Personal plans//EN", "BEGIN:VEVENT",
    `UID:${escape(plan.id)}@tastepassport`, `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, "")}`,
    `DTSTART;VALUE=DATE:${plan.scheduled_date.replaceAll("-", "")}`, `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replaceAll("-", "")}`,
    `SUMMARY:${escape(`A day out in ${plan.city}`)}`, `DESCRIPTION:${escape(description)}`, "END:VEVENT", "END:VCALENDAR"];
  // Fold UTF-8 content lines at 75 octets, as required by iCalendar.
  return lines.map((line) => {
    let result = "", size = 0;
    for (const char of line) {
      const bytes = new TextEncoder().encode(char).length;
      if (size + bytes > 75) { result += "\r\n "; size = 1; }
      result += char; size += bytes;
    }
    return result;
  }).join("\r\n") + "\r\n";
}
