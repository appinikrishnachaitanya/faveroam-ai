import "server-only";
import { debugEvent } from "./debug.ts";
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
import { diversifyCards } from "../passport/model.ts";
import type { Card, Section } from "../passport/model.ts";
import { buildQuery } from "../qloo/query-plan.ts";
import { findTags } from "../qloo/lookups.ts";
import { enrichTrends } from "../qloo/enrichment.ts";

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
  debugEvent("resolution.started", { count: queries.length });
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
        try {
          items.push({ query, candidates: await findTags(query) });
        } catch {
          items.push({ query, candidates: [] });
        }
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
        else items.push({ query, candidates: [] });
      }
    }
  }
  items.forEach((item, seedIndex) =>
    debugEvent("resolution.candidates", {
      seedIndex,
      count: item.candidates.length,
    }),
  );
  debugEvent("resolution.completed", {
    count: items.reduce((n, item) => n + item.candidates.length, 0),
  });
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
  debugEvent("discovery.started", {
    section,
    city: state.city,
    signalCount: state.selected.length,
    excludedCount: excluded.length,
  });
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
  const excludedTags = new Set(
    state.queryPreferences?.[section]?.excludeTags ?? [],
  );
  const tags = sectionTags(state, section)
    .filter((tag) => !excludedTags.has(tag.id))
    .filter(
      (t) =>
        t.id.includes(":place:") ||
        t.id.includes(":restaurant:") ||
        t.id.includes(":cuisine:") ||
        t.id.includes(":ambience:"),
    );
  if (type === "place" && sectionTags(state, section).length)
    params["signal.interests.tags"] = sectionTags(state, section).filter(tag => !excludedTags.has(tag.id)).map((t) => t.id).join(",");
  if (section === "Eat") {
    const dishes = tags.filter((tag) => tag.id.startsWith("urn:tag:specialty_dish:place:"));
    const cuisine = dishes.length ? dishes : tags.filter(
      (t) =>
        !t.id.includes(":ambience:") &&
        /indian|biryani|cuisine|restaurant|savour|savory|food|dish/i.test(
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
    const hardRelevant = section === "Coffee" && !state.categoryConcepts?.Coffee?.length
      ? relevant.filter((tag) => /urn:tag:(?:genre|category):place:/.test(tag.id))
      : relevant;
    if (hardRelevant.length) {
      params["filter.tags"] = hardRelevant.map((t) => t.id).join(",");
      params["operator.filter.tags"] = "intersection";
    }
  }
  // Returned by live qloo_find_tags("museum") in final acceptance. This is a
  // category starting point, not a fabricated personal taste or relationship.
  if (
    section === "Culture" &&
    !state.intent?.activityGenres?.length &&
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
  // Resolve category taxonomy through Qloo; never substitute a cuisine pool.
  if (
    (section === "Coffee" || (section === "Culture" && !state.intent?.activityGenres?.length)) &&
    !params["filter.tags"]
  ) {
    const options = await findTags(
      section === "Coffee" ? "coffee shop" : "museum",
    );
    const category = options.find(
      (t) =>
        t.id.includes(":place:") &&
        (section === "Coffee" ? /coffee|café|cafe/i : /museum/i).test(t.name),
    );
    if (!category) return [];
    params["filter.tags"] = category.id;
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
  if (section === "Culture" && state.intent?.activityGenres?.length) {
    const activityTags: string[] = [];
    for (const genre of state.intent.activityGenres) {
      const options = await findTags(genre === "cinema" ? "movie theater" : genre, signal);
      const match = options.find((tag) =>
        /urn:tag:(?:genre|category):place:/.test(tag.id) &&
        (genre === "cinema" ? /cinema|movie theater|movie theatre/i : /nightclub|night club/i).test(tag.name),
      );
      if (match) activityTags.push(match.id);
    }
    // Never silently replace an explicit cinema/nightlife request with museums.
    if (activityTags.length !== state.intent.activityGenres.length) return [];
    params["filter.tags"] = activityTags.join(",");
    params["operator.filter.tags"] = "union";
  }
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
  const preferences = state.queryPreferences?.[section] ?? {};
  const planned = buildQuery({
    outputType: type,
    interests: { entities: ids, tags: [] },
    preferences,
    take: 20,
  });
  // Merge the shared planner's applied settings with existing category filters.
  // Omitted settings remain in the server session; unrelated categories are untouched.
  const categoryFilter = params["filter.tags"];
  Object.assign(params, planned.params);
  if (preferences.includeTags?.length && type === "place") {
    params["filter.tags"] = [
      ...new Set([
        ...(categoryFilter ?? "").split(",").filter(Boolean),
        ...preferences.includeTags,
      ]),
    ].join(",");
  }
  if (preferences.tagOperator && params["filter.tags"]) {
    params["operator.filter.tags"] = preferences.tagOperator;
    if (preferences.tagOperator === "union" && section === "Eat") {
      const specific = params["filter.tags"]
        .split(",")
        .filter((id) => id !== "urn:tag:genre:place:restaurant");
      if (specific.length) params["filter.tags"] = specific.join(",");
    }
  }
  if (excluded.length || preferences.excludeEntities?.length)
    params["filter.exclude.entities"] = [
      ...new Set([...excluded, ...(preferences.excludeEntities ?? [])]),
    ]
      .slice(-50)
      .join(",");
  if (planned.diagnostics.dropped.length)
    state.notices.push(
      `Some requested settings could not be applied: ${planned.diagnostics.dropped.map((d) => d.parameter).join(", ")}. Open Why this suggestion for details.`,
    );
  if (preferences.goal === "surprise") {
    // No undocumented bias.content_based. Existing exploration broadens only soft taste filters.
    state.categoryModes ??= {};
    state.categoryModes[section] = "explore";
  }
  const queries = discoveryQueries(
    params,
    state,
    section,
    preferences.goal === "surprise" ? "explore" : mode,
  );
  const sources = [
    ...state.selected,
    ...state.tags,
    ...[...state.cards, ...(state.savedCards ?? [])].filter((c) =>
      likes.includes(c.id),
    ),
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
        result.params,
        sources,
        state.city,
        mode,
        query.pool,
      );
      for (const card of grounded)
        if (card.evidence) {
          card.evidence.queryId = result.traceId;
          card.evidence.diagnostics = {
            ...result.diagnostics,
            dropped: [
              ...planned.diagnostics.dropped,
              ...result.diagnostics.dropped,
            ],
          };
        }
      if (query.note) {
        state.notices.push(query.note);
        for (const card of grounded)
          if (card.evidence) card.evidence.strategyNote = query.note;
      }
      debugEvent("discovery.pool", {
        section,
        mode,
        pool: query.pool,
        count: result.entities.length,
        keptCount: grounded.length,
      });
      pools.push(grounded);
    } catch (error) {
      debugEvent("discovery.failed", { section, mode, pool: query.pool });
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
  if (!rank && !pools.some((pool) => pool.length) && !signal?.aborted) {
    const broader = { ...params };
    delete broader["signal.interests.entities"];
    delete broader["signal.interests.tags"];
    // Keep city, category, explicit concepts, exclusions and all user filters.
    if (type === "place" && broader["filter.tags"]) {
      const result = await insights(broader, signal);
      const valid = validateDiscoveries(
        result.body,
        state.city,
        section,
        constraints,
        excluded,
      );
      const local = withEvidence(
        valid,
        result.entities,
        result.params,
        sources,
        state.city,
        mode,
        "adjacent",
      );
      for (const card of local)
        if (card.evidence)
          card.evidence.strategyNote =
            "Broader local suggestion. Your venue requirements were kept; taste similarity was broadened.";
      pools.push(local);
    }
  }
  const cards = diversifyCards(mixPools(pools), section);
  if (preferences.goal === "trending") {
    await enrichTrends(cards, signal);
    debugEvent("qloo.enrichment", {
      endpoint: "trending",
      count: cards.filter((c) => c.trend?.points.length).length,
    });
  }
  debugEvent("discovery.completed", { section, mode, count: cards.length });
  return cards;
}
