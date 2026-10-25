import test from "node:test";
import assert from "node:assert/strict";
import { siteGuidanceAction } from "../src/agent/site-guidance.ts";
import { runTurn } from "../src/agent/orchestrator.ts";
import { normalizeSession } from "../src/agent/session.ts";

const examples = [
  ["save my passport", "save-passport"],
  ["save my plan", "save-plan"],
  ["how do I use Together?", "open-together"],
  ["how does Together work?", "open-together"],
  ["take me to Taste Insights", "open-insights"],
  ["open Preferences", "open-preferences"],
  ["show me My Vibe", "open-vibe"],
  ["go to Discover", "open-discover"],
  ["open Plan a day", "plan-day"],
] as const;

for(const [message, action] of examples)test(`explicit website request routes safely: ${message}`,async()=>{
  assert.equal(siteGuidanceAction(message),action);
  const state=normalizeSession({id:"site-guide",revision:0,expires:Date.now()+60_000,city:"London",selected:[],tags:[],constraints:[],categoryConstraints:{},cards:[],previous:[],feedback:[],notices:[]});
  const unavailable={tools:async()=>{throw Error("No Qloo call for navigation")},workflow:async()=>{throw Error("No MCP call for navigation")},discover:async()=>{throw Error("No discovery for navigation")}};
  const reply=await runTurn(state,{message},unavailable);
  assert.equal(reply.action,action);
  assert.deepEqual(reply.changed,[]);
  assert.deepEqual(reply.state.cards,[]);
  assert.doesNotMatch(reply.message,/temporarily unavailable/i);
});

test("ordinary discovery and constraint requests do not navigate",()=>{
  for(const message of ["find restaurants for dinner", "set preferences to cheaper food", "find music we both like together", "show me different food in Discover", "don't save my passport"])
    assert.equal(siteGuidanceAction(message),undefined,message);
});
