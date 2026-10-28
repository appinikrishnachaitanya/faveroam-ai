import type { Section } from '../passport/model.ts';

// Content kinds select retrieval output. They are not genres or taste filters.
// Specific modifiers ("jazz", "Tamil", "science fiction") deliberately remain
// outside this vocabulary and continue through grounded Qloo tag resolution.
const contentKinds:Partial<Record<Section,readonly string[]>>={
 Music:['music','song','songs','track','tracks','tune','tunes','artist','artists','musician','musicians','band','bands'],
 Movies:['movie','movies','film','films'],
 Shows:['tv','television','show','shows','series'],
 Books:['book','books'],
 Podcasts:['podcast','podcasts'],
 Games:['video','game','games','videogame','videogames'],
 Brands:['brand','brands'],
 People:['people','person'],
 Destinations:['destination','destinations','city','cities'],
};
const requestWords=new Set(['i','want','would','like','to','listen','listening','watch','watching','read','reading','play','playing','recommend','recommendations','suggest','suggestions','find','discover','show','give','me','some','a','an','the','please','for','today','tonight','now']);
export function isOutputCategoryConcept(concept:string,sections:readonly Section[]):boolean {
 const tokens=concept.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/).filter(Boolean);
 const meaningful=tokens.filter(word=>!requestWords.has(word));
 const words=meaningful.length?meaningful:tokens;
 return words.length>0 && sections.some(section=>{
   const kinds=contentKinds[section];
   return kinds && words.every(word=>kinds.includes(word));
 });
}
