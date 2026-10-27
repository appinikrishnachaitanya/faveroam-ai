import test from 'node:test';
import assert from 'node:assert/strict';
import {areaHighlights,nearbyReturnedPlaces} from '../src/passport/nearby.ts';
import type {Card} from '../src/passport/model.ts';

const place=(id:string,longitude:number,section:Card['section']='Eat',contribution=false):Card=>({
  id,name:id,detail:'',types:['urn:entity:place'],section,
  evidence:{source:'Qloo',operation:'/v2/insights/',queryId:id,recordedAt:'2026-10-27',destination:'London',locality:'physical-city',mode:'familiar',pool:'direct',inputs:[{id:'seed',name:'A film',types:['urn:entity:movie'],role:'entity-signal'}],params:{},result:{id,type:'urn:entity:place',tags:[]}},
  intelligence:{id,name:id,type:'urn:entity:place',location:{latitude:51.5,longitude},taste:{contributingSignals:contribution?[{id:'seed',contribution:.2}]:[]},quality:{},commercial:{},externalProof:{}}
} as Card);

test('nearby places use current coordinates only to order verified returned places, with evidence breaking near ties',()=>{
  const point={latitude:51.5,longitude:-.1};
  const cards=[place('far',-.13),place('near-plain',-.101),place('near-contribution',-.102,'Eat',true),{...place('unverified',-.1),evidence:undefined},place('movie',-.1,'Movies')];
  assert.deepEqual(nearbyReturnedPlaces(cards,point).map(row=>row.card.id),['near-contribution','near-plain','far']);
  assert.deepEqual(nearbyReturnedPlaces(cards,{latitude:91,longitude:0}),[]);
  assert.ok(nearbyReturnedPlaces(cards,{latitude:12.97,longitude:77.59})[0].distanceKm>100,'A location in India must not imply London places are nearby');
});

test('area highlights use only returned categories, counts and venue names',()=>{
  assert.deepEqual(areaHighlights([place('Food A',-.1),place('Food B',-.1),place('Museum',-.1,'Culture')]),[
    {section:'Eat',count:2,example:'Food A'},
    {section:'Culture',count:1,example:'Museum'},
  ]);
});
