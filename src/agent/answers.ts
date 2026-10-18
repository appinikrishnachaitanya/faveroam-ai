import type { AgentState, Intent } from "./types.ts";
import { evidenceFacts } from "../qloo/explanation.ts";
import { priceLabel } from "../passport/pricing.ts";

/** Read-only answers are rendered from current server state, never invented by the model. */
export function passportAnswer(state: AgentState, intent: Intent): string {
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
