import { debugRequest } from "../../../../src/agent/debug";
import { accountRows, currentUser, gcpAccountConfigured, stableId } from "../../../../src/account/gcp";
import { sameOrigin } from "../../../../src/account/policy";
import { privateJson } from "../../../../src/account/server";
import { loadSession } from "../../../../src/agent/store";
import { planFromSession } from "../../../../src/account/plans";

export const runtime = "nodejs";
const uuid = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);

async function handleGET() {
  if (!gcpAccountConfigured()) return privateJson({ error: "Saved plans are unavailable." }, 503);
  try {
    const user = await currentUser();
    if (!user) return privateJson({ error: "Please sign in." }, 401);
    const rows = await accountRows(user.uid, "plans").orderBy("scheduled_date").limit(100).get();
    const today = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    return privateJson({ plans: rows.docs.filter(row => String(row.data().scheduled_date) >= today).map(row => ({ id: row.id, ...row.data() })) });
  } catch { return privateJson({ error: "Saved plans are temporarily unavailable. Please try again later." }, 503); }
}

async function handlePOST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "Please use this app." }, 403);
  if (!gcpAccountConfigured()) return privateJson({ error: "Plan saving is not configured. You can still download your plan." }, 503);
  try {
    const user = await currentUser();
    if (!user) return privateJson({ error: "Please sign in to save your plan." }, 401);
    const raw = await request.text();
    if (raw.length > 1500) return privateJson({ error: "Invalid plan request." }, 400);
    const body = JSON.parse(raw) as Record<string, unknown>;
    if (!uuid(body.sessionId)) return privateJson({ error: "Build a Passport before saving a plan." }, 400);
    let plan;
    try { plan = planFromSession(await loadSession(body.sessionId), body); }
    catch (error) { return privateJson({ error: error instanceof Error ? error.message : "Choose your stops again." }, 409); }
    const id = stableId(`${user.uid}:${plan.city.toLowerCase()}:${plan.scheduled_date}`);
    const row = accountRows(user.uid, "plans").doc(id);
    const previous = await row.get();
    const saved = { id, ...plan, created_at: previous.data()?.created_at ?? new Date().toISOString() };
    await row.set(saved);
    return privateJson({ saved: true, plan: saved });
  } catch { return privateJson({ error: "Could not save your plan. Your selections are preserved; please try again." }, 502); }
}

async function handleDELETE(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "Please use this app." }, 403);
  try {
    const raw = await request.text();
    if (raw.length > 200) return privateJson({ error: "Invalid plan." }, 400);
    const body = JSON.parse(raw) as Record<string, unknown>;
    if (!uuid(body.id)) return privateJson({ error: "Invalid plan." }, 400);
    const user = await currentUser();
    if (!user) return privateJson({ error: "Please sign in." }, 401);
    const row = accountRows(user.uid, "plans").doc(body.id);
    if (!(await row.get()).exists) return privateJson({ error: "Plan not found." }, 404);
    await row.delete();
    return privateJson({ deleted: true });
  } catch { return privateJson({ error: "Could not delete your plan." }, 502); }
}

export function GET() { return debugRequest("account.plans", handleGET); }
export function POST(request: Request) { return debugRequest("account.plans", () => handlePOST(request)); }
export function DELETE(request: Request) { return debugRequest("account.plans", () => handleDELETE(request)); }
