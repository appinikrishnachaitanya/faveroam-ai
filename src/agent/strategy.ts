import type { AgentState } from "./types.ts";
import type { Section } from "../passport/model.ts";
import type { Familiarity, QlooEvidence } from "../passport/evidence.ts";
export interface DiscoveryQuery {
  params: Record<string, string>;
  pool: QlooEvidence["pool"];
  note?: string;
}
/** Only existing native parameters. Broadening soft profile tags is an explicit
 * exploration choice; primary concepts named in a refinement remain hard filters. */
export function discoveryQueries(
  base: Record<string, string>,
  state: AgentState,
  section: Section,
  mode: Familiarity,
): DiscoveryQuery[] {
  const direct = { ...base };
  if (section === "Music") {
    const artistIds = [
      ...new Set([
        ...state.selected
          .filter((s) => s.types.includes("urn:entity:artist"))
          .map((s) => s.id),
        ...state.feedback
          .filter((f) => f.accepted && f.section === "Music")
          .slice(-2)
          .map((f) => f.id),
      ]),
    ];
    if (artistIds.length)
      direct["signal.interests.entities"] = artistIds.join(",");
  }
  const adjacent = { ...base };
  if (section !== "Music" && !state.intent?.concepts.length) {
    const ids = (adjacent["filter.tags"] ?? "").split(",").filter(Boolean);
    const soft = ids.filter((id) =>
      state.tags.some((t) => t.id === id && !t.id.includes(":ambience:")),
    );
    const hard = ids.filter((id) => !soft.includes(id));
    if (soft.length)
      adjacent["signal.interests.tags"] = [
        ...new Set([
          ...(adjacent["signal.interests.tags"] ?? "")
            .split(",")
            .filter(Boolean),
          ...soft,
        ]),
      ].join(",");
    if (hard.length) adjacent["filter.tags"] = hard.join(",");
    else {
      delete adjacent["filter.tags"];
      delete adjacent["operator.filter.tags"];
    }
  }
  // Every strategy keeps at least one confirmed entity/tag signal. A generic
  // city search is never used as a substitute for cultural translation.
  const grounded = (params: Record<string, string>) =>
    Boolean(
      params["signal.interests.entities"] ||
      params["signal.interests.tags"] ||
      params["filter.tags"]
        ?.split(",")
        .some((id) => state.tags.some((t) => t.id === id)),
    );
  if (!grounded(direct) || !grounded(adjacent)) return [];
  if (mode === "familiar") return [{ params: direct, pool: "direct" }];
  if (JSON.stringify(direct) === JSON.stringify(adjacent))
    return [
      {
        params: direct,
        pool: "profile",
        note: "The current signals and refinement requirements do not support a distinct broader query for this category yet. The current cultural query is retained.",
      },
    ];
  if (mode === "explore") return [{ params: adjacent, pool: "adjacent" }];
  return [
    { params: direct, pool: "direct" },
    { params: adjacent, pool: "adjacent" },
  ];
}
export function mixPools(pools: import("../passport/model.ts").Card[][]) {
  if (pools.length < 2) return pools[0] ?? [];
  const result: import("../passport/model.ts").Card[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 20; i++)
    for (const pool of pools) {
      const card = pool[i];
      if (card && !seen.has(card.id) && result.length < 20) {
        seen.add(card.id);
        result.push(card);
      }
    }
  return result;
}
