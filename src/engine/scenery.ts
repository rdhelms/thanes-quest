// More of the prop library: landmarks, camp and farm pieces, and furniture. Importing this file
// registers them alongside the basics in props.ts.

import { R, isRamp } from './palette';
import { PROPS } from './props';
import { PW, Scene, line } from './scene';
import { clamp, fbm, hash2, vnoise } from './noise';
import type { PropDef } from './types';

type P = PropDef;

/** Strokes for three rune shapes, in a 5x8 box. */
const GLYPHS: Record<string, number[][]> = {
  a: [[2, 0, 2, 7], [2, 1, 4, 3], [2, 4, 4, 2], [2, 4, 0, 6]],
  b: [[1, 0, 1, 7], [1, 0, 4, 2], [4, 2, 1, 4], [1, 4, 4, 7]],
  c: [[0, 0, 2, 3], [4, 0, 2, 3], [2, 3, 2, 7], [0, 7, 4, 7]],
};

function glyph(sc: Scene, x: number, y: number, v: string | undefined, scale: number, ramp: number, shade: number, base: number): void {
  for (const [x0, y0, x1, y1] of GLYPHS[v ?? 'a'] ?? GLYPHS.a)
    line(sc, x + (x0 - 2) * scale + 0.5, y + (y0 - 3.5) * scale + 0.5, x + (x1 - 2) * scale + 0.5, y + (y1 - 3.5) * scale + 0.5, ramp, shade, base, Math.max(1.1, scale * 0.9));
}

function stone(sc: Scene, p: P): void {
  const { x, y } = p;
  const h = p.h ?? 44;
  const seed = p.seed ?? 1;
  const lit = p.lit === 1;
  for (let py = y - h; py < y; py++) {
    const t = (y - py) / h;
    const hw = h * 0.17 * (1 - 0.4 * t * t) + (vnoise(py * 0.25, 3, seed) - 0.5) * 2;
    const cx = x + t * h * 0.07;
    for (let px = Math.floor(cx - hw); px <= cx + hw; px++) {
      const nx = (px - cx) / hw;
      if (t > 0.94 - 0.05 * Math.abs(nx)) sc.put(px, py, R.snow, nx < 0.3 ? 0.97 : 0.66, y);
      else sc.put(px, py, R.rock, 0.56 - 0.3 * nx + (fbm(px * 0.3, py * 0.2, seed, 3) - 0.5) * 0.3 - (py > y - 3 ? 0.1 : 0), y);
    }
  }
  glyph(sc, Math.round(x + h * 0.035), Math.round(y - h * 0.5), p.v, h / 22, lit ? R.glow : R.rock, lit ? 0.95 : 0.12, y);
  sc.blockEllipse(x, y - 1, h * 0.2, 3);
}

function mound(sc: Scene, p: P): void {
  const { x, y } = p;
  const w = p.w ?? 220;
  const h = p.h ?? 72;
  const open = p.v === 'open';
  for (let px = Math.floor(x - w / 2); px <= x + w / 2; px++) {
    const nx = (px - x) / (w / 2);
    const top = y - h * Math.sqrt(Math.max(0, 1 - nx * nx)) * (0.88 + 0.12 * vnoise(px * 0.04, 3, 81));
    for (let py = Math.floor(top); py < y; py++) {
      const d = py - top;
      const rocky = fbm(px * 0.07, py * 0.09, 82, 3) > 0.66 && d > 6;
      if (rocky) sc.put(px, py, R.rock, 0.4 - 0.15 * nx + 0.2 * vnoise(px * 0.4, py * 0.4, 83), y);
      else sc.put(px, py, R.snow, (d < 2 ? 1 : 0.86) - 0.26 * clamp(nx * 0.7 + 0.3) + 0.1 * (fbm(px * 0.03, py * 0.06, 84, 2) - 0.5), y);
    }
  }
  // Doorway: two uprights and a lintel
  for (let py = y - 48; py < y; py++)
    for (let px = x - 22; px <= x + 22; px++) {
      const ax = Math.abs(px - x);
      const lintel = py < y - 39;
      if (!lintel && ax > 18) continue;
      if (lintel || ax > 11) {
        const s = 0.7 - 0.012 * (px - x) + (fbm(px * 0.3, py * 0.3, 85, 2) - 0.5) * 0.25;
        sc.put(px, py, R.rock, py === y - 48 || ax === 12 ? s + 0.15 : py === y - 40 ? 0.25 : s, y);
        if (py === y - 48) sc.put(px, py - 1, R.snow, 0.98, y);
      } else if (open) {
        const step = y - py;
        sc.put(px, py, step < 10 && step % 3 === 0 ? R.stone : R.ink, 0.3, y);
      } else {
        sc.put(px, py, R.rock, 0.3 + (fbm(px * 0.25, py * 0.25, 86, 2) - 0.5) * 0.14 - (ax < 1 ? 0.1 : 0), y);
      }
    }
  if (!open) glyph(sc, x, y - 22, 'a', 2, R.glow, 0.5, y);
  sc.blockRect(x - w / 2 + 8, y - 12, x + w / 2 - 8, y + 1);
}

function tent(sc: Scene, p: P): void {
  const { x, y } = p;
  const w = p.w ?? 46;
  const h = w * 0.82;
  for (let py = Math.floor(y - h); py < y; py++) {
    const t = (py - (y - h)) / h;
    const hw = (w / 2) * t;
    for (let px = Math.floor(x - hw); px <= x + hw; px++) {
      const dx = px - x;
      if (Math.abs(dx) < 6 * t - 1.5 && t > 0.3) sc.put(px, py, R.ink, 0, y);
      else if (hw - Math.abs(dx) < 2.2 && dx < 0) sc.put(px, py, R.snow, 0.96, y);
      else sc.put(px, py, R.leather, 0.74 - 0.5 * (dx / (w / 2)) + (vnoise(px * 0.2 + py * 0.3, py * 0.1, 87) - 0.5) * 0.2 - (py % 9 === 0 ? 0.12 : 0), y);
    }
  }
  line(sc, x - 3, y - h + 3, x + 4, y - h - 6, R.wood, 0.3, y, 1.4);
  line(sc, x + 3, y - h + 3, x - 4, y - h - 6, R.wood, 0.45, y, 1.4);
  sc.blockRect(x - w / 2 + 2, y - 7, x + w / 2 - 2, y + 1);
}

function campfire(sc: Scene, p: P): void {
  const { x, y } = p;
  for (let py = y - 5; py <= y + 3; py++)
    for (let px = x - 14; px <= x + 14; px++)
      if (((px - x) / 14) ** 2 + ((py - y + 1) / 4.5) ** 2 < 1) sc.put(px, py, R.earth, 0.3 + 0.2 * hash2(px, py, 88));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const cx = Math.round(x + Math.cos(a) * 9);
    const cy = Math.round(y - 1 + Math.sin(a) * 3);
    for (let dy = -2; dy <= 0; dy++) for (let dx = -1; dx <= 1; dx++) sc.put(cx + dx, cy + dy, R.rock, dy === -2 ? 0.75 : dx < 1 ? 0.5 : 0.3, cy + 1);
  }
  line(sc, x - 6, y - 1, x + 6, y - 4, R.wood, 0.25, y, 2);
  line(sc, x + 6, y - 1, x - 6, y - 4, R.wood, 0.35, y, 2);
  sc.blockEllipse(x, y - 1, 11, 3.5);
  // 'cold' is a fire that has been out a long time: the ring and the sticks, and a kettle on a tripod over them.
  if (p.v !== 'cold' && p.v !== 'kettle') sc.flames.push({ x, y, up: 2, size: 0.85 });
  if (p.v === 'cold' || p.v === 'kettle') {
    line(sc, x - 7, y, x, y - 15, R.wood, 0.34, y, 1.2);
    line(sc, x + 7, y, x, y - 15, R.wood, 0.46, y, 1.2);
    for (let dy = 0; dy < 5; dy++) for (let dx = -3; dx <= 3; dx++) if (Math.abs(dx) < 3 || (dy > 0 && dy < 4)) sc.put(x + dx, y - 10 + dy, R.metal, dx < 0 ? 0.3 : 0.16, y);
    sc.put(x, y - 11, R.metal, 0.4, y);
    sc.put(x, y - 12, R.metal, 0.3, y);
    if (p.v === 'kettle') sc.flames.push({ x, y, up: 2, size: 0.7 });
    else for (let dx = -2; dx <= 2; dx++) sc.put(x + dx, y - 11, R.snow, 0.95, y);
  }
}

/** A loaded sledge, left where it stopped: runners, a lashed load with a cradle on top, and snow on all of it. */
function sledge(sc: Scene, p: P): void {
  const { x, y } = p;
  for (let dx = -13; dx <= 13; dx++) {
    sc.put(x + dx, y, R.wood, 0.3, y);
    sc.put(x + dx, y - 1, R.wood, dx > 11 ? 0.3 : 0.5, y);
  }
  // The runner curls up at the front.
  for (let k = 0; k < 4; k++) sc.put(x + 13 + Math.min(k, 2), y - 1 - k, R.wood, 0.4, y);
  for (let dy = 2; dy <= 9; dy++)
    for (let dx = -11; dx <= 9; dx++) {
      const top = 9 - (Math.abs(dx + 1) > 7 ? 3 : 0);
      if (dy > top) continue;
      const rope = dx === -6 || dx === 4;
      sc.put(x + dx, y - dy, rope ? R.thatch : dy > 5 ? R.cream : R.leather, rope ? 0.6 : 0.3 + 0.3 * hash2(dx >> 1, dy >> 1, 61) + (dx < -8 ? -0.1 : 0), y);
    }
  // The cradle, lashed on top, hood to the back.
  for (let dy = 10; dy <= 13; dy++) for (let dx = -6; dx <= 3; dx++) if (dy < 13 || dx < -2) sc.put(x + dx, y - dy, R.wood, dx < -2 ? 0.62 : 0.5 - 0.06 * (dy - 10), y);
  for (let dx = -12; dx <= 10; dx++) if (hash2(dx, 3, 62) > 0.25) sc.put(x + dx, y - (dx < -6 ? 14 : dx > 3 ? 10 : 12) + (dx < -6 && dx > -9 ? -0 : 0), R.snow, 0.96, y);
  for (let dx = -9; dx <= -3; dx++) sc.put(x + dx, y - 14, R.snow, 0.98, y);
  sc.blockRect(x - 13, y - 3, x + 14, y + 1);
}

/** A hole cut in ice for fishing, skinned over, with the rod still standing in it. */
function icehole(sc: Scene, p: P): void {
  const { x, y } = p;
  for (let dy = -4; dy <= 4; dy++)
    for (let dx = -15; dx <= 15; dx++) {
      const d = Math.hypot(dx / 15, dy / 4);
      if (d >= 1 + (hash2(x + dx, y + dy, 65) - 0.5) * 0.3) continue;
      if (Math.hypot(dx / 6.5, dy / 2.4) < 1) sc.put(x + dx, y + dy, R.water, 0.02 + 0.14 * hash2(dx, dy, 66));
      else if (Math.hypot(dx / 8.5, dy / 3.3) < 1) sc.put(x + dx, y + dy, R.snow, 0.98);
      else sc.put(x + dx, y + dy, R.ice, 0.45 + 0.3 * hash2((x + dx) >> 1, y + dy, 67) - 0.2 * d);
    }
  // The rod, wedged upright with a stone, and the line going down.
  line(sc, x + 9, y + 2, x + 3, y - 22, R.wood, 0.4, y + 3, 1.4);
  for (let k = 0; k < 21; k++) sc.put(x + 2, y - 21 + k, R.cream, 0.8, y + 3);
  for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 4; dx++) sc.put(x + 8 + dx, y + 1 + dy, R.rock, 0.5 - 0.1 * dx, y + 3);
}

/** A long hump of drifted snow with something asleep under it: a breathing-hole on top, and a little steam. */
function hump(sc: Scene, p: P): void {
  const { x, y } = p;
  for (let dy = -11; dy <= 0; dy++)
    for (let dx = -20; dx <= 20; dx++) {
      const top = -10 * Math.sqrt(Math.max(0, 1 - (dx / 20) ** 2)) * (0.86 + 0.14 * Math.cos(dx * 0.3));
      if (dy < top) continue;
      const edge = dy - top < 1.2;
      sc.put(x + dx, y + dy, R.snow, edge ? 1 : 0.9 - 0.34 * clamp((dx + 6) / 26) - 0.02 * dy + 0.05 * hash2(x + dx, y + dy, 71), y);
    }
  // The hole, rimmed with frost, and what comes out of it.
  for (let dx = -1; dx <= 1; dx++) sc.put(x - 3 + dx, y - 9, R.rock, 0.05, y);
  sc.put(x - 5, y - 9, R.ice, 1, y);
  sc.put(x - 1, y - 9, R.ice, 1, y);
  for (let k = 0; k < 7; k++) if (k % 2 === 0) sc.put(x - 3 + (k > 3 ? 1 : 0), y - 11 - k, R.rock, 0.86, y);
  sc.blockEllipse(x, y - 1, 19, 4);
}

/**
 * A post driven into the snow, with something hung on it. v: 'skates' is a pair of bone skates on
 * their thongs; v: 'horn' is a tarred ferry-post with an iron mooring ring and a horn on a cord.
 */
function post(sc: Scene, p: P): void {
  const { x, y } = p;
  const tall = p.v === 'horn' ? 30 : 24;
  const tar = p.v === 'horn';
  const half = tar ? 2 : 1;
  for (let py = y - tall; py < y; py++)
    for (let dx = -half; dx <= half; dx++) sc.put(x + dx, py, R.wood, (tar ? 0.08 : 0.3) + (dx < 0 ? 0.18 : 0) + 0.06 * hash2(dx, py, 63), y);
  for (let dx = -half; dx <= half; dx++) sc.put(x + dx, y - tall - 1, R.snow, 0.97, y);
  if (p.v === 'skates') {
    // Two skates hanging blade-down on their thongs from one nail, one either side of the stake.
    sc.put(x, y - 20, R.metal, 0.7, y);
    for (const side of [-1, 1]) {
      const x0 = x + side * 2;
      const x1 = x + side * 9;
      line(sc, x, y - 20, x0 + side, y - 13, R.leather, 0.3, y, 1);
      line(sc, x, y - 20, x1, y - 13, R.leather, 0.3, y, 1);
      for (let k = 0; k <= 7; k++) {
        const px = x0 + side * k;
        sc.put(px, y - 12, R.cream, 0.8 - 0.04 * k, y);
        sc.put(px, y - 11, R.cream, 0.42, y);
      }
      // The toe turns up.
      sc.put(x1 + side, y - 13, R.cream, 0.7, y);
    }
  } else if (tar) {
    // The mooring ring, low down, and the horn hung on a cord near the top.
    for (let a = 0; a < 10; a++) sc.put(Math.round(x + 4 + Math.cos((a / 10) * Math.PI * 2) * 2.2), Math.round(y - 9 + Math.sin((a / 10) * Math.PI * 2) * 2.2), R.metal, 0.4, y);
    line(sc, x + 2, y - 26, x + 5, y - 19, R.thatch, 0.6, y, 1);
    // The horn: wide at the mouth, curling up to a dark tip.
    for (let k = 0; k < 11; k++) {
      const hx = x + 3 + k;
      const hy = y - 18 - Math.round(Math.sin((k / 10) * Math.PI * 0.75) * 4);
      const thick = k < 4 ? 3 : k < 8 ? 2 : 1;
      for (let j = 0; j < thick; j++) sc.put(hx, hy + j - (k < 4 ? 1 : 0), k > 8 ? R.wood : R.cream, k > 8 ? 0.15 : j === 0 ? 0.62 : 0.36, y);
    }
  }
  sc.blockEllipse(x, y - 1, 3, 2);
}

/** A domed bread oven of fired clay, its mouth to the front. With v: 'lit', there is fire in it. */
function oven(sc: Scene, p: P): void {
  const { x, y } = p;
  const lit = p.v === 'lit';
  for (let dy = -17; dy <= 0; dy++)
    for (let dx = -15; dx <= 15; dx++) {
      const top = -17 * Math.sqrt(Math.max(0, 1 - (dx / 15) ** 2));
      if (dy < top) continue;
      const nx = dx / 15;
      // The mouth: a low arch on the front, a little to the left.
      const m = Math.hypot((dx + 3) / 6, (dy + 2) / 8);
      if (dy > -8 && m < 1) {
        if (lit && dy > -4) sc.put(x + dx, y + dy, R.fire, 0.35 + 0.4 * hash2(dx, dy, 68), y);
        else sc.put(x + dx, y + dy, R.ink, 0, y);
        continue;
      }
      if (m < 1.25 && dy > -10) sc.put(x + dx, y + dy, R.stone, 0.62 - 0.2 * nx, y);
      else if (dy - top < 2.2 && nx < 0.6) sc.put(x + dx, y + dy, R.snow, nx < 0.1 ? 0.97 : 0.75, y);
      else sc.put(x + dx, y + dy, R.earth, 0.66 - 0.36 * nx + 0.1 * (vnoise((x + dx) * 0.4, (y + dy) * 0.4, 69) - 0.5) - (dy > -2 ? 0.12 : 0), y);
    }
  if (lit) sc.flames.push({ x: x - 3, y: y - 1, up: 1, size: 0.45 });
  sc.blockEllipse(x, y - 1, 14, 3.5);
}

function tower(sc: Scene, p: P): void {
  const { x, y } = p;
  const w = p.w ?? 50;
  const h = p.h ?? 112;
  const seed = p.seed ?? 5;
  const hw = w / 2;
  for (let px = Math.floor(x - hw); px <= x + hw; px++) {
    const nx = (px - x) / hw;
    const top = y - h + (vnoise(px * 0.16, 1, seed) - 0.3) * 16 + (nx > 0 ? 26 * nx * nx : 0);
    for (let py = Math.floor(top); py < y - 3 * nx * nx; py++) {
      const row = Math.floor(py / 7);
      const off = row & 1 ? 6 : 0;
      const joint = ((py % 7) + 7) % 7 === 0 || (px + off) % 12 === 0;
      let s = 0.64 - 0.3 * nx - 0.12 * nx * nx + (hash2(Math.floor((px + off) / 12), row, seed) - 0.5) * 0.16 + (fbm(px * 0.2, py * 0.2, seed + 1, 2) - 0.5) * 0.14;
      if (joint) s *= 0.6;
      if (py - top < 2.2) sc.put(px, py, R.snow, nx < 0.3 ? 0.97 : 0.7, y);
      else sc.put(px, py, R.rock, s, y);
    }
  }
  // Doorway and arrow slits
  for (let py = y - 26; py < y - 1; py++)
    for (let px = x - 7; px <= x + 7; px++) {
      const arch = py < y - 19 ? Math.hypot(px - x, py - (y - 19)) : Math.abs(px - x);
      if (arch < 7) sc.put(px, py, R.ink, 0, y);
      else if (arch < 8.5) sc.put(px, py, R.rock, 0.82, y);
    }
  for (const [sx, sy] of [[-9, 62], [8, 84], [-3, 46]])
    for (let k = 0; k < 8; k++) {
      sc.put(x + sx, y - sy + k, R.ink, 0, y);
      sc.put(x + sx + 1, y - sy + k, R.ink, 0, y);
    }
  sc.blockEllipse(x, y - 3, hw + 2, 5);
}

function haystack(sc: Scene, p: P): void {
  const { x, y } = p;
  const r = p.r ?? 14;
  for (let py = Math.floor(y - r * 1.1); py < y; py++)
    for (let px = x - r; px <= x + r; px++) {
      const nx = (px - x) / r;
      const ny = (py - y) / (r * 1.1);
      if (nx * nx + ny * ny > 1) continue;
      if (ny < -0.62 + 0.2 * vnoise(px * 0.3, 2, 91) - 0.1 * nx) sc.put(px, py, R.snow, nx < 0.2 ? 0.96 : 0.66, y);
      else sc.put(px, py, R.thatch, 0.62 - 0.32 * nx + 0.3 * (vnoise(px * 0.9, py * 0.15, 92) - 0.5), y);
    }
  sc.blockEllipse(x, y - 1, r * 0.95, 3.5);
}

function sheep(sc: Scene, p: P): void {
  const { x, y } = p;
  const dir = (p.seed ?? 0) & 1 ? -1 : 1;
  for (const lx of [-5, -3, 3, 5]) for (let k = 1; k <= 4; k++) sc.put(x + lx, y - k, R.fur, 0.15, y);
  for (let py = y - 13; py <= y - 3; py++)
    for (let px = x - 9; px <= x + 9; px++) {
      const nx = (px - x) / 8;
      const ny = (py - (y - 8)) / 4.8;
      const d = nx * nx + ny * ny + (hash2(px, py, 93) - 0.5) * 0.3;
      if (d < 1) sc.put(px, py, R.white, 0.8 - 0.25 * nx - 0.3 * ny + 0.15 * (hash2(px >> 1, py >> 1, 94) - 0.5), y);
    }
  for (let py = y - 13; py <= y - 8; py++)
    for (let px = -3; px <= 2; px++)
      if ((px / 3) ** 2 + ((py - (y - 10.5)) / 2.8) ** 2 < 1) sc.put(x + dir * 9 + px, py, R.fur, px < 0 ? 0.3 : 0.18, y);
  sc.blockEllipse(x, y - 1, 9, 2.5);
}

function barrel(sc: Scene, p: P): void {
  const { x, y } = p;
  for (let py = y - 16; py < y; py++) {
    const t = (y - py) / 16;
    const hw = 6 + 1.6 * Math.sin(t * Math.PI);
    for (let px = Math.floor(x - hw); px <= x + hw; px++) {
      const nx = (px - x) / hw;
      const band = py === y - 13 || py === y - 4;
      if (py < y - 14) sc.put(px, py, R.wood, 0.72 - 0.1 * nx, y);
      else if (band) sc.put(px, py, R.metal, 0.5 - 0.3 * nx, y);
      else sc.put(px, py, R.wood, 0.5 - 0.3 * nx - ((px - x + 20) % 3 === 0 ? 0.14 : 0), y);
    }
  }
  sc.blockEllipse(x, y - 1, 8, 2.5);
}

/** An anvil on its block. `w` makes a bigger one; `ramp` makes it of something other than iron. */
function anvil(sc: Scene, p: P): void {
  const { x, y } = p;
  const k = (p.w ?? 18) / 18;
  const body = p.ramp && isRamp(p.ramp) ? R[p.ramp] : R.metal;
  const base = p.ramp ? R.stone : R.wood;
  const mid = Math.floor(y - 8 * k);
  for (let py = mid; py < y; py++) for (let px = Math.floor(x - 6 * k); px <= x + 6 * k; px++) sc.put(px, py, base, py === mid ? 0.72 : 0.46 - (0.03 * (px - x)) / k, y);
  for (let py = Math.floor(y - 16 * k); py < mid; py++)
    for (let px = Math.floor(x - 9 * k); px <= x + 8 * k; px++) {
      const row = (py - (y - 16 * k)) / k;
      const dx = (px - x) / k;
      const ok = row < 3 ? dx > -9 + (2 - row) * 2 : row < 6 ? Math.abs(dx) < 3 : Math.abs(dx) < 6;
      if (ok) sc.put(px, py, body, row < 1 ? 0.85 : 0.4 - 0.03 * dx, y);
    }
  sc.blockEllipse(x, y - 1, 9 * k, 2.5 * k);
}

function signpost(sc: Scene, p: P): void {
  const { x, y } = p;
  for (let py = y - 22; py < y; py++) {
    sc.put(x, py, R.wood, 0.55, y);
    sc.put(x + 1, py, R.wood, 0.3, y);
  }
  for (let py = y - 21; py < y - 13; py++)
    for (let px = x - 9; px <= x + 10; px++) {
      const edge = py === y - 21 || py === y - 14 || px === x - 9 || px === x + 10;
      const mark = (py === y - 18 || py === y - 16) && px > x - 6 && px < x + 7 && hash2(px, py, 95) > 0.3;
      sc.put(px, py, R.wood, edge ? 0.3 : mark ? 0.15 : 0.7, y);
    }
  for (let px = x - 9; px <= x + 10; px++) sc.put(px, y - 22, R.snow, 0.97, y);
  sc.blockEllipse(x, y - 1, 3, 2);
}

/** Planks across a river. x is the centre line, y the middle of the water, h the length. */
function bridge(sc: Scene, p: P): void {
  const { x, y } = p;
  const span = p.h ?? 40;
  const y0 = Math.round(y - span / 2);
  const y1 = Math.round(y + span / 2);
  for (let py = y0; py <= y1; py++)
    for (let px = x - 13; px <= x + 13; px++) {
      const rail = Math.abs(px - x) === 13;
      sc.put(px, py, R.wood, rail ? 0.22 : (py - y0) % 4 === 0 ? 0.2 : 0.56 + (vnoise(px * 0.5, Math.floor((py - y0) / 4) * 7, 96) - 0.5) * 0.2);
    }
  for (const cx of [x - 13, x + 13])
    for (const cy of [y0 + 2, y1]) {
      for (let k = 0; k < 10; k++) {
        sc.put(cx, cy - k, R.wood, 0.5, cy);
        sc.put(cx + 1, cy - k, R.wood, 0.28, cy);
      }
      sc.put(cx, cy - 10, R.snow, 0.98, cy);
      sc.put(cx + 1, cy - 10, R.snow, 0.9, cy);
    }
  sc.unblockRect(x - 10, y0 - 3, x + 11, y1 + 4);
}

// ---------------------------------------------------------------------------------------------
// Indoors. For anything against the back wall, y is the floor line.

function hearth(sc: Scene, p: P): void {
  const { x, y } = p;
  const lit = p.lit === 1;
  for (let py = 0; py < y; py++)
    for (let px = x - 30; px <= x + 30; px++) {
      const ax = Math.abs(px - x);
      const mantle = py >= y - 48 && py < y - 43;
      const breast = py < y - 48 && ax <= 20;
      const surround = py >= y - 43 && ax <= 26;
      if (!mantle && !breast && !surround) continue;
      if (mantle) {
        sc.put(px, py, R.wood, py === y - 48 ? 0.85 : 0.5, y);
        continue;
      }
      if (surround && ax < 14 && py >= y - 27) {
        const ember = lit && py > y - 6 ? 0.25 + 0.3 * hash2(px, py, 97) : 0;
        if (ember) sc.put(px, py, R.fire, ember, y);
        else sc.put(px, py, py > y - 4 ? R.rock : R.ink, lit ? 0.25 : 0.38, y);
        continue;
      }
      const row = Math.floor(py / 8);
      const off = row & 1 ? 7 : 0;
      const joint = py % 8 === 0 || (px + off) % 14 === 0;
      let s = 0.56 + (hash2(Math.floor((px + off) / 14), row, 98) - 0.5) * 0.18 - 0.006 * (px - x) + (fbm(px * 0.2, py * 0.2, 99, 2) - 0.5) * 0.14;
      if (joint) s *= 0.55;
      if (breast) s *= 0.8;
      sc.put(px, py, R.rock, s, y);
    }
  line(sc, x - 8, y - 3, x + 8, y - 5, R.wood, lit ? 0.12 : 0.3, y, 2.4);
  line(sc, x + 8, y - 2, x - 6, y - 6, R.wood, lit ? 0.16 : 0.36, y, 2.4);
  if (lit) sc.flames.push({ x, y: y + 1, up: 4, size: 1.15 });
}

function table(sc: Scene, p: P): void {
  const { x, y } = p;
  const w = p.w ?? 50;
  const hw = w / 2;
  for (const lx of [-hw + 2, hw - 4]) for (let py = y - 9; py < y; py++) for (let k = 0; k < 3; k++) sc.put(x + lx + k, py, R.wood, 0.34 - 0.06 * k, y);
  for (let py = y - 18; py < y - 9; py++) {
    const skew = Math.round((y - 9 - py) * 0.5);
    for (let px = Math.floor(x - hw + skew); px <= x + hw + skew; px++)
      sc.put(px, py, R.wood, 0.72 + (vnoise(px * 0.15, py * 0.9, 101) - 0.5) * 0.14 - (py === y - 18 ? 0.2 : 0), y);
  }
  for (let py = y - 9; py < y - 6; py++) for (let px = Math.floor(x - hw); px <= x + hw; px++) sc.put(px, py, R.wood, py === y - 9 ? 0.5 : 0.36, y);
  // A mug and a candle stub
  for (let k = 0; k < 4; k++) {
    sc.put(x - 8, y - 16 - k, R.metal, 0.6, y);
    sc.put(x - 7, y - 16 - k, R.metal, 0.35, y);
  }
  for (let k = 0; k < 3; k++) sc.put(x + 9, y - 16 - k, R.cream, 0.9, y);
  sc.put(x + 9, y - 19, R.fire, 0.8, y);
  sc.blockRect(x - hw - 1, y - 6, x + hw + 2, y + 1);
}

/** A box bed seen from the side and a little above: headboard, pillow, a striped wool blanket. */
function bed(sc: Scene, p: P): void {
  const { x, y } = p;
  const cloth = p.ramp && isRamp(p.ramp) ? R[p.ramp] : R.red;
  const l = x - 24;
  const r = x + 24;
  const span = r - l;
  // legs
  for (const lx of [l + 1, r - 3]) for (let py = y - 4; py < y; py++) for (let k = 0; k < 3; k++) sc.put(lx + k, py, R.wood, 0.3 - 0.05 * k, y);
  // near side: mattress edge at the head, blanket hanging over the rest, then the rail
  for (let py = y - 13; py < y - 4; py++)
    for (let px = l; px <= r; px++) {
      const u = (px - l) / span;
      const k = py - (y - 13);
      if (py >= y - 6) sc.put(px, py, R.wood, py === y - 6 ? 0.66 : 0.42, y);
      else if (u < 0.3) sc.put(px, py, R.cream, k === 0 ? 0.9 : 0.62, y);
      else if (py === y - 7) sc.put(px, py, R.cream, 0.7, y);
      else sc.put(px, py, (px - l) % 9 < 2 ? R.cream : cloth, (px - l) % 9 < 2 ? 0.6 : 0.5 - 0.03 * k, y);
    }
  // top of the bed, leaning away from the viewer
  for (let py = y - 22; py < y - 13; py++) {
    const k = y - 13 - py;
    const skew = Math.round(k * 0.5);
    for (let px = l + skew; px <= r + skew; px++) {
      const u = (px - l - skew) / span;
      if (u < 0.3) {
        const pillow = u > 0.05 && u < 0.26 && k > 1 && k < 8;
        const edge = pillow && (u < 0.08 || u > 0.23 || k === 2 || k === 7);
        sc.put(px, py, pillow ? R.white : R.cream, pillow ? (edge ? 0.7 : 1) : 0.82, y);
      } else {
        const stripe = (px - l - skew) % 9 < 2;
        const fold = u < 0.34;
        sc.put(px, py, stripe ? R.cream : cloth, fold ? 0.5 : (stripe ? 0.9 : 0.78) - 0.004 * (px - x) - 0.012 * k, y);
      }
    }
  }
  // headboard and footboard
  for (let py = y - 33; py < y; py++)
    for (let px = l - 4; px <= l; px++) {
      if (py < y - 31 && (px === l - 4 || px === l)) continue;
      sc.put(px, py, R.wood, px === l - 4 ? 0.74 : py % 6 === 0 ? 0.34 : 0.52, y);
    }
  for (let py = y - 19; py < y; py++) for (let px = r; px <= r + 4; px++) sc.put(px, py, R.wood, px === r ? 0.6 : py === y - 19 ? 0.7 : 0.38, y);
  sc.blockRect(x - 29, y - 6, x + 30, y + 1);
}

function shelf(sc: Scene, p: P): void {
  const { x, y } = p;
  const w = p.w ?? 40;
  const hw = w / 2;
  const SPINES = [R.red, R.blue, R.green, R.purple, R.cream, R.leather];
  for (let py = y - 50; py < y; py++)
    for (let px = Math.floor(x - hw); px <= x + hw; px++) {
      const frame = px < x - hw + 2 || px > x + hw - 2 || py < y - 48;
      const k = (y - py) % 16;
      if (frame || k < 2) {
        sc.put(px, py, R.wood, frame ? 0.36 : k === 1 ? 0.6 : 0.3, y);
        continue;
      }
      const book = Math.floor((px - (x - hw)) / 3);
      const tier = Math.floor((y - py) / 16);
      const tall = 7 + Math.floor(hash2(book, tier, 103) * 6);
      if (hash2(book, tier, 104) < 0.82 && k - 2 < tall) sc.put(px, py, SPINES[Math.floor(hash2(book, tier, 105) * SPINES.length)], (px - (x - hw)) % 3 === 0 ? 0.3 : 0.62, y);
      else sc.put(px, py, R.ink, 0, y);
    }
}

/** A serving counter: plank front, a thick top leaning away, and the innkeeper's wares on it. */
function counter(sc: Scene, p: P): void {
  const { x, y } = p;
  const w = p.w ?? 92;
  const hw = w / 2;
  const h = 24;
  const depth = 7;
  const top = y - h;
  for (let py = top; py < y; py++)
    for (let px = Math.floor(x - hw); px <= x + hw; px++) {
      const lx = px - Math.floor(x - hw);
      let s = 0.52 + (vnoise(px * 0.1, py * 0.6, 106) - 0.5) * 0.12;
      if (lx % 12 === 0) s = 0.22;
      if (py - top < 3) s = 0.26 + 0.05 * (py - top);
      if (py === top + 9 || py === y - 6) s = 0.34;
      if (py === top + 10 || py === y - 5) s = 0.66;
      if (py >= y - 2) s = 0.2;
      sc.put(px, py, R.wood, s, y);
    }
  for (let py = top - depth; py < top; py++) {
    const k = top - py;
    const skew = Math.round(k * 0.6);
    for (let px = Math.floor(x - hw - 2 + skew); px <= x + hw + 2 + skew; px++)
      sc.put(px, py, R.wood, 0.84 - 0.025 * k + (vnoise(px * 0.12, py * 0.9, 107) - 0.5) * 0.1, y);
  }
  for (let px = Math.floor(x - hw - 2); px <= x + hw + 2; px++) {
    sc.put(px, top, R.wood, 1, y);
    sc.put(px, top + 1, R.wood, 0.7, y);
  }
  // Wares standing on the counter: a mug, a green bottle, a red draught, a jug.
  const stand = top - 3;
  const block = (bx: number, bw: number, bh: number, ramp: number, shade: number): void => {
    for (let py = stand - bh; py < stand; py++)
      for (let px = bx; px < bx + bw; px++) sc.put(px, py, ramp, py === stand - bh ? shade + 0.25 : px === bx ? shade + 0.1 : px === bx + bw - 1 ? shade - 0.2 : shade, y);
  };
  const left = Math.floor(x - hw);
  block(left + 10, 5, 6, R.metal, 0.55);
  block(left + 26, 4, 7, R.green, 0.6);
  block(left + 27, 2, 10, R.green, 0.7);
  block(left + Math.round(w * 0.56), 4, 5, R.red, 0.7);
  block(left + Math.round(w * 0.56) + 1, 2, 7, R.cream, 0.7);
  block(left + w - 18, 6, 8, R.leather, 0.6);
  block(left + w - 16, 2, 10, R.leather, 0.5);
  sc.blockRect(x - hw - 1, y - 6, x + hw + 2, y + 1);
}

function throne(sc: Scene, p: P): void {
  const { x, y } = p;
  for (let py = y - 40; py < y; py++)
    for (let px = x - 11; px <= x + 11; px++) {
      const ax = Math.abs(px - x);
      const back = py < y - 13 && ax <= 8;
      const seat = py >= y - 13 && py < y - 9;
      const arm = py >= y - 20 && py < y - 13 && ax >= 9;
      const leg = py >= y - 9 && ax >= 8;
      if (!back && !seat && !arm && !leg) continue;
      const carve = back && (ax + py) % 6 === 0 && py > y - 36;
      sc.put(px, py, R.wood, carve ? 0.75 : back ? 0.42 - 0.012 * (px - x) : seat ? 0.66 : 0.34, y);
    }
  for (const dx of [-8, 8]) for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) sc.put(x + dx - 1 + j, y - 43 + k, R.gold, k === 0 ? 0.95 : 0.6, y);
  sc.blockRect(x - 12, y - 5, x + 13, y + 1);
}

function doorway(sc: Scene, p: P): void {
  const { x, y } = p;
  for (let py = y - 38; py < y; py++)
    for (let px = x - 12; px <= x + 12; px++) {
      const frame = Math.abs(px - x) > 9 || py < y - 35;
      const band = py === y - 28 || py === y - 27 || py === y - 9 || py === y - 8;
      if (frame) sc.put(px, py, R.wood, 0.74 - 0.01 * (px - x), y);
      else if (band) sc.put(px, py, R.metal, 0.36, y);
      else sc.put(px, py, R.wood, (px - x + 40) % 5 === 0 ? 0.1 : 0.28 + 0.05 * (((px - x + 40) / 5) & 1), y);
    }
  sc.put(x + 6, y - 17, R.metal, 0.85, y);
  sc.put(x + 6, y - 16, R.metal, 0.5, y);
}

function banner(sc: Scene, p: P): void {
  const { x, y } = p;
  const ramp = p.ramp && isRamp(p.ramp) ? R[p.ramp] : R.red;
  for (let px = x - 9; px <= x + 9; px++) sc.put(px, y - 1, R.wood, 0.3);
  for (let py = y; py < y + 34; py++)
    for (let px = x - 7; px <= x + 7; px++) {
      const k = py - y;
      if (k > 27 && Math.abs(px - x) > 34 - k) continue;
      const emblem = Math.abs(px - x) + Math.abs(k - 13) < 5;
      sc.put(px, py, emblem ? R.gold : ramp, (emblem ? 0.8 : 0.62) - 0.03 * (px - x) + 0.06 * Math.sin(px * 0.9));
    }
}

function treasure(sc: Scene, p: P): void {
  const { x, y } = p;
  const r = p.r ?? 20;
  for (let py = Math.floor(y - r * 0.5); py < y; py++)
    for (let px = x - r; px <= x + r; px++) {
      const nx = (px - x) / r;
      const ny = (py - y) / (r * 0.5);
      if (nx * nx + ny * ny + (hash2(px, py, 107) - 0.5) * 0.3 > 1) continue;
      const spark = hash2(px, py, 108);
      sc.put(px, py, R.gold, spark > 0.93 ? 1 : 0.6 - 0.3 * nx - 0.25 * (ny + 0.5) + 0.3 * (spark - 0.5), y);
    }
  sc.blockEllipse(x, y - 1, r * 0.9, 3);
}

/** A rune on the wall or floor; it sits behind everything. */
function rune(sc: Scene, p: P): void {
  glyph(sc, p.x, p.y, p.v, (p.h ?? 16) / 8, p.lit === 0 ? R.ink : R.glow, 0.92, 0);
}

/** A dead tree: a bare trunk and a few crooked limbs carrying a line of snow. */
function deadtree(sc: Scene, p: P): void {
  const { x, y } = p;
  const h = p.h ?? 50;
  const seed = p.seed ?? 1;
  const lean = (hash2(seed, 1, 5) - 0.5) * 0.28;
  const at = (t: number): number => x + lean * h * t + Math.sin(t * 5 + seed) * 1.2;
  for (let py = y - h; py < y; py++) {
    const t = (y - py) / h;
    const hw = (1 - t) * h * 0.045 + 0.7;
    const cx = at(t);
    for (let px = Math.floor(cx - hw); px <= cx + hw; px++) sc.put(px, py, R.wood, (px < cx ? 0.5 : 0.26) + 0.1 * hash2(px, py, seed), y);
  }
  const n = 4 + Math.floor(hash2(seed, 2, 5) * 3);
  for (let k = 0; k < n; k++) {
    const t = 0.34 + 0.56 * (k / n) + hash2(seed, 10 + k, 5) * 0.05;
    const side = (k + (seed & 1)) & 1 ? 1 : -1;
    const bx = at(t);
    const by = y - h * t;
    const len = h * (0.36 - 0.24 * t) * (0.7 + hash2(seed, 20 + k, 5) * 0.6);
    const mx = bx + side * len * 0.55;
    const my = by - len * 0.18;
    const ex = bx + side * len;
    const ey = by - len * (0.5 + hash2(seed, 30 + k, 5) * 0.4);
    line(sc, bx, by, mx, my, R.wood, 0.3, y, 1.9);
    line(sc, mx, my, ex, ey, R.wood, 0.36, y, 1.2);
    line(sc, mx, my, mx + side * len * 0.18, my - len * 0.42, R.wood, 0.3, y, 1);
    line(sc, bx + side, by - 1.6, mx, my - 1.6, R.snow, 0.95, y, 1);
    // With v: 'ropes', something hangs from the bigger limbs.
    if (p.v === 'ropes' && len > 14) {
      const drop = 12 + hash2(seed, 40 + k, 5) * 16;
      line(sc, mx, my, mx, my + drop, R.cream, 0.55, y, 1);
      for (let a = 0; a < 8; a++) sc.put(Math.round(mx + Math.cos((a / 8) * Math.PI * 2) * 2), Math.round(my + drop + 3 + Math.sin((a / 8) * Math.PI * 2) * 3), R.cream, 0.5, y);
    }
  }
  // With v: 'lantern', a horn lantern hangs from a limb of its own, high up; 'lamplit' is the same, burning.
  if (p.v === 'lantern' || p.v === 'lamplit') {
    const bx = at(0.66);
    const by = Math.round(y - h * 0.66);
    const ex = Math.round(bx + 12);
    line(sc, bx, by, ex, by - 3, R.wood, 0.34, y, 1.6);
    line(sc, bx + 1, by - 1.6, ex, by - 4.6, R.snow, 0.95, y, 1);
    for (let k = 1; k <= 3; k++) sc.put(ex, by - 3 + k, R.metal, 0.3, y);
    const lit = p.v === 'lamplit';
    for (let dy = 0; dy < 6; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const frame = dy === 0 || dy === 5 || Math.abs(dx) === 2;
        sc.put(ex + dx, by + 1 + dy, frame ? R.metal : lit ? R.fire : R.cream, frame ? 0.35 : lit ? 0.75 + 0.2 * (dy === 3 ? 1 : 0) : 0.3, y);
      }
  }
  sc.blockEllipse(x, y - 1, Math.max(3, h * 0.05), 2.5);
}

/** A dolmen: two uprights and a capstone, big enough to walk under. */
function dolmen(sc: Scene, p: P): void {
  const { x, y } = p;
  const w = p.w ?? 64;
  const h = p.h ?? 44;
  const seed = p.seed ?? 1;
  const rock = (px: number, py: number, nx: number, base: number): void =>
    sc.put(px, py, R.rock, 0.56 - 0.3 * nx + (fbm(px * 0.3, py * 0.2, seed, 3) - 0.5) * 0.3, base);
  for (const side of [-1, 1]) {
    const cx = x + side * (w * 0.32);
    for (let py = Math.floor(y - h * 0.72); py < y; py++) {
      const hw = 6 + (vnoise(py * 0.2, side, seed) - 0.5) * 2;
      for (let px = Math.floor(cx - hw); px <= cx + hw; px++) rock(px, py, (px - cx) / hw, y);
    }
    sc.blockEllipse(cx, y - 1, 8, 3);
  }
  for (let px = Math.floor(x - w / 2); px <= x + w / 2; px++) {
    const nx = (px - x) / (w / 2);
    const top = y - h + 4 * nx * nx + (vnoise(px * 0.15, 3, seed) - 0.5) * 3;
    const foot = y - h * 0.7 + 2 * nx;
    for (let py = Math.floor(top); py < foot; py++) {
      if (py - top < 2.4) sc.put(px, py, R.snow, nx < 0.2 ? 0.97 : 0.68, y);
      else rock(px, py, nx * 0.7 + (py - top) / (foot - top) * 0.5, y);
    }
  }
  // The rune under the capstone: dull by day, alight with v: 'lit'.
  glyph(sc, x, Math.round(y - h * 0.36), 'b', 1.6, p.v === 'lit' ? R.glow : R.rock, p.v === 'lit' ? 0.95 : 0.2, y - 2);
}

/** A great bronze bell, canted over and sunk to its shoulder. */
function bell(sc: Scene, p: P): void {
  const { x, y } = p;
  const r = p.r ?? 20;
  for (let py = Math.floor(y - r * 1.15); py < y; py++)
    for (let px = Math.floor(x - r - 2); px <= x + r + 2; px++) {
      // Leaning a little to the right.
      const nx = (px - x - (y - py) * 0.18) / r;
      const ny = (py - y) / (r * 1.15);
      if (nx * nx + ny * ny > 1) continue;
      const green = vnoise(px * 0.3, py * 0.3, 61) > 0.62;
      const lit = 0.34 - 0.42 * nx - 0.3 * ny + (hash2(px, py, 62) - 0.5) * 0.08;
      if (ny < -0.86 + 0.1 * nx) sc.put(px, py, R.snow, 0.95, y);
      else if (green) sc.put(px, py, R.glow, 0.3 + lit * 0.4, y);
      else sc.put(px, py, R.gold, lit - (Math.abs(ny + 0.3) < 0.035 ? 0.2 : 0), y);
    }
  sc.blockEllipse(x, y - 1, r * 0.9, 3.5);
}

/** A crag: a jagged outcrop of bare rock, snow on its ledges. */
function crag(sc: Scene, p: P): void {
  const { x, y } = p;
  const w = p.w ?? 60;
  const h = p.h ?? 50;
  const seed = p.seed ?? 1;
  const hw = w / 2;
  const pegAt = Math.floor(x - hw) + Math.round(hw * 0.88);
  let pegTop = y;
  for (let px = Math.floor(x - hw); px <= x + hw; px++) {
    const nx = (px - x) / hw;
    const prof = (1 - Math.abs(nx) ** 1.7) * (0.5 + 0.5 * vnoise(px * 0.09, 2, seed)) + 0.1 * vnoise(px * 0.4, 5, seed);
    const top = y - h * clamp(prof);
    for (let py = Math.floor(top); py < y - 2 * nx * nx; py++) {
      const d = py - top;
      const face = vnoise(px * 0.14 + py * 0.05, py * 0.1, seed + 1);
      const crack = Math.abs(vnoise(px * 0.25, py * 0.06, seed + 2) - 0.5) < 0.035;
      let s = 0.52 - 0.3 * nx + (face - 0.5) * 0.44 + (fbm(px * 0.3, py * 0.3, seed + 3, 2) - 0.5) * 0.16;
      if (crack) s *= 0.5;
      if (d < 2.5 + 2 * vnoise(px * 0.3, 1, seed + 4)) sc.put(px, py, R.snow, nx < 0.25 ? 0.97 : 0.68, y);
      else if (d > 6 && vnoise(px * 0.16, py * 0.55, seed + 5) > 0.8) sc.put(px, py, R.snow, nx < 0.25 ? 0.9 : 0.62, y);
      else sc.put(px, py, R.rock, s, y);
    }
    if (px === pegAt) pegTop = top;
  }
  // With v: 'pegs', iron pegs are driven into the face a stride apart, like the rungs of a ladder.
  if (p.v === 'pegs')
    for (let py = y - 5, k = 0; py > pegTop + 5; py -= 5, k++) {
      const px = pegAt + (k & 1 ? 4 : 0);
      for (let j = 0; j < 3; j++) {
        sc.put(px + j, py, R.metal, 1 - 0.2 * j, y + 1);
        sc.put(px + j, py + 1, R.ink, 0, y + 1);
      }
    }
  sc.blockEllipse(x, y - 2, hw * 0.92, Math.max(3, h * 0.07));
}

/** A cairn of flat stones. With v: 'pole', a waymark: a stick and a rag on top. */
function cairn(sc: Scene, p: P): void {
  const { x, y } = p;
  const seed = p.seed ?? 1;
  for (let k = 0; k < 5; k++) {
    const cy = y - 2 - k * 3;
    const rw = 9 - k * 1.5 + hash2(seed, k, 9);
    const off = (hash2(seed, k + 9, 9) - 0.5) * 2;
    for (let py = cy - 2; py <= cy + 1; py++)
      for (let px = Math.floor(x + off - rw); px <= x + off + rw; px++) {
        const nx = (px - x - off) / rw;
        const ny = (py - cy) / 2;
        if (nx * nx + ny * ny > 1.15) continue;
        if (k === 4 && py === cy - 2) sc.put(px, py, R.snow, 0.96, y);
        else sc.put(px, py, R.rock, 0.6 - 0.28 * nx - 0.18 * ny + (hash2(px, py, seed) - 0.5) * 0.1, y);
      }
  }
  if (p.v === 'pole') {
    line(sc, x + 1, y - 15, x + 2, y - 34, R.wood, 0.3, y, 1.5);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) sc.put(x + 3 + i, y - 33 + j + (i >> 2), R.red, 0.62 - i * 0.04, y);
  }
  sc.blockEllipse(x, y - 1, 9, 2.5);
}

/** A length of ruined wall, its top broken down. */
function wall(sc: Scene, p: P): void {
  const { x, y } = p;
  const w = p.w ?? 60;
  const h = p.h ?? 26;
  const seed = p.seed ?? 1;
  for (let px = Math.floor(x - w / 2); px <= x + w / 2; px++) {
    const nx = (px - x) / (w / 2);
    const top = y - h * (0.3 + 0.7 * vnoise(px * 0.07, 3, seed));
    for (let py = Math.floor(top); py < y; py++) {
      const row = Math.floor(py / 6);
      const off = row & 1 ? 5 : 0;
      const joint = ((py % 6) + 6) % 6 === 0 || (px + off) % 10 === 0;
      let s = 0.6 - 0.2 * nx + (hash2(Math.floor((px + off) / 10), row, seed) - 0.5) * 0.18;
      if (joint) s *= 0.6;
      if (py - top < 2) sc.put(px, py, R.snow, 0.94, y);
      else sc.put(px, py, R.rock, s, y);
    }
  }
  sc.blockRect(x - w / 2, y - 4, x + w / 2 + 1, y + 1);
}

/** A wall of blue ice. With v: 'open', a doorway stands in its foot, edged with light. */
function icegate(sc: Scene, p: P): void {
  const { x, y } = p;
  const w = p.w ?? 100;
  const h = p.h ?? 74;
  const seed = p.seed ?? 1;
  const hw = w / 2;
  for (let px = Math.floor(x - hw); px <= x + hw; px++) {
    const nx = (px - x) / hw;
    const top = y - h * (0.78 + 0.22 * vnoise(px * 0.07, 1, seed)) * (1 - 0.3 * nx * nx);
    for (let py = Math.floor(top); py < y; py++) {
      const d = py - top;
      const streak = vnoise(px * 0.3, py * 0.035, seed + 1);
      const deep = fbm(px * 0.05, py * 0.05, seed + 2, 3);
      if (d < 2.2) sc.put(px, py, R.snow, nx < 0.2 ? 0.98 : 0.7, y);
      else sc.put(px, py, R.ice, 0.5 + 0.34 * streak - 0.22 * nx + 0.2 * (deep - 0.5) - (py > y - 4 ? 0.12 : 0), y);
    }
  }
  if (p.v === 'open') {
    for (let py = y - 34; py < y; py++)
      for (let px = x - 11; px <= x + 11; px++) {
        const a = py < y - 23 ? Math.hypot(px - x, py - (y - 23)) : Math.abs(px - x);
        if (a < 9) sc.put(px, py, R.ink, 0, y);
        else if (a < 11) sc.put(px, py, R.glow, 0.9, y);
      }
  } else glyph(sc, x, y - 22, 'c', 2.2, R.water, 0.5, y);
  sc.blockRect(x - hw, y - 5, x + hw + 1, y + 2);
}

const draw = (fn: (sc: Scene, p: P) => void) => ({ draw: fn });
const shaded = (fn: (sc: Scene, p: P) => void, dx: number, rx: number, ry: number) => ({
  draw: fn,
  shadow: (sc: Scene, p: P, def: { kind: string }): void => void (def.kind === 'outdoor' && sc.shadowEllipse(p.x + dx, p.y + 1, rx, ry)),
});

Object.assign(PROPS, {
  stone: shaded(stone, 8, 14, 3.5),
  mound: draw(mound),
  tent: shaded(tent, 14, 26, 4),
  campfire: draw(campfire),
  tower: shaded(tower, 20, 34, 6),
  haystack: shaded(haystack, 8, 18, 4),
  sheep: shaded(sheep, 3, 11, 2.5),
  barrel: shaded(barrel, 4, 10, 2.5),
  anvil: shaded(anvil, 4, 11, 2.5),
  signpost: shaded(signpost, 5, 8, 2),
  bridge: draw(bridge),
  hearth: draw(hearth),
  table: draw(table),
  bed: draw(bed),
  shelf: draw(shelf),
  counter: draw(counter),
  throne: draw(throne),
  doorway: draw(doorway),
  banner: draw(banner),
  treasure: draw(treasure),
  rune: draw(rune),
  icegate: { draw: icegate, shadow: (sc: Scene, p: P, def: { kind: string }): void => void (def.kind === 'outdoor' && sc.shadowEllipse(p.x + 10, p.y + 2, (p.w ?? 100) * 0.56, 5)) },
  deadtree: shaded(deadtree, 6, 10, 2.5),
  bell: shaded(bell, 8, 22, 3.5),
  dolmen: shaded(dolmen, 10, 40, 5),
  cairn: shaded(cairn, 5, 12, 2.5),
  sledge: shaded(sledge, 6, 18, 3),
  hump: shaded(hump, 8, 26, 4),
  icehole: draw(icehole),
  post: draw(post),
  oven: shaded(oven, 6, 16, 3.5),
  crag: { draw: crag, shadow: (sc: Scene, p: P, def: { kind: string }): void => void (def.kind === 'outdoor' && sc.shadowEllipse(p.x + (p.w ?? 60) * 0.22, p.y + 1, (p.w ?? 60) * 0.62, 5)) },
  wall: { draw: wall, shadow: (sc: Scene, p: P, def: { kind: string }): void => void (def.kind === 'outdoor' && sc.shadowEllipse(p.x + 8, p.y + 1, (p.w ?? 60) * 0.56, 3.5)) },
});

// Referenced so bundlers keep the registration above when this file is imported for its effect.
export const SCENERY_READY = PW > 0;
