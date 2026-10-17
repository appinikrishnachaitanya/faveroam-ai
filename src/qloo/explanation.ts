import type { Card } from "../passport/model.ts";
/** These are the only sentences the model may select. It never authors recommendation facts. */
export function evidenceFacts(card: Card): string[] {
  const m = card.intelligence,
    params = card.evidence?.params ?? {},
    facts: string[] = [];
  for (const signal of m?.taste.contributingSignals ?? []) {
    const name = card.evidence?.inputs.find(
      (i) => i.id.toLowerCase() === signal.id.toLowerCase(),
    )?.name;
    if (name)
      facts.push(
        `${name} contributed ${(signal.contribution * 100).toFixed(1)}% of the returned contribution score for this suggestion. This is not a likelihood of enjoyment.`,
      );
  }
  if (m?.quality.businessRating !== undefined)
    facts.push(
      `The returned business rating is ${m.quality.businessRating}/5.`,
    );
  if (m?.commercial.priceLevel !== undefined)
    facts.push(
      `The returned price category is ${"$".repeat(m.commercial.priceLevel)}. Check current prices before going.`,
    );
  if (m?.quality.popularity !== undefined)
    facts.push(
      `Its returned popularity is at percentile ${(m.quality.popularity * 100).toFixed(1)}. This does not establish crowd levels.`,
    );
  if (params["filter.location.query"])
    facts.push(
      `The request used ${params["filter.location.query"]} as its location filter.`,
    );
  if (params["bias.quality"])
    facts.push(
      "The request used quality as a ranking signal. That does not establish an unreturned quality score.",
    );
  if (card.trend?.status === "rising")
    facts.push(
      `The latest returned population change was positive over the ${card.trend.startDate}–${card.trend.endDate} trend period.`,
    );
  if (!facts.length)
    facts.push(
      "This suggestion was returned using your confirmed cultural interests together. Individual contribution data was not returned.",
    );
  return facts.slice(0, 12);
}
