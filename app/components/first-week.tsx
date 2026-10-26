"use client";
import {useState} from 'react';
import type {Passport} from '../../src/workspace/state';
import {activityMatches,dayOutOptions,outingActivities} from '../../src/passport/day-out';
import {cityDate,cityTimeZone} from '../../src/account/plans';
import {firstWeek,firstWeekIcs,type WeekDay} from '../../src/passport/first-week';
import PassportMap from './passport-map';

export default function FirstWeek({passport}:{passport:Passport}){
 const [date,setDate]=useState(()=>cityDate(passport.city));
 const [days,setDays]=useState<WeekDay[]>();
 const [active,setActive]=useState(0);
 const [status,setStatus]=useState('');
 const options=dayOutOptions(passport.cards,passport.city);
 const chosen=new Set(days?.flatMap(day=>day.stops.flatMap(stop=>stop.card?.id??[]))??[]);
 function changeStop(dayIndex:number,stopIndex:number,id:string){
   setDays(previous=>previous?.map((day,i)=>i===dayIndex?{...day,stops:day.stops.map((stop,j)=>j===stopIndex?{...stop,card:options.find(card=>card.id===id)}:stop)}:day));
 }
 function download(){
   if(!days||days[0]?.date<cityDate(passport.city)){setStatus('Choose today or a future date before downloading.');return;}
   if(!chosen.size){setStatus('Find a place for at least one stop before downloading.');return;}
   const text=firstWeekIcs(days,cityTimeZone(passport.city));
   const url=URL.createObjectURL(new Blob([text],{type:'text/calendar;charset=utf-8'}));
   const link=document.createElement('a');link.href=url;link.download='tastepassport-first-week.ics';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
   setStatus('Calendar downloaded. Check each venue’s hours and availability.');
 }
 return <section className="first-week-panel" aria-labelledby="first-week-title">
   <span className="micro-label">A USEFUL START IN A NEW CITY</span><h3 id="first-week-title">Plan my first week</h3>
   <p>Seven editable days made from your returned places. Unfilled stops stay open when there isn’t a verified choice.</p>
   <div className="first-week-controls"><label>Start date <input type="date" min={cityDate(passport.city)} value={date} onChange={event=>{setDate(event.target.value);setDays(undefined);setStatus('');}}/></label>
     <button type="button" className="primary-button" disabled={!options.length||!date||date<cityDate(passport.city)} onClick={()=>{setDays(firstWeek(passport.cards,passport.city,date));setActive(0);setStatus('');}}>Build my first week</button></div>
   {!options.length&&<p role="status">No verified local place is available in this Passport yet. Try Food, Coffee or Culture in Discover first.</p>}
   {days&&<><div className="week-days" role="group" aria-label="First week days">{days.map((day,index)=><button key={day.date} type="button" aria-pressed={active===index} onClick={()=>setActive(index)}><strong>Day {index+1}</strong><small>{day.title}</small></button>)}</div>
     <h4>{days[active].title} · {days[active].date}</h4><div className="week-stops">{days[active].stops.map((stop,index)=>{
       const alternatives=options.filter(card=>activityMatches(card,stop.activity)&&(!chosen.has(card.id)||card.id===stop.card?.id));
       return <label key={`${active}-${index}`}><span>{outingActivities.find(item=>item.id===stop.activity)?.label??stop.activity}</span>
         <input type="time" value={stop.time} onChange={event=>setDays(current=>current?.map((day,i)=>i===active?{...day,stops:day.stops.map((item,j)=>j===index?{...item,time:event.target.value}:item)}:day))}/>
         <select value={stop.card?.id??''} onChange={event=>changeStop(active,index,event.target.value)}><option value="">Open stop — no verified place</option>{alternatives.map(card=><option key={card.id} value={card.id}>{card.name}</option>)}</select>
       </label>;
     })}</div>
     <PassportMap cards={days[active].stops.flatMap(stop=>stop.card??[])} dayLabels={Object.fromEntries(days[active].stops.flatMap((stop,index)=>stop.card?[[stop.card.id,String(index+1)]]:[]))}/>
     <p className="helper">{chosen.size} unique places selected across seven days. Map distances are visual only; travel times, opening hours and events are unverified.</p>
     <button type="button" className="quiet-button" onClick={download}>Download calendar (.ics)</button>{status&&<p role="status">{status}</p>}
   </>}
 </section>;
}
