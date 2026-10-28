import test from 'node:test';
import assert from 'node:assert/strict';
import {runTurn, type AgentDependencies} from '../src/agent/orchestrator.ts';
import {normalizeSession} from '../src/agent/session.ts';
import type {Card} from '../src/passport/model.ts';

const indian={id:'urn:tag:cuisine:qloo:indian',name:'Indian',types:['urn:tag:cuisine'],detail:'Returned Qloo cuisine'};
const quiet={id:'urn:tag:ambience:place:quiet',name:'Quiet atmosphere'};
const state=()=>normalizeSession({id:'confirmed-choice',revision:0,expires:Date.now()+60_000,city:'London',selected:[],tags:[],constraints:[],categoryConstraints:{},cards:[],previous:[],feedback:[],notices:[],activeCategories:['Eat']});

for(const remainingConcepts of [[],['quiet atmosphere']]){
 test(`confirming Indian consumes the choice once with ${remainingConcepts.length} remaining concepts`,async()=>{
  const initial=state();
  initial.pending={query:'Indian',request:'Find quiet Indian restaurants',sections:['Eat'],conceptSections:['Eat'],constraints:remainingConcepts.length?['crowded']:[],candidates:[indian],remainingConcepts};
  const lookups:string[]=[];
  const dependencies:AgentDependencies={
   tools:async()=>{throw Error('Unexpected tool catalog');},
   workflow:async(_mode,_name,args)=>{
    lookups.push(String(args.query));
    if(args.query==='quiet atmosphere')return {status:'ok',results:[quiet]};
    throw Error(`Confirmed Indian was looked up again: ${String(args.query)}`);
   },
   discover:async()=>[{id:'returned-restaurant',name:'Returned restaurant',section:'Eat',types:['urn:entity:place'],detail:''} as Card],
  };
  const result=await runTurn(initial,{tagChoice:indian.id},dependencies);
  assert.equal(result.state.pending,undefined);
  assert.deepEqual(result.changed,['Eat']);
  assert.ok(result.state.categoryTags.Eat?.includes(indian.id));
  assert.deepEqual(lookups,remainingConcepts);
  assert.doesNotMatch(result.message,/choose the concept/i);
 });
}

test('a confirmed music concept also advances without asking for the same choice',async()=>{
 const initial=state();
 initial.activeCategories=['Music'];
 const fusion={id:'urn:tag:genre:music:sufi_fusion',name:'Sufi Fusion',types:['urn:tag:genre:music'],detail:'Returned Qloo genre'};
 initial.pending={query:'Sufi Fusion',request:'Find music like Sufi Fusion',sections:['Music'],conceptSections:['Music'],constraints:[],candidates:[fusion]};
 const dependencies:AgentDependencies={
  tools:async()=>{throw Error('Unexpected tool catalog');},
  workflow:async()=>{throw Error('Selected concept must not be looked up again');},
  discover:async()=>[{id:'returned-artist',name:'Returned artist',section:'Music',types:['urn:entity:artist'],detail:''} as Card],
 };
 const result=await runTurn(initial,{tagChoice:fusion.id},dependencies);
 assert.equal(result.state.pending,undefined);
 assert.deepEqual(result.changed,['Music']);
 assert.ok(result.state.categoryTags.Music?.includes(fusion.id));
});

test('a confirmed cuisine does not ask again for an equivalent remaining phrase',async()=>{
 const initial=state();
 initial.pending={query:'Indian',request:'Find Indian food',sections:['Eat'],conceptSections:['Eat'],constraints:[],candidates:[indian],remainingConcepts:['Indian food','Indian cuisine']};
 const lookups:string[]=[];
 const dependencies:AgentDependencies={
  tools:async()=>[],
  workflow:async(_mode,_name,args)=>{lookups.push(String(args.query));throw Error('Equivalent concept was looked up again');},
  discover:async()=>[{id:'returned-restaurant',name:'Returned restaurant',section:'Eat',types:['urn:entity:place'],detail:''} as Card],
 };
 const result=await runTurn(initial,{tagChoice:indian.id},dependencies);
 assert.equal(result.state.pending,undefined);
 assert.deepEqual(lookups,[]);
 assert.deepEqual(result.changed,['Eat']);
});

test('a distinct remaining concept is still resolved after the first choice',async()=>{
 const initial=state();
 initial.pending={query:'Indian',request:'Find Indian restaurants with outdoor seating',sections:['Eat'],conceptSections:['Eat'],constraints:[],candidates:[indian],remainingConcepts:['outdoor seating']};
 const lookups:string[]=[];
 const dependencies:AgentDependencies={
  tools:async()=>[],
  workflow:async(_mode,_name,args)=>{lookups.push(String(args.query));return {status:'ok',results:[{id:'urn:tag:amenity:place:outdoor_seating',name:'Outdoor seating'}]};},
  discover:async()=>[{id:'returned-restaurant',name:'Returned restaurant',section:'Eat',types:['urn:entity:place'],detail:''} as Card],
 };
 const result=await runTurn(initial,{tagChoice:indian.id},dependencies);
 assert.deepEqual(lookups,['outdoor seating']);
 assert.ok(result.state.pending || result.changed.includes('Eat'));
});

test('an unrelated tag containing the same letters does not satisfy a new concept',async()=>{
 const initial=state();
 initial.activeCategories=['Culture'];
 const museum={id:'urn:tag:genre:place:museum',name:'Museum',types:['urn:tag:genre:place'],detail:''};
 const cartoon={id:'urn:tag:genre:place:cartoon',name:'Cartoon',types:['urn:tag:genre:place'],detail:''};
 initial.tags=[cartoon];
 initial.categoryTags.Culture=[cartoon.id];
 initial.pending={query:'museum',request:'Find a museum and art',sections:['Culture'],conceptSections:['Culture'],constraints:[],candidates:[museum],remainingConcepts:['art']};
 const lookups:string[]=[];
 const dependencies:AgentDependencies={
  tools:async()=>[],
  workflow:async(_mode,_name,args)=>{lookups.push(String(args.query));return {status:'ok',results:[{id:'urn:tag:genre:place:art',name:'Art',types:['urn:tag:genre:place'],detail:''}]};},
  discover:async()=>[{id:'returned-gallery',name:'Returned gallery',section:'Culture',types:['urn:entity:place'],detail:''} as Card],
 };
 await runTurn(initial,{tagChoice:museum.id},dependencies);
 assert.deepEqual(lookups,['art']);
});
