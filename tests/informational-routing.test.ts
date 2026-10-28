import {withEvidence} from '../src/passport/evidence.ts';
import test from 'node:test';import assert from 'node:assert/strict';
import {runTurn} from '../src/agent/orchestrator.ts';
import {normalizeSession} from '../src/agent/session.ts';
import {routeRequest} from '../src/agent/request-policy.ts';
const initial=()=>normalizeSession({id:'fixture',revision:0,expires:Date.now()+60000,city:'London',selected:[],tags:[],constraints:[],categoryConstraints:{Eat:['crowded']},queryPreferences:{Eat:{priceMax:2,locationQuery:'Soho'},Coffee:{businessRatingMin:4.5}},cards:withEvidence([{id:'lower',name:'Other Restaurant',section:'Eat',types:['urn:entity:place'],detail:''},{id:'top',name:'Chettinad Restaurant',section:'Eat',types:['urn:entity:place'],detail:''}],[{entity_id:'lower',name:'Other Restaurant',type:'urn:entity:place',properties:{business_rating:4.1}},{entity_id:'top',name:'Chettinad Restaurant',type:'urn:entity:place',properties:{business_rating:4.59}}],{},[],'London'),previous:[],feedback:[],notices:[],activeCategories:['Eat','Coffee'],history:[{role:'agent',text:'Choices',recommendationIds:['lower','top']} ]});
test('informational follow-ups use current facts with zero model or retrieval calls, even when repeated',async()=>{
 let state=initial();const forbidden=async():Promise<never>=>{assert.fail('Informational request called an external service');};
 for(const message of ['What filters are saved?','Which option has the highest rating?','What preferences are active?','Which option has the highest rating?']){
   const before=structuredClone(state);assert.equal(routeRequest({message}),'current-results');
   const reply=await runTurn(state,{message},{provider:{interpret:forbidden,choose:forbidden,compose:forbidden},tools:forbidden,workflow:forbidden,discover:forbidden});
   assert.deepEqual(reply.changed,[]);assert.deepEqual(reply.state.cards,before.cards);assert.deepEqual(reply.state.queryPreferences,before.queryPreferences);assert.deepEqual(reply.state.categoryConstraints,before.categoryConstraints);
   if(message.includes('rating')){assert.match(reply.message,/Chettinad Restaurant/);assert.match(reply.message,/4\.59/);}else{assert.match(reply.message,/Soho/);assert.match(reply.message,/4\.5/);}
   state=reply.state;
 }
});
test('actual preference changes and compound requests still reach interpretation',()=>{
 for(const message of ['Set my food rating to 4.5','Change my filters','Which option has the highest rating? Find new restaurants instead.'])assert.equal(routeRequest({message}),'interpret',message);
});
