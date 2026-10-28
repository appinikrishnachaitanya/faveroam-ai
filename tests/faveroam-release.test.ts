import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chooseExisting} from '../src/agent/existing-choice.ts';
import {normalizeSession} from '../src/agent/session.ts';
import {nearbySharedPlaces} from '../src/passport/common-ground.ts';
import {readShare,revokeShare} from '../src/share/links.ts';
import type {AgentState} from '../src/agent/types.ts';
import type {Card} from '../src/passport/model.ts';
const place=(id:string,longitude=0):Card=>({id,name:`Place ${id}`,section:'Eat',types:['urn:entity:place'],detail:'',intelligence:{location:{latitude:0,longitude}}} as Card);
test('comparisons follow visible IDs and explicit second/third positions',()=>{
 const state=normalizeSession({id:'fixture',city:'London',selected:[],tags:[],constraints:[],categoryConstraints:{},feedback:[],cards:[place('a'),place('b'),place('c')],notices:[],previous:[]} as unknown as AgentState);
 assert.deepEqual(chooseExisting(state,'Compare first and second visible discoveries',['c','a','b']).cards.map(card=>card.id),['c','a']);
 assert.deepEqual(chooseExisting(state,'Compare second and third visible discoveries',['c','a','b']).cards.map(card=>card.id),['a','b']);
 assert.deepEqual(chooseExisting(state,'Compare Place a and Place b',['c']).cards.map(card=>card.id),['a','b']);
});
test('shared-place radius uses actual coordinates and never includes unknown or distant places',()=>{
 const near=place('near',.01),far=place('far',.1),unknown={...place('unknown'),intelligence:undefined};
 assert.deepEqual(nearbySharedPlaces([near,far,unknown],place('anchor'),3000).map(card=>card.id),['near']);
 assert.deepEqual(nearbySharedPlaces([near,far],undefined,3000),[near,far]);
});
test('sharing queries enforce expiry, require revocation capability, and read again after deletion',async()=>{
 const oldFetch=globalThis.fetch;
 const env={SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY:process.env.SUPABASE_PUBLISHABLE_KEY,SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY};
 Object.assign(process.env,{SUPABASE_URL:'https://fixture.invalid',SUPABASE_PUBLISHABLE_KEY:'fixture-public',SUPABASE_SERVICE_ROLE_KEY:'fixture-server'});
 const token='a'.repeat(32),revoke='b'.repeat(32),hash=(value:string)=>createHash('sha256').update(value).digest('hex');
 const snapshot={version:1,city:'London',interests:[],themes:[],cards:[],createdAt:new Date().toISOString()};
 let exists=true,expired=false,reads=0;
 globalThis.fetch=async(input,init)=>{
   const url=new URL(input instanceof Request?input.url:String(input));
   assert.equal(url.searchParams.get('token_hash'),`eq.${hash(token)}`);
   if(init?.method==='DELETE'){
     if(url.searchParams.get('revoke_hash')!==`eq.${hash(revoke)}`)return Response.json([]);
     exists=false;return Response.json([{token_hash:hash(token)}]);
   }
   reads++;
   assert.match(url.searchParams.get('expires_at')??'',/^gt\./);
   assert.equal(init?.cache,'no-store');
   return Response.json(exists&&!expired?[{snapshot}]:[]);
 };
 try{
   assert.deepEqual(await readShare(token),snapshot);
   expired=true;assert.equal(await readShare(token),undefined);expired=false;
   assert.equal(await revokeShare(token,'c'.repeat(32)),false);
   assert.equal(await revokeShare(token,revoke),true);
   assert.equal(await readShare(token),undefined);
   assert.equal(reads,3);
 }finally{
   globalThis.fetch=oldFetch;
   for(const [key,value] of Object.entries(env)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 }
});
