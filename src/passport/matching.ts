import type { Candidate } from "./model.ts";
const key = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
/** Auto-match only a unique exact name within one returned entity type. */
export function suggestedMatch(query: string, candidates: Candidate[]): string | undefined {
  const exact = candidates.filter((candidate) => key(candidate.name) === key(query));
  if (exact.length !== 1) return;
  const match = exact[0];
  if (match.id.startsWith("urn:tag:")) return;
  // Same-name editions/remakes across the catalog still require a choice.
  if (candidates.some((c) => c.id !== match.id && key(c.name) === key(match.name))) return;
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
