"use client";
import { useEffect, useRef } from "react";
import { sectionLabel } from "../../src/passport/labels";
import type { Section } from "../../src/passport/model";

function positionMenu(details:HTMLDetailsElement) {
  if(!details.open)return;
  const trigger=details.querySelector('summary'),panel=details.querySelector('fieldset');
  if(!trigger||!panel)return;
  const rect=trigger.getBoundingClientRect();
  const below=window.innerHeight-rect.bottom-12,above=rect.top-12;
  const height=Math.min(panel.scrollHeight,320,window.innerHeight*.5);
  const flip=below<height && above>below;
  details.dataset.placement=flip?'above':'below';
  panel.style.maxHeight=`${Math.max(80,Math.min(320,window.innerHeight*.5,flip?above:below))}px`;
}

/** One consistent, keyboard-accessible category picker across Passport flows. */
export function CategoryMultiSelect({label,available,selected,onChange,disabled=false,max=3}:{
  label:string;
  available:Section[];
  selected:Section[];
  onChange:(sections:Section[])=>void;
  disabled?:boolean;
  max?:number;
}) {
  const chosen=selected.filter(section=>available.includes(section));
  const picker=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const close=(event:PointerEvent|KeyboardEvent)=>{
      if(event instanceof KeyboardEvent ? event.key==='Escape' : !picker.current?.contains(event.target as Node)) {
        const details=picker.current?.querySelector('details');
        if(details?.open){details.open=false;if(event instanceof KeyboardEvent)details.querySelector('summary')?.focus();}
      }
    };
    document.addEventListener('pointerdown',close);
    document.addEventListener('keydown',close);
    const reposition=()=>{const details=picker.current?.querySelector('details');if(details)positionMenu(details);};
    window.addEventListener('resize',reposition);
    window.addEventListener('scroll',reposition,true);
    return ()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',close);window.removeEventListener('resize',reposition);window.removeEventListener('scroll',reposition,true);};
  },[]);
  return <div className="category-picker" ref={picker}>
    <details className="category-multi-select" onToggle={event=>positionMenu(event.currentTarget)}>
    <summary aria-disabled={disabled} onClick={event=>{if(disabled)event.preventDefault();}}><strong>{label}</strong><span className="category-picker-count">{chosen.length}</span><svg className="category-picker-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></summary>
    <fieldset disabled={disabled} aria-label={label}>
      <p>Choose up to {Math.min(max,available.length)}. Keep at least one selected.</p>
      <div className="category-picker-options">{available.map(section=>{
        const checked=chosen.includes(section);
        return <label key={section} className={checked?"selected":""}>
          <input type="checkbox" checked={checked} disabled={checked&&chosen.length===1 || !checked&&chosen.length>=max}
            onChange={event=>onChange(event.target.checked?[...chosen,section]:chosen.filter(item=>item!==section))}/>
          <span>{sectionLabel(section)}</span>
        </label>;
      })}</div>
      <button type="button" className="category-picker-done" onClick={event=>{
        const details=event.currentTarget.closest("details");
        if(details)details.open=false;
      }}>Done</button>
    </fieldset>
    </details>
    <div className="category-picker-selection" aria-label="Selected categories" aria-live="polite">
      {chosen.map(section=><span key={section}><span aria-hidden="true">✓</span>{sectionLabel(section)}</span>)}
      {!chosen.length&&<small>No categories selected</small>}
    </div>
  </div>;
}
