import type { Card, Section } from "./model.ts";

export const dayOutStops: { section: Section; label: string }[] = [
  { section: "Coffee", label: "Ease into your new city" },
  { section: "Culture", label: "Find a new perspective" },
  { section: "Eat", label: "Make yourself at home" },
];

/** An editable sequence, not a route optimizer or a claim of live availability. */
export function dayOutOptions(cards: Card[], city: string): Card[] {
  return [...new Map(cards.filter((card) =>
    card.evidence?.source === "Qloo" &&
    card.evidence.result.id === card.id &&
    card.evidence.result.type === "urn:entity:place" &&
    card.evidence.destination === city &&
    card.evidence.locality === "physical-city" &&
    dayOutStops.some((stop) => stop.section === card.section),
  ).map((card) => [card.id, card])).values()];
}

export function dayOutText(city: string, cards: Card[]): string {
  return [
    `My day out in ${city} · TastePassport AI`,
    "Suggested sequence. Check opening hours, travel times and availability before going.",
    ...cards.map((card, i) => `${i + 1}. ${card.name} (${card.section})${card.address ? `\n   ${card.address}` : ""}\n   Suggestion recorded: ${card.evidence?.recordedAt ?? "unknown"}`),
    "Built from my confirmed tastes and personalized suggestions. No booking has been made.",
  ].join("\n\n");
}
