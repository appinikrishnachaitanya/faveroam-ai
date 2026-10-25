import test from 'node:test';import assert from 'node:assert/strict';
import {paced} from '../src/qloo/transport.ts';
test('warm lookups bypass an unrelated blocked request and still honour cancellation',async()=>{
 const key='latency-fixture-'+Date.now();let calls=0;
 await paced(key,async()=>{calls++;return 'cached';});
 let release!:()=>void;
 const slow=paced(key+'-slow',async()=>{await new Promise<void>(resolve=>{release=resolve;});return 'done';});
 try {
   const value=await Promise.race([paced(key,async()=>{calls++;return 'wrong';}),new Promise<never>((_,reject)=>{const timer=setTimeout(()=>reject(Error('Cache hit blocked by network queue')),100);timer.unref();})]);
   assert.equal(value,'cached');assert.equal(calls,1);
   const aborted=new AbortController();aborted.abort();
   await assert.rejects(paced(key,async()=> 'wrong',300000,aborted.signal));
 } finally {
   // The paced request starts after its ordinary rate-limit spacing.
   while(!release)await new Promise(resolve=>setTimeout(resolve,10));
   release();await slow;
 }
});
