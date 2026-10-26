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
