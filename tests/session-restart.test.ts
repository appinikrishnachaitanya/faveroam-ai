import test from "node:test";
import assert from "node:assert/strict";
import { turnFailure } from "../src/agent/turn-failure.ts";

test("turn failures distinguish missing/expired sessions, storage failures and stale revisions",()=>{
 assert.equal(turnFailure(Error("session expired")).code,"SESSION_EXPIRED");
 assert.equal(turnFailure(Error("Your Passport session is no longer available")).code,"SESSION_MISSING");
 assert.equal(turnFailure(Error("Passport storage is temporarily unavailable")).code,"STORAGE_UNAVAILABLE");
 assert.equal(turnFailure(Error("Passport changed. Use the latest state.")).code,"SESSION_CHANGED");
 assert.equal(turnFailure(Error("provider internal details")).code,"TEMPORARILY_UNAVAILABLE");
 assert.ok(!turnFailure(Error("provider internal details")).message.includes("internal"));
});
