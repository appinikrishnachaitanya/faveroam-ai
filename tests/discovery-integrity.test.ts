import test from "node:test";
import assert from "node:assert/strict";
import {
  validatedSection,
  validateDiscoveries,
} from "../src/agent/validation.ts";
import { relaxationSteps } from "../src/agent/session.ts";
import { sendAgentTurn } from "../src/agent/browser.ts";
import type { Entity } from "../src/qloo/types.ts";
const id = "11111111-1111-4111-8111-111111111111";
function venue(names: string[], description = ""): Entity {
  return {
    entity_id: id,
    name: "Protocol venue",
    type: "urn:entity:place",
    tags: names.map((name) => ({
      id: `urn:tag:genre:place:${name.replaceAll(" ", "_")}`,
      type: "urn:tag:genre:place",
      name,
    })),
    properties: {
      short_description: description,
      geocode: { city: "Toronto" },
    },
  };
}
test("culture rejects dining conflicts, tiffin descriptions and unknown genres without venue-specific rules", () => {
  for (const e of [
    venue(["Cultural"]),
    venue(["Museum", "Restaurant"]),
    venue(["Gallery"], "Indian tiffin service"),
    venue(["Food delivery"]),
    venue([]),
  ])
    assert.notEqual(validatedSection(e), "Culture");
  for (const e of [
    venue(["Museum", "Tourist attraction"]),
    venue(["Art gallery"]),
    venue(["Theatre"]),
  ])
    assert.equal(validatedSection(e), "Culture");
  assert.equal(validatedSection(venue(["Coffee shop"])), "Coffee");
  assert.equal(
    validateDiscoveries(
      { results: { entities: [venue(["Restaurant", "Museum"])] } },
      "Toronto",
      "Culture",
      [],
      [],
    ).length,
    0,
  );
});
test("sparse search never silently relaxes explicit budget or other requirements", () => {
  assert.deepEqual(relaxationSteps(["expensive", "crowded", "touristy"]), [
    ["expensive", "crowded", "touristy"],
  ]);
});
test("refinement rejects malformed or stale result streams and supports cancellation", async () => {
  const original = globalThis.fetch;
  try {
    for (const payload of [
      "garbage",
      JSON.stringify({
        type: "result",
        reply: {
          changed: [],
          state: { id: "session", revision: 0, cards: [] },
        },
      }),
    ]) {
      globalThis.fetch = async () => new Response(payload + "\n");
      await assert.rejects(
        sendAgentTurn(
          { sessionId: "session", revision: 0, tags: [], constraints: [] },
          { message: "museums" },
          () => {},
        ),
      );
    }
    globalThis.fetch = async (_url, options) => {
      options?.signal?.throwIfAborted();
      return new Response("");
    };
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      sendAgentTurn(
        { sessionId: "session", revision: 0, tags: [], constraints: [] },
        { message: "museums" },
        () => {},
        controller.signal,
      ),
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("cancelled server work releases the lock and cannot commit over a newer revision", async () => {
  const { execFileSync } = await import("node:child_process");
  execFileSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      `
 import assert from 'node:assert/strict';
 import {createSession,inSession,getSession} from './src/agent/store.ts';
 const state=createSession({city:'Toronto',selected:[],cards:[],notices:[],explanation:''});
 let finish;const cancelled=new AbortController();
 const job=inSession(state.id,0,async original=>{await new Promise(r=>finish=r);return {state:{...original,notices:['late']},value:'late'}},cancelled.signal);
 cancelled.abort();await assert.rejects(job);
 await inSession(state.id,0,async original=>({state:{...original,notices:['latest']},value:'latest'}));
 finish();await new Promise(r=>setTimeout(r,10));
 assert.equal(getSession(state.id).revision,1);assert.deepEqual(getSession(state.id).notices,['latest']);
 await assert.rejects(inSession(state.id,0,async original=>({state:original,value:null})));
 `,
    ],
    { cwd: process.cwd(), stdio: "pipe" },
  );
});
