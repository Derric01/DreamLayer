import { LEVELS, WIDTH, HEIGHT } from './levels.js';

export const PHYSICS = Object.freeze({
  speed: 245, acceleration: 2450, gravity: 1250, jump: 455, terminal: 650,
  floatSpeed: 88, coyote: .11, buffer: .13,
  dashSpeed: 490, dashDuration: .15, dashCooldown: .4, pulseCooldown: .85
});
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const inside = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const toward = (a, b, step) => a < b ? Math.min(b, a + step) : Math.max(b, a - step);

export class Game {
  constructor(index = 0) { this.load(index); }

  load(index) {
    if (!Number.isInteger(index) || index < 0 || index >= LEVELS.length) throw new RangeError('Unknown room');
    this.index = index;
    this.level = LEVELS[index];
    this.placements = { ocean: null, forest: null, sky: null };
    this.history = [];
    this.floats = this.level.sockets.filter(s => s.float).map(s => ({ ...s.float, id: s.id, baseY: s.float.y, kind: 'float' }));
    this.time = 0;
    this.deaths = 0;
    this.moves = 0;
    this.delivered = false;
    this.events = [];
    this.jumpWasDown = false;
    this.dashWasDown = false;
    this.pulseWasDown = false;
    this.checkpoint = null;
    this.collected = new Set();
    this.skyRelease = 0;
    this.pulseCooldown = 0;
    this.spawn();
  }

  spawn() {
    this.player = { ...(this.checkpoint?.spawn ?? this.level.spawn), w: 23, h: 32, vx: 0, vy: 0, grounded: false, gravity: 1, coyote: 0, jumpBuffer: 0, facing: 1, riding: null, dashTime: 0, dashCooldown: 0, dashAvailable: true };
    this.previousPlayer = { ...this.player };
    this.skyRelease = 0;
    this.events.push({ type: 'spawn' });
  }

  place(type, id) {
    if (this.delivered || !this.level.available.includes(type)) return false;
    const socket = this.level.sockets.find(s => s.id === id);
    if (!socket || socket.type !== type || this.placements[type] === id) return false;
    this.rememberStamps();
    this.placements[type] = id;
    this.moves++;
    this.events.push({ type: 'stamp', stamp: type, id });
    return true;
  }

  reclaim(type) {
    if (this.delivered || !this.placements[type]) return false;
    this.rememberStamps();
    this.placements[type] = null;
    this.moves++;
    this.events.push({ type: 'reclaim', stamp: type });
    return true;
  }

  rememberStamps() {
    this.history.push({ ...this.placements });
    if (this.history.length > 64) this.history.shift();
  }

  get canUndo() { return !this.delivered && this.history.length > 0; }

  undo() {
    if (!this.canUndo) return false;
    this.placements = this.history.pop();
    this.moves++;
    this.events.push({ type: 'undo' });
    return true;
  }

  active(type, socket) { return this.placements[type] === socket.id; }
  gravityAt(x, y) {
    const socket = this.level.sockets.find(s => this.active('sky', s));
    return socket && inside(x, y, socket.field) && this.skyRelease <= 0 ? -1 : 1;
  }

  ability() {
    const a = this.player, x = a.x + a.w / 2, y = a.y + a.h / 2;
    const worlds = this.level.sockets.filter(s => this.active(s.type, s) && inside(x, y, s.field));
    const socket = worlds.find(s => s.type === 'forest' && a.grounded && a.riding === s.id) ?? worlds.find(s => s.type === 'sky') ?? worlds.find(s => s.type === 'ocean') ?? worlds[0];
    if (!socket) return { name: 'Enter a borrowed world', ready: false, type: null };
    const ready = !this.delivered && this.pulseCooldown <= 0 && (socket.type !== 'forest' || (a.grounded && a.riding === socket.id));
    return { type: socket.type, name: { ocean: 'Tide vault', forest: 'Root spring', sky: 'Sky release' }[socket.type], ready };
  }

  pulse() {
    const ability = this.ability();
    if (!ability.ready) return false;
    const a = this.player;
    if (ability.type === 'sky') { this.skyRelease = .65; a.gravity = 1; a.vy = 95; }
    else { a.vy = -(ability.type === 'ocean' ? 610 : 660); a.gravity = 1; }
    a.grounded = false; a.coyote = 0; a.riding = null; a.dashTime = 0; a.dashAvailable = true;
    this.pulseCooldown = PHYSICS.pulseCooldown;
    this.events.push({ type: 'pulse', world: ability.type, name: ability.name, x: a.x + a.w / 2, y: a.y + a.h / 2 });
    return true;
  }

  platforms() {
    const roots = this.level.sockets.filter(s => s.bridge && this.active('forest', s)).map(s => ({ ...s.bridge, kind: 'root', id: s.id }));
    return [...this.level.platforms, ...this.floats, ...roots, { x: 40, y: 32, w: 1020, h: 9, kind: 'ceiling' }];
  }

  step(input = {}, dt = 1 / 60) {
    if (!Number.isFinite(dt) || dt <= 0 || dt > .05) throw new RangeError('Simulation step must be between 0 and 0.05 seconds');
    if (this.delivered) return;
    this.time += dt;
    const a = this.player;
    this.previousPlayer = { ...a };
    this.skyRelease = Math.max(0, this.skyRelease - dt);
    this.pulseCooldown = Math.max(0, this.pulseCooldown - dt);
    a.dashTime = Math.max(0, a.dashTime - dt);
    a.dashCooldown = Math.max(0, a.dashCooldown - dt);
    // Float movement carries a rider; ordinary collision handles every other contact.
    for (const platform of this.floats) {
      const target = this.placements.ocean === platform.id ? platform.targetY : platform.baseY;
      const before = platform.y;
      platform.y = toward(platform.y, target, PHYSICS.floatSpeed * dt);
      if (a.riding === platform.id && a.grounded) a.y += platform.y - before;
    }
    const previousGravity = a.gravity;
    a.gravity = this.gravityAt(a.x + a.w / 2, a.y + a.h / 2);
    if (previousGravity !== a.gravity) { a.grounded = false; a.coyote = 0; a.vy *= .2; a.dashAvailable = true; this.events.push({ type: 'gravity', direction: a.gravity, x: a.x + a.w / 2, y: a.y + a.h / 2 }); }
    const axis = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (axis) a.facing = axis;
    if (a.grounded) a.dashAvailable = true;
    if (input.pulse && !this.pulseWasDown) this.pulse();
    this.pulseWasDown = !!input.pulse;
    if (input.dash && !this.dashWasDown && a.dashAvailable && a.dashCooldown <= 0) {
      a.dashTime = PHYSICS.dashDuration; a.dashCooldown = PHYSICS.dashCooldown; a.dashAvailable = false;
      a.grounded = false; a.riding = null;
      this.events.push({ type: 'dash', x: a.x + a.w / 2, y: a.y + a.h / 2, direction: a.facing });
    }
    this.dashWasDown = !!input.dash;
    a.vx = a.dashTime > 0 ? a.facing * PHYSICS.dashSpeed : toward(a.vx, axis * PHYSICS.speed, PHYSICS.acceleration * dt);
    if (input.jump && !this.jumpWasDown) a.jumpBuffer = PHYSICS.buffer;
    else a.jumpBuffer = Math.max(0, a.jumpBuffer - dt);
    if (!input.jump && this.jumpWasDown && a.vy * a.gravity < -210) a.vy *= .65;
    this.jumpWasDown = !!input.jump;
    a.coyote = a.grounded ? PHYSICS.coyote : Math.max(0, a.coyote - dt);
    if (a.jumpBuffer > 0 && a.coyote > 0) {
      a.vy = -a.gravity * PHYSICS.jump;
      a.grounded = false; a.coyote = 0; a.jumpBuffer = 0; a.riding = null;
      this.events.push({ type: 'jump', x: a.x + a.w / 2, y: a.y + a.h, direction: a.gravity });
    }
    a.vy = Math.max(-PHYSICS.terminal, Math.min(PHYSICS.terminal, a.vy + a.gravity * PHYSICS.gravity * dt * (a.dashTime > 0 ? .08 : 1)));
    const platforms = this.platforms();
    a.x += a.vx * dt;
    for (const platform of platforms) if (platform.kind !== 'root' && overlap(a, platform)) {
      if (a.vx > 0) a.x = platform.x - a.w;
      else if (a.vx < 0) a.x = platform.x + platform.w;
      a.vx = 0;
    }
    a.x = Math.max(45, Math.min(WIDTH - 45 - a.w, a.x));
    const oldY = a.y, impact = Math.abs(a.vy), wasGrounded = a.grounded;
    a.y += a.vy * dt;
    a.grounded = false;
    a.riding = null;
    for (const platform of platforms) {
      if (platform.kind === 'root' && (a.vy <= 0 || oldY + a.h > platform.y + .1)) continue;
      if (a.x >= platform.x + platform.w || a.x + a.w <= platform.x) continue;
      const crossesTop = a.vy > 0 && oldY + a.h <= platform.y && a.y + a.h >= platform.y;
      const crossesBottom = a.vy < 0 && oldY >= platform.y + platform.h && a.y <= platform.y + platform.h;
      if (!overlap(a, platform) && !crossesTop && !crossesBottom) continue;
      if (a.vy > 0) {
        a.y = platform.y - a.h;
        if (a.gravity === 1) { a.grounded = true; a.riding = platform.id ?? null; }
      } else if (a.vy < 0) {
        a.y = platform.y + platform.h;
        if (a.gravity === -1) { a.grounded = true; a.riding = platform.id ?? null; }
      }
      a.vy = 0;
    }
    if (a.grounded) {
      a.dashAvailable = true;
      if (!wasGrounded && impact > 160) this.events.push({ type: 'land', x: a.x + a.w / 2, y: a.gravity === 1 ? a.y + a.h : a.y, impact });
      const checkpoint = this.level.checkpoint;
      if (!this.checkpoint && checkpoint && inside(a.x + a.w / 2, a.y + a.h / 2, checkpoint.region)) {
        this.checkpoint = checkpoint; this.events.push({ type: 'checkpoint', ...checkpoint.spawn });
      }
    }
    if (a.y > HEIGHT + 50 || a.y + a.h < -60) {
      this.deaths++;
      this.events.push({ type: 'fall' });
      // Undo applies only to stamp moves since the current checkpoint.
      this.history = [];
      // The start checkpoint must always be able to reach the lift again.
      if (this.placements.ocean && !this.checkpoint) {
        this.placements.ocean = null;
        for (const floating of this.floats) floating.y = floating.baseY;
      }
      this.spawn();
      return;
    }
    for (const [index, memory] of (this.level.memories ?? []).entries()) {
      if (!this.collected.has(index) && Math.hypot(a.x + a.w / 2 - memory.x, a.y + a.h / 2 - memory.y) < 28) {
        this.collected.add(index); a.dashAvailable = true;
        this.events.push({ type: 'memory', index, ...memory });
      }
    }
    const goal = this.level.goal;
    if (Math.abs(a.x + a.w / 2 - goal.x) < 34 && Math.abs(a.y + a.h / 2 - goal.y) < 48) {
      this.delivered = true;
      this.events.push({ type: 'delivered' });
    }
  }

  drainEvents() { return this.events.splice(0); }
}
