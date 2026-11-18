// Draws the app icons (the same rune as the favicon) as PNG files, for phones' home screens.
//   npx esbuild tools/icon.ts --bundle --platform=node --format=esm --outfile=/tmp/icon.mjs && node /tmp/icon.mjs

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const RECTS = [[7, 2, 2, 12], [9, 4, 2, 2], [11, 6, 2, 2], [9, 8, 2, 2], [5, 9, 2, 2], [3, 11, 2, 2]];
const BG = [0x16, 0x19, 0x27];
const FG = [0x4c, 0xc4, 0xbc];

const table = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  out.set([...type].map((ch) => ch.charCodeAt(0)), 4);
  out.set(data, 8);
  let c = 0xffffffff;
  for (const b of out.subarray(4, 8 + data.length)) c = table[(c ^ b) & 255] ^ (c >>> 8);
  dv.setUint32(8 + data.length, (c ^ 0xffffffff) >>> 0);
  return out;
}

function icon(size: number): Uint8Array {
  // The rune keeps a margin, so a phone can round the corners without cutting it.
  const cell = Math.floor((size * 0.8) / 16);
  const off = Math.floor((size - cell * 16) / 2);
  const raw = new Uint8Array(size * (size * 3 + 1));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - off) / cell);
      const gy = Math.floor((y - off) / cell);
      const on = x >= off && y >= off && RECTS.some(([rx, ry, rw, rh]) => gx >= rx && gx < rx + rw && gy >= ry && gy < ry + rh);
      raw.set(on ? FG : BG, y * (size * 3 + 1) + 1 + x * 3);
    }
  const head = new Uint8Array(13);
  const dv = new DataView(head.buffer);
  dv.setUint32(0, size);
  dv.setUint32(4, size);
  head.set([8, 2, 0, 0, 0], 8);
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) (out.set(p, at), (at += p.length));
  return out;
}

for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]] as const) {
  writeFileSync(`public/${name}`, icon(size));
  console.log(`public/${name}`);
}
