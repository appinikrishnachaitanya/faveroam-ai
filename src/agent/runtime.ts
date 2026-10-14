import "server-only";
import { discoveryQueries, mixPools } from "./strategy.ts";
import { withEvidence } from "../passport/evidence.ts";
import { sectionTags } from "./session.ts";
import { workflow, discoverTools } from "./harness.ts";
import { configuredProvider } from "./provider.ts";
import { tagCandidates, validateDiscoveries } from "./validation.ts";
import { culturalText, isConcept } from "./intent.ts";
import { TurnGuard } from "./guard.ts";
import { search, insights, insightParams, QlooError } from "../qloo/client.ts";
import { candidates } from "../passport/model.ts";
import type { AgentDependencies } from "./orchestrator.ts";
import type { AgentState, Constraint } from "./types.ts";
import type { Card, Section } from "../passport/model.ts";
export function agentDependencies(): AgentDependencies {
  let provider;
  try {
    provider = configuredProvider();
  } catch {}
  return {
    provider,
    tools: discoverTools,
    workflow,
    discover: discoverSection,
  };
}
export async function resolveCulturalSeeds(
  queries: string[],
  concepts: string[] = [],
) {
  const guard = new TurnGuard(5, 90_000);
  const items = [];
  for (const query of queries) {
    culturalText(query, 100);
    if (isConcept(query) || concepts.includes(query)) {
      try {
        const result = await guard.run(
          "qloo_find_tags",
          { query, limit: 5 },
          () => workflow("exec", "qloo_find_tags", { query, limit: 5 }),
        );
        items.push({ query, candidates: tagCandidates(result, query) });
      } catch {
        items.push({ query, candidates: [] });
      }
    } else {
      try {
        const entities = await guard.run("entity_search", { query }, () =>
          search(query),
        );
        items.push({ query, candidates: candidates(entities) });
      } catch (e) {
        if (e instanceof QlooError && e.status === 404)
          items.push({ query, candidates: [] });
        else throw e;
      }
    }
  }
  return items;
}
/** The restaurant tag below was observed in real Qloo responses during Phase 1.
 * It is a physical place genre, not an invented keyword/endpoint. */
export async function discoverSection(
  state: AgentState,
  section: Section,
  constraints: Constraint[],
  excluded: string[],
  rank: boolean,
  signal?: AbortSignal,
): Promise<Card[]> {
  const type = section === "Music" ? "artist" : "place";
  const entityIds = state.selected
    .filter((s) => !s.id.startsWith("urn:tag:"))
    .map((s) => s.id);
  const likes = state.feedback
    .filter((f) => f.accepted && f.section === section)
    .slice(-2)
    .map((f) => f.id);
  const ids = [...new Set([...entityIds, ...likes])].slice(0, 10);
  const params = ids.length
    ? insightParams(ids, type, type === "place")
    : { "filter.type": `urn:entity:${type}`, take: "20" };
  params.take = "20";
  params[type === "place" ? "filter.location.query" : "signal.location.query"] =
    state.city;
  if (type === "place") params["filter.location.radius"] = "0";
  const tags = sectionTags(state, section).filter(
    (t) =>
      t.id.includes(":place:") ||
      t.id.includes(":restaurant:") ||
      t.id.includes(":cuisine:") ||
      t.id.includes(":ambience:"),
  );
  if (section === "Eat") {
    const cuisine = tags.filter(
      (t) =>
        !t.id.includes(":ambience:") &&
        /indian|biryani|cuisine|restaurant/i.test(
          `${t.id} ${t.name} ${t.detail}`,
        ),
    );
    const atmosphere = constraints.includes("crowded")
      ? tags.filter((t) => t.id.includes(":ambience:"))
      : [];
    params["filter.tags"] = [
      "urn:tag:genre:place:restaurant",
      ...cuisine.map((t) => t.id),
      ...atmosphere.map((t) => t.id),
    ].join(",");
    params["operator.filter.tags"] = "intersection";
  } else if (type === "place" && tags.length) {
    const relevant = tags.filter(
      (t) =>
        (constraints.includes("crowded") && t.id.includes(":ambience:")) ||
        (section === "Coffee" && /coffee|caf[eé]/i.test(t.name)) ||
        (section === "Lifestyle" && /book|shop/i.test(t.name)) ||
        (section === "Culture" &&
          /museum|culture|gallery|theatre/i.test(t.name)),
    );
    if (relevant.length) {
      params["filter.tags"] = relevant.map((t) => t.id).join(",");
      params["operator.filter.tags"] = "intersection";
    }
  }
  // Returned by live qloo_find_tags("museum") in final acceptance. This is a
  // category starting point, not a fabricated personal taste or relationship.
  if (
    section === "Culture" &&
    !state.intent?.concepts.length &&
    !tags.some(
      (t) =>
        !t.id.includes(":ambience:") &&
        /museum|culture|gallery|theatre/i.test(t.name),
    )
  ) {
    params["filter.tags"] = [
      "urn:tag:genre:place:museum",
      ...(params["filter.tags"] ?? "").split(",").filter(Boolean),
    ].join(",");
    params["operator.filter.tags"] = "intersection";
    state.notices.push(
      "Your Culture chapter starts with museums. Name a more specific cultural interest to guide the next search.",
    );
  }
  if (type === "artist") {
    const musicTags = sectionTags(state, section).filter(
      (t) => !/:place:|:restaurant:|:cuisine:|:ambience:/.test(t.id),
    );
    if (musicTags.length)
      params["signal.interests.tags"] = musicTags.map((t) => t.id).join(",");
  }
  if (excluded.length)
    params["filter.exclude.entities"] = excluded.slice(-50).join(",");
  if (constraints.includes("expensive") && type === "place")
    params["filter.price_level.max"] = "2";
  if (constraints.includes("mainstream"))
    params["filter.popularity.max"] = "0.9";
  if (rank) {
    const options = state.cards
      .filter((c) => c.section === section && !excluded.includes(c.id))
      .slice(0, 10)
      .map((c) => c.id);
    if (!options.length) return [];
    params["filter.results.entities"] = options.join(",");
  }
  const mode =
    state.categoryModes?.[section] ?? state.discoveryMode ?? "familiar";
  const queries = discoveryQueries(params, state, section, mode);
  const sources = [
    ...state.selected,
    ...state.tags,
    ...state.cards.filter((c) => likes.includes(c.id)),
  ];
  const pools: Card[][] = [];
  let failure: unknown;
  for (const query of queries) {
    try {
      const result = await insights(query.params, signal);
      const validated = validateDiscoveries(
        result.body,
        state.city,
        section,
        constraints,
        excluded,
      );
      const grounded = withEvidence(
        validated,
        result.entities,
        query.params,
        sources,
        state.city,
        mode,
        query.pool,
      );
      if (query.note) {
        state.notices.push(query.note);
        for (const card of grounded)
          if (card.evidence) card.evidence.strategyNote = query.note;
      }
      pools.push(grounded);
    } catch (error) {
      failure = error;
      if (queries.length === 1) throw error;
    }
  }
  if (!pools.some((pool) => pool.length) && failure) throw failure;
  if (failure && pools.some((pool) => pool.length)) {
    const note =
      "One discovery pool is temporarily unavailable. The available Qloo matches are shown.";
    state.notices.push(note);
    for (const pool of pools)
      for (const card of pool)
        if (card.evidence) card.evidence.strategyNote = note;
  }
  return mixPools(pools);
}
