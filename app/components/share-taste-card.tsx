"use client";
import {memo,useEffect,useMemo,useRef,useState} from 'react';
import type {Passport} from '../../src/workspace/state';
import {curatedThemes,relevantThemes} from '../../src/passport/taste-themes';
import {tasteCardPng,tasteCardSvg} from '../../src/share/card-image';
import {shareThemeCandidates} from '../../src/share/theme-preview';

type Link={token:string;revokeToken:string;expiresAt:string};
export default memo(function ShareTasteCard({passport,ownerName}:{passport:Passport;ownerName?:string}){
 const [share,setShare]=useState<Link>();
 const [busy,setBusy]=useState(false),[status,setStatus]=useState('');
 const requestEpoch=useRef(0);
 const requestController=useRef<AbortController|undefined>(undefined);
 useEffect(()=>{
   requestEpoch.current++;
   requestController.current?.abort();
   setShare(undefined);setBusy(false);setStatus('');
   if(ownerName&&passport.agent)try{const saved=JSON.parse(sessionStorage.getItem(`tastepassport:share:${passport.agent.sessionId}`)??'null');if(saved?.token&&saved?.revokeToken&&new Date(saved.expiresAt)>new Date())setShare(saved);}catch{}
   return()=>{requestEpoch.current++;requestController.current?.abort();};
 },[passport.agent?.sessionId,passport.city,ownerName]);
 useEffect(()=>{
   const revoked=(event:Event)=>{
     const detail=(event as CustomEvent<{urlToken:string;city:string}>).detail;
     if(!detail||detail.city!==passport.city||detail.urlToken!==share?.token)return;
     setShare(undefined);
     try{if(passport.agent)sessionStorage.removeItem(`tastepassport:share:${passport.agent.sessionId}`);}catch{}
     setStatus('This share link has been revoked.');
   };
   window.addEventListener('faveroam:share-revoked',revoked);
   return()=>window.removeEventListener('faveroam:share-revoked',revoked);
 },[passport.agent?.sessionId,passport.city,share?.token]);
 const themes=useMemo(()=>curatedThemes(relevantThemes(shareThemeCandidates(passport.cards),passport.selected)).slice(0,5),[passport.cards,passport.selected]);
 const tasteNames=passport.selected.map(taste=>taste.name);
 const image=()=>tasteCardSvg(passport.city,themes.map(theme=>theme.name),tasteNames,ownerName);
 function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function download(){if(!ownerName)return;setBusy(true);setStatus('');try{downloadBlob(await tasteCardPng(image()),'my-faveroam-card.png');setStatus('PNG image downloaded.');}catch{setStatus('The image could not be prepared. Try again.');}finally{setBusy(false);}}

 async function shareImage(){if(!ownerName)return;setBusy(true);setStatus('');try{const file=new File([await tasteCardPng(image())],'my-faveroam-card.png',{type:'image/png'});if(navigator.canShare?.({files:[file]})&&navigator.share){await navigator.share({files:[file],title:'My FaveRoam'});setStatus('Image shared.');}else{downloadBlob(file,file.name);setStatus('Sharing is unavailable here, so the PNG image was downloaded.');}}catch(error){if((error as Error)?.name!=='AbortError')setStatus('Could not share the image. Try downloading it instead.');}finally{setBusy(false);}}
 async function create(){if(!passport.agent||!ownerName)return;const epoch=++requestEpoch.current;requestController.current?.abort();const controller=new AbortController();requestController.current=controller;setBusy(true);setStatus('');try{
   const response=await fetch('/api/share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:passport.agent.sessionId,revision:passport.agent.revision}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(35000)])});
   const data=await response.json();if(!response.ok)throw Error(data.error??'Could not create a link.');if(controller.signal.aborted||requestEpoch.current!==epoch)return;
   const next={token:data.token,revokeToken:data.revokeToken,expiresAt:data.expiresAt};setShare(next);try{sessionStorage.setItem(`tastepassport:share:${passport.agent.sessionId}`,JSON.stringify(next));}catch{}
   window.dispatchEvent(new CustomEvent('faveroam:share-created',{detail:{urlToken:next.token,createdAt:data.createdAt??new Date().toISOString(),expiresAt:next.expiresAt,status:'active',city:passport.city}}));
   setStatus('Your read-only link is ready for 14 days.');
 }catch(error){if(controller.signal.aborted||requestEpoch.current!==epoch)return;const message=error instanceof Error?error.message:'';setStatus(/changed|session|synchroniz/i.test(message)?'Your Passport changed. Refresh this page, then try creating the link again.':/five active links/i.test(message)?`You already have five active links for ${passport.city}. Revoke one in Share My Taste, then try again.`:/storage is not ready/i.test(message)?'Sharing needs the database setup. Please try again after maintenance.':/sign in/i.test(message)?'Your sign-in expired. Sign in again to create a link.':error instanceof DOMException&&error.name==='TimeoutError'?'Creating the link took too long. Please try again.':'A share link could not be created right now. You can still share the PNG image.');}finally{if(requestEpoch.current===epoch){requestController.current=undefined;setBusy(false);}}}
 async function revoke(){if(!share||!ownerName)return;const epoch=++requestEpoch.current;requestController.current?.abort();const controller=new AbortController();requestController.current=controller;setBusy(true);try{const response=await fetch('/api/share',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:share.token,revokeToken:share.revokeToken}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)])});if(!response.ok)throw Error();if(controller.signal.aborted||requestEpoch.current!==epoch)return;setShare(undefined);try{sessionStorage.removeItem(`tastepassport:share:${passport.agent?.sessionId}`);}catch{}window.dispatchEvent(new CustomEvent('faveroam:share-revoked',{detail:{urlToken:share.token,city:passport.city}}));setStatus('Link revoked.');}catch{if(controller.signal.aborted||requestEpoch.current!==epoch)return;setStatus('Could not revoke the link. Try again.');}finally{if(requestEpoch.current===epoch){requestController.current=undefined;setBusy(false);}}}
 async function copy(){if(!share||!ownerName)return;try{await navigator.clipboard.writeText(`${window.location.origin}/share/${share.token}`);setStatus('Link copied.');}catch{setStatus('Copy the link shown below.');}}
 return <section className="share-taste-card" aria-labelledby="share-taste-title">
   <div className="share-taste-copy"><span className="micro-label">TAKE YOUR FAVOURITES WITH YOU</span><h3 id="share-taste-title">Your FaveRoam, ready to share</h3><p>Send an image of your tastes, or make a private-by-link page. Your name, chosen interests, returned themes and a few discoveries appear—never your email or chat.</p>
     <div className="share-theme-preview">{themes.length?themes.map(theme=><span key={theme.id}>{theme.name}</span>):tasteNames.map(name=><span key={name}>{name}</span>)}</div>
   </div>
   {!ownerName&&<p className="share-status">Sign in to share your FaveRoam. Your discoveries will stay here. <button type="button" className="text-button" onClick={()=>window.dispatchEvent(new Event('tastepassport:open-account'))}>Sign in</button></p>}
   <div className="share-options">
     <div><strong>Share an image</strong><small>Download or send a PNG with your name and tastes.</small><div className="share-actions"><button type="button" className="primary-button" disabled={busy||!ownerName} onClick={()=>void shareImage()}>Share</button><button type="button" className="quiet-button" disabled={busy||!ownerName} onClick={()=>void download()}>Download</button></div></div>
     <div><strong>Send a read-only link</strong><small>Opens a taste page for 14 days. You can revoke it.</small><div className="share-actions"><button type="button" className="quiet-button" disabled={busy||!ownerName||!passport.agent||Boolean(share)} onClick={()=>void create()}>{busy?'Preparing…':share?'Link ready':'Create link'}</button></div></div>
   </div>
   {share&&ownerName&&<div className="share-link-result"><label>Share link<input readOnly value={`${typeof window==='undefined'?'':window.location.origin}/share/${share.token}`} onFocus={event=>event.target.select()}/></label><div className="share-link-result-footer"><div className="share-link-result-actions"><button type="button" className="primary-button" onClick={()=>void copy()}>Copy link</button><button type="button" className="quiet-button" disabled={busy} onClick={()=>void revoke()}>Revoke link</button></div><small>Expires {new Date(share.expiresAt).toLocaleDateString()}</small></div></div>}
   {status&&<p role="status" className="share-status">{status}</p>}
 </section>;
});
