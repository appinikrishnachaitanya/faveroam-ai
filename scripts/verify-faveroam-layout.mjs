/** Isolated landing acceptance only; no external records or provider calls. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const tabs=await(await fetch((process.env.PASSPORT_CDP_URL??'http://127.0.0.1:9231')+'/json')).json();
const ws=new WebSocket(tabs.find(tab=>tab.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let id=0;const pending=new Map();
ws.addEventListener('message',event=>{const value=JSON.parse(event.data);if(value.id){pending.get(value.id)?.(value);pending.delete(value.id);}});
const call=(method,params={})=>new Promise(resolve=>{const n=++id;pending.set(n,resolve);ws.send(JSON.stringify({id:n,method,params}));});
const evaluate=async expression=>{const response=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.result?.exceptionDetails)throw Error('Browser assertion evaluation failed');return response.result?.result?.value;};
await call('Page.enable');
const loaded=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Page load timed out')),30000);const listener=event=>{if(JSON.parse(event.data).method==='Page.loadEventFired'){clearTimeout(timer);ws.removeEventListener('message',listener);resolve();}};ws.addEventListener('message',listener);});
await call('Page.navigate',{url:process.env.PASSPORT_TEST_URL??'http://127.0.0.1:3001'});await loaded;
for(let n=0;n<60;n++){if(await evaluate('Boolean(document.querySelector(".move-onboarding"))'))break;await new Promise(resolve=>setTimeout(resolve,500));}
assert.ok(await evaluate('Boolean(document.querySelector(".move-onboarding"))'));
await evaluate('document.fonts.ready.then(()=>true)');
for(let n=0;n<100;n++){
 if(await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Choose my city'));const key=button&&Object.keys(button).find(key=>key.startsWith('__reactProps'));return key&&typeof button[key].onClick==='function'&&!button.disabled;})()`))break;
 await new Promise(resolve=>setTimeout(resolve,100));
}

for(const width of [375,768,1440]){
 await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===375});
 await new Promise(resolve=>setTimeout(resolve,250));
 assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),`Horizontal overflow at ${width}`);
 assert.ok(await evaluate('document.querySelector(".brand").textContent.includes("FaveRoam")'));
 await evaluate('window.scrollTo({top:0,behavior:"instant"})');
 const shot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(`${process.env.PASSPORT_TEST_ARTIFACTS??'/tmp'}/faveroam-${width}.png`,Buffer.from(shot.result.data,'base64'));
}
await evaluate('[...document.querySelectorAll("button")].find(button=>button.textContent.includes("Choose my city")).click()');
await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
assert.ok(await evaluate('document.activeElement.id==="destination"'),'City CTA focuses the destination');
assert.ok(await evaluate('document.querySelector(".landing-city-hero [role=status]")?.textContent.includes("Choose your destination")'),'City CTA explains the next step');
await evaluate(`(()=>{const select=document.querySelector('#destination');const value=[...select.options].find(option=>option.value)?.value;select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));return value;})()`);
await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
assert.ok(await evaluate('[...document.querySelectorAll("button")].some(button=>button.textContent.includes("Add my interests"))'),'City selection advances the CTA');
await evaluate('[...document.querySelectorAll("button")].find(button=>button.textContent.includes("Add my interests")).click()');
await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
assert.ok(await evaluate('document.activeElement.id==="taste-input"'),'Next step focuses the taste input');
ws.close();console.log('Browser PASS: 375/768/1440 landing overflow, branding, city CTA and local fonts. No discovery/auth/provider acceptance claimed.');
