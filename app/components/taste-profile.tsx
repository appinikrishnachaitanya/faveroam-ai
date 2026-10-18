"use client";
import { useEffect, useRef, useState } from "react";
import type { Passport } from "../../src/workspace/state";
import type { TasteProfile } from "../../src/account/taste-profile";
import { accountRequest, showNotice } from "../../src/account/browser";

export default function ReusableTastes({signedIn,passport,city,disabled,onApply,onBusy}:{
  signedIn:boolean;passport?:Passport;city:string;disabled:boolean;
  onApply:(passport:Passport)=>void;onBusy:(busy:boolean)=>void;
}) {
  const [profile,setProfile]=useState<TasteProfile|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const epoch=useRef(0);
  useEffect(()=>{
    let active=true;
    async function load() {
      const current=++epoch.current;
      setProfile(null);setError("");
      if(!signedIn)return;
      try {const data=await accountRequest("/api/account/preferences");if(active&&current===epoch.current)setProfile(data.profile);}
      catch(e){if(active&&current===epoch.current)setError(e instanceof Error?e.message:"Saved tastes are unavailable.");}
    }
    void load();
    window.addEventListener("tastepassport:account-updated",load);
    return()=>{active=false;++epoch.current;window.removeEventListener("tastepassport:account-updated",load);};
  },[signedIn]);
  if(!signedIn)return null;
  async function run(action:"save"|"apply"|"delete") {
    setLoading(true);setError("");const current=epoch.current;
    let applied=false;
    if(action==="apply")onBusy(true);
    try {
      const data=await accountRequest("/api/account/preferences",action==="delete"?{}:{action,city,...(action==="save"?passport?.agent:{})},action==="delete"?"DELETE":"POST");
      if(current!==epoch.current)return;
      if(action==="save") {setProfile(data.profile);showNotice("Your tastes are saved for your next city.");}
      else if(action==="delete") {setProfile(null);showNotice("Reusable tastes removed. Saved city Passports are unchanged.");}
      else {applied=true;onBusy(false);onApply(data.passport);showNotice("Fresh discoveries using your saved tastes.");}
    } catch(e) {if(current===epoch.current)setError(e instanceof Error?e.message:"Please try again.");}
    finally {setLoading(false);if(action==="apply"&&!applied)onBusy(false);}
  }
  return <section className="reusable-tastes" aria-label="Reusable taste profile">
    <strong>Your tastes, ready for another city</strong>
    <p>{profile?profile.selected.map(t=>t.name).join(" · "):"Save your confirmed tastes and preferences once. Reuse them for fresh discoveries in another destination."}</p>
    <div className="plan-actions">
      {passport?.agent&&<button type="button" className="quiet-button" disabled={disabled||loading} onClick={()=>void run("save")}>{profile?"Update saved tastes":"Save my tastes"}</button>}
      {profile&&!passport&&<button type="button" className="quiet-button" disabled={disabled||loading||!city} onClick={()=>void run("apply")}>{loading?"Finding fresh matches…":city?`Use my tastes in ${city}`:"Choose a city to use saved tastes"}</button>}
      {profile&&<button type="button" className="text-button" disabled={disabled||loading} onClick={()=>void run("delete")}>Remove saved tastes</button>}
    </div>
    {error&&<p role="status">{error}</p>}
    <small>Places, addresses and location filters stay with their city. Reusing tastes retrieves fresh results.</small>
  </section>;
}
