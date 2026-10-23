import { categoryLanguage } from "./category-language.ts";
import { containsConfiguredSecret } from "./secrets.ts";
import { refinementScope } from "./scope.ts";
import {
  extractDraft,
  sectionOrder,
} from "../workspace/state.ts";
import type { Section } from "../passport/model.ts";
import type { Constraint, Intent } from "./types.ts";
import {
  preferencesFromText,
  validatePreferences,
} from "../qloo/query-plan.ts";
import { validDestination } from "../workspace/location.ts";
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
  if (containsConfiguredSecret(value))
    throw Error("Credentials are not cultural inputs.");
  return value.trim();
}
export function constraintsFrom(text: string): Constraint[] {
  const values: Constraint[] = [];
  if (
    /(?:not|don't|doesn't|avoid|skip|less|too|isn't|is not|hate|dislike)[^.]*tourist|non.?tourist/i.test(
      text,
    )
  )
    values.push("touristy");
  if (/\b(?:quiet|quieter|peaceful|peacefully|not loud|less noisy|less crowded|too crowded|not crowded)\b/i.test(text))
    values.push("crowded");
  if (/niche|less mainstream|too mainstream|not mainstream/i.test(text))
    values.push("mainstream");
  if (/\b(?:budget|affordable|cheaper|too expensive|not expensive|not too pricey|cheap(?:er)? eats?|inexpensive|economical)\b/i.test(text))
    values.push("expensive");
  if (/wrong atmosphere/i.test(text)) values.push("atmosphere");
  return values;
}
export function isConcept(text: string) {
  return /^(?:(?:chicken|mutton|vegetable|hyderabadi)\s+biryani|biryani|ice ?cream|gelato|dessert|frozen yogurt|\w+(?:\s+\w+)?\s+cuisine|indian(?: cuisine| food)?|(?:\w+\s+)?(?:savouries|savories|savory snacks)|specialty coffee|coffee|quiet (?:caf[eé]s?|bookstores?)|independent bookstores?|independent culture|cuisine|food|bookstores?)$/i.test(
    text.trim(),
  );
}
export function interpret(text: string, fallback = "New York City"): Intent {
  text=categoryLanguage(text);
  culturalText(text);
  const constraints = constraintsFrom(text);
  const hasAction = /\b(?:find|show|recommend|suggest|take me|where can i|i want|i need|help me|give me|list|choose|pick|look for|search)\b/i.test(text);
  const onboarding = !hasAction &&
    /\b(?:i love|i like|i enjoy|i'm into|my tastes (?:are|include))\b/i.test(text);
  const droppedPreference = text.match(/\b(?:i\s+)?(?:don't|do not|no longer)\s+(?:need|want)\s+(?:any\s+)?([\p{L}\p{N}]+(?:[-\s][\p{L}\p{N}]+){0,2})[,.]?\s+(?=(?:all i want|i just want|just|instead|but)\b)/iu)?.[1]?.trim();
  const clean = text.replace(/\bI (?:don't|do not|dislike|hate)[\s\S]*$/i, "");
  const draft = extractDraft(clean, fallback);
  const sections: Section[] = [];
  const scoped = refinementScope(text);
  const positive = scoped.positive.replace(
    /\b(?:not|no|without)\s+(?:ordinary\s+)?restaurants?\b/gi,
    "",
  ).replace(/\b(?:connected to|based on|inspired by|matching|using)\s+my\b[^.!?]*(?:tastes|interests|favorites)\b/gi, "")
    .replace(/\bmy\s+(?:film|movie)\s+(?:tastes|interests|favorites)\b/gi, "");
  const asksLandmarks = /\b(?:famous places|famous landmarks|landmarks|tourist attractions|sights to see|must see places)\b/i.test(positive);
  if (/\b(?:eat|eats|dinner|lunch|breakfast|food|dining|restaurants?|biryani|indian|ice ?creams?|gelato|frozen yogurt|desserts?)\b/i.test(positive))
    sections.push("Eat");
  if (droppedPreference && /\b(?:chicken|mutton|biryani|noodles?|sushi|pizza|food|dish|cuisine|seafood|vegetarian|ice ?cream|gelato|dessert)\b/i.test(droppedPreference))
    sections.push("Eat");
  if (/coffee|caf[eé]/i.test(positive)) sections.push("Coffee");
  const screenContent = /(?:movies?|films?).*(?:to watch|recommendations?|suggestions?|stream)|(?:recommend|suggest|watch|stream).*(?:movies?|films?)/i.test(positive) && !/cinema|theat(?:er|re)|go.*movie/i.test(positive) && !(/dinner|party|nightlife|nightclub/i.test(positive) && /then|after|before/i.test(positive));
  if (screenContent) sections.push("Movies");
  if (/music|musical|artist|bands?/i.test(positive) && !/live music|music.friendly|concert/i.test(positive)) sections.push("Music");
  if (/cultur(?:e|al)|\bart\b|museum|gallery|cinema|\bparty\b|nightclub|nightlife|concert|live music|music.friendly/i.test(positive) || asksLandmarks || (!screenContent && /\bmovies?\b|\bfilms?\b/i.test(positive)))
    sections.push("Culture");
  if (/bookstore|book shop|lifestyle|shopping|boutique/i.test(positive) && !/coffee\s+shops?/i.test(positive))
    sections.push("Lifestyle");
  if (/\bbooks?\b/i.test(positive) && !/bookstore|book shop|book\s+(?:a|the|my)\b/i.test(positive)) sections.push("Books");
  if (/podcast/i.test(positive)) sections.push("Podcasts");
  if (/tv shows?|television|series to watch/i.test(positive)) sections.push("Shows");
  if (/video games?|games? to play/i.test(positive)) sections.push("Games");
  if (/\bbrands?\b/i.test(positive)) sections.push("Brands");
  if (/\bactors?|directors?|authors?|people\b/i.test(positive)) sections.push("People");
  if (/destinations?|cities to visit|where to travel/i.test(positive)) sections.push("Destinations");
  const concepts = /\b(?:ice ?creams?|gelato)\b/i.test(positive) ? [/gelato/i.test(positive) ? "gelato" : "ice cream"] : /\b(?:desserts?|frozen yogurt)\b/i.test(positive) ? [positive.match(/frozen yogurt|desserts?/i)?.[0]?.toLowerCase() ?? "dessert"] : /indian|biryani/i.test(positive)
    ? [/biryani/i.test(positive) ? (/chicken\s+biryani/i.test(positive) ? "chicken biryani" : "biryani") : "Indian cuisine"]
    : [];
  if (
    /independent\s+(?:coffee\s+)?shops?|local\s+coffee|specialty\s+coffee/i.test(
      text,
    )
  )
    concepts.push("independent coffee shops");
  const excludeConcepts =
    /(?:instead of|without|not|no|avoid|exclude)\s+(?:starbucks|big\s+chains?|large\s+chains?|chains?)/i.test(
      text,
    )
      ? ["Starbucks", "coffee chain"]
      : [];
  if (/\bThai\b/i.test(positive)) concepts.push("Thai cuisine");
  if (/\bvegetarian\b/i.test(positive)) concepts.push("vegetarian");
  if (/live music|\bconcerts?\b/i.test(positive)) concepts.push("live music venue");
  if (
    !onboarding &&
    /show|find|want/i.test(text) &&
    /books|bookstore/i.test(text)
  )
    concepts.push("bookstore");
  const hide = /\b(?:forget|remove|hide|skip)\s+(?:(?:the|my|this|these)\s+)?(?:eat|food|dining|coffee|caf[eé]|music|movies?|culture|books?|podcasts?|shows?|games?|brands?|people|destinations?|lifestyle)\b/i.test(text) && !onboarding;
  const hidden: Section[] = [];
  const hidePart =
    text.match(
      /(?:forget|remove|hide|skip)\s+(?:(?:the|my|this|these)\s+)?([^.!?]*?)(?=\s+(?:show|give|find)|[.!?]|$)/i,
    )?.[1] ?? "";
  if (/coffee|caf[eé]/i.test(hidePart)) hidden.push("Coffee");
  if (/food|dining/i.test(hidePart)) hidden.push("Eat");
  if (/music/i.test(hidePart)) hidden.push("Music");
  if (/book|lifestyle/i.test(hidePart)) hidden.push("Lifestyle");
  if (/cultur(?:e|al)/i.test(hidePart)) hidden.push("Culture");
  const activeSections = sections.filter((s) => !hidden.includes(s) && !scoped.preserved.includes(s));
  const actionRequest = /\b(?:find|replace|change|update|make|remove|hide|refine|show|give|list|search|look for|want|need|take me|pick|choose)\b/i.test(text) ||
    (/\b(?:recommend|suggest)\b/i.test(text) && !/^(?:why|how|what)\b/i.test(text));
  const question: Intent["question"] = actionRequest ? undefined
    : /what can you|how can you help|what do you do/i.test(text) ? "capabilities"
    : /(?:what|which|show).*(?:preferences|requirements|filters)|what.*(?:remember|saved.*tastes)/i.test(text) ? "preferences"
    : /\bwhy\b|explain.*(?:matches|choices|suggestions|recommendations)/i.test(text) ? "explanation" : undefined;
  const refine =
    !question && !onboarding &&
    (excludeConcepts.length > 0 || constraints.length > 0 || /tonight|quieter|more|less|find|show|want|give|help|recommend|suggest|too |niche|refine|rank|reorder|trending|hidden gem|safe bet|surprise me|highly rated|make it/i.test(
      text,
    ));
  const action: Intent["action"] = /\b(?:save|store|keep)\b[^.!?]{0,70}\b(?:passport|this|it)\b/i.test(text)
    ? "save-passport"
    : /\b(?:plan|itinerary|schedule|outing|day out)\b/i.test(text) ? "plan-day" : undefined;
  return {
    ...(action ? { action } : {}),
    ...(question ? { question } : {}),
    ...(!question && !sections.length && !concepts.length && !constraints.length
      ? { clarification: "What would you like to find: somewhere to eat, a place to go, or something to watch or listen to?" }
      : {}),
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
    activityGenres: [
      ...(!screenContent && /\bmovies?\b|cinema/i.test(positive) ? ["cinema" as const] : []),
      ...(/\bparty\b|nightclub|nightlife/i.test(positive) ? ["nightclub" as const] : []),
      ...(asksLandmarks ? ["landmark" as const] : []),
    ],
    excludeConcepts: [...new Set([
      ...(droppedPreference ? [droppedPreference] : []),
      ...(/\bno seafood\b/i.test(text) ? ["seafood", ...excludeConcepts] : excludeConcepts),
    ])],
    query: preferencesFromText(text),
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
    !validDestination(x.destination)
  )
    throw Error("Unsupported destination");
  if (
    x.familiarity !== undefined &&
    !["familiar", "balanced", "explore"].includes(String(x.familiarity))
  )
    throw Error("Invalid familiarity mode");
  if (x.activityGenres !== undefined &&
      (!Array.isArray(x.activityGenres) || x.activityGenres.length > 3 ||
       x.activityGenres.some(value => !["cinema", "nightclub", "landmark"].includes(String(value)))))
    throw Error("Invalid activity genre");
  for (const value of [...(x.seeds as string[]), ...(x.concepts as string[])])
    culturalText(value, 100);
  const clarification = typeof x.clarification === "string" && x.clarification.length <= 240 &&
    x.clarification.trim().endsWith("?") &&
    !/\b(?:password|api key|email|phone|home address|account|secret|credential)\b|https?:\/\//i.test(x.clarification) &&
    !containsConfiguredSecret(x.clarification)
    ? x.clarification.trim()
    : undefined;
  return {
    kind: x.kind as Intent["kind"],
    ...(["save-passport", "plan-day"].includes(String(x.action))
      ? { action: x.action as Intent["action"] } : {}),
    ...(["capabilities", "preferences", "explanation"].includes(String(x.question))
      ? { question: x.question as Intent["question"] } : {}),
    ...(clarification ? { clarification } : {}),
    strategy: x.strategy as Intent["strategy"],
    seeds: x.seeds as string[],
    concepts: x.concepts as string[],
    constraints: x.constraints as Constraint[],
    sections: x.sections as Section[],
    ...(Array.isArray(x.excludeConcepts)
      ? {
          excludeConcepts: x.excludeConcepts
            .filter((s): s is string => typeof s === "string")
            .slice(0, 2)
            .map((s) => culturalText(s, 100)),
        }
      : {}),
    ...(x.query !== undefined ? { query: validatePreferences(x.query) } : {}),
    ...(x.familiarity
      ? { familiarity: x.familiarity as Intent["familiarity"] }
      : {}),
    ...(x.destination ? { destination: String(x.destination) } : {}),
    ...(Array.isArray(x.activityGenres)
      ? { activityGenres: x.activityGenres as Intent["activityGenres"] }
      : {}),
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


export function findMentionedCard<T extends { id: string; name: string }>(text: string, cards: readonly T[]): T | undefined {
  if (!text || typeof text !== "string" || !cards?.length) return undefined;
  const normalized = text.toLowerCase().trim();
  const sorted = [...cards].sort((a, b) => b.name.length - a.name.length);
  return sorted.find(c => {
    if (!c.name || c.name.length < 3) return false;
    const nameLow = c.name.toLowerCase();
    if (normalized === nameLow) return true;
    if (nameLow.length >= 4 && normalized.includes(nameLow)) return true;
    const escaped = nameLow.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    try {
      return new RegExp(`\\b${escaped}\\b`, "i").test(normalized);
    } catch {
      return false;
    }
  });
}
