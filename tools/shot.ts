// QA tool: draws game screens to PNG files without a browser.
//
//   npm run shot -- out.png sheet village inn hall          a contact sheet of rooms
//   npm run shot -- out.png sheet wild_2_1 wild_3_1 --night  the same after dark
//   npm run shot -- out.png room camp 200 150 --cmd "look" --ticks 40
//
// Options: --night, --ticks N (run the game N ticks first), --cmd "line" (type a line; repeatable),
// --flag name=value, --give item, --scale N, --keep (leave message boxes open).

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { GLOWING, PALETTE } from '../src/engine/palette';
import { Renderer, SH, SW } from '../src/engine/render';
import { Shell } from '../src/engine/shell';
import { DAY_LENGTH } from '../src/engine/sim';
import { behaviours } from '../src/game/behaviours';
import { content } from '../src/game/content';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  out.set([...type].map((ch) => ch.charCodeAt(0)), 4);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc(out.subarray(4, 8 + data.length)));
  return out;
}
export function png(w: number, h: number, rgb: Uint8Array): Uint8Array {
  const raw = new Uint8Array(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1);
  const head = new Uint8Array(13);
  const dv = new DataView(head.buffer);
  dv.setUint32(0, w);
  dv.setUint32(4, h);
  head.set([8, 2, 0, 0, 0], 8);
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) (out.set(p, at), (at += p.length));
  return out;
}

/** One frame as RGB, with the night tint the browser applies. */
export function frame(shell: Shell, renderer: Renderer): Uint8Array {
  const fb = renderer.draw(shell);
  const n = renderer.night;
  const box = renderer.overlay;
  const rgb = new Uint8Array(SW * SH * 3);
  for (let y = 0, i = 0; y < SH; y++)
    for (let x = 0; x < SW; x++, i++) {
      const c = PALETTE[fb[i]];
      const plain = !(y >= 8 && y < 176 && n > 0) || (box && x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h) || GLOWING.has(fb[i]);
      rgb[i * 3] = Math.round(c[0] * (plain ? 1 : 1 - 0.6 * n));
      rgb[i * 3 + 1] = Math.round(c[1] * (plain ? 1 : 1 - 0.48 * n));
      rgb[i * 3 + 2] = Math.round(c[2] * (plain ? 1 : 1 - 0.2 * n));
    }
  return rgb;
}

function memory(): { get(k: string): string | null; set(k: string, v: string): void } {
  const m = new Map<string, string>();
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v) };
}

interface Opts { live: boolean; hurt: number; tick: number; night: boolean; ticks: number; cmds: string[]; flags: [string, string][]; gives: string[]; spawns: string[]; scale: number; keep: boolean }

export function setup(room: string, x: number | undefined, y: number | undefined, o: Opts): Shell {
  const shell = new Shell(content, memory(), true, behaviours);
  shell.modals = [];
  const sim = shell.sim;
  for (const [k, v] of o.flags) sim.state.flags[k] = v === 'true' ? true : isNaN(Number(v)) ? v : Number(v);
  for (const g of o.gives) sim.give(g);
  if (o.night) sim.state.tick = Math.round(DAY_LENGTH * 0.7);
  if (o.tick) sim.state.tick = o.tick;
  sim.enterRoom(room, x ?? 160, y ?? Math.round((sim.scene(room).walkTop + 168) / 2));
  shell.tick();
  shell.modals = [];
  // Extra creatures, lined up to the right of the player and held still for their portrait.
  o.spawns.forEach((kind, i) => {
    sim.spawn(kind, sim.p.x + 40 + i * 44, sim.p.y);
    const a = sim.rs.actors[sim.rs.actors.length - 1];
    if (!o.live) a.ai.frozen = 1e6;
    a.dir = 'left';
    a.ai.max = a.hp;
    a.hp -= o.hurt;
  });
  for (const c of o.cmds) {
    // "key:Enter" presses a key instead of typing a line.
    if (c.startsWith('key:')) shell.keyDown(c.slice(4));
    // "point:200,150" points at the picture, as a click or a tap would.
    else if (c.startsWith('point:')) shell.walkTo(...(c.slice(6).split(',').map(Number) as [number, number]));
    else shell.submit(c);
    shell.tick();
    if (!o.keep) shell.modals = [];
  }
  for (let i = 0; i < o.ticks; i++) {
    shell.tick();
    if (!o.keep) shell.modals = [];
  }
  shell.noteUntil = 0;
  return shell;
}

function main(): void {
  const args = process.argv.slice(2);
  const o: Opts = { live: false, hurt: 0, tick: 0, night: false, ticks: 0, cmds: [], flags: [], gives: [], spawns: [], scale: 2, keep: false };
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--night') o.night = true;
    else if (a === '--live') o.live = true;
    else if (a === '--hurt') o.hurt = Number(args[++i]);
    else if (a === '--keep') o.keep = true;
    else if (a === '--ticks') o.ticks = Number(args[++i]);
    else if (a === '--tick') o.tick = Number(args[++i]);
    else if (a === '--scale') o.scale = Number(args[++i]);
    else if (a === '--cmd') o.cmds.push(args[++i]);
    else if (a === '--give') o.gives.push(args[++i]);
    else if (a === '--spawn') o.spawns.push(args[++i]);
    else if (a === '--flag') o.flags.push(args[++i].split('=') as [string, string]);
    else rest.push(a);
  }
  const [out, mode, ...names] = rest;
  const renderer = new Renderer();
  const shots: Uint8Array[] = [];
  if (mode === 'room') shots.push(frame(setup(names[0], names[1] ? Number(names[1]) : undefined, names[2] ? Number(names[2]) : undefined, o), renderer));
  else for (const n of names) shots.push(frame(setup(n, undefined, undefined, o), renderer));
  const s = mode === 'room' ? o.scale : 1;
  const cols = mode === 'room' ? 1 : Math.min(4, shots.length);
  const rows = Math.ceil(shots.length / cols);
  const W = cols * SW * s;
  const H = rows * SH * s;
  const rgb = new Uint8Array(W * H * 3);
  shots.forEach((shot, k) => {
    const ox = (k % cols) * SW * s;
    const oy = Math.floor(k / cols) * SH * s;
    for (let y = 0; y < SH * s; y++)
      for (let x = 0; x < SW * s; x++) {
        const si = (Math.floor(y / s) * SW + Math.floor(x / s)) * 3;
        const di = ((oy + y) * W + ox + x) * 3;
        rgb[di] = shot[si];
        rgb[di + 1] = shot[si + 1];
        rgb[di + 2] = shot[si + 2];
      }
  });
  writeFileSync(out, png(W, H, rgb));
  console.log(`${out}: ${W}x${H}, ${shots.length} screen(s)`);
}

main();
