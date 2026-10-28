import type { Section } from "../passport/model.ts";
import type { TasteTag } from "../qloo/analysis.ts";

const MAX_PREVIEW_TAGS = 320;
const MAX_TAGS_PER_CARD = 8;
type CardTagSource = {
  section: Section;
  evidence?: { result?: { tags?: TasteTag[] } };
};

/**
 * Share cards show at most five themes. Bound the client-side curation input
 * while sampling returned tags across sections and cards, so a large Passport
 * cannot turn opening Share My Taste into an unbounded main-thread task.
 */
export function shareThemeCandidates(cards: readonly CardTagSource[]): TasteTag[] {
  const sections = new Map<Section, TasteTag[][]>();
  for (const card of cards) {
    const tags = card.evidence?.result?.tags;
    if (!tags?.length) continue;
    const lane = sections.get(card.section) ?? [];
    lane.push(tags.slice(0, MAX_TAGS_PER_CARD));
    sections.set(card.section, lane);
  }

  const result: TasteTag[] = [];
  const seen = new Set<string>();
  for (let index = 0; result.length < MAX_PREVIEW_TAGS; index++) {
    let foundAtDepth = false;
    for (const cardsInSection of sections.values()) {
      for (const cardTags of cardsInSection) {
        const tag = cardTags[index];
        if (!tag) continue;
        foundAtDepth = true;
        const key = `${tag.id}\u0000${tag.name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(tag);
        if (result.length === MAX_PREVIEW_TAGS) break;
      }
      if (result.length === MAX_PREVIEW_TAGS) break;
    }
    if (!foundAtDepth) break;
  }
  return result;
}
