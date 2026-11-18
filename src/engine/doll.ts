// Procedural characters. A character is a parameter record (colours, hair, clothing); the
// renderer poses it for a direction and frame and rasterises it at whatever horizontal
// resolution the style needs. Nothing here is a hand-plotted bitmap.

import { R } from './palette';
import { hash2 } from './noise';
import type { Act, CharSpec } from './types';

export interface Sprite {
  w: number;
  h: number;
  /** Foot point, in cells. */
  ox: number;
  oy: number;
  /** 0 = transparent, otherwise 1 + ramp * 4 + tone. */
  cells: Uint8Array;
}

type Shape =
  | { k: 'r'; x0: number; y0: number; x1: number; y1: number; r: number; t: number; sh?: number; hl?: number }
  | { k: 's'; x0: number; y0: number; x1: number; y1: number; w: number; r: number; t: number }
  | { k: 'e'; cx: number; cy: number; rx: number; ry: number; r: number; t: number; flat?: boolean };

class Pose {
  shapes: Shape[] = [];
  bias = 0;
  /** Added to every y, to leave headroom above the figure. */
  dy = 0;
  rect(x0: number, y0: number, x1: number, y1: number, r: number, t: number, sh = 0, hl = 0): void {
    this.shapes.push({ k: 'r', x0, y0: y0 + this.dy, x1, y1: y1 + this.dy, r, t: t + this.bias, sh, hl });
  }
  seg(x0: number, y0: number, x1: number, y1: number, w: number, r: number, t: number): void {
    this.shapes.push({ k: 's', x0, y0: y0 + this.dy, x1, y1: y1 + this.dy, w, r, t: t + this.bias });
  }
  ell(cx: number, cy: number, rx: number, ry: number, r: number, t: number, flat = false): void {
    this.shapes.push({ k: 'e', cx, cy: cy + this.dy, rx, ry, r, t: t + this.bias, flat });
  }
}

/** `k` enlarges the whole figure: shapes are scaled before they are drawn, so edges stay clean. */
function raster(shapes: Shape[], W: number, H0: number, xs: number, ox: number, oy: number, outline: [number, number] | null, k = 1): Sprite {
  const w = Math.round(W * xs * k);
  const H = Math.round(H0 * k);
  const cells = new Uint8Array(w * H);
  const minHalf = xs < 1 ? 1.05 : 0;
  for (let py = 0; py < H; py++)
    for (let px = 0; px < w; px++) {
      const vx = (px + 0.5) / (xs * k);
      const vy = (py + 0.5) / k;
      let cell = 0;
      for (const s of shapes) {
        let tone = s.t;
        if (s.k === 'r') {
          if (vx < s.x0 || vx >= s.x1 || vy < s.y0 || vy >= s.y1) continue;
          if (s.sh && vx >= s.x1 - s.sh) tone--;
          else if (s.hl && vx < s.x0 + s.hl) tone++;
        } else if (s.k === 's') {
          const dx = s.x1 - s.x0;
          const dy = s.y1 - s.y0;
          const t = Math.max(0, Math.min(1, ((vx - s.x0) * dx + (vy - s.y0) * dy) / (dx * dx + dy * dy || 1)));
          const ex = vx - (s.x0 + dx * t);
          const ey = vy - (s.y0 + dy * t);
          const half = Math.max(minHalf, s.w / 2);
          if (ex * ex + ey * ey > half * half) continue;
        } else {
          const nx = (vx - s.cx) / s.rx;
          const ny = (vy - s.cy) / s.ry;
          if (nx * nx + ny * ny > 1) continue;
          if (!s.flat) {
            const l = nx * 0.6 + ny * 0.8;
            if (l > 0.42) tone--;
            else if (l < -0.55) tone++;
          }
        }
        cell = 1 + s.r * 4 + (tone < 0 ? 0 : tone > 3 ? 3 : tone);
      }
      cells[py * w + px] = cell;
    }
  if (outline) {
    const oc = 1 + outline[0] * 4 + outline[1];
    const src = cells.slice();
    for (let py = 0; py < H; py++)
      for (let px = 0; px < w; px++) {
        if (src[py * w + px]) continue;
        const near =
          (px > 0 && src[py * w + px - 1]) ||
          (px < w - 1 && src[py * w + px + 1]) ||
          (py > 0 && src[(py - 1) * w + px]) ||
          (py < H - 1 && src[(py + 1) * w + px]);
        if (near) cells[py * w + px] = oc;
      }
  }
  return { w, h: H, ox: Math.round(ox * xs * k), oy: Math.round(oy * k), cells };
}

// ---------------------------------------------------------------------------------------------

export type Facing = 'down' | 'up' | 'side';
export type Action = 'idle' | 'walk' | 'swing';

/** A CharSpec with its material names resolved to ramp ids. */
interface HumanSpec {
  skin: number;
  hair: number;
  hairStyle: 'short' | 'long' | 'crown';
  beard?: boolean;
  tunic: number;
  legs: number;
  boots: number;
  collar?: number;
  cloak?: number;
  dress?: boolean;
  apron?: number;
  eyes?: [number, number];
  hunch?: boolean;
  /** Always carries a drawn blade. */
  armed?: boolean;
  /** Shift every clothing tone (negative = darker). */
  bias?: number;
  outline?: [number, number];
  ragged?: boolean;
}

const HW = 34;
const HH = 41;
const CX = 16;
const G = 39;
const HEAD = 7;

function human(sp: HumanSpec, dir: Facing, frame: number, act: Action, xs: number, outlined: boolean, size = 1): Sprite {
  const P = new Pose();
  P.dy = HEAD;
  const lo = xs < 1;
  const f = act === 'walk' ? frame & 3 : act === 'swing' ? Math.min(2, frame) : 1;
  const walk = act === 'walk';
  const swing = act === 'swing';
  const b = walk && f & 1 ? -1 : 0;
  const bias = sp.bias ?? 0;
  const eye: [number, number] = sp.eyes ?? [R.ink, 0];
  const blade = (hx: number, hy: number, dx: number, dy: number): void => {
    P.bias = 0;
    P.seg(hx, hy, hx + dx, hy + dy, 2.1, R.metal, sp.ragged || lo ? 1 : 3);
    const len = Math.hypot(dx, dy);
    P.seg(hx - (dy / len) * 2, hy + (dx / len) * 2, hx + (dy / len) * 2, hy - (dx / len) * 2, 1.5, R.leather, 2);
    P.bias = bias;
  };
  const skinTone = (t: number): number => t;

  if (dir === 'side') {
    const st = walk ? [3.2, 0, -3.2, 0][f] : swing ? 2.5 : 0.6;
    const liftNear = walk && f === 3 ? 2 : 0;
    const liftFar = walk && f === 1 ? 2 : 0;
    const sw = walk ? -st * 0.85 : 0;
    const hx = sp.hunch ? 1.5 : 0;
    P.bias = bias;
    // far arm
    if (!swing) {
      P.seg(CX + 0.5, 17 + b, CX + 0.5 - sw, 23 + b, 2.2, sp.tunic, 0);
      P.bias = 0;
      P.ell(CX + 0.5 - sw, 24.3 + b, 1.2, 1.2, sp.skin, 0, true);
      P.bias = bias;
    }
    if (sp.dress) {
      P.rect(CX - 1 - st * 0.4, G - 2, CX + 3 - st * 0.4, G - liftFar, sp.boots, 0);
      P.rect(CX - 1 + st * 0.4, G - 2, CX + 4 + st * 0.4, G - liftNear, sp.boots, 1);
      P.rect(CX - 4, 25 + b, CX + 3, 31 + b, sp.tunic, 1, 1);
      P.rect(CX - 5, 31 + b, CX + 4, G - 2, sp.tunic, 1, 2);
      P.rect(CX - 5, G - 3, CX + 4, G - 2, sp.tunic, 0);
    } else {
      // far leg, near leg
      const leg = (stride: number, lift: number, tone: number): void => {
        const fx = CX - 0.5 + stride;
        const fy = G - 3 - lift;
        P.seg(CX - 0.5, 27 + b, fx, fy, 3.2, sp.legs, tone);
        P.rect(fx - 1.6, fy, fx + 3.2, fy + 3, sp.boots, tone);
      };
      leg(-st, liftFar, 0);
      leg(st, liftNear, 1);
    }
    if (sp.cloak !== undefined) {
      P.seg(CX - 3, 17 + b, CX - 4.6 - (walk ? Math.abs(st) * 0.3 : 0), 31 + b, 3.6, sp.cloak, 1);
      P.seg(CX - 3.6, 17 + b, CX - 5.6 - (walk ? Math.abs(st) * 0.3 : 0), 31 + b, 1.4, sp.cloak, 0);
    }
    // torso
    P.rect(CX - 3, 15 + b, CX + 2, 25 + b, sp.tunic, 2, 1);
    if (!sp.dress) P.rect(CX - 3, 25 + b, CX + 3, 28 + b, sp.tunic, 1);
    P.rect(CX - 3, 23 + b, CX + 2, 24 + b, R.leather, 1);
    if (sp.apron !== undefined) P.rect(CX, 19 + b, CX + 3, G - 5, sp.apron, 2, 1);
    if (sp.collar !== undefined) P.rect(CX - 4, 14 + b, CX + 3, 17 + b, sp.collar, 2, 2);
    // head
    P.bias = 0;
    P.rect(CX - 1 + hx, 14 + b, CX + 1 + hx, 15 + b, sp.skin, skinTone(1));
    P.rect(CX - 3 + hx, 8 + b, CX + 3 + hx, 13 + b, sp.skin, skinTone(2));
    P.rect(CX - 2 + hx, 13 + b, CX + 3 + hx, 14 + b, sp.skin, skinTone(2));
    P.rect(CX + 3 + hx, 11 + b, CX + 4 + hx, 12 + b, sp.skin, skinTone(1));
    if (!lo) P.rect(CX + 1 + hx, 10 + b, CX + 2 + hx, 11 + b, eye[0], eye[1]);
    if (sp.beard) P.rect(CX + hx, 12 + b, CX + 3 + hx, 15 + b, sp.hair, 1);
    if (sp.hairStyle === 'crown') {
      P.rect(CX - 3 + hx, 7 + b, CX + 3 + hx, 10 + b, R.metal, 1);
      P.rect(CX - 3 + hx, 10 + b, CX - 1 + hx, 13 + b, R.metal, 0);
      P.rect(CX - 3 + hx, 5 + b, CX - 2 + hx, 7 + b, R.metal, 2);
      P.rect(CX - 0.5 + hx, 4 + b, CX + 0.5 + hx, 7 + b, R.metal, 2);
      P.rect(CX + 2 + hx, 5 + b, CX + 3 + hx, 7 + b, R.metal, 2);
    } else {
      P.rect(CX - 2 + hx, 7 + b, CX + 2 + hx, 8 + b, sp.hair, 3);
      P.rect(CX - 3 + hx, 8 + b, CX + 3 + hx, 10 + b, sp.hair, 2);
      P.rect(CX - 3 + hx, 10 + b, CX + hx, sp.hairStyle === 'long' ? 17 + b : 13 + b, sp.hair, 1);
      P.rect(CX - 4 + hx, 9 + b, CX - 3 + hx, sp.hairStyle === 'long' ? 16 + b : 12 + b, sp.hair, 0);
    }
    // near arm
    P.bias = bias;
    if (swing) {
      const [ax, ay] = [[CX + 1.5, 9], [CX + 7, 15], [CX + 6.5, 22]][f];
      const [sx, sy] = [[-3, -10], [9.5, -6], [9, 5.5]][f];
      P.seg(CX - 0.5, 16.5, ax, ay, 2.6, sp.tunic, 3);
      blade(ax, ay, sx, sy);
      P.bias = 0;
      P.ell(ax, ay, 1.4, 1.4, sp.skin, 2, true);
    } else {
      const ax = CX - 0.5 + sw;
      P.seg(CX - 0.5, 16.5 + b, ax, 23 + b, 2.6, sp.tunic, 3);
      if (sp.armed) blade(ax, 24 + b, 8, 4);
      P.bias = 0;
      P.ell(ax, 24.3 + b, 1.3, 1.3, sp.skin, 2, true);
    }
  } else {
    const front = dir === 'down';
    const hw = lo ? 4 : 3;
    const liftL = walk && f === 2 ? 2 : 0;
    const liftR = walk && f === 0 ? 2 : 0;
    const aL = walk ? [-1, 0, 1, 0][f] : 0;
    const aR = -aL;
    P.bias = bias;
    if (sp.cloak !== undefined && front) P.rect(CX - 5, 16 + b, CX + 5, 29 + b, sp.cloak, 0);
    if (sp.dress) {
      P.rect(CX - 3, G - 2 - liftL, CX - 1, G - liftL, sp.boots, 1);
      P.rect(CX + 1, G - 2 - liftR, CX + 3, G - liftR, sp.boots, 0);
      P.rect(CX - 4, 25 + b, CX + 4, 31 + b, sp.tunic, 1, 2);
      P.rect(CX - 5, 31 + b, CX + 5, G - 2, sp.tunic, 1, 3);
      P.rect(CX - 5, G - 3, CX + 5, G - 2, sp.tunic, 0);
    } else {
      P.rect(CX - hw, 26 + b, CX, G - 3 - liftL, sp.legs, 1);
      P.rect(CX, 26 + b, CX + hw, G - 3 - liftR, sp.legs, 1, 1);
      P.rect(CX - 0.5, 29 + b, CX + 0.5, G - 3, sp.legs, 0);
      P.rect(CX - 4, G - 3 - liftL, CX, G - liftL, sp.boots, 1);
      P.rect(CX, G - 3 - liftR, CX + 4, G - liftR, sp.boots, 0);
    }
    // torso
    P.rect(CX - 4, 15 + b, CX + 4, 25 + b, sp.tunic, 2, 2);
    if (!sp.dress) {
      P.rect(CX - 4, 25 + b, CX + 4, 28 + b, sp.tunic, 1, 2);
      if (sp.ragged) for (let k = -4; k < 4; k++) if (hash2(k, 3, 7) > 0.5) P.rect(CX + k, 28 + b, CX + k + 1, 30 + b, sp.tunic, 0);
    }
    P.rect(CX - 4, 23 + b, CX + 4, 24 + b, R.leather, 1);
    if (front && !lo) {
      P.bias = 0;
      P.rect(CX - 1, 23 + b, CX + 1, 24 + b, R.metal, 3);
      P.bias = bias;
    }
    if (sp.apron !== undefined && front) P.rect(CX - 2, 19 + b, CX + 2, G - 5, sp.apron, 2, 1);
    if (sp.cloak !== undefined && !front) {
      P.rect(CX - 5, 15 + b, CX + 5, 30 + b, sp.cloak, 1, 2);
      P.rect(CX - 0.5, 19 + b, CX + 0.5, 30 + b, sp.cloak, 0);
    }
    // arms
    const swingArm = swing;
    P.rect(CX - 6, 15 + b + aL, CX - 4, 23 + b + aL, sp.tunic, 3);
    P.bias = 0;
    P.rect(CX - 6, 23 + b + aL, CX - 4, 25 + b + aL, sp.skin, 2);
    P.bias = bias;
    if (!swingArm) {
      P.rect(CX + 4, 15 + b + aR, CX + 6, 23 + b + aR, sp.tunic, 1);
      if (sp.armed) blade(CX + 5, 24 + b + aR, 3, 9);
      P.bias = 0;
      P.rect(CX + 4, 23 + b + aR, CX + 6, 25 + b + aR, sp.skin, 1);
      P.bias = bias;
    }
    if (sp.collar !== undefined) P.rect(CX - 5, 14 + b, CX + 5, 17 + b, sp.collar, 2, 3);
    // head
    P.bias = 0;
    if (front) {
      if (sp.collar === undefined) P.rect(CX - 1, 14 + b, CX + 1, 15 + b, sp.skin, 1);
      P.rect(CX - hw, 8 + b, CX + hw, 13 + b, sp.skin, 2, 1);
      P.rect(CX - 2, 13 + b, CX + 2, 14 + b, sp.skin, 2);
      if (!lo) {
        P.rect(CX - 2, 11 + b, CX - 1, 12 + b, eye[0], eye[1]);
        P.rect(CX + 1, 11 + b, CX + 2, 12 + b, eye[0], eye[1]);
      }
      if (sp.beard) P.rect(CX - 2, 12.5 + b, CX + 2, 15 + b, sp.hair, 1);
      if (sp.hairStyle === 'crown') {
        P.rect(CX - hw, 7 + b, CX + hw, 10 + b, R.metal, 1, 1);
        P.rect(CX - 3, 5 + b, CX - 2, 7 + b, R.metal, 2);
        P.rect(CX - 0.5, 4 + b, CX + 0.5, 7 + b, R.metal, 2);
        P.rect(CX + 2, 5 + b, CX + 3, 7 + b, R.metal, 2);
      } else {
        P.rect(CX - 2, 7 + b, CX + 2, 8 + b, sp.hair, 3);
        P.rect(CX - hw, 8 + b, CX + hw, 10 + b, sp.hair, 2, 1);
        if (!lo) P.rect(CX - 3, 10 + b, CX - 2, 11 + b, sp.hair, 1);
        if (sp.hairStyle === 'long') {
          P.rect(CX - 4, 9 + b, CX - 3, 17 + b, sp.hair, 1);
          P.rect(CX + 3, 9 + b, CX + 4, 17 + b, sp.hair, 0);
        }
      }
    } else {
      P.rect(CX - 2, 13 + b, CX + 2, 15 + b, sp.skin, 1);
      if (sp.hairStyle === 'crown') {
        P.rect(CX - hw, 7 + b, CX + hw, 13 + b, R.metal, 1, 2);
        P.rect(CX - 3, 5 + b, CX - 2, 7 + b, R.metal, 2);
        P.rect(CX - 0.5, 4 + b, CX + 0.5, 7 + b, R.metal, 2);
        P.rect(CX + 2, 5 + b, CX + 3, 7 + b, R.metal, 2);
      } else {
        P.rect(CX - 2, 7 + b, CX + 2, 8 + b, sp.hair, 3);
        P.rect(CX - hw, 8 + b, CX + hw, 13 + b, sp.hair, 2, 2);
        if (sp.hairStyle === 'long') P.rect(CX - 4, 9 + b, CX + 4, 18 + b, sp.hair, 1, 2);
      }
    }
    if (swingArm) {
      const [ax, ay] = [[CX + 7, 11], [CX + 9, 17], [CX + 6.5, 24]][f];
      const [sx, sy] = [[1.5, -9.5], [7, -5], [2.5, 10]][f];
      P.bias = bias;
      P.seg(CX + 4.5, 16.5, ax, ay, 2.6, sp.tunic, front ? 2 : 1);
      blade(ax, ay, sx, sy);
      P.bias = 0;
      P.ell(ax, ay, 1.4, 1.4, sp.skin, 2, true);
    }
  }
  const out = sp.outline ?? (outlined ? ([R.ink, 0] as [number, number]) : null);
  return raster(P.shapes, HW, HH + HEAD, xs, CX, G + HEAD, out, size);
}

const WW = 34;
const WH = 21;

function wolf(frame: number, xs: number, outlined: boolean, F: number = R.fur, size = 1): Sprite {
  const P = new Pose();
  const f = frame & 3;
  const a = [2.6, 0.8, -2.6, -0.8][f];
  const c = [-2.6, -0.8, 2.6, 0.8][f];
  const b = f & 1 ? -1 : 0;
  const g = 20;
  // far legs
  P.seg(21.5, 13 + b, 21.5 - a, g - 1, 2, F, 0);
  P.seg(9, 13 + b, 9 - c, g - 1, 2.2, F, 0);
  // tail: thick, carried low
  P.seg(6.5, 10.5 + b, 2.8, 15 + b + (f & 1), 3.6, F, 1);
  P.ell(2.6, 15.6 + b + (f & 1), 1.5, 1.5, F, 3, true);
  // body
  P.ell(14.5, 11.2 + b, 8, 3.3, F, 2);
  P.ell(9, 11.6 + b, 4, 3.7, F, 2);
  P.ell(20.5, 11.4 + b, 4.6, 4.3, F, 2);
  P.ell(13.5, 8.6 + b, 7.5, 1.3, F, 1, true);
  if (xs >= 1) P.ell(15, 13.8 + b, 5.5, 1.2, F, 3, true);
  // neck ruff and head, carried low and forward
  P.seg(22, 9.8 + b, 26, 8.6 + b, 5.6, F, 2);
  if (xs >= 1) P.seg(22.5, 12.5 + b, 25, 11.5 + b, 2.4, F, 3);
  P.ell(27, 8 + b, 3, 2.6, F, 2);
  P.rect(28.5, 7.8 + b, 32.5, 10 + b, F, xs >= 1 ? 3 : 2);
  P.rect(28.5, 10 + b, 31.5, 10.8 + b, F, 1);
  P.rect(31.5, 7.8 + b, 32.5, 8.8 + b, R.ink, 0);
  P.seg(25.3, 6 + b, 24.8, 3.8 + b, 1.8, F, 1);
  P.seg(27.3, 5.8 + b, 27.8, 3.6 + b, 1.8, F, 3);
  if (xs >= 1) P.rect(27.5, 6.8 + b, 28.5, 7.8 + b, R.blond, 3);
  // near legs
  P.seg(20.5, 13.5 + b, 20.5 + a, g - 1, 2.2, F, 2);
  P.rect(20.5 + a - 1, g - 1, 20.5 + a + 2, g, F, 3);
  P.seg(10, 13.5 + b, 10 + c, g - 1, 2.4, F, 2);
  P.rect(10 + c - 1, g - 1, 10 + c + 2, g, F, 3);
  return raster(P.shapes, WW, WH, xs, 16, g, outlined ? [R.ink, 0] : null, size);
}

/** A stag: long legs, a high neck, and antlers. */
function deer(frame: number, F: number, size: number): Sprite {
  const P = new Pose();
  P.dy = 6;
  const f = frame & 3;
  const a = [2.4, 0.7, -2.4, -0.7][f];
  const c = [-2.4, -0.7, 2.4, 0.7][f];
  const b = f & 1 ? -0.7 : 0;
  const g = 23;
  // far legs
  P.seg(20.5, 12 + b, 20.5 - a, g - 1, 1.5, F, 0);
  P.seg(9.5, 12 + b, 9.5 - c, g - 1, 1.6, F, 0);
  // scut
  P.ell(5.6, 9 + b, 1.5, 1.6, R.cream, 3, true);
  // body
  P.ell(14.5, 10.4 + b, 8, 3.3, F, 2);
  P.ell(9, 10.6 + b, 3.8, 3.4, F, 2);
  P.ell(20, 10 + b, 4, 3.6, F, 2);
  P.ell(14.5, 12.8 + b, 5.5, 1.2, R.cream, 2, true);
  // neck, head and antlers
  P.seg(21.5, 9 + b, 25, 3.4 + b, 3.4, F, 2);
  P.ell(26.6, 2.6 + b, 2.5, 2, F, 2);
  P.rect(28.2, 2.2 + b, 31.4, 4.2 + b, F, 3);
  P.rect(30.6, 2.2 + b, 31.4, 3 + b, R.ink, 0);
  P.rect(27.2, 1.6 + b, 28, 2.4 + b, R.ink, 0);
  P.seg(24.8, 1.6 + b, 23.4, 0.6 + b, 1.4, F, 1);
  P.seg(25.6, 1 + b, 24.2, -4.6 + b, 1.1, R.cream, 2);
  P.seg(24.6, -2.4 + b, 22.4, -4.2 + b, 1, R.cream, 2);
  P.seg(26.2, 1 + b, 27.6, -4.4 + b, 1.1, R.cream, 3);
  P.seg(27, -2 + b, 29.2, -3.8 + b, 1, R.cream, 3);
  // near legs
  P.seg(19.5, 12.5 + b, 19.5 + a, g - 1, 1.7, F, 2);
  P.rect(19.5 + a - 0.8, g - 1, 19.5 + a + 1.4, g, R.ink, 0);
  P.seg(10.5, 12.5 + b, 10.5 + c, g - 1, 1.8, F, 2);
  P.rect(10.5 + c - 0.8, g - 1, 10.5 + c + 1.4, g, R.ink, 0);
  return raster(P.shapes, WW, 30, 1, 16, g + 6, [R.ink, 0], size);
}

/** A bear: the wolf's box, filled a good deal fuller. Meant to be drawn large. */
function bear(frame: number, F: number, size: number): Sprite {
  const P = new Pose();
  const f = frame & 3;
  const a = [2, 0.6, -2, -0.6][f];
  const c = [-2, -0.6, 2, 0.6][f];
  const b = f & 1 ? -0.6 : 0;
  const g = 20;
  // far legs
  P.seg(21, 13 + b, 21 - a, g - 1, 3.2, F, 0);
  P.seg(9.5, 13 + b, 9.5 - c, g - 1, 3.4, F, 0);
  // stub of a tail
  P.ell(5, 9.6 + b, 1.5, 1.4, F, 1, true);
  // body: a barrel, with a hump over the shoulders
  P.ell(14.5, 10.6 + b, 8.6, 4.7, F, 2);
  P.ell(9, 11 + b, 4.8, 4.7, F, 2);
  P.ell(20, 9.4 + b, 5.2, 5.2, F, 2);
  P.ell(14, 6.6 + b, 6.5, 1.1, F, 3, true);
  P.ell(14.5, 14.2 + b, 6, 1.2, F, 1, true);
  // neck and head, carried low
  P.seg(22.5, 10 + b, 26.4, 10.6 + b, 6.6, F, 2);
  P.ell(25.4, 7 + b, 1.4, 1.4, F, 1, true);
  P.ell(27.4, 10.2 + b, 3.5, 3.3, F, 2);
  P.ell(28.4, 7 + b, 1.4, 1.4, F, 3, true);
  P.rect(29.4, 10.2 + b, 32.6, 12.8 + b, F, 3);
  P.rect(29.4, 12.8 + b, 31.8, 13.5 + b, F, 1);
  P.rect(31.6, 10.2 + b, 32.6, 11.3 + b, R.ink, 0);
  P.rect(28.2, 9 + b, 29.1, 9.9 + b, R.ink, 0);
  // near legs
  P.seg(20, 13.5 + b, 20 + a, g - 1, 3.5, F, 2);
  P.rect(20 + a - 1.6, g - 1, 20 + a + 2.6, g, F, 1);
  P.seg(10.5, 13.5 + b, 10.5 + c, g - 1, 3.7, F, 2);
  P.rect(10.5 + c - 1.6, g - 1, 10.5 + c + 2.6, g, F, 1);
  return raster(P.shapes, WW, WH, 1, 16, g, [R.ink, 0], size);
}

// ---------------------------------------------------------------------------------------------

function resolve(c: CharSpec): HumanSpec {
  const bald = c.hairStyle === 'bald';
  const hood = c.hairStyle === 'hood';
  return {
    skin: R[c.skin],
    hair: bald ? R[c.skin] : hood ? R[c.cloak ?? c.tunic] : R[c.hair],
    hairStyle: c.hairStyle === 'crown' ? 'crown' : c.hairStyle === 'long' || hood ? 'long' : 'short',
    beard: c.beard,
    tunic: R[c.tunic],
    legs: R[c.legs],
    boots: R[c.boots],
    collar: c.collar && R[c.collar],
    cloak: c.cloak && R[c.cloak],
    dress: c.dress,
    apron: c.apron && R[c.apron],
    eyes: c.eyes && [R[c.eyes], 3],
    hunch: c.hunch,
    armed: c.armed,
    bias: c.bias,
    outline: c.outline && [R[c.outline], 1],
    ragged: c.ragged,
  };
}

/** Lay a standing sprite on its side, for the fallen. */
function fallen(s: Sprite): Sprite {
  const w = s.h;
  const h = s.w;
  const cells = new Uint8Array(w * h);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) cells[x * w + (s.h - 1 - y)] = s.cells[y * s.w + x];
  // Trim empty rows below so the body rests on the foot line.
  let bottom = h - 1;
  while (bottom > 0 && !cells.subarray(bottom * w, bottom * w + w).some((c) => c)) bottom--;
  return { w, h, ox: w >> 1, oy: bottom + 1, cells };
}

/** The sprite for a character in a pose. Callers cache the result. */
export function charSprite(spec: CharSpec, facing: Facing, act: Act, frame: number): Sprite {
  // A guard is the middle of a swing, held.
  const pose: Action = act === 'walk' ? 'walk' : act === 'swing' || act === 'block' ? 'swing' : 'idle';
  if (act === 'block') frame = 1;
  const size = spec.size ?? 1;
  if (spec.body === 'wolf' || spec.body === 'bear' || spec.body === 'deer') {
    const f = act === 'walk' ? frame : 1;
    const s = spec.body === 'bear' ? bear(f, R[spec.skin], size) : spec.body === 'deer' ? deer(f, R[spec.skin], size) : wolf(f, 1, true, R[spec.skin], size);
    if (act !== 'dead') return s;
    // A dead beast lies on its back, legs up.
    const cells = new Uint8Array(s.cells.length);
    for (let y = 0; y < s.h; y++) cells.set(s.cells.subarray(y * s.w, (y + 1) * s.w), (s.h - 1 - y) * s.w);
    return { ...s, cells, oy: s.h - 3 };
  }
  const s = human(resolve(spec), act === 'dead' ? 'side' : facing, frame, pose, 1, true, size);
  return act === 'dead' ? fallen(s) : s;
}
