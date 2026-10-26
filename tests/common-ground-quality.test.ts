import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {meaningfulSharedThemes,togetherPlanningCards,commonGroundLinks,jointProfileState} from '../src/passport/common-ground.ts';
import {firstWeek} from '../src/passport/first-week.ts';
import {normalizeSession} from '../src/agent/session.ts';
import CommonGroundThemes from '../app/components/common-ground-themes.tsx';
import type {Card,Section} from '../src/passport/model.ts';
const comparison={shared:[{id:'urn:tag:mood:dynamic',name:'Dynamic',score:1},{id:'urn:tag:mood:passionate',name:'Passionate',score:1},{id:'urn:tag:genre:music:jazz',name:'Jazz',score:1}],aOnly:[],bOnly:[],recordedAt:'2026-10-26'};
function place(id:string,section:Section='Eat'):Card {return {id,name:id,section,types:['urn:entity:place'],detail:'',address:'Returned address',evidence:{source:'Qloo',operation:'/v2/insights/',queryId:'fixture',recordedAt:'2026-10-26',destination:'London',locality:'physical-city',mode:'familiar',pool:'direct',params:{},inputs:[],result:{id,type:'urn:entity:place',tags:[{id:'urn:tag:genre:place:fixture',type:'urn:tag:genre:place',name:section==='Eat'?'Restaurant':section==='Coffee'?'Coffee shop':'Museum'}]}}};}
test('common ground prefers specific returned themes and does not turn equal scores into badge claims',()=>{
 assert.deepEqual(meaningfulSharedThemes(comparison).map(t=>t.name),['Jazz']);
 const html=renderToStaticMarkup(createElement(CommonGroundThemes,{comparison,cards:[],you:[{id:'film',name:'Interstellar'}],partner:[{id:'artist',name:'Miles Davis'}]}));
 assert.match(html,/Interstellar/);assert.match(html,/Miles Davis/);assert.match(html,/No exact listing-tag/);assert.doesNotMatch(html,/relative score|%/);
 const broad=meaningfulSharedThemes({...comparison,shared:comparison.shared.slice(0,2)});assert.ok(broad.every(t=>t.broad));
});
test('individual links require positive returned contributions from both people rather than input IDs',()=>{
 const card=place('venue');assert.deepEqual(commonGroundLinks([card],[{id:'a',name:'A'}],[{id:'b',name:'B'}]),[]);
 card.intelligence={taste:{contributingSignals:[{id:'a',contribution:.2},{id:'b',contribution:.3}]}} as NonNullable<Card['intelligence']>;
 assert.equal(commonGroundLinks([card],[{id:'a',name:'A'}],[{id:'b',name:'B'}]).length,1);
 card.intelligence.taste.contributingSignals[1].contribution=0;assert.equal(commonGroundLinks([card],[{id:'a',name:'A'}],[{id:'b',name:'B'}]).length,0);
});
test('planning retains more than the preview, rejects wrong-city rows and fills a week from each real profile pool',()=>{
 const pool=(prefix:string)=>Array.from({length:24},(_,i)=>place(`${prefix}-${i}`,['Eat','Coffee','Culture'][i%3] as Section));
 const invalid={...place('outside'),evidence:{...place('outside').evidence!,destination:'Tokyo'}};
 assert.equal(togetherPlanningCards([...pool('joint'),invalid],'London').length,12);
 const roots={you:pool('you'),partner:pool('them'),both:pool('both')};
 const week=firstWeek([],'London','2026-10-27',roots),chosen=week.flatMap(d=>d.stops.filter(stop=>stop.card));
 assert.ok(chosen.length>=12);assert.equal(new Set(chosen.map(s=>s.card!.id)).size,chosen.length);
 for(const stop of chosen)assert.ok(roots[stop.audience!].some(card=>card.id===stop.card!.id));
});

test('shared comparison themes are soft signals and never replace explicit cuisine or geographic filters',()=>{
 const state=normalizeSession({id:'fixture',revision:1,expires:Date.now()+60000,city:'London',selected:[{id:'a',name:'A',types:['urn:entity:movie'],detail:''}],tags:[],constraints:[],categoryConstraints:{Eat:['mainstream']},categoryTags:{Eat:['urn:tag:cuisine:place:indian']},queryPreferences:{Eat:{priceMax:2,locationPoint:'-0.1,51.5'}},cards:[],previous:[],feedback:[],notices:[]});
 const next=jointProfileState(state,[{id:'b',name:'B',types:['urn:entity:artist'],detail:''}],comparison,'Eat');
 assert.deepEqual(next.categoryTags!.Eat,state.categoryTags!.Eat);assert.deepEqual(next.queryPreferences!.Eat!.inspirationTags,['urn:tag:genre:music:jazz']);assert.equal(next.queryPreferences!.Eat!.locationPoint,'-0.1,51.5');assert.equal(next.selected.length,2);assert.equal(state.selected.length,1);
});
