import { validatedSection } from "../agent/validation.ts";
import type { Card, Section } from "./model.ts";

export const dayOutStops: { section: Section; label: string }[] = [
  { section: "Coffee", label: "Ease into your new city" },
  { section: "Culture", label: "Find a new perspective" },
  { section: "Eat", label: "Make yourself at home" },
];
export const outingActivities = [
  { id: "Coffee", section: "Coffee", label: "Coffee" },
  { id: "Culture", section: "Culture", label: "Culture" },
  { id: "Eat", section: "Eat", label: "Dinner" },
  { id: "Cinema", section: "Culture", label: "Cinema" },
  { id: "Nightlife", section: "Culture", label: "Nightlife" },
] as const;
export function activityMatches(card: Card, activity: string) {
  const item = outingActivities.find(a => a.id === activity);
  if (!item || card.section !== item.section) return false;
  const tags = (card.evidence?.result.tags ?? []).map(t => t.name).join(" ");
  if (activity === "Cinema") return /cinema|movie theater|movie theatre/i.test(tags);
  if (activity === "Nightlife") return /nightclub|night club/i.test(tags);
  return true;
}

/** An editable sequence, not a route optimizer or a claim of live availability. */
export function dayOutOptions(cards: Card[], city: string): Card[] {
  return [
    ...new Map(
      cards
        .filter(
          (card) =>
            card.evidence?.source === "Qloo" &&
            card.evidence.result.id === card.id &&
            card.evidence.result.type === "urn:entity:place" &&
            card.evidence.destination === city &&
            card.evidence.locality === "physical-city" &&
            validatedSection({
              entity_id: card.id,
              name: card.name,
              type: "urn:entity:place",
              tags: card.evidence.result.tags,
              properties: { short_description: card.description },
            }) === card.section &&
            dayOutStops.some((stop) => stop.section === card.section),
        )
        .map((card) => [card.id, card]),
    ).values(),
  ];
}

export function dayOutText(city: string, cards: Card[], date?: string): string {
  return [
    `My day out in ${city} · TastePassport AI`,
    ...(date ? [`Planned for ${date}`] : []),
    "Suggested sequence. Check opening hours, travel times and availability before going.",
    ...cards.map(
      (card, i) =>
        `${i + 1}. ${card.name} (${card.section})${card.address ? `\n   ${card.address}` : ""}\n   Suggestion recorded: ${card.evidence?.recordedAt ?? "unknown"}`,
    ),
    "Built from my confirmed tastes and personalized suggestions. No booking has been made.",
  ].join("\n\n");
}

/** Straight-line distance only; never a travel-time or routing claim. */
export function stopDistance(a: Card, b: Card): number | undefined {
  const x = a.intelligence?.location,
    y = b.intelligence?.location;
  if (
    x?.latitude === undefined ||
    x.longitude === undefined ||
    y?.latitude === undefined ||
    y.longitude === undefined
  )
    return;
  const rad = (n: number) => (n * Math.PI) / 180;
  const d =
    Math.sin(rad(y.latitude - x.latitude) / 2) ** 2 +
    Math.cos(rad(x.latitude)) *
      Math.cos(rad(y.latitude)) *
      Math.sin(rad(y.longitude - x.longitude) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, d)));
}
