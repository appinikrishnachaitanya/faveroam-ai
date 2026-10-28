import type {Card} from './model';
import {isPlaceSection} from './model';
import type {TasteComparison} from '../qloo/compare';

export type HangoutBasis='shared-theme'|'both-profiles'|'one-profile'|'search-only';
/** One locally useful place. Prefers venue-specific evidence in this order: a returned shared theme
 * on the listing (plus audience signals for both people when present), audience signals tying it to both
 * people, a signal for one person, and only then the first verified local place with no connection claimed. */
export function sharedHangout(cards:Card[],comparison:TasteComparison,you:readonly {id:string;name:string}[]=[],partner:readonly {id:string;name:string}[]=[]){
 const places=cards.filter(card=>isPlaceSection(card.section)&&card.evidence?.result.id===card.id&&card.evidence.locality==='physical-city');
 const shared=new Set(meaningfulSharedThemes(comparison).filter(theme=>!theme.broad).map(tag=>tag.id));
 const ranked=places.map((card,index)=>{
  const themes=[...new Set((card.evidence?.result.tags??[]).filter(tag=>shared.has(tag.id)).map(tag=>tag.name))];
  const positive=new Set((card.intelligence?.taste?.contributingSignals??[]).filter(signal=>Number.isFinite(signal.contribution)&&signal.contribution>0).map(signal=>signal.id.toLowerCase()));
  const youNames=you.filter(seed=>positive.has(seed.id.toLowerCase())).map(seed=>seed.name);
  const partnerNames=partner.filter(seed=>positive.has(seed.id.toLowerCase())).map(seed=>seed.name);
  const both=youNames.length>0&&partnerNames.length>0;
  const tier=themes.length&&both?0:themes.length?1:both?2:youNames.length||partnerNames.length?3:4;
  const basis:HangoutBasis=tier<=1?'shared-theme':tier===2?'both-profiles':tier===3?'one-profile':'search-only';
  const broadened=card.evidence?.strategyNote?.startsWith('Broader local')||card.evidence?.pool==='adjacent';
  return {card,index,tier,basis,themes,you:youNames,partner:partnerNames,broadened,exactTheme:themes.length>0};
 }).sort((a,b)=>a.tier-b.tier||Number(a.broadened)-Number(b.broadened)||(b.themes.length+b.you.length+b.partner.length)-(a.themes.length+a.you.length+a.partner.length)||a.index-b.index);
 return ranked[0];
}
/** Plain-language reason for the venue, never stronger than the returned evidence. */
export function hangoutExplanation(hangout:NonNullable<ReturnType<typeof sharedHangout>>):string{
 const quote=(names:string[])=>names.slice(0,3).map(name=>`“${name}”`).join(', ');
 const join=(names:string[])=>names.slice(0,2).join(' and ');
 const scope=hangout.broadened?' This came from a broader search, so check whether it suits both of you.':'';
 if(hangout.basis==='shared-theme')return `Its listing carries the shared theme${hangout.themes.length>1?'s':''} ${quote(hangout.themes)}.${hangout.you.length&&hangout.partner.length?' Returned audience signals also connect it to both of you.':''}${scope}`;
 if(hangout.basis==='both-profiles')return `Returned audience signals connect this place with ${join(hangout.you)} (you) and ${join(hangout.partner)} (them), although its listing carries none of the shared themes.${scope}`;
 if(hangout.basis==='one-profile')return `A returned audience signal connects this place with ${join([...hangout.you,...hangout.partner])} only. Nothing returned ties it to both of you or to a shared theme.${scope}`;
 return `This place was returned by the shared-interest search. Nothing returned ties this listing to a specific shared theme or to either person individually, so treat it as a starting point rather than a proven match.${scope}`;
}
export function commonGroundStarters(comparison:TasteComparison,first:string,second:string):string[]{
 const shared=meaningfulSharedThemes(comparison).find(theme=>!theme.broad)?.name;
 return [
   shared?`The comparison returned “${shared}”. Does that connect to what you enjoy in ${first} or ${second}?`:`What first sparked your interest in ${first}, and their interest in ${second}?`,
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

/** Presentation specificity only: broad adjectives are not personal explanations. */
export function meaningfulSharedThemes(comparison:TasteComparison){
 const broad=(name:string)=>/^(dynamic|passionate|innovative|ambitious|creative|entertainment|popular|versatile|expressive)$/i.test(name.trim());
 const specific=comparison.shared.filter(theme=>!broad(theme.name));
 return (specific.length?specific:comparison.shared.slice(0,2)).slice(0,6).map(theme=>({...theme,broad:broad(theme.name)}));
}
export function togetherPlanningCards(cards:Card[],city:string,limit=12):Card[]{
 return [...new Map(cards.filter(card=>isPlaceSection(card.section)&&card.evidence?.source==='Qloo'&&card.evidence.result.id===card.id&&card.evidence.locality==='physical-city'&&card.evidence.destination===city).map(card=>[card.id,card])).values()].slice(0,limit);
}
export function commonGroundLinks(cards:Card[],you:readonly {id:string;name:string}[],partner:readonly {id:string;name:string}[]){
 return cards.flatMap(card=>{
  const ids=new Set(card.intelligence?.taste?.contributingSignals?.filter(signal=>signal.contribution>0).map(signal=>signal.id)??[]);
  const a=you.filter(seed=>ids.has(seed.id)).map(seed=>seed.name),b=partner.filter(seed=>ids.has(seed.id)).map(seed=>seed.name);
  return a.length&&b.length?[{card,you:a,partner:b}]:[];
 }).slice(0,3);
}

/** Combine profiles using returned shared themes as SOFT audience signals. */
export function jointProfileState(state:import('../agent/types').AgentState,partner:import('./model').Candidate[],comparison:TasteComparison,section:import('./model').Section){
 const joint=structuredClone(state);
 const themes=meaningfulSharedThemes(comparison).slice(0,4).map(theme=>({id:theme.id,name:theme.name,types:['urn:tag'],detail:'Returned common ground'}));
 joint.selected=[...new Map([...state.selected,...partner].map(seed=>[seed.id,seed])).values()];
 joint.tags=[...new Map([...state.tags,...themes].map(tag=>[tag.id,tag])).values()];
 joint.categoryTags??={};
 joint.queryPreferences??={};joint.queryPreferences[section]={...joint.queryPreferences[section],inspirationTags:themes.map(tag=>tag.id)};
 joint.intent={kind:'refine',seeds:[],concepts:[],constraints:state.categoryConstraints[section]??[],sections:[section],strategy:'discover'};
 if(joint.activityGenres)delete joint.activityGenres.Culture;
 return joint;
}

/** Personal retrieval can overlap; never label the same venue as two introductions. */
export function distinctIntroductions<T extends {card?:Card;cards:Card[];theme?:string}>(profiles:T[]):(T & {card:Card|undefined;theme:string|undefined})[] {
 const used=new Set<string>(),names=new Set<string>();
 const venueName=(card:Card)=>card.name.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 return profiles.map(profile=>{
  const card=profile.cards.find(candidate=>!used.has(candidate.id)&&!names.has(venueName(candidate)));
  if(card){used.add(card.id);names.add(venueName(card));}
  return {...profile,card,theme:card?.evidence?.result.tags.some(tag=>tag.name===profile.theme)?profile.theme:undefined};
 });
}
