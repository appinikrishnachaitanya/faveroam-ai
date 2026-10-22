import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

if (!process.env.GCP_AUTH_TEST_CHILD) {
  test("Firebase Auth request contract runs with the server-only condition", () => {
    const output = execFileSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "--input-type=module", "-e", "await import('./tests/gcp-auth.test.ts')"], {
      env: { ...process.env, GCP_AUTH_TEST_CHILD: "1" }, encoding: "utf8", timeout: 15000,
    });
    assert.match(output, /pass 2/);
  });
}

if (process.env.GCP_AUTH_TEST_CHILD) {
  const { firebaseRequest, FirebaseAuthError, stableId } = await import("../src/account/gcp.ts");
  test("account record IDs are stable and isolated by owner", () => {
    assert.equal(stableId("user-a:London"), stableId("user-a:London"));
    assert.notEqual(stableId("user-a:London"), stableId("user-b:London"));
    assert.match(stableId("user-a:London"), /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
  });
  test("Firebase Auth errors expose only a bounded code", async () => {
    const originalKey = process.env.FIREBASE_WEB_API_KEY;
    const originalFetch = globalThis.fetch;
    process.env.FIREBASE_WEB_API_KEY = "fixture-key";
    globalThis.fetch = async () => Response.json({ error: { message: "EMAIL_EXISTS", private: "secret-response" } }, { status: 400 });
    try {
      await assert.rejects(firebaseRequest("accounts:signUp", { email: "fixture@example.test" }), error =>
        error instanceof FirebaseAuthError && error.code === "EMAIL_EXISTS" && !error.message.includes("secret-response"));
    } finally {
      globalThis.fetch = originalFetch;
      if (originalKey === undefined) delete process.env.FIREBASE_WEB_API_KEY;
      else process.env.FIREBASE_WEB_API_KEY = originalKey;
    }
  });
}
