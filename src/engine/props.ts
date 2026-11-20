// The prop library. A prop is drawn from a few parameters and carries its own depth (foot line)
// and collision footprint, so placing one in a room's data is all it takes.

import { R } from './palette';
import { PH, PW, Scene, line } from './scene';
import { clamp, fbm, hash2, lerp, vnoise } from './noise';
import type { PropDef, SceneDef } from './types';

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

/**
 * A log hall under a thatched roof. `v` picks a look: as winter has it (the default), 'cold'
 * for a house with no fire in it, 'thaw' for one the snow is letting go of, and 'smoke' for the
 * smoke alone, to be added to a cold house once its fire is lit.
 */
function hall(sc: Scene, p: { x: number; y: number; w: number; v?: string }): void {
  const { x, y, w } = p;
  const thaw = p.v === 'thaw';
  if (p.v === 'smoke') return hallSmoke(sc, p);
  const wallH = 40;
  const roofH = Math.min(50, Math.round(w * 0.45));
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
    const bank = thaw ? Math.floor(vnoise(px * 0.18, 1, 8) * 1.7) : 2 + Math.floor(vnoise(px * 0.18, 1, 8) * 3.5);
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

  if (w >= 84) {
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
        if (lx >= -2 && lx < ww + 2) sc.put(px, py, thaw ? R.wood : R.snow, thaw ? 0.5 : 0.96, y);
      } else if (glass) {
        if (lx === 5 || lx === 6 || lyy === 5) sc.put(px, py, R.wood, 0.16, y);
        else sc.put(px, py, R.fire, 0.62 + 0.3 * (1 - Math.hypot(lx - 5.5, lyy - 5) / 8), y);
      } else if (lx >= -1 && lx <= ww) sc.put(px, py, R.wood, 0.78, y);
      else sc.put(px, py, R.wood, (py & 1 ? 0.5 : 0.34) - (lx < -6 || lx > ww + 5 ? 0.12 : 0), y);
    }

  }
  if (w >= 100) {
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
      // How far down from the ridge the snow still lies: most of the way in winter, a ragged cap in a thaw.
      const sl = thaw ? 0.26 + 0.5 * (fbm(px * 0.09, 2.2, 6, 3) - 0.5) : 0.68 + 0.4 * (fbm(px * 0.06, 2.2, 6, 3) - 0.5) + (px % 29 < 4 ? 0.1 : 0);
      if (t < sl) {
        let s = 0.88 + 0.1 * vnoise(px * 0.08, py * 0.2, 2) - 0.3 * clamp((u - 0.42) / 0.58) - 0.05 * t;
        if (t > sl - 0.05) s = 0.5;
        if (py - ry < 2) s = u < 0.6 ? 1 : 0.8;
        if (py === ry || px - l < 1 || r - px <= 1) s = 0.3;
        sc.put(px, py, R.snow, s, y);
      } else {
        // Thatch, darker where it is wet.
        const wet = thaw ? 0.84 - 0.1 * vnoise(px * 0.3, py * 0.5, 23) : 1;
        sc.put(px, py, R.thatch, px - l < 1 || r - px <= 1 ? 0.1 : (0.34 + 0.4 * vnoise(px * 0.8, py * 0.12, 21) - (thaw ? 0.12 : 0.5) * (t - sl)) * wet, y);
      }
    }
  }
  for (let px = Math.floor(x - over + 1); px < x + w + over - 1; px++) {
    sc.put(px, ey, R.wood, 0.12, y);
    // Icicles along the eave; in a thaw, drops falling from it instead.
    if (thaw) {
      if (hash2(px, 0, 41) > 0.82) sc.put(px, ey + 2 + Math.floor(hash2(px, 2, 41) * 9), R.ice, 0.95, y);
    } else if (hash2(px, 0, 41) > 0.6) {
      const len = 1 + Math.floor(hash2(px, 1, 41) * 6);
      for (let k = 0; k < len; k++) sc.put(px, ey + 1 + k, R.snow, k === len - 1 ? 0.72 : 0.98, y);
    }
  }
  // Crossed gable beams at each end of the ridge
  for (const ex of [rl0, rr0]) {
    line(sc, ex - 6, ry + 7, ex + 5, ry - 8, R.wood, 0.3, y, 2.2);
    line(sc, ex + 6, ry + 7, ex - 5, ry - 8, R.wood, 0.42, y, 2.2);
    if (!thaw) {
      sc.put(ex + 5, ry - 9, R.snow, 1, y);
      sc.put(ex - 5, ry - 9, R.snow, 1, y);
    }
  }
  if (p.v !== 'cold') hallSmoke(sc, p);

  sc.blockRect(x - 3, y - 7, x + w + 3, y + 1);
}

/** Smoke from a hall's roof vent. */
function hallSmoke(sc: Scene, p: { x: number; y: number; w: number }): void {
  const { x, y, w } = p;
  const ry = y - 40 - Math.min(50, Math.round(w * 0.45));
  const vx = x + w * 0.5;
  for (let k = 0; k < 30; k++) {
    const cx = vx + k * 0.9 + Math.sin(k * 0.45) * 2.5;
    const cy = ry - 2 - k * 1.25;
    const rad = 1.6 + k * 0.17;
    for (let py = Math.floor(cy - rad); py <= cy + rad; py++)
      for (let px = Math.floor(cx - rad); px <= cx + rad; px++)
        if (Math.hypot(px - cx, py - cy) < rad && hash2(px, py, 50) > 0.3 + k * 0.02) sc.put(px, py, R.rock, 0.78 + 0.2 * hash2(px, py, 51));
  }
}

/**
 * Ground the snow has let go of: wet earth and flattened grass, a puddle or two, slush at the
 * rim. Only snow lying on open ground is changed, so it can be laid over anything.
 */
function melt(sc: Scene, p: { x: number; y: number; w: number; h: number; seed: number }): void {
  const rx = p.w / 2;
  const ry = p.h / 2;
  for (let py = Math.floor(p.y - ry - 3); py <= p.y + ry + 3; py++)
    for (let px = Math.floor(p.x - rx - 4); px <= p.x + rx + 4; px++) {
      if (px < 0 || px >= PW || py < 0 || py >= PH) continue;
      const i = py * PW + px;
      if (sc.pri[i] !== 0 || sc.ramp[i] !== R.snow) continue;
      const d = Math.hypot((px - p.x) / rx, (py - p.y) / ry) + (fbm(px * 0.13, py * 0.3, p.seed, 3) - 0.5) * 0.9;
      if (d >= 1) continue;
      // Whatever shadow already lay on the snow lies on the mud as well.
      const lit = clamp(sc.shade[i] / 0.86, 0.55, 1);
      const m = fbm(px * 0.21, py * 0.4, p.seed + 7, 3);
      // Broad shapes, so that grass lies in swathes and water stands in pools rather than in specks.
      const grass = fbm(px * 0.07, py * 0.16, p.seed + 11, 2);
      const pool = fbm(px * 0.05, py * 0.14, p.seed + 19, 2);
      if (d > 0.8) sc.shade[i] = (0.5 + 0.16 * m) * lit;
      else if (pool < 0.3 && d < 0.6) [sc.ramp[i], sc.shade[i]] = [R.water, 0.62 + 0.3 * m];
      else if (grass > 0.58) [sc.ramp[i], sc.shade[i]] = [R.thatch, (0.24 + 0.3 * m) * lit];
      else [sc.ramp[i], sc.shade[i]] = [R.earth, (0.3 + 0.45 * m) * lit];
    }
}

/** A figure of snow, built by somebody short: three lumps, two stones for eyes, and a scrap of cloth. */
function snowman(sc: Scene, p: { x: number; y: number; ramp: number }): void {
  const { x, y } = p;
  const ball = (cy: number, r: number): void => {
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++)
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        const d = Math.hypot(dx, dy * 1.08);
        if (d > r) continue;
        sc.put(x + dx, cy + dy, R.snow, d > r - 0.9 ? 0.42 : 0.92 - 0.3 * clamp((dx + dy) / (r * 1.6) + 0.35) + 0.06 * hash2(x + dx, cy + dy, 77), y);
      }
  };
  ball(y - 6, 6.4);
  ball(y - 15, 4.8);
  ball(y - 22, 3.4);
  // Arms, which were firewood this morning.
  line(sc, x - 4, y - 16, x - 11, y - 20, R.wood, 0.3, y, 1.2);
  line(sc, x + 4, y - 16, x + 11, y - 21, R.wood, 0.4, y, 1.2);
  sc.put(x - 1, y - 23, R.rock, 0.05, y);
  sc.put(x + 2, y - 23, R.rock, 0.05, y);
  // A scrap of wool at the neck, and its tail.
  for (let dx = -3; dx <= 3; dx++) sc.put(x + dx, y - 19, p.ramp, dx > 1 ? 0.45 : 0.7, y);
  for (let k = 0; k < 4; k++) sc.put(x + 3, y - 18 + k, p.ramp, 0.6 - 0.08 * k, y);
  sc.blockRect(x - 5, y - 3, x + 5, y + 1);
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
  sc.flames.push({ x, y, up: 16, size: 1 });
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

// ---------------------------------------------------------------------------------------------

export interface PropImpl {
  /** Fields a PropDef of this type must provide. */
  needs?: (keyof PropDef)[];
  draw(sc: Scene, p: PropDef, def: SceneDef): void;
  /** Darkens the ground before any prop is drawn. */
  shadow?(sc: Scene, p: PropDef, def: SceneDef): void;
}

const outdoors = (def: SceneDef): boolean => def.kind === 'outdoor';

/** The prop library by type name. A room's data picks from these. */
export const PROPS: Record<string, PropImpl> = {
  pine: {
    needs: ['h'],
    draw: (sc, p) => pine(sc, { x: p.x, y: p.y, h: p.h ?? 60, seed: p.seed ?? 1 }),
    shadow: (sc, p, def) => {
      const h = p.h ?? 60;
      if (outdoors(def)) sc.shadowEllipse(p.x + h * 0.2, p.y + 1, h * 0.28, Math.max(2, h * 0.05));
    },
  },
  boulder: {
    needs: ['r'],
    draw: (sc, p, def) =>
      boulder(sc, { x: p.x, y: p.y, r: p.r ?? 8, seed: p.seed ?? 1, ramp: p.ramp ? R[p.ramp] : undefined }, outdoors(def) && p.v !== 'bare'),
    shadow: (sc, p, def) => {
      const r = p.r ?? 8;
      if (outdoors(def)) sc.shadowEllipse(p.x + r * 0.7, p.y, r * 1.3, Math.max(1.5, r * 0.3));
    },
  },
  hall: {
    needs: ['w'],
    draw: (sc, p) => hall(sc, { x: p.x, y: p.y, w: p.w ?? 120, v: p.v }),
    // Only the house itself casts a shadow, and once: its smoke and its thawed look are laid over it.
    shadow: (sc, p) => void ((p.v ?? 'cold') === 'cold' && hallShadow(sc, { x: p.x, y: p.y, w: p.w ?? 120 })),
  },
  melt: { needs: ['w', 'h'], draw: (sc, p) => melt(sc, { x: p.x, y: p.y, w: p.w ?? 40, h: p.h ?? 12, seed: p.seed ?? 1 }) },
  snowman: { draw: (sc, p) => snowman(sc, { x: p.x, y: p.y, ramp: R[p.ramp ?? 'purple'] }), shadow: (sc, p) => sc.shadowEllipse(p.x + 5, p.y, 9, 2.5) },
  well: { draw: (sc, p) => well(sc, p), shadow: (sc, p) => sc.shadowEllipse(p.x + 9, p.y + 1, 19, 4.5) },
  woodpile: { draw: (sc, p) => woodpile(sc, p), shadow: (sc, p) => sc.shadowEllipse(p.x + 24, p.y, 18, 3) },
  fence: { needs: ['x1', 'y1'], draw: (sc, p) => fence(sc, { x: p.x, y: p.y, x1: p.x1 ?? p.x + 40, y1: p.y1 ?? p.y }) },
  /** x is the centre, y the floor line. */
  arch: { needs: ['w', 'h'], draw: (sc, p) => arch(sc, p.x, p.y, p.w ?? 46, p.h ?? 62) },
  /** x, y is the top-left corner. */
  niche: { needs: ['w', 'h'], draw: (sc, p) => niche(sc, p.x, p.y, p.w ?? 26, p.h ?? 20) },
  pillar: {
    draw: (sc, p) => pillar(sc, { x: p.x, y: p.y, lit: p.lit ?? 1 }),
    // A soft shadow on the wall behind, on the side away from the light.
    shadow: (sc, p) => {
      const side = -(p.lit ?? 1);
      for (let y = 0; y < p.y - 10; y++)
        for (let k = 0; k < 16; k++) {
          const x = p.x + side * (10 + k);
          if (x >= 0 && x < PW) sc.shade[y * PW + x] *= 0.55 + 0.028 * k;
        }
    },
  },
  brazier: { draw: (sc, p) => brazier(sc, p) },
  sarcophagus: { needs: ['w'], draw: (sc, p) => sarcophagus(sc, { x: p.x, y: p.y, w: p.w ?? 60 }) },
};
