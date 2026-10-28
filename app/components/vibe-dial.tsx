"use client";
import {memo,useEffect,useMemo,useRef,useState} from 'react';
import type {Passport} from '../../src/workspace/state';
import type {AgentInput} from '../../src/agent/types';
import {vibeDirections} from '../../src/passport/vibe-dial';
import {activeCategories} from '../../src/passport/active-categories';
import {sectionLabel} from '../../src/passport/labels';

const wheelColors=['#244f4a','#d28b37','#647b57'];
const wheelAngle=(index:number,total:number)=>-90+index*360/total;
function wheelSegment(index:number,total:number){
 const start=wheelAngle(index,total),end=wheelAngle(index+1,total),radius=148;
 const point=(angle:number)=>({x:160+radius*Math.cos(angle*Math.PI/180),y:160+radius*Math.sin(angle*Math.PI/180)});
 const a=point(start),b=point(end);
 return `M 160 160 L ${a.x} ${a.y} A ${radius} ${radius} 0 0 1 ${b.x} ${b.y} Z`;
}

export default memo(function VibeDial({passport,busy,open,onClose,onApply}:{passport:Passport;busy:boolean;open:boolean;onClose:()=>void;onApply:(input:AgentInput)=>void}){
 const directions=useMemo(()=>vibeDirections(passport.cards,passport.selected,activeCategories(passport.session,passport.cards)),[passport.cards,passport.selected,passport.session]);
 const [choice,setChoice]=useState('');
 const [choiceSource,setChoiceSource]=useState<'spin'|'manual'>();
 const [pending,setPending]=useState<{ids:string[];sections:string[]}>();
 const [receipt,setReceipt]=useState('');
 const [rotation,setRotation]=useState(0);
 const [spinning,setSpinning]=useState(false);
 const [waitingSeconds,setWaitingSeconds]=useState(0);
 const started=useRef(false);
 const dialog=useRef<HTMLDialogElement>(null);
 const returnFocus=useRef<HTMLElement|null>(null);
 const spinTimer=useRef<number|undefined>(undefined);
 const selected=directions.find(direction=>direction.theme.id===choice);

 useEffect(()=>{
   const element=dialog.current;
   if(!element)return;
   if(open&&!element.open){
     const active=document.activeElement;
     returnFocus.current=active instanceof HTMLElement?active:null;
     element.showModal();
   }else if(!open&&element.open){
     element.close();
     returnFocus.current?.focus();
     returnFocus.current=null;
   }
 },[open]);
 useEffect(()=>()=>{if(spinTimer.current)window.clearTimeout(spinTimer.current);},[]);
 useEffect(()=>{
   if(!pending){setWaitingSeconds(0);return;}
   const startedAt=Date.now();
   const timer=window.setInterval(()=>setWaitingSeconds(Math.floor((Date.now()-startedAt)/1000)),1000);
   return ()=>window.clearInterval(timer);
 },[pending]);
 useEffect(()=>{
   if(!pending)return;
   if(busy){started.current=true;return;}
   if(!started.current)return;
   const before=new Set(pending.ids);
   const current=passport.cards.filter(card=>pending.sections.includes(card.section));
   const added=current.filter(card=>!before.has(card.id)).length;
   setReceipt(added?`${added} new choices in ${pending.sections.map(section=>sectionLabel(section as import('../../src/passport/model').Section)).join(', ')}. Your confirmed tastes are unchanged.`:`No new verified choices were returned for this direction. Your current discoveries remain available. Try another theme or adjust your preferences.`);
   setPending(undefined);started.current=false;
 },[busy,passport.cards,pending]);

 function spin(){
   if(!directions.length||spinning||busy||pending)return;
   const index=Math.floor(Math.random()*directions.length);
   const direction=directions[index];
   if(!direction)return;
   setChoice('');setChoiceSource(undefined);setReceipt('');
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   if(reduced){setChoice(direction.theme.id);setChoiceSource('spin');setSpinning(false);return;}
   const step=360/directions.length;
   const center=wheelAngle(index,directions.length)+step/2;
   const current=((rotation%360)+360)%360;
   const offset=((-90-center-current)%360+360)%360;
   setSpinning(true);
   setRotation(rotation+360*5+offset);
   if(spinTimer.current)window.clearTimeout(spinTimer.current);
   spinTimer.current=window.setTimeout(()=>{setChoice(direction.theme.id);setChoiceSource('spin');setSpinning(false);spinTimer.current=undefined;},3700);
 }

 function apply(){
   if(!selected||busy||pending||spinning)return;
   setReceipt('');started.current=false;
   setPending({ids:passport.cards.filter(card=>selected.sections.includes(card.section)).map(card=>card.id),sections:selected.sections});
   onApply({discovery:{sections:selected.sections,preferences:{inspirationTags:[selected.theme.id],inspirationName:selected.theme.name},preferNew:true}});
 }

 return <dialog ref={dialog} className="vibe-dial-modal" aria-labelledby="vibe-dial-title" onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
   <section className="vibe-dial" aria-busy={spinning||Boolean(pending)}>
     <header className="vibe-dial-modal-heading"><div><span className="micro-label">A LITTLE SERENDIPITY</span><h2 id="vibe-dial-title">Vibe Dial</h2><p>Spin for a new direction from themes in your discoveries. Your saved tastes stay unchanged.</p></div><button type="button" className="quiet-button vibe-dial-close" onClick={onClose}>Close</button></header>
     {!directions.length?<div className="vibe-dial-empty"><p>Your discoveries haven’t returned a distinct theme to spin yet. Explore more categories and come back.</p></div>:<>
       <div className="vibe-wheel-layout">
         <div className="vibe-wheel-wrap" aria-label="Wheel of returned cultural themes">
           <span className="vibe-wheel-pointer" aria-hidden="true"/>
           <svg className={`vibe-wheel${spinning?' is-spinning':''}`} viewBox="0 0 320 320" aria-hidden="true" style={{transform:`rotate(${rotation}deg)`}}>
             <circle cx="160" cy="160" r="154" fill="#fffaf0" stroke="#d7ddd1" strokeWidth="4"/>
             {directions.map((direction,index)=>{
               const step=360/directions.length,center=wheelAngle(index,directions.length)+step/2,radius=92;
               const x=160+radius*Math.cos(center*Math.PI/180),y=160+radius*Math.sin(center*Math.PI/180);
               const width=Math.min(88,Math.max(44,direction.theme.name.length*6.2));
               return <g key={direction.theme.id}><path d={directions.length===1?'':wheelSegment(index,directions.length)} fill={wheelColors[index%wheelColors.length]} stroke="#fffaf0" strokeWidth="3"/>{directions.length===1&&<circle cx="160" cy="160" r="148" fill={wheelColors[index%wheelColors.length]}/>}<text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#fffdf7" fontSize="12" fontWeight="700" textLength={width} lengthAdjust="spacingAndGlyphs">{direction.theme.name}</text></g>;
             })}
             <circle cx="160" cy="160" r="35" fill="#fffaf0" stroke="#d28b37" strokeWidth="4"/>
           </svg>
           <span className="vibe-wheel-hub" aria-hidden="true">✦</span>
         </div>
         <div className="vibe-wheel-controls">
           <span className="micro-label">YOUR RETURNED THEMES</span>
           <div className={`vibe-wheel-selection${selected?' has-selection':''}`} aria-live="polite" aria-atomic="true">
             {spinning?<><strong>Finding a direction…</strong><span>The wheel is choosing from {directions.length} returned themes.</span></>:selected?<><strong>{choiceSource==='spin'?'The wheel landed on':'You chose'} {selected.theme.name}</strong><span>{selected.sections.map(sectionLabel).join(' · ')} · Explore this direction when you’re ready.</span></>:<><strong>Ready when you are</strong><span>{directions.length} themes came back in your discoveries. Spin, or pick one yourself.</span></>}
           </div>
           <button type="button" className="primary-button vibe-wheel-spin" disabled={spinning||busy||Boolean(pending)} onClick={spin}>{spinning?'Spinning…':directions.length===1?'Choose this theme':'Spin the wheel'}</button>
           <button type="button" className={`${selected&&!spinning?'primary-button':'quiet-button'} vibe-wheel-apply`} disabled={!selected||spinning||busy||Boolean(pending)} onClick={apply}>{pending?'Finding choices…':'Explore this direction'}</button>
         </div>
       </div>
       <details className="vibe-wheel-manual"><summary>Choose a theme yourself</summary><div className="vibe-directions" role="group" aria-label="Returned taste themes">{directions.map(direction=><button key={direction.theme.id} type="button" disabled={busy||Boolean(pending)||spinning} aria-pressed={choice===direction.theme.id} onClick={()=>{setChoice(direction.theme.id);setChoiceSource('manual');setReceipt('');}}><strong>{direction.theme.name}</strong><small>{direction.sections.map(sectionLabel).join(' · ')}</small></button>)}</div></details>
       <div className="vibe-dial-feedback">{pending&&<p role="status">{waitingSeconds >= 70 ? 'This is taking longer than expected. Your current discoveries are safe; the request will time out if it cannot finish.' : waitingSeconds >= 12 ? 'Still checking for verified alternatives. You can close this panel while the search finishes.' : 'Checking returned themes against new choices…'}</p>}{receipt&&<p role="status">{receipt}</p>}<small>Every option comes from your returned discoveries. The wheel is a playful picker, not a match score or guarantee.</small></div>
     </>}
   </section>
 </dialog>;
});
