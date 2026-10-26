import {activityMatches,dayOutOptions,outingActivities} from './day-out';
import type {Card} from './model';

const days:[string,string[]][]=[
  ['Settle in',['Coffee','Eat']],
  ['A taste of home',['Eat','Coffee']],
  ['Discover culture',['Culture','Eat']],
  ['Find a new routine',['Coffee','Culture']],
  ['Make room for wonder',['Culture','Eat']],
  ['Explore after dark',['Eat','Nightlife']],
  ['Your new favourites',['Coffee','Eat','Culture']],
];
export interface WeekStop {activity:string;card?:Card;time:string}
export interface WeekDay {title:string;date:string;stops:WeekStop[]}
export function addCalendarDays(date:string,offset:number){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Choose a valid date.');const value=new Date(`${date}T12:00:00Z`);if(Number.isNaN(value.getTime())||value.toISOString().slice(0,10)!==date)throw Error('Choose a valid date.');value.setUTCDate(value.getUTCDate()+offset);return value.toISOString().slice(0,10);}
/** Uses only current validated city places; gaps remain explicit. */
export function firstWeek(cards:Card[],city:string,startDate:string):WeekDay[]{
 const available=dayOutOptions(cards,city),used=new Set<string>();
 return days.map(([title,activities],dayIndex)=>({title,date:addCalendarDays(startDate,dayIndex),stops:activities.map((activity,stopIndex)=>{
   const card=available.find(option=>!used.has(option.id)&&activityMatches(option,activity));
   if(card)used.add(card.id);
   return {activity,card,time:['10:00','14:00','18:00'][stopIndex]};
 })}));
}
function escapeIcs(value:string){return value.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/[,;]/g,char=>`\\${char}`);}
export function firstWeekIcs(days:WeekDay[],timeZone:string):string {
 const events=days.flatMap(day=>day.stops.flatMap(stop=>stop.card?[{
   date:day.date.replaceAll('-',''),time:stop.time.replace(':',''),stop,
 }]:[]));
 if(!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+$/.test(timeZone))throw Error('Invalid time zone.');
 if(events.some(event=>!/^(?:[01]\d|2[0-3])[0-5]\d$/.test(event.time)))throw Error('Choose a valid stop time.');
 const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//TastePassport//First Week//EN','CALSCALE:GREGORIAN',...events.flatMap(({date,time,stop},index)=>[
   'BEGIN:VEVENT',`UID:${date}-${time}-${index}@tastepassport`, `DTSTAMP:${stamp}`,
   `DTSTART;TZID=${timeZone}:${date}T${time}00`,
   `DTEND;TZID=${timeZone}:${new Date(new Date(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6)}T${time.slice(0,2)}:${time.slice(2)}:00Z`).getTime()+3600000).toISOString().replace(/[-:]/g,'').slice(0,15)}`,
   `SUMMARY:${escapeIcs(stop.card!.name)}`,
   `DESCRIPTION:${escapeIcs(`${outingActivities.find(item=>item.id===stop.activity)?.label??stop.activity}. Check hours and availability before going.`)}`,
   ...(stop.card!.address?[`LOCATION:${escapeIcs(stop.card!.address!)}`]:[]),'END:VEVENT',
 ]),'END:VCALENDAR'].join('\r\n')+'\r\n';
}
