export const WIDTH = 1100;
export const HEIGHT = 620;
export const STAMPS = ['ocean', 'forest', 'sky'];

const p = (x, y, w, h = 20) => ({ x, y, w, h });
export const LEVELS = [
  {
    title: 'To the sea that forgot its shore', subtitle: 'The rising tide',
    hint: 'Jump onto the wooden crate, then place Ocean in its frame. Ride the tide up.',
    available: ['ocean'], spawn: { x: 110, y: 505 }, goal: { x: 949, y: 270 },
    platforms: [p(50, 548, 310), p(690, 310, 350)],
    sockets: [{ id: 'tide', type: 'ocean', x: 520, y: 225, field: p(365, 205, 290, 375), float: { ...p(455, 540, 140, 24), targetY: 306 } }],
    address: 'The Sea,\nWhere the shoreline used to be.',
    letter: { title: 'The sea writes back.', body: '“Thank you for finding the shore.\nI had forgotten the sound of someone arriving.”\n\nOne letter delivered. Somewhere, a tide turns.' },
    scenery: 'ocean',
    memories: [{ x: 270, y: 510, word: 'salt' }, { x: 490, y: 415, word: 'tide' }, { x: 820, y: 218, word: 'shore' }]
  },
  {
    title: 'To the forest between two footsteps', subtitle: 'One stamp, two bridges',
    hint: 'Place Forest in the left frame. Reach the little island, then move it to the right frame.',
    available: ['forest'], spawn: { x: 110, y: 496 }, goal: { x: 965, y: 290 },
    platforms: [p(50, 540, 260), p(455, 430, 110), p(790, 330, 250)],
    sockets: [
      { id: 'root-left', type: 'forest', x: 396, y: 383, field: p(270, 355, 295, 150), bridge: p(282, 480, 277, 17) },
      { id: 'root-right', type: 'forest', x: 693, y: 278, field: p(537, 245, 290, 165), bridge: p(545, 380, 279, 17) }
    ],
    address: 'The Forest,\nBetween the first step and the second.',
    letter: { title: 'A path remembers you.', body: '“I thought a forest needed a thousand trees.\nPerhaps it only needs someone willing to cross.”\n\nThe roots fold themselves neatly back into the stamp.' },
    scenery: 'forest',
    checkpoint: { spawn: { x: 486, y: 398 }, region: p(455, 390, 110, 42) },
    memories: [{ x: 380, y: 450, word: 'root' }, { x: 520, y: 288, word: 'path' }, { x: 731, y: 240, word: 'moss' }]
  },
  {
    title: 'To the sky beneath your feet', subtitle: 'The other side of up',
    hint: 'Place Sky, step into its frame, and walk under the ceiling. Leave the frame to fall onto the balcony.',
    available: ['sky'], spawn: { x: 110, y: 505 }, goal: { x: 968, y: 205 },
    platforms: [p(50, 548, 230), p(300, 120, 470, 22), p(850, 248, 190)],
    sockets: [{ id: 'updraft', type: 'sky', x: 550, y: 355, field: p(260, 60, 560, 550) }],
    address: 'The Sky,\nUnderneath everything you know.',
    letter: { title: 'Up was a matter of opinion.', body: '“Everyone looks up to find me.\nYou were the first to look the other way.”\n\nThere is one envelope left. The handwriting looks familiar.' },
    scenery: 'sky',
    memories: [{ x: 450, y: 162, word: 'cloud' }, { x: 650, y: 330, word: 'drift' }, { x: 896, y: 154, word: 'light' }]
  },
  {
    title: 'To the place you used to call home', subtitle: 'The last address',
    hint: 'Ride Ocean to the landing, grow a Forest bridge, then borrow Sky to reach the last letter.',
    available: ['ocean', 'forest', 'sky'], spawn: { x: 110, y: 505 }, goal: { x: 1001, y: 146 },
    platforms: [p(50, 548, 235), p(570, 340, 110), p(775, 78, 125, 20), p(960, 190, 85)],
    sockets: [
      { id: 'home-tide', type: 'ocean', x: 418, y: 247, field: p(295, 235, 235, 345), float: { ...p(365, 540, 130, 24), targetY: 350 } },
      { id: 'home-root', type: 'forest', x: 730, y: 220, field: p(650, 190, 220, 135), bridge: p(665, 300, 205, 17) },
      { id: 'home-sky', type: 'sky', x: 866, y: 340, field: p(790, 50, 150, 400) }
    ],
    address: 'You,\nThe house at the end of the lane.\nBefore you grew up.',
    letter: { title: 'You found your way home.', body: '“I left the light on.\nI knew you would remember the address.”\n\nThe sea settles. The forest rests. The sky turns right side up.\nFour impossible letters, delivered with care.' },
    scenery: 'home',
    checkpoint: { spawn: { x: 590, y: 308 }, region: p(570, 295, 110, 47) },
    memories: [{ x: 408, y: 425, word: 'lane' }, { x: 736, y: 190, word: 'window' }, { x: 868, y: 220, word: 'home' }]
  }
];
