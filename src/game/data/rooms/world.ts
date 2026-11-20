// The nine outdoor screens of the valley, laid out three by three with a screen of road between
// each and the next (the roads are generated: see `valley` in data/frontier.ts):
//
//   ridge      ·  barrow     ·  tarn
//      ·       ·     ·       ·    ·
//   pinewood   ·  village    ·  farm
//      ·       ·     ·       ·    ·
//   camp       ·  ford       ·  tower
//
// None has an exit to another; each opens onto the roads round it through its gates.

import type { LayerDef, RoomDef, Rule, ThingDef } from '../../../engine/types';

/** The usual winter backdrop. Seeds vary the skyline from screen to screen. */
function backdrop(hz: number, seed: number, near = true): LayerDef[] {
  return [
    { t: 'sky', horizon: hz },
    { t: 'mountains', base: hz + 3, height: 54, seed, far: true },
    ...(near ? [{ t: 'mountains', base: hz + 5, height: 30, seed: seed + 1 }] : []),
    { t: 'treeline', y: hz + 4, seed: seed + 2, shade: 0.34, hmin: 5, hvar: 6, spacing: 5 },
    { t: 'snow', from: hz + 4 },
    { t: 'treeline', y: hz + 9, seed: seed + 3, shade: 0.2, hmin: 7, hvar: 9, spacing: 7 },
  ];
}

const scenery = (snow: string, sky: string): ThingDef[] => [
  { id: 'snow', nouns: ['snow', 'ground'], x: 160, y: 140, reach: 400, look: snow },
  { id: 'mountains', nouns: ['mountain', 'sky'], x: 160, y: 100, reach: 400, look: sky },
];

const firstVisit = (id: string, points = 2): Rule => ({ enter: true, if: [{ not: { flag: `seen.${id}` } }], do: [{ set: `seen.${id}` }, { score: points, id: `seen.${id}` }] });

// ---------------------------------------------------------------------------------------------

export const ford: RoomDef = {
  id: 'ford',
  mark: 'water',
  music: 'valley',
  name: 'The River Ford',
  look: 'A black river runs between banks of ice, too fast to freeze and too cold to cross. A plank bridge leads north toward a thread of smoke. A signpost leans beside the path.',
  scene: {
    kind: 'outdoor', horizon: 60, walkTop: 86,
    layers: [
      ...backdrop(60, 71),
      { t: 'river', y: 126, w: 11, seed: 7 },
      { t: 'path', w: 12, pts: [[160, 172], [160, 150]] },
      { t: 'path', w: 12, pts: [[160, 102], [163, 84]] },
      { t: 'tufts', count: 26, seed: 72 },
    ],
    props: [
      { t: 'bridge', x: 160, y: 126, h: 50 },
      { t: 'pine', x: 40, y: 92, h: 60, seed: 71 },
      { t: 'pine', x: 250, y: 90, h: 54, seed: 72 },
      { t: 'pine', x: 300, y: 94, h: 66, seed: 73 },
      { t: 'signpost', x: 196, y: 158 },
      { t: 'boulder', x: 100, y: 160, r: 8, seed: 74 },
      { t: 'pine', x: 26, y: 184, h: 92, seed: 75 },
      { t: 'pine', x: 296, y: 186, h: 98, seed: 76 },
    ],
  },
  things: [
    { id: 'river', nouns: ['river', 'water'], x: 160, y: 126, reach: 400, look: 'Fast, black and loud. Plates of ice ride it like cargo.' },
    { id: 'bridge', nouns: ['bridge'], x: 160, y: 126, reach: 400, look: 'Split logs laid over two trunks. Whoever built it did not trust it either: there are handrails.' },
    { id: 'sign', nouns: ['sign'], x: 196, y: 158, reach: 34, try: ['read sign'], look: 'It reads: HOLLOWMERE, north. Below, in a different hand: "Everywhere else: at your own risk."' },
    { id: 'trees', nouns: ['tree'], x: 160, y: 100, reach: 400, look: 'Pines on both banks, leaning in as if to watch you try the bridge.' },
    ...scenery('The snow on the bank is crusted hard. Your boots break through at every step.', 'The mountains north of here have a look of unfinished business.'),
  ],
  rules: [
    { on: ['read sign'], if: [{ near: 'sign' }], do: [{ say: 'HOLLOWMERE, north. Below, in a different hand: "Everywhere else: at your own risk."' }, { score: 1, id: 'sign' }] },
    { on: ['read sign'], do: [{ say: 'You cannot make it out from here.' }] },
    { on: ['swim', 'swim river', 'enter river', 'jump river', 'swim water', 'enter water'], do: [{ die: 'You wade in. The river takes the breath out of you, then the feet from under you, then the rest. You are found in the spring, a long way downstream, looking surprised.' }] },
    { on: ['drink water', 'drink river'], do: [{ say: 'You cup a handful from the bank. It is so cold your teeth ring.' }] },
    { on: ['jump bridge', 'climb bridge'], do: [{ die: 'You vault the handrail, to prove a point nobody was arguing. The river accepts the point, and you, and keeps both.' }] },
    { on: ['fish', 'fish river'], do: [{ say: 'You watch the water for a while. Something silver watches you back, and is not fooled.' }] },
    { on: 'iska', do: [{ say: 'ISKA. Ice runs out across the black water from both banks at once, and for three heartbeats the river is still. Then it shrugs, the way a horse shrugs off a fly, and the ice goes away downstream in plates. Some things are too busy to freeze.' }] },
    { on: 'veth', do: [{ say: 'VETH. The word skips across the river like a flat stone and knocks the snow off a pine on the far bank. The bridge creaks, to remind you that it is listening too.' }] },
    { on: 'orun', if: [{ not: { flag: 'orun.ford' } }], do: [{ set: 'orun.ford' }, { gold: 8 }, { sound: 'take' }, { say: 'ORUN. The river goes on being a river; but under the bridge, wedged between the two trunks where no eye would ever fall, something shows itself: a purse, dropped by somebody crossing in a hurry a long time ago. Eight silver, gone black. You fish it out with a stick.' }] },
    { on: 'orun', do: [{ say: 'ORUN. Nothing here is hiding from you any longer. The river never was.' }] },
  ],
};

// ---------------------------------------------------------------------------------------------

export const village: RoomDef = {
  id: 'village',
  mark: 'village',
  music: 'village',
  name: 'Hollowmere',
  look: "Hollowmere. The Elder's hall squats to the west under a hat of snow; the inn stands east of it with a sign by its door. Between them are a well, a smith's anvil, and people pretending not to stare at you.",
  lookWhen: [
    { if: [{ flag: 'crown.unmade' }], look: "Hollowmere, with smoke at every roof and a drip at every eave. The snow has drawn back from the doors and left the square brown and wet. The Elder's hall is to the west, the inn east of it. The forge is roaring, the well-rope is running, and two children are building something out of the last good snow." },
    { if: [{ flag: 'hearth.lit' }], look: "Hollowmere, with smoke standing straight up from every roof. The Elder's hall is to the west, the inn east of it; between them the smith's forge is roaring, and people look up as you pass and nod. Somebody has swept the snow from the well." },
  ],
  scene: {
    kind: 'outdoor', horizon: 70, walkTop: 92,
    layers: [
      ...backdrop(70, 3),
      { t: 'path', w: 13, pts: [[160, 172], [160, 150], [120, 134], [72, 120]] },
      { t: 'path', w: 11, pts: [[160, 150], [210, 130], [250, 116]] },
      { t: 'path', w: 10, pts: [[210, 130], [280, 138], [326, 140]] },
      { t: 'path', w: 10, pts: [[120, 134], [50, 136], [-6, 134]] },
      { t: 'path', w: 9, pts: [[160, 150], [166, 118], [168, 92]] },
      { t: 'tufts', count: 40, seed: 90 },
    ],
    props: [
      { t: 'pine', x: 150, y: 93, h: 48, seed: 2 },
      { t: 'pine', x: 184, y: 96, h: 56, seed: 3 },
      { t: 'pine', x: 314, y: 98, h: 64, seed: 7 },
      // The Elder's hall has no smoke at its roof until its hearth is lit; the inn's fire never quite went out.
      { t: 'hall', x: 14, y: 116, w: 112, v: 'cold' },
      { t: 'hall', x: 204, y: 112, w: 96 },
      { t: 'signpost', x: 236, y: 117 },
      { t: 'woodpile', x: 130, y: 117 },
      { t: 'well', x: 196, y: 152 },
      { t: 'anvil', x: 104, y: 152 },
      { t: 'barrel', x: 86, y: 150 },
      { t: 'boulder', x: 60, y: 162, r: 7, seed: 22 },
      { t: 'boulder', x: 290, y: 156, r: 8, seed: 23 },
      { t: 'fence', x: 8, y: 150, x1: 50, y1: 156 },
      { t: 'pine', x: 316, y: 186, h: 96, seed: 12 },
    ],
    when: [
      // Once the hearths will hold a flame again, the smith's forge is alight and the hall has smoke at its roof.
      { if: [{ flag: 'hearth.lit' }], props: [{ t: 'brazier', x: 68, y: 150 }, { t: 'hall', x: 14, y: 116, w: 112, v: 'smoke' }] },
      // When the winter breaks: wet thatch showing, the snow drawn back from the doors and the
      // well, and something being built out of what is left of it.
      {
        if: [{ flag: 'crown.unmade' }],
        props: [
          { t: 'hall', x: 14, y: 116, w: 112, v: 'thaw' },
          { t: 'hall', x: 204, y: 112, w: 96, v: 'thaw' },
          { t: 'melt', x: 70, y: 124, w: 120, h: 12, seed: 3 },
          { t: 'melt', x: 250, y: 120, w: 104, h: 12, seed: 5 },
          { t: 'melt', x: 190, y: 156, w: 70, h: 16, seed: 8 },
          { t: 'melt', x: 96, y: 156, w: 76, h: 14, seed: 11 },
          { t: 'melt', x: 160, y: 138, w: 90, h: 20, seed: 14 },
          { t: 'melt', x: 30, y: 164, w: 50, h: 8, seed: 17 },
          { t: 'snowman', x: 252, y: 166, ramp: 'purple' },
        ],
      },
    ],
  },
  doors: [
    { x0: 61, y0: 117, x1: 77, y1: 119, to: 'hall', x: 60, y: 112, dir: 'down' },
    { x0: 244, y0: 113, x1: 260, y1: 115, to: 'inn', x: 160, y: 112, dir: 'down' },
  ],
  things: [
    {
      id: 'well', nouns: ['well', 'water'], x: 196, y: 154, reach: 36, look: 'A stone well with a little roof of its own. The water far below is black and perfectly still.',
      lookWhen: [{ if: [{ flag: 'crown.unmade' }], look: 'A stone well with a little roof of its own. The water far below is black and moving, and the stones round the lip are wet from all the buckets that have come up today.' }],
    },
    {
      id: 'bucket', nouns: ['bucket', 'rope'], x: 196, y: 154, reach: 36, look: 'The rope is frozen stiff. So, presumably, is the bucket.',
      lookWhen: [{ if: [{ flag: 'crown.unmade' }], look: 'The rope runs, and the bucket comes up full. Nobody in Hollowmere has got tired of that yet.' }],
    },
    {
      id: 'hall', nouns: ['hall', 'roof'], x: 69, y: 120, reach: 70, look: "The Elder's hall: old logs, a deep roof, and crossed beams at each gable to keep ill luck off. It has not worked lately.",
      lookWhen: [
        { if: [{ flag: 'crown.unmade' }], look: "The Elder's hall, with the thatch showing dark and wet where the snow has slid off it, and water running from the eaves in a row of bright threads." },
        { if: [{ flag: 'hearth.lit' }], look: "The Elder's hall: old logs, a deep roof, and crossed beams at each gable to keep ill luck off. There is smoke at the roof again. Perhaps they work after all." },
      ],
    },
    {
      id: 'snowman', nouns: ['snowman'], x: 252, y: 164, reach: 34, hidden: true, look: 'A lumpy figure of snow with two stones for eyes and a scrap of purple wool at its neck. The straight back is unmistakable. Nobody has yet dared to tell her.',
    },
    { id: 'inn', nouns: ['inn', 'sign'], x: 252, y: 116, reach: 70, look: 'The inn. The sign shows a kettle, or possibly a helmet. Either way it means "warm inside", which these days is a boast.' },
    { id: 'door', nouns: ['door'], x: 69, y: 120, reach: 400, look: 'Two doors face the square: the hall to the west, the inn to the east. Neither is locked. Nobody here has anything left to steal.' },
    { id: 'shield', nouns: ['shield'], x: 36, y: 120, reach: 50, look: 'A painted shield hangs on the hall wall, red and white in quarters. The paint is older than anyone living.' },
    { id: 'woodpile', nouns: ['woodpile'], x: 146, y: 120, reach: 34, try: ['take wood'], look: 'Split pine, stacked with the care of someone expecting a long winter.' },
    { id: 'hatchet', nouns: ['hatchet'], x: 172, y: 122, reach: 30, icon: 'hatchet', take: 'hatchet', takeSay: 'You work the hatchet out of the frozen snow. Nobody is watching. It is yours now, in the way things become yours.', look: 'A hatchet left lying by the woodpile, half buried.' },
    {
      id: 'anvil', nouns: ['anvil', 'barrel', 'hearth'], x: 104, y: 154, reach: 34, look: "The smith's anvil, set on a stump in the open. The forge-fire went out nine days ago; now he works cold iron and swears.",
      lookWhen: [{ if: [{ flag: 'hearth.lit' }], look: "The smith's anvil, ringing. The forge beside it is lit and has not been allowed to cool since. Odd feeds it like a man making up for lost time." }],
    },
    {
      id: 'smoke', nouns: ['smoke'], x: 69, y: 120, reach: 400, look: 'Thin grey smoke, with long gaps in it. The fires below keep going out.',
      lookWhen: [{ if: [{ flag: 'hearth.lit' }], look: 'Good thick smoke from every roof, going straight up. You did that.' }],
    },
    { id: 'trees', nouns: ['tree'], x: 170, y: 100, reach: 400, look: 'Pines, heavy with snow. They were here before the village and expect to be here after.' },
    { id: 'path', nouns: ['path'], x: 160, y: 150, reach: 400, look: 'Paths of trampled slush: south to the ford, west to the pinewood, east to the farm, and one going north that nobody seems to use.' },
    ...scenery('Snow. There is a great deal of it and more is expected.', 'White peaks under a hard blue sky. Somewhere up there the wind is practising.'),
  ],
  npcs: [
    { char: 'sigga', x: 236, y: 154, wander: [214, 150, 270, 162] },
    // Kept indoors all winter, and out at last.
    { char: 'girl', x: 240, y: 165, dir: 'right', if: [{ flag: 'crown.unmade' }] },
    { char: 'boy', x: 266, y: 164, dir: 'left', if: [{ flag: 'crown.unmade' }] },
    { char: 'odd', x: 124, y: 154, wander: [116, 152, 140, 158] },
  ],
  rules: [
    firstVisit('village', 1),
    { on: ['take woodpile', 'take log', 'chop woodpile', 'chop log'], if: [{ not: { has: 'log' } }, { near: 'woodpile' }], do: [{ give: 'log' }, { sound: 'take' }, { say: 'You take a split log. The pile does not appear to miss it.' }, { score: 1, id: 'log' }] },
    { on: ['take woodpile', 'take log'], if: [{ has: 'log' }], do: [{ say: 'One log is plenty. You are a wanderer, not a wagon.' }] },
    { on: ['take woodpile', 'take log'], do: [{ say: 'You are not close enough.' }] },
    { on: ['knock door', 'open door'], do: [{ say: 'Nothing in Hollowmere is locked. Nobody has anything left worth stealing, and everybody would know by supper.' }] },
    { on: ['drink water', 'drink well', 'take water', 'use well', 'use bucket', 'pull rope'], if: [{ flag: 'crown.unmade' }], do: [{ say: 'You haul up a bucket and drink from your hands. It is so cold it makes your teeth ring, and it is the best thing you have ever tasted.' }, { heal: 3 }] },
    { on: ['drink water', 'drink well', 'take water', 'use well', 'use bucket', 'pull rope'], do: [{ say: 'The rope will not move and the bucket will not come up. Winter has the well and is not giving it back.' }] },
    { on: 'climb tree', do: [{ say: 'You get a boot on the lowest bough. It drops its entire load of snow down your neck, and you reconsider.' }] },
    { on: 'iska', do: [{ say: 'ISKA. Every head in the square turns. Somebody\'s washing, hung out in hope, goes stiff as a board. "We had enough of that already," says a voice, not quite under its breath.' }] },
    { on: 'veth', do: [{ say: 'VETH. Shutters bang, a dog starts up three roofs away, and the snow slides off the inn in one piece. You resolve to practise somewhere with fewer witnesses.' }] },
    { on: 'sol', do: [{ say: 'SOL. For the space of a breath it is noon in Hollowmere: hard shadows, bright roofs, a child laughing out loud at it. Then it is winter again. But people stand a little straighter for a while afterwards.' }] },
    { on: 'orun', do: [{ say: 'ORUN. The word shows you the village as it is, which is mostly as it looks. But tucked up under the gable-beam of the hall there is a bundle of rowan twigs bound with red thread, to keep ill luck off; and another over the inn door; and one, very small and very new, tied to the well-rope. Somebody here still believes. You find you are glad of it.' }] },
    { enter: true, if: [{ flag: 'crown.unmade' }], do: [{ show: 'snowman' }] },
    // A horse found on a sledge a long way out, for somebody the right size for it.
    {
      on: ['give horse boy', 'give boy horse', 'give horse', 'give horse girl', 'give girl horse'], if: [{ has: 'toyhorse' }, { near: 'boy', d: 60 }],
      do: [{ lose: 'toyhorse' }, { set: 'boy.horse' }, { sound: 'take' }, { say: 'The boy takes the horse in both hands and examines the chewed ear with professional interest. "Somebody loved this," he says. He puts it inside his tunic, where it will be warm, and goes back to the eyes with one hand.' }],
    },
    { on: ['listen', 'listen girl', 'listen boy', 'sing'], if: [{ flag: 'crown.unmade' }], do: [{ say: 'The girl is singing under her breath as she works, as children sing what they have always known. West went the King when the snow lay deep, to wake the summer out of her sleep. The boy comes in on the last line, late and loud. He will be home when the sun is higher.' }, { set: 'rhyme.heard' }] },
    { on: ['attack snowman', 'push snowman'], do: [{ say: 'You are Thane of Hollowmere. You find, slightly to your surprise, that this means you cannot.' }] },
    { on: ['use snowman', 'pet snowman', 'take snowman', 'take snow'], if: [{ flag: 'crown.unmade' }], do: [{ say: 'You roll a head for it. The girl inspects the head and pronounces it too small for the Elder, but about right for you. It goes on a second, shorter figure, which gets a stick for a sword.' }] },
    { on: ['read sign', 'read inn'], do: [{ say: 'There are no letters on it, only a picture gone grey with weather: a kettle, or possibly a helmet. Whoever painted it was better at warm than at drawing. The Kettle and Helm, people call it, to be on the safe side.' }] },
    { on: ['wish', 'wish well'], if: [{ near: 'well' }], do: [{ say: 'You lean over the well and wish. Your wish goes a long way down and does not come back. Promising.' }] },
    { on: ['climb well', 'enter well', 'jump well'], do: [{ die: 'You climb into the well to see how deep it is. It is deeper than you are tall, colder than you are brave, and nobody is coming with a rope.' }] },
    { on: ['buy sword', 'buy'], if: [{ near: 'odd' }, { has: 'sword' }], do: [{ say: '"You have a sword. Use that one until it breaks," says Odd. "Then come back."' }] },
    { on: ['buy sword', 'buy'], if: [{ near: 'odd' }, { gold: 25 }], do: [{ gold: -25 }, { give: 'sword' }, { sound: 'take' }, { score: 3, id: 'sword' }, { say: 'Odd takes your silver, counts it twice, and hands over an iron sword. "It is not pretty. It is not meant to be."' }] },
    { on: ['buy sword', 'buy'], if: [{ near: 'odd' }], do: [{ say: '"The sword is twenty-five silver," says Odd, "and you do not have twenty-five silver."' }] },
    { on: ['buy shield'], if: [{ near: 'odd' }, { gold: 15 }, { not: { has: 'shield' } }], do: [{ gold: -15 }, { give: 'shield' }, { sound: 'take' }, { say: 'Fifteen silver buys you a round shield of limewood and hide. "Keep it between you and whatever wants you dead," says Odd. It is the longest speech you have had from him.' }] },
    { on: ['buy shield'], if: [{ near: 'odd' }], do: [{ say: '"Fifteen silver for the shield. One to a customer."' }] },
    { on: ['buy longsword'], if: [{ near: 'odd' }, { has: 'longsword' }], do: [{ say: '"You are holding the only one I have made," says Odd.' }] },
    { on: ['buy longsword'], if: [{ near: 'odd' }, { gold: 60 }], do: [{ gold: -60 }, { give: 'longsword' }, { sound: 'take' }, { say: 'Sixty silver. Odd unwraps the longsword from an oiled cloth and holds it out hilt first. For once he looks you in the eye. "Do not chop wood with it."' }] },
    { on: ['buy longsword'], if: [{ near: 'odd' }], do: [{ say: '"Sixty silver for the steel," says Odd. "It took me a month. I will not take fifty-nine."' }] },
    { on: ['buy mail'], if: [{ near: 'odd' }, { has: 'mail' }], do: [{ say: '"One shirt is enough for one fool," says Odd.' }] },
    { on: ['buy mail'], if: [{ near: 'odd' }, { gold: 45 }], do: [{ gold: -45 }, { give: 'mail' }, { sound: 'take' }, { say: 'Forty-five silver buys a mail shirt that has plainly belonged to somebody else. "He did not die in it," says Odd. "He died out of it. Let that be a lesson."' }] },
    { on: ['buy mail'], if: [{ near: 'odd' }], do: [{ say: '"Forty-five silver for the mail."' }] },
    { on: ['temper mail', 'temper bearcloak'], if: [{ near: 'odd' }, { flag: 'hearth.lit' }], do: [{ run: 'temper', arg: 'armor' }] },
    { on: ['temper', 'temper *'], if: [{ near: 'odd' }, { flag: 'hearth.lit' }], do: [{ run: 'temper', arg: 'weapon' }] },
    { on: ['temper', 'temper *'], if: [{ near: 'odd' }], do: [{ say: '"With what fire?" Odd nods at the dead forge. "Light me that, and I will make your iron sing. Until then it is a cold lump and so am I."' }] },
    {
      on: ['give pelt sigga', 'give sigga pelt', 'give pelt'], if: [{ near: 'sigga' }, { has: 'pelt' }, { not: { flag: 'sigga.mittens' } }],
      do: [{ lose: 'pelt' }, { set: 'sigga.mittens' }, { run: 'mittens' }, { sound: 'take' }, { say: 'Sigga takes the pelt, turns it over, and looks at your hands, which are the colour of raw beef. "Come back before dark," she says. You do. She has made you a pair of mittens, fur inward, with the thumbs set so that you can still grip a hilt. "Do not thank me. I cannot stand to look at chilblains."' }, { note: 'Warm hands: you tire a little less quickly.' }],
    },
    { on: ['sell pelt', 'give pelt', 'give pelt odd'], if: [{ near: 'odd' }, { has: 'pelt' }], do: [{ lose: 'pelt' }, { gold: 3 }, { sound: 'take' }, { say: 'Odd turns the pelt over, grunts, and counts three silver into your palm. "Bellows leather," he says. "If I ever need bellows again."' }] },
    { on: ['sell pelt'], if: [{ near: 'odd' }], do: [{ say: '"Bring me a pelt and I will give you three silver for it," says Odd.' }] },
    { on: ['sell trinket', 'sell token', 'sell torc', 'sell hearthstone', 'sell brooch', 'sell harefoot', 'sell antlers'], if: [{ near: 'odd' }], do: [{ run: 'sellTrinket' }] },
    { on: ['sell bearskin', 'give bearskin'], if: [{ near: 'odd' }, { has: 'bearskin' }], do: [{ lose: 'bearskin' }, { gold: 8 }, { sound: 'take' }, { say: 'Odd runs a thumb through the white fur and almost whistles. "Eight silver. And I am not asking how."' }] },
    // What Odd made he will buy back, for less than he sold it; what he did not make, he will not.
    { on: ['sell sword', 'give sword odd'], if: [{ near: 'odd' }, { has: 'sword' }], do: [{ run: 'buyBack', arg: 'sword=10' }] },
    { on: ['sell longsword', 'sell sword', 'give longsword odd'], if: [{ near: 'odd' }, { has: 'longsword' }], do: [{ run: 'buyBack', arg: 'longsword=25' }] },
    { on: ['sell mail', 'give mail odd'], if: [{ near: 'odd' }, { has: 'mail' }], do: [{ run: 'buyBack', arg: 'mail=18' }] },
    { on: ['sell shield', 'give shield odd'], if: [{ near: 'odd' }, { has: 'shield' }], do: [{ run: 'buyBack', arg: 'shield=6' }] },
    { on: ['sell hatchet', 'give hatchet odd'], if: [{ near: 'odd' }, { has: 'hatchet' }], do: [{ say: '"If you mean the one from the woodpile, I never saw it, and I do not want it back," says Odd. "Leave it where you found it. Somebody has to split the kindling."' }] },
    { on: ['sell spear', 'sell bow', 'sell bearcloak', 'sell tome', 'sell flame', 'sell frost', 'sell mend', 'sell light', 'sell ward'], if: [{ near: 'odd' }], do: [{ say: '"I did not make it, and I do not buy what I did not make," says Odd. "Then I would have to know what it was worth."' }] },
  ],
};

// ---------------------------------------------------------------------------------------------

export const pinewood: RoomDef = {
  id: 'pinewood',
  mark: 'wood',
  music: 'wild',
  name: 'The Pinewood',
  look: 'Old pines crowd the path, boughs bent low with snow. It is very quiet here, in the way a held breath is quiet. The path forks: north uphill, south into shadow. Hollowmere lies east.',
  scene: {
    kind: 'outdoor', horizon: 62, walkTop: 96,
    layers: [
      { t: 'sky', horizon: 62 },
      { t: 'mountains', base: 66, height: 44, seed: 21, far: true },
      { t: 'treeline', y: 70, seed: 31, shade: 0.34, hmin: 8, hvar: 10, spacing: 6 },
      { t: 'snow', from: 68 },
      { t: 'treeline', y: 80, seed: 32, shade: 0.2, hmin: 12, hvar: 14, spacing: 8 },
      { t: 'path', w: 11, pts: [[326, 132], [250, 134], [190, 130]] },
      { t: 'path', w: 10, pts: [[190, 130], [170, 110], [160, 94]] },
      { t: 'path', w: 11, pts: [[190, 130], [150, 150], [140, 172]] },
      { t: 'tufts', count: 30, seed: 41 },
    ],
    props: [
      { t: 'pine', x: 22, y: 100, h: 78, seed: 41 },
      { t: 'pine', x: 62, y: 98, h: 60, seed: 42 },
      { t: 'pine', x: 104, y: 104, h: 88, seed: 43 },
      { t: 'pine', x: 206, y: 100, h: 70, seed: 45 },
      { t: 'pine', x: 248, y: 98, h: 58, seed: 46 },
      { t: 'pine', x: 290, y: 104, h: 86, seed: 47 },
      { t: 'pine', x: 60, y: 158, h: 96, seed: 49 },
      { t: 'pine', x: 236, y: 166, h: 104, seed: 50 },
      { t: 'boulder', x: 106, y: 150, r: 10, seed: 51 },
      { t: 'boulder', x: 300, y: 158, r: 8, seed: 52 },
      { t: 'pine', x: 8, y: 184, h: 108, seed: 53 },
      { t: 'pine', x: 312, y: 186, h: 96, seed: 54 },
    ],
  },
  npcs: [{ char: 'toke', x: 276, y: 142, wander: [262, 138, 300, 150] }],
  spawns: [
    { id: 'wolf1', kind: 'wolf', x: 40, y: 140, respawn: 2400 },
    { id: 'wolf2', kind: 'wolf', x: 90, y: 116, respawn: 2400 },
  ],
  things: [
    { id: 'trees', nouns: ['tree'], x: 160, y: 110, reach: 400, look: 'Pines as far as you can see, which is not far. Something has scraped the bark off one, high up. Higher than you would like.' },
    { id: 'tracks', nouns: ['tracks'], x: 180, y: 132, reach: 60, look: 'Paw prints cross the path, each as broad as your hand. They are fresh, and there are a lot of them.' },
    { id: 'path', nouns: ['path'], x: 190, y: 130, reach: 400, look: 'East to the village. North, the path climbs toward a bare ridge. South, it drops into thicker trees, and somebody has been dragging things along it.' },
    { id: 'boulder', nouns: ['boulder'], x: 106, y: 150, reach: 50, look: 'A boulder the frost has split almost in two.' },
    ...scenery('Deep, clean, and marked with tracks that are not yours.', 'What little sky the trees allow is the colour of cold iron.'),
  ],
  rules: [
    firstVisit('pinewood'),
    {
      on: ['give potion toke', 'give toke potion', 'give potion', 'use potion toke'], if: [{ near: 'toke' }, { has: 'potion' }, { not: { flag: 'toke.mended' } }],
      do: [{ lose: 'potion' }, { set: 'toke.mended' }, { run: 'practise', arg: 'archery=90' }, { sound: 'take' }, { say: 'Toke looks at the flask, and at you, and then pulls the stopper with his teeth and drinks it off. He unwinds the bandage. The bite has closed to a pink seam. He flexes the hand, slowly, as if it belonged to somebody else. "Well," he says. "Stand there. No: there. Feet apart. You have been drawing with your arm. Draw with your back." It is the longest speech you have had from him, and it lasts most of an hour.' }, { note: 'You shoot a good deal better than you did.' }],
    },
    { on: 'climb tree', do: [{ say: 'The lowest boughs are well out of reach, and the bark is glazed with ice.' }] },
    { on: 'listen', do: [{ say: 'Wind in the needles. Under it, far off, something that might be a howl and might be your nerves.' }] },
    { on: 'orun', if: [{ not: { flag: 'orun.pinewood' } }], do: [{ set: 'orun.pinewood' }, { give: 'venison' }, { sound: 'take' }, { say: 'ORUN. High in the fork of a pine, where you have walked past it a dozen times, a bundle hangs wrapped in bark: a hunter\'s cache, out of the reach of wolves. Smoked venison. Toke\'s, very likely. You take one piece and leave the rest, which is nearly honest.' }] },
    { on: 'orun', do: [{ say: 'ORUN. The wood has no more secrets, or none it is willing to part with.' }] },
  ],
};

// ---------------------------------------------------------------------------------------------

export const farm: RoomDef = {
  id: 'farm',
  mark: 'farm',
  music: 'valley',
  name: "Gorm's Farm",
  look: 'A low farmhouse, two haystacks and a pen of sheep that have seen better winters. The fields beyond are under a yard of snow. The village lies west; a track runs north to a frozen tarn and south toward a ruin.',
  lookWhen: [{ if: [{ flag: 'crown.unmade' }], look: 'A low farmhouse, two haystacks and a pen of sheep with their heads up. The snow on the fields has gone grey and soft, and at the furrows the brown is showing through. The village lies west; a track runs north to the tarn and south toward a ruin.' }],
  scene: {
    kind: 'outdoor', horizon: 68, walkTop: 90,
    layers: [
      ...backdrop(68, 51),
      { t: 'path', w: 11, pts: [[-6, 138], [70, 140], [150, 132], [228, 116]] },
      { t: 'path', w: 9, pts: [[150, 132], [176, 110], [180, 90]] },
      { t: 'path', w: 10, pts: [[150, 132], [170, 152], [176, 172]] },
      { t: 'tufts', count: 36, seed: 52 },
    ],
    props: [
      { t: 'pine', x: 300, y: 98, h: 66, seed: 61 },
      { t: 'pine', x: 20, y: 96, h: 54, seed: 62 },
      { t: 'hall', x: 196, y: 112, w: 78, v: 'cold' },
      { t: 'barrel', x: 284, y: 114 },
      { t: 'haystack', x: 110, y: 110, r: 15 },
      { t: 'haystack', x: 138, y: 116, r: 11 },
      { t: 'fence', x: 30, y: 122, x1: 96, y1: 120 },
      { t: 'fence', x: 28, y: 160, x1: 104, y1: 160 },
      { t: 'fence', x: 96, y: 122, x1: 106, y1: 158 },
      { t: 'sheep', x: 52, y: 142, seed: 1 },
      { t: 'sheep', x: 76, y: 134, seed: 2 },
      { t: 'sheep', x: 70, y: 152, seed: 4 },
      { t: 'boulder', x: 250, y: 156, r: 8, seed: 63 },
      { t: 'pine', x: 310, y: 184, h: 92, seed: 64 },
    ],
    when: [
      { if: [{ flag: 'hearth.lit' }], props: [{ t: 'hall', x: 196, y: 112, w: 78, v: 'smoke' }] },
      // A fourth ewe, if somebody has brought her home out of the wild.
      { if: [{ flag: 'farm.stray' }], props: [{ t: 'sheep', x: 96, y: 146, seed: 7 }] },
      // The thaw: the south field going soft, as Gorm says.
      {
        if: [{ flag: 'crown.unmade' }],
        props: [
          { t: 'hall', x: 196, y: 112, w: 78, v: 'thaw' },
          { t: 'melt', x: 236, y: 120, w: 96, h: 12, seed: 21 },
          { t: 'melt', x: 110, y: 160, w: 150, h: 14, seed: 24 },
          { t: 'melt', x: 250, y: 150, w: 110, h: 18, seed: 27 },
          { t: 'melt', x: 60, y: 122, w: 80, h: 10, seed: 30 },
        ],
      },
    ],
  },
  npcs: [{ char: 'gorm', x: 168, y: 142, wander: [140, 136, 200, 150] }],
  things: [
    {
      id: 'sheep', nouns: ['sheep'], x: 100, y: 142, reach: 60, look: 'Three ewes, huddled together and chewing at nothing. They regard you without hope.',
      lookWhen: [{ if: [{ flag: 'farm.stray' }], look: 'Four ewes. Three of them are huddled together. The fourth stands a little apart, as one who has seen the world.' }],
    },
    { id: 'fence', nouns: ['fence'], x: 100, y: 142, reach: 60, look: 'A sheep pen, mended many times with whatever was to hand.' },
    { id: 'hay', nouns: ['haystack'], x: 124, y: 118, reach: 40, look: 'Two haystacks under caps of snow. The smaller one has been pulled at; winter is eating into the stores.' },
    { id: 'house', nouns: ['hall', 'door', 'roof'], x: 236, y: 116, reach: 60, look: "Gorm's farmhouse. The door is shut and the chimney is cold. He is out here with the sheep, where at least there is company.", lookWhen: [{ if: [{ flag: 'hearth.lit' }], look: "Gorm's farmhouse, with smoke at the roof again. He still spends his days out here with the sheep. A man gets used to company." }] },
    { id: 'barrel', nouns: ['barrel'], x: 284, y: 116, reach: 34, look: 'An empty seed barrel. Very empty. Scraped.' },
    { id: 'trees', nouns: ['tree'], x: 300, y: 100, reach: 400, look: 'A few pines at the edge of the fields, keeping their distance.' },
    ...scenery('Somewhere under this are fields. You will have to take that on trust.', 'The sky is wide out here, and none of it is warm.'),
  ],
  rules: [
    firstVisit('farm'),
    { on: ['pet sheep', 'kiss sheep', 'take sheep'], do: [{ say: 'The nearest ewe leans on you with her whole weight, sighs, and goes back to staring at the snow.' }] },
    { on: ['attack sheep'], do: [{ say: 'Gorm has little enough left. You leave his sheep alone.' }] },
    { on: ['give sheep', 'give sheep gorm', 'give gorm sheep', 'use sheep gorm'], if: [{ has: 'ewe' }, { near: 'gorm' }], do: [{ cmd: 'talk to gorm' }] },
    // Handing the sack over is the same as coming up and saying so.
    { on: ['give grain', 'give grain gorm', 'give gorm grain', 'use grain', 'use grain gorm', 'drop grain'], if: [{ has: 'grain' }, { near: 'gorm' }], do: [{ cmd: 'talk to gorm' }] },
    { on: ['give grain', 'give grain gorm', 'give gorm grain', 'use grain', 'use grain gorm'], if: [{ has: 'grain' }], do: [{ say: 'You are not close enough.' }] },
    { on: 'orun', do: [{ say: 'ORUN. For a moment you can see through the snow as if it were glass: the furrows of the east field, a lost ploughshare, and, three paces from the corner of the house, a crock with a lid on it. Gorm\'s savings, such as they are. You look somewhere else, quite hard, until the word wears off.' }] },
    {
      on: ['give herb sheep', 'give sheep herb', 'use herb sheep', 'give herb'], if: [{ near: 'sheep', d: 70 }, { has: 'herb' }, { not: { flag: 'farm.ewe' } }],
      do: [{ lose: 'herb' }, { set: 'farm.ewe' }, { gold: 6 }, { sound: 'take' }, { say: 'You hold the frostcaps out through the rails. The nearest ewe considers them, and you, with the weariness of a creature that has been disappointed before; and then eats them with the first real enthusiasm you have seen in Hollowmere. She gets up to look for more. Where she was lying, pressed into the straw, is a little purse of six silver that must have fallen from a robber\'s belt. She does not appear to want it.' }],
    },
    { on: ['open door', 'knock door', 'enter hall', 'enter door'], do: [{ say: 'Nobody home. Gorm is out here, and he looks like a man who would rather not go back in and count what is missing.' }] },
    { on: ['look haystack', 'take haystack'], if: [{ near: 'hay' }, { not: { flag: 'farm.hay' } }], do: [{ set: 'farm.hay' }, { gold: 2 }, { sound: 'take' }, { say: 'You push an arm into the hay, on the theory that people hide things in haystacks. Two silver, tied in a rag. Somebody\'s rainy day. You look round for Gorm, and then you do not look round for Gorm.' }] },
    { on: ['sleep haystack', 'enter haystack', 'climb haystack', 'jump haystack'], do: [{ say: 'You burrow in for a moment. It is warm, it is scratchy, and a ewe is watching you with open contempt.' }] },
  ],
};

// ---------------------------------------------------------------------------------------------

export const tower: RoomDef = {
  id: 'tower',
  mark: 'tower',
  name: 'The Old Watchtower',
  look: 'A round tower, broken off like a tooth, stands over the south road. Before it leans a standing stone cut with a single rune. Someone has been camping in the lee of the wall.',
  scene: {
    kind: 'outdoor', horizon: 64, walkTop: 90,
    layers: [...backdrop(64, 81), { t: 'path', w: 10, pts: [[-6, 140], [80, 144], [170, 136], [216, 124]] }, { t: 'path', w: 9, pts: [[170, 136], [160, 110], [164, 90]] }, { t: 'tufts', count: 28, seed: 82 }],
    props: [
      { t: 'tower', x: 222, y: 120, w: 52, h: 114, seed: 5 },
      { t: 'boulder', x: 262, y: 128, r: 9, seed: 83 },
      { t: 'boulder', x: 276, y: 136, r: 6, seed: 84 },
      { t: 'boulder', x: 184, y: 126, r: 6, seed: 85 },
      { t: 'pine', x: 30, y: 98, h: 64, seed: 86 },
      { t: 'pine', x: 300, y: 96, h: 56, seed: 87 },
      { t: 'pine', x: 20, y: 184, h: 90, seed: 88 },
      { t: 'pine', x: 304, y: 186, h: 96, seed: 89 },
    ],
    when: [
      { if: [{ not: { knows: 'word:iska' } }], props: [{ t: 'stone', x: 100, y: 132, h: 48, v: 'b', seed: 3 }] },
      { if: [{ knows: 'word:iska' }], props: [{ t: 'stone', x: 100, y: 132, h: 48, v: 'b', seed: 3, lit: 1 }] },
    ],
  },
  spawns: [{ id: 'lookout', kind: 'archer', x: 270, y: 150 }],
  things: [
    { id: 'tower', nouns: ['tower', 'door'], x: 222, y: 124, reach: 50, look: 'It watched this road once. Now the top third lies around its feet and snow has drifted into the doorway.' },
    { id: 'stone', nouns: ['menhir', 'rune'], x: 100, y: 134, reach: 34, try: ['read rune'], look: 'A standing stone, taller than you, leaning as if listening. One rune is cut deep into its face. Frost has gathered in the cut and nowhere else.' },
    { id: 'cache', nouns: ['chest'], x: 150, y: 156, reach: 26, try: ['open chest'], icon: 'chest', hidden: true, look: 'A small iron-bound chest that was not there a moment ago. Or was, and you could not see it.' },
    { id: 'rubble', nouns: ['boulder'], x: 262, y: 130, reach: 50, look: 'Fallen blocks, each cut square by somebody who expected them to stay up.' },
    { id: 'trees', nouns: ['tree'], x: 30, y: 100, reach: 400, look: 'The pines keep back from the tower. Trees remember things.' },
    ...scenery('Trampled around the tower. Somebody has been living here.', 'The sky to the south is the colour of the road you came by.'),
  ],
  rules: [
    firstVisit('tower'),
    { on: ['read menhir', 'read rune', 'pet menhir', 'pet rune', 'look rune'], if: [{ near: 'stone' }, { not: { knows: 'word:iska' } }], do: [{ teach: 'word:iska' }, { run: 'study', arg: 30 }, { sound: 'word' }, { score: 8, id: 'word.iska' }, { say: 'You trace the rune with a bare finger. The cold goes up your arm and into your teeth, and a word arrives whole: ISKA. Stillness. Winter\'s own name.' }, { note: 'Tip: type ISKA to speak the word.' }] },
    { on: ['read menhir', 'read rune', 'pet menhir', 'pet rune'], if: [{ near: 'stone' }], do: [{ say: 'The rune glows faintly now. It has given you what it had.' }] },
    { on: ['read menhir', 'read rune', 'pet menhir', 'pet rune'], do: [{ say: 'You are not close enough.' }] },
    { on: ['enter tower', 'enter door', 'climb tower', 'open door'], do: [{ say: 'The stair fell in a hundred years ago. There is nothing inside but snow, bird bones and a great deal of sky.' }] },
    { on: 'orun', if: [{ not: { flag: 'tower.cache' } }], do: [{ set: 'tower.cache' }, { show: 'cache' }, { score: 6, id: 'cache' }, { say: 'ORUN. The word goes out of you like breath on glass, and the world shows its seams. By the path, half in the snow, a chest stands where nothing stood.' }] },
    { on: ['open chest', 'take chest', 'look chest'], if: [{ flag: 'tower.cache' }, { not: { flag: 'tower.looted' } }, { near: 'cache' }], do: [{ set: 'tower.looted' }, { gold: 40 }, { give: 'potion', n: 2 }, { sound: 'take' }, { say: "Inside: forty silver, two red draughts, and a note. \"If you can read this you can see what is hidden, so you don't need my advice. Take the money.\"" }] },
    { on: ['open chest', 'take chest'], if: [{ flag: 'tower.looted' }], do: [{ say: 'Empty now, apart from the note.' }] },
  ],
};

// ---------------------------------------------------------------------------------------------

export const camp: RoomDef = {
  id: 'camp',
  mark: 'camp',
  name: 'The Bandit Camp',
  look: 'Two hide tents and a fire in a hollow among the pines. Sacks and barrels are piled by a chest, most of them stamped with other people\'s marks. The path climbs north to the pinewood and runs east to the ford.',
  scene: {
    kind: 'outdoor', horizon: 60, walkTop: 92,
    layers: [
      { t: 'sky', horizon: 60 },
      { t: 'mountains', base: 64, height: 40, seed: 91, far: true },
      { t: 'treeline', y: 68, seed: 92, shade: 0.34, hmin: 8, hvar: 10, spacing: 6 },
      { t: 'snow', from: 66 },
      { t: 'treeline', y: 78, seed: 93, shade: 0.2, hmin: 12, hvar: 14, spacing: 8 },
      { t: 'path', w: 10, pts: [[326, 140], [240, 142], [170, 134]] },
      { t: 'path', w: 10, pts: [[170, 134], [150, 110], [144, 90]] },
      { t: 'tufts', count: 24, seed: 94 },
    ],
    props: [
      { t: 'pine', x: 20, y: 100, h: 76, seed: 95 },
      { t: 'pine', x: 196, y: 98, h: 62, seed: 96 },
      { t: 'pine', x: 240, y: 102, h: 80, seed: 97 },
      { t: 'pine', x: 296, y: 100, h: 68, seed: 98 },
      { t: 'tent', x: 70, y: 124, w: 50 },
      { t: 'tent', x: 126, y: 116, w: 40 },
      { t: 'campfire', x: 104, y: 144 },
      { t: 'barrel', x: 40, y: 146 },
      { t: 'barrel', x: 30, y: 152 },
      { t: 'fence', x: 180, y: 160, x1: 250, y1: 162 },
      { t: 'pine', x: 8, y: 186, h: 100, seed: 99 },
      { t: 'pine', x: 310, y: 186, h: 94, seed: 100 },
    ],
  },
  spawns: [
    { id: 'bandit1', kind: 'bandit', x: 90, y: 150 },
    { id: 'bandit2', kind: 'bandit', x: 130, y: 132 },
    { id: 'bandit3', kind: 'archer', x: 56, y: 140 },
  ],
  things: [
    { id: 'chest', nouns: ['chest'], x: 56, y: 158, reach: 30, try: ['open chest'], icon: 'chest', look: 'An iron-bound chest, lid down. Whatever the bandits thought worth locking up is in there.' },
    { id: 'tents', nouns: ['tent'], x: 80, y: 126, reach: 60, look: 'Hide tents, stinking of smoke and wet dog. Nobody has aired them since autumn.' },
    { id: 'fire', nouns: ['hearth'], x: 104, y: 146, reach: 40, look: 'A fire that actually burns. Out here, away from the village, flames behave. That is worth remembering.' },
    { id: 'barrels', nouns: ['barrel', 'grain'], x: 36, y: 152, reach: 40, look: 'Barrels and sacks with a farm mark burned into them: a G inside a circle.' },
    { id: 'trees', nouns: ['tree'], x: 240, y: 104, reach: 400, look: 'Thick pines all around. A good place not to be found.' },
    ...scenery('Churned to mud around the fire.', 'A thread of smoke climbs out of the hollow and gives the whole camp away.'),
  ],
  rules: [
    firstVisit('camp'),
    { on: ['open chest', 'take chest', 'take grain', 'look chest'], if: [{ flag: 'camp.looted' }], do: [{ say: 'The chest is empty. You were thorough.' }] },
    { on: ['open chest', 'take chest', 'take grain'], if: [{ quiet: true }, { near: 'chest' }], do: [{ set: 'camp.looted' }, { give: 'grain' }, { gold: 20 }, { give: 'potion' }, { sound: 'take' }, { score: 6, id: 'camp.chest' }, { say: 'You kick the lid up. A sack of seed grain with a G burned into it, twenty silver, and a red draught somebody was saving. All yours now, or at least nobody is left to argue.' }] },
    { on: ['open chest', 'take chest', 'take grain'], if: [{ quiet: true }], do: [{ say: 'You are not close enough.' }] },
    { on: ['open chest', 'take chest', 'take grain'], do: [{ say: 'Its owners are still very much here, and they have noticed you looking.' }] },
    { on: 'orun', if: [{ quiet: true }, { not: { flag: 'orun.camp' } }], do: [{ set: 'orun.camp' }, { gold: 12 }, { sound: 'take' }, { say: 'ORUN. Under the flap of the nearer tent the ground has been dug and stamped flat again. One of the robbers was robbing the other two: twelve silver in a sock, buried a hand deep. You take it, sock and all.' }] },
    { on: 'orun', if: [{ quiet: false }], do: [{ say: 'ORUN. What is hidden here would show itself, if the people who hid it were not busy trying to kill you.' }] },
    { on: ['enter tent', 'sleep tent', 'look tent'], do: [{ say: 'You put your head in. A bedroll, a gnawed bone, and a smell you will be some time forgetting.' }] },
  ],
};

// ---------------------------------------------------------------------------------------------

export const ridge: RoomDef = {
  id: 'ridge',
  mark: 'stone',
  name: 'The West Ridge',
  look: 'A bare ridge above the trees, scoured by wind. A standing stone crowns it, leaning into the weather, with one rune cut into its face. The pinewood lies below to the south; to the east the ridge runs toward a great mound.',
  scene: {
    kind: 'outdoor', horizon: 78, walkTop: 98,
    layers: [
      { t: 'sky', horizon: 78 },
      { t: 'mountains', base: 82, height: 76, seed: 101, far: true },
      { t: 'mountains', base: 86, height: 50, seed: 102 },
      { t: 'snow', from: 84 },
      { t: 'path', w: 9, pts: [[150, 172], [156, 150], [152, 132]] },
      { t: 'path', w: 9, pts: [[156, 150], [240, 140], [326, 136]] },
      { t: 'tufts', count: 14, seed: 103 },
    ],
    props: [
      { t: 'boulder', x: 60, y: 120, r: 12, seed: 104 },
      { t: 'boulder', x: 84, y: 128, r: 7, seed: 105 },
      { t: 'boulder', x: 250, y: 112, r: 10, seed: 106 },
      { t: 'boulder', x: 290, y: 158, r: 9, seed: 107 },
      { t: 'pine', x: 20, y: 184, h: 70, seed: 108 },
      { t: 'pine', x: 300, y: 104, h: 40, seed: 109 },
    ],
    when: [
      { if: [{ not: { knows: 'word:veth' } }], props: [{ t: 'stone', x: 152, y: 126, h: 58, v: 'a', seed: 2 }] },
      { if: [{ knows: 'word:veth' }], props: [{ t: 'stone', x: 152, y: 126, h: 58, v: 'a', seed: 2, lit: 1 }] },
    ],
  },
  spawns: [{ id: 'wolf3', kind: 'wolf', x: 260, y: 150, respawn: 2400 }],
  things: [
    { id: 'stone', nouns: ['menhir', 'rune'], x: 152, y: 128, reach: 36, try: ['read rune'], look: 'Twice your height and older than the village by more years than the village has had winters. One rune is cut into the face. The wind seems to go around it.' },
    { id: 'rocks', nouns: ['boulder'], x: 60, y: 122, reach: 60, look: 'Scoured grey rock, swept bare on the windward side.' },
    { id: 'trees', nouns: ['tree'], x: 160, y: 160, reach: 400, look: 'The pinewood is below you now, a dark sea with snow on it.' },
    ...scenery('The wind has packed it hard as a floor.', 'From up here you can see the whole valley: the village, the river, the dark mound to the east. It looks small enough to save.'),
  ],
  rules: [
    firstVisit('ridge'),
    { on: ['read menhir', 'read rune', 'pet menhir', 'pet rune', 'look rune'], if: [{ near: 'stone' }, { not: { knows: 'word:veth' } }], do: [{ teach: 'word:veth' }, { run: 'study', arg: 30 }, { sound: 'word' }, { score: 10, id: 'word.veth' }, { say: 'You lay your palm on the rune. The stone hums, the wind drops, and a word is standing in your mind as if it had always been there: VETH. Open. Away. Make room.' }, { note: 'Tip: type VETH to speak the word.' }, { quest: 'hearth', stage: 2 }] },
    { on: ['read menhir', 'read rune', 'pet menhir', 'pet rune'], if: [{ near: 'stone' }], do: [{ say: 'The rune glows faintly now. It has given you what it had.' }] },
    { on: ['read menhir', 'read rune', 'pet menhir', 'pet rune'], do: [{ say: 'You are not close enough.' }] },
    { on: 'orun', if: [{ not: { flag: 'orun.ridge' } }], do: [{ set: 'orun.ridge' }, { gold: 5 }, { run: 'study', arg: 20 }, { sound: 'take' }, { say: 'ORUN. At the foot of the standing stone the packed snow turns clear, and under it lie the things people have left here over four thousand years: beads, a bone comb, coins worn smooth as river pebbles. You take five of the coins. You leave the comb.' }] },
    { on: 'orun', do: [{ say: 'ORUN. The stone has been seen through already, and seems to resent it.' }] },
    { on: ['push menhir', 'climb menhir', 'pull menhir'], do: [{ say: 'It has stood through four thousand winters. It is not going to start taking suggestions now.' }] },
    { on: ['jump', 'jump mountain'], do: [{ die: 'You take a running jump off the windward side to see how far down it goes. The answer is: far enough. The crows are grateful.' }] },
  ],
};

// ---------------------------------------------------------------------------------------------

export const barrow: RoomDef = {
  id: 'barrow',
  mark: 'barrow',
  music: 'barrow',
  name: 'The Barrow',
  look: 'A great mound fills the north, too regular to be a hill. A doorway of three stones is set into it, with a single slab for a door. Nothing grows here, and the snow near the stone has a faint green shine. The village lies south.',
  lookWhen: [
    { if: [{ flag: 'dead.rested' }], look: 'A great mound fills the north. Both its doors stand open, the great one and the small, and from the crown of the mound a thread of smoke goes straight up into the sky. Somebody is keeping a fire in, down there. The village lies south.' },
    { if: [{ flag: 'barrow.second' }], look: 'A great mound fills the north, too regular to be a hill. Its doorway of three stones stands open and dark, and so, now, does a second: narrow, low in the flank of the mound, with a stair going down. The village lies south.' },
    { if: [{ flag: 'king.dead' }], look: 'A great mound fills the north, too regular to be a hill. Its doorway of three stones stands open and dark. The green shine has gone out of the snow, and it is only snow. The village lies south.' },
    { if: [{ flag: 'barrow.open' }], look: 'A great mound fills the north, too regular to be a hill. Its doorway of three stones stands open and dark. Nothing grows here, and the snow near the stone has a faint green shine. The village lies south.' },
  ],
  scene: {
    kind: 'outdoor', horizon: 66, walkTop: 118,
    layers: [...backdrop(66, 111, false), { t: 'path', w: 10, pts: [[166, 172], [160, 140], [160, 120]] }, { t: 'tufts', count: 8, seed: 112 }],
    props: [
      { t: 'mound', x: 160, y: 116, w: 250, h: 78 },
      { t: 'stone', x: 96, y: 136, h: 30, v: 'c', seed: 7 },
      { t: 'stone', x: 226, y: 138, h: 34, v: 'b', seed: 8 },
      { t: 'boulder', x: 40, y: 152, r: 8, seed: 113 },
      { t: 'boulder', x: 280, y: 156, r: 10, seed: 114 },
    ],
    when: [
      { if: [{ flag: 'barrow.open' }], props: [{ t: 'mound', x: 160, y: 116, w: 250, h: 78, v: 'open' }] },
      // The servants' door, once it has been seen and opened; and, when there is a fire under the hill, its smoke.
      { if: [{ flag: 'barrow.second' }], props: [{ t: 'arch', x: 118, y: 119, w: 18, h: 24 }] },
      { if: [{ flag: 'dead.rested' }], props: [{ t: 'hall', x: 150, y: 87, w: 20, v: 'smoke' }] },
    ],
  },
  doors: [
    { x0: 110, y0: 119, x1: 126, y1: 121, to: 'tally', x: 48, y: 118, dir: 'right', if: [{ flag: 'barrow.second' }] },
    {
      x0: 150, y0: 119, x1: 170, y1: 121, to: 'ante', x: 60, y: 126, dir: 'right',
      if: [{ flag: 'barrow.open' }],
      locked: 'The slab is one piece of stone the size of a cart. There is no handle, no hinge and no gap. A rune is cut into it, glowing faintly, as if waiting to be answered.',
    },
  ],
  things: [
    { id: 'door', nouns: ['door', 'rune'], x: 160, y: 120, reach: 34, try: ['read rune'], look: 'A single slab between two uprights, under a lintel as long as a boat. A rune glows on it, the same green as rot in a log.', lookWhen: [{ if: [{ flag: 'barrow.open' }], look: 'Two uprights under a lintel as long as a boat, and a dark way down between them. The slab that closed it has sunk into the earth, and its rune has gone out.' }] },
    { id: 'mound', nouns: ['barrow'], x: 160, y: 120, reach: 400, look: 'A barrow: a hill somebody built, to put somebody in. The somebody has started glowing.', lookWhen: [{ if: [{ flag: 'king.dead' }], look: 'A barrow: a hill somebody built, to put somebody in. The somebody has stopped glowing.' }] },
    { id: 'stones', nouns: ['menhir'], x: 96, y: 138, reach: 60, look: 'Two smaller stones flank the path like door-wardens. Their runes are worn past reading.' },
    {
      id: 'sidedoor', nouns: ['arch'], x: 118, y: 122, reach: 40, hidden: true, look: 'Left of the great doorway, low in the flank of the mound: a narrow door, walled up with fitted stone and turfed over. The stones are not mortared.',
      lookWhen: [{ if: [{ flag: 'barrow.second' }], look: "A narrow doorway in the flank of the mound, with its walling fallen inward. A servants' stair goes down behind it, worn hollow in the middle." }],
    },
    ...scenery('The snow near the door has a faint green shine and squeaks underfoot.', 'Even the sky seems to keep its distance from this place.').map((t) =>
      t.id === 'snow' ? { ...t, lookWhen: [{ if: [{ flag: 'king.dead' }], look: 'Trodden snow, and no more than that. The green shine has gone out of it.' }] } : t,
    ),
  ],
  rules: [
    firstVisit('barrow'),
    // The third saga: the small door, which must be seen before it can be told to open.
    {
      on: 'veth', if: [{ flag: 'barrow.seen' }, { not: { flag: 'barrow.second' } }],
      do: [{ set: 'barrow.second' }, { sound: 'door' }, { score: 5, id: 'barrow.second' }, { quest: 'rest', stage: 3 }, { say: "VETH. The fitted stones jump in their courses, hold for one breath, and go inward all together, like a held door giving way. Dust that settled four thousand years ago rolls out over the snow. Behind it, steps go down. Not the King's broad stair: a servants' stair, worn hollow in the middle by people carrying things." }],
    },
    { on: 'veth', if: [{ quest: 'rest', min: 2 }, { not: { flag: 'barrow.second' } }], do: [{ say: 'The word goes into the mound and finds nothing to push. If there is another door, you will have to see it before it can hear you.' }] },
    {
      on: 'orun', if: [{ quest: 'rest', min: 2 }, { not: { flag: 'barrow.seen' } }],
      do: [{ set: 'barrow.seen' }, { show: 'sidedoor' }, { say: 'ORUN. The mound shows its bones, and this time you know what you are looking at. Left of the great doorway, low down: a second door, narrow, walled up with fitted stone and turfed over afterward. Whoever built this place built a way out for somebody, and then thought better of it. The stones are not mortared. Now that you can see them, they look like something a word could move.' }],
    },
    { on: 'veth', if: [{ flag: 'barrow.open' }], do: [{ say: 'The word rolls into the open barrow and comes back changed. You decide not to do that again.' }] },
    { on: 'veth', if: [{ near: 'door', d: 60 }], do: [{ set: 'barrow.open' }, { sound: 'door' }, { score: 10, id: 'barrow.open' }, { say: 'VETH. The rune on the slab flares and goes out. With a groan you feel in your knees, the great stone slides down into the earth. Cold air rolls out of the dark, and it smells of old iron.' }, { quest: 'hearth', stage: 3 }] },
    { on: 'veth', do: [{ say: 'The word goes out across the snow and is lost. You would need to be nearer the door for it to hear you.' }] },
    { on: ['open door', 'push door', 'pull door', 'knock door', 'enter barrow', 'enter door'], if: [{ not: { flag: 'barrow.open' } }], do: [{ say: 'You put your shoulder to the slab. It does not move. You have the strong impression it has not noticed you.' }] },
    { on: ['open door'], do: [{ say: 'It stands open. The slab has gone down into the earth, and it does not look as if it means to come back up.' }] },
    { on: 'orun', do: [{ say: 'ORUN. The mound shows its bones. Beside the great doorway there was once a second, smaller one, walled up with fitted stone before the turf was ever laid over it. Whoever built this place for their king built a way out as well, and then thought better of it.' }] },
    { on: ['read rune', 'pet rune', 'read door'], if: [{ flag: 'barrow.open' }], do: [{ say: 'The rune went out when the door answered. There is nothing left to read.' }] },
    { on: ['read rune', 'pet rune', 'read door'], do: [{ say: 'The rune is the mirror of something. It asks; it does not tell. Somewhere there is a stone that carries the answer.' }] },
  ],
};

// ---------------------------------------------------------------------------------------------

export const tarn: RoomDef = {
  id: 'tarn',
  mark: 'mere',
  music: 'valley',
  name: 'The Frozen Tarn',
  look: "A mountain lake, frozen grey-green from shore to shore. A hermit's hut stands on the far bank with smoke at its roof: real smoke, steady. Out in the middle of the ice something small glints. The barrow lies west, the farm south.",
  scene: {
    kind: 'outdoor', horizon: 66, walkTop: 90,
    layers: [...backdrop(66, 121), { t: 'ice', x: 124, y: 136, rx: 96, ry: 22 }, { t: 'path', w: 9, pts: [[260, 172], [262, 140], [256, 114]] }, { t: 'tufts', count: 16, seed: 122 }],
    props: [
      { t: 'hall', x: 222, y: 108, w: 76 },
      { t: 'woodpile', x: 190, y: 109 },
      { t: 'pine', x: 30, y: 100, h: 66, seed: 123 },
      { t: 'pine', x: 70, y: 96, h: 50, seed: 124 },
      { t: 'pine', x: 150, y: 98, h: 58, seed: 125 },
      { t: 'boulder', x: 296, y: 150, r: 9, seed: 126 },
      { t: 'pine', x: 312, y: 186, h: 92, seed: 127 },
    ],
  },
  doors: [{ x0: 254, y0: 109, x1: 270, y1: 111, to: 'hut', x: 262, y: 112, dir: 'down' }],
  zones: [{ id: 'thin', x0: 84, y0: 128, x1: 164, y1: 144 }],
  things: [
    // The amulet's reach stays inside the thin ice: from the very edge of it, it is still a hand too far.
    { id: 'ice', nouns: ['tarn'], x: 124, y: 136, reach: 400, look: 'Grey-green ice, clouded at the edges and almost clear in the middle, where it is thinnest. You can see dark water moving under it.' },
    { id: 'amulet', nouns: ['amulet'], x: 124, y: 137, reach: 14, icon: 'amulet', take: 'amulet', takeSay: 'You kneel on the hardened ice and chip the amulet free with numb fingers. The stone in it is warm, which makes no sense at all.', look: 'Something on a chain, frozen into the surface out in the middle. It catches the light like an eye.' },
    { id: 'hut', nouns: ['hut', 'door', 'smoke'], x: 262, y: 114, reach: 400, look: "A hermit's hut, low and sound, with a tidy woodpile. The smoke from its roof is steady. Whoever lives here has a fire that stays lit." },
    { id: 'woodpile', nouns: ['woodpile'], x: 206, y: 112, reach: 34, look: 'Birch and pine, stacked to the eaves. Somebody here is not worried about winter.' },
    { id: 'trees', nouns: ['tree'], x: 70, y: 100, reach: 400, look: 'Pines along the far shore, reflected in nothing.' },
    ...scenery('Blown thin over the ice, so the lake shows through like a bruise.', 'Peaks all round, leaning over the tarn as if looking at their reflections.'),
  ],
  rules: [
    firstVisit('tarn'),
    { zone: 'thin', if: [{ not: { flag: 'tarn.frozen' } }], do: [{ die: 'The ice says one word, which is CRACK, and you are through it. The water is so cold it feels like being struck. The hole freezes over again by evening, tidy as a healed wound.' }] },
    { on: 'iska', if: [{ flag: 'tarn.frozen' }], do: [{ say: 'The tarn is already frozen as hard as it can freeze. It creaks at you reproachfully.' }] },
    { on: 'iska', do: [{ set: 'tarn.frozen' }, { score: 5, id: 'tarn.frozen' }, { say: 'ISKA. The word leaves your mouth as frost. Out on the tarn the ice groans, whitens, and thickens from shore to shore with a sound like a slow door closing. It would bear a horse now.' }] },
    { on: ['cast frost', 'cast tarn'], if: [{ knows: 'frost' }, { not: { flag: 'tarn.frozen' } }], do: [{ set: 'tarn.frozen' }, { score: 5, id: 'tarn.frozen' }, { say: 'You pour cold into cold. The ice groans, whitens, and thickens from shore to shore. It would bear a horse now.' }] },
    { on: ['take woodpile', 'take log'], do: [{ say: 'A voice from inside the hut says, "I counted those." You leave the pile alone.' }] },
    { on: 'orun', do: [{ say: 'ORUN. The ice clears like a window being wiped. Far down, where the water is black, there is a shape that might be a drift of weed, and might be a woman\'s shawl. Near the shore, pressed into the ice itself, is the print of a man\'s two knees, worn there by forty winters of kneeling in the same place. You let the word go.' }] },
    { on: ['freeze', 'freeze tarn'], if: [{ flag: 'tarn.frozen' }], do: [{ say: 'It is frozen as hard as it will go.' }] },
    { on: ['freeze', 'freeze tarn'], if: [{ knows: 'word:iska' }], do: [{ say: 'You know a word for that. Say it.' }] },
    { on: ['freeze', 'freeze tarn'], do: [{ say: 'With what? You would need a word for winter itself, or a spell of frost.' }] },
    { on: ['skate', 'skate tarn', 'attack tarn', 'fish', 'fish tarn', 'jump tarn'], if: [{ flag: 'tarn.frozen' }], do: [{ say: 'The ice is like stone now. It does not so much as creak.' }] },
    { on: ['skate', 'skate tarn', 'attack tarn', 'jump tarn'], do: [{ die: 'You take a run at it. The ice bears you for three glorious heartbeats, out to where it is clear as glass, and then it does not bear you at all.' }] },
    { on: ['fish', 'fish tarn'], do: [{ say: 'You would have to cut a hole first, and the only part thin enough to cut is the part that would not hold you.' }] },
    { on: ['swim', 'swim tarn', 'drink tarn', 'dig tarn'], do: [{ say: 'It is ice, all the way to the edges. Getting into the water would take real effort, or one careless step out in the middle.' }] },
  ],
};
