// The road north: the gate in the last wall, and what lies beyond it. Five screens, one beyond
// another, each reached only from the one before:
//
//   hollow       where she kneels
//   hanging      the hanging snow
//   windend      where the wind stops
//   oldroad      the stone nobody living has read
//   northgate    two towers, and the guards nobody came to relieve
//
// Past the gate nothing is generated: the wall it stands in runs on east and west without end
// (`northWall` in data/frontier.ts).

import type { Cond, RoomDef, ThingDef } from '../../../engine/types';
import { far } from './far';

/** The word has ended: the snow has come down, and there is weather again. */
const BROKEN: Cond = { flag: 'winter.broken' };
const HELD: Cond = { not: BROKEN };

/** The same white ground and white sky all the way: the mountains are behind, here. */
const waste = (hz: number, seed: number): RoomDef['scene']['layers'] => [{ t: 'whiteout', horizon: hz }, { t: 'mountains', base: hz + 3, height: 12, seed, far: true }, { t: 'snow', from: hz + 2 }];

/** Nothing burns in the still country, and the coal will not wake. */
const noFire = (ids: string[]): RoomDef['rules'] => [
  { on: ['light', 'light *', 'use flint', 'use flint *', 'cast flame'], if: [HELD], do: [{ say: 'Nothing will burn here. You strike the steel, and the sparks hang in the air like little red seeds, and go dark where they hang.' }] },
  { on: ['warm', 'warm *'], if: [HELD], do: [{ say: 'There is nothing here to be warm by, and there has not been for a very long time.' }] },
  { on: ['listen', 'listen *'], if: [HELD, { at: ids }], do: [{ say: 'Nothing. No wind. You can hear your own eyelids.' }] },
];

const stillSky = (held: string, broken: string): ThingDef => ({ id: 'sky', nouns: ['sky', 'weather', 'mountain'], x: 160, y: 60, reach: 400, look: held, lookWhen: [{ if: [BROKEN], look: broken }] });

export const northgate: RoomDef = {
  id: 'northgate',
  mark: 'gate',
  music: 'barrow',
  name: 'The Gate',
  look: 'The last wall you can see runs right across the north, and in the one gap in it stands a gate: two square towers, and no doors between them. In the gap, in a row, are the guards of some kingdom that nobody has a name for any more. They are frost to the bone, and still at their posts.',
  lookWhen: [
    { if: [BROKEN], look: 'Two square towers stand in the one gap in the north wall, and the road runs between them. The doors of the towers stand open. Inside, the dead guards are sitting with their backs against the stones, all in a row, like men at the end of a long watch. There is a thin rain.' },
    { if: [{ flag: 'gate.open' }], look: 'Two square towers stand in the one gap in the north wall, and the road between them is open. The guards have gone back into the dark of their towers. Past the gate the old road goes on north, and nothing on it has a track.' },
  ],
  scene: {
    kind: 'outdoor', horizon: 60, walkTop: 112,
    layers: [...far(60, 601), { t: 'path', w: 12, pts: [[160, 172], [160, 150], [160, 126], [160, 112]] }, { t: 'tufts', count: 8, seed: 604 }],
    props: [
      { t: 'scarp', x: 0, y: 0, v: 'n', w: 64, seed: 61 },
      { t: 'tower', x: 112, y: 122, w: 40, h: 96, seed: 62 },
      { t: 'tower', x: 208, y: 122, w: 40, h: 96, seed: 63 },
      { t: 'boulder', x: 52, y: 150, r: 9, seed: 605 },
      { t: 'boulder', x: 272, y: 156, r: 7, seed: 606 },
      { t: 'deadtree', x: 292, y: 140, h: 44, seed: 607 },
    ],
  },
  exits: { n: 'oldroad' },
  holds: { n: 'The dead guards close the way. They were posted here to let nobody through, and nobody has ever told them otherwise.' },
  spawns: [
    { id: 'guard1', kind: 'gateguard', x: 136, y: 128, level: 1, if: [{ not: { flag: 'gate.open' } }] },
    { id: 'guard2', kind: 'gateguard', x: 152, y: 132, level: 1, if: [{ not: { flag: 'gate.open' } }] },
    { id: 'guard3', kind: 'gateguard', x: 168, y: 132, level: 1, if: [{ not: { flag: 'gate.open' } }] },
    { id: 'guard4', kind: 'gateguard', x: 184, y: 128, level: 1, if: [{ not: { flag: 'gate.open' } }] },
  ],
  things: [
    {
      id: 'gate', nouns: ['gap', 'tower', 'door'], x: 160, y: 118, reach: 400, look: 'Two square towers of fitted stone, with a road between them and a dark doorway in the foot of each. Whoever built them built to last, and went away, and forgot to send word.',
      lookWhen: [{ if: [BROKEN], look: 'Two square towers of fitted stone. Their doors stand open, and water is running down the walls.' }],
    },
    {
      id: 'watch', nouns: ['guard'], x: 160, y: 124, reach: 400, hidden: true,
      look: 'They are inside the towers, in the dark, where the word sent them. You can see the shine of frost in there, in a row, and it does not move.',
      lookWhen: [{ if: [BROKEN], look: 'The dead guards are sitting with their backs against the stones, all in a row, with what is left of their spears across their knees: like men at the end of a long watch, who have at last been told.' }],
    },
    { id: 'wall', nouns: ['scarp', 'mountain'], x: 160, y: 100, reach: 400, look: 'Sheer rock, east and west as far as you can see, and nothing but this one gap in it. It is the last wall there is. Past it the sky is a different white.' },
    { id: 'snow', nouns: ['snow', 'ground', 'path'], x: 160, y: 150, reach: 400, look: 'The old road, under the snow, running up to the gate. Nothing has trodden it this winter but you; nor, by the look of it, for a good many winters before.' },
    stillSky('North of the wall the sky is very white, and very even. Nothing moves in it. You can stand here and see where the wind stops.', 'There is weather over the wall, for the first time in anybody\'s life: cloud, moving, and rain coming out of it.'),
  ],
  rules: [
    { enter: true, if: [{ not: { flag: 'seen.northgate' } }], do: [{ set: 'seen.northgate' }, { score: 5, id: 'seen.northgate' }] },
    {
      enter: true, if: [{ not: { flag: 'gate.open' } }, { not: { flag: 'gate.met' } }],
      do: [{ set: 'gate.met' }, { say: 'The gate is where Fenn said it would be: two square towers in a gap in the last wall you can see, and between them, in a row, the guards of some kingdom that nobody has a name for any more. They are frost to the bone, and still at their posts, like men nobody ever came to relieve.\n\nWhen you come up the road they turn their heads all together to look at you, and lift what is left of their spears.' }],
    },
    { enter: true, if: [{ flag: 'gate.open' }], do: [{ show: 'watch' }] },
    {
      on: 'sol', if: [{ not: { flag: 'gate.open' } }],
      do: [
        { set: 'gate.open' }, { run: 'guardsGo' }, { show: 'watch' }, { sound: 'door' }, { score: 10, id: 'gate.open' }, { quest: 'north', stage: 4 },
        { say: 'You say the sun\'s name.\n\nThey cannot bear it. They turn their faces from it and go back into the dark of their towers, and the road between is open.' },
      ],
    },
    { on: 'sol', if: [BROKEN], do: [{ say: 'SOL. In the towers nobody stirs. They have been told already, and by something bigger than a word.' }] },
    { on: 'sol', do: [{ say: 'SOL. In the dark of the towers there is a sound like a row of men turning their faces to the wall.' }] },
    { on: 'iska', if: [{ not: { flag: 'gate.open' } }], do: [{ say: 'ISKA. They stop where they stand; but they were not going anywhere. When the word lets go of them they are exactly as they were. Stillness is no news to these.' }] },
    { on: 'veth', if: [{ not: { flag: 'gate.open' } }], do: [{ say: 'VETH. It throws the nearest of them back a spear\'s length. They get up, without hurry, and walk back to their places in the row.' }] },
    { on: ['enter tower', 'enter door', 'open door', 'climb tower', 'knock door'], if: [BROKEN], do: [{ say: 'You stand in the doorway a moment. They are sitting in a row along the wall, and one of them has let his head go back against the stone. You do not go in. It is their guardroom, and they are off watch.' }] },
    { on: ['enter tower', 'enter door', 'open door', 'climb tower', 'knock door'], do: [{ say: 'The doorways are dark, and what is in the dark belongs there. You stay on the road.' }] },
    { on: ['climb scarp', 'climb gap', 'climb'], do: [{ say: 'The rock is sheer and glazed with ice. There is a gate. That is what it is for.' }] },
  ],
};

export const oldroad: RoomDef = {
  id: 'oldroad',
  mark: 'stone',
  music: 'barrow',
  name: 'The Old Road',
  look: 'Beyond the gate the old road runs on north, straight, under snow that nobody has trodden. At the side of it there is a stone, with a rune on it worn nearly smooth. The wall and its two towers are behind you. Ahead, the sky is white, and even, and very quiet.',
  lookWhen: [
    { if: [BROKEN], look: 'The old road runs north from the gate, under snow that is going grey and soft, with the flags showing through in places. At the side of it stands a stone with a worn rune. There is a wind, and it has rain in it.' },
    { if: [{ flag: 'road.prints' }], look: 'Beyond the gate the old road runs on north, straight. At the side of it there is a stone, with a rune on it worn nearly smooth. Under the snow of the road, many winters down, there are footprints: a woman\'s, and a child\'s. They go north.' },
  ],
  scene: {
    kind: 'outdoor', horizon: 62, walkTop: 92,
    layers: [...waste(62, 611), { t: 'path', w: 12, pts: [[160, 172], [160, 140], [160, 110], [160, 90]] }, { t: 'tufts', count: 6, seed: 614 }],
    props: [
      { t: 'boulder', x: 40, y: 150, r: 7, seed: 615 },
      { t: 'boulder', x: 286, y: 132, r: 9, seed: 616 },
      { t: 'deadtree', x: 60, y: 118, h: 40, seed: 617 },
    ],
    when: [
      { if: [{ not: { knows: 'word:orun' } }], props: [{ t: 'stone', x: 214, y: 134, h: 42, v: 'a', seed: 9 }] },
      { if: [{ knows: 'word:orun' }], props: [{ t: 'stone', x: 214, y: 134, h: 42, v: 'a', seed: 9, lit: 1 }] },
    ],
  },
  exits: { s: 'northgate', n: 'windend' },
  haven: true,
  things: [
    { id: 'stone', nouns: ['menhir', 'rune'], x: 214, y: 136, reach: 34, try: ['read rune'], look: 'A standing stone at the side of the old road, with a rune on it worn nearly smooth by weather. Nobody living has read it in a very long time. The snow at its foot has never had a boot in it.' },
    {
      id: 'prints', nouns: ['tracks'], x: 160, y: 130, reach: 60, hidden: true,
      look: 'Footprints, under the snow of the road, many winters down. A woman\'s, long in the stride. And beside them, wandering from one side of the road to the other, as a child goes who has been walking a long time: a child\'s. They come up the road from the gate behind you, and go on north.',
      lookWhen: [{ if: [BROKEN], look: 'The thaw has let the old snow down, layer after layer, and the footprints are going with it. In a day they will be water.' }],
    },
    { id: 'road', nouns: ['path', 'snow', 'ground'], x: 160, y: 150, reach: 400, look: 'A road, flagged, by the feel of it underfoot, and as wide as a cart. It runs north as straight as a rule. Somebody meant people to go this way, once, and a good many did.' },
    { id: 'wall', nouns: ['scarp', 'gap', 'tower'], x: 160, y: 168, reach: 400, look: 'The wall and the two towers of the gate, behind you, seen from the side that nobody sees them from.' },
    stillSky('White, and even, from the wall to the edge of seeing. There is less wind here than there was at the gate. A little further on, by the look of it, there is none.', 'Cloud, low and grey and going south in a hurry, as if it had three hundred years of lateness to make up.'),
  ],
  rules: [
    { enter: true, if: [{ not: { flag: 'seen.oldroad' } }], do: [{ set: 'seen.oldroad' }, { score: 3, id: 'seen.oldroad' }] },
    { enter: true, if: [{ flag: 'road.prints' }], do: [{ show: 'prints' }] },
    {
      on: ['read menhir', 'read rune', 'pet menhir', 'pet rune', 'look rune'], if: [{ near: 'stone' }, { not: { knows: 'word:orun' } }],
      do: [
        { teach: 'word:orun' }, { run: 'study', arg: 40 }, { sound: 'word' }, { score: 10, id: 'word.orun' },
        { say: 'Beyond the gate, at the side of the old road, there is a stone with a rune worn nearly smooth, that nobody living has read in a very long time. You read it, and stand in the road for a while with your hand on it, thinking about Fenn, and sixty years, and this on the other side of a gate he could not pass.\n\nThe word is ORUN. It shows what is hidden.' },
        { note: 'Tip: type ORUN to speak the word.' },
      ],
    },
    { on: ['read menhir', 'read rune', 'pet menhir', 'pet rune'], if: [{ near: 'stone' }], do: [{ say: 'The rune glows faintly now. It has given you what it had.' }] },
    { on: ['read menhir', 'read rune', 'pet menhir', 'pet rune'], do: [{ say: 'You are not close enough.' }] },
    {
      on: 'orun', if: [{ not: { flag: 'road.prints' } }],
      do: [
        { set: 'road.prints' }, { show: 'prints' }, { score: 5, id: 'road.prints' }, { quest: 'north', stage: 5 },
        { say: 'You say it at the road.\n\nThe snow on the road thins like breath on cold glass, and under it, many winters down, there are footprints. A woman\'s, long-strided, and beside them, wandering from side to side, a child\'s. They come up the road from the gate behind you and go on north, the way you are going, the way nobody goes.' },
      ],
    },
    { on: 'orun', do: [{ say: 'ORUN. The footprints are as they were: hers, long in the stride, and the small ones beside them, wandering. North.' }] },
    { on: ['follow tracks', 'follow'], if: [{ flag: 'road.prints' }], do: [{ say: 'They go north, up the middle of the road. So does the road.' }] },
    ...noFire(['oldroad'])!.slice(1, 2),
  ],
};

export const windend: RoomDef = {
  id: 'windend',
  mark: 'open',
  music: 'barrow',
  name: 'Where the Wind Stops',
  hung: 50,
  look: 'The wind has stopped. Here and there a flake of snow hangs in the air at the height of your face, fixed, so that you have to go round it. To the north they hang thicker, and thicker, until there is a wall of them. Beyond, at the very edge of seeing, there are towers, and the roofs of a town under the snow, and no smoke over any of it.',
  lookWhen: [
    { if: [BROKEN], look: 'Snow is coming down, big and wet and slow, and the wind is blowing it sideways. You walk out of the hanging country into wind. A long way north there are towers, and the roofs of a town, going grey as the snow slides off them.' },
    { if: [{ flag: 'still.path1' }], look: 'The wind has stopped. Flakes of snow hang in the air, fixed, each where it was. To the north they hang as thick as a wall; and through the wall goes a path as wide as you are, where a word pushed them aside. Beyond, at the very edge of seeing, there are towers, and the roofs of a town.' },
  ],
  scene: {
    kind: 'outdoor', horizon: 58, walkTop: 86,
    layers: [...waste(58, 621), { t: 'tufts', count: 4, seed: 624 }],
    props: [
      { t: 'boulder', x: 70, y: 140, r: 8, seed: 625 },
      { t: 'deadtree', x: 262, y: 128, h: 46, seed: 626 },
    ],
    when: [
      { if: [HELD, { not: { flag: 'still.path1' } }], props: [{ t: 'hangsnow', x: 0, y: 100, h: 78, seed: 3 }] },
      { if: [HELD, { flag: 'still.path1' }], props: [{ t: 'hangsnow', x: 0, y: 100, h: 78, w: 22, seed: 3 }] },
    ],
  },
  exits: { s: 'oldroad', n: 'hanging' },
  haven: true,
  zones: [{ id: 'curtain', x0: 0, y0: 86, x1: 320, y1: 100 }],
  things: [
    {
      id: 'flakes', nouns: ['snow'], x: 160, y: 110, reach: 400, look: 'Each flake hangs where it was when it stopped: not falling, not drifting. You put out a hand, and they do not move aside for it. They are as fixed as nails. To the north they are so thick that there is no going between them.',
      lookWhen: [
        { if: [BROKEN], look: 'Snow. It falls, and lands, and lies there, and after a while it melts. You stand and watch it do that for longer than you would admit to.' },
        { if: [{ flag: 'still.path1' }], look: 'The path your word made stands open through the hanging snow, as wide as you are, its walls as fixed as the rest. It does not close.' },
      ],
    },
    { id: 'town', nouns: ['village', 'tower', 'roof'], x: 160, y: 60, reach: 400, look: 'Towers, and the roofs of a town under the snow, a long way off. No smoke over any of it. The snow above it has been in the middle of falling for a very long time.', lookWhen: [{ if: [BROKEN], look: 'A town, a long way off, with the snow sliding from its roofs for the first time in three hundred winters. Nobody lives there. Somebody may again.' }] },
    { id: 'tracks', nouns: ['tracks', 'path', 'ground'], x: 160, y: 150, reach: 400, look: 'The footprints go on, north. They are nearer the top of the snow here. Less has fallen on them.', lookWhen: [{ if: [BROKEN], look: 'Wet snow, with your own prints in it and nobody else\'s.' }] },
    stillSky('White, and still. There is no weather in it at all.', 'Grey, and low, and moving. It is the best sky you have ever seen.'),
  ],
  rules: [
    { enter: true, if: [{ not: { flag: 'seen.windend' } }], do: [{ set: 'seen.windend' }, { score: 3, id: 'seen.windend' }] },
    {
      enter: true, if: [HELD, { not: { flag: 'still.told' } }, { flag: 'tower.still' }],
      do: [{ set: 'still.told' }, { say: 'You know when you have come into it, because the wind stops.\n\nIt does not die down. It stops, the way the snow stopped at the watchtower. A little further on, the snow stops too, and hangs. At first it is only a few flakes here and there, fixed in the air at the height of your face, so that you have to go round them. Between them, a long way ahead, at the very edge of seeing, there are towers, and the roofs of a town under the snow, and no smoke over any of it.' }],
    },
    {
      enter: true, if: [HELD, { not: { flag: 'still.told' } }],
      do: [{ set: 'still.told' }, { say: 'You know when you have come into it, because the wind stops.\n\nIt does not die down. It stops. A little further on, the snow stops too, and hangs. At first it is only a few flakes here and there, fixed in the air at the height of your face, so that you have to go round them. Between them, a long way ahead, at the very edge of seeing, there are towers, and the roofs of a town under the snow, and no smoke over any of it.' }],
    },
    {
      enter: true, if: [BROKEN, { not: { flag: 'still.rain' } }],
      do: [{ set: 'still.rain' }, { say: 'The winter is breaking, and the thaw goes south faster than you can walk. You walk out of the hanging country into wind, and out of wind into a thin, astonishing rain.' }],
    },
    { zone: 'curtain', if: [HELD, { not: { flag: 'still.path1' } }], do: [{ goto: 'windend', x: 160, y: 112, dir: 'up' }, { say: 'Here the snow hangs as thick as a wall: a whole sky of it, stopped in the middle of falling. You put your shoulder to it. It does not give. Each flake is as fixed as a nail, and will not be gone round, and will not move aside.' }, { note: 'It wants pushing aside by something stronger than a shoulder.' }] },
    {
      on: 'veth', if: [HELD, { not: { flag: 'still.path1' } }],
      do: [{ set: 'still.path1' }, { sound: 'door' }, { score: 3, id: 'still.path1' }, { say: 'You say VETH, and it pushes a path open through the hanging snow: the flakes go aside like a crowd, and stay where they are pushed. You can walk down it.' }],
    },
    { on: 'veth', if: [HELD], do: [{ say: 'VETH. The path is open already. The word goes down it, and you do not hear it come to anything.' }] },
    { on: 'iska', if: [HELD], do: [{ say: 'ISKA. You say it, and nothing changes; and you understand that this is because it is being said already. Everything here is inside that word. Yours goes into it like a cup of water into a lake. But the warmth goes out of your hands just the same.' }] },
    { on: 'sol', if: [HELD], do: [{ say: 'SOL. For the length of the word there are shadows: yours, and ten thousand small ones, one under every hanging flake. Then they are gone, and nothing has moved.' }] },
    { on: 'orun', if: [HELD], do: [{ say: 'ORUN. The footprints show, a hand\'s depth under the snow here and no more: hers, and the small ones, which have begun to drag.' }] },
    { on: ['push snow', 'attack snow', 'take snow', 'pet snow'], if: [HELD], do: [{ say: 'You take hold of a flake between finger and thumb. It is like taking hold of a nail driven into the air. It does not come.' }] },
    ...noFire(['windend'])!,
  ],
};

export const hanging: RoomDef = {
  id: 'hanging',
  mark: 'open',
  music: 'barrow',
  name: 'The Hanging Snow',
  hung: 420,
  look: 'It is all of it now: a whole sky of snow that has been in the middle of falling for longer than anyone can remember, so thick that you cannot see your own feet. A raven hangs above you with its wings half open, at the top of a beat it began before anybody\'s grandmother was born. The footprints go on. You are walking in a path as wide as you are, and it ends just ahead.',
  lookWhen: [
    { if: [BROKEN], look: 'Snow is falling: only falling, and a wind is taking it. Where the raven hung there is nothing but air. The footprints you followed are gone under it; your own are filling as you look.' },
    { if: [{ flag: 'still.path2' }], look: 'A whole sky of snow hangs round you, stopped, so thick that you cannot see your own feet; and through it, north, goes the path your word made. A raven hangs above you with its wings half open. From up the path comes a small dry sound, over and over, with no space at all between one and the next.' },
  ],
  scene: {
    kind: 'outdoor', horizon: 54, walkTop: 86,
    layers: [...waste(54, 631)],
    props: [{ t: 'boulder', x: 250, y: 150, r: 7, seed: 635 }],
    when: [
      { if: [HELD, { not: { flag: 'still.path2' } }], props: [{ t: 'hangsnow', x: 0, y: 100, h: 90, seed: 5 }, { t: 'hangsnow', x: 0, y: 172, h: 60, w: 26, seed: 6 }] },
      { if: [HELD, { flag: 'still.path2' }], props: [{ t: 'hangsnow', x: 0, y: 100, h: 90, w: 22, seed: 5 }, { t: 'hangsnow', x: 0, y: 172, h: 60, w: 26, seed: 6 }] },
    ],
  },
  exits: { s: 'windend', n: 'hollow' },
  haven: true,
  zones: [{ id: 'curtain', x0: 0, y0: 86, x1: 320, y1: 100 }],
  things: [
    {
      id: 'raven', nouns: ['raven'], x: 160, y: 70, reach: 400, look: 'A raven, hanging in the air above the road with its wings half open, at the top of a beat. One eye is toward you. It has been on its way somewhere for three hundred winters.',
      lookWhen: [{ if: [BROKEN], look: 'Gone. It dropped out of the air when the snow did, and caught itself, and went off north, complaining.' }],
    },
    {
      id: 'tracks', nouns: ['tracks', 'path', 'ground'], x: 160, y: 140, reach: 400,
      look: 'The footprints are on top of the snow now, sharp at the edges, as if they had been made this morning. Here, a long way short of the town, the small ones stop. The large ones go on, deeper, as if she was carrying something.',
      lookWhen: [{ if: [BROKEN], look: 'Wet snow, falling into wet snow. Nothing is written in it but you.' }],
    },
    {
      id: 'flakes', nouns: ['snow'], x: 160, y: 110, reach: 400, look: 'It hangs so thick that the air is more snow than air. None of it is falling. None of it has fallen in three hundred winters.',
      lookWhen: [{ if: [BROKEN], look: 'Snow. It comes down, and the wind takes it.' }],
    },
    stillSky('You cannot see it. There is only the snow, hanging, as far up as you can look.', 'There is a sky again. It is grey, and it is moving.'),
  ],
  rules: [
    { enter: true, if: [{ not: { flag: 'seen.hanging' } }], do: [{ set: 'seen.hanging' }, { score: 3, id: 'seen.hanging' }] },
    {
      enter: true, if: [HELD, { not: { flag: 'still.deep' } }],
      do: [{ set: 'still.deep' }, { say: 'Then it is all of it: a whole sky of snow that has been in the middle of falling for longer than anyone can remember, so thick that you cannot see your own feet. A raven hangs above you with its wings half open, at the top of a beat it began before anybody\'s grandmother was born.\n\nThe footprints go on, nearer the top of the snow now, and then on top of it, sharp at the edges, as if they had been made this morning. After a while, a long way short of the town, the small ones stop, and the large ones go on deeper, as if she was carrying something.' }],
    },
    { zone: 'curtain', if: [HELD, { not: { flag: 'still.path2' } }], do: [{ goto: 'hanging', x: 160, y: 112, dir: 'up' }, { say: 'The path your word made ends here, in a wall of hanging snow. It does not give. When your tongue is ready, you will have to say it again.' }] },
    {
      on: 'veth', if: [HELD, { not: { flag: 'still.path2' } }],
      do: [{ set: 'still.path2' }, { sound: 'door' }, { score: 3, id: 'still.path2' }, { say: 'VETH. The snow goes aside, and stays aside, and the path runs on north.\n\nThen you hear it, before you see anything: a small dry sound, over and over, like ice settling in a cold night, with no space at all between one and the next.' }],
    },
    { on: 'veth', if: [HELD], do: [{ say: 'VETH. The path is open. Up it, the small dry sound does not miss a beat.' }] },
    { on: 'iska', if: [HELD], do: [{ say: 'ISKA. Yours goes into the word that is already being said here, and is lost in it. The raven does not so much as settle a feather.' }] },
    { on: 'sol', if: [HELD], do: [{ say: 'SOL. For the length of the word the hanging snow is lit from inside, every flake of it, like a room full of candles. Then it is white again, and nothing has moved. Whoever is saying the other word is not near enough to hear this one.' }] },
    { on: 'orun', if: [HELD], do: [{ say: 'ORUN. There is nothing hidden here. The prints are on the top of the snow, plain as writing: where the small ones stop, and the large ones sink.' }] },
    { on: ['listen', 'listen *'], if: [HELD, { flag: 'still.path2' }], do: [{ say: 'A small dry sound, over and over, like ice settling in a cold night, with no space at all between one and the next. It is a voice. It is saying one word.' }] },
    { on: ['take raven', 'pet raven', 'push raven', 'attack raven', 'talk raven'], if: [HELD], do: [{ say: 'It hangs a little higher than you can reach, which is as well for both of you. Its eye does not follow you. It is still looking at whatever it was looking at three hundred winters ago.' }] },
    { on: ['push snow', 'attack snow', 'take snow', 'pet snow'], if: [HELD], do: [{ say: 'It is like pushing at a wall of nails.' }] },
    ...noFire(['hanging'])!,
  ],
};

/** "The woman" is the baker's word everywhere else, so the parser hears it as hers: here it can only mean one person. */
const her = (patterns: string[]): string[] => patterns.flatMap((p) => (p.includes('kneeler') ? [p, p.replace('kneeler', 'sigga')] : [p]));

const GIVE = her(['give ember', 'give ember kneeler', 'give kneeler ember', 'use ember kneeler', 'drop ember', 'give ember boy']);
const TAKE = ['take boy', 'pull boy', 'pet boy', 'take boy ember', 'use ember boy'];

export const hollow: RoomDef = {
  id: 'hollow',
  mark: 'open',
  music: 'barrow',
  name: 'The Hollow',
  hung: 420,
  look: 'She is kneeling in a hollow in the snow. Frost has grown over her shoulders like a fur. Her hands are spread flat on the drift in front of her, and her lips are moving. All round, as far up as you can look, the snow hangs.',
  lookWhen: [
    { if: [BROKEN, { flag: 'coal.given' }], look: 'There is a hollow in the snow, and the print of two knees, and you. Snow is falling into it. In a day there will be nothing here to show where anybody knelt.' },
    { if: [BROKEN, { flag: 'boy.home' }], look: 'There is a hollow in the snow, and the print of two knees, and a smaller hollow in front of them. Snow is falling into both.' },
    { if: [BROKEN], look: 'There is a hollow in the snow, and the print of two knees. In front of them a small boy lies curled on his side, with the snow coming down on him. He has finished his breath. A track goes off north into the white, where nobody is.' },
    { if: [{ flag: 'hollow.joined' }], look: 'You are kneeling beside her in the hollow. Her lips have stopped. She is looking at you, and at your hand, and at the ring on it. The snow still hangs, the whole sky of it, held up now by nothing but you. Your word is going.' },
    { if: [{ flag: 'hollow.seen' }], look: 'She is kneeling in a hollow in the snow, with her hands spread flat on the drift, and her lips moving. Under her hands, under the snow, a small boy lies curled on his side, facing her, with his breath hanging in front of his mouth: halfway out of him, and not finished.' },
  ],
  scene: {
    kind: 'outdoor', horizon: 54, walkTop: 96,
    layers: [...waste(54, 641), { t: 'ice', x: 160, y: 132, rx: 46, ry: 10 }],
    props: [{ t: 'boulder', x: 60, y: 150, r: 6, seed: 645 }],
    when: [
      { if: [{ any: [{ flag: 'hollow.seen' }, { flag: 'sol.said' }] }, { not: { flag: 'coal.given' } }, { not: { flag: 'boy.home' } }], props: [{ t: 'hump', x: 160, y: 138, w: 22, h: 6 }] },
      { if: [HELD], props: [{ t: 'hangsnow', x: 0, y: 100, h: 90, seed: 7 }] },
    ],
  },
  exits: { s: 'hanging' },
  haven: true,
  zones: [{ id: 'away', x0: 0, y0: 160, x1: 320, y1: 172 }],
  npcs: [{ char: 'kneeler', x: 160, y: 126, dir: 'down', if: [HELD] }],
  things: [
    {
      id: 'drift', nouns: ['snow', 'ground'], x: 160, y: 136, reach: 400, try: ['kneel beside her', 'give the coal to her'], look: 'The drift under her hands. She has them on it the way you would put your hands on somebody\'s back, to feel them breathing.',
      lookWhen: [
        { if: [BROKEN], look: 'Snow, falling into a hollow, and filling it.' },
        { if: [{ flag: 'hollow.seen' }], look: 'The drift is clear as a window where the word wiped it. He is under it, curled on his side, facing her.' },
      ],
    },
    {
      id: 'boy', nouns: ['boy', 'breath'], x: 160, y: 138, reach: 40, hidden: true,
      look: 'A small boy, curled on his side under her hands, facing her, with his mouth a little open. In front of his lips, hanging in the air, is his breath: a small white cloud, halfway out of him, not finished. It has been halfway out of him for three hundred winters.',
      lookWhen: [{ if: [BROKEN], look: 'A small boy, curled on his side in a hollow the snow is filling. He has finished his breath. He weighs nothing; you can see that from here.' }],
    },
    {
      id: 'ring', nouns: ['ring'], x: 160, y: 128, reach: 400, look: 'On one of her hands is a brass ring, old, and worn smooth.\n\nYou look at your own hand.',
      lookWhen: [{ if: [BROKEN], look: 'You turn the ring on your finger. It is old, and worn smooth by a good many hands. You know one more of them than you did.' }],
    },
    { id: 'town', nouns: ['village', 'tower', 'roof'], x: 160, y: 56, reach: 400, look: 'The town is still a long way off: towers, and roofs under snow, and no smoke. Wherever she was taking him, it was there. She got this far.' },
    stillSky('Snow, hanging, as far up as there is anything.', 'Grey. Moving. And a raven in it, a long way north, going about its business.'),
  ],
  rules: [
    {
      enter: true, if: [HELD, { not: { flag: 'hollow.found' } }],
      do: [
        { set: 'hollow.found' }, { score: 5, id: 'hollow.found' }, { quest: 'north', stage: 6 },
        { say: 'She is kneeling in a hollow in the snow.\n\nThe cold has kept her as she was the hour she knelt down, and she might be any age. Frost has grown over her shoulders like a fur. Her eyes are open and white. Her hands are spread flat on the drift in front of her, the way you would put your hands on somebody\'s back to feel them breathing, and her lips are moving. They have been moving for longer than Hollowmere has had a hall. She is saying ISKA, ISKA, ISKA, without a breath between, because the dead do not get tired, and do not have to wait.\n\nOn one of her hands is a brass ring.\n\nYou look at your own hand.' },
      ],
    },
    { enter: true, if: [{ any: [{ flag: 'hollow.seen' }, { flag: 'sol.said' }] }, { not: { flag: 'coal.given' } }, { not: { flag: 'boy.home' } }], do: [{ show: 'boy' }] },
    // What is under her hands.
    {
      on: 'orun', if: [HELD, { not: { flag: 'hollow.seen' } }],
      do: [{ set: 'hollow.seen' }, { show: 'boy' }, { score: 5, id: 'hollow.seen' }, { say: 'When your tongue is ready you say ORUN, and the drift in front of her clears like a window. Under her hands a small boy lies curled on his side, facing her, with his mouth a little open. In front of his lips, hanging in the air, is his breath: a small white cloud, halfway out of him, not finished. It has been halfway out of him for three hundred winters.' }],
    },
    { on: 'orun', if: [HELD], do: [{ say: 'ORUN. He is as he was. So is she.' }] },
    { on: 'orun', do: [{ say: 'ORUN. There is nothing hidden here any more.' }] },

    // The sun's name. It is thought about before it is said; said twice, it is said.
    { on: 'say sol', if: [HELD, { flag: 'hollow.joined' }], do: [{ say: 'You have the sun\'s name on your tongue, and nobody left to say it to. She has stopped. She is looking at the ring.' }] },
    {
      on: 'say sol', if: [HELD, { not: { flag: 'hollow.sol' } }, { flag: 'hollow.seen' }],
      do: [{ set: 'hollow.sol' }, { say: 'You have the sun\'s name on your tongue. It is warm there, like a coal.\n\nYou know what it would do. She would not bear it. The word would stop, and the snow would come down, and the wind would start, and every winter after this one would be a little kinder than the last. The boy would finish his breath out here, with nobody, and whatever she is would go off into the white with its hands over its face, the way the guards went from the gate.\n\nYou have not said it.' }],
    },
    {
      on: 'say sol', if: [HELD, { not: { flag: 'hollow.sol' } }],
      do: [{ set: 'hollow.sol' }, { say: 'You have the sun\'s name on your tongue. It is warm there, like a coal.\n\nYou know what it would do. She would not bear it. The word would stop, and the snow would come down, and the wind would start, and every winter after this one would be a little kinder than the last. And whatever she is would go off into the white with its hands over its face, the way the guards went from the gate, and leave whatever is under her hands out here, with nobody.\n\nYou have not said it.' }],
    },
    {
      on: 'sol', if: [HELD],
      do: [
        { set: 'sol.said' }, { set: 'winter.broken' }, { run: 'winterBreaks' }, { muster: true }, { show: 'boy' }, { quest: 'north', stage: 7 }, { sound: 'door' },
        { say: 'You say the sun\'s name.\n\nShe cannot bear it. Her lips stop. She takes her hands off the snow, for the first time in three hundred winters, and puts them over her face; and whatever she is goes off into the white like that, not fast, the way the guards went from the gate. She does not look back.\n\nAll the snow in the sky comes down at once. It comes down with a sound like a long sigh, three hundred years of it, and the wind gets up under it and blows it sideways, and the raven drops out of the air, and catches itself, and flaps away north, complaining.\n\nIn the hollow, the boy\'s breath finishes going out of him. There is nobody with him but you.\n\nIn your pack the horn box has gone warm.' },
      ],
    },
    { on: 'sol', do: [{ say: 'SOL. Nobody is here to hear it. The sun is coming up anyway.' }] },

    // Her word, said with her.
    {
      on: 'iska', if: [HELD, { not: { flag: 'hollow.joined' } }, { flag: 'hollow.seen' }],
      do: [
        { set: 'hollow.joined' }, { score: 10, id: 'hollow.joined' }, { goto: 'hollow', x: 184, y: 130, dir: 'left' },
        { say: 'You kneel down beside her in the snow.\n\nThen you say her word with her. You put your own ISKA into the cold beside hers, over the boy, and feel it go out of you, and the warmth go after it: out of your hands, out of your feet, out of the middle of you, as if somebody were drawing it off on a thread. For the space of one word there are two people holding him.\n\nHer lips stop.\n\nThe silence afterward is larger than any you have ever heard. The snow still hangs, held up now by nothing but you: the whole sky of it, on one word. Slowly, with a sound like ice cracking on a pond in spring, she turns her head and looks at you, and at your hand, and at the ring on it.\n\nYou take out the horn box and open it, and the coal in it is as grey and dull as before, because you are holding something still. Your word is going. You feel it thin in your mouth like the last heat going out of a stone, and you know you cannot say it again, not for a long while, not in time.' },
      ],
    },
    {
      on: 'iska', if: [HELD, { not: { flag: 'hollow.joined' } }],
      do: [
        { set: 'hollow.joined' }, { score: 10, id: 'hollow.joined' }, { goto: 'hollow', x: 184, y: 130, dir: 'left' },
        { say: 'You kneel down beside her in the snow.\n\nThen you say her word with her. You put your own ISKA into the cold beside hers, over whatever it is she has under her hands, and feel it go out of you, and the warmth go after it: out of your hands, out of your feet, out of the middle of you, as if somebody were drawing it off on a thread. For the space of one word there are two people holding it.\n\nHer lips stop.\n\nThe silence afterward is larger than any you have ever heard. The snow still hangs, held up now by nothing but you: the whole sky of it, on one word. Slowly, with a sound like ice cracking on a pond in spring, she turns her head and looks at you, and at your hand, and at the ring on it.\n\nYou take out the horn box and open it, and the coal in it is as grey and dull as before, because you are holding something still. Your word is going. You feel it thin in your mouth like the last heat going out of a stone, and you know you cannot say it again, not for a long while, not in time.' },
      ],
    },
    { on: 'iska', do: [{ say: 'ISKA. The snow that is falling in front of you stops, and hangs, for as long as one word lasts. Then it comes on down.' }] },

    // The coal: the way home. It takes one, and what one can carry.
    {
      on: GIVE, if: [HELD, { flag: 'hollow.joined' }, { has: 'ember' }],
      do: [
        { lose: 'ember' }, { set: 'coal.given' }, { set: 'winter.broken' }, { run: 'winterBreaks' }, { muster: true }, { hide: 'boy' }, { score: 25, id: 'winter.coal' }, { quest: 'north', stage: 7 }, { sound: 'win' },
        { say: 'You put the box into her hands.\n\nThe word ends.\n\nAll the snow in the sky comes down at once. It comes down with a sound like a long sigh, three hundred years of it, and the wind gets up under it and blows it sideways, and the raven drops out of the air, and catches itself, and flaps away north, complaining. The boy\'s breath finishes going out of him.\n\nIn her hands the coal wakes. It goes from grey to red to orange, and the smell comes up out of the box, peat and pine-smoke and broth and wet wool: the smell of a hall with a fire at one end and a door at the other. Something moves in her face that has not moved in a very long time.\n\nAnd she gathers him up. Stiffly at first, and then not stiffly, the way she must have done it a thousand times, she gets him into her arms, and holds him against her, and bends her head over the open box the way a woman bends over a hearth on a cold morning to blow it awake. She breathes on it.\n\nThen there is a hollow in the snow in front of you, and the print of two knees, and you.' },
        { say: 'You did not say the sun\'s name. It comes up anyway.\n\nYou are further from anywhere than you have ever been, with nothing but a brass ring, and it is a very long way back on foot. You start walking.' },
      ],
    },
    { on: GIVE, if: [HELD, { has: 'ember' }], do: [{ say: 'You hold the box out to her. She does not see it. She does not see anything. Her hands are on the snow, and her lips are moving, and the coal in the box is as dull as an old eye. Nothing wakes here while that word is being said.' }] },
    { on: ['use ember', 'blow ember', 'open ember', 'light ember', 'warm ember', 'pet ember'], if: [HELD, { flag: 'hollow.joined' }, { has: 'ember' }], do: [{ say: 'You have the box open in your hand. It is yours. It is the way back to the Elder\'s hearth, and the bed beside it, and a child who keeps trying to give you a name. It takes one, and what one can carry.\n\nYou look at her hands.' }] },
    // What the hero could do, and knows better than to.
    {
      on: TAKE, if: [HELD, { not: { flag: 'hollow.joined' } }, { flag: 'hollow.seen' }],
      do: [{ say: 'You could take him yourself. He would weigh nothing. You would breathe on the coal and be at the Elder\'s hearth with him in your arms before his breath was done, and she would kneel here with her hands on the empty snow, saying her word over nothing, for as long as there is a world to be cold in.\n\nYou take your hands back.' }],
    },
    { on: TAKE, if: [HELD, { flag: 'hollow.joined' }], do: [{ say: 'He is not yours to carry. She is looking at you. Her hands are empty, and yours have a box in them.' }] },
    // If the sun's name was said, he is left; and he can still be carried home.
    {
      on: TAKE, if: [{ flag: 'sol.said' }, { not: { flag: 'boy.home' } }, { has: 'ember' }, { near: 'boy', d: 60 }],
      do: [
        { set: 'boy.home' }, { set: 'marta.asked' }, { hide: 'boy' }, { sound: 'word' }, { run: 'emberReady' }, { goto: 'hall', x: 160, y: 124, dir: 'down' },
        { say: 'You get him up out of the hollow. He weighs nothing. It takes one, and what one can carry. You open the horn box, and the coal in it is awake, and you breathe on it.\n\nThen you are standing on the Elder\'s hearthstone, in the middle of supper, with a small boy in your arms who finished his breath three hundred winters late. Marta is on her feet before the bowl she dropped has stopped rolling. She looks at the boy, and at you, and asks nothing yet. Tova, in the bed on the other side of the hearth, says: "He can have my blanket."\n\nLater you tell Marta the rest: the footprints, the hollow, the hands flat on the snow, the brass ring; what you said, and what went off into the white with its hands over its face.\n\n"A ring like that one," says Marta. She is quiet for a long time. "There is a place swept. It was swept for more than him. He shall have it, and I shall go on sweeping the rest."' },
      ],
    },
    { on: TAKE, if: [{ flag: 'sol.said' }, { not: { flag: 'boy.home' } }], do: [{ say: 'You get your hands under him. He weighs nothing. It is fourteen days to anywhere, on foot, and snowing. You would need another way home than walking.' }] },
    // Other things people try.
    { on: her(['attack kneeler', 'push kneeler', 'pull kneeler']), if: [HELD], do: [{ say: 'No.' }] },
    { on: her(['pet kneeler', 'kiss kneeler', 'warm kneeler']), if: [HELD], do: [{ say: 'You put your hand on her shoulder, through the frost. There is no warmth coming off her at all, and none going in. You have felt that once before, in a hall, with a child under every fur in Hollowmere.' }] },
    { on: ['take ring', 'pet ring'], if: [HELD], do: [{ say: 'It is hers. It is the same as yours: brass, old, worn smooth by a good many hands. Hers were among them.' }] },
    { on: her(['give ring', 'give ring kneeler', 'use ring']), if: [HELD], do: [{ say: 'She has one. It is the same ring. There was only ever the one; somebody kept another by, afterwards, for when there should be a Thane again.' }] },
    { on: ['listen', 'listen *'], if: [HELD, { not: { flag: 'hollow.joined' } }], do: [{ say: 'ISKA, ISKA, ISKA: a small dry sound, like ice settling in a cold night, with no space at all between one and the next.' }] },
    { on: ['listen', 'listen *'], if: [HELD], do: [{ say: 'Nothing. It is the first silence there has been here in three hundred winters, and you are the only thing holding it up.' }] },
    { on: 'veth', if: [HELD], do: [{ say: 'VETH. The hanging snow goes back from the hollow a pace, and stays there. She does not look up. It is not that kind of holding.' }] },
    { on: her(['pray', 'sit', 'pray kneeler', 'sit kneeler']), if: [HELD, { not: { flag: 'hollow.joined' } }], do: [{ say: 'You kneel down beside her in the snow. She does not turn her head. Her hands are on the drift, and her lips are moving. You know the word. You are near enough, now, to say it with her.' }] },
    // Nobody walks away from a sky they are holding up.
    { zone: 'away', if: [HELD, { flag: 'hollow.joined' }], do: [{ goto: 'hollow', x: 184, y: 130, dir: 'left' }, { say: 'You are holding up the sky, and she is looking at you. You do not get up.' }] },
    ...noFire(['hollow'])!.slice(0, 2),
  ],
};

