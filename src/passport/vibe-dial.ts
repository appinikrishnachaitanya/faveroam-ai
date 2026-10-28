import type {Card,Candidate,Section} from './model';
import {curatedThemes,relevantThemes,themeCategories} from './taste-themes';
export function vibeDirections(cards:Card[],selected:Candidate[],sections:Section[]){
 const tags=cards.filter(card=>card.evidence?.result.id===card.id).flatMap(card=>card.evidence?.result.tags??[]);
 return curatedThemes(relevantThemes(tags,selected),3).flatMap(theme=>{
   const targets=themeCategories(theme,sections).filter(section=>sections.includes(section)).slice(0,3);
   return targets.length?[{theme,sections:targets}]:[];
 });
}
