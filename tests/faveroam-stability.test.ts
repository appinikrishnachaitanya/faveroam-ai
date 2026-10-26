import test from 'node:test';
import assert from 'node:assert/strict';
import {constraintsFrom} from '../src/agent/intent.ts';
import {validatedSection} from '../src/agent/validation.ts';
import {classify} from '../src/passport/model.ts';
import {firstWeekIcs} from '../src/passport/first-week.ts';

test('independent and quiet cafe requirements survive as explicit constraints',()=>{
 const constraints=constraintsFrom('Find three quieter independent cafés. Keep movies unchanged.');
 assert.ok(constraints.includes('mainstream'));
 assert.ok(constraints.includes('crowded'));
});
test('cinema taxonomy outranks its incidental coffee amenity',()=>{
 const entity={entity_id:'fixture',name:'Picturehouse',tags:[{name:'Coffee shop',type:'urn:tag:genre:place'},{name:'Movie theater',type:'urn:tag:genre:place'}]};
 assert.equal(classify(entity),'Culture');
 assert.equal(validatedSection(entity),'Culture');
});
test('calendar export rejects impossible dates before writing an event',()=>{
 assert.throws(()=>firstWeekIcs([{title:'Invalid',date:'2026-02-30',stops:[]}],'Europe/London'));
});
