import { isPlaceSection, type Card, type Section } from './model.ts';
export interface GeoPoint { latitude:number; longitude:number }
export function validPoint(value:unknown):value is GeoPoint {
  if(!value||typeof value!=='object')return false;
  const p=value as GeoPoint;
  return Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=90&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180;
}
export function geographicDistance(a:GeoPoint,b:GeoPoint):number {
  const r=Math.PI/180,lat=(b.latitude-a.latitude)*r,lon=(b.longitude-a.longitude)*r;
  const h=Math.sin(lat/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin(lon/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(Math.min(1,h)),Math.sqrt(Math.max(0,1-h)));
}
export interface PlaceCluster { id:string; anchor:Card; cards:Card[]; center:GeoPoint; radiusMeters:number; categories:Section[]; evidenceCount:number }
/** Deterministic DBSCAN over returned places. Noise never becomes an invented area.
 * The representative is a medoid: a returned venue minimizing total distance. */
export function clusterPlaces(input:readonly Card[],radiusMeters=1200,minPoints=2):PlaceCluster[] {
  if(!Number.isFinite(radiusMeters)||radiusMeters<=0||!Number.isInteger(minPoints)||minPoints<2)throw Error('Invalid clustering parameters.');
  const places=[...new Map(input.filter(c=>isPlaceSection(c.section)&&c.evidence?.source==='Qloo'&&c.evidence.result.id===c.id&&validPoint(c.intelligence?.location)).sort((a,b)=>a.id.localeCompare(b.id)||(a.intelligence!.location.latitude!-b.intelligence!.location.latitude!)||(a.intelligence!.location.longitude!-b.intelligence!.location.longitude!)).map(c=>[c.id,c])).values()].sort((a,b)=>a.id.localeCompare(b.id));
  const point=(i:number)=>places[i].intelligence!.location as GeoPoint;
  const neighbors=places.map((_,i)=>places.flatMap((__,j)=>geographicDistance(point(i),point(j))<=radiusMeters?[j]:[]));
  const visited=new Set<number>(),assigned=new Set<number>(),groups:number[][]=[];
  for(let i=0;i<places.length;i++){
    if(visited.has(i))continue;visited.add(i);
    if(neighbors[i].length<minPoints)continue;
    const group:number[]=[],queue=[...neighbors[i]],queued=new Set(queue);
    for(let cursor=0;cursor<queue.length;cursor++){
      const j=queue[cursor];
      if(!visited.has(j)){visited.add(j);if(neighbors[j].length>=minPoints)for(const n of neighbors[j])if(!queued.has(n)){queued.add(n);queue.push(n);}}
      if(!assigned.has(j)){assigned.add(j);group.push(j);}
    }
    if(group.length>=minPoints)groups.push(group);
  }
  return groups.map(indices=>{
    indices.sort((a,b)=>places[a].id.localeCompare(places[b].id));
    const medoid=indices.map(i=>({i,total:indices.reduce((sum,j)=>sum+geographicDistance(point(i),point(j)),0)})).sort((a,b)=>a.total-b.total||places[a.i].id.localeCompare(places[b.i].id))[0].i;
    const cards=indices.map(i=>places[i]),center=point(medoid);
    return {id:`area:${places[indices[0]].id}`,anchor:places[medoid],cards,center:{latitude:center.latitude,longitude:center.longitude},radiusMeters:Math.max(...indices.map(i=>geographicDistance(center,point(i)))),categories:[...new Set(cards.map(c=>c.section))].sort(),evidenceCount:cards.filter(c=>c.evidence?.inputs.length).length};
  }).sort((a,b)=>b.cards.length-a.cards.length||b.categories.length-a.categories.length||a.radiusMeters-b.radiusMeters||a.id.localeCompare(b.id)).slice(0,3);
}
