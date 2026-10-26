import test from 'node:test';
import assert from 'node:assert/strict';
import {updateWeekStop,type WeekDay} from '../src/passport/first-week.ts';
import type {Card} from '../src/passport/model.ts';
const place=(id:string):Card=>({id,name:id,section:'Eat',types:['urn:entity:place'],detail:'',evidence:{result:{id,tags:[{id:'urn:tag:genre:place:restaurant',name:'Restaurant'}]}}} as Card);
const week=():WeekDay[]=>[{title:'Start',date:'2026-10-27',stops:[{activity:'Eat',time:'10:00',card:place('first')},{activity:'Eat',time:'14:00',card:place('second')}]}];
test('editing one stop preserves locked neighbours and the original undo snapshot',()=>{
 const original=week();original[0].stops[1].locked=true;
 const next=updateWeekStop(original,0,0,{card:place('replacement')});
 assert.equal(next[0].stops[0].card?.id,'replacement');
 assert.equal(next[0].stops[1],original[0].stops[1]);
 assert.equal(original[0].stops[0].card?.id,'first');
 assert.throws(()=>updateWeekStop(next,0,1,{time:'15:00'}),/Unlock/);
});
test('removal leaves an open slot and rejects duplicate venues or invalid edits',()=>{
 const original=week();
 assert.equal(updateWeekStop(original,0,0,{card:undefined})[0].stops[0].card,undefined);
 assert.throws(()=>updateWeekStop(original,0,0,{card:place('second')}),/already/);
 assert.throws(()=>updateWeekStop(original,0,0,{time:'25:00'}),/valid time/);
 const open=updateWeekStop(original,0,0,{card:undefined});
 assert.throws(()=>updateWeekStop(open,0,0,{locked:true}),/Choose a place/);
});
