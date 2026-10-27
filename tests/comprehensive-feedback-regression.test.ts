import test from 'node:test';
import assert from 'node:assert/strict';
import {accidentalKeystrokes,tasteInputFeedback} from '../src/agent/conversation-grounding.ts';
import {runTurn} from '../src/agent/orchestrator.ts';
import {normalizeSession} from '../src/agent/session.ts';

test('valid acronym artists and numeric titles reach cultural resolution',()=>{
  for(const input of ['MGMT','BTS','1984','1917']) {
    assert.equal(accidentalKeystrokes(input),false,input);
    assert.equal(tasteInputFeedback(input),undefined,input);
  }
  assert.equal(accidentalKeystrokes('asdfghjkl'),true);
});

test('cheaper starts at moderate, tightens to lowest and preserves unrelated cards',async()=>{
  let state=normalizeSession({id:'fixture',revision:0,expires:Date.now()+60000,city:'London',selected:[],tags:[],constraints:[],categoryConstraints:{},cards:[{id:'music',name:'Music',section:'Music',types:['urn:entity:artist'],detail:''}],previous:[],feedback:[],notices:[],activeCategories:['Eat','Music']});
  const caps:number[]=[];
  for(const expected of [2,1,1]) {
    const reply=await runTurn(state,{message:'Find cheaper food'},{tools:async()=>[],workflow:async()=>({status:'ok',results:[]}),discover:async(s,section)=>{
      assert.equal(section,'Eat');caps.push(s.queryPreferences!.Eat!.priceMax!);
      return [{id:'food',name:'Food',section:'Eat',types:['urn:entity:place'],detail:''}];
    }});
    state=reply.state;
    assert.equal(state.queryPreferences!.Eat!.priceMax,expected);
    assert.ok(state.cards.some(card=>card.id==='music'));
  }
  assert.deepEqual(caps,[2,1,1]);
});

test('Too expensive feedback lowers the rejected moderate venue ceiling and preserves Music',async()=>{
 const state=normalizeSession({id:'fixture',revision:0,expires:Date.now()+60000,city:'London',selected:[],tags:[],constraints:[],categoryConstraints:{},queryPreferences:{Eat:{priceMin:2,priceMax:4}},cards:[{id:'moderate',name:'Moderate restaurant',section:'Eat',types:['urn:entity:place'],detail:'',intelligence:{commercial:{priceLevel:2}} as import('../src/qloo/normalizer.ts').TasteResult},{id:'music',name:'Music',section:'Music',types:['urn:entity:artist'],detail:''}],previous:[],feedback:[],notices:[],activeCategories:['Eat','Music']});
 const reply=await runTurn(state,{feedback:{id:'moderate',accepted:false,reason:'Too expensive'}},{tools:async()=>[],workflow:async()=>({status:'ok',results:[]}),discover:async(s,section)=>{
  assert.equal(section,'Eat');assert.equal(s.queryPreferences!.Eat!.priceMax,1);assert.equal(s.queryPreferences!.Eat!.priceMin,undefined);
  return [];
 }});
 assert.equal(reply.state.failedSearches!.Eat!.queryPreferences?.priceMax,1);
 assert.ok(reply.state.cards.some(card=>card.id==='music'));
 assert.ok(!reply.state.cards.some(card=>card.id==='moderate'));
});
