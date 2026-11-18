import { PH, PW } from '../src/engine/scene';
import { roomOf } from '../src/engine/frontier';
import { Sim } from '../src/engine/sim';
import type { ActorState, Intent, SimEvent } from '../src/engine/types';
import { behaviours } from '../src/game/behaviours';
import { content } from '../src/game/content';

export const says = (ev: SimEvent[]): string[] => ev.flatMap((e) => (e.t === 'say' ? [e.text] : []));

/** A new game, optionally dropped straight into a room. */
export function game(room?: string, x = 160, y = 140): Sim {
  const sim = new Sim(content, { behaviours });
  if (room) sim.enterRoom(room, x, y);
  sim.drain();
  return sim;
}

/** Send one typed line and return what was said back. */
export function type(sim: Sim, line: string): string[] {
  sim.drain();
  sim.step([{ t: 'say', line }]);
  return says(sim.drain());
}

/** Hold a direction for a number of ticks. */
export function walk(sim: Sim, dx: number, dy: number, ticks: number): void {
  sim.step([{ t: 'move', dx, dy }]);
  for (let i = 1; i < ticks; i++) sim.step();
  sim.step([{ t: 'move', dx: 0, dy: 0 }]);
}

const EDGE = 6;

/**
 * A player made of code: finds its way round obstacles, fights what attacks it, and types
 * commands. It only ever sends the same intents a keyboard would.
 */
export class Bot {
  log: string[] = [];
  /** Lowest health seen in each room, for judging difficulty. */
  minHp: Record<string, number> = {};
  /** If set, the game is saved and restored (through text, as a real save is) every this many ticks. */
  reloadEvery = 0;
  /** Ticks of dithering after each swing, to stand in for a player who is not quick. */
  sloth = 0;
  private dither = 0;
  constructor(readonly sim: Sim) {}

  get p() {
    return this.sim.p;
  }

  step(intents: Intent[] = []): void {
    const sim = this.sim;
    if (sim.p.pendingLevels > 0) intents = [...intents, { t: 'level', pool: 'hp' }];
    sim.step(intents);
    if (this.reloadEvery && sim.state.tick % this.reloadEvery === 0 && !sim.p.dead) sim.adopt(JSON.parse(JSON.stringify(sim.state)));
    this.minHp[sim.state.room] = Math.min(this.minHp[sim.state.room] ?? Infinity, Math.round(sim.p.hp));
    for (const e of sim.drain()) {
      if (e.t === 'say') this.log.push(e.text);
      if (e.t === 'died') throw new Error(`The bot died in ${sim.state.room} at tick ${sim.state.tick}: ${e.text}`);
    }
  }

  /** Type a line; returns everything said in reply. */
  say(line: string): string {
    const from = this.log.length;
    this.step([{ t: 'say', line }]);
    return this.log.slice(from).join(' | ');
  }

  private free(x: number, y: number): boolean {
    const sc = this.sim.scene();
    if (x < EDGE || x > PW - 1 - EDGE || y <= sc.walkTop || y >= PH - 2) return false;
    return !sc.blocked(x, y) && !sc.blocked(x - 4, y) && !sc.blocked(x + 4, y);
  }

  /** Breadth-first search over the walkable ground. Trigger zones are avoided unless aimed for. */
  private route(goal: (x: number, y: number) => boolean, avoidZones = true): [number, number][] | null {
    const room = this.sim.room;
    const zones = avoidZones ? [...(room.doors ?? []), ...(room.zones ?? [])] : [];
    const inZone = (x: number, y: number): boolean => zones.some((z) => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1);
    const sx = Math.round(this.p.x);
    const sy = Math.round(this.p.y);
    const key = (x: number, y: number): number => y * 512 + x;
    const prev = new Map<number, number>([[key(sx, sy), -1]]);
    const queue: [number, number][] = [[sx, sy]];
    for (let head = 0; head < queue.length; head++) {
      const [x, y] = queue[head];
      if (goal(x, y)) {
        const path: [number, number][] = [];
        let k = key(x, y);
        while (prev.get(k) !== -1) {
          const pk = prev.get(k)!;
          path.push([Math.sign((k % 512) - (pk % 512)), Math.sign(Math.floor(k / 512) - Math.floor(pk / 512))]);
          k = pk;
        }
        return path.reverse();
      }
      for (const [dx, dy] of [[2, 0], [-2, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        const nk = key(nx, ny);
        if (prev.has(nk) || !this.free(nx, ny)) continue;
        if (inZone(nx, ny) && !goal(nx, ny)) continue;
        prev.set(nk, key(x, y));
        queue.push([nx, ny]);
      }
    }
    return null;
  }

  private follow(path: [number, number][], limit = Infinity): void {
    const room = this.sim.state.room;
    while (this.p.act === 'swing') this.step();
    let last: [number, number] = [9, 9];
    for (const [dx, dy] of path.slice(0, limit)) {
      this.step(dx === last[0] && dy === last[1] ? [] : [{ t: 'move', dx, dy }]);
      last = [dx, dy];
      if (this.sim.state.room !== room) break;
    }
    this.step([{ t: 'move', dx: 0, dy: 0 }]);
  }

  /** Walk to within `tol` of a point. */
  walkTo(x: number, y: number, tol = 8): void {
    const there = (px: number, py: number): boolean => Math.hypot(px - x, (py - y) * 2) <= tol;
    // Re-plan until arrived: a swing in progress or a shove can throw a step away.
    for (let tries = 0; tries < 20 && !there(this.p.x, this.p.y); tries++) {
      const path = this.route(there);
      if (!path) throw new Error(`No way to ${x},${y} in ${this.sim.state.room} from ${this.p.x},${this.p.y}`);
      this.follow(path);
    }
    if (!there(this.p.x, this.p.y)) throw new Error(`Never arrived at ${x},${y} in ${this.sim.state.room}`);
  }

  /** Walk up to somebody, wherever they have wandered to. */
  meet(char: string): void {
    const who = this.sim.rs.actors.find((a) => a.ref === char);
    if (!who) throw new Error(`${char} is not in ${this.sim.state.room}`);
    this.walkTo(Math.round(who.x), Math.round(who.y) + 4, 26);
  }

  /** Walk off an edge into the next room. */
  exit(side: 'n' | 's' | 'e' | 'w'): void {
    const sc = this.sim.scene();
    const room = this.sim.state.room;
    const at = { w: (x: number) => x <= EDGE + 1, e: (x: number) => x >= PW - 2 - EDGE, n: (_: number, y: number) => y <= sc.walkTop + 1, s: (_: number, y: number) => y >= PH - 3 }[side];
    const path = this.route(at);
    if (!path) throw new Error(`No way to the ${side} edge of ${room}`);
    this.follow(path);
    const [dx, dy] = { w: [-1, 0], e: [1, 0], n: [0, -1], s: [0, 1] }[side];
    this.step([{ t: 'move', dx, dy }]);
    for (let i = 0; i < 6 && this.sim.state.room === room; i++) this.step();
    this.step([{ t: 'move', dx: 0, dy: 0 }]);
    if (this.sim.state.room === room) throw new Error(`Could not leave ${room} by the ${side} edge`);
  }

  /**
   * Walk across country to another outdoor room, fighting whatever is met on the way. The route
   * is worked out from the rooms' exits, as a player would from the map.
   */
  travel(to: string): void {
    const c = this.sim.content;
    type Side = 'n' | 's' | 'e' | 'w';
    for (let hops = 0; hops < 60 && this.sim.state.room !== to; hops++) {
      const from = this.sim.state.room;
      const prev = new Map<string, [string, Side] | null>([[from, null]]);
      const queue = [from];
      for (let head = 0; head < queue.length && !prev.has(to) && queue.length < 4000; head++) {
        const at = queue[head];
        for (const [side, next] of Object.entries(roomOf(c, at)?.exits ?? {}) as [Side, string][]) {
          if (prev.has(next)) continue;
          prev.set(next, [at, side]);
          queue.push(next);
        }
      }
      if (!prev.has(to)) throw new Error(`No route from ${from} to ${to}`);
      let step = prev.get(to)!;
      while (step && step[0] !== from) step = prev.get(step[0])!;
      this.fight();
      this.rest();
      this.exit(step![1]);
      this.fight();
    }
    this.rest();
    if (this.sim.state.room !== to) throw new Error(`Never reached ${to}`);
  }

  /** Catch breath between fights: mend what magic will mend, and wait out the rest. */
  rest(): void {
    for (let t = 0; t < 6000 && this.p.hp < this.p.maxHp * 0.75; t++) {
      if (this.p.spells.includes('mend') && this.p.mp >= 8) this.say('cast mend');
      else this.step();
    }
  }

  /** Walk through the door that leads to a room. */
  door(to: string): void {
    const room = this.sim.state.room;
    const d = (this.sim.room.doors ?? []).find((k) => k.to === to);
    if (!d) throw new Error(`${room} has no door to ${to}`);
    const path = this.route((x, y) => x >= d.x0 && x <= d.x1 && y >= d.y0 && y <= d.y1, false);
    if (!path) throw new Error(`No way to the door to ${to} in ${room}`);
    this.follow(path);
    this.step();
    if (this.sim.state.room !== to) throw new Error(`The door to ${to} did not open: ${this.log[this.log.length - 1]}`);
  }

  private foes(): ActorState[] {
    // Game that only runs away is not worth the chase.
    return this.sim.rs.actors.filter((a) => a.kind === 'enemy' && a.act !== 'dead' && this.sim.content.enemies[a.ref]?.ai !== 'prey');
  }

  /** Fight until nothing in the room is left standing. */
  fight(maxTicks = 6000): void {
    const sim = this.sim;
    for (let t = 0; t < maxTicks; t++) {
      // Looked up afresh each time: a restored game is a new set of objects.
      const p = this.p;
      const foes = this.foes();
      if (!foes.length) {
        this.step([{ t: 'move', dx: 0, dy: 0 }]);
        return;
      }
      if (p.hp < 18 && p.inv.potion) this.say('drink potion');
      else if (p.hp < 18 && p.spells.includes('mend') && p.mp >= 8) this.say('cast mend');
      if (foes.length > 1 && p.words.includes('word:iska') && !(p.cd['word:iska'] > 0)) this.say('iska');
      const e = foes.reduce((a, b) => (Math.hypot(a.x - p.x, (a.y - p.y) * 2) < Math.hypot(b.x - p.x, (b.y - p.y) * 2) ? a : b));
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const facing = (dx > 0 && p.dir === 'right') || (dx < 0 && p.dir === 'left');
      if (Math.abs(dx) < 24 && Math.abs(dx) > 5 && Math.abs(dy) <= 6) {
        // A one-tick step toward the enemy is how a player turns to face it.
        if (!facing) this.step([{ t: 'move', dx: Math.sign(dx), dy: 0 }]);
        else if (this.dither > 0) (this.dither--, this.step());
        else {
          if (p.act !== 'swing') this.dither = this.sloth;
          this.step(p.act === 'swing' ? [] : [{ t: 'move', dx: 0, dy: 0 }, { t: 'attack' }]);
        }
        continue;
      }
      // Close in on a spot beside the enemy, re-planning as it moves.
      const side = dx >= 0 ? -1 : 1;
      const tx = e.x + side * 14;
      const path = this.route((x, y) => Math.abs(x - tx) <= 3 && Math.abs(y - e.y) <= 2) ?? this.route((x, y) => Math.hypot(x - e.x, (y - e.y) * 2) <= 20);
      if (path?.length) this.follow(path, 6);
      else this.step();
    }
    throw new Error(`The fight in ${sim.state.room} did not end`);
  }

  /** Stand still until a runeword can be spoken again. */
  waitFor(word: string): void {
    while ((this.p.cd[word] ?? 0) > 0) this.step();
  }
}

/** Every one-time score award the content declares, by id. */
export function awardsOnOffer(): Map<string, number> {
  const points = new Map<string, number>();
  const visit = (v: unknown): void => {
    if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (typeof o.score === 'number' && typeof o.id === 'string') points.set(o.id, o.score);
      Object.values(o).forEach(visit);
    }
  };
  visit(content);
  return points;
}

/** Every point the content currently offers: the sum of all its one-time score awards. */
export function pointsOnOffer(): number {
  const points = new Map<string, number>();
  const visit = (v: unknown): void => {
    if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (typeof o.score === 'number' && typeof o.id === 'string') points.set(o.id, o.score);
      Object.values(o).forEach(visit);
    }
  };
  visit(content);
  return [...points.values()].reduce((a, b) => a + b, 0);
}
