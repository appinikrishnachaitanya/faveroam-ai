import type { AgentState } from "../agent/types.ts";
import type { Card } from "../passport/model.ts";
import { activityMatches } from "../passport/day-out.ts";
import { firstWeek, type WeekDay } from "../passport/first-week.ts";
import { dayOutOptions } from "../passport/day-out.ts";
import { cityTimeZone, planDateError } from "./plans.ts";

export interface SavedFirstWeek {
  id: string;
  city: string;
  start_date: string;
  time_zone: string;
  days: WeekDay[];
  created_at: string;
  updated_at: string;
}

export function mergeSavedFirstWeek(current: SavedFirstWeek[], saved: SavedFirstWeek): SavedFirstWeek[] {
  return [...current.filter(item => item.id !== saved.id && !(item.city === saved.city && item.start_date === saved.start_date)), saved]
    .sort((a,b) => a.start_date.localeCompare(b.start_date));
}

function savedCard(card:Card):Card {
  const location=card.intelligence?.location;
  return {
    id:card.id,name:card.name,section:card.section,types:[...card.types],detail:card.detail,
    ...(card.address?{address:card.address}:{}),
    evidence:{source:"Qloo",operation:"/v2/insights/",queryId:"saved-first-week",recordedAt:new Date().toISOString(),destination:card.evidence!.destination,locality:"physical-city",mode:card.evidence!.mode,pool:card.evidence!.pool,inputs:[],params:{},result:{id:card.id,type:"urn:entity:place",tags:card.evidence!.result.tags.map(tag=>({id:tag.id,name:tag.name,type:tag.type}))}},
    ...(location&&Number.isFinite(location.latitude)&&Number.isFinite(location.longitude)?{intelligence:{id:card.id,name:card.name,type:card.intelligence!.type,taste:{contributingSignals:[]},quality:{},commercial:{},externalProof:{},location:{latitude:location.latitude!,longitude:location.longitude!,...(location.address?{address:location.address}:{})}}}:{}),
  };
}

/** The browser sends identifiers only. Every saved venue is reconstructed from
 * the current server-owned Passport session before it is persisted. */
export function firstWeekFromSession(state: AgentState, input: unknown, now = new Date(), existingDays?:unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("Choose a week to save.");
  const body = input as {revision?:unknown; startDate?:unknown; days?:unknown; roots?:unknown};
  if(body.roots!==undefined&&typeof body.roots!=="boolean")throw Error("Choose a valid week type.");
  if (body.revision !== state.revision) throw Error("Your Passport changed. Save the latest week again.");
  const dateError = planDateError(state.city, body.startDate, now);
  if (dateError) throw Error(dateError);
  const startDate = body.startDate as string;
  const template = firstWeek([], state.city, startDate, body.roots?{you:[],partner:[],both:[]}:undefined);
  if (!Array.isArray(body.days) || body.days.length !== template.length) throw Error("A First Week has seven days.");
  const submittedDays=body.days as unknown[];
  const available = dayOutOptions(state.cards.filter(card => !state.hiddenCategories?.includes(card.section)), state.city);
  const previouslySaved:Card[]=[];
  if(Array.isArray(existingDays))for(const day of existingDays)if(day&&typeof day==='object'&&!Array.isArray(day)){
    const stops=(day as Record<string,unknown>).stops;
    if(Array.isArray(stops))for(const stop of stops)if(stop&&typeof stop==='object'&&!Array.isArray(stop)){
      const card=(stop as Record<string,unknown>).card;
      if(card&&typeof card==='object'&&!Array.isArray(card)){
        const saved=card as Card;
        if(typeof saved.id==='string'&&typeof saved.name==='string'&&typeof saved.section==='string'&&saved.evidence?.source==='Qloo'&&saved.evidence.destination===state.city)previouslySaved.push(saved);
      }
    }
  }
  const used = new Set<string>();
  const days: WeekDay[] = template.map((expected, dayIndex) => {
    const value = submittedDays[dayIndex];
    if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("One of the saved days is invalid.");
    const day = value as Record<string, unknown>;
    if (day.date !== expected.date || day.title !== expected.title || !Array.isArray(day.stops) || day.stops.length !== expected.stops.length)
      throw Error("The week changed. Reopen it and save again.");
    const submittedStops=day.stops as unknown[];
    const stops = expected.stops.map((expectedStop, stopIndex) => {
      const raw = submittedStops[stopIndex];
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw Error("One of the saved stops is invalid.");
      const stop = raw as Record<string, unknown>;
      if (stop.activity !== expectedStop.activity || (stop.audience ?? undefined) !== expectedStop.audience)
        throw Error("A saved activity does not match this First Week.");
      if (typeof stop.time !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(stop.time)) throw Error("Choose a valid time for every stop.");
      if (stop.locked !== undefined && typeof stop.locked !== "boolean") throw Error("One of the saved stop approvals is invalid.");
      let card;
      if (stop.cardId !== undefined && stop.cardId !== null) {
        if (typeof stop.cardId !== "string") throw Error("One of the saved places is invalid.");
        card = available.find(candidate => candidate.id === stop.cardId) ?? previouslySaved.find(candidate=>candidate.id===stop.cardId);
        if (!card || !activityMatches(card, expectedStop.activity)) throw Error("A place is no longer available in this Passport. Open that Passport before saving its week.");
        if (used.has(card.id)) throw Error("Choose each place only once in your week.");
        used.add(card.id);
      }
      if (stop.locked === true && !card) throw Error("Choose a place before approving a stop.");
      return {activity:expectedStop.activity, time:stop.time, ...(card?{card:savedCard(card)}:{}), ...(stop.locked===true?{locked:true}:{}), ...(expectedStop.audience?{audience:expectedStop.audience}:{})};
    });
    return {title:expected.title,date:expected.date,stops};
  });
  const serialized = JSON.stringify(days);
  if (new TextEncoder().encode(serialized).length > 500_000) throw Error("This week is too large to save. Remove a few places and try again.");
  return {city:state.city,start_date:startDate,time_zone:cityTimeZone(state.city),days};
}
