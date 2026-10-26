import {notFound} from 'next/navigation';
import {readShare} from '../../../src/share/links';
export const dynamic='force-dynamic';
export default async function SharedPassport({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 const snapshot=await readShare(token).catch(()=>undefined);
 if(!snapshot)notFound();
 return <main className="shared-passport-page"><a href="/">TastePassport AI</a><span className="micro-label">A SHARED TASTE CARD</span><h1>{snapshot.city}, through their tastes</h1>
   <p>These are tastes and discoveries the sender chose to share. Cultural associations are suggestions, not facts about either person.</p>
   <h2>What they love</h2><ul>{snapshot.interests.map((interest,index)=><li key={index}>{interest.name}</li>)}</ul>
   <h2>Returned taste themes</h2>{snapshot.themes.length?<ul>{snapshot.themes.map(theme=><li key={theme.id}>{theme.name}</li>)}</ul>:<p>No distinct returned themes were available for this card.</p>}
   <h2>Places and culture to consider</h2>{snapshot.cards.length?<ul>{snapshot.cards.map(card=><li key={card.id}><strong>{card.name}</strong> · {card.section}{card.address?` · ${card.address}`:''}</li>)}</ul>:<p>No validated discoveries were available to share.</p>}
   <a className="primary-button" href={`/?together=${encodeURIComponent(token)}`}>Explore common ground with my tastes</a>
   <p className="helper">This link expires automatically. Check current venue details before visiting.</p>
 </main>;
}
