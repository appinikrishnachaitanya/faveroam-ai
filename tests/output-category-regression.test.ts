import test from 'node:test';
import assert from 'node:assert/strict';
import { runTurn, type AgentDependencies } from '../src/agent/orchestrator.ts';
import {normalizeSession} from '../src/agent/session.ts';
import {isOutputCategoryConcept} from '../src/agent/output-category.ts';
import {groundedModelIntent} from '../src/agent/conversation-grounding.ts';
import {interpret} from '../src/agent/intent.ts';
import type {Intent} from '../src/agent/types.ts';
const intent=(concepts:string[]):Intent=>({kind:'refine',sections:['Music'],concepts,seeds:[],constraints:[],strategy:'discover'});
const initial=()=>normalizeSession({id:'output-kind',revision:0,expires:Date.now()+60000,city:'London',selected:[],tags:[],constraints:[],categoryConstraints:{},cards:[{id:'food',name:'Fixture restaurant',section:'Eat',types:['urn:entity:place'],detail:''}],previous:[],feedback:[],notices:[],activeCategories:['Eat','Music']});
const dependencies=():AgentDependencies=>({provider:{interpret:async()=>intent(['songs']),choose:async()=>{throw Error('No taxonomy selection for output kinds');}},tools:async()=>{throw Error('No taxonomy catalog for output kinds');},workflow:async()=>{throw Error('No taxonomy lookup for output kinds');},discover:async(_state,section)=>[{id:'artist',name:'Fixture artist',section,types:['urn:entity:artist'],detail:''}]});
test('generic content requests use output types while substantive genres remain concepts',()=>{
 for(const concept of ['songs','music','listen to songs','songs to listen to','play some music'])assert.equal(isOutputCategoryConcept(concept,['Music']),true,concept);
 for(const concept of ['jazz songs','Tamil music','Indian classical','soundtrack','A. R. Rahman'])assert.equal(isOutputCategoryConcept(concept,['Music']),false,concept);
 assert.equal(isOutputCategoryConcept('movies to watch',['Movies']),true);
 assert.equal(isOutputCategoryConcept('science fiction films',['Movies']),false);
 assert.equal(isOutputCategoryConcept('podcasts',['Podcasts']),true);
 assert.equal(isOutputCategoryConcept('show',['Shows']),true);
 assert.deepEqual(groundedModelIntent('I want to listen songs',intent(['songs'])).concepts,[]);
 assert.deepEqual(groundedModelIntent('I want jazz songs',intent(['jazz songs'])).concepts,['jazz songs']);
});
test('song requests complete repeatedly without lookup or picking and preserve Food',async()=>{
 let state=initial();
 for(const message of ['i want to listen songs','i want to listen songs','play some music','listen to songs']){
  const reply=await runTurn(state,{message},dependencies());
  assert.equal(reply.state.pending,undefined,message);
  assert.deepEqual(reply.changed,['Music']);
  assert.equal(reply.state.cards.find(card=>card.section==='Eat')?.id,'food');
  assert.ok(reply.state.cards.some(card=>card.section==='Music'));
  assert.doesNotMatch(reply.message,/choose the concept|pick a|temporarily unavailable/i);
  state=reply.state;
 }
});
test('an already pending songs picker is superseded even by the exact same message',async()=>{
 const state=initial();state.pending={query:'songs',request:'i want to listen songs',sections:['Music'],constraints:[],candidates:[{id:'urn:tag:genre:music:songs',name:'Songs',types:['urn:tag'],detail:''}]};
 state.categoryConcepts.Music=['songs'];
 const reply=await runTurn(state,{message:'i want to listen songs'},dependencies());
 assert.equal(reply.state.pending,undefined);
 assert.deepEqual(reply.changed,['Music']);
 assert.deepEqual(reply.state.categoryConcepts.Music,[]);
});
test('clicking an old generic songs choice recovers without installing that restrictive tag',async()=>{
 const state=initial();const id='urn:tag:genre:music:songs';
 state.pending={query:'songs',request:'i want to listen songs',sections:['Music'],constraints:[],candidates:[{id,name:'Songs',types:['urn:tag'],detail:''}]};
 const reply=await runTurn(state,{tagChoice:id},dependencies());
 assert.equal(reply.state.pending,undefined);
 assert.deepEqual(reply.changed,['Music']);
 assert.ok(!reply.state.categoryTags.Music?.includes(id));
});
test('existing generic category filters are cleared while a real music genre remains',async()=>{
 const state=initial();
 state.tags=[{id:'urn:tag:genre:music:songs',name:'Songs',types:['urn:tag'],detail:''},{id:'urn:tag:genre:music:jazz',name:'Jazz',types:['urn:tag'],detail:''}];
 state.categoryTags.Music=state.tags.map(tag=>tag.id);
 state.queryPreferences={Music:{includeTags:state.tags.map(tag=>tag.id)}};
 const reply=await runTurn(state,{message:'i want to listen songs'},dependencies());
 assert.equal(reply.state.pending,undefined);
 assert.deepEqual(reply.state.categoryTags.Music,['urn:tag:genre:music:jazz']);
 assert.deepEqual(reply.state.queryPreferences?.Music?.includeTags,['urn:tag:genre:music:jazz']);
});
test('deterministic fallback understands common song/listening wording',()=>{
 for(const message of ['i want to listen songs','play some songs','listen to music','recommend some tracks']){
  const value=interpret(message);assert.equal(value.kind,'refine',message);assert.deepEqual(value.sections,['Music'],message);
 }
});
