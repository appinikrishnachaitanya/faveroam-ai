import test from "node:test";
import assert from "node:assert/strict";
import { passportStorageFailure, safePassportStorageCode } from "../src/account/passport-storage-error.ts";

test("passport storage diagnostics expose error code only, not database messages or secrets", () => {
  const failure = passportStorageFailure("save-upsert", {
    code: "23514",
    message: "private user email@example.test with secret token",
    details: "snapshot body and private destination",
  });
  assert.deepEqual(failure, {
    status: 503,
    message: "Passport storage rejected a database constraint. Your current Passport is preserved.",
    code: "23514",
  });
  assert.doesNotMatch(JSON.stringify(failure), /email@example.test|secret token|snapshot body/);
  assert.equal(safePassportStorageCode({ code: "private-user@example.test" }), "unknown");
  assert.equal(safePassportStorageCode(null), "unknown");
});

test("passport storage distinguishes missing schema, privileges, expired session and snapshot shape", () => {
  const missing = passportStorageFailure("save-upsert", { code: "PGRST205" });
  assert.equal(missing.status, 503);
  assert.match(missing.message, /database table or migration/);
  const undefinedTable = passportStorageFailure("save-upsert", { code: "42P01" });
  assert.equal(undefinedTable.status, 503);
  const permission = passportStorageFailure("save-upsert", { code: "42501" });
  assert.equal(permission.status, 503);
  assert.match(permission.message, /permissions/);
  const staleSession = passportStorageFailure("save-session", Error("sensitive session id"));
  assert.equal(staleSession.status, 410);
  assert.doesNotMatch(staleSession.message, /sensitive session id/);
  const malformed = passportStorageFailure("save-snapshot", Error("internal contents"));
  assert.equal(malformed.status, 422);
  const badRestore = passportStorageFailure("restore-snapshot", Error("internal contents"));
  assert.equal(badRestore.status, 422);
  const outage = passportStorageFailure("save-upsert", { code: "PGRST301", message: "private data" });
  assert.equal(outage.status, 502);
  assert.doesNotMatch(outage.message, /private data/);
  assert.equal(passportStorageFailure("list", new Error("db failed")).status, 503);
});
