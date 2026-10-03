import { Game, PHYSICS } from './engine.js';
import { Renderer } from './renderer.js';
import { Audio } from './audio.js';
import { LEVELS, STAMPS } from './levels.js';

const elements = new Map();
const $ = selector => { if (!elements.has(selector)) elements.set(selector, document.querySelector(selector)); return elements.get(selector); };
const text = (selector, value) => { const element = $(selector); if (element.textContent !== value) element.textContent = value; };
const canvas = $('#game'), game = new Game(), renderer = new Renderer(canvas), audio = new Audio();
const input = { left: false, right: false, jump: false, dash: false, pulse: false };
const keys = new Set();
const touches = new Map();
let queuedDash = false, queuedPulse = false, queuedJump = false, memories = [0, 0, 0, 0], shiftFalls = 0;
let mode = 'intro', selected = null, focus = -1, pointer = null, toastTimer, deliveryTimer, accumulator = 0, previousTime = 0, lastRoom = 0;
try { const saved = Number(localStorage.getItem('postmark-room')); if (Number.isInteger(saved) && saved > 0 && saved < LEVELS.length) lastRoom = saved; } catch {}
try { const saved = JSON.parse(localStorage.getItem('postmark-shift')); if (Array.isArray(saved?.memories) && saved.memories.length === 4 && saved.memories.every(n => Number.isInteger(n) && n >= 0 && n <= 3)) memories = saved.memories; if (Number.isSafeInteger(saved?.falls) && saved.falls >= 0) shiftFalls = saved.falls; } catch {}
if (lastRoom) $('#start').firstChild.textContent = 'Continue your shift ';
renderer.thumbnails(); renderer.loadArt();

function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2700); }
function syncControls() {
  document.querySelectorAll('[data-stamp]').forEach(button => {
    const type = button.dataset.stamp;
    button.disabled = mode !== 'playing' || !game.level.available.includes(type);
    button.dataset.placed = String(!!game.placements[type]);
    button.querySelector('.stamp-state').textContent = !game.level.available.includes(type) ? 'Next letter' : game.placements[type] ? 'Borrowed · move it' : 'Ready to borrow';
    button.querySelector('.stamp-state').dataset.short = !game.level.available.includes(type) ? 'Later' : game.placements[type] ? 'Borrowed' : 'Ready';
    button.setAttribute('aria-pressed', String(selected === type));
    button.setAttribute('aria-label', `${type[0].toUpperCase() + type.slice(1)} stamp, key ${STAMPS.indexOf(type) + 1}. ${game.placements[type] ? 'Placed. Select to move or reclaim.' : button.querySelector('small').textContent + '.'}`);
  });
  $('#reclaim').disabled = mode !== 'playing' || !selected || !game.placements[selected];
  $('#undo').disabled = mode !== 'playing' || !game.canUndo;
  $('#pause').disabled = mode !== 'playing';
  $('#map').disabled = mode !== 'playing';
  $('#selection-hint').textContent = selected ? `${selected[0].toUpperCase() + selected.slice(1)} selected. Preview its effect, then place.` : 'Select a stamp, then a dotted frame.';
}
function syncAbilities() {
  const ability = game.ability(), dashReady = game.player.dashAvailable && game.player.dashCooldown <= 0;
  $('#dash-control').disabled = mode !== 'playing';
  $('#pulse-control').disabled = mode !== 'playing' || !ability.ready;
  text('#ability-name', ability.type ? ability.name : 'World pulse');
  text('#pulse-state', !ability.type ? 'F · Enter a stamped world' : ability.ready ? 'F · Ready to combine' : ability.type === 'forest' && game.pulseCooldown <= 0 ? 'Stand on the root bridge' : 'Recharging');
  text('#dash-state', dashReady ? 'Shift / X · Ready' : game.player.dashCooldown > 0 ? 'Refolding…' : 'Land or pulse to recharge');
  $('#dash-meter').style.transform = `scaleX(${dashReady ? 1 : Math.max(0, 1 - game.player.dashCooldown / PHYSICS.dashCooldown) * .6})`;
  $('#pulse-meter').style.transform = `scaleX(${ability.ready ? 1 : Math.max(0, 1 - game.pulseCooldown / PHYSICS.pulseCooldown) * (ability.type ? .6 : 0)})`;
  text('#memory-count', `${game.collected.size} / 3`);
}
function progress() {
  $('#letter-progress').replaceChildren(...LEVELS.map((_, index) => {
    const item = document.createElement('li'); const complete = index < game.index || (index === game.index && game.delivered);
    item.textContent = complete ? '✓' : String(index + 1); item.className = complete ? 'delivered' : index === game.index ? 'current' : '';
    item.setAttribute('aria-label', `Letter ${index + 1}${complete ? ', delivered' : index === game.index ? ', current' : ', waiting'}`); return item;
  }));
}
function select(type) {
  if (mode !== 'playing' || !game.level.available.includes(type)) return;
  selected = type; focus = game.level.sockets.findIndex(s => s.type === type); renderer.overview = true; syncControls(); canvas.focus({ preventScroll: true });
}
function startRoom(index) {
  clearTimeout(deliveryTimer); game.load(index); mode = 'playing'; selected = null; focus = -1; pointer = null; clearInput();
  clearTimeout(toastTimer); $('#toast').classList.remove('visible'); renderer.reset();
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  $('#game-shell').dataset.mode = mode; $('#intro').hidden = true; $('#delivery').hidden = true;
  $('#room-note').hidden = false; $('#memory-hud').hidden = false;
  $('#room-number').textContent = `Letter ${index + 1} of 4 · ${game.level.subtitle}`;
  $('#room-title').textContent = game.level.title; $('#room-hint').textContent = game.level.hint; $('#delivery-progress').textContent = `${index} / 4 delivered`;
  try { localStorage.setItem('postmark-room', String(index)); } catch {}
  progress(); syncControls(); canvas.focus({ preventScroll: true }); accumulator = 0; previousTime = 0;
  if (!renderer.reducedMotion) canvas.animate([{ opacity: .65 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
  if (innerWidth <= 600) toast(game.level.hint);
}
function newShift() { memories = [0, 0, 0, 0]; shiftFalls = 0; lastRoom = 0; try { localStorage.removeItem('postmark-shift'); } catch {} startRoom(0); }
function delivered() {
  mode = 'delivering'; clearInput(); syncControls(); $('#delivery-progress').textContent = `${game.index + 1} / 4 delivered`;
  clearTimeout(toastTimer); $('#toast').classList.remove('visible');
  memories[game.index] = Math.max(memories[game.index], game.collected.size); shiftFalls += game.deaths;
  try { localStorage.setItem('postmark-shift', JSON.stringify({ memories, falls: shiftFalls })); } catch {}
  progress();
  deliveryTimer = setTimeout(() => {
    mode = 'letter'; $('#delivery-title').textContent = game.level.letter.title; $('#delivery-copy').textContent = game.level.letter.body;
    $('#delivery-label').textContent = game.index === 3 ? 'Address found. Shift complete.' : 'Delivered, at last.';
    $('#delivery-stats').textContent = game.index === 3 ? `4 letters delivered · ${memories.reduce((a, b) => a + b, 0)} / 12 memories · ${shiftFalls} safe returns` : `${game.collected.size} / 3 memories restored · ${game.deaths} safe returns`;
    $('#next').firstChild.textContent = game.index === 3 ? 'Play another shift ' : 'Open next letter ';
    $('#game-shell').dataset.mode = mode; $('#delivery').hidden = false; $('#room-note').hidden = true; $('#memory-hud').hidden = true;
    if (!renderer.reducedMotion) $('.delivery-letter').animate([{ opacity: 0, transform: 'translateY(18px) rotate(-3deg)' }, { opacity: 1, transform: 'translateY(0) rotate(-1deg)' }], { duration: 260, easing: 'cubic-bezier(.16,1,.3,1)' });
    $('#next').focus({ preventScroll: true });
    if (game.index === 3) { try { localStorage.removeItem('postmark-room'); } catch {} }
  }, renderer.reducedMotion ? 50 : 420);
}
function processEvents() {
  for (const event of game.drainEvents()) {
    audio.play(event.type === 'undo' ? 'reclaim' : event.type);
    renderer.feedback(event, game);
    if (event.type === 'fall') {
      syncControls();
      toast(game.checkpoint ? 'Back to your lantern. The letter is safe.' : 'A little tumble. Your letter is still waiting.');
    }
    if (event.type === 'memory') toast(`You remembered “${event.word}”. Dash recharged.`);
    if (event.type === 'checkpoint') toast('Lantern lit. This address is remembered.');
    if (event.type === 'pulse') toast(`${event.name}${event.world === 'sky' ? ' · gravity returns in a moment' : ' · chain with a dash'}`);
    if (event.type === 'delivered') delivered();
  }
}
function clearInput() { keys.clear(); touches.clear(); for (const name of Object.keys(input)) input[name] = false; queuedDash = queuedPulse = queuedJump = false; document.querySelectorAll('.pressed').forEach(b => b.classList.remove('pressed')); }
function updateInput() {
  const held = [...touches.values()];
  input.left = keys.has('a') || keys.has('arrowleft') || held.includes('left'); input.right = keys.has('d') || keys.has('arrowright') || held.includes('right');
  input.jump = keys.has(' ') || keys.has('w') || keys.has('arrowup') || held.includes('jump'); input.dash = keys.has('shift') || keys.has('x') || held.includes('dash'); input.pulse = keys.has('f') || held.includes('pulse');
  if (input.left || input.right || input.jump || input.dash) renderer.overview = false;
}

function placeAt(index) {
  if (!selected || mode !== 'playing') { if (mode === 'playing') toast('Choose a stamp from the tray first.'); return false; }
  const socket = game.level.sockets[index];
  if (!socket || socket.type !== selected) { toast('That frame needs a different world.'); return false; }
  const result = game.place(selected, socket.id); if (result) { focus = index; renderer.overview = false; syncControls(); } return result;
}
function point(event) { const r = canvas.getBoundingClientRect(); return renderer.screenToWorld(event.clientX - r.left, event.clientY - r.top); }
function hitSocket(p) { return game.level.sockets.findIndex(s => Math.abs(s.x - p.x) <= 52 && Math.abs(s.y - p.y) <= 59); }
function matchingFrame(p) {
  const hit = hitSocket(p);
  if (hit >= 0) return game.level.sockets[hit].type === selected ? hit : -1;
  return game.level.sockets.findIndex(s => s.type === selected && p.x >= s.field.x && p.x <= s.field.x + s.field.w && p.y >= s.field.y && p.y <= s.field.y + s.field.h);
}
function undoStamp() {
  if (mode !== 'playing' || !game.undo()) return;
  syncControls(); toast('Last stamp move undone.'); canvas.focus({ preventScroll: true });
}
function pauseGame() {
  if (mode !== 'playing' || $('#help-dialog').open || $('#pause-dialog').open) return;
  clearInput(); pointer = null; $('#pause-dialog').showModal();
}

$('#start').addEventListener('click', () => startRoom(lastRoom));
$('#next').addEventListener('click', () => game.index === 3 ? newShift() : startRoom(game.index + 1));
$('#restart').addEventListener('click', () => startRoom(game.index));
$('#new-shift').addEventListener('click', newShift);
$('#reclaim').addEventListener('click', () => { if (selected) game.reclaim(selected); syncControls(); canvas.focus({ preventScroll: true }); });
$('#undo').addEventListener('click', undoStamp);
$('#pause').addEventListener('click', pauseGame);
$('#map').addEventListener('click', () => { renderer.overview = !renderer.overview; canvas.focus({ preventScroll: true }); });
$('#fullscreen').addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('#game-shell').requestFullscreen(); }
  catch { toast('Fullscreen is unavailable here. The game still fits this viewport.'); }
  canvas.focus({ preventScroll: true });
});
document.addEventListener('fullscreenchange', () => { $('#fullscreen').setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen'); renderer.resize(); });
$('#sound').addEventListener('click', async () => {
  if (audio.enabled) audio.disable(); else if (!await audio.enable()) toast('Sound is unavailable in this browser.');
  $('#sound').textContent = audio.enabled ? 'Sound on' : 'Sound off'; $('#sound').setAttribute('aria-pressed', String(audio.enabled)); $('#sound').setAttribute('aria-label', audio.enabled ? 'Disable sound' : 'Enable sound');
  if (mode === 'playing') canvas.focus({ preventScroll: true });
});
$('#help').addEventListener('click', () => { clearInput(); pointer = null; $('#help-dialog').showModal(); });
for (const dialog of [$('#help-dialog'), $('#pause-dialog')]) dialog.addEventListener('close', () => { previousTime = 0; accumulator = 0; if (mode === 'playing') canvas.focus({ preventScroll: true }); });

document.querySelectorAll('[data-stamp]').forEach(button => {
  let origin = null, dragged = false;
  button.addEventListener('pointerdown', event => {
    if (button.disabled || event.button !== 0 || origin) return;
    dragged = false; select(button.dataset.stamp); origin = { x: event.clientX, y: event.clientY, id: event.pointerId }; button.setPointerCapture(event.pointerId); pointer = { ...point(event), drag: false };
  });
  button.addEventListener('pointermove', event => { if (!origin || origin.id !== event.pointerId) return; pointer = { ...point(event), drag: Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 9 }; if (pointer.drag) focus = matchingFrame(pointer); });
  button.addEventListener('pointerup', event => {
    if (!origin || origin.id !== event.pointerId) return; dragged = !!pointer?.drag; if (dragged) placeAt(matchingFrame(point(event))); origin = null; pointer = null; canvas.focus({ preventScroll: true });
  });
  button.addEventListener('pointercancel', () => { origin = null; pointer = null; });
  button.addEventListener('lostpointercapture', () => { origin = null; pointer = null; });
  button.addEventListener('click', () => { if (dragged) { dragged = false; return; } select(button.dataset.stamp); });
});
canvas.addEventListener('pointermove', event => { if (mode !== 'playing' || !selected) return; const index = matchingFrame(point(event)); if (index >= 0) focus = index; });
canvas.addEventListener('pointerdown', event => {
  if (mode !== 'playing' || event.button !== 0) return; canvas.focus({ preventScroll: true }); const p = point(event), index = hitSocket(p);
  if (index >= 0) { placeAt(index); return; }
  if (selected) {
    const field = game.level.sockets.findIndex(s => s.type === selected && p.x >= s.field.x && p.x <= s.field.x + s.field.w && p.y >= s.field.y && p.y <= s.field.y + s.field.h);
    if (field >= 0) placeAt(field);
  }
});
canvas.addEventListener('contextmenu', event => { event.preventDefault(); if (mode === 'playing' && selected) { game.reclaim(selected); syncControls(); } });

window.addEventListener('keydown', event => {
  if ($('#help-dialog').open || $('#pause-dialog').open) return;
  const key = event.key.toLowerCase(), target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
  if (mode !== 'playing') return;
  // Space/Enter on a focused native button keep their expected activation behavior.
  if (target instanceof HTMLButtonElement && (key === ' ' || key === 'enter')) return;
  const handled = ['a', 'd', 'w', 'arrowleft', 'arrowright', 'arrowup', ' ', '1', '2', '3', 'q', 'e', 'enter', 'backspace', 'r', 'z', 'escape', 'shift', 'x', 'f', 'm'];
  if (!handled.includes(key)) return; event.preventDefault(); keys.add(key); updateInput();
  if (event.repeat) return;
  if (key === 'shift' || key === 'x') queuedDash = true;
  if (key === 'f') queuedPulse = true;
  if ([' ', 'w', 'arrowup'].includes(key)) queuedJump = true;
  if (['1', '2', '3'].includes(key)) select(STAMPS[Number(key) - 1]);
  if (key === 'q' || key === 'e') {
    const options = game.level.sockets.map((s, i) => ({ s, i })).filter(({ s }) => !selected || s.type === selected).map(({ i }) => i);
    const next = options.indexOf(focus) + (key === 'e' ? 1 : -1); focus = options[(next + options.length) % options.length];
    toast(`${game.level.sockets[focus].type} frame ${focus + 1} selected. Enter to place.`);
  }
  if (key === 'enter') placeAt(focus);
  if (key === 'backspace' && selected) { game.reclaim(selected); syncControls(); }
  if (key === 'z') undoStamp();
  if (key === 'm') renderer.overview = !renderer.overview;
  if (key === 'escape') pauseGame();
  if (key === 'r') startRoom(game.index);
});
window.addEventListener('keyup', event => { keys.delete(event.key.toLowerCase()); updateInput(); });
window.addEventListener('blur', () => { clearInput(); pointer = null; });
document.addEventListener('visibilitychange', () => { clearInput(); previousTime = 0; accumulator = 0; });
new ResizeObserver(() => renderer.resize()).observe(canvas);
document.querySelectorAll('[data-control]').forEach(button => {
  button.addEventListener('pointerdown', event => { if (mode !== 'playing' || button.disabled || event.button !== 0) return; event.preventDefault(); button.setPointerCapture(event.pointerId); touches.set(event.pointerId, button.dataset.control); if (button.dataset.control === 'dash') queuedDash = true; if (button.dataset.control === 'pulse') queuedPulse = true; if (button.dataset.control === 'jump') queuedJump = true; button.classList.add('pressed'); updateInput(); });
  const up = event => { touches.delete(event.pointerId); if (![...touches.values()].includes(button.dataset.control)) button.classList.remove('pressed'); updateInput(); };
  button.addEventListener('pointerup', up); button.addEventListener('pointercancel', up); button.addEventListener('lostpointercapture', up);
  if (['dash', 'pulse'].includes(button.dataset.control)) button.addEventListener('click', event => { if (event.detail !== 0 || mode !== 'playing') return; if (button.dataset.control === 'dash') queuedDash = true; else queuedPulse = true; });
});

function frame(time) {
  if (!previousTime) previousTime = time;
  const elapsed = Math.min((time - previousTime) / 1000, .08); previousTime = time;
  if (mode === 'playing' && !$('#help-dialog').open && !$('#pause-dialog').open && !document.hidden) {
    accumulator += elapsed;
    while (accumulator >= 1 / 60 && mode === 'playing') { game.step({ ...input, jump: input.jump || queuedJump, dash: input.dash || queuedDash, pulse: input.pulse || queuedPulse }); queuedDash = queuedPulse = queuedJump = false; processEvents(); accumulator -= 1 / 60; }
  } else accumulator = 0;
  syncAbilities(); $('#map').setAttribute('aria-pressed', String(renderer.overview));
  const paused = !!document.querySelector('dialog[open]') || document.hidden;
  renderer.draw(game, { selected: mode === 'playing' ? selected : null, focus, pointer, preview: mode === 'intro', alpha: mode === 'playing' && !paused ? accumulator * 60 : 1, elapsed: paused ? 0 : elapsed }); requestAnimationFrame(frame);
}
progress(); syncControls(); requestAnimationFrame(frame);

if (new URLSearchParams(location.search).has('test')) {
  window.__POSTMARK__ = { game, startRoom, placeAt, select, get mode() { return mode; }, get selected() { return selected; }, get focus() { return focus; }, get input() { return { ...input }; }, renderer };
}
