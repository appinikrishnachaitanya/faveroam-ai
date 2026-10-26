import 'server-only';
import {createHash,randomBytes} from 'node:crypto';
import {storageWriter} from '../account/server';
import {loadSession} from '../agent/store';
import {debugEvent} from '../agent/debug';
import {curatedThemes,relevantThemes} from '../passport/taste-themes';
import type {AgentState} from '../agent/types';
import type {Section} from '../passport/model';

const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const token=()=>randomBytes(24).toString('base64url');
const valid=(value:string)=>/^[a-zA-Z0-9_-]{32}$/.test(value);
export interface SharedSnapshot {version:1;city:string;interests:{name:string;types:string[]}[];themes:{id:string;name:string}[];cards:{id:string;name:string;section:Section;address?:string}[];createdAt:string}
export function shareSnapshot(state:AgentState):SharedSnapshot {
 const tags=state.cards.flatMap(card=>card.evidence?.result.tags??[]).filter(tag=>tag.id.startsWith('urn:tag:'));
 const themes=curatedThemes(relevantThemes(tags,state.selected)).slice(0,5).map(({id,name})=>({id,name}));
 const cards=[...new Map(state.cards.filter(card=>card.evidence?.result.id===card.id&&card.evidence.destination===state.city).map(card=>[card.id,card])).values()];
 const chosen=[...new Set(cards.map(card=>card.section))].flatMap(section=>cards.find(card=>card.section===section)??[]).slice(0,3);
 return {version:1,city:state.city,interests:state.selected.slice(0,5).map(({name,types})=>({name:name.slice(0,100),types:types.slice(0,3)})),themes,cards:chosen.map(({id,name,section,address})=>({id,name,section,...(address?{address}:{} )})),createdAt:new Date().toISOString()};
}
export async function createShare(sessionId:string,revision:number){
 const state=await loadSession(sessionId);
 if(state.revision!==revision)throw Error('Your Passport changed. Refresh before sharing.');
 const writer=storageWriter(),owner=hash(sessionId);
 const {count,error:countError}=await writer.from('share_links').select('*',{count:'exact',head:true}).eq('owner_session_hash',owner).gt('expires_at',new Date().toISOString());
 if(countError){debugEvent('share.create_failed',{reason:'storage-read'});throw Error('Share storage is not ready. Apply the share-links database script.');}
 if((count??0)>=5)throw Error('You have five active links. Revoke one before creating another.');
 const publicToken=token(),revokeToken=token(),snapshot=shareSnapshot(state);
 const expiresAt=new Date(Date.now()+14*24*60*60*1000).toISOString();
 const {error}=await writer.from('share_links').insert({token_hash:hash(publicToken),revoke_hash:hash(revokeToken),owner_session_hash:owner,snapshot,expires_at:expiresAt});
 if(error){debugEvent('share.create_failed',{reason:'storage-write'});throw Error('Could not create this share link.');}
 debugEvent('share.created');
 return {token:publicToken,revokeToken,expiresAt,snapshot};
}
export async function readShare(publicToken:string):Promise<SharedSnapshot|undefined>{
 if(!valid(publicToken))return;
 const {data,error}=await storageWriter().from('share_links').select('snapshot').eq('token_hash',hash(publicToken)).gt('expires_at',new Date().toISOString()).maybeSingle();
 if(error||!data)return;
 const snapshot=data.snapshot as SharedSnapshot;
 return snapshot?.version===1&&Array.isArray(snapshot.interests)?snapshot:undefined;
}
export async function revokeShare(publicToken:string,revokeToken:string){
 if(!valid(publicToken)||!valid(revokeToken))return false;
 const {data,error}=await storageWriter().from('share_links').delete().eq('token_hash',hash(publicToken)).eq('revoke_hash',hash(revokeToken)).select('token_hash').maybeSingle();
 return !error&&Boolean(data);
}
