import test from "node:test";
import assert from "node:assert/strict";
import { runTurn, type AgentDependencies } from "../src/agent/orchestrator.ts";
import { interpret, validateIntent } from "../src/agent/intent.ts";
import { normalizeSession } from "../src/agent/session.ts";
import { chatParagraphs } from "../src/agent/chat-presentation.ts";
import { groundedModelIntent } from "../src/agent/conversation-grounding.ts";
import type { AgentState } from "../src/agent/types.ts";
function fixture():AgentState {
 return normalizeSession({id:"conversation",revision:0,expires:Date.now()+60000,city:"Toronto",selected:[],tags:[],constraints:[],categoryConstraints:{},categoryTags:{},queryPreferences:{Eat:{priceMax:2,businessRatingMin:4.5}},cards:[{id:"food",name:"Existing restaurant",section:"Eat",types:["urn:entity:place"],detail:"",address:"1 Example Road"},{id:"music",name:"Existing artist",section:"Music",types:["urn:entity:artist"],detail:""}],previous:[],feedback:[],notices:[],intent:{kind:"refine",seeds:[],concepts:[],constraints:[],sections:["Eat","Music"],strategy:"discover"}});
}
const readonly:AgentDependencies={tools:async()=>{throw Error("No tools for a read-only question");},workflow:async()=>{throw Error("No workflow for a read-only question");},discover:async()=>{throw Error("No discovery for a read-only question");}};
for(const question of ["What can you do?","What filters are saved?","Why these suggestions?","Why is this cheaper?"])test(`read-only conversation does not mutate Passport: ${question}`,async()=>{
 const original=fixture();original.pending={query:"museum",candidates:[],sections:["Culture"],constraints:[]};
 const reply=await runTurn(original,{message:question},readonly);
 assert.deepEqual(reply.changed,[]);assert.deepEqual(reply.state.cards,original.cards);assert.deepEqual(reply.state.queryPreferences,original.queryPreferences);assert.deepEqual(reply.state.pending,original.pending);assert.doesNotMatch(reply.message,/name a section to refine/i);
 if(question.includes("filters"))assert.match(reply.message,/minimum rating 4.5\/5/);
 if(question.includes("suggestions"))assert.match(reply.message,/1 Example Road/);
});
test("an edit plus explanation remains an edit rather than a read-only answer",()=>{
 const intent=interpret("Find cheaper vegetarian Indian food and explain why it fits");assert.equal(intent.kind,"refine");assert.equal(intent.question,undefined);
});
test("ambiguous follow-up after a multi-category turn asks scope and preserves state",async()=>{
 const original=fixture();const reply=await runTurn(original,{message:"make those cheaper"},readonly);
 assert.deepEqual(reply.changed,[]);assert.match(reply.message,/Which section.*Eat, Music/);assert.deepEqual(reply.state.cards,original.cards);assert.deepEqual(reply.state.queryPreferences,original.queryPreferences);
});
test("a semantic model-selected question reads grounded state without tool execution",async()=>{
 const reply=await runTurn(fixture(),{message:"Walk me through these choices"},{...readonly,provider:{interpret:async()=>({kind:"unknown",question:"explanation",seeds:[],concepts:[],constraints:[],sections:["Eat"],strategy:"discover"}),choose:async()=>{throw Error("No planning for questions");}}});
 assert.match(reply.message,/Existing restaurant/);assert.match(reply.message,/1 Example Road/);assert.deepEqual(reply.changed,[]);
});
test("intent validation accepts only the fixed read-only question vocabulary",()=>{
 const intent={kind:"unknown",question:"invent a restaurant",seeds:[],concepts:[],constraints:[],sections:[],strategy:"discover"};assert.equal(validateIntent(intent).question,undefined);
});
test("an initial ambiguous budget request never defaults from Coffee to Dining",async()=>{
 const original=fixture();delete original.intent;original.activeCategories=["Eat","Coffee"];
 const reply=await runTurn(original,{message:"cheaper"},readonly);
 assert.deepEqual(reply.changed,[]);assert.match(reply.message,/Which section.*Eat, Coffee/);assert.deepEqual(reply.state.queryPreferences,original.queryPreferences);
});
test("a familiarity request across multiple sections needs an explicit target",async()=>{
 const original=fixture();delete original.intent;
 const reply=await runTurn(original,{message:"Give me something more adventurous"},readonly);
 assert.deepEqual(reply.changed,[]);assert.match(reply.message,/Which section/);assert.deepEqual(reply.state.categoryModes,original.categoryModes);
});
test("model absolute budget guesses cannot increase the cap in a cheaper follow-up",async()=>{
 const original=fixture();original.intent!.sections=["Eat"];original.queryPreferences!.Eat!.priceMax=1;
 const reply=await runTurn(original,{message:"make those cheaper"},{...readonly,provider:{interpret:async()=>({...interpret("make dining cheaper"),query:{priceMax:4}}),choose:async()=>[]},discover:async(s,section)=>{assert.equal(s.queryPreferences!.Eat!.priceMax,1);return [{id:"new",name:"Eligible",section,types:["urn:entity:place"],detail:""}];}});
 assert.deepEqual(reply.changed,["Eat"]);assert.equal(reply.state.queryPreferences!.Eat!.priceMax,1);
});
test("a new cinema request cannot inherit a model-guessed dining budget or rating",async()=>{
 const original=fixture();original.intent!.sections=["Eat"];
 const reply=await runTurn(original,{message:"Find local cinemas. Keep my dining, coffee, music and movies unchanged."},{...readonly,
  provider:{interpret:async()=>({kind:"refine",seeds:[],concepts:[],sections:["Culture"],constraints:["expensive"],activityGenres:["cinema"],strategy:"discover",query:{priceMax:2,businessRatingMin:4.5}}),choose:async()=>[]},
  discover:async(state,section,constraints)=>{assert.equal(section,"Culture");assert.equal(state.queryPreferences!.Culture?.priceMax,undefined);assert.equal(state.queryPreferences!.Culture?.businessRatingMin,undefined);assert.ok(!constraints.includes("expensive"));return [{id:"cinema",name:"Actual cinema",section,types:["urn:entity:place"],detail:""}];}
 });
 assert.deepEqual(reply.changed,["Culture"]);assert.deepEqual(reply.state.queryPreferences!.Eat,original.queryPreferences!.Eat);
});
test("server conversation scope overrides a model's unsupported Dining guess for a Coffee follow-up",async()=>{
 const original=fixture();original.intent!.sections=["Coffee"];original.activeCategories!.push("Coffee");original.queryPreferences!.Coffee={priceMax:3};
 const reply=await runTurn(original,{message:"make those cheaper"},{...readonly,provider:{interpret:async()=>({...interpret("make dining cheaper"),sections:["Eat"],concepts:["budget friendly restaurants"]}),choose:async()=>[]},discover:async(s,section)=>{assert.equal(section,"Coffee");assert.equal(s.queryPreferences!.Coffee!.priceMax,2);return [{id:"coffee",name:"Coffee",section,types:["urn:entity:place"],detail:""}];}});
 assert.deepEqual(reply.changed,["Coffee"]);assert.deepEqual(reply.state.cards.filter(c=>c.section!=="Coffee"),original.cards);
});
test("an ordinary budget update cannot change the discovery mode just because a model supplies one",async()=>{
 const original=fixture();original.intent!.sections=["Eat"];original.categoryModes!.Eat="familiar";
 const reply=await runTurn(original,{message:"make those cheaper"},{...readonly,provider:{interpret:async()=>({...interpret("make dining cheaper"),familiarity:"explore"}),choose:async()=>[]},discover:async(_s,section)=>[{id:"new",name:"Eligible",section,types:["urn:entity:place"],detail:""}]});
 assert.deepEqual(reply.changed,["Eat"]);assert.equal(reply.state.categoryModes!.Eat,"familiar");
});

test("a returned-theme action preserves other categories and existing category preferences without a model", async () => {
  const original = fixture();
  original.queryPreferences!.Eat!.includeTags = ["urn:tag:cuisine:restaurant:indian"];
  const calls: string[] = [];
  const reply = await runTurn(original, {
    discovery: { sections: ["Eat"], preferences: { includeTags: ["urn:tag:cuisine:restaurant:indian", "urn:tag:genre:place:casual_dining"] } },
  }, {
    ...readonly,
    discover: async (state, section) => {
      calls.push(section);
      assert.equal(state.queryPreferences!.Eat!.priceMax, 2);
      assert.equal(state.queryPreferences!.Eat!.businessRatingMin, 4.5);
      assert.deepEqual(state.queryPreferences!.Eat!.includeTags, ["urn:tag:cuisine:restaurant:indian", "urn:tag:genre:place:casual_dining"]);
      return state.cards.filter(card => card.section === section);
    },
  });
  assert.deepEqual(calls, ["Eat"]);
  assert.deepEqual(reply.changed, ["Eat"]);
  assert.deepEqual(reply.state.cards.filter(card => card.section === "Music"), original.cards.filter(card => card.section === "Music"));
  assert.deepEqual(original.queryPreferences!.Eat!.includeTags, ["urn:tag:cuisine:restaurant:indian"]);
});

test("an explicit Balanced choice clears a previous Surprise goal in that category", async () => {
  const original=fixture();
  original.queryPreferences!.Eat!.goal="surprise";
  original.categoryModes!.Eat="explore";
  const result=await runTurn(original,{familiarity:{section:"Eat",mode:"balanced"}},{...readonly,discover:async(state,section)=>{
    assert.equal(state.queryPreferences!.Eat!.goal,"discover");
    assert.equal(state.categoryModes!.Eat,"balanced");
    return state.cards.filter(card=>card.section===section);
  }});
  assert.equal(result.state.categoryModes.Eat,"balanced");
  assert.equal(original.queryPreferences!.Eat!.goal,"surprise");
});
test("one Discover mode applies to each selected category and preserves the rest", async()=>{
 const original=fixture();original.activeCategories=["Eat","Music"];
 original.categoryModes={Eat:"familiar",Music:"explore",Movies:"familiar"};
 const seen:string[]=[];
 const reply=await runTurn(original,{familiarity:{mode:"balanced",sections:["Eat","Music"]}},{...readonly,discover:async(state,section)=>{
   seen.push(section);
   assert.equal(state.categoryModes?.Eat,"balanced");
   assert.equal(state.categoryModes?.Music,"balanced");
   return state.cards.filter(card=>card.section===section);
 }});
 assert.deepEqual(seen,["Eat","Music"]);
 assert.deepEqual(reply.changed,["Eat","Music"]);
 assert.equal(reply.state.categoryModes.Movies,"familiar");
});
test("explicit save and planner requests are validated actions with no phantom search",async()=>{
 const initial=fixture();
 const provider=(action:"save-passport"|"plan-day")=>({interpret:async()=>({kind:"unknown" as const,action,seeds:[],concepts:[],constraints:[],sections:[],strategy:"discover" as const}),choose:async()=>[]});
 const saved=await runTurn(initial,{message:"Save my Passport"},{...readonly,provider:provider("save-passport")});
 assert.equal(saved.action,"save-passport");
 assert.deepEqual(saved.changed,[]);
 assert.deepEqual(saved.state.cards,initial.cards);
 const planned=await runTurn(initial,{message:"Plan a day out"},{...readonly,provider:provider("plan-day")});
 assert.equal(planned.action,"plan-day");
 assert.deepEqual(planned.changed,[]);
 const rejected=await runTurn(initial,{message:"show food"},{...readonly,provider:provider("save-passport")});
 assert.equal(rejected.action,undefined);
});
test("a beverage typo can ground Gemini's corrected concept without inventing a drink",()=>{
 const model={kind:"refine" as const,seeds:[],concepts:["beverages"],constraints:[],sections:["Coffee" as const],strategy:"discover" as const};
 assert.deepEqual(groundedModelIntent("Find bevarages in London",model).concepts,["beverages"]);
 assert.deepEqual(groundedModelIntent("Find bevarages in London",{...model,concepts:["tea"]}).concepts,[]);
});
test("a verified beverage venue category can refine Coffee without a duplicate-label picker",async()=>{
 const initial=fixture();initial.activeCategories=["Coffee"];
 const reply=await runTurn(initial,{message:"Find bevarages in London"},{
  tools:async()=>[{name:"qloo_find_tags",inputSchema:{type:"object",properties:{query:{type:"string"}}}}],
  workflow:async()=>({status:"ok",results:[
   {id:"urn:tag:offerings:place:beverages",name:"Beverages"},
   {id:"urn:tag:category:place:beverages",name:"Beverages"},
  ]}),
  discover:async(state,section)=>{
   assert.equal(section,"Coffee");
   assert.deepEqual(state.categoryTags?.Coffee,["urn:tag:category:place:beverages"]);
   return [{id:"drink-place",name:"Returned drink venue",section,types:["urn:entity:place"],detail:""}];
  },
  provider:{interpret:async()=>({kind:"refine",seeds:[],concepts:["beverages"],constraints:[],sections:["Coffee"],strategy:"discover"}),choose:async()=>[]},
 });
 assert.deepEqual(reply.changed,["Coffee"]);
 assert.equal(reply.state.pending,undefined);
});
test("a model authentication failure does not pretend to understand a broad drink request",async()=>{
 const original=fixture();
 const reply=await runTurn(original,{message:"bevarages"},{...readonly,provider:{interpret:async()=>{throw Error("provider unavailable")},choose:async()=>[]}});
 assert.match(reply.message,/Live conversation is unavailable/);
 assert.deepEqual(reply.changed,[]);
 assert.deepEqual(reply.state.cards,original.cards);
});
test("chat cards replace repeated numbered prose and retain a readable introduction",()=>{
 assert.deepEqual(chatParagraphs("Here are 3 starting choices from your London Passport:\n\n1. A (Food)\nReason\n\n2. B",true),["Here are 3 starting choices from your London Passport."]);
 assert.deepEqual(chatParagraphs("I found these for you.\n\nHere are 3 choices to consider:\n\n1. A",true),["I found these for you."]);
 assert.deepEqual(chatParagraphs("First point.\n\nSecond point.",false),["First point.","Second point."]);
});
test("a cross-interest shortlist keeps grounded card IDs when a response model is available",async()=>{
 const reply=await runTurn(fixture(),{message:"Pick three things across my interests"},{...readonly,
  provider:{interpret:async()=>{throw Error("Shortlist should use current cards")},choose:async()=>[],compose:async()=>{throw Error("Shortlist should not be recomposed")}},
 });
 assert.deepEqual(reply.state.history?.at(-1)?.recommendationIds,["food","music"]);
 assert.deepEqual(reply.changed,[]);
 assert.deepEqual(chatParagraphs(reply.message,true),["Here are 2 starting choices from your Toronto Passport."]);
});
test("a failed response-writing call preserves a useful grounded reply",async()=>{
 const reply=await runTurn(fixture(),{message:"List my Food options"},{...readonly,
  provider:{interpret:async()=>{throw Error("Read-only answer should use current state")},choose:async()=>[],compose:async()=>{throw Error("Response model unavailable")}},
 });
 assert.match(reply.message,/Existing restaurant/);
 assert.doesNotMatch(reply.message,/Taste Concierge is temporarily unavailable/);
 assert.deepEqual(reply.changed,[]);
});
