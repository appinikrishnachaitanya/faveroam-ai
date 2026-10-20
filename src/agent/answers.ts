import { categoryLanguage } from "./category-language.ts";
import { chatShortlist, chatReason } from "./chat-shortlist.ts";
import type { Card } from "../passport/model.ts";
import { displayTags } from "../qloo/explanation.ts";
import { formatReturnedRating } from "../passport/rating-display.ts";
import { sectionOrder } from "../workspace/state.ts";

export function cardSpecificAnswer(card: Card, query?: string): string {
  const m = card.intelligence;
  const rating = m?.quality?.businessRating;
  const price = priceLabel(m?.commercial?.priceLevel);
  const tags = displayTags(card.evidence?.result.tags ?? []).map(t => t.name);
  const lines: string[] = [
    `${card.name} (${card.section === "Eat" ? "Dining" : card.section}):`
  ];
  if (card.address) lines.push(`• **Location:** ${card.address}`);
  if (rating !== undefined) lines.push(`• **Qloo-reported business rating:** ${formatReturnedRating(rating)} / 5`);
  if (price) lines.push(`• **Price Category:** ${price} (${m?.commercial?.priceLevel ?? 1}/4)`);
  if (tags.length) lines.push(`• **Returned Tags:** ${[...new Set(tags)].slice(0, 4).join(", ")}`);

  if (query && /quiet|calm|noise|atmosphere/i.test(query)) {
    const hasQuiet = tags.some(t => /quiet|calm|intimate|tranquil/i.test(t));
    if (hasQuiet) {
      lines.push("• **Atmosphere:** Tagged with quiet/calm ambience in Qloo metadata.");
    } else {
      lines.push("• **Atmosphere:** Not explicitly tagged as quiet. Real-time acoustic or noise level data is not available.");
    }
  }

  const facts = evidenceFacts(card);
  const culturalConnections = facts.filter(f =>
    f.includes("helped shape") ||
    f.includes("Audience-taste") ||
    f.includes("associated with") ||
    f.includes("matching requirements") ||
    f.includes("broader discovery")
  );
  if (culturalConnections.length) {
    lines.push(`• **Taste Signals:** ${culturalConnections.slice(0, 2).join(" ")}`);
  } else {
    lines.push("• **Taste Signals:** Selected based on cultural profile affinity; individual causal contribution not returned.");
  }
  lines.push("\nYour Passport is unchanged.");
  return lines.join("\n");
}

import type { AgentState, Intent } from "./types.ts";
import { evidenceFacts } from "../qloo/explanation.ts";
import { priceLabel } from "../passport/pricing.ts";

/** Read-only answers are rendered from current server state, never invented by the model. */
export function passportAnswer(state: AgentState, intent: Intent): string {
  if (intent.targetCardId) {
    const card = [...state.cards, ...(state.savedCards ?? []), ...state.previous].find(c => c.id === intent.targetCardId);
    if (card) return cardSpecificAnswer(card);
  }
  if (intent.question === "capabilities")
    return `I can refine your ${state.city} discoveries by cuisine, budget, rating or atmosphere, explain returned matches, and find cinema, coffee or dinner stops for an outing. Tell me what to change and what to keep. I cannot book tickets or verify live opening hours.`;
  const sections = intent.sections.length ? intent.sections : state.intent?.sections.length ? state.intent.sections : state.activeCategories ?? [];
  if (intent.question === "preferences") {
    const lines = sections.map(section => {
      const query = state.queryPreferences?.[section] ?? {};
      const requirements = (state.categoryTags?.[section] ?? []).flatMap(id => {
        const tag = state.tags.find(tag => tag.id === id); return tag ? [tag.name] : [];
      });
      const values = [...new Set(requirements)];
      if (query.priceMax !== undefined) values.push(`maximum price category ${query.priceMax}/4 (${priceLabel(query.priceMax) ?? "relative price"})`);
      if (query.businessRatingMin !== undefined) values.push(`minimum rating ${query.businessRatingMin}/5`);
      if (query.excludeTags?.length || query.excludeEntities?.length) values.push("your saved exclusions");
      return `${section}: ${values.join(", ") || "no additional category filters"}.`;
    });
    return `Your destination is ${state.city}. Confirmed tastes: ${state.selected.map(taste => taste.name).join(", ") || "none"}. ${lines.join(" ")} Your Passport is unchanged.`;
  }
  const cards = state.cards.filter(card => !sections.length || sections.includes(card.section)).slice(0, 3);
  if (!cards.length) return "There are no returned matches in that section to explain yet. Tell me which category you want to discover. Your Passport is unchanged.";
  return cards.map(card => `${card.name}: ${evidenceFacts(card).filter(fact => !fact.startsWith("Your interests were considered together")).slice(0, 2).join(" ")}`).join("\n\n") + "\n\nThese are returned listing and taste signals, not proof that one interest caused a recommendation. Your Passport is unchanged.";
}

// Chat is a first-class recommendation surface. "List them here" is read-only,
// so it must never re-run Qloo, change the Passport, or invent venue metadata.
const listWords = new Set("please can could you bro hey list show display give me tell name what are which did find have found here them these those results suggestions recommendations your already current existing the my all in passport restaurants restaurant dining places place venues venue coffee cafes cafe movies movie films film books book music culture museums museum galleries gallery cinema nightlife nightclubs nightclub shows show series tv games game gaming podcasts podcast lifestyle shops shop shopping bookstores bookstore brands brand people artists artist authors author destinations destination cities".split(" "));
export function isListRequest(text: string): boolean {
  const request=categoryLanguage(text).trim().toLowerCase();
  if (request.match(/[a-z]+/g)?.some(word=>!listWords.has(word))) return false;
  const verb = /^(?:(?:please|can you|could you|bro|hey)\s+)*(?:list|show|display|give me|tell me|name|what are|which are|what did you find|what have you found)\b/.test(request);
  if (!verb || /\b(?:new|more|different|fresh|another|find me|cheaper|quieter|vegetarian|vegan|budget|rating|under|without|exclude|independent)\b/.test(request)) return false;
  return /\b(?:here|them|these|those|results|suggestions|recommendations|your list|already|current|existing|you found|found)\b/.test(request) || /\bwhat did you find\b/.test(request) ||
    /^(?:(?:please|can you|could you|bro|hey)\s+)*list\b/.test(request) &&
      /\b(?:restaurants?|dining|places|venues|coffee|cafes?|movies|films|books|music)\b/.test(request);
}
export function listPassportResults(state: AgentState, request: string): string {
  const q=categoryLanguage(request).toLowerCase();
  const section = /\b(?:restaurants?|dining|food|eat)\b/.test(q) ? "Eat"
    : /\b(?:coffee|cafes?)\b/.test(q) ? "Coffee"
    : /\b(?:movies?|films?)\b/.test(q) ? "Movies"
    : /\bbooks?\b/.test(q) ? "Books"
    : /\bmusic\b/.test(q) ? "Music"
    : /\b(?:museums?|culture|gallery|galleries|cinema|nightlife|nightclubs?)\b/.test(q) ? "Culture"
    : /\b(?:shows?|series|tv)\b/.test(q) ? "Shows"
    : /\b(?:games?|gaming)\b/.test(q) ? "Games"
    : /\bpodcasts?\b/.test(q) ? "Podcasts"
    : /\b(?:lifestyle|shops?|shopping|bookstores?)\b/.test(q) ? "Lifestyle"
    : /\bbrands?\b/.test(q) ? "Brands"
    : /\b(?:people|artists?|authors?)\b/.test(q) ? "People"
    : /\b(?:destinations?|cities)\b/.test(q) ? "Destinations"
    : state.intent?.sections?.length === 1 ? state.intent.sections[0] : undefined;
  const requested = section ? [section] : sectionOrder.filter(s => state.cards.some(c=>c.section===s) && !(state.hiddenCategories ?? []).includes(s));
  const visible = state.cards.filter(c=>requested.includes(c.section) && !(state.hiddenCategories??[]).includes(c.section));
  if (!visible.length) return "I don't have any current recommendations for that category yet. Ask me to discover them first—your existing Passport hasn't changed.";
  const rows=visible.slice(0,40).map((card,i)=>{
    const m=card.intelligence;
    const rating=m?.quality?.businessRating!==undefined ? ` · ★ ${formatReturnedRating(m.quality.businessRating)}/5 (Qloo-reported)`
      : m?.externalProof?.tripadvisorRating!==undefined ? ` · ★ ${formatReturnedRating(m.externalProof!.tripadvisorRating)}/5 (Tripadvisor)` : "";
    const location=card.address ?? m?.location?.address;
    return `${i+1}. ${card.name} (${card.section === "Eat" ? "Dining" : card.section})${location ? ` — ${location}` : ""}${rating}`;
  });
  const sectionLabel = section === "Eat" ? "dining" : section?.toLowerCase() ?? "Passport";
  const countNote = visible.length>rows.length ? ` Showing ${rows.length} of ${visible.length}.` : "";
  return `Here are your ${visible.length} current ${sectionLabel} suggestions in ${state.city}:

${rows.join("\n")}

These are the recommendations already in your Passport, not new searches.${countNote} Ask me about any place or tell me which ones to refine.`;
}

/** Evidence-only preview: an agent update should show what changed, not only a counter. */
export function previewRefinedResults(state: AgentState, sections: readonly import("../passport/model.ts").Section[]): string {
  const cards=chatShortlist(state,sections);
  if(!cards.length)return "";
  const lines=cards.map((card,index)=>{
    const rating=formatReturnedRating(card.intelligence?.quality?.businessRating);
    return `${index+1}. ${card.name} (${card.section==="Eat"?"Dining":card.section})${card.address ? ` — ${card.address}` : ""}${rating ? ` · ★ ${rating}/5 (Qloo-reported)` : ""}\n${chatReason(card)}`;
  });
  return `\n\nHere are ${cards.length} choices to consider:\n${lines.join("\n\n")}\n\nAsk why one fits, compare two, or say "list them here" for the complete returned list.`;
}
