/** Browser contracts with explicitly mocked account/intelligence APIs. Not live provider acceptance. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { normalizeSession } from '../src/agent/session.ts';
const base = process.env.PASSPORT_TEST_URL || 'http://127.0.0.1:3001';
const tabs = await (await fetch('http://127.0.0.1:9231/json')).json();
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.delete(id)) reject(Error('Browser command timed out')); }, 15000).unref();
  });
}
async function evaluate(expression) {
  const response = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (response.result?.exceptionDetails) throw Error('Browser evaluation failed');
  return response.result.result.value;
}
async function wait(expression) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return;
    await new Promise(r => setTimeout(r, 100));
  }
  throw Error(`Account UI state timed out: ${expression}`);
}
async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); }
async function textClick(text) { await wait(`[...document.querySelectorAll('button')].some(b=>!b.disabled && b.textContent.includes(${JSON.stringify(text)}))`); await evaluate(`[...document.querySelectorAll('button')].find(b=>!b.disabled && b.textContent.includes(${JSON.stringify(text)})).click()`); }
async function input(selector, value) {
  await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
}
const uuid = '11111111-1111-4111-8111-111111111111';
const cards = ['Coffee', 'Culture', 'Eat'].map((section, index) => ({ id: `fixture-${index}`, name: `Protocol ${section} stop`, section, types: ['urn:entity:place'], detail: 'UI protocol fixture', address: 'Fixture address', evidence: { source: 'Qloo', operation: '/v2/insights/', queryId: 'fixture-query', recordedAt: new Date().toISOString(), destination: 'Toronto', locality: 'physical-city', mode: 'familiar', pool: 'direct', inputs: [], params: {}, result: { id: `fixture-${index}`, type: 'urn:entity:place', tags: [] } } }));
const session = normalizeSession({ id: uuid, revision: 0, expires: Date.now()+1800000, city: 'Toronto', selected: [1,2,3].map(n=>({id:`taste-${n}`,name:`Protocol taste ${n}`,types:['urn:entity:artist'],detail:'Fixture'})), tags: [], constraints: [], categoryConstraints: {}, cards, previous: [], feedback: [], notices: [] });
const passport = { city: 'Toronto', selected: session.selected, cards, notices: [], explanation: 'UI protocol fixture', session, agent: { sessionId: uuid, revision: 0, tags: [], constraints: [] } };
let signedIn = false;
let plans = [];
let failure;
ws.addEventListener('message', async event => {
  const message = JSON.parse(event.data);
  if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); return; }
  if (message.method !== 'Fetch.requestPaused') return;
  const { requestId, request } = message.params;
  try {
    const path = new URL(request.url).pathname;
    const body = request.postData ? JSON.parse(request.postData) : {};
    let value;
    if (path === '/api/account') {
      if (request.method === 'GET') value = { configured: true, storage: true, user: signedIn ? { email: 'protocol@example.test' } : null };
      else if (body.action === 'register') value = { signedIn: false, confirmationRequired: true };
      else if (body.action === 'logout') { signedIn = false; value = { signedOut: true }; }
      else { signedIn = true; value = { signedIn: true, confirmationRequired: false }; }
    } else if (path === '/api/account/passports') {
      value = request.method === 'GET' ? { passports: [{ id: uuid, city: 'Toronto', updated_at: new Date().toISOString() }] } : { passport };
    } else if (path === '/api/account/plans') {
      if (request.method === 'POST') {
        assert.equal(body.sessionId, uuid);
        assert.equal(body.revision, 0);
        assert.deepEqual(body.ids, cards.map(c=>c.id));
        assert.equal(body.stops, undefined);
        plans = [{ id: uuid, city: 'Toronto', scheduled_date: body.date, time_zone: 'America/Toronto', stops: cards, created_at: new Date().toISOString() }];
        value = { saved: true, id: uuid };
      } else if (request.method === 'DELETE') { plans = []; value = { deleted: true }; }
      else value = { plans };
    } else if(path==='/api/agent/resolve') {
      value={token:'protocol-only-token',items:body.seeds.map((query,i)=>({query,candidates:[{id:`partner-${i}`,name:`Protocol partner ${i}`,types:['urn:entity:artist'],detail:'UI protocol fixture'}]}))};
    } else if(path==='/api/agent/intelligence') {
      assert.equal(body.action,'together');assert.deepEqual(body.ids,['partner-0','partner-1','partner-2']);assert.equal(body.token,'protocol-only-token');
      value={comparison:{shared:[{id:'urn:tag:genre:protocol',name:'Protocol common ground'}],aOnly:[],bOnly:[],recordedAt:new Date().toISOString()},cards,notice:'Protocol shared taste suggestions'};
    } else value = { deleted: true };
    await call('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Cache-Control', value: 'no-store' }], body: Buffer.from(JSON.stringify(value)).toString('base64') });
  } catch (error) { failure = error; await call('Fetch.failRequest', { requestId, errorReason: 'Failed' }); }
});
await call('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/account*' }, { urlPattern: '*://*/api/agent/session' },{urlPattern:'*://*/api/agent/resolve'},{urlPattern:'*://*/api/agent/intelligence'}] });
await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await call('Page.navigate', { url: base + '/?ui-contract=1' });
await wait("location.search.includes('ui-contract=1') && document.readyState==='complete' && Boolean(document.querySelector('.account-launch'))");
await new Promise(r => setTimeout(r, 600));
await click('.account-launch');
await wait("Boolean(document.querySelector('.account-dialog[open] input[type=email]'))");
assert.equal(await evaluate("document.documentElement.style.overflow==='hidden' && document.body.style.overflow==='hidden'"), true, 'Account modal locks background scroll');
await textClick('Create account');
await input('.account-dialog input[type=email]', 'protocol@example.test');
await input('.account-dialog input[type=password]', 'Protocol-only-1234');
await evaluate("document.querySelector('.account-dialog form').requestSubmit()");
await wait("Boolean(document.querySelector('.verification-screen'))");
assert.equal(await evaluate("document.querySelector('.account-dialog input[type=password]')===null"), true);
assert.ok(await evaluate("document.querySelector('#account-title').textContent.includes('Verify your email')"));
let screenshot = await call('Page.captureScreenshot', { format: 'png' });
await fs.writeFile('/tmp/tastepassport-verify-email.png', Buffer.from(screenshot.result.data, 'base64'));
await textClick('I’ve verified');
await wait("Boolean(document.querySelector('.account-dialog input[type=password]'))");
await input('.account-dialog input[type=password]', 'Protocol-only-1234');
await evaluate("document.querySelector('.account-dialog form').requestSubmit()");
await wait("Boolean(document.querySelector('.signout-button')) && !document.querySelector('.account-dialog[open]')");
assert.equal(await evaluate("document.documentElement.style.overflow!=='hidden' && document.body.style.overflow!=='hidden'"), true, 'Closing account restores page scrolling');
assert.ok(await evaluate("document.querySelector('[aria-label=\"My Saved Passports\"]')!==null && document.querySelector('.upcoming-launch')!==null"));
await click('.account-launch');
await wait("Boolean(document.querySelector('.saved-passport-list article'))");
await textClick('Open');
await wait("Boolean(document.querySelector('.passport-cover')) && !document.querySelector('.account-dialog[open]')");
await wait("document.querySelector('.plan-save-actions .primary-button').textContent.includes('Save to')");
for (const width of [320, 390, 640, 768, 1024, 1440]) {
  await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width<768 });
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false, `Signed-in layout overflow at ${width}`);
  assert.ok(await evaluate("(()=>{const h=document.querySelector('.workspace-topbar').getBoundingClientRect(), n=document.querySelector('.header-controls').getBoundingClientRect(), b=document.querySelector('.brand').getBoundingClientRect();return n.right<=h.right+1 && (b.right<=n.left+1 || b.bottom<=n.top+1)})()"), `Signed-in nav overlap at ${width}`);
}
await evaluate("document.querySelector('.day-out-reveal').open=true");
await evaluate("document.querySelector('.taste-intelligence').open=true;document.querySelector('.together-reveal').open=true");
for(let i=0;i<3;i++)await input(`.partner-interests label:nth-child(${i+1}) input`,`Protocol interest ${i}`);
await textClick('Find their interests');
await wait("document.querySelectorAll('.partner-matches fieldset').length===3");
await evaluate("document.querySelectorAll('.partner-matches input[type=radio]').forEach(input=>input.click())");
assert.equal(await evaluate("document.querySelectorAll('.partner-matches input:checked').length"),3,'Partner matches have independent radio groups');
await textClick('Find something for both of us');
await wait("Boolean(document.querySelector('.common-tags'))");
assert.ok(await evaluate("document.querySelector('.common-tags').textContent.includes('Protocol common ground')"));
await evaluate("document.querySelector('.advanced-taste-filters').open=true");
for(const width of [320,390,768,1440]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false,`Intelligence UI overflow at ${width}`);
}
await evaluate("window.scrollTo({top:document.querySelector('.taste-intelligence').getBoundingClientRect().top+scrollY-120,behavior:'instant'})");
let intelligenceShot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile('/tmp/tastepassport-intelligence.png',Buffer.from(intelligenceShot.result.data,'base64'));
await wait("document.querySelector('.plan-save-actions .primary-button').textContent.includes('Save to')");
await input('#plan-date', '2099-10-18');
await click('.plan-save-actions .primary-button');
await wait("Boolean(document.querySelector('.toast-notice')) && document.querySelector('.day-out-plan').textContent.includes('Saved!')");
await click('.upcoming-launch');
await wait("Boolean(document.querySelector('.saved-plan'))");
assert.ok(await evaluate("document.querySelector('.upcoming-plans').textContent.includes('Protocol Coffee stop')"));
await evaluate("window.__calendarBlob=null;window.__realObjectURL=URL.createObjectURL;URL.createObjectURL=b=>{window.__calendarBlob=b;return window.__realObjectURL(b)}");
await textClick('Add to calendar');
assert.match(await evaluate('window.__calendarBlob.text()'), /DTSTART;VALUE=DATE:20991018/);
await evaluate('URL.createObjectURL=window.__realObjectURL');
for (const width of [320, 390, 768, 1440]) {
  await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width<768 });
  assert.ok(await evaluate("(()=>{const r=document.querySelector('.account-dialog').getBoundingClientRect();return r.left>=15 && r.right<=innerWidth-15 && r.top>=15 && r.bottom<=innerHeight-15 && document.querySelector('.account-dialog').scrollWidth<=document.querySelector('.account-dialog').clientWidth})()"), `Plan library containment at ${width}`);
}
screenshot = await call('Page.captureScreenshot', { format: 'png' });
await fs.writeFile('/tmp/tastepassport-upcoming-plans.png', Buffer.from(screenshot.result.data, 'base64'));
await click('[aria-label="Close account"]');
await click('.signout-button');
await wait("!document.querySelector('.signout-button') && !document.querySelector('.upcoming-launch') && !document.querySelector('.passport-cover')");
await call('Fetch.disable');
ws.close();
if (failure) throw failure;
console.log('UI contract PASS (mocked APIs): verification, signed-in nav, saved Passports, Together confirmation with independent radios and shared results, advanced controls, dated plans/calendar, mobile containment and sign-out. Live providers remain separate acceptance.');
