import test from "node:test";
import assert from "node:assert/strict";
import { runTurn, type AgentDependencies } from "../src/agent/orchestrator.ts";
import { normalizeSession } from "../src/agent/session.ts";
import type { Card } from "../src/passport/model.ts";

const resultCard: Card = {
  id: "new-food-place",
  name: "Returned restaurant",
  section: "Eat",
  types: ["urn:entity:place"],
  detail: "",
};

function fixture(message: string) {
  let compositions = 0;
  const state = normalizeSession({
    id: "compose-latency-test",
    revision: 1,
    expires: Date.now() + 60_000,
    city: "London",
    selected: [],
    tags: [],
    constraints: [],
    categoryConstraints: {},
    cards: [{ ...resultCard, id: "old-food-place", name: "Earlier restaurant" }],
    previous: [],
    feedback: [],
    notices: [],
    activeCategories: ["Eat"],
    providerHealth: "healthy",
  });
  const deps: AgentDependencies = {
    provider: {
      interpret: async () => ({
        kind: "refine",
        sections: ["Eat"],
        seeds: [],
        concepts: [],
        constraints: [],
        strategy: "discover",
      }),
      choose: async () => [],
      compose: async () => {
        compositions++;
        throw Error("Optional composition is observable in this test.");
      },
    },
    tools: async () => [],
    workflow: async () => ({ status: "ok", results: [] }),
    discover: async () => [{ ...resultCard }],
  };
  return { state, deps, message, compositions: () => compositions };
}

test("plain grounded refinement skips the second Gemini composition round trip", async () => {
  const testCase = fixture("Find new restaurants");
  const reply = await runTurn(testCase.state, { message: testCase.message }, testCase.deps);
  assert.deepEqual(reply.changed, ["Eat"]);
  assert.deepEqual(reply.state.history?.at(-1)?.recommendationIds, ["new-food-place"]);
  assert.equal(testCase.compositions(), 0);
});

test("explicit explanation requests still use Gemini composition", async () => {
  const testCase = fixture("Find new restaurants and explain why");
  await runTurn(testCase.state, { message: testCase.message }, testCase.deps);
  assert.equal(testCase.compositions(), 1);
});
