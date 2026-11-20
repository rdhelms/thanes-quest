// Named behaviours: the few things rooms and items need that the rule language cannot express.
// Data refers to them by name with { run: 'name' }.

import { gainSkill, hostile } from '../engine/combat';
import { findNear, homes, lair, parseWild, roomOf, wildId } from '../engine/frontier';
import { DAY_LENGTH, type Behaviour } from '../engine/sim';

const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
const ridges = (n: number, way: string): string => `${COUNT[n] ?? n} ${n === 1 ? 'ridge' : 'ridges'} ${way}`;

/** "two ridges east and one north", as someone who walks the country would put it. */
export function wayTo(dx: number, dy: number): string {
  const parts: string[] = [];
  if (dx) parts.push(ridges(Math.abs(dx), dx > 0 ? 'east' : 'west'));
  if (dy) parts.push(ridges(Math.abs(dy), dy > 0 ? 'south' : 'north'));
  return parts.join(' and ') || 'right here';
}

/** What Odd charges for the next tempering, having done `n` already. */
export const TEMPER_COST = (n: number): number => 40 + 30 * n;

/** The kinds of place the Elder sends a Thane to, and the kinds the folk of the steadings tell of. Their words are in the game's text. */
const BOUNTY_KINDS = ['camp', 'deadwood', 'crags', 'ruin'];
const RUMOUR_KINDS = ['camp', 'shrine', 'ruin', 'steading', 'crags'];

export const behaviours: Record<string, Behaviour> = {
  /** Reading and deciphering teaches Lore. */
  study: (sim, arg) => gainSkill(sim, 'lore', Number(arg ?? 12)),

  /** Somebody shows the player how a thing is done. `arg` is "skill=amount" of practice. */
  practise: (sim, arg) => {
    const [skill, amount] = String(arg).split('=');
    gainSkill(sim, skill, Number(amount) || 20);
  },

  /** A lit torch sees you through a couple of minutes of darkness. */
  lightTorch: (sim) => {
    if (!sim.state.flags['hearth.lit'] && (sim.state.room === 'hall' || sim.state.room === 'inn' || sim.state.room === 'village')) {
      sim.say('You strike a light. The torch catches, gutters, and dies. Nothing burns properly in Hollowmere just now.');
      return;
    }
    sim.state.flags.light = sim.state.tick + 2400;
    sim.say('The pitch catches and the torch flares. The dark backs off a few paces and waits.');
  },

  /** A night's sleep. */
  rest: (sim) => {
    const p = sim.p;
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    p.sp = p.maxSp;
  },

  /** A shrine in the wild: once a day it mends whoever asks, and stands over them for a while. */
  bless: (sim, arg) => {
    const key = `blessed.${arg}`;
    if (Number(sim.state.flags[key] ?? 0) > sim.state.tick) {
      sim.say('You say the words again. The stones are quiet. Whatever they give, they have given for today.');
      return;
    }
    const p = sim.p;
    sim.state.flags[key] = sim.state.tick + DAY_LENGTH;
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    sim.sound('word');
    sim.award(`shrine.${arg}`, 2);
    gainSkill(sim, 'lore', 10);
    // Different rings were raised to different ends: which boon a shrine gives depends on the shrine.
    const at = parseWild(String(arg)) ?? [0, 0];
    const boon = ['ward', 'might', 'light'][Math.abs(at[0] * 3 + at[1] * 5) % 3];
    sim.state.flags[boon] = sim.state.tick + (boon === 'light' ? 4800 : 2400);
    sim.say(sim.text(`shrine.${boon}`));
    sim.note(sim.text(`shrine.${boon}.note`));
  },

  /** Somebody who walks the wild says what lies nearby. `arg` is who is speaking. */
  rumour: (sim, arg) => {
    const at = parseWild(sim.state.room);
    const found = at && findNear(sim.content, at[0], at[1], RUMOUR_KINDS, 4);
    const who = String(arg ?? '');
    // A place with a name of its own is better worth telling of than a camp or a crag.
    const marks = Object.entries(sim.content.frontier?.grid ?? {})
      .filter(([id, cell]) => at && sim.content.text[`rumour.${id}`] && !sim.state.flags[`seen.${id}`] && Math.max(Math.abs(cell[0] - at[0]), Math.abs(cell[1] - at[1])) <= 7)
      .sort((a, b) => Math.hypot(a[1][0] - at![0], a[1][1] - at![1]) - Math.hypot(b[1][0] - at![0], b[1][1] - at![1]));
    if (at && marks.length) {
      const [id, cell] = marks[0];
      sim.state.flags[`goal.${id}`] = id;
      sim.say(sim.content.text[`rumour.${id}`].replace('%s', wayTo(cell[0] - at[0], cell[1] - at[1])), who);
      sim.note('The place is marked on your map.');
      return;
    }
    if (!at || !found) sim.say(sim.text('rumour.kind.none'), who);
    else sim.say(sim.text(`rumour.kind.${found.kind}`, wayTo(found.x - at[0], found.y - at[1])), who);
  },

  /** On first meeting one of the frontier's folk: remember where they live, for the journal. */
  home: (sim, arg) => {
    const who = String(arg);
    const at = homes(sim.content)[who];
    if (!at) return;
    sim.state.flags[`${who}.home`] = roomOf(sim.content, wildId(at[0], at[1]))?.name ?? '';
    sim.state.flags[`${who}.way`] = wayTo(at[0], at[1]);
  },

  /** A creature with a lair of its own has been asked about: note where it is, and mark the map. */
  haunt: (sim, arg) => {
    const kind = String(arg);
    const at = lair(sim.content, kind);
    const h = sim.content.frontier?.haunts?.find((k) => k.kind === kind);
    const from = h && homes(sim.content)[h.near];
    if (!at || !from) return;
    sim.state.flags[`${kind}.name`] = roomOf(sim.content, wildId(at[0], at[1]))?.name ?? '';
    sim.state.flags[`${kind}.way`] = wayTo(at[0] - from[0], at[1] - from[1]);
    sim.state.flags[`goal.${kind}`] = wildId(at[0], at[1]);
    sim.note('The place is marked on your map.');
  },

  /** Mark where one of the frontier's folk lives on the map. */
  mark: (sim, arg) => {
    const at = homes(sim.content)[String(arg)];
    if (at) sim.state.flags[`goal.${arg}`] = wildId(at[0], at[1]);
  },

  /** The hearth-ember: breathed on, it brings its carrier home. Once in a while, and not from a fight. */
  emberHome: (sim) => {
    const f = sim.state.flags;
    if (sim.rs.actors.some((a) => hostile(sim, a))) {
      sim.say('You fumble the horn box open. The coal dims, as if to say: not while something is trying to kill you.');
      return;
    }
    if (['village', 'hall', 'inn'].includes(sim.state.room)) {
      sim.say('You open the box. The coal glows contentedly. It is already where it wants to be.');
      return;
    }
    if (Number(f['ember.ready'] ?? 0) > sim.state.tick) {
      sim.say('The coal has gone grey, with only a thread of red at its heart. It has carried you once lately, and wants time by a fire before it will do it again.');
      return;
    }
    f['ember.ready'] = sim.state.tick + DAY_LENGTH / 2;
    sim.sound('word');
    sim.enterRoom('village', 160, 152, 'down');
    sim.say('You breathe on the coal. It flares; the snow, the cold and the long way back all fold up like a letter, and when you can see again you are standing in the square at Hollowmere with woodsmoke in your nose. The coal has gone grey. It will want a while before it does that again.');
  },

  /** The crown unmade: what it had taken goes into whoever stood nearest. */
  thaw: (sim) => {
    const p = sim.p;
    p.maxHp += 20;
    p.maxMp += 10;
    p.hp = p.maxHp;
    p.mp = p.maxMp;
  },

  /** The bell's note stays with whoever rang it: more mana, for good. */
  attune: (sim) => {
    sim.p.maxMp += 10;
    sim.p.mp = sim.p.maxMp;
  },

  /** Odd buys a spare trinket: whichever is carried but not being worn. */
  sellTrinket: (sim) => {
    const p = sim.p;
    const spare = Object.keys(p.inv).find((id) => sim.content.items[id]?.kind === 'trinket' && (p.trinket !== id || p.inv[id] > 1));
    if (!spare) {
      sim.say('"Take it off first, if you mean to sell it," says Odd. "I do not buy things off a customer\'s neck."', 'Odd the smith');
      return;
    }
    sim.lose(spare);
    if (p.trinket === spare && !p.inv[spare]) p.trinket = null;
    p.gold += 12;
    sim.sound('take');
    sim.say(`Odd weighs the ${sim.content.items[spare].name} in his palm, bites it, and shrugs. "Twelve silver. I can melt it or sell it on; either way it is worth twelve."`);
  },

  /** Sigga's mittens: a little more breath, for good. */
  mittens: (sim) => {
    sim.p.maxSp += 8;
    sim.p.sp = sim.p.maxSp;
  },

  /** Runa's tonic: a little more health, for good. */
  tonic: (sim) => {
    sim.state.flags.tonic = true;
    sim.p.maxHp += 5;
    sim.p.hp = Math.min(sim.p.maxHp, sim.p.hp + 5);
  },

  /** Odd improves what the player carries. `arg` is "weapon" or "armor". Each step costs more than the last. */
  temper: (sim, arg) => {
    const p = sim.p;
    const what = arg === 'armor' ? 'armor' : 'weapon';
    const held = what === 'armor' ? p.armor : p.weapon;
    const item = held ? sim.content.items[held] : null;
    const temper = (p.temper ??= { weapon: 0, armor: 0 });
    const cost = TEMPER_COST(temper[what]);
    if (!item || (what === 'weapon' && item.kind !== 'weapon')) {
      sim.say(what === 'armor' ? '"Temper what? You are wearing wool," says Odd. "I cannot harden wool."' : '"Put a blade in your hand and I will look at it," says Odd. "I do not do bows. Bows are carpentry."', 'Odd the smith');
      return;
    }
    // Mail can only be made so thick; an edge can always be made a little truer.
    const done = what === 'armor' ? (item.power ?? 0) + 4 * temper.armor >= 70 : temper.weapon >= 40;
    if (done) {
      sim.say('"There is nothing more I can do to that," says Odd, and for once he sounds sorry. "It is as good as iron gets. Anything better, you will have to find a better smith, and there is not one."', 'Odd the smith');
      return;
    }
    if (p.gold < cost) {
      sim.say(`"${cost} silver for the work," says Odd, "and you are short. Fire costs. Charcoal costs. My time costs most."`, 'Odd the smith');
      return;
    }
    p.gold -= cost;
    temper[what]++;
    sim.state.flags[`temper.${what}Cost`] = TEMPER_COST(temper[what]);
    sim.sound('take');
    sim.award(`temper.${what}.${temper[what]}`, 1);
    sim.say(
      what === 'armor' && item.id !== 'mail'
        ? `Odd looks at the ${item.name} as if it had insulted him, takes your ${cost} silver anyway, and spends an hour sewing iron rings under the hide where a blade would land. "It will turn more than it did. Do not tell anyone I sew."`
        : what === 'armor'
        ? `Odd takes the ${item.name} and your ${cost} silver, and for an hour the square rings. He closes every link that had opened and doubles the rings across the shoulders. "It will turn more than it did. Try not to test it on purpose."`
        : `Odd takes the ${item.name} and your ${cost} silver. The forge roars; he draws the edge out, quenches it, and tests it on a hair from his own arm. "Better," he says, handing it back. From Odd, that is a poem.`,
    );
    sim.note(`${item.name} +${temper[what]}`);
  },

  /** The Elder names a place in the wild that wants dealing with. `arg` is who is speaking. */
  bountyOffer: (sim, arg) => {
    const f = sim.state.flags;
    const who = String(arg ?? '');
    if (f['bounty.room']) {
      sim.say(sim.fill(sim.text(f['bounty.done'] ? 'bounty.remindDone' : 'bounty.remind')), who);
      return;
    }
    const n = Number(f['bounty.n'] ?? 0);
    // Each task lies further out than the last, and is somewhere still in need of it.
    const fresh = (x: number, y: number): boolean => !sim.state.rooms[wildId(x, y)]?.dead.length;
    // Further out each time at first, starting just beyond the valley; after that, anywhere in the
    // far country that still wants it.
    const edge = sim.content.frontier?.valley?.reach ?? 1;
    const ring = n < 10 ? edge + 1 + n : edge + 5 + ((n * 5) % 9);
    const found = findNear(sim.content, 0, 0, BOUNTY_KINDS, 20, ring, fresh);
    const def = found && roomOf(sim.content, wildId(found.x, found.y));
    if (!found || !def || !(def.spawns ?? []).length) {
      sim.say(sim.text('bounty.none'), who);
      return;
    }
    f['bounty.room'] = def.id;
    f['bounty.name'] = def.name;
    f['bounty.way'] = wayTo(found.x, found.y);
    f['bounty.what'] = sim.text(`bounty.what.${found.kind}`);
    f['bounty.pay'] = 25 + 15 * n;
    f.goal = def.id;
    delete f['bounty.done'];
    sim.say(sim.fill(sim.text(`bounty.offer.${found.kind}`)), who);
    f['quest:bounty'] = 0;
    sim.setQuest('bounty', 1);
    sim.note('The place is marked on your map.');
  },

  /** Called when a room is cleared: was it the one the Elder asked about? */
  bountyCheck: (sim) => {
    const f = sim.state.flags;
    if (f['bounty.room'] !== sim.state.room || f['bounty.done']) return;
    f['bounty.done'] = true;
    sim.setQuest('bounty', 2);
    sim.note("That is the Elder's work done. She will want to hear of it.");
  },

  /** The Elder pays for finished work. */
  bountyPay: (sim, arg) => {
    const f = sim.state.flags;
    const n = Number(f['bounty.n'] ?? 0);
    sim.say(sim.fill(sim.text('bounty.pay')), String(arg ?? ''));
    sim.p.gold += Number(f['bounty.pay'] ?? 0);
    sim.award(`bounty.${n}`, 5);
    sim.sound('quest');
    f['bounty.n'] = n + 1;
    for (const k of ['bounty.room', 'bounty.done', 'goal']) delete f[k];
    f['quest:bounty'] = 0;
    // The first time, something else makes itself felt: the second saga begins.
    if (n === 0 && sim.p.inv.crown && !f['quest:crown']) {
      sim.say("As you turn to go, something in your pack knocks against your hip: the Barrow-King's crown. It is cold enough to feel through the leather, and it was not so cold yesterday. Marta sees your face, and looks at the pack, and very deliberately looks away.");
      sim.setQuest('crown', 1);
    }
  },

  /** A great foe calls up the dead as he weakens: the Barrow-King from his barrow, the Cold Smith from the ice of his hall. */
  bossPhase: (sim, stage) => {
    const smith = sim.rs.actors.some((a) => a.ref === 'coldsmith');
    if (smith) sim.note(stage === 1 ? 'The Cold Smith strikes his anvil, and one of the dead steps out of the ice.' : 'The Smith strikes again. The pillars crack, and more of the dead come out.');
    else sim.note(stage === 1 ? 'The Barrow-King calls, and the dead answer.' : 'The King howls. The barrow shakes.');
    sim.spawn('wight', 60, 140);
    if (stage === 2) sim.spawn('wight', 260, 140);
  },
};
