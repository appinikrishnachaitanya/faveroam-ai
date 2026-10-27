import test from 'node:test';
import assert from 'node:assert/strict';
import {tasteCardSvg} from '../src/share/card-image.ts';

test('portable taste card uses confirmed/returned words and escapes untrusted labels',()=>{
 const svg=tasteCardSvg('London <script>',['Indian & contemporary'],['Interstellar']);
 assert.match(svg,/Indian &amp; contemporary/);
 assert.match(svg,/London &lt;script&gt;/);
 assert.doesNotMatch(svg,/<script>|Interstellar/);
 const fallback=tasteCardSvg('Toronto',[],['Interstellar']);
 assert.match(fallback,/Interstellar/);
 assert.match(fallback,/width="1200" height="630"/);
 const named=tasteCardSvg('London',[],['Interstellar'],'Krishna <script>');
 assert.match(named,/Krishna &lt;script&gt;&apos;s FaveRoam/);
 assert.doesNotMatch(named,/<script>/);
});
