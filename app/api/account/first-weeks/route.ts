import { readRequestText } from "../../../../src/http/request.ts";
import { debugRequest } from "../../../../src/agent/debug";
import { accountClient, privateJson, sameOrigin, storageConfigured, storageWriter } from "../../../../src/account/server";
import { firstWeekFromSession } from "../../../../src/account/first-weeks";
import { loadSession } from "../../../../src/agent/store";

export const runtime = "nodejs";
const uuid = (value:unknown):value is string => typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);

async function handleGET() {
  try {
    const client=await accountClient();
    const {data:{user},error:authError}=await client.auth.getUser();
    if(authError||!user)return privateJson({error:"Please sign in."},401);
    const {data,error}=await client.from("saved_first_weeks")
      .select("id,city,start_date,time_zone,days,created_at,updated_at")
      .eq("user_id",user.id)
      .gte("start_date",new Date(Date.now()-86400000).toISOString().slice(0,10))
      .order("start_date",{ascending:true}).limit(50);
    if(error)throw error;
    return privateJson({weeks:data??[]});
  } catch {
    return privateJson({error:"Saved First Weeks are unavailable. Run the latest setup.sql, then try again."},503);
  }
}

async function handlePOST(request:Request) {
  if(!sameOrigin(request))return privateJson({error:"Please use this app."},403);
  if(!storageConfigured())return privateJson({error:"Account storage is not configured. Your week is still here."},503);
  try {
    const client=await accountClient();
    const {data:{user},error:authError}=await client.auth.getUser();
    if(authError||!user)return privateJson({error:"Sign in to save your First Week."},401);
    const raw=await readRequestText(request,20_000);
    if(raw.length>20_000)return privateJson({error:"The week request is too large."},400);
    let body;
    try{body=JSON.parse(raw)}catch{return privateJson({error:"Choose a valid week to save."},400)}
    if(!body||!uuid(body.sessionId))return privateJson({error:"Build a Passport before saving your First Week."},400);
    let plan;
    try{
      const state=await loadSession(body.sessionId);
      const writer=storageWriter();
      let existingDays:unknown;
      let existingId:string|undefined;
      if(uuid(body.weekId)){
        const prior=await writer.from("saved_first_weeks").select("id,days").eq("id",body.weekId).eq("user_id",user.id).maybeSingle();
        if(prior.error)throw prior.error;
        existingDays=prior.data?.days;existingId=prior.data?.id;
      }
      if(!existingId&&typeof body.startDate==='string'){
        const prior=await writer.from("saved_first_weeks").select("days").eq("user_id",user.id).eq("city",state.city).eq("start_date",body.startDate).maybeSingle();
        if(prior.error)throw prior.error;
        existingDays=prior.data?.days;
      }
      plan=firstWeekFromSession(state,{revision:body.revision,startDate:body.startDate,days:body.days,roots:body.roots},new Date(),existingDays);
      body._existingWeekId=existingId;
    }
    catch(error){return privateJson({error:error instanceof Error?error.message:"Choose your stops again."},409)}
    const existingId=uuid(body._existingWeekId)?body._existingWeekId:undefined;
    const {data,error}=await storageWriter().from("saved_first_weeks")
      .upsert({...(existingId?{id:existingId}:{}),user_id:user.id,...plan,updated_at:new Date().toISOString()},{onConflict:existingId?"id":"user_id,city,start_date"})
      .select("id,city,start_date,time_zone,days,created_at,updated_at").single();
    if(error)throw error;
    return privateJson({saved:true,week:data});
  } catch (error) {
    if(error&&typeof error==='object'&&'code'in error&&['42P01','PGRST205','PGRST204'].includes(String((error as {code?:unknown}).code)))return privateJson({error:"Run the latest setup.sql in Supabase to enable saved First Weeks."},503);
    return privateJson({error:"Could not save this First Week. Your current selections remain on screen."},502);
  }
}

async function handleDELETE(request:Request) {
  if(!sameOrigin(request))return privateJson({error:"Please use this app."},403);
  try {
    const client=await accountClient();
    const {data:{user},error:authError}=await client.auth.getUser();
    if(authError||!user)return privateJson({error:"Please sign in."},401);
    const raw=await readRequestText(request,200);
    if(raw.length>200)return privateJson({error:"Choose a valid First Week."},400);
    let body;
    try{body=JSON.parse(raw)}catch{return privateJson({error:"Choose a valid First Week."},400)}
    if(!body||!uuid(body.id))return privateJson({error:"Choose a valid First Week."},400);
    const {data,error}=await client.from("saved_first_weeks").delete().eq("id",body.id).eq("user_id",user.id).select("id");
    if(error)throw error;
    if(!data?.length)return privateJson({error:"First Week not found."},404);
    return privateJson({deleted:true});
  }catch{return privateJson({error:"Could not delete this First Week."},502)}
}

export function GET(){return debugRequest("account.first_weeks",()=>handleGET())}
export function POST(request:Request){return debugRequest("account.first_weeks",()=>handlePOST(request))}
export function DELETE(request:Request){return debugRequest("account.first_weeks",()=>handleDELETE(request))}
