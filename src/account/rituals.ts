import type {AgentState} from '../agent/types.ts';
import type {Card} from '../passport/model.ts';
export const ritualRecurrences=['weekly','fortnightly'] as const;
export const ritualStatuses=['planned','tried','kept'] as const;
export type RitualContext=Pick<AgentState,'selected'|'tags'|'constraints'|'categoryConstraints'|'categoryConcepts'|'categoryTags'|'queryPreferences'|'activityGenres'|'categoryModes'|'discoveryMode'|'feedback'>;
export interface Ritual {id:string;name:string;city:string;weekday:number;recurrence:typeof ritualRecurrences[number];status:typeof ritualStatuses[number];card:Card;created_at:string;updated_at:string}
export interface RitualReceipt {steps:string[];retrievals:number;candidateCount:number}
export function ritualFields(body:Record<string,unknown>){
 if(typeof body.name!=='string'||!body.name.trim()||body.name.trim().length>80||/[<>\x00-\x1f]/.test(body.name))throw Error('Give your ritual a name of 1–80 characters.');
 if(!Number.isInteger(body.weekday)||Number(body.weekday)<0||Number(body.weekday)>6)throw Error('Choose a weekday.');
 if(!ritualRecurrences.includes(body.recurrence as never))throw Error('Choose weekly or every two weeks.');
 if(!ritualStatuses.includes(body.status as never))throw Error('Choose a valid ritual status.');
 return {name:body.name.trim(),weekday:Number(body.weekday),recurrence:body.recurrence as Ritual['recurrence'],status:body.status as Ritual['status']};
}
export function ritualContext(state:AgentState):RitualContext {
 return structuredClone({selected:state.selected,tags:state.tags,constraints:state.constraints,categoryConstraints:state.categoryConstraints,categoryConcepts:state.categoryConcepts,categoryTags:state.categoryTags,queryPreferences:state.queryPreferences,activityGenres:state.activityGenres,categoryModes:state.categoryModes,discoveryMode:state.discoveryMode,feedback:state.feedback});
}
export function verifiedRitualCard(card:Card|undefined,city:string):Card {
 if(!card||card.evidence?.source!=='Qloo'||card.evidence.result.id!==card.id||card.evidence.destination!==city)throw Error('Choose a verified discovery from this city.');
 const value=structuredClone(card);
 if(new TextEncoder().encode(JSON.stringify(value)).length>60_000)throw Error('This discovery is too large to save as a ritual.');
 return value;
}
export function ritualFromSession(state:AgentState,body:Record<string,unknown>){
 if(body.revision!==state.revision)throw Error('Your Passport changed. Choose the latest discovery again.');
 const card=[...state.cards,...(state.savedCards??[])].find(c=>c.id===body.cardId&&!state.hiddenCategories?.includes(c.section)&&!state.feedback.some(f=>f.id===c.id&&!f.accepted));
 return {...ritualFields(body),city:state.city,card:verifiedRitualCard(card,state.city),context:ritualContext(state)};
}
/** Replacement searches use saved confirmed interests, current relevant constraints,
 * and all explicit dislikes. They never mutate the active Passport or plans. */
export function ritualReplacementState(current:AgentState,ritual:Ritual,context:RitualContext):AgentState {
 if(current.city!==ritual.city)throw Error(`Open your ${ritual.city} Passport to replace this ritual.`);
 const section=ritual.card.section;
 const state=structuredClone({...current,...context,cards:[],previous:[],savedCards:[],history:[],pending:undefined,intent:undefined,conversationMemory:undefined});
 state.categoryConstraints[section]=[...new Set([...(context.categoryConstraints[section]??[]),...(current.categoryConstraints[section]??[])])];
 state.queryPreferences={...context.queryPreferences,[section]:{...context.queryPreferences?.[section],...current.queryPreferences?.[section]}};
 state.categoryTags={...context.categoryTags,[section]:[...new Set([...(context.categoryTags?.[section]??[]),...(current.categoryTags?.[section]??[])])]};
 state.feedback=[...context.feedback,...current.feedback,{id:ritual.card.id,section,accepted:false,reason:'Not interested'}];
 return state;
}
