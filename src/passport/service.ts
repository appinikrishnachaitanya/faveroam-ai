import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { search, insights, QlooError, insightParams } from '../qloo/client.ts';
import { candidates, classify, card } from './model.ts';
import type { Candidate, Card } from './model.ts';
export const cities = ['New York City', 'London', 'Paris', 'Tokyo'] as const;
function sign(payload: string) { const key=process.env.QLOO_API_KEY; if(!key)throw new QlooError('Qloo is not configured.');return createHmac('sha256',key).update(payload).digest('hex'); }
export function seal(items: {query:string;candidates:Candidate[]}[]) {
  const payload=Buffer.from(JSON.stringify({items,expires:Date.now()+20*60_000})).toString('base64url');return `${payload}.${sign(payload)}`;
}
export function unseal(token:string): {query:string;candidates:Candidate[]}[] {
  const [payload,signature]=token.split('.');const expected=sign(payload??'');
  if(!signature||signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw new QlooError('Taste confirmation expired or invalid. Resolve again.',400);
  const value=JSON.parse(Buffer.from(payload,'base64url').toString());
  if(value.expires<Date.now())throw new QlooError('Taste confirmation expired. Resolve again.',400);
  return value.items;
}
export async function resolve(queries:string[]) {
  const items=[];for(const query of queries){try{items.push({query,candidates:candidates(await search(query))});}catch(e){if(e instanceof QlooError&&e.status===404)items.push({query,candidates:[]});else throw e;}}
  return {items,token:seal(items)};
}
export async function passport(city:string,token:string,ids:string[]) {
  const items=unseal(token);const selected=items.map(item=>item.candidates.find(c=>ids.includes(c.id))).filter((c):c is Candidate=>Boolean(c));
  if(selected.length<3||selected.length!==ids.length||new Set(ids).size!==ids.length)throw new QlooError('Confirm three to five distinct taste matches.',400);
  const cards:Card[]=[];const notices:string[]=[];
  for(const type of ['place','artist']) {
    try {
      const params=insightParams(ids,type,type==='place');params.take='20';
      params[type==='place'?'filter.location.query':'signal.location.query']=city;
      const result=await insights(params);
      for(const entity of result.entities){if(ids.includes(entity.entity_id))continue;const section=type==='artist'?'Music':classify(entity);if(section)cards.push(card(entity,section));}
      if(!result.entities.length)notices.push(`${type==='place'?'Local places':'Music'} returned no discoveries.`);
    }catch(e){notices.push(`${type==='place'?'Local places':'Music'}: ${e instanceof QlooError?e.message:'Qloo returned an unexpected response.'}`);}
  }
  return {city,selected,cards:[...new Map(cards.map(c=>[c.id,c])).values()],notices,
    explanation:'Queried using all confirmed taste signals. Qloo did not provide individual signal attribution.'};
}
