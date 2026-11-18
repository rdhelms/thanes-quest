// Browser boot: a canvas, the keyboard, sound and a frame loop. Everything else is headless.

import { GLOWING, PALETTE } from './engine/palette';
import { Renderer, SH, SW } from './engine/render';
import { Shell } from './engine/shell';
import { behaviours } from './game/behaviours';
import { content } from './game/content';
import { Music, measure } from './music';
import { playSound, unlockSound } from './sound';
import { isTouchDevice, setupTouch } from './touch';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
canvas.width = SW;
canvas.height = SH;
const ctx = canvas.getContext('2d')!;
const image = ctx.createImageData(SW, SH);
const rgba = new Uint32Array(image.data.buffer);
const pal32 = new Uint32Array(256);
PALETTE.forEach((c, i) => (pal32[i] = (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]));
// The same palette at eight depths of night: darker and bluer, except for things that glow.
const NIGHTS = 8;
const nightPal = Array.from({ length: NIGHTS + 1 }, (_, k) => {
  const n = k / NIGHTS;
  const pal = new Uint32Array(256);
  PALETTE.forEach((c, i) => {
    const lit = GLOWING.has(i);
    const r = Math.round(c[0] * (lit ? 1 : 1 - 0.6 * n));
    const g = Math.round(c[1] * (lit ? 1 : 1 - 0.48 * n));
    const b = Math.round(c[2] * (lit ? 1 : 1 - 0.2 * n));
    pal[i] = (255 << 24) | (b << 16) | (g << 8) | r;
  });
  return pal;
});
const PIC_TOP = 8;
const PIC_BOTTOM = 176;

const store = {
  get: (k: string): string | null => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string): void => {
    try {
      localStorage.setItem(k, v);
    } catch {
      // Storage may be full or disabled; the game still runs, it just cannot save.
    }
  },
};

const shell = new Shell(content, store, import.meta.env.DEV, behaviours);
shell.showTitle();
const renderer = new Renderer();
const music = new Music(content.music);
/** Sound may only start after a key or tap; this is called from both. */
const wake = (): void => music.attach(unlockSound());

const touch = isTouchDevice();

/** Largest whole-pixel scale that fits the window, leaving room for touch controls if shown. */
function fit(): void {
  const dpr = window.devicePixelRatio || 1;
  const vw = window.innerWidth;
  // On phones the visible height shrinks when the on-screen keyboard opens.
  const vh = window.visualViewport?.height ?? window.innerHeight;
  let w = vw;
  let h = vh;
  if (touch) {
    document.body.style.height = `${vh}px`;
    const landscape = vw > vh;
    // Sideways, the pad and buttons sit either side of the picture; upright, they sit below it.
    if (landscape) w -= 2 * 156;
    h -= (document.getElementById('ui')?.offsetHeight ?? 0) + 24;
    // Upright, the pad is pinned to the foot of the screen and takes no room in the column above it.
    const pads = document.getElementById('pads');
    if (!landscape && pads && getComputedStyle(pads).position === 'fixed') h -= pads.offsetHeight + 30;
  }
  // With a keyboard, snap to whole device pixels for even lettering. On a phone, size matters more:
  // fill the width.
  const exact = Math.min(w / SW, h / SH);
  const scale = touch ? Math.max(0.5, exact) : Math.max(1, Math.floor(exact * dpr)) / dpr;
  canvas.style.width = `${SW * scale}px`;
  canvas.style.height = `${SH * scale}px`;
}
if (touch) setupTouch(shell, renderer, canvas, fit);
window.addEventListener('resize', fit);
fit();

window.addEventListener('keydown', (e) => {
  wake();
  // Typing in the touch command field is handled by the field itself.
  if (e.target instanceof HTMLInputElement) return;
  if (e.metaKey || e.altKey || (e.ctrlKey && e.key !== 'Control')) return;
  // A held arrow key repeats; only the first press counts, so walking can be halted at a door.
  if (e.repeat && (e.key.startsWith('Arrow') || e.key === 'Control' || e.key === 'Shift')) return void e.preventDefault();
  if (shell.keyDown(e.key)) e.preventDefault();
});
window.addEventListener('keyup', (e) => shell.keyUp(e.key));
window.addEventListener('blur', () => shell.release());
window.addEventListener('pointerdown', wake);

let last = performance.now();
function frame(now: number): void {
  shell.advance(now - last);
  last = now;
  for (const id of shell.sounds.splice(0)) playSound(id);
  music.setEnabled(shell.settings.music);
  music.cue(shell.musicCue());
  const fb = renderer.draw(shell);
  // The picture takes on the hour; the status line, typing line and any message box do not.
  const dusk = nightPal[Math.round(renderer.night * NIGHTS)];
  const box = renderer.overlay;
  for (let y = 0, i = 0; y < SH; y++) {
    const inPic = y >= PIC_TOP && y < PIC_BOTTOM && renderer.night > 0;
    for (let x = 0; x < SW; x++, i++) {
      const plain = !inPic || (box && x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h);
      rgba[i] = (plain ? pal32 : dusk)[fb[i]];
    }
  }
  ctx.putImageData(image, 0, 0);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (import.meta.env.DEV) Object.assign(window, { game: { shell, renderer, content, music, measure } });
