"use client";
import {memo,useCallback,useEffect,useRef,useState} from "react";
type ShareItem={urlToken:string;createdAt:string;expiresAt:string;status:"active"|"revoked"|"expired";city:string};
export default memo(function ShareManagement({signedIn}:{signedIn:boolean}){
 const [items,setItems]=useState<ShareItem[]>([]),[page,setPage]=useState(1),[total,setTotal]=useState(0),[counts,setCounts]=useState({active:0,revoked:0}),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const requestGeneration=useRef(0);
 const load=useCallback(async(next=page)=>{if(!signedIn){setItems([]);return;}const generation=++requestGeneration.current;setBusy(true);setMessage("");try{const response=await fetch(`/api/share?manage=true&page=${next}`,{cache:"no-store"});const data=await response.json();if(!response.ok)throw Error(data.error);if(generation!==requestGeneration.current)return;setItems(data.items);setTotal(data.total);setCounts(data.counts);setPage(next);}catch(e){if(generation===requestGeneration.current)setMessage(e instanceof Error?e.message:"Share links could not be loaded.");}finally{if(generation===requestGeneration.current)setBusy(false);}},[page,signedIn]);
 useEffect(()=>{void load(1);},[signedIn]);
 useEffect(()=>{
   if(!signedIn)return;
   const created=(event:Event)=>{
     const item=(event as CustomEvent<ShareItem>).detail;
     if(!item?.urlToken)return;
     requestGeneration.current++;
     setItems(current=>[item,...current.filter(existing=>existing.urlToken!==item.urlToken)].slice(0,8));
     setPage(1);setTotal(current=>current+1);setCounts(current=>({...current,active:current.active+1}));setBusy(false);setMessage("New share link added.");
   };
   const revoked=(event:Event)=>{
     const token=(event as CustomEvent<{urlToken:string}>).detail?.urlToken;
     if(!token)return;
     requestGeneration.current++;
     setItems(current=>current.map(item=>item.urlToken===token?{...item,status:"revoked"}:item));
     setCounts(current=>({...current,active:Math.max(0,current.active-1),revoked:current.revoked+1}));setBusy(false);setMessage("Share link revoked.");
   };
   window.addEventListener("faveroam:share-created",created);
   window.addEventListener("faveroam:share-revoked",revoked);
   return()=>{window.removeEventListener("faveroam:share-created",created);window.removeEventListener("faveroam:share-revoked",revoked);};
 },[signedIn]);
 async function revoke(token:string){setBusy(true);setMessage("");try{const response=await fetch("/api/share",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});const data=await response.json();if(!response.ok)throw Error(data.error);await load(page);setMessage("Share link revoked.");}catch(e){setMessage(e instanceof Error?e.message:"Could not revoke this link.");}finally{setBusy(false);}}
 return <section className="share-management" aria-labelledby="share-management-title"><header><span className="micro-label">YOUR SHARED LINKS</span><h2 id="share-management-title">Share my tastes</h2><p>Review links you’ve created, copy an active link, or revoke access. Links expire after 14 days.</p></header>
 {!signedIn?<div className="share-management-empty"><p>Sign in to manage your shared links.</p><button type="button" className="primary-button" onClick={()=>window.dispatchEvent(new Event("tastepassport:open-account"))}>Sign in</button></div>:<>
 <div className="share-link-counts"><article><strong>{counts.active}</strong><span>Active links</span></article><article><strong>{counts.revoked}</strong><span>Revoked links</span></article><article><strong>{total}</strong><span>Total links</span></article></div>
 {busy&&!items.length?<p role="status">Loading your links…</p>:!items.length?<p className="share-management-empty">No share links yet. Create one from Discover after signing in.</p>:<>
 <div className="share-management-table-wrap"><table className="share-management-table"><thead><tr><th>City</th><th>Created</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead><tbody>{items.map(item=><tr key={item.urlToken}><td data-label="City">{item.city}</td><td data-label="Created">{new Date(item.createdAt).toLocaleDateString()}</td><td data-label="Expires">{new Date(item.expiresAt).toLocaleDateString()}</td><td data-label="Status"><span className={`share-link-status ${item.status}`}>{item.status}</span></td><td data-label="Actions"><div className="share-management-actions">{item.status==="active"&&<><button type="button" className="quiet-button" onClick={()=>void navigator.clipboard.writeText(`${location.origin}/share/${item.urlToken}`).then(()=>setMessage("Share link copied.")).catch(()=>setMessage("Could not copy the link."))}>Copy</button><button type="button" className="quiet-button" disabled={busy} onClick={()=>void revoke(item.urlToken)}>Revoke</button></>}</div></td></tr>)}</tbody></table></div>
 <div className="share-management-pagination"><span>Page {page} · {total} links</span><div><button type="button" className="quiet-button" disabled={busy||page<=1} onClick={()=>void load(page-1)}>Previous</button><button type="button" className="quiet-button" disabled={busy||page*8>=total} onClick={()=>void load(page+1)}>Next</button></div></div>
 </>}
 </>}
 {message&&<p role="status" className="share-management-message">{message}</p>}</section>;
});
