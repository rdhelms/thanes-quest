// Backdrop layers. Each takes loosely-typed parameters from a LayerDef.

import { R } from './palette';
import { PH, PW, Scene, distSeg } from './scene';
import { clamp, fbm, hash2, vnoise } from './noise';
import type { LayerDef, SceneDef } from './types';

function sky(sc: Scene, hz: number): void {
  for (let y = 0; y < hz + 8; y++) {
    const t = clamp(y / hz);
    for (let x = 0; x < PW; x++) {
      const s = 0.1 + 0.84 * Math.pow(t, 1.2);
      const c = fbm(x * 0.015 + 7.3, y * 0.08 + 1.7, 11, 4);
      const cl = c - (0.6 - 0.07 * t);
      if (cl > 0) sc.put(x, y, R.snow, 0.7 + clamp(cl * 3.4, 0, 0.3));
      else sc.put(x, y, R.sky, s + clamp(cl + 0.05, 0, 0.05) * 2.4);
    }
  }
}

/** A sky with no weather in it at all: white, and even, from top to bottom. */
function whiteout(sc: Scene, hz: number): void {
  for (let y = 0; y < hz + 8; y++)
    for (let x = 0; x < PW; x++) sc.put(x, y, R.snow, 0.5 + 0.34 * clamp(y / hz) + (fbm(x * 0.02 + 3.1, y * 0.05, 23, 2) - 0.5) * 0.08);
}

function mountains(sc: Scene, o: { base: number; height: number; seed: number; far: boolean }): void {
  const ridge = (x: number): number => {
    const a = 1 - Math.abs(2 * vnoise(x * 0.011, 0.5, o.seed) - 1);
    const b = 1 - Math.abs(2 * vnoise(x * 0.034, 3.5, o.seed + 1) - 1);
    const c = vnoise(x * 0.12, 7.5, o.seed + 2);
    return Math.pow(a, 1.5) * 0.62 + b * 0.28 + c * 0.1;
  };
  const topAt = (x: number): number => o.base - o.height * (0.16 + 0.84 * ridge(x));
  for (let x = 0; x < PW; x++) {
    const ty = topAt(x);
    for (let y = Math.floor(ty); y < o.base; y++) {
      const d = y - ty;
      const xs = x + d * 0.6 + (vnoise(x * 0.06, y * 0.08, o.seed + 5) - 0.5) * 18;
      const lit = topAt(xs + 2.5) - topAt(xs - 2.5) < 0;
      const n = vnoise(x * 0.3, y * 0.3, o.seed + 6);
      if (o.far) {
        sc.put(x, y, R.snow, (lit ? 0.7 : 0.34) + 0.1 * n + 0.08 * clamp(d / o.height));
      } else {
        const snowLine = 5 + 15 * vnoise(x * 0.05, 2, o.seed + 7) + (lit ? 6 : 0);
        const streak = vnoise(x * 0.35 - y * 0.25, y * 0.07, o.seed + 8);
        if (d < snowLine - 4 * n) sc.put(x, y, R.snow, lit ? 0.9 + 0.1 * n : 0.48 + 0.12 * n);
        else if (lit && streak > 0.68) sc.put(x, y, R.snow, 0.78);
        else sc.put(x, y, R.rock, lit ? 0.5 + 0.2 * n : 0.2 + 0.16 * n);
      }
    }
  }
}

function treeline(sc: Scene, y0: number, seed: number, base: number, hmin: number, hvar: number, spacing: number): void {
  for (let x = 0; x < PW; x++) {
    let top = y0;
    const k0 = Math.floor(x / spacing);
    for (let k = k0 - 2; k <= k0 + 2; k++) {
      const tx = k * spacing + hash2(k, 1, seed) * spacing;
      const th = hmin + hash2(k, 2, seed) * hvar;
      const hw = th * 0.34;
      const dx = Math.abs(x - tx);
      if (dx < hw) top = Math.min(top, y0 - th * (1 - dx / hw));
    }
    for (let y = Math.floor(top); y < y0 + 2; y++) {
      const n = hash2(x, y, seed + 3);
      if (y - top < 2.2 && n > 0.4) sc.put(x, y, R.snow, 0.66 + 0.24 * n);
      else sc.put(x, y, R.pine, base + 0.12 * n);
    }
  }
}

function snowfield(sc: Scene, hz: number): void {
  for (let y = hz; y < PH; y++) {
    const t = (y - hz) / (PH - hz);
    for (let x = 0; x < PW; x++) {
      let s = 0.8 + 0.12 * fbm(x * 0.013, y * 0.05, 31, 3) + 0.05 * t;
      const d = vnoise(x * 0.022 + y * 0.012, y * 0.12, 77);
      if (d > 0.6) s -= (d - 0.6) * 0.8;
      if (hash2(x, y, 5) > 0.993) s = 1;
      sc.put(x, y, R.snow, s);
    }
  }
}

function path(sc: Scene, hz: number, pts: [number, number][], w0: number): void {
  for (let y = hz + 4; y < PH; y++) {
    const t = (y - hz) / (PH - hz);
    const w = w0 * (0.3 + 0.7 * t);
    for (let x = 0; x < PW; x++) {
      let d = Infinity;
      for (let i = 0; i < pts.length - 1; i++)
        d = Math.min(d, distSeg(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 2.4));
      const n = (fbm(x * 0.11, y * 0.2, 5, 3) - 0.5) * w * 1.1;
      const e = d / Math.max(1, w + n);
      if (e >= 1) continue;
      const m = fbm(x * 0.16, y * 0.32, 9, 3);
      if (e > 0.76) sc.put(x, y, R.snow, 0.5 + 0.22 * m);
      else if (m > 0.64) sc.put(x, y, R.snow, 0.64 + 0.24 * m);
      else sc.put(x, y, R.earth, 0.36 + 0.55 * m - 0.1 * e);
    }
  }
}

function tufts(sc: Scene, hz: number, count: number, seed: number): void {
  for (let k = 0; k < count; k++) {
    const x = Math.floor(hash2(k, 1, seed) * PW);
    const y = Math.floor(hz + 12 + hash2(k, 2, seed) * (PH - hz - 14));
    const i = y * PW + x;
    if (sc.ramp[i] !== R.snow || sc.pri[i] !== 0) continue;
    const h = 2 + Math.floor(hash2(k, 3, seed) * 3);
    for (let b = -1; b <= 1; b++) {
      const hh = h - Math.abs(b);
      for (let j = 0; j < hh; j++) sc.put(x + b + (j === hh - 1 ? b : 0), y - j, R.thatch, 0.45 + 0.4 * hash2(k, b + 5, seed));
    }
    sc.shadow(x + 2, y, 0.8);
    sc.shadow(x + 3, y, 0.86);
  }
}

function dungeonWall(sc: Scene, fl: number): void {
  const bw = 26;
  const bh = 13;
  for (let y = 0; y < fl; y++) {
    const r = Math.floor((y + 4) / bh);
    const ly = (y + 4) % bh;
    const off = r & 1 ? 13 : 0;
    for (let x = 0; x < PW; x++) {
      const bx = Math.floor((x + off) / bw);
      const lx = (x + off) % bw;
      let s = 0.56 + 0.22 * (hash2(bx, r, 5) - 0.5) + (fbm(x * 0.13, y * 0.13, 8, 3) - 0.5) * 0.24;
      if (lx === 0 || ly === 0) s = 0.14;
      else if (lx === 1 || ly === 1) s += 0.12;
      else if (lx === bw - 1 || ly === bh - 1) s -= 0.12;
      const damp = vnoise(x * 0.07, y * 0.018, 3);
      if (damp > 0.62) s -= (damp - 0.62) * 0.9;
      const crack = Math.abs(vnoise(x * 0.09, y * 0.09, 44) - 0.5);
      if (crack < 0.006 && hash2(bx, r, 6) > 0.55) s = 0.1;
      sc.put(x, y, R.stone, s);
    }
  }
}

function dungeonFloor(sc: Scene, fl: number): void {
  for (let y = fl; y < PH; y++) {
    const t = (y - fl) / (PH - fl);
    const u = Math.pow(t, 0.72) * 6;
    const r = Math.floor(u);
    const fu = u - r;
    const scale = 0.5 + 0.5 * t;
    for (let x = 0; x < PW; x++) {
      const X = (x - 160) / scale + 1000 + hash2(r, 0, 9) * 40;
      const tile = Math.floor(X / 38);
      const lx = X / 38 - tile;
      let s = 0.5 + 0.22 * (hash2(tile, r, 15) - 0.5) + (fbm(x * 0.15, y * 0.3, 18, 3) - 0.5) * 0.22;
      if (fu < 0.07 / (0.4 + t) || lx < 0.03 / scale) s = 0.13;
      else if (fu < 0.14 / (0.4 + t)) s += 0.1;
      if (y - fl < 4) s *= 0.5 + 0.12 * (y - fl);
      sc.put(x, y, R.stone, s);
    }
  }
}

/** A frozen pond: an ellipse of ice set into the snow. */
function ice(sc: Scene, cx: number, cy: number, rx: number, ry: number): void {
  for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++)
    for (let x = Math.floor(cx - rx - 3); x <= cx + rx + 3; x++) {
      const wob = (fbm(x * 0.06, y * 0.12, 61, 3) - 0.5) * 0.3;
      const d = Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2) + wob;
      if (d > 1.06) continue;
      if (d > 1) {
        sc.put(x, y, R.snow, 0.52);
        continue;
      }
      let s = 0.55 + 0.3 * fbm(x * 0.03 + 4, y * 0.1, 62, 3) - 0.25 * (1 - d) * (1 - d);
      const crack = Math.abs(vnoise(x * 0.05, y * 0.09, 63) - 0.5);
      if (crack < 0.012) s = 0.98;
      if (vnoise(x * 0.2, y * 0.5, 64) > 0.8) s += 0.15;
      sc.put(x, y, R.ice, s);
    }
}

/** A river running across the screen. It cannot be crossed except where a bridge unblocks it. */
function river(sc: Scene, y0: number, half: number, seed: number): void {
  for (let x = 0; x < PW; x++) {
    const cy = y0 + (vnoise(x * 0.012, 1, seed) - 0.5) * 16;
    const w = half + (vnoise(x * 0.03, 2, seed) - 0.5) * 4;
    for (let y = Math.floor(cy - w - 3); y <= cy + w + 3; y++) {
      const d = Math.abs(y - cy) / w;
      if (d > 1.25) continue;
      if (d > 1) {
        sc.put(x, y, R.snow, y < cy ? 0.5 : 0.62);
        continue;
      }
      let s = 0.3 + 0.35 * vnoise(x * 0.05 - y * 0.02, y * 0.3, seed + 3) + 0.15 * d;
      if (vnoise(x * 0.12, y * 0.4, seed + 4) > 0.74) sc.put(x, y, R.ice, 0.85);
      else sc.put(x, y, R.water, s);
      if (y >= 0 && y < PH) sc.ctl[y * PW + x] = 1;
    }
  }
}

/** Indoors: a back wall of logs or stone above a plank or flagstone floor. */
function interior(sc: Scene, fl: number, wall: string): void {
  if (wall === 'stone') {
    dungeonWall(sc, fl);
    dungeonFloor(sc, fl);
    return;
  }
  const LOG = [0.6, 0.54, 0.46, 0.38, 0.3, 0.16];
  for (let y = 0; y < fl; y++) {
    const li = Math.floor(y / 6);
    for (let x = 0; x < PW; x++) {
      let s = LOG[y % 6] + (vnoise(x * 0.4, li * 5.3, 71) - 0.5) * 0.14;
      if ((x + li * 37) % 97 === 0) s *= 0.6;
      if (y < 10) s *= 0.4 + 0.06 * y;
      sc.put(x, y, R.wood, s * 0.8);
    }
  }
  for (let y = fl; y < PH; y++) {
    const t = (y - fl) / (PH - fl);
    const u = Math.pow(t, 0.75) * 7;
    const r = Math.floor(u);
    const fu = u - r;
    for (let x = 0; x < PW; x++) {
      const X = (x - 160) / (0.55 + 0.45 * t) + 1000 + hash2(r, 0, 72) * 60;
      const lx = X / 70 - Math.floor(X / 70);
      let s = 0.42 + 0.12 * (hash2(Math.floor(X / 70), r, 73) - 0.5) + (vnoise(x * 0.6, y * 0.25 + r * 9, 74) - 0.5) * 0.12;
      if (fu < 0.08 / (0.4 + t) || lx < 0.02) s = 0.14;
      if (y - fl < 4) s *= 0.45 + 0.14 * (y - fl);
      sc.put(x, y, R.wood, s);
    }
  }
}

// ---------------------------------------------------------------------------------------------

const num = (l: LayerDef, k: string, d: number): number => (typeof l[k] === 'number' ? (l[k] as number) : d);
const hz = (def: SceneDef): number => def.horizon ?? 70;

/** Layer painters by type name. A room's data picks from these. */
export const LAYERS: Record<string, (sc: Scene, l: LayerDef, def: SceneDef) => void> = {
  sky: (sc, l, def) => sky(sc, num(l, 'horizon', hz(def))),
  whiteout: (sc, l, def) => whiteout(sc, num(l, 'horizon', hz(def))),
  mountains: (sc, l, def) =>
    mountains(sc, { base: num(l, 'base', hz(def) + 3), height: num(l, 'height', 50), seed: num(l, 'seed', 1), far: l.far === true }),
  treeline: (sc, l, def) =>
    treeline(sc, num(l, 'y', hz(def) + 4), num(l, 'seed', 5), num(l, 'shade', 0.3), num(l, 'hmin', 5), num(l, 'hvar', 6), num(l, 'spacing', 5)),
  snow: (sc, l, def) => snowfield(sc, num(l, 'from', hz(def) + 4)),
  path: (sc, l, def) => path(sc, hz(def), (l.pts ?? []) as [number, number][], num(l, 'w', 12)),
  tufts: (sc, l, def) => tufts(sc, hz(def), num(l, 'count', 40), num(l, 'seed', 90)),
  stonewall: (sc, l) => dungeonWall(sc, num(l, 'floor', 98)),
  flagstones: (sc, l) => dungeonFloor(sc, num(l, 'floor', 98)),
  ice: (sc, l) => ice(sc, num(l, 'x', 160), num(l, 'y', 130), num(l, 'rx', 80), num(l, 'ry', 22)),
  river: (sc, l) => river(sc, num(l, 'y', 120), num(l, 'w', 12), num(l, 'seed', 1)),
  interior: (sc, l) => interior(sc, num(l, 'floor', 96), typeof l.wall === 'string' ? l.wall : 'log'),
};

