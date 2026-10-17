import { trending, type TrendResult } from "./trending.ts";
import type { Card } from "../passport/model.ts";
/** Optional enrichment has a separate short deadline and can never discard Insights results. */
export async function enrichTrends(
  cards: Card[],
  signal?: AbortSignal,
  lookup = trending,
  timeoutMs = 8000,
) {
  const deadline = AbortSignal.timeout(timeoutMs);
  const bounded = signal ? AbortSignal.any([signal, deadline]) : deadline;
  for (const card of cards.slice(0, 3)) {
    try {
      if (bounded.aborted) throw Error("Trend enrichment deadline");
      const type =
        card.section === "Music" ? "urn:entity:artist" : "urn:entity:place";
      card.trend = await Promise.race([
        lookup(card.id, type, bounded),
        new Promise<TrendResult>((_, reject) => {
          bounded.addEventListener(
            "abort",
            () => reject(Error("Trend enrichment deadline")),
            { once: true },
          );
        }),
      ]);
      card.trendUnavailable = !card.trend.points.length;
    } catch {
      card.trendUnavailable = true;
    }
  }
  return cards;
}
