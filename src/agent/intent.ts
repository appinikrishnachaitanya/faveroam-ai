import {
  extractDraft,
  destinations,
  sectionOrder,
} from "../workspace/state.ts";
import type { Section } from "../passport/model.ts";
import type { Constraint, Intent } from "./types.ts";
export function culturalText(value: string, max = 1000): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    /@|https?:\/\/|\b(?:my name|email|phone|device id|account id|user id|my address|my home)\b|\+?\d[\d ()-]{7,}\d/i.test(
      value,
    )
  )
    throw new Error(
      "Please share cultural tastes only, without names identifying you, contact details or account identifiers.",
    );
  if (
    [process.env.QLOO_API_KEY, process.env.AGENT_MODEL_API_KEY].some(
      (secret) => secret && value.includes(secret),
    )
  )
    throw Error("Credentials are not cultural inputs.");
  return value.trim();
}
export function constraintsFrom(text: string): Constraint[] {
  const values: Constraint[] = [];
  if (
    /(?:not|don't|doesn't|avoid|less|too|isn't|is not|hate|dislike)[^.]*tourist|non.?tourist/i.test(
      text,
    )
  )
    values.push("touristy");
  if (/quiet|quieter|less crowded|too crowded|not crowded/i.test(text))
    values.push("crowded");
  if (/niche|less mainstream|too mainstream|not mainstream/i.test(text))
    values.push("mainstream");
  if (/budget|affordable|cheaper|too expensive|not expensive/i.test(text))
    values.push("expensive");
  if (/wrong atmosphere/i.test(text)) values.push("atmosphere");
  return values;
}
export function isConcept(text: string) {
  return /^(?:biryani|indian(?: cuisine| food)?|specialty coffee|coffee|quiet (?:caf[eé]s?|bookstores?)|independent bookstores?|independent culture|cuisine|food|bookstores?)$/i.test(
    text.trim(),
  );
}
export function interpret(text: string, fallback = "New York City"): Intent {
  culturalText(text);
  const constraints = constraintsFrom(text);
  const onboarding = /\b(?:i love|i like|i enjoy|i'm into|my tastes (?:are|include))\b/i.test(
    text,
  );
  const clean = text.replace(/\bI (?:don't|do not|dislike|hate)[\s\S]*$/i, "");
  const draft = extractDraft(clean, fallback);
  const sections: Section[] = [];
  if (/food|dining|restaurant|biryani|indian/i.test(text)) sections.push("Eat");
  if (/coffee|caf[eé]/i.test(text)) sections.push("Coffee");
  if (/music|musical|concert/i.test(text)) sections.push("Music");
  if (/cultur(?:e|al)|museum|gallery|film/i.test(text))
    sections.push("Culture");
  if (/book|lifestyle|shop/i.test(text)) sections.push("Lifestyle");
  const concepts = /indian|biryani/i.test(text)
    ? [/biryani/i.test(text) ? "biryani" : "Indian cuisine"]
    : [];
  if (
    !onboarding &&
    /show|find|want/i.test(text) &&
    /books|bookstore/i.test(text)
  )
    concepts.push("bookstore");
  const hide = /forget|remove|hide|skip/i.test(text) && !onboarding;
  const hidden: Section[] = [];
  const hidePart =
    text.match(
      /(?:forget|remove|hide|skip)\s+([^.!?]*?)(?=\s+(?:show|give|find)|[.!?]|$)/i,
    )?.[1] ?? "";
  if (/coffee|caf[eé]/i.test(hidePart)) hidden.push("Coffee");
  if (/food|dining/i.test(hidePart)) hidden.push("Eat");
  if (/music/i.test(hidePart)) hidden.push("Music");
  if (/book|lifestyle/i.test(hidePart)) hidden.push("Lifestyle");
  if (/cultur(?:e|al)/i.test(hidePart)) hidden.push("Culture");
  const activeSections = sections.filter((s) => !hidden.includes(s));
  const refine =
    !onboarding &&
    /tonight|quieter|more|less|find|show|want|give|too |niche|refine|rank|reorder/i.test(
      text,
    );
  return {
    kind: onboarding
      ? "onboard"
      : hide
        ? activeSections.length
          ? "refine"
          : "hide"
        : refine
          ? "refine"
          : "unknown",
    destination: onboarding ? draft.city : undefined,
    seeds: onboarding ? draft.tastes.map((s) => s.replace(/[.\s]+$/, "")) : [],
    concepts,
    constraints,
    sections: hide && !activeSections.length ? hidden : activeSections,
    hide: hidden,
    ...(/adventurous|explore|broader/i.test(text) && !onboarding
      ? { familiarity: "explore" as const }
      : /balanced/i.test(text) && !onboarding
        ? { familiarity: "balanced" as const }
        : /feels? like home|more familiar/i.test(text) && !onboarding
          ? { familiarity: "familiar" as const }
          : {}),
    strategy: /rank|reorder|shortlist/i.test(text)
      ? "rank"
      : hide
        ? "filter"
        : "discover",
  };
}
export function validateIntent(raw: unknown): Intent {
  if (!raw || typeof raw !== "object") throw Error("Invalid model intent");
  const x = raw as Record<string, unknown>;
  if (
    !["onboard", "refine", "hide", "unknown"].includes(String(x.kind)) ||
    !["discover", "rank", "filter"].includes(String(x.strategy))
  )
    throw Error("Invalid intent");
  const arrays = ["seeds", "concepts", "constraints", "sections"] as const;
  for (const key of arrays)
    if (
      !Array.isArray(x[key]) ||
      x[key].length > (key === "seeds" ? 5 : 5) ||
      x[key].some((v) => typeof v !== "string")
    )
      throw Error("Invalid intent fields");
  if (
    (x.constraints as string[]).some(
      (c) =>
        ![
          "touristy",
          "crowded",
          "mainstream",
          "expensive",
          "atmosphere",
        ].includes(c),
    ) ||
    (x.sections as Section[]).some((c) => !sectionOrder.includes(c))
  )
    throw Error("Invalid scope");
  if (
    x.destination !== undefined &&
    !destinations.includes(String(x.destination))
  )
    throw Error("Unsupported destination");
  if (
    x.familiarity !== undefined &&
    !["familiar", "balanced", "explore"].includes(String(x.familiarity))
  )
    throw Error("Invalid familiarity mode");
  for (const value of [...(x.seeds as string[]), ...(x.concepts as string[])])
    culturalText(value, 100);
  return {
    kind: x.kind as Intent["kind"],
    strategy: x.strategy as Intent["strategy"],
    seeds: x.seeds as string[],
    concepts: x.concepts as string[],
    constraints: x.constraints as Constraint[],
    sections: x.sections as Section[],
    ...(x.familiarity
      ? { familiarity: x.familiarity as Intent["familiarity"] }
      : {}),
    ...(x.destination ? { destination: String(x.destination) } : {}),
    ...(Array.isArray(x.hide)
      ? {
          hide: x.hide.filter((s): s is Section =>
            sectionOrder.includes(s as Section),
          ),
        }
      : {}),
  };
}
export function reasonConstraint(reason: string): Constraint[] {
  return reason === "Too touristy"
    ? ["touristy"]
    : reason === "Too crowded"
      ? ["crowded"]
      : reason === "Too mainstream"
        ? ["mainstream"]
        : reason === "Too expensive"
          ? ["expensive"]
          : reason === "Wrong atmosphere"
            ? ["atmosphere"]
            : [];
}

export { onboardingTastes } from "../workspace/state.ts";
