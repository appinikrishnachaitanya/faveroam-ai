import test from 'node:test';
import assert from 'node:assert/strict';
import {clusterPlaces,geographicDistance} from '../src/passport/place-clusters.ts';
import type {Card} from '../src/passport/model.ts';
const place=(id:string,lat=51.5,lon=-0.1)=>({id,name:id,section:'Eat',types:['urn:entity:place'],detail:'',evidence:{source:'Qloo',inputs:[],result:{id}},intelligence:{location:{latitude:lat,longitude:lon}}}) as unknown as Card;
test('DBSCAN forms stable clusters, deduplicates IDs, omits noise, and uses a real medoid',()=>{
 const cards=[place('a'),place('b',51.501),place('c',51.502),place('d',51.6),place('e',51.601),place('noise',52)];
 const clusters=clusterPlaces([...cards,cards[0]]);
 assert.equal(clusters.length,2);assert.equal(clusters[0].cards.length,3);assert.equal(clusters[0].anchor.id,'b');
 assert.deepEqual(clusterPlaces([...cards].reverse()),clusterPlaces(cards));
 assert.ok(clusters.every(c=>c.cards.some(v=>v.id===c.anchor.id)));
});
test('invalid coordinates, content entities, unverified cards and insufficient points produce no areas',()=>{
 const movie={...place('film'),section:'Movies'} as Card;
 assert.deepEqual(clusterPlaces([place('a'),place('bad',91),movie,{...place('unverified'),evidence:undefined}]),[]);
 assert.equal(geographicDistance({latitude:0,longitude:179.999},{latitude:0,longitude:-179.999})<300,true);
});
test('DBSCAN connects density-reachable venues and ranks at most three groups',()=>{
 const chain=[place('a',0,0),place('b',0,.009),place('c',0,.018)];
 assert.equal(clusterPlaces(chain,1100)[0].cards.length,3);
 const many=Array.from({length:5},(_,i)=>[place(`a${i}`,i,0),place(`b${i}`,i+.001,0)]).flat();
 assert.equal(clusterPlaces(many).length,3);
});
