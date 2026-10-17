import { accountClient, storageConfigured, storageWriter, sameOrigin, privateJson } from "../../../../src/account/server";
import { getSession } from "../../../../src/agent/store";
import { planFromSession } from "../../../../src/account/plans";
export const runtime = "nodejs";
const uuid = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
export async function GET() {
  try {
    const client = await accountClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return privateJson({ error: "Please sign in." }, 401);
    const { data, error } = await client.from("saved_plans")
      .select("id,city,scheduled_date,time_zone,stops,created_at").eq("user_id", user.id)
      .gte("scheduled_date", new Date(Date.now() - 86400000).toISOString().slice(0, 10))
      .order("scheduled_date", { ascending: true }).limit(100);
    if (error) throw Error();
    return privateJson({ plans: data });
  } catch { return privateJson({ error: "Saved plans are temporarily unavailable. Please try again later." }, 503); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "Please use this app." }, 403);
  if (!storageConfigured()) return privateJson({ error: "Plan saving is not configured. You can still download your plan." }, 503);
  try {
    const client = await accountClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return privateJson({ error: "Please sign in to save your plan." }, 401);
    const raw = await request.text();
    if (raw.length > 1500) return privateJson({ error: "Invalid plan request." }, 400);
    let b;
    try { b = JSON.parse(raw); } catch { return privateJson({ error: "Invalid plan request." }, 400); }
    if (!b || !uuid(b.sessionId)) return privateJson({ error: "Build a Passport before saving a plan." }, 400);
    let plan;
    try { plan = planFromSession(getSession(b.sessionId), b); }
    catch (error) { return privateJson({ error: error instanceof Error ? error.message : "Choose your stops again." }, 409); }
    const { data, error } = await storageWriter().from("saved_plans")
      .upsert({ user_id: user.id, ...plan }, { onConflict: "user_id,city,scheduled_date" }).select("id").single();
    if (error) throw Error();
    return privateJson({ saved: true, id: data.id });
  } catch { return privateJson({ error: "Could not save your plan. Your selections are preserved; please try again." }, 502); }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "Please use this app." }, 403);
  try {
    const client = await accountClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return privateJson({ error: "Please sign in." }, 401);
    const raw = await request.text();
    if (raw.length > 200) return privateJson({ error: "Invalid plan." }, 400);
    const b = JSON.parse(raw);
    if (!b || !uuid(b.id)) return privateJson({ error: "Invalid plan." }, 400);
    const { data, error } = await client.from("saved_plans").delete().eq("id", b.id).eq("user_id", user.id).select("id");
    if (error) throw Error();
    if (!data?.length) return privateJson({ error: "Plan not found." }, 404);
    return privateJson({ deleted: true });
  } catch { return privateJson({ error: "Could not delete your plan." }, 502); }
}
