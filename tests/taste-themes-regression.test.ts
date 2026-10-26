import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAnalysis } from '../src/qloo/analysis.ts';
import { relevantThemes, themesPerInterest, themeCategories, themeKind } from '../src/passport/taste-themes.ts';

const film={id:'film',types:['urn:entity:movie']};
const artist={id:'artist',types:['urn:entity:artist']};
test('theme parsing preserves a full returned page before selecting relevant domains',()=>{
  const rows=Array.from({length:20},(_,i)=>({tag_id:`urn:tag:genre:place:fixture_${i}`,name:`Fixture place ${i}`,query:{affinity:1-i/100}}));
  rows.push({tag_id:'urn:tag:genre:music:fixture_score',name:'Fixture soundtrack',query:{affinity:.7}});
  const analysis=parseAnalysis('taste',{results:{tags:rows}});
  assert.equal(analysis.kind,'taste');
  if(analysis.kind!=='taste')return;
  assert.equal(analysis.tags.length,21);
  assert.deepEqual(relevantThemes(analysis.tags,[artist]).map(t=>t.name),['Fixture soundtrack']);
});
test('shared film-style taxonomy is useful without admitting arbitrary shared keywords',()=>{
  const style={id:'urn:tag:style:qloo:visually_immersive',name:'Visually Immersive'};
  const tags=[style,
    {id:'urn:tag:style:qloo:ambitious',name:'Ambitious'},
    {id:'urn:tag:keyword:media:punched_repeatedly',name:'Punched repeatedly'},
    {id:'urn:tag:genre:place:bar',name:'Bar'},
    {id:'urn:tag:genre:music:indian_classical',name:'Indian classical'},
  ];
  assert.deepEqual(relevantThemes(tags,[film]),[style]);
  assert.deepEqual(relevantThemes(tags,[artist]).map(t=>t.name),['Indian classical']);
  assert.deepEqual(themeCategories(style,['Eat','Music','Movies']),['Movies']);
  assert.deepEqual(themeCategories(style,['Shows','Eat']),['Shows']);
  assert.equal(themeKind(style),'Film & TV style');
});
test('combined tastes retain meaningful music and screen themes while discarding unrelated metadata',()=>{
 const tags=[
   {id:'urn:tag:genre:music:soundtrack',name:'Soundtrack'},
   {id:'urn:tag:style:qloo:narratively_complex',name:'Narratively Complex'},
   {id:'urn:tag:cost_description:place:expensive',name:'Expensive'},
 ];
 assert.deepEqual(relevantThemes(tags,[film,artist]).map(t=>t.name),['Soundtrack','Narratively Complex']);
});

test('a repeated input is not presented as a new connection under a different tag ID',()=>{
 const indian={id:'urn:tag:cuisine:qloo:indian',name:'Indian Cuisine',types:['urn:tag']};
 const tags=[indian,{id:'urn:tag:cuisine:place:indian',name:'Indian food'},{id:'urn:tag:cuisine:place:indian_kitchen',name:'Indian Kitchen'},{id:'urn:tag:cuisine:place:indian_dishes',name:'Indian Dishes'},{id:'urn:tag:cuisine:place:punjabi',name:'Punjabi cuisine'}];
 assert.deepEqual(relevantThemes(tags,[indian]).map(t=>t.name),['Punjabi cuisine']);
});

test('theme previews avoid near-identical labels while preserving different returned connections',async()=>{
 const {curatedThemes}=await import('../src/passport/taste-themes.ts');
 const tags=[['a','Indian Platter'],['b','India Platter'],['c','Indian Curries'],['d','Indian Curries and Accompaniments'],['e','Indian Breakfast']].map(([id,name])=>({id:`urn:tag:specialty_dish:place:${id}`,name}));
 assert.deepEqual(curatedThemes(tags).map(t=>t.name),['Indian Platter','Indian Curries','Indian Breakfast']);
});

test('attributed Taste Insights cap one seed to two themes from the same taxonomy family',async()=>{
 const {curatedThemes}=await import('../src/passport/taste-themes.ts');
 const tags=['Indian Platter','Indian Curries','Indian Breakfast','Punjabi Meals'].map((name,index)=>({id:`urn:tag:specialty_dish:place:source-${index}`,name,sourceInterestId:'cuisine',sourceInterestName:'Indian cuisine'}));
 assert.deepEqual(curatedThemes(tags,12).map(tag=>tag.name),['Indian Platter','Indian Curries']);
});

test('multi-interest themes are fetched and attributed independently with honest partial results',async()=>{
 const interests=[
   {id:'artist',name:'A.R. Rahman',types:['urn:entity:artist']},
   {id:'film',name:'Interstellar',types:['urn:entity:movie']},
   {id:'urn:tag:cuisine:qloo:indian',name:'Indian cuisine',types:['urn:tag']},
 ];
 const calls:string[]=[];
 const result=await themesPerInterest(interests,async interest=>{
   calls.push(interest.id);
   if(interest.id==='film')throw Error('synthetic unavailable');
   return interest.id==='artist'
     ? [{id:'urn:tag:genre:music:indian_classical',name:'Indian classical'}]
     : [{id:'urn:tag:cuisine:place:punjabi',name:'Punjabi cuisine'}];
 });
 assert.deepEqual(new Set(calls),new Set(['artist','film','urn:tag:cuisine:qloo:indian']));
 assert.deepEqual(result.tags.map(tag=>tag.sourceInterestId),['artist','urn:tag:cuisine:qloo:indian']);
 assert.deepEqual(result.tags.map(tag=>tag.sourceInterestName),['A.R. Rahman','Indian cuisine']);
 assert.deepEqual(result.unavailable,['Interstellar']);
 assert.deepEqual(result.noConnections,[]);
});
