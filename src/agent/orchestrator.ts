import { TurnGuard } from "./guard.ts";
import {
  culturalText,
  interpret,
  reasonConstraint,
  validateIntent,
} from "./intent.ts";
import { tagCandidates } from "./validation.ts";
import { sectionOrder } from "../workspace/state.ts";
import { isObject } from "../qloo/types.ts";
import type { Card, Section } from "../passport/model.ts";
import type {
  AgentEvent,
  AgentInput,
  AgentReply,
  AgentState,
  Constraint,
  ModelProvider,
  ToolDefinition,
  ToolResult,
} from "./types.ts";
export interface AgentDependencies {
  provider?: ModelProvider;
  tools: () => Promise<ToolDefinition[]>;
  workflow: (
    mode: "exec" | "mcp",
    name: string,
    args: Record<string, unknown>,
    signal?:AbortSignal,
  ) => Promise<ToolResult>;
  discover: (
    state: AgentState,
    section: Section,
    constraints: Constraint[],
    excluded: string[],
    rank: boolean,
    signal?:AbortSignal,
  ) => Promise<Card[]>;
}
export async function runTurn(
  original: AgentState,
  input: AgentInput,
  deps: AgentDependencies,
  emit: (event: AgentEvent) => void = () => {},
  guard = new TurnGuard(),
): Promise<AgentReply> {
  // Transactional working copy; never commit generated provider text as data.
  const state = structuredClone(original);
  const events: AgentEvent[] = [];
  const changed: Section[] = [];
  let mode: AgentReply["mode"] = "deterministic";
  let fallback = "";
  let rememberedRank = false;
  const event = (label: string, status: AgentEvent["status"]) => {
    const e = { label, status };
    events.push(e);
    emit(e);
  };
  const reply = (message: string): AgentReply => ({
    state,
    changed,
    events,
    mode,
    message: fallback + message,
  });
  if (input.message) {
    culturalText(input.message);
    delete state.pending;
  }
  let intent = interpret(input.message ?? "", "New York City");
  const previousScope = state.intent?.sections[0];
  if (input.feedback) {
    const current = state.cards.find((c) => c.id === input.feedback!.id);
    if (!current)
      throw Error("That recommendation is no longer in the current passport.");
    if (input.feedback.detail) culturalText(input.feedback.detail, 160);
    state.feedback = state.feedback.filter((f) => f.id !== current.id);
    if (input.feedback.clear)
      return reply(
        "Cleared this preference. Your discoveries remain unchanged.",
      );
    state.feedback.push({
      id: current.id,
      section: current.section,
      accepted: input.feedback.accepted,
      reason: input.feedback.reason,
      detail: input.feedback.detail,
    });
    state.feedback = state.feedback.slice(-100);
    if (input.feedback.accepted)
      return reply(
        "Saved as your vibe. Future refinements can use this cultural signal.",
      );
    intent = {
      kind: "refine",
      seeds: [],
      concepts: input.feedback.detail
        ? interpret(input.feedback.detail).concepts
        : [],
      sections: [current.section],
      constraints: [
        ...reasonConstraint(input.feedback.reason ?? ""),
        ...(input.feedback.detail
          ? interpret(input.feedback.detail).constraints
          : []),
      ],
      strategy: "discover",
    };
  } else if (input.tagChoice) {
    const pending = state.pending;
    const tag = pending?.candidates.find((t) => t.id === input.tagChoice);
    if (!pending || !tag) throw Error("Choose a returned concept match.");
    state.tags = [...state.tags.filter((t) => t.id !== tag.id), tag].slice(-10);
    intent = {
      kind: "refine",
      seeds: [],
      concepts: [],
      sections: pending.sections,
      constraints: pending.constraints,
      strategy: pending.strategy ?? "discover",
    };
    rememberedRank = Boolean(pending.rankMcp);
    if (rememberedRank && deps.provider) mode = "model-mcp";
    delete state.pending;
  } else if (deps.provider) {
    event("Interpreting your cultural request", "active");
    try {
      intent = validateIntent(
        await deps.provider.interpret(input.message ?? ""),
      );
      mode = "model-mcp";
      event("Cultural intent recognized", "complete");
    } catch {
      fallback =
        "Agentic refinement is temporarily unavailable. Using supported deterministic refinement. ";
      event("Provider unavailable · deterministic path retained", "attention");
    }
  }
  if (intent.kind === "unknown" || intent.kind === "onboard")
    return reply(
      "For this passport, name a section to refine, ask for cuisine or quietness, or select Not my vibe on a card. Start a new taste draft to change the destination or seeds.",
    );
  const targets = intent.sections.length
    ? intent.sections
    : [previousScope ?? "Eat"];
  state.intent = { ...intent, sections: targets };
  if (intent.hide?.length && intent.kind !== "hide") {
    state.cards = state.cards.filter((c) => !intent.hide!.includes(c.section));
    changed.push(...intent.hide);
    event(`Hid ${intent.hide.join(", ")} sections`, "complete");
  }
  if (intent.kind === "hide") {
    state.previous = [
      ...state.previous,
      ...state.cards.filter((c) => targets.includes(c.section)),
    ].slice(-200);
    state.cards = state.cards.filter((c) => !targets.includes(c.section));
    changed.push(...targets);
    event(`Hid ${targets.join(", ")} sections`, "complete");
    return reply(
      `Hidden ${targets.join(", ")}. Your taste profile and other sections are unchanged.`,
    );
  }
  let tools: ToolDefinition[] = [];
  let modelChoices: Awaited<ReturnType<ModelProvider["choose"]>> =
    rememberedRank ? [{ name: "qloo_rank", arguments: {} }] : [];
  const neededConcepts = [
    ...intent.concepts,
    ...(intent.constraints.includes("crowded") ? ["quiet"] : []),
  ];
  const conceptUnknown = (concept: string) => {
    const words = concept
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => !["cuisine", "food"].includes(w));
    return !state.tags.some((t) =>
      words.every((w) => `${t.name} ${t.detail}`.toLowerCase().includes(w)),
    );
  };
  if (
    mode === "model-mcp" &&
    deps.provider &&
    !input.tagChoice &&
    (intent.strategy === "rank" || neededConcepts.some(conceptUnknown))
  ) {
    try {
      tools = (await deps.tools()).filter((t) =>
        ["qloo_find_tags", "qloo_rank"].includes(t.name),
      );
      modelChoices = await deps.provider.choose(
        input.message ?? "",
        state,
        tools,
      );
      if (modelChoices.length > 2) throw Error("Tool budget");
      if (modelChoices.some((c) => !tools.some((t) => t.name === c.name)))
        throw Error("Unadvertised tool");
    } catch {
      mode = "deterministic";
      fallback =
        "Agentic tool selection is unavailable. Your existing passport is preserved while supported refinement continues. ";
      event(
        "MCP selection unavailable · direct refinement retained",
        "attention",
      );
    }
  }
  const concepts = [...intent.concepts];
  if (
    intent.constraints.includes("crowded") &&
    !concepts.some((c) => /quiet/i.test(c))
  )
    concepts.push("quiet");
  if (mode === "model-mcp")
    for (const choice of modelChoices.filter(
      (c) => c.name === "qloo_find_tags",
    )) {
      const q = choice.arguments.query;
      if (typeof q !== "string") continue;
      culturalText(q, 100);
      if (!concepts.includes(q)) concepts.push(q);
    }
  for (const concept of concepts.slice(0, 2)) {
    const words = concept
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => !["cuisine", "food"].includes(w));
    if (
      state.tags.some((t) =>
        words.every((w) => `${t.name} ${t.detail}`.toLowerCase().includes(w)),
      )
    )
      continue;
    event(`Finding matching concepts for ${concept}`, "active");
    try {
      const transport =
        mode === "model-mcp" &&
        modelChoices.some((c) => c.name === "qloo_find_tags")
          ? "mcp"
          : "exec";
      const result = await guard.run(
        "qloo_find_tags",
        { query: concept, limit: 5 },
        () =>
          deps.workflow(transport, "qloo_find_tags", {
            query: concept,
            limit: 5,
          },guard.signal),
      );
      const choices = tagCandidates(result, concept);
      if (choices.length) {
        state.pending = {
          query: concept,
          candidates: choices,
          sections: targets,
          constraints: intent.constraints,
          strategy:
            intent.strategy === "rank" ||
            modelChoices.some((c) => c.name === "qloo_rank")
              ? "rank"
              : "discover",
          rankMcp: modelChoices.some((c) => c.name === "qloo_rank"),
        };
        event("Concept matches returned · your choice needed", "complete");
        return reply(
          "Choose the concept you mean before I update that section. Your current passport is unchanged.",
        );
      }
      event("No matching concept returned", "attention");
      return reply(
        "Qloo returned no matching concept. Your existing passport is unchanged; try a more specific cultural term.",
      );
    } catch {
      event("Concept workflow unavailable", "attention");
      return reply(
        "Concept refinement is temporarily unavailable. Your existing passport is still available.",
      );
    }
  }
  for (const section of targets) {
    if (!sectionOrder.includes(section)) continue;
    const constraints = [
      ...new Set([
        ...(state.categoryConstraints[section] ?? []),
        ...state.constraints,
        ...intent.constraints,
      ]),
    ];
    state.categoryConstraints[section] = constraints;
    const excluded = state.feedback.filter((f) => !f.accepted).map((f) => f.id);
    const rank =
      intent.strategy === "rank" ||
      modelChoices.some((c) => c.name === "qloo_rank");
    event(
      `${rank ? "Ranking" : "Updating"} your ${section} passport`,
      "active",
    );
    try {
      let cards: Card[];
      const useMcpRank =
        mode === "model-mcp" &&
        modelChoices.some((c) => c.name === "qloo_rank");
      if (rank && useMcpRank) {
        const existing = state.cards
          .filter((c) => c.section === section && !excluded.includes(c.id))
          .slice(0, 10);
        const args = {
          options: existing.map((c) => c.id),
          option_type: section === "Music" ? "artist" : "place",
          signals: state.selected
            .filter((s) => !s.id.startsWith("urn:tag:"))
            .map((s) => s.id),
          signal_location: state.city,
        };
        const ranked = await guard.run("qloo_rank", args, () =>
          deps.workflow("mcp", "qloo_rank", args, guard.signal),
        );
        if (ranked.status !== "ok" || !Array.isArray(ranked.results))
          throw Error("Ranking failed");
        cards = ranked.results.filter(isObject).flatMap((r) => {
          const c = existing.find((c) => c.id === r.entity_id);
          return c
            ? [
                {
                  ...c,
                  inputSignals: state.selected
                    .filter((s) => !s.id.startsWith("urn:tag:"))
                    .map((s) => s.name),
                  ...(typeof r.affinity === "number"
                    ? { affinity: r.affinity }
                    : {}),
                },
              ]
            : [];
        });
        if (!cards.length) throw Error("No validated shortlist");
      } else
        cards = await guard.run(
          "direct_discovery",
          { section, constraints, excluded, rank },
          () => deps.discover(state, section, constraints, excluded, rank, guard.signal),
        );
      const existingIds = new Set(state.selected.map((s) => s.id));
      cards = cards.filter(
        (c) =>
          c.section === section &&
          !excluded.includes(c.id) &&
          !existingIds.has(c.id),
      );
      if (!cards.length) {
        event(`No suitable ${section} replacements returned`, "attention");
        continue;
      }
      state.previous = [
        ...state.previous,
        ...state.cards.filter((c) => c.section === section),
      ].slice(-200);
      state.cards = [
        ...state.cards.filter((c) => c.section !== section),
        ...cards,
      ];
      changed.push(section);
      event(`${section} passport updated with Qloo-backed results`, "complete");
    } catch (error) {
      if (isObject(error) && error.status === 429) {
        event(
          `Qloo is busy · previous ${section} results retained`,
          "attention",
        );
        continue;
      }
      // A failed optional MCP rank can fall back to one known deterministic query.
      if (
        rank &&
        mode === "model-mcp" &&
        modelChoices.some((c) => c.name === "qloo_rank")
      )
        try {
          const cards = await guard.run("ranking_fallback", { section }, () =>
            deps.discover(state, section, constraints, excluded, true, guard.signal),
          );
          if (cards.length) {
            state.cards = [
              ...state.cards.filter((c) => c.section !== section),
              ...cards,
            ];
            changed.push(section);
            event(
              `${section} updated through deterministic fallback`,
              "complete",
            );
            continue;
          }
        } catch {}
      event(
        `${section} update unavailable · previous results retained`,
        "attention",
      );
    }
  }
  if (intent.constraints.includes("crowded"))
    state.notices = [
      ...state.notices,
      "Quiet cultural tags do not establish current crowd levels.",
    ];
  if (intent.constraints.includes("expensive"))
    state.notices = [
      ...state.notices,
      "Affordable refinement uses Qloo price levels up to 2 when available; actual menu prices are not verified.",
    ];
  state.notices = [...new Set(state.notices)].slice(-10);
  return reply(
    changed.length
      ? `Updated ${changed.join(", ")} with real Qloo results, culturally aligned with your selected tastes. Other sections and Taste DNA are unchanged.`
      : "No suitable replacement was returned. Your existing passport is preserved; no recommendations were invented.",
  );
}
