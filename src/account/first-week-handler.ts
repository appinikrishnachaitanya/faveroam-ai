import {readRequestText} from '../http/request';
import {accountClient,privateJson,sameOrigin,storageConfigured,storageWriter} from './server';
import {firstWeekFromSession} from './first-weeks';
import {loadSession} from '../agent/store';
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
const defaultDependencies={identity:async()=>{const client=await accountClient();const {data:{user},error}=await client.auth.getUser();return error?undefined:user??undefined;},configured:storageConfigured,writer:storageWriter,loadSession};
export async function firstWeekSaveHandler(request:Request,deps=defaultDependencies) {
  if(!sameOrigin(request))return privateJson({error:"Please use this app."},403);
  if(!deps.configured())return privateJson({error:"Account storage is not configured. Your week is still here."},503);
  try {
    const user=await deps.identity();
    if(!user)return privateJson({error:"Sign in to save your First Week."},401);
    const raw=await readRequestText(request,20_000);
    if(raw.length>20_000)return privateJson({error:"The week request is too large."},400);
    let body;
    try{body=JSON.parse(raw)}catch{return privateJson({error:"Choose a valid week to save."},400)}
    if(!body||!uuid(body.sessionId))return privateJson({error:"Build a Passport before saving your First Week."},400);
    let state;
    try{state=await deps.loadSession(body.sessionId);}catch{return privateJson({error:"Reconnect your Passport before saving this week. Your selected stops are still here."},409);}
    const writer=deps.writer();
    let existingDays:unknown;
    let existingId:string|undefined;
    if(body.weekId!==undefined){
      if(!uuid(body.weekId))return privateJson({error:"Choose a valid saved week."},400);
      const prior=await writer.from("saved_first_weeks").select("id,days").eq("id",body.weekId).eq("user_id",user.id).maybeSingle();
      if(prior.error)throw prior.error;
      if(!prior.data)return privateJson({error:"Saved week not found. Reopen it from your account."},404);
      existingDays=prior.data.days;existingId=prior.data.id;
    }
    if(!existingId&&typeof body.startDate==='string'){
      const prior=await writer.from("saved_first_weeks").select("days").eq("user_id",user.id).eq("city",state.city).eq("start_date",body.startDate).maybeSingle();
      if(prior.error)throw prior.error;
      existingDays=prior.data?.days;
    }
    let plan;
    try{plan=firstWeekFromSession(state,{revision:body.revision,startDate:body.startDate,days:body.days,roots:body.roots},new Date(),existingDays);}
    catch(error){return privateJson({error:error instanceof Error?error.message:"Review the highlighted week details and try again."},409);}
    const {data,error}=await deps.writer().from("saved_first_weeks")
      .upsert({...(existingId?{id:existingId}:{}),user_id:user.id,...plan,updated_at:new Date().toISOString()},{onConflict:existingId?"id":"user_id,city,start_date"})
      .select("id,city,start_date,time_zone,days,created_at,updated_at").single();
    if(error)throw error;
    return privateJson({saved:true,week:data});
  } catch (error) {
    if(error&&typeof error==='object'&&'code'in error&&['42P01','PGRST205','PGRST204'].includes(String((error as {code?:unknown}).code)))return privateJson({error:"We couldn’t save this week right now. Your selected stops are safe. Please try again shortly.",code:"WEEK_STORAGE_NOT_READY"},503);
    return privateJson({error:"Could not save this First Week. Your current selections remain on screen."},502);
  }
}
