import 'server-only';
import {createHash,randomBytes} from 'node:crypto';
import {storageWriter} from '../account/server';
import {loadSession} from '../agent/store';
import {debugEvent} from '../agent/debug';
import {curatedThemes,relevantThemes} from '../passport/taste-themes';
import type {AgentState} from '../agent/types';
import {sectionTypes,type Section} from '../passport/model';

const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const token=()=>randomBytes(24).toString('base64url');
const valid=(value:string)=>/^[a-zA-Z0-9_-]{32}$/.test(value);
export interface SharedSnapshot {version:1;city:string;ownerName?:string;interests:{name:string;types:string[]}[];themes:{id:string;name:string}[];cards:{id:string;name:string;section:Section;address?:string}[];createdAt:string}
export function shareSnapshot(state:AgentState,ownerName?:string):SharedSnapshot {
 const tags=state.cards.flatMap(card=>card.evidence?.result.tags??[]).filter(tag=>tag.id.startsWith('urn:tag:'));
 const themes=curatedThemes(relevantThemes(tags,state.selected)).slice(0,5).map(({id,name})=>({id,name}));
 const cards=[...new Map(state.cards.filter(card=>card.evidence?.result.id===card.id&&card.evidence.destination===state.city).map(card=>[card.id,card])).values()];
 const chosen=[...new Set(cards.map(card=>card.section))].flatMap(section=>cards.find(card=>card.section===section)??[]).slice(0,3);
 return {version:1,city:state.city,...(ownerName?{ownerName}:{}),interests:state.selected.slice(0,5).map(({name,types})=>({name:name.slice(0,100),types:types.slice(0,3)})),themes,cards:chosen.map(({id,name,section,address})=>({id,name,section,...(address?{address}:{} )})),createdAt:new Date().toISOString()};
}
export async function createShare(sessionId:string,revision:number,ownerName:string,ownerUserId:string){
 const state=await loadSession(sessionId);
 if(state.revision!==revision)throw Error('Your Passport changed. Refresh before sharing.');
 const writer=storageWriter(),owner=hash(sessionId);
 const {count,error:countError}=await writer.from('share_links').select('*',{count:'exact',head:true}).eq('owner_user_id',ownerUserId).is('revoked_at',null).gt('expires_at',new Date().toISOString());
 if(countError){debugEvent('share.create_failed',{reason:'storage-read'});throw Error('Share storage is not ready. Apply the share-links database script.');}
 if((count??0)>=5)throw Error('You have five active links. Revoke one before creating another.');
 const publicToken=token(),revokeToken=token(),snapshot=shareSnapshot(state,ownerName);
 const expiresAt=new Date(Date.now()+14*24*60*60*1000).toISOString();
 const {error}=await writer.from('share_links').insert({token_hash:hash(publicToken),public_token:publicToken,revoke_hash:hash(revokeToken),owner_session_hash:owner,owner_user_id:ownerUserId,snapshot,expires_at:expiresAt});
 if(error){debugEvent('share.create_failed',{reason:'storage-write'});throw Error('Could not create this share link.');}
 debugEvent('share.created');
 return {token:publicToken,revokeToken,expiresAt,snapshot};
}
export async function readShare(publicToken:string):Promise<SharedSnapshot|undefined>{
 if(!valid(publicToken))return;
 const {data,error}=await storageWriter().from('share_links').select('snapshot').eq('token_hash',hash(publicToken)).is('revoked_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();
 if(error||!data)return;
 const snapshot=data.snapshot as SharedSnapshot;
 if(snapshot?.version!==1||typeof snapshot.city!=='string'||!Array.isArray(snapshot.interests)||!Array.isArray(snapshot.themes)||!Array.isArray(snapshot.cards))return;
 if(snapshot.ownerName!==undefined&&(typeof snapshot.ownerName!=='string'||snapshot.ownerName.length>80))return;
 if(snapshot.interests.some(value=>!value||typeof value.name!=='string'||!Array.isArray(value.types)||value.types.some(type=>typeof type!=='string')))return;
 if(snapshot.themes.some(value=>!value||typeof value.id!=='string'||typeof value.name!=='string'))return;
 if(snapshot.cards.some(value=>!value||typeof value.id!=='string'||typeof value.name!=='string'||!Object.hasOwn(sectionTypes,value.section)||(value.address!==undefined&&typeof value.address!=='string')))return;
 return snapshot;
}
export async function revokeShare(publicToken:string,revokeToken:string){
 if(!valid(publicToken)||!valid(revokeToken))return false;
 const {data,error}=await storageWriter().from('share_links').delete().eq('token_hash',hash(publicToken)).eq('revoke_hash',hash(revokeToken)).select('token_hash').maybeSingle();
 return !error&&Boolean(data);
}
export async function listAccountShares(userId:string,page:number,pageSize=8){
 const start=(page-1)*pageSize;
 const writer=storageWriter();
 const [listed,activeCount,revokedCount,totalCount]=await Promise.all([
   writer.from('share_links').select('public_token,created_at,expires_at,revoked_at,snapshot',{count:'exact'}).eq('owner_user_id',userId).order('created_at',{ascending:false}).range(start,start+pageSize-1),
   writer.from('share_links').select('*',{count:'exact',head:true}).eq('owner_user_id',userId).is('revoked_at',null).gt('expires_at',new Date().toISOString()),
   writer.from('share_links').select('*',{count:'exact',head:true}).eq('owner_user_id',userId).not('revoked_at','is',null),
   writer.from('share_links').select('*',{count:'exact',head:true}).eq('owner_user_id',userId),
 ]);
 const {data,error}=listed;
 if(error)throw Error('Share links could not be loaded.');
 const now=Date.now();
 if(activeCount.error||revokedCount.error||totalCount.error)throw Error('Share link totals could not be loaded.');
 return {items:(data??[]).map((row:any)=>({urlToken:row.public_token,createdAt:row.created_at,expiresAt:row.expires_at,status:row.revoked_at?'revoked':new Date(row.expires_at).getTime()<=now?'expired':'active',city:row.snapshot?.city??'Your city'})),total:totalCount.count??0,counts:{active:activeCount.count??0,revoked:revokedCount.count??0},page,pageSize};
}
export async function revokeAccountShare(userId:string,publicToken:string){
 if(!valid(publicToken))return false;
 const {data,error}=await storageWriter().from('share_links').update({revoked_at:new Date().toISOString()}).eq('owner_user_id',userId).eq('token_hash',hash(publicToken)).is('revoked_at',null).select('token_hash').maybeSingle();
 return !error&&Boolean(data);
}
