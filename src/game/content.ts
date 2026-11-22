// Assembles the game's data into one Content record. Nothing here is code the engine depends on:
// swap this file's contents and the same engine runs a different game.

import type { CharSpec, Cond, Content, Effect, EnemyDef, ItemDef, PerkDef, QuestDef, RoomDef, Rule, SpellDef, WordDef } from '../engine/types';
import { chars } from './data/cast';
import { hall, hut, inn } from './data/rooms/inside';
import { bellmere, dolmen, hangtree } from './data/rooms/far';
import { hanging, hollow, northgate, oldroad, windend } from './data/rooms/north';
import { barrow, camp, farm, ford, pinewood, ridge, tarn, tower, village } from './data/rooms/world';
import { frontier } from './data/frontier';
import { music } from './data/music';
import { fallbacks, intro, text } from './data/text';
import { vocab } from './data/vocab';

const hero: CharSpec = {
  skin: 'skin', hair: 'blond', hairStyle: 'short', tunic: 'red', legs: 'leather', boots: 'fur', collar: 'fur', cloak: 'green',
};

const tome = (id: string, spell: string, name: string, look: string, learned: string): ItemDef => ({
  id, weight: 2, name, nouns: ['tome', spell], kind: 'tome', look,
  use: [{ teach: spell }, { run: 'study', arg: 20 }, { score: spell === 'flame' ? 5 : 2, id: `spell.${spell}` }, { say: learned }, { note: `Tip: CAST ${spell.toUpperCase()} to use it.` }],
});

const items: Record<string, ItemDef> = {
  log: { id: 'log', weight: 0, keep: 'You chose it with some care, and you know whose hearth it is for.', name: 'dry log', nouns: ['log'], kind: 'misc', look: 'A split pine log, dry all through, and a fistful of kindling you split off it. It ought to burn well. Nothing does, here.' },
  flint: {
    id: 'flint', weight: 0, keep: 'It is Halla\'s, and it has been struck more in nine days than in the nine years before. You will be giving it back, not leaving it in the snow.', name: 'flint and steel', nouns: ['flint'], kind: 'misc',
    look: 'A flint and a curl of steel on a thong, worn bright where a thumb goes. Halla has struck it every quarter hour for nine days.',
    use: [{ cmd: 'light hearth' }],
  },
  coals: {
    id: 'coals', weight: 0, keep: 'Three coals from the last fire in Hollowmere. You would not put them down in the snow.', name: 'horn of coals', nouns: ['coals'], kind: 'misc',
    look: "A cow's horn, stopped with clay, with three coals from Halla's fire in it. They are red yet. She did not seem to think they would stay so.",
  },
  bottle: {
    id: 'bottle', weight: 0, keep: 'It is for the girl under the furs. It is not going anywhere but the Elder\'s hall.', name: 'black bottle', nouns: ['bottle', 'tonic'], kind: 'misc',
    look: "A stone bottle, stopped and still warm from Runa's pot. It puts back what the cold takes out. If the girl can swallow it.",
    use: [{ say: 'It is not yours to drink. Three frostcaps and a long night went into it, and it is for a girl of seven.' }],
  },
  ring: {
    id: 'ring', weight: 0, keep: 'It does not come off as easily as it went on.', name: 'brass ring', nouns: ['ring'], kind: 'misc',
    look: 'A plain ring of brass, old, and worn smooth by a good many hands. It was on Marta\'s finger, and before that it was kept by. It fits.',
    don: [{ say: 'It is on your finger, where Marta put it. You turn it. It is worn smooth, inside and out.' }],
  },
  hatchet: { id: 'hatchet', weight: 4, icon: 'hatchet', name: 'hatchet', nouns: ['hatchet'], kind: 'weapon', power: 4, look: 'A wood-hatchet with a nicked edge. Made for kindling, but it has no opinions about what it splits.' },
  sword: { id: 'sword', weight: 6, name: 'iron sword', nouns: ['sword'], kind: 'weapon', power: 7, look: 'Plain iron, well kept. Odd made it before his forge died, and it shows: every line of it is impatient.' },
  bow: { id: 'bow', weight: 4, name: 'hunting bow', nouns: ['bow'], kind: 'bow', power: 5, look: "Toke's yew bow. It comes with a quiver that never seems to run dry, which you have decided not to question." },
  longsword: { id: 'longsword', weight: 8, name: 'steel longsword', nouns: ['sword', 'longsword'], kind: 'weapon', power: 10, look: 'Steel, not iron: brighter, longer, and balanced so that it seems to want to move. Odd is quietly proud of it.' },
  mail: { id: 'mail', weight: 20, name: 'mail shirt', nouns: ['mail'], kind: 'armor', power: 25, look: 'A shirt of riveted rings. It weighs as much as a small sheep and turns a quarter of what hits you.' },
  token: { id: 'token', weight: 1, name: 'wolf-tooth token', nouns: ['token', 'trinket'], kind: 'trinket', mods: { dmg: 12 }, look: "A wolf's eye-tooth on a thong, drilled and carved with a single line. Whoever wore it struck harder for it, or believed they did, which in a fight comes to the same thing." },
  torc: { id: 'torc', weight: 2, name: 'iron torc', nouns: ['torc', 'trinket'], kind: 'trinket', mods: { armor: 8 }, look: 'A neck-ring of twisted iron, heavy and cold. It was made to turn the one blow that mail does not cover.' },
  hearthstone: { id: 'hearthstone', weight: 1, name: 'hearthstone', nouns: ['hearthstone', 'trinket'], kind: 'trinket', mods: { regen: 14 }, look: 'A river pebble that somebody kept in a fire for a year and a day. It is still warm. Held against a wound, it seems to remind the flesh what it was like to be whole.' },
  brooch: { id: 'brooch', weight: 1, name: 'moon-silver brooch', nouns: ['brooch', 'trinket'], kind: 'trinket', mods: { mana: 70 }, look: 'A cloak-pin of pale silver, set with a chip of something that holds the light. Spells come back to its wearer sooner than they should.' },
  harefoot: { id: 'harefoot', weight: 1, name: "hare's foot", nouns: ['harefoot', 'trinket'], kind: 'trinket', mods: { stamina: 50 }, look: "A white hare's foot on a cord, for luck and for wind. Its last owner must have run out of one or the other." },
  antlers: { id: 'antlers', weight: 1, name: "hart's-horn charm", nouns: ['antlers', 'trinket'], kind: 'trinket', mods: { stamina: 40, regen: 10 }, look: "A tine from the white hart's antler, pierced for a cord. Whoever wears it does not tire as other people tire, and mends a little as they walk." },
  ember: {
    id: 'ember', weight: 0, keep: 'You would sooner leave your own hand behind. It is the way home.', name: 'hearth-ember', nouns: ['ember'], kind: 'misc',
    look: "A little box of horn. Inside, on a bed of ash, one coal from the Elder's hearth. A coal knows its own hearth: breathe on it and it brings you back to that one. It takes one, and what one can carry. The box is warm in your hand. As far as you know, nothing has ever been made to bring you back anywhere.",
    use: [{ run: 'emberHome' }],
    offer: { label: 'Breathe on the coal', say: 'use ember', if: [{ quiet: true }, { afield: true }] },
  },
  glove: { id: 'glove', weight: 0, keep: 'It was made for somebody, and you are only carrying it to him.', name: 'grey glove', nouns: ['glove'], kind: 'misc', look: "A man's glove of good grey wool, the left. Somebody knitted it with care a long time ago, and it has never been worn.", don: [{ say: 'It was knitted for one hand in particular, forty years ago, and yours is not the hand. You fold it away again.' }] },
  spear: { id: 'spear', weight: 10, name: 'boar-spear', nouns: ['spear'], kind: 'weapon', power: 12, look: "Ivar's boar-spear: an ash shaft as thick as your wrist, and a blade like a willow leaf. It has stopped things a good deal bigger than you." },
  bearcloak: { id: 'bearcloak', weight: 10, name: 'greyback cloak', nouns: ['bearcloak'], kind: 'armor', power: 35, look: "A cloak of the Greyback's hide, grey fur outward, stitched by Brekka with sinew. It turns a blade nearly as well as mail and weighs half as much. It still smells faintly of bear." },
  tonic: {
    id: 'tonic', weight: 1, name: "Runa's tonic", nouns: ['tonic'], kind: 'potion', consumed: true,
    look: 'A thumb-sized bottle of something black, stoppered with wax. Runa says it puts back what the cold takes out, and that it stays put back.',
    use: [{ run: 'tonic' }, { say: 'It tastes like the bottom of a well. For a moment you can feel every one of your bones. Then they feel stronger than they did.' }],
  },
  bearskin: { id: 'bearskin', weight: 15, icon: 'pelt', name: 'white bearskin', nouns: ['bearskin'], kind: 'misc', look: 'The pelt of a snow bear, white as the drifts and heavy as a door. Worth real silver to anyone who has to sleep cold.' },
  toyhorse: {
    id: 'toyhorse', weight: 0, keep: 'It seemed wrong to leave it out in the snow by itself. It still does.', name: 'carved horse', nouns: ['horse'], kind: 'misc',
    look: 'A horse the length of your hand, carved from pine by somebody patient. One ear has been chewed, by somebody small.',
    don: [{ say: 'It is a horse. It is not a hat.' }],
  },
  ewe: {
    id: 'ewe', weight: 0, keep: 'She leans on your leg with her whole weight and declines to be left. Somebody is expecting her.', name: 'stray ewe', nouns: ['sheep'], kind: 'misc',
    look: "She is not so much carried as accompanying. She has Gorm's mark on her fleece, and opinions about your pace.",
  },
  cheese: {
    id: 'cheese', weight: 1, name: "Gorm's cheese", nouns: ['cheese'], kind: 'food', consumed: true,
    look: 'A small hard cheese in a cloth, the colour of old candles. It smells strongly of sheep, and of somebody having very little and giving it anyway.',
    use: [{ heal: 12 }, { say: 'Hard, yellow, and sharp enough to make your eyes water. It was made from the milk of three discouraged ewes, and it is the best cheese you have ever eaten.' }],
  },
  venison: {
    id: 'venison', weight: 5, plural: 'haunches of venison', name: 'haunch of venison', nouns: ['venison'], kind: 'food', consumed: true,
    look: 'A haunch of red deer, frozen hard already. Halla would give silver for it. So would your own stomach.',
    use: [{ heal: 16 }, { say: 'You carve off strips and eat them half frozen, the way hunters do. It is the best meal you have had since you came north.' }],
  },
  herb: {
    id: 'herb', weight: 1, name: 'frostcap', nouns: ['herb'], kind: 'food', consumed: true,
    look: 'A small pale mushroom that grows under snow where the ground is sheltered. Bitter, and good for what ails you.',
    use: [{ heal: 8 }, { say: 'It tastes of cold earth and old pennies. Something in you eases all the same.' }],
  },
  pelt: { id: 'pelt', weight: 3, icon: 'pelt', name: 'wolf pelt', nouns: ['pelt'], kind: 'misc', look: 'A grey wolf pelt, thick with winter fur. Somebody in the village will give silver for it.' },
  shield: { id: 'shield', weight: 6, name: 'round shield', nouns: ['shield'], kind: 'shield', look: 'Limewood and hide, with an iron boss. It has no paint on it yet. Earn some.' },
  torch: {
    id: 'torch', weight: 1, icon: 'torch', name: 'pitch torch', nouns: ['torch'], kind: 'misc',
    look: 'A stick wound with pitch-soaked rag, waiting for a spark.',
    use: [{ run: 'lightTorch' }],
  },
  potion: {
    id: 'potion', weight: 1, name: 'red draught', nouns: ['potion'], kind: 'potion', consumed: true,
    look: 'Something red in a stoppered flask. It smells of iron and summer.',
    use: [{ heal: 25 }, { say: 'It tastes the way a hearth feels. Your wounds ease.' }],
  },
  grain: { id: 'grain', weight: 0, keep: 'Gorm\'s whole spring is in that sack. You are not putting it down anywhere but on his floor.', name: 'sack of seed grain', nouns: ['grain'], kind: 'misc', look: "A heavy sack with a G in a ring burned into it. Gorm's whole spring is in here." },
  amulet: { id: 'amulet', weight: 0, keep: 'It went into the ice once. It is not going to be put down again until it is in his hand.', name: 'silver amulet', nouns: ['amulet'], kind: 'misc', look: 'A moonstone on a silver chain. Forty years in the ice have not dimmed it. It is faintly warm.',
    don: [{ say: 'You hold it up by the chain, and find you cannot. It was put round one neck, once, by one pair of hands, and you are only carrying it home.' }],
  },
  // What the pack is carried in. Each lets a Thane carry more, for good.
  trappack: {
    id: 'trappack', weight: 0, carry: 20, keep: 'Brekka would know. Somehow, from two ridges off, she would know.', name: "Brekka's pack", nouns: ['pack'], kind: 'misc', icon: 'sack', don: [{ say: 'It is on your back, and has not been off it since Brekka pulled the strap tight.' }],
    look: 'A pack of grey wolf-hide, fur turned inward, with a frame of willow sewn into the back and a strap across the chest. Six wolves went into it. It rides high and close, and takes a good deal more than your old one ever did without once complaining about it.',
  },
  frame: {
    id: 'frame', weight: 0, carry: 15, keep: 'Somebody carried it forty winters before you. You can manage a few more.', name: "pedlar's frame", nouns: ['frame'], kind: 'misc', icon: 'sack', don: [{ say: 'It is on your back already, and your pack rides on it.' }],
    look: 'Two uprights of ash, bent and pegged, with a shelf at the foot and straps of plaited hide worn dark by somebody\'s shoulders. Burned into the crossbar: ELDMARK TO THE COAST AND BACK, FORTY WINTERS. Your pack rides on it now, with room to spare.',
  },
  tomeFlame: tome('tomeFlame', 'flame', 'singed tome', 'A book with scorched edges. The title page reads: FLAME, and How to Mean It.', 'The letters crawl, then settle. You understand, suddenly, how fire is spoken to. It is mostly a matter of tone.'),
  tomeFrost: tome('tomeFrost', 'frost', 'pale blue tome', 'A book bound in pale hide, cold to the touch. FROST: A Slowing.', 'Your breath smokes as you read. When you close the book the cold stays in your hands, waiting.'),
  tomeMend: tome('tomeMend', 'mend', 'small green tome', 'A small green book, soft with handling. MEND: On Putting Back.', 'It is less a spell than a kindness with rules. You find you know them now.'),
  tomeLight: tome('tomeLight', 'light', 'slim white tome', 'A slim white book. LIGHT: A Small Spell and a Kind One.', 'The page seems brighter than the room. When you look up, a little of it comes with you.'),
  tomeWard: tome('tomeWard', 'ward', 'grey tome', 'A book bound in grey iron-cloth. WARD: Against What Is Coming.', 'You feel the air around you consider hardening, and wait to be asked.'),
};

const robber: Effect[] = [{ add: 'bandits.killed', n: 1 }, { gold: 3 }, { chance: 0.25, do: [{ give: 'potion', took: 'It was carrying a red draught.' }] }];

const enemies: Record<string, EnemyDef> = {
  wolf: {
    id: 'wolf', name: 'wolf', nouns: ['wolf'], ai: 'wolf', hp: 14, dmg: 5, speed: 2.1,
    spec: { body: 'wolf', skin: 'fur', hair: 'fur', hairStyle: 'short', tunic: 'fur', legs: 'fur', boots: 'fur' },
    look: 'Lean, grey, and entirely focused on you. Its ribs show. Winter has been hard on everyone.',
    kills: 'The wolf was hungry and you were slow. In the spring, something green grows where you fell.',
    death: [{ add: 'wolves.killed', n: 1 }, { chance: 0.6, do: [{ give: 'pelt', took: 'You take the pelt.' }] }],
  },
  bandit: {
    id: 'bandit', name: 'bandit', nouns: ['bandit'], ai: 'melee', hp: 22, dmg: 6, speed: 1.2,
    spec: { skin: 'skin', hair: 'brown', hairStyle: 'hood', beard: true, tunic: 'grey', legs: 'leather', boots: 'fur', cloak: 'leather', armed: true },
    look: 'A hard-faced man in a stolen cloak, holding a stolen sword as if he had paid for it.',
    kills: 'The bandit goes through your pockets, finds almost nothing, and is briefly sorry he bothered.',
    death: [...robber],
  },
  archer: {
    id: 'archer', name: 'bandit archer', nouns: ['bandit'], ai: 'archer', hp: 14, dmg: 5, speed: 1,
    spec: { skin: 'skin', hair: 'brown', hairStyle: 'hood', tunic: 'green', legs: 'leather', boots: 'fur', cloak: 'green' },
    look: 'A thin robber with a short bow, who keeps their distance and means to go on keeping it.',
    kills: 'You never do find out where the last arrow came from.',
    death: [...robber],
  },
  wight: {
    id: 'wight', name: 'dead walker', nouns: ['wight'], ai: 'wight', undead: true, hp: 34, dmg: 9, speed: 0.75,
    hail: 'It does not answer. It was going somewhere when it caught your scent, and it will be going there again when it has done with you.',
    spec: { skin: 'wight', hair: 'white', hairStyle: 'short', beard: true, tunic: 'rock', legs: 'rock', boots: 'rock', cloak: 'fur', eyes: 'glow', hunch: true, armed: true, bias: -1, outline: 'ice', ragged: true },
    look: 'One of the dead, with frost in its beard. It has the walk of somebody who has been going to the same place for a long time and is no nearer. Nobody buried it: the ground was too hard for a spade.',
    kills: 'The dead thing is cold, and then everything is. In a while you get up again, with frost in your hair, and find that you too have somewhere to be.',
    death: [{ gold: 6 }, { note: 'It goes down and lies still. For now. There was old silver on it.' }],
  },
  deer: {
    id: 'deer', name: 'red deer', nouns: ['stag'], ai: 'prey', hp: 5, dmg: 0, speed: 2.5,
    spec: { body: 'deer', size: 1.15, skin: 'leather', hair: 'leather', hairStyle: 'short', tunic: 'leather', legs: 'leather', boots: 'leather' },
    look: 'A red stag, scraping at the snow for what is under it. It has not seen you yet. The moment it does, it will be somewhere else.',
    kills: '',
    death: [{ set: 'deer.killed' }, { give: 'venison', took: 'Venison. Tonight you eat like a jarl.' }],
  },
  whitehart: {
    id: 'whitehart', name: 'white hart', nouns: ['stag', 'whitehart'], ai: 'prey', hp: 13, dmg: 0, speed: 2.9,
    spec: { body: 'deer', size: 1.4, skin: 'cream', hair: 'cream', hairStyle: 'short', tunic: 'cream', legs: 'cream', boots: 'cream' },
    look: 'A hart as white as the drifts, and half as tall again as any deer has a right to be. It lifts its head and looks straight at you, without fear, the way a king looks at somebody who has come to ask for something.',
    kills: '',
    death: [{ give: 'antlers' }, { give: 'venison', n: 2 }, { set: 'hart.killed' }, { say: 'The white hart runs a dozen strides with your arrows in it, and then, quite slowly, kneels. You stand over it for a long time before you take out your knife. Hunters in this country go their whole lives without seeing one.' }],
  },
  bear: {
    id: 'bear', name: 'snow bear', nouns: ['bear'], ai: 'melee', reach: 30, hp: 48, dmg: 11, speed: 1.1,
    spec: { body: 'bear', size: 1.5, skin: 'cream', hair: 'cream', hairStyle: 'short', tunic: 'cream', legs: 'cream', boots: 'cream' },
    look: 'A bear the colour of the drifts, with a head like an anvil. It was asleep until you came. It would like you to know that.',
    kills: 'The bear does not hurry, because it does not have to. Afterwards it goes back to sleep.',
    death: [{ give: 'bearskin', took: 'You take the great white pelt.' }],
  },
  greyback: {
    id: 'greyback', name: 'the Greyback', nouns: ['bear', 'greyback'], ai: 'melee', reach: 34, hp: 110, dmg: 15, speed: 1.2,
    spec: { body: 'bear', size: 1.85, skin: 'fur', hair: 'fur', hairStyle: 'short', tunic: 'fur', legs: 'fur', boots: 'fur' },
    look: 'A grey bear the size of a hay-cart, with a white scar across his face from brow to jaw. He has been robbing traps for six winters and has never once been made to regret it.',
    kills: "The Greyback adds you to the list of things he has taken from other people's trap-lines.",
    death: [{ quest: 'greyback', stage: 2 }, { score: 6, id: 'greyback.kill' }, { set: 'goal.greyback', to: false }, { run: 'mark', arg: 'brekka' }, { say: 'The Greyback goes down like a wall falling. For a moment the crags are very quiet. Then, somewhere, a crow starts telling everyone.' }],
  },
  rimewalker: {
    id: 'rimewalker', name: 'rime-walker', nouns: ['rimewalker'], ai: 'wight', undead: true, reach: 27, hp: 52, dmg: 12, speed: 0.95,
    spec: { skin: 'ice', hair: 'white', hairStyle: 'long', tunic: 'ice', legs: 'ice', boots: 'snow', cloak: 'snow', eyes: 'glow', armed: true, outline: 'ice', size: 1.2, ragged: true },
    look: 'Something that froze to death out here and did not notice. Ice has grown over it like armour, and it walks inside the ice.',
    kills: 'The rime-walker lays a hand on you, almost gently. The frost goes in at the shoulder and reaches your heart before you can be surprised.',
    death: [{ gold: 10 }, { note: 'It breaks like a dropped jug. There is silver in the pieces.' }, { chance: 0.3, do: [{ give: 'potion' }] }],
  },
  chief: {
    id: 'chief', name: 'reaver chief', nouns: ['reaver', 'bandit'], ai: 'melee', reach: 24, hp: 58, dmg: 10, speed: 1.3,
    spec: { skin: 'skin', hair: 'red', hairStyle: 'long', beard: true, tunic: 'red', legs: 'leather', boots: 'fur', cloak: 'fur', collar: 'fur', armed: true, size: 1.15 },
    look: 'Bigger than the others, better fed, and wearing somebody else\'s good cloak. The rest watch him before they do anything.',
    kills: 'The chief wipes his blade on your cloak, decides he likes the cloak, and takes that as well.',
    death: [{ add: 'bandits.killed', n: 1 }, { gold: 14 }, { give: 'potion', took: 'He carried silver, and a red draught.' }],
  },
  // The guards of the north gate. They are not to be beaten: whatever is knocked down gets up again.
  gateguard: {
    id: 'gateguard', name: 'gate guard', nouns: ['guard', 'wight'], ai: 'wight', undead: true, reach: 27, hp: 90, dmg: 13, speed: 0.9,
    hail: 'It does not answer. It looks at you the way a door looks at you. Nobody has come to relieve it, and nobody has told it that it may go.',
    spec: { skin: 'ice', hair: 'white', hairStyle: 'short', beard: true, tunic: 'metal', legs: 'rock', boots: 'rock', cloak: 'ice', eyes: 'glow', armed: true, outline: 'ice', size: 1.15, ragged: true },
    look: 'A guard of some kingdom that nobody has a name for any more. He is frost to the bone, and still at his post, with what is left of a spear. He has the look of a man nobody ever came to relieve.',
    kills: 'The guard does what he was posted to do. Afterwards he goes back to his place in the row, and you are found a place at the end of it.',
    death: [{ run: 'guardRises' }],
  },
};

const spells: Record<string, SpellDef> = {
  flame: { id: 'flame', name: 'Flame', cost: 6, kind: 'bolt', power: 8, shot: 'flame' },
  frost: { id: 'frost', name: 'Frost', cost: 7, kind: 'bolt', power: 4, shot: 'frost' },
  mend: { id: 'mend', name: 'Mend', cost: 8, kind: 'heal', power: 14 },
  light: { id: 'light', name: 'Light', cost: 4, kind: 'light', power: 1800 },
  ward: { id: 'ward', name: 'Ward', cost: 8, kind: 'ward', power: 240 },
};

const words: Record<string, WordDef> = {
  veth: { id: 'word:veth', verb: 'veth', kind: 'push', cooldown: 300 },
  iska: { id: 'word:iska', verb: 'iska', kind: 'freeze', cooldown: 600 },
  orun: { id: 'word:orun', verb: 'orun', kind: 'reveal', cooldown: 200 },
  sol: { id: 'word:sol', verb: 'sol', kind: 'smite', cooldown: 500 },
};

// Perks: what practice earns. Each is named here; what it does is written where it applies in
// the engine (combat.ts, magic.ts, sim.ts) and looked up by id.
const perks: PerkDef[] = [
  { id: 'riposte', skill: 'blade', lv: 12, name: 'Riposte', text: 'The blow you strike just after turning an attack aside lands twice as hard.' },
  { id: 'reach', skill: 'blade', lv: 25, name: 'Long Reach', text: 'You have learned to use the whole length of your arm. Your swings carry further.' },
  { id: 'bulwark', skill: 'block', lv: 10, name: 'Bulwark', text: 'Your guard stops more, and holding it costs you less breath.' },
  { id: 'steady', skill: 'block', lv: 20, name: 'Steady Advance', text: 'You can walk, slowly, with your guard up.' },
  { id: 'quickdraw', skill: 'archery', lv: 10, name: 'Quick Draw', text: 'You nock and loose nearly twice as fast.' },
  { id: 'heavyshot', skill: 'archery', lv: 20, name: 'Heavy Shot', text: 'Your arrows land hard enough to throw a foe back.' },
  { id: 'thrift', skill: 'sorcery', lv: 10, name: 'Thrift', text: 'Spells cost you a quarter less.' },
  { id: 'wildfire', skill: 'sorcery', lv: 20, name: 'Wildfire', text: 'Your bolts burst where they land, catching whatever stands close by.' },
  { id: 'secondwind', skill: 'mending', lv: 10, name: 'Second Wind', text: 'Mending yourself gives you your breath back as well.' },
  { id: 'vigor', skill: 'mending', lv: 20, name: 'Vigour', text: 'Your wounds close slowly even in the middle of a fight.' },
  { id: 'executioner', skill: 'blade', lv: 40, name: 'Finisher', text: 'A foe already half beaten takes a quarter more from every blow you land.' },
  { id: 'ironarm', skill: 'block', lv: 35, name: 'Iron Arm', text: 'Raising your guard costs you no breath, and a parried foe stays open half as long again.' },
  { id: 'hawkeye', skill: 'archery', lv: 35, name: 'Hawk Eye', text: 'Your arrows strike a quarter harder.' },
  { id: 'deepwell', skill: 'sorcery', lv: 35, name: 'Deep Well', text: 'Your mana returns twice as fast.' },
  { id: 'hale', skill: 'mending', lv: 35, name: 'Hale', text: 'Draughts, food and mending all restore half as much again.' },
  { id: 'oldtongue', skill: 'lore', lv: 40, name: 'Old Tongue', text: 'Runewords come back to you far sooner.' },
  { id: 'echo', skill: 'lore', lv: 12, name: 'Echo', text: 'Speaking a runeword gives a little strength back to your spells.' },
  { id: 'longvoice', skill: 'lore', lv: 25, name: 'Long Voice', text: 'Your runewords carry further and last half as long again.' },
];

const quests: Record<string, QuestDef> = {
  hearth: {
    id: 'hearth', name: 'The Cold Hearth', done: 5,
    stages: {
      1: "Marta Coldhand, the Elder, wants you up at her hall, on the west side of the square.",
      2: "A girl of seven lies in the Elder's hall, under every fur in Hollowmere, with frost on her eyelashes. Marta wants a bottle of the black stuff that Runa the herb-wife makes. Runa's steading is {runa.way} of Hollowmere, out past the old watchtower: it is marked on the map. Halla at the inn has a flint.",
      3: "You have Runa's black bottle. If the girl can swallow it, it will mend her. Take it to the Elder's hall.",
      4: 'Marta has stopped. There is no fire in the hall to breathe in by.',
      5: "The Elder's hearth burns, Tova is mending, and you are Thane of Hollowmere.",
    },
  },
  stores: {
    id: 'stores', name: 'A Stolen Spring', done: 2,
    stages: { 1: "Bandits took Gorm's seed grain. They are camped south-west, past the ford.", 2: 'Gorm has his grain back, and there will be a spring.' },
  },
  wolves: {
    id: 'wolves', name: 'Wolf Winter', done: 2,
    stages: { 1: 'Toke the hunter wants three wolves killed: two in the pinewood, at least one on the ridge.', 2: 'The wood is quiet, and Toke\'s bow is yours.' },
  },
  north: {
    id: 'north', name: 'Where the Wind Stops', done: 8,
    stages: {
      1: 'There is smoke from every roof, and it is still the coldest winter anyone can remember. It is colder every day. Marta says to go down to the tarn and ask Fenn why.',
      2: "Fenn has set you a sum: one child, one word, one room, and every fire in a valley out. North, past a gate kept by the dead, the wind stops, and every year it stops nearer. The dead cannot stand the sun's name. It is cut under the Giant's Table, far to the south, beyond the first wall, and it shows only at night. The place is marked on the map. (The word VETH, which opens and pushes, is cut in the stone on the west ridge.)",
      3: "You have the sun's name. The gate is north: past the barrow, past the Hanging Tree, past the first wall, in the last wall you can see. It is marked on the map.",
      4: 'The dead of the gate have gone back into their towers. The road north is open. Nobody living has gone up it in a very long time.',
      5: "Under the snow of the old road, many winters down, there are footprints: a woman's, long in the stride, and a child's beside them. They go north, the way nobody goes. So do you.",
      6: 'She kneels in a hollow in the snow with her hands on the drift, saying one word, without a breath between. She has been saying it for longer than Hollowmere has had a hall.',
      7: 'The word has ended. All the snow in the sky has come down, and there is a wind. Hollowmere is a very long way south.',
      8: 'The winter has broken.',
    },
  },
  message: {
    id: 'message', name: 'Not Dead Yet', done: 3,
    stages: {
      1: 'Ivar One-Glove wants Elder Marta told that he is not dead.',
      2: 'Marta has sent Ivar a glove. He lives at {ivar.home}, {ivar.way} of Hollowmere.',
      3: 'Ivar has his glove, and you have his spear.',
    },
  },
  greyback: {
    id: 'greyback', name: 'The Greyback', done: 3,
    stages: {
      1: "A great grey bear has been robbing Brekka's traps. He dens at {greyback.name}, {greyback.way} of her steading.",
      2: 'The Greyback is dead. Brekka lives at {brekka.home}, {brekka.way} of Hollowmere.',
      3: "Brekka has made you a cloak of the Greyback's hide.",
    },
  },
  bounty: {
    id: 'bounty', name: "The Elder's Work", done: 99, repeats: true,
    stages: { 1: 'Elder Marta wants {bounty.what} {bounty.name}, {bounty.way} of Hollowmere. It is marked on the map.', 2: 'It is done at {bounty.name}. Elder Marta will pay what she promised.' },
  },
  errand: {
    id: 'errand', name: 'What the Ice Kept', done: 2,
    stages: { 1: "Fenn's amulet is frozen into the thin middle of the tarn. The ice would have to freeze harder before it would bear you.", 2: 'Fenn has the amulet back after forty years.' },
  },
};

/** Standing with one of the people who live out in the wild. */
const withFolk: Cond = { any: [{ near: 'brekka' }, { near: 'ivar' }, { near: 'runa' }] };

const rules: Rule[] = [
  { cleared: true, do: [{ run: 'bountyCheck' }] },
  { on: ['price', 'price *'], if: [{ near: 'odd' }, { flag: 'hearth.lit' }], do: [{ say: '"Sword, twenty-five. Shield, fifteen. Mail, forty-five. The steel is sixty. Tempering starts at forty and climbs, because iron does not get easier to improve," says Odd.' }] },
  { on: ['price', 'price *'], if: [{ near: 'odd' }], do: [{ say: '"Sword, twenty-five. Shield, fifteen. Mail, forty-five. The steel is sixty, to someone who has earned it," says Odd.' }] },
  { on: ['price', 'price *'], if: [{ near: 'halla' }], do: [{ say: '"Ale is a silver. So is stew. A red draught is six, a torch is three, and the bed is four a night," says Halla. "Same as yesterday."' }] },
  { on: ['price', 'price *'], if: [{ near: 'fenn' }], do: [{ say: '"Mend is fifteen silver, Frost twenty, Ward twenty-five," says Fenn. "Knowledge has never been cheaper, and it is still too dear for most."' }] },
  { on: ['price', 'price *'], if: [withFolk], do: [{ say: '"A draught is seven silver. I give four for a wolf pelt, ten for a bearskin, two for frostcaps."' }] },
  { on: ['price', 'price *'], do: [{ say: 'Nobody here is selling anything.' }] },
  { on: ['heal', 'heal *'], if: [{ knows: 'mend' }], do: [{ say: 'You know a spell for that. It only wants casting.' }] },
  { on: ['heal', 'heal *'], do: [{ say: 'A red draught would do it, or a night in a bed, or the stones of a shrine, if you can find one.' }] },
  { on: ['brew', 'brew *'], do: [{ say: 'You have no pot, no fire that will stay lit, and no idea which mushroom is the other kind.' }] },
  { on: ['hide', 'hide *'], do: [{ say: 'There is nowhere to hide that a wolf\'s nose would not find. You stand up again, with snow down your neck.' }] },
  { on: ['follow', 'follow *'], do: [{ say: 'You follow for a while. The trail crosses another, and that one a third, and all of them turn out to be yours.' }] },
  { on: ['skin', 'skin *'], do: [{ say: 'When a pelt is worth taking, you take it. You have learned not to be sentimental about what tried to eat you.' }] },
  { on: ['light camp', 'light hearth'], if: [{ not: { has: 'flint' } }], do: [{ say: 'You have no dry wood, and a fire out here would be a lamp in the window for everything with teeth. Better to keep moving, or find a roof.' }] },
  { on: ['sleep camp'], do: [{ say: 'You have no dry wood, and a fire out here would be a lamp in the window for everything with teeth. Better to keep moving, or find a roof.' }] },
  { on: ['light snow', 'take snow', 'drop snow', 'attack snow'], do: [{ say: 'You pack a snowball, look round for somebody to throw it at, and think better of it.' }] },
  { on: ['enter village', 'enter hall'], do: [{ say: 'It is a long walk, and nobody is going to do it for you. The map shows the way.' }] },
  { on: ['blow ember', 'pet ember', 'light ember', 'warm ember', 'open ember'], if: [{ has: 'ember' }], do: [{ run: 'emberHome' }] },
  // The thaw comes south behind whoever ended the winter.
  { enter: true, if: [{ flag: 'winter.broken' }, { not: { flag: 'thaw.home' } }], do: [{ run: 'thawComes' }] },
  // Three coals from Halla's fire never get as far as the bridge.
  { enter: true, if: [{ has: 'coals' }, { not: { at: ['village', 'inn', 'hall'] } }], do: [{ lose: 'coals' }, { say: "You unstop the horn to look. The three coals from Halla's fire are black and cold, all three. They were dead before the bridge, as she said they would be. You tip them out into the snow." }] },
  { on: ['blow', 'blow *'], do: [{ say: 'You breathe out. Your breath hangs in the air a moment, considers freezing, and drifts off.' }] },
  { on: ['temper', 'temper *'], do: [{ say: 'That is smith\'s work, and the only smith is Odd, in Hollowmere.' }] },
  // Trade at the lone steadings.
  { on: ['buy potion', 'buy'], if: [withFolk, { gold: 7 }], do: [{ gold: -7 }, { give: 'potion' }, { sound: 'take' }, { say: 'Seven silver changes hands, and a red draught comes out from under a fur. "It works. Do not ask what is in it."' }] },
  { on: ['buy potion', 'buy'], if: [withFolk], do: [{ say: '"Seven silver for a draught. I do not give credit to people who walk about out here; they tend not to come back."' }] },
  { on: ['sell pelt', 'give pelt'], if: [withFolk, { has: 'pelt' }], do: [{ lose: 'pelt' }, { gold: 4 }, { sound: 'take' }, { say: 'The pelt is looked over, hair and hide, and found sound. Four silver.' }] },
  { on: ['sell bearskin', 'give bearskin'], if: [withFolk, { has: 'bearskin' }], do: [{ lose: 'bearskin' }, { gold: 10 }, { sound: 'take' }, { say: '"You killed that? You?" A long look, then ten silver, counted out with new respect.' }] },
  { on: ['sell herb', 'give herb'], if: [withFolk, { has: 'herb' }], do: [{ lose: 'herb' }, { gold: 2 }, { sound: 'take' }, { say: 'Two silver for the frostcaps. "For the pot. The winter is long and I am tired of hare."' }] },
  { on: ['buy tonic', 'buy herb tonic', 'buy tonic herb', 'light tonic'], if: [{ near: 'runa' }, { has: 'herb', n: 3 }], do: [{ lose: 'herb', n: 3 }, { give: 'tonic' }, { sound: 'take' }, { score: 3, id: 'tonic' }, { say: 'Runa takes the three frostcaps, bruises them in a little mortar with something black from a jar, and pours the result into a bottle the size of your thumb. "Drink it when you are sitting down."' }] },
  { on: ['buy tonic', 'buy herb tonic', 'buy tonic herb', 'light tonic'], if: [{ near: 'runa' }], do: [{ say: '"Three frostcaps and I will brew you a tonic," says Runa. "Not two. I have tried it with two."' }] },
  { on: ['sell *', 'sell'], if: [withFolk], do: [{ say: '"Pelts, bearskins and frostcaps. I have no use for anything else, and nowhere to put it."' }] },
  { on: ['sell pelt', 'sell bearskin'], do: [{ say: 'Nobody here is buying. Odd the smith takes skins, back in Hollowmere.' }] },
  { on: ['sell herb'], do: [{ say: 'Nobody here is buying. Halla at the inn would take them for her stew.' }] },
  { on: ['sell venison', 'give venison'], if: [withFolk, { has: 'venison' }], do: [{ lose: 'venison' }, { gold: 4 }, { sound: 'take' }, { say: '"Deer! I have eaten nothing but hare since the leaves fell." Four silver, and a look of real gratitude.' }] },
  { on: ['sell venison'], do: [{ say: 'Nobody here is buying. Halla at the inn would pay for fresh meat.' }] },
  { on: ['pet stag', 'take stag', 'talk stag', 'kiss stag'], do: [{ say: 'You take one step toward it. It takes thirty away from you.' }] },
  { on: 'look self', do: [{ say: 'A wanderer with more road behind than coin ahead. Your cloak has seen better winters.' }] },
  { on: ['light torch', 'use torch'], if: [{ has: 'torch' }], do: [{ run: 'lightTorch' }] },
  { on: ['light torch', 'use torch'], do: [{ say: 'You have no torch. Halla sells them at the inn.' }] },
  // Fire, anywhere nothing in particular is waiting to be lit.
  { on: ['light *', 'light', 'use flint', 'use flint *'], if: [{ has: 'flint' }, { afield: false }, { not: { flag: 'hearth.lit' } }], do: [{ say: 'You strike the steel into a pinch of dry moss. It catches. Then the little flame lies down flat, as if a wind were pressing on it, though there is no wind; and it goes out, without smoking.' }] },
  { on: ['light *', 'light', 'use flint', 'use flint *'], if: [{ has: 'flint' }], do: [{ say: 'You strike a spark, and it would take, too. But there is nothing here you want burnt, and a fire out here is a lamp in the window for everything with teeth.' }] },
  { on: ['light *', 'light'], do: [{ say: 'You have nothing to light it with, and it would not thank you.' }] },
  { on: ['use ring', 'look ring', 'take ring'], if: [{ has: 'ring' }], do: [{ say: 'You turn the ring on your finger. It is old, and worn smooth by a good many hands.' }] },
  { on: ['dance', 'dance *'], do: [{ say: 'You dance a few steps. Nobody applauds, but nobody stops you either.' }] },
  { on: ['sing', 'sing *'], do: [{ say: 'You sing the one verse you know. The echo improves it slightly.' }] },
  { on: ['pray', 'pray *'], do: [{ say: 'You offer a few words to whoever is listening. The cold does not let up, but you feel a little better.' }] },
  { on: ['jump', 'jump *'], do: [{ say: 'You jump. You come down again. So far the saga is unmoved.' }] },
  { on: ['sleep', 'sleep *'], do: [{ say: 'Lie down here and you may not get up. Find a bed: the inn has one.' }] },
  { on: 'wait', if: [{ flag: 'winter.broken' }], do: [{ say: 'Time passes. Somewhere, something drips.' }] },
  { on: 'wait', do: [{ say: 'Time passes. It is still cold.' }] },
  { on: ['shout', 'shout *'], do: [{ say: 'Your voice rolls off toward the mountains. Something up there may have heard it.' }] },
  { on: ['listen', 'listen *'], if: [{ flag: 'winter.broken' }], do: [{ say: 'Wind, and under it water: dripping, running, talking to itself under the ice.' }] },
  { on: ['listen', 'listen *'], do: [{ say: 'Wind, and under it the creak of snow settling.' }] },
  { on: ['smell', 'smell *'], do: [{ say: 'Woodsmoke and pine. Cold has a smell too, you are learning.' }] },
  { on: ['sit', 'sit *'], do: [{ say: 'You sit for a moment. The cold comes up through you like a rumour, and you stand again.' }] },
  { on: 'xyzzy', do: [{ say: 'A hollow voice says nothing at all. Wrong saga.' }] },
  { on: ['sell', 'sell *'], do: [{ say: 'Nobody in Hollowmere has silver to spare for your things. They would rather sell you theirs.' }] },
  { on: ['chop', 'chop *'], do: [{ say: 'It does not need chopping, and would not thank you.' }] },
  { on: ['wish', 'wish *'], do: [{ say: 'You wish, briefly and hard. Nothing changes, which is the usual arrangement.' }] },
  { on: ['warm', 'warm *'], if: [{ flag: 'winter.broken' }], do: [{ say: 'You blow on your fingers, out of habit, and find they did not need it.' }] },
  { on: ['warm', 'warm *'], do: [{ say: 'You blow on your fingers. They stay cold. Everything stays cold.' }] },
  { on: ['bye', 'bye *'], do: [{ say: 'You nod. Nods are free.' }] },
  { on: ['yes', 'no'], do: [{ say: 'Nobody asked. But your position is noted.' }] },
  { on: ['curse', 'curse *'], do: [{ say: 'Your grandmother would be ashamed. The mountains have heard worse.' }] },
  { on: ['learn', 'learn *'], do: [{ say: 'Spells are learned by reading tomes: READ one. Runewords are learned by reading the standing stones that hold them.' }] },
  { on: ['freeze', 'freeze *'], do: [{ say: 'It is frozen enough already. Everything here is.' }] },
  { on: ['skate', 'skate *'], do: [{ say: 'There is nothing here smooth enough to slide on.' }] },
  { on: ['fish', 'fish *'], do: [{ say: 'You have no line, no hook, and no patience. The fish are safe.' }] },
  { on: ['block', 'block *'], do: [{ say: 'Hold Shift to raise your guard. It only stops what comes from the front, so turn to face the blow. Raise it as a foe winds up, when the gold ! shows, and the blow is turned aside altogether.' }] },
  { on: ['run', 'run *'], do: [{ say: 'You are already going as fast as the snow allows.' }] },
  { on: ['say', 'say *'], do: [{ say: 'You say it. The cold air swallows the words. (To speak to someone, TALK TO them.)' }] },
  { on: ['kiss *', 'pet sigga', 'pet elder', 'pet halla'], do: [{ say: 'You think better of it, which is the wisest thing you have done all day.' }] },
  { on: ['pet wolf', 'kiss wolf'], do: [{ say: 'It has opinions about that, and teeth to express them with.' }] },
  { on: ['attack sigga', 'attack elder', 'attack odd', 'attack halla', 'attack fenn', 'attack toke', 'attack gorm', 'attack girl', 'attack boy'], do: [{ say: 'These are the only people for a week in any direction who have let you in. Hit something that deserves it.' }] },
  { on: ['attack', 'attack *'], do: [{ say: 'There is nothing here that needs hitting. Give it time.' }] },
  { on: ['thank *', 'thank'], do: [{ say: 'Courtesy costs nothing, which is exactly what you can afford.' }] },
  { on: ['buy', 'buy *'], do: [{ say: 'Nobody here is selling that.' }] },
  { on: ['give *', 'give * *'], do: [{ say: 'Nobody here wants it.' }] },
  { on: ['open *', 'close *', 'push *', 'pull *', 'climb *', 'enter *', 'knock *', 'dig', 'dig *'], do: [{ say: 'You try. Nothing comes of it but cold hands.' }] },
  { on: ['eat snow', 'eat *'], do: [{ say: 'You are hungry, but not that hungry. Not yet.' }] },
  { on: ['swim', 'swim *'], do: [{ say: 'There is nothing here to swim in, for which you should be grateful.' }] },
  { on: ['read *', 'read'], do: [{ say: 'There is nothing written on it that you can make out.' }] },
];

// What a skald would sing of. Only the ones done are ever shown, so the list can grow without end.
const deeds: Content['deeds'] = [
  { text: 'Came north on foot with nothing, and went down toward the one roof with smoke at it.' },
  { if: [{ knows: 'word:iska' }], text: 'Read ISKA from the stone by the old watchtower, and held a whole sky of snow on it, for as long as one word lasts.' },
  { if: [{ flag: 'wolves.killed', min: 3 }], text: 'Quieted the pinewood, and was given a bow for it.' },
  { if: [{ quest: 'stores', is: 2 }], text: "Took back Gorm's seed grain from the robbers past the ford." },
  { if: [{ quest: 'errand', is: 2 }], text: 'Froze the tarn with a word, and gave Fenn back what the ice kept.' },
  { if: [{ flag: 'hearth.lit' }], text: "Laid a fire on the Elder's hearth and struck the spark, when she stopped; and was named Thane of Hollowmere." },
  { if: [{ flag: 'farm.stray' }], text: "Brought Gorm's fourth ewe home out of the wild." },
  { if: [{ flag: 'boy.horse' }], text: 'Carried a carved horse in from a sledge in the snow, and found it somebody to belong to.' },
  { if: [{ flag: 'bounty.n', min: 1 }], text: "Did the Elder's work in the wild. Jobs done so far: {bounty.n}." },
  { if: [{ quest: 'message', is: 3 }], text: 'Carried a glove forty years late from Marta Coldhand to Ivar One-Glove.' },
  { if: [{ quest: 'greyback', min: 2 }], text: 'Killed the Greyback, who had robbed traps for six winters.' },
  { if: [{ flag: 'tonic' }], text: "Drank Runa's tonic, and kept it down." },
  { if: [{ has: 'trappack' }], text: 'Carried the hides of six wolves to Brekka, and carried them away again as a pack.' },
  { if: [{ has: 'frame' }], text: "Took up a pedlar's frame where he set it down, having further to go than he did." },
  { if: [{ knows: 'word:veth' }], text: 'Read VETH from the stone on the west ridge.' },
  { if: [{ flag: 'sight.shuthouse' }], text: "Opened a dead man's door with a word, and slept a night out of the wind." },
  { if: [{ flag: 'bell.rung' }], text: 'Rang the Sunken Bell, which had waited a long time to be answered.' },
  { if: [{ knows: 'word:sol' }], text: "Waited for dark at the Giant's Table, and read what only shows then." },
  { if: [{ flag: 'tree.cut' }], text: 'Cut down the dead under the Hanging Tree, and laid them straight.' },
  { if: [{ flag: 'tree.looted' }], text: 'Robbed the robbers under the Hanging Tree.' },
  { if: [{ flag: 'gate.open' }], text: "Said the sun's name at the north gate, to guards nobody ever came to relieve." },
  { if: [{ knows: 'word:orun' }], text: 'Read ORUN from a stone that nobody living had read, on the far side of a gate that an old man could not pass.' },
  { if: [{ flag: 'coal.given' }], text: 'Held a whole sky on one word, for the space of a breath; and gave away the way home.' },
  { if: [{ flag: 'sol.said' }], text: "Said the sun's name in the hollow, and ended a winter three hundred years long." },
  { if: [{ flag: 'home.cup' }], text: 'Drank the cup that nobody drinks.' },
  { if: [{ flag: 'hart.killed' }], text: 'Brought down the white hart, which most hunters never so much as see.' },
  { if: [{ flag: 'deer.killed' }], text: 'Hunted your own supper, and brought it down.' },
  { if: [{ flag: 'kills', min: 1 }], text: 'Felled {kills} foes, and walked away from each.' },
];

const roomList: RoomDef[] = [ford, village, pinewood, farm, tower, camp, ridge, barrow, tarn, hall, inn, hut, bellmere, hangtree, dolmen, northgate, oldroad, windend, hanging, hollow];

export const content: Content = {
  title: "Thane's Quest",
  tagline: 'A typing adventure in the north',
  saveVersion: 2,
  flags: { 'temper.weaponCost': 40, 'temper.armorCost': 40 },
  start: { room: 'ford', x: 160, y: 160, dir: 'up' },
  hero,
  vocab,
  rooms: Object.fromEntries(roomList.map((r) => [r.id, r])),
  chars,
  items,
  enemies,
  quests,
  spells,
  words,
  perks,
  frontier,
  rules,
  // A pack holds thirty-five to begin with; a deeper wind adds five for every level put into stamina.
  carry: { base: 35, stamina: 0.5 },
  music,
  cues: { title: 'valley', battle: 'battle', fallback: 'wild', night: 'night', boss: 'doom' },
  // Where the wind stops, the snow does not fall at all; and once the winter has broken it is only weather.
  calm: [{ flag: 'winter.broken' }],
  rest: [{ flag: 'winter.broken' }],
  text,
  hints: [
    { if: [{ flag: 'home.cup' }], text: 'The winter has broken, and there is a place for you at the end of the bench nearest the door. The Elder always has work, the smith always wants silver, and the map still has more blank on it than anything else.' },
    { if: [{ flag: 'winter.broken' }, { flag: 'sol.said' }, { flag: 'marta.thaw' }], text: 'The winter has broken. The Elder always has work, the smith always wants silver, and the map still has more blank on it than anything else.' },
    { if: [{ flag: 'winter.broken' }], text: 'The winter is breaking, and the thaw goes south faster than you can walk. There is smoke at eleven roofs, a long way off, and a hall with a fire at one end and a door at the other.' },
    { if: [{ flag: 'hearth.lit' }, { quest: 'north', max: 0 }], text: "You are Thane of Hollowmere, with a ring on your finger and a coal in a horn box. It is still colder every day. The Elder had something more to say, the last time you were by her fire." },
    { if: [{ flag: 'hearth.lit' }], text: 'You are Thane of Hollowmere. The Elder has work for you whenever you ask, Odd will temper your blade, and beyond the valley there are people and places you have not found yet.' },
    { if: [{ flag: 'marta.met' }], text: 'Everybody in Hollowmere is in one room. Most of them have something to say, and one or two have something they want.' },
    { text: 'There is smoke from one roof. Whoever is under it will know what has happened here.' },
  ],
  deeds,
  fallbacks,
  intro,
};

