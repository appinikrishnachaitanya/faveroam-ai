import type {Card} from './model.ts';
import {isPlaceSection} from './model.ts';
import {geographicDistance,validPoint,type GeoPoint} from './place-clusters.ts';

/** Local-only ordering of returned places. Evidence breaks near-distance ties;
 * neither a Qloo contribution nor this ordering is a probability of enjoyment. */
export function nearbyReturnedPlaces(cards:readonly Card[],point:GeoPoint){
  if(!validPoint(point))return [];
  return cards.filter(card=>isPlaceSection(card.section)&&card.evidence?.source==='Qloo'&&card.evidence.result.id===card.id&&validPoint(card.intelligence?.location))
    .map(card=>({card,distanceKm:geographicDistance(point,card.intelligence!.location as GeoPoint)/1000,
      evidence:card.intelligence?.taste?.contributingSignals?.some(signal=>Number.isFinite(signal.contribution)&&signal.contribution>0)?2:card.evidence?.inputs?.length?1:0}))
    .sort((a,b)=>Math.floor(a.distanceKm)-Math.floor(b.distanceKm)||b.evidence-a.evidence||a.distanceKm-b.distanceKm||a.card.id.localeCompare(b.card.id));
}

export function areaHighlights(cards:readonly Card[]){
  return [...new Set(cards.map(card=>card.section))]
    .map(section=>({section,cards:cards.filter(card=>card.section===section)}))
    .sort((a,b)=>b.cards.length-a.cards.length||a.section.localeCompare(b.section))
    .slice(0,3)
    .map(group=>({section:group.section,count:group.cards.length,example:group.cards[0].name}));
}
