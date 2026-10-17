import { isObject } from "../qloo/types.ts";
import type { Entity } from "../qloo/types.ts";
export type Section = "Eat" | "Coffee" | "Culture" | "Lifestyle" | "Music";
export interface Candidate {
  id: string;
  name: string;
  types: string[];
  detail: string;
}
export interface Card extends Candidate {
  section: Section;
  address?: string;
  description?: string;
  affinity?: number;
  inputSignals?: string[];
  evidence?: import("./evidence.ts").QlooEvidence;
  intelligence?: import("../qloo/normalizer.ts").TasteResult;
  trend?: import("../qloo/trending.ts").TrendResult;
  trendUnavailable?: boolean;
}
function resultBrand(card: Card, repeatedNames?: Map<string, number>) {
  const tags = card.evidence?.result.tags ?? [];
  const named = tags.find((tag) =>
    /brand|franchise|business:place:chain/i.test(
      `${tag.type ?? ""} ${tag.name}`,
    ),
  );
  if (named) return named.name.toLowerCase().trim();
  const token = card.name.toLowerCase().match(/[a-z][a-z0-9&'-]{3,}/)?.[0];
  if (token && (repeatedNames?.get(token) ?? 0) > 1) return token;
  return undefined;
}

/** Keep repeated branches from consuming a coffee chapter. */
export function diversifyCards(cards: Card[], section: Section) {
  if (section !== "Coffee" || cards.length < 3) return cards;
  const nameCounts = new Map<string, number>();
  for (const card of cards) {
    const token = card.name.toLowerCase().match(/[a-z][a-z0-9&'-]{3,}/)?.[0];
    if (token) nameCounts.set(token, (nameCounts.get(token) ?? 0) + 1);
  }
  const counts = new Map<string, number>();
  return cards.filter((card) => {
    const brand = resultBrand(card, nameCounts);
    if (!brand) return true;
    const count = counts.get(brand) ?? 0;
    if (count >= 2) return false;
    counts.set(brand, count + 1);
    return true;
  });
}
export function candidate(e: Entity): Candidate {
  const p = e.properties ?? {};
  return {
    id: e.entity_id,
    name: e.name,
    types: e.types ?? [e.subtype ?? e.type ?? "Unknown"],
    detail: [p.release_year, p.address, p.short_description]
      .filter((v) => typeof v === "string" || typeof v === "number")
      .join(" · ")
      .slice(0, 250),
  };
}
export function candidates(entities: Entity[]): Candidate[] {
  return [
    ...new Map(entities.map((e) => [e.entity_id, candidate(e)])).values(),
  ].slice(0, 5);
}
/** Conservative local classification uses returned tag NAMES only, never invented
 * filter parameters. Unknown types are omitted, and non-leisure services excluded.
 * This sacrifices recall for precision; no inference from taste names. */
export function classify(e: Entity): Section | undefined {
  const tags = Array.isArray(e.tags)
    ? e.tags
        .filter(isObject)
        .map((t) => (typeof t.name === "string" ? t.name.toLowerCase() : ""))
        .join(" ")
    : "";
  const text = `${e.name} ${tags}`.toLowerCase();
  if (
    /consulate|embassy|government|hospital|airport|medical|diplomatic/.test(
      text,
    )
  )
    return;
  if (/coffee|cafe|café|espresso|tea house/.test(tags)) return "Coffee";
  if (/restaurant|dining|cuisine|food|bistro|bakery|pizza/.test(tags))
    return "Eat";
  if (
    /museum|gallery|theater|theatre|performing arts|concert|cinema|cultural|nightclub|night club/.test(
      tags,
    )
  )
    return "Culture";
  if (/bookstore|book shop|record store|boutique|shopping|yoga/.test(tags))
    return "Lifestyle";
}
export function card(e: Entity, section: Section): Card {
  const p = e.properties ?? {};
  return {
    ...candidate(e),
    section,
    ...(typeof p.address === "string" ? { address: p.address } : {}),
    ...(typeof p.short_description === "string"
      ? { description: p.short_description.slice(0, 500) }
      : {}),
    ...(typeof e.query?.affinity === "number"
      ? { affinity: e.query.affinity }
      : {}),
  };
}
