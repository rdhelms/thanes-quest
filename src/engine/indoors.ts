// Furnishings for rooms with a roof on: roofs and ceilings, hearths, seats, tables, beds, shelves
// and the clutter that makes one room unlike another. Importing this file registers them alongside
// the rest of the library (it is imported for its effect, as scenery.ts is).
//
// For anything that stands against the back wall, y is the floor line; for the rest, y is the foot.

import { R, isRamp } from './palette';
import { LAYERS } from './layers';
import { PROPS } from './props';
import { PH, PW, Scene, line } from './scene';
import { clamp, fbm, hash2, vnoise } from './noise';
import type { LayerDef, PropDef } from './types';

type P = PropDef;

const num = (l: LayerDef, k: string, d: number): number => (typeof l[k] === 'number' ? (l[k] as number) : d);
const rampOf = (p: P, d: number): number => (p.ramp && isRamp(p.ramp) ? R[p.ramp] : d);

/**
 * Rounded stones set in mortar, for hearths: a jittered grid of stones, each lit from the upper
 * left. Returns the shade for (x, y), or -1 where there is mortar.
 */
function cobble(x: number, y: number, seed: number, cw = 9, ch = 7): number {
  const gx = Math.floor(x / cw);
  const gy = Math.floor(y / ch);
  let d1 = 1e9;
  let d2 = 1e9;
  let best = 0;
  let bx = 0;
  let by = 0;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = (gx + i + 0.2 + 0.6 * hash2(gx + i, gy + j, seed)) * cw;
      const cy = (gy + j + 0.2 + 0.6 * hash2(gx + i, gy + j, seed + 1)) * ch;
      const d = Math.hypot((x - cx) / cw, (y - cy) / ch);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        best = hash2(gx + i, gy + j, seed + 2);
        bx = (x - cx) / cw;
        by = (y - cy) / ch;
      } else if (d < d2) d2 = d;
    }
  const edge = d2 - d1;
  if (edge < 0.1) return -1;
  let s = 0.5 + 0.3 * (best - 0.5) - 0.55 * bx - 0.7 * by;
  if (edge < 0.2) s -= 0.16;
  return s;
}

// ---------------------------------------------------------------------------------------------
// Roofs and walls (layers, painted over the plain `interior` layer)

/**
 * A feasting hall's roof seen from inside: a great tie beam across the whole back wall, and above
 * it the gable end, smoke-black, with its rafters, collar and posts. `y` is the top of the tie beam.
 */
function hallRoof(sc: Scene, beam: number): void {
  const apex = -30;
  const eave = -14;
  const slope = (beam + 4 - apex) / (160 - eave);
  const rafter = (x: number): number => beam + 4 - slope * ((x < 160 ? x : 320 - x) - eave);
  for (let y = 0; y < beam; y++)
    for (let x = 0; x < PW; x++) {
      const d = y - rafter(x);
      const smoke = 0.55 + 0.45 * (y / beam);
      if (Math.abs(d) < 4) {
        // The rafter itself: lit along its upper edge, dark beneath.
        const s = d < -2.5 ? 0.62 : d > 2.5 ? 0.12 : 0.42 + (vnoise(x * 0.3, y * 0.3, 201) - 0.5) * 0.1;
        sc.put(x, y, R.wood, s * smoke);
      } else if (d < 0) {
        // Beyond the rafter, the underside of the roof: boards, and battens running with the slope.
        const along = (x < 160 ? x : 320 - x) * slope + y;
        const s = Math.floor(along) % 6 === 0 ? 0.04 : 0.14 + 0.05 * hash2(Math.floor(along / 6), 0, 202);
        sc.put(x, y, R.wood, s);
      } else {
        // The gable: upright boards, blackened by a century of smoke.
        const bx = Math.floor((x + 3) / 8);
        let s = 0.3 + 0.1 * (hash2(bx, 1, 203) - 0.5) + (vnoise(x * 0.5, y * 0.12, 204) - 0.5) * 0.1;
        if ((x + 3) % 8 === 0) s = 0.08;
        sc.put(x, y, R.wood, s * smoke * 0.8);
      }
    }
  // Collar beam and the two posts that carry it, with braces down to the tie beam.
  const collar = 4;
  for (let x = 0; x < PW; x++) {
    if (rafter(x) > collar + 4) continue;
    for (let y = collar; y < collar + 5; y++) sc.put(x, y, R.wood, y === collar ? 0.46 : y === collar + 4 ? 0.08 : 0.26);
  }
  for (const px of [92, 228]) {
    for (let y = collar + 5; y < beam; y++)
      for (let k = -3; k <= 3; k++) sc.put(px + k, y, R.wood, (k === -3 ? 0.5 : k === 3 ? 0.1 : 0.3 - 0.02 * k) * (0.7 + 0.3 * (y / beam)));
    const side = px < 160 ? -1 : 1;
    line(sc, px + side * 4, beam - 6, px + side * 20, rafter(px + side * 20) + 2, R.wood, 0.24, 0, 3);
    line(sc, px - side * 4, beam - 6, px - side * 18, collar + 6, R.wood, 0.2, 0, 3);
  }
  // The tie beam: a whole tree, squared, with a band of carving every so often.
  for (let y = beam; y < beam + 7; y++)
    for (let x = 0; x < PW; x++) {
      const k = y - beam;
      let s = k === 0 ? 0.66 : k === 6 ? 0.12 : 0.44 - 0.03 * k + (vnoise(x * 0.08, k * 0.9, 205) - 0.5) * 0.12;
      const band = (x + 40) % 80;
      if (band < 14 && k > 0 && k < 6) {
        // Interlace: two strands crossing.
        const a = Math.abs(((band + k * 2) % 7) - 3.5);
        const b = Math.abs(((band - k * 2 + 70) % 7) - 3.5);
        s = Math.min(a, b) < 0.8 ? 0.62 : 0.2;
      }
      sc.put(x, y, R.wood, s);
    }
}

/**
 * A low ceiling of boards on square joists, running back to a wall plate at `y`. Joists close
 * together and dark: the kind of room you duck in.
 */
function joists(sc: Scene, top: number): void {
  const vy = top + 70;
  for (let y = 0; y < top; y++) {
    const f = (vy - y) / (vy - top);
    for (let x = 0; x < PW; x++) {
      const bx = 160 + (x - 160) / f;
      const j = (((bx + 4) % 30) + 30) % 30;
      const t = y / top;
      if (j < 7) {
        // A joist: its underside, and the side facing the middle of the room in light.
        const side = (bx < 160 ? j > 5 : j < 2) ? 0.12 : 0.3 + 0.1 * t;
        sc.put(x, y, R.wood, j === 0 || j === 6 ? 0.1 : side + (vnoise(bx * 0.2, y * 0.4, 211) - 0.5) * 0.08);
      } else {
        // Boards between them, laid across, sooty near the fire end.
        const row = Math.floor((y + 40) / (3 + 2 * (1 - t)));
        sc.put(x, y, R.wood, (y % 3 === 0 && t > 0.3 ? 0.08 : 0.16 + 0.08 * hash2(Math.floor(bx / 30), row, 212)) * (0.7 + 0.3 * t));
      }
    }
  }
  for (let y = top; y < top + 6; y++)
    for (let x = 0; x < PW; x++) {
      const k = y - top;
      sc.put(x, y, R.wood, k === 0 ? 0.14 : k === 1 ? 0.6 : k === 5 ? 0.14 : 0.42 + (vnoise(x * 0.1, k, 213) - 0.5) * 0.12);
    }
}

/** Upright boards for a wall, from `y0` to the floor at `fl`, with a rail and darker panelling below it. */
function boards(sc: Scene, y0: number, fl: number): void {
  const rail = fl - 30;
  for (let y = y0; y < fl; y++)
    for (let x = 0; x < PW; x++) {
      const low = y > rail;
      const w = low ? 14 : 9;
      const bx = Math.floor((x + 2) / w);
      const lx = (x + 2) % w;
      let s = (low ? 0.4 : 0.54) + 0.12 * (hash2(bx, low ? 1 : 0, 221) - 0.5) + (vnoise(x * 0.6, y * 0.05 + bx * 3, 222) - 0.5) * 0.12;
      if (lx === 0) s = 0.16;
      else if (lx === 1) s += 0.08;
      // Knots, here and there.
      if (hash2(bx, Math.floor(y / 11), 223) > 0.93 && Math.hypot(lx - w / 2, (y % 11) - 5) < 1.5) s = 0.22;
      if (y === rail - 2) s = 0.7;
      if (y === rail - 1 || y === rail) s = 0.46;
      if (y === rail + 1) s = 0.14;
      if (y >= fl - 3) s = y === fl - 3 ? 0.62 : 0.3;
      sc.put(x, y, R.wood, s * (y < y0 + 8 ? 0.6 + 0.05 * (y - y0) : 1));
    }
}

/**
 * The underside of a thatched roof, close overhead: straw between round pole rafters that fan
 * out toward the viewer from the wall top at `y`.
 */
function thatchRoof(sc: Scene, top: number): void {
  const vy = top + 60;
  for (let y = 0; y < top + 4; y++) {
    const f = (vy - y) / (vy - top);
    for (let x = 0; x < PW; x++) {
      const bx = 160 + (x - 160) / f;
      const j = (((bx + 10) % 36) + 36) % 36;
      const t = y / top;
      if (y >= top) {
        // The wall plate: a split log.
        sc.put(x, y, R.wood, y === top ? 0.56 : y === top + 3 ? 0.12 : 0.36 + (vnoise(x * 0.2, y, 231) - 0.5) * 0.12);
      } else if (j < 5) {
        const nx = (j - 2) / 2.5;
        sc.put(x, y, R.wood, (0.38 - 0.24 * nx * (bx < 160 ? -1 : 1) - 0.1 * nx * nx) * (0.6 + 0.4 * t));
      } else {
        // Straw, in bundles, darkest up in the smoke.
        const n = vnoise(bx * 0.9, y * 0.18, 232) * 0.6 + hash2(Math.floor(bx * 1.3), y >> 1, 233) * 0.4;
        sc.put(x, y, R.thatch, (0.08 + 0.42 * n) * (0.35 + 0.55 * t));
      }
    }
  }
}

/** A floor of beaten earth, swept smooth in the middle of the room and strewn with straw at the edges. */
function earthFloor(sc: Scene, fl: number): void {
  for (let y = fl; y < PH; y++) {
    const t = (y - fl) / (PH - fl);
    for (let x = 0; x < PW; x++) {
      const X = (x - 160) / (0.55 + 0.45 * t);
      let s = 0.4 + (fbm(X * 0.05 + 300, y * 0.12, 241, 3) - 0.5) * 0.3 + (hash2(x, y, 242) - 0.5) * 0.08;
      // Worn paths: lighter where feet go between the door, the fire and the table.
      s += 0.1 * clamp(1 - Math.abs(X) / 120) * t;
      if (y - fl < 4) s *= 0.5 + 0.12 * (y - fl);
      const straw = hash2(x, y, 243) > 0.93 && fbm(x * 0.03, y * 0.05, 244, 2) + Math.abs(x - 160) / 300 - t * 0.3 > 0.78;
      if (straw) sc.put(x, y, R.thatch, 0.2 + 0.25 * hash2(x, y, 245));
      else sc.put(x, y, R.earth, s);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// The Elder's hall

/** Frost: rime along the top edges of the logs and the beam, and a few icicles. Give it y: 1 so it
 * goes on before any furniture; `w` is the floor line and `h` the top of the tie beam. */
function rime(sc: Scene, p: P): void {
  const fl = p.w ?? 96;
  const beam = p.h ?? 30;
  for (let y = beam + 7; y < fl; y++)
    for (let x = 0; x < PW; x++) {
      const i = y * PW + x;
      if (sc.pri[i] !== 0 || sc.ramp[i] !== R.wood) continue;
      // Only the upper edge of each log takes it, thickest in the corners and up under the roof.
      if (sc.shade[i] < 0.44 || sc.shade[i - PW] > sc.shade[i]) continue;
      const reach = clamp(1 - Math.min(x, PW - x) / 70) + clamp((beam + 22 - y) / 22);
      const n = fbm(x * 0.06, y * 0.1, 251, 3);
      const f = n + reach * 0.5;
      if (f > 0.86 && hash2(x, y, 252) > 0.45) sc.put(x, y, R.ice, 0.45 + 0.5 * hash2(x, y, 253), 0);
      // Thicker rime grows down the face of the log a little, in feathers.
      if (f > 0.98)
        for (let k = 1; k < 4; k++) if (hash2(x, y + k, 256) < (f - 0.9) * 2.4 - k * 0.3) sc.put(x, y + k, R.ice, 0.3 + 0.3 * hash2(x, k, 257), 0);
    }
  // Icicles under the tie beam.
  for (let x = 2; x < PW; x += 3) {
    const h = Math.floor(hash2(x, 1, 255) ** 3 * 7 * (0.4 + 0.6 * Math.abs(x - 160) / 160));
    for (let k = 0; k < h; k++) sc.put(x, beam + 7 + k, R.ice, k === 0 ? 0.9 : 0.7 - (0.4 * k) / h, 0);
  }
}

/**
 * A great hearth of river-stone: a hood rising into the roof, an oak lintel, and an opening an ox
 * would fit in, with firedogs and a spit. Lit, three fires burn across it.
 */
function greatHearth(sc: Scene, p: P): void {
  const { x, y } = p;
  const lit = p.lit === 1;
  const ow = 30;
  const jw = 46;
  const lintel = y - 52;
  const open = y - 46;
  for (let py = 0; py < y; py++)
    for (let px = x - jw - 4; px <= x + jw + 4; px++) {
      const ax = Math.abs(px - x);
      if (py < lintel - 8) {
        // The hood, narrowing upward into the gable.
        if (ax > 22 + (py > lintel - 20 ? (py - (lintel - 20)) * 1.6 : 0)) continue;
        const c = cobble(px, py, 261);
        sc.put(px, py, R.stone, c < 0 ? 0.1 : (c + 0.1 - 0.004 * (px - x)) * 0.85, y);
      } else if (py < lintel) {
        // A corbel course of long flat stones.
        if (ax > jw + 2) continue;
        const k = py - (lintel - 8);
        sc.put(px, py, R.stone, k === 0 || k === 4 ? 0.62 : k === 3 || k === 7 ? 0.12 : (px + (k > 3 ? 7 : 0)) % 15 === 0 ? 0.12 : 0.44 - 0.003 * (px - x), y);
      } else if (py < open) {
        // The lintel: one oak beam, cut with a running knot.
        if (ax > jw + 4) continue;
        const k = py - lintel;
        let s = k === 0 ? 0.72 : k === 5 ? 0.14 : 0.46 + (vnoise(px * 0.1, k, 262) - 0.5) * 0.1;
        if (k > 0 && k < 5 && ax < jw) s = Math.abs(((px + k * 2) % 8) - 4) < 1 || Math.abs(((px - k * 2 + 80) % 8) - 4) < 1 ? 0.64 : 0.26;
        sc.put(px, py, R.wood, s, y);
      } else if (ax > ow) {
        if (ax > jw) continue;
        const c = cobble(px, py, 263);
        sc.put(px, py, R.stone, c < 0 ? 0.1 : c + 0.12 - 0.003 * (px - x) - (ax < ow + 3 ? 0.12 : 0), y);
      } else {
        // Inside: soot-black stone at the back, the side walls catching what light there is.
        const depth = py - open;
        const side = ow - ax < 5;
        const c = cobble(px * 1.3, py * 1.3, 264);
        let s = side ? 0.26 - 0.03 * (ow - ax) : 0.1 + 0.08 * clamp(depth / 46);
        if (c < 0) s *= 0.5;
        if (lit && py > y - 16 && !side) {
          const g = clamp(1 - Math.hypot((px - x) / 30, (py - y) / 14));
          if (g > 0.25 && hash2(px, py, 265) < g) {
            sc.put(px, py, R.fire, 0.05 + 0.25 * g, y);
            continue;
          }
        }
        sc.put(px, py, R.stone, s, y);
      }
    }
  // The hearthstone: one slab, the width of the whole thing.
  for (let py = y - 3; py < y + 2; py++)
    for (let px = x - jw - 6; px <= x + jw + 6; px++) {
      const k = py - (y - 3);
      sc.put(px, py, R.stone, k === 0 ? 0.7 : k === 1 ? 0.56 : 0.3 - 0.003 * (px - x), y + 1);
    }
  // Ash, then the logs on their firedogs, then the spit across the whole opening.
  for (let px = x - 24; px <= x + 24; px++) {
    const h = 3 * Math.sqrt(Math.max(0, 1 - ((px - x) / 24) ** 2));
    for (let k = 0; k < h; k++) {
      const ember = lit && hash2(px, k, 266) > 0.55;
      sc.put(px, y - 4 - k, ember ? R.fire : R.rock, ember ? 0.3 + 0.4 * hash2(px, k, 267) : 0.45 + 0.25 * hash2(px, k, 268), y);
    }
  }
  const log = (x0: number, y0: number, x1: number, y1: number, s: number): void => {
    line(sc, x0, y0, x1, y1, R.wood, lit ? s * 0.3 : s, y, 4);
    line(sc, x0, y0 - 1.5, x1, y1 - 1.5, R.wood, lit ? s * 0.5 : s + 0.22, y, 1);
    if (lit) for (let k = 0; k < 6; k++) sc.put(Math.round(x0 + ((x1 - x0) * (k + 0.5)) / 6), Math.round(y0 + ((y1 - y0) * (k + 0.5)) / 6) + 1, R.fire, 0.6, y);
  };
  log(x - 22, y - 9, x + 20, y - 11, 0.34);
  log(x - 18, y - 13, x + 22, y - 15, 0.42);
  log(x - 14, y - 17, x + 12, y - 19, 0.5);
  for (const dx of [-20, 20]) {
    for (let k = 0; k < 16; k++) sc.put(x + dx, y - 3 - k, R.metal, 0.3, y);
    for (let k = 0; k < 16; k++) sc.put(x + dx + 1, y - 3 - k, R.metal, 0.14, y);
    for (let k = -2; k <= 3; k++) sc.put(x + dx + k, y - 3, R.metal, 0.2, y);
    sc.put(x + dx, y - 20, R.metal, 0.6, y);
    sc.put(x + dx + 1, y - 20, R.metal, 0.4, y);
    sc.put(x + dx, y - 19, R.metal, 0.4, y);
    sc.put(x + dx + 1, y - 19, R.metal, 0.3, y);
  }
  for (let px = x - ow + 1; px <= x + ow + 6; px++) {
    sc.put(px, y - 27, R.metal, 0.56, y);
    sc.put(px, y - 26, R.metal, 0.22, y);
  }
  // The crank, outside the opening on the right.
  for (let k = 0; k < 6; k++) sc.put(x + ow + 6, y - 27 + k, R.metal, 0.4, y);
  sc.put(x + ow + 7, y - 22, R.metal, 0.6, y);
  if (lit) {
    sc.flames.push({ x: x - 12, y: y + 1, up: 7, size: 1.15 });
    sc.flames.push({ x: x + 13, y: y + 1, up: 7, size: 1.05 });
    sc.flames.push({ x, y: y + 1, up: 8, size: 1.45 });
  }
}

/** The Elder's chair: a high back cut with knotwork, brass caps on its posts, on a low dais. */
function highSeat(sc: Scene, p: P): void {
  const { x, y } = p;
  for (let py = y - 3; py < y + 1; py++)
    for (let px = x - 19; px <= x + 19; px++) {
      const k = py - (y - 3);
      sc.put(px, py, R.wood, k === 0 ? 0.74 : k === 1 ? 0.5 : 0.3 - 0.004 * (px - x), y);
    }
  for (let py = y - 66; py < y - 3; py++)
    for (let px = x - 14; px <= x + 14; px++) {
      const dx = px - x;
      const ax = Math.abs(dx);
      const up = y - py;
      const postP = ax >= 10 && ax <= 13 && up > 16 && up < 62;
      const arm = ax >= 10 && up >= 16 && up < 30;
      const back = ax < 10 && up >= 18 && up < 58 + Math.round(3 * Math.cos((dx / 10) * 1.5));
      const seat = ax <= 12 && up >= 13 && up < 18;
      const front = ax <= 12 && up < 13;
      if (!postP && !arm && !back && !seat && !front) continue;
      let s: number;
      let ramp = R.wood;
      if (seat) {
        // A cushion in the Elder's purple.
        ramp = ax < 11 && up > 14 ? R.purple : R.wood;
        s = ramp === R.purple ? 0.7 - 0.02 * dx - (up === 15 ? 0 : 0.15) : 0.7;
      } else if (front) {
        const inset = ax < 9 && up > 3 && up < 11;
        s = inset ? ((ax + up) % 4 === 0 ? 0.5 : 0.22) : up === 12 ? 0.62 : 0.36;
        if (ax >= 11) s = 0.3;
      } else if (postP || arm) {
        s = (dx < 0 ? 0.56 : 0.3) + (up % 5 === 0 ? -0.12 : 0);
        if (arm && up >= 27) s = 0.72;
      } else {
        // The back: a frame round a panel of interlace.
        const inner = ax < 7 && up > 21 && up < 52;
        if (!inner) s = ax >= 8 ? 0.6 - 0.02 * dx : 0.5;
        else {
          const a = Math.abs(((dx + up + 40) % 6) - 3);
          const b = Math.abs(((dx - up + 60) % 6) - 3);
          s = Math.min(a, b) < 0.8 ? 0.62 : Math.min(a, b) < 1.6 ? 0.3 : 0.16;
        }
      }
      sc.put(px, py, ramp, s, y);
    }
  // The arms end in beasts' heads, and the posts in brass.
  for (const side of [-1, 1]) {
    const hx = x + side * 15;
    for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) sc.put(hx + side * (j - 1), y - 30 + k, R.wood, k === 0 ? 0.8 : 0.4, y);
    sc.put(hx + side * 2, y - 29, R.gold, 0.9, y);
    for (let k = 0; k < 4; k++)
      for (let j = -2; j <= 2; j++) {
        if (Math.abs(j) === 2 && (k === 0 || k === 3)) continue;
        sc.put(x + side * 11.5 + j, y - 66 + k, R.gold, k === 0 || j < 0 ? 0.95 : 0.5, y);
      }
  }
  sc.blockRect(x - 15, y - 5, x + 16, y + 1);
}

/** A white bearskin laid flat on the floor, head toward the viewer's right. Drawn as ground. */
function bearskin(sc: Scene, p: P): void {
  const { x, y } = p;
  const inside = (dx: number, dy: number): boolean => {
    if ((dx / 18) ** 2 + (dy / 5.5) ** 2 < 1) return true;
    // Legs splayed at the four corners, the head at one end.
    for (const [lx, ly] of [[-13, -5], [-13, 5], [10, -5], [10, 5]]) if (Math.abs(dx - lx) < 3 && Math.abs(dy - ly) < 2.2) return true;
    return ((dx - 21) / 5) ** 2 + (dy / 3.4) ** 2 < 1;
  };
  for (let dy = -8; dy <= 8; dy++)
    for (let dx = -20; dx <= 27; dx++) {
      if (!inside(dx, dy)) continue;
      const edge = !inside(dx, dy - 1) || !inside(dx, dy + 1) || !inside(dx - 1, dy) || !inside(dx + 1, dy);
      sc.put(x + dx, y + dy, R.white, edge ? 0.3 : 0.6 + 0.25 * hash2(x + dx, (y + dy) >> 1, 271) - 0.03 * dy, 0);
    }
  sc.put(x + 24, y - 1, R.ink, 0, 0);
  sc.put(x + 24, y + 1, R.ink, 0, 0);
  sc.put(x + 26, y, R.ink, 0, 0);
}

/** A round shield hung on the wall: two colours quartered, with an iron boss. */
function shield(sc: Scene, p: P): void {
  const { x, y } = p;
  const r = p.r ?? 8;
  const a = rampOf(p, R.red);
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      const d = Math.hypot(dx, dy) / r;
      if (d > 1) continue;
      const lit = 0.12 * (-dx - dy) / r;
      if (d > 0.84) sc.put(x + dx, y + dy, R.metal, 0.3 + lit * 2, 96);
      else if (d < 0.3) sc.put(x + dx, y + dy, R.metal, 0.5 + lit * 3 + (d < 0.15 ? 0.2 : 0), 96);
      else sc.put(x + dx, y + dy, (dx < 0) === (dy < 0) ? a : R.cream, 0.55 + lit, 96);
    }
}

/** A bench. With v: 'bed', made up as one, with a bearskin thrown over it. */
function bench(sc: Scene, p: P): void {
  const { x, y } = p;
  const hw = (p.w ?? 50) / 2;
  for (const lx of [-hw + 3, hw - 6]) for (let py = y - 8; py < y; py++) for (let k = 0; k < 3; k++) sc.put(x + lx + k, py, R.wood, 0.3 - 0.06 * k, y);
  for (let py = y - 12; py < y - 8; py++) {
    const skew = Math.round((y - 8 - py) * 0.5);
    for (let px = Math.floor(x - hw + skew); px <= x + hw + skew; px++) sc.put(px, py, R.wood, 0.7 - (py === y - 12 ? 0.1 : 0), y);
  }
  for (let px = Math.floor(x - hw); px <= x + hw; px++) {
    sc.put(px, y - 8, R.wood, 0.5, y);
    sc.put(px, y - 7, R.wood, 0.3, y);
  }
  if (p.v === 'bed') {
    // The skin, draped: thick on top, hanging over the front edge in a ragged hem.
    for (let px = Math.floor(x - hw + 8); px <= x + hw + 2; px++) {
      const u = (px - (x - hw + 8)) / (2 * hw - 6);
      const hang = 6 + Math.round(3 * Math.sin(u * 9) + 2 * hash2(px, 0, 281));
      const top = y - 16 + Math.round(Math.sin(u * Math.PI) * -1);
      for (let py = top; py < y - 8 + hang - 6; py++) {
        const k = py - top;
        sc.put(px, py, R.fur, k < 2 ? 0.75 : py > y - 8 ? 0.3 : 0.5 + 0.3 * (hash2(px >> 1, py, 282) - 0.5), y);
      }
    }
    // A rolled blanket for a pillow, at the head.
    for (let py = y - 18; py < y - 11; py++)
      for (let px = Math.floor(x - hw); px < x - hw + 9; px++) {
        const d = ((px - (x - hw + 4)) / 4.5) ** 2 + ((py - (y - 14.5)) / 3.5) ** 2;
        if (d < 1) sc.put(px, py, R.cream, 0.95 - 0.5 * d - ((px + py) % 4 === 0 ? 0.15 : 0), y);
      }
  }
  sc.blockRect(x - hw - 1, y - 5, x + hw + 4, y + 1);
}

/**
 * A long trestle table, in the same view as `table`: a thick top leaning away and three trestles.
 * Plain, it carries one candle and one mug. With v: 'feast', everything the village could find,
 * and at the far end a clear space round something dark.
 */
function longTable(sc: Scene, p: P): void {
  const { x, y } = p;
  const w = p.w ?? 110;
  const hw = w / 2;
  for (const lx of [-hw + 6, 0, hw - 8])
    for (let py = y - 10; py < y; py++)
      for (let k = -2; k <= 2; k++) {
        const foot = py >= y - 2;
        sc.put(x + lx + k, py, R.wood, foot ? (py === y - 2 ? 0.5 : 0.3) : k === -2 ? 0.44 : k === 2 ? 0.06 : 0.2, y);
      }
  for (let px = Math.floor(x - hw + 6); px <= x + hw - 8; px++) {
    sc.put(px, y - 6, R.wood, 0.3, y);
    sc.put(px, y - 5, R.wood, 0.1, y);
  }
  for (let py = y - 21; py < y - 10; py++) {
    const skew = Math.round((y - 10 - py) * 0.5);
    for (let px = Math.floor(x - hw + skew); px <= x + hw + skew; px++) {
      const edge = py === y - 21 || px === Math.floor(x - hw + skew);
      const seam = (y - 10 - py) % 4 === 0 && py !== y - 11;
      sc.put(px, py, R.wood, edge ? 0.12 : (seam ? 0.66 : 0.86) + (vnoise(px * 0.08, py * 0.9, 291) - 0.5) * 0.12 + 0.001 * (px - x), y);
    }
  }
  for (let py = y - 10; py < y - 5; py++)
    for (let px = Math.floor(x - hw); px <= x + hw; px++) {
      const k = py - (y - 10);
      sc.put(px, py, R.wood, k === 0 ? 0.95 : k === 4 ? 0.06 : 0.42 - 0.06 * k, y);
    }
  // The right end, seen edge-on.
  for (let py = y - 21; py < y - 5; py++) {
    const k = py - (y - 21);
    const ex = Math.floor(x + hw + 1 + Math.max(0, Math.round((11 - k) * 0.5)));
    sc.put(ex, py, R.wood, 0.28, y);
    sc.put(ex + 1, py, R.wood, 0.1, y);
  }
  const at = (u: number, back = 0.5): [number, number] => [Math.round(x - hw + u * w + back * 5), Math.round(y - 12 - back * 6)];
  const candle = (cx: number, cy: number, burning: boolean): void => {
    for (let k = 0; k < 5; k++) {
      sc.put(cx, cy - k, R.cream, 0.95, y);
      sc.put(cx + 1, cy - k, R.cream, 0.6, y);
    }
    for (let k = -1; k <= 2; k++) sc.put(cx + k, cy + 1, R.metal, 0.4, y);
    if (burning) {
      sc.put(cx, cy - 5, R.fire, 0.95, y);
      sc.put(cx, cy - 6, R.fire, 0.7, y);
    } else {
      // Gone out: a black wick and a thread of smoke.
      sc.put(cx, cy - 5, R.ink, 0, y);
      for (let k = 0; k < 7; k++) if (k % 3 !== 2) sc.put(cx + Math.round(Math.sin(k * 0.9)), cy - 7 - k, R.grey, 0.75, y);
    }
  };
  const mug = (cx: number, cy: number, ramp: number): void => {
    for (let py = cy - 4; py <= cy; py++) for (let k = 0; k < 4; k++) sc.put(cx + k, py, ramp, py === cy - 4 ? 0.8 : k === 0 ? 0.6 : k === 3 ? 0.25 : 0.45, y);
    sc.put(cx + 4, cy - 3, ramp, 0.4, y);
    sc.put(cx + 4, cy - 1, ramp, 0.4, y);
    sc.put(cx + 5, cy - 2, ramp, 0.3, y);
  };
  if (p.v === 'bare') {
    // Nothing: whatever is on it is set out separately.
  } else if (p.v !== 'feast') {
    const [mx, my] = at(0.36, 0.4);
    mug(mx, my, R.metal);
    const [cx, cy] = at(0.62, 0.6);
    candle(cx, cy, true);
  } else {
    // Platters of bread and a joint, horns of ale, a cask on its side at the near end.
    const platter = (u: number, back: number, what: 'bread' | 'roast'): void => {
      const [cx, cy] = at(u, back);
      for (let k = -6; k <= 6; k++) sc.put(cx + k, cy, R.wood, Math.abs(k) === 6 ? 0.3 : 0.5, y);
      for (let k = -5; k <= 5; k++) sc.put(cx + k, cy + 1, R.wood, 0.28, y);
      if (what === 'roast')
        for (let py = cy - 5; py < cy; py++)
          for (let k = -5; k <= 5; k++) {
            if ((k / 5.5) ** 2 + ((py - cy + 0.5) / 5) ** 2 > 1) continue;
            sc.put(cx + k, py, R.wood, 0.95 - 0.06 * k - 0.08 * (py - cy + 5) + 0.15 * hash2(cx + k, py, 292) - (py === cy - 1 ? 0.3 : 0), y);
          }
      else
        for (const [bx, bh] of [[-3, 3], [2, 4]])
          for (let py = cy - bh; py < cy; py++)
            for (let k = -2; k <= 2; k++) if (!(py === cy - bh && Math.abs(k) === 2)) sc.put(cx + bx + k, py, R.thatch, py === cy - bh ? 0.95 : 0.6 - 0.1 * k, y);
    };
    const horn = (u: number, back: number, flip: number): void => {
      const [cx, cy] = at(u, back);
      for (let k = 0; k < 7; k++) {
        const hx = cx + flip * k;
        const hy = cy - Math.round(Math.sqrt(k) * 2.2);
        sc.put(hx, hy, R.cream, 0.9 - 0.05 * k, y);
        sc.put(hx, hy + 1, R.cream, 0.5, y);
      }
      sc.put(cx + flip * 7, cy - 6, R.gold, 0.9, y);
    };
    platter(0.4, 0.5, 'roast');
    platter(0.6, 0.3, 'bread');
    platter(0.78, 0.6, 'bread');
    horn(0.3, 0.3, 1);
    horn(0.52, 0.7, -1);
    horn(0.68, 0.8, 1);
    mug(...at(0.47, 0.1), R.metal);
    mug(...at(0.86, 0.2), R.leather);
    candle(...at(0.58, 0.9), true);
    candle(...at(0.72, 0.1), true);
    // The cask, on a chock, tap toward the room.
    const [kx, ky] = at(0.93, 0.5);
    for (let dy = -8; dy <= 0; dy++)
      for (let dx = -6; dx <= 6; dx++) {
        if ((dx / 6.5) ** 2 + ((dy + 4) / 4.6) ** 2 > 1) continue;
        const hoop = Math.abs(dx) === 4;
        sc.put(kx + dx, ky + dy, hoop ? R.metal : R.wood, (hoop ? 0.5 : 0.62) - 0.08 * (dy + 4), y);
      }
    sc.put(kx - 7, ky - 3, R.metal, 0.6, y);
    sc.put(kx - 8, ky - 3, R.metal, 0.4, y);
    // At the far end, with a clear space round it: one cup, set apart from the rest.
    mug(...at(0.08, 0.5), R.leather);
  }
  sc.blockRect(x - hw - 1, y - 6, x + hw + 6, y + 1);
}

// ---------------------------------------------------------------------------------------------

/**
 * A bookcase. `w` wide, `h` tall from the floor line. Variants:
 *   'few'      the village library: nine books, and a great deal of shelf
 *   'deep'     a scholar's: books two deep, stacked on their sides on top, scrolls and oddments
 *   'bottles'  an innkeeper's: bottles, crocks and a row of red draughts with wax stoppers
 */
function bookcase(sc: Scene, p: P): void {
  const { x, y } = p;
  const w = p.w ?? 40;
  const h = p.h ?? 50;
  const hw = w / 2;
  const v = p.v ?? 'deep';
  const tierH = v === 'bottles' ? 15 : 14;
  const x0 = Math.floor(x - hw);
  const x1 = Math.floor(x + hw);
  const seed = (p.seed ?? 1) * 31;
  const SPINES = [R.red, R.blue, R.green, R.purple, R.cream, R.leather, R.brown, R.wood];
  // Carcass: sides, back, shelves.
  for (let py = y - h; py < y; py++)
    for (let px = x0; px <= x1; px++) {
      const side = px < x0 + 2 || px > x1 - 2;
      const k = (y - py) % tierH;
      const topRail = py < y - h + 3;
      if (side || topRail) sc.put(px, py, R.wood, side ? (px === x0 || px === x1 - 1 ? 0.6 : 0.34) : py === y - h ? 0.66 : 0.3, y);
      else if (k === 0 || k === 1) sc.put(px, py, R.wood, k === 1 ? 0.64 : 0.26, y);
      else sc.put(px, py, R.wood, 0.1 + 0.04 * (k / tierH), y);
    }
  const bp = (px: number, py: number, ramp: number, sh: number, base: number): void => {
    if (px >= x0 + 2 && px <= x1 - 2) sc.put(px, py, ramp, sh, base);
  };
  const tiers = Math.floor((h - 4) / tierH);
  for (let t = 0; t < tiers; t++) {
    const floor = y - t * tierH - 2;
    const room = tierH - 2;
    let px = x0 + 2;
    let n = 0;
    while (px < x1 - 2) {
      const r = (k: number): number => hash2(t * 97 + n, k, seed);
      if (v === 'few') {
        // Nine books in all, leaning where they were left.
        const counts = [4, 3, 2, 0, 0, 0];
        if (n >= counts[t % counts.length]) break;
        const bw = 3;
        const bh = 8 + Math.floor(r(1) * 3);
        const lean = n === counts[t % counts.length] - 1 ? 1 : 0;
        for (let k = 0; k < bh; k++) for (let j = 0; j < bw; j++) bp(px + j + (lean && k > bh / 2 ? 1 : 0), floor - k, SPINES[Math.floor(r(2) * 6)], j === 0 ? 0.36 : 0.6, y);
        px += bw + (r(3) > 0.6 ? 1 : 0);
        n++;
        continue;
      }
      if (v === 'bottles') {
        const kind = t === 0 ? 'crock' : t === 1 ? 'draught' : r(1) > 0.4 ? 'bottle' : 'crock';
        if (kind === 'draught') {
          // The red draughts, in a row, stoppered with wax.
          for (let k = 0; k < 6; k++) for (let j = 0; j < 3; j++) bp(px + j, floor - k, k > 3 ? R.cream : R.red, k > 3 ? 0.8 : j === 0 ? 0.85 : j === 2 ? 0.35 : 0.6, y);
          px += 5;
        } else if (kind === 'crock') {
          const cw = 6 + Math.floor(r(2) * 3);
          const ch = 7 + Math.floor(r(3) * 3);
          const ramp = r(4) > 0.5 ? R.cream : R.earth;
          for (let k = 0; k < ch; k++)
            for (let j = 0; j < cw; j++) {
              const bulge = k === 0 || k === ch - 1 ? (j === 0 || j === cw - 1 ? -1 : 0) : 0;
              if (bulge < 0) continue;
              bp(px + j, floor - k, ramp, (k === ch - 2 ? 0.3 : 0.75) - 0.08 * j + (k === ch - 1 ? 0.15 : 0), y);
            }
          px += cw + 2;
        } else {
          const ramp = r(5) > 0.5 ? R.green : R.leather;
          const bh = 7 + Math.floor(r(6) * 3);
          for (let k = 0; k < bh; k++) for (let j = 0; j < 3; j++) bp(px + j, floor - k, ramp, j === 0 ? 0.85 : j === 2 ? 0.3 : 0.6, y);
          for (let k = 0; k < 3; k++) bp(px + 1, floor - bh - k, ramp, 0.6, y);
          bp(px + 1, floor - bh - 3, R.wood, 0.5, y);
          px += 5;
        }
        n++;
        continue;
      }
      // 'deep': a back row shows in every gap; some books lie flat in stacks.
      const flat = r(1) > 0.84;
      if (flat) {
        const sw = 7 + Math.floor(r(2) * 4);
        const cnt = 2 + Math.floor(r(3) * 3);
        for (let b = 0; b < cnt; b++) {
          const ramp = SPINES[Math.floor(r(10 + b) * SPINES.length)];
          const off = Math.floor(r(20 + b) * 2);
          for (let k = 0; k < 2; k++) for (let j = 0; j < sw - off; j++) bp(px + j + off, floor - b * 2 - k, ramp, k === 1 ? 0.8 : 0.45, y);
        }
        px += sw + 1;
      } else if (r(4) > 0.9) {
        // A scroll rack: ends of rolled paper.
        for (let k = 0; k < 3; k++)
          for (let j = 0; j < 2; j++) {
            const cx = px + j * 4 + 1.5;
            const cy = floor - 1.5 - k * 3.5 - j * 0.5;
            for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) if (a * a + b * b <= 3) bp(cx + a, cy + b, R.cream, a * a + b * b < 1 ? 0.4 : 0.85 - 0.08 * (a + b), y);
          }
        px += 8;
      } else {
        const bw = 2 + Math.floor(r(5) * 2.2);
        const bh = Math.min(room - 1, 6 + Math.floor(r(6) * 6));
        if (r(7) > 0.12) {
          const ramp = SPINES[Math.floor(r(8) * SPINES.length)];
          const script = Math.floor(r(9) * 6);
          for (let k = 0; k < bh; k++)
            for (let j = 0; j < bw; j++) {
              let s = j === 0 ? 0.74 : j === bw - 1 ? 0.3 : 0.55;
              // Bands and lettering, a different hand for each of six scripts.
              const mark =
                script === 0 ? k === 2 || k === bh - 2 :
                script === 1 ? k % 3 === 1 && j === 1 :
                script === 2 ? (k + j) % 4 === 0 :
                script === 3 ? k === Math.floor(bh / 2) :
                script === 4 ? k > 1 && k < bh - 1 && j === 1 && k % 2 === 0 : k === 1;
              if (mark && bw > 2) {
                bp(px + j, floor - k, ramp === R.cream ? R.leather : R.gold, 0.6, y);
                continue;
              }
              if (k === bh - 1) s += 0.12;
              bp(px + j, floor - k, ramp, ramp === R.cream ? s * 0.7 : s, y);
            }
        } else {
          // A gap: the back row, in shadow.
          for (let k = 0; k < bh - 2; k++) for (let j = 0; j < bw; j++) bp(px + j, floor - k, SPINES[Math.floor(r(8) * SPINES.length)], 0.18, y);
        }
        px += bw;
      }
      n++;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// The inn and the hut

/** Squared stones laid in courses: the shade at (x, y), or -1 on a joint. */
function ashlar(x: number, y: number, seed: number, ch = 6): number {
  const row = Math.floor(y / ch);
  const off = Math.floor(hash2(row, 0, seed) * 12);
  const bx = Math.floor((x + off) / 11);
  const lx = (x + off) % 11;
  const ly = y % ch;
  if (ly === 0 || lx === 0) return -1;
  let s = 0.5 + 0.24 * (hash2(bx, row, seed + 1) - 0.5) + (fbm(x * 0.3, y * 0.3, seed + 2, 2) - 0.5) * 0.16;
  if (ly === 1 || lx === 1) s += 0.12;
  if (ly === ch - 1) s -= 0.1;
  return s;
}

/**
 * A fireplace against the back wall, with a chimney breast up through the ceiling and a plank
 * mantel. `w` is the outside width. `lit`: 0 a sulking fire, 1 a good one, 2 a roaring one.
 * v: 'inn' coursed stone, a kettle on the hob and the bellows; 'hut' fieldstone and a pot on a crane.
 */
function fireplace(sc: Scene, p: P): void {
  const { x, y } = p;
  const jw = (p.w ?? 48) / 2;
  const ow = jw - 10;
  const oh = 24;
  const hut = p.v === 'hut';
  const lit = p.lit ?? 0;
  const stoneAt = (px: number, py: number): number => (hut ? cobble(px, py, 301, 11, 8) : ashlar(px, py, 302));
  const mantel = y - oh - 8;
  const mat = hut ? R.stone : R.earth;
  for (let py = 0; py < y; py++)
    for (let px = Math.floor(x - jw - 3); px <= x + jw + 3; px++) {
      const ax = Math.abs(px - x);
      if (py < mantel - 3) {
        if (ax > jw - 5) continue;
        // Smoke has browned the breast above the fire.
        const soot = hut ? 0 : 0.25 * clamp(1 - ax / 14 - (mantel - py) / 40);
        const c = stoneAt(px, py);
        sc.put(px, py, mat, c < 0 ? 0.12 : c * 0.9 - soot - 0.004 * (px - x), y);
      } else if (py < mantel + 1) {
        // The mantel shelf.
        if (ax > jw + 3) continue;
        const k = py - (mantel - 3);
        sc.put(px, py, R.wood, k === 0 ? 0.8 : k === 3 ? 0.12 : 0.46, y);
      } else if (ax > ow || py < y - oh) {
        if (ax > jw) continue;
        // An arch over the opening.
        const archY = y - oh + Math.round(4 * (ax / ow) ** 2);
        if (ax <= ow && py >= archY) {
          sc.put(px, py, R.ink, 0, y);
          continue;
        }
        const c = stoneAt(px, py);
        const voussoir = ax <= ow + 2 && py >= y - oh - 4 && py < archY;
        sc.put(px, py, mat, c < 0 ? 0.12 : voussoir ? 0.6 - 0.004 * (px - x) : c - 0.004 * (px - x), y);
      } else {
        const depth = (py - (y - oh)) / oh;
        const side = ow - ax < 3;
        let s = side ? 0.24 : 0.06 + 0.08 * depth;
        const g = clamp(1 - Math.hypot((px - x) / (ow * 0.9), (py - y) / 10));
        if (g > 0.2 && hash2(px, py, 303) < g * (lit ? 1 : 0.6)) {
          sc.put(px, py, R.fire, 0.05 + (lit ? 0.3 : 0.15) * g, y);
          continue;
        }
        if (hash2(px, py, 304) > 0.8) s *= 0.6;
        sc.put(px, py, mat, s, y);
      }
    }
  // Hearthstone, ash, a log or two.
  for (let py = y - 2; py < y + 1; py++) for (let px = Math.floor(x - jw - 3); px <= x + jw + 3; px++) sc.put(px, py, mat, py === y - 2 ? 0.66 : 0.32, y + 1);
  for (let px = x - ow + 3; px <= x + ow - 3; px++) {
    const ember = hash2(px, 1, 305);
    sc.put(px, y - 3, ember > (lit ? 0.4 : 0.7) ? R.fire : R.rock, ember > 0.5 ? 0.3 + 0.4 * ember : 0.4, y);
  }
  line(sc, x - 7, y - 4, x + 6, y - 6, R.wood, 0.1, y, 2.4);
  if (lit) line(sc, x + 7, y - 4, x - 5, y - 7, R.wood, 0.14, y, 2.4);
  sc.flames.push({ x, y: y + 1, up: 4, size: lit === 2 ? 1.05 : lit ? 0.85 : 0.45 });
  if (hut) {
    // A crane swung over the fire, and the pot on its hook.
    const cx = x + ow - 1;
    for (let k = 0; k < oh - 2; k++) sc.put(cx, y - 2 - k, R.metal, 0.3, y);
    for (let k = 0; k <= ow - 1; k++) sc.put(cx - k, y - oh + 2, R.metal, 0.4, y);
    for (let k = 0; k < 5; k++) sc.put(x, y - oh + 3 + k, R.metal, 0.3, y);
    for (let py = y - oh + 8; py < y - oh + 16; py++)
      for (let px = x - 7; px <= x + 7; px++) {
        const d = ((px - x) / 7.5) ** 2 + ((py - (y - oh + 9)) / 7) ** 2;
        if (py > y - oh + 9 && d > 1) continue;
        sc.put(px, py, R.metal, py === y - oh + 8 ? 0.55 : 0.28 - 0.025 * (px - x) - (d > 0.7 ? 0.1 : 0), y);
      }
    // Steam off the pot.
    for (let k = 0; k < 8; k++) if (k % 3 !== 1) sc.put(x - 2 + Math.round(Math.sin(k * 0.8) * 1.5), y - oh + 6 - k, R.white, 0.75, y);
  } else {
    // A kettle on the hob, and the bellows that keep the fire alive.
    const kx = x - ow + 4;
    for (let py = y - 10; py < y - 3; py++)
      for (let px = kx - 4; px <= kx + 4; px++) {
        const d = ((px - kx) / 4.5) ** 2 + ((py - (y - 6)) / 3.6) ** 2;
        if (d > 1) continue;
        sc.put(px, py, R.metal, 0.5 - 0.06 * (px - kx) - 0.05 * (py - (y - 8)), y);
      }
    for (let k = 0; k < 3; k++) sc.put(kx + 4 + k, y - 7 - k, R.metal, 0.4, y);
    for (let k = -2; k <= 2; k++) sc.put(kx + k, y - 11 - (Math.abs(k) < 2 ? 1 : 0), R.metal, 0.35, y);
    const bx = x + jw + 4;
    for (let py = y - 12; py < y; py++)
      for (let px = bx - 4; px <= bx + 4; px++) {
        const t = (py - (y - 12)) / 12;
        if (Math.abs(px - bx) > 1 + 3.5 * Math.sin(t * Math.PI * 0.85)) continue;
        sc.put(px, py, R.leather, (px - bx) % 3 === 0 ? 0.3 : 0.7 - 0.06 * (px - bx), y);
      }
    for (let k = 0; k < 6; k++) sc.put(bx, y - 12 - k, R.wood, 0.5, y);
    for (let k = 0; k < 4; k++) sc.put(bx, y + k - 1, R.metal, 0.4, y);
  }
}

/** Something hung from the ceiling on a cord or chain from (x, y): kettle, helm, herbs, sausages, onions. */
function hang(sc: Scene, p: P): void {
  const { x, y } = p;
  const v = p.v ?? 'herbs';
  const drop = p.h ?? 10;
  const b = 96;
  for (let k = 0; k < drop; k++) sc.put(x, y + k, v === 'kettle' || v === 'helm' ? R.metal : R.cream, v === 'kettle' || v === 'helm' ? (k % 2 ? 0.2 : 0.45) : 0.5, b);
  const top = y + drop;
  if (v === 'kettle') {
    for (let k = -4; k <= 4; k++) sc.put(x + k, top + Math.round((k * k) / 6), R.metal, 0.4, b);
    for (let py = top + 2; py < top + 12; py++)
      for (let px = x - 7; px <= x + 7; px++) {
        const d = ((px - x) / 7) ** 2 + ((py - (top + 8)) / 5) ** 2;
        if (d > 1 && py > top + 4) continue;
        if (py <= top + 4 && Math.abs(px - x) > 4) continue;
        sc.put(px, py, R.metal, py === top + 2 ? 0.6 : 0.62 - 0.07 * (px - x) - 0.05 * (py - top - 4) - (d > 0.75 ? 0.15 : 0), b);
      }
    for (let k = 0; k < 4; k++) sc.put(x + 8 + k, top + 7 - k, R.metal, 0.4, b);
    sc.put(x + 12, top + 3, R.metal, 0.6, b);
  } else if (v === 'helm') {
    // A helm with a nasal guard, hung by its chin-strap.
    for (let py = top; py < top + 11; py++)
      for (let px = x - 6; px <= x + 6; px++) {
        const d = ((px - x) / 6) ** 2 + ((py - (top + 7)) / 7) ** 2;
        if (d > 1 || py > top + 7) continue;
        const ridge = px === x && py < top + 7;
        sc.put(px, py, R.metal, ridge ? 0.85 : 0.6 - 0.08 * (px - x) - 0.04 * (py - top), b);
      }
    for (let px = x - 6; px <= x + 6; px++) sc.put(px, top + 8, R.gold, 0.6 - 0.03 * (px - x), b);
    for (let k = 9; k < 13; k++) sc.put(x, top + k, R.metal, 0.5, b);
  } else if (v === 'sausages') {
    for (let i = 0; i < 4; i++) {
      const sx = x - 4 + i * 3;
      for (let k = 0; k < 8 + (i % 2) * 2; k++) sc.put(sx, top + k, R.red, k === 0 ? 0.3 : 0.55 - (i % 2) * 0.1, b);
      for (let k = 0; k < 8 + (i % 2) * 2; k++) sc.put(sx + 1, top + k, R.red, 0.35, b);
    }
  } else if (v === 'onions') {
    for (let i = 0; i < 6; i++) {
      const ox = x + (i % 2 ? 2 : -2);
      const oy = top + 2 + i * 3;
      for (let a = -2; a <= 2; a++) for (let c = -1; c <= 1; c++) if (a * a + c * c * 2 <= 4) sc.put(ox + a, oy + c, R.thatch, 0.8 - 0.12 * a - 0.15 * c, b);
    }
  } else {
    // A bunch of herbs, heads down.
    for (let i = -3; i <= 3; i++) {
      const len = 8 + Math.floor(hash2(x, i, 311) * 6);
      for (let k = 0; k < len; k++) sc.put(x + Math.round(i * (k / len) * 1.2), top + k, R.green, k > len - 4 ? 0.7 : 0.4 + 0.1 * (i & 1), b);
    }
    for (let k = -2; k <= 2; k++) sc.put(x + k, top, R.cream, 0.6, b);
  }
}

/** A box bed built into a corner: a panelled cupboard, a curtain half drawn, a fur within. */
function boxbed(sc: Scene, p: P): void {
  const { x, y } = p;
  const w = p.w ?? 56;
  const hw = w / 2;
  const top = y - (p.h ?? 64);
  const cloth = rampOf(p, R.red);
  const x0 = Math.floor(x - hw);
  const x1 = Math.floor(x + hw);
  const sill = y - 16;
  for (let py = top; py < y; py++)
    for (let px = x0; px <= x1; px++) {
      const lx = px - x0;
      const frame = lx < 4 || px > x1 - 4 || py < top + 6;
      if (frame) {
        // Posts, and a cornice with a carved run.
        let s = lx === 0 || px === x1 - 3 ? 0.64 : lx === 3 || px === x1 ? 0.16 : 0.42;
        if (py < top + 6) s = py === top ? 0.72 : py === top + 5 ? 0.12 : (lx + (py - top) * 2) % 6 < 2 ? 0.6 : 0.36;
        sc.put(px, py, R.wood, s, y);
      } else if (py >= sill) {
        // The front board, panelled.
        const k = py - sill;
        const panel = k > 2 && k < 13 && (lx - 4) % 16 > 2 && (lx - 4) % 16 < 14;
        sc.put(px, py, R.wood, k === 0 ? 0.74 : k === 15 ? 0.14 : panel ? ((lx - 4) % 16 === 3 || k === 3 ? 0.2 : 0.4) : 0.5, y);
      } else {
        // Inside: boards in shadow, a pillow at the head, and a fur heaped over a red blanket.
        const u = (px - x0 - 4) / (w - 8);
        const k = sill - py;
        const pillow = u > 0.04 && u < 0.26 && k < 6 + Math.round(1.5 * Math.sin(((u - 0.04) / 0.22) * Math.PI));
        const heap = 5 + Math.round(3 * Math.sin(((u - 0.26) / 0.74) * Math.PI) + 1.2 * Math.sin(u * 23));
        if (pillow) sc.put(px, py, R.cream, 0.95 - 0.06 * k - (u < 0.07 || u > 0.23 ? 0.25 : 0), y);
        else if (u >= 0.26 && k < heap) {
          const fold = k === heap - 1;
          const blanket = k < 2 || (u > 0.85 && k < heap - 1);
          sc.put(px, py, blanket ? cloth : R.fur, fold ? 0.9 : blanket ? 0.55 : 0.55 + 0.3 * (hash2(px >> 1, py, 312) - 0.5) + 0.1 * Math.sin(u * 23), y);
        } else if (u < 0.26 && k < 3) sc.put(px, py, cloth, 0.45, y);
        else sc.put(px, py, R.wood, (px - x0) % 7 === 0 ? 0.08 : 0.18 + 0.04 * (k / 40), y);
      }
    }
  // The curtain, gathered to one side in folds, hanging from a rod.
  for (let px = x0 + 3; px <= x1 - 3; px++) sc.put(px, top + 7, R.metal, 0.4, y);
  const cw = Math.round(w * 0.38);
  for (let py = top + 8; py < sill + 2; py++) {
    const k = (py - top - 8) / (sill - top - 6);
    const span = Math.round(cw * (1 - 0.35 * Math.sin(k * Math.PI * 0.9)));
    for (let px = x1 - 3 - span; px <= x1 - 4; px++) {
      const f = (px - (x1 - 3 - span)) % 4;
      sc.put(px, py, cloth, f === 0 ? 0.2 : f === 1 ? 0.75 : 0.5 - 0.04 * f, y);
    }
  }
  // A tie-back.
  const tieY = Math.round(top + 8 + (sill - top) * 0.55);
  for (let px = x1 - cw + 4; px <= x1 - 4; px++) sc.put(px, tieY, R.gold, 0.6, y);
}

/** A rail of pegs with cloaks hung up to dry, and what drips off them. */
function pegs(sc: Scene, p: P): void {
  const { x, y } = p;
  const w = p.w ?? 40;
  const x0 = Math.floor(x - w / 2);
  for (let px = x0; px < x0 + w; px++) {
    sc.put(px, y, R.wood, 0.7, 96);
    sc.put(px, y + 1, R.wood, 0.4, 96);
    sc.put(px, y + 2, R.wood, 0.16, 96);
  }
  const cloaks: [number, number, number][] = [
    [0.2, R.green, 34],
    [0.52, R.blue, 30],
    [0.82, R.grey, 36],
  ];
  for (const [u, ramp, len] of cloaks) {
    const cx = Math.round(x0 + u * w);
    sc.put(cx, y - 1, R.wood, 0.6, 96);
    for (let k = 0; k < len; k++) {
      const hw = 2 + Math.min(5, k * 0.35);
      for (let dx = -Math.floor(hw); dx <= hw; dx++) {
        const fold = (dx + 40 + Math.floor(k / 9)) % 3;
        const hem = k === len - 1 && (dx & 1);
        if (hem) continue;
        sc.put(cx + dx, y + 2 + k, ramp, (fold === 0 ? 0.25 : 0.55) - 0.04 * dx - (k > len - 6 ? 0.08 : 0), 96);
      }
    }
    // Wet wool drips.
    for (let k = 0; k < 2; k++) sc.put(cx + 1 - 2 * k, y + 2 + len + 3 + k * 4, R.ice, 0.8, 96);
    for (let dx = -4; dx <= 4; dx++) if (Math.abs(dx) < 4 || hash2(cx, dx, 321) > 0.5) sc.put(cx + dx, 99 + (Math.abs(dx) < 2 ? 1 : 0), R.water, 0.25 + 0.15 * hash2(cx + dx, 1, 322), 0);
  }
  // A hat on the last peg.
  const hx = Math.round(x0 + w - 2);
  for (let k = -4; k <= 4; k++) sc.put(hx + k, y - 2, R.leather, 0.4, 96);
  for (let py = y - 6; py < y - 2; py++) for (let k = -2; k <= 2; k++) sc.put(hx + k, py, R.leather, 0.6 - 0.08 * k, 96);
}

/** Casks on their sides in a cradle, seen end on: two below, one on top, tapped. */
function caskrack(sc: Scene, p: P): void {
  const { x, y } = p;
  const r = 9;
  const cask = (cx: number, cy: number, tap: boolean, seed: number): void => {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const d = Math.hypot(dx, dy) / r;
        if (d > 1) continue;
        let ramp = R.wood;
        let s = 0.58 - 0.18 * (dx + dy) / r + 0.08 * hash2(cx + dx, seed, 331);
        if (d > 0.82) {
          ramp = R.metal;
          s = 0.45 - 0.2 * (dx + dy) / r;
        } else if (d > 0.72) s = 0.2;
        else if ((dx + r * 2) % 4 === 0) s -= 0.14;
        sc.put(cx + dx, cy + dy, ramp, s, y);
      }
    if (tap) {
      for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) sc.put(cx - 1 + j, cy + 2 + k, R.metal, j ? 0.3 : 0.6, y);
      sc.put(cx + 1, cy + 4, R.metal, 0.6, y);
      sc.put(cx + 2, cy + 4, R.metal, 0.4, y);
    }
    // Chalk marks: what is in it, and how much is left.
    for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) sc.put(cx - 5 + k * 2, cy - 5 + j, R.white, 0.85, y);
  };
  for (let py = y - 6; py < y; py++)
    for (let px = x - 22; px <= x + 22; px++) sc.put(px, py, R.wood, py === y - 6 ? 0.6 : (px - x + 40) % 14 < 3 ? 0.3 : 0.42, y);
  cask(x - 11, y - 6 - r, true, 1);
  cask(x + 11, y - 6 - r, true, 2);
  cask(x, y - 6 - r * 2 - 6, false, 3);
}

/** A three-legged stool. */
function stool(sc: Scene, p: P): void {
  const { x, y } = p;
  line(sc, x - 3, y - 7, x - 5, y, R.wood, 0.36, y, 1.4);
  line(sc, x + 3, y - 7, x + 5, y, R.wood, 0.2, y, 1.4);
  line(sc, x, y - 7, x, y - 1, R.wood, 0.14, y, 1.4);
  for (let py = y - 10; py < y - 6; py++)
    for (let px = x - 6; px <= x + 6; px++) {
      const d = ((px - x) / 6.5) ** 2 + ((py - (y - 8.5)) / 2.2) ** 2;
      if (d > 1) continue;
      sc.put(px, py, R.wood, py < y - 8 ? 0.8 - 0.02 * (px - x) : 0.4, y);
    }
  sc.blockEllipse(x, y - 1, 5, 2);
}

/** A braided rag rug in rings, flat on the floor. */
function rug(sc: Scene, p: P): void {
  const { x, y } = p;
  const rx = p.w ?? 30;
  const ry = p.h ?? 8;
  const rings = [R.red, R.cream, R.blue, R.red, R.green, R.cream, R.purple];
  for (let dy = -ry; dy <= ry; dy++)
    for (let dx = -rx; dx <= rx; dx++) {
      const d = Math.hypot(dx / rx, dy / ry);
      if (d > 1) continue;
      const ring = Math.floor(d * 7);
      const braid = (dx + dy * 2 + 40) % 3 === 0;
      sc.put(x + dx, y + dy, rings[ring % rings.length], (braid ? 0.32 : 0.55) - 0.1 * d - (d > 0.92 ? 0.15 : 0), 0);
    }
}

/**
 * A pile of books lying flat. `h` is how many. With v: 'on' it sits on furniture, `r` pixels up
 * from its foot line y (so that it is drawn after the furniture), and blocks nothing.
 */
function bookstack(sc: Scene, p: P): void {
  const x = p.x;
  const y = p.y - (p.r ?? 0);
  const n = p.h ?? 4;
  const seed = p.seed ?? 1;
  const SP = [R.red, R.blue, R.green, R.purple, R.leather, R.cream, R.brown];
  for (let b = 0; b < n; b++) {
    const bw = 8 + Math.floor(hash2(seed, b, 341) * 5);
    const off = Math.round((hash2(seed, b, 342) - 0.5) * 4);
    const ramp = SP[Math.floor(hash2(seed, b, 343) * SP.length)];
    const by = y - 1 - b * 3;
    for (let k = 0; k < 3; k++)
      for (let j = 0; j < bw; j++) {
        const px = x - (bw >> 1) + off + j;
        const page = k === 1 && j > bw - 3;
        sc.put(px, by - k, page ? R.cream : ramp, page ? 0.85 : k === 2 ? 0.8 : k === 0 ? 0.3 : 0.55 - 0.02 * j, p.y);
      }
  }
  if (p.v !== 'on') sc.blockEllipse(x, y - 1, 6, 2);
}

/**
 * A small deep-set window: sill, frame and four panes, with the tarn under snow outside and frost
 * in the corners of the glass.
 */
function hutwindow(sc: Scene, p: P): void {
  const { x, y } = p;
  const w = p.w ?? 24;
  const h = p.h ?? 26;
  const x0 = Math.floor(x - w / 2);
  const y0 = y - h;
  for (let py = y0 - 3; py < y + 4; py++)
    for (let px = x0 - 3; px <= x0 + w + 2; px++) {
      const lx = px - x0;
      const ly = py - y0;
      const frame = lx < 0 || lx >= w || ly < 0 || ly >= h;
      const bar = lx === Math.floor(w / 2) || lx === Math.floor(w / 2) - 1 || ly === Math.floor(h / 2);
      if (py >= y) {
        // The sill, deep enough to keep things on.
        sc.put(px, py, R.wood, py === y ? 0.82 : py === y + 3 ? 0.14 : 0.48, 96);
        continue;
      }
      if (frame) {
        sc.put(px, py, R.wood, lx < 0 && lx > -3 ? 0.62 : ly < 0 ? 0.3 : 0.4, 96);
        continue;
      }
      if (bar) {
        sc.put(px, py, R.wood, 0.36, 96);
        continue;
      }
      // Outside: pale sky, a far ridge, the frozen tarn.
      const sky = ly < h * 0.42;
      const ridge = ly < h * 0.42 + 3 * vnoise(px * 0.2, 1, 351);
      let ramp = sky ? R.sky : ridge ? R.snow : R.ice;
      let s = sky ? 0.75 + 0.2 * (ly / h) : ridge ? 0.6 : 0.62 + 0.2 * vnoise(px * 0.3, py * 0.5, 352);
      // Frost creeping in from the corners of each pane.
      const pw = w / 2;
      const ph = h / 2;
      const cxp = Math.min(lx % pw, pw - 1 - (lx % pw));
      const cyp = Math.min(ly % ph, ph - 1 - (ly % ph));
      if (cxp + cyp + 3 * hash2(px, py, 353) < 4.2) {
        ramp = R.white;
        s = 0.85 + 0.15 * hash2(px, py, 354);
      }
      sc.put(px, py, ramp, s, 96);
    }
}

/** The amulet on its nail: a silver chain looped over, and the moonstone at the bottom of it. */
function amulet(sc: Scene, p: P): void {
  const { x, y } = p;
  sc.put(x, y, R.metal, 0.9, 96);
  sc.put(x, y + 1, R.metal, 0.3, 96);
  for (let k = 0; k < 9; k++) {
    sc.put(x - 1 - Math.round(k * 0.3), y + 1 + k, R.metal, k % 2 ? 0.95 : 0.6, 96);
    sc.put(x + 1 + Math.round(k * 0.3), y + 1 + k, R.metal, k % 2 ? 0.6 : 0.9, 96);
  }
  for (let k = -2; k <= 2; k++) sc.put(x + k, y + 10 + (Math.abs(k) === 2 ? -1 : 0), R.metal, 0.8, 96);
  for (let dy = 0; dy < 4; dy++)
    for (let dx = -2; dx <= 1; dx++) {
      if ((dy === 0 || dy === 3) && (dx === -2 || dx === 1)) continue;
      sc.put(x + dx, y + 11 + dy, R.white, dx < 0 && dy < 2 ? 1 : 0.7, 96);
    }
  sc.put(x - 1, y + 12, R.glow, 0.95, 96);
}

/** The line Fenn drew across his threshold: chalk, and small marks along it. Flat on the floor. */
function threshold(sc: Scene, p: P): void {
  const { x, y } = p;
  const hw = (p.w ?? 30) / 2;
  for (let px = Math.floor(x - hw); px <= x + hw; px++) {
    const wob = Math.round(Math.sin(px * 0.7) * 0.4);
    if (hash2(px, 0, 361) > 0.04) sc.put(px, y + wob, R.cream, 0.6 + 0.3 * hash2(px, 1, 362), 0);
    // A mark every few paces: a stroke, a hook, a cross.
    const k = (px - Math.floor(x - hw)) % 7;
    if (k === 3) {
      sc.put(px, y + 2, R.cream, 0.7, 0);
      sc.put(px, y + 3, R.cream, 0.6, 0);
      if (hash2(px, 2, 363) > 0.5) sc.put(px + 1, y + 2, R.cream, 0.6, 0);
      else sc.put(px - 1, y + 3, R.cream, 0.6, 0);
    }
  }
}

/**
 * Ink, a quill, a candle stub and a mug, set out on a table. y is the table's own foot line plus
 * one, so that these are drawn after it.
 */
function writing(sc: Scene, p: P): void {
  const x = p.x;
  const y = p.y - 15;
  // Loose sheets.
  for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 9; dx++) sc.put(x - 18 + dx + dy, y - dy, R.cream, dy === 2 ? 0.9 : 0.75, p.y);
  for (let dx = 1; dx < 8; dx += 2) sc.put(x - 17 + dx, y - 1, R.ink, 0, p.y);
  // The ink pot and its quill.
  for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 4; dx++) sc.put(x - 4 + dx, y - dy, R.stone, dy === 2 ? 0.5 : 0.25 - 0.04 * dx, p.y);
  for (let k = 0; k < 7; k++) sc.put(x - 2 + Math.round(k * 0.5), y - 3 - k, R.white, k > 3 ? 0.95 : 0.7, p.y);
  sc.put(x + 2, y - 9, R.white, 0.8, p.y);
  // A candle burned down to a stub, with its drips.
  for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) sc.put(x + 8 + j, y - 1 - k, R.cream, j ? 0.6 : 0.9, p.y);
  for (let j = -1; j <= 2; j++) sc.put(x + 8 + j, y, R.cream, 0.7, p.y);
  sc.put(x + 8, y - 3, R.fire, 0.95, p.y);
  sc.put(x + 8, y - 4, R.fire, 0.7, p.y);
  // The mug.
  for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 3; dx++) sc.put(x + 14 + dx, y - dy, R.earth, dy === 3 ? 0.8 : 0.55 - 0.1 * dx, p.y);
  sc.put(x + 17, y - 2, R.earth, 0.4, p.y);
}

// ---------------------------------------------------------------------------------------------

const draw = (fn: (sc: Scene, p: P) => void) => ({ draw: fn });

Object.assign(LAYERS, {
  hallroof: (sc: Scene, l: LayerDef) => hallRoof(sc, num(l, 'y', 30)),
  joists: (sc: Scene, l: LayerDef) => joists(sc, num(l, 'y', 18)),
  boards: (sc: Scene, l: LayerDef) => boards(sc, num(l, 'from', 18), num(l, 'floor', 96)),
  thatchroof: (sc: Scene, l: LayerDef) => thatchRoof(sc, num(l, 'y', 20)),
  earthfloor: (sc: Scene, l: LayerDef) => earthFloor(sc, num(l, 'floor', 96)),
});

Object.assign(PROPS, {
  rime: draw(rime),
  greathearth: draw(greatHearth),
  highseat: draw(highSeat),
  bearskin: draw(bearskin),
  shield: draw(shield),
  bench: draw(bench),
  longtable: draw(longTable),
  bookcase: draw(bookcase),
  fireplace: draw(fireplace),
  hang: draw(hang),
  boxbed: draw(boxbed),
  pegs: draw(pegs),
  caskrack: draw(caskrack),
  stool: draw(stool),
  rug: draw(rug),
  bookstack: draw(bookstack),
  hutwindow: draw(hutwindow),
  amulet: draw(amulet),
  threshold: draw(threshold),
  writing: draw(writing),
});

// Referenced so bundlers keep the registration above when this file is imported for its effect.
export const INDOORS_READY = PW > 0;
