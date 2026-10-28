import type {Card, Candidate} from './model';

/** A count of individually identified supporting tastes, never a predicted match. */
export function tasteEvidenceCoverage(card:Card,selected:readonly Pick<Candidate,'id'>[]) {
  const ids=[...new Set(selected.map(interest=>interest.id.toLowerCase()))];
  if(!ids.length || !card.evidence || card.evidence.result.id!==card.id)return;
  const contributors=new Set((card.intelligence?.taste?.contributingSignals??[])
    .filter(signal=>signal.contribution>0).map(signal=>signal.id.toLowerCase()));
  const returnedTags=new Set(card.evidence.result.tags.map(tag=>tag.id.toLowerCase()));
  const evidenced=ids.filter(id=>id.startsWith('urn:tag:')?returnedTags.has(id):contributors.has(id));
  if(!evidenced.length)return;
  return {count:evidenced.length,total:ids.length,percentage:Math.round(100*evidenced.length/ids.length)};
}
