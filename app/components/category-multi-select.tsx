"use client";
import { sectionLabel } from "../../src/passport/labels";
import type { Section } from "../../src/passport/model";

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
  const summary=chosen.length ? chosen.map(sectionLabel).join(", ") : "Choose categories";
  return <details className="category-multi-select">
    <summary><span><strong>{label}</strong><small>{summary}</small></span><span className="category-picker-count">{chosen.length} selected</span></summary>
    <fieldset disabled={disabled} aria-label={label}>
      <p>Choose 1–{Math.min(max,available.length)} categories. Your other results stay as they are.</p>
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
  </details>;
}
