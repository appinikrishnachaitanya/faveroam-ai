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
export type WeekAudience='you'|'partner'|'both';
export type WeekRoots=Record<WeekAudience,Card[]>;
export interface WeekStop {activity:string;card?:Card;time:string;locked?:boolean;audience?:WeekAudience}
export interface WeekDay {title:string;date:string;stops:WeekStop[]}
/** One explicit edit, preserving every other stop and all approved locks. */
export function updateWeekStop(days:WeekDay[],dayIndex:number,stopIndex:number,patch:Partial<Pick<WeekStop,'card'|'time'|'locked'>>):WeekDay[]{
 const stop=days[dayIndex]?.stops[stopIndex];
 if(!stop)throw Error('Choose an existing stop.');
 if(stop.locked && ('card' in patch || 'time' in patch))throw Error('Unlock this stop before changing it.');
 if(patch.locked && !stop.card)throw Error('Choose a place before locking this stop.');
 if(patch.time!==undefined&&!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(patch.time))throw Error('Choose a valid time.');
 if(patch.card){
   if(!activityMatches(patch.card,stop.activity))throw Error('Choose a place for this activity.');
   if(days.some((day,i)=>day.stops.some((item,j)=>(i!==dayIndex||j!==stopIndex)&&item.card?.id===patch.card!.id)))throw Error('This place is already in your week.');
 }
 return days.map((day,i)=>i===dayIndex?{...day,stops:day.stops.map((item,j)=>j===stopIndex?{...item,...patch}:item)}:day);
}
export function addCalendarDays(date:string,offset:number){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Choose a valid date.');const value=new Date(`${date}T12:00:00Z`);if(Number.isNaN(value.getTime())||value.toISOString().slice(0,10)!==date)throw Error('Choose a valid date.');value.setUTCDate(value.getUTCDate()+offset);return value.toISOString().slice(0,10);}
/** Uses only current validated city places; gaps remain explicit. */
export function firstWeek(cards:Card[],city:string,startDate:string,roots?:WeekRoots):WeekDay[]{
 const available=dayOutOptions(cards,city),used=new Set<string>();
 const audiences:WeekAudience[]=['you','both','partner','both','you','partner','both'];
 return days.map(([title,activities],dayIndex)=>({title,date:addCalendarDays(startDate,dayIndex),stops:activities.map((activity,stopIndex)=>{
   const audience=roots?audiences[dayIndex]:undefined;
   const pool=audience&&roots?dayOutOptions(roots[audience],city):available;
   const card=pool.find(option=>!used.has(option.id)&&activityMatches(option,activity));
   if(card)used.add(card.id);
   return {activity,card,time:['10:00','14:00','18:00'][stopIndex],...(audience?{audience}:{})};
 })}));
}
function escapeIcs(value:string){return value.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/[,;]/g,char=>`\\${char}`);}
export function firstWeekIcs(days:WeekDay[],timeZone:string):string {
 days.forEach(day=>addCalendarDays(day.date,0));
 const events=days.flatMap(day=>day.stops.flatMap(stop=>stop.card?[{
   date:day.date.replaceAll('-',''),time:stop.time.replace(':',''),stop,
 }]:[]));
 if(timeZone!=='UTC'&&!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+$/.test(timeZone))throw Error('Invalid time zone.');
 new Intl.DateTimeFormat('en',{timeZone}).format();
 if(events.some(event=>!/^(?:[01]\d|2[0-3])[0-5]\d$/.test(event.time)))throw Error('Choose a valid stop time.');
 const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//FaveRoam//First Week//EN','CALSCALE:GREGORIAN',...events.flatMap(({date,time,stop},index)=>[
   'BEGIN:VEVENT',`UID:${date}-${time}-${encodeURIComponent(stop.card!.id)}-${index}@faveroam`, `DTSTAMP:${stamp}`,
   `DTSTART;TZID=${timeZone}:${date}T${time}00`,
   `DTEND;TZID=${timeZone}:${new Date(new Date(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6)}T${time.slice(0,2)}:${time.slice(2)}:00Z`).getTime()+3600000).toISOString().replace(/[-:]/g,'').slice(0,15)}`,
   `SUMMARY:${escapeIcs(stop.card!.name)}`,
   `DESCRIPTION:${escapeIcs(`${outingActivities.find(item=>item.id===stop.activity)?.label??stop.activity}. Check hours and availability before going.`)}`,
   ...(stop.card!.address?[`LOCATION:${escapeIcs(stop.card!.address!)}`]:[]),'END:VEVENT',
 ]),'END:VCALENDAR'].map(line=>{let folded='',size=0;for(const char of line){const bytes=new TextEncoder().encode(char).length;if(size+bytes>75){folded+='\r\n ';size=1;}folded+=char;size+=bytes;}return folded;}).join('\r\n')+'\r\n';
}
