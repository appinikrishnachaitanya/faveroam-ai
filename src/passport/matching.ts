import { editDistance } from "../text/edit-distance.ts";
import type { Candidate } from "./model.ts";
function queryParts(query:string) {
  const match=query.trim().match(/^(.+?)\s+\(?((?:19|20)\d{2})\)?$/);
  return {nameQuery:match?.[1] ?? query,year:match?.[2]};
}
const key = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
/** Auto-match only a unique exact name within one returned entity type. */
export function suggestedMatch(query: string, candidates: Candidate[]): string | undefined {
  const {nameQuery,year}=queryParts(query);
  const exact = candidates.filter((candidate) => key(candidate.name) === key(nameQuery) && (!year || new RegExp(`\\b${year}\\b`).test(candidate.detail)));
  if (exact.length !== 1) return;
  const match = exact[0];
  if (match.id.startsWith("urn:tag:")) return;
  return match.id;
}
export function suggestedMatches(items: { query: string; candidates: Candidate[] }[]) {
  const chosen: Record<number, string> = {};
  const used = new Set<string>();
  items.forEach((item, index) => {
    const id = suggestedMatch(item.query, item.candidates);
    if (id && !used.has(id)) { chosen[index] = id; used.add(id); }
  });
  return chosen;
}

/**
 * Remove candidates that share no meaningful word overlap with the query and
 * whose type is clearly different from what the query implies. This prevents
 * obviously irrelevant alternatives from appearing in the resolver dialog.
 */
export function filterIrrelevantCandidates(query: string, candidates: Candidate[]): Candidate[] {
  if (candidates.length <= 1) return candidates;
  const normalize = (text: string) =>
    text.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const queryNorm = normalize(query);
  const queryTokens = new Set(queryNorm.split(/\s+/).filter(t => t.length >= 3));

  // Classify query intent by type keywords
  const queryImpliesPlace = /restaurant|cafe|café|bar|venue|place|food|cuisine|shop|store|market/i.test(query);
  const queryImpliesMedia = /film|movie|show|series|album|book|novel|song|track/i.test(query);
  const queryImpliesPerson = /director|actor|actress|author|singer|artist|musician|chef|chef/i.test(query);

  return candidates.filter((c) => {
    const nameNorm = normalize(c.name);
    const nameTokens = new Set(nameNorm.split(/\s+/).filter(t => t.length >= 3));
    // Keep if there's at least one shared meaningful token.
    const sharedTokens = [...queryTokens].filter(t => nameNorm.includes(t) || nameTokens.has(t));
    if (sharedTokens.length > 0) return true;

    // Keep if name is close enough (within edit distance proportional to length).
    const minLen = Math.min(queryNorm.replace(/\s/g, "").length, nameNorm.replace(/\s/g, "").length);
    if (minLen >= 4 && editDistance(queryNorm.replace(/\s/g, ""), nameNorm.replace(/\s/g, "")) <= Math.floor(minLen * 0.35)) return true;

    // Exclude if types are obviously mismatched and there's no name overlap.
    const typeStr = c.types.join(" ").toLowerCase();
    if (queryImpliesPlace && /\b(?:artist|movie|book|tv_show|podcast|video_game|brand|person)\b/.test(typeStr)) return false;
    if (queryImpliesMedia && /\b(?:place|restaurant|cafe)\b/.test(typeStr)) return false;
    if (queryImpliesPerson && /\b(?:place|movie|book|tv_show)\b/.test(typeStr)) return false;

    // Default: keep to avoid over-filtering.
    return true;
  });
}

/** Retrieval order is a tie breaker; lexical similarity is never a cultural affinity score. */
export function rankCandidates(query: string, candidates: Candidate[]): Candidate[] {
  const normalize = (text:string)=>text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
  const words = (text:string)=>new Set(normalize(text).split(/\s+/).filter(Boolean));
  const {nameQuery,year}=queryParts(query);
  const queryWords=words(nameQuery);
  const score=(candidate:Candidate)=>{
    const candidateWords=words(candidate.name);
    const overlap=[...queryWords].filter(word=>candidateWords.has(word)).length;
    return (key(candidate.name)===key(nameQuery)?100:0) + overlap/Math.max(1,new Set([...queryWords,...candidateWords]).size)*10 +
      (year && new RegExp(`\\b${year}\\b`).test(candidate.detail)?30:0);
  };
  return candidates.map((candidate,index)=>({candidate,index,score:score(candidate)}))
    .sort((a,b)=>b.score-a.score || a.index-b.index).map(row=>row.candidate);
}

/** A review suggestion is never confirmation: the user still submits the final matches. */
export function reviewMatch(query:string,candidates:Candidate[]):string|undefined {
  const {nameQuery,year}=queryParts(query);
  const canonical=(value:string)=>key(value.replace(/\b(?:cuisine|food|cooking)\b/gi,""));
  const explicitCuisine=/\b(?:cuisine|food|cooking)\b/i.test(nameQuery);
  const cuisine=candidates.filter(candidate=>/^urn:tag:(?:cuisine|specialty_dish):/.test(candidate.id) && canonical(candidate.name)===canonical(nameQuery));
  if(explicitCuisine && cuisine.length===1)return cuisine[0].id;
  const exact=suggestedMatch(query,candidates);
  if(exact)return exact;
  const exactAll=candidates.filter(candidate=>key(candidate.name)===key(nameQuery) && (!year || candidate.detail.includes(year)));
  if(exactAll.length===1)return exactAll[0].id;
  if(exactAll.length>1)return;
  const tokens=nameQuery.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const containing=candidates.filter(candidate=>tokens.length && tokens.every(token=>new Set<string>(candidate.name.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).has(token)) && (!year || candidate.detail.includes(year)));
  if(key(nameQuery).length>=3 && containing.length===1)return containing[0].id;
  const near=candidates.filter(candidate=>key(nameQuery).length>=6 && editDistance(key(candidate.name),key(nameQuery))<=1 && (!year || candidate.detail.includes(year)));
  return near.length===1?near[0].id:undefined;
}
export function reviewMatches(items:{query:string;candidates:Candidate[]}[]) {
  const chosen:Record<number,string>={},used=new Set<string>();
  items.forEach((item,index)=>{const id=reviewMatch(item.query,item.candidates);if(id&&!used.has(id)){chosen[index]=id;used.add(id);}});
  return chosen;
}
