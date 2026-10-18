import { debugRequest } from "../../../../src/agent/debug";
import {
  accountClient,
  accountConfigured,
  storageConfigured,
  storageWriter,
  sameOrigin,
  privateJson,
} from "../../../../src/account/server";
import { getSession } from "../../../../src/agent/store";
import {
  passportSnapshot,
  restoreSnapshot,
} from "../../../../src/account/snapshot";
import { registerRestoredSession } from "../../../../src/agent/store";
import { passportView } from "../../../../src/workspace/state";
export const runtime = "nodejs";
async function handleGET() {
  if (!accountConfigured())
    return privateJson({ error: "Accounts are not configured." }, 503);
  try {
    const client = await accountClient();
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();
    if (authError || !user)
      return privateJson({ error: "Please sign in." }, 401);
    const { data, error } = await client
      .from("saved_passports")
      .select("id,city,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw Error();
    return privateJson({ passports: data });
  } catch {
    return privateJson(
      { error: "Saved Passports are temporarily unavailable." },
      503,
    );
  }
}
async function handlePOST(request: Request) {
  if (!sameOrigin(request))
    return privateJson({ error: "Please use this app." }, 403);
  if (!storageConfigured())
    return privateJson(
      {
        error:
          "Account saving is not configured yet. Your current Passport is preserved.",
      },
      503,
    );
  try {
    const raw = await request.text();
    if (raw.length > 1000)
      return privateJson({ error: "Invalid save request." }, 400);
    const b = JSON.parse(raw);
    const client = await accountClient();
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();
    if (authError || !user)
      return privateJson({ error: "Please sign in." }, 401);
    if (b.action === "restore") {
      if (typeof b.id !== "string" || !uuid(b.id))
        return privateJson({ error: "Invalid Passport." }, 400);
      const { data, error } = await client
        .from("saved_passports")
        .select("snapshot")
        .eq("id", b.id)
        .eq("user_id", user.id)
        .single();
      if (error || !data)
        return privateJson({ error: "Saved Passport not found." }, 404);
      const state = restoreSnapshot(data.snapshot);
      registerRestoredSession(state);
      return privateJson({
        passport: passportView(
          state,
          "Restored from your saved Qloo evidence.",
        ),
      });
    }
    if (
      b.action !== "save" ||
      typeof b.sessionId !== "string" ||
      !Number.isInteger(b.revision)
    )
      return privateJson({ error: "Invalid save request." }, 400);
    const state = getSession(b.sessionId);
    if (state.revision !== b.revision)
      return privateJson(
        { error: "Your Passport changed. Save the latest version." },
        409,
      );
    const snapshot = passportSnapshot(state);
    const { error } = await storageWriter().from("saved_passports").upsert(
      {
        user_id: user.id,
        city: state.city,
        snapshot,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,city" },
    );
    if (error) {
      if (error.code === "23514")
        return privateJson({ error: "Account storage needs a database update for this destination. Your Passport is preserved; contact the app owner." }, 503);
      throw Error();
    }
    return privateJson({ saved: true, city: state.city });
  } catch {
    return privateJson(
      {
        error: "Could not save or restore. Your current Passport is preserved.",
      },
      502,
    );
  }
}
async function handleDELETE(request: Request) {
  if (!sameOrigin(request))
    return privateJson({ error: "Please use this app." }, 403);
  try {
    const raw = await request.text();
    if (raw.length > 200)
      return privateJson({ error: "Invalid request." }, 400);
    const b = JSON.parse(raw);
    if (typeof b.id !== "string" || !uuid(b.id))
      return privateJson({ error: "Invalid Passport." }, 400);
    const client = await accountClient();
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();
    if (authError || !user)
      return privateJson({ error: "Please sign in." }, 401);
    const { data, error } = await client
      .from("saved_passports")
      .delete()
      .eq("id", b.id)
      .eq("user_id", user.id)
      .select("id");
    if (error) throw Error();
    if (!data?.length)
      return privateJson({ error: "Passport not found." }, 404);
    return privateJson({ deleted: true });
  } catch {
    return privateJson({ error: "Could not delete that saved Passport." }, 502);
  }
}
function uuid(value: string) {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
    value,
  );
}

export function GET() {
  return debugRequest("account.passports", () => handleGET());
}

export function POST(request: Request) {
  return debugRequest("account.passports", () => handlePOST(request));
}

export function DELETE(request: Request) {
  return debugRequest("account.passports", () => handleDELETE(request));
}
