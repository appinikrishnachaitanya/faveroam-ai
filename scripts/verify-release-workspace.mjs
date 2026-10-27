/** Isolated browser fixtures, NOT live integration acceptance.
 * Requires a built local app and a disposable Chromium CDP profile.
 * No account, Qloo or Gemini records are created or requested. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import UpcomingPlans from '../app/components/plans.tsx';
import {firstWeek} from '../src/passport/first-week.ts';
const base=process.env.PASSPORT_TEST_URL??'http://127.0.0.1:3001';
const tabs=await(await fetch((process.env.PASSPORT_CDP_URL??'http://127.0.0.1:9231')+'/json')).json();
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map();
ws.addEventListener('message',event=>{const value=JSON.parse(event.data);if(value.id){const job=pending.get(value.id);if(job){clearTimeout(job.timer);pending.delete(value.id);value.error?job.reject(Error(value.error.message)):job.resolve(value);}}});
const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject,timer:setTimeout(()=>{pending.delete(n);reject(Error(`CDP timeout: ${method}`));},20000)});ws.send(JSON.stringify({id:n,method,params}));});
const ev=async expression=>{const value=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(value.result?.exceptionDetails)throw Error(value.result.exceptionDetails.exception?.description??'Browser evaluation failed');return value.result?.result?.value;};
const wait=async expression=>{for(let i=0;i<150;i++){if(await ev(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error(`Browser condition timed out: ${expression}`);};
const frame=()=>ev('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
const seed={id:'fixture-film',name:'Fixture film',types:['urn:entity:movie'],detail:'Fixture only'};
const cards=Array.from({length:60},(_,i)=>{
 const section=['Eat','Coffee','Culture'][i%3],type='urn:entity:place';
 const latitude=51.5+Math.floor(i/20)*.08+(i%20)*.0001,longitude=-.12+(i%4)*.0001;
 return {id:`fixture-${String(i).padStart(2,'0')}`,name:`Fixture place ${i}`,detail:'Fixture only',section,types:[type],address:`Fixture address ${i}`,evidence:{source:'Qloo',operation:'/v2/insights/',queryId:'fixture',recordedAt:'2026-10-26T00:00:00Z',destination:'London',locality:'physical-city',mode:'familiar',pool:'direct',params:{},inputs:[{...seed,role:'entity-signal'}],result:{id:`fixture-${String(i).padStart(2,'0')}`,type,tags:[{id:`urn:tag:genre:place:${section==='Coffee'?'coffee_shop':section==='Eat'?'restaurant':'museum'}`,type:'urn:tag:genre:place',name:section==='Coffee'?'Coffee shop':section==='Eat'?'Restaurant':'Museum'}]}},intelligence:{id:`fixture-${String(i).padStart(2,'0')}`,name:`Fixture place ${i}`,type,taste:{contributingSignals:[]},quality:{},commercial:{},externalProof:{},location:{latitude,longitude}}};
});
const session={id:'11111111-1111-4111-8111-111111111111',revision:0,expires:Date.now()+3600000,city:'London',selected:[seed],tags:[],constraints:[],categoryConstraints:{},cards,previous:[],feedback:[],notices:[],activeCategories:['Eat','Coffee','Culture'],hiddenCategories:[],preferences:{},explorationMode:'aligned',discoveryMode:'familiar',categoryConcepts:{},categoryModes:{},categoryTags:{},history:[],providerHealth:'unconfigured',recovery:[],relaxed:[],savedCards:[]};
const passport={city:'London',selected:[seed],cards,notices:[],explanation:'Fixture only',session,agent:{sessionId:session.id,revision:0,tags:[],constraints:[]}};
const partnerSeed={id:'fixture-artist',name:'Fixture artist',types:['urn:entity:artist'],detail:'Fixture only'};
const togetherFixture={comparison:{shared:[{id:'urn:tag:genre:music:jazz',name:'Jazz',score:1},{id:'urn:tag:mood:dynamic',name:'Dynamic',score:1}],aOnly:[],bOnly:[],recordedAt:'2026-10-26T00:00:00Z'},partner:[partnerSeed.name],partnerSignals:[partnerSeed],cards:cards.slice(40),exchange:[{person:'you',cards:cards.slice(0,20),card:cards[0]},{person:'them',cards:cards.slice(20,40),card:cards[20]}],notice:'Synthetic fixture only'};
const snapshot={version:1,savedAt:Date.now(),expiresAt:Date.now()+7100000,passport};
try{
 await call('Page.enable');
 await fs.mkdir('/tmp/faveroam-browser-downloads',{recursive:true});
 await fs.rm('/tmp/faveroam-browser-downloads/my-faveroam-card.png',{force:true});
 await call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:'/tmp/faveroam-browser-downloads'});
 await call('Network.enable');
 await call('Network.setBlockedURLs',{urls:['*basemaps.cartocdn.com/*']});
 await call('Page.addScriptToEvaluateOnNewDocument',{source:`sessionStorage.setItem('tastepassport:assistant-welcomed:11111111-1111-4111-8111-111111111111','1');sessionStorage.setItem('tastepassport.guest.recovery.v1',JSON.stringify(${JSON.stringify(snapshot)}));const fixture=${JSON.stringify(passport)};const togetherFixture=${JSON.stringify(togetherFixture)};const partnerSeed=${JSON.stringify(partnerSeed)};const actualFetch=window.fetch;window.fetch=(url,options)=>String(url).startsWith('/api/')?Promise.resolve(new Response(JSON.stringify(String(url).includes('/agent/resolve')?{items:[{query:partnerSeed.name,candidates:[partnerSeed]}],token:'fixture-token'}:String(url).includes('/agent/intelligence')?togetherFixture:String(url).includes('/agent/session')?{passport:fixture}:String(url).includes('/destinations')?{destinations:['London']}:{configured:false,user:null,health:'unconfigured'}),{status:200,headers:{'Content-Type':'application/json'}})):actualFetch(url,options);`});
 await call('Page.navigate',{url:base});await wait('Boolean(document.querySelector(".passport-navigation"))');
 await ev('window.fixtureMapCanvas=document.querySelector(".passport-map-canvas");true');
 await call('Emulation.setCPUThrottlingRate',{rate:4});
 const timings=[];
 for(const width of [375,390,768,1440]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});await frame();
  await ev('window.scrollTo({top:0,behavior:"instant"})');await frame();const coverShot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(`/tmp/faveroam-cover-${width}.png`,Buffer.from(coverShot.result.data,'base64'));
  for(const label of ['Preferences','Common Ground','Taste insights','First Week','Discover','My places','Discover']){
   const ms=await ev(`(async()=>{const menu=document.querySelector('.passport-menu-toggle');if(getComputedStyle(menu).display!=='none'&&menu.getAttribute('aria-expanded')==='false'){menu.click();await new Promise(r=>requestAnimationFrame(r));}const button=[...document.querySelectorAll('.passport-navigation button')].find(b=>b.textContent.includes(${JSON.stringify(label)}));const start=performance.now();button.click();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return Math.round(performance.now()-start);})()`);
   timings.push({width,label,ms});
   assert.ok(await ev(`![...document.querySelectorAll('.workspace-panel:not([hidden]) .intelligence-intro, .workspace-panel:not([hidden]) .analysis-intro, .workspace-panel:not([hidden]) .outing-intro')].some(node=>node.getAnimations().some(animation=>animation.playState==='running'))`),`Workspace introduction must not delay navigation: ${label}`);
   if(label==='Preferences'||label==='Common Ground'){
    await ev(`(()=>{const picker=document.querySelector('#view-preferences .category-multi-select');picker.querySelector('summary').scrollIntoView({block:'center',behavior:'instant'});picker.open=true;})()`);await frame();
    assert.ok(await ev(`(()=>{const r=document.querySelector('#view-preferences .category-multi-select fieldset').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.width>0;})()`),`Category menu overflow: ${width}`);
    await ev("document.querySelector('#view-preferences .category-multi-select').open=false");
   }

   if(label==='First Week'){await ev(`document.querySelector('#view-plan .first-week-controls .primary-button').click()`);await frame();assert.ok(await ev('Boolean(document.querySelector(".week-save-summary"))'));}
   if(label==='Common Ground'){
    if(!await ev('Boolean(document.querySelector(".together-results"))')){
     await ev(`(()=>{const input=document.querySelector('.partner-interests input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Fixture artist');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);await frame();
     await ev("document.querySelector('.together-reveal form button[type=submit]').click()");await wait('Boolean(document.querySelector(".partner-matches"))');
     await ev("document.querySelector('.partner-matches>.primary-button').click()");await wait('Boolean(document.querySelector(".common-ground-evidence"))');
    }
    assert.equal(await ev('document.querySelector(".common-ground-setup").open'),false,'Completed setup should collapse without removing its inputs');
    assert.ok(await ev('document.querySelectorAll(".partner-interests input").length>0'));
    assert.ok(await ev('document.querySelectorAll(".together-category article").length>0'));
    await ev("document.querySelector('.common-ground-week').open=false;document.querySelector('.together-results').scrollIntoView({block:'start',behavior:'instant'})");await frame();
    const simpleShot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(`/tmp/faveroam-common-ground-simple-${width}.png`,Buffer.from(simpleShot.result.data,'base64'));
    await ev("document.querySelector('.common-ground-week').open=true;document.querySelector('.together-results .first-week-controls .primary-button').click()");await frame();
    assert.ok(await ev('Number(document.querySelector(".together-results .week-save-summary p").textContent.match(/\\d+/)[0])>=10'),'Shared week must use retained fixture pools');
    // Exercise the browser's native time control and retain it across day changes.
    await ev(`(()=>{const input=document.querySelector('.together-results .week-stops input[type=time]');input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'13:15');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.blur();})()`);await frame();
    assert.equal(await ev(`document.querySelector('.together-results .week-stops input[type=time]').value`),'13:15');
    await ev(`document.querySelectorAll('.together-results .week-days button')[6].click()`);await frame();
    await wait(`Boolean(document.querySelector('.together-results .schematic-map button'))`);
    assert.ok(await ev(`(()=>{const names=[...document.querySelectorAll('.together-results .week-stops select')].map(select=>select.selectedOptions[0]?.textContent.split(' · ')[0]);return [...document.querySelectorAll('.together-results .schematic-map button')].every(pin=>names.includes(pin.title));})()`),'Day 7 schematic pins must describe Day 7 choices');
    await ev(`document.querySelectorAll('.together-results .week-days button')[0].click()`);await frame();
    assert.equal(await ev(`document.querySelector('.together-results .week-stops input[type=time]').value`),'13:15','Time edit must survive a day switch');
    assert.ok(await ev('document.querySelector(".common-ground-evidence").textContent.includes("Fixture artist")'));
    assert.ok(await ev('!document.querySelector(".common-ground-evidence").textContent.includes("relative score")'));
    await ev("document.querySelector('.together-results').scrollIntoView({block:'start',behavior:'instant'})");await frame();
   }
   if(label==='Discover')assert.ok(await ev('document.querySelector(".discovery-welcome").getBoundingClientRect().height<500'),'Welcome layout must not retain a 430px flex column basis');
   if(label==='Discover'){assert.equal(await ev('document.querySelector(".vibe-tuning-disclosure")?.open??false'),false);assert.equal(await ev('document.querySelector(".familiarity-disclosure")?.open??false'),false);assert.ok(await ev('window.fixtureMapCanvas===document.querySelector(".passport-map-canvas")'),'Discover map must survive My places toggles');}
   if(label==='Discover')assert.equal(await ev('document.querySelectorAll(".share-options>div:first-child .share-actions button").length'),2);
   const screenshot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(`/tmp/faveroam-release-${width}-${label.replaceAll(' ','-')}.png`,Buffer.from(screenshot.result.data,'base64'));
   assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth+1'),`Overflow: ${label} ${width}`);
  }
 }
 await ev('[...document.querySelectorAll(".share-options button")].find(b=>b.textContent==="Download PNG").click()');
 let png;for(let i=0;i<100;i++){try{png=await fs.readFile('/tmp/faveroam-browser-downloads/my-faveroam-card.png');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 assert.ok(png&&png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Download must be a PNG file');
 await wait('Boolean(document.querySelector(".schematic-map button"))');
 await ev('document.querySelector(".schematic-map button").click()');await frame();
 assert.ok(await ev('Boolean(document.querySelector(".map-place-detail"))'));assert.equal(await ev('document.querySelector(".map-toggle").getAttribute("aria-expanded")'),'true');
 await ev('document.querySelector(".cluster-option").click()');await frame();
 assert.equal(await ev('document.querySelector(".cluster-option[aria-pressed=true]")!==null'),true);
 assert.ok(await ev('(()=>{const ids=[...document.querySelectorAll(".passport-sections [data-entity-id]")].map(el=>Math.floor(Number(el.dataset.entityId.split("-")[1])/20));return ids.length>0&&new Set(ids).size===1;})()'));
 await ev('[...document.querySelectorAll(".cluster-options button")].find(b=>b.textContent==="All discoveries").click()');await frame();
 for(let i=0;i<3;i++){
  await ev('document.querySelector(".assistant-launch").click()');await frame();assert.ok(await ev('document.querySelector("#taste-concierge").open'));
  assert.ok(await ev('(window.fixtureComposer??=document.querySelector("#conversation-input"))===document.querySelector("#conversation-input")'));
  await ev('document.querySelector(".assistant-close").click()');await frame();assert.equal(await ev('document.querySelector("#taste-concierge").open'),false);
 }
 // A controlled pending request proves Send becomes an enabled Stop action.
 await ev(`window.preStopCards=[...document.querySelectorAll('.passport-sections [data-entity-id]')].map(node=>node.dataset.entityId).join('|');window.preStopFetch=window.fetch;window.fetch=(url,options)=>String(url)==='/api/agent/turn'?new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Stopped','AbortError')),{once:true})):window.preStopFetch(url,options);document.querySelector('.assistant-launch').click()`);await frame();
 await ev(`(()=>{const input=document.querySelector('#conversation-input');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'Find quieter places');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);await frame();
 await ev(`document.querySelector('.composer button[aria-label="Send message"]').click()`);
 await wait(`Boolean(document.querySelector('.composer button[aria-label="Stop response"]:not(:disabled)'))`);
 assert.ok(await ev(`![...document.querySelectorAll('#taste-concierge button')].some(button=>button.textContent.includes('Cancel refinement'))`));
 await ev(`document.querySelector('.composer button[aria-label="Stop response"]').click()`);
 await wait(`Boolean(document.querySelector('.composer button[aria-label="Send message"]'))`);
 assert.ok(await ev(`document.querySelector('.chat-stop-notice')?.textContent.includes('Stopped waiting for this request')`));
 assert.equal(await ev(`window.preStopCards===[...document.querySelectorAll('.passport-sections [data-entity-id]')].map(node=>node.dataset.entityId).join('|')`),true);
 await ev(`window.fetch=window.preStopFetch;document.querySelector('.assistant-close').click()`);await frame();
 await ev('[...document.querySelectorAll(".passport-sections button")].find(b=>b.textContent==="Make a ritual").click()');await frame();
 assert.ok(await ev('Boolean(document.querySelector(".ritual-form"))'));assert.ok(await ev('Boolean(document.querySelector(".ritual-form select").value)'));
 const today=new Date().toISOString().slice(0,10);
 const weekDays=firstWeek(cards,'London',today);
 const library=renderToStaticMarkup(createElement(UpcomingPlans,{plans:[{id:'fixture-day',city:'London',scheduled_date:today,time_zone:'Europe/London',stop_times:['11:00'],stops:[{id:'fixture-00',name:'Fixture Food stop',section:'Eat',activity:'Eat',address:'A long returned address for responsive alignment'}]}],weeks:[{id:'fixture-week',city:'London',start_date:today,time_zone:'Europe/London',days:weekDays}],editableCity:'London',busy:false,error:'',onDelete:()=>{},onRetry:()=>{},onEdit:()=>{},onEditWeek:()=>{}}));
 await ev(`(()=>{const dialog=document.createElement('dialog');dialog.id='fixture-library';dialog.className='account-dialog account-library-dialog';dialog.innerHTML=${JSON.stringify(library)};document.querySelector('.progressive-app').append(dialog);dialog.showModal();})()`);
 for(const width of [375,390,768,1440]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});await frame();
  assert.equal(await ev('getComputedStyle(document.querySelector("#fixture-library .plan-date>span")).color'),'rgb(255, 254, 250)');
  assert.ok(await ev('(()=>{const el=document.querySelector("#fixture-library");const box=el.getBoundingClientRect();return el.scrollWidth<=el.clientWidth+1&&box.left>=0&&box.right<=innerWidth+1;})()'),`Library overflow at ${width}`);
  const shot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(`/tmp/faveroam-library-${width}.png`,Buffer.from(shot.result.data,'base64'));
 }
 await ev('document.querySelector("#fixture-library").close();document.querySelector("#fixture-library").remove()');
 console.log(JSON.stringify({result:'PASS',scope:'synthetic browser fixtures only; external tiles intentionally blocked; no authenticated/live acceptance',timings,map:'schematic pin preserves map; cluster filters list',ritual:'discovery action prepares guest draft',chat:'retained composer survives three toggles'}));
}finally{ws.close();}
