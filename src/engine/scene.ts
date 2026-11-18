// A scene is rendered once into material + brightness buffers, plus a depth buffer (the foot line
// of whatever prop owns each pixel) and a control buffer (blocked ground). It is derived entirely
// from a room's SceneDef, so it is a cache, never saved state.

import { R } from './palette';
import { clamp, vnoise } from './noise';
import type { LightDef } from './types';

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
  /** Animated fires: foot point and size. Drawn every frame by the renderer. */
  flames: { x: number; y: number; up: number; size: number }[] = [];

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

  /** Make ground walkable again, e.g. a bridge over water. */
  unblockRect(x0: number, y0: number, x1: number, y1: number): void {
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(PH, y1); y++)
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(PW, x1); x++) this.ctl[y * PW + x] = 0;
  }

  blockEllipse(cx: number, cy: number, rx: number, ry: number): void {
    for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(PH - 1, cy + ry); y++)
      for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(PW - 1, cx + rx); x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.ctl[y * PW + x] = 1;
  }

  blocked(x: number, y: number): boolean {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= PW || y < this.walkTop || y >= PH) return true;
    return this.ctl[y * PW + x] === 1;
  }
}

export function distSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number, ys = 1): number {
  const vx = bx - ax;
  const vy = (by - ay) * ys;
  const wx = px - ax;
  const wy = (py - ay) * ys;
  const t = clamp((wx * vx + wy * vy) / (vx * vx + vy * vy || 1));
  return Math.hypot(wx - vx * t, wy - vy * t);
}

export function line(sc: Scene, x0: number, y0: number, x1: number, y1: number, ramp: number, shade: number, base: number, thick = 1.6): void {
  const r = thick / 2;
  for (let y = Math.floor(Math.min(y0, y1) - r); y <= Math.max(y0, y1) + r; y++)
    for (let x = Math.floor(Math.min(x0, x1) - r); x <= Math.max(x0, x1) + r; x++)
      if (distSeg(x + 0.5, y + 0.5, x0, y0, x1, y1) <= r) sc.put(x, y, ramp, shade, base);
}

export function lightPass(sc: Scene, lights: LightDef[], ambient: number): void {
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
