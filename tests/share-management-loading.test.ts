import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ShareManagement from '../app/components/share-management.tsx';

test('signed-in share management starts with loading feedback, not false zero counts',()=>{
 const html=renderToStaticMarkup(createElement(ShareManagement,{signedIn:true,city:'London'}));
 assert.match(html,/aria-busy="true"/);
 assert.equal((html.match(/<strong>—<\/strong>/g)??[]).length,3);
 assert.match(html,/Loading your links/);
});
