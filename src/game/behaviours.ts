// Named behaviours: the few things rooms and items need that the rule language cannot express.
// Data refers to them by name with { run: 'name' }.

import { gainSkill, hostile } from '../engine/combat';
import { cellOf, depthOf, findNear, homes, lair, parseWild, roomOf, wildId } from '../engine/frontier';
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

/** The country past the north gate, where nothing burns and the coal will not wake until the word ends. */
const STILL = ['oldroad', 'windend', 'hanging', 'hollow'];

export const behaviours: Record<string, Behaviour> = {
  /**
   * The first time the stranger has been fed at the inn, the Elder comes down to look at them:
   * unless they have been up to her hall already.
   */
  martaEnters: (sim) => {
    const f = sim.state.flags;
    if (f['marta.met']) return;
    f['marta.met'] = true;
    sim.say(
      `The door opens and lets the cold in, and the room goes quiet the way a room does for one person. The woman who comes in is tall and thin and very straight in the back, with a muffler of purple wool that is the only colour in the room. She looks at nobody but you, for long enough that you start to feel the cold again.\n\n"Who would miss you?" says Marta Coldhand.\n\nYou have no answer to that${f['sigga.met'] ? ' either' : ''}.\n\n"Good," she says. "Come up to the hall."`,
    );
    sim.setQuest('hearth', 1);
  },

  /** A guard of the north gate, knocked down, gets up again; and is the harder for it. */
  guardRises: (sim) => {
    const def = sim.content.enemies.gateguard;
    for (const a of sim.rs.actors) {
      if (a.ref !== 'gateguard' || a.act !== 'dead') continue;
      sim.rs.dead = sim.rs.dead.filter((id) => id !== a.id);
      if (sim.rs.deadAt) delete sim.rs.deadAt[a.id];
      a.ai = { lv: (a.ai.lv ?? 0) + 2 };
      a.ai.max = Math.round(def.hp * (1 + 0.25 * a.ai.lv));
      a.hp = a.ai.max;
      a.act = 'idle';
      a.t = 0;
      a.ai.stun = 40;
    }
    sim.state.flags.kills = Math.max(0, Number(sim.state.flags.kills ?? 1) - 1);
    sim.note('He goes down. Then, without hurry, he gets up again. Nobody has come to relieve him.');
  },

  /** The sun's name is said at the gate: the guards go back into their towers. */
  guardsGo: (sim) => {
    sim.rs.actors = sim.rs.actors.filter((a) => a.ref !== 'gateguard');
  },

  /** The word ends. From here the weather is only weather; how soon Hollowmere knows it depends on how the news travels. */
  winterBreaks: (sim) => {
    sim.state.flags['winter.tick'] = sim.state.tick;
    sim.p.cd = {};
  },

  /**
   * The thaw reaches Hollowmere. Whoever walks home arrives after it; whoever is carried home in a
   * breath arrives before it, and it is half a day behind them.
   */
  thawComes: (sim) => {
    const f = sim.state.flags;
    if (!f['winter.broken'] || f['thaw.home']) return;
    if (!f['coal.given'] && sim.state.tick - Number(f['winter.tick'] ?? 0) < DAY_LENGTH / 2) return;
    f['thaw.home'] = true;
    f['hall.thaw'] = true;
  },

  /** The coal has carried somebody, and wants time by a fire. */
  emberReady: (sim) => {
    sim.state.flags['ember.ready'] = sim.state.tick + DAY_LENGTH / 2;
  },

  /** Reading and deciphering teaches Lore. */
  study: (sim, arg) => gainSkill(sim, 'lore', Number(arg ?? 12)),

  /** Somebody shows the player how a thing is done. `arg` is "skill=amount" of practice. */
  practise: (sim, arg) => {
    const [skill, amount] = String(arg).split('=');
    gainSkill(sim, skill, Number(amount) || 20);
  },

  /** A lit torch sees you through a couple of minutes of darkness. */
  lightTorch: (sim) => {
    const at = cellOf(sim.content, sim.state.room);
    if (!sim.state.flags['hearth.lit'] && at && !depthOf(sim.content, at[0], at[1])) {
      sim.say('You strike a light. The torch catches; and then the flame lies down flat along the pitch, as if a wind were on it, and goes out. Nothing burns in this valley just now.');
      return;
    }
    if (STILL.includes(sim.state.room) && !sim.state.flags['winter.broken']) {
      sim.say('Nothing will burn here. The sparks hang in the air like little red seeds, and go dark where they hang.');
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
    if (STILL.includes(sim.state.room) && !f['winter.broken']) {
      sim.say('You open the horn box, afraid, and the coal in it is dull as an old eye; but there is still a coal in it. You breathe on it. Nothing. Nothing burns here, and nothing wakes. You shut the lid.');
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
    sim.enterRoom('hall', 160, 124, 'down');
    sim.say(
      f['sol.said'] && !f['thaw.home']
        ? 'You breathe on the coal. It flares; the snow, the wind and the long way back all fold up like a letter, and when you can see again you are standing on the Elder\'s hearthstone, with broth in your nose. Nothing has changed here. Weather walks; it will be a day yet before any of this has heard.'
        : 'You breathe on the coal. It flares; the snow, the cold and the long way back all fold up like a letter, and when you can see again you are standing on the Elder\'s hearthstone, with smoke and broth in your nose. The coal has gone grey. It will want a while by its own fire before it does that again.',
    );
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

  /** Odd buys back something he made. `arg` is "item=price". What is in hand comes out of it first. */
  buyBack: (sim, arg) => {
    const [id, price] = String(arg).split('=');
    const p = sim.p;
    const it = sim.content.items[id];
    if (!it || !(p.inv[id] > 0)) return;
    if (p.inv[id] === 1) {
      if (p.weapon === id) p.weapon = null;
      if (p.shield === id) p.shield = null;
      if (p.armor === id) p.armor = null;
    }
    sim.lose(id);
    p.gold += Number(price);
    sim.sound('take');
    sim.say(`Odd takes the ${it.name}, turns it over once, and grunts. "${price} silver. It will be somebody else's soon enough. Most things are."`, 'Odd the smith');
  },

  /** Fenn takes back the books that have been read: they go back on his shelf, and teach a little on the way. */
  shelve: (sim) => {
    const p = sim.p;
    const read = Object.keys(p.inv).filter((id) => {
      const it = sim.content.items[id];
      const teach = it?.use?.find((e) => 'teach' in e);
      return it?.kind === 'tome' && teach && 'teach' in teach && (p.spells.includes(teach.teach) || p.words.includes(teach.teach));
    });
    if (!read.length) {
      sim.say('"Read it first," says Fenn, without looking up. "Then bring it back. That is the whole of the arrangement."', 'Old Fenn');
      return;
    }
    for (const id of read) sim.lose(id);
    sim.sound('take');
    gainSkill(sim, 'lore', 5 * read.length);
    sim.say(
      read.length > 1
        ? 'Fenn takes the books one at a time, looks at each spine, and finds each a gap on the shelf without seeming to look for one. "A book in a pack is only a weight," he says. "A book on a shelf is a book. Come and read them again whenever you like. You will not need to. That is rather the point."'
        : 'Fenn takes the book, looks at the spine, and slides it into a gap on the shelf that you would have sworn was not there a moment ago. "A book in a pack is only a weight," he says. "A book on a shelf is a book."',
      'Old Fenn',
    );
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
    // Somewhere with something living in it by day, that nobody has been at yet.
    const fresh = (x: number, y: number): boolean =>
      !sim.state.rooms[wildId(x, y)]?.dead.length &&
      !!roomOf(sim.content, wildId(x, y))?.spawns?.some((s) => s.when !== 'night' && sim.content.enemies[s.kind]?.ai !== 'prey');
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
  },

};

