"use client";
import {memo,useEffect,useState} from 'react';
import type {Passport} from '../../src/workspace/state';
import {activityMatches,dayOutOptions,outingActivities} from '../../src/passport/day-out';
import {cityDate,cityTimeZone} from '../../src/account/plans';
import {firstWeek,firstWeekIcs,updateWeekStop,type WeekDay,type WeekRoots} from '../../src/passport/first-week';
import PassportMap from './passport-map';
import {accountRequest,showNotice} from '../../src/account/browser';
import type {SavedFirstWeek} from '../../src/account/first-weeks';

export default memo(function FirstWeek({passport,roots,onLocksChange,signedIn=false,editWeek,onEditWeekHandled}:{passport:Passport;roots?:WeekRoots;onLocksChange?:(locked:boolean)=>void;signedIn?:boolean;editWeek?:{week:SavedFirstWeek;nonce:number};onEditWeekHandled?:()=>void}){
 const [date,setDate]=useState(()=>cityDate(passport.city));
 const [days,setDays]=useState<WeekDay[]>();
 const [active,setActive]=useState(0);
 const [undo,setUndo]=useState<WeekDay[]>();
 const [status,setStatus]=useState('');
 const [saving,setSaving]=useState(false);
 const [weekId,setWeekId]=useState<string>();
 const [editingSavedWeek,setEditingSavedWeek]=useState(false);
 const options=dayOutOptions(roots?Object.values(roots).flat():passport.cards,passport.city);
 const chosen=new Set(days?.flatMap(day=>day.stops.flatMap(stop=>stop.card?.id??[]))??[]);
 function editStop(dayIndex:number,stopIndex:number,patch:Parameters<typeof updateWeekStop>[3]){
   if(!days)return;
   try { const updated=updateWeekStop(days,dayIndex,stopIndex,patch);setUndo(days);setDays(updated);setStatus('Your stop is updated. Other activities are unchanged.'); }
   catch(error){setStatus(error instanceof Error?error.message:'This stop could not be changed.');}
 }
 const hasLocks=days?.some(day=>day.stops.some(stop=>stop.locked))??false;
 useEffect(()=>{onLocksChange?.(hasLocks);return()=>onLocksChange?.(false);},[hasLocks,onLocksChange]);
 useEffect(()=>{
   if(!editWeek||editWeek.week.city!==passport.city)return;
   setDate(editWeek.week.start_date);setDays(structuredClone(editWeek.week.days));setWeekId(editWeek.week.id);setEditingSavedWeek(true);setActive(0);setUndo(undefined);
   setStatus('Your saved First Week is open. Edit places or times, then save it to update this date.');
   onEditWeekHandled?.();
 },[editWeek?.nonce]);
 async function saveWeek(){
   if(!days||!passport.agent)return;
   if(!signedIn){setStatus('Sign in to save this week. Your selections will stay here.');window.dispatchEvent(new Event('tastepassport:open-account'));return;}
   setSaving(true);
   try{
     const saved=await accountRequest('/api/account/first-weeks',{sessionId:passport.agent.sessionId,revision:passport.agent.revision,weekId,startDate:days[0]?.date,roots:Boolean(roots),days:days.map(day=>({title:day.title,date:day.date,stops:day.stops.map(stop=>({activity:stop.activity,time:stop.time,cardId:stop.card?.id??null,locked:Boolean(stop.locked),...(stop.audience?{audience:stop.audience}:{})}))}))});
     setWeekId(saved.week.id);
     setEditingSavedWeek(true);
     setStatus('Your First Week is saved. Open My places → Upcoming plans to reopen it.');
     showNotice('Your First Week is saved.');
     window.dispatchEvent(new CustomEvent<{week:SavedFirstWeek}>('tastepassport:first-weeks-updated',{detail:{week:saved.week}}));
   }catch(error){const message=error instanceof Error?error.message:'Could not save your First Week.';setStatus(message);showNotice(message,'error');}
   finally{setSaving(false);}
 }
 function download(){
   if(!days||days[0]?.date<cityDate(passport.city)){setStatus('Choose today or a future date before downloading.');return;}
   if(!chosen.size){setStatus('Find a place for at least one stop before downloading.');return;}
   const text=firstWeekIcs(days,cityTimeZone(passport.city));
   const url=URL.createObjectURL(new Blob([text],{type:'text/calendar;charset=utf-8'}));
   const link=document.createElement('a');link.href=url;link.download='faveroam-first-week.ics';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
   setStatus('Calendar downloaded. Check each venue’s hours and availability.');
 }
 return <section className="first-week-panel" aria-labelledby="first-week-title">
   <header className="first-week-heading"><div><span className="micro-label">A USEFUL START IN A NEW CITY</span><h3 id="first-week-title">{roots?'Two Roots, One City':'Plan my first week'}</h3>
   <p>{roots?'A week with room for you, for them, and for both. Each place comes from the corresponding confirmed-profile search; it is a starting idea, not a promise of shared enjoyment.':'Seven editable days made from your returned places. Unfilled stops stay open when there isn’t a verified choice.'}</p></div><img src="/illustrations/first-week-route.svg" width="140" height="105" alt="" aria-hidden="true" loading="lazy"/></header>
   <div className="first-week-controls"><label>Start date <input type="date" disabled={hasLocks||saving} min={cityDate(passport.city)} value={date} onChange={event=>{setDate(event.target.value);setDays(undefined);setStatus('');}}/></label>
     <button type="button" className="primary-button" disabled={hasLocks||saving||!options.length||!date||date<cityDate(passport.city)} onClick={()=>{setDays(firstWeek(passport.cards,passport.city,date,roots));if(!editingSavedWeek)setWeekId(undefined);setActive(0);setUndo(undefined);setStatus('');}}>{editingSavedWeek?'Rebuild this week':'Build my first week'}</button>{weekId&&<button type="button" className="quiet-button" disabled={saving} onClick={()=>{setWeekId(undefined);setEditingSavedWeek(false);setDate(cityDate(passport.city));setDays(undefined);setUndo(undefined);setStatus('Choose a date to build a separate First Week. Your saved week stays in Upcoming plans.');}}>Start a different week</button>}</div>
   {!options.length&&<p role="status">No verified local place is available in this Passport yet. Try Food, Coffee or Culture in Discover first.</p>}
   {days&&<><div className="week-days" role="group" aria-label="First week days">{days.map((day,index)=><button key={day.date} type="button" aria-pressed={active===index} onClick={()=>setActive(index)}><strong>Day {index+1}</strong><small>{day.title}</small></button>)}</div>
     <h4>{days[active].title} · {days[active].date}</h4><div className="week-stops">{days[active].stops.map((stop,index)=>{
       const allowed=stop.audience&&roots?dayOutOptions(roots[stop.audience],passport.city):options;
       const alternatives=allowed.filter(card=>activityMatches(card,stop.activity)&&(!chosen.has(card.id)||card.id===stop.card?.id));
       return <div className="week-stop-editor" key={`${active}-${index}`}><span>{stop.audience?`${stop.audience==='you'?'For you':stop.audience==='partner'?'For them':'For both'} · `:''}{outingActivities.find(item=>item.id===stop.activity)?.label??stop.activity}</span>
         <label>Time<input type="time" disabled={stop.locked} value={stop.time} onChange={event=>editStop(active,index,{time:event.target.value})}/></label>
         <label>Place<select disabled={stop.locked} value={stop.card?.id??''} onChange={event=>editStop(active,index,{card:alternatives.find(card=>card.id===event.target.value)})}><option value="">Open stop — no verified place</option>{alternatives.map(card=><option key={card.id} value={card.id}>{card.name}</option>)}</select></label>
         <div className="week-stop-actions"><button type="button" className="quiet-button" disabled={!stop.card} aria-pressed={Boolean(stop.locked)} onClick={()=>editStop(active,index,{locked:!stop.locked})}>{stop.locked?'Unlock stop':'Lock this stop'}</button><button type="button" className="quiet-button" disabled={stop.locked||!stop.card} onClick={()=>editStop(active,index,{card:undefined})}>Remove place</button></div>
       </div>;

     })}</div>
     <PassportMap cards={days[active].stops.flatMap(stop=>stop.card??[])} dayLabels={Object.fromEntries(days[active].stops.flatMap((stop,index)=>stop.card?[[stop.card.id,String(index+1)]]:[]))}/>
     <p className="helper">{chosen.size} unique places selected across seven days. Map distances are visual only; travel times, opening hours and events are unverified.</p>
     {hasLocks&&<p className="helper">Unlock approved stops before rebuilding the week or changing its date.</p>}
     {undo&&<button type="button" className="quiet-button" onClick={()=>{setDays(undo);setUndo(undefined);setStatus('Your last edit was undone.');}}>Undo last edit</button>}
     <div className="first-week-actions">{roots?<p className="helper">Download this shared week here. To save a personal week to Upcoming plans, open First Week from your own Discover workspace.</p>:<button type="button" className="primary-button" disabled={saving||!passport.agent||!days.some(day=>day.stops.some(stop=>stop.card))} onClick={()=>void saveWeek()}>{saving?'Saving your week…':weekId?'Update saved week':'Save First Week'}</button>}<button type="button" className="quiet-button" onClick={download}>Download calendar (.ics)</button></div>{status&&<p role="status">{status}</p>}
   </>}
 </section>;
});
