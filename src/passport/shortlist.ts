import type { Card } from "./model.ts";
export interface Choice { card: Card; label: string; reason: string }
/** Labels describe comparisons within the actual returned set, not guarantees. */
export function threeChoices(cards: Card[]): Choice[] {
  const remaining = [...new Map(cards.map(c => [c.id, c])).values()];
  if (!remaining.length) return [];
  const choices: Choice[] = [];
  const take = (card: Card, label: string, reason: string) => {
    choices.push({card,label,reason}); remaining.splice(remaining.findIndex(c => c.id === card.id),1);
  };
  const affinity = (c: Card) => c.evidence?.result.affinity?.value;
  const ranked = remaining.filter(c => affinity(c) !== undefined).sort((a,b)=>affinity(b)!-affinity(a)!);
  take(ranked[0] ?? remaining[0], ranked.length ? "Strong taste match" : "Start here",
    ranked.length ? "Highest returned taste affinity in this set." : "First eligible result in the returned ranking.");
  const priced = remaining.filter(c => c.intelligence?.commercial.priceLevel !== undefined)
    .sort((a,b)=>a.intelligence!.commercial.priceLevel!-b.intelligence!.commercial.priceLevel!);
  if (priced.length) take(priced[0], "Lower-price option", "Lowest known price category among the remaining choices. Check current prices.");
  const adjacent = remaining.find(c => c.evidence?.pool === "adjacent");
  if (adjacent && choices.length < 3) take(adjacent, "Explore a little", "Returned by the broader discovery pool; this is not a measured novelty score.");
  while (choices.length < 3 && remaining.length) take(remaining[0], "Another option", "An additional eligible result; price or a distinct broader match may be unavailable.");
  return choices;
}
