import test from 'node:test';
import assert from 'node:assert/strict';
import {shareThemeCandidates} from '../src/share/theme-preview.ts';

test('share theme candidates are bounded and sampled across sections',()=>{
 const sections=['Eat','Coffee','Culture','Music'] as const;
 const cards=Array.from({length:80},(_,cardIndex)=>({
  section:sections[cardIndex%sections.length],
  evidence:{result:{tags:Array.from({length:20},(_,tagIndex)=>({
   id:`urn:tag:genre:${sections[cardIndex%sections.length]}:card-${cardIndex}-tag-${tagIndex}`,
   name:`Theme ${cardIndex} ${tagIndex}`,
  }))}},
 }));
 const tags=shareThemeCandidates(cards);
 assert.equal(tags.length,320);
 for(const section of sections)assert.ok(tags.some(tag=>tag.id.includes(`:${section}:`)),`${section} tags should be represented`);
 assert.equal(new Set(tags.map(tag=>tag.id)).size,tags.length);
 assert.equal(cards[0].evidence.result.tags.length,20,'sampling must not mutate Passport data');
});

test('share theme sampling keeps duplicate tag IDs only once',()=>{
 const repeated={id:'urn:tag:genre:place:coffee',name:'Coffee'};
 const tags=shareThemeCandidates([
  {section:'Coffee',evidence:{result:{tags:[repeated]}}},
  {section:'Eat',evidence:{result:{tags:[repeated]}}},
 ]);
 assert.deepEqual(tags,[repeated]);
});
