import type { Section } from "./model.ts";
import { displayTags } from "../qloo/explanation.ts";
import type { TasteTag } from "../qloo/analysis.ts";
import { editDistance } from "../text/edit-distance.ts";

function themeMeaning(name:string):string {
  return name.toLowerCase()
    .replace(/\b(?:cuisine|foods?|style|dishes?|specialt(?:y|ies)|restaurants?|kitchen|cooking|local|homestyle|savouries|savories|variety|selection|of|and|accompaniments?)\b/g,'')
    .replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/).sort().join('');
}

export function themeCategories(theme:TasteTag|undefined,active:Section[]):Section[] {
  if(!theme)return active;
  const text=theme.id+' '+theme.name;
  if(/^urn:tag:style:qloo:/.test(theme.id))return active.filter(section=>section==='Movies'||section==='Shows').length ? active.filter(section=>section==='Movies'||section==='Shows') : ['Movies'];
  if(/coffee|caf[eé]/i.test(text))return ['Coffee'];
  if(/:cuisine:|:specialty_dish:|:dietary_option:|:dietary_attribute:/i.test(text))return ['Eat'];
  if(/:(?:music|artist):/i.test(text))return ['Music'];
  if(/:(?:media|movie|film|tv_show):/i.test(text))return active.filter(section=>section==='Movies'||section==='Shows').length ? active.filter(section=>section==='Movies'||section==='Shows') : ['Movies'];
  if(/:(?:book|literature):/i.test(text))return ['Books'];
  if(/:ambience:|:place:/i.test(text))return active.filter(section=>['Eat','Coffee','Culture','Lifestyle'].includes(section)).length ? active.filter(section=>['Eat','Coffee','Culture','Lifestyle'].includes(section)) : ['Eat'];
  return active;
}
/** Present diverse returned families first; never synthesize cultural themes. */
export function curatedThemes(tags:TasteTag[],limit=6):TasteTag[] {
  const grouped=new Map<string,TasteTag[]>();
  const meanings:string[]=[];
  const perSource=new Map<string,number>();
  const perSourceFamily=new Map<string,number>();
  for(const tag of displayTags(tags)){
    const source=tag.sourceInterestId;
    const family=tag.id.split(':').slice(2,4).join(':');
    if(source&&((perSource.get(source)??0)>=3 || (perSourceFamily.get(`${source}:${family}`)??0)>=2))continue;
    const key=themeMeaning(tag.name);
    if(!key) continue;
    // Stronger deduplication: reject a theme if its meaning key is:
    //   1. identical to an existing one, or
    //   2. a substring of an existing one (e.g. "coffee" ⊂ "indiancoffee"),
    //   3. has an existing one as a substring of it, or
    //   4. within edit distance 2 of an existing key of similar length.
    const isDuplicate = meanings.some(previous => {
      if (key === previous) return true;
      // Substring containment in either direction catches "coffee"/"indian coffee".
      if (key.length >= 4 && previous.includes(key)) return true;
      if (previous.length >= 4 && key.includes(previous)) return true;
      // Edit-distance near-match with proportional threshold.
      const minLen = Math.min(key.length, previous.length);
      const threshold = minLen >= 10 ? 2 : minLen >= 6 ? 1 : 0;
      if (threshold > 0 && editDistance(key, previous) <= threshold) return true;
      return false;
    });
    if (isDuplicate) continue;
    meanings.push(key);
    if(source){perSource.set(source,(perSource.get(source)??0)+1);perSourceFamily.set(`${source}:${family}`,(perSourceFamily.get(`${source}:${family}`)??0)+1);}
    grouped.set(family,[...(grouped.get(family)??[]),tag]);
  }
  const result:TasteTag[]=[];
  for(let rank=0;result.length<limit && [...grouped.values()].some(group=>group.length>rank);rank++)
    for(const group of grouped.values())if(group[rank]){result.push(group[rank]);if(result.length===limit)break;}
  return result;
}

/** Stay within the selected interests' returned taxonomy. Audience association
 * alone does not make an unrelated dish or venue a useful film theme. */
export function relevantThemes(tags:TasteTag[], interests:readonly {id:string;types:string[];name?:string}[]):TasteTag[] {
  const attributed=tags.some(tag=>Boolean(tag.sourceInterestId));
  if(attributed)return interests.flatMap(interest=>relevantThemesFor(tags.filter(tag=>!tag.sourceInterestId||tag.sourceInterestId===interest.id),[interest]));
  return relevantThemesFor(tags,interests);
}

/** Look up each selected favorite independently so one domain cannot dominate
 * the combined result. Preserve partial success and identify missing sources. */
export async function themesPerInterest<T extends {id:string;name:string;types:string[]}>(
  interests:readonly T[],
  lookup:(interest:T)=>Promise<TasteTag[]>,
):Promise<{tags:TasteTag[];unavailable:string[];noConnections:string[]}> {
  const results=await Promise.allSettled(interests.map(async interest=>({
    interest,
    tags:relevantThemes(await lookup(interest),[interest]),
  })));
  const tags:TasteTag[]=[];
  const unavailable:string[]=[];
  const noConnections:string[]=[];
  results.forEach((result,index)=>{
    const interest=interests[index];
    if(result.status==='rejected') { unavailable.push(interest.name); return; }
    if(!result.value.tags.length) { noConnections.push(interest.name); return; }
    tags.push(...result.value.tags.map(tag=>({...tag,sourceInterestId:interest.id,sourceInterestName:interest.name})));
  });
  return {tags,unavailable,noConnections};
}

function relevantThemesFor(tags:TasteTag[],interests:readonly {id:string;types:string[];name?:string}[]):TasteTag[] {
  const domains = new Set(interests.flatMap(interest => interest.id.startsWith('urn:tag:')
    ? [/^urn:tag:(?:cuisine|specialty_dish|dietary_option|dietary_attribute):/.test(interest.id) ? 'place' : interest.id.split(':')[3]] : interest.types.map(type=>type.replace('urn:entity:',''))));
  const allowed = new Set<string>();
  for (const domain of domains) {
    if (['movie','tv_show','media'].includes(domain)) ['media','movie','film','tv_show'].forEach(value=>allowed.add(value));
    else if (['artist','music'].includes(domain)) ['artist','music'].forEach(value=>allowed.add(value));
    else if (['book','literature'].includes(domain)) ['book','literature'].forEach(value=>allowed.add(value));
    else if (domain) allowed.add(domain);
  }
  const seen = new Set<string>();
  const meaning=themeMeaning;
  const selectedIds=new Set(interests.map(interest=>interest.id));
  const selectedNames=new Set(interests.flatMap(interest=>interest.name?[meaning(interest.name)]:[]));
  // Qloo's film styles use the shared "qloo" taxonomy, not "media".
  // Keep that documented family for screen interests without admitting shared
  // audience keywords, plot actions, or unrelated place metadata.
  const screenInterests=allowed.has('media');
  return displayTags(tags).filter(tag => {
    if(selectedIds.has(tag.id) || selectedNames.has(meaning(tag.name)))return false;
    const domain = /^urn:tag:(?:cuisine|specialty_dish|dietary_option|dietary_attribute):/.test(tag.id) ? 'place' : tag.id.split(':')[3];
    const label = tag.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
    const screenStyle=screenInterests && /^urn:tag:style:qloo:/.test(tag.id);
    const key=meaning(tag.name);
    if ((!allowed.has(domain) && !screenStyle) || /^(?:classics?|entertainment|ambitious|indie|popular|general|other|place|restaurant|bar|takeout restaurant|fast food restaurant|coffee shop)$/.test(label) || !key || seen.has(key)) return false;
    seen.add(key); return true;
  });
}

export function themeKind(theme:TasteTag):string {
  if(/^urn:tag:style:qloo:/.test(theme.id))return 'Film & TV style';
  if(/:(?:music|artist):/.test(theme.id))return 'Music';
  if(/:(?:media|movie|film|tv_show):/.test(theme.id))return 'Film & TV';
  if(/:(?:book|literature):/.test(theme.id))return 'Books';
  if(/^urn:tag:(?:cuisine|specialty_dish|dietary_option|dietary_attribute):/.test(theme.id))return 'Food & drink';
  return 'Taste connection';
}
