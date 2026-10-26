import test from 'node:test';import assert from 'node:assert/strict';
import {buildQuery,patchPreferences,validatePreferences} from '../src/qloo/query-plan.ts';
test('theme exploration adds a soft taste signal while retaining explicit requirements',()=>{
 const cuisine='urn:tag:cuisine:place:indian',theme='urn:tag:genre:place:art_gallery';
 const previous={includeTags:[cuisine],priceMax:2,businessRatingMin:4.5,locationQuery:'Soho'};
 const preferences=patchPreferences(previous,{inspirationTags:[theme]});
 const query=buildQuery({outputType:'place',interests:{entities:[],tags:[cuisine]},preferences,take:20});
 assert.equal(query.params['filter.tags'],cuisine);assert.equal(query.params['filter.price_level.max'],'2');assert.equal(query.params['filter.properties.business_rating.min'],'4.5');assert.equal(query.params['filter.location.query'],'Soho');
 assert.ok(query.params['signal.interests.tags'].includes(theme));assert.ok(!query.params['filter.tags'].includes(theme));assert.deepEqual(previous.includeTags,[cuisine]);
});
test('theme signals must use resolved taxonomy identifiers',()=>{
 assert.throws(()=>validatePreferences({inspirationTags:['invented text']}));
 assert.deepEqual(validatePreferences({inspirationTags:[]}).inspirationTags,[]);
});
