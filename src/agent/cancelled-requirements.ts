import type {AgentState,Intent} from './types.ts';
import type {Section} from '../passport/model.ts';
export function isRequirementRemoval(text:string) {
  return /\b(?:remove|drop|cancel|forget)\s+[^.!?;]*(?:cuisine|requirement)|\b(?:don['’]t|do not)\s+(?:need|want)\b/i.test(text);
}
/** Cancellation removes requirements, never creates a negative cuisine preference. */
export function removeCancelledRequirements(state:AgentState,intent:Intent,text:string,sections:Section[]) {
  const clauses=[...text.matchAll(/\b(?:don['’]t (?:need|want)|do not (?:need|want)|remove|cancel|forget|drop)\s+([^.!?;,]+?)(?=\s+(?:but|instead|just|only|all i want)\b|[.!?;,]|$)/gi)].map(match=>match[1].toLowerCase());
  const atmosphereOnly=/\b(?:just|only|all i want)\b/i.test(text)&&/\b(?:quiet|peaceful|peacefully|calm|relaxing)\b/i.test(text);
  const cancelCuisine=clauses.some(clause=>/^(?:any |the )?cuisine(?: requirements?| preferences?)?$/i.test(clause.trim()));
  const tokens=(value:string):string[]=>value.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[];
  const cancelled=(value:string)=>clauses.some(clause=>tokens(clause).filter(word=>!['any','the','food','cuisine','requirements','requirement'].includes(word)).some(word=>tokens(value).includes(word)));
  const allRemoved=new Set<string>();
  for(const section of sections) {
    const removed=new Set(state.tags.filter(tag=>cancelled(tag.name)||(atmosphereOnly||cancelCuisine)&&section==='Eat'&&/^urn:tag:(?:cuisine|specialty_dish):/.test(tag.id)).map(tag=>tag.id));
    for(const id of removed)allRemoved.add(id);
    state.categoryTags ??= {};
    state.categoryTags[section]=(state.categoryTags[section]??[]).filter(id=>!removed.has(id));
    if(state.queryPreferences?.[section]?.includeTags) state.queryPreferences[section]!.includeTags=state.queryPreferences[section]!.includeTags!.filter(id=>!removed.has(id));
    if(state.queryPreferences?.[section]?.inspirationTags) state.queryPreferences[section]!.inspirationTags=state.queryPreferences[section]!.inspirationTags!.filter(id=>!removed.has(id)&&!cancelled(id));
    state.categoryConcepts ??= {};
    state.categoryConcepts[section]=(state.categoryConcepts[section]??[]).filter(concept=>!cancelled(concept)&&(!(atmosphereOnly||cancelCuisine)||section!=='Eat'||/quiet|peaceful|calm|relax/i.test(concept)));
  }
  intent.concepts=intent.concepts.filter(concept=>!cancelled(concept)&&(!(atmosphereOnly||cancelCuisine)||/quiet|peaceful|calm|relax/i.test(concept)));
  intent.excludeConcepts=intent.excludeConcepts?.filter(concept=>!cancelled(concept));
  if(intent.query?.includeTags)intent.query.includeTags=intent.query.includeTags.filter(id=>!allRemoved.has(id));
  if(intent.query?.inspirationTags)intent.query.inspirationTags=intent.query.inspirationTags.filter(id=>!allRemoved.has(id)&&!cancelled(id));
}
