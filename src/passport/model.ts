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
    /museum|gallery|theater|theatre|performing arts|concert|cinema|cultural/.test(
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
