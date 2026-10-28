import type {DemographicRecord} from '../qloo/analysis';
import {audienceAgeBands} from '../qloo/query-plan';
/** Describe returned aggregate rankings without converting scores into percentages. */
export function audienceContext(records:DemographicRecord[],interests:readonly {id:string;name:string}[]) {
 return interests.map(interest=>{
   const record=records.find(record=>record.id.toLowerCase()===interest.id.toLowerCase());
   const bands=Object.entries(record?.age??{}).flatMap(([key,value])=>{
     if(!audienceAgeBands.includes(key as typeof audienceAgeBands[number])||!Number.isFinite(value)||value<=0)return [];
     return [{label:key.replace('24_and_younger','24 or younger').replace('55_and_older','55 or older').replace(/_to_/g,'–'),value}];
   });
   const maximum=Math.max(...bands.map(band=>band.value));
   return {id:interest.id,name:interest.name,bands:[...new Set(bands.filter(band=>band.value===maximum).map(band=>band.label))]};
 });
}
