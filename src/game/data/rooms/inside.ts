// Interiors (the Elder's hall, the inn, the hermit's hut) and the three rooms of the barrow.

import type { RoomDef, Rule } from '../../../engine/types';

const firstVisit = (id: string, points = 1): Rule => ({ enter: true, if: [{ not: { flag: `seen.${id}` } }], do: [{ set: `seen.${id}` }, { score: points, id: `seen.${id}` }] });

const FL = 96;

export const hall: RoomDef = {
  id: 'hall',
  music: 'hearth',
  name: "The Elder's Hall",
  look: "A long hall hung with banners. A great hearth of river-stone fills the middle of the back wall, and beside it stands the Elder's carved chair. It is colder in here than it has any right to be.",
  lookWhen: [
    { if: [{ flag: 'hall.feast' }], look: 'The hall is full, and warm, and loud. Half of Hollowmere has come in out of the snow to stand in front of a fire that stays lit, and to have a look at whoever lit it. The banners stir in the heat. Nobody is in any hurry to go home.' },
    { if: [{ flag: 'hearth.lit' }], look: "A long hall hung with banners, and warm. The great hearth of river-stone is alight from end to end, and the Elder's carved chair has been drawn up beside it. The banners stir in the heat." },
  ],
  scene: {
    kind: 'indoor', walkTop: 104, ambient: 0.5,
    layers: [{ t: 'interior', floor: FL, wall: 'log' }],
    props: [
      { t: 'doorway', x: 60, y: FL },
      { t: 'banner', x: 110, y: 20, ramp: 'purple' },
      { t: 'banner', x: 210, y: 20, ramp: 'red' },
      { t: 'throne', x: 252, y: 110 },
      { t: 'shelf', x: 296, y: FL, w: 34 },
      { t: 'table', x: 104, y: 142, w: 64 },
    ],
    lights: [{ x: 110, y: 124, r: 44, i: 0.55, kind: 'warm' }],
    when: [
      { if: [{ not: { flag: 'hearth.lit' } }], props: [{ t: 'hearth', x: 160, y: FL }] },
      // Lit, and with a bench made up beside it for the one who lit it.
      { if: [{ flag: 'hearth.lit' }], props: [{ t: 'hearth', x: 160, y: FL, lit: 1 }, { t: 'bed', x: 262, y: 160, ramp: 'fur' }], lights: [{ x: 160, y: 100, r: 96, i: 1.2, kind: 'warm' }] },
    ],
  },
  doors: [{ x0: 52, y0: 105, x1: 68, y1: 107, to: 'village', x: 69, y: 124, dir: 'down' }],
  // The night the hearth is lit, the village comes in to see it. They stay until the Thane makes for the door.
  zones: [{ id: 'leaving', x0: 40, y0: 105, x1: 80, y1: 114 }],
  npcs: [
    { char: 'marta', x: 222, y: 120, wander: [196, 118, 236, 128] },
    // Behind whoever is standing at the hearth: nobody arrives on top of the Thane.
    { char: 'halla', x: 116, y: 118, dir: 'right', if: [{ flag: 'hall.feast' }] },
    { char: 'sigga', x: 144, y: 152, dir: 'up', if: [{ flag: 'hall.feast' }] },
    { char: 'odd', x: 170, y: 160, dir: 'up', if: [{ flag: 'hall.feast' }] },
    { char: 'gorm', x: 196, y: 152, dir: 'up', if: [{ flag: 'hall.feast' }] },
    { char: 'toke', x: 228, y: 146, dir: 'up', if: [{ flag: 'hall.feast' }] },
  ],
  things: [
    {
      id: 'hearth', nouns: ['hearth'], x: 160, y: 106, reach: 40, try: ['light hearth'], look: 'A hearth you could roast an ox in. The logs are laid and dry. The ash under them is nine days cold.',
      lookWhen: [{ if: [{ flag: 'hearth.lit' }], look: 'A hearth you could roast an ox in, burning as if it had never stopped. You lit that. Nobody in Hollowmere is going to let you forget it, in the kindest way.' }],
    },
    { id: 'throne', nouns: ['throne'], x: 252, y: 112, reach: 40, look: "The Elder's chair, carved with knotwork and capped with brass. Nobody but the Elder sits in it, and lately not even she." },
    { id: 'banner', nouns: ['banner'], x: 160, y: 106, reach: 400, look: 'Two banners, purple and red, each with a gold lozenge: the mark of Hollowmere. They hang very still.' },
    {
      id: 'table', nouns: ['table'], x: 104, y: 144, reach: 44, look: 'A long table with one candle, and at the far end one mug, filled and not touched. Feasts were held here. The table remembers; you can tell by the stains.',
      lookWhen: [{ if: [{ flag: 'hall.feast' }], look: 'Somebody has found a cask and somebody else has found the horns, and the long table is doing what it was built for. At the far end, beside the cup that is always set there and never drunk, lies the seven-pointed crown, where you put it down in front of Marta. The hall is packed to the walls, and nobody is standing within arm\'s reach of that end of the table.' }],
    },
    { id: 'shelf', nouns: ['shelf'], x: 296, y: 106, reach: 40, look: "The village's whole library: three shelves of it, and a good third about sheep." },
    { id: 'door', nouns: ['door'], x: 60, y: 106, reach: 400, look: 'The way out, back to the square.' },
    { id: 'bench', nouns: ['bed'], x: 262, y: 162, reach: 44, hidden: true, try: ['sleep'], look: 'A bench made up as a bed, with a bearskin over it, where the heat of the hearth reaches. Nobody has said whose it is. Nobody has needed to.' },
  ],
  rules: [
    firstVisit('hall'),
    {
      on: ['light hearth', 'use log', 'use log hearth', 'light log', 'give log hearth'],
      if: [{ quest: 'hearth', is: 4 }, { has: 'log' }, { near: 'hearth', d: 60 }],
      do: [
        { lose: 'log' }, { set: 'hearth.lit' }, { sound: 'win' }, { score: 25, id: 'hearth.done' }, { quest: 'hearth', stage: 5 }, { gold: 50 },
        { set: 'hall.feast' }, { muster: true }, { show: 'bench' },
        { win: 'You lay the log on the old ash and strike a spark. It catches. It keeps catching. Flame climbs the wood the way it is supposed to, and for the first time in nine days the hall is warm.\n\nMarta Coldhand watches it for a long moment. Then she takes the brass ring from her own hand and puts it on yours. "Hollowmere has no gold worth the name," she says, "so take a title instead. Thane." The hall, which has been filling quietly behind you, roars.' },
        { note: 'They came to see you. The door is there when you have had enough of it.' },
      ],
    },
    {
      // Making for the door ends the night: the hall empties, and Marta has two things to hand over.
      zone: 'leaving', if: [{ flag: 'hall.feast' }],
      do: [
        { set: 'hall.feast', to: false }, { muster: true }, { give: 'ember' }, { sound: 'quest' },
        { say: 'It is late before the hall empties. They go out by twos and threes into a night with woodsmoke in it, and every one of them finds some reason to pass close to you on the way.\n\nMarta sees you to the door herself. She presses a small horn box into your hand. Inside, on a bed of ash, a single coal from the hearth glows without burning down. "It knows where it was lit," she says. "When you are far out and have had enough of the far out, breathe on it."\n\nThen she nods back at the long table, and at the thing still lying at the end of it. "And that goes with you. The candle beside it has gone out three times tonight, and nothing in this hall is going out again while I am Elder of it." You wrap the crown in a cloth and put it at the bottom of your pack.\n\nSo ends the first saga of THANE\'S QUEST. The valley is still yours to walk, and there is a great deal more of it than you have seen. In your pack is a crown that has spent a whole night beside the biggest fire in the north, and has not warmed at all.' },
        { note: 'The Elder has work for a Thane, and the forge is lit again.' },
      ],
    },
    { on: ['light hearth', 'use log', 'use log hearth', 'light log'], if: [{ quest: 'hearth', is: 4 }, { has: 'log' }], do: [{ say: 'You are not close enough to the hearth.' }] },
    { on: ['light hearth', 'use log', 'use log hearth', 'light log'], if: [{ quest: 'hearth', is: 4 }], do: [{ say: '"With what?" says Marta. "The hall wood is damp through. Fetch a dry log from the pile outside."' }] },
    { on: ['light hearth', 'use log', 'use log hearth', 'light log'], if: [{ flag: 'hearth.lit' }], do: [{ say: 'It is burning beautifully. Leave it be.' }] },
    { on: ['light hearth', 'use log', 'use log hearth', 'light log'], do: [{ say: 'You strike a spark into the kindling. It catches, gutters, and dies, exactly as if something far away had breathed it in.' }] },
    {
      on: ['give bearskin elder', 'give elder bearskin', 'give bearskin', 'use bearskin', 'drop bearskin'], if: [{ has: 'bearskin' }, { not: { flag: 'hall.rug' } }],
      do: [{ lose: 'bearskin' }, { set: 'hall.rug' }, { gold: 20 }, { heal: 10 }, { sound: 'take' }, { say: 'You unroll the white bearskin in front of the Elder\'s chair. Marta looks at it for a while. "My father had one of those," she says. "It went for boots, the winter I was nine." She puts her feet on it, experimentally, and her face does something it has not done in your hearing. "Twenty silver. Do not tell the smith what I paid; he will want the same for nails."' }],
    },
    { on: ['take crown', 'look crown'], if: [{ flag: 'hall.feast' }], do: [{ say: 'It lies at the end of the long table, black against the wood. The feast has left a clear space round it, the way a crowd leaves room for a dog it does not know.' }] },
    { on: ['drink table', 'take table'], do: [{ say: '"That one is not for you," says Marta, without turning round. "It is not for anybody, so far as I was ever able to learn. Leave it be."' }] },
    { on: ['sit throne', 'sit'], do: [{ say: 'Marta looks at you. You discover you were only admiring the carving.' }] },
    { on: ['sleep', 'sleep *'], if: [{ flag: 'hall.feast' }], do: [{ say: 'With half of Hollowmere standing round the bed? They would only watch. See them out first.' }] },
    { on: ['sleep', 'sleep *'], if: [{ flag: 'hearth.lit' }], do: [{ run: 'rest' }, { say: 'Marta has had a bench made up for you by the hearth, with a bearskin over it. Nobody has said anything about it; it is simply there. You sleep nine hours without moving, and wake warm, which you had forgotten was possible.' }] },
    { on: ['warm', 'warm *', 'sit hearth'], if: [{ flag: 'hearth.lit' }], do: [{ say: 'You stand in front of your own fire and let it soak into you. It is a thing you could get used to.' }] },
    { on: ['read tome', 'take tome', 'look tome', 'read shelf'], do: [{ say: 'You open one at random. It is about sheep. So is the next.' }] },
  ],
};

export const inn: RoomDef = {
  id: 'inn',
  music: 'hearth',
  name: 'The Kettle and Helm',
  look: 'The inn: one room, a counter, a table, a bed in the corner that is let by the night. A small fire sulks in the hearth, kept alive by constant attention. It smells of ale and wet wool.',
  lookWhen: [{ if: [{ flag: 'hearth.lit' }], look: 'The inn: one room, a counter, a table, a bed in the corner that is let by the night. The fire burns without being begged to, and there are more people at the table than you have seen here before. It smells of ale, wet wool and bread.' }],
  scene: {
    kind: 'indoor', walkTop: 104, ambient: 0.68,
    layers: [{ t: 'interior', floor: FL, wall: 'log' }],
    props: [
      { t: 'hearth', x: 56, y: FL, lit: 1 },
      { t: 'doorway', x: 160, y: FL },
      { t: 'shelf', x: 252, y: FL, w: 46 },
      { t: 'counter', x: 250, y: 132, w: 92 },
      { t: 'barrel', x: 306, y: 114 },
      { t: 'table', x: 70, y: 146, w: 58 },
      { t: 'bed', x: 150, y: 162, ramp: 'red' },
    ],
    lights: [{ x: 56, y: 100, r: 70, i: 0.85, kind: 'warm' }, { x: 250, y: 104, r: 46, i: 0.5, kind: 'warm' }],
  },
  doors: [{ x0: 152, y0: 105, x1: 168, y1: 107, to: 'village', x: 252, y: 120, dir: 'down' }],
  npcs: [{ char: 'halla', x: 250, y: 114 }],
  things: [
    {
      id: 'hearth', nouns: ['hearth'], x: 56, y: 106, reach: 40, look: 'A small fire, coaxed along with bellows and bad language. It is the only one in the village that has stayed lit, and it costs Halla her sleep.',
      lookWhen: [{ if: [{ flag: 'hearth.lit' }], look: 'A good fire, burning by itself like any other. Halla still looks at it every few minutes, out of habit, and then looks away again, pleased.' }],
    },
    { id: 'counter', nouns: ['counter'], x: 250, y: 132, reach: 44, look: 'A plank counter, scrubbed white. Behind it: red draughts for the hurt, pitch torches for the dark, and ale for everything else.' },
    { id: 'barrel', nouns: ['barrel', 'ale'], x: 306, y: 116, reach: 40, look: 'The ale barrel. It is the one thing in Hollowmere that has not run short.' },
    { id: 'bed', nouns: ['bed'], x: 150, y: 164, reach: 40, look: 'A box bed with a fur blanket. Four silver a night, fleas at no extra charge.' },
    { id: 'table', nouns: ['table'], x: 70, y: 148, reach: 44, look: 'One table. The regulars carved their names in it. Several of the names have been crossed out.' },
    { id: 'shelf', nouns: ['shelf'], x: 252, y: 106, reach: 400, look: 'Bottles, crocks, and a row of red draughts with wax stoppers.' },
    { id: 'door', nouns: ['door'], x: 160, y: 106, reach: 400, look: 'The way out, back to the square.' },
  ],
  rules: [
    firstVisit('inn'),
    { on: ['warm', 'warm *'], do: [{ say: 'You hold your hands to the fire until the feeling comes back into them, which hurts, and then stops hurting, which is better than anything.' }] },
    { on: ['veth', 'iska', 'sol', 'orun'], do: [{ say: '"Not in here," says Halla, without turning round, in the voice of a woman who has put out a great many drunks. "Whatever that was. I have one fire and I am fond of it."' }] },
    { on: ['buy potion'], if: [{ gold: 6 }], do: [{ gold: -6 }, { give: 'potion' }, { sound: 'take' }, { say: 'Six silver. Halla slides a red draught across the counter. "For when you are hurt, not when you are thirsty."' }] },
    { on: ['buy potion'], do: [{ say: '"Six silver for a draught," says Halla, "and you have not got six silver."' }] },
    { on: ['buy torch'], if: [{ has: 'torch' }], do: [{ say: '"One torch is plenty. It will last longer than you will, where you are going."' }] },
    { on: ['buy torch'], if: [{ gold: 3 }], do: [{ gold: -3 }, { give: 'torch' }, { sound: 'take' }, { say: 'Three silver for a pitch torch. "It only burns away from the village," says Halla. "Do not ask me why."' }, { note: 'Tip: LIGHT TORCH when you need to see.' }] },
    { on: ['buy torch'], do: [{ say: '"Three silver," says Halla. You do not have three silver.' }] },
    { on: ['buy food', 'eat food', 'eat'], if: [{ gold: 1 }], do: [{ gold: -1 }, { heal: 6 }, { say: 'One silver buys a bowl of something brown with barley in it. It is hot, which just now is the best thing a food can be.' }] },
    { on: ['buy food', 'eat food'], do: [{ say: '"One silver for the stew," says Halla. "Smelling it is free."' }] },
    { on: ['buy ale', 'drink ale', 'buy'], if: [{ gold: 1 }], do: [{ gold: -1 }, { heal: 4 }, { say: 'One silver buys a horn of ale. It is thin, sour, and exactly what you needed.' }] },
    { on: ['buy ale', 'drink ale', 'buy'], do: [{ say: '"No silver, no ale," says Halla, not unkindly.' }] },
    { on: ['sell venison', 'give venison', 'give venison halla'], if: [{ has: 'venison' }], do: [{ lose: 'venison' }, { gold: 4 }, { sound: 'take' }, { say: '"Venison!" Halla weighs the haunch in both hands as if it were a baby. "Four silver, and there will be a proper stew tonight, the first since autumn."' }] },
    { on: ['sell herb', 'give herb', 'give herb halla'], if: [{ has: 'herb' }], do: [{ lose: 'herb' }, { gold: 2 }, { sound: 'take' }, { say: '"Frostcaps!" Halla has two silver on the counter before you have finished unwrapping them. "That is the stew saved. Bring more."' }] },
    { on: ['sleep', 'sleep bed', 'buy bed', 'use bed'], if: [{ gold: 4 }], do: [{ gold: -4 }, { run: 'rest' }, { say: 'Four silver. You sleep like a felled tree, under a fur that has opinions of its own. In the morning you are whole again, and only slightly bitten.' }] },
    { on: ['sleep', 'sleep bed', 'buy bed', 'use bed'], do: [{ say: '"Four silver for the bed," says Halla. "The floor is free, and so is the door."' }] },
  ],
};

export const hut: RoomDef = {
  id: 'hut',
  music: 'hearth',
  name: "The Hermit's Hut",
  look: 'One snug room, mostly books. A fire burns in the hearth as if it had never heard there was a problem. Old Fenn keeps a table, a bed, and more shelves than walls.',
  scene: {
    kind: 'indoor', walkTop: 104, ambient: 0.5,
    layers: [{ t: 'interior', floor: FL, wall: 'log' }],
    props: [
      { t: 'shelf', x: 44, y: FL, w: 44 },
      { t: 'shelf', x: 98, y: FL, w: 44 },
      { t: 'hearth', x: 176, y: FL, lit: 1 },
      { t: 'doorway', x: 262, y: FL },
      { t: 'table', x: 112, y: 142, w: 54 },
      { t: 'bed', x: 250, y: 160, ramp: 'blue' },
    ],
    lights: [{ x: 176, y: 100, r: 86, i: 1.15, kind: 'warm' }],
  },
  doors: [{ x0: 254, y0: 105, x1: 270, y1: 107, to: 'tarn', x: 262, y: 116, dir: 'down' }],
  npcs: [{ char: 'fenn', x: 196, y: 124, wander: [150, 120, 230, 132] }],
  things: [
    { id: 'tome', nouns: ['tome'], x: 122, y: 143, lift: 16, reach: 34, icon: 'tome', take: 'tomeFlame', takeSay: 'You pick up the singed book. Fenn waves a hand without looking round. "Take it. I know that one by heart."', look: 'A book with scorched edges lies open on the table.' },
    { id: 'hearth', nouns: ['hearth'], x: 176, y: 106, reach: 40, look: "A proper fire, steady and hot. Either the village's trouble stops at the tarn, or this fire is more afraid of Fenn than of the barrow." },
    { id: 'shelf', nouns: ['shelf'], x: 70, y: 106, reach: 50, look: 'Books two deep, in six scripts. Some have locks. One has teeth marks, from the inside.' },
    { id: 'table', nouns: ['table'], x: 112, y: 144, reach: 44, look: 'Ink, a candle stub, a mug, and whatever Fenn was reading when you came in.' },
    { id: 'bed', nouns: ['bed'], x: 250, y: 162, reach: 40, look: "The hermit's bed. It does not look slept in. It looks read in." },
    { id: 'door', nouns: ['door'], x: 262, y: 106, reach: 400, look: 'The way out, back to the tarn.' },
  ],
  rules: [
    firstVisit('hut'),
    { on: ['warm', 'warm *'], do: [{ say: 'You warm yourself at the hermit\'s fire. It is a very good fire. Fenn watches you do it as if you were using up something of his.' }] },
    { on: ['buy frost'], if: [{ has: 'tomeFrost' }], do: [{ say: '"You have that one. Reading it twice will not make it colder."' }] },
    { on: ['buy frost'], if: [{ gold: 20 }], do: [{ gold: -20 }, { give: 'tomeFrost' }, { sound: 'take' }, { say: 'Twenty silver. Fenn pulls down a book bound in pale blue hide. It is cold to hold. "Frost. It slows what it strikes, and it is not kind about it."' }] },
    { on: ['buy mend'], if: [{ has: 'tomeMend' }], do: [{ say: '"You have that one already."' }] },
    { on: ['buy mend'], if: [{ gold: 15 }], do: [{ gold: -15 }, { give: 'tomeMend' }, { sound: 'take' }, { say: 'Fifteen silver for a small green book, soft with handling. "Mend. The only spell worth knowing, in the end."' }] },
    { on: ['buy ward'], if: [{ has: 'tomeWard' }], do: [{ say: '"You have that one already."' }] },
    { on: ['buy ward'], if: [{ gold: 25 }], do: [{ gold: -25 }, { give: 'tomeWard' }, { sound: 'take' }, { say: 'Twenty-five silver. The book is bound in grey iron-cloth. "Ward. It halves what hits you, for a little while."' }] },
    { on: ['buy frost', 'buy mend', 'buy ward', 'buy', 'buy tome', 'buy light', 'buy magic', 'learn', 'learn magic'], do: [{ say: '"Books cost silver," says Fenn. "Mend is fifteen, Frost twenty, Ward twenty-five. Light I do not sell. Light I give, to people who do me a kindness."' }] },
    { on: ['give crown', 'give crown fenn', 'give fenn crown'], if: [{ has: 'crown' }], do: [{ cmd: 'ask fenn about crown' }] },
    { on: ['give amulet', 'give amulet fenn'], if: [{ has: 'amulet' }], do: [{ lose: 'amulet' }, { give: 'tomeLight' }, { score: 2, id: 'errand.start' }, { score: 8, id: 'errand.done' }, { say: 'Fenn takes the amulet in both hands and says nothing for a while. "Forty years I have looked at this from the shore, every morning," he says at last. "I had forgotten it was so small." He closes his hand on it. Then, briskly, as if you had caught him at something, he puts a slim white book in yours. "Light. You will want it under the barrow."' }, { quest: 'errand', stage: 2 }] },
    { on: ['sleep', 'sleep bed'], do: [{ say: '"That is my bed," says Fenn, "and I may want it some day."' }] },
  ],
};

// ---------------------------------------------------------------------------------------------
// Under the barrow

const DF = 98;

export const ante: RoomDef = {
  id: 'ante',
  music: 'barrow',
  name: 'The Antechamber',
  look: 'A chamber of fitted stone under the mound. Three figures are carved on the back wall: a wolf, a stag and a crown, with a line of writing beneath. A brazier burns here, which is worrying. To the east an archway is filled with something that is not quite air. The stair behind you climbs to daylight.',
  scene: {
    kind: 'indoor', walkTop: 106, ambient: 0.3,
    layers: [{ t: 'stonewall', floor: DF }, { t: 'flagstones', floor: DF }],
    props: [
      { t: 'arch', x: 44, y: DF, w: 30, h: 46 },
      { t: 'arch', x: 284, y: DF, w: 40, h: 60 },
      { t: 'pillar', x: 84, y: 110, lit: 1 },
      { t: 'pillar', x: 244, y: 110, lit: -1 },
      { t: 'brazier', x: 170, y: 142 },
      { t: 'boulder', x: 30, y: 152, r: 5, seed: 31, ramp: 'stone' },
      { t: 'rune', x: 124, y: 58, h: 18, v: 'a', lit: 0 },
      { t: 'rune', x: 170, y: 58, h: 18, v: 'b', lit: 0 },
      { t: 'rune', x: 216, y: 58, h: 18, v: 'c', lit: 0 },
    ],
    lights: [{ x: 170, y: 124, r: 72, i: 1.25, kind: 'warm' }],
    when: [
      { if: [{ flag: 'ante.wolf' }], props: [{ t: 'rune', x: 124, y: 58, h: 18, v: 'a' }], lights: [{ x: 124, y: 58, r: 16, i: 0.4, kind: 'glow' }] },
      { if: [{ flag: 'ante.stag' }], props: [{ t: 'rune', x: 170, y: 58, h: 18, v: 'b' }], lights: [{ x: 170, y: 58, r: 16, i: 0.4, kind: 'glow' }] },
      { if: [{ flag: 'ante.open' }], props: [{ t: 'rune', x: 216, y: 58, h: 18, v: 'c' }], lights: [{ x: 216, y: 58, r: 16, i: 0.4, kind: 'glow' }] },
    ],
  },
  doors: [
    { x0: 36, y0: 107, x1: 52, y1: 109, to: 'barrow', x: 160, y: 126, dir: 'down' },
    {
      x0: 274, y0: 107, x1: 294, y1: 109, to: 'sleepers', x: 48, y: 116, dir: 'right',
      if: [{ flag: 'ante.open' }],
      locked: 'Cold fills the archway like glass. You put a hand to it and snatch it back, numb to the elbow. Something has to be said, or done, before this lets anyone through.',
    },
  ],
  things: [
    { id: 'wolf', nouns: ['wolf'], x: 124, y: 108, reach: 30, try: ['push wolf'], look: 'A wolf, carved running, mouth open. Whoever cut it had watched wolves.' },
    { id: 'stag', nouns: ['stag'], x: 170, y: 108, reach: 30, try: ['push stag'], look: 'A stag with its head thrown back, in the last moment before it runs.' },
    { id: 'crown', nouns: ['crown'], x: 216, y: 108, reach: 30, try: ['push crown'], look: 'A crown of seven points, carved deep. No head under it.' },
    { id: 'writing', nouns: ['inscription', 'rune'], x: 170, y: 108, reach: 70, try: ['read inscription'], look: 'Cut beneath the figures, in letters you can just follow: "FIRST THE ONE WHO HUNTS. THEN THE ONE WHO IS HUNTED. LAST THE ONE WHO IS CROWNED, FOR ALL COME TO HIM IN THE END."' },
    { id: 'arch', nouns: ['arch'], x: 284, y: 108, reach: 400, look: 'West, a stair climbs to the surface. East, an archway leads deeper, and the air in it shimmers like the air over ice.' },
    { id: 'brazier', nouns: ['hearth'], x: 170, y: 144, reach: 40, look: 'An iron brazier, burning steadily. Somebody down here tends it. You would rather not meet them.' },
    { id: 'pillar', nouns: ['pillar'], x: 84, y: 112, reach: 40, look: 'Drums of grey stone, ringed with notches that might be a tally. It is a long tally.' },
  ],
  rules: [
    firstVisit('ante', 3),
    { on: ['read inscription', 'read rune'], do: [{ say: '"FIRST THE ONE WHO HUNTS. THEN THE ONE WHO IS HUNTED. LAST THE ONE WHO IS CROWNED, FOR ALL COME TO HIM IN THE END."' }] },
    { on: ['push wolf', 'pet wolf'], if: [{ flag: 'ante.open' }], do: [{ say: 'The way is already open.' }] },
    { on: ['push wolf', 'pet wolf'], if: [{ not: { near: 'wolf' } }], do: [{ say: 'You are not close enough.' }] },
    { on: ['push wolf', 'pet wolf'], if: [{ not: { flag: 'ante.wolf' } }], do: [{ set: 'ante.wolf' }, { sound: 'take' }, { say: 'The wolf sinks a finger\'s width into the wall, and a rune above it wakes, green and steady.' }] },
    { on: ['push wolf', 'pet wolf'], do: [{ say: 'The wolf is already pressed home.' }] },
    { on: ['push stag', 'pet stag'], if: [{ flag: 'ante.open' }], do: [{ say: 'The way is already open.' }] },
    { on: ['push stag', 'pet stag'], if: [{ not: { near: 'stag' } }], do: [{ say: 'You are not close enough.' }] },
    { on: ['push stag', 'pet stag'], if: [{ flag: 'ante.wolf' }, { not: { flag: 'ante.stag' } }], do: [{ set: 'ante.stag' }, { sound: 'take' }, { say: 'The stag slides back. A second rune wakes beside the first.' }] },
    { on: ['push stag', 'pet stag'], if: [{ flag: 'ante.stag' }], do: [{ say: 'The stag is already pressed home.' }] },
    { on: ['push stag', 'pet stag'], do: [{ set: 'ante.wolf', to: false }, { hurt: 7, why: 'The barrow does not care for guesswork. The cold stops your heart between one beat and the next.' }, { say: 'The stag does not move. Cold comes out of the wall like a blow, and you stagger back with frost on your sleeve.' }] },
    { on: ['push crown', 'pet crown'], if: [{ flag: 'ante.open' }], do: [{ say: 'The way is already open.' }] },
    { on: ['push crown', 'pet crown'], if: [{ not: { near: 'crown' } }], do: [{ say: 'You are not close enough.' }] },
    { on: ['push crown', 'pet crown'], if: [{ flag: 'ante.wolf' }, { flag: 'ante.stag' }], do: [{ set: 'ante.open' }, { sound: 'door' }, { score: 10, id: 'ante.open' }, { say: 'The crown goes in with a click you feel in your teeth. The third rune wakes, and in the eastern archway the cold lets go all at once, like a held breath. The way down is open.' }] },
    { on: ['push crown', 'pet crown'], do: [{ set: 'ante.wolf', to: false }, { set: 'ante.stag', to: false }, { hurt: 7, why: 'The barrow does not care for guesswork. The cold stops your heart between one beat and the next.' }, { say: 'The crown does not move. The runes go dark, and cold comes out of the wall like a blow.' }] },
    { on: 'veth', do: [{ say: 'The word booms round the chamber and comes back unanswered. Whatever holds the archway is not a door, and does not open like one.' }] },
  ],
};

export const sleepers: RoomDef = {
  id: 'sleepers',
  music: 'barrow',
  name: 'The Hall of Sleepers',
  look: 'A long hall of niches and stone coffins. The dead of forty generations were laid here to rest. The lids are off several of the coffins. An arch at the far end leads on.',
  dark: true,
  scene: {
    kind: 'indoor', walkTop: 106, ambient: 0.32,
    layers: [{ t: 'stonewall', floor: DF }, { t: 'flagstones', floor: DF }],
    props: [
      { t: 'arch', x: 44, y: DF, w: 30, h: 46 },
      { t: 'arch', x: 284, y: DF, w: 40, h: 60 },
      { t: 'niche', x: 92, y: 52, w: 26, h: 20 },
      { t: 'niche', x: 146, y: 52, w: 26, h: 20 },
      { t: 'niche', x: 200, y: 52, w: 26, h: 20 },
      { t: 'pillar', x: 76, y: 110, lit: 1 },
      { t: 'pillar', x: 246, y: 110, lit: -1 },
      { t: 'sarcophagus', x: 96, y: 154, w: 56 },
      { t: 'sarcophagus', x: 190, y: 138, w: 56 },
      { t: 'boulder', x: 290, y: 150, r: 5, seed: 33, ramp: 'stone' },
    ],
    lights: [
      { x: 160, y: 62, r: 46, i: 0.5, kind: 'glow' },
      { x: 160, y: 130, r: 80, i: 0.55, kind: 'warm' },
    ],
  },
  doors: [
    { x0: 36, y0: 107, x1: 52, y1: 109, to: 'ante', x: 284, y: 116, dir: 'left' },
    { x0: 274, y0: 107, x1: 294, y1: 109, to: 'throne', x: 48, y: 116, dir: 'right' },
  ],
  spawns: [
    { id: 'wight1', kind: 'wight', x: 150, y: 124 },
    { id: 'wight2', kind: 'wight', x: 230, y: 156 },
    { id: 'wight3', kind: 'wight', x: 262, y: 122 },
  ],
  things: [
    { id: 'coffins', nouns: ['sarcophagus'], x: 124, y: 156, reach: 50, look: 'Stone coffins with figures carved on the lids. Where the lids are still on.' },
    { id: 'niches', nouns: ['niche'], x: 160, y: 108, reach: 400, look: 'Burial niches, each with an urn. The dust on them has been disturbed by something walking past, often.' },
    { id: 'arch', nouns: ['arch'], x: 284, y: 108, reach: 400, look: 'The arch to the west leads back to the antechamber. The one to the east has a draught coming out of it, and the draught smells of old iron.' },
    { id: 'pillar', nouns: ['pillar'], x: 76, y: 112, reach: 40, look: 'The same grey drums as upstairs, the same long tally.' },
  ],
  rules: [
    firstVisit('sleepers', 3),
    { on: ['open sarcophagus', 'push sarcophagus'], if: [{ not: { flag: 'sleepers.lid' } }], do: [{ set: 'sleepers.lid' }, { spawn: 'wight', x: 124, y: 132 }, { say: 'You put your shoulder to a lid that is still in place. It grinds aside. What is underneath sits up, looks at you with eyes like marsh-lights, and reaches for its sword. You have nobody to blame for this.' }] },
    { on: ['open sarcophagus', 'look sarcophagus', 'enter sarcophagus', 'push sarcophagus'], do: [{ say: 'You look into the nearest open coffin. It is empty. That is not as reassuring as it ought to be.' }] },
    { on: ['take niche', 'open niche'], do: [{ say: 'You leave the urns alone. Enough of the dead are annoyed with you already.' }] },
    { on: 'sol', do: [{ say: 'SOL. Daylight, down here, where there has been none in four thousand years. The dust hangs gold in it. Every one of the sleepers flinches, the standing and the lying alike, and from the far arch comes a sound like a long breath drawn in through teeth.' }] },
  ],
};

export const throne: RoomDef = {
  id: 'throne',
  music: 'barrow',
  name: "The Barrow-King's Chamber",
  look: 'The heart of the barrow: a round chamber with a stone seat at its centre and grave-gold heaped against the wall. Two braziers burn green-edged. On the far wall a rune is cut, bigger than a man. All the warmth of Hollowmere seems to have ended up in this room, and it is still cold.',
  scene: {
    kind: 'indoor', walkTop: 106, ambient: 0.34,
    layers: [{ t: 'stonewall', floor: DF }, { t: 'flagstones', floor: DF }],
    props: [
      { t: 'arch', x: 44, y: DF, w: 30, h: 46 },
      { t: 'rune', x: 286, y: 54, h: 30, v: 'c' },
      { t: 'pillar', x: 96, y: 110, lit: 1 },
      { t: 'pillar', x: 226, y: 110, lit: -1 },
      { t: 'throne', x: 160, y: 112 },
      { t: 'brazier', x: 112, y: 140 },
      { t: 'brazier', x: 210, y: 140 },
      { t: 'treasure', x: 270, y: 150, r: 24 },
    ],
    lights: [
      { x: 112, y: 122, r: 60, i: 1.1, kind: 'warm' },
      { x: 210, y: 122, r: 60, i: 1.1, kind: 'warm' },
      { x: 286, y: 54, r: 30, i: 0.6, kind: 'glow' },
    ],
  },
  doors: [{ x0: 36, y0: 107, x1: 52, y1: 109, to: 'sleepers', x: 284, y: 116, dir: 'left' }],
  spawns: [{ id: 'king', kind: 'king', x: 160, y: 126 }],
  things: [
    { id: 'throne', nouns: ['throne'], x: 160, y: 114, reach: 40, look: 'A seat cut from one block, worn smooth by a very long sitting.' },
    { id: 'treasure', nouns: ['treasure'], x: 270, y: 152, reach: 40, try: ['take treasure'], look: 'Arm-rings, cups, coin from kingdoms nobody remembers. A king was buried with all he owned, so that nobody else should have it.' },
    { id: 'rune', nouns: ['rune', 'inscription'], x: 286, y: 108, reach: 40, try: ['read rune'], look: 'A rune as tall as you are, cut into the wall and filled with green light. It hurts a little to look at directly, like a word on the tip of your tongue.' },
    { id: 'brazier', nouns: ['hearth'], x: 112, y: 142, reach: 40, look: 'The flames have green edges and give no warmth at all. They are burning something that is not wood.' },
    { id: 'arch', nouns: ['arch'], x: 44, y: 108, reach: 400, look: 'The only way out is the way you came in.' },
  ],
  rules: [
    firstVisit('throne', 3),
    { on: ['read rune', 'pet rune', 'read inscription'], if: [{ not: { flag: 'king.dead' } }], do: [{ say: 'The King takes exception to your reading in his presence.' }] },
    { on: ['read rune', 'pet rune', 'read inscription'], if: [{ near: 'rune' }, { not: { knows: 'word:orun' } }], do: [{ teach: 'word:orun' }, { run: 'study', arg: 40 }, { sound: 'word' }, { score: 6, id: 'word.orun' }, { say: 'You stand before the great rune until it stops being a shape and becomes a meaning: ORUN. See. Uncover. Let nothing stay hidden. There may be things in this valley that have been waiting to be seen.' }, { note: 'Tip: type ORUN to speak the word.' }] },
    { on: ['read rune', 'pet rune', 'read inscription'], if: [{ near: 'rune' }], do: [{ say: 'ORUN. You have it now. The rune is only a carving again.' }] },
    { on: ['read rune', 'pet rune', 'read inscription'], do: [{ say: 'You are not close enough.' }] },
    { on: ['take treasure', 'take crown'], if: [{ not: { flag: 'king.dead' } }], do: [{ say: 'Its owner is standing right there.' }] },
    { on: ['take treasure'], if: [{ flag: 'throne.looted' }], do: [{ say: 'You have taken what you can carry. The rest can stay buried, which is what it was for.' }] },
    { on: ['take treasure'], if: [{ near: 'treasure' }], do: [{ set: 'throne.looted' }, { gold: 60 }, { sound: 'take' }, { score: 4, id: 'treasure' }, { say: 'You fill your pack with sixty silver\'s worth of dead men\'s coin. It is very cold to the touch, and you decide not to think about that.' }] },
    { on: ['take treasure'], do: [{ say: 'You are not close enough.' }] },
    { on: ['sit throne', 'sit'], if: [{ flag: 'king.dead' }], do: [{ die: 'You sit in the Barrow-King\'s seat, just to see. It is comfortable. It is so comfortable. Centuries later, somebody else opens the barrow, and finds you still sitting there, wearing a crown.' }] },
    { on: ['sit throne', 'sit'], do: [{ say: 'It is occupied.' }] },
  ],
};

// ---------------------------------------------------------------------------------------------
// The third saga: behind the barrow's second door.

const LIT = { flag: 'rest.lit' };
const RESTED = { flag: 'dead.rested' };

export const tally: RoomDef = {
  id: 'tally',
  music: 'barrow',
  name: "The Servants' Stair",
  look: "A narrow stair, worn hollow down the middle by people carrying things, going down under the mound. The walls on both sides are covered with marks, from the floor to as high as an arm can reach. At the foot of it an arch opens on a wider dark.",
  dark: true,
  scene: {
    kind: 'indoor', walkTop: 106, ambient: 0.3,
    layers: [{ t: 'stonewall', floor: DF }, { t: 'flagstones', floor: DF }],
    props: [
      { t: 'arch', x: 44, y: DF, w: 30, h: 46 },
      { t: 'arch', x: 284, y: DF, w: 40, h: 60 },
      { t: 'pillar', x: 110, y: 110, lit: 1 },
      { t: 'pillar', x: 210, y: 110, lit: -1 },
      { t: 'boulder', x: 236, y: 152, r: 4, seed: 41, ramp: 'stone' },
    ],
    lights: [{ x: 160, y: 126, r: 90, i: 0.5, kind: 'glow' }],
  },
  doors: [
    { x0: 36, y0: 107, x1: 52, y1: 109, to: 'barrow', x: 118, y: 126, dir: 'down' },
    { x0: 274, y0: 107, x1: 294, y1: 109, to: 'winterhall', x: 48, y: 118, dir: 'right' },
  ],
  things: [
    {
      // "Marks" is a word for runes everywhere else; here it means these.
      id: 'marks', nouns: ['inscription', 'rune'], x: 160, y: 106, reach: 400, try: ['read marks'],
      look: 'Five strokes and a bar, five strokes and a bar, in rows without end, cut into both walls with the same chisel. Somebody was counting something, and there was a great deal of it.',
    },
    {
      id: 'chisel', nouns: ['chisel'], x: 236, y: 150, reach: 34, look: "A mason's chisel, worn to a stub, lying against the wall at the foot of the stair where a hand let it fall. Above it, the last tally mark is only half cut.",
      lookWhen: [{ if: [{ flag: 'rest.count' }], look: "A mason's chisel, worn to a stub, laid straight at the foot of the wall. The count above it is finished." }],
    },
    { id: 'archUp', nouns: ['arch'], x: 44, y: 108, reach: 400, look: 'West, the stair climbs to the snow. East, at its foot, an arch opens on a hall you cannot see the end of.' },
  ],
  rules: [
    firstVisit('tally', 2),
    { on: 'orun', do: [{ say: 'ORUN. Under the last tally, low down, where a man sitting against the wall would reach, there is one thing more cut into the stone. It is not a number. It is a hand, palm out, the sign in any country for THIS FAR. You have seen its like on a stone a long way from here. This one wears no rings.' }] },
    { on: ['read inscription', 'pet inscription', 'read rune', 'pet rune', 'read'], if: [{ flag: 'rest.read' }], do: [{ say: 'Nine thousand and eleven, in one hand, with the last bar half cut.' }] },
    { on: ['read inscription', 'pet inscription', 'read rune', 'pet rune', 'read'], do: [{ set: 'rest.read' }, { run: 'study', arg: 10 }, { say: 'You follow the rows down the stair with one finger. They are tallies, all in one hand, and the hand grows less steady as it goes. Near the foot the count stops. You work it out twice, on the wall, with your lips moving: nine thousand and eleven. The last bar is only half cut.' }] },
    { on: ['take chisel', 'use chisel', 'use chisel inscription', 'chop inscription', 'chop rune', 'dig inscription'], if: [{ flag: 'rest.count' }], do: [{ say: 'The count is closed. You leave his chisel where you laid it.' }] },
    {
      on: ['take chisel', 'use chisel', 'use chisel inscription', 'chop inscription', 'dig inscription'], if: [RESTED, { near: 'chisel', d: 44 }],
      do: [{ set: 'rest.count' }, { sound: 'take' }, { say: 'You take up the chisel, find a loose stone for a mallet, and finish the bar he left half cut. It takes four blows. Nine thousand and eleven, and done. Then you lay the chisel straight at the foot of the wall, where he can find it.' }],
    },
    { on: ['take chisel', 'use chisel', 'use chisel inscription', 'chop inscription', 'dig inscription'], do: [{ say: 'You pick it up. The handle is worn to the shape of one hand, and it is not yours. Whoever was counting had not finished, and neither, you think, have you. You put it back.' }] },
  ],
};

export const winterhall: RoomDef = {
  id: 'winterhall',
  music: 'barrow',
  name: 'The Winter Hall',
  look: "A king's hall, buried whole: long tables laid for a feast, a high seat, and at the far end a hearth of river-stone bigger than the Elder's, laid with logs and stone cold. The benches are full. They sit in their rows with the frost on them, every face turned to the hearth, as people sit who are waiting to be told the feast may begin.",
  lookWhen: [
    { if: [RESTED], look: 'A long hall under the hill, warm from end to end. The fire in the great hearth has burned down to a steady red, and somebody has stacked fresh logs beside it. The benches are empty. The tables are only tables.' },
    { if: [LIT], look: "The hall is lit from end to end by its own hearth, for the first time. Along the tables the frost is running off them like sweat, and every face is turned to the fire. Nobody gets up. They are warm, and they are still here. Something more than fire is owed them, and they do not know its name either." },
  ],
  scene: {
    kind: 'indoor', walkTop: 106, ambient: 0.34,
    layers: [{ t: 'stonewall', floor: DF }, { t: 'flagstones', floor: DF }],
    props: [
      { t: 'arch', x: 44, y: DF, w: 30, h: 46 },
      { t: 'pillar', x: 96, y: 110, lit: 1 },
      { t: 'pillar', x: 224, y: 110, lit: -1 },
      { t: 'throne', x: 262, y: 112 },
      { t: 'table', x: 120, y: 146, w: 76 },
      { t: 'table', x: 214, y: 158, w: 76 },
    ],
    when: [
      { if: [{ not: LIT }], props: [{ t: 'hearth', x: 160, y: DF }], lights: [{ x: 60, y: 120, r: 70, i: 0.45, kind: 'glow' }, { x: 160, y: 130, r: 110, i: 0.4, kind: 'glow' }] },
      { if: [LIT], props: [{ t: 'hearth', x: 160, y: DF, lit: 1 }], lights: [{ x: 160, y: 102, r: 130, i: 1.25, kind: 'warm' }] },
    ],
  },
  doors: [{ x0: 36, y0: 107, x1: 52, y1: 109, to: 'tally', x: 276, y: 118, dir: 'left' }],
  npcs: [
    { char: 'dead1', x: 104, y: 136, dir: 'right', if: [{ not: RESTED }] },
    { char: 'dead2', x: 136, y: 152, dir: 'up', if: [{ not: RESTED }] },
    { char: 'dead3', x: 196, y: 148, dir: 'up', if: [{ not: RESTED }] },
    { char: 'dead4', x: 232, y: 164, dir: 'up', if: [{ not: RESTED }] },
    { char: 'dead5', x: 240, y: 136, dir: 'left', if: [{ not: RESTED }] },
  ],
  things: [
    {
      id: 'hearth', nouns: ['hearth'], x: 160, y: 108, reach: 44, try: ['light hearth'], look: 'A hearth a whole village could stand in front of. The logs are laid as they were laid four thousand years ago, on a bed of older ash. The last fire here went out in the middle of a feast, and none has held since.',
      lookWhen: [
        { if: [RESTED], look: 'A good fire, burning low and steady, with wood stacked ready beside it. Somebody from Hollowmere has been down.' },
        { if: [LIT], look: 'It is burning as if it had only been waiting to be asked. The coal from the Elder\'s hearth is somewhere in the heart of it.' },
      ],
    },
    {
      id: 'tables', nouns: ['table'], x: 160, y: 150, reach: 400, look: 'Long tables, laid for a homecoming: horn cups, wooden platters, knives set straight, and at every place a sprig of something that was green once. Nothing was ever put on the platters. The fire went out as he came in at the door, and they sat on, waiting for it to take again.',
      lookWhen: [{ if: [RESTED], look: 'Long tables, and empty benches, and horn cups set out in rows for a feast that was four thousand years late.' }],
    },
    { id: 'highseat', nouns: ['throne'], x: 262, y: 114, reach: 44, look: 'The high seat, at the head of the hall, facing the hearth, with the best cup in the house set ready on its arm. It is the only empty place in the room. He came home, and walked past it.' },
    { id: 'arch', nouns: ['arch'], x: 44, y: 108, reach: 400, look: "The foot of the servants' stair. It is the only way out, and it goes up." },
  ],
  rules: [
    { enter: true, if: [{ not: { flag: 'seen.winterhall' } }], do: [{ set: 'seen.winterhall' }, { score: 5, id: 'seen.winterhall' }, { quest: 'rest', stage: 4 }] },
    { on: 'orun', do: [{ say: 'ORUN. The floor shows its wear. From every bench a path is trodden into the stone, to the hearth and back: thousands of them, the way people go to a fire. And one more, laid over all the rest: in from where the great door stood, straight up the middle of the hall between the tables, past the high seat without a turn, to the stair, and up. It does not come back.' }] },
    // SOL: a blow, while they are cold. A kindness, once they are warm.
    { on: 'sol', if: [RESTED], do: [{ say: 'Day. There is nobody left in the hall to need telling.' }] },
    {
      on: 'sol', if: [LIT],
      do: [
        { set: 'dead.rested' }, { muster: true }, { sound: 'win' }, { score: 25, id: 'rest.done' }, { quest: 'rest', stage: 6 },
        { say: "SOL. You say it quietly, the way you would tell somebody the time. Day. The sun's own name: the thing he went west to fetch.\n\nIt is four thousand years late, and it is not much. One word, and a coal from somebody else's hearth. But it is what these tables were laid for, and it has come. Along the benches the last of the frost goes out of nine thousand faces, and what is under it is only people: tired, and warm, and finished with waiting. It was never that they could not bear the word. They could not bear it cold. One by one they lay their heads down on their arms, as people do at the end of a long feast when the fire is good.\n\nWhen you look again the benches are empty. The fire burns on. Somebody ought to keep it in.\n\nYou have finished the third saga of THANE'S QUEST. Tonight, for the first time in four thousand years, nothing is walking in the north that ought to be asleep." },
      ],
    },
    { on: 'sol', do: [{ say: 'SOL. The word goes down the hall like a slap, and nine thousand heads turn away from it together. It is day you are offering them, and they have nothing yet to be warm with. You find that you are ashamed.' }] },
    { on: ['light hearth', 'use ember', 'use ember hearth', 'give ember hearth', 'give ember', 'drop ember', 'light', 'cast flame', 'use torch', 'light torch'], if: [LIT], do: [{ say: 'It is burning. It does not need you now. They may.' }] },
    {
      on: ['light hearth', 'use ember', 'use ember hearth', 'give ember hearth', 'give ember', 'drop ember', 'light'], if: [{ has: 'ember' }, { near: 'hearth', d: 60 }],
      do: [
        { lose: 'ember' }, { set: 'rest.lit' }, { sound: 'quest' }, { score: 10, id: 'rest.lit' }, { quest: 'rest', stage: 5 },
        { say: "You strike a spark into kindling four thousand years dry. It takes at once and goes out at once, the way a word does when nobody is listening. The cold has been in these logs four thousand years, and a spark is no argument against it. Fire will not be struck here. It would have to be brought.\n\nSo you open the horn box. The coal from Marta's hearth glows in its bed of ash, as it has every day since she gave it to you: fire from a hall where anybody may come in out of the snow. You tip it onto the old logs.\n\nIt does not gutter. It catches, and keeps catching, as the Elder's hearth did, and the light walks down the hall from table to table, and every face at every table lifts toward it. Nobody gets up. They have waited a long time to be warm. They are not going to hurry it now." },
      ],
    },
    { on: ['light hearth', 'use ember', 'use ember hearth', 'give ember hearth', 'give ember', 'light'], if: [{ has: 'ember' }], do: [{ say: 'You are not close enough to the hearth.' }] },
    { on: ['light hearth', 'light', 'cast flame', 'use torch', 'light torch', 'use ember'], do: [{ say: 'You strike a spark into kindling four thousand years dry. It takes at once and goes out at once, the way a word does when nobody is listening. Along the tables nobody moves; but you have the feeling of a great many people not letting themselves hope. The cold has been in these logs four thousand years, and a spark is no argument against it. Fire will not be struck here. It would have to be brought in alive, from a hearth where one is burning.' }] },
    { on: ['sit', 'sit table', 'sit throne'], if: [RESTED], do: [{ say: 'You sit a while at the long table, alone, in front of a good fire. It seems a thing somebody should do.' }] },
    { on: ['sit throne'], do: [{ say: 'Nine thousand people are looking at the hearth. If you sat there, they would look at you instead. You stay on your feet.' }] },
    { on: ['sit', 'sit table'], do: [{ say: 'There is one place left at the nearest bench, and you take it. Nobody objects. It is the coldest seat you have ever sat in, and the company is very quiet. After a while you get up again, because you can.' }] },
    { on: ['attack wight', 'shoot wight', 'shoot'], if: [{ not: RESTED }], do: [{ say: 'They have not lifted a hand to you. They are not going to. You put your own hand down.' }] },
  ],
};

