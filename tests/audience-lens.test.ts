import test from 'node:test';
import assert from 'node:assert/strict';
import {buildQuery,patchPreferences,validateInsightParams,validatePreferences} from '../src/qloo/query-plan';
import {tasteEvidenceCoverage} from '../src/passport/taste-evidence-coverage';
import {withEvidence} from '../src/passport/evidence';

test('optional audience lens uses only documented values and can be cleared',()=>{
 const previous={priceMax:2,audienceAge:'30_to_34' as const};
 const query=buildQuery({outputType:'place',interests:{entities:[],tags:[]},preferences:previous});
 assert.equal(query.params['signal.demographics.age'],'30_to_34');
 assert.equal(query.params['filter.price_level.max'],'2');
 const cleared=buildQuery({outputType:'place',interests:{entities:[],tags:[]},preferences:patchPreferences(previous,{audienceAge:'all'})});
 assert.equal(cleared.params['signal.demographics.age'],undefined);
 assert.equal(cleared.params['filter.price_level.max'],'2');
 assert.throws(()=>validatePreferences({audienceAge:'17_to_24'}));
 assert.throws(()=>validateInsightParams({'filter.type':'urn:entity:place','signal.demographics.age':'17_to_24'}));
});

test('percentage counts only individual returned evidence for confirmed tastes',()=>{
 const card=withEvidence([{id:'place',name:'Place',types:['urn:entity:place'],detail:'',section:'Eat'}],
   [{entity_id:'place',name:'Place',type:'urn:entity:place',tags:[{id:'urn:tag:cuisine:place:indian',name:'Indian'}],query:{affinity:.9}}],
   {'filter.type':'urn:entity:place','signal.interests.entities':'11111111-1111-4111-8111-111111111111'},[], 'London')[0];
 const selected=[{id:'11111111-1111-4111-8111-111111111111'},{id:'urn:tag:cuisine:place:indian'}];
 assert.deepEqual(tasteEvidenceCoverage(card,selected),{count:1,total:2,percentage:50});
 assert.equal(tasteEvidenceCoverage(card,[selected[0]]),undefined);
 card.intelligence!.taste.contributingSignals=[{id:selected[0].id,contribution:.1}];
 assert.deepEqual(tasteEvidenceCoverage(card,selected),{count:2,total:2,percentage:100});
});
