import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import type { File } from "@google-cloud/storage";
import { normalizeSession } from "../src/agent/session.ts";

if (!process.env.GCP_SESSION_TEST_CHILD) {
  test("Cloud Storage session contract runs with the server-only condition", () => {
    const output = execFileSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "--input-type=module", "-e", "await import('./tests/gcp-session.test.ts')"], {
      env: { ...process.env, GCP_SESSION_TEST_CHILD: "1" }, encoding: "utf8", timeout: 15000,
    });
    assert.match(output, /pass 2/);
  });
}

const gcs = process.env.GCP_SESSION_TEST_CHILD
  ? await import("../src/agent/active-session-gcs.ts") : undefined;

const id = "11111111-1111-4111-8111-111111111111";

function fakeObject() {
  let current = 0;
  const versions = new Map<number, string>();
  const object = {
    name: `sessions/${id}.json`,
    getMetadata: async () => {
      if (!current) throw { code: 404 };
      return [{ generation: String(current) }];
    },
    bucket: { file: (_name: string, options: { generation: number }) => ({
      download: async () => {
        const value = versions.get(options.generation);
        if (!value) throw { code: 404 };
        return [Buffer.from(value)];
      },
    }) },
    save: async (value: string, options: { preconditionOpts: { ifGenerationMatch: number } }) => {
      if (options.preconditionOpts.ifGenerationMatch !== current) throw { code: 412 };
      versions.set(++current, value);
    },
  } as unknown as File;
  return object;
}

function state(revision: number) {
  return normalizeSession({ id, revision, expires: Date.now() + 60_000, city: "London",
    selected: [], tags: [], constraints: [], categoryConstraints: {}, cards: [], previous: [], feedback: [], notices: [] });
}

if (gcs) test("Cloud Storage restores the canonical session and rejects a stale revision", async () => {
  const object = fakeObject();
  assert.equal(await gcs.writeGcsSession(state(0), undefined, object), true);
  assert.equal((await gcs.readGcsSession(id, object))?.state.city, "London");
  assert.equal(await gcs.writeGcsSession(state(1), 0, object), true);
  assert.equal((await gcs.readGcsSession(id, object))?.state.revision, 1);
  await assert.rejects(gcs.writeGcsSession(state(1), 0, object), /Passport changed/);
});

if (gcs) test("Cloud Storage generation precondition rejects a concurrent writer", async () => {
  const object = fakeObject();
  assert.equal(await gcs.writeGcsSession(state(0), undefined, object), true);
  const [first, second] = await Promise.allSettled([
    gcs.writeGcsSession(state(1), 0, object), gcs.writeGcsSession(state(1), 0, object),
  ]);
  assert.equal([first, second].filter(result => result.status === "fulfilled").length, 1);
  assert.equal([first, second].filter(result => result.status === "rejected").length, 1);
});
