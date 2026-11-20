// QA tool: plays the game in text, with no browser and no pictures.
//
//   npm run play -- :new                         start a new game, forgetting the old one
//   npm run play -- look "talk to sigga"         type lines, as a player would
//   npm run play -- ":go sigga" ":pick 2"        walk to someone, then choose the second row of a menu
//   npm run play -- ":go north"                  walk off the north edge of the picture
//   npm run play -- :fight                       fight whatever is hostile here until it or you are down
//
// Anything that does not begin with a colon is typed and sent. Message boxes are printed and
// answered for you; a menu is printed and waits for :pick N (or :esc). After the last command
// the tool says where you are, how you are, and what is about.
//
// Other commands: :walk <north|south|east|west> <ticks>, :go <x> <y>, :hit [times], :guard <ticks>,
// :wait <ticks>, :status. Twenty ticks are one second.
//
// The game in progress is kept as the list of everything typed so far (--session <file>, by
// default under node_modules/.cache). The simulation is deterministic, so each run replays that
// list silently and then carries on.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { hostile } from '../src/engine/combat';
import { roomOf } from '../src/engine/frontier';
import { PH, PW } from '../src/engine/scene';
import { Shell } from '../src/engine/shell';
import type { ActorState } from '../src/engine/types';
import { behaviours } from '../src/game/behaviours';
import { content } from '../src/game/content';

const DIRS: Record<string, [string, number, number]> = {
  north: ['ArrowUp', 0, -1], south: ['ArrowDown', 0, 1], east: ['ArrowRight', 1, 0], west: ['ArrowLeft', -1, 0],
  n: ['ArrowUp', 0, -1], s: ['ArrowDown', 0, 1], e: ['ArrowRight', 1, 0], w: ['ArrowLeft', -1, 0],
  up: ['ArrowUp', 0, -1], down: ['ArrowDown', 0, 1], right: ['ArrowRight', 1, 0], left: ['ArrowLeft', -1, 0],
};

class Play {
  shell: Shell;
  out: string[] = [];
  private lastNote = '';

  constructor() {
    const mem = new Map<string, string>();
    this.shell = new Shell(content, { get: (k) => mem.get(k) ?? null, set: (k, v) => void mem.set(k, v) }, false, behaviours);
    this.shell.startHint = '';
    this.shell.showTitle();
    this.shell.keyDown('Enter');
    this.settle();
  }

  private get sim() {
    return this.shell.sim;
  }

  private say(line: string): void {
    this.out.push(line);
  }

  /** Print and answer message boxes until the game is waiting on the player: for a menu, or for nothing. */
  private settle(): void {
    // A long page comes as several boxes, wrapped for a narrow one: it is gathered and said in whole lines.
    let title = '';
    let lines: string[] = [];
    const flush = (): void => {
      if (!title) return;
      const out: string[] = [];
      for (const l of lines) {
        const prev = out[out.length - 1];
        const prose = (t: string): boolean => t.length > 0 && !/ {2}/.test(t.trim());
        if (prev !== undefined && prose(prev) && prose(l) && prev.length >= 20) out[out.length - 1] = `${prev} ${l}`;
        else out.push(l);
      }
      this.say(`-- ${title} --\n${out.join('\n')}`);
      title = '';
      lines = [];
    };
    for (let quiet = 0, guard = 0; quiet < 3 && guard < 1200; guard++) {
      const m = this.shell.modal;
      if (m?.k === 'page') {
        if (m.title !== title) flush();
        title = m.title;
        lines.push(...m.lines);
        this.shell.keyDown('Enter');
        quiet = 0;
        continue;
      }
      flush();
      if (m?.k === 'msg') {
        this.say(m.text);
        this.shell.keyDown('Enter');
        quiet = 0;
      } else if (m?.k === 'map') {
        this.say(this.mapText());
        this.shell.keyDown('Escape');
        quiet = 0;
      } else if (m?.k === 'list') {
        this.say([`MENU: ${m.title}`, ...m.items.map((it, i) => `  ${i + 1}. ${it}`), m.cancel ? '(:pick N to choose, :esc to close)' : '(:pick N to choose)'].join('\n'));
        return;
      } else {
        this.shell.tick();
        // A typed line may first walk the player over to what it names; that is not yet an answer.
        if (!this.shell.busy) quiet++;
      }
      this.note();
    }
    flush();
  }

  /** A passing remark under the picture, said once. */
  private note(): void {
    const n = this.shell.noteText;
    if (n && n !== this.lastNote && n !== this.sim.room.name) this.say(`(${n})`);
    this.lastNote = n;
  }

  private mapText(): string {
    const grid = content.frontier?.grid ?? {};
    const at = (id: string): [number, number] | null => grid[id] ?? (/^wild_(-?\d+)_(-?\d+)$/.exec(id)?.slice(1).map(Number) as [number, number] | undefined) ?? null;
    const here = at(this.sim.state.room);
    const rows = Object.keys(this.sim.state.rooms)
      .map((id) => ({ id, pos: at(id), name: roomOf(content, id)?.name ?? id }))
      .filter((r) => r.pos)
      .map((r) => `  ${r.name}: ${Math.abs(r.pos![0])} ${r.pos![0] < 0 ? 'west' : 'east'}, ${Math.abs(r.pos![1])} ${r.pos![1] < 0 ? 'north' : 'south'} of Hollowmere${r.id === this.sim.state.room ? '  <- you are here' : ''}`);
    return ['-- The country so far (screens from Hollowmere) --', ...(rows.length ? rows : ['  Nowhere yet.']), here ? '' : '  You are indoors.'].join('\n').trimEnd();
  }

  private blockedByMenu(): boolean {
    if (this.shell.modal?.k !== 'list') return false;
    this.say('A menu is open. Answer it with :pick N' + (this.shell.modal.cancel ? ', or close it with :esc.' : '.'));
    return true;
  }

  /** Run ticks until one of: a box opens, the room changes, the player dies, or `done` says so. */
  private run(max: number, done: () => boolean = () => false, each: () => void = () => {}): number {
    const room = this.sim.state.room;
    let t = 0;
    for (; t < max; t++) {
      if (this.shell.modal || this.sim.state.room !== room || this.sim.p.dead || done()) break;
      each();
      this.shell.tick();
      this.note();
    }
    return t;
  }

  private foes(): ActorState[] {
    return this.sim.rs.actors.filter((a) => a.act !== 'dead' && hostile(this.sim, a));
  }

  private walkUntilStill(max = 700): void {
    const p = this.sim.p;
    let still = 0;
    let [lx, ly] = [p.x, p.y];
    this.run(max, () => still > 8, () => {
      still = p.x === lx && p.y === ly ? still + 1 : 0;
      [lx, ly] = [p.x, p.y];
    });
  }

  /** Where a name in the room is: a way out, a door, a person, or a thing. */
  private find(name: string): { x: number; y: number; what: string } | null {
    const sim = this.sim;
    const want = name.toLowerCase();
    const sc = sim.scene();
    const p = sim.p;
    if (DIRS[want]) {
      const [, dx, dy] = DIRS[want];
      return { x: dx < 0 ? 2 : dx > 0 ? PW - 3 : Math.round(p.x), y: dy < 0 ? sc.walkTop + 1 : dy > 0 ? PH - 3 : Math.round(p.y), what: `the ${want} edge` };
    }
    for (const d of sim.room.doors ?? []) {
      const to = roomOf(content, d.to);
      if (d.to.toLowerCase() === want || to?.name.toLowerCase().includes(want)) return { x: Math.round((d.x0 + d.x1) / 2), y: Math.round((d.y0 + d.y1) / 2), what: `the way to ${to?.name ?? d.to}` };
    }
    for (const a of sim.rs.actors) {
      if (a.act === 'dead') continue;
      const def = a.kind === 'npc' ? content.chars[a.ref] : content.enemies[a.ref];
      const names = [a.ref, def?.name ?? '', ...(def?.nouns ?? [])].map((s) => s.toLowerCase());
      if (names.some((n) => n === want || n.split(' ').includes(want))) return { x: a.x + (p.x < a.x ? -14 : 14), y: a.y, what: def?.name ?? a.ref };
    }
    for (const t of sim.things()) if (t.id.toLowerCase() === want || t.nouns.some((n) => n.toLowerCase() === want)) return { x: t.x, y: t.y + 4, what: `the ${t.nouns[0]}` };
    return null;
  }

  private fight(): void {
    const sim = this.sim;
    const shell = this.shell;
    if (!this.foes().length) return void this.say('Nothing here wants a fight.');
    const start = sim.state.room;
    let guarding = false;
    const guard = (on: boolean): void => {
      if (on !== guarding) (on ? shell.keyDown('Shift') : shell.keyUp('Shift'), (guarding = on));
    };
    let t = 0;
    for (; t < 4000; t++) {
      // Boxes that open mid-fight (a blow explained, a level gained) are read out; a menu stops the fight.
      if (shell.modal) {
        guard(false);
        this.settle();
        if (shell.modal) break;
      }
      const p = sim.p;
      const foes = this.foes();
      if (p.dead || !foes.length || sim.state.room !== start) break;
      if (p.hp < p.maxHp * 0.4 && p.inv.potion) shell.submit('drink potion');
      const e = foes.reduce((a, b) => (Math.hypot(a.x - p.x, (a.y - p.y) * 2) < Math.hypot(b.x - p.x, (b.y - p.y) * 2) ? a : b));
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const near = Math.abs(dx) < 26 && Math.abs(dy) <= 7;
      const facing = (dx > 0 && p.dir === 'right') || (dx < 0 && p.dir === 'left');
      // A blow is coming: raise the guard as it shows, as the game teaches.
      if (near && facing && e.ai.wind && p.act !== 'swing' && p.sp > 4) {
        guard(true);
      } else if (near && Math.abs(dx) > 4) {
        guard(false);
        if (!facing) {
          const key = dx > 0 ? 'ArrowRight' : 'ArrowLeft';
          shell.keyDown(key);
          shell.tick();
          shell.keyUp(key);
          continue;
        }
        if (p.act !== 'swing') shell.keyDown('Control');
      } else if (t % 6 === 0) {
        guard(false);
        shell.walkTo(Math.round(e.x + (dx >= 0 ? -15 : 15)), Math.round(e.y));
      }
      shell.tick();
      this.note();
    }
    guard(false);
    shell.keyUp('Control');
    this.settle();
    const p = sim.p;
    if (p.dead) this.say('You lost the fight.');
    else if (sim.state.room !== start) this.say('The fight carried you out of the room.');
    else if (!this.foes().length) this.say(`The fight is over after ${Math.round(t / 20)} seconds. You have ${Math.ceil(p.hp)} of ${p.maxHp} health left.`);
    else this.say('The fight is not over.');
  }

  /** One command. Returns false if it was not understood. */
  do(cmd: string): boolean {
    const from = this.sim.state.room;
    const ok = this.act(cmd);
    if (this.sim.state.room !== from) this.say(`You are now at: ${this.sim.room.name}.`);
    return ok;
  }

  private act(cmd: string): boolean {
    const shell = this.shell;
    const sim = this.sim;
    if (!cmd.startsWith(':')) {
      if (this.blockedByMenu()) return true;
      shell.submit(cmd);
      shell.tick();
      this.settle();
      return true;
    }
    const [verb, ...args] = cmd.slice(1).trim().split(/\s+/);
    const n = (i: number, d: number): number => (Number.isFinite(Number(args[i])) && args[i] !== undefined ? Math.max(1, Math.min(2000, Number(args[i]))) : d);
    if (verb === 'pick') {
      const m = shell.modal;
      if (m?.k !== 'list') {
        this.say('No menu is open.');
        return true;
      }
      const i = Number(args[0]) - 1;
      if (!(i >= 0 && i < m.items.length)) {
        this.say(`Pick a row from 1 to ${m.items.length}.`);
        return true;
      }
      m.sel = i;
      shell.keyDown('Enter');
      this.settle();
    } else if (verb === 'esc') {
      shell.keyDown('Escape');
      this.settle();
    } else if (verb === 'status') {
      // The status is printed after the last command in any case.
    } else if (this.blockedByMenu()) {
      // Nothing else can be done while a menu waits.
    } else if (verb === 'walk') {
      const d = DIRS[(args[0] ?? '').toLowerCase()];
      if (!d) return false;
      shell.keyDown(d[0]);
      this.run(n(1, 20));
      shell.keyUp(d[0]);
      this.settle();
    } else if (verb === 'go') {
      const xy = args.length === 2 && args.every((a) => Number.isFinite(Number(a)));
      const at = xy ? { x: Number(args[0]), y: Number(args[1]), what: `(${args[0]}, ${args[1]})` } : this.find(args.join(' '));
      if (!at) {
        this.say(`There is no "${args.join(' ')}" here to walk to. The status lists what is.`);
        return true;
      }
      const from = sim.state.room;
      // Only a way out is meant to walk off the picture: anything else is kept clear of its edges.
      const edge = !xy && !!DIRS[args.join(' ').toLowerCase()];
      const top = sim.scene().walkTop;
      const [gx, gy] = edge ? [at.x, at.y] : [Math.max(13, Math.min(PW - 14, at.x)), Math.max(top + 4, Math.min(PH - 8, at.y))];
      shell.walkTo(Math.round(gx), Math.round(gy));
      this.walkUntilStill();
      this.settle();
      if (sim.state.room === from && !sim.p.dead) this.say(`You walk toward ${at.what} and stop at (${Math.round(sim.p.x)}, ${Math.round(sim.p.y)}).`);
    } else if (verb === 'hit') {
      for (let i = 0; i < n(0, 1) && !shell.modal && !sim.p.dead; i++) {
        shell.keyDown('Control');
        this.run(12);
      }
      this.settle();
    } else if (verb === 'guard') {
      shell.keyDown('Shift');
      this.run(n(0, 20));
      shell.keyUp('Shift');
      this.settle();
    } else if (verb === 'wait') {
      this.run(n(0, 20));
      this.settle();
    } else if (verb === 'fight') {
      this.fight();
    } else return false;
    return true;
  }

  status(): string {
    const sim = this.sim;
    const p = sim.p;
    const c = content;
    const at = (x: number, y: number): string => `(${Math.round(x)}, ${Math.round(y)})`;
    const lines: string[] = [];
    const light = sim.room.scene.kind === 'outdoor' ? (sim.daylight() < 0.3 ? 'night' : sim.daylight() < 0.6 ? 'dusk or dawn' : 'day') : 'indoors';
    lines.push(`== ${sim.room.name} ==  ${light}${sim.isDark() ? ', and too dark to see' : ''}`);
    lines.push(`Health ${Math.ceil(p.hp)}/${p.maxHp}  Mana ${Math.floor(p.mp)}/${p.maxMp}  Stamina ${Math.floor(p.sp)}/${p.maxSp}  |  ${p.gold} silver  |  score ${sim.state.score}  |  level ${p.level}`);
    const held = [p.weapon, p.shield].filter(Boolean).map((id) => c.items[id!]?.name ?? id);
    const worn = [p.armor, p.trinket].filter(Boolean).map((id) => c.items[id!]?.name ?? id);
    lines.push(`You stand at ${at(p.x, p.y)}, facing ${p.dir}. In hand: ${held.join(' and ') || 'nothing'}.${worn.length ? ` Wearing: ${worn.join(' and ')}.` : ''}${p.dead ? '  YOU ARE DEAD.' : ''}`);
    if (p.words.length || p.spells.length) lines.push(`Words: ${p.words.map((w) => w.replace('word:', '').toUpperCase()).join(', ') || 'none'}.  Spells: ${p.spells.join(', ') || 'none'}.`);
    const folk = sim.rs.actors.filter((a) => a.kind === 'npc' && c.chars[a.ref]);
    if (folk.length) lines.push(`People: ${folk.map((a) => `${c.chars[a.ref].name ?? a.ref} at ${at(a.x, a.y)}`).join('; ')}.`);
    const others = sim.rs.actors.filter((a) => a.kind === 'enemy' && a.act !== 'dead');
    if (others.length) lines.push(`Creatures: ${others.map((a) => `${c.enemies[a.ref]?.name ?? a.ref} at ${at(a.x, a.y)}, ${hostile(sim, a) ? 'hostile' : 'not hostile'}, health ${Math.ceil(a.hp)}`).join('; ')}.`);
    if (!sim.isDark()) {
      const things = sim.things();
      const near = things.filter((t) => (t.reach ?? 30) < 200);
      const far = things.filter((t) => (t.reach ?? 30) >= 200);
      if (near.length) lines.push(`Things: ${near.map((t) => `${t.nouns[0]} at ${at(t.x, t.y)}`).join('; ')}.`);
      if (far.length) lines.push(`Also in view: ${[...new Set(far.map((t) => t.nouns[0]))].join(', ')}.`);
    }
    const ways = [
      ...Object.entries(sim.room.exits ?? {}).map(([d, id]) => `${{ n: 'north', s: 'south', e: 'east', w: 'west' }[d] ?? d} to ${roomOf(c, id as string)?.name ?? id}`),
      ...(sim.room.doors ?? []).map((d) => `a door to ${roomOf(c, d.to)?.name ?? d.to}`),
    ];
    if (ways.length) lines.push(`Ways out: ${ways.join('; ')}. (EXITS says more.)`);
    const offers = this.shell.suggest();
    if (offers.length) lines.push(`The game offers: ${offers.map((o) => o.label).join(' | ')}.`);
    return lines.join('\n');
  }
}

function main(): void {
  const args = process.argv.slice(2);
  let file = 'node_modules/.cache/thanes-quest/play-session.json';
  const cmds: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--session') file = args[++i];
    else cmds.push(args[i]);
  }
  if (!cmds.length) {
    console.log('usage: play [--session file] <line or :command>...   (see the top of tools/play.ts)');
    return;
  }
  let past: string[] = [];
  if (cmds[0] === ':new') cmds.shift();
  else if (existsSync(file)) past = (JSON.parse(readFileSync(file, 'utf8')) as { inputs: string[] }).inputs;
  const play = new Play();
  for (const c of past) play.do(c);
  // Everything up to here has been seen before; only what follows is new.
  const opening = past.length ? [] : play.out.slice();
  play.out = [];
  const kept: string[] = [];
  const said: string[] = [...opening];
  for (const c of cmds) {
    play.out = [];
    const ok = play.do(c);
    said.push(`> ${c}`, ...(ok ? play.out : [`Not understood: ${c}. Lines to type need no colon; commands are listed at the top of tools/play.ts.`]));
    if (ok) kept.push(c);
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ inputs: [...past, ...kept] }));
  console.log([...said, '', play.status()].join('\n'));
}

main();
