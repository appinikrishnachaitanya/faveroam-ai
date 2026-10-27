import test from 'node:test';
import assert from 'node:assert/strict';
import {ritualFromSession,ritualContext,ritualReplacementState,type Ritual} from '../src/account/rituals.ts';
import {ritualHandler} from '../src/account/ritual-handler.ts';
import {normalizeSession} from '../src/agent/session.ts';
import type {Card} from '../src/passport/model.ts';
const owner='11111111-1111-4111-8111-111111111111',ritualId='22222222-2222-4222-8222-222222222222',proposalId='33333333-3333-4333-8333-333333333333';
const place=(id:string):Card=>({id,name:id,section:'Coffee',types:['urn:entity:place'],detail:'',evidence:{source:'Qloo',operation:'/v2/insights/',queryId:'fixture',recordedAt:'2026-10-26T00:00:00Z',destination:'London',locality:'physical-city',mode:'familiar',pool:'direct',inputs:[],params:{},result:{id,type:'urn:entity:place',tags:[]}}});
function state(){return normalizeSession({id:owner,revision:2,expires:Date.now()+600000,city:'London',cards:[place('original'),place('unsaved')],savedCards:[place('original')],selected:[{id:'confirmed',name:'Confirmed artist',types:['urn:entity:artist'],detail:''}],tags:[],constraints:[],categoryConstraints:{Coffee:['mainstream']},queryPreferences:{Coffee:{priceMax:2}},feedback:[],notices:[],previous:[]});}
const input={revision:2,cardId:'original',name:'Saturday coffee',weekday:6,recurrence:'weekly',status:'planned'};
test('rituals require a verified current entity, valid recurrence and revision and never save history or identity',()=>{
 const s=state(),value=ritualFromSession(s,input);assert.equal(value.card.id,'original');
 assert.ok(!('history'in value.context));assert.ok(!('id'in value.context));
 for(const patch of [{revision:1},{cardId:'invented'},{cardId:'unsaved'},{weekday:7},{name:'<script>'},{recurrence:'daily'}])assert.throws(()=>ritualFromSession(s,{...input,...patch}));
 s.feedback.push({id:'original',section:'Coffee',accepted:false});assert.throws(()=>ritualFromSession(s,input));
});
test('replacement retains saved interests and current geography, excludes rejected venues, and preserves the active Passport',()=>{
 const current=state(),context=ritualContext(current),before=structuredClone(current);
 current.queryPreferences!.Coffee!.locationPoint='-0.1,51.5';context.selected[0].id='saved-interest';
 const ritual={id:ritualId,city:'London',card:place('original')} as Ritual;
 const draft=ritualReplacementState(current,ritual,context);
 assert.equal(draft.selected[0].id,'saved-interest');assert.equal(draft.queryPreferences!.Coffee!.locationPoint,'-0.1,51.5');assert.ok(draft.feedback.some(f=>f.id==='original'&&!f.accepted));
 assert.deepEqual(current.cards,before.cards);assert.equal(current.feedback.length,0);assert.throws(()=>ritualReplacementState({...current,city:'Tokyo'},ritual,context));
});
/** In-memory protocol test double only; no external account or storage records. */
function database(){
 const rows:Record<string,Record<string,unknown>[]>= {saved_rituals:[],ritual_replacement_proposals:[]};
 function from(table:string){let action='read',payload:Record<string,unknown>|undefined,columns='*',head=false;const checks:((row:Record<string,unknown>)=>boolean)[]=[];
 const run=()=>{let matches=rows[table].filter(row=>checks.every(check=>check(row)));if(action==='insert'){const row={id:table==='saved_rituals'?ritualId:proposalId,created_at:'2026-10-26T00:00:00.000Z',updated_at:'2026-10-26T00:00:00.000Z',...structuredClone(payload)};rows[table].push(row);matches=[row];}if(action==='update')matches.forEach(row=>Object.assign(row,structuredClone(payload)));if(action==='delete')rows[table]=rows[table].filter(row=>!matches.includes(row));
 const projected=matches.map(row=>columns==='*'?structuredClone(row):Object.fromEntries(columns.split(',').map(key=>[key,row[key]])));return {data:head?null:projected,error:null,count:matches.length};};
 const q={select(c='*',options?:{head?:boolean}){columns=c;head=options?.head??false;return q;},eq(k:string,v:unknown){checks.push(row=>row[k]===v);return q;},gt(k:string,v:string){checks.push(row=>String(row[k])>v);return q;},order(){return q;},limit(){return q;},insert(v:Record<string,unknown>){payload=v;action='insert';return q;},upsert(v:Record<string,unknown>){payload=v;action='insert';return q;},update(v:Record<string,unknown>){payload=v;action='update';return q;},delete(){action='delete';return q;},async maybeSingle(){const result=run();return {...result,data:result.data?.[0]??null};},async single(){return q.maybeSingle();},then(resolve:(v:ReturnType<typeof run>)=>unknown,reject?:(v:unknown)=>unknown){return Promise.resolve(run()).then(resolve,reject);}};return q;}
 return {rows,from};
}
const req=(body:unknown,origin='https://app.example')=>new Request('https://app.example/api/account/rituals',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('ritual CRUD, replacement consent, ownership, expiry and stale writes are enforced by the server',async()=>{
 const db=database(),s=state();let calls=0;let identity:string|undefined=owner;
 const deps={identity:async()=>identity?{id:identity}:undefined,writer:()=>db,loadSession:async()=>s,discoverSection:async()=>{calls++;return [place('alternative'),place('original')];}} as unknown as NonNullable<Parameters<typeof ritualHandler>[1]>;
 assert.equal((await ritualHandler(req({...input,action:'create',sessionId:owner},'https://evil.example'),deps)).status,403);
 identity=undefined;assert.equal((await ritualHandler(req({...input,action:'create',sessionId:owner}),deps)).status,401);identity=owner;
 const created=await ritualHandler(req({...input,action:'create',sessionId:owner}),deps);assert.equal(created.status,200);let ritual=(await created.json()).ritual;assert.equal(ritual.context,undefined);
 identity='someone-else';assert.equal((await ritualHandler(req({action:'delete',id:ritualId,updatedAt:ritual.updated_at}),deps)).status,404);identity=owner;
 const replace=await ritualHandler(req({action:'replace',id:ritualId,updatedAt:ritual.updated_at,sessionId:owner}),deps);assert.equal(replace.status,200);const proposal=await replace.json();assert.equal(calls,1);assert.deepEqual(proposal.alternatives.map((c:Card)=>c.id),['alternative']);assert.equal((db.rows.saved_rituals[0].card as Card).id,'original');
 const approve={action:'approve',id:ritualId,updatedAt:ritual.updated_at,proposalId,cardId:'invented'};
 assert.equal((await ritualHandler(req(approve),deps)).status,400);
 db.rows.ritual_replacement_proposals[0].expires_at='2000-01-01T00:00:00Z';assert.equal((await ritualHandler(req({...approve,cardId:'alternative'}),deps)).status,409);
 db.rows.ritual_replacement_proposals[0].expires_at='2099-01-01T00:00:00Z';
 const approved=await ritualHandler(req({...approve,cardId:'alternative'}),deps);assert.equal(approved.status,200);ritual=(await approved.json()).ritual;assert.equal(ritual.card.id,'alternative');assert.equal(db.rows.ritual_replacement_proposals.length,0);
 assert.equal((await ritualHandler(req({...input,action:'update',id:ritualId,updatedAt:'stale'}),deps)).status,409);
 const kept=await ritualHandler(req({...input,action:'update',id:ritualId,updatedAt:ritual.updated_at,status:'kept'}),deps);assert.equal(kept.status,200);ritual=(await kept.json()).ritual;assert.equal(ritual.status,'kept');
 assert.equal((await ritualHandler(req({action:'delete',id:ritualId,updatedAt:ritual.updated_at}),deps)).status,200);assert.equal(db.rows.saved_rituals.length,0);assert.deepEqual(s.cards,[place('original'),place('unsaved')]);
});
