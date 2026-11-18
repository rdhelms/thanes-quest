// Materials ("ramps") and how a material + brightness becomes a palette colour.
// Scenes and sprites are authored in ramps, never raw colours, so the palette stays small and
// everything on screen shares one look.

import { bayer4, clamp } from './noise';

export type RGB = readonly [number, number, number];

const hex = (s: string): RGB => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

/** Each ramp runs dark to light. */
const RAMPS = {
  ink: ['#0b0d16'],
  sky: ['#35579f', '#4a74b9', '#6893cf', '#8fb4e2', '#b9d3ee', '#e0ecf7'],
  snow: ['#4f6494', '#7a8fbb', '#a3b6d8', '#c8d6eb', '#e6eef8', '#ffffff'],
  rock: ['#1c202c', '#333a4b', '#525a6c', '#788294', '#a2abb9', '#ccd2db'],
  pine: ['#0a1c18', '#123024', '#1c462e', '#2c5f3a', '#467c4e', '#7fa67f'],
  wood: ['#21130d', '#3c2318', '#5a3822', '#7a5230', '#9d7243', '#c4975f'],
  thatch: ['#55431f', '#7f692c', '#ad9445', '#d6c170'],
  earth: ['#281c16', '#423128', '#604d3d', '#826e58', '#a6937a'],
  stone: ['#090a12', '#161927', '#262b3d', '#3a4159', '#545d78', '#768099'],
  stoneW: ['#120906', '#2a160d', '#472816', '#6b4024', '#925d35', '#bb8249'],
  fire: ['#3a0a08', '#8a1c0c', '#d24a10', '#f48a1c', '#fcc84a', '#fff4b8'],
  glow: ['#062a2e', '#0c5458', '#18888a', '#4cc4bc', '#b4f4e4'],
  metal: ['#20232b', '#474d5d', '#7b8495', '#b2bac6', '#edf1f5'],
  ice: ['#3f6f96', '#6a9dc0', '#9cc7e0', '#c9e6f2', '#eefaff'],
  water: ['#0e1f3c', '#173459', '#22507c', '#3672a0', '#5d9cc4'],
  skin: ['#7a4a3a', '#b87858', '#e0a480', '#f6cfae'],
  blond: ['#7a5a1e', '#b88f34', '#e6c35e'],
  brown: ['#2a1810', '#4a2c1a', '#6e4526'],
  white: ['#8c93a4', '#c2c8d4', '#f2f4f8'],
  red: ['#4a0f14', '#7c1b1f', '#b02c2a', '#d85a44'],
  blue: ['#14224c', '#24397a', '#3c59a8', '#6c8ad0'],
  green: ['#122a14', '#1f4a22', '#37702f', '#5f9a48'],
  purple: ['#2a1238', '#4a2262', '#70389a', '#9c64c8'],
  gold: ['#6a4a10', '#a87a1c', '#dcae34', '#fbe27a'],
  grey: ['#2c2e36', '#50545e', '#7c808a', '#aeb2ba'],
  leather: ['#1e120c', '#3a2416', '#5c3c22', '#80582f'],
  fur: ['#1c1c22', '#3a3a44', '#5c5c68', '#84848e', '#b4b4ba'],
  cream: ['#8a7e6a', '#c4b8a0', '#efe6d2'],
  wight: ['#1c2a2c', '#36504e', '#5c7c74', '#8eac9e'],
  star: ['#aab4d8', '#fff6d6'],
} as const;

export type RampName = keyof typeof RAMPS;
export const RAMP_NAMES = Object.keys(RAMPS) as RampName[];

/** Ramp ids by name. */
export const R = {} as Record<RampName, number>;
RAMP_NAMES.forEach((n, i) => (R[n] = i));

export const isRamp = (name: string): name is RampName => name in RAMPS;

export const PALETTE: RGB[] = [[0, 0, 0]];
const rampIdx: number[][] = RAMP_NAMES.map((n) => RAMPS[n].map((c) => PALETTE.push(hex(c)) - 1));

/** Colours that give their own light (flame, rune-glow): night does not dim them. */
export const GLOWING = new Set<number>([...rampIdx[R.fire], ...rampIdx[R.glow], ...rampIdx[R.star]]);

/** Interface colours. */
export const UI = {
  black: 0,
  white: PALETTE.push([255, 255, 255]) - 1,
  red: PALETTE.push([168, 32, 28]) - 1,
  grey: PALETTE.push([176, 176, 176]) - 1,
  dim: PALETTE.push([96, 96, 104]) - 1,
  health: PALETTE.push([196, 44, 40]) - 1,
  mana: PALETTE.push([52, 96, 200]) - 1,
  stamina: PALETTE.push([56, 150, 70]) - 1,
  gold: PALETTE.push([220, 174, 52]) - 1,
};

/** Background colour for a material at a brightness (0..1): neighbouring steps blend by ordered dither. */
export function sceneColour(ramp: number, shade: number, x: number, y: number): number {
  const c = rampIdx[ramp];
  const n = c.length;
  if (n === 1) return c[0];
  const p = clamp(shade) * (n - 1);
  const i = Math.floor(p);
  if (i >= n - 1) return c[n - 1];
  const f = clamp((p - i - 0.25) * 2);
  return c[i + (f > bayer4(x, y) ? 1 : 0)];
}

/** Sprite colour for a material at one of four tones (0 dark .. 3 light). */
export function spriteColour(ramp: number, tone: number): number {
  const c = rampIdx[ramp];
  return c[Math.round((clamp(tone, 0, 3) / 3) * (c.length - 1))];
}

/** Threshold for choosing between two blended materials at a position. */
export const blendThreshold = (x: number, y: number): number => 0.3 + 0.4 * bayer4(x, y);
