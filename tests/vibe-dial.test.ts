import test from 'node:test';
import assert from 'node:assert/strict';
import {vibeDirections} from '../src/passport/vibe-dial.ts';
import type {Card} from '../src/passport/model.ts';
const artist={id:'artist',name:'Confirmed artist',types:['urn:entity:artist'],detail:''};
const film={id:'film',name:'Confirmed movie',types:['urn:entity:movie'],detail:''};
const tags=[{id:'urn:tag:genre:music:jazz',name:'Jazz'},{id:'urn:tag:style:qloo:narrative',name:'Narratively Complex'},{id:'urn:tag:genre:place:restaurant',name:'Restaurant'}];
const card={id:'returned',section:'Music',evidence:{result:{id:'returned',tags}}} as Card;
test('Vibe Dial uses returned themes and targets only active relevant domains',()=>{
 const choices=vibeDirections([card],[artist,film],['Music','Movies']);
 assert.deepEqual(choices.map(choice=>choice.sections),[['Music'],['Movies']]);
 assert.ok(choices.every(choice=>tags.some(tag=>tag.id===choice.theme.id)));
 assert.ok(choices.length<=3);
});
test('Vibe Dial skips unsupported choices rather than inventing a quiz',()=>{
 assert.deepEqual(vibeDirections([], [artist],['Music']),[]);
 assert.deepEqual(vibeDirections([{...card,id:'forged'}], [artist],['Music']),[]);
 assert.deepEqual(vibeDirections([card], [artist],['Movies']),[]);
});
