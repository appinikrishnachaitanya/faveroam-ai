"use client";
import {memo} from 'react';
import type {Card} from '../../src/passport/model';
import type {TasteComparison} from '../../src/qloo/compare';
import {commonGroundLinks,meaningfulSharedThemes} from '../../src/passport/common-ground';
export default memo(function CommonGroundThemes({comparison,cards,you,partner}:{comparison:TasteComparison;cards:Card[];you:{id:string;name:string}[];partner:{id:string;name:string}[]}){
 const themes=meaningfulSharedThemes(comparison),links=commonGroundLinks(cards,you,partner);
 return <section className="common-ground-evidence" aria-label="How your interests connect"><div className="two-profile-summary"><p><strong>Your confirmed interests</strong>{you.map(seed=>seed.name).join(', ')}</p><p><strong>Their confirmed interests</strong>{partner.map(seed=>seed.name).join(', ')||'Their confirmed profile'}</p></div>
 {links.map(link=><article key={link.card.id}><strong>{link.card.name}</strong><p>Returned individual taste contributions include {link.you.join(', ')} from your profile and {link.partner.join(', ')} from theirs. This is audience evidence, not a guarantee of enjoyment.</p></article>)}
 <div className="shared-theme-explanations">{themes.map(theme=>{const matches=cards.filter(card=>card.evidence?.result.tags.some(tag=>tag.id===theme.id));return <article key={theme.id}><h4>{theme.name}</h4><p>{theme.broad?'A broad association in the comparison of these two profiles. It does not explain a specific favourite by itself.':'Returned by the comparison of the two confirmed profiles above.'}</p>{matches.length?<p>Also listed on {matches.slice(0,2).map(card=>card.name).join(' and ')}{matches.length>2?` and ${matches.length-2} other returned choices`:''}.</p>:<p>No exact listing-tag connection was returned for the places shown.</p>}</article>;})}</div>
 {!themes.length&&<p>No shared themes were returned for these two profiles.</p>}
 {!links.length&&themes.length>0&&<p className="helper">The comparison connects the profiles as groups. It did not return enough individual contributions to claim which particular favourite explains each place.</p>}
 </section>;
});
