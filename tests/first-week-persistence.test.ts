import test from "node:test";
import assert from "node:assert/strict";
import { firstWeekFromSession, mergeSavedFirstWeek, type SavedFirstWeek } from "../src/account/first-weeks.ts";
import { normalizeSession } from "../src/agent/session.ts";
import { firstWeek } from "../src/passport/first-week.ts";
import type { Card, Section } from "../src/passport/model.ts";

const now=new Date("2026-10-26T12:00:00Z");
function card(id:string,section:Section):Card{return {id,name:`Local ${id}`,section,types:["urn:entity:place"],detail:"Verified place",address:`${id} address`,evidence:{source:"Qloo",operation:"/v2/insights/",queryId:`q-${id}`,recordedAt:now.toISOString(),destination:"Toronto",locality:"physical-city",mode:"familiar",pool:"direct",inputs:[],params:{},result:{id,type:"urn:entity:place",tags:[{id:`urn:tag:genre:place:${section.toLowerCase()}`,name:section,type:"urn:tag:genre:place"}]}}};}
function session(){return normalizeSession({id:"123e4567-e89b-12d3-a456-426614174000",revision:4,expires:now.getTime()+60_000,city:"Toronto",selected:[],tags:[],constraints:[],categoryConstraints:{},cards:[card("coffee","Coffee"),card("food","Eat"),card("culture","Culture"),card("nightlife","Culture")],previous:[],feedback:[],notices:[]});}
function requestFor(state= session(),startDate="2026-10-26"){
 const days=firstWeek(state.cards,state.city,startDate);
 return {revision:state.revision,startDate,days:days.map(day=>({title:day.title,date:day.date,stops:day.stops.map(stop=>({activity:stop.activity,time:stop.time,cardId:stop.card?.id??null,locked:false}))}))};
}

test("saved First Week is reconstructed from current server cards and contains seven dated days",()=>{
 const state=session();const result=firstWeekFromSession(state,requestFor(state),now);
 assert.equal(result.days.length,7);assert.equal(result.start_date,"2026-10-26");assert.equal(result.time_zone,"America/Toronto");
 const chosen=result.days.flatMap(day=>day.stops.flatMap(stop=>stop.card?[stop.card]:[]));
 assert.ok(chosen.length>0);assert.ok(chosen.every(place=>state.cards.some(current=>current.id===place.id)));
 assert.ok(chosen.every(place=>place.evidence?.destination===state.city));
});

test("First Week save rejects stale revisions, invented venues, duplicates, invalid dates and malformed activity layouts",()=>{
 const state=session();const base=requestFor(state);
 assert.throws(()=>firstWeekFromSession(state,{...base,revision:state.revision-1},now),/changed/);
 const invented=structuredClone(base);invented.days[0]!.stops[0]!.cardId="not-in-passport";
 assert.throws(()=>firstWeekFromSession(state,invented,now),/no longer available/);
 const duplicate=structuredClone(base);const firstId=duplicate.days[0]!.stops[0]!.cardId;duplicate.days[3]!.stops[0]!.cardId=firstId;
 assert.throws(()=>firstWeekFromSession(state,duplicate,now),/only once/);
 assert.throws(()=>firstWeekFromSession(state,{...base,startDate:"2026-02-30"},now),/valid date/);
 const altered=structuredClone(base);altered.days[0]!.stops[0]!.activity="Nightlife";
 assert.throws(()=>firstWeekFromSession(state,altered,now),/activity/);
});

test("saved places are minimized to display, activity and map evidence",()=>{
 const state=session(),request=requestFor(state);
 const first=state.cards.find(place=>place.id===request.days[0]!.stops[0]!.cardId);
 if(!first)assert.fail("fixture should select a first-day venue");
 const saved=firstWeekFromSession(state,request,now);
 const stored=saved.days.flatMap(day=>day.stops.flatMap(stop=>stop.card?[stop.card]:[]))[0]!;
 assert.equal(stored.id,first.id);assert.equal(stored.intelligence?.location.latitude,undefined);
 assert.deepEqual(stored.evidence?.inputs,[]);assert.equal(stored.evidence?.result.id,stored.id);
 assert.ok(JSON.stringify(saved).length<50_000);
});

test("an owned saved place can be kept when reopening its week in a fresh session",()=>{
 const original=session(),originalRequest=requestFor(original);
 const previouslySaved=firstWeekFromSession(original,originalRequest,now);
 const next=session();next.cards=next.cards.filter(place=>place.id!=="coffee");
 const edited=structuredClone(originalRequest);edited.days[0]!.stops[0]!.time="11:00";
 const result=firstWeekFromSession(next,edited,now,previouslySaved.days);
 assert.equal(result.days[0]!.stops[0]!.time,"11:00");assert.equal(result.days[0]!.stops[0]!.card?.id,"coffee");
});

test("an owned saved week can move to a new date without losing its selected places",()=>{
 const original=session(),saved=firstWeekFromSession(original,requestFor(original),now);
 const nextDate="2026-10-27",moved=structuredClone(requestFor(original,nextDate));
 const result=firstWeekFromSession(original,{...moved,revision:original.revision},now,saved.days);
 assert.equal(result.start_date,nextDate);
 assert.equal(result.days[0]!.stops[0]!.card?.id,saved.days[0]!.stops[0]!.card?.id);
});

test("upserting a saved First Week replaces the same city and date",()=>{
 const week={id:"week-one",city:"Toronto",start_date:"2026-10-26",time_zone:"America/Toronto",days:[] as never[],created_at:"today",updated_at:"today"} satisfies SavedFirstWeek;
 const changed={...week,id:"week-two",updated_at:"later"};
 assert.deepEqual(mergeSavedFirstWeek([week],changed),[changed]);
});
