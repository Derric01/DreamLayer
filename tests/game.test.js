import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';

const tick = (game, count = 1, input = {}) => { for (let i = 0; i < count && !game.delivered; i++) game.step(input); };
function rightTo(game, x, { jump = false, limit = 500 } = {}) {
  for (let i = 0; i < limit; i++) {
    if (game.player.x >= x || game.delivered) return;
    game.step({ right: true, jump });
  }
  assert.fail(`Could not reach x=${x}; courier at ${JSON.stringify(game.player)}; falls=${game.deaths}`);
}
function land(game, limit = 180) {
  for (let i = 0; i < limit; i++) { game.step(); if (game.player.grounded || game.delivered) return; }
  assert.fail('Courier did not land');
}

export const solve = [
  game => {
    tick(game, 25); rightTo(game, 310); rightTo(game, 480, { jump: true }); land(game);
    assert.equal(game.player.riding, 'tide'); game.place('ocean', 'tide'); tick(game, 240);
    rightTo(game, 555); rightTo(game, 750, { jump: true }); land(game); rightTo(game, 935);
  },
  game => {
    game.place('forest', 'root-left'); tick(game, 25); rightTo(game, 238); rightTo(game, 385, { jump: true }); land(game);
    rightTo(game, 405); rightTo(game, 498, { jump: true }); land(game);
    assert.equal(game.player.y + game.player.h, 430);
    game.place('forest', 'root-right'); rightTo(game, 645, { jump: true }); land(game);
    rightTo(game, 703); rightTo(game, 864, { jump: true }); land(game); rightTo(game, 953);
  },
  game => {
    game.place('sky', 'updraft'); tick(game, 25); rightTo(game, 957); land(game); tick(game, 90);
  },
  game => {
    tick(game, 25); rightTo(game, 220); rightTo(game, 404, { jump: true }); land(game);
    assert.equal(game.player.riding, 'home-tide'); game.place('ocean', 'home-tide'); tick(game, 210);
    rightTo(game, 430); rightTo(game, 599, { jump: true }); land(game);
    assert.equal(game.player.y + game.player.h, 340);
    game.place('forest', 'home-root'); rightTo(game, 706, { jump: true }); land(game);
    game.place('sky', 'home-sky'); rightTo(game, 990); land(game); tick(game, 90);
  }
];

test('the four deliveries are solvable through real movement and stamp placements', async t => {
  for (let i = 0; i < solve.length; i++) await t.test(`letter ${i + 1}`, () => {
    const game = new Game(i); solve[i](game); assert.equal(game.delivered, true); assert.equal(game.deaths, 0);
  });
});
test('one Forest stamp cannot leave two bridges behind', () => {
  const game = new Game(1); game.place('forest', 'root-left'); assert.equal(game.platforms().filter(p => p.kind === 'root').length, 1);
  game.place('forest', 'root-right'); const roots = game.platforms().filter(p => p.kind === 'root'); assert.equal(roots.length, 1); assert.equal(roots[0].id, 'root-right');
  assert.equal(game.reclaim('forest'), true); assert.equal(game.platforms().filter(p => p.kind === 'root').length, 0);
});
test('wrong stamps and unavailable worlds cannot change a room', () => {
  const game = new Game(); assert.equal(game.place('forest', 'tide'), false); assert.equal(game.place('ocean', 'missing'), false);
  assert.equal(game.moves, 0); assert.equal(game.placements.ocean, null);
});
test('Sky gravity is local and reclaiming returns normal gravity', () => {
  const game = new Game(2); game.place('sky', 'updraft'); assert.equal(game.gravityAt(500, 350), -1); assert.equal(game.gravityAt(900, 350), 1);
  game.reclaim('sky'); assert.equal(game.gravityAt(500, 350), 1);
});
test('falling cannot strand the player below an already raised Ocean lift', () => {
  const game = new Game(); game.place('ocean', 'tide'); tick(game, 260); assert.equal(game.floats[0].y, 306);
  rightTo(game, 400); tick(game, 200); assert.ok(game.deaths > 0); assert.equal(game.placements.ocean, null); assert.equal(game.floats[0].y, 540);
  assert.equal(game.player.x, game.level.spawn.x);
});
test('holding jump does not repeatedly auto-jump after landing', () => {
  const game = new Game(); tick(game, 25); tick(game, 150, { jump: true }); assert.equal(game.player.grounded, true);
  const jumps = game.drainEvents().filter(e => e.type === 'jump'); assert.equal(jumps.length, 1);
});
test('restart clears world effects and delivered state', () => {
  const game = new Game(); solve[0](game); game.load(0); assert.equal(game.delivered, false); assert.equal(game.moves, 0); assert.equal(game.placements.ocean, null);
  assert.equal(game.floats[0].y, 540);
});
test('simulation rejects invalid rooms and unsafe frame durations', () => {
  assert.throws(() => new Game(-1), RangeError); const game = new Game(); assert.throws(() => game.step({}, .5), RangeError); assert.throws(() => game.step({}, NaN), RangeError);
});
