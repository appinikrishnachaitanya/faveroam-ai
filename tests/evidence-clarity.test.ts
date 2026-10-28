import test from 'node:test';
import assert from 'node:assert/strict';
import {chatBroadening,chatReason,chatShortlist,chatTasteEvidence} from '../src/agent/chat-shortlist.ts';
import {hangoutExplanation,sharedHangout} from '../src/passport/common-ground.ts';
import type {AgentState} from '../src/agent/types.ts';
import type {Card} from '../src/passport/model.ts';
import type {TasteComparison} from '../src/qloo/compare.ts';
import {evidenceFacts,recommendationSummary,screenTasteConnection} from '../src/qloo/explanation.ts';

const input=(id:string,name:string,role:'entity-signal'|'tag-signal'|'tag-filter'='entity-signal')=>({id,name,types:[],role});
const card=(id:string,over:Record<string,unknown>={}):Card=>({id,name:id,section:'Eat',
  evidence:{result:{id,tags:[]},inputs:[],locality:'physical-city',pool:'direct',...((over.evidence as object)??{})},
  intelligence:over.intelligence}) as unknown as Card;

test('an entity the app resolved from refinement wording is never shown as a confirmed taste',()=>{
  const confirmed=['rahman','interstellar'];
  const c=card('place',{evidence:{inputs:[input('rahman','A.R. Rahman'),input('interstellar','Interstellar'),input('krishna','Krishna pure vegetarian')]},
    intelligence:{taste:{contributingSignals:[{id:'krishna',contribution:.9}]}}});
  const result=chatTasteEvidence(c,confirmed);
  assert.deepEqual(result.names,['A.R. Rahman','Interstellar']);
  assert.equal(result.associated,false,'a request-derived contribution must not become a confirmed-taste association');
  assert.deepEqual(result.requestNames,['Krishna pure vegetarian']);
  assert.match(chatReason(c,confirmed),/additional search signal Krishna pure vegetarian/);
  assert.doesNotMatch(chatReason(c,confirmed),/connects this listing with Krishna pure vegetarian/);
  assert.match(evidenceFacts(c,confirmed).join(' '),/additional search input Krishna pure vegetarian; this is not one of your confirmed tastes/);
});
test('card summary calls an ad hoc tag a search rather than a confirmed preference',()=>{
 const tag={id:'urn:tag:cuisine:place:chinese',name:'Chinese'};
 const c=card('place',{evidence:{inputs:[input(tag.id,tag.name,'tag-signal')],result:{id:'place',tags:[tag]}}});
 assert.equal(recommendationSummary(c,['rahman']),'Matches a search for Chinese.');
 assert.equal(recommendationSummary(c,[tag.id]),'Matches your interest in Chinese.');
});
test('media explanation never attributes an unconfirmed resolved entity to the saved Passport',()=>{
 const c={...card('artist',{evidence:{inputs:[input('krishna','Krishna pure vegetarian')],result:{id:'artist',tags:[]}},intelligence:{taste:{contributingSignals:[{id:'krishna',contribution:.8}]}}}),section:'Music'} as Card;
 assert.doesNotMatch(screenTasteConnection(c,['rahman'])??'',/Krishna pure vegetarian/);
 assert.match(screenTasteConnection(c,['rahman'])??'',/no individual audience connection to a confirmed taste/);
});
test('only a confirmed taste can support an audience association',()=>{
  const c=card('place',{evidence:{inputs:[input('rahman','A.R. Rahman'),input('krishna','Krishna pure vegetarian')]},
    intelligence:{taste:{contributingSignals:[{id:'krishna',contribution:.9},{id:'rahman',contribution:.4}]}}});
  const result=chatTasteEvidence(c,['rahman']);
  assert.deepEqual(result.names,['A.R. Rahman']);assert.equal(result.associated,true);
});
test('with no confirmed overlap nothing is described as the person’s own taste',()=>{
  const c=card('place',{evidence:{inputs:[input('krishna','Krishna pure vegetarian')]}});
  assert.deepEqual(chatTasteEvidence(c,['rahman']),{names:[],associated:false,requestNames:['Krishna pure vegetarian']});
});

test('broader and unverified cards are labelled the same way in chat as in the Passport',()=>{
  const broader=card('b',{evidence:{strategyNote:'Broader local suggestion. Your venue requirements were kept; taste similarity was broadened.'}});
  const dish=card('d',{evidence:{strategyNote:'Dish match not verified: Qloo found a broader taste match, but this listing did not return evidence that the venue serves the requested dish. Check its current menu.'}});
  const adjacent=card('a',{evidence:{pool:'adjacent'}});
  const direct=card('x');
  assert.equal(chatBroadening(broader)?.label,'Broader local suggestion');
  assert.equal(chatBroadening(dish)?.label,'Dish not verified');
  assert.equal(chatBroadening(adjacent)?.label,'Broader discovery');
  assert.equal(chatBroadening(direct),undefined);
  assert.match(chatReason(broader),/^Broader local suggestion/);
  assert.match(chatReason(dish),/^Dish match not verified/);
  assert.doesNotMatch(chatReason(direct),/Broader/);
});
test('direct matches are offered before broader fallbacks in the same category',()=>{
  const broader=card('broader',{evidence:{strategyNote:'Broader local suggestion. Your venue requirements were kept; taste similarity was broadened.'}});
  const state={cards:[broader,card('direct')],activeCategories:['Eat'],hiddenCategories:[]} as unknown as AgentState;
  assert.deepEqual(chatShortlist(state,['Eat']).map(c=>c.id),['direct','broader']);
});

const comparison={shared:[{id:'tag:spiritual',name:'Spiritual'}],aOnly:[],bOnly:[]} as unknown as TasteComparison;
const you=[{id:'rahman',name:'A.R. Rahman'}],partner=[{id:'ghibli',name:'Studio Ghibli'}];
const signals=(...ids:string[])=>({taste:{contributingSignals:ids.map(id=>({id,contribution:.5}))}});
test('the shared hangout prefers venue-specific evidence over list order',()=>{
  const first=card('first');
  const oneSided=card('one',{intelligence:signals('rahman')});
  const both=card('both',{intelligence:signals('rahman','ghibli')});
  const themed=card('themed',{evidence:{result:{id:'themed',tags:[{id:'tag:spiritual',name:'Spiritual'}]}}});
  assert.equal(sharedHangout([first,oneSided,both,themed],comparison,you,partner)?.card.id,'themed');
  assert.equal(sharedHangout([first,oneSided,both],comparison,you,partner)?.basis,'both-profiles');
  assert.equal(sharedHangout([first,oneSided],comparison,you,partner)?.basis,'one-profile');
  const fallback=sharedHangout([first],comparison,you,partner)!;
  assert.equal(fallback.basis,'search-only');
  assert.match(hangoutExplanation(fallback),/starting point rather than a proven match/);
});
test('a venue with a shared theme and signals for both people ranks above a theme alone',()=>{
  const themeOnly=card('themeOnly',{evidence:{result:{id:'themeOnly',tags:[{id:'tag:spiritual',name:'Spiritual'}]}}});
  const best=card('best',{evidence:{result:{id:'best',tags:[{id:'tag:spiritual',name:'Spiritual'}]}},intelligence:signals('rahman','ghibli')});
  const pick=sharedHangout([themeOnly,best],comparison,you,partner)!;
  assert.equal(pick.card.id,'best');
  assert.match(hangoutExplanation(pick),/Spiritual.*both of you/);
});
test('generic comparison adjectives do not claim a venue-specific shared taste',()=>{
  const generic={shared:[{id:'tag:dynamic',name:'Dynamic'}],aOnly:[],bOnly:[]} as unknown as TasteComparison;
  const vague=card('vague',{evidence:{result:{id:'vague',tags:[{id:'tag:dynamic',name:'Dynamic'}]}}});
  const specific=card('audience',{intelligence:signals('rahman','ghibli')});
  const chosen=sharedHangout([vague,specific],generic,you,partner)!;
  assert.equal(chosen.card.id,'audience');
  assert.equal(chosen.basis,'both-profiles');
  assert.doesNotMatch(hangoutExplanation(chosen),/Dynamic/);
});

import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ChatRecommendations from '../app/components/chat-recommendations.tsx';
test('the chat choice card keeps confirmed tastes and request-derived inputs apart',()=>{
  const c=card('Annapurna Bhavan',{evidence:{inputs:[input('rahman','A.R. Rahman'),input('krishna','Krishna pure vegetarian','tag-signal')],
    strategyNote:'Broader local suggestion. Your venue requirements were kept; taste similarity was broadened.'}});
  const html=renderToStaticMarkup(createElement(ChatRecommendations,{cards:[c],confirmedIds:['rahman'],city:'London',busy:false,savedIds:[],onAsk:()=>{},onSave:()=>{}}));
  assert.match(html,/Your confirmed tastes<\/small><strong>A\.R\. Rahman<\/strong>/);
  assert.match(html,/Additional search signal, not a confirmed taste: Krishna pure vegetarian/);
  assert.doesNotMatch(html,/Your confirmed tastes<\/small><strong>[^<]*Krishna/);
  assert.match(html,/chat-broader-badge[^>]*>Broader local suggestion/);
});
