"use client";
import {useEffect,useState} from 'react';
import type {Passport} from '../../src/workspace/state';
import {curatedThemes,relevantThemes} from '../../src/passport/taste-themes';
const escapeXml=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]!));
export default function ShareTasteCard({passport}:{passport:Passport}){
 const [share,setShare]=useState<{token:string;revokeToken:string;expiresAt:string}>();
 const [busy,setBusy]=useState(false),[status,setStatus]=useState('');
 useEffect(()=>{if(!passport.agent)return;try{const saved=JSON.parse(sessionStorage.getItem(`tastepassport:share:${passport.agent.sessionId}`)??'null');if(saved?.token&&saved?.revokeToken&&new Date(saved.expiresAt)>new Date())setShare(saved);}catch{}},[passport.agent?.sessionId]);
 const themes=curatedThemes(relevantThemes(passport.cards.flatMap(card=>card.evidence?.result.tags??[]),passport.selected)).slice(0,5);
 async function create(){if(!passport.agent)return;setBusy(true);setStatus('');try{
   const response=await fetch('/api/share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(passport.agent)});
   const data=await response.json();if(!response.ok)throw Error(data.error??'Could not create a link.');
   const next={token:data.token,revokeToken:data.revokeToken,expiresAt:data.expiresAt};setShare(next);try{sessionStorage.setItem(`tastepassport:share:${passport.agent.sessionId}`,JSON.stringify(next));}catch{}setStatus('Your read-only link is ready for 14 days.');
 }catch(error){setStatus(error instanceof Error?error.message:'Could not create a link.');}finally{setBusy(false);}}
 async function revoke(){if(!share)return;setBusy(true);try{const response=await fetch('/api/share',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:share.token,revokeToken:share.revokeToken})});if(!response.ok)throw Error();setShare(undefined);try{sessionStorage.removeItem(`tastepassport:share:${passport.agent?.sessionId}`);}catch{}setStatus('Link revoked.');}catch{setStatus('Could not revoke the link. Try again.');}finally{setBusy(false);}}
 async function copy(){if(!share)return;try{await navigator.clipboard.writeText(`${window.location.origin}/share/${share.token}`);setStatus('Link copied.');}catch{setStatus('Copy the link shown below.');}}
 function download(){const lines=themes.map(theme=>theme.name);const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#193e31"/><path d="M80 172C350 80 450 360 710 250S1020 180 1120 110" fill="none" stroke="#dfb776" stroke-width="8"/><text x="80" y="95" fill="#dfb776" font-family="Georgia,serif" font-size="38">TastePassport AI</text><text x="80" y="355" fill="#fffaf0" font-family="Georgia,serif" font-size="58">My taste in ${escapeXml(passport.city)}</text>${lines.map((line,index)=>`<text x="80" y="${420+index*35}" fill="#e4eedf" font-family="Arial,sans-serif" font-size="26">${escapeXml(line.slice(0,65))}</text>`).join('')}<text x="80" y="605" fill="#dfb776" font-family="Arial,sans-serif" font-size="18">Returned cultural themes · not a personality score</text></svg>`;const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));const link=document.createElement('a');link.href=url;link.download='my-tastepassport-card.svg';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className="share-taste-card" aria-labelledby="share-taste-title"><span className="micro-label">YOUR TASTES, READY TO SHARE</span><h3 id="share-taste-title">Share my TastePassport</h3><p>This read-only card shares {passport.selected.map(taste=>taste.name).join(', ')}, up to five returned themes and a few current discoveries. It never includes your account or conversation.</p>
   <div className="share-theme-preview">{themes.length?themes.map(theme=><span key={theme.id}>{theme.name}</span>):<span>No distinct returned themes yet. Your confirmed tastes can still be shared.</span>}</div>
   <div className="share-actions"><button type="button" className="primary-button" disabled={busy||!passport.agent} onClick={()=>void create()}>{busy?'Preparing link…':'Create read-only link'}</button><button type="button" className="quiet-button" onClick={download}>Download taste card</button></div>
   {share&&<div className="share-link-result"><label>Share link<input readOnly value={`${typeof window==='undefined'?'':window.location.origin}/share/${share.token}`} onFocus={event=>event.target.select()}/></label><button type="button" className="quiet-button" onClick={()=>void copy()}>Copy link</button><button type="button" className="text-button" disabled={busy} onClick={()=>void revoke()}>Revoke link</button><small>Expires {new Date(share.expiresAt).toLocaleDateString()}</small></div>}
   {status&&<p role="status">{status}</p>}
 </section>;
}
