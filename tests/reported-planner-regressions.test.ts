import test from 'node:test';
import assert from 'node:assert/strict';
import {activityMatches,suggestedOutingChoice} from '../src/passport/day-out.ts';
import {distinctIntroductions} from '../src/passport/common-ground.ts';
import {normalizeSession} from '../src/agent/session.ts';
import {runTurn} from '../src/agent/orchestrator.ts';
import type {Card} from '../src/passport/model.ts';
function card(id:string,name:string,section:Card['section']='Eat',latitude=51.51):Card {
 return {id,name,section,types:['urn:entity:place'],detail:'',evidence:{source:'Qloo',operation:'/v2/insights/',queryId:'fixture',recordedAt:'2026-10-27',destination:'London',locality:'physical-city',mode:'familiar',pool:'direct',inputs:[],params:{},result:{id,type:'urn:entity:place',tags:[{id:'urn:tag:genre:place:'+section,name:section==='Coffee'?'Coffee shop':'Restaurant'}]}},intelligence:{location:{latitude,longitude:-.12},commercial:{priceLevel:1},quality:{}} as Card['intelligence']};
}
test('personal introductions exclude the same venue name under different returned IDs',()=>{
 const a=card('one','The Thames Indian Restaurant'),b=card('two','The Thames Indian Restaurant'),c=card('three','Another Restaurant');
 const result=distinctIntroductions([{cards:[a]},{cards:[b,c]}]);
 assert.equal(result[1].card?.id,'three');
 assert.equal(distinctIntroductions([{cards:[a]},{cards:[b]}])[1].card,undefined);
});
test('coffee stops require café evidence and avoid distant automatic choices while keeping alternatives available',()=>{
 assert.equal(activityMatches(card('wrong','Imperial Restaurant & Bar','Coffee'),'Coffee'),false);
 assert.equal(activityMatches(card('cafe','Imperial Café','Coffee'),'Coffee'),true);
 const food=card('anchor','Food'),far=card('far','Far Café','Coffee',51.58),near=card('near','Near Café','Coffee',51.511);
 assert.equal(suggestedOutingChoice([far,near],food)?.id,'near');
 assert.equal(suggestedOutingChoice([far],food),undefined);
 assert.equal(suggestedOutingChoice([far]),far);
});
test('repeated affordable Indian Food refresh preserves Music, Movies and confirmed interests',async()=>{
 const indian={id:'urn:tag:cuisine:place:indian',name:'Indian',types:['urn:tag'],detail:''};
 let state=normalizeSession({id:'refresh-fixture',revision:1,expires:Date.now()+60000,city:'London',selected:[{id:'artist',name:'A.R. Rahman',types:['urn:entity:artist'],detail:''}],tags:[indian],categoryTags:{Eat:[indian.id]},categoryConcepts:{Eat:['Indian']},queryPreferences:{Eat:{priceMax:2}},constraints:[],categoryConstraints:{},cards:[card('old','Old Food'),card('music','Artist','Music'),card('movie','Film','Movies')],previous:[],feedback:[],notices:[],activeCategories:['Eat','Music','Movies']});
 for(let i=0;i<2;i++){
  const before=structuredClone(state);
  const reply=await runTurn(state,{message:'Refresh only affordable Indian Food. Keep Music, Movies and confirmed interests unchanged.'},{tools:async()=>[],workflow:async()=>({status:'ok',results:[]}),provider:{interpret:async()=>({kind:'refine',sections:['Eat'],concepts:['Indian'],seeds:[],constraints:['expensive'],query:{priceMax:2},strategy:'discover'}),choose:async()=>[]},discover:async(next,section)=>{
   assert.equal(section,'Eat');assert.equal(next.queryPreferences?.Eat?.priceMax,2);return [card('new-'+i,'Affordable Indian Food')];
  }});
  assert.deepEqual(reply.changed,['Eat']);
  assert.deepEqual(reply.state.selected,before.selected);
  for(const section of ['Music','Movies'])assert.deepEqual(reply.state.cards.filter(c=>c.section===section),before.cards.filter(c=>c.section===section));
  state=reply.state;
 }
});
