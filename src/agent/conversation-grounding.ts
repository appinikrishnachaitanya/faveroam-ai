import { categoryLanguage } from "./category-language.ts";
import { editDistance } from "../text/edit-distance.ts";
import type { Intent } from "./types.ts";
import { isOutputCategoryConcept } from './output-category.ts';

/** A discovery goal is a search mode, not a cultural taxonomy tag. */
export function isDiscoveryGoalConcept(value: string): boolean {
  return /^(?:(?:hidden[-\s]?gems?|trending|popular|safe[-\s]?bets?|surprise(?:[-\s]?me)?|discover(?:y)?)\s*)+$/i.test(value.trim());
}
function words(value: string): string[] {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").split(" ").filter(Boolean);
}
/** Hard stop for obvious accidental keyboard input; it never picks intent. */
export function accidentalKeystrokes(value: string): boolean {
  const normalized = categoryLanguage(value).toLowerCase();
  if (/qwertyuiop|asdfghjkl|zxcvbnm|qazwsxedc/i.test(normalized)) return true;
  const alphabetic = normalized.match(/[a-z]{12,}/g) ?? [];
  return alphabetic.some(token => (token.match(/[aeiou]/g)?.length ?? 0) / token.length < 0.12);
}
/** Keep Gemini's structured intent and ground its cultural concepts in the
 * latest user message. Deterministic interpretation is for offline fallback. */
export function groundedModelIntent(request: string, model: Intent, explicit?: Intent): Intent {
  // A model can confidently misread keyboard noise as a request. Reject that
  // whole action before it reaches Qloo; this guard asks for clarification and
  // does not substitute a regex-selected category or preference.
  if (accidentalKeystrokes(request)) return {
    ...model,
    kind: "unknown",
    question: undefined,
    clarification: "I didn’t catch that. What would you like to find?",
    sections: [], seeds: [], concepts: [], constraints: [], excludeConcepts: [],
    hide: [], activityGenres: [], query: undefined, familiarity: undefined,
  };
  const currentRequest = categoryLanguage(request).replace(
    /\b(?:i\s+)?(?:don['’]t|do not|no longer)\s+need\s+[^.!?;]*?(?=\b(?:all i want|instead|just|but)\b|[.!?;]|$)/gi, " ");
  const positiveRequest = currentRequest.replace(
    /\b(?:no|without|avoid|exclude|not interested in|don['’]t want|do not want)\s+([^,;.!?]+)(?=[,;.!?]|$)/gi,
    " ",
  );
  const spokenWords = words(positiveRequest);
  const mentionedWords = words(currentRequest);
  const explicitConcepts = new Set((explicit?.concepts ?? []).map(x=>words(x).join(" ")));
  const explicitExclusions = new Set((explicit?.excludeConcepts ?? []).map(x=>words(x).join(" ")));
  const grounded = (concept: string) => {
    if (isDiscoveryGoalConcept(concept)) return false;
    if (isOutputCategoryConcept(concept,model.sections)) return false;
    if (/^quiet atmosphere$/i.test(concept) && /\b(?:peaceful|peacefully|calm|quiet|not loud|less noisy)\b/i.test(currentRequest)) return true;
    if (explicitConcepts.has(words(concept).join(" "))) return true;
    const meaningful = words(concept).filter(x=>![
      "cuisine","restaurant","restaurants","place","places","venue","venues",
      "food","foods","dining","type","category","genre","interest","interests","qloo"
    ].includes(x));
    // The model may normalize requested nouns ("sushi" -> "sushi cuisine"),
    // but cannot introduce concepts the user never mentioned.
    const groundedWord = (word: string) => {
      const normalized = word.replace(/s$/, "");
      return spokenWords.some(source => {
        const sourceNormalized = source.replace(/s$/, "");
        if (source === word || sourceNormalized === normalized) return true;
        if (Math.min(word.length, source.length) < 5) return false;
        const allowance = Math.max(word.length, source.length) >= 9 ? 2 : 1;
        return editDistance(word, source) <= allowance;
      });
    };
    // Permit a small spelling correction, but still require each meaningful
    // concept word to be present or very close to something the user typed.
    return meaningful.length>0 && meaningful.every(groundedWord);
  };
  const modelConcepts = model.concepts.filter(concept =>
    grounded(concept) && !explicitExclusions.has(words(concept).join(" ")),
  );
  // Prefer Gemini's complete phrase (e.g. "mutton dum biryani") over a
  // partial deterministic hint ("biryani"). The regex only fills omissions.
  // Gemini is authoritative wherever it returned a valid, grounded field.
  // The deterministic parser only supplies a genuinely missing field; it
  // never unions guesses into a populated model decision.
  const concepts = [...new Set(
    modelConcepts.length ? modelConcepts : (explicit?.concepts ?? []).filter(grounded),
  )].slice(0, 5);
  const modelExclusions = (model.excludeConcepts ?? []).filter(concept =>
    explicitExclusions.has(words(concept).join(" ")) || words(concept).every(word => mentionedWords.includes(word)),
  );
  const excludeConcepts = [...new Set(
    modelExclusions.length ? modelExclusions : (explicit?.excludeConcepts ?? []),
  )].slice(0, 5);
  const sectionContext = currentRequest.replace(/\bmy\s+(?:film|movie)\s+(?:tastes|interests|favorites)\b/gi, "");
  const sections = model.sections.filter(section => !(section === "Movies" &&
    /\bmy\s+(?:film|movie)\s+(?:tastes|interests|favorites)\b/i.test(currentRequest) &&
    !/\b(?:find|show|recommend|suggest|watch|stream)\b[^.!?]*\b(?:movies?|films?)\b/i.test(sectionContext)));
  const constraints = model.constraints.length ? model.constraints : (explicit?.constraints ?? []);
  const seeds = model.seeds.length ? model.seeds : (explicit?.seeds ?? []);
  const hide = model.hide?.length ? model.hide : explicit?.hide;
  const activityGenres = model.activityGenres?.length
    ? model.activityGenres
    : explicit?.activityGenres;
  const familiarity = model.familiarity ?? explicit?.familiarity;
  const destination = model.destination ?? explicit?.destination;
  const question = model.question ?? explicit?.question;
  const clarification = model.clarification ?? explicit?.clarification;
  const query = { ...(model.query ?? {}) };
  for (const [key, value] of Object.entries(explicit?.query ?? {})) {
    if (query[key as keyof typeof query] === undefined) {
      Object.assign(query, { [key]: value });
    }
  }
  return {
    ...model,
    sections,
    constraints,
    seeds,
    concepts,
    excludeConcepts,
    ...(hide?.length ? { hide } : { hide: [] }),
    ...(activityGenres?.length ? { activityGenres } : { activityGenres: [] }),
    ...(familiarity ? { familiarity } : {}),
    ...(destination ? { destination } : {}),
    ...(question ? { question } : {}),
    ...(clarification ? { clarification } : {}),
    ...(Object.keys(query).length ? { query } : {}),
  };
}
export function isGreetingOrTypo(text: string): boolean {
  return /^(?:h[iyj]|he(?:llo|lli|llo+|ya|y)|hello|hi|hey|hiya)(?:\s+bro)?[!,.?\s]*$/i.test(text.trim());
}
