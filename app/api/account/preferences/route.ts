import { catalogCity } from "../../../../src/workspace/destinations";
import { accountClient, storageConfigured, storageWriter, privateJson, sameOrigin } from "../../../../src/account/server";
import { portableTasteProfile, readTasteProfile } from "../../../../src/account/taste-profile";
import { createSession, getSession } from "../../../../src/agent/store";
import { normalizeSession } from "../../../../src/agent/session";
import { passport, seal } from "../../../../src/passport/service";
import { discoverSection } from "../../../../src/agent/runtime";
import { passportView, sectionOrder } from "../../../../src/workspace/state";
import { debugRequest } from "../../../../src/agent/debug";
export const runtime = "nodejs";

async function handle(request: Request) {
  if (request.method !== "GET" && !sameOrigin(request)) return privateJson({error:"Please use this app."},403);
  if (!storageConfigured()) return privateJson({error:"Reusable tastes need account storage to be configured."},503);
  try {
    const client = await accountClient();
    const {data:{user},error:authError} = await client.auth.getUser();
    if (authError || !user) return privateJson({error:"Sign in to use saved tastes."},401);
    if (request.method === "DELETE") {
      const {error} = await client.from("taste_profiles").delete().eq("user_id",user.id);
      if (error) throw Error();
      return privateJson({deleted:true});
    }
    let body: Record<string,unknown> = {};
    if (request.method === "POST") {
      const raw = await request.text();
      if (raw.length > 1000) return privateJson({error:"Invalid taste profile request."},400);
      body = JSON.parse(raw);
    }
    if (body.action === "save") {
      if (typeof body.sessionId !== "string" || !Number.isInteger(body.revision)) return privateJson({error:"Build a Passport first."},400);
      const state = getSession(body.sessionId);
      if (state.revision !== body.revision) return privateJson({error:"Your Passport changed. Save its latest tastes."},409);
      const profile = portableTasteProfile(state);
      const {error} = await storageWriter().from("taste_profiles").upsert({user_id:user.id,profile,updated_at:new Date().toISOString()},{onConflict:"user_id"});
      if (error) throw Error();
      return privateJson({saved:true,profile});
    }
    const {data,error} = await client.from("taste_profiles").select("profile").eq("user_id",user.id).maybeSingle();
    if (error) throw Error();
    if (request.method === "GET") return privateJson({profile:data ? readTasteProfile(data.profile) : null});
    const city = body.action === "apply" ? await catalogCity(body.city) : undefined;
    if (body.action !== "apply" || !city) return privateJson({error:"Choose a supported destination."},400);
    if (!data) return privateJson({error:"Save your tastes from a Passport first."},404);
    const profile = readTasteProfile(data.profile);
    const items = profile.selected.map(c=>({query:c.name,candidates:[c]}));
    const initial = await passport(city,seal(items),profile.selected.map(c=>c.id),profile.constraints,profile.activeCategories.filter(s=>!profile.hiddenCategories.includes(s)).slice(0,5));
    const working = normalizeSession({...profile,id:"profile-discovery",revision:0,expires:0,city,cards:[],previous:[],feedback:[],notices:[...initial.notices]});
    const sections = sectionOrder.filter(section=>!profile.hiddenCategories.includes(section) &&
      (profile.activeCategories.includes(section) || initial.cards.some(c=>c.section===section) || Boolean(profile.categoryTags[section]?.length) || Boolean(profile.queryPreferences[section])));
    const signal = AbortSignal.any([request.signal,AbortSignal.timeout(75000)]);
    const results = await Promise.all(sections.map(async section=>{
      try {
        const local=normalizeSession(structuredClone(working));
        local.intent={kind:"refine",seeds:[],concepts:profile.categoryConcepts[section] ?? [],constraints:profile.categoryConstraints[section] ?? profile.constraints,sections:[section],strategy:"discover"};
        const found=await discoverSection(local,section,local.intent.constraints,[],false,signal);
        working.notices.push(...local.notices.filter(notice=>!working.notices.includes(notice)));
        return found;
      }
      catch { working.notices.push(`${section} could not be refreshed with your saved preferences.`); return []; }
    }));
    signal.throwIfAborted();
    const cards = [...new Map(results.flat().map(c=>[c.id,c])).values()];
    const state = createSession({...initial,cards,notices:working.notices},profile.constraints);
    Object.assign(state,profile);
    return privateJson({passport:passportView(state,"Fresh discoveries using your reusable taste profile.")});
  } catch {
    return privateJson({error:"Saved tastes are temporarily unavailable. If this is new, apply the taste_profiles database migration. Your current Passport is preserved."},503);
  }
}
export function GET(request: Request) { return debugRequest("account.preferences",()=>handle(request)); }
export function POST(request: Request) { return debugRequest("account.preferences",()=>handle(request)); }
export function DELETE(request: Request) { return debugRequest("account.preferences",()=>handle(request)); }
