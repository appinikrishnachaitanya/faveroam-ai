import type { Card } from "../passport/model.ts";
import { displayTags } from "../qloo/explanation.ts";

export function cardSpecificAnswer(card: Card, query?: string): string {
  const m = card.intelligence;
  const rating = m?.quality.businessRating;
  const price = priceLabel(m?.commercial.priceLevel);
  const tags = displayTags(card.evidence?.result.tags ?? []).map(t => t.name);
  const lines: string[] = [
    `**${card.name}** (${card.section === "Eat" ? "Dining" : card.section}):`
  ];
  if (card.address) lines.push(`• **Location:** ${card.address}`);
  if (rating !== undefined) lines.push(`• **Rating:** ${rating.toFixed(1)} / 5`);
  if (price) lines.push(`• **Price Category:** ${price} (${m?.commercial.priceLevel ?? 1}/4)`);
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
    const card = [...state.cards, ...state.savedCards, ...state.previous].find(c => c.id === intent.targetCardId);
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
