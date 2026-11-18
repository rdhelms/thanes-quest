// Materials ("ramps") and the three ways of turning a material + brightness into a palette colour.
//
// Scenes and sprites are authored once in terms of ramps. Each style quantises them differently:
//   A  16 fixed colours, flat, double-wide pixels
//   B  16 fixed colours, the same bands as A blended with 2x2 dither patterns
//   C  a curated palette (one colour per ramp step), soft ordered dither between neighbours

import { bayer2, bayer4, clamp } from './noise';

export type RGB = readonly [number, number, number];

const hex = (s: string): RGB => [
  parseInt(s.slice(1, 3), 16),
  parseInt(s.slice(3, 5), 16),
  parseInt(s.slice(5, 7), 16),
];

/** The classic 16-colour RGBI palette. */
export const EGA: RGB[] = [
  [0, 0, 0], [0, 0, 170], [0, 170, 0], [0, 170, 170],
  [170, 0, 0], [170, 0, 170], [170, 85, 0], [170, 170, 170],
  [85, 85, 85], [85, 85, 255], [85, 255, 85], [85, 255, 255],
  [255, 85, 85], [255, 85, 255], [255, 255, 85], [255, 255, 255],
];

interface RampSrc {
  /** Colours dark to light for style C. */
  c: string[];
  /** Flat 16-colour steps dark to light for style A scenes. */
  a?: number[];
  /** 16-colour choice per ramp step for sprites in styles A and B. */
  ef?: number[];
}

const SRC = {
  ink: { c: ['#0b0d16'], a: [0], ef: [0] },
  sky: { c: ['#35579f', '#4a74b9', '#6893cf', '#8fb4e2', '#b9d3ee', '#e0ecf7'], a: [9, 9, 9, 11, 11, 15] },
  snow: { c: ['#4f6494', '#7a8fbb', '#a3b6d8', '#c8d6eb', '#e6eef8', '#ffffff'], a: [1, 9, 9, 7, 15, 15] },
  rock: { c: ['#1c202c', '#333a4b', '#525a6c', '#788294', '#a2abb9', '#ccd2db'], a: [0, 8, 8, 7, 7, 15], ef: [0, 8, 8, 7, 7, 15] },
  pine: { c: ['#0a1c18', '#123024', '#1c462e', '#2c5f3a', '#467c4e', '#7fa67f'], a: [0, 0, 2, 2, 2, 10] },
  wood: { c: ['#21130d', '#3c2318', '#5a3822', '#7a5230', '#9d7243', '#c4975f'], a: [0, 0, 6, 6, 6, 14] },
  thatch: { c: ['#55431f', '#7f692c', '#ad9445', '#d6c170'], a: [6, 6, 14, 14] },
  earth: { c: ['#281c16', '#423128', '#604d3d', '#826e58', '#a6937a'], a: [0, 6, 6, 6, 7] },
  stone: { c: ['#090a12', '#161927', '#262b3d', '#3a4159', '#545d78', '#768099'], a: [0, 0, 1, 8, 7, 7] },
  stoneW: { c: ['#120906', '#2a160d', '#472816', '#6b4024', '#925d35', '#bb8249'], a: [0, 0, 4, 6, 6, 14] },
  fire: { c: ['#3a0a08', '#8a1c0c', '#d24a10', '#f48a1c', '#fcc84a', '#fff4b8'], a: [4, 4, 12, 12, 14, 15] },
  glow: { c: ['#062a2e', '#0c5458', '#18888a', '#4cc4bc', '#b4f4e4'], a: [0, 3, 3, 11, 15], ef: [0, 3, 3, 11, 15] },
  metal: { c: ['#20232b', '#474d5d', '#7b8495', '#b2bac6', '#edf1f5'], a: [0, 8, 7, 7, 15], ef: [0, 8, 7, 7, 15] },
  skin: { c: ['#7a4a3a', '#b87858', '#e0a480', '#f6cfae'], ef: [6, 6, 12, 12] },
  blond: { c: ['#7a5a1e', '#b88f34', '#e6c35e'], ef: [6, 14, 14] },
  brown: { c: ['#2a1810', '#4a2c1a', '#6e4526'], ef: [0, 6, 6] },
  red: { c: ['#4a0f14', '#7c1b1f', '#b02c2a', '#d85a44'], ef: [4, 4, 4, 12] },
  blue: { c: ['#14224c', '#24397a', '#3c59a8', '#6c8ad0'], ef: [1, 1, 1, 9] },
  green: { c: ['#122a14', '#1f4a22', '#37702f', '#5f9a48'], ef: [2, 2, 2, 10] },
  leather: { c: ['#1e120c', '#3a2416', '#5c3c22', '#80582f'], ef: [0, 6, 6, 6] },
  fur: { c: ['#1c1c22', '#3a3a44', '#5c5c68', '#84848e', '#b4b4ba'], ef: [0, 8, 8, 7, 15] },
  cream: { c: ['#8a7e6a', '#c4b8a0', '#efe6d2'], ef: [7, 7, 15] },
  wight: { c: ['#1c2a2c', '#36504e', '#5c7c74', '#8eac9e'], ef: [8, 3, 3, 11] },
} satisfies Record<string, RampSrc>;

export type RampName = keyof typeof SRC;
const NAMES = Object.keys(SRC) as RampName[];

/** Ramp ids by name. */
export const R = {} as Record<RampName, number>;
NAMES.forEach((n, i) => (R[n] = i));

// ---------------------------------------------------------------------------------------------
// Palette C: black, then every ramp colour, then a few interface colours.

export const PAL_C: RGB[] = [[0, 0, 0]];
const rampRGB: RGB[][] = [];
const rampC: number[][] = [];
for (const n of NAMES) {
  const rgb = (SRC[n] as RampSrc).c.map(hex);
  rampRGB.push(rgb);
  rampC.push(rgb.map((c) => PAL_C.push(c) - 1));
}
const C_WHITE = PAL_C.push([255, 255, 255]) - 1;
const C_RED = PAL_C.push([168, 32, 28]) - 1;
const C_GREY = PAL_C.push([176, 176, 176]) - 1;

// ---------------------------------------------------------------------------------------------
// Colour maths for the 16-colour styles.

function dist(a: RGB, b: RGB): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt((2 * dr * dr + 4 * dg * dg + 3 * db * db) / 9) / 255;
}

function nearestEga(c: RGB): number {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < 16; i++) {
    const d = dist(c, EGA[i]);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

const rampEF: number[][] = NAMES.map((n, i) => {
  const src: RampSrc = SRC[n];
  return src.ef ?? rampRGB[i].map(nearestEga);
});
const rampA: number[][] = NAMES.map((n, i) => (SRC[n] as RampSrc).a ?? rampEF[i]);

// ---------------------------------------------------------------------------------------------

export interface Style {
  id: 'A' | 'B' | 'C';
  name: string;
  blurb: string;
  pal: RGB[];
  /** Width of one picture pixel in screen pixels. */
  pw: 1 | 2;
  /** Background colour for a material at a brightness (0..1) and position. */
  scene(ramp: number, shade: number, x: number, y: number): number;
  /** Threshold (0..1) at a position for choosing between two blended materials. */
  blend(x: number, y: number): number;
  /** Sprite colour for a material at one of four tones (0 dark .. 3 light). */
  sprite(ramp: number, tone: number): number;
  ui: { black: number; white: number; red: number; grey: number };
  outline: boolean;
}

const toneIdx = (n: number, t: number): number => Math.round((clamp(t, 0, 3) / 3) * (n - 1));

export const styleA: Style = {
  id: 'A',
  name: 'A. Earliest',
  blurb: '160x168 double-wide pixels, 16 fixed colours, flat fills. Characters are derived automatically at half width, so they are rougher than hand-tuned ones would be.',
  pal: EGA,
  pw: 2,
  scene(r, s) {
    const a = rampA[r];
    return a[Math.round(clamp(s) * (a.length - 1))];
  },
  sprite(r, t) {
    const e = rampEF[r];
    return e[toneIdx(e.length, t)];
  },
  blend: () => 0.5,
  ui: { black: 0, white: 15, red: 4, grey: 7 },
  outline: false,
};

export const styleB: Style = {
  id: 'B',
  name: 'B. Late parser era',
  blurb: '320x200, 16 fixed colours, pattern dithering.',
  pal: EGA,
  pw: 1,
  scene(r, s, x, y) {
    // The same colour bands as style A, but neighbouring bands blend through 2x2 patterns.
    const a = rampA[r];
    const n = a.length;
    if (n === 1) return a[0];
    const p = clamp(s) * (n - 1);
    const i = Math.min(n - 2, Math.floor(p));
    return bayer2(x, y) < Math.round((p - i) * 4) ? a[i + 1] : a[i];
  },
  sprite(r, t) {
    const e = rampEF[r];
    return e[toneIdx(e.length, t)];
  },
  blend: (x, y) => 0.3 + 0.1 * (bayer2(x, y) + 0.5),
  ui: { black: 0, white: 15, red: 4, grey: 7 },
  outline: true,
};

export const styleC: Style = {
  id: 'C',
  name: 'C. Early 256-colour era',
  blurb: `320x200, curated palette of ${PAL_C.length} colours, shaded and softly dithered.`,
  pal: PAL_C,
  pw: 1,
  scene(r, s, x, y) {
    const c = rampC[r];
    const n = c.length;
    if (n === 1) return c[0];
    const p = clamp(s) * (n - 1);
    const i = Math.floor(p);
    if (i >= n - 1) return c[n - 1];
    const f = clamp((p - i - 0.25) * 2);
    return c[i + (f > bayer4(x, y) ? 1 : 0)];
  },
  sprite(r, t) {
    const c = rampC[r];
    return c[toneIdx(c.length, t)];
  },
  blend: (x, y) => 0.3 + 0.4 * bayer4(x, y),
  ui: { black: 0, white: C_WHITE, red: C_RED, grey: C_GREY },
  outline: true,
};

export const STYLES: Style[] = [styleA, styleB, styleC];
