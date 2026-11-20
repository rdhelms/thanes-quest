import { afterAll } from 'vitest';
import { Sim } from '../src/engine/sim';
const orig = Sim.prototype.give;
const seen: string[] = [];
const fmt = (s: Sim): string => `${s.load()}/${s.limit()} ${JSON.stringify(Object.fromEntries(Object.entries(s.p.inv).filter(([id]) => s.weight(id) > 0).map(([id, n]) => [id, n])))} w=${s.p.weapon} a=${s.p.armor}`;
Sim.prototype.give = function (item: string, n = 1, took?: string) {
  const r = orig.call(this, item, n, took);
  seen.push(`${this.state.tick} ${this.state.room} +${item}x${n}${r < n ? ` LEFT ${n - r}` : ''} :: ${fmt(this)}`);
  return r;
};
const lose = Sim.prototype.lose;
Sim.prototype.lose = function (item: string, n = 1) {
  lose.call(this, item, n);
  seen.push(`${this.state.tick} ${this.state.room} -${item}x${n} :: ${fmt(this)}`);
};
await import('./walkthrough.test');
afterAll(() => {
  (globalThis as any).process.stdout.write(seen.join('\n') + '\n');
});
