import type { Card } from "../passport/model.ts";
import { priceLabel } from "../passport/pricing.ts";
/** These are the only sentences the model may select. It never authors recommendation facts. */
export function evidenceFacts(card: Card): string[] {
  const m = card.intelligence,
    params = card.evidence?.params ?? {},
    facts: string[] = [];
  const returnedTags = card.evidence?.result.tags ?? [];
  const matched = returnedTags.filter(tag => card.evidence?.inputs.some(input => input.id === tag.id));
  if (matched.length)
    facts.push(`Its returned tags include ${matched.slice(0,3).map(tag => tag.name).join(", ")}, matching requirements or interests used in this search.`);
  const categories = returnedTags.filter(tag => /urn:tag:(?:genre|category):place/.test(tag.type ?? tag.id));
  if (categories.length)
    facts.push(`Listed as ${[...new Set(categories.map(tag => tag.name))].slice(0,3).join(", ")}.`);
  if (card.evidence?.strategyNote?.startsWith("Broader local"))
    facts.push(
      "This is a broader local suggestion; your venue requirements were kept.",
    );
  else if (
    card.evidence?.inputs.some(
      (i) => i.role === "entity-signal" || i.role === "tag-signal",
    )
  )
    facts.push(
      "Your interests were considered together; this does not establish an individual taste relationship.",
    );
  for (const signal of m?.taste.contributingSignals ?? []) {
    if (signal.contribution <= 0) continue;
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
  if (card.address) facts.push(`Located at ${card.address}. Check opening hours before going.`);
  else if (params["filter.location.query"])
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
