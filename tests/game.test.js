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
  assert.equal(game.canUndo, false);
});

test('undo restores successive bridge moves and a reclaimed stamp without moving the courier', () => {
  const game = new Game(1); tick(game, 25);
  const player = { ...game.player };
  assert.equal(game.undo(), false);
  game.place('forest', 'root-left'); game.place('forest', 'root-right'); game.reclaim('forest');
  assert.equal(game.undo(), true); assert.equal(game.placements.forest, 'root-right');
  assert.equal(game.undo(), true); assert.equal(game.placements.forest, 'root-left');
  assert.deepEqual(game.platforms().filter(p => p.kind === 'root').map(p => p.id), ['root-left']);
  assert.equal(game.undo(), true); assert.equal(game.placements.forest, null);
  assert.equal(game.canUndo, false); assert.deepEqual(game.player, player);
  assert.equal(game.drainEvents().filter(e => e.type === 'undo').length, 3);
});

test('undo affects only the previous stamp action and changes local gravity immediately', () => {
  const game = new Game(3);
  game.place('ocean', 'home-tide'); game.place('forest', 'home-root'); game.place('sky', 'home-sky');
  game.reclaim('sky'); assert.equal(game.gravityAt(850, 250), 1);
  game.undo(); assert.equal(game.gravityAt(850, 250), -1);
  game.undo(); assert.equal(game.gravityAt(850, 250), 1);
  assert.equal(game.placements.ocean, 'home-tide'); assert.equal(game.placements.forest, 'home-root');
});

test('unsuccessful placements do not create undo steps', () => {
  const game = new Game(); game.place('ocean', 'tide');
  assert.equal(game.place('ocean', 'tide'), false); assert.equal(game.place('ocean', 'missing'), false); assert.equal(game.reclaim('sky'), false);
  game.undo(); assert.equal(game.placements.ocean, null); assert.equal(game.canUndo, false);
});
test('Sky gravity is local and reclaiming returns normal gravity', () => {
  const game = new Game(2); game.place('sky', 'updraft'); assert.equal(game.gravityAt(500, 350), -1); assert.equal(game.gravityAt(900, 350), 1);
  game.reclaim('sky'); assert.equal(game.gravityAt(500, 350), 1);
});
test('falling cannot strand the player below an already raised Ocean lift', () => {
  const game = new Game(); tick(game, 25); rightTo(game, 310); rightTo(game, 480, { jump: true }); land(game);
  game.place('ocean', 'tide'); tick(game, 260); assert.equal(game.floats[0].y, 306);
  rightTo(game, 640); tick(game, 200); assert.ok(game.deaths > 0); assert.equal(game.placements.ocean, null); assert.equal(game.floats[0].y, 540);
  assert.equal(game.player.x, game.level.spawn.x);
  assert.equal(game.canUndo, false); assert.equal(game.undo(), false, 'cannot restore an inaccessible raised lift after respawn');
});
test('holding jump does not repeatedly auto-jump after landing', () => {
  const game = new Game(); tick(game, 25); tick(game, 150, { jump: true }); assert.equal(game.player.grounded, true);
  const jumps = game.drainEvents().filter(e => e.type === 'jump'); assert.equal(jumps.length, 1);
});
test('restart clears world effects and delivered state', () => {
  const game = new Game(); solve[0](game); assert.equal(game.undo(), false, 'delivered rooms cannot be changed');
  game.load(0); assert.equal(game.delivered, false); assert.equal(game.moves, 0); assert.equal(game.placements.ocean, null); assert.equal(game.canUndo, false);
  assert.equal(game.floats[0].y, 540);
});
test('simulation rejects invalid rooms and unsafe frame durations', () => {
  assert.throws(() => new Game(-1), RangeError); const game = new Game(); assert.throws(() => game.step({}, .5), RangeError); assert.throws(() => game.step({}, NaN), RangeError);
});

test('fold dash preserves a vault arc and is edge-triggered with one charge in the air', () => {
  const game = new Game(); tick(game, 25); game.step({ jump: true });
  const before = game.player.x; game.step({ right: true, jump: true, dash: true }); const upward = game.player.vy;
  assert.ok(upward < -350); tick(game, 12, { right: true, jump: true, dash: true });
  assert.ok(game.player.x > before + 80); assert.equal(game.player.dashAvailable, false);
  game.step({}); game.step({ dash: true }); assert.equal(game.drainEvents().filter(e => e.type === 'dash').length, 1);
});
test('short jump is lower than holding jump and landing restores dash', () => {
  const short = new Game(), full = new Game(); tick(short, 25); tick(full, 25);
  short.step({ jump: true }); short.step(); tick(short, 14);
  tick(full, 16, { jump: true }); assert.ok(short.player.y > full.player.y + 10);
  short.step({ dash: true });
  tick(short, 150); assert.equal(short.player.grounded, true); assert.equal(short.player.dashAvailable, true);
});
test('world abilities are gated by active regions, use cooldowns, and recharge dash', () => {
  const ocean = new Game(); assert.equal(ocean.pulse(), false); ocean.place('ocean', 'tide');
  ocean.player.x = 480; ocean.player.y = 508; ocean.player.dashAvailable = false;
  assert.equal(ocean.pulse(), true); assert.equal(ocean.ability().name, 'Tide vault'); assert.ok(ocean.player.vy < -600); assert.equal(ocean.player.dashAvailable, true); assert.equal(ocean.pulse(), false);
  const forest = new Game(1); forest.place('forest', 'root-left'); forest.player.x = 385; forest.player.y = 448; forest.step();
  assert.equal(forest.player.riding, 'root-left'); assert.equal(forest.pulse(), true); assert.ok(forest.player.vy < -650);
  const sky = new Game(2); sky.place('sky', 'updraft'); sky.player.x = 650; sky.player.y = 142;
  assert.equal(sky.pulse(), true); assert.equal(sky.gravityAt(650, 330), 1); tick(sky, 41); assert.equal(sky.gravityAt(650, 330), -1);
});
test('memories collect once, restore dash and survive a fall; restart clears them', () => {
  const game = new Game(); game.player.x = 258; game.player.y = 494; game.player.dashAvailable = false; game.step();
  assert.equal(game.collected.size, 1); assert.equal(game.player.dashAvailable, true); game.step(); assert.equal(game.drainEvents().filter(e => e.type === 'memory').length, 1);
  game.player.y = 680; game.step(); assert.equal(game.collected.size, 1); game.load(0); assert.equal(game.collected.size, 0);
});
test('checkpoint recovery preserves reachable world effects and returns to solid ground', () => {
  const game = new Game(3); game.place('ocean', 'home-tide'); game.player.x = 590; game.player.y = 308; game.step();
  assert.ok(game.checkpoint); game.place('forest', 'home-root'); game.player.y = 680; game.step();
  assert.equal(game.deaths, 1); assert.equal(game.player.x, 590); assert.equal(game.player.y, 308); assert.equal(game.placements.forest, 'home-root'); assert.equal(game.placements.ocean, 'home-tide'); assert.equal(game.canUndo, false);
});

test('swept collisions catch thin bridges during a larger supported physics step', () => {
  const game = new Game(1); game.place('forest', 'root-left'); game.player.x = 350; game.player.y = 420; game.player.vy = 640;
  game.step({}, .05); assert.equal(game.player.y, 448); assert.equal(game.player.grounded, true);
});

test('a late jump passes through a root underside and lands on its top', () => {
  const game = new Game(1); game.place('forest', 'root-left'); tick(game, 25); game.player.x = 260;
  tick(game, 40, { right: true, jump: true });
  assert.equal(game.deaths, 0); assert.equal(game.player.grounded, true); assert.equal(game.player.riding, 'root-left'); assert.equal(game.player.y, 448);
});

test('placing Ocean before boarding keeps both lift rooms accessible', async t => {
  for (const index of [0, 3]) await t.test(`early Ocean in letter ${index + 1}`, () => {
    const game = new Game(index), lift = game.floats[0];
    game.place('ocean', lift.id); tick(game, 240);
    assert.equal(lift.y, lift.baseY, 'an empty lift waits for its passenger');
    solve[index](game);
    assert.equal(game.delivered, true); assert.equal(game.deaths, 0);
    assert.equal(lift.y, lift.targetY, 'boarding starts the full lift journey');
  });
});

test('releasing an earlier jump cannot shorten a world launch', async t => {
  for (const index of [0, 1]) await t.test(index === 0 ? 'Tide vault' : 'Root spring', () => {
    const game = new Game(index);
    if (index === 1) game.place('forest', 'root-left');
    tick(game, 25); rightTo(game, index === 0 ? 310 : 238);
    rightTo(game, index === 0 ? 480 : 385, { jump: true });
    for (let i = 0; i < 120 && !game.player.grounded; i++) game.step({ jump: true });
    assert.equal(game.player.riding, index === 0 ? 'tide' : 'root-left');
    if (index === 0) game.place('ocean', 'tide');
    game.step({ jump: true, pulse: true });
    assert.ok(game.player.vy < -550, 'the world ability launches at full strength');
    game.step({ jump: false });
    assert.ok(game.player.vy < -500, 'releasing Space only cuts an ordinary jump');
    assert.equal(game.drainEvents().filter(e => e.type === 'pulse').length, 1);
  });
});

test('all twelve memories are reachable through movement and the world abilities', async t => {
  const routes = [
    game => {
      tick(game, 25); rightTo(game, 310); rightTo(game, 480, { jump: true }); land(game); game.place('ocean', 'tide'); tick(game, 180);
      rightTo(game, 555); rightTo(game, 750, { jump: true }); land(game); rightTo(game, 806); tick(game, 70, { jump: true }); land(game); rightTo(game, 935);
    },
    game => {
      game.place('forest', 'root-left'); tick(game, 25); rightTo(game, 238); rightTo(game, 385, { jump: true }); land(game);
      assert.equal(game.pulse(), true); rightTo(game, 498); land(game); game.place('forest', 'root-right');
      rightTo(game, 645, { jump: true }); land(game); rightTo(game, 721); assert.equal(game.pulse(), true); tick(game, 75); land(game);
      rightTo(game, 864, { jump: true }); land(game); rightTo(game, 953);
    },
    game => {
      game.place('sky', 'updraft'); tick(game, 25); rightTo(game, 650); land(game); assert.equal(game.pulse(), true); tick(game, 80); land(game);
      rightTo(game, 874); land(game); tick(game, 70, { jump: true }); land(game); rightTo(game, 953);
    },
    game => {
      tick(game, 25); rightTo(game, 220); rightTo(game, 404, { jump: true }); land(game); game.place('ocean', 'home-tide'); tick(game, 160);
      rightTo(game, 430); rightTo(game, 599, { jump: true }); land(game); game.place('forest', 'home-root'); rightTo(game, 706, { jump: true }); land(game);
      assert.equal(game.pulse(), true); tick(game, 75); land(game); game.place('sky', 'home-sky'); rightTo(game, 990); land(game); tick(game, 90);
    }
  ];
  for (const [index, route] of routes.entries()) await t.test(`memory route ${index + 1}`, () => {
    const game = new Game(index); route(game); assert.equal(game.delivered, true); assert.equal(game.deaths, 0);
    assert.deepEqual([...game.collected].sort(), [0, 1, 2], `Missing memory in room ${index + 1}`);
  });
});
