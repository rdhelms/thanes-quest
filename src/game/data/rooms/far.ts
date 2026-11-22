// Hand-made places far out in the wild: three landmarks, east, north and south.

import type { RoomDef } from '../../../engine/types';

export const far = (hz: number, seed: number): RoomDef['scene']['layers'] => [
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
    // Its reach stays inside the thin ice: the bell cannot be rung from the edge of it.
    { id: 'bell', nouns: ['bell', 'inscription'], x: 160, y: 140, reach: 18, try: ['ring bell', 'read bell'], look: 'Bronze gone green, as tall as a man where it stands clear of the ice, and at least as much again below. Letters a hand high are cast into the rim.' },
    { id: 'trees', nouns: ['tree'], x: 30, y: 106, reach: 400, look: 'A few pines along the shore. Their roots have lifted old dressed stones out of the ground.' },
    { id: 'snow', nouns: ['snow', 'ground'], x: 160, y: 160, reach: 400, look: 'Blown thin over the ice. Where it has drifted against the bell it has a green shine.' },
    { id: 'sky', nouns: ['sky', 'mountain'], x: 160, y: 100, reach: 400, look: 'A wide grey sky, with nothing in it to ring a bell for.' },
  ],
  rules: [
    { enter: true, if: [{ not: { flag: 'seen.bellmere' } }], do: [{ set: 'seen.bellmere' }, { score: 5, id: 'seen.bellmere' }] },
    { zone: 'thin', if: [{ not: { flag: 'bell.frozen' } }], do: [{ die: 'You are a dozen paces out when the ice speaks, and it does not say anything you want to hear. The water under it is deep here, and the bell has been waiting a long time for company.' }] },
    { on: 'iska', if: [{ flag: 'bell.frozen' }], do: [{ say: 'The mere is as hard as it will go. Far below, something creaks.' }] },
    { on: 'orun', do: [{ say: "ORUN. The ice goes clear, all the way down. There are roofs under it: a street of them, ridge-poles and all, running to the bell's foot. Further out, where the mere is deepest, a line of small dark shapes lies along the bottom, evenly spaced, as people are spaced who cross ice roped together. The bell called them in. You let the word go, and are glad to." }] },
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
  lookWhen: [
    { if: [{ flag: 'winter.broken' }, { flag: 'tree.cut' }], look: 'A dead oak the size of a hall stands alone on a rise, with cut ropes hanging from its boughs, dripping. The dead you laid straight beneath it have sunk into the soft snow as if into a bed.' },
    { if: [{ quiet: true }, { flag: 'tree.cut' }], look: 'A dead oak the size of a hall stands alone on a rise, with cut ropes hanging from its boughs. Under it, laid straight in the snow, are the dead you took down. The tents are empty, and the fire is going out.' },
    { if: [{ quiet: true }], look: 'A dead oak the size of a hall stands alone on a rise, with ropes hanging from its boughs, and not all of them empty. The tents beneath it are empty now, and the fire is going out. Nothing up there turns; there is not the wind for it.' },
  ],
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
    { id: 'oak', nouns: ['tree', 'rope'], x: 174, y: 126, reach: 40, try: ['cut rope'], look: 'An oak, dead these hundred years and hard as iron. The ropes are newer. Some are very new. You do not look closely at what is in the loops; only closely enough to see that every one of them hangs facing the same way.',
      lookWhen: [{ if: [{ flag: 'tree.cut' }], look: 'An oak, dead these hundred years and hard as iron, with a dozen cut ropes hanging from it. It is only a tree again.' }],
    },
    {
      id: 'laid', nouns: ['wight', 'bones'], x: 150, y: 150, reach: 60, hidden: true, look: 'The dead you cut down, laid straight in the snow, side by side, with their hands put together. You did not know any of their names. All of them had been hanging with their faces to the north.',
      lookWhen: [{ if: [{ flag: 'winter.broken' }], look: 'The dead you laid straight have sunk into the soft snow as if into a bed. They do not look as if they mean to get up.' }],
    },
    { id: 'tents', nouns: ['tent', 'hearth', 'barrel'], x: 70, y: 126, reach: 400, look: 'Reavers\' tents, and a fire, and a barrel of something. They live here, under that. You wonder what it does to a man.' },
    { id: 'roots', nouns: ['ground', 'snow'], x: 174, y: 130, reach: 400, look: 'The snow is trodden hard all round the tree. Between two of the great roots it has been trodden, and then smoothed over again, by somebody who did not want it noticed.' },
    { id: 'hoard', nouns: ['chest'], x: 204, y: 134, reach: 28, icon: 'chest', hidden: true, try: ['open chest'], look: 'A chest, dug in between the roots and covered over. The reavers\' own share, kept from each other.' },
    { id: 'sky', nouns: ['sky', 'mountain'], x: 160, y: 100, reach: 400, look: 'Crows, a great many, going round and round the top of the tree. They have learned that it bears fruit.' },
  ],
  rules: [
    { enter: true, if: [{ not: { flag: 'seen.hangtree' } }], do: [{ set: 'seen.hangtree' }, { score: 5, id: 'seen.hangtree' }] },
    { on: ['climb tree', 'climb rope', 'jump tree'], do: [{ die: 'You go up the nearest rope hand over hand, to prove that it can be done. It can. It is when you reach for a second rope to come down by that you learn what the loops are for, and how well they were tied.' }] },
    { on: ['chop rope', 'take rope', 'attack rope', 'pull rope', 'chop tree'], if: [{ quiet: false }], do: [{ say: 'Its owners are standing between you and it, and they have noticed where you are looking.' }] },
    { enter: true, if: [{ flag: 'tree.cut' }], do: [{ show: 'laid' }] },
    { on: ['chop rope', 'take rope', 'attack rope', 'pull rope', 'chop tree'], if: [{ flag: 'tree.cut' }], do: [{ say: 'There is nothing left up there but rope.' }] },
    { on: ['chop rope', 'take rope', 'attack rope', 'pull rope', 'chop tree'], if: [{ near: 'oak', d: 60 }], do: [{ set: 'tree.cut' }, { show: 'laid' }, { score: 2, id: 'tree.ropes' }, { say: 'You cut the dead down, every one you can reach, and lay them straight in the snow. It takes a long time. Nobody will thank you for it.\n\nAll of them had been hanging with their faces turned north, as if the wind had turned them; though nothing up there has moved in a long time.' }] },
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
  lookWhen: [{ if: [{ night: true }], look: "Two stones the height of a house and a third laid across them, black against the stars. Under the capstone, where by day there was only bare rock, a rune has lit: dull red, like a coal seen through a hand." }],
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
      lookWhen: [{ if: [{ night: true }], look: 'A rune, alight on the smooth face under the capstone, like a coal seen through a hand. It was not there by day. Below it, the later scratching: IT SHOWS ITSELF WHEN THE SUN IS GONE.' }],
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
        { say: 'You lie on your back on the frozen ground and put your palm flat against it, and it is warm. In all that country it is the only warm stone there is.\n\nThe word is SOL, and it tastes like summer, which you do not remember ever having had.' },
        { quest: 'north', stage: 3 }, { set: 'goal.gate', to: 'northgate' }, { note: 'The gate in the north is marked on your map.' },
        { note: 'Tip: type SOL to speak the word.' },
      ],
    },
    { on: ['climb table', 'climb menhir', 'climb boulder', 'climb'], do: [{ die: 'You get up one of the uprights by fingertips and bad judgement, and stand on the capstone, lord of all you survey. It is the wind that takes you off it. It is a very long way down, onto very old rock.' }] },
    { on: ['sit', 'sit table', 'sleep', 'wait'], do: [{ say: 'You sit a while under the capstone, out of the wind. It is a good place to wait for something. People have plainly waited here before: the rock is worn where they sat.' }] },
    { on: ['push table', 'push menhir', 'pull table'], do: [{ say: 'You lean on it. It has stood through everything the sky could think of for longer than there have been people to lean on it.' }] },
  ],
};

