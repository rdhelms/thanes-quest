import { describe, expect, it } from 'vitest';
import { hitEnemy } from '../src/engine/combat';
import { edgeOf, isPass, kindAt, parseWild, roomOf, wildId } from '../src/engine/frontier';
import type { Sim } from '../src/engine/sim';
import { content } from '../src/game/content';
import { game, walk } from './helpers';

const f = content.frontier!;
const ring = (x: number, y: number): number => Math.max(Math.abs(x), Math.abs(y));
const cells = (r: number): [number, number][] => {
  const out: [number, number][] = [];
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (ring(x, y) === r) out.push([x, y]);
  return out;
};
const foes = (sim: Sim) => sim.rs.actors.filter((a) => a.kind === 'enemy' && a.act !== 'dead' && content.enemies[a.ref]?.ai !== 'prey');
/** Something living in a place by day. */
const lived = (id: string): boolean => !!roomOf(content, id)?.spawns?.some((s) => s.when !== 'night' && content.enemies[s.kind]?.ai !== 'prey');

/** A place near home with a wolf in it by day, and open wild country (not a haven) the given way. */
function wolfCountry(side: 'e' | 'w'): string {
  for (const r of [3, 4, 5])
    for (const [x, y] of cells(r)) {
      const def = roomOf(content, wildId(x, y));
      const to = def?.exits?.[side];
      if (def && to && parseWild(to) && !roomOf(content, to)?.haven && def.spawns?.some((s) => s.kind === 'wolf' && !s.when)) return def.id;
    }
  throw new Error('no wolf country near home');
}

/** Stand at an edge with one wolf a little way behind, and nothing else about. */
function chased(room: string, x: number): Sim {
  const sim = game(room, x, 140);
  const wolf = sim.rs.actors.find((a) => a.ref === 'wolf')!;
  sim.rs.actors = [wolf];
  wolf.x = x < 160 ? x + 40 : x - 40;
  wolf.y = 140;
  return sim;
}

describe('the wild remembers', () => {
  it('sends whatever is hunting the player after them, over the edge and a little behind', () => {
    const from = wolfCountry('e');
    const sim = chased(from, 300);
    const wolf = sim.rs.actors[0].id;
    walk(sim, 1, 0, 14);
    const to = roomOf(content, from)!.exits!.e!;
    expect(sim.state.room).toBe(to);
    // It is on its way, not yet in sight: nothing can strike it or be struck by it.
    const after = foes(sim).filter((a) => a.ref === 'wolf' && (a.ai.lag ?? 0) > 0);
    expect(after.length).toBe(1);
    // It comes in by the edge the player did.
    expect(after[0].x).toBeLessThan(30);
    // Where it came from, it is gone until it would have come back had it been killed.
    expect(sim.state.rooms[from].dead).toContain(wolf);
    for (let t = 0; t < 60; t++) sim.step();
    expect(after[0].ai.lag ?? 0).toBe(0);
    expect(Math.abs(after[0].x - sim.p.x)).toBeLessThan(60);
  });

  it('cannot be shaken off by stepping back and forth over an edge', () => {
    const from = wolfCountry('e');
    const sim = chased(from, 300);
    const wolves = (): number => foes(sim).filter((a) => a.ref === 'wolf').length;
    // Over and back, over and back: the wolf comes every time, and never doubles.
    for (let k = 0; k < 4; k++) {
      walk(sim, k % 2 ? -1 : 1, 0, 14);
      expect(sim.state.room).toBe(k % 2 ? from : roomOf(content, from)!.exits!.e);
      expect(foes(sim).some((a) => a.ref === 'wolf' && (a.ai.lag ?? 0) > 0)).toBe(true);
    }
    expect(wolves()).toBeGreaterThanOrEqual(1);
    // The one that was chasing is not also back at its post.
    const own = roomOf(content, from)!.spawns!.filter((s) => s.kind === 'wolf' && !s.when).length;
    expect(wolves()).toBeLessThanOrEqual(own);
  });

  it('gives up at the edge of the valley, and at any haven', () => {
    // A cell just outside the valley, with a valley road beside it.
    let from = '';
    let side: 'e' | 'w' = 'w';
    for (const [x, y] of cells(3)) {
      const def = roomOf(content, wildId(x, y));
      for (const s of ['e', 'w'] as const) {
        const to = def?.exits?.[s];
        if (to && roomOf(content, to)?.haven && def!.spawns?.some((k) => k.kind === 'wolf' && !k.when)) [from, side] = [def!.id, s];
      }
      if (from) break;
    }
    expect(from).not.toBe('');
    const sim = chased(from, side === 'w' ? 12 : 306);
    walk(sim, side === 'w' ? -1 : 1, 0, 14);
    expect(sim.state.room).not.toBe(from);
    expect(foes(sim).filter((a) => (a.ai.lag ?? 0) > 0)).toEqual([]);
    expect(sim.state.rooms[from].dead).toEqual([]);
  });
});

describe('the marches', () => {
  const rings = f.marches!.rings;

  it('closes each march with a wall that has no way through but its passes', () => {
    const STEP = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] } as const;
    for (const r of rings.slice(0, 2))
      for (const [x, y] of cells(r))
        for (const side of ['n', 's', 'e', 'w'] as const) {
          const e = edgeOf(content, x, y, side);
          // Every way out of the ring is walled or a pass; every way round it is open.
          if (ring(x + STEP[side][0], y + STEP[side][1]) > r) expect(e).not.toBe('open');
          else expect(e).toBe('open');
          // A wall has no exit through it; a pass has one.
          const here = roomOf(content, wildId(x, y))!;
          if (e === 'wall') expect(here.exits?.[side]).toBeUndefined();
          if (e === 'pass') expect(here.exits?.[side]).toBeDefined();
        }
  }, 60000);

  it('has passes on every side of every march, each held by something that does not come back', () => {
    for (const r of rings.slice(0, 3)) {
      const passes = cells(r).filter(([x, y]) => isPass(content, x, y));
      expect(passes.length).toBe(4 * f.marches!.passes);
      for (const [x, y] of passes) {
        expect(kindAt(content, x, y)).toBe('pass');
        const def = roomOf(content, wildId(x, y))!;
        expect(Object.keys(def.holds ?? {}).length).toBe(1);
        expect(def.spawns!.length).toBeGreaterThanOrEqual(2);
        for (const s of def.spawns!) expect(s.respawn).toBeUndefined();
      }
    }
  });

  it('can only be got through by beating whoever holds the pass', () => {
    const [x, y] = cells(rings[0]).find(([cx, cy]) => isPass(content, cx, cy) && cx === rings[0])!;
    const id = wildId(x, y);
    const sim = game(id, 300, 134);
    walk(sim, 1, 0, 30);
    expect(sim.state.room).toBe(id);
    expect(sim.drain().some((e) => e.t === 'note')).toBe(true);
    // Not by luring them off, either: they keep their ground.
    walk(sim, -1, 0, 160);
    expect(sim.state.room).not.toBe(id);
    expect(foes(sim).filter((a) => (a.ai.lag ?? 0) > 0)).toEqual([]);
    sim.enterRoom(id, 300, 134);
    for (const a of foes(sim)) hitEnemy(sim, a, 9999, 'blade');
    expect(sim.state.flags[`pass.${id}`]).toBe(true);
    walk(sim, 1, 0, 30);
    expect(sim.state.room).toBe(wildId(x + 1, y));
    // And it stays open.
    sim.state.tick += 50000;
    sim.enterRoom(id, 160, 134);
    expect(foes(sim).filter((a) => !a.id.includes(':night'))).toEqual([]);
  });

  it('leaves every place with a name inside the first march', () => {
    for (const [name, [x, y]] of Object.entries(f.grid)) expect(ring(x, y), name).toBeLessThan(rings[0]);
  });
});

describe('quiet country', () => {
  it('leaves much of the country near home empty by day, and less of it further out', () => {
    const share = (r: number): number => {
      const all = cells(r).filter(([x, y]) => kindAt(content, x, y) !== 'pass');
      return all.filter(([x, y]) => !lived(wildId(x, y))).length / all.length;
    };
    expect(share(3)).toBeGreaterThan(0.4);
    expect(share(12)).toBeLessThan(share(3) - 0.15);
    expect(share(12)).toBeGreaterThan(0.1);
  });

  it('plays the quiet music where nothing lives', () => {
    let quiet = 0;
    for (const [x, y] of cells(4)) {
      const def = roomOf(content, wildId(x, y))!;
      const k = kindAt(content, x, y);
      if (k === 'shrine' || k === 'steading' || k === 'pass') continue;
      if (lived(def.id)) expect(def.music).toBe(f.music);
      else (expect(def.music).toBe(f.quiet!.music), quiet++);
    }
    expect(quiet).toBeGreaterThan(4);
  });

  it('gives the Elder only places that have something in them to deal with', async () => {
    const sim = game('hall', 160, 140);
    sim.state.flags['bounty.n'] = 3;
    sim.behaviours.bountyOffer?.(sim, 'Marta');
    const room = String(sim.state.flags['bounty.room']);
    expect(lived(room)).toBe(true);
  });
});
