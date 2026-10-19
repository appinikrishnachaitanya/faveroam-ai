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
