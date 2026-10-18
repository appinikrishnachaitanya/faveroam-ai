import type { Card } from "./model.ts";
import { resultBrand } from "./model.ts";
export interface Choice { card: Card; label: string; reason: string }
/** Labels describe comparisons within the actual returned set, not guarantees. */
export function threeChoices(cards: Card[]): Choice[] {
  const remaining = [...new Map(cards.map(c => [c.id, c])).values()];
  if (!remaining.length) return [];
  const choices: Choice[] = [];
  const repeatedNames=new Map<string,number>();
  for(const card of remaining) {
    const token=card.name.toLowerCase().match(/[a-z][a-z0-9&'-]{3,}/)?.[0];
    if(token)repeatedNames.set(token,(repeatedNames.get(token) ?? 0)+1);
  }
  const distinct=()=>{
    const used=new Set(choices.map(c=>resultBrand(c.card,repeatedNames)).filter(Boolean));
    const options=remaining.filter(c=>!resultBrand(c,repeatedNames) || !used.has(resultBrand(c,repeatedNames)));
    return options.length?options:remaining;
  };
  const take = (card: Card, label: string, reason: string) => {
    choices.push({card,label,reason}); remaining.splice(remaining.findIndex(c => c.id === card.id),1);
  };
  const affinity = (c: Card) => c.evidence?.result.affinity?.value;
  const ranked = remaining.filter(c => affinity(c) !== undefined).sort((a,b)=>affinity(b)!-affinity(a)!);
  take(ranked[0] ?? remaining[0], ranked.length ? "Strong taste match" : "Start here",
    ranked.length ? "Highest returned taste affinity in this set." : "First eligible result in the returned ranking.");
  const priced = distinct().filter(c => c.intelligence?.commercial.priceLevel !== undefined)
    .sort((a,b)=>a.intelligence!.commercial.priceLevel!-b.intelligence!.commercial.priceLevel!);
  if (priced.length) {
    const firstPrice=choices[0].card.intelligence?.commercial.priceLevel;
    const lower=firstPrice !== undefined && priced[0].intelligence!.commercial.priceLevel! < firstPrice;
    take(priced[0], lower ? "Lower-price option" : "Known budget", lower ? "Lower returned price category than the first choice. Check current prices." : "Lowest known price category among the remaining choices; not necessarily cheaper than the first. Check current prices.");
  }
  const adjacent = distinct().find(c => c.evidence?.pool === "adjacent");
  if (adjacent && choices.length < 3) take(adjacent, "Explore a little", "Returned by the broader discovery pool; this is not a measured novelty score.");
  while (choices.length < 3 && remaining.length) take(distinct()[0], "Another option", "An additional eligible result; price or a distinct broader match may be unavailable.");
  return choices;
}
