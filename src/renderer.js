import { WIDTH, HEIGHT } from './levels.js';

const C = { ink: '#314957', paper: '#e5e9e7', edge: '#a4b1af', ocean: '#4d8fa6', forest: '#698f71', sky: '#929aba', gold: '#c6944b' };
function path(ctx, points, close = true) { ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); if (close) ctx.closePath(); }
function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function cover(ctx, image, x, y, w, h) {
  const scale = Math.max(w / image.width, h / image.height);
  ctx.drawImage(image, x + (w - image.width * scale) / 2, y + (h - image.height * scale) / 2, image.width * scale, image.height * scale);
}

export function landscape(ctx, type, x, y, w, h, image) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (image) { cover(ctx, image, x, y, w, h); ctx.restore(); return; }
  // Original procedural artwork is an honest fallback until DreamLayer PNGs are generated.
  ctx.translate(x, y); ctx.scale(w / 300, h / 200);
  const random = rng(type === 'ocean' ? 19 : type === 'forest' ? 83 : 37);
  const gradients = { ocean: ['#acc6c7', '#dce0ca'], forest: ['#bdcbb7', '#789b85'], sky: ['#7e96ae', '#e3c5a3'] };
  const g = ctx.createLinearGradient(0, 0, 0, 200); g.addColorStop(0, gradients[type][0]); g.addColorStop(1, gradients[type][1]); ctx.fillStyle = g; ctx.fillRect(0, 0, 300, 200);
  ctx.fillStyle = type === 'sky' ? '#f4dfb0' : '#e8dfb0'; ctx.beginPath(); ctx.arc(type === 'ocean' ? 219 : 208, type === 'sky' ? 56 : 49, type === 'sky' ? 23 : 19, 0, Math.PI * 2); ctx.fill();
  if (type === 'ocean') {
    for (let layer = 0; layer < 4; layer++) {
      ctx.fillStyle = ['#8aafaf', '#729b9f', '#508898', '#356d83'][layer];
      ctx.beginPath(); ctx.moveTo(0, 83 + layer * 27);
      for (let i = 0; i <= 300; i += 5) ctx.lineTo(i, 83 + layer * 27 + Math.sin(i * .025 + layer * 2) * (5 + layer * 3));
      ctx.lineTo(300, 200); ctx.lineTo(0, 200); ctx.fill();
    }
    ctx.strokeStyle = '#bed1c8'; ctx.lineWidth = .7;
    for (let i = 0; i < 39; i++) { const xx = random() * 300, yy = 96 + random() * 98; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.quadraticCurveTo(xx + 8, yy - 3, xx + 20 + random() * 17, yy); ctx.stroke(); }
    ctx.fillStyle = '#405f68'; path(ctx, [[39, 200], [50, 128], [71, 87], [77, 88], [84, 132], [91, 200]]); ctx.fill();
    ctx.fillStyle = '#dfd9bd'; ctx.fillRect(63, 74, 14, 55); ctx.fillStyle = '#8f5746'; path(ctx, [[59, 76], [70, 65], [81, 76]]); ctx.fill();
    ctx.fillStyle = '#3b5c67'; ctx.fillRect(67, 81, 6, 7); ctx.strokeStyle = '#5f7880'; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(142 + i * 22, 38 + i % 2 * 8); ctx.quadraticCurveTo(147 + i * 22, 33 + i % 2 * 8, 152 + i * 22, 38 + i % 2 * 8); ctx.stroke(); }
  } else if (type === 'forest') {
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = ['#91ab95', '#648d7a', '#3d6c5c'][layer];
      for (let i = 0; i < 12; i++) {
        const xx = i * 29 - 11 + random() * 10, base = 170 + layer * 12, top = 45 + random() * 60 - layer * 4;
        path(ctx, [[xx - 18 - layer * 5, base], [xx - 8, top + 30], [xx - 14, top + 33], [xx, top], [xx + 14, top + 33], [xx + 8, top + 30], [xx + 18 + layer * 5, base]]); ctx.fill();
        ctx.fillRect(xx - 1.5, top + 29, 3, 153);
      }
    }
    ctx.fillStyle = '#afbd96'; path(ctx, [[116, 200], [150, 126], [163, 126], [160, 200]]); ctx.fill();
    for (let i = 0; i < 25; i++) { ctx.fillStyle = i % 2 ? '#bacbaa' : '#dcd8a9'; ctx.beginPath(); ctx.arc(random() * 300, 40 + random() * 150, .8 + random(), 0, 7); ctx.fill(); }
  } else {
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = ['#c6c9c9', '#ded9ca', '#efdfc7'][layer];
      for (let i = 0; i < 8; i++) {
        const xx = random() * 350 - 25, yy = 70 + layer * 43 + random() * 12;
        ctx.beginPath(); ctx.ellipse(xx, yy, 38 + random() * 25, 8 + random() * 13, 0, 0, 7); ctx.fill();
      }
    }
    ctx.fillStyle = '#607b91'; path(ctx, [[18, 177], [54, 125], [71, 151], [88, 107], [114, 177]]); ctx.fill();
    ctx.strokeStyle = '#687789'; ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) { const xx = 140 + i * 22, yy = 30 + i % 3 * 13; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.quadraticCurveTo(xx + 4, yy - 4, xx + 8, yy); ctx.quadraticCurveTo(xx + 12, yy - 4, xx + 16, yy); ctx.stroke(); }
  }
  ctx.globalAlpha = .09;
  for (let i = 0; i < 2000; i++) { ctx.fillStyle = random() > .5 ? '#132631' : '#ffffff'; ctx.fillRect(random() * 300, random() * 200, .4 + random() * .5, .4); }
  ctx.restore();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.images = {}; this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.particles = []; this.tick = 0;
    this.backdrop = document.createElement('canvas'); this.backdrop.width = WIDTH; this.backdrop.height = HEIGHT;
    this.drawBackdrop(this.backdrop.getContext('2d'));
    this.resize();
  }

  resize() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = WIDTH * ratio; this.canvas.height = HEIGHT * ratio;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  async loadArt() {
    const manifest = await fetch('./assets/manifest.json').then(r => r.ok ? r.json() : null).catch(() => null);
    for (const asset of manifest?.assets ?? []) {
      if (!asset.file || !['ocean', 'forest', 'sky'].includes(asset.id)) continue;
      await new Promise(resolve => { const image = new Image(); image.onload = () => { this.images[asset.id] = image; resolve(); }; image.onerror = resolve; image.src = `./assets/${asset.file}`; });
    }
    this.thumbnails();
  }

  thumbnails() {
    document.querySelectorAll('[data-art]').forEach(el => {
      el.replaceChildren(); const canvas = document.createElement('canvas'); canvas.width = 270; canvas.height = 132;
      landscape(canvas.getContext('2d'), el.dataset.art, 0, 0, 270, 132, this.images[el.dataset.art]); el.append(canvas);
    });
  }

  drawBackdrop(ctx) {
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const random = rng(21);
    for (let i = 0; i < 22000; i++) { ctx.globalAlpha = random() * .065; ctx.fillStyle = random() > .5 ? '#fff' : '#163340'; ctx.fillRect(random() * WIDTH, random() * HEIGHT, random() * 2 + .5, .5); }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#b7c1be'; ctx.lineWidth = 1; ctx.strokeRect(25.5, 25.5, 1049, 569);
    ctx.strokeRect(32.5, 32.5, 1035, 555);
    ctx.fillStyle = '#c4ccca'; ctx.font = '11px "Courier New", monospace'; ctx.fillText('POSTMARK / DEPARTMENT OF UNDELIVERABLE PLACES', 51, 74);
    ctx.save(); ctx.translate(957, 510); ctx.rotate(-.18); ctx.strokeStyle = '#8c9d9b'; ctx.globalAlpha = .3;
    for (const r of [42, 46]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); }
    ctx.font = 'bold 11px "Courier New", monospace'; ctx.fillStyle = '#577476'; ctx.textAlign = 'center'; ctx.fillText('NIGHT SHIFT', 0, -8); ctx.fillText('RETURN TO', 0, 6); ctx.fillText('SOMEWHERE', 0, 20);
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-54, -15 + i * 10); ctx.bezierCurveTo(-90, -36 + i * 10, -113, -3 + i * 10, -151, -15 + i * 10); ctx.stroke(); }
    ctx.restore();
  }

  burst(x, y, type) {
    if (this.reducedMotion) return;
    const random = rng(Math.floor(x + y));
    for (let i = 0; i < 14; i++) this.particles.push({ x, y, vx: (random() - .5) * 120, vy: -random() * 90 - 15, life: 1, color: C[type] ?? C.gold });
  }

  draw(game, { selected = null, focus = -1, preview = false, pointer = null } = {}) {
    const ctx = this.ctx; this.tick = this.reducedMotion ? 0 : game.time;
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.clearRect(0, 0, WIDTH, HEIGHT); ctx.drawImage(this.backdrop, 0, 0);
    this.address(game);
    for (const socket of game.level.sockets) this.field(game, socket, selected, focus);
    this.route(game);
    for (const platform of game.level.platforms) this.platform(platform);
    for (const platform of game.floats) this.crate(platform);
    for (const socket of game.level.sockets) if (socket.bridge && game.active('forest', socket)) this.root(socket.bridge);
    if (game.index === 3) this.home(979, 118);
    this.envelope(game.level.goal.x, game.level.goal.y, game.delivered);
    this.courier(game.player, preview);
    for (const [index, socket] of game.level.sockets.entries()) this.socket(game, socket, index, selected, focus);
    this.drawParticles();
    if (pointer?.drag && selected) {
      ctx.save(); ctx.globalAlpha = .8; ctx.fillStyle = '#f2f0e7'; ctx.fillRect(pointer.x - 36, pointer.y - 27, 72, 54);
      landscape(ctx, selected, pointer.x - 31, pointer.y - 22, 62, 35, this.images[selected]); ctx.fillStyle = C.ink; ctx.font = '10px Georgia'; ctx.textAlign = 'center'; ctx.fillText(selected.toUpperCase(), pointer.x, pointer.y + 22); ctx.restore();
    }
    ctx.restore();
  }

  address(game) {
    const ctx = this.ctx;
    ctx.save(); ctx.fillStyle = '#748b8e'; ctx.font = 'italic 15px Georgia'; ctx.fillText('Please deliver to:', 61, 113);
    ctx.fillStyle = '#536b70'; ctx.font = '19px Georgia';
    game.level.address.split('\n').forEach((line, i) => ctx.fillText(line, 61, 142 + i * 25));
    ctx.font = '11px "Courier New", monospace'; ctx.fillStyle = '#8a9c9d'; ctx.fillText(`${String(game.index + 1).padStart(2, '0')} / 04`, 991, 74); ctx.restore();
  }

  field(game, socket, selected) {
    const ctx = this.ctx, r = socket.field, active = game.active(socket.type, socket);
    ctx.save();
    if (active) {
      ctx.globalAlpha = socket.type === 'sky' ? .43 : .26;
      landscape(ctx, socket.type, r.x, r.y, r.w, r.h, this.images[socket.type]); ctx.globalAlpha = 1;
      ctx.strokeStyle = C[socket.type]; ctx.lineWidth = 1.3; ctx.strokeRect(r.x, r.y, r.w, r.h);
      if (socket.type === 'ocean') {
        const floating = game.floats.find(p => p.id === socket.id), waterY = Math.min(r.y + r.h - 7, floating.y + 35);
        const g = ctx.createLinearGradient(0, waterY, 0, r.y + r.h); g.addColorStop(0, '#619dad9f'); g.addColorStop(1, '#397b93c9');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(r.x, waterY);
        for (let x = r.x; x <= r.x + r.w; x += 6) ctx.lineTo(x, waterY + Math.sin(x * .05 + this.tick * 2) * 3);
        ctx.lineTo(r.x + r.w, r.y + r.h); ctx.lineTo(r.x, r.y + r.h); ctx.fill();
        ctx.strokeStyle = '#c3e3df'; ctx.globalAlpha = .6;
        for (let i = 0; i < 7; i++) { const xx = r.x + 12 + i * 42, yy = Math.min(r.y + r.h - 10, waterY + 20 + i % 3 * 16); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 24, yy); ctx.stroke(); }
      }
      if (socket.type === 'sky') {
        ctx.fillStyle = '#5a7192'; ctx.globalAlpha = .5; ctx.font = '19px Georgia'; ctx.textAlign = 'center';
        for (let x = r.x + 30; x < r.x + r.w; x += 63) for (let y = r.y + 40; y < r.y + r.h; y += 110) ctx.fillText('↑', x, y - (this.tick * 14 % 25));
      }
    } else {
      ctx.strokeStyle = selected === socket.type ? `${C[socket.type]}b0` : '#899fa15a'; ctx.lineWidth = 1; ctx.setLineDash([5, 7]); ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.setLineDash([]);
    }
    ctx.restore();
  }

  route(game) {
    const ctx = this.ctx;
    ctx.save(); ctx.strokeStyle = '#a5b1ad'; ctx.lineWidth = 1; ctx.setLineDash([3, 7]); ctx.globalAlpha = .35;
    ctx.beginPath(); ctx.moveTo(140, 519); ctx.bezierCurveTo(350, 526, 410, 303, game.level.goal.x - 10, game.level.goal.y + 50); ctx.stroke(); ctx.restore();
  }

  platform(p) {
    const ctx = this.ctx;
    ctx.fillStyle = '#b7c2bd'; ctx.fillRect(p.x + 3, p.y + 7, p.w, p.h + 5);
    ctx.fillStyle = '#ecede5'; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = '#4f686b'; ctx.lineWidth = 1.6; ctx.strokeRect(p.x + .5, p.y + .5, p.w, p.h);
    ctx.fillStyle = '#80958e'; ctx.fillRect(p.x, p.y, p.w, 3);
    ctx.strokeStyle = '#b4bfb4'; ctx.lineWidth = .7;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(p.x + 5, p.y + 8 + i * 4); ctx.lineTo(p.x + p.w - 5, p.y + 8 + i * 4); ctx.stroke(); }
    ctx.fillStyle = '#687f78'; for (const x of [p.x + 8, p.x + p.w - 10]) ctx.fillRect(x, p.y + 5, 2, 3);
  }

  crate(p) {
    const ctx = this.ctx;
    ctx.fillStyle = '#c6ae7d'; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = '#6e6d53'; ctx.lineWidth = 1.5; ctx.strokeRect(p.x + .5, p.y + .5, p.w, p.h);
    for (let x = p.x + 10; x < p.x + p.w; x += 24) { ctx.beginPath(); ctx.moveTo(x, p.y + 2); ctx.lineTo(x, p.y + p.h - 2); ctx.stroke(); }
    ctx.fillStyle = '#a28e63'; ctx.fillRect(p.x - 2, p.y + 4, p.w + 4, 3); ctx.fillRect(p.x - 2, p.y + 17, p.w + 4, 3);
    ctx.fillStyle = '#e0d2b0'; ctx.fillRect(p.x + p.w / 2 - 11, p.y + 6, 22, 10); ctx.font = '7px monospace'; ctx.fillStyle = '#6b725c'; ctx.textAlign = 'center'; ctx.fillText('FLOAT', p.x + p.w / 2, p.y + 13);
  }

  root(p) {
    const ctx = this.ctx;
    ctx.save(); ctx.strokeStyle = '#476c58'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y + 8);
    ctx.bezierCurveTo(p.x + p.w * .3, p.y - 2, p.x + p.w * .6, p.y + 17, p.x + p.w, p.y + 7); ctx.stroke();
    ctx.strokeStyle = '#95aa79'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = '#68855e'; ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const x = p.x + i * p.w / 12;
      ctx.beginPath(); ctx.moveTo(x, p.y + 8); ctx.quadraticCurveTo(x + 8, p.y + 23, x + 22, p.y + 12); ctx.stroke();
      ctx.fillStyle = i % 2 ? '#779a68' : '#a2b783'; ctx.beginPath(); ctx.ellipse(x + 11, p.y + 4, 6, 2.8, -.55, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  socket(game, socket, index, selected, focus) {
    const ctx = this.ctx, active = game.active(socket.type, socket), size = 62;
    ctx.save(); ctx.translate(socket.x, socket.y);
    if (focus === index || selected === socket.type) { ctx.fillStyle = `${C[socket.type]}1a`; ctx.fillRect(-40, -36, 80, 83); }
    ctx.strokeStyle = active ? C[socket.type] : '#778e91'; ctx.lineWidth = focus === index ? 2.5 : 1.2;
    if (!active) ctx.setLineDash([3, 4]);
    ctx.strokeRect(-size / 2, -size / 2, size, size); ctx.setLineDash([]);
    if (active) {
      ctx.fillStyle = '#eeeee4'; ctx.fillRect(-30, -30, 60, 60);
      for (let i = -24; i <= 24; i += 9) { ctx.fillStyle = C.paper; for (const [x, y] of [[-31, i], [31, i], [i, -31], [i, 31]]) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill(); } }
      landscape(ctx, socket.type, -25, -25, 50, 37, this.images[socket.type]);
      ctx.fillStyle = C.ink; ctx.font = '9px Georgia'; ctx.textAlign = 'center'; ctx.fillText('BORROWED', 0, 24);
      ctx.strokeStyle = '#2348526a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(17, 12, 21, 0, 7); ctx.stroke();
    } else {
      ctx.fillStyle = C[socket.type]; ctx.font = '23px Georgia'; ctx.textAlign = 'center'; ctx.fillText({ ocean: '≈', forest: '♧', sky: '↑' }[socket.type], 0, 7);
    }
    ctx.fillStyle = '#3e6068'; ctx.font = '11px "Trebuchet MS"'; ctx.textAlign = 'center'; ctx.fillText(`${socket.type[0].toUpperCase() + socket.type.slice(1)}${game.level.sockets.filter(s => s.type === socket.type).length > 1 ? ` ${index + 1}` : ''}`, 0, 48);
    ctx.restore();
  }

  envelope(x, y, delivered) {
    const ctx = this.ctx, bob = Math.sin(this.tick * 2) * 2;
    ctx.save(); ctx.translate(x, y + bob);
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 42); glow.addColorStop(0, '#ecd29290'); glow.addColorStop(1, '#ecd29200'); ctx.fillStyle = glow; ctx.fillRect(-42, -42, 84, 84);
    ctx.rotate(-.08); ctx.fillStyle = delivered ? '#d1dcc3' : '#f6eed5'; ctx.fillRect(-21, -13, 42, 27);
    ctx.strokeStyle = '#7f876a'; ctx.lineWidth = 1.3; ctx.strokeRect(-21, -13, 42, 27);
    ctx.beginPath(); ctx.moveTo(-21, -13); ctx.lineTo(0, 2); ctx.lineTo(21, -13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-21, 14); ctx.lineTo(-5, 0); ctx.moveTo(21, 14); ctx.lineTo(5, 0); ctx.stroke();
    ctx.fillStyle = '#b36c59'; ctx.beginPath(); ctx.arc(0, 3, 3, 0, 7); ctx.fill();
    ctx.rotate(.08); ctx.fillStyle = '#556f72'; ctx.font = '10px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillText(delivered ? 'DELIVERED' : 'THE LETTER', 0, 34); ctx.restore();
  }

  courier(a) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(a.x + a.w / 2, a.y + a.h / 2); ctx.scale(a.facing, a.gravity);
    const walk = a.grounded && Math.abs(a.vx) > 20 ? Math.sin(this.tick * 16) * 3 : 0;
    if (a.grounded && a.gravity === 1) { ctx.fillStyle = '#31495722'; ctx.beginPath(); ctx.ellipse(0, 17, 15, 3, 0, 0, 7); ctx.fill(); }
    ctx.lineWidth = 2; ctx.strokeStyle = '#425b61'; ctx.beginPath(); ctx.moveTo(-4, 10); ctx.lineTo(-5 + walk, 16); ctx.moveTo(4, 10); ctx.lineTo(5 - walk, 16); ctx.stroke();
    ctx.fillStyle = '#f2eedc'; path(ctx, [[-10, -6], [9, -6], [11, 12], [-11, 12]]); ctx.fill(); ctx.strokeStyle = '#647f80'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(1, 5); ctx.lineTo(9, -6); ctx.stroke();
    ctx.fillStyle = '#edebd9'; ctx.fillRect(-6, -16, 13, 11); ctx.strokeRect(-6, -16, 13, 11);
    ctx.fillStyle = '#416779'; path(ctx, [[-9, -14], [-5, -20], [6, -20], [9, -14]]); ctx.fill(); ctx.fillRect(-8, -15, 19, 3);
    ctx.fillStyle = '#344f59'; ctx.fillRect(3, -11, 2, 2);
    ctx.strokeStyle = '#a37658'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-7, -5); ctx.lineTo(9, 9); ctx.stroke();
    ctx.fillStyle = '#bc7957'; ctx.fillRect(6, 4, 8, 8); ctx.fillStyle = '#e6d4ac'; ctx.fillRect(8, 6, 4, 1); ctx.restore();
  }

  home(x, y) {
    const ctx = this.ctx;
    ctx.save(); ctx.globalAlpha = .5; ctx.fillStyle = '#d5ceaa'; ctx.fillRect(x - 21, y + 26, 46, 45);
    ctx.fillStyle = '#78918a'; path(ctx, [[x - 28, y + 27], [x + 2, y + 2], [x + 33, y + 27]]); ctx.fill();
    ctx.fillStyle = '#bc9e61'; ctx.fillRect(x - 13, y + 38, 12, 12); ctx.fillStyle = '#758c84'; ctx.fillRect(x + 9, y + 44, 10, 27); ctx.restore();
  }

  drawParticles() {
    const ctx = this.ctx;
    for (const particle of this.particles) {
      particle.x += particle.vx / 60; particle.y += particle.vy / 60; particle.vy += 1.4; particle.life -= .023;
      ctx.save(); ctx.globalAlpha = Math.max(0, particle.life); ctx.fillStyle = particle.color; ctx.translate(particle.x, particle.y); ctx.rotate(particle.life * 3); ctx.fillRect(-2, -1, 4, 3); ctx.restore();
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }
}
