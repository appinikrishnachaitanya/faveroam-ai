import test from 'node:test';
import assert from 'node:assert/strict';
import {firstWeekIcs,type WeekDay} from '../src/passport/first-week.ts';
import type {Card} from '../src/passport/model.ts';
const card={id:'cinema-1',name:'Cinéma, '+ '🎬'.repeat(60)+'; main\rInjected',section:'Culture',types:['urn:entity:place'],detail:'',address:'A; B, C\nD'} as Card;
test('First Week ICS folds UTF-8 lines, escapes CR/newlines and preserves local dates, times and activity',()=>{
 const days:WeekDay[]=[{date:'2026-10-26',title:'Film',stops:[{activity:'Cinema',time:'23:30',card}]}];
 const result=firstWeekIcs(days,'Europe/London');
 for(const line of result.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);
 const unfolded=result.replace(/\r\n /g,'');assert.match(unfolded,/DTSTART;TZID=Europe\/London:20261026T233000/);assert.match(unfolded,/DTEND;TZID=Europe\/London:20261027T003000/);assert.match(unfolded,/DESCRIPTION:Cinema/);assert.ok(unfolded.includes('\\nInjected'));assert.ok(unfolded.includes('A\\; B\\, C\\nD'));
 assert.throws(()=>firstWeekIcs(days,'Invalid/Timezone'));assert.throws(()=>firstWeekIcs([{...days[0],date:'2026-02-30'}],'Europe/London'));
});
