import type { Card } from "../passport/model.ts";
import { priceLabel } from "../passport/pricing.ts";
/** Only useful descriptive families belong in customer copy, never plot/actions or audience keywords. */
export function displayTags<T extends {id:string;name:string}>(tags: readonly T[]): T[] {
  const seen = new Set<string>();
  return tags.filter(tag => {
    if (!/^urn:tag:(?:genre|category|cuisine|specialty_dish|ambience|dietary_option|style|subgenre):/.test(tag.id)) return false;
    const key = tag.name.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  });
}
/** Contributions are audience associations, not inferred plot/genre similarity. */
export function screenTasteConnection(card: Card): string | undefined {
  if (card.section !== "Movies" && card.section !== "Shows") return;
  const names = (card.intelligence?.taste.contributingSignals ?? [])
    .filter(signal => signal.contribution > 0)
    .sort((a,b) => b.contribution - a.contribution)
    .flatMap(signal => {
      const input = card.evidence?.inputs.find(input => input.id.toLowerCase() === signal.id.toLowerCase() && input.role === "entity-signal");
      if (!input || input.name === input.id) return [];
      const domain = input.types?.includes("urn:entity:artist") ? "music" : input.types?.includes("urn:entity:movie") ? "film" : undefined;
      return [`${input.name}${domain ? ` (${domain})` : ""}`];
    });
  if (names.length) return `Audience-taste association with ${[...new Set(names)].slice(0,2).join(" and ")}; this does not establish a shared story or genre.`;
  if (card.evidence?.inputs.some(input => input.role === "entity-signal"))
    return "No individual supporting interest was identified in the response; this search association does not establish a shared story or genre.";
}
/** These are the only sentences the model may select. It never authors recommendation facts. */
export function evidenceFacts(card: Card): string[] {
  const m = card.intelligence,
    params = card.evidence?.params ?? {},
    facts: string[] = [];
  const signals = card.evidence?.inputs.filter(input => input.role === "entity-signal") ?? [];
  if (card.evidence?.pool === "direct" && signals.length)
    facts.push(`This familiar search used ${signals.map(input => input.name).join(", ")}. Search inputs are not proof of an individual connection.`);
  else if (card.evidence?.pool === "adjacent")
    facts.push("This is a broader discovery from your cultural profile, rather than a promise of similarity to one interest.");
  const returnedTags = displayTags(card.evidence?.result.tags ?? []);
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
  const screenConnection = screenTasteConnection(card);
  if (screenConnection) facts.push(screenConnection);
  for (const signal of screenConnection ? [] : m?.taste.contributingSignals ?? []) {
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
  if (!facts.length)
    facts.push(
      "Your confirmed interests were considered together to find this suggestion.",
    );
  return facts.slice(0, 12);
}

/** Short customer-facing copy uses specific returned evidence, never generic search membership. */
export function recommendationSummary(card: Card): string | undefined {
  const inputs=card.evidence?.inputs ?? [];
  const contributors=card.intelligence?.taste.contributingSignals ?? [];
  const connected=contributors.filter(signal=>signal.contribution>0).flatMap(signal=>{
    const input=inputs.find(input=>input.id.toLowerCase()===signal.id.toLowerCase());
    return input?[input.name]:[];
  });

  const tags=displayTags(card.evidence?.result.tags ?? []).filter(tag=>!/urn:tag:(?:genre|category):place/.test(tag.type ?? tag.id));
  const matches=tags.filter(tag=>inputs.some(input=>input.id===tag.id));
  const screenConnection = screenTasteConnection(card);
  if (screenConnection) return `${tags.slice(0,2).map(tag=>tag.name).join(" · ")}${tags.length ? ". " : ""}${screenConnection}`;
  if(matches.length) return `Matches ${matches.some(tag=>tag.id.includes(":dietary_option:")) ? "" : "your interest in "}${[...new Set(matches.map(tag=>tag.name))].slice(0,3).join(" · ")}${matches.some(tag=>tag.id.includes(":dietary_option:")) ? " options; confirm the menu with the venue" : ""}.`;
  if(connected.length && card.section !== "Eat" && card.section !== "Coffee") {
    const details=tags.slice(0,2).map(tag=>tag.name).join(" · ");
    return `${details ? details+". " : ""}Returned taste signals include ${[...new Set(connected)].slice(0,2).join(" and ")}.`;
  }
  return [...new Set(tags.map(tag=>tag.name))].slice(0,3).join(" · ") || undefined;
}
