// A scene is rendered once into material + brightness buffers (style-agnostic), plus a depth
// buffer (the foot line of whatever prop owns each pixel) and a control buffer (blocked ground).
// The three styles then quantise the same buffers in their own way.

import { R } from './palette';
import { clamp, fbm, hash2, lerp, vnoise } from './noise';

export const PW = 320;
export const PH = 168;

export class Scene {
  ramp = new Uint8Array(PW * PH);
  shade = new Float32Array(PW * PH);
  /** Foot line (y) of the prop that owns the pixel; 0 for ground and backdrop. */
  pri = new Uint8Array(PW * PH);
  /** 1 where the ground cannot be walked on. */
  ctl = new Uint8Array(PW * PH);
  /**
   * Optional second material per pixel and how strongly it applies (0..1). Lighting uses this to
   * tint stone warm near fire; each style picks its own way of blending the two.
   */
  ramp2 = new Uint8Array(PW * PH);
  shade2 = new Float32Array(PW * PH);
  mix = new Float32Array(PW * PH);
  /** Light level per pixel, when the scene is lit. Used to darken sprites. */
  light: Float32Array | null = null;
  walkTop = 0;
  flames: { x: number; y: number }[] = [];

  put(x: number, y: number, ramp: number, shade: number, base = 0): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x >= PW || y < 0 || y >= PH) return;
    const i = y * PW + x;
    this.ramp[i] = ramp;
    this.shade[i] = shade < 0 ? 0 : shade > 1 ? 1 : shade;
    this.pri[i] = base > 255 ? 255 : base;
    this.mix[i] = 0;
  }

  /** Darken ground pixels (never props). */
  shadow(x: number, y: number, f: number): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x >= PW || y < 0 || y >= PH) return;
    const i = y * PW + x;
    if (this.pri[i] === 0) this.shade[i] *= f;
  }

  shadowEllipse(cx: number, cy: number, rx: number, ry: number, f = 0.72): void {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d < 1) this.shadow(x, y, d > 0.6 ? (f + 1) / 2 : f);
      }
  }

  blockRect(x0: number, y0: number, x1: number, y1: number): void {
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(PH, y1); y++)
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(PW, x1); x++) this.ctl[y * PW + x] = 1;
  }

  blockEllipse(cx: number, cy: number, rx: number, ry: number): void {
    for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(PH - 1, cy + ry); y++)
      for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(PW - 1, cx + rx); x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.ctl[y * PW + x] = 1;
  }

  blocked(x: number, y: number): boolean {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 6 || x >= PW - 6 || y < this.walkTop || y >= PH - 1) return true;
    return this.ctl[y * PW + x] === 1;
  }
}

function distSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number, ys = 1): number {
  const vx = bx - ax;
  const vy = (by - ay) * ys;
  const wx = px - ax;
  const wy = (py - ay) * ys;
  const t = clamp((wx * vx + wy * vy) / (vx * vx + vy * vy || 1));
  return Math.hypot(wx - vx * t, wy - vy * t);
}

function line(sc: Scene, x0: number, y0: number, x1: number, y1: number, ramp: number, shade: number, base: number, thick = 1.6): void {
  const r = thick / 2;
  for (let y = Math.floor(Math.min(y0, y1) - r); y <= Math.max(y0, y1) + r; y++)
    for (let x = Math.floor(Math.min(x0, x1) - r); x <= Math.max(x0, x1) + r; x++)
      if (distSeg(x + 0.5, y + 0.5, x0, y0, x1, y1) <= r) sc.put(x, y, ramp, shade, base);
}

// =============================================================================================
// Outdoor layers

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

// =============================================================================================
// Outdoor props

export type Prop =
  | { t: 'pine'; x: number; y: number; h: number; seed: number }
  | { t: 'boulder'; x: number; y: number; r: number; seed: number; ramp?: number }
  | { t: 'hall'; x: number; y: number; w: number }
  | { t: 'well'; x: number; y: number }
  | { t: 'woodpile'; x: number; y: number }
  | { t: 'fence'; x: number; y: number; x1: number; y1: number }
  | { t: 'pillar'; x: number; y: number; lit: number }
  | { t: 'brazier'; x: number; y: number }
  | { t: 'sarcophagus'; x: number; y: number; w: number };

function pine(sc: Scene, p: { x: number; y: number; h: number; seed: number }): void {
  const { x, y, h, seed } = p;
  const tiers = Math.max(4, Math.round(h / 10));
  const trunkH = Math.max(3, h * 0.14);
  const top = y - h;
  const cb = y - trunkH;
  const ch = cb - top;
  const maxHW = h * 0.25;
  const tw = Math.max(1, h * 0.035);
  for (let py = Math.floor(cb - 3); py < y; py++)
    for (let px = Math.floor(x - tw); px <= Math.ceil(x + tw); px++)
      sc.put(px, py, R.wood, (px < x ? 0.44 : 0.22) + 0.08 * hash2(px, py, seed), y);
  for (let i = tiers - 1; i >= 0; i--) {
    const a = top + ch * (i / tiers) * 0.9;
    const b = top + ch * ((i + 1) / tiers) + 1.5;
    const hw = maxHW * (0.22 + 0.78 * ((i + 1) / tiers));
    const lean = (hash2(i, 7, seed) - 0.5) * 2;
    for (let py = Math.floor(a); py <= Math.ceil(b + 2); py++) {
      const v = (py - a) / (b - a);
      if (v < 0) continue;
      for (let px = Math.floor(x - hw - 3); px <= Math.ceil(x + hw + 3); px++) {
        const dx = px - x - lean * v;
        const u = Math.abs(dx) / hw;
        const half = hw * Math.pow(Math.min(1, v), 0.8) + (hash2(px, py >> 1, seed) - 0.5) * 2;
        if (Math.abs(dx) > half) continue;
        const yb = b - 2.5 + 3.5 * u * u + (hash2(px >> 1, i, seed + 1) - 0.5) * 2;
        if (py > yb) continue;
        const edge = half - Math.abs(dx);
        const under = yb - py;
        const n = hash2(px, py, seed + 2);
        const left = dx < 0;
        const snowT = (left ? 2.6 : 1.3) + 1.6 * vnoise(px * 0.35, py * 0.35, seed + 3);
        const patch = vnoise(px * 0.22, py * 0.3, seed + 4) > 0.3;
        if (under > 1.6 && patch && (edge < snowT * (0.5 + v) || py - a < 2.2)) {
          sc.put(px, py, R.snow, left ? 0.9 + 0.1 * n : 0.58 + 0.1 * n, y);
        } else {
          let s = 0.38 - 0.16 * (dx / hw) + 0.1 * (n - 0.5);
          if (under < 1.8) s -= 0.18;
          if (v < 0.35 && i > 0) s -= 0.1;
          sc.put(px, py, R.pine, s, y);
        }
      }
    }
  }
  sc.blockEllipse(x, y - 1, Math.max(4, h * 0.06), 2.5);
}

function boulder(sc: Scene, p: { x: number; y: number; r: number; seed: number; ramp?: number }, snowy: boolean): void {
  const { x, y, r, seed } = p;
  const ramp = p.ramp ?? R.rock;
  const rx = r;
  const ry = r * 0.95;
  for (let py = Math.floor(y - ry - 2); py < y; py++)
    for (let px = Math.floor(x - rx - 2); px <= x + rx + 2; px++) {
      const nx = (px - x) / rx;
      const ny = (py - y) / ry;
      const ang = Math.atan2(ny, nx);
      const rr = 1 + (vnoise(ang * 1.6 + 9, seed, seed) - 0.5) * 0.36;
      const d = Math.sqrt(nx * nx + ny * ny) / rr;
      if (d > 1) continue;
      const n = vnoise(px * 0.5, py * 0.5, seed + 1);
      const lamb = clamp(-(nx * 0.6 + ny * 0.8));
      if (snowy && ny < -0.7 + 0.2 * n - 0.15 * nx) sc.put(px, py, R.snow, nx < 0.2 ? 0.96 : 0.62, y);
      else sc.put(px, py, ramp, 0.3 + 0.52 * lamb + 0.16 * (n - 0.5) - (d > 0.86 ? 0.1 : 0), y);
    }
  sc.blockEllipse(x, y - 1, rx * 0.95, Math.max(2, r * 0.3));
}

function hall(sc: Scene, p: { x: number; y: number; w: number }): void {
  const { x, y, w } = p;
  const wallH = 40;
  const roofH = 50;
  const over = 10;
  const logH = 5;
  const wt = y - wallH;
  const LOG = [0.66, 0.58, 0.48, 0.38, 0.2];

  // Log wall
  for (let py = wt; py < y; py++) {
    const li = Math.floor((py - wt) / logH);
    const ly = (py - wt) % logH;
    for (let px = x; px < x + w; px++) {
      let s = LOG[ly] + (vnoise(px * 0.45, li * 5.3, 4) - 0.5) * 0.16 + (hash2(px, py, 2) - 0.5) * 0.05;
      if (px < x + 4 || px >= x + w - 4) s = li & 1 ? s * 0.68 : s * 1.1;
      if (py - wt < 7) s *= 0.5 + 0.07 * (py - wt);
      sc.put(px, py, R.wood, s, y);
    }
  }

  // Stone footing and the snow banked against it
  for (let px = x - 1; px < x + w + 1; px++) {
    const bank = 2 + Math.floor(vnoise(px * 0.18, 1, 8) * 3.5);
    for (let py = y - 5; py < y; py++) {
      if (y - py <= bank) sc.put(px, py, R.snow, 0.82 + 0.14 * hash2(px, py, 3), y);
      else sc.put(px, py, R.rock, 0.3 + 0.28 * hash2(Math.floor((px + (py & 2 ? 3 : 0)) / 7), py >> 1, 3), y);
    }
  }

  // Door
  const dx0 = x + Math.round(w * 0.42);
  const dw = 16;
  const dh = 32;
  const dt = y - dh;
  for (let py = dt - 3; py < y; py++)
    for (let px = dx0 - 3; px < dx0 + dw + 3; px++) {
      const frame = px < dx0 || px >= dx0 + dw || py < dt;
      if (frame) {
        sc.put(px, py, R.wood, py < dt ? (py === dt - 3 ? 0.92 : 0.76) : px < dx0 ? 0.82 : 0.6, y);
        continue;
      }
      const lx = px - dx0;
      const band = py === dt + 7 || py === dt + 8 || py === y - 9 || py === y - 8;
      if (band) sc.put(px, py, R.metal, 0.3 + 0.14 * ((px + py) & 1), y);
      else if (lx % 4 === 0) sc.put(px, py, R.wood, 0.1, y);
      else sc.put(px, py, R.wood, 0.25 + 0.07 * ((lx >> 2) & 1) + (hash2(px, py >> 2, 6) - 0.5) * 0.06, y);
    }
  sc.put(dx0 + dw - 4, y - 16, R.metal, 0.85, y);
  sc.put(dx0 + dw - 5, y - 15, R.metal, 0.6, y);
  sc.put(dx0 + dw - 3, y - 15, R.metal, 0.6, y);
  sc.put(dx0 + dw - 4, y - 14, R.metal, 0.6, y);
  for (let py = y - 2; py < y + 2; py++)
    for (let px = dx0 - 5; px < dx0 + dw + 5; px++)
      sc.put(px, py, R.rock, py === y - 2 ? 0.8 : 0.5 + 0.12 * hash2(px >> 2, py, 9), y);

  // Window with shutters
  const wx = x + Math.round(w * 0.72);
  const wy = y - 29;
  const ww = 12;
  const wh = 11;
  for (let py = wy - 1; py <= wy + wh + 1; py++)
    for (let px = wx - 7; px < wx + ww + 7; px++) {
      const lx = px - wx;
      const lyy = py - wy;
      const glass = lx >= 0 && lx < ww && lyy >= 0 && lyy < wh;
      if (py === wy + wh + 1) {
        if (lx >= -2 && lx < ww + 2) sc.put(px, py, R.snow, 0.96, y);
      } else if (glass) {
        if (lx === 5 || lx === 6 || lyy === 5) sc.put(px, py, R.wood, 0.16, y);
        else sc.put(px, py, R.fire, 0.62 + 0.3 * (1 - Math.hypot(lx - 5.5, lyy - 5) / 8), y);
      } else if (lx >= -1 && lx <= ww) sc.put(px, py, R.wood, 0.78, y);
      else sc.put(px, py, R.wood, (py & 1 ? 0.5 : 0.34) - (lx < -6 || lx > ww + 5 ? 0.12 : 0), y);
    }

  // A painted shield by the door
  const sx = x + Math.round(w * 0.2);
  const sy = y - 25;
  for (let dy = -7; dy <= 7; dy++)
    for (let dx = -7; dx <= 7; dx++) {
      const r = Math.hypot(dx, dy);
      if (r > 6.6) continue;
      if (r < 1.9) sc.put(sx + dx, sy + dy, R.metal, 0.9 - 0.2 * r, y);
      else if (r > 5.3) sc.put(sx + dx, sy + dy, R.metal, 0.5 - 0.03 * (dx + dy), y);
      else if (dx * dy > 0) sc.put(sx + dx, sy + dy, R.cream, 0.8 - 0.03 * (dx + dy), y);
      else sc.put(sx + dx, sy + dy, R.red, 0.66 - 0.035 * (dx + dy), y);
    }

  // Roof: thatch showing at the eaves, deep snow above
  const ry = wt - roofH;
  const ey = wt + 3;
  const rl0 = x + w * 0.16;
  const rr0 = x + w * 0.84;
  for (let py = ry; py < ey; py++) {
    const t = (py - ry) / (ey - ry);
    const l = lerp(rl0, x - over, Math.pow(t, 0.9));
    const r = lerp(rr0, x + w + over, Math.pow(t, 0.9));
    for (let px = Math.floor(l); px < r; px++) {
      const u = (px - l) / (r - l);
      const sl = 0.68 + 0.4 * (fbm(px * 0.06, 2.2, 6, 3) - 0.5) + (px % 29 < 4 ? 0.1 : 0);
      if (t < sl) {
        let s = 0.88 + 0.1 * vnoise(px * 0.08, py * 0.2, 2) - 0.3 * clamp((u - 0.42) / 0.58) - 0.05 * t;
        if (t > sl - 0.05) s = 0.5;
        if (py - ry < 2) s = u < 0.6 ? 1 : 0.8;
        if (py === ry || px - l < 1 || r - px <= 1) s = 0.3;
        sc.put(px, py, R.snow, s, y);
      } else {
        sc.put(px, py, R.thatch, px - l < 1 || r - px <= 1 ? 0.1 : 0.34 + 0.4 * vnoise(px * 0.8, py * 0.12, 21) - 0.5 * (t - sl), y);
      }
    }
  }
  for (let px = Math.floor(x - over + 1); px < x + w + over - 1; px++) {
    sc.put(px, ey, R.wood, 0.12, y);
    if (hash2(px, 0, 41) > 0.6) {
      const len = 1 + Math.floor(hash2(px, 1, 41) * 6);
      for (let k = 0; k < len; k++) sc.put(px, ey + 1 + k, R.snow, k === len - 1 ? 0.72 : 0.98, y);
    }
  }
  // Crossed gable beams at each end of the ridge
  for (const ex of [rl0, rr0]) {
    line(sc, ex - 6, ry + 7, ex + 5, ry - 8, R.wood, 0.3, y, 2.2);
    line(sc, ex + 6, ry + 7, ex - 5, ry - 8, R.wood, 0.42, y, 2.2);
    sc.put(ex + 5, ry - 9, R.snow, 1, y);
    sc.put(ex - 5, ry - 9, R.snow, 1, y);
  }
  // Smoke from the roof vent
  const vx = x + w * 0.5;
  for (let k = 0; k < 30; k++) {
    const cx = vx + k * 0.9 + Math.sin(k * 0.45) * 2.5;
    const cy = ry - 2 - k * 1.25;
    const rad = 1.6 + k * 0.17;
    for (let py = Math.floor(cy - rad); py <= cy + rad; py++)
      for (let px = Math.floor(cx - rad); px <= cx + rad; px++)
        if (Math.hypot(px - cx, py - cy) < rad && hash2(px, py, 50) > 0.3 + k * 0.02) sc.put(px, py, R.rock, 0.78 + 0.2 * hash2(px, py, 51));
  }

  sc.blockRect(x - 3, y - 7, x + w + 3, y + 1);
}

function hallShadow(sc: Scene, p: { x: number; y: number; w: number }): void {
  for (let py = p.y - 6; py < p.y + 9; py++)
    for (let px = p.x + p.w - 2; px < p.x + p.w + 30 - (p.y + 9 - py) * 0.8; px++) sc.shadow(px, py, 0.7);
  for (let py = p.y; py < p.y + 4; py++) for (let px = p.x - 6; px < p.x + p.w; px++) sc.shadow(px, py, 0.76 + 0.06 * (py - p.y));
}

function well(sc: Scene, p: { x: number; y: number }): void {
  const { x, y } = p;
  // posts behind the ring
  for (let py = y - 30; py < y - 8; py++) {
    sc.put(x - 10, py, R.wood, 0.55, y);
    sc.put(x - 9, py, R.wood, 0.34, y);
    sc.put(x + 9, py, R.wood, 0.5, y);
    sc.put(x + 10, py, R.wood, 0.28, y);
  }
  // stone ring
  for (let py = y - 10; py < y; py++)
    for (let px = x - 11; px <= x + 11; px++) {
      const dx = (px - x) / 11.5;
      if (py > y - 1 - 3 * dx * dx) continue;
      const row = Math.floor((py - (y - 10)) / 3);
      const bx = Math.floor((px + (row & 1 ? 3 : 0)) / 6);
      const joint = (py - (y - 10)) % 3 === 0 || (px + (row & 1 ? 3 : 0)) % 6 === 0;
      const s = 0.66 - 0.3 * dx + 0.12 * (hash2(bx, row, 12) - 0.5);
      sc.put(px, py, R.rock, joint ? s * 0.55 : s, y);
    }
  for (let py = y - 15; py <= y - 7; py++)
    for (let px = x - 12; px <= x + 12; px++) {
      const d = ((px - x) / 12) ** 2 + ((py - (y - 11)) / 3.8) ** 2;
      const di = ((px - x) / 8.5) ** 2 + ((py - (y - 11)) / 2.3) ** 2;
      if (d > 1) continue;
      if (di < 1) sc.put(px, py, R.ink, 0, y);
      else if (py < y - 11) sc.put(px, py, R.snow, 0.94, y);
      else sc.put(px, py, R.rock, 0.8 - 0.25 * ((px - x) / 12), y);
    }
  // little roof
  for (let py = y - 40; py < y - 28; py++) {
    const hw = (py - (y - 41)) * 1.25;
    for (let px = Math.floor(x - hw); px <= x + hw; px++) {
      const top = py - (y - 40) < 2 + Math.abs(px - x) * 0.18;
      if (top || Math.abs(px - x) > hw - 1.5) sc.put(px, py, R.snow, px < x + 2 ? 0.96 : 0.66, y);
      else sc.put(px, py, R.wood, px < x ? 0.5 : 0.3, y);
    }
  }
  for (let px = x - 15; px <= x + 15; px++) sc.put(px, y - 28, R.wood, 0.14, y);
  // windlass, rope and bucket
  for (let px = x - 8; px < x + 9; px++) sc.put(px, y - 25, R.wood, 0.62, y);
  for (let py = y - 24; py < y - 17; py++) sc.put(x + 1, py, R.thatch, 0.8, y);
  for (let py = y - 17; py < y - 12; py++)
    for (let px = x - 2; px <= x + 3; px++) sc.put(px, py, py === y - 15 ? R.metal : R.wood, py === y - 15 ? 0.6 : px < x + 1 ? 0.6 : 0.4, y);
  sc.blockEllipse(x, y - 2, 14, 4.5);
}

function woodpile(sc: Scene, p: { x: number; y: number }): void {
  const { x, y } = p;
  const rows = [5, 4, 3];
  rows.forEach((n, r) => {
    for (let k = 0; k < n; k++) {
      const cx = x + r * 3 + k * 6 + 3;
      const cy = y - 3 - r * 5;
      for (let dy = -3; dy <= 2; dy++)
        for (let dx = -3; dx <= 2; dx++) {
          const d = Math.hypot(dx + 0.5, dy + 0.5);
          if (d > 3.1) continue;
          if (r === 2 && dy < -1) sc.put(cx + dx, cy + dy, R.snow, 0.95, y);
          else if (d > 2.1) sc.put(cx + dx, cy + dy, R.wood, 0.26, y);
          else sc.put(cx + dx, cy + dy, R.wood, d < 0.9 ? 0.6 : 0.82 - 0.06 * (dx + dy), y);
        }
    }
  });
  for (let px = x + 4; px < x + 26; px++) if (hash2(px, 3, 60) > 0.25) sc.put(px, y - 16, R.snow, 0.97, y);
  sc.blockRect(x - 1, y - 5, x + 33, y + 1);
}

function fence(sc: Scene, p: { x: number; y: number; x1: number; y1: number }): void {
  const n = Math.max(1, Math.round(Math.abs(p.x1 - p.x) / 15));
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const px = Math.round(lerp(p.x, p.x1, t));
    const py = Math.round(lerp(p.y, p.y1, t));
    if (k < n) {
      const nx = Math.round(lerp(p.x, p.x1, (k + 1) / n));
      const ny = Math.round(lerp(p.y, p.y1, (k + 1) / n));
      const sag = hash2(k, 4, 70) > 0.8 ? 3 : 0;
      line(sc, px, py - 8, nx, ny - 8 + sag, R.wood, 0.52, Math.max(py, ny), 1.2);
      line(sc, px, py - 4, nx, ny - 4, R.wood, 0.4, Math.max(py, ny), 1.2);
    }
    for (let j = 0; j < 11; j++) {
      sc.put(px, py - j, R.wood, 0.56, py);
      sc.put(px + 1, py - j, R.wood, 0.3, py);
    }
    sc.put(px, py - 11, R.snow, 1, py);
    sc.put(px + 1, py - 11, R.snow, 0.9, py);
  }
  const steps = Math.abs(p.x1 - p.x);
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    sc.blockRect(lerp(p.x, p.x1, t) - 1, lerp(p.y, p.y1, t) - 2, lerp(p.x, p.x1, t) + 2, lerp(p.y, p.y1, t) + 1);
  }
}

// =============================================================================================
// Dungeon pieces

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

function arch(sc: Scene, cx: number, fl: number, w: number, h: number): void {
  const hw = w / 2;
  const top = fl - h;
  const ring = 7;
  for (let y = top - ring - 1; y < fl; y++)
    for (let x = cx - hw - ring - 1; x <= cx + hw + ring + 1; x++) {
      const dx = x - cx;
      const inArc = y < top + hw;
      const d = inArc ? Math.hypot(dx, y - (top + hw)) : Math.abs(dx);
      if (d < hw) {
        const stair = fl - y;
        if (stair < 9 && stair % 3 === 0) sc.put(x, y, R.stone, 0.2 - stair * 0.015);
        else sc.put(x, y, R.ink, 0);
      } else if (d < hw + ring) {
        const ang = inArc ? Math.atan2(y - (top + hw), dx) : 0;
        const seg = inArc ? Math.floor(((ang + Math.PI) / Math.PI) * 9) : Math.floor((fl - y) / 11) + 20;
        const edge = inArc
          ? Math.abs(((ang + Math.PI) / Math.PI) * 9 - Math.round(((ang + Math.PI) / Math.PI) * 9)) < 0.07
          : (fl - y) % 11 === 0;
        let s = 0.74 + 0.16 * (hash2(seg, 2, 23) - 0.5) - 0.2 * ((d - hw) / ring);
        if (edge) s = 0.2;
        if (d > hw + ring - 1.2) s = 0.24;
        sc.put(x, y, R.stone, s);
      }
    }
  // Runes cut into the arch stones
  const glyphs: number[][][] = [
    [[0, 0, 0, 5], [0, 0, 2, 2], [0, 3, 2, 5]],
    [[1, 0, 1, 5], [1, 1, 3, 0], [1, 3, 3, 2]],
    [[0, 0, 2, 2], [2, 2, 0, 5], [2, 0, 2, 5]],
    [[0, 0, 0, 5], [2, 0, 2, 5], [0, 1, 2, 4]],
    [[1, 0, 1, 5], [0, 2, 1, 0], [2, 2, 1, 0]],
  ];
  for (let k = 0; k < 5; k++) {
    const ang = Math.PI * (1.17 + 0.165 * k);
    const gx = Math.round(cx + Math.cos(ang) * (hw + 3.2) - 1);
    const gy = Math.round(top + hw + Math.sin(ang) * (hw + 3.2) - 2.5);
    for (const [x0, y0, x1, y1] of glyphs[k]) line(sc, gx + x0 + 0.5, gy + y0 + 0.5, gx + x1 + 0.5, gy + y1 + 0.5, R.glow, 0.92, 0, 1.05);
  }
}

function niche(sc: Scene, x0: number, y0: number, w: number, h: number): void {
  for (let y = y0 - 2; y < y0 + h + 2; y++)
    for (let x = x0 - 2; x < x0 + w + 2; x++) {
      const inside = x >= x0 && x < x0 + w && y >= y0 && y < y0 + h;
      if (!inside) {
        sc.put(x, y, R.stone, y >= y0 + h ? 0.82 : x >= x0 + w ? 0.7 : 0.3);
        continue;
      }
      let s = 0.1 + 0.12 * ((x - x0) / w) + 0.1 * ((y - y0) / h);
      const ux = x - (x0 + w / 2);
      const uy = y - (y0 + h - 7);
      const belly = (ux / 5.5) ** 2 + (uy / 5.5) ** 2 < 1 && uy < 6;
      const neck = Math.abs(ux) < 2.5 && uy <= -5 && uy > -9;
      const rim = Math.abs(ux) < 4 && uy <= -9 && uy > -11;
      if (belly || neck || rim) s = 0.62 - 0.07 * ux + (uy === -2 || uy === -1 ? 0.2 : 0);
      if (y >= y0 + h - 1) s = 0.5;
      sc.put(x, y, R.stone, s);
    }
}

function pillar(sc: Scene, p: { x: number; y: number; lit: number }): void {
  const { x, y } = p;
  for (let py = 0; py < y; py++) {
    const cap = py < 9 || py >= y - 7;
    const hw = cap ? 12 : 8;
    for (let px = x - hw; px < x + hw; px++) {
      const nx = (px - x + 0.5) / hw;
      let s = 0.62 + 0.3 * nx * p.lit - 0.22 * Math.abs(nx) ** 2 + (fbm(px * 0.2, py * 0.08, 27, 3) - 0.5) * 0.2;
      if (!cap && py % 24 === 12) s = 0.16;
      if (!cap && py % 24 === 13) s += 0.1;
      if (cap && (py === 8 || py === y - 7)) s = 0.2;
      if (cap && (py === 0 || py === y - 6)) s += 0.14;
      if (!cap && py > 40 && py < 48) {
        const notch = (px - x + 8) % 4 === 1 && py > 41 && py < 47;
        s = notch ? 0.18 : s + 0.08;
        if (py === 41 || py === 47) s = 0.22;
      }
      sc.put(px, py, R.stone, s, y);
    }
  }
  sc.blockEllipse(x, y - 2, 14, 4);
}

function brazier(sc: Scene, p: { x: number; y: number }): void {
  const { x, y } = p;
  line(sc, x - 5, y - 11, x - 8, y - 1, R.metal, 0.3, y, 1.6);
  line(sc, x + 5, y - 11, x + 8, y - 1, R.metal, 0.22, y, 1.6);
  line(sc, x, y - 11, x, y - 3, R.metal, 0.16, y, 1.6);
  for (let py = y - 17; py <= y - 10; py++)
    for (let px = x - 9; px <= x + 9; px++) {
      const d = ((px - x) / 9) ** 2 + ((py - (y - 16)) / 6.5) ** 2;
      if (py < y - 16 || d > 1) continue;
      if (py === y - 16) sc.put(px, py, R.fire, 0.5 + 0.3 * hash2(px, 1, 80), y);
      else sc.put(px, py, R.metal, 0.42 - 0.2 * ((px - x) / 9) - 0.05 * (py - (y - 16)), y);
    }
  sc.blockEllipse(x, y - 2, 10, 3.5);
  sc.flames.push({ x, y });
}

function sarcophagus(sc: Scene, p: { x: number; y: number; w: number }): void {
  const { x, y, w } = p;
  const fh = 13;
  const lid = 8;
  const skew = 8;
  // lid top (a parallelogram leaning away)
  for (let py = y - fh - lid; py < y - fh; py++) {
    const k = (y - fh - py) / lid;
    const off = skew * k;
    for (let px = Math.floor(x - 2 + off); px < x + w + 2 + off; px++) {
      const lx = (px - (x - 2 + off)) / (w + 4);
      let s = 0.78 + 0.1 * (fbm(px * 0.2, py * 0.3, 33, 2) - 0.5) - 0.12 * lx;
      const fig = ((lx - 0.52) / 0.36) ** 2 + ((k - 0.5) / 0.32) ** 2;
      if (fig < 1) s += 0.12 - 0.2 * fig;
      if (py === y - fh - lid || lx < 0.012) s = 0.95;
      sc.put(px, py, R.stone, s, y);
    }
  }
  // front face with carved panels
  for (let py = y - fh; py < y; py++)
    for (let px = x; px < x + w; px++) {
      const lx = px - x;
      const ly = py - (y - fh);
      let s = 0.52 + 0.1 * (fbm(px * 0.2, py * 0.2, 35, 2) - 0.5);
      if (ly < 2) s = ly === 0 ? 0.25 : 0.68;
      const panel = lx % 15;
      if (ly > 3 && ly < fh - 2 && lx > 2 && lx < w - 2) {
        if (panel === 2 || ly === 4) s = 0.3;
        else if (panel === 14 || ly === fh - 3) s = 0.66;
        else if (panel > 2) s -= 0.08;
      }
      if (py === y - 1) s = 0.3;
      sc.put(px, py, R.stone, s, y);
    }
  // right end
  for (let px = x + w; px < x + w + skew + 2; px++) {
    const k = (px - (x + w)) / (skew + 2);
    for (let py = Math.floor(y - fh - lid * k); py < y - lid * k; py++) sc.put(px, py, R.stone, 0.32 - 0.1 * k, y);
  }
  sc.blockRect(x - 2, y - 6, x + w + skew + 2, y + 1);
}

interface Light {
  x: number;
  y: number;
  r: number;
  i: number;
  kind: 'warm' | 'glow';
}

function lightPass(sc: Scene, lights: Light[], ambient: number): void {
  const L = (sc.light = new Float32Array(PW * PH));
  for (let y = 0; y < PH; y++)
    for (let x = 0; x < PW; x++) {
      let tot = ambient;
      let warm = 0;
      let glow = 0;
      for (const l of lights) {
        const dx = x - l.x;
        const dy = y - l.y;
        const f = l.i / (1 + (dx * dx + dy * dy * 2.2) / (l.r * l.r)) ** 1.25;
        tot += f;
        if (l.kind === 'warm') warm += f;
        else glow += f;
      }
      tot *= 1 - 0.22 * Math.pow(Math.abs(x - 160) / 160, 2.4);
      const i = y * PW + x;
      L[i] = tot;
      const rp = sc.ramp[i];
      if (rp === R.glow || rp === R.fire || rp === R.ink) continue;
      const base = sc.shade[i];
      sc.shade[i] = clamp(base * Math.min(1.3, tot));
      if (rp !== R.stone) continue;
      const g = glow > 0.1 ? (glow / tot) * 1.5 : 0;
      const w = (warm / tot) * Math.min(1, tot * 1.4);
      if (g > w) {
        sc.ramp2[i] = R.glow;
        sc.shade2[i] = clamp(base * Math.min(1, tot) * 0.62);
        sc.mix[i] = g;
      } else {
        sc.ramp2[i] = R.stoneW;
        sc.shade2[i] = sc.shade[i];
        sc.mix[i] = w;
      }
    }
}

// =============================================================================================
// Scene definitions. These are plain data: layers plus a list of props.

function drawProp(sc: Scene, p: Prop, outdoors: boolean): void {
  switch (p.t) {
    case 'pine': return pine(sc, p);
    case 'boulder': return boulder(sc, p, outdoors);
    case 'hall': return hall(sc, p);
    case 'well': return well(sc, p);
    case 'woodpile': return woodpile(sc, p);
    case 'fence': return fence(sc, p);
    case 'pillar': return pillar(sc, p);
    case 'brazier': return brazier(sc, p);
    case 'sarcophagus': return sarcophagus(sc, p);
  }
}

function castShadow(sc: Scene, p: Prop): void {
  switch (p.t) {
    case 'pine': return sc.shadowEllipse(p.x + p.h * 0.2, p.y + 1, p.h * 0.28, Math.max(2, p.h * 0.05));
    case 'boulder': return sc.shadowEllipse(p.x + p.r * 0.7, p.y, p.r * 1.3, Math.max(1.5, p.r * 0.3));
    case 'hall': return hallShadow(sc, p);
    case 'well': return sc.shadowEllipse(p.x + 9, p.y + 1, 19, 4.5);
    case 'woodpile': return sc.shadowEllipse(p.x + 24, p.y, 18, 3);
    default: return;
  }
}

const VILLAGE_PROPS: Prop[] = [
  { t: 'pine', x: 6, y: 98, h: 64, seed: 1 },
  { t: 'pine', x: 163, y: 95, h: 56, seed: 2 },
  { t: 'pine', x: 188, y: 91, h: 44, seed: 3 },
  { t: 'pine', x: 214, y: 94, h: 52, seed: 4 },
  { t: 'pine', x: 243, y: 90, h: 40, seed: 5 },
  { t: 'pine', x: 268, y: 98, h: 66, seed: 6 },
  { t: 'pine', x: 298, y: 107, h: 82, seed: 7 },
  { t: 'pine', x: 319, y: 95, h: 52, seed: 8 },
  { t: 'hall', x: 22, y: 118, w: 124 },
  { t: 'woodpile', x: 152, y: 119 },
  { t: 'well', x: 228, y: 128 },
  { t: 'boulder', x: 200, y: 156, r: 11, seed: 21 },
  { t: 'boulder', x: 100, y: 162, r: 7, seed: 22 },
  { t: 'boulder', x: 286, y: 143, r: 7, seed: 23 },
  { t: 'fence', x: 6, y: 141, x1: 52, y1: 147 },
  { t: 'pine', x: 2, y: 180, h: 112, seed: 11 },
  { t: 'pine', x: 314, y: 182, h: 100, seed: 12 },
];

export function buildVillage(): Scene {
  const sc = new Scene();
  const hz = 70;
  sc.walkTop = 92;
  sky(sc, hz);
  mountains(sc, { base: hz + 3, height: 60, seed: 3, far: true });
  mountains(sc, { base: hz + 5, height: 36, seed: 14, far: false });
  treeline(sc, hz + 4, 5, 0.34, 5, 6, 5);
  snowfield(sc, hz + 4);
  treeline(sc, hz + 9, 6, 0.2, 7, 9, 7);
  path(sc, hz, [[82, 120], [100, 131], [140, 143], [168, 156], [178, 172]], 13);
  path(sc, hz, [[140, 143], [200, 139], [262, 134], [324, 127]], 11);
  const props = [...VILLAGE_PROPS].sort((a, b) => a.y - b.y);
  props.forEach((p) => castShadow(sc, p));
  tufts(sc, hz, 46, 90);
  props.forEach((p) => drawProp(sc, p, true));
  return sc;
}

const DUNGEON_PROPS: Prop[] = [
  { t: 'pillar', x: 62, y: 108, lit: 1 },
  { t: 'pillar', x: 258, y: 108, lit: -1 },
  { t: 'brazier', x: 112, y: 128 },
  { t: 'sarcophagus', x: 196, y: 154, w: 62 },
  { t: 'boulder', x: 40, y: 150, r: 6, seed: 31, ramp: R.stone },
  { t: 'boulder', x: 52, y: 156, r: 4, seed: 32, ramp: R.stone },
  { t: 'boulder', x: 296, y: 132, r: 5, seed: 33, ramp: R.stone },
];

export function buildDungeon(): Scene {
  const sc = new Scene();
  const fl = 98;
  sc.walkTop = 106;
  dungeonWall(sc, fl);
  dungeonFloor(sc, fl);
  arch(sc, 160, fl, 46, 62);
  niche(sc, 96, 54, 26, 20);
  niche(sc, 198, 54, 26, 20);
  // pillars throw a soft shadow on the wall, away from the fire
  for (let y = 0; y < fl; y++) {
    for (let k = 0; k < 16; k++) {
      sc.shade[y * PW + 52 - k] *= 0.55 + 0.028 * k;
      sc.shade[y * PW + 268 + k] *= 0.6 + 0.025 * k;
    }
  }
  const props = [...DUNGEON_PROPS].sort((a, b) => a.y - b.y);
  props.forEach((p) => drawProp(sc, p, false));
  lightPass(
    sc,
    [
      { x: 112, y: 108, r: 78, i: 1.3, kind: 'warm' },
      { x: 160, y: 46, r: 24, i: 0.55, kind: 'glow' },
    ],
    0.34,
  );
  return sc;
}

/** Animated brazier flame, drawn each frame. Returns brightness (0 = no flame) for a local offset. */
export function flameAt(dx: number, up: number, tick: number, seed: number): number {
  const h = 15;
  if (up < 0 || up > h) return 0;
  const v = up / h;
  const w = 6.5 * (1 - v) ** 0.7 + 0.5;
  const wob = (vnoise(up * 0.3 - tick * 0.16, seed, 91) - 0.5) * 5 * v;
  const n = vnoise((dx + 20) * 0.45, up * 0.35 - tick * 0.22, 92 + seed);
  const i = 1 - Math.abs(dx - wob) / w - v * 0.55 + (n - 0.5) * 0.9;
  return i > 0 ? clamp(0.4 + i * 1.1) : 0;
}
