import { LEVELS, WIDTH, HEIGHT } from './levels.js';

export const PHYSICS = Object.freeze({ speed: 245, acceleration: 1900, gravity: 1250, jump: 455, terminal: 650, floatSpeed: 62, coyote: .11, buffer: .13 });
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
    this.spawn();
  }

  spawn() {
    this.player = { ...this.level.spawn, w: 23, h: 32, vx: 0, vy: 0, grounded: false, gravity: 1, coyote: 0, jumpBuffer: 0, facing: 1, riding: null };
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
    return socket && inside(x, y, socket.field) ? -1 : 1;
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
    // Float movement carries a rider; ordinary collision handles every other contact.
    for (const platform of this.floats) {
      const target = this.placements.ocean === platform.id ? platform.targetY : platform.baseY;
      const before = platform.y;
      platform.y = toward(platform.y, target, PHYSICS.floatSpeed * dt);
      if (a.riding === platform.id && a.grounded) a.y += platform.y - before;
    }
    const previousGravity = a.gravity;
    a.gravity = this.gravityAt(a.x + a.w / 2, a.y + a.h / 2);
    if (previousGravity !== a.gravity) { a.grounded = false; a.coyote = 0; a.vy *= .2; this.events.push({ type: 'gravity', direction: a.gravity }); }
    const axis = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    a.vx = toward(a.vx, axis * PHYSICS.speed, PHYSICS.acceleration * dt);
    if (axis) a.facing = axis;
    if (input.jump && !this.jumpWasDown) a.jumpBuffer = PHYSICS.buffer;
    else a.jumpBuffer = Math.max(0, a.jumpBuffer - dt);
    this.jumpWasDown = !!input.jump;
    a.coyote = a.grounded ? PHYSICS.coyote : Math.max(0, a.coyote - dt);
    if (a.jumpBuffer > 0 && a.coyote > 0) {
      a.vy = -a.gravity * PHYSICS.jump;
      a.grounded = false; a.coyote = 0; a.jumpBuffer = 0; a.riding = null;
      this.events.push({ type: 'jump' });
    }
    a.vy = Math.max(-PHYSICS.terminal, Math.min(PHYSICS.terminal, a.vy + a.gravity * PHYSICS.gravity * dt));
    const platforms = this.platforms();
    a.x += a.vx * dt;
    for (const platform of platforms) if (overlap(a, platform)) {
      if (a.vx > 0) a.x = platform.x - a.w;
      else if (a.vx < 0) a.x = platform.x + platform.w;
      a.vx = 0;
    }
    a.x = Math.max(45, Math.min(WIDTH - 45 - a.w, a.x));
    a.y += a.vy * dt;
    a.grounded = false;
    a.riding = null;
    for (const platform of platforms) if (overlap(a, platform)) {
      if (a.vy > 0) {
        a.y = platform.y - a.h;
        if (a.gravity === 1) { a.grounded = true; a.riding = platform.id ?? null; }
      } else if (a.vy < 0) {
        a.y = platform.y + platform.h;
        if (a.gravity === -1) { a.grounded = true; a.riding = platform.id ?? null; }
      }
      a.vy = 0;
    }
    if (a.y > HEIGHT + 50 || a.y + a.h < -60) {
      this.deaths++;
      this.events.push({ type: 'fall' });
      // Undo applies only to stamp moves since the current checkpoint.
      this.history = [];
      // The start checkpoint must always be able to reach the lift again.
      if (this.placements.ocean) {
        this.placements.ocean = null;
        for (const floating of this.floats) floating.y = floating.baseY;
      }
      this.spawn();
      return;
    }
    const goal = this.level.goal;
    if (Math.abs(a.x + a.w / 2 - goal.x) < 34 && Math.abs(a.y + a.h / 2 - goal.y) < 48) {
      this.delivered = true;
      this.events.push({ type: 'delivered' });
    }
  }

  drainEvents() { return this.events.splice(0); }
}
