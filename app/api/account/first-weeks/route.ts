import { readRequestText } from "../../../../src/http/request.ts";
import { debugRequest } from "../../../../src/agent/debug";
import { accountClient, privateJson, sameOrigin } from "../../../../src/account/server";
import {firstWeekSaveHandler} from "../../../../src/account/first-week-handler";

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
      .gte("start_date",new Date(Date.now()-7*86400000).toISOString().slice(0,10))
      .order("start_date",{ascending:true}).limit(50);
    if(error)throw error;
    return privateJson({weeks:data??[]});
  } catch {
    return privateJson({error:"Your saved weeks could not load. Your current week is safe. Please try again shortly."},503);
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
export function POST(request:Request){return debugRequest("account.first_weeks",()=>firstWeekSaveHandler(request))}
export function DELETE(request:Request){return debugRequest("account.first_weeks",()=>handleDELETE(request))}
