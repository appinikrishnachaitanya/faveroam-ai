import type {Card,Section} from '../../src/passport/model';
import {sectionOrder} from '../../src/workspace/state';
import {sectionLabel} from '../../src/passport/labels';
export default function GenerationPreview({city,previews,onCancel,sections=[]}:{city:string;previews:Partial<Record<Section,Card[]>>;onCancel:()=>void;sections?:Section[]}){
 const ready=sectionOrder.filter(section=>previews[section]?.length);
 const completed=sections.filter(section=>Object.hasOwn(previews,section));
 return <section className="generation-previews" aria-labelledby="generation-heading" aria-busy="true">
   <header><span className="micro-label">YOUR PASSPORT IS TAKING SHAPE</span><h1 id="generation-heading" tabIndex={-1}>Discover {city}, your way.</h1><p>Finding places and culture connected to your confirmed tastes.</p></header>
   <p role="status" aria-live="polite">{sections.length&&completed.length===sections.length?'Preparing your editable Passport…':ready.length?`${ready.length} ${ready.length===1?'category is':'categories are'} ready. We’re finishing the rest.`:'Finding your first taste matches…'}</p>
   {sections.length>0&&<ul className="generation-category-progress" aria-label="Discovery progress">{sections.map(section=><li key={section}>{sectionLabel(section)} · {Object.hasOwn(previews,section)?previews[section]?.length?'Ready':'No matches returned':'Searching…'}</li>)}</ul>}
   <div>{ready.map(section=><article key={section}><h2>{sectionLabel(section)}</h2><ol>{previews[section]!.map(card=><li key={card.id}><strong>{card.name}</strong>{card.address&&<small>{card.address}</small>}</li>)}</ol></article>)}</div>
   <footer><p>These are previews. Saving and refinement become available when your Passport is complete.</p><button type="button" className="quiet-button" onClick={onCancel}>Back to my interests</button></footer>
 </section>;
}
