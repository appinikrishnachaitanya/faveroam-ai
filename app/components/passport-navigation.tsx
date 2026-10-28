"use client";

import { memo, useEffect, useId, useRef, useState } from "react";
import { FlowNavIcon } from "./flow-nav-icon";

export type PassportDestination = "discover" | "saved" | "day" | "plan" | "preferences" | "together" | "connections" | "shares";
const destinations: {id: PassportDestination; label: string}[] = [
  {id:"discover",label:"Discover"},
  {id:"saved",label:"My Places & Rituals"},
  {id:"day",label:"Plan a Day"},
  {id:"plan",label:"First Week"},
  {id:"together",label:"Common Ground"},
  {id:"connections",label:"Taste Insights"},
  {id:"shares",label:"Share My Taste"},
  {id:"preferences",label:"Preferences"},
];

function PassportNavigation({active,savedCount,onNavigate}:{
  active: PassportDestination;
  savedCount: number;
  onNavigate: (destination: PassportDestination) => void;
}) {
  const [open,setOpen] = useState(false);
  const menuId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(()=>setOpen(false),[active]);
  const visit=(destination:PassportDestination)=>{setOpen(false);onNavigate(destination);};

  return (
    <aside className="passport-sidebar" data-menu-open={open} onKeyDown={event=>{
      if(event.key === "Escape" && open) {
        setOpen(false);
        toggle.current?.focus();
      }
    }}>
      <span className="passport-sidebar-title micro-label">YOUR CITY COMPANION</span>
      <div className="passport-mobile-heading">
        <button type="button" className="passport-menu-toggle" aria-label="Passport menu" aria-expanded={open}
          aria-controls={menuId} onClick={()=>setOpen(value=>!value)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            {open ? <path d="m6 6 12 12M6 18 18 6"/> : <path d="M4 6h16M4 12h16M4 18h16"/>}
          </svg>
          Menu
        </button>
        <span className="passport-current-view">{destinations.find(item=>item.id===active)?.label}</span>
      </div>
      <nav id={menuId} className="passport-navigation" aria-label="Passport sections">
        {destinations.map(item=>(
          <button key={item.id} type="button" aria-current={active===item.id ? "page" : undefined}
            onClick={()=>visit(item.id)}>
            <FlowNavIcon flow={item.id}/>
            <span className="passport-navigation-label">{item.label}</span>
            {item.id === "saved" && <span className="passport-saved-count" aria-label={`${savedCount} saved discoveries`}>{savedCount}</span>}
          </button>
        ))}
      </nav>
      <nav className="passport-bottom-navigation" aria-label="Mobile Passport sections">
        {(["discover","saved","plan"] as const).map(id=><button key={id} type="button" aria-current={active===id||id==="plan"&&active==="day"?"page":undefined} onClick={()=>visit(id)}><FlowNavIcon flow={id}/><span>{id==="discover"?"Discover":id==="saved"?"My Places":"Plan"}</span></button>)}
        <button type="button" ref={toggle} aria-current={!["discover","saved","day","plan"].includes(active)?"page":undefined} aria-expanded={open} aria-controls={menuId} aria-label="More Passport sections" onClick={()=>setOpen(value=>!value)}><span className="mobile-more-icon" aria-hidden="true">☷</span><span>More</span></button>
      </nav>
    </aside>
  );
}
export default memo(PassportNavigation);
