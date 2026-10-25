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
