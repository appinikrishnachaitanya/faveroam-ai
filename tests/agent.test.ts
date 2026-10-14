import test from "node:test";
import assert from "node:assert/strict";
import {
  interpret,
  culturalText,
  validateIntent,
  onboardingTastes,
  isConcept,
} from "../src/agent/intent.ts";
import { TurnGuard } from "../src/agent/guard.ts";
import { runTurn } from "../src/agent/orchestrator.ts";
import { validateDiscoveries, tagCandidates } from "../src/agent/validation.ts";
import type { AgentState, ModelProvider } from "../src/agent/types.ts";
import type { AgentDependencies } from "../src/agent/orchestrator.ts";
// Isolated protocol fixtures, never available to production runtime.
const id = "00000000-0000-0000-0000-000000000001",
  replacement = "00000000-0000-0000-0000-000000000002";
function state(): AgentState {
  return {
    id: "session-test",
    revision: 0,
    expires: Date.now() + 10000,
    city: "New York City",
    selected: [
      { id, name: "Protocol artist", types: ["urn:entity:artist"], detail: "" },
    ],
    tags: [],
    constraints: [],
    categoryConstraints: {},
    cards: [
      {
        id,
        name: "Protocol dining",
        types: ["urn:entity:place"],
        detail: "",
        section: "Eat",
      },
      {
        id: "music-id",
        name: "Protocol music",
        types: ["urn:entity:artist"],
        detail: "",
        section: "Music",
      },
    ],
    previous: [],
    feedback: [],
    notices: [],
  };
}
function dependencies(): AgentDependencies {
  return {
    tools: async () => [
      { name: "qloo_find_tags", inputSchema: {} },
      { name: "qloo_rank", inputSchema: {} },
    ],
    workflow: async () => ({
      status: "ok",
      results: [
        {
          id: "urn:tag:category:place:indian_restaurant",
          name: "Indian restaurant",
          type: "urn:tag:category:place",
        },
      ],
    }),
    discover: async (_s, section) => [
      {
        id: replacement,
        name: "Protocol replacement",
        types: ["urn:entity:place"],
        detail: "",
        section,
      },
    ],
  };
}
const model: ModelProvider = {
  interpret: async () => interpret("Tonight I want Indian food"),
  choose: async () => [
    { name: "qloo_find_tags", arguments: { query: "Indian cuisine" } },
  ],
};
test("onboarding separates destination, seeds and negative constraints", () => {
  const i = interpret(
    "I'm moving from Bengaluru to New York. I love A.R. Rahman, Interstellar, biryani, specialty coffee and quiet bookstores. I don't like touristy places.",
  );
  assert.equal(i.destination, "New York City");
  assert.equal(i.seeds.length, 5);
  assert.equal(i.seeds[4], "quiet bookstores");
  assert.ok(i.constraints.includes("touristy"));
  assert.ok(!i.seeds.some((s) => s.includes("don't")));
});
test("model interpretation cannot smuggle fabricated recommendation data into state", () => {
  const i = validateIntent({
    ...interpret("Give me quieter cafés"),
    cards: [{ name: "Fake recommendation" }],
    reasoning: "private text",
  });
  assert.ok(!("cards" in i));
  assert.ok(!("reasoning" in i));
  assert.throws(() => culturalText("email me at sample@example.com"));
  assert.throws(() => culturalText("my name is User Name"));
});
test("Not My Vibe changes only the rejected category, records feedback and excludes rejected ID", async () => {
  const s = state(),
    d = dependencies();
  let observed: string[] = [];
  d.discover = async (_s, section, _c, excluded) => {
    observed = excluded;
    return [
      {
        id: replacement,
        name: "Protocol replacement",
        types: ["urn:entity:place"],
        detail: "",
        section,
      },
    ];
  };
  const r = await runTurn(
    s,
    { feedback: { id, accepted: false, reason: "Too touristy" } },
    d,
  );
  assert.deepEqual(r.changed, ["Eat"]);
  assert.deepEqual(
    r.state.cards.filter((c) => c.section === "Music"),
    s.cards.filter((c) => c.section === "Music"),
  );
  assert.equal(r.state.feedback[0].reason, "Too touristy");
  assert.ok(observed.includes(id));
  assert.equal(r.state.cards.find((c) => c.section === "Eat")?.id, replacement);
  assert.equal(s.feedback.length, 0);
  assert.equal(r.state.city, "New York City");
});
test("acceptance records an anchor without making Qloo calls", async () => {
  const d = dependencies();
  d.discover = async () => {
    throw Error("Must not execute");
  };
  const r = await runTurn(state(), { feedback: { id, accepted: true } }, d);
  assert.equal(r.state.feedback[0].accepted, true);
  assert.deepEqual(r.changed, []);
});
test("dynamic MCP concept selection requires returned tag confirmation", async () => {
  const d = dependencies();
  d.provider = model;
  let transport = "";
  d.workflow = async (mode) => {
    transport = mode;
    return {
      status: "ok",
      results: [
        {
          id: "urn:tag:category:place:indian_restaurant",
          name: "Indian restaurant",
        },
      ],
    };
  };
  const r = await runTurn(
    state(),
    { message: "Tonight I want Indian food" },
    d,
  );
  assert.equal(transport, "mcp");
  assert.equal(r.mode, "model-mcp");
  assert.ok(r.state.pending);
  assert.deepEqual(r.state.cards, state().cards);
  assert.deepEqual(r.changed, []);
});
test("confirmed concept is a real tag filter and updates only its requested section", async () => {
  const s = state();
  s.pending = {
    query: "Indian cuisine",
    candidates: [
      {
        id: "urn:tag:category:place:indian_restaurant",
        name: "Indian restaurant",
        types: ["urn:tag"],
        detail: "",
      },
    ],
    sections: ["Eat"],
    constraints: ["touristy"],
  };
  const r = await runTurn(
    s,
    { tagChoice: s.pending.candidates[0].id },
    dependencies(),
  );
  assert.equal(r.state.tags.length, 1);
  assert.equal(r.state.pending, undefined);
  assert.deepEqual(r.changed, ["Eat"]);
  assert.equal(
    r.state.cards.find((c) => c.section === "Music")?.name,
    "Protocol music",
  );
});
test("MCP failure preserves the existing passport rather than fake results", async () => {
  const d = dependencies();
  d.provider = model;
  d.workflow = async () => {
    throw Error("MCP unavailable");
  };
  const r = await runTurn(
    state(),
    { message: "Tonight I want Indian food" },
    d,
  );
  assert.deepEqual(r.state.cards, state().cards);
  assert.match(r.message, /temporarily unavailable/);
});
test("provider failure falls back to deterministic refinement", async () => {
  const d = dependencies();
  d.provider = {
    interpret: async () => {
      throw Error("Provider unavailable");
    },
    choose: async () => [],
  };
  const r = await runTurn(state(), { message: "Find more dining" }, d);
  assert.equal(r.mode, "deterministic");
  assert.deepEqual(r.changed, ["Eat"]);
  assert.match(r.message, /deterministic/);
});
test("guard bounds calls, prevents duplicates and expires stalled operations", async () => {
  const guard = new TurnGuard(1);
  await guard.run("one", {}, async () => 1);
  await assert.rejects(
    guard.run("one", {}, async () => 1),
    /Duplicate/,
  );
  await assert.rejects(
    guard.run("two", {}, async () => 1),
    /budget/,
  );
  const timed = new TurnGuard(1, 5);
  await assert.rejects(
    timed.run("stall", {}, () => new Promise((r) => setTimeout(r, 20))),
    /timeout/,
  );
});
test("tool budget in the orchestration path prevents a second category request", async () => {
  const r = await runTurn(
    state(),
    { message: "Show me food and music" },
    dependencies(),
    () => {},
    new TurnGuard(1),
  );
  assert.deepEqual(r.changed, ["Eat"]);
  assert.equal(
    r.state.cards.find((c) => c.section === "Music")?.name,
    "Protocol music",
  );
});
test("duplicate model-selected concept tools result in one bounded call", async () => {
  const d = dependencies();
  d.provider = {
    ...model,
    choose: async () => [
      { name: "qloo_find_tags", arguments: { query: "Indian cuisine" } },
      { name: "qloo_find_tags", arguments: { query: "Indian cuisine" } },
    ],
  };
  let calls = 0;
  const f = d.workflow;
  d.workflow = async (...args) => {
    calls++;
    return f(...args);
  };
  await runTurn(state(), { message: "Tonight I want Indian food" }, d);
  assert.equal(calls, 1);
});
test("429-like discovery failure retains all sections and never fabricates a replacement", async () => {
  const d = dependencies();
  d.discover = async () => {
    throw Error("HTTP 429");
  };
  const r = await runTurn(
    state(),
    { feedback: { id, accepted: false, reason: "Not interested" } },
    d,
  );
  assert.deepEqual(r.changed, []);
  assert.deepEqual(r.state.cards, state().cards);
  assert.match(r.message, /preserved/);
});
test("rank workflow cannot introduce a generated entity or address", async () => {
  const d = dependencies();
  d.provider = {
    interpret: async () => interpret("Rank dining shortlist"),
    choose: async () => [{ name: "qloo_rank", arguments: {} }],
  };
  d.workflow = async () => ({
    status: "ok",
    results: [
      {
        entity_id: "invented",
        name: "Fake place",
        address: "Fake address",
        affinity: 1,
      },
    ],
  });
  const r = await runTurn(state(), { message: "Rank dining shortlist" }, d);
  assert.ok(!JSON.stringify(r).includes("Fake place"));
  assert.ok(!r.state.cards.some((c) => c.id === "invented"));
});
test("place validation rejects nearby-food landmark tags and wrong cities", () => {
  const e = {
    name: "Protocol venue",
    entity_id: id,
    type: "urn:entity",
    subtype: "urn:entity:place",
    properties: { geocode: { city: "New York", metro: "New York City" } },
    tags: [{ name: "Nearby food trucks", type: "urn:tag:amenity:qloo" }],
  };
  assert.deepEqual(
    validateDiscoveries(
      { results: { entities: [e] } },
      "New York City",
      "Eat",
      [],
      [],
    ),
    [],
  );
  const restaurant = {
    ...e,
    tags: [{ name: "Indian restaurant", type: "urn:tag:category:place" }],
  };
  assert.equal(
    validateDiscoveries(
      { results: { entities: [restaurant] } },
      "New York City",
      "Eat",
      [],
      [],
    ).length,
    1,
  );
  assert.deepEqual(
    validateDiscoveries(
      { results: { entities: [restaurant] } },
      "Paris",
      "Eat",
      [],
      [],
    ),
    [],
  );
});
test("tag validation accepts only actual returned URNs and never invents tags", () => {
  assert.deepEqual(
    tagCandidates(
      { status: "ok", results: [{ id: "invented", name: "Fake tag" }] },
      "Indian",
    ),
    [],
  );
  assert.deepEqual(
    tagCandidates({ status: "needs_input", results: [] }, "Indian"),
    [],
  );
});
test("mixed concierge request hides coffee but refreshes food/books instead of deleting them", async () => {
  const s = state();
  s.cards.push({
    id: "coffee-id",
    name: "Protocol cafe",
    types: ["urn:entity:place"],
    detail: "",
    section: "Coffee",
  });
  s.tags.push({
    id: "urn:tag:category:place:book_store",
    name: "Bookstore",
    types: ["urn:tag:category:place"],
    detail: "Qloo concept for bookstore",
  });
  const r = await runTurn(
    s,
    { message: "Forget coffee. Show me books and food." },
    dependencies(),
  );
  assert.ok(!r.state.cards.some((c) => c.section === "Coffee"));
  assert.ok(r.state.cards.some((c) => c.section === "Eat"));
  assert.ok(r.state.cards.some((c) => c.section === "Lifestyle"));
  assert.equal(
    r.state.cards.find((c) => c.section === "Music")?.name,
    "Protocol music",
  );
});

test("live-observed generic cuisine URNs are accepted as real concepts", () => {
  const tags = tagCandidates(
    {
      status: "ok",
      results: [
        {
          id: "urn:tag:cuisine:qloo:indian",
          name: "Indian",
          type: "urn:tag:cuisine:qloo",
        },
      ],
    },
    "Indian cuisine",
  );
  assert.equal(tags[0].id, "urn:tag:cuisine:qloo:indian");
});

test("accepted preference can be cleared without discovery", async () => {
  const s = state();
  s.feedback = [{ id, section: "Eat", accepted: true }];
  const r = await runTurn(
    s,
    { feedback: { id, accepted: true, clear: true } },
    dependencies(),
  );
  assert.equal(r.state.feedback.length, 0);
  assert.deepEqual(r.changed, []);
});

test("onboarding merges model concepts and named seeds without duplicating cuisine aliases", () => {
  const i = {
    ...interpret("Tonight I want Indian food"),
    kind: "onboard" as const,
    seeds: ["A.R. Rahman", "Interstellar"],
    concepts: ["Indian cuisine"],
  };
  assert.equal(onboardingTastes(i).length, 3);
  assert.equal(
    onboardingTastes({ ...i, seeds: [...i.seeds, "Indian food"] }).length,
    3,
  );
  assert.equal(isConcept("biryani"), true);
  assert.equal(isConcept("A.R. Rahman"), false);
});

test('turn deadline aborts linked work and prevents later queued calls',async()=>{
 const guard=new TurnGuard(2,5);
 await assert.rejects(guard.run('slow',{},()=>new Promise<void>((_resolve,reject)=>guard.signal.addEventListener('abort',()=>reject(Error('cancelled'))))),/cancelled|timeout/);
 assert.equal(guard.signal.aborted,true);
 await assert.rejects(guard.run('later',{},async()=>1),/cancelled/);
});

test("interpretation activity does not pretend Qloo resolution started",async()=>{const {activities}=await import("../src/workspace/state.ts");const rows=activities("interpreting","New York City");assert.equal(rows[0].label,"Understanding your request");assert.equal(rows.find(r=>r.label==="Resolve cultural signals")?.state,"waiting")});
