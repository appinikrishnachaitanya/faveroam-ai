import test from 'node:test';import assert from 'node:assert/strict';
import {audienceContext} from '../src/passport/audience-context';
test('audience summaries preserve ties and never convert raw scores to personal match percentages',()=>{
 const result=audienceContext([{id:'artist',age:{'24_and_younger':0.64,'25_to_29':0.64,'35_to_44':0.1,unknown:100},gender:{}}],[{id:'artist',name:'Artist'}]);
 assert.deepEqual(result,[{id:'artist',name:'Artist',bands:['24 or younger','25–29']}]);
});
test('missing, invalid and unrelated demographics remain explicitly unavailable',()=>{
 const result=audienceContext([{id:'other',age:{'25_to_29':0.9},gender:{}}],[{id:'known',name:'Known'},{id:'urn:tag:cuisine:place:indian',name:'Indian'}]);assert.deepEqual(result,[{id:'known',name:'Known',bands:[]},{id:'urn:tag:cuisine:place:indian',name:'Indian',bands:[]}]);
 assert.deepEqual(audienceContext([{id:'known',age:{'25_to_29':NaN,'35_to_44':-1,'55_and_older':0},gender:{}}],[{id:'known',name:'Known'}])[0].bands,[]);
});
