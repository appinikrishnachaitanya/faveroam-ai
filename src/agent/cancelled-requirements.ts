import type {AgentState,Intent} from './types.ts';
import type {Section} from '../passport/model.ts';
/** Cancellation removes requirements, never creates a negative cuisine preference. */
export function removeCancelledRequirements(state:AgentState,intent:Intent,text:string,sections:Section[]) {
  const clauses=[...text.matchAll(/\b(?:don['’]t (?:need|want)|do not (?:need|want)|remove|cancel|forget|drop)\s+([^.!?;,]+?)(?=\s+(?:but|instead|just|only|all i want)\b|[.!?;,]|$)/gi)].map(match=>match[1].toLowerCase());
  const atmosphereOnly=/\b(?:just|only|all i want)\b/i.test(text)&&/\b(?:quiet|peaceful|peacefully|calm|relaxing)\b/i.test(text);
  const cancelCuisine=clauses.some(clause=>/^(?:any |the )?cuisine(?: requirements?| preferences?)?$/i.test(clause.trim()));
  const tokens=(value:string):string[]=>value.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[];
  const cancelled=(value:string)=>clauses.some(clause=>tokens(clause).filter(word=>!['any','the','food','cuisine','requirements','requirement'].includes(word)).some(word=>tokens(value).includes(word)));
  for(const section of sections) {
    const removed=new Set(state.tags.filter(tag=>cancelled(tag.name)||(atmosphereOnly||cancelCuisine)&&section==='Eat'&&/^urn:tag:(?:cuisine|specialty_dish):/.test(tag.id)).map(tag=>tag.id));
    state.categoryTags ??= {};
    state.categoryTags[section]=(state.categoryTags[section]??[]).filter(id=>!removed.has(id));
    if(state.queryPreferences?.[section]?.includeTags) state.queryPreferences[section]!.includeTags=state.queryPreferences[section]!.includeTags!.filter(id=>!removed.has(id));
    state.categoryConcepts ??= {};
    state.categoryConcepts[section]=(state.categoryConcepts[section]??[]).filter(concept=>!cancelled(concept)&&(!(atmosphereOnly||cancelCuisine)||section!=='Eat'||/quiet|peaceful|calm|relax/i.test(concept)));
  }
  intent.concepts=intent.concepts.filter(concept=>!cancelled(concept)&&(!(atmosphereOnly||cancelCuisine)||/quiet|peaceful|calm|relax/i.test(concept)));
  intent.excludeConcepts=intent.excludeConcepts?.filter(concept=>!cancelled(concept));
}
