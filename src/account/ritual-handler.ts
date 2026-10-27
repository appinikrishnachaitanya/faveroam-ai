import {accountClient,privateJson,sameOrigin,storageWriter} from './server';
import {readRequestText} from '../http/request';
import {loadSession} from '../agent/store';
import {discoverSection} from '../agent/runtime';
import {ritualFields,ritualFromSession,ritualReplacementState,ritualContext,verifiedRitualCard,type Ritual,type RitualContext} from './rituals';
const fields='id,name,city,weekday,recurrence,status,card,created_at,updated_at';
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const defaultDependencies={
 identity:async()=>{const client=await accountClient();const {data:{user},error}=await client.auth.getUser();return error?undefined:user??undefined;},
 writer:storageWriter,loadSession,discoverSection,
};
export async function ritualHandler(request?:Request,deps=defaultDependencies){
 if(request&&!sameOrigin(request))return privateJson({error:'Please use this app.'},403);
 try{
  const user=await deps.identity();
  if(!user)return privateJson({error:'Sign in to keep your rituals.',signInRequired:true},401);
  const writer=deps.writer();
  if(!request){const {data,error}=await writer.from('saved_rituals').select(fields).eq('user_id',user.id).order('created_at',{ascending:false}).limit(50);if(error)throw error;return privateJson({rituals:data??[]});}
  let body:Record<string,unknown>;
  try{body=JSON.parse(await readRequestText(request,6000));if(!body||typeof body!=='object'||Array.isArray(body))throw Error();}catch{return privateJson({error:'Choose a valid ritual action.'},400);}
  if(body.action==='create'){
   if(!uuid(body.sessionId))return privateJson({error:'Open a Passport first.'},400);
   const count=await writer.from('saved_rituals').select('id',{head:true,count:'exact'}).eq('user_id',user.id);if(count.error)throw count.error;
   if((count.count??0)>=50)return privateJson({error:'You have 50 rituals. Remove one before adding another.'},409);
   let value;try{value=ritualFromSession(await deps.loadSession(body.sessionId),body);}catch{return privateJson({error:'Choose a place saved to My Vibe, a name, weekday and recurrence from your latest Passport.'},409);}
   const {data,error}=await writer.from('saved_rituals').insert({user_id:user.id,...value}).select(fields).single();if(error)throw error;return privateJson({ritual:data});
  }
  if(!uuid(body.id))return privateJson({error:'Choose a ritual.'},400);
  const prior=await writer.from('saved_rituals').select(`${fields},context`).eq('id',body.id).eq('user_id',user.id).maybeSingle();if(prior.error)throw prior.error;
  if(!prior.data)return privateJson({error:'Ritual not found.'},404);
  const ritual=prior.data as unknown as Ritual&{context:RitualContext};
  if(body.updatedAt!==ritual.updated_at)return privateJson({error:'This ritual has changed. Refresh your rituals and try again.'},409);
  if(body.action==='replace'){
   if(!uuid(body.sessionId))return privateJson({error:'Open a Passport first.'},400);
   let state;try{state=ritualReplacementState(await deps.loadSession(body.sessionId),ritual,ritual.context);}catch{return privateJson({error:`Open your ${ritual.city} Passport to find an alternative.`},409);}
   let cards;try{cards=await deps.discoverSection(state,ritual.card.section,state.categoryConstraints[ritual.card.section]??state.constraints,[...new Set(state.feedback.filter(f=>!f.accepted).map(f=>f.id))],false,AbortSignal.timeout(60000));}catch{return privateJson({error:'The place search could not finish. Your ritual is unchanged. Try again in a moment.'},502);}
   const rejected=new Set(state.feedback.filter(f=>!f.accepted).map(f=>f.id));
   const alternatives=cards.filter(c=>c.section===ritual.card.section&&!rejected.has(c.id)).filter(c=>c.evidence?.source==='Qloo'&&c.evidence.result.id===c.id&&c.evidence.destination===ritual.city).slice(0,3).map(c=>verifiedRitualCard(c,ritual.city));
   const receipt={retrievals:1,candidateCount:alternatives.length,steps:['Verified signed-in ownership and current ritual version.',`Loaded ${state.selected.length} saved confirmed cultural interests.`,`Applied ${ritual.card.section} preferences and geographic filters; excluded rejected places.`,`Ran one Qloo discovery workflow (which may make multiple network requests).`,`Validated ${alternatives.length} returned alternatives for the same city and category.`,`No ritual or plan has changed. Approval is required.`]};
   if(!alternatives.length)return privateJson({alternatives:[],receipt});
   const proposal=await writer.from('ritual_replacement_proposals').upsert({user_id:user.id,ritual_id:ritual.id,original_updated_at:ritual.updated_at,alternatives,context:ritualContext(state),expires_at:new Date(Date.now()+10*60000).toISOString()},{onConflict:'user_id,ritual_id'}).select('id').single();if(proposal.error)throw proposal.error;
   return privateJson({proposalId:proposal.data.id,alternatives,receipt});
  }
  if(body.action==='delete'){
   const result=await writer.from('saved_rituals').delete().eq('id',ritual.id).eq('user_id',user.id).eq('updated_at',ritual.updated_at).select('id');if(result.error)throw result.error;
   return result.data?.length?privateJson({deleted:true}):privateJson({error:'The ritual changed. Refresh and try again.'},409);
  }
  let patch:Record<string,unknown>;
  if(body.action==='approve'){
   if(!uuid(body.proposalId)||typeof body.cardId!=='string')return privateJson({error:'Choose an offered alternative.'},400);
   const proposal=await writer.from('ritual_replacement_proposals').select('alternatives,context,original_updated_at').eq('id',body.proposalId).eq('ritual_id',ritual.id).eq('user_id',user.id).gt('expires_at',new Date().toISOString()).maybeSingle();if(proposal.error)throw proposal.error;
   if(!proposal.data||proposal.data.original_updated_at!==ritual.updated_at)return privateJson({error:'These alternatives expired or the ritual changed. Search again.'},409);
   const card=(proposal.data.alternatives as Ritual['card'][]).find(c=>c.id===body.cardId);if(!card)return privateJson({error:'Choose an offered alternative.'},400);
   patch={card:verifiedRitualCard(card,ritual.city),context:proposal.data.context,status:'planned'};
  }else if(body.action==='update'){
   try{patch=ritualFields(body);}catch{return privateJson({error:'Choose a name, weekday, recurrence and status.'},400);}
  }else return privateJson({error:'Choose a valid ritual action.'},400);
  const saved=await writer.from('saved_rituals').update({...patch,updated_at:new Date(Math.max(Date.now(),Date.parse(ritual.updated_at)+1)).toISOString()}).eq('id',ritual.id).eq('user_id',user.id).eq('updated_at',ritual.updated_at).select(fields).maybeSingle();if(saved.error)throw saved.error;
  if(!saved.data)return privateJson({error:'This ritual changed. Refresh and try again.'},409);
  if(body.action==='approve')await writer.from('ritual_replacement_proposals').delete().eq('ritual_id',ritual.id).eq('user_id',user.id);
  return privateJson({ritual:saved.data});
 }catch{return privateJson({error:'We couldn’t connect to your saved rituals. Your plans are safe. Please try again shortly.',code:'RITUAL_STORAGE_UNAVAILABLE'},503);}
}
