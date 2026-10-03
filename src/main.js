import { Game } from './engine.js';
import { Renderer } from './renderer.js';
import { Audio } from './audio.js';
import { LEVELS, WIDTH, HEIGHT, STAMPS } from './levels.js';

const $ = selector => document.querySelector(selector);
const canvas = $('#game'), game = new Game(), renderer = new Renderer(canvas), audio = new Audio();
const input = { left: false, right: false, jump: false };
const keys = new Set();
const touches = new Set();
let mode = 'intro', selected = null, focus = -1, pointer = null, toastTimer, deliveryTimer, accumulator = 0, previousTime = 0, lastRoom = 0;
try { const saved = Number(localStorage.getItem('postmark-room')); if (Number.isInteger(saved) && saved > 0 && saved < LEVELS.length) lastRoom = saved; } catch {}
if (lastRoom) $('#start').firstChild.textContent = 'Continue your shift ';
renderer.thumbnails(); renderer.loadArt();

function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2700); }
function syncControls() {
  document.querySelectorAll('[data-stamp]').forEach(button => {
    const type = button.dataset.stamp;
    button.disabled = mode !== 'playing' || !game.level.available.includes(type);
    button.setAttribute('aria-pressed', String(selected === type));
    button.setAttribute('aria-label', `${type[0].toUpperCase() + type.slice(1)} stamp, key ${STAMPS.indexOf(type) + 1}. ${game.placements[type] ? 'Placed. Select to move or reclaim.' : button.querySelector('small').textContent + '.'}`);
  });
  $('#reclaim').disabled = mode !== 'playing' || !selected || !game.placements[selected];
  $('#selection-hint').textContent = selected ? `${selected[0].toUpperCase() + selected.slice(1)} selected. Choose its dotted frame.` : 'Select a stamp, then a dotted frame.';
}
function select(type) {
  if (mode !== 'playing' || !game.level.available.includes(type)) return;
  selected = type; focus = game.level.sockets.findIndex(s => s.type === type); syncControls(); canvas.focus({ preventScroll: true });
}
function startRoom(index) {
  clearTimeout(deliveryTimer); game.load(index); mode = 'playing'; selected = null; focus = -1; pointer = null; clearInput();
  $('#intro').hidden = true; $('#delivery').hidden = true; $('#restart').hidden = false;
  $('#room-number').textContent = `Letter ${index + 1} of 4 · ${game.level.subtitle}`;
  $('#room-title').textContent = game.level.title; $('#room-hint').textContent = game.level.hint; $('#delivery-progress').textContent = `${index} / 4 delivered`;
  try { localStorage.setItem('postmark-room', String(index)); } catch {}
  syncControls(); canvas.focus({ preventScroll: true }); accumulator = 0;
}
function delivered() {
  mode = 'delivering'; clearInput(); syncControls(); $('#delivery-progress').textContent = `${game.index + 1} / 4 delivered`;
  deliveryTimer = setTimeout(() => {
    mode = 'letter'; $('#delivery-title').textContent = game.level.letter.title; $('#delivery-copy').textContent = game.level.letter.body;
    $('#delivery-label').textContent = game.index === 3 ? 'Address found. Shift complete.' : 'Delivered, at last.';
    $('#next').firstChild.textContent = game.index === 3 ? 'Play another shift ' : 'Open next letter ';
    $('#delivery').hidden = false; $('#next').focus({ preventScroll: true });
    if (game.index === 3) { try { localStorage.removeItem('postmark-room'); } catch {} }
  }, renderer.reducedMotion ? 50 : 650);
}
function processEvents() {
  for (const event of game.drainEvents()) {
    audio.play(event.type);
    if (event.type === 'stamp') { const socket = game.level.sockets.find(s => s.id === event.id); renderer.burst(socket.x, socket.y, event.stamp); }
    if (event.type === 'fall') {
      syncControls();
      toast('A little tumble. Your letter is still waiting.');
    }
    if (event.type === 'delivered') { renderer.burst(game.level.goal.x, game.level.goal.y, 'gold'); delivered(); }
  }
}
function clearInput() { keys.clear(); touches.clear(); input.left = input.right = input.jump = false; document.querySelectorAll('.pressed').forEach(b => b.classList.remove('pressed')); }
function updateInput() { input.left = keys.has('a') || keys.has('arrowleft') || touches.has('left'); input.right = keys.has('d') || keys.has('arrowright') || touches.has('right'); input.jump = keys.has(' ') || keys.has('w') || keys.has('arrowup') || touches.has('jump'); }

function placeAt(index) {
  if (!selected || mode !== 'playing') { if (mode === 'playing') toast('Choose a stamp from the tray first.'); return false; }
  const socket = game.level.sockets[index];
  if (!socket || socket.type !== selected) { toast('That frame needs a different world.'); return false; }
  const result = game.place(selected, socket.id); if (result) { focus = index; syncControls(); } return result;
}
function point(event) { const r = canvas.getBoundingClientRect(); return { x: (event.clientX - r.left) / r.width * WIDTH, y: (event.clientY - r.top) / r.height * HEIGHT }; }
function hitSocket(p) { return game.level.sockets.findIndex(s => Math.abs(s.x - p.x) <= 52 && Math.abs(s.y - p.y) <= 59); }

$('#start').addEventListener('click', () => startRoom(lastRoom));
$('#next').addEventListener('click', () => startRoom(game.index === 3 ? 0 : game.index + 1));
$('#restart').addEventListener('click', () => startRoom(game.index));
$('#reclaim').addEventListener('click', () => { if (selected) game.reclaim(selected); syncControls(); canvas.focus({ preventScroll: true }); });
$('#sound').addEventListener('click', async () => {
  if (audio.enabled) audio.disable(); else if (!await audio.enable()) toast('Sound is unavailable in this browser.');
  $('#sound').textContent = audio.enabled ? 'Sound on' : 'Sound off'; $('#sound').setAttribute('aria-pressed', String(audio.enabled)); $('#sound').setAttribute('aria-label', audio.enabled ? 'Disable sound' : 'Enable sound');
  if (mode === 'playing') canvas.focus({ preventScroll: true });
});
$('#help').addEventListener('click', () => { clearInput(); $('#help-dialog').showModal(); });
$('#help-dialog').addEventListener('close', () => { previousTime = 0; accumulator = 0; if (mode === 'playing') canvas.focus({ preventScroll: true }); });

document.querySelectorAll('[data-stamp]').forEach(button => {
  let origin = null;
  button.addEventListener('pointerdown', event => {
    if (button.disabled || event.button !== 0) return;
    select(button.dataset.stamp); origin = { x: event.clientX, y: event.clientY }; button.setPointerCapture(event.pointerId); pointer = { ...point(event), drag: false };
  });
  button.addEventListener('pointermove', event => { if (!origin) return; pointer = { ...point(event), drag: Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 9 }; });
  button.addEventListener('pointerup', event => {
    if (!origin) return; if (pointer?.drag) placeAt(hitSocket(point(event))); origin = null; pointer = null; canvas.focus({ preventScroll: true });
  });
  button.addEventListener('pointercancel', () => { origin = null; pointer = null; });
  button.addEventListener('click', () => select(button.dataset.stamp));
});
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
  if ($('#help-dialog').open) return;
  const key = event.key.toLowerCase(), target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
  if (mode !== 'playing') return;
  // Space/Enter on a focused native button keep their expected activation behavior.
  if (target instanceof HTMLButtonElement && (key === ' ' || key === 'enter')) return;
  const handled = ['a', 'd', 'w', 'arrowleft', 'arrowright', 'arrowup', ' ', '1', '2', '3', 'q', 'e', 'enter', 'backspace', 'r'];
  if (!handled.includes(key)) return; event.preventDefault(); keys.add(key); updateInput();
  if (event.repeat) return;
  if (['1', '2', '3'].includes(key)) select(STAMPS[Number(key) - 1]);
  if (key === 'q' || key === 'e') {
    const options = game.level.sockets.map((s, i) => ({ s, i })).filter(({ s }) => !selected || s.type === selected).map(({ i }) => i);
    const next = options.indexOf(focus) + (key === 'e' ? 1 : -1); focus = options[(next + options.length) % options.length];
    toast(`${game.level.sockets[focus].type} frame ${focus + 1} selected. Enter to place.`);
  }
  if (key === 'enter') placeAt(focus);
  if (key === 'backspace' && selected) { game.reclaim(selected); syncControls(); }
  if (key === 'r') startRoom(game.index);
});
window.addEventListener('keyup', event => { keys.delete(event.key.toLowerCase()); updateInput(); });
window.addEventListener('blur', () => { clearInput(); pointer = null; });
document.addEventListener('visibilitychange', () => { clearInput(); previousTime = 0; accumulator = 0; });
window.addEventListener('resize', () => renderer.resize());
document.querySelectorAll('[data-control]').forEach(button => {
  button.addEventListener('pointerdown', event => { if (mode !== 'playing') return; event.preventDefault(); button.setPointerCapture(event.pointerId); touches.add(button.dataset.control); button.classList.add('pressed'); updateInput(); });
  const up = () => { touches.delete(button.dataset.control); button.classList.remove('pressed'); updateInput(); };
  button.addEventListener('pointerup', up); button.addEventListener('pointercancel', up); button.addEventListener('lostpointercapture', up);
});

function frame(time) {
  if (!previousTime) previousTime = time;
  const elapsed = Math.min((time - previousTime) / 1000, .08); previousTime = time;
  if (mode === 'playing' && !$('#help-dialog').open && !document.hidden) {
    accumulator += elapsed;
    while (accumulator >= 1 / 60 && mode === 'playing') { game.step(input); processEvents(); accumulator -= 1 / 60; }
  } else accumulator = 0;
  renderer.draw(game, { selected, focus, pointer, preview: mode === 'intro' }); requestAnimationFrame(frame);
}
syncControls(); requestAnimationFrame(frame);

if (new URLSearchParams(location.search).has('test')) {
  window.__POSTMARK__ = { game, startRoom, placeAt, select, get mode() { return mode; }, get selected() { return selected; }, get input() { return { ...input }; }, renderer };
}
