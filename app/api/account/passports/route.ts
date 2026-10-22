import { debugRequest } from "../../../../src/agent/debug";
import { assertSessionWriteCommitted } from "../../../../src/agent/session-lifetime";
import { currentUser, accountRows, gcpAccountConfigured, stableId, saveJsonObject, readJsonObject, removeJsonObject } from "../../../../src/account/gcp";
import { sameOrigin } from "../../../../src/account/policy";
import { privateJson } from "../../../../src/account/server";
import { loadSession, registerRestoredSession, syncSession } from "../../../../src/agent/store";
import { passportSnapshot, restoreSnapshot } from "../../../../src/account/snapshot";
import { passportView } from "../../../../src/workspace/state";

export const runtime = "nodejs";
const uuid = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);

async function handleGET() {
  if (!gcpAccountConfigured()) return privateJson({ error: "Accounts are not configured." }, 503);
  try {
    const user = await currentUser();
    if (!user) return privateJson({ error: "Please sign in." }, 401);
    const snapshot = await accountRows(user.uid, "passports").orderBy("updated_at", "desc").limit(50).get();
    return privateJson({ passports: snapshot.docs.map(row => ({ id: row.id, city: row.data().city, updated_at: row.data().updated_at })) });
  } catch { return privateJson({ error: "Saved Passports are temporarily unavailable." }, 503); }
}

async function handlePOST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "Please use this app." }, 403);
  if (!gcpAccountConfigured()) return privateJson({ error: "Account saving is not configured." }, 503);
  try {
    const raw = await request.text();
    if (raw.length > 1000) return privateJson({ error: "Invalid save request." }, 400);
    const body = JSON.parse(raw) as Record<string, unknown>;
    const user = await currentUser();
    if (!user) return privateJson({ error: "Please sign in." }, 401);
    const collection = accountRows(user.uid, "passports");
    if (body.action === "restore") {
      if (!uuid(body.id)) return privateJson({ error: "Invalid Passport." }, 400);
      const row = await collection.doc(body.id).get();
      if (!row.exists) return privateJson({ error: "Saved Passport not found." }, 404);
      const state = restoreSnapshot(await readJsonObject(user.uid, row.data()?.objectPath));
      registerRestoredSession(state);
      assertSessionWriteCommitted(true, await syncSession(state));
      return privateJson({ passport: passportView(state, "Restored from your saved discoveries.") });
    }
    if (body.action !== "save" || !uuid(body.sessionId) || !Number.isInteger(body.revision)) return privateJson({ error: "Invalid save request." }, 400);
    const state = await loadSession(body.sessionId);
    if (state.revision !== body.revision) return privateJson({ error: "Your Passport changed. Save the latest version." }, 409);
    const snapshot = passportSnapshot(state);
    const id = stableId(`${user.uid}:${state.city.toLowerCase()}`);
    const row = collection.doc(id);
    const previous = await row.get();
    const objectPath = await saveJsonObject(user.uid, id, snapshot);
    try { await row.set({ city: state.city, objectPath, updated_at: new Date().toISOString() }); }
    catch (error) { await removeJsonObject(user.uid, objectPath); throw error; }
    try { await removeJsonObject(user.uid, previous.data()?.objectPath); }
    catch { console.error(JSON.stringify({ event: "passport.storage.cleanup_failed" })); }
    return privateJson({ saved: true, city: state.city });
  } catch { return privateJson({ error: "Your Passport could not be saved. Your current view is still here; please retry." }, 503); }
}

async function handleDELETE(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "Please use this app." }, 403);
  try {
    const raw = await request.text();
    if (raw.length > 200) return privateJson({ error: "Invalid request." }, 400);
    const body = JSON.parse(raw) as Record<string, unknown>;
    if (!uuid(body.id)) return privateJson({ error: "Invalid Passport." }, 400);
    const user = await currentUser();
    if (!user) return privateJson({ error: "Please sign in." }, 401);
    const row = accountRows(user.uid, "passports").doc(body.id);
    const previous = await row.get();
    if (!previous.exists) return privateJson({ error: "Passport not found." }, 404);
    await row.delete();
    try { await removeJsonObject(user.uid, previous.data()?.objectPath); }
    catch { console.error(JSON.stringify({ event: "passport.storage.cleanup_failed" })); }
    return privateJson({ deleted: true });
  } catch { return privateJson({ error: "Could not delete that saved Passport." }, 502); }
}

export function GET() { return debugRequest("account.passports", handleGET); }
export function POST(request: Request) { return debugRequest("account.passports", () => handlePOST(request)); }
export function DELETE(request: Request) { return debugRequest("account.passports", () => handleDELETE(request)); }
