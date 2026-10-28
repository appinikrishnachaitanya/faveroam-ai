import { sectionLabel } from "../passport/labels.ts";
import type { AgentState } from "./types.ts";
import type { Card, Section } from "../passport/model.ts";
import { sectionOrder } from "../workspace/state.ts";
import { displayTags } from "../qloo/explanation.ts";
import { formatReturnedRating } from "../passport/rating-display.ts";
import { categoryLanguage } from "./category-language.ts";
import { refinementScope } from "./scope.ts";

const shortlistWords = new Set(["top","best","pick","choose","recommend","show","give","me","one","1","each","list","artist","movie","film","discoveries","explain","two","2","three","3","where","should","i","start","help","what","try","am","m","not","sure","surprise","with","your","current","existing","already","from","my","interests","across","all","categories","a","the","and","or","for","in","please","bro","things","choices","choice","recommendations","results","suggestions","starting","dining","restaurants","restaurant","food","coffee","cafes","music","artists","movies","films","books","culture","museums","cinema","nightlife","shows","series","games","podcasts","brands","people","destinations","passport"]);

/** Asking for help choosing existing results is not permission to change filters. */
export function isShortlistRequest(text: string): boolean {
  text=categoryLanguage(text);
  // Plain, explicitly counted outputs survive longer correction wording.
  // Qualifiers such as a cuisine or quietness still require interpretation.
  const quantified=quantifiedSections(text);
  if(quantified.length>1 && quantifiedSections(text,true).length===quantified.length && !/\b(?:find|search|new|cheaper|quieter|vegetarian|vegan|rating|budget|replace|remove|update|refine|change|adjust)\b/i.test(text))return true;
  if (/\b(?:find|search|new|more|different|cheaper|quieter|vegetarian|vegan|rating|budget|replace|remove|update|refine|change|adjust)\b/i.test(text)) return false;
  const remaining=text.toLowerCase().replace(/[’']/g," ").replace(/[^a-z0-9]+/g," ").split(/\s+/).filter(Boolean)
    .filter(word=>!shortlistWords.has(word));
  if(remaining.length)return false;
  return /\b(?:top|best|pick|choose|recommend|show|give me)\b.*\b(?:3|three)\b|\b(?:where should i start|help me choose|what should i try|i(?:'m| am) not sure|surprise me with your current)\b/i.test(text) ||
    (requestedShortlistSections(text)?.length ?? 0)>1 && /\b(?:show|give|list|recommend|pick|choose|explain)\b/i.test(text) &&
      /\b(?:one|each|current|existing|discoveries|recommendations|results|suggestions|across)\b/i.test(text);
}

const names:[Section,RegExp][]=[["Eat",/\b(?:restaurants?|dining|dinner|food)\b/i],["Coffee",/\b(?:coffee|caf[eé]s?)\b/i],["Music",/\b(?:music|artists?)\b/i],["Movies",/\b(?:movies?|films?)\b/i],["Culture",/\b(?:culture|museums?|cinema|nightlife|night\s*clubs?)\b/i],["Books",/\bbooks?\b/i],["Shows",/\b(?:shows|tv|television|series)\b/i],["Podcasts",/\bpodcasts?\b/i],["Games",/\bgames?\b/i],["Lifestyle",/\b(?:shops?|bookstores?)\b/i],["Brands",/\bbrands?\b/i],["People",/\b(?:people|authors?)\b/i],["Destinations",/\b(?:destinations?|cities)\b/i]];
function quantifiedSections(request:string,plain=false):Section[] {
  const quantity=plain ? /\b(?:one|1|single)\s+(?:(?:good|best|top|recommended)\s+)?$/i
    : /\b(?:one|1|single)\s+(?:(?!(?:and|or|not|no|instead|but)\b)[\p{L}-]+\s+){0,3}$/iu;
  return names.filter(([,pattern])=>[...request.matchAll(new RegExp(pattern.source,'gi'))].some(match=>
    quantity.test(request.slice(0,match.index)) &&
    !/\b(?:not|no|without|rather than|instead of)\s+(?:one|1|single)\s+(?:(?:good|best|top|recommended)\s+)?$/i.test(request.slice(0,match.index))
  )).map(([section])=>section);
}
export function requestedShortlistSections(request:string):Section[]|undefined {
  request=categoryLanguage(refinementScope(request).positive);
  const quantified=quantifiedSections(request);
  if(quantified.length>1)return quantified;
  const result=names.filter(([,pattern])=>[...request.matchAll(new RegExp(pattern.source,'gi'))].some(match=>{
    const prefix=request.slice(0,match.index);
    return !/\b(?:not|no|skip|exclude|without|instead of|rather than|don['’]t want|do not want|don['’]t focus on|do not focus on)\s+(?:(?:any|more|the|my)\s+)?$/i.test(prefix);
  })).map(([section])=>section);
  return result.length ? result : undefined;
}

export function chatShortlist(state: AgentState, sections?: readonly Section[]): Card[] {
  const requested = sections?.length ? sections : state.activeCategories?.length ? state.activeCategories : sectionOrder;
  const order = [...new Set(requested)].filter(section=>!state.hiddenCategories?.includes(section));
  // Within a category, cards from the requested search come before broader or unverified fallbacks.
  const pools=order.map(section=>{const cards=state.cards.filter(card=>card.section===section);
    return [...cards.filter(card=>!chatBroadening(card)),...cards.filter(card=>chatBroadening(card))];});
  if(sections && sections.length>1)return pools.flatMap(pool=>pool[0]?[pool[0]]:[]).slice(0,3);
  const chosen:Card[]=[];
  // One starting choice per category before additional choices from any category.
  for(let rank=0;chosen.length<3 && pools.some(pool=>pool.length>rank);rank++)
    for(const pool of pools) if(pool[rank] && !chosen.some(card=>card.id===pool[rank].id)) {
      chosen.push(pool[rank]);
      if(chosen.length===3)break;
    }
  return chosen;
}

/** Cards from broader or unverified routes need the same label everywhere they appear. */
export function chatBroadening(card:Card):{label:string;text:string;dish:boolean}|undefined {
  const note=card.evidence?.strategyNote??"";
  if(note.startsWith("Dish match not verified:"))return {label:"Dish not verified",text:note,dish:true};
  if(note.startsWith("Broader local"))return {label:"Broader local suggestion",text:"Broader local suggestion: your venue requirements were kept, but taste similarity was broadened, so it is not tied to one specific interest.",dish:false};
  if(card.evidence?.pool==="adjacent")return {label:"Broader discovery",text:"Broader discovery: this comes from a wider reading of your cultural profile, not a match to one specific interest.",dish:false};
  return undefined;
}

function specificReason(card:Card,confirmedIds?:readonly string[]):string|undefined {
  const inputs=card.evidence?.inputs ?? [];
  const tags=displayTags(card.evidence?.result?.tags ?? []);
  const matched=tags.filter(tag=>inputs.some(input=>input.id===tag.id));
  if(matched.length) return `${matched.slice(0,2).map(tag=>tag.name).join(" and ")} appears in both this listing’s tags and the search used to find it.`;
  const positive=(card.intelligence?.taste?.contributingSignals ?? []).filter(signal=>Number.isFinite(signal.contribution)&&signal.contribution>0)
    .sort((a,b)=>b.contribution-a.contribution)
    .flatMap(signal=>inputs.filter(input=>input.id.toLowerCase()===signal.id.toLowerCase()));
  const own=confirmedIds&&new Set(confirmedIds.map(id=>id.toLowerCase()));
  const names=positive.filter(input=>!own||own.has(input.id.toLowerCase())).map(input=>input.name);
  if(names.length) return `An audience-taste signal connects this listing with ${[...new Set(names)].slice(0,2).join(" and ")}${tags.length ? `; its listed themes include ${tags.slice(0,2).map(tag=>tag.name).join(" and ")}` : ""}.`;
  const additional=[...new Set(positive.map(input=>input.name))];
  if(additional.length)return `A returned audience signal connects this listing to the additional search signal ${additional.slice(0,2).join(" and ")}; this was not one of your confirmed tastes.`;
}

export function chatReason(card: Card,confirmedIds?:readonly string[]): string {
  const broader=chatBroadening(card),specific=specificReason(card,confirmedIds);
  if(broader)return specific&&!broader.dish?`${broader.text} ${specific}`:broader.text;
  if(specific)return specific;
  const inputs=card.evidence?.inputs ?? [];
  const tags=displayTags(card.evidence?.result?.tags ?? []);
  const seeds=[...new Set(inputs.filter(input=>input.role!=="tag-filter").map(input=>input.name))].slice(0,2);
  if(seeds.length) return `Found in a search using ${seeds.join(" and ")}. An individual taste connection wasn’t supplied for this result.`;
  return tags.length ? `Listed as ${tags.slice(0,2).map(tag=>tag.name).join(" and ")}. Individual taste evidence is unavailable.`
    : "A current Passport discovery. There isn’t enough returned evidence to explain a more specific taste connection.";
}

/** Only tastes the person confirmed may be shown as theirs. Entities the app resolved
 * from refinement wording (a dietary phrase, a dish) are reported separately. */
export function chatTasteEvidence(card:Card,confirmedIds:readonly string[]):{names:string[];associated:boolean;requestNames:string[]} {
  const inputs=card.evidence?.inputs ?? [];
  const confirmed=new Set(confirmedIds.map(id=>id.toLowerCase()));
  const isConfirmed=(id:string)=>confirmed.has(id.toLowerCase());
  const signals=inputs.filter(input=>input.role==='entity-signal'||input.role==='tag-signal');
  const requestNames=[...new Set(signals.filter(input=>!isConfirmed(input.id)).map(input=>input.name))].slice(0,2);
  const contributors=(card.intelligence?.taste?.contributingSignals ?? [])
    .filter(signal=>Number.isFinite(signal.contribution) && signal.contribution>0)
    .sort((a,b)=>b.contribution-a.contribution)
    .flatMap(signal=>inputs.find(input=>input.id.toLowerCase()===signal.id.toLowerCase() && input.role==='entity-signal' && isConfirmed(input.id))?.name ?? []);
  const names=[...new Set(contributors)].slice(0,2);
  if(names.length)return {names,associated:true,requestNames};
  return {names:[...new Set(signals.filter(input=>isConfirmed(input.id)).map(input=>input.name))].slice(0,2),associated:false,requestNames};
}

export function chatShortlistText(state:AgentState,cards:Card[],sections?:readonly Section[]):string {
  if(!cards.length)return "There aren’t any current choices to shortlist yet. Tell me which category you’d like to discover; I’ll keep the others as they are.";
  const rows=cards.map((card,index)=>{
    const rating=formatReturnedRating(card.intelligence?.quality?.businessRating);
    return `${index+1}. ${card.name} (${sectionLabel(card.section)})${rating ? ` · ★ ${rating}/5` : ""}\n${chatReason(card)}`;
  });
  const missing=sections?.filter(section=>!cards.some(card=>card.section===section)) ?? [];
  return `Here are ${cards.length} starting ${cards.length===1?"choice":"choices"} from your ${state.city} Passport:\n\n${rows.join("\n\n")}\n\n${missing.length?`No current choices for ${missing.map(sectionLabel).join(', ')}. Ask me to discover those categories. `:''}These are current discoveries, not a new search. Ask why one fits, compare two, or tell me what you’d change.`;
}

export function lastPresentedIds(state:AgentState):string[] {
  const presentation=state.history?.slice().reverse().find(turn=>turn.role==="agent" && turn.recommendationIds!==undefined);
  return Array.isArray(presentation?.recommendationIds) ? presentation.recommendationIds.filter((id):id is string=>typeof id==='string').slice(0,3) : state.conversationMemory?.lastPresentedIds?.slice(0,3) ?? [];
}

/** Full textual lists and rich shortlists both establish references for choosing.
 * Undefined means no prior presentation; an empty array deliberately clears it. */
export function lastReferencedIds(state: AgentState): string[] | undefined {
  const presentation = state.history?.slice().reverse().find(turn => turn.role === "agent" &&
    (turn.referenceIds !== undefined || turn.recommendationIds !== undefined));
  const ids = presentation?.referenceIds ?? presentation?.recommendationIds ?? state.conversationMemory?.lastPresentedIds;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string").slice(0, 40) : undefined;
}
