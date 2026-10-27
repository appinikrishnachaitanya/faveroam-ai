"use client";
import {memo,useEffect,useMemo,useState} from 'react';
import type {Passport} from '../../src/workspace/state';
import {curatedThemes,relevantThemes} from '../../src/passport/taste-themes';
import {tasteCardPng,tasteCardSvg} from '../../src/share/card-image';

type Link={token:string;revokeToken:string;expiresAt:string};
export default memo(function ShareTasteCard({passport,ownerName}:{passport:Passport;ownerName?:string}){
 const [share,setShare]=useState<Link>();
 const [busy,setBusy]=useState(false),[status,setStatus]=useState('');
 useEffect(()=>{if(!passport.agent)return;try{const saved=JSON.parse(sessionStorage.getItem(`tastepassport:share:${passport.agent.sessionId}`)??'null');if(saved?.token&&saved?.revokeToken&&new Date(saved.expiresAt)>new Date())setShare(saved);}catch{}},[passport.agent?.sessionId]);
 const themes=useMemo(()=>curatedThemes(relevantThemes(passport.cards.flatMap(card=>card.evidence?.result.tags??[]),passport.selected)).slice(0,5),[passport.cards,passport.selected]);
 const tasteNames=passport.selected.map(taste=>taste.name);
 const image=()=>tasteCardSvg(passport.city,themes.map(theme=>theme.name),tasteNames,ownerName);
 function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function download(){if(!ownerName)return;setBusy(true);setStatus('');try{downloadBlob(await tasteCardPng(image()),'my-faveroam-card.png');setStatus('PNG image downloaded.');}catch{setStatus('The image could not be prepared. Try Download PNG again.');}finally{setBusy(false);}}

 async function shareImage(){if(!ownerName)return;setBusy(true);setStatus('');try{const file=new File([await tasteCardPng(image())],'my-faveroam-card.png',{type:'image/png'});if(navigator.canShare?.({files:[file]})&&navigator.share){await navigator.share({files:[file],title:'My FaveRoam'});setStatus('Image shared.');}else{downloadBlob(file,file.name);setStatus('Sharing is unavailable here, so the PNG image was downloaded.');}}catch(error){if((error as Error)?.name!=='AbortError')setStatus('Could not share the image. Try downloading it instead.');}finally{setBusy(false);}}
 async function create(){if(!passport.agent||!ownerName)return;setBusy(true);setStatus('');try{
   const response=await fetch('/api/share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(passport.agent)});
   const data=await response.json();if(!response.ok)throw Error(data.error??'Could not create a link.');
   const next={token:data.token,revokeToken:data.revokeToken,expiresAt:data.expiresAt};setShare(next);try{sessionStorage.setItem(`tastepassport:share:${passport.agent.sessionId}`,JSON.stringify(next));}catch{}setStatus('Your read-only link is ready for 14 days.');
 }catch(error){const message=error instanceof Error?error.message:'';setStatus(/changed|session/i.test(message)?'Your Passport changed. Refresh this page, then try creating the link again.':'A share link could not be created right now. You can still share the PNG image.');}finally{setBusy(false);}}
 async function revoke(){if(!share)return;setBusy(true);try{const response=await fetch('/api/share',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:share.token,revokeToken:share.revokeToken})});if(!response.ok)throw Error();setShare(undefined);try{sessionStorage.removeItem(`tastepassport:share:${passport.agent?.sessionId}`);}catch{}setStatus('Link revoked.');}catch{setStatus('Could not revoke the link. Try again.');}finally{setBusy(false);}}
 async function copy(){if(!share)return;try{await navigator.clipboard.writeText(`${window.location.origin}/share/${share.token}`);setStatus('Link copied.');}catch{setStatus('Copy the link shown below.');}}
 return <section className="share-taste-card" aria-labelledby="share-taste-title">
   <div className="share-taste-copy"><span className="micro-label">KEEP YOUR VIBE CLOSE</span><h3 id="share-taste-title">Your FaveRoam, ready to share</h3><p>Send an image of your tastes, or make a private-by-link page. Your name, chosen interests, returned themes and a few discoveries appear—never your email or chat.</p>
     <div className="share-theme-preview">{themes.length?themes.map(theme=><span key={theme.id}>{theme.name}</span>):tasteNames.map(name=><span key={name}>{name}</span>)}</div>
   </div>
   {!ownerName&&<p className="share-status">Sign in to share your FaveRoam. Your discoveries will stay here. <button type="button" className="text-button" onClick={()=>window.dispatchEvent(new Event('tastepassport:open-account'))}>Sign in</button></p>}
   <div className="share-options">
     <div><strong>Share an image</strong><small>Download or send a PNG with your name and tastes.</small><div className="share-actions"><button type="button" className="primary-button" disabled={busy||!ownerName} onClick={()=>void shareImage()}>Share</button><button type="button" className="quiet-button" disabled={busy||!ownerName} onClick={()=>void download()}>Download PNG</button></div></div>
     <div><strong>Send a read-only link</strong><small>Opens a taste page for 14 days. You can revoke it.</small><div className="share-actions"><button type="button" className="quiet-button" disabled={busy||!ownerName||!passport.agent||Boolean(share)} onClick={()=>void create()}>{busy?'Preparing…':share?'Link ready':'Create link'}</button></div></div>
   </div>
   {share&&<div className="share-link-result"><label>Share link<input readOnly value={`${typeof window==='undefined'?'':window.location.origin}/share/${share.token}`} onFocus={event=>event.target.select()}/></label><button type="button" className="quiet-button" onClick={()=>void copy()}>Copy link</button><button type="button" className="text-button" disabled={busy} onClick={()=>void revoke()}>Revoke link</button><small>Expires {new Date(share.expiresAt).toLocaleDateString()}</small></div>}
   {status&&<p role="status" className="share-status">{status}</p>}
 </section>;
});
