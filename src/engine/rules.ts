// The interpreter for the small condition/effect language rooms and characters are written in.

import type { Sim, Spot } from './sim';
import type { Cond, Effect, Rule, Topic } from './types';
import { hasPerk, hostile } from './combat';
import { command } from './commands';
import { matches } from './parser';

export const questKey = (id: string): string => `quest:${id}`;

export function test(sim: Sim, c: Cond): boolean {
  const s = sim.state;
  if ('flag' in c) {
    const v = s.flags[c.flag];
    if (c.is !== undefined) return (v ?? false) === c.is;
    if (c.min !== undefined) return Number(v ?? 0) >= c.min;
    return !!v;
  }
  if ('has' in c) return (s.player.inv[c.has] ?? 0) >= (c.n ?? 1);
  if ('gold' in c) return s.player.gold >= c.gold;
  if ('near' in c) return sim.isNear(c.near, c.d);
  if ('quest' in c) {
    const stage = Number(s.flags[questKey(c.quest)] ?? 0);
    if (c.is !== undefined && stage !== c.is) return false;
    if (c.min !== undefined && stage < c.min) return false;
    if (c.max !== undefined && stage > c.max) return false;
    return true;
  }
  if ('knows' in c) return s.player.spells.includes(c.knows) || s.player.words.includes(c.knows);
  if ('skill' in c) return (s.player.skills[c.skill]?.lv ?? 0) >= c.min;
  if ('night' in c) return sim.daylight() < 0.35 === c.night;
  if ('quiet' in c) return !sim.rs.actors.some((a) => hostile(sim, a)) === c.quiet;
  if ('not' in c) return !test(sim, c.not);
  return c.any.some((x) => test(sim, x));
}

export const all = (sim: Sim, conds?: Cond[]): boolean => !conds || conds.every((c) => test(sim, c));

export function run(sim: Sim, effects: Effect[]): void {
  const s = sim.state;
  const p = s.player;
  for (const e of effects) {
    if (p.dead) return;
    if ('say' in e) sim.say(e.say);
    else if ('note' in e) sim.note(e.note);
    else if ('set' in e) s.flags[e.set] = e.to ?? true;
    else if ('add' in e) s.flags[e.add] = Number(s.flags[e.add] ?? 0) + e.n;
    else if ('give' in e) sim.give(e.give, e.n ?? 1);
    else if ('lose' in e) sim.lose(e.lose, e.n ?? 1);
    else if ('gold' in e) p.gold = Math.max(0, p.gold + e.gold);
    else if ('score' in e) sim.award(e.id, e.score);
    else if ('quest' in e) sim.setQuest(e.quest, e.stage);
    else if ('goto' in e) sim.enterRoom(e.goto, e.x, e.y, e.dir);
    else if ('die' in e) sim.die(e.die);
    else if ('teach' in e) sim.teach(e.teach);
    else if ('heal' in e) p.hp = Math.min(p.maxHp, p.hp + e.heal * (hasPerk(sim, 'hale') ? 1.5 : 1));
    else if ('hurt' in e) sim.hurt(e.hurt, e.why);
    else if ('hide' in e) sim.setThing(e.hide, false);
    else if ('show' in e) sim.setThing(e.show, true);
    else if ('spawn' in e) sim.spawn(e.spawn, e.x, e.y, e.level);
    else if ('muster' in e) sim.muster();
    else if ('sound' in e) sim.sound(e.sound);
    else if ('run' in e) sim.behaviours[e.run]?.(sim, e.arg);
    else if ('cmd' in e) command(sim, e.cmd);
    else if ('win' in e) sim.win(e.win);
    else if ('chance' in e) sim.rand() < e.chance && run(sim, e.do);
  }
}

/** The rules a command could be answered by: those whose pattern it matches, in order. */
function answering(rules: Rule[] | undefined, verb: string, nouns: string[]): Rule[] {
  return (rules ?? []).filter((r) => r.on && (typeof r.on === 'string' ? [r.on] : r.on).some((pat) => matches(pat, verb, nouns)));
}

/** Run the first rule whose pattern matches the command and whose conditions hold. */
export function fire(sim: Sim, rules: Rule[] | undefined, verb: string, nouns: string[]): boolean {
  const r = answering(rules, verb, nouns).find((r) => all(sim, r.if));
  if (r) run(sim, r.do);
  return !!r;
}

/**
 * Would this command be answered differently if the player stood nearer to something in the room?
 * If so, where to stand. Nothing is carried out: the rules are only weighed, once as things are
 * and once as if everything here were within reach.
 *
 * A command already being answered by something at hand is left alone, so that selling to the
 * smith one is standing beside is never turned into a walk across the square to somebody else.
 */
export function reach(sim: Sim, rules: Rule[] | undefined, verb: string, nouns: string[]): Spot | null {
  const cands = answering(rules, verb, nouns);
  if (!cands.length) return null;
  const weigh = (assume: boolean): { rule: Rule; hits: number; own?: Spot; passed?: Spot } | null => {
    let passed: Spot | undefined;
    try {
      for (const rule of cands) {
        sim.probe = { assume, hits: 0, misses: [] };
        const ok = all(sim, rule.if);
        const { hits, misses } = sim.probe;
        if (ok) return { rule, hits, own: misses[0], passed };
        passed ??= misses[0];
      }
      return null;
    } finally {
      sim.probe = null;
    }
  };
  const now = weigh(false);
  if (now?.hits) return null;
  const nearer = weigh(true);
  if (!nearer || nearer.rule === now?.rule) return null;
  return nearer.own ?? nearer.passed ?? null;
}

/** Say whichever branch of a topic applies. Returns false if none did, and 'brief' if it was only said in passing. */
export function speak(sim: Sim, topic: Topic, who?: string): boolean | 'brief' {
  if (typeof topic === 'string') {
    sim.say(topic, who);
    return true;
  }
  for (const branch of topic) {
    if (!all(sim, branch.if)) continue;
    sim.say(branch.say, who);
    if (branch.do) run(sim, branch.do);
    return branch.brief ? 'brief' : true;
  }
  return false;
}
