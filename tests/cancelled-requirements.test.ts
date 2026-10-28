import test from 'node:test';import assert from 'node:assert/strict';
import {removeCancelledRequirements} from '../src/agent/cancelled-requirements.ts';
import {normalizeSession} from '../src/agent/session.ts';
import type {Intent} from '../src/agent/types.ts';
const cuisine={id:'urn:tag:cuisine:place:indian',name:'Indian cuisine',detail:'',types:['urn:tag']};
const dish={id:'urn:tag:specialty_dish:place:biryani',name:'Chicken biryani',detail:'',types:['urn:tag']};
test('cancelled requirements are removed from concepts and active tag filters, without excluding the cuisine',()=>{
 const state=normalizeSession({id:'test',revision:0,expires:Date.now()+10000,city:'London',selected:[],tags:[cuisine,dish],constraints:[],categoryConstraints:{},categoryTags:{Eat:[cuisine.id,dish.id],Music:['music']},categoryConcepts:{Eat:['Indian cuisine','Chicken biryani']},queryPreferences:{Eat:{includeTags:[cuisine.id,dish.id]}},cards:[],previous:[],feedback:[],notices:[]});
 const intent:Intent={kind:'refine',sections:['Eat'],concepts:['Chicken biryani'],seeds:[],constraints:[],excludeConcepts:['chicken'],strategy:'discover'};
 removeCancelledRequirements(state,intent,"I don't need chicken. I only want somewhere peaceful",['Eat']);
 assert.deepEqual(state.categoryTags!.Eat,[]);assert.deepEqual(state.queryPreferences!.Eat!.includeTags,[]);assert.deepEqual(state.categoryConcepts!.Eat,[]);assert.deepEqual(intent.concepts,[]);assert.deepEqual(intent.excludeConcepts,[]);assert.deepEqual(state.categoryTags!.Music,['music']);
});
test('cancelling one cuisine preserves unrelated atmosphere tags',()=>{
 const quiet={id:'urn:tag:ambience:place:quiet',name:'Quiet',detail:'',types:['urn:tag']};
 const state=normalizeSession({id:'test',revision:0,expires:Date.now()+10000,city:'London',selected:[],tags:[cuisine,quiet],constraints:[],categoryConstraints:{},categoryTags:{Eat:[cuisine.id,quiet.id]},categoryConcepts:{Eat:['Indian cuisine','Quiet']},cards:[],previous:[],feedback:[],notices:[]});
 const intent:Intent={kind:'refine',sections:['Eat'],concepts:[],seeds:[],constraints:[],strategy:'discover'};
 removeCancelledRequirements(state,intent,'Remove Indian cuisine',['Eat']);assert.deepEqual(state.categoryTags!.Eat,[quiet.id]);assert.deepEqual(state.categoryConcepts!.Eat,['Quiet']);
});

test('exact removal request bypasses optional model calls and does not restore cuisine on an empty search',async()=>{
 const {runTurn}=await import('../src/agent/orchestrator.ts');
 const chinese={...cuisine,id:'urn:tag:cuisine:place:chinese',name:'Chinese cuisine'};
 const quiet={id:'urn:tag:ambience:place:quiet',name:'Quiet atmosphere',detail:'',types:['urn:tag']};
 const state=normalizeSession({id:'test',revision:0,expires:Date.now()+10000,city:'London',selected:[],tags:[chinese,quiet],constraints:[],categoryConstraints:{},categoryTags:{Eat:[chinese.id]},categoryConcepts:{Eat:['Chinese cuisine']},queryPreferences:{Eat:{includeTags:[chinese.id]}},cards:[{id:'old',name:'Old Chinese result',section:'Eat',types:['urn:entity:place'],detail:''}],previous:[],feedback:[],notices:[],activeCategories:['Eat']});
 let searches=0;
 const forbidden=async():Promise<never>=>{throw Error('Model must not be called for explicit removal');};
 const reply=await runTurn(state,{message:'Remove Chinese cuisine completely. Find peaceful restaurants only.'},{provider:{interpret:forbidden,choose:forbidden,compose:forbidden},tools:async()=>[],workflow:async()=>({status:'ok',results:[quiet]}),discover:async current=>{searches++;assert.ok(!current.categoryTags!.Eat!.includes(chinese.id));assert.ok(!current.queryPreferences!.Eat!.includeTags!.includes(chinese.id));return [];}});
 assert.ok(searches>0);assert.ok(!reply.state.categoryTags!.Eat!.includes(chinese.id));assert.ok(!reply.state.queryPreferences!.Eat!.includeTags!.includes(chinese.id));assert.equal(reply.state.pending,undefined);
});
