import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { browser, waitFor } from './cdp.mjs';

const port = 4187, base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/serve.mjs', '--dist'], { env: { ...process.env, POSTMARK_PORT: String(port) }, windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let chrome;
const shots = [], outcomes = [], faults = [];
try {
  await waitFor(async () => { try { return (await fetch(base)).ok; } catch { return false; } }, 'server start');
  for (const path of ['.env.local', '.env', '.git/config', 'package.json']) assert.equal((await fetch(base + '/' + path)).status, 404);
  chrome = await browser(); await mkdir('artifacts', { recursive: true });
  const ev = code => chrome.evaluate(code);
  const g = '__POSTMARK__.game';
  async function capture(name) { const { data } = await chrome.call('Page.captureScreenshot', { format: 'png' }); await writeFile('artifacts/' + name + '.png', Buffer.from(data, 'base64')); shots.push(name); }
  async function clickAt(p) { await chrome.call('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 }); await chrome.call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 }); await sleep(35); }
  async function center(selector) { return ev('(() => {const r=document.querySelector(' + JSON.stringify(selector) + ').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()'); }
  async function click(selector) { await clickAt(await center(selector)); }
  async function world(x,y) { return ev('(() => {const p=__POSTMARK__.renderer.worldToScreen(' + x + ',' + y + '),r=document.querySelector("#game").getBoundingClientRect();return {x:r.x+p.x,y:r.y+p.y}})()'); }
  async function key(key, down = true) {
    const special = { Enter:13, Escape:27, Backspace:8, ' ':32, Shift:16 };
    const code = key === ' ' ? 'Space' : key === 'Shift' ? 'ShiftLeft' : key.length === 1 && /[a-z]/i.test(key) ? 'Key' + key.toUpperCase() : key;
    await chrome.call('Input.dispatchKeyEvent', { type: down ? 'keyDown' : 'keyUp', key, code, windowsVirtualKeyCode:special[key] ?? (key.length===1 ? key.toUpperCase().charCodeAt(0):0), text:down && key==='Enter' ? '\r' : down && key===' ' ? ' ' : undefined });
  }
  async function tap(keyName) { await key(keyName); await key(keyName,false); await sleep(40); }
  async function load() { await chrome.call('Page.navigate',{url:base+'/?test=1'}); await waitFor(()=>ev('!!window.__POSTMARK__'),'game load'); await sleep(100); }
  async function settle() { await waitFor(()=>ev(g+'.player.grounded || '+g+'.delivered'),'courier lands'); }
  async function moveTo(x, jump=false, releaseJump=true) {
    if(await ev(g+'.player.x >= '+x+' || '+g+'.delivered')) return;
    await key('d'); if(jump) await key(' ');
    try { assert.equal(await ev('new Promise(resolve => {const end=performance.now()+10000;function check(){if('+g+'.player.x >= '+x+' || '+g+'.delivered)return resolve(true);if(performance.now()>end)return resolve(false);requestAnimationFrame(check)}check()})'),true,'walk to '+x); }
    finally { await key('d',false); if(jump && releaseJump) await key(' ',false); }
  }
  async function fullHop() { await settle(); await key(' '); await sleep(850); await key(' ',false); await settle(); }
  async function alignTo(x) {
    // Release momentum and aim optional vertical routes with real key presses.
    await sleep(120);
    for(let i=0;i<12;i++) {
      const delta=x-await ev(g+'.player.x'); if(Math.abs(delta)<=9)return;
      const direction=delta>0?'d':'a';await key(direction);await sleep(Math.max(16,Math.min(85,Math.abs(delta)/245*1000)));await key(direction,false);await sleep(120);
    }
    assert.ok(Math.abs(await ev(g+'.player.x')-x)<=9,'courier aligns with optional route');
  }
  async function place(type, next=false) { await tap(String(['ocean','forest','sky'].indexOf(type)+1)); if(next)await tap('e'); await tap('Enter'); }
  async function delivered(index) {
    await waitFor(()=>ev('__POSTMARK__.mode === "letter"'),'letter '+(index+1)+' opens');
    const result=await ev('({room:'+ (index+1) +',delivered:'+g+'.delivered,falls:'+g+'.deaths,memories:'+g+'.collected.size})');
    assert.equal(result.falls,0,'real control route does not fall'); assert.equal(result.delivered,true);
    assert.equal(result.memories,3,'optional movement route collects every memory'); await sleep(300);
    outcomes.push(result); await capture('production-letter-'+(index+1)); console.log('Completed real control route '+(index+1)+' with '+result.memories+'/3 memories');
    await click('#next');
  }

  await chrome.call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await chrome.call('Page.addScriptToEvaluateOnNewDocument',{source:'try {localStorage.clear()} catch {}'});
  await load(); await capture('production-title'); await click('#start');
  assert.equal(await ev('document.activeElement.id'),'game');
  await click('#sound'); assert.equal(await ev('document.querySelector("#sound").getAttribute("aria-pressed")'),'true'); await click('#sound');
  await click('#fullscreen'); assert.equal(await ev('!!document.fullscreenElement'),true,'native fullscreen works'); await click('#fullscreen');
  await tap('1'); await capture('production-preview'); assert.equal(await ev(g+'.placements.ocean'),null);
  await tap('Enter'); await tap('Backspace'); await tap('z'); assert.equal(await ev(g+'.placements.ocean'),'tide'); await click('#undo'); assert.equal(await ev(g+'.placements.ocean'),null);
  await key('d'); await tap('Escape'); const paused=await ev(g+'.time'); await sleep(150); assert.equal(await ev(g+'.time'),paused);
  assert.equal(await ev('document.activeElement.id'),'resume'); await key('d',false); await tap('Enter'); assert.equal(await ev('document.querySelector("#pause-dialog").open'),false);
  assert.equal(await ev('__POSTMARK__.input.right'),false);
  await click('#help'); const helpTime=await ev(g+'.time'); await sleep(100); assert.equal(await ev(g+'.time'),helpTime); await tap('Escape');
  await tap('r'); await settle();
  // Real drag placement from the stamp tray to the world.
  const from=await center('[data-stamp="ocean"]');
  await chrome.call('Input.dispatchMouseEvent',{type:'mousePressed',...from,button:'left',clickCount:1});
  await sleep(50); const to=await world(520,225);
  await chrome.call('Input.dispatchMouseEvent',{type:'mouseMoved',...to,button:'left',buttons:1});
  await chrome.call('Input.dispatchMouseEvent',{type:'mouseReleased',...to,button:'left',clickCount:1}); await sleep(60);
  assert.equal(await ev(g+'.placements.ocean'),'tide'); await sleep(200);
  assert.equal(await ev(g+'.floats[0].y'),540,'an early Ocean stamp waits at the boarding height');
  await moveTo(310); await moveTo(480,true); await settle();
  assert.equal(await ev(g+'.player.riding'),'tide');
  await waitFor(()=>ev(g+'.floats[0].y < 540'),'boarding starts the lift');
  await capture('production-ocean-early-boarding'); await tap('r'); await settle();

  // Exercise a tide vault chained into an actual fold dash.
  await moveTo(310); await moveTo(480,true,false); await settle(); await place('ocean'); await tap('f');
  assert.ok(await ev(g+'.player.vy') < -450,'Tide vault launches the courier');
  const launchBeforeRelease=await ev('({vy:'+g+'.player.vy,time:'+g+'.time})');
  await key(' ',false); await sleep(40);
  const launchAfterRelease=await ev('({vy:'+g+'.player.vy,time:'+g+'.time})');
  assert.ok(Math.abs(launchAfterRelease.vy-launchBeforeRelease.vy-1250*(launchAfterRelease.time-launchBeforeRelease.time))<1,'releasing the earlier jump preserves the Tide vault arc');
  await tap('Shift');
  assert.ok(await ev(g+'.player.dashTime')>0,'short key press queues a dash'); await capture('production-tide-combo');
  await tap('r'); await settle();

  // All four deliveries, including optional memory detours, through actual UI.
  await moveTo(310); await moveTo(480,true); await settle(); await place('ocean');
  await waitFor(()=>ev(g+'.floats[0].y <= 306.1'),'tide reaches its address');
  await moveTo(555); await moveTo(750,true); await settle(); await moveTo(800); await alignTo(808); await fullHop(); await moveTo(935);
  await delivered(0);
  await place('forest'); await settle(); await moveTo(238); await moveTo(385,true); await settle();
  assert.equal(await ev(g+'.ability().ready'),true, 'root spring is ready after landing on a root');
  await tap('f'); assert.ok(await ev(g+'.player.vy') < -450, 'root spring launches through actual controls'); await moveTo(498); await settle(); assert.equal(await ev('!!'+g+'.checkpoint'),true);
  await place('forest',true); await moveTo(645,true); await settle(); await moveTo(712); await alignTo(719);
  await tap('f'); await capture('production-root-spring'); await sleep(1200); await settle();
  await moveTo(864,true); await settle(); await moveTo(953); await delivered(1);
  await place('sky'); await settle(); await moveTo(630); await settle(); await alignTo(638); await tap('f');
  assert.equal(await ev(g+'.gravityAt(650,330)'),1,'Sky release temporarily changes gravity'); await capture('production-sky-release');
  await sleep(1500); await settle(); await moveTo(874); await settle(); await alignTo(884); await fullHop(); await moveTo(953); await delivered(2);
  await settle(); await moveTo(220); await moveTo(404,true); await settle(); await place('ocean');
  await waitFor(()=>ev(g+'.floats[0].y <= 350.1'),'last tide reaches the landing');
  await moveTo(430); await moveTo(599,true); await settle(); await place('forest'); await moveTo(706,true); await settle();
  await alignTo(724); await tap('f'); await sleep(1200); await settle(); await place('sky'); await moveTo(990); await settle();
  await waitFor(()=>ev('__POSTMARK__.mode === "letter"'),'victory'); await sleep(300); await capture('production-victory');
  const last=await ev('({room:4,delivered:'+g+'.delivered,falls:'+g+'.deaths,memories:'+g+'.collected.size})'); outcomes.push(last);
  assert.equal(last.falls,0); assert.equal(last.memories,3); assert.equal(await ev('document.querySelector("#delivery-title").textContent'),'You found your way home.');
  assert.ok(await ev('document.querySelector("#delivery-stats").textContent').then(s=>s.includes('4 letters delivered')));
  assert.ok(await ev('document.querySelector("#delivery-stats").textContent').then(s=>s.includes('12 / 12 memories')));
  await click('#next'); assert.equal(await ev(g+'.index'),0); assert.equal(await ev(g+'.collected.size'),0);

  const performance=await ev('(() => {__POSTMARK__.startRoom(3); const r=__POSTMARK__.renderer,g=__POSTMARK__.game; for(const s of g.level.sockets)g.place(s.type,s.id); for(let i=0;i<20;i++)r.burst(550,300,"gold",80); const peakParticles=r.particles.length,times=[]; for(let i=0;i<120;i++){const t=performance.now();r.draw(g,{elapsed:1/60,alpha:1});times.push(performance.now()-t)} times.sort((a,b)=>a-b);return {meanMs:times.reduce((a,b)=>a+b,0)/times.length,p95Ms:times[114],maxMs:times.at(-1),peakParticles,particles:r.particles.length,limit:240}})()');
  assert.ok(performance.p95Ms<30,'software-rendered stress frame stays bounded'); assert.ok(performance.particles<=240);
  console.log('Render stress: '+JSON.stringify(performance));
  await ev('__POSTMARK__.startRoom(0)');
  const frameTiming=await ev('(async () => {const times=[];let prior;for(let i=0;i<91;i++){const t=await new Promise(requestAnimationFrame);if(prior!==undefined)times.push(t-prior);prior=t}times.sort((a,b)=>a-b);return {frames:times.length,medianMs:times[45],p95Ms:times[85],maxMs:times.at(-1)}})()');
  for(const viewport of [{width:1366,height:768,mobile:false,name:'laptop'},{width:2560,height:1080,mobile:false,name:'ultrawide'}]){
    await chrome.call('Emulation.setDeviceMetricsOverride',{...viewport,deviceScaleFactor:1});await sleep(100);
    assert.equal(await ev('document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight'),true,'viewport has no overflow');
    await capture('production-'+viewport.name);
  }
  await chrome.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
  await chrome.call('Emulation.setTouchEmulationEnabled',{enabled:true});
  await chrome.call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await load(); await capture('production-mobile-title'); await click('#start');
  assert.equal(await ev('__POSTMARK__.renderer.reducedMotion'),true);
  const right=await center('[data-control="right"]'),jump=await center('[data-control="jump"]');
  const before=await ev(g+'.player.x');
  await chrome.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...right,id:1},{...jump,id:2}]});await sleep(220);
  await chrome.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(await ev(g+'.player.x')>before+20); assert.equal(await ev('__POSTMARK__.input.jump'),false);
  await click('[data-stamp="ocean"]'); await sleep(60); assert.equal(await ev('__POSTMARK__.renderer.overview'),true);
  await clickAt(await world(520,225)); assert.equal(await ev(g+'.placements.ocean'),'tide'); await click('#undo');
  assert.equal(await ev(g+'.placements.ocean'),null);
  await click('#dash-control'); await sleep(50); assert.equal(await ev('__POSTMARK__.renderer.shake'),0,'reduced motion never shakes');
  await click('#pause'); const mobileTime=await ev(g+'.time');await sleep(100);assert.equal(await ev(g+'.time'),mobileTime);await capture('production-mobile-pause');await click('#resume');
  await capture('production-mobile-room');
  for(const viewport of [{width:320,height:740,name:'narrow'},{width:844,height:390,name:'landscape'},{width:768,height:1024,name:'tablet'}]){
    await chrome.call('Emulation.setDeviceMetricsOverride',{...viewport,deviceScaleFactor:1,mobile:true});await sleep(120);
    assert.equal(await ev('document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight'),true,viewport.name+' fits viewport');
    const visibleCourier=await ev('(() => {const r=__POSTMARK__.renderer,p=__POSTMARK__.game.player,s=r.worldToScreen(p.x+12,p.y+16);return s.x>=0&&s.x<=r.width&&s.y>=0&&s.y<=r.height})()');
    assert.equal(visibleCourier,true,'courier remains visible after '+viewport.name+' resize');
    await capture('production-mobile-'+viewport.name);
    // A UI fixture checks the ending's scroll access at each small viewport.
    await ev('__POSTMARK__.startRoom(3);Object.assign(__POSTMARK__.game.player,{x:990,y:146,vy:0})');
    await waitFor(()=>ev('__POSTMARK__.mode === "letter"'),'mobile ending'); await sleep(100);
    await ev('document.querySelector("#delivery").scrollTop=0'); await capture('production-mobile-'+viewport.name+'-ending');
    await ev('document.querySelector("#next").scrollIntoView({block:"nearest"})');
    assert.equal(await ev('(() => {const b=document.querySelector("#next").getBoundingClientRect(),r=document.querySelector("#delivery").getBoundingClientRect();return b.top>=r.top&&b.bottom<=r.bottom})()'),true,'replay remains reachable');
    await click('#next'); assert.equal(await ev(g+'.index'),0); await settle();
  }
  // Storage failure must not break the game.
  const storageScript=await chrome.call('Page.addScriptToEvaluateOnNewDocument',{source:'Object.defineProperty(window,"localStorage",{get(){throw new Error("Storage unavailable")}})'});
  await load();await click('#start');assert.equal(await ev('__POSTMARK__.mode'),'playing');await chrome.call('Page.removeScriptToEvaluateOnNewDocument',{identifier:storageScript.identifier});

  // Fault injection in the browser: the game starts before artwork can finish.
  await chrome.call('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
  const fixture=await ev('__POSTMARK__.renderer.images.ocean.toDataURL("image/png").split(",")[1]');
  for(const fault of ['rate-limit','server-error','malformed','timeout','corrupt-image','valid-image']){
    await chrome.call('Fetch.enable',{patterns:[{urlPattern:'*/assets/manifest.json'},{urlPattern:'*/assets/ocean.png'}]});
    const start=chrome.events.length;await chrome.call('Page.navigate',{url:base+'/?test=1'});
    await waitFor(()=>chrome.events.slice(start).some(e=>e.method==='Fetch.requestPaused'&&e.params.request.url.endsWith('manifest.json')),'intercept manifest');
    const pausedRequest=chrome.events.slice(start).find(e=>e.method==='Fetch.requestPaused'&&e.params.request.url.endsWith('manifest.json')).params.requestId;
    if(fault!=='timeout'){
      const manifest=fault==='corrupt-image'||fault==='valid-image'?JSON.stringify({assets:[{id:'ocean',file:'ocean.png'}]}):fault==='malformed'?'not-json':'{}';
      await chrome.call('Fetch.fulfillRequest',{requestId:pausedRequest,responseCode:fault==='rate-limit'?429:fault==='server-error'?503:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(manifest).toString('base64')});
    }
    await waitFor(()=>ev('!!window.__POSTMARK__'),'fallback game starts');await click('#start');await key('d');await sleep(160);await key('d',false);
    assert.ok(await ev(g+'.player.x')>125,'art failure never blocks movement');
    if(fault==='corrupt-image'||fault==='valid-image'){
      await waitFor(()=>chrome.events.slice(start).some(e=>e.method==='Fetch.requestPaused'&&e.params.request.url.endsWith('ocean.png')),'intercept image');
      const id=chrome.events.slice(start).find(e=>e.method==='Fetch.requestPaused'&&e.params.request.url.endsWith('ocean.png')).params.requestId;
      await chrome.call('Fetch.fulfillRequest',{requestId:id,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/png'}],body:fault==='valid-image'?fixture:Buffer.from('bad png').toString('base64')});
      await sleep(100);
      assert.equal(await ev('__POSTMARK__.renderer.images.ocean instanceof HTMLImageElement'),fault==='valid-image');
    }
    if(fault==='timeout'){await sleep(2700);assert.equal(await ev('__POSTMARK__.renderer.images.ocean instanceof HTMLCanvasElement'),true);await capture('production-art-fallback');}
    await chrome.call('Fetch.disable');faults.push(fault);
  }
  assert.equal(chrome.errors.length,0,chrome.errors.join('\n'));
  const summary={passed:true,realControlRoutes:outcomes,artFaults:faults,performance,frameTiming,screenshots:shots,checks:['all four deliveries through real keyboard controls','stamp dragging, preview, undo, pause and native fullscreen','tide vault, root spring and sky release','early Ocean placement waits for boarding','jump release preserves world launches','optional memory detours and checkpoint activation','victory and replay','desktop, laptop, ultrawide, phone, landscape and tablet','multi-touch and reduced motion','storage unavailable','API/art errors and bounded fallback','no runtime exceptions']};
  await writeFile('artifacts/browser-results.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
}catch(error){
  if(chrome){console.log('Failure state: '+JSON.stringify(await chrome.evaluate('window.__POSTMARK__ ? ({player:__POSTMARK__.game.player,ability:__POSTMARK__.game.ability(),input:__POSTMARK__.input,mode:__POSTMARK__.mode,falls:__POSTMARK__.game.deaths,memories:[...__POSTMARK__.game.collected]}) : null'))); const shot=await chrome.call('Page.captureScreenshot',{format:'png'});await writeFile('artifacts/production-failure.png',Buffer.from(shot.data,'base64'));}
  throw error;
}finally{if(chrome)await chrome.close();server.kill()}
