import test from 'node:test';
import assert from 'node:assert/strict';
import {firstWeek,firstWeekIcs} from '../src/passport/first-week.ts';
import {mappedPlaces} from '../app/components/passport-map.tsx';
import {sharedHangout,commonGroundStarters} from '../src/passport/common-ground.ts';
import {shareSnapshot} from '../src/share/links.ts';
import type {Card} from '../src/passport/model.ts';
import type {AgentState} from '../src/agent/types.ts';

const venue=(id:string,section:Card['section'],lat?:number):Card=>({id,name:id,section,types:['urn:entity:place'],detail:'',address:`${id} Street`,intelligence:{location:{latitude:lat,longitude:0.1}},evidence:{source:'Qloo',operation:'/v2/insights/',queryId:'fixture',recordedAt:'2026-01-01',destination:'London',locality:'physical-city',mode:'balanced',pool:'profile',inputs:[],params:{},result:{id,type:'urn:entity:place',tags:[{id:`urn:tag:genre:place:${section.toLowerCase()}`,type:'urn:tag:genre:place',name:section==='Eat'?'Restaurant':section==='Coffee'?'Coffee shop':'Museum'}]}}} as unknown as Card);

test('first week uses returned venues once, leaves honest gaps and exports local calendar times',()=>{
 const days=firstWeek([venue('Dinner','Eat'),venue('Coffee','Coffee')],'London','2026-10-24');
 assert.equal(days.length,7);
 assert.deepEqual(days.flatMap(day=>day.stops.flatMap(stop=>stop.card?.id??[])),['Coffee','Dinner']);
 assert.ok(days.flatMap(day=>day.stops).some(stop=>!stop.card));
 const ics=firstWeekIcs(days,'Europe/London');
 assert.match(ics,/DTSTART;TZID=Europe\/London:20261024T100000/);
 assert.equal((ics.match(/BEGIN:VEVENT/g)??[]).length,2);
 assert.doesNotMatch(ics,/undefined|Open stop/);
});
test('map omits non-place, unverified and invalid-coordinate cards',()=>{
 const valid=venue('Local','Eat',51.5);
 const wrongCity=venue('Wrong city','Eat',51.4);wrongCity.evidence!.result.id='other';
 assert.deepEqual(mappedPlaces([valid,wrongCity,venue('No coordinate','Coffee'),{...venue('Music','Music',51.5),section:'Music'},venue('Invalid','Eat',100)]).map(card=>card.id),['Local']);
});
test('shared hangout and conversation starters remain grounded in returned cards and overlap',()=>{
 const overlap={shared:[{id:'urn:tag:genre:place:eat',name:'Restaurant'}],aOnly:[],bOnly:[],recordedAt:'2026-01-01'};
 const cards=[venue('Dinner','Eat'),venue('Gallery','Culture')];
 assert.equal(sharedHangout(cards,overlap)?.card.id,'Dinner');
 assert.equal(sharedHangout([],overlap),undefined);
 const starters=commonGroundStarters(overlap,'Dinner','Gallery');
 assert.equal(starters.length,3);
 assert.ok(starters.every(text=>!text.includes('%')));
});
test('public share snapshot contains tastes and returned evidence but no account or conversation',()=>{
 const state={city:'London',selected:[{id:'a',name:'Interstellar',types:['urn:entity:movie'],detail:''}],cards:[venue('Dinner','Eat')],history:[{role:'user',text:'private message'}],accountEmail:'private@example.com'} as unknown as AgentState;
 const snapshot=shareSnapshot(state);
 const json=JSON.stringify(snapshot);
 assert.match(json,/Interstellar|Dinner/);
 assert.doesNotMatch(json,/private message|private@example.com/);
 assert.equal(snapshot.cards[0].name,'Dinner');
});

test('two roots shares the planner while keeping individual and joint search pools distinct',()=>{
 const a=venue('A anchor','Eat'),b=venue('B anchor','Eat'),joint=venue('Shared place','Eat');
 const days=firstWeek([], 'London','2026-10-27',{you:[a],partner:[b],both:[joint]});
 const chosen=days.flatMap(day=>day.stops).filter(stop=>stop.card);
 assert.deepEqual(new Set(chosen.map(stop=>stop.card!.id)),new Set(['A anchor','B anchor','Shared place']));
 assert.equal(chosen.find(stop=>stop.card!.id===a.id)?.audience,'you');
 assert.equal(chosen.find(stop=>stop.card!.id===b.id)?.audience,'partner');
 assert.equal(chosen.find(stop=>stop.card!.id===joint.id)?.audience,'both');
 assert.ok(days.flatMap(day=>day.stops).some(stop=>!stop.card));
});
test('a missing individual profile never borrows a joint venue and calls it personal',()=>{
 const days=firstWeek([], 'London','2026-10-27',{you:[],partner:[],both:[venue('Joint only','Eat')]});
 assert.ok(days.flatMap(day=>day.stops).filter(stop=>stop.audience!=='both').every(stop=>!stop.card));
});
