import assert from "node:assert/strict";
import test from "node:test";
import { createLatestRequest } from "../src/workspace/latest-request.ts";

test("starting a new draft request cancels and invalidates the older response", () => {
  const requests = createLatestRequest();
  const older = requests.start();
  const newer = requests.start();

  assert.equal(older.signal.aborted, true);
  assert.equal(requests.isCurrent(older), false);
  assert.equal(requests.isCurrent(newer), true);
});

test("resetting the draft cancels the in-flight request", () => {
  const requests = createLatestRequest();
  const request = requests.start();

  requests.cancel();

  assert.equal(request.signal.aborted, true);
  assert.equal(requests.isCurrent(request), false);
});
