import test from "node:test";
import assert from "node:assert/strict";
import { conversationContext } from "../src/agent/context.ts";
import { normalizeSession } from "../src/agent/session.ts";
import { runTurn } from "../src/agent/orchestrator.ts";
import type { AgentState } from "../src/agent/types.ts";
function fixture():AgentState {
 return normalizeSession({id:"private-session-id",revision:0,expires:Date.now()+60000,city:"Toronto",selected:[{id:"public-taste-id",name:"Indian",types:["urn:tag:cuisine:qloo"],detail:"not context"}],tags:[{id:"urn:tag:dietary_option:qloo:vegetarian",name:"Vegetarian",types:["urn:tag:dietary_option:qloo"],detail:"not context"}],categoryTags:{Eat:["urn:tag:dietary_option:qloo:vegetarian"]},queryPreferences:{Eat:{priceMax:2,businessRatingMin:4.5}},constraints:[],categoryConstraints:{},cards:[],previous:[],feedback:[],notices:[],activeCategories:["Eat"],intent:{kind:"refine",sections:["Eat"],seeds:[],concepts:[],constraints:[],strategy:"discover"},history:Array.from({length:12},(_,index)=>({role:index%2?"agent":"user",text:`Cultural turn ${index}`}))});
}
test("context is bounded and excludes session/account/raw metadata",()=>{
 const state=fixture();(state as unknown as Record<string,unknown>).account={email:"private@example.com",accessToken:"private-token"};
 const context=conversationContext(state);const text=JSON.stringify(context);
 assert.equal(context.history!.length,8);assert.equal(context.history![0].text,"Cultural turn 4");assert.deepEqual(context.lastSections,["Eat"]);
 assert.equal(context.categories![0].preferences.businessRatingMin,4.5);assert.deepEqual(context.categories![0].requirements,["Vegetarian"]);
 assert.ok(!text.includes("private-session-id"));assert.ok(!text.includes("private@example.com"));assert.ok(!text.includes("private-token"));assert.ok(!text.includes("not context"));
});
test("contact information, credentials and oversized history are omitted",()=>{
 const state=fixture();state.history=[{role:"user",text:"contact me at private@example.com"},{role:"agent",text:"x".repeat(1001)},{role:"user",text:"Find vegetarian dinner"}];
 const secret=process.env.GEMINI_API_KEY ?? process.env.QLOO_API_KEY;
 if(secret)state.history.push({role:"user",text:secret});
 const context=conversationContext(state);assert.deepEqual(context.history,[{role:"user",text:"Find vegetarian dinner"}]);
 if(secret)assert.ok(!JSON.stringify(context).includes(secret),"Credential must not enter model context");
});
test("orchestrator passes recent conversation and current preferences to the model",async()=>{
 const state=fixture();let captured=false;
 const reply=await runTurn(state,{message:"Raise that minimum to 4.7"},{provider:{interpret:async(text,context)=>{
  assert.equal(text,"Raise that minimum to 4.7");assert.equal(context!.history!.length,8);assert.equal(context!.categories![0].preferences.businessRatingMin,4.5);captured=true;
  return {kind:"refine",sections:["Eat"],seeds:[],concepts:[],constraints:[],strategy:"discover",query:{businessRatingMin:4.7}};
 },choose:async()=>[]},tools:async()=>[],workflow:async()=>({status:"ok",results:[]}),discover:async(s,section)=>{assert.equal(s.queryPreferences!.Eat!.priceMax,2);assert.equal(s.queryPreferences!.Eat!.businessRatingMin,4.7);return [{id:"new",name:"Eligible",section,types:["urn:entity:place"],detail:""}];}});
 assert.ok(captured);assert.deepEqual(reply.changed,["Eat"]);assert.equal(state.queryPreferences!.Eat!.businessRatingMin,4.5);
});
test("history starts with a user message even after guided-only actions",()=>{
 const state=fixture();state.history=[{role:"agent",text:"Updated guided filters"},{role:"user",text:"Find coffee"},{role:"agent",text:"Updated Coffee"}];
 assert.deepEqual(conversationContext(state).history,[{role:"user",text:"Find coffee"},{role:"agent",text:"Updated Coffee"}]);
 state.history=[{role:"agent",text:"Updated guided filters"}];assert.deepEqual(conversationContext(state).history,[]);
});
