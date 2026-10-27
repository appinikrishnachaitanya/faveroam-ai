import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ChatReply from '../app/components/chat-reply.tsx';
import {chatTasteEvidence} from '../src/agent/chat-shortlist.ts';
import type {Card} from '../src/passport/model.ts';
test('assistant detail lines render as readable lists and HTML is escaped',()=>{
 const html=renderToStaticMarkup(createElement(ChatReply,{text:'Here is the connection.\n• **Taste:** Interstellar\n• **Live events:** Unverified\n\n<script>alert(1)</script>'}));
 assert.match(html,/<ul>/);assert.match(html,/<strong>Taste:<\/strong>/);assert.match(html,/<li>/);
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
});
test('individual audience path requires a real positive contribution, not merely a search input',()=>{
 const card={evidence:{inputs:[{id:'film',name:'Fixture film',role:'entity-signal'}]}} as Card;
 assert.deepEqual(chatTasteEvidence(card,['film']),{names:['Fixture film'],associated:false,requestNames:[]});
 card.intelligence={taste:{contributingSignals:[{id:'film',contribution:.6},{id:'unknown',contribution:1}]}} as Card['intelligence'];
 assert.deepEqual(chatTasteEvidence(card,['film']),{names:['Fixture film'],associated:true,requestNames:[]});
 card.intelligence={taste:{contributingSignals:[{id:'film',contribution:-.5}]}} as Card['intelligence'];
 assert.equal(chatTasteEvidence(card,['film']).associated,false);
});
