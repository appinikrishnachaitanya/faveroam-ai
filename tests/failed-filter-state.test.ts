import test from 'node:test';
import assert from 'node:assert/strict';
import { runTurn, type AgentDependencies } from '../src/agent/orchestrator.ts';
import { normalizeSession } from '../src/agent/session.ts';
import type { Card } from '../src/passport/model.ts';
const state=()=>normalizeSession({id:'fixture',revision:0,expires:Date.now()+60000,city:'London',selected:[],tags:[],constraints:[],categoryConstraints:{Eat:[]},queryPreferences:{Eat:{priceMax:4}},cards:[{id:'old',name:'Old Mayfair result',section:'Eat',types:['urn:entity:place'],detail:''} as Card],previous:[],feedback:[],notices:[],activeCategories:['Eat']});
const forbidden=async():Promise<never>=>{throw Error('Unexpected external call');};
const deps:AgentDependencies={tools:forbidden,workflow:forbidden,discover:async()=>[]};
const filters={locationQuery:'Soho',excludeLocation:'Mayfair',requiredExternalSources:['michelin'],priceMax:2,businessRatingMin:4.5,tripAdvisorReviewCountMin:100};
test('zero-result restrictive search retains old cards with their old active filters, and separates attempted filters',async()=>{
 const original=state();
 const reply=await runTurn(original,{discovery:{sections:['Eat'],preferences:filters}},deps);
 assert.deepEqual(reply.changed,[]);assert.deepEqual(reply.state.cards,original.cards);
 assert.deepEqual(reply.state.queryPreferences,original.queryPreferences);
 assert.equal(reply.state.failedSearches?.Eat?.queryPreferences?.excludeLocation,'Mayfair');
 assert.equal(reply.state.failedSearches?.Eat?.queryPreferences?.businessRatingMin,4.5);
 assert.match(reply.message,/previous discoveries and their active preferences are unchanged/i);
 let observed=false;
 const retried=await runTurn(reply.state,{recovery:{section:'Eat',action:'retry'}},{...deps,discover:async(s)=>{
  observed=true;assert.equal(s.queryPreferences?.Eat?.locationQuery,'Soho');assert.equal(s.queryPreferences?.Eat?.tripAdvisorReviewCountMin,100);return [];
 }});
 assert.ok(observed);assert.deepEqual(retried.state.queryPreferences,original.queryPreferences);
});
test('provider failure also rolls back attempted category preferences',async()=>{
 const original=state();const reply=await runTurn(original,{discovery:{sections:['Eat'],preferences:filters}},{...deps,discover:forbidden});
 assert.deepEqual(reply.state.queryPreferences,original.queryPreferences);assert.deepEqual(reply.state.cards,original.cards);
});
test('named-area recovery searches Wembley with confirmed tastes but no inherited filters',async()=>{
 const original=state();
 original.categoryConstraints.Eat=['mainstream'];
 original.categoryTags={Eat:['urn:tag:genre:place:restaurant']};
 const failed=await runTurn(original,{discovery:{sections:['Eat'],preferences:{...filters,locationQuery:'Wembley'}}},deps);
 let observed=false;
 const recovered=await runTurn(failed.state,{recovery:{section:'Eat',action:'area-only'}},{...deps,discover:async(s)=>{
  observed=true;
  assert.deepEqual(s.queryPreferences?.Eat,{locationQuery:'Wembley',radius:0});
  assert.deepEqual(s.categoryConstraints.Eat,[]);
  assert.deepEqual(s.categoryTags?.Eat,[]);
  return [{id:'wembley-place',name:'Wembley place',section:'Eat',types:['urn:entity:place'],detail:''} as Card];
 }});
 assert.ok(observed);
 assert.deepEqual(recovered.changed,['Eat']);
 assert.equal(recovered.state.failedSearches?.Eat,undefined);
 assert.equal(recovered.state.queryPreferences?.Eat?.locationQuery,'Wembley');
});
for (const message of ['Are these open now?','What are their opening hours?','Book a table for me']) {
 test(`unsupported availability action is read-only: ${message}`,async()=>{
  const original=state();const reply=await runTurn(original,{message},deps);
  assert.deepEqual(reply.changed,[]);assert.deepEqual(reply.state.cards,original.cards);assert.deepEqual(reply.state.queryPreferences,original.queryPreferences);
  assert.match(reply.message,message.startsWith('Book')?/cannot make reservations/i:/can’t verify live opening hours/i);
 });
}
