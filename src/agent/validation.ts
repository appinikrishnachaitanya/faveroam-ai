import { isObject, parseEntities } from "../qloo/types.ts";
import type { Entity } from "../qloo/types.ts";
import { card, classify } from "../passport/model.ts";
import type { Candidate, Card, Section } from "../passport/model.ts";
import type { Constraint, ToolResult } from "./types.ts";
export function tagCandidates(result: ToolResult, query: string): Candidate[] {
  if (result.status !== "ok" || !Array.isArray(result.results)) return [];
  return result.results
    .filter(isObject)
    .filter(
      (t) =>
        typeof t.id === "string" &&
        /^urn:tag:[\w:-]+$/.test(t.id) &&
        typeof t.name === "string",
    )
    .slice(0, 5)
    .map((t) => ({
      id: String(t.id),
      name: String(t.name),
      types: [typeof t.type === "string" ? t.type : "urn:tag"],
      detail: `Qloo concept for ${query}`,
    }));
}
/** Preserve the existing service exclusions, then require place-category/genre
 * evidence. "Nearby food trucks" on a landmark is not a dining classification. */
export function validatedSection(e: Entity): Section | undefined {
  if (!classify(e)) return;
  const scoped = Array.isArray(e.tags)
    ? e.tags
        .filter(isObject)
        .filter(
          (t) =>
            String(t.type ?? "").startsWith("urn:tag:category:place") ||
            String(t.type ?? "").startsWith("urn:tag:genre:place"),
        )
    : [];
  const names = scoped
    .map((t) => String(t.name ?? ""))
    .join(" ")
    .toLowerCase();
  if (
    /government|consulate|hospital|airport|financial institution|tourist attraction|landmark/.test(
      names,
    )
  )
    return;
  if (/coffee|cafe|café|tea house/.test(names)) return "Coffee";
  if (/restaurant|dining|bakery|bistro|food court|pizza/.test(names))
    return "Eat";
  if (/museum|gallery|theat(?:er|re)|concert|cinema/.test(names))
    return "Culture";
  if (/bookstore|book shop|record store|boutique|shopping|yoga/.test(names))
    return "Lifestyle";
}
export function satisfies(e: Entity, constraints: Constraint[]): boolean {
  const tags = Array.isArray(e.tags) ? e.tags.filter(isObject) : [];
  if (
    constraints.includes("touristy") &&
    tags.some((t) =>
      /tourist attraction|tourist focused|touristic/i.test(
        String(t.name ?? ""),
      ),
    )
  )
    return false;
  if (
    constraints.includes("mainstream") &&
    typeof (e as Entity & { popularity?: number }).popularity === "number" &&
    (e as Entity & { popularity: number }).popularity > 0.9
  )
    return false;
  if (
    constraints.includes("expensive") &&
    typeof e.properties?.price_level === "number" &&
    e.properties.price_level > 2
  )
    return false;
  return true;
}
export function validateDiscoveries(
  body: unknown,
  city: string,
  section: Section,
  constraints: Constraint[],
  excluded: string[],
): Card[] {
  const entities = parseEntities(body, "insights");
  return entities
    .filter((e) => !excluded.includes(e.entity_id) && satisfies(e, constraints))
    .filter((e) => {
      if (section === "Music")
        return (e.subtype ?? e.type) === "urn:entity:artist";
      if (
        (e.subtype ?? e.type) !== "urn:entity:place" ||
        validatedSection(e) !== section
      )
        return false;
      const geo = e.properties?.geocode;
      if (!isObject(geo)) return false;
      const label = city === "New York City" ? "new york" : city.toLowerCase();
      return [geo.city, geo.metro, geo.name].some(
        (v) =>
          typeof v === "string" &&
          (v.toLowerCase() === label || v.toLowerCase() === city.toLowerCase()),
      );
    })
    .map((e) => card(e, section));
}
