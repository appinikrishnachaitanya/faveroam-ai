"use client";
import {memo,useEffect,useMemo,useRef,useState} from 'react';
import type {Passport} from '../../src/workspace/state';
import type {Card} from '../../src/passport/model';
import type {Ritual,RitualReceipt} from '../../src/account/rituals';
import {accountRequest,AccountRequestError} from '../../src/account/browser';
import {sectionLabel} from '../../src/passport/labels';
import ConfirmDelete from './confirm-delete';
const weekdays=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export default memo(function Rituals({passport,signedIn,initialCardId,onInitialHandled}:{passport:Passport;signedIn:boolean;initialCardId?:string;onInitialHandled:()=>void}){
 const [rituals,setRituals]=useState<Ritual[]>([]),[name,setName]=useState(''),[cardId,setCardId]=useState('');
 const [weekday,setWeekday]=useState(6),[recurrence,setRecurrence]=useState<Ritual['recurrence']>('weekly');
 const [editing,setEditing]=useState<Ritual>(),[deleting,setDeleting]=useState<Ritual>();
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [proposal,setProposal]=useState<{ritual:Ritual;proposalId?:string;alternatives:Card[];receipt:RitualReceipt}>(),[replacement,setReplacement]=useState('');
 const epoch=useRef(0);
 const priorSignedIn=useRef(signedIn);
 const choices=useMemo(()=>[...new Map((passport.session?.savedCards??[]).map(c=>[c.id,c])).values()].filter(c=>c.evidence?.source==='Qloo'&&c.evidence.result.id===c.id&&c.evidence.destination===passport.city&&!passport.session?.feedback.some(f=>f.id===c.id&&!f.accepted)),[passport]);
 async function refresh(signal?:AbortSignal){const generation=epoch.current;setLoading(true);try{const response=await fetch('/api/account/rituals',{cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(25000)]):AbortSignal.timeout(25000)});const data=await response.json();if(!response.ok)throw Error(data.error||'Rituals could not load.');if(!signal?.aborted&&epoch.current===generation)setRituals(data.rituals);}catch(e){if(!signal?.aborted&&epoch.current===generation)setError(e instanceof Error?e.message:'Rituals could not load.');}finally{if(!signal?.aborted&&epoch.current===generation)setLoading(false);}}
 useEffect(()=>{if(priorSignedIn.current&&!signedIn){setName('');setCardId('');setRecurrence('weekly');setWeekday(6);}priorSignedIn.current=signedIn;epoch.current++;setRituals([]);setProposal(undefined);setEditing(undefined);setDeleting(undefined);setError('');setNotice('');setBusy(false);setLoading(false);if(!signedIn)return;const controller=new AbortController();void refresh(controller.signal);return()=>{controller.abort();epoch.current++;};},[signedIn]);
 useEffect(()=>{if(!initialCardId)return;const card=choices.find(c=>c.id===initialCardId);if(card){setEditing(undefined);setCardId(card.id);setName(`My ${sectionLabel(card.section).toLowerCase()} ritual`.slice(0,80));setNotice('Choose a name and schedule below, then save your ritual.');}onInitialHandled();},[initialCardId,choices,onInitialHandled]);
  useEffect(()=>{if(cardId&&!choices.some(card=>card.id===cardId)){setCardId('');setNotice('This place is no longer in My Vibe. Choose a saved favorite.');}},[choices,cardId]);
 async function mutate(body:Record<string,unknown>){
  if(!signedIn){setNotice('Sign in to save your ritual. Your draft stays here.');window.dispatchEvent(new Event('tastepassport:open-account'));return;}
  const generation=epoch.current;setBusy(true);setError('');setNotice(body.action==='replace'?'Finding real alternatives with your saved interests and current requirements…':'');
  try{
   const result=await accountRequest('/api/account/rituals',body);
   if(generation!==epoch.current)return;
   if(body.action==='replace'){const ritual=rituals.find(r=>r.id===body.id)!;setProposal({ritual,...result});setReplacement('');setNotice(result.alternatives.length?'Choose an alternative and approve it. Your saved ritual is unchanged.':'No verified alternative fits the current requirements. Your ritual is unchanged.');return;}
   if(result.ritual)setRituals(current=>[result.ritual,...current.filter(r=>r.id!==result.ritual.id)]);
   if(result.deleted)setRituals(current=>current.filter(r=>r.id!==body.id));
   setProposal(undefined);setDeleting(undefined);setEditing(undefined);setNotice(body.action==='approve'?`Replaced the place in your ritual. Its name and schedule, other rituals, and plans stayed unchanged.`:body.action==='delete'?'Ritual removed. Your saved plans are unchanged.':'Your ritual is saved.');
   if(body.action==='create'){setName('');setCardId('');}
  }catch(e){if(generation!==epoch.current)return;setError(e instanceof Error?e.message:'Please try again.');if(e instanceof AccountRequestError&&e.signInRequired)window.dispatchEvent(new Event('tastepassport:open-account'));}
  finally{if(generation===epoch.current)setBusy(false);}
 }
 const update=(ritual:Ritual,status:Ritual['status'])=>void mutate({action:'update',id:ritual.id,updatedAt:ritual.updated_at,name:ritual.name,weekday:ritual.weekday,recurrence:ritual.recurrence,status});
 return <section className="rituals-panel" aria-labelledby="rituals-title">
  <header><span className="micro-label">MAKE THIS CITY YOURS</span><h2 id="rituals-title">My Rituals</h2><p>Turn a returned discovery into something you come back to. A weekly coffee, a film night, or your next favourite place.</p></header>
  {!signedIn&&<p className="ritual-note">You can prepare a ritual as a guest. Sign in to save it across visits. These schedules do not send notifications or book anything.</p>}
  <form className="ritual-form" onSubmit={e=>{e.preventDefault();void mutate({action:editing?'update':'create',...(editing?{id:editing.id,updatedAt:editing.updated_at,status:editing.status}:{sessionId:passport.agent?.sessionId,revision:passport.agent?.revision,cardId,status:'planned'}),name,weekday,recurrence});}}>
   <h3>{editing?'Edit your ritual':'Create a ritual'}</h3>
   {!editing&&<label>From My Vibe<select required value={cardId} disabled={busy||!choices.length} onChange={e=>setCardId(e.target.value)}><option value="">Choose a saved favorite</option>{[...new Set(choices.map(c=>c.section))].map(section=><optgroup key={section} label={sectionLabel(section)}>{choices.filter(c=>c.section===section).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>)}</select></label>}
   {!editing&&!choices.length&&<p>Save a place to My Vibe from Discover to make it a ritual.</p>}
   <label>Name<input required maxLength={80} value={name} disabled={busy} placeholder="Saturday coffee" onChange={e=>setName(e.target.value)}/></label>
   <label>Day<select value={weekday} disabled={busy} onChange={e=>setWeekday(Number(e.target.value))}>{weekdays.map((day,i)=><option key={day} value={i}>{day}</option>)}</select></label>
   <label>Repeat<select value={recurrence} disabled={busy} onChange={e=>setRecurrence(e.target.value as Ritual['recurrence'])}><option value="weekly">Every week</option><option value="fortnightly">Every two weeks</option></select></label>
   <div className="ritual-actions"><button className="primary-button" disabled={busy||!name.trim()||!editing&&!cardId}>{busy?'Saving…':editing?'Save changes':'Save ritual'}</button>{editing&&<button type="button" className="quiet-button" onClick={()=>{setEditing(undefined);setName('');}}>Cancel editing</button>}</div>
  </form>
  {loading&&<p role="status">Picking up your rituals…</p>}
  {signedIn&&!loading&&!rituals.length&&!error&&<p>No rituals yet. Start with a real discovery above.</p>}
  <div className="ritual-list">{rituals.map(ritual=><article key={ritual.id}><div><span className="micro-label">{ritual.city} · {ritual.status==='kept'?'A keeper':ritual.status==='tried'?'Tried':'Ready to try'}</span><h3>{ritual.name}</h3><strong>{ritual.card.name}</strong><p>{ritual.card.address??sectionLabel(ritual.card.section)}</p><p>{ritual.recurrence==='weekly'?'Every':'Every other'} {weekdays[ritual.weekday]} · {sectionLabel(ritual.card.section)}</p></div><div className="ritual-actions"><button type="button" className="quiet-button" disabled={busy} onClick={()=>update(ritual,'tried')}>Mark as tried</button><button type="button" className="quiet-button" disabled={busy} onClick={()=>update(ritual,'kept')}>Keep this ritual</button><button type="button" className="quiet-button" disabled={busy} onClick={()=>{setEditing(ritual);setName(ritual.name);setWeekday(ritual.weekday);setRecurrence(ritual.recurrence);document.getElementById('rituals-title')?.scrollIntoView({block:'start',behavior:'instant'});}}>Edit schedule</button><button type="button" className="quiet-button" disabled={busy||ritual.city!==passport.city} onClick={()=>void mutate({action:'replace',id:ritual.id,updatedAt:ritual.updated_at,sessionId:passport.agent?.sessionId})}>Find a replacement</button><button type="button" className="text-button" disabled={busy} onClick={()=>setDeleting(ritual)}>Remove</button></div>{ritual.city!==passport.city&&<small>Open your {ritual.city} Passport to find a replacement using its preferences.</small>}</article>)}</div>
  {proposal&&<section className="ritual-proposal" aria-labelledby="ritual-proposal-title"><h3 id="ritual-proposal-title">A new place for {proposal.ritual.name}</h3><p>Currently: {proposal.ritual.card.name}. Nothing changes until you approve.</p><div className="cluster-options">{proposal.alternatives.map(card=><button type="button" className="cluster-option" aria-pressed={replacement===card.id} key={card.id} disabled={busy} onClick={()=>setReplacement(card.id)}><strong>{card.name}</strong><span>{card.address??sectionLabel(card.section)}</span><small>Returned from your saved cultural interests and current category requirements. Check current hours and availability.</small></button>)}</div><details><summary>What I checked</summary><ol>{proposal.receipt.steps.map(step=><li key={step}>{step}</li>)}</ol></details><div className="ritual-actions"><button type="button" className="primary-button" disabled={busy||!replacement} onClick={()=>void mutate({action:'approve',id:proposal.ritual.id,updatedAt:proposal.ritual.updated_at,proposalId:proposal.proposalId,cardId:replacement})}>Approve replacement</button><button type="button" className="quiet-button" disabled={busy} onClick={()=>setProposal(undefined)}>Keep current place</button></div></section>}
  {notice&&<p role="status" className="ritual-note">{notice}</p>}{error&&<div role="alert"><p>{error}</p>{signedIn&&<button className="quiet-button" disabled={busy||loading} onClick={()=>void refresh()}>Refresh rituals</button>}</div>}
  {deleting&&<ConfirmDelete title={`Remove ${deleting.name}?`} description="This removes only this ritual. Your discoveries and plans will stay." busy={busy} onCancel={()=>setDeleting(undefined)} onConfirm={()=>void mutate({action:'delete',id:deleting.id,updatedAt:deleting.updated_at})}/>}
 </section>;
});
