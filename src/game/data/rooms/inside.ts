// Interiors: the Elder's hall, the inn, and the hermit's hut.

import type { Cond, RoomDef, Rule } from '../../../engine/types';

const firstVisit = (id: string, points = 1): Rule => ({ enter: true, if: [{ not: { flag: `seen.${id}` } }], do: [{ set: `seen.${id}` }, { score: points, id: `seen.${id}` }] });

const FL = 96;
const LIT: Cond = { flag: 'hearth.lit' };
const COLD: Cond = { not: LIT };
/** Either feast: the night the hearth was lit, or the one held for the thaw. */
const FEAST: Cond = { any: [{ flag: 'hall.feast' }, { flag: 'hall.thaw' }] };
const NOFEAST: Cond = { not: FEAST };

const LAY = ['use log', 'use log hearth', 'use hearth', 'give log hearth', 'drop log hearth', 'use log pallet'];
const STRIKE = ['light hearth', 'light', 'light log', 'use flint', 'use flint hearth', 'use flint log', 'light hearth flint', 'attack flint', 'light flint'];
const OFFER = ['give flint elder', 'give elder flint', 'give flint', 'use flint elder', 'equip flint elder', 'equip flint'];
const SIT = ['sit', 'sit bench', 'sit table', 'sit cup', 'use bench', 'sit door'];
const DRINK = ['drink cup', 'take cup', 'use cup', 'eat cup', 'drink table', 'take table', 'drink', 'drink ale'];

/**
 * Fenn sells and takes back his books wherever he happens to be: in the corner of the inn while
 * the fires are out, on the shore of the tarn, or at home.
 */
export const fennRules: Rule[] = [
  { on: ['buy frost'], if: [{ near: 'fenn', d: 80 }, { has: 'tomeFrost' }], do: [{ say: '"You have that one. Reading it twice won\'t make it colder."' }] },
  { on: ['buy frost'], if: [{ near: 'fenn', d: 80 }, { gold: 20 }], do: [{ gold: -20 }, { give: 'tomeFrost' }, { sound: 'take' }, { say: 'Twenty silver. Fenn produces a book bound in pale blue hide. It is cold to hold. "Frost. It slows what it strikes, and it isn\'t kind about it."' }] },
  { on: ['buy mend'], if: [{ near: 'fenn', d: 80 }, { has: 'tomeMend' }], do: [{ say: '"You have that one already."' }] },
  { on: ['buy mend'], if: [{ near: 'fenn', d: 80 }, { gold: 15 }], do: [{ gold: -15 }, { give: 'tomeMend' }, { sound: 'take' }, { say: 'Fifteen silver for a small green book, soft with handling. "Mend. The only spell worth knowing, in the end."' }] },
  { on: ['buy ward'], if: [{ near: 'fenn', d: 80 }, { has: 'tomeWard' }], do: [{ say: '"You have that one already."' }] },
  { on: ['buy ward'], if: [{ near: 'fenn', d: 80 }, { gold: 25 }], do: [{ gold: -25 }, { give: 'tomeWard' }, { sound: 'take' }, { say: 'Twenty-five silver. The book is bound in grey iron-cloth. "Ward. It halves what hits you, for a little while."' }] },
  { on: ['buy frost', 'buy mend', 'buy ward', 'buy tome', 'buy light', 'buy magic', 'learn magic'], if: [{ near: 'fenn', d: 80 }], do: [{ say: '"Books cost silver," says Fenn. "Mend is fifteen, Frost twenty, Ward twenty-five. Light I don\'t sell. Light I give, to people who do me a kindness."' }] },
  // A book read is a book that can go back on the shelf.
  {
    on: ['give tome', 'give tome fenn', 'give fenn tome', 'sell tome', 'give shelf', 'give shelf fenn', 'use tome shelf', 'give tome shelf', 'drop tome shelf', 'store tome shelf'],
    if: [{ near: 'fenn', d: 80 }, { any: [{ has: 'tomeFlame' }, { has: 'tomeFrost' }, { has: 'tomeMend' }, { has: 'tomeLight' }, { has: 'tomeWard' }] }],
    do: [{ run: 'shelve' }],
  },
  {
    on: ['give amulet', 'give amulet fenn', 'give fenn amulet'], if: [{ near: 'fenn', d: 80 }, { has: 'amulet' }],
    do: [{ lose: 'amulet' }, { give: 'tomeLight' }, { score: 2, id: 'errand.start' }, { score: 8, id: 'errand.done' }, { say: 'Fenn takes the amulet in both hands and says nothing for a while. "Forty years I\'ve looked at this from the shore, every morning," he says at last. "I\'d forgotten it was so small." He closes his hand on it. Then, briskly, as if you had caught him at something, he puts a slim white book in yours. "Light. You\'ll want it, in the dark places."' }, { quest: 'errand', stage: 2 }, { muster: true }],
  },
];

export const hall: RoomDef = {
  id: 'hall',
  music: 'hearth',
  name: "The Elder's Hall",
  look: "The Elder's hall is colder inside than the square was. Frost has grown on the inside of the walls in long white feathers, and the feathers all lean one way, the way grass leans in a stream: toward the hearth at the far end. There is no fire on it. In front of it is a pallet, and a woman on a stool beside the pallet. The long table is bare except for one cup, set at the end nearest the door.",
  lookWhen: [
    { if: [{ flag: 'hall.thaw' }], look: 'The hall is full of noise, and light, and the smell of a feast. Everybody in Hollowmere is at the long table, and the door has been opened and shut so often that the latch is warm. At the end of the table nearest the door there is a space on the bench, and a cup.' },
    { if: [{ flag: 'hall.feast' }], look: 'The hall is full, and warm, and loud. All of Hollowmere has come in, in its blankets, to stand in front of a fire that stays lit, and to have a look at whoever struck it. The frost has gone from the walls and left them wet. Nobody is in any hurry to go home.' },
    { if: [{ flag: 'marta.stopped' }, COLD], look: 'The cold has gone out of the hall, the way water goes out of a pool. The frost on the walls has gone soft at the edges. A fire is laid on the hearth. Marta has both hands on the girl, and her lips are still, and she is looking at you.' },
    { if: [LIT], look: "A long hall hung with banners, and warm. The great hearth of river-stone is alight from end to end. There is a bed made up on either side of it: one for a girl of seven, and one, nearer the high seat, for you. At the end of the long table nearest the door stands one cup, filled and not touched." },
  ],
  scene: {
    kind: 'indoor', walkTop: 104, ambient: 0.5,
    layers: [{ t: 'interior', floor: FL, wall: 'log' }, { t: 'hallroof', y: 30 }],
    props: [
      { t: 'doorway', x: 60, y: FL },
      { t: 'banner', x: 92, y: 38, ramp: 'purple' },
      { t: 'banner', x: 228, y: 38, ramp: 'red' },
      { t: 'shield', x: 24, y: 56, r: 10, ramp: 'red' },
      { t: 'shield', x: 286, y: 40, r: 8, ramp: 'blue' },
      { t: 'highseat', x: 258, y: 110 },
      { t: 'bookcase', x: 298, y: FL, w: 30, h: 46, v: 'few' },
      { t: 'bench', x: 80, y: 156, w: 70 },
    ],
    lights: [{ x: 112, y: 122, r: 34, i: 0.5, kind: 'warm' }],
    when: [
      // Cold: frost on the walls, a pallet before the dead hearth, and a stool beside it.
      { if: [COLD], props: [{ t: 'greathearth', x: 160, y: FL }, { t: 'rime', x: 0, y: 1, w: FL, h: 30 }, { t: 'bed', x: 150, y: 124, ramp: 'cream' }, { t: 'stool', x: 196, y: 126 }] },
      // Lit: a bed on either side of it.
      {
        if: [LIT],
        props: [{ t: 'greathearth', x: 160, y: FL, lit: 1 }, { t: 'bench', x: 262, y: 160, w: 52, v: 'bed' }, { t: 'bed', x: 118, y: 127, ramp: 'cream' }],
        lights: [{ x: 160, y: 92, r: 110, i: 1.3, kind: 'warm' }],
      },
      { if: [NOFEAST], props: [{ t: 'longtable', x: 92, y: 142, w: 110 }] },
      { if: [FEAST], props: [{ t: 'longtable', x: 92, y: 142, w: 110, v: 'feast' }] },
      { if: [{ flag: 'hall.rug' }], props: [{ t: 'bearskin', x: 254, y: 124 }] },
    ],
  },
  doors: [{ x0: 52, y0: 105, x1: 68, y1: 107, to: 'village', x: 69, y: 124, dir: 'down' }],
  zones: [{ id: 'leaving', x0: 40, y0: 105, x1: 80, y1: 114 }],
  npcs: [
    // By the pallet until the fire is lit; at the far end of the table for the thaw feast; otherwise by her hearth.
    { char: 'marta', x: 204, y: 124, dir: 'left', if: [COLD] },
    { char: 'marta', x: 222, y: 120, wander: [196, 118, 236, 128], if: [LIT, { not: { flag: 'hall.thaw' } }] },
    { char: 'marta', x: 216, y: 150, dir: 'left', if: [{ flag: 'hall.thaw' }] },
    // Sitting up in it: drawn behind the bed, so that it covers her to the waist.
    { char: 'tova', x: 110, y: 123, dir: 'down', if: [LIT] },
    { char: 'halla', x: 30, y: 130, dir: 'right', if: [{ flag: 'hall.feast' }] },
    { char: 'halla', x: 132, y: 160, dir: 'left', if: [{ flag: 'hall.thaw' }] },
    { char: 'sigga', x: 144, y: 152, dir: 'up', if: [FEAST] },
    { char: 'odd', x: 170, y: 160, dir: 'up', if: [FEAST] },
    { char: 'gorm', x: 196, y: 152, dir: 'up', if: [FEAST] },
    { char: 'toke', x: 236, y: 140, dir: 'left', if: [FEAST] },
  ],
  things: [
    {
      id: 'hearth', nouns: ['hearth'], x: 160, y: 106, reach: 44, try: ['lay the log on the hearth', 'light fire'],
      look: 'A hearth you could roast an ox in. There is no fire on it, and the ash is nine days cold. The frost on the walls leans toward it from every side; or toward what is lying in front of it.',
      lookWhen: [
        { if: [LIT], look: 'A hearth you could roast an ox in, burning as if it had never stopped. You laid that. Nobody in Hollowmere is going to let you forget it, in the kindest way.' },
        { if: [{ flag: 'hall.laid' }], look: 'A fire is laid on the hearth, as it should be laid: kindling, and a dry log across it. It wants a spark; and it wants the spark to be let live.' },
      ],
    },
    {
      id: 'pallet', nouns: ['tova', 'girl', 'pallet'], x: 152, y: 124, reach: 40,
      look: 'On the pallet, under what looks like every fur in Hollowmere, is a girl of about seven, lying on her back with her mouth a little open, as if she had been about to say something and had been interrupted. There is frost on her eyelashes. Nothing about her moves at all.',
      lookWhen: [{ if: [{ flag: 'marta.stopped' }], look: "Her breath has come out of her: a long thin thread of white, the end of the breath she began at midwinter. Her chest does not move. Marta's hand is on it." }],
    },
    {
      id: 'rime', nouns: ['rime'], x: 160, y: 100, reach: 400, look: 'Frost, grown on the inside of the walls in long white feathers. The feathers all lean one way, the way grass leans in a stream: toward the pallet in front of the hearth.',
      lookWhen: [{ if: [{ flag: 'marta.stopped' }], look: 'The frost feathers have gone soft at the edges. One of them lets go of the wall while you watch.' }],
    },
    { id: 'stool', nouns: ['stool'], x: 196, y: 126, reach: 40, look: 'A three-legged stool, drawn up to the pallet. She has sat on it for nine days.' },
    { id: 'throne', nouns: ['throne'], x: 258, y: 112, reach: 40, look: "The Elder's chair, carved with knotwork and capped with brass. Nobody but the Elder sits in it." },
    { id: 'banner', nouns: ['banner'], x: 160, y: 106, reach: 400, look: 'Two banners, purple and red, each with a gold lozenge: the mark of Hollowmere. They hang very still.' },
    {
      id: 'table', nouns: ['table'], x: 104, y: 144, reach: 44, look: 'A long table, bare except for one cup, set at the end nearest the door. Feasts were held here. The table remembers; you can tell by the stains.',
      lookWhen: [
        { if: [{ flag: 'hall.thaw' }], look: 'The long table is doing what it was built for: bread, broth, the first of Gorm\'s cheese, and everybody in Hollowmere on the benches. At the end nearest the door there is a space, and a cup in front of it.' },
        { if: [{ flag: 'hall.feast' }], look: 'Somebody has found a cask and somebody else has found the horns, and the long table is doing what it was built for. At the end nearest the door stands the one cup, with a clear space on the bench in front of it, even tonight.' },
      ],
    },
    // The cup that nobody drinks, at the end of the table nearest the door.
    {
      id: 'cup', nouns: ['cup'], x: 78, y: 142, reach: 34, try: ['drink from the cup'],
      look: 'A plain horn cup at the end of the long table nearest the door, with its ale frozen solid in it. Nobody sits on the bench in front of it.',
      lookWhen: [
        { if: [{ flag: 'home.cup' }], look: 'A plain horn cup at the end of the table, by the door, filled. It is yours. It seems to have been yours for some time before you got here.' },
        { if: [{ flag: 'hall.thaw' }], look: 'The cup that nobody drinks. Halla filled it this morning, as she does every feast-day, with the best she has.' },
        { if: [LIT], look: 'A plain horn cup at the end of the long table nearest the door, filled to the brim and not touched. Nobody sits on the bench in front of it. Ask anybody in Hollowmere who it is for, and you will get a different answer from each, and a look.' },
      ],
    },
    {
      id: 'seat', nouns: ['bench'], x: 80, y: 156, reach: 34, try: ['sit down'],
      look: 'The end of the bench nearest the door: the first place anybody would sit, coming in. Nobody does. The wood is worn everywhere else.',
      lookWhen: [{ if: [{ flag: 'home.cup' }], look: 'The end of the bench nearest the door, where somebody coming in out of the cold would sit down first. It is your place.' }],
    },
    { id: 'shelf', nouns: ['shelf'], x: 296, y: 106, reach: 40, look: "The village's whole library: nine books, three of them about sheep." },
    { id: 'door', nouns: ['door'], x: 60, y: 106, reach: 400, look: 'The way out, back to the square.' },
    { id: 'bench', nouns: ['bed'], x: 262, y: 162, reach: 44, hidden: true, try: ['sleep'], look: "A bed made up for you beside the Elder's hearth, with a bearskin over it. On the other side of the fire is another, a good deal smaller. Nobody has said anything about either." },
  ],
  rules: [
    firstVisit('hall'),
    {
      enter: true, if: [COLD, { not: { flag: 'hall.sat' } }],
      do: [{ set: 'hall.sat' }, { say: 'The Elder\'s hall is colder inside than the square was. Frost has grown on the inside of the walls in long white feathers, and the feathers all lean one way, the way grass leans in a stream, toward the hearth at the far end.\n\nYou are so tired that you sit down at the first place you come to, the end of the bench by the door.\n\n"Not there," says the woman at the far end of the hall.\n\nYou get up. She does not say why. If you asked her, she could not tell you.' }],
    },
    {
      enter: true, if: [COLD, { quest: 'hearth', is: 3 }, { knows: 'word:iska' }, { not: { flag: 'hall.heard' } }],
      do: [{ set: 'hall.heard' }, { say: 'Marta is where you left her, on the stool, with her hand flat on the furs over the girl\'s chest. You stand inside the door with the bottle, and watch her lips move, and this time you hear what they say.\n\nYou know that word. Your fingers remember it.\n\nYou look at the frost feathers on the walls, all leaning toward the pallet. You look at the girl, who has not finished the breath she was letting go, and has not been allowed to.' }],
    },
    {
      enter: true, if: [COLD, { quest: 'hearth', is: 3 }, { not: { knows: 'word:iska' } }, { not: { flag: 'hall.lips' } }],
      do: [{ set: 'hall.lips' }, { say: 'Marta is where you left her, on the stool, with her hand flat on the furs over the girl\'s chest. Her lips move. You are near enough, this time, to hear that it is a word, and the same word, over and over. It is not a word you know.' }],
    },
    { enter: true, if: [LIT], do: [{ show: 'bench' }, { hide: 'pallet' }, { hide: 'stool' }, { hide: 'rime' }] },
    {
      enter: true, if: [LIT, { knows: 'word:sol' }, { not: { flag: 'hall.wiped' } }, NOFEAST],
      do: [{ set: 'hall.wiped' }, { say: 'The hall is warm and smells of smoke and broth. Marta does not look up from her mending.\n\n"Wipe your feet," she says.\n\nTova is sitting by the hearth with a lump of purple wool, which Marta is teaching her to knit, badly. It is Marta\'s own muffler, unravelled.' }],
    },
    {
      enter: true, if: [{ flag: 'hall.thaw' }, { not: { flag: 'home.door' } }],
      do: [{ set: 'home.door' }, { say: 'You open the door, and the cold goes in ahead of you.\n\n"Shut the door," says Marta, from the far end of the table, without looking up.\n\nYou shut it.' }],
    },

    // --- The hearth. A fire is laid; it will not take while she is holding the child still; she has to be asked to stop.
    {
      on: LAY, if: [COLD, { has: 'log' }, { not: { flag: 'hall.laid' } }, { near: 'hearth', d: 70 }],
      do: [{ lose: 'log' }, { set: 'hall.laid' }, { sound: 'take' }, { say: 'You kneel down at the cold hearth beside the pallet, and lay a fire, carefully, the way it should be laid: the kindling you split, and the dry log across it.\n\nMarta watches you do it.\n\n"It won\'t take," she says.' }],
    },
    { on: LAY, if: [COLD, { has: 'log' }, { not: { flag: 'hall.laid' } }], do: [{ say: 'You are not close enough to the hearth.' }] },
    { on: LAY, if: [COLD, { flag: 'hall.laid' }], do: [{ say: 'It is laid, and laid properly. It wants a spark.' }] },
    { on: LAY, if: [COLD], do: [{ say: 'The hall wood is damp through, and white with frost. There is a pile of split pine out in the square, and a hatchet by it.' }] },
    {
      on: STRIKE, if: [COLD, { flag: 'marta.stopped' }, { has: 'flint' }],
      do: [
        { lose: 'bottle' }, { set: 'hearth.lit' }, { give: 'ring' }, { sound: 'win' }, { score: 25, id: 'hearth.done' }, { quest: 'hearth', stage: 5 },
        { set: 'hall.feast' }, { muster: true }, { show: 'bench' }, { hide: 'pallet' }, { hide: 'stool' }, { hide: 'rime' },
        { win: 'You strike. The spark falls into the tinder and you bend and blow on it, and it smokes, and the smoke thickens, and a flame stands up out of it.\n\nIt does not lie down. It eats the kindling. It finds the log and climbs it.\n\nThe girl\'s chest does not move. Marta\'s hand is on it.\n\nThen it moves.\n\nMarta has the bottle open before you have seen her reach for it. She tips the girl\'s head and puts the stuff in her mouth, and Tova swallows, and coughs, and screws her whole face up and cries, thin and furious, the best noise anyone has made in Hollowmere since midwinter.\n\nMarta sits back on the stool. She looks at the fire for a while. Then she works the brass ring off her own finger, which has grown thin enough this winter that it comes easily, and takes your hand, and puts the ring on your finger.\n\n"Thane of Hollowmere," she says.\n\nBehind you the hall has filled up quietly. You did not hear them come: Odd first, and then all of them, in their blankets, crowded inside the door to see whether it would take. It roars.' },
        { note: 'They came to see if it would take. The door is there when you have had enough.' },
      ],
    },
    { on: STRIKE, if: [COLD, { flag: 'marta.stopped' }], do: [{ say: 'You have nothing to strike a light with.' }] },
    {
      on: STRIKE, if: [COLD, { flag: 'hall.laid' }, { has: 'flint' }],
      do: [{ set: 'hall.tried' }, { say: 'You strike the steel. The spark falls into the tinder, and catches; and then the little flame lies down flat, as if a wind were pressing on it, and goes out without smoking.\n\n"It won\'t take," says Marta, "while I—" and does not finish.\n\nThe hall is very quiet.' }],
    },
    { on: STRIKE, if: [COLD, { has: 'flint' }], do: [{ say: 'There is nothing on the hearth but ash nine days cold. A fire wants laying first: a log that is dry all through, and kindling split from it. There is a woodpile out in the square.' }] },
    { on: STRIKE, if: [COLD], do: [{ say: 'You have nothing to strike a light with. Halla has a flint. She has had it round her neck for nine days.' }] },
    { on: STRIKE, do: [{ say: 'It is burning beautifully. Leave it be.' }] },
    {
      on: OFFER, if: [COLD, { flag: 'marta.stopped' }], do: [{ say: 'She has stopped. It is for you to strike it now.' }],
    },
    {
      on: OFFER, if: [COLD, { has: 'flint' }, { flag: 'hall.laid' }, { knows: 'word:iska' }, { quest: 'hearth', is: 3 }],
      do: [
        { set: 'marta.stopped' }, { quest: 'hearth', stage: 4 }, { sound: 'word' },
        { say: 'You hold out Halla\'s flint to her. It is her hearth.\n\nShe does not take it. She keeps both her hands on the girl.\n\n"If I stop," says Marta, "she breathes out. She has been breathing out since midwinter. And there is no fire in here to breathe in by." She looks at the bottle, and at the kindling, and at you. "And if it doesn\'t catch?"\n\nYou have nothing to say to that. You came here with nothing. You strike the steel once, so that she can see the spark.\n\nShe looks at you for a long time: at somebody she would not miss. Then she looks down at Tova.\n\n"When I stop," she says. "Not before."\n\nShe stops.\n\nNothing happens, and then something does. The cold goes out of the hall the way water goes out of a pool when a sluice is lifted. The frost feathers on the walls soften at the edges. Tova\'s breath comes out of her, a long thin thread of white: the end of the breath she began at midwinter.' },
      ],
    },
    { on: OFFER, if: [COLD, { has: 'flint' }, { flag: 'hall.laid' }, { knows: 'word:iska' }], do: [{ say: 'You hold out the flint to her. It is her hearth.\n\nShe does not take it. "If I stop, she breathes out," says Marta. "With the lung-cold on her, and nothing to put back what it has taken." She does not look at the flint, or at you. "Bring me the bottle."' }] },
    { on: OFFER, if: [COLD, { has: 'flint' }, { flag: 'hall.laid' }], do: [{ say: 'You hold out the flint. Marta looks at it, and at you. "It won\'t take," she says, and her lips go on moving. You have the feeling that if you knew what they were saying, you would know what it was you were asking of her.' }] },
    { on: OFFER, if: [COLD, { has: 'flint' }], do: [{ say: 'You hold out the flint. Marta looks at the hearth, where there is nothing but ash nine days cold, and then at you, and says nothing at all.' }] },
    { on: OFFER, if: [LIT, { has: 'flint' }], do: [{ say: '"It\'s Halla\'s," says Marta. "And she tells me she never wants to see it again."' }] },
    // Nobody walks out between her stopping and the spark.
    { zone: 'leaving', if: [{ flag: 'marta.stopped' }, COLD], do: [{ goto: 'hall', x: 120, y: 126, dir: 'right' }, { say: 'You have your hand on the door. Behind you Marta says nothing at all. You turn round.' }] },
    // The bottle.
    { on: ['give bottle', 'give bottle elder', 'give elder bottle', 'use bottle table', 'drop bottle', 'drop bottle table', 'use bottle'], if: [COLD, { has: 'bottle' }, { flag: 'marta.stopped' }], do: [{ say: 'Not yet. She has to breathe in first; and there is nothing in this hall to breathe in by.' }] },
    { on: ['give bottle tova', 'give tova bottle', 'give bottle girl', 'use bottle tova', 'use bottle girl'], if: [COLD, { has: 'bottle' }], do: [{ say: 'You go down on one knee with the bottle. The girl\'s mouth is a little open. Nothing goes in, and nothing comes out.\n\n"She can\'t swallow," says Marta. "Put it on the table."' }] },
    { on: ['give bottle', 'give bottle elder', 'give elder bottle', 'use bottle table', 'drop bottle', 'drop bottle table', 'use bottle'], if: [COLD, { has: 'bottle' }], do: [{ say: 'You hold out the bottle. Marta does not reach for it; she would have to take her hand off the furs. "On the table," she says. So you keep it by you, where it can be got at quickly.' }] },
    { on: ['talk tova', 'talk girl', 'pet tova', 'pet girl', 'pet pallet', 'take tova', 'take girl', 'kiss tova'], if: [COLD], do: [{ say: 'You put out a hand. Marta\'s eyes come up, and you take it back. But you were near enough to know that there was no warmth coming off the child at all, and none going in.' }] },
    { on: ['talk elder'], if: [COLD, { flag: 'hall.laid' }, { not: { flag: 'marta.stopped' } }, { quest: 'hearth', is: 3 }, { knows: 'word:iska' }], do: [{ cmd: 'give flint elder' }] },
    // Words spoken in the hall while she is saying hers.
    { on: 'iska', if: [COLD], do: [{ set: 'hall.said' }, { say: 'ISKA. Across the hall Marta\'s head comes round as if you had called her by a name nobody has used in fifty years. For a moment the cold of your word and the cold of hers are in the room together, and the frost on the walls grows a finger\'s breadth while you watch.\n\n"Don\'t," says Marta. It is the only thing you have heard her ask for.' }] },
    { on: 'veth', if: [COLD], do: [{ say: 'VETH. The furs lift on the pallet, and Marta\'s free hand comes down on them like a lid. She looks at you. You find that you have nothing further to say.' }] },
    { on: ['veth', 'iska', 'sol'], do: [{ say: '"Not under this roof," says Marta, without turning round. "This roof has had enough of words."' }] },

    // --- The night the hearth is lit. Making for the door ends it: the hall empties, and Marta has something to hand over.
    {
      zone: 'leaving', if: [{ flag: 'hall.feast' }],
      do: [
        { set: 'hall.feast', to: false }, { muster: true }, { give: 'ember' }, { sound: 'quest' }, { goto: 'hall', x: 236, y: 150, dir: 'up' },
        { say: 'Late that night, when the hall has emptied and the fire has settled into the kind of red that will last till morning, Marta rakes out one coal with the tongs and drops it into a little box of horn and shuts the lid.\n\n"A coal knows its own hearth," she says. "Breathe on that and it\'ll bring you back to this one, wherever you are. One, and what you can carry in your arms. Don\'t sneeze."\n\nYou hold the box in both hands. It is warm. As far as you know, nothing has ever been made to bring you back anywhere.\n\nYou turn the ring on your finger. It is old, and worn smooth by a good many hands.\n\n"It\'s an old word, Thane," says Marta. "There hasn\'t been one in Hollowmere since before this hall was built. The Elder keeps a ring by for when there is." She looks at the fire. "The Elder before me gave me that ring and a broom, and took me up to the barrow, and showed me a place in it that was swept clean with nobody in it. She told me to keep it swept. She didn\'t know who for. I\'ve swept it forty years."\n\nShe stands up, and her knees crack.\n\n"You can have the ring," says Marta. "I\'ll keep the broom."' },
        { note: 'A bed has been made up for you beside the hearth.' },
      ],
    },
    // --- The feast for the thaw, and the end of the bench nearest the door.
    {
      on: SIT, if: [{ flag: 'hall.thaw' }, { flag: 'coal.given' }, { not: { flag: 'home.sat' } }],
      do: [
        { set: 'home.sat' }, { give: 'ember' }, { gold: 80 }, { sound: 'quest' },
        { say: 'You are very tired, and you sit down at the first place you come to: the end of the bench nearest the door, where somebody coming in out of the cold would sit down first. In front of you is the cup. Halla filled it this morning, as she does every feast-day, with the best she has.\n\nHalla is coming down the table with a jug. She sees you, and her hand goes out to the cup from habit, to move it.\n\n"Leave it," says Marta.\n\nShe has looked up now. She gets to her feet and comes the whole length of the hall, with the whole of Hollowmere watching her do it, and puts down two things by the cup. One is a purse, lumpy with all the different things that every household in the valley has put into it. The other is a little box of horn, warm to the touch.\n\n"It came back without you," says Marta Coldhand. "Don\'t do that again."\n\nShe goes back to her place.' },
      ],
    },
    {
      on: SIT, if: [{ flag: 'hall.thaw' }, { flag: 'sol.said' }, { not: { flag: 'home.sat' } }],
      do: [
        { set: 'home.sat' }, { set: 'home.done' }, { set: 'marta.thaw' }, { gold: 80 }, { heal: 10 }, { score: 5, id: 'thaw.marta' }, { quest: 'north', stage: 8 }, { sound: 'quest' },
        { win: 'You are very tired, and you sit down at the first place you come to: the end of the bench nearest the door. In front of you is the cup.\n\nHalla is coming down the table with a jug. She sees you, and her hand goes out to the cup, from habit, and moves it out of your way, and sets a horn of ale down where it stood.\n\nMarta has looked up. She comes the whole length of the hall, and puts a purse down by your hand, lumpy with all the different things that every household in the valley has put into it.\n\n"What was it?" she says. "Up there."\n\nYou tell her: the footprints, the hollow, the hands flat on the snow, the brass ring. You tell her what you said, and what went off into the white with its hands over its face. Marta hears all of it standing up.\n\n"A ring like that one," she says at last. She looks at your hand, and she does not ask about the boy a second time. "Then I know a little more than I did about a broom." She straightens her back, which was straight already. "The winter\'s broken, Thane. Eat."\n\nShe goes back to her place.' },
      ],
    },
    { on: SIT, if: [{ flag: 'home.sat' }, { flag: 'hall.thaw' }], do: [{ say: 'You are sitting. The cup is in front of you.' }] },
    { on: SIT, if: [{ flag: 'home.cup' }], do: [{ say: 'You sit down at the end of the bench nearest the door. It is your place. The cup has been filled.' }] },
    { on: SIT, if: [{ flag: 'marta.thaw' }], do: [{ say: 'You sit down at the end of the bench nearest the door. Nobody says anything. The cup has been set back where it always stands, a hand\'s breadth out of your reach.' }] },
    { on: ['sit throne'], do: [{ say: 'Marta looks at you. You discover you were only admiring the carving.' }] },
    { on: SIT, do: [{ say: '"Not there," says Marta.\n\nShe does not say why. If you asked her, she could not tell you.' }] },
    {
      on: DRINK, if: [{ flag: 'hall.thaw' }, { flag: 'home.sat' }, { flag: 'coal.given' }, { not: { flag: 'home.cup' } }],
      do: [
        { set: 'home.cup' }, { set: 'home.done' }, { set: 'marta.thaw' }, { heal: 40 }, { score: 30, id: 'home.cup' }, { score: 5, id: 'thaw.marta' }, { quest: 'north', stage: 8 }, { sound: 'win' },
        { win: 'You pick up the cup that nobody drinks, and you drink it, all of it.\n\nThen Halla fills it again.' },
      ],
    },
    { on: DRINK, if: [{ flag: 'hall.thaw' }, { flag: 'coal.given' }, { not: { flag: 'home.sat' } }], do: [{ cmd: 'sit bench' }] },
    { on: DRINK, if: [{ flag: 'home.cup' }], do: [{ heal: 6 }, { say: 'You drink. It is the best Halla has. By the time you have set the cup down, somebody has filled it.' }] },
    { on: DRINK, if: [LIT], do: [{ say: '"Not that one," says Marta, without turning round. "That one is for whoever it\'s for."' }] },
    { on: DRINK, do: [{ say: 'The ale is frozen solid in it. "And it\'s not for you," says Marta, without turning round. "It\'s not for anybody, so far as I was ever able to learn. Leave it be."' }] },
    // Once the feast for the thaw has had what it was held for, it ends when the Thane goes out.
    { zone: 'leaving', if: [{ flag: 'hall.thaw' }, { flag: 'home.done' }], do: [{ set: 'hall.thaw', to: false }] },
    {
      on: 'orun',
      do: [{ say: 'ORUN. The table gives up its wear. Under the cup the board is worn into a shallow ring; and round it, fainter and fainter, one laid over another, are the rings of other cups on other tables, older than this one, older than the hall. Always in the same place: at the end nearest the door, where somebody coming in out of the cold would sit down first.' }],
    },
    {
      on: ['give bearskin elder', 'give elder bearskin', 'give bearskin', 'use bearskin', 'drop bearskin'], if: [LIT, { has: 'bearskin' }, { not: { flag: 'hall.rug' } }],
      do: [{ lose: 'bearskin' }, { set: 'hall.rug' }, { gold: 20 }, { heal: 10 }, { sound: 'take' }, { say: 'You unroll the white bearskin in front of the Elder\'s chair. Marta looks at it for a while. "My father had one of those," she says. "It went for boots, the winter I was nine." She puts her feet on it, experimentally, and her face does something it has not done in your hearing. "Twenty silver. Don\'t tell the smith what I paid; he\'ll want the same for nails."' }],
    },
    { on: ['sleep', 'sleep *'], if: [FEAST], do: [{ say: 'With all of Hollowmere round the bed? They would only watch.' }] },
    {
      on: ['sleep', 'sleep *'], if: [LIT, { not: { flag: 'hall.slept' } }],
      do: [{ set: 'hall.slept' }, { run: 'rest' }, { say: 'You sleep nine hours without moving, and wake warm, which you had forgotten was possible.\n\nIn the morning there is smoke from every roof. Odd\'s forge is roaring, and Odd is talking to it about iron. Halla sleeps for a day and a night. So does the Elder, in her chair, and nobody says so. In the bed on the other side of the hearth, Tova asks you whether you have a name, and accepts that you have not, and names you herself, several times, none of them suitable.\n\nAnd it is still the coldest winter anyone can remember. It is colder every day.' }],
    },
    { on: ['sleep', 'sleep *'], if: [LIT], do: [{ run: 'rest' }, { say: 'You sleep in the bed by the Elder\'s hearth, and wake warm. On the other side of the fire somebody small is already awake, and has been waiting for you to be.' }] },
    { on: ['sleep', 'sleep *'], do: [{ say: 'Lie down in this hall and you would not get up. Even the frost in here is leaning away from where you are standing.' }] },
    { on: ['warm', 'warm *', 'sit hearth'], if: [LIT], do: [{ say: 'You stand in front of the fire and let it soak into you. It is a thing you could get used to.' }] },
    { on: ['read tome', 'take tome', 'look tome', 'read shelf'], do: [{ say: 'You open one at random. It is about sheep. So is the next.' }] },
  ],
};

export const inn: RoomDef = {
  id: 'inn',
  music: 'hearth',
  name: 'The Kettle and Helm',
  look: 'The whole of Hollowmere is in the common room of the inn: in blankets, on benches, on the floor, as close to the hearth as they can be without touching it. The fire is small and low, and it lies flat, as if a wind were pressing on it, though there is no wind. A woman sits on a stool in front of it and feeds it one stick at a time. Nothing in here smells of anything but people.',
  lookWhen: [{ if: [LIT], look: 'The inn: one room, a counter, a table, a bed in the corner that is let by the night. The fire burns without being begged to. It smells of ale, wet wool and bread, and of having been scrubbed.' }],
  scene: {
    kind: 'indoor', walkTop: 104, ambient: 0.6,
    layers: [{ t: 'interior', floor: FL, wall: 'log' }, { t: 'boards', from: 22, floor: FL }, { t: 'joists', y: 18 }],
    props: [
      { t: 'boxbed', x: 31, y: FL, w: 58, h: 66 },
      { t: 'doorway', x: 160, y: FL },
      { t: 'pegs', x: 198, y: 46, w: 40 },
      { t: 'bookcase', x: 252, y: FL, w: 46, h: 52, v: 'bottles' },
      { t: 'caskrack', x: 298, y: FL },
      { t: 'hang', x: 66, y: 18, h: 3, v: 'sausages' },
      { t: 'hang', x: 138, y: 18, h: 4, v: 'onions' },
      { t: 'hang', x: 176, y: 18, h: 2, v: 'herbs' },
      { t: 'hang', x: 232, y: 18, h: 6, v: 'kettle' },
      { t: 'hang', x: 270, y: 18, h: 5, v: 'helm' },
      { t: 'counter', x: 250, y: 132, w: 92 },
      { t: 'barrel', x: 306, y: 114 },
      { t: 'longtable', x: 74, y: 146, w: 60 },
      { t: 'stool', x: 112, y: 152 },
      { t: 'stool', x: 36, y: 154 },
    ],
    lights: [{ x: 250, y: 104, r: 46, i: 0.45, kind: 'warm' }],
    when: [
      // The last fire in the valley, kept in by hand, with a stool before it; after the hearth is lit, a fire like any other.
      { if: [COLD], props: [{ t: 'fireplace', x: 104, y: FL, w: 50, v: 'inn' }, { t: 'stool', x: 128, y: 116 }, { t: 'bearskin', x: 190, y: 158 }], lights: [{ x: 104, y: 98, r: 56, i: 0.7, kind: 'warm' }] },
      { if: [LIT], props: [{ t: 'fireplace', x: 104, y: FL, w: 50, v: 'inn', lit: 1 }], lights: [{ x: 104, y: 98, r: 80, i: 1, kind: 'warm' }] },
    ],
  },
  doors: [{ x0: 152, y0: 105, x1: 168, y1: 107, to: 'village', x: 252, y: 120, dir: 'down' }],
  npcs: [
    { char: 'halla', x: 132, y: 118, dir: 'left', if: [COLD] },
    { char: 'halla', x: 250, y: 114, if: [LIT, { not: FEAST }] },
    { char: 'gorm', x: 62, y: 124, dir: 'right', if: [COLD] },
    { char: 'toke', x: 206, y: 122, dir: 'left', if: [COLD] },
    { char: 'fenn', x: 286, y: 152, dir: 'left', if: [COLD] },
  ],
  things: [
    {
      id: 'hearth', nouns: ['hearth'], x: 104, y: 106, reach: 40, look: 'A small fire, lying flat on its sticks as if a wind were on it. It is the only one in the valley that did not go out at midwinter, and only because Halla did not let it.',
      lookWhen: [{ if: [LIT], look: 'A good fire, burning by itself like any other. Halla still looks at it every few minutes, out of habit, and then looks away again, pleased.' }],
    },
    { id: 'children', nouns: ['girl', 'boy'], x: 190, y: 156, reach: 40, hidden: true, look: 'Two children, asleep in one coat, on a bearskin, as near the hearth as they were let. One of them has hold of the other\'s ear.' },
    { id: 'counter', nouns: ['counter'], x: 250, y: 132, reach: 44, look: 'A plank counter, scrubbed white. Behind it: red draughts for the hurt, pitch torches for the dark, and ale for everything else.' },
    { id: 'barrel', nouns: ['barrel', 'ale'], x: 306, y: 116, reach: 40, look: 'The ale barrel. It is the one thing in Hollowmere that has not run short.' },
    { id: 'bed', nouns: ['bed'], x: 31, y: 106, reach: 40, look: 'A box bed with a fur blanket. Four silver a night, fleas at no extra charge.' },
    {
      id: 'chest', nouns: ['chest'], x: 44, y: 112, reach: 30, icon: 'chest', store: true, try: ['open chest'],
      look: "A plank chest at the foot of the bed, with a hasp and no lock, for lodgers' things. In Hollowmere nobody steals: partly from virtue, and partly because everybody would know by supper.",
    },
    { id: 'table', nouns: ['table'], x: 74, y: 148, reach: 44, look: 'One table. The regulars carved their names in it. Several of the names have been crossed out.' },
    { id: 'shelf', nouns: ['shelf'], x: 252, y: 106, reach: 400, look: 'Bottles, crocks, and a row of red draughts with wax stoppers.' },
    { id: 'door', nouns: ['door'], x: 160, y: 106, reach: 400, look: 'The way out, back to the square.' },
  ],
  rules: [
    firstVisit('inn'),
    { enter: true, if: [COLD], do: [{ show: 'children' }] },
    { enter: true, if: [LIT], do: [{ hide: 'children' }] },
    { on: ['talk girl', 'talk boy', 'pet girl', 'pet boy', 'take girl'], if: [COLD], do: [{ say: 'They are asleep, in the one coat. Let them be. It is the warmest either of them will be today.' }] },
    { on: ['warm', 'warm *'], if: [COLD], do: [{ say: 'You hold your hands out, from as far back as everybody else does. There is not much to be had. Nobody goes nearer: it would be taking it from the fire.' }] },
    { on: ['warm', 'warm *'], do: [{ say: 'You hold your hands to the fire until the feeling comes back into them, which hurts, and then stops hurting, which is better than anything.' }] },
    { on: 'iska', if: [COLD], do: [{ say: 'ISKA. Halla\'s fire goes down flat on its sticks like a dog that has been shouted at, and for a moment you think you have killed it. Halla is off her stool and between you and the hearth before you have shut your mouth. She does not say anything. She does not need to.\n\nIt is some time before anybody in the room breathes out. In the corner, the old man with the books is looking at you with great attention.' }] },
    { on: ['veth', 'iska', 'sol', 'orun'], do: [{ say: '"Not in here," says Halla, without turning round, in the voice of a woman who has put out a great many drunks. "Whatever that was. I have one fire and I\'m fond of it."' }] },
    { on: ['light hearth', 'light', 'use flint'], if: [COLD], do: [{ say: 'It is lit. That is the whole of what can be said for it, and Halla is the only one who goes near it.' }] },
    { on: ['buy potion'], if: [{ gold: 6 }], do: [{ gold: -6 }, { give: 'potion' }, { sound: 'take' }, { say: 'Six silver. Halla hands you a red draught. "For when you\'re hurt, not when you\'re thirsty."' }] },
    { on: ['buy potion'], do: [{ say: '"Six silver for a draught," says Halla, "and you haven\'t got six silver."' }] },
    { on: ['buy torch'], if: [{ has: 'torch' }], do: [{ say: '"One torch is plenty."' }] },
    { on: ['buy torch'], if: [{ gold: 3 }], do: [{ gold: -3 }, { give: 'torch' }, { sound: 'take' }, { say: 'Three silver for a pitch torch. "For the dark places," says Halla. "There are vaults out there, they say, under the old towers."' }, { note: 'Tip: LIGHT TORCH when you need to see.' }] },
    { on: ['buy torch'], do: [{ say: '"Three silver," says Halla. You do not have three silver.' }] },
    { on: ['buy food', 'eat food', 'eat'], if: [{ gold: 1 }], do: [{ gold: -1 }, { heal: 6 }, { say: 'One silver buys a bowl of something brown with barley in it. It is mostly hot, which just now is the best thing a food can be.' }] },
    { on: ['buy food', 'eat food'], do: [{ say: '"One silver for the stew," says Halla. "Smelling it is free."' }] },
    { on: ['buy ale', 'drink ale', 'buy'], if: [{ gold: 1 }], do: [{ gold: -1 }, { heal: 4 }, { say: 'One silver buys a horn of ale. It is thin, sour, and exactly what you needed.' }] },
    { on: ['buy ale', 'drink ale', 'buy'], do: [{ say: '"No silver, no ale," says Halla, not unkindly.' }] },
    { on: ['sell venison', 'give venison', 'give venison halla'], if: [{ has: 'venison' }], do: [{ lose: 'venison' }, { gold: 4 }, { sound: 'take' }, { say: '"Venison!" Halla weighs the haunch in both hands as if it were a baby. "Four silver, and there\'ll be a proper stew tonight."' }] },
    { on: ['sell herb', 'give herb', 'give herb halla'], if: [{ has: 'herb' }], do: [{ lose: 'herb' }, { gold: 2 }, { sound: 'take' }, { say: '"Frostcaps!" Halla has two silver out before you have finished unwrapping them. "That\'s the stew saved. Bring more."' }] },
    // While the fires are out Gorm is here, and so is where his grain comes home to.
    { on: ['give grain', 'give grain gorm', 'give gorm grain', 'use grain', 'use grain gorm', 'drop grain'], if: [{ has: 'grain' }, { near: 'gorm' }], do: [{ cmd: 'talk to gorm' }] },
    { on: ['give sheep', 'give sheep gorm', 'give gorm sheep', 'use sheep gorm'], if: [{ has: 'ewe' }, { near: 'gorm' }], do: [{ say: 'Gorm looks at her, and at you, and at her again, as if one of you might not be real. "Bryn," he says. "That\'s Bryn." He gets half up, and thinks of Halla, and sits down again. "Not in here. Take her up to the pen. I\'ll be along."' }] },
    { on: ['give flint halla', 'give halla flint', 'give flint'], if: [LIT, { has: 'flint' }], do: [{ say: '"Keep it," says Halla. "I never want to strike that thing again as long as I live."' }] },
    { on: ['sleep', 'sleep bed', 'buy bed', 'use bed'], if: [{ gold: 4 }], do: [{ gold: -4 }, { run: 'rest' }, { say: 'Four silver. You sleep like a felled tree, under a fur that has opinions of its own. In the morning you are whole again, and only slightly bitten.' }] },
    { on: ['sleep', 'sleep bed', 'buy bed', 'use bed'], do: [{ say: '"Four silver for the bed," says Halla. "The floor is free, and so is the door."' }] },
    ...fennRules,
  ],
};

export const hut: RoomDef = {
  id: 'hut',
  music: 'hearth',
  name: "The Hermit's Hut",
  look: 'One room, mostly books, and as cold as the shore outside. The hearth is dead and swept. Whoever lives here has taken the books worth saving and gone where there is a fire.',
  lookWhen: [
    { if: [LIT, { quest: 'errand', is: 2 }], look: 'One snug room, mostly books. A fire burns in the hearth. Old Fenn keeps a table, a bed, and more shelves than walls; and by the window, on a nail, where the light gets at it, hangs a moonstone on a silver chain.' },
    { if: [LIT], look: 'One snug room, mostly books, with a fire in the hearth and nobody in front of it. Fenn keeps a table, a bed, and more shelves than walls. He is down on the shore.' },
  ],
  scene: {
    kind: 'indoor', walkTop: 104, ambient: 0.46,
    layers: [{ t: 'interior', floor: FL, wall: 'log' }, { t: 'earthfloor', floor: FL }, { t: 'thatchroof', y: 20 }],
    props: [
      { t: 'bookcase', x: 24, y: FL, w: 46, h: 76, v: 'deep', seed: 1 },
      { t: 'bookcase', x: 72, y: FL, w: 46, h: 76, v: 'deep', seed: 2 },
      { t: 'bookcase', x: 122, y: FL, w: 44, h: 76, v: 'deep', seed: 3 },
      { t: 'hutwindow', x: 226, y: 62, w: 24, h: 26 },
      { t: 'doorway', x: 262, y: FL },
      { t: 'bookcase', x: 298, y: FL, w: 44, h: 76, v: 'deep', seed: 4 },
      { t: 'hang', x: 228, y: 20, h: 2, v: 'herbs' },
      { t: 'hang', x: 258, y: 20, h: 6, v: 'herbs' },
      { t: 'bookstack', x: 220, y: 62, h: 2, seed: 5, v: 'on' },
      { t: 'bookstack', x: 48, y: 101, h: 4, seed: 6 },
      { t: 'bookstack', x: 102, y: 102, h: 6, seed: 7 },
      { t: 'bookstack', x: 214, y: 100, h: 3, seed: 8 },
      { t: 'bookstack', x: 290, y: 101, h: 5, seed: 9 },
      { t: 'rug', x: 176, y: 122, w: 34, h: 8 },
      { t: 'threshold', x: 262, y: 101, w: 30 },
      { t: 'longtable', x: 112, y: 142, w: 56, v: 'bare' },
      { t: 'writing', x: 98, y: 143 },
      { t: 'bed', x: 250, y: 160, ramp: 'blue' },
      { t: 'bookstack', x: 266, y: 161, r: 15, h: 3, seed: 3, v: 'on' },
    ],
    lights: [{ x: 226, y: 48, r: 22, i: 0.35, kind: 'glow' }],
    when: [
      { if: [COLD], props: [{ t: 'fireplace', x: 176, y: FL, w: 54, v: 'hut' }] },
      { if: [LIT], props: [{ t: 'fireplace', x: 176, y: FL, w: 54, v: 'hut', lit: 2 }], lights: [{ x: 176, y: 100, r: 96, i: 1.2, kind: 'warm' }, { x: 106, y: 122, r: 24, i: 0.35, kind: 'warm' }] },
      // After he has it back, his wife's amulet hangs on a nail by the window.
      { if: [{ quest: 'errand', is: 2 }], props: [{ t: 'amulet', x: 244, y: 38 }] },
    ],
  },
  doors: [{ x0: 254, y0: 105, x1: 270, y1: 107, to: 'tarn', x: 262, y: 116, dir: 'down' }],
  // He is at home only once he has stopped going down to the shore.
  npcs: [{ char: 'fenn', x: 196, y: 124, wander: [150, 120, 230, 132], if: [LIT, { quest: 'errand', is: 2 }] }],
  things: [
    { id: 'tome', nouns: ['tome'], x: 122, y: 143, lift: 16, reach: 34, icon: 'tome', take: 'tomeFlame', takeSay: 'You pick up the singed book. He said he never liked it.', look: 'A book with scorched edges lies open on the table.' },
    {
      id: 'hearth', nouns: ['hearth'], x: 176, y: 106, reach: 40, look: 'A dead hearth, swept, with the ash in a bucket. Whoever lives here went out the same night as everybody else\'s fire did, and was tidy about it.',
      lookWhen: [{ if: [LIT], look: 'A proper fire, steady and hot, in a hearth that has plainly been told what is expected of it.' }],
    },
    { id: 'shelf', nouns: ['shelf'], x: 70, y: 106, reach: 50, look: 'Books two deep, in six scripts. Some have locks. One has teeth marks, from the inside.' },
    { id: 'table', nouns: ['table'], x: 112, y: 144, reach: 44, look: 'Ink, a candle stub, a mug, and whatever its owner was reading when the fire went out.' },
    { id: 'bed', nouns: ['bed'], x: 250, y: 162, reach: 40, look: "The hermit's bed. It does not look slept in. It looks read in." },
    { id: 'door', nouns: ['door'], x: 262, y: 106, reach: 400, look: 'The way out, back to the tarn.' },
  ],
  rules: [
    firstVisit('hut'),
    { on: ['warm', 'warm *'], if: [LIT], do: [{ say: 'You warm yourself at the hermit\'s fire. It is a very good fire.' }] },
    { on: ['light hearth', 'light', 'use flint'], if: [COLD], do: [{ say: 'There is kindling in the basket, laid ready by somebody methodical. You strike a spark into it. The flame comes up, and lies down flat, and goes out.' }] },
    ...fennRules,
    { on: ['buy', 'buy *', 'learn'], if: [{ not: { near: 'fenn', d: 400 } }], do: [{ say: 'There is nobody here to sell you anything. The books look at you from the shelves.' }] },
    { on: ['sleep', 'sleep bed'], if: [{ near: 'fenn', d: 400 }], do: [{ say: '"That\'s my bed," says Fenn, "and I may want it some day."' }] },
    { on: ['sleep', 'sleep bed'], do: [{ say: 'It is somebody else\'s bed, and there are books in it.' }] },
  ],
};

