"use client";
import { useEffect, useRef, useState } from "react";
import type { Passport } from "../../src/workspace/state";
import type { TasteProfile } from "../../src/account/taste-profile";
import type { SavedTasteProfile } from "../../src/account/profile-record";
import { accountRequest, showNotice } from "../../src/account/browser";

export default function ReusableTastes({signedIn,passport,city,disabled,onApply,onBusy,onSelect,draftVersion}:{
  signedIn:boolean;passport?:Passport;city:string;disabled:boolean;draftVersion:number;
  onApply:(passport:Passport)=>void;onBusy:(busy:boolean)=>void;onSelect:(profile:TasteProfile)=>void;
}) {
  const [profiles,setProfiles]=useState<SavedTasteProfile[]>([]);
  const [selectedId,setSelectedId]=useState("");
  const [name,setName]=useState("My tastes");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [status,setStatus]=useState("");
  const epoch=useRef(0);
  const profile=profiles.find(p=>p.id===selectedId);
  useEffect(()=>{
    let active=true;
    async function load() {
      const current=++epoch.current;
      setProfiles([]);setSelectedId("");setError("");setStatus("");
      if(!signedIn)return;
      try {const data=await accountRequest("/api/account/preferences");if(active&&current===epoch.current) {
        const entries:SavedTasteProfile[]=data.profiles ?? (data.profile?[{id:"legacy",name:"My tastes",updated_at:"",profile:data.profile}]:[]);
        setProfiles(entries);
      }} catch(e){if(active&&current===epoch.current)setError(e instanceof Error?e.message:"Saved tastes are unavailable.");}
    }
    void load();
    window.addEventListener("tastepassport:account-updated",load);
    return()=>{active=false;++epoch.current;window.removeEventListener("tastepassport:account-updated",load);};
  },[signedIn]);
  useEffect(()=>{setSelectedId("");setStatus("");},[draftVersion]);
  if(!signedIn)return null;
  async function run(action:"save"|"apply"|"delete") {
    setLoading(true);setError("");setStatus("");const current=epoch.current;
    let applied=false;
    if(action==="apply")onBusy(true);
    try {
      const data=await accountRequest("/api/account/preferences",{action,city,name,...(selectedId&&selectedId!=="legacy"?{profileId:selectedId}:{}),...(action==="save"?passport?.agent:{})},action==="delete"?"DELETE":"POST");
      if(current!==epoch.current)return;
      if(action==="save") {
        const entry:SavedTasteProfile=data.entry ?? {id:"legacy",name,updated_at:"",profile:data.profile};
        setProfiles(rows=>[entry,...rows.filter(row=>row.id!==entry.id && row.name!==entry.name)]);setSelectedId(entry.id);
        setStatus(`Saved “${entry.name}”. Ready to reuse in another city.`);showNotice("Your tastes are saved for your next city.");
      } else if(action==="delete") {setProfiles(rows=>rows.filter(row=>row.id!==selectedId));setSelectedId("");setStatus("Taste profile removed.");}
      else {applied=true;onBusy(false);onApply(data.passport);setStatus("Fresh discoveries using your saved tastes.");showNotice("Fresh discoveries using your saved tastes.");}
    } catch(e) {if(current===epoch.current)setError(e instanceof Error?e.message:"Please try again.");}
    finally {setLoading(false);if(action==="apply"&&!applied)onBusy(false);}
  }
  return <section className="reusable-tastes" aria-label="Reusable taste profile">
    <div className="profile-heading"><div><span className="micro-label">YOUR TASTE LIBRARY</span><h2>Your tastes travel with you.</h2></div><span>{profiles.length} saved</span></div>
    <p>Choose a profile to fill your interests, or save this Passport under a name.</p>
    <div className="profile-fields">
      <label>Saved taste profile<select value={selectedId} disabled={disabled||loading} onChange={event=>{
        const selected=profiles.find(row=>row.id===event.target.value);setSelectedId(event.target.value);setError("");
        if(selected){setName(selected.name);onSelect(selected.profile);setStatus(`Loaded interests from “${selected.name}”. Choose a city to explore.`);}
      }}><option value="">Choose a saved profile</option>{profiles.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      {passport?.agent&&<label>Profile name<input value={name} maxLength={80} disabled={disabled||loading} onChange={e=>setName(e.target.value)} placeholder="My weekend tastes" /></label>}
    </div>
    {profile&&<p className="profile-interest-preview">{profile.profile.selected.map(t=>t.name).join(" · ")}</p>}
    <div className="plan-actions">
      {passport?.agent&&<button type="button" className="primary-button" disabled={disabled||loading||!name.trim()} onClick={()=>void run("save")}>{loading?"Saving…":profiles.some(row=>row.name===name.trim())?"Update saved tastes":"Save my tastes"}</button>}
      {profile&&!passport&&<button type="button" className="primary-button" disabled={disabled||loading||!city} onClick={()=>void run("apply")}>{loading?"Finding fresh matches…":city?`Use my tastes in ${city}`:"Choose a city to use saved tastes"}</button>}
      {profile&&<a className="quiet-button" href={`/api/account/preferences/export${selectedId!=="legacy"?`?id=${encodeURIComponent(selectedId)}`:""}`} download>Export JSON</a>}
      {profile&&<button type="button" className="text-button" disabled={disabled||loading} onClick={()=>void run("delete")}>Remove profile</button>}
    </div>
    {status&&<p className="profile-status" role="status">{status}</p>}
    {error&&<p role="alert">{error}</p>}
  </section>;
}
