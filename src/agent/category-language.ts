/** Bounded common chat vocabulary, not arbitrary cultural entity-name matching. */
import { editDistance } from "../text/edit-distance.ts";

export function categoryLanguage(text:string):string {
  return text.replace(/\b[a-z]{5,16}\b/gi,word=>{
    const lower=word.toLowerCase();
    const foodContext=/\b(?:eat|food|dish|restaurant|chicken|mutton|vegetable|hyderabadi|biryani|cuisine|crav(?:e|ing)|order|want)\b/i.test(text);
    const targets=lower.startsWith('res')?['restaurant','restaurants']:lower.startsWith('mus')||lower==='muisc'?['music']:lower.startsWith('cof')?['coffee']:lower.startsWith('pea')?['peaceful','peacefully']:foodContext&&lower.startsWith('bir')?['biryani']:foodContext&&/^(?:nod|nood)/.test(lower)?['noodles']:[];
    if(targets.includes(lower))return word;
    const matches=targets.map(target=>({target,distance:editDistance(lower,target)})).sort((a,b)=>a.distance-b.distance);
    const best=matches[0];
    return best && best.distance<=(lower.length>=9?2:1) ? best.target : word;
  });
}
export function incompleteUtterance(text:string):boolean {
  if (/^[a-z]{8,}$/i.test(text.trim()) && !/[aeiouy]/i.test(text)) return true;
  return /^[a-z]{1,2}[!?.]*$/i.test(text.trim()) && !/^(?:hi|tv|ok|no|go|up)[!?.]*$/i.test(text.trim());
}
