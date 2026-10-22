import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertSessionWriteCommitted } from "../src/agent/session-lifetime.ts";

const source = (path: string) => readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("durable sessions fail closed when a later revision cannot be persisted", () => {
  assert.doesNotThrow(() => assertSessionWriteCommitted(true,true));
  assert.doesNotThrow(() => assertSessionWriteCommitted(false,false));
  assert.doesNotThrow(() => assertSessionWriteCommitted(false,true));
  assert.throws(
    () => assertSessionWriteCommitted(true,false),
    /could not be synchronized safely/,
  );
});

test("session store checks revisioned write before changing in-memory state", () => {
  const store=source("src/agent/store.ts");
  const update=store.indexOf("const committed = await persistActiveSession(next.state, revision)");
  const guard=store.indexOf("assertSessionWriteCommitted(gcsSessionConfigured() || durableIds.has(id), committed)");
  const memoryCommit=store.indexOf("sessions.set(id, next.state)");
  assert.ok(update>=0 && guard>update && memoryCommit>guard);
  assert.match(store,/const persisted = await loadActiveSession\(id\)/);
  assert.match(store,/if \(!persisted\) throw Error\("Your Passport session is no longer available/);
  assert.match(store,/durableIds\.delete\(id\)/);
});

test("shared-session writes protect against stale revisions across Cloud Run instances",()=>{
  const sourceFile=source("src/agent/active-session-db.ts");
  assert.match(sourceFile,/writeGcsSession\(state, expectedRevision\)/);
  const objectStore=source("src/agent/active-session-gcs.ts");
  assert.match(objectStore,/ifGenerationMatch: current\?\.generation \?\? 0/);
  assert.match(objectStore,/current\?\.state\.revision !== expectedRevision/);
});

test("new Passport fails if shared state is not durable; saved restore never silently succeeds",()=>{
  const create=source("app/api/passport/route.ts");
  assert.match(create,/if \(gcsSessionConfigured\(\) && !persisted\)/);
  assert.match(create,/throw Error\("Passport storage is temporarily unavailable/);
  for (const file of ["app/api/account/passports/route.ts","app/api/account/preferences/route.ts"]) {
    const code=source(file);
    assert.match(code,/assertSessionWriteCommitted\(true, await syncSession\(state\)\)/);
  }
});
