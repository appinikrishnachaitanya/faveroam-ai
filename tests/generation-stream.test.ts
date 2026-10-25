import test from 'node:test';import assert from 'node:assert/strict';
import {generatePassport} from '../src/workspace/generation-browser.ts';
test('generation renders fragmented preview events before accepting the authoritative session',async()=>{
 const original=globalThis.fetch;const order:string[]=[];
 const passport={agent:{sessionId:'fixture',revision:0},cards:[{id:'one',name:'Café',section:'Eat'}]};
 const wire=[{type:'progress'},{type:'category',section:'Eat',cards:passport.cards},{type:'result',passport}].map(event=>JSON.stringify(event)+'\n').join('');
 const bytes=new TextEncoder().encode(wire);
 globalThis.fetch=async()=>new Response(new ReadableStream({start(controller){for(let index=0;index<bytes.length;index+=3)controller.enqueue(bytes.slice(index,index+3));controller.close();}}));
 try{const result=await generatePassport({},(section,cards)=>{order.push(section);assert.equal(cards[0].name,'Café');});order.push('final');assert.deepEqual(order,['Eat','final']);assert.deepEqual(result,passport);}finally{globalThis.fetch=original;}
});
test('a partial preview never becomes an editable Passport when the stream fails',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response('{"type":"category","section":"Eat","cards":[]}\n');
 try{await assert.rejects(generatePassport({},()=>{}),/did not finish/);}finally{globalThis.fetch=original;}
});
