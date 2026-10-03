import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { browser, waitFor } from './cdp.mjs';

const port = 4187, base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/serve.mjs', '--dist'], { env: { ...process.env, POSTMARK_PORT: String(port) }, windowsHide: true, stdio: 'ignore' });
let chrome;
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await waitFor(async () => { try { return (await fetch(base)).ok; } catch { return false; } }, 'server start');
  assert.equal((await fetch(`${base}/.env.local`)).status, 404);
  assert.equal((await fetch(`${base}/package.json`)).status, 404);
  chrome = await browser(); await mkdir('artifacts', { recursive: true });
  await chrome.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1150, deviceScaleFactor: 1, mobile: false });
  await chrome.call('Page.navigate', { url: `${base}/?test=1` });
  await waitFor(() => chrome.evaluate('!!window.__POSTMARK__'), 'game load'); await sleep(120);
  async function capture(name) { const { data } = await chrome.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await writeFile(`artifacts/${name}.png`, Buffer.from(data, 'base64')); }
  async function click(selector) { const p = await chrome.evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`); await chrome.call('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 }); await chrome.call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 }); }
  async function key(key, down = true, code = key) {
    const special = { Enter: 13, Escape: 27, Backspace: 8, ' ': 32 };
    const windowsVirtualKeyCode = special[key] ?? (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0);
    const text = down && key === 'Enter' ? '\r' : down && key === ' ' ? ' ' : undefined;
    await chrome.call('Input.dispatchKeyEvent', { type: down ? 'keyDown' : 'keyUp', key, code, windowsVirtualKeyCode, text });
  }
  async function tapKey(k) { await key(k); await key(k, false); }

  await capture('desktop-title'); await click('#start');
  assert.equal(await chrome.evaluate('__POSTMARK__.mode'), 'playing');
  assert.equal(await chrome.evaluate('document.activeElement.id'), 'game');
  await click('#sound'); assert.equal(await chrome.evaluate('document.querySelector("#sound").getAttribute("aria-pressed")'), 'true');
  await click('#sound'); assert.equal(await chrome.evaluate('document.querySelector("#sound").getAttribute("aria-pressed")'), 'false');
  assert.equal(await chrome.evaluate('document.activeElement.id'), 'game', 'sound toggle returns focus to gameplay');
  await chrome.evaluate('document.querySelector("#game").focus()');
  await tapKey('1'); await sleep(60); await capture('desktop-ocean-preview');
  assert.equal(await chrome.evaluate('__POSTMARK__.game.placements.ocean'), null, 'preview does not place a stamp');
  assert.equal(await chrome.evaluate('__POSTMARK__.game.floats[0].y'), 540, 'preview does not move the crate');
  await tapKey('Enter'); assert.equal(await chrome.evaluate('__POSTMARK__.game.placements.ocean'), 'tide');
  await tapKey('Backspace'); assert.equal(await chrome.evaluate('__POSTMARK__.game.placements.ocean'), null);
  await tapKey('z'); assert.equal(await chrome.evaluate('__POSTMARK__.game.placements.ocean'), 'tide', 'Z undoes a reclaim');
  await click('#undo'); assert.equal(await chrome.evaluate('__POSTMARK__.game.placements.ocean'), null, 'undo button restores an empty frame');
  assert.equal(await chrome.evaluate('document.querySelector("#undo").disabled'), true, 'undo disables when history is empty');
  await key('d'); await tapKey('Escape');
  assert.equal(await chrome.evaluate('document.querySelector("#pause-dialog").open'), true, 'Escape opens pause');
  const pauseTime = await chrome.evaluate('__POSTMARK__.game.time'); await sleep(170);
  assert.equal(await chrome.evaluate('__POSTMARK__.game.time'), pauseTime, 'pause freezes the simulation');
  await key('d', false); assert.equal(await chrome.evaluate('document.activeElement.id'), 'resume', 'pause focuses its resume action'); await tapKey('Enter');
  assert.equal(await chrome.evaluate('document.querySelector("#pause-dialog").open'), false, 'Enter resumes through the focused native button');
  assert.equal(await chrome.evaluate('document.activeElement.id'), 'game');
  assert.equal(await chrome.evaluate('__POSTMARK__.input.right'), false, 'pause clears held movement');
  const beforeX = await chrome.evaluate('__POSTMARK__.game.player.x'); await key('d'); await sleep(200); await key('d', false);
  assert.ok(await chrome.evaluate('__POSTMARK__.game.player.x') > beforeX + 20, 'keyboard moves courier');
  await click('#help'); const paused = await chrome.evaluate('__POSTMARK__.game.time'); await sleep(170); assert.equal(await chrome.evaluate('__POSTMARK__.game.time'), paused, 'help pauses simulation');
  await chrome.evaluate('document.querySelector("#help-dialog").close()');
  await tapKey('r'); assert.equal(await chrome.evaluate('__POSTMARK__.game.placements.ocean'), null);
  // Exercise pointer capture and actual drag-and-drop from the tray to the scene.
  const drag = await chrome.evaluate(`(() => { const b=document.querySelector('[data-stamp="ocean"]').getBoundingClientRect(), c=document.querySelector('#game').getBoundingClientRect(); return {from:{x:b.x+b.width/2,y:b.y+b.height/2},to:{x:c.x+c.width*520/1100,y:c.y+c.height*225/620}}; })()`);
  await chrome.call('Input.dispatchMouseEvent', { type: 'mousePressed', ...drag.from, button: 'left', clickCount: 1 });
  await chrome.call('Input.dispatchMouseEvent', { type: 'mouseMoved', ...drag.to, button: 'left', buttons: 1 });
  await chrome.call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...drag.to, button: 'left', clickCount: 1 });
  assert.equal(await chrome.evaluate('__POSTMARK__.game.placements.ocean'), 'tide');
  await sleep(150); await capture('desktop-ocean');

  // Complete the first delivery using actual browser keyboard controls.
  await click('#restart');
  await waitFor(() => chrome.evaluate('__POSTMARK__.game.player.grounded'), 'courier settles at start');
  async function moveTo(x, jump = false) {
    await key('d'); if (jump) await key(' ', true, 'Space');
    try { await waitFor(() => chrome.evaluate(`__POSTMARK__.game.player.x >= ${x} || __POSTMARK__.game.delivered`), `walk to ${x}`); }
    finally { await key('d', false); if (jump) await key(' ', false, 'Space'); }
  }
  await moveTo(310); await moveTo(480, true);
  await waitFor(() => chrome.evaluate('__POSTMARK__.game.player.grounded && __POSTMARK__.game.player.riding === "tide"'), 'land on the crate');
  await tapKey('1'); await tapKey('Enter');
  await waitFor(() => chrome.evaluate('__POSTMARK__.game.floats[0].y <= 306.1'), 'tide lifts the courier', 10000);
  await moveTo(540); await sleep(150); await moveTo(748, true);
  await waitFor(() => chrome.evaluate('__POSTMARK__.game.player.grounded || __POSTMARK__.game.delivered'), 'land at the address');
  await moveTo(935); await waitFor(() => chrome.evaluate('__POSTMARK__.mode === "letter"'), 'first letter opens');
  assert.equal(await chrome.evaluate('document.querySelector("#delivery-title").textContent'), 'The sea writes back.');
  assert.equal(await chrome.evaluate('__POSTMARK__.game.deaths'), 0, 'first delivery succeeds through real controls without falls');
  await capture('desktop-first-delivery'); await click('#next');
  assert.equal(await chrome.evaluate('__POSTMARK__.game.index'), 1, 'next letter progresses to the Forest room');
  await tapKey('2'); await tapKey('Enter'); await tapKey('e'); await sleep(60);
  assert.equal(await chrome.evaluate('__POSTMARK__.focus'), 1, 'keyboard changes the preview target');
  assert.equal(await chrome.evaluate('__POSTMARK__.game.placements.forest'), 'root-left', 'preview keeps the original bridge intact');
  await capture('desktop-forest-preview');
  await tapKey('Enter'); await click('#undo');
  assert.equal(await chrome.evaluate('__POSTMARK__.game.placements.forest'), 'root-left', 'undo restores the original Forest bridge');
  await chrome.evaluate('__POSTMARK__.startRoom(2)'); await tapKey('3'); await sleep(60); await capture('desktop-sky-preview');
  assert.equal(await chrome.evaluate('__POSTMARK__.game.gravityAt(500,350)'), 1, 'gravity preview has no physical effect');

  // Run the authored movement solutions inside the browser's actual ES modules.
  // Real controls were checked above; these verify packaged simulation parity.
  const outcomes = await chrome.evaluate(`(async () => {
    const { Game } = await import('./src/engine.js');
    const tick=(g,n=1,input={})=>{for(let i=0;i<n&&!g.delivered;i++)g.step(input)};
    const right=(g,x,jump=false)=>{for(let i=0;i<500&&g.player.x<x&&!g.delivered;i++)g.step({right:true,jump});if(g.player.x<x&&!g.delivered)throw Error('Route stopped at '+g.player.x)};
    const land=g=>{for(let i=0;i<180;i++){g.step();if(g.player.grounded||g.delivered)return;}throw Error('No landing')};
    const solutions=[
      g=>{tick(g,25);right(g,310);right(g,480,true);land(g);g.place('ocean','tide');tick(g,240);right(g,555);right(g,750,true);land(g);right(g,935)},
      g=>{g.place('forest','root-left');tick(g,25);right(g,238);right(g,385,true);land(g);right(g,405);right(g,498,true);land(g);g.place('forest','root-right');right(g,645,true);land(g);right(g,703);right(g,864,true);land(g);right(g,953)},
      g=>{g.place('sky','updraft');tick(g,25);right(g,957);land(g);tick(g,90)},
      g=>{tick(g,25);right(g,220);right(g,404,true);land(g);g.place('ocean','home-tide');tick(g,210);right(g,430);right(g,599,true);land(g);g.place('forest','home-root');right(g,706,true);land(g);g.place('sky','home-sky');right(g,990);land(g);tick(g,90)}
    ];
    return solutions.map((solve,i)=>{const g=new Game(i);solve(g);return {room:i+1,delivered:g.delivered,falls:g.deaths}})
  })()`);
  assert.ok(outcomes.every(o => o.delivered && o.falls === 0));
  await chrome.evaluate("__POSTMARK__.startRoom(3); __POSTMARK__.select('ocean'); __POSTMARK__.placeAt(0); __POSTMARK__.select('forest'); __POSTMARK__.placeAt(1); __POSTMARK__.select('sky'); __POSTMARK__.placeAt(2)");
  await sleep(130); await capture('desktop-final-room');
  await chrome.evaluate("__POSTMARK__.game.player.x = 990; __POSTMARK__.game.player.y = 155");
  await waitFor(() => chrome.evaluate('__POSTMARK__.mode === "letter"'), 'ending presentation');
  assert.equal(await chrome.evaluate('document.querySelector("#delivery-title").textContent'), 'You found your way home.'); await capture('desktop-ending');
  await click('#next'); assert.equal(await chrome.evaluate('__POSTMARK__.game.index'), 0);

  await chrome.call('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await sleep(100);
  assert.ok(await chrome.evaluate('document.querySelector(".desk-footer").getBoundingClientRect().bottom <= innerHeight'), 'laptop keeps the controls and tray on screen');
  await capture('laptop-room');

  await chrome.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await chrome.call('Emulation.setTouchEmulationEnabled', { enabled: true });
  await chrome.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await chrome.call('Page.navigate', { url: `${base}/?test=1` }); await waitFor(() => chrome.evaluate('!!window.__POSTMARK__'), 'mobile load'); await sleep(150); await capture('mobile-title');
  assert.equal(await chrome.evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'mobile has no horizontal overflow');
  await click('#start'); assert.equal(await chrome.evaluate('__POSTMARK__.renderer.reducedMotion'), true);
  const touch = await chrome.evaluate(`(() => {const r=document.querySelector('[data-control="right"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,id:1}})()`);
  const mobileX = await chrome.evaluate('__POSTMARK__.game.player.x');
  await chrome.call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] }); await sleep(220); await chrome.call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.ok(await chrome.evaluate('__POSTMARK__.game.player.x') > mobileX + 20, 'touch moves courier');
  await click('[data-stamp="ocean"]'); await click('#game');
  assert.equal(await chrome.evaluate('__POSTMARK__.game.placements.ocean'), 'tide');
  await click('#undo'); assert.equal(await chrome.evaluate('__POSTMARK__.game.placements.ocean'), null, 'mobile undo restores an empty frame');
  await click('#pause'); const mobilePauseTime = await chrome.evaluate('__POSTMARK__.game.time'); await sleep(100);
  assert.equal(await chrome.evaluate('__POSTMARK__.game.time'), mobilePauseTime); await capture('mobile-pause');
  await click('#resume'); assert.equal(await chrome.evaluate('document.querySelector("#pause-dialog").open'), false);
  await capture('mobile-room');
  await chrome.evaluate('__POSTMARK__.startRoom(3); __POSTMARK__.game.player.x=990; __POSTMARK__.game.player.y=155');
  await waitFor(() => chrome.evaluate('__POSTMARK__.mode === "letter"'), 'mobile ending');
  assert.equal(await chrome.evaluate('(() => {const b=document.querySelector("#next").getBoundingClientRect(),s=document.querySelector(".stage-wrap").getBoundingClientRect();return b.bottom<=s.bottom && b.top>=s.top})()'), true, 'mobile ending action fits inside the scene');
  await capture('mobile-ending');
  await chrome.call('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await chrome.call('Page.navigate', { url: `${base}/?test=1` }); await waitFor(() => chrome.evaluate('!!window.__POSTMARK__'), 'narrow mobile title');
  assert.equal(await chrome.evaluate('document.documentElement.scrollWidth <= innerWidth'), true, '320px screen has no horizontal overflow');
  assert.equal(await chrome.evaluate('(() => {const b=document.querySelector("#start").getBoundingClientRect(),s=document.querySelector(".stage-wrap").getBoundingClientRect();return b.bottom<=s.bottom && b.top>=s.top})()'), true, 'narrow mobile start action fits');
  await capture('narrow-mobile-title');
  await click('#start');
  assert.equal(await chrome.evaluate('document.documentElement.scrollWidth <= innerWidth'), true, '320px gameplay has no horizontal overflow');
  assert.equal(await chrome.evaluate('(() => {const a=document.querySelector("#room-actions").getBoundingClientRect(),f=document.querySelector(".game-frame").getBoundingClientRect();return a.right<=f.right && a.left>=f.left})()'), true, 'narrow mobile room actions fit');
  await capture('narrow-mobile-room');
  await chrome.call('Page.navigate', { url: `${base}/?test=1` }); await waitFor(() => chrome.evaluate('!!window.__POSTMARK__'), 'reload');
  assert.equal(chrome.errors.length, 0, chrome.errors.join('\n'));
  const summary = { passed: true, rooms: outcomes, checks: ['packaged build loads', 'local server protects secret files', 'keyboard movement and stamp controls', 'effect previews preserve physics', 'keyboard and button undo', 'pause and resume clear held input', 'sound toggle', 'pointer drag placement', 'help pauses gameplay', 'restart clears effects', 'first delivery through actual keyboard controls', 'four complete puzzle routes', 'ending and replay', 'laptop keeps tray in viewport', 'mobile layout, touch movement, undo and pause', 'mobile ending and 320px gameplay actions fit', 'reduced motion', 'no runtime exceptions'], screenshots: ['desktop-title', 'desktop-ocean-preview', 'desktop-ocean', 'desktop-forest-preview', 'desktop-sky-preview', 'desktop-first-delivery', 'desktop-final-room', 'desktop-ending', 'laptop-room', 'mobile-title', 'mobile-pause', 'mobile-room', 'mobile-ending', 'narrow-mobile-title', 'narrow-mobile-room'] };
  await writeFile('artifacts/browser-results.json', JSON.stringify(summary, null, 2)); console.log(JSON.stringify(summary, null, 2));
} finally { if (chrome) await chrome.close(); server.kill(); }
