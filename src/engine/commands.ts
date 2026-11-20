// What happens to a typed line. Order: the room's own rules, then the standard behaviour of
// things, characters and items, then the game-wide rules, then a dry fallback.

import { playerAttack } from './combat';
import { parseWild, roomOf } from './frontier';
import { cast, invoke } from './magic';
import { fire, questKey, reach, run, speak, test } from './rules';
import { DAY_LENGTH, type Sim } from './sim';
import type { ActorState, CharDef, EnemyDef, ItemDef, ThingDef } from './types';

type Target =
  | { k: 'thing'; def: ThingDef }
  | { k: 'char'; def: CharDef; actor: ActorState }
  | { k: 'enemy'; def: EnemyDef; actor: ActorState }
  | { k: 'item'; def: ItemDef };

/** What a noun refers to right now: something in the room, someone in it, or something carried. */
function find(sim: Sim, noun: string): Target | null {
  const c = sim.content;
  const thing = sim.things().find((t) => t.nouns.includes(noun));
  if (thing) return { k: 'thing', def: thing };
  for (const actor of sim.rs.actors) {
    if (actor.kind === 'npc') {
      const def = c.chars[actor.ref];
      if (def?.nouns.includes(noun)) return { k: 'char', def, actor };
    } else {
      const def = c.enemies[actor.ref];
      if (def?.nouns.includes(noun) && actor.act !== 'dead') return { k: 'enemy', def, actor };
    }
  }
  const carried = Object.keys(sim.p.inv)
    .map((id) => c.items[id])
    .filter((it) => it?.nouns.includes(noun));
  // With several books in the pack, "the tome" means the one not yet read.
  const knows = (id: string): boolean => sim.p.spells.includes(id) || sim.p.words.includes(id);
  const item = carried.find((it) => it.use?.some((e) => 'teach' in e && !knows(e.teach))) ?? carried[0];
  return item ? { k: 'item', def: item } : null;
}

function nearestChar(sim: Sim): { def: CharDef; actor: ActorState } | null {
  let best: { def: CharDef; actor: ActorState } | null = null;
  let bd = Infinity;
  for (const actor of sim.rs.actors) {
    const def = sim.content.chars[actor.ref];
    if (actor.kind !== 'npc' || !def) continue;
    const d = Math.hypot(sim.p.x - actor.x, (sim.p.y - actor.y) * 2);
    if (d < bd) {
      bd = d;
      best = { def, actor };
    }
  }
  return best;
}

export function inventoryPage(sim: Sim): { title: string; lines: string[] } {
  const p = sim.p;
  const c = sim.content;
  const lines = Object.entries(p.inv).map(([id, n]) => {
    const it = c.items[id];
    const worn = p.weapon === id || p.shield === id ? ' (in hand)' : p.armor === id || p.trinket === id ? ' (worn)' : '';
    // A smith's work shows as a number after the name.
    const temper = p.weapon === id ? p.temper?.weapon : p.armor === id ? p.temper?.armor : 0;
    return `${it?.name ?? id}${temper ? ` +${temper}` : ''}${n > 1 ? ` x${n}` : ''}${worn}`;
  });
  if (!lines.length) lines.push(sim.text('emptyHanded'));
  lines.push('', `Gold: ${p.gold}`);
  return { title: 'You are carrying:', lines };
}

export function journalPage(sim: Sim): { title: string; lines: string[] } {
  const lines: string[] = [];
  // What is still to do comes first; what is finished, after.
  const known = Object.values(sim.content.quests)
    .map((q) => ({ q, stage: Number(sim.state.flags[questKey(q.id)] ?? 0) }))
    .filter((k) => k.stage > 0)
    .sort((a, b) => Number(a.stage >= a.q.done) - Number(b.stage >= b.q.done));
  for (const { q, stage } of known) lines.push(`${q.name}${stage >= q.done ? ' (done)' : ''}`, `  ${sim.fill(q.stages[stage] ?? '')}`, '');
  if (!lines.length) lines.push(sim.text('noQuests'));
  return { title: 'Journal', lines };
}

export function skillsPage(sim: Sim): { title: string; lines: string[] } {
  const p = sim.p;
  const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);
  const lines = [
    `Level ${p.level}    Score ${sim.state.score}    Day ${Math.floor(sim.state.tick / DAY_LENGTH) + 1}`,
    `Health ${Math.ceil(p.hp)}/${p.maxHp}  Mana ${Math.ceil(p.mp)}/${p.maxMp}`,
    `Stamina ${Math.ceil(p.sp)}/${p.maxSp}`,
    '',
    ...Object.entries(p.skills).map(([id, s]) => {
      // What practice will earn next, so there is something to aim at.
      const next = sim.content.perks.filter((k) => k.skill === id && k.lv > s.lv).sort((a, b) => a.lv - b.lv)[0];
      return `${cap(id).padEnd(9)}${String(s.lv).padStart(3)}${next ? `  ${next.name} at ${next.lv}` : ''}`;
    }),
  ];
  const perks = sim.content.perks.filter((k) => (p.skills[k.skill]?.lv ?? 0) >= k.lv);
  if (perks.length) lines.push('', 'Perks: ' + perks.map((k) => k.name).join(', '));
  const places = Object.keys(sim.state.flags).filter((k) => k.startsWith('seen.')).length;
  lines.push('', `Places found: ${places}   Foes felled: ${Number(sim.state.flags.kills ?? 0)}`);
  if (p.spells.length) lines.push('', 'Spells: ' + p.spells.join(', '));
  if (p.words.length) lines.push('Runewords: ' + p.words.map((w) => w.replace('word:', '').toUpperCase()).join(', '));
  return { title: 'Skills', lines };
}

const DIRS: Record<string, 'n' | 's' | 'e' | 'w'> = { north: 'n', south: 's', east: 'e', west: 'w' };

/** What lies one way from here, and a reminder of how to get there. */
function wayText(sim: Sim, dir: string): string {
  const to = sim.room.exits?.[DIRS[dir]];
  return to ? sim.text('wayTo', dir).replace('%r', roomOf(sim.content, to)?.name ?? to) : sim.text('noWay', dir);
}

/** Every way out of the room. */
function exitsText(sim: Sim): string {
  const room = sim.room;
  const parts = Object.entries(DIRS).flatMap(([name, side]) => {
    const to = room.exits?.[side];
    return to ? [`${name[0].toUpperCase()}${name.slice(1)}: ${roomOf(sim.content, to)?.name ?? to}.`] : [];
  });
  const doors = [...new Set((room.doors ?? []).map((d) => roomOf(sim.content, d.to)?.name ?? d.to))];
  if (doors.length) parts.push(`${doors.length > 1 ? 'Doors' : 'A door'} to: ${doors.join(', ')}.`);
  // Out in the wild, which way home lies is worth knowing.
  const at = parseWild(sim.state.room);
  const home = at ? ' ' + sim.text('homeWay', [at[1] > 0 ? 'north' : at[1] < 0 ? 'south' : '', at[0] > 0 ? 'west' : at[0] < 0 ? 'east' : ''].filter(Boolean).join('-')) : '';
  return `${room.name}. ${parts.join(' ') || 'There is no obvious way out.'}${home} ${sim.text('walkHint')}`;
}

const USE_VERBS: Record<string, ItemDef['kind'][]> = {
  use: ['misc', 'potion', 'tome', 'key', 'food'],
  drink: ['potion'],
  read: ['tome', 'misc'],
  eat: ['food'],
};

/**
 * Standard behaviour for common verbs. Returns false if the verb means nothing here. `afoot` is
 * the line as typed, when whoever sent it will walk the player over to what it names.
 */
function builtin(sim: Sim, verb: string, nouns: string[], afoot: string | null): boolean {
  const p = sim.p;
  const target = nouns.length ? find(sim, nouns[0]) : null;
  const needNear = (x: number, y: number, d: number): boolean => {
    if (sim.within(x, y, d)) return true;
    if (afoot) sim.approach({ x, y, d }, afoot);
    else sim.say(sim.text('notClose'));
    return false;
  };

  switch (verb) {
    case 'look': {
      const someone = nouns[0] === 'person' ? nearestChar(sim) : null;
      const outside = sim.room.scene.kind === 'outdoor';
      if (sim.isDark()) sim.say(sim.text('dark'));
      else if (!nouns.length) sim.say(sim.lookOf(sim.room));
      else if (someone) sim.say(sim.lookOf(someone.def));
      else if (DIRS[nouns[0]]) sim.say(wayText(sim, nouns[0]));
      // After dark the sky is a different thing to look at.
      else if (nouns[0] === 'sky' && outside && sim.daylight() < 0.4) sim.say(sim.text('nightSky'));
      else if (!target) sim.say(sim.text('notHere'));
      else if (target.k === 'enemy') {
        // A creature grown tougher than its kind looks it: fair warning, far from home.
        const lv = target.actor.ai.lv ?? 0;
        const size = lv >= 9 ? 'toughest' : lv >= 4 ? 'tougher' : lv >= 1 ? 'tough' : '';
        sim.say(sim.lookOf(target.def) + (size ? ' ' + sim.text(size) : ''));
      } else sim.say(sim.lookOf(target.def));
      return true;
    }
    case 'take': {
      if (!nouns.length) sim.say(sim.text('takeWhat'));
      else if (!target) sim.say(sim.text('notHere'));
      else if (target.k === 'item') sim.say(sim.text('haveIt'));
      else if (target.k !== 'thing') sim.say(sim.text('takePerson'));
      else if (!target.def.take) sim.say(sim.text('cantTake'));
      else if (needNear(target.def.x, target.def.y, target.def.reach ?? 30)) {
        sim.give(target.def.take);
        sim.setThing(target.def.id, false);
        sim.sound('take');
        sim.say(target.def.takeSay ?? sim.text('taken', sim.content.items[target.def.take]?.name ?? ''));
      }
      return true;
    }
    case 'talk':
    case 'ask': {
      // "the man", "someone": whoever is nearest.
      const anyone = nouns[0] === 'person';
      // Naming somebody who is elsewhere, as the one being addressed.
      const addressed = verb === 'talk' || nouns.length > 1;
      const away = addressed && target?.k !== 'char' && Object.values(sim.content.chars).some((ch) => ch.nouns.includes(nouns[0]));
      const who = target?.k === 'char' ? target : anyone || !target || verb === 'ask' ? nearestChar(sim) : null;
      if (away) sim.say(sim.text('personAway'));
      else if (target && target.k !== 'char' && verb === 'talk') sim.say(sim.text('talkThing'));
      else if (!who) sim.say(sim.text('talkNoOne'));
      else if (needNear(who.actor.x, who.actor.y, 48)) {
        const topic = verb === 'ask' ? nouns[target?.k === 'char' || anyone ? 1 : 0] : undefined;
        const entry = topic ? who.def.topics?.[topic] : who.def.talk;
        const said = entry ? speak(sim, entry, who.def.name) : false;
        if (!said) sim.say(who.def.shrug ?? sim.text('shrug'), who.def.name);
        if (said !== 'brief') sim.talked(who.def.id);
      }
      return true;
    }
    case 'inventory': {
      const pg = inventoryPage(sim);
      sim.page(pg.title, pg.lines);
      return true;
    }
    case 'journal': {
      const pg = journalPage(sim);
      sim.page(pg.title, pg.lines);
      return true;
    }
    case 'skills': {
      const pg = skillsPage(sim);
      sim.page(pg.title, pg.lines);
      return true;
    }
    case 'use':
    case 'drink':
    case 'read':
    case 'eat': {
      if (!nouns.length) sim.say(sim.text('useWhat'));
      else if (!target) sim.say(sim.text('notHere'));
      else if (target.k !== 'item') sim.say(sim.text('notCarried'));
      else if (!target.def.use || !USE_VERBS[verb].includes(target.def.kind)) sim.say(sim.text('cantUse'));
      else {
        const id = target.def.id;
        run(sim, target.def.use);
        if (target.def.consumed) sim.lose(id);
      }
      return true;
    }
    case 'equip': {
      if (!target || target.k !== 'item') sim.say(sim.text(nouns.length ? 'notCarried' : 'useWhat'));
      else if (target.def.kind === 'weapon' || target.def.kind === 'bow') {
        if (p.weapon && p.weapon !== target.def.id) p.other = p.weapon;
        p.weapon = target.def.id;
        sim.say(sim.text('equipped', target.def.name));
      } else if (target.def.kind === 'shield') {
        p.shield = target.def.id;
        sim.say(sim.text('equipped', target.def.name));
      } else if (target.def.kind === 'armor') {
        p.armor = target.def.id;
        sim.say(sim.text('equipped', target.def.name));
      } else if (target.def.kind === 'trinket') {
        p.trinket = target.def.id;
        sim.say(sim.text('wearing', target.def.name));
      } else sim.say(sim.text('cantEquip'));
      return true;
    }
    case 'drop':
      sim.say(sim.text('noDrop'));
      return true;
    case 'unequip':
      // Naming something worn takes off that one thing; otherwise the hands are emptied.
      if (target?.k === 'item' && (p.armor === target.def.id || p.trinket === target.def.id)) {
        if (p.armor === target.def.id) p.armor = null;
        else p.trinket = null;
        sim.say(sim.text('tookOff', target.def.name));
      } else if (!p.weapon && !p.shield) sim.say(sim.text('handsEmpty'));
      else {
        p.weapon = p.shield = null;
        sim.say(sim.text('unequipped'));
      }
      return true;
    case 'swap': {
      // Blade for bow and back again, without having to name either.
      const carried = (id: string | null | undefined): id is string => !!id && (p.inv[id] ?? 0) > 0;
      const next = carried(p.other) ? p.other : Object.keys(p.inv).find((id) => id !== p.weapon && ['weapon', 'bow'].includes(sim.content.items[id]?.kind ?? ''));
      if (!next) sim.say(sim.text('noSwap'));
      else {
        p.other = p.weapon;
        p.weapon = next;
        sim.note(sim.text('equipped', sim.content.items[next].name));
      }
      return true;
    }
    case 'exits':
      sim.say(exitsText(sim));
      return true;
    case 'map':
      sim.showMap();
      return true;
    case 'deeds': {
      const done = (sim.content.deeds ?? []).filter((d) => !d.if || d.if.every((c) => test(sim, c))).map((d) => sim.fill(d.text));
      sim.page('Deeds', done.length ? done : [sim.text('noDeeds')]);
      return true;
    }
    case 'time': {
      const light = sim.daylight();
      const waning = sim.daylight() > 0 && light < 1 && ((sim.state.tick + DAY_LENGTH * 0.12) % DAY_LENGTH) / DAY_LENGTH < 0.8;
      sim.say(sim.text(light >= 1 ? 'timeDay' : light <= 0 ? 'timeNight' : waning ? 'timeDusk' : 'timeDawn'));
      return true;
    }
    case 'enter':
      if (!DIRS[nouns[0]]) return false;
      sim.say(wayText(sim, nouns[0]));
      return true;
    case 'think': {
      // A nudge: whatever the journal says is next.
      const open = Object.values(sim.content.quests)
        .map((q) => ({ q, stage: Number(sim.state.flags[questKey(q.id)] ?? 0) }))
        .filter(({ q, stage }) => stage > 0 && stage < q.done);
      const idle = (sim.content.hints ?? []).find((h) => !h.if || h.if.every((c) => test(sim, c)))?.text ?? sim.text('noHint');
      // And whatever is within arm's reach right now, as things that could be typed.
      const here: string[] = [];
      const who = nearestChar(sim);
      if (who && sim.within(who.actor.x, who.actor.y, 48)) here.push(`TALK TO ${who.def.nouns[0].toUpperCase()}`);
      if (!sim.isDark())
        for (const t of sim.things()) {
          if (!sim.within(t.x, t.y, t.reach ?? 30) || (t.reach ?? 30) > 100) continue;
          if (t.take) here.push(`TAKE ${t.nouns[0].toUpperCase()}`);
          for (const line of t.try ?? []) here.push(line.toUpperCase());
        }
      const near = here.length ? `\n\n${sim.text('couldDo')} ${[...new Set(here)].slice(0, 4).join(', ')}.` : '';
      sim.say((open.length ? open.map(({ q, stage }) => `${q.name}: ${sim.fill(q.stages[stage])}`).join('\n\n') : idle) + near);
      return true;
    }
    case 'cast':
      cast(sim, nouns[0]);
      return true;
    case 'shoot': {
      const w = p.weapon ? sim.content.items[p.weapon] : null;
      if (w?.kind === 'bow') playerAttack(sim);
      else sim.say(sim.text('noBow'));
      return true;
    }
    case 'attack':
      // Typing it works too, though Ctrl is quicker.
      if (!sim.rs.actors.some((a) => a.kind === 'enemy' && a.act !== 'dead')) return false;
      playerAttack(sim);
      return true;
    default:
      return false;
  }
}

/** Verbs that can carry a runeword: "say veth". */
const SPEAKING = ['say', 'shout', 'talk', 'cast', 'sing'];

/** Debug commands, available only in dev builds. They start with a slash. */
function devCommand(sim: Sim, line: string): boolean {
  const [cmd, a, b] = line.trim().split(/\s+/);
  if (!cmd.startsWith('/')) return false;
  if (cmd === '/tp' && roomOf(sim.content, a)) {
    const sc = sim.scene(a);
    sim.enterRoom(a, 160, Math.round((sc.walkTop + 168) / 2));
    return true;
  }
  if (cmd === '/give' && sim.content.items[a]) {
    sim.give(a, Number(b) || 1);
    sim.say(`[dev] ${a}`);
    return true;
  }
  if (cmd === '/set' && a) {
    sim.state.flags[a] = b === undefined ? true : isNaN(Number(b)) ? b : Number(b);
    sim.say(`[dev] ${a} = ${sim.state.flags[a]}`);
    return true;
  }
  if (cmd === '/pos') {
    sim.say(`[dev] ${sim.state.room} ${sim.p.x},${sim.p.y}`);
    return true;
  }
  return false;
}

/** Does what the player can see or read here use this word? Then it is scenery, not nonsense. */
function mentioned(sim: Sim, word: string): boolean {
  if (word.length < 3 || sim.isDark()) return false;
  const stem = word.replace(/(es|s)$/, '');
  const texts = [sim.lookOf(sim.room), sim.room.name, ...sim.things().map((t) => sim.lookOf(t))].join(' ').toLowerCase();
  return new RegExp(`\\b${stem}(s|es)?\\b`).test(texts);
}

/** Is the line a look of some kind, or a bare word? */
function looking(sim: Sim, line: string): boolean {
  const words = line.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(' ').filter(Boolean);
  const verb = sim.parser.verbOf(words.slice(0, 2).join(' ')) ?? sim.parser.verbOf(words[0] ?? '');
  return verb === 'look' || !verb;
}

/**
 * Carry out a typed line. With `afoot`, a line that would only be told its object is too far
 * away asks to be walked there instead (see Sim.approach). Looking is always done from where
 * one stands.
 */
export function command(sim: Sim, line: string, afoot = false): void {
  if (sim.dev && devCommand(sim, line)) return;
  const r = sim.parser.parse(line);
  if (!r.ok) {
    if (r.why === 'unknown') sim.say(mentioned(sim, r.word) ? sim.text(looking(sim, line) ? 'nothingSpecial' : 'scenery', r.word) : sim.text('unknownWord', r.word));
    else if (r.why === 'noverb') sim.say(DIRS[r.nouns[0]] ? wayText(sim, r.nouns[0]) : sim.text('noVerb'));
    return;
  }
  const { verb, nouns } = r;
  // A runeword does its work first; the room may then react to having heard it. It can be typed
  // bare ("veth") or spoken ("say veth", "shout veth").
  const words = Object.values(sim.content.words);
  const word = words.find((w) => w.verb === verb) ?? (SPEAKING.includes(verb) && nouns.length === 1 ? words.find((w) => w.verb === nouns[0]) : undefined);
  if (word) {
    if (invoke(sim, word)) fire(sim, sim.room.rules, word.verb, []) || sim.note(`${word.verb.toUpperCase()}!`);
    return;
  }
  const walk = afoot && verb !== 'look';
  const nearer = (rules: typeof sim.room.rules): boolean => {
    const at = walk ? reach(sim, rules, verb, nouns) : null;
    if (at) sim.approach(at, line);
    return !!at;
  };
  if (nearer(sim.room.rules) || fire(sim, sim.room.rules, verb, nouns)) return;
  if (builtin(sim, verb, nouns, walk ? line : null)) return;
  if (nearer(sim.content.rules) || fire(sim, sim.content.rules, verb, nouns)) return;
  const fb = sim.content.fallbacks;
  sim.say(fb[Math.floor(sim.rand() * fb.length)] ?? '...');
}
