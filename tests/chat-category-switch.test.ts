import test from 'node:test';
import assert from 'node:assert/strict';
import { runTurn, type AgentDependencies } from '../src/agent/orchestrator.ts';
import { normalizeSession } from '../src/agent/session.ts';
import { chatShortlist, requestedShortlistSections } from '../src/agent/chat-shortlist.ts';
import { listPassportCards } from '../src/agent/answers.ts';
import type { Card } from '../src/passport/model.ts';
const card=(id:string,section:Card['section']):Card=>({id,name:'Fixture '+id,section,types:['urn:entity:place'],detail:''});
const initial=()=>normalizeSession({id:'category-switch',revision:1,expires:Date.now()+60_000,city:'London',selected:[],tags:[],constraints:[],categoryConstraints:{},cards:[card('Coffee one','Coffee'),card('Coffee two','Coffee'),card('Coffee three','Coffee'),card('Restaurant','Eat'),card('Artist','Music'),card('Movie','Movies')],previous:[],feedback:[],notices:[],activeCategories:['Coffee','Eat','Music','Movies'],intent:{kind:'refine',sections:['Coffee'],seeds:[],concepts:[],constraints:[],strategy:'discover'},history:[{role:'agent',text:'Here are three coffee shops',recommendationIds:['Coffee one','Coffee two','Coffee three']}],conversationMemory:{version:1,focusSections:['Coffee'],lastPresentedIds:['Coffee one','Coffee two','Coffee three'],recentChanges:[],dismissedConcepts:[],lastPreservedSections:[]}});
const forbidden=async():Promise<never>=>{throw Error('No discovery for a current shortlist');};
const deps:AgentDependencies={tools:forbidden,workflow:forbidden,discover:forbidden,provider:{interpret:async()=>({kind:'unknown',question:'explanation',sections:['Coffee'],seeds:[],concepts:[],constraints:[],strategy:'discover'}),choose:forbidden,compose:async()=>{throw Error('Keep the grounded cards');}}};
test('a mixed-category request and its follow-up supersede the previous coffee focus',async()=>{
 let state=initial();
 for(const message of ['show me food, music and movie discoveries','give me one restaurant, one artist and one movie',"Don't focus on coffee. Can you give me three recommendations across food, music and movies? One restaurant, one artist and one movie, please."]){
   const reply=await runTurn(state,{message},deps);
   const ids=reply.state.history?.at(-1)?.recommendationIds;
   assert.deepEqual(ids,['Restaurant','Artist','Movie'],message);
   assert.deepEqual(reply.changed,[]);
   assert.deepEqual(reply.state.cards,state.cards);
   assert.doesNotMatch(reply.message,/Coffee one/);
   state=reply.state;
 }
});
test('explicit categories also ground an explanation when model context incorrectly repeats coffee',async()=>{
 const reply=await runTurn(initial(),{message:'Tell me about food, music and movie discoveries'},deps);
 assert.deepEqual(reply.state.history?.at(-1)?.recommendationIds,['Restaurant','Artist','Movie']);
 assert.doesNotMatch(reply.message,/Coffee one/);
});
test('explicit categories take precedence over across, and show is a verb rather than a TV category',()=>{
 assert.deepEqual(requestedShortlistSections('show three across food, music and movies'),['Eat','Music','Movies']);
 assert.deepEqual(requestedShortlistSections('show me food'),['Eat']);
 assert.deepEqual(listPassportCards(initial(),'list food music and movies').map(c=>c.section),['Eat','Music','Movies']);
});
test('missing requested categories do not get replaced with more coffee choices',()=>{
 const state=initial();state.cards=state.cards.filter(c=>c.section==='Coffee');
 assert.deepEqual(chatShortlist(state,['Coffee','Music','Movies']).map(c=>c.id),['Coffee one']);
});

test('compound artist explanation answers the taste question and the live-event limitation',async()=>{
 const state=initial();
 const composer=card('zimmer','Music');composer.name='Hans Zimmer';
 composer.evidence={source:'Qloo',operation:'/v2/insights/',queryId:'fixture',recordedAt:new Date().toISOString(),destination:'London',locality:'audience-context',mode:'balanced',pool:'profile',params:{},inputs:[{id:'confirmed-film',name:'Interstellar',role:'entity-signal',types:['urn:entity:movie']}],result:{id:'zimmer',type:'urn:entity:artist',tags:[]}};
 composer.intelligence={taste:{contributingSignals:[{id:'confirmed-film',contribution:.7}]}} as Card['intelligence'];
 state.cards.push(composer);
 const reply=await runTurn(state,{message:'Why Hans Zimmer, and is he playing tonight?'},{...deps,provider:{...deps.provider!,compose:async()=>({message:'Hans Zimmer connects to Interstellar.',evidenceIds:['zimmer'],recommendationIds:['zimmer']})}});
 assert.match(reply.message,/Interstellar/);
 assert.match(reply.message,/Live events are unverified/);
 assert.match(reply.message,/cannot confirm concerts/);
 assert.deepEqual(reply.state.history?.at(-1)?.recommendationIds,['zimmer']);
 assert.deepEqual(reply.changed,[]);
});
