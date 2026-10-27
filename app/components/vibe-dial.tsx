"use client";
import {memo,useEffect,useMemo,useRef,useState} from 'react';
import type {Passport} from '../../src/workspace/state';
import type {AgentInput} from '../../src/agent/types';
import {vibeDirections} from '../../src/passport/vibe-dial';
import {activeCategories} from '../../src/passport/active-categories';
import {sectionLabel} from '../../src/passport/labels';
export default memo(function VibeDial({passport,busy,onApply}:{passport:Passport;busy:boolean;onApply:(input:AgentInput)=>void}){
 const directions=useMemo(()=>vibeDirections(passport.cards,passport.selected,activeCategories(passport.session,passport.cards)),[passport.cards,passport.selected,passport.session]);
 const [choice,setChoice]=useState('');
 const [pending,setPending]=useState<{ids:string[];sections:string[]}>();
 const [receipt,setReceipt]=useState('');
 const started=useRef(false);
 useEffect(()=>{
   if(!pending)return;
   if(busy){started.current=true;return;}
   if(!started.current)return;
   const before=new Set(pending.ids);
   const current=passport.cards.filter(card=>pending.sections.includes(card.section));
   const added=current.filter(card=>!before.has(card.id)).length;
   const kept=current.filter(card=>before.has(card.id)).length;
   setReceipt(added?`${added} new choices and ${kept} previous choices in ${pending.sections.map(section=>sectionLabel(section as import('../../src/passport/model').Section)).join(', ')}. Your confirmed tastes are unchanged.`:'No new choices were confirmed. Your current discoveries remain available.');
   setPending(undefined);started.current=false;
 },[busy,passport.cards,pending]);
 if(!directions.length)return <div className="vibe-dial vibe-dial-empty"><span className="micro-label">YOUR DISCOVERY DIRECTION</span><h3>Vibe Dial</h3><p>When your discoveries reveal a distinct taste theme, you can use it here to explore a new direction. Your current interests and filters stay intact.</p></div>;
 const selected=directions.find(direction=>direction.theme.id===choice);
 return <details className="vibe-dial vibe-tuning-disclosure" aria-labelledby="vibe-dial-title"><summary>Vibe Dial <span>Explore a new direction from your returned themes</span></summary><div className="vibe-dial-heading"><div><span className="micro-label">ONE SMALL CHOICE, A NEW DIRECTION</span><h3 id="vibe-dial-title">Tune your Vibe Dial</h3><p>Pick a connection found in your returned discoveries. We’ll use its exact theme as inspiration, keeping your confirmed interests and explicit filters.</p></div><img src="/illustrations/vibe-dial.svg" width="100" height="78" alt="" aria-hidden="true" loading="lazy"/></div>
 <div className="vibe-directions" role="group" aria-label="Returned taste directions">{directions.map(direction=><button key={direction.theme.id} type="button" disabled={busy||Boolean(pending)} aria-pressed={choice===direction.theme.id} onClick={()=>setChoice(direction.theme.id)}><strong>{direction.theme.name}</strong><small>{direction.sections.map(sectionLabel).join(' · ')}</small></button>)}</div>
 <button type="button" className="primary-button" disabled={!selected||busy||Boolean(pending)} onClick={()=>{
   if(!selected)return;
   setReceipt('');started.current=false;setPending({ids:passport.cards.filter(card=>selected.sections.includes(card.section)).map(card=>card.id),sections:selected.sections});
   onApply({discovery:{sections:selected.sections,preferences:{inspirationTags:[selected.theme.id],inspirationName:selected.theme.name}}});
 }}>{pending?'Finding this direction…':'Explore this direction'}</button>{receipt&&<p role="status">{receipt}</p>}<small>These are returned cultural themes, not personality types or guarantees.</small></details>;
});
