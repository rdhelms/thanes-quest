// Hand-made places far out in the wild: the second saga's two rooms (the Frost Gate, and what is
// behind it), and two landmarks for those who walk north and east instead.

import type { RoomDef } from '../../../engine/types';

const DF = 98;

export const frostgate: RoomDef = {
  id: 'frostgate',
  mark: 'gate',
  music: 'barrow',
  name: 'The Frost Gate',
  look: 'The land rises here between two shoulders of black rock, and where the pass should be there is a wall of blue ice, thirty feet high and smooth as a held breath. The wind comes out of it, straight at you, as if the wall were breathing. This is where the west wind is born.',
  lookWhen: [{ if: [{ flag: 'gate.open' }], look: 'Two shoulders of black rock, and between them a wall of blue ice thirty feet high. In its foot a doorway stands open, edged with green light. The wind still comes out of it, but it has somewhere to come from now.' }],
  scene: {
    kind: 'outdoor', horizon: 64, walkTop: 118,
    layers: [
      { t: 'sky', horizon: 64 },
      { t: 'mountains', base: 68, height: 62, seed: 401, far: true },
      { t: 'mountains', base: 72, height: 44, seed: 402 },
      { t: 'snow', from: 70 },
      { t: 'path', w: 10, pts: [[326, 142], [240, 144], [160, 134], [160, 120]] },
      { t: 'tufts', count: 8, seed: 403 },
    ],
    props: [
      { t: 'crag', x: 62, y: 116, w: 110, h: 86, seed: 404 },
      { t: 'crag', x: 258, y: 116, w: 110, h: 90, seed: 405 },
      { t: 'boulder', x: 60, y: 152, r: 9, seed: 406 },
      { t: 'boulder', x: 268, y: 156, r: 7, seed: 407 },
      { t: 'deadtree', x: 300, y: 138, h: 44, seed: 408 },
      { t: 'deadtree', x: 24, y: 142, h: 50, seed: 409 },
    ],
    when: [
      { if: [{ not: { flag: 'gate.open' } }], props: [{ t: 'icegate', x: 160, y: 116, w: 96, h: 76, seed: 3 }] },
      { if: [{ flag: 'gate.open' }], props: [{ t: 'icegate', x: 160, y: 116, w: 96, h: 76, seed: 3, v: 'open' }] },
    ],
  },
  doors: [
    {
      x0: 152, y0: 119, x1: 168, y1: 121, to: 'rimehall', x: 60, y: 126, dir: 'right',
      if: [{ flag: 'gate.open' }],
      locked: 'Solid ice, cold enough to burn. But there is something in it, deep down, that the eye slides off: a shape that is not quite a door. It wants uncovering.',
    },
  ],
  spawns: [
    { id: 'gatewarden1', kind: 'rimewalker', x: 120, y: 140, level: 1 },
    { id: 'gatewarden2', kind: 'rimewalker', x: 210, y: 146, level: 1 },
  ],
  things: [
    {
      id: 'ice', nouns: ['tarn', 'door', 'inscription'], x: 160, y: 120, reach: 400, look: 'Blue ice, clear to a great depth. Far inside it something hangs frozen: a shape like a doorway, or the memory of one. Your eye will not stay on it.',
      lookWhen: [{ if: [{ flag: 'gate.open' }], look: 'A doorway in the ice, taller than a man, its edge lit green from inside. A stair of ice goes down behind it. Walk in, if you are going.' }],
    },
    { id: 'crags', nouns: ['crag', 'boulder', 'mountain'], x: 62, y: 120, reach: 400, look: 'Black rock on either hand, rimed white on the side the wind comes from. Nothing grows on it, and nothing perches.' },
    { id: 'trees', nouns: ['tree'], x: 300, y: 140, reach: 400, look: 'Two dead trees, stripped to the grain by the wind. They lean away from the ice, as anything would.' },
    { id: 'snow', nouns: ['snow', 'ground'], x: 160, y: 140, reach: 400, look: 'Packed hard as stone by the wind, and scored in long lines all pointing one way: away from the wall.' },
    { id: 'sky', nouns: ['sky', 'weather'], x: 160, y: 100, reach: 400, look: 'The wind comes out of the west, out of the ice, and it has not stopped once since you got here.' },
  ],
  rules: [
    { enter: true, if: [{ not: { flag: 'seen.frostgate' } }], do: [{ set: 'seen.frostgate' }, { score: 5, id: 'seen.frostgate' }] },
    { on: 'orun', if: [{ flag: 'gate.open' }], do: [{ say: 'ORUN. Everything here that was hidden is already plain to see. You find you do not care for most of it.' }] },
    {
      on: 'orun',
      do: [
        { set: 'gate.open' }, { sound: 'door' }, { score: 10, id: 'gate.open' },
        { say: 'ORUN. The word goes into the ice like a hot nail. The whole wall rings; and where that shape hung, deep in the blue, there is suddenly a doorway, as if it had always been there and you had only now thought to look.' },
        { quest: 'crown', stage: 3 },
      ],
    },
    { on: ['open door', 'push door', 'knock door', 'enter door', 'attack door', 'attack tarn', 'push tarn'], if: [{ not: { flag: 'gate.open' } }], do: [{ say: 'You might as well lean on the mountain. Whatever way there is through this ice, it is not found by pushing.' }] },
    { on: ['open door', 'enter door'], do: [{ say: 'It stands open. Walk in, if you are going.' }] },
    { on: ['veth'], if: [{ not: { flag: 'gate.open' } }], do: [{ say: 'The word strikes the ice and slides off. There is no door here to open. Not one that can be seen.' }] },
    { on: ['cast flame'], if: [{ knows: 'flame' }, { not: { flag: 'gate.open' } }], do: [{ say: 'The bolt bursts on the ice and leaves a mark the size of your hand, which is frozen over again before you have lowered your arm.' }] },
    { on: ['climb crag', 'climb tarn', 'climb'], do: [{ say: 'The rock is glazed and the ice is glass. You get as high as your own height, twice, and come down the quick way both times.' }] },
  ],
};

export const rimehall: RoomDef = {
  id: 'rimehall',
  music: 'barrow',
  name: 'The Cold Forge',
  look: 'A hall cut into the ice, or grown there. The walls give a green light of their own. In the middle stands an anvil of black ice, rimed white, and all round it the floor is littered with crowns: dozens of them, flawed, cracked, cast aside. Somebody has been practising for a very long time.',
  lookWhen: [
    { if: [{ flag: 'crown.unmade' }], look: 'An empty hall, dripping. The anvil of black ice has a crack in it from top to bottom, the crowns are gone, and the green light in the walls is going out slowly, like a held note.' },
    { if: [{ flag: 'smith.dead' }], look: 'The hall is quiet. The anvil of black ice stands in its litter of failed crowns, and slabs of what was the Cold Smith lie where they fell. His hammer is among them.' },
  ],
  scene: {
    kind: 'indoor', walkTop: 106, ambient: 0.36,
    layers: [{ t: 'stonewall', floor: DF }, { t: 'flagstones', floor: DF }],
    props: [
      { t: 'arch', x: 44, y: DF, w: 30, h: 46 },
      { t: 'rune', x: 110, y: 52, h: 24, v: 'a' },
      { t: 'rune', x: 160, y: 46, h: 30, v: 'c' },
      { t: 'rune', x: 210, y: 52, h: 24, v: 'b' },
      { t: 'pillar', x: 84, y: 110, lit: 1 },
      { t: 'pillar', x: 240, y: 110, lit: -1 },
      { t: 'anvil', x: 160, y: 132, w: 36, ramp: 'water' },
      { t: 'treasure', x: 262, y: 152, r: 16 },
      { t: 'treasure', x: 70, y: 156, r: 12 },
    ],
    lights: [
      { x: 160, y: 50, r: 70, i: 0.9, kind: 'glow' },
      { x: 60, y: 120, r: 60, i: 0.5, kind: 'glow' },
      { x: 262, y: 120, r: 60, i: 0.5, kind: 'glow' },
      { x: 160, y: 130, r: 60, i: 0.5, kind: 'warm' },
    ],
  },
  doors: [{ x0: 36, y0: 107, x1: 52, y1: 109, to: 'frostgate', x: 160, y: 128, dir: 'down' }],
  spawns: [{ id: 'coldsmith', kind: 'coldsmith', x: 196, y: 134 }],
  things: [
    {
      id: 'anvil', nouns: ['anvil'], x: 160, y: 136, reach: 44, try: ['put crown on anvil'], look: 'An anvil of black ice, worn hollow in the face by four thousand years of the same blow. It is so cold that the air above it falls.',
      lookWhen: [{ if: [{ flag: 'crown.unmade' }], look: 'Cracked through. It will not make anything again.' }],
    },
    {
      id: 'crowns', nouns: ['treasure', 'crown'], x: 262, y: 154, reach: 400, look: 'Crowns, heaped like kindling: five points, six points, nine, one with thirteen that must have been a bad day. All of them cracked somewhere, and all made to one measure, which is not a man\'s. He threw away every one that was not perfect.',
      lookWhen: [{ if: [{ flag: 'crown.unmade' }], look: 'Gone. There is only water on the floor, and that is freezing.' }],
    },
    { id: 'runes', nouns: ['rune', 'inscription'], x: 160, y: 108, reach: 400, look: 'Three runes cut in the back wall, each as tall as you are. You can read none of them, and you find that you are glad.',
      lookWhen: [{ if: [{ flag: 'crown.unmade' }], look: 'Three dark shapes in the back wall, where the runes were. You read them once, as they went out: KEEP ME WARM.' }],
    },
    { id: 'pillars', nouns: ['pillar'], x: 84, y: 112, reach: 400, look: 'Pillars of ice, clear enough to see through. There are things frozen in them. You stop looking.' },
    { id: 'arch', nouns: ['arch', 'door'], x: 44, y: 108, reach: 400, look: 'The stair back up to the wind.' },
  ],
  rules: [
    { enter: true, if: [{ not: { flag: 'seen.rimehall' } }], do: [{ set: 'seen.rimehall' }, { score: 5, id: 'seen.rimehall' }] },
    { on: ['use crown anvil', 'use crown', 'give crown anvil', 'attack crown', 'attack crown anvil', 'drop crown', 'temper crown', 'light crown'], if: [{ flag: 'crown.unmade' }], do: [{ say: 'It is done. There is nothing left to unmake.' }] },
    { on: ['use crown anvil', 'use crown', 'give crown anvil', 'attack crown', 'attack crown anvil', 'drop crown', 'temper crown', 'light crown'], if: [{ not: { flag: 'smith.dead' } }], do: [{ say: 'The anvil is in use, and its owner has just noticed what you are carrying.' }] },
    { on: ['use crown anvil', 'use crown', 'give crown anvil', 'attack crown', 'attack crown anvil', 'drop crown', 'temper crown', 'light crown'], if: [{ not: { has: 'crown' } }], do: [{ say: 'You have no crown to lay on it.' }] },
    { on: ['use crown anvil', 'use crown', 'give crown anvil', 'attack crown', 'attack crown anvil', 'drop crown', 'temper crown', 'light crown'], if: [{ not: { near: 'anvil', d: 60 } }], do: [{ say: 'You are not close enough to the anvil.' }] },
    {
      on: ['use crown anvil', 'use crown', 'give crown anvil', 'attack crown', 'attack crown anvil', 'drop crown', 'temper crown', 'light crown'],
      do: [
        { lose: 'crown' }, { set: 'crown.unmade' }, { set: 'goal.gate', to: false }, { run: 'thaw' }, { score: 25, id: 'crown.unmade' }, { quest: 'crown', stage: 5 }, { sound: 'win' },
        { say: "You lay the seven-pointed crown on the anvil of black ice. It sits there, perfectly at home. Then you take up the Smith's fallen hammer in both hands (it is all you can do to lift it) and bring it down once.\n\nThe crown does not break. It melts: all at once, like frost on a window when the sun comes round, and what runs off the anvil is only water. Every flawed crown on the floor goes with it. Somewhere above you, for the first time since you came north, the wind drops.\n\nOn the back wall the three great runes go dark, one after another. As each one goes you find, for the length of a breath, that you can read it. They were never a spell. They were an order, and it was three words long: KEEP ME WARM.\n\nThe warmth that crown had been drinking for four thousand years has to go somewhere. A good deal of it goes into you.\n\nYou have finished the second saga of THANE'S QUEST. There is a great deal of country still out there, and it is a little less cold than it was." },
        { note: 'You are stronger: more health, and more mana.' },
      ],
    },
    { on: ['take treasure', 'take crown'], if: [{ not: { flag: 'crown.unmade' } }], do: [{ say: 'You pick one up. It is so cold that it takes the skin off your fingers, and you put it down again faster than you picked it up. One of these is already more than enough.' }] },
    { on: ['take anvil', 'push anvil', 'pet anvil'], do: [{ say: 'Your hand sticks to it. You get it back, with most of the skin.' }] },
    { on: ['read rune', 'pet rune', 'read inscription'], if: [{ flag: 'crown.unmade' }], do: [{ say: 'The runes have gone dark. You read them once, as they went: KEEP ME WARM. It was an order, and nobody is carrying it out any longer.' }] },
    { on: ['read rune', 'pet rune', 'read inscription'], do: [{ say: 'They do not want reading. They want obeying, and you are not minded to.' }] },
    { on: 'orun', if: [{ not: { flag: 'smith.dead' } }], do: [{ say: 'ORUN. Whatever is hidden here will have to wait until its owner has finished with you.' }] },
    { on: 'orun', if: [{ not: { flag: 'orun.rimehall' } }], do: [{ set: 'orun.rimehall' }, { run: 'study', arg: 20 }, { say: 'ORUN. The ice of the back wall clears like a window. Under the three runes, at the height of a man\'s shoulder, is the print of one hand, melted into the wall: a man\'s hand, with a ring on every finger, held there until the ice gave.' }] },
    { on: 'orun', do: [{ say: 'ORUN. The print of the ringed hand is still there under the runes. It has not changed.' }] },
  ],
};

const far = (hz: number, seed: number): RoomDef['scene']['layers'] => [
  { t: 'sky', horizon: hz },
  { t: 'mountains', base: hz + 3, height: 52, seed, far: true },
  { t: 'mountains', base: hz + 5, height: 28, seed: seed + 1 },
  { t: 'treeline', y: hz + 4, seed: seed + 2, shade: 0.34, hmin: 5, hvar: 6, spacing: 5 },
  { t: 'snow', from: hz + 4 },
];

export const bellmere: RoomDef = {
  id: 'bellmere',
  mark: 'mere',
  music: 'barrow',
  name: 'The Sunken Bell',
  look: 'A wide mere, frozen grey from shore to shore, and out in the middle of it the green shoulder of a great bronze bell, canted over and held fast in the ice. There was a village here once, or a ferry, or a chapel: something that wanted a bell. Only the bell is left. Nothing moves here, not even a wolf. Toward the middle the ice goes clear as glass, the way thin ice does.',
  scene: {
    kind: 'outdoor', horizon: 64, walkTop: 94,
    layers: [...far(64, 501), { t: 'ice', x: 160, y: 138, rx: 118, ry: 24 }, { t: 'tufts', count: 12, seed: 504 }],
    props: [
      { t: 'bell', x: 160, y: 137, r: 26 },
      { t: 'pine', x: 30, y: 104, h: 62, seed: 505 },
      { t: 'pine', x: 284, y: 102, h: 56, seed: 506 },
      { t: 'pine', x: 246, y: 100, h: 44, seed: 507 },
      { t: 'boulder', x: 24, y: 154, r: 8, seed: 508 },
      { t: 'boulder', x: 300, y: 160, r: 7, seed: 509 },
      { t: 'pine', x: 310, y: 186, h: 90, seed: 510 },
    ],
  },
  zones: [{ id: 'thin', x0: 104, y0: 127, x1: 216, y1: 149 }],
  things: [
    { id: 'ice', nouns: ['tarn', 'water'], x: 160, y: 138, reach: 400, look: 'Grey at the shore, and clearer toward the middle, where you can see down a long way. The bell goes on under the ice much further than it shows above. So do other shapes: a roof-tree, perhaps, and something like a wall.' },
    { id: 'bell', nouns: ['bell', 'inscription'], x: 160, y: 140, reach: 30, try: ['ring bell', 'read bell'], look: 'Bronze gone green, as tall as a man where it stands clear of the ice, and at least as much again below. Letters a hand high are cast into the rim.' },
    { id: 'trees', nouns: ['tree'], x: 30, y: 106, reach: 400, look: 'A few pines along the shore. Their roots have lifted old dressed stones out of the ground.' },
    { id: 'snow', nouns: ['snow', 'ground'], x: 160, y: 160, reach: 400, look: 'Blown thin over the ice. Where it has drifted against the bell it has a green shine.' },
    { id: 'sky', nouns: ['sky', 'mountain'], x: 160, y: 100, reach: 400, look: 'A wide grey sky, with nothing in it to ring a bell for.' },
  ],
  rules: [
    { enter: true, if: [{ not: { flag: 'seen.bellmere' } }], do: [{ set: 'seen.bellmere' }, { score: 5, id: 'seen.bellmere' }] },
    { zone: 'thin', if: [{ not: { flag: 'bell.frozen' } }], do: [{ die: 'You are a dozen paces out when the ice speaks, and it does not say anything you want to hear. The water under it is deep here, and the bell has been waiting a long time for company.' }] },
    { on: 'iska', if: [{ flag: 'bell.frozen' }], do: [{ say: 'The mere is as hard as it will go. Far below, something creaks.' }] },
    { on: 'iska', do: [{ set: 'bell.frozen' }, { score: 3, id: 'bell.frozen' }, { say: 'ISKA. The word goes out across the mere as frost, and the ice whitens and thickens under it with a long groan. It would bear you now, out to the bell.' }] },
    { on: ['cast frost'], if: [{ knows: 'frost' }, { not: { flag: 'bell.frozen' } }], do: [{ set: 'bell.frozen' }, { score: 3, id: 'bell.frozen' }, { say: 'You pour cold into cold. The ice groans, whitens, and thickens from shore to shore.' }] },
    { on: ['read bell', 'read inscription', 'look inscription'], if: [{ near: 'bell' }], do: [{ say: 'Cast into the rim, in letters a hand high: I CALLED THEM IN. I CALLED THEM HOME. I WAS NOT ANSWERED.' }] },
    { on: ['read bell', 'read inscription'], do: [{ say: 'There are letters on the rim, but you cannot make them out from the shore.' }] },
    { on: ['attack bell', 'push bell', 'pet bell', 'use bell', 'knock bell', 'veth'], if: [{ near: 'bell' }, { flag: 'bell.rung' }], do: [{ sound: 'word' }, { say: 'It rings again, lower and shorter. It has said what it had to say.' }] },
    {
      on: ['attack bell', 'push bell', 'pet bell', 'use bell', 'knock bell', 'veth'], if: [{ near: 'bell' }],
      do: [
        { set: 'bell.rung' }, { sound: 'word' }, { run: 'attune' }, { score: 10, id: 'bell.rung' },
        { say: 'You strike the bell. For a moment nothing happens, and you feel foolish. Then it speaks: one note, so deep that you feel it in the ice under your boots before you hear it. It goes out across the mere and the shore and the hills beyond, and it does not stop. Somewhere it is still going.\n\nPart of it stays. You can feel it settled behind your breastbone, where the words live, making room.' },
        { note: 'Your mana runs deeper than it did.' },
      ],
    },
    { on: ['attack bell', 'push bell', 'use bell', 'knock bell'], do: [{ say: 'You would have to be standing beside it, and it is a long way out.' }] },
    { on: ['take bell', 'pull bell'], do: [{ say: 'It weighs as much as a house and it is frozen into a lake. You give it a tug anyway, for the look of the thing.' }] },
    { on: ['swim', 'swim tarn', 'skate', 'skate tarn', 'fish', 'fish tarn'], do: [{ say: 'Not here. Whatever this water holds, it has held it a long time, and it does not look inclined to share.' }] },
  ],
};

export const hangtree: RoomDef = {
  id: 'hangtree',
  mark: 'dead',
  music: 'wild',
  name: 'The Hanging Tree',
  look: 'A dead oak the size of a hall stands alone on a rise, and from its boughs hang ropes: a dozen, more, each ending in a loop. Some of the loops are not empty. Below it reavers have pitched their tents, as if the tree were a banner.',
  lookWhen: [{ if: [{ quiet: true }], look: 'A dead oak the size of a hall stands alone on a rise, with ropes hanging from its boughs. The tents beneath it are empty now, and the fire is going out. The ropes turn a little in the wind.' }],
  scene: {
    kind: 'outdoor', horizon: 62, walkTop: 96,
    layers: [...far(62, 521), { t: 'path', w: 10, pts: [[160, 172], [150, 148], [130, 134]] }, { t: 'tufts', count: 10, seed: 524 }],
    props: [
      { t: 'deadtree', x: 174, y: 122, h: 112, seed: 14, v: 'ropes' },
      { t: 'tent', x: 70, y: 122, w: 46 },
      { t: 'tent', x: 262, y: 120, w: 42 },
      { t: 'campfire', x: 110, y: 152 },
      { t: 'boulder', x: 230, y: 158, r: 8, seed: 525 },
      { t: 'barrel', x: 40, y: 150 },
      { t: 'pine', x: 12, y: 186, h: 92, seed: 526 },
      { t: 'pine', x: 308, y: 186, h: 96, seed: 527 },
    ],
  },
  spawns: [
    { id: 'treechief', kind: 'chief', x: 130, y: 140, level: 2 },
    { id: 'treebandit', kind: 'bandit', x: 220, y: 146, level: 2 },
    { id: 'treearcher', kind: 'archer', x: 60, y: 140, level: 2 },
  ],
  things: [
    { id: 'oak', nouns: ['tree', 'rope'], x: 174, y: 126, reach: 40, try: ['cut rope'], look: 'An oak, dead these hundred years and hard as iron. The ropes are newer. Some are very new. You do not look closely at what is in the loops.' },
    { id: 'tents', nouns: ['tent', 'hearth', 'barrel'], x: 70, y: 126, reach: 400, look: 'Reavers\' tents, and a fire, and a barrel of something. They live here, under that. You wonder what it does to a man.' },
    { id: 'roots', nouns: ['ground', 'snow'], x: 174, y: 130, reach: 400, look: 'The snow is trodden hard all round the tree. Between two of the great roots it has been trodden, and then smoothed over again, by somebody who did not want it noticed.' },
    { id: 'hoard', nouns: ['chest'], x: 204, y: 134, reach: 28, icon: 'chest', hidden: true, try: ['open chest'], look: 'A chest, dug in between the roots and covered over. The reavers\' own share, kept from each other.' },
    { id: 'sky', nouns: ['sky', 'mountain'], x: 160, y: 100, reach: 400, look: 'Crows, a great many, going round and round the top of the tree. They have learned that it bears fruit.' },
  ],
  rules: [
    { enter: true, if: [{ not: { flag: 'seen.hangtree' } }], do: [{ set: 'seen.hangtree' }, { score: 5, id: 'seen.hangtree' }] },
    { on: ['climb tree', 'climb rope', 'jump tree'], do: [{ die: 'You go up the nearest rope hand over hand, to prove that it can be done. It can. It is when you reach for a second rope to come down by that you learn what the loops are for, and how well they were tied.' }] },
    { on: ['chop rope', 'take rope', 'attack rope', 'pull rope', 'chop tree'], if: [{ quiet: false }], do: [{ say: 'Its owners are standing between you and it, and they have noticed where you are looking.' }] },
    { on: ['chop rope', 'take rope', 'attack rope', 'pull rope', 'chop tree'], if: [{ near: 'oak', d: 60 }], do: [{ score: 2, id: 'tree.ropes' }, { say: 'You cut down every rope you can reach, and what is in them, and lay it straight in the snow. It takes a long time. Nobody will thank you for it. It seems the least that can be done.' }] },
    { on: ['chop rope', 'take rope', 'attack rope', 'pull rope', 'chop tree'], do: [{ say: 'You are not close enough.' }] },
    { on: 'orun', if: [{ not: { flag: 'tree.cache' } }], do: [{ set: 'tree.cache' }, { show: 'hoard' }, { score: 4, id: 'tree.cache' }, { say: 'ORUN. The trodden place between the roots shows for what it is: a lid, with a hand\'s depth of snow over it.' }] },
    { on: ['dig', 'dig ground', 'dig snow', 'look ground'], if: [{ not: { flag: 'tree.cache' } }], do: [{ say: 'You scrape at the hard snow between the roots with your hands. Something is there, you are sure of it; but you cannot find the edge of it. It wants uncovering by better means than fingers.' }] },
    { on: ['open chest', 'take chest', 'look chest'], if: [{ flag: 'tree.looted' }], do: [{ say: 'Empty. The reavers robbed the valley; you have robbed the reavers. The crows think this is very funny.' }] },
    { on: ['open chest', 'take chest', 'look chest'], if: [{ flag: 'tree.cache' }, { near: 'hoard' }], do: [{ set: 'tree.looted' }, { gold: 70 }, { give: 'torc' }, { give: 'potion', n: 2 }, { sound: 'take' }, { score: 5, id: 'tree.looted' }, { say: 'Seventy silver in a wet leather bag, two red draughts, and an iron torc with somebody else\'s hair still caught in the twist. You take all of it. You wash the torc in snow first.' }] },
  ],
};

export const dolmen: RoomDef = {
  id: 'dolmen',
  mark: 'stone',
  music: 'wild',
  name: "The Giant's Table",
  look: "Two stones the height of a house, and a third laid across them like a lintel, stand alone on a bare rise. Whoever raised them was either very many or very large. The snow under the capstone has never been snowed on.",
  lookWhen: [{ if: [{ night: true }], look: "Two stones the height of a house and a third laid across them, black against the stars. Under the capstone, where by day there was only bare rock, a rune is alight: cold, and steady, and green." }],
  scene: {
    kind: 'outdoor', horizon: 70, walkTop: 100,
    layers: [...far(70, 541), { t: 'tufts', count: 8, seed: 544 }],
    props: [
      { t: 'boulder', x: 60, y: 150, r: 9, seed: 545 },
      { t: 'boulder', x: 262, y: 156, r: 7, seed: 546 },
      { t: 'stone', x: 40, y: 122, h: 30, v: 'c', seed: 547 },
      { t: 'stone', x: 286, y: 126, h: 34, v: 'a', seed: 548 },
      { t: 'pine', x: 308, y: 186, h: 88, seed: 549 },
    ],
    when: [
      // The rune shows after dark, and for good once it has been read.
      { if: [{ not: { knows: 'word:sol' } }, { night: false }], props: [{ t: 'dolmen', x: 160, y: 124, w: 76, h: 56, seed: 6 }] },
      { if: [{ any: [{ knows: 'word:sol' }, { night: true }] }], props: [{ t: 'dolmen', x: 160, y: 124, w: 76, h: 56, seed: 6, v: 'lit' }] },
    ],
  },
  spawns: [
    { id: 'tablewarden1', kind: 'rimewalker', x: 110, y: 140, level: 2, when: 'night', respawn: 4000 },
    { id: 'tablewarden2', kind: 'wight', x: 214, y: 144, level: 2, when: 'night', respawn: 4000 },
  ],
  things: [
    { id: 'table', nouns: ['table', 'menhir', 'boulder'], x: 160, y: 128, reach: 400, look: 'The capstone alone must weigh as much as the Elder\'s hall. It has lain up there, level as a board, since before anybody was counting winters.' },
    {
      id: 'rune', nouns: ['rune', 'inscription'], x: 160, y: 130, reach: 36, try: ['read rune'],
      look: 'Under the capstone the rock has been cut back to make a smooth face, as if for a rune; but there is no rune on it. Lower down, scratched small and much later, in letters you can read: IT SHOWS ITSELF WHEN THE SUN IS GONE.',
      lookWhen: [{ if: [{ night: true }], look: 'A rune, alight on the smooth face under the capstone, giving a steady green light. It was not there by day. Below it, the later scratching: IT SHOWS ITSELF WHEN THE SUN IS GONE.' }],
    },
    { id: 'stones', nouns: ['tree'], x: 40, y: 124, reach: 400, look: 'Nothing grows up here. The two small stones on either side of the rise are the nearest thing to trees: markers, perhaps, to say that you have come far enough.' },
    { id: 'snow', nouns: ['snow', 'ground'], x: 160, y: 150, reach: 400, look: 'Wind-packed, except beneath the capstone, where the ground is bare and dry and oddly warm.' },
    { id: 'sky', nouns: ['sky', 'mountain'], x: 160, y: 100, reach: 400, look: 'From this rise you can see a very long way in every direction, and in every direction there is more of it.' },
  ],
  rules: [
    { enter: true, if: [{ not: { flag: 'seen.dolmen' } }], do: [{ set: 'seen.dolmen' }, { score: 5, id: 'seen.dolmen' }] },
    { on: ['read rune', 'pet rune', 'read inscription', 'pet inscription'], if: [{ knows: 'word:sol' }], do: [{ say: 'The rune burns on, whether the sun is up or not, now that it has been read. It has given you what it had.' }] },
    { on: ['read rune', 'pet rune', 'read inscription', 'pet inscription'], if: [{ not: { near: 'rune' } }], do: [{ say: 'You are not close enough.' }] },
    { on: ['read rune', 'pet rune', 'read inscription', 'pet inscription'], if: [{ night: false }], do: [{ say: 'You run your hand over the smooth face under the capstone. Bare rock. If there was ever a rune here, it is not here now. The scratching underneath says: IT SHOWS ITSELF WHEN THE SUN IS GONE.' }] },
    {
      on: ['read rune', 'pet rune', 'read inscription', 'pet inscription'],
      do: [
        { teach: 'word:sol' }, { run: 'study', arg: 40 }, { sound: 'word' }, { score: 10, id: 'word.sol' },
        { say: 'You lay your palm on the burning rune. It is not cold. It is the first warm thing you have touched out of doors since you came north, and the word that comes with it is warm too: SOL. Day. The thing the dead have forgotten, and cannot bear to be reminded of.' },
        { note: 'Tip: type SOL to speak the word.' },
      ],
    },
    { on: ['climb table', 'climb menhir', 'climb boulder', 'climb'], do: [{ die: 'You get up one of the uprights by fingertips and bad judgement, and stand on the capstone, lord of all you survey. It is the wind that takes you off it. It is a very long way down, onto very old rock.' }] },
    { on: ['sit', 'sit table', 'sleep', 'wait'], do: [{ say: 'You sit a while under the capstone, out of the wind. It is a good place to wait for something. People have plainly waited here before: the rock is worn where they sat.' }] },
    { on: ['push table', 'push menhir', 'pull table'], do: [{ say: 'You lean on it. It has stood through everything the sky could think of for longer than there have been people to lean on it.' }] },
  ],
};
