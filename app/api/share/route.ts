import {browserRequestError,readRequestText} from '../../../src/http/request';
import {validSessionId} from '../../../src/agent/session-lifetime';
import {createShare,readShare,revokeShare,listAccountShares,revokeAccountShare} from '../../../src/share/links';
import {accountClient} from '../../../src/account/server';
import {accountName} from '../../../src/account/identity';
import {validDestination} from '../../../src/workspace/location';
export const runtime='nodejs';
const respond=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
export async function GET(request:Request){
 const url=new URL(request.url), value=url.searchParams.get('token')??'';
 if(url.searchParams.get('manage')==='true') {
   const city=url.searchParams.get('city');
   if(!validDestination(city))return respond({error:'Choose a city to view its shared links.'},400);
   try {const {data:{user},error}=await (await accountClient()).auth.getUser();if(error||!user)return respond({error:'Sign in to manage your share links.'},401);
     const page=Math.max(1,Math.min(1000,Number(url.searchParams.get('page'))||1));return respond(await listAccountShares(user.id,city,page));}
   catch{return respond({error:'Share links could not be loaded.'},503);}
 }
 try {const snapshot=await readShare(value);return snapshot?respond({snapshot}):respond({error:'This link is unavailable or expired.'},404);}
 catch {return respond({error:'Share links are unavailable right now.'},503);}
}
export async function POST(request:Request){
 const rejected=browserRequestError(request);if(rejected)return rejected;
 try {
   const {data:{user},error}=await (await accountClient()).auth.getUser();
   if(error||!user)return respond({error:'Sign in to share your FaveRoam.'},401);
   const ownerName=accountName(user.user_metadata?.first_name);
   const body=JSON.parse(await readRequestText(request,200));
   if(!validSessionId(body.sessionId)||!Number.isSafeInteger(body.revision))return respond({error:'Open your Passport before sharing.'},400);
   const shared=await createShare(body.sessionId,body.revision,ownerName,user.id);
   return respond(shared,201);
 }catch(error){return respond({error:error instanceof Error?error.message:'Could not share this Passport.'},503);}
}
export async function DELETE(request:Request){
 const rejected=browserRequestError(request);if(rejected)return rejected;
 try {const body=JSON.parse(await readRequestText(request,500));
   const {data:{user},error}=await (await accountClient()).auth.getUser();if(error||!user)return respond({error:'Sign in to manage your share links.'},401);
   const revoked=typeof body.token==='string'&&await revokeAccountShare(user.id,body.token);
   if(revoked)return respond({revoked:true});
   return typeof body.revokeToken==='string'&&await revokeShare(body.token,body.revokeToken)?respond({revoked:true}):respond({error:'The link could not be revoked.'},404);
 }catch{return respond({error:'Could not revoke this link.'},400);}
}
