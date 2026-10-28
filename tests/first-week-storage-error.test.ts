import test from 'node:test';
import assert from 'node:assert/strict';
import {firstWeekSaveHandler} from '../src/account/first-week-handler.ts';
import {normalizeSession} from '../src/agent/session.ts';
const id='11111111-1111-4111-8111-111111111111';
const request=()=>new Request('https://app.example/api/account/first-weeks',{method:'POST',headers:{origin:'https://app.example','Content-Type':'application/json'},body:JSON.stringify({sessionId:id,revision:1,startDate:'2099-01-01',days:[]})});
function deps(code:string){
 const query={select(){return query;},eq(){return query;},async maybeSingle(){return {data:null,error:{code}};}};
 return {identity:async()=>({id}),configured:()=>true,writer:()=>({from:()=>query}),loadSession:async()=>normalizeSession({id,revision:1,expires:Date.now()+60000,city:'London',selected:[],tags:[],constraints:[],categoryConstraints:{},cards:[],previous:[],feedback:[],notices:[]})} as unknown as NonNullable<Parameters<typeof firstWeekSaveHandler>[1]>;
}
test('missing First Week table is a storage setup failure, never a misleading stop-selection error',async()=>{
 for(const code of ['42P01','PGRST205','PGRST204']){const response=await firstWeekSaveHandler(request(),deps(code));assert.equal(response.status,503);const body=await response.json();assert.equal(body.code,"WEEK_STORAGE_NOT_READY");assert.doesNotMatch(body.error,/Choose your stops again/);}
});
test('database permission failures are distinct from invalid plan input',async()=>{
 const response=await firstWeekSaveHandler(request(),deps('42501'));assert.equal(response.status,502);assert.match((await response.json()).error,/selections remain/);
});
