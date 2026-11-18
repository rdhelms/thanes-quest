// Small pictures for things lying about a room. Each is a grid of material codes; the last row
// rests on the thing's position.

import { R } from './palette';

/** Code letter to [ramp, tone]. Lower case is the darker tone, upper case the lighter. */
const KEY: Record<string, [number, number]> = {
  k: [R.ink, 0],
  m: [R.metal, 1], M: [R.metal, 3],
  w: [R.wood, 1], W: [R.wood, 2],
  l: [R.leather, 1], L: [R.leather, 3],
  r: [R.red, 1], R: [R.red, 2],
  b: [R.blue, 1], B: [R.blue, 3],
  g: [R.gold, 1], G: [R.gold, 3],
  c: [R.cream, 1], C: [R.cream, 2],
  p: [R.purple, 1], P: [R.purple, 3],
  f: [R.fire, 2], F: [R.fire, 3],
  n: [R.glow, 2], N: [R.glow, 3],
  s: [R.rock, 1], S: [R.rock, 3],
  e: [R.green, 1], E: [R.green, 3],
  h: [R.white, 1], H: [R.white, 2],
};

const ART: Record<string, string[]> = {
  hatchet: [
    '.kkk.....',
    'kmMMk....',
    'kmMMwk...',
    '.kkkWwk..',
    '....kWwk.',
    '.....kWwk',
    '......kWk',
    '.......k.',
  ],
  sword: [
    '.....kk',
    '....kMk',
    '...kMmk',
    '..kMmk.',
    '.kMmk..',
    'kgMk...',
    'klgk...',
    '.kk....',
  ],
  bow: [
    '..kwwk.',
    '.kw..c.',
    'kw...c.',
    'kw...c.',
    'kw...c.',
    '.kw..c.',
    '..kwwk.',
  ],
  shield: [
    '.kkkkkk.',
    'kRRccRRk',
    'kRRccRRk',
    'kccMMcck',
    'kRRccRRk',
    '.kRccRk.',
    '..kkkk..',
  ],
  tome: [
    '.kkkkkkk.',
    'krRRRRRrk',
    'krRgGgRrk',
    'krRRRRRrk',
    'kcCCCCCck',
    '.kkkkkkk.',
  ],
  scroll: [
    '.kkkkkk.',
    'kcCCCCck',
    'kCkkkkCk',
    'kcCCCCck',
    '.kkkkkk.',
  ],
  potion: [
    '..kk..',
    '.kwwk.',
    '.kcck.',
    'kcRRck',
    'kRRRRk',
    'kRRrrk',
    '.kkkk.',
  ],
  flask: [
    '..kk..',
    '.kwwk.',
    '.kcck.',
    'kcBBck',
    'kBBBBk',
    'kBBbbk',
    '.kkkk.',
  ],
  key: [
    '.kkk......',
    'kgGgkkkkkk',
    'kGkGgggggk',
    'kgGgkkgkgk',
    '.kkk..k.k.',
  ],
  torch: [
    '..f..',
    '.fFf.',
    '.fFf.',
    '.kwk.',
    '.kWk.',
    '.kwk.',
    '.kwk.',
    '..k..',
  ],
  sack: [
    '..kwwk..',
    '.klLLlk.',
    'klLLLLlk',
    'klLLLllk',
    'kllllllk',
    '.kkkkkk.',
  ],
  chest: [
    '.kkkkkkkkkk.',
    'kwWWWWWWWWwk',
    'kmmmmMMmmmmk',
    'kwWWWgGWWWwk',
    'kwWWWWWWWWwk',
    'kwwwwwwwwwwk',
    '.kkkkkkkkkk.',
  ],
  skull: [
    '.kkkk.',
    'kHHHHk',
    'kHkHkk',
    'khHHhk',
    '.khhk.',
    '..kk..',
  ],
  bones: [
    'kk....kk.',
    'kHkkkkHk.',
    '.khHHhk..',
    'kHkkkkHk.',
    'kk....kk.',
  ],
  coins: [
    '...kk....',
    '..kGGkkk.',
    '.kkgGkGGk',
    'kGGkkkgGk',
    'kgGk.kkk.',
    '.kk......',
  ],
  herb: [
    '.kE.Ek.',
    'kEekeEk',
    '.keEek.',
    '..kek..',
    '..kek..',
  ],
  amulet: [
    '.kkkkk.',
    'kg...gk',
    'kg...gk',
    '.kg.gk.',
    '..kNk..',
    '.kNNNk.',
    '..kkk..',
  ],
  pelt: [
    'kk.....kk',
    'kHkkkkkHk',
    '.khHHHhk.',
    '.khHHHhk.',
    'kHkkkkkHk',
    'kk.....kk',
  ],
};

export interface Icon {
  w: number;
  h: number;
  /** Row-major [ramp, tone] pairs, or null where transparent. */
  px: ([number, number] | null)[];
}

export const ICONS: Record<string, Icon> = Object.fromEntries(
  Object.entries(ART).map(([name, rows]) => {
    const w = Math.max(...rows.map((r) => r.length));
    return [name, { w, h: rows.length, px: rows.flatMap((r) => [...r.padEnd(w, '.')].map((ch) => KEY[ch] ?? null)) }];
  }),
);
