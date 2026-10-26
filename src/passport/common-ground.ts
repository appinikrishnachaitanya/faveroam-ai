import type {Card} from './model';
import {isPlaceSection} from './model';
import type {TasteComparison} from '../qloo/compare';

/** One locally useful place, preferring an exact returned shared tag. */
export function sharedHangout(cards:Card[],comparison:TasteComparison){
 const places=cards.filter(card=>isPlaceSection(card.section)&&card.evidence?.result.id===card.id&&card.evidence.locality==='physical-city');
 const shared=new Set(comparison.shared.map(tag=>tag.id));
 const direct=places.find(card=>card.evidence?.result.tags.some(tag=>shared.has(tag.id)));
 return direct?{card:direct,exactTheme:true}:places[0]?{card:places[0],exactTheme:false}:undefined;
}
export function commonGroundStarters(comparison:TasteComparison,first:string,second:string):string[]{
 const shared=comparison.shared[0]?.name;
 return [
   shared?`${shared} is a shared theme. What does each of you enjoy about it?`:`What first sparked your interest in ${first} and ${second}?`,
   comparison.aOnly[0]&&comparison.bOnly[0]?`What would you show each other first: ${comparison.aOnly[0].name} or ${comparison.bOnly[0].name}?`:'What is one favourite you would introduce to each other?',
   'Which returned place would you both want to check out first?',
 ];
}

/** Explicit proximity to a returned venue, never an invented city centre. */
export function nearbySharedPlaces(cards:Card[],anchor:Card|undefined,radiusMetres:number):Card[]{
 if(!anchor)return cards;
 const point=anchor.intelligence?.location;
 if(!Number.isFinite(point?.latitude)||!Number.isFinite(point?.longitude)||!Number.isFinite(radiusMetres)||radiusMetres<=0)return [];
 const r=Math.PI/180;
 return cards.filter(card=>{
  const other=card.intelligence?.location;
  if(!Number.isFinite(other?.latitude)||!Number.isFinite(other?.longitude))return false;
  const a=point!.latitude!*r,b=other!.latitude!*r;
  const h=Math.sin((b-a)/2)**2+Math.cos(a)*Math.cos(b)*Math.sin((other!.longitude!-point!.longitude!)*r/2)**2;
  const metres=6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
  return metres<=radiusMetres;
 });
}
