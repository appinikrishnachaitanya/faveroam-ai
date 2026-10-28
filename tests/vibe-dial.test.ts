import test from 'node:test';
import assert from 'node:assert/strict';
import {vibeDirections} from '../src/passport/vibe-dial.ts';
import type {Card} from '../src/passport/model.ts';
import {runTurn, type AgentDependencies} from '../src/agent/orchestrator.ts';
import {normalizeSession} from '../src/agent/session.ts';
const artist={id:'artist',name:'Confirmed artist',types:['urn:entity:artist'],detail:''};
const film={id:'film',name:'Confirmed movie',types:['urn:entity:movie'],detail:''};
const tags=[{id:'urn:tag:genre:music:jazz',name:'Jazz'},{id:'urn:tag:style:qloo:narrative',name:'Narratively Complex'},{id:'urn:tag:genre:place:restaurant',name:'Restaurant'}];
const card={id:'returned',section:'Music',evidence:{result:{id:'returned',tags}}} as Card;
test('Vibe Dial uses returned themes and targets only active relevant domains',()=>{
 const choices=vibeDirections([card],[artist,film],['Music','Movies']);
 assert.deepEqual(choices.map(choice=>choice.sections),[['Music'],['Movies']]);
 assert.ok(choices.every(choice=>tags.some(tag=>tag.id===choice.theme.id)));
 assert.ok(choices.length<=3);
});
test('Vibe Dial skips unsupported choices rather than inventing a quiz',()=>{
 assert.deepEqual(vibeDirections([], [artist],['Music']),[]);
 assert.deepEqual(vibeDirections([{...card,id:'forged'}], [artist],['Music']),[]);
 assert.deepEqual(vibeDirections([card], [artist],['Movies']),[]);
});
test('exploring a returned theme requests unseen alternatives without persisting exclusions',async()=>{
 const old={id:'old-place',name:'Existing place',section:'Eat',types:['urn:entity:place'],detail:''} as Card;
 const theme='urn:tag:genre:place:gallery';
 const session=normalizeSession({id:'fixture',revision:0,expires:Date.now()+60000,city:'London',selected:[],tags:[],constraints:[],categoryConstraints:{Eat:[]},cards:[old],previous:[],feedback:[],notices:[],activeCategories:['Eat']});
 const unused=async():Promise<never>=>{throw Error('Unexpected tool call');};
 const deps:AgentDependencies={tools:unused,workflow:unused,discover:async(state,section,_constraints,excluded)=>{
  assert.equal(section,'Eat');
  assert.ok(excluded.includes(old.id));
  assert.deepEqual(state.queryPreferences?.Eat?.inspirationTags,[theme]);
  return [{...old,id:'new-place',name:'New gallery cafe'}];
 }};
 const result=await runTurn(session,{discovery:{sections:['Eat'],preferences:{inspirationTags:[theme],inspirationName:'Gallery evenings'},preferNew:true}},deps);
 assert.deepEqual(result.changed,['Eat']);
 assert.deepEqual(result.state.cards.map(card=>card.id),['new-place']);
 assert.equal(result.state.queryPreferences?.Eat?.excludeEntities,undefined);
});
test('a theme can apply when the verified match is an existing place',async()=>{
 const existing={id:'old-place',name:'Existing place',section:'Eat',types:['urn:entity:place'],detail:''} as Card;
 const theme='urn:tag:genre:place:gallery';
 const session=normalizeSession({id:'fixture',revision:0,expires:Date.now()+60000,city:'London',selected:[],tags:[],constraints:[],categoryConstraints:{Eat:[]},cards:[existing],previous:[],feedback:[],notices:[],activeCategories:['Eat']});
 const unused=async():Promise<never>=>{throw Error('Unexpected tool call');};
 const deps:AgentDependencies={tools:unused,workflow:unused,discover:async(state,_section,_constraints,excluded)=>{
  assert.ok(!excluded.includes(existing.id));
  assert.deepEqual(state.queryPreferences?.Eat?.inspirationTags,[theme]);
  return [existing];
 }};
 const result=await runTurn(session,{discovery:{sections:['Eat'],preferences:{inspirationTags:[theme],inspirationName:'Gallery evenings'}}},deps);
 assert.deepEqual(result.changed,['Eat']);
 assert.deepEqual(result.state.queryPreferences?.Eat?.inspirationTags,[theme]);
});
