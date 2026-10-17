import type { Card } from "../passport/model.ts";
import { priceLabel } from "../passport/pricing.ts";
/** These are the only sentences the model may select. It never authors recommendation facts. */
export function evidenceFacts(card: Card): string[] {
  const m = card.intelligence,
    params = card.evidence?.params ?? {},
    facts: string[] = [];
  for (const signal of m?.taste.contributingSignals ?? []) {
    const name = card.evidence?.inputs.find(
      (i) => i.id.toLowerCase() === signal.id.toLowerCase(),
    )?.name;
    if (name) facts.push(`${name} helped shape this suggestion.`);
  }
  if (m?.quality.businessRating !== undefined)
    facts.push(`It has a rating of ${m.quality.businessRating} out of 5.`);
  if (priceLabel(m?.commercial.priceLevel))
    facts.push(
      `Its typical budget is ${priceLabel(m?.commercial.priceLevel)?.toLowerCase()}. Check current prices before going.`,
    );
  if (params["filter.location.query"])
    facts.push(`We searched in ${params["filter.location.query"]}.`);
  if (card.trend?.status === "rising")
    facts.push(
      `The latest returned population change was positive over the ${card.trend.startDate}–${card.trend.endDate} trend period.`,
    );
  if (!facts.length)
    facts.push(
      "Your confirmed interests were considered together to find this suggestion.",
    );
  return facts.slice(0, 12);
}
