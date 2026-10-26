import {notFound} from 'next/navigation';
import {readShare} from '../../../src/share/links';
import {sectionLabel} from '../../../src/passport/labels';

export const dynamic='force-dynamic';
export const revalidate=0;
export default async function SharedPassport({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 const snapshot=await readShare(token).catch(()=>undefined);
 if(!snapshot)notFound();
 return <main className="shared-passport-page">
   <header className="shared-page-header"><a href="/" className="shared-brand"><span className="shared-brand-mark" aria-hidden="true">✦</span><span>FaveRoam</span></a><span className="shared-read-only">Shared taste card · read-only</span></header>
   <section className="shared-page-hero" aria-labelledby="shared-page-title">
     <div className="shared-hero-copy"><span className="micro-label">THE THREADS BETWEEN FAVORITES</span><h1 id="shared-page-title">A little of what they love.<br/><em>A city to explore.</em></h1><p>These interests are their starting point for discovering {snapshot.city}. The places and themes below come from their returned Passport, ready to explore together.</p>
       <a className="primary-button" href={`/?together=${encodeURIComponent(token)}`}>Find our common ground <span aria-hidden="true">↗</span></a>
     </div>
     <div className="shared-cover" aria-label={`Shared tastes for ${snapshot.city}`}><div className="shared-cover-line" aria-hidden="true"><svg viewBox="0 0 300 160" fill="none"><path d="M4 100C73 9 120 151 192 73S263 44 297 96" stroke="currentColor" strokeWidth="4"/><circle cx="37" cy="67" r="8" fill="currentColor"/><circle cx="153" cy="102" r="8" fill="currentColor"/><circle cx="266" cy="59" r="8" fill="currentColor"/></svg></div><span>MY FAVEROAM</span><strong>{snapshot.city}</strong><small>{snapshot.interests.length} confirmed interest{snapshot.interests.length===1?'':'s'} · {snapshot.themes.length} returned theme{snapshot.themes.length===1?'':'s'}</small></div>
   </section>
   <div className="shared-page-grid">
     <section className="shared-page-section" aria-labelledby="shared-interests"><span className="micro-label">01 · THE STARTING POINT</span><h2 id="shared-interests">What they love</h2><p>Confirmed interests, chosen by the person who shared this card.</p><ul className="shared-interest-list">{snapshot.interests.map((interest,index)=><li key={`${interest.name}-${index}`}><span aria-hidden="true">✦</span>{interest.name}</li>)}</ul></section>
     <section className="shared-page-section" aria-labelledby="shared-themes"><span className="micro-label">02 · THE CULTURAL THREAD</span><h2 id="shared-themes">Returned taste themes</h2><p>Shared cultural associations to explore, not a prediction of what any person will enjoy.</p>{snapshot.themes.length?<ul className="shared-theme-list">{snapshot.themes.map(theme=><li key={theme.id}>{theme.name}</li>)}</ul>:<p className="shared-empty">No distinct themes were returned for this card. Their confirmed interests still give you a place to start.</p>}</section>
   </div>
   <section className="shared-page-section shared-discoveries" aria-labelledby="shared-discoveries"><div><span className="micro-label">03 · WHERE IT COULD LEAD</span><h2 id="shared-discoveries">A few discoveries</h2><p>Ideas from their returned Passport. Check current details before making plans.</p></div>{snapshot.cards.length?<ul className="shared-discovery-list">{snapshot.cards.map((card,index)=><li key={card.id}><span className="shared-discovery-number">0{index+1}</span><div><small>{sectionLabel(card.section)}</small><strong>{card.name}</strong>{card.address&&<p>{card.address}</p>}</div></li>)}</ul>:<p className="shared-empty">No validated discoveries were available to share yet.</p>}</section>
   <section className="shared-page-invitation"><div><span className="micro-label">A SHARED NEXT STEP</span><h2>What might you both enjoy?</h2><p>Build your own Passport, then compare your confirmed tastes with theirs. We’ll show returned common ground without claiming a compatibility percentage.</p></div><a className="primary-button" href={`/?together=${encodeURIComponent(token)}`}>Explore together <span aria-hidden="true">↗</span></a></section>
   <footer className="shared-page-footer"><span>From what you love to where you belong.</span><span>This link expires automatically. No account or chat was shared.</span></footer>
 </main>;
}
