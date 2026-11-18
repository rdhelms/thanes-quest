import { R, STYLES, type Style } from './palette';
import { PH, PW, Scene, buildDungeon, buildVillage, flameAt } from './scene';
import { HERO, VILLAGER, WIGHT, human, wolf, type Action, type Facing, type HumanSpec, type Sprite } from './doll';
import { drawText, wrap } from './font';
import { hash2 } from './noise';

const SW = 320;
const SH = 200;
const PIC_Y = 8;

type SceneName = 'village' | 'dungeon';
type Kind = 'hero' | 'villager' | 'wolf' | 'wight';
type Dir = 'down' | 'up' | 'left' | 'right';

interface Actor {
  kind: Kind;
  x: number;
  y: number;
  dir: Dir;
  frame: number;
  act: Action;
  t: number;
  wait: number;
  x0: number;
  x1: number;
  tx: number;
  ty: number;
}

const SPEC: Record<Exclude<Kind, 'wolf'>, HumanSpec> = { hero: HERO, villager: VILLAGER, wight: WIGHT };

const params = new URLSearchParams(location.search);
const only = params.get('only');
let scale = Number(params.get('scale') ?? 2);

const scenes: Record<SceneName, Scene> = { village: buildVillage(), dungeon: buildDungeon() };

const mk = (kind: Kind, x: number, y: number, dir: Dir, x0 = 0, x1 = 0): Actor => ({
  kind, x, y, dir, frame: 0, act: 'idle', t: 0, wait: 0, x0, x1, tx: x, ty: y,
});

const casts: Record<SceneName, Actor[]> = {
  village: [mk('hero', 150, 142, 'down'), mk('villager', 258, 138, 'down', 244, 304), mk('wolf', 200, 104, 'right', 176, 300)],
  dungeon: [mk('hero', 150, 144, 'right'), mk('wight', 236, 122, 'left', 150, 296)],
};

const INTRO: Record<SceneName, string> = {
  village:
    'Hollowmere. A timber hall squats under a hat of snow, smoke leaking from its roof. The pines beyond the well are keeping their own counsel.',
  dungeon:
    'A barrow hall, older than the village above it. Somebody has lit the brazier, which is worrying, because nobody down here should need the light.',
};

const state = {
  scene: (params.get('scene') === 'dungeon' ? 'dungeon' : 'village') as SceneName,
  msg: params.get('msg') === '1' ? (INTRO.village as string | null) : null,
  input: '',
  tick: 0,
  depth: false,
  /** The hero walks a loop by himself until the player takes over. */
  demo: params.get('demo') !== '0',
  /** Milliseconds per simulation tick; 50 is game speed. */
  tickMs: 50,
  keys: new Set<string>(),
};
if (state.msg) state.msg = INTRO[state.scene];

// ---------------------------------------------------------------------------------------------
// Views: one per style

interface View {
  style: Style;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  img: ImageData;
  rgba: Uint32Array;
  scr: Uint8Array;
  pal32: Uint32Array;
  pics: Record<SceneName, Uint8Array>;
  sprites: Map<string, Sprite>;
  sheet: HTMLCanvasElement;
}

/** Colour of one scene pixel in a style. (qx, qy) is the position in that style's own pixel grid. */
function sceneColour(sc: Scene, st: Style, i: number, qx: number, qy: number, dim = 1): number {
  if (sc.mix[i] > st.blend(qx, qy)) return st.scene(sc.ramp2[i], sc.shade2[i] * dim, qx, qy);
  return st.scene(sc.ramp[i], sc.shade[i] * dim, qx, qy);
}

function quantize(sc: Scene, st: Style): Uint8Array {
  if (st.pw === 1) {
    const out = new Uint8Array(PW * PH);
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) out[y * PW + x] = sceneColour(sc, st, y * PW + x, x, y);
    return out;
  }
  const w = PW / 2;
  const out = new Uint8Array(w * PH);
  for (let y = 0; y < PH; y++) for (let cx = 0; cx < w; cx++) out[y * w + cx] = sceneColour(sc, st, y * PW + cx * 2, cx, y);
  // Flat styles should not speckle: fold isolated cells into their neighbours.
  for (let pass = 0; pass < 2; pass++) {
    const src = out.slice();
    for (let y = 1; y < PH - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const c = src[y * w + x];
        const l = src[y * w + x - 1];
        const r = src[y * w + x + 1];
        const u = src[(y - 1) * w + x];
        const d = src[(y + 1) * w + x];
        if (c !== l && c !== r && c !== u && c !== d) out[y * w + x] = l === r ? l : u === d ? u : l;
      }
  }
  return out;
}

function makeView(style: Style): View {
  const canvas = document.createElement('canvas');
  canvas.width = SW;
  canvas.height = SH;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(SW, SH);
  const pal32 = new Uint32Array(256);
  style.pal.forEach((c, i) => (pal32[i] = (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]));
  return {
    style,
    canvas,
    ctx,
    img,
    rgba: new Uint32Array(img.data.buffer),
    scr: new Uint8Array(SW * SH),
    pal32,
    pics: { village: quantize(scenes.village, style), dungeon: quantize(scenes.dungeon, style) },
    sprites: new Map(),
    sheet: document.createElement('canvas'),
  };
}

// ---------------------------------------------------------------------------------------------
// Sprites

function spriteOf(v: View, kind: Kind, facing: Facing, act: Action, frame: number): Sprite {
  const key = `${kind}|${facing}|${act}|${frame}`;
  let sp = v.sprites.get(key);
  if (!sp) {
    const xs = v.style.pw === 2 ? 0.5 : 1;
    sp = kind === 'wolf' ? wolf(frame, xs, v.style.outline) : human(SPEC[kind], facing, frame, act, xs, v.style.outline);
    v.sprites.set(key, sp);
  }
  return sp;
}

function spriteFor(v: View, a: Actor): Sprite {
  const facing: Facing = a.dir === 'left' || a.dir === 'right' ? 'side' : a.dir;
  if (a.kind === 'wolf') return spriteOf(v, 'wolf', 'side', 'walk', a.act === 'idle' ? 1 : a.frame & 3);
  return spriteOf(v, a.kind, facing, a.act, a.act === 'idle' ? 0 : a.frame);
}

/** Draw a sprite with its foot point at (ax, ay) in picture coordinates. */
function drawSprite(buf: Uint8Array, bufW: number, yoff: number, st: Style, sp: Sprite, ax: number, ay: number, flip: boolean, dark: number, sc: Scene | null): void {
  const pw = st.pw;
  const fx = Math.round(ax);
  const fy = Math.round(ay);
  const bx = (pw === 2 ? fx >> 1 : fx) - (flip ? sp.w - 1 - sp.ox : sp.ox);
  const by = fy - sp.oy;
  const bufH = buf.length / bufW;
  for (let j = 0; j < sp.h; j++) {
    const y = by + j;
    if (y + yoff < 0 || y + yoff >= bufH) continue;
    if (sc && (y < 0 || y >= PH)) continue;
    for (let i = 0; i < sp.w; i++) {
      const c = sp.cells[j * sp.w + (flip ? sp.w - 1 - i : i)];
      if (!c) continue;
      const x = (bx + i) * pw;
      if (x < 0 || x + pw > bufW) continue;
      if (sc && sc.pri[y * PW + x] > fy) continue;
      const ramp = (c - 1) >> 2;
      const tone = ((c - 1) & 3) - (ramp === R.glow ? 0 : dark);
      const col = st.sprite(ramp, tone < 0 ? 0 : tone);
      const o = (y + yoff) * bufW + x;
      buf[o] = col;
      if (pw === 2) buf[o + 1] = col;
    }
  }
}

function groundShadow(v: View, sc: Scene, ax: number, ay: number, rx: number): void {
  const pw = v.style.pw;
  const fx = Math.round(ax);
  const fy = Math.round(ay);
  for (let dy = -2; dy <= 1; dy++)
    for (let dx = -rx; dx <= rx; dx += pw) {
      if ((dx / rx) ** 2 + ((dy + 0.5) / 2.2) ** 2 > 1) continue;
      const x = pw === 2 ? (fx + dx) & ~1 : fx + dx;
      const y = fy + dy;
      if (x < 0 || x >= PW || y < 0 || y >= PH) continue;
      const i = y * PW + x;
      if (sc.pri[i] !== 0) continue;
      const col = sceneColour(sc, v.style, i, pw === 2 ? x >> 1 : x, y, 0.66);
      const o = (y + PIC_Y) * SW + x;
      v.scr[o] = col;
      if (pw === 2) v.scr[o + 1] = col;
    }
}

function drawFlame(v: View, sc: Scene, fx: number, fy: number, seed: number): void {
  const pw = v.style.pw;
  for (let up = 0; up <= 15; up++)
    for (let dx = -8; dx <= 8; dx += pw) {
      const s = flameAt(dx, up, state.tick, seed);
      if (s <= 0) continue;
      const x = pw === 2 ? (fx + dx) & ~1 : fx + dx;
      const y = fy - 16 - up;
      if (x < 0 || x >= PW || y < 0 || y >= PH) continue;
      const col = v.style.scene(R.fire, s, pw === 2 ? x >> 1 : x, y);
      const o = (y + PIC_Y) * SW + x;
      v.scr[o] = col;
      if (pw === 2) v.scr[o + 1] = col;
    }
}

// ---------------------------------------------------------------------------------------------
// Frame

function fill(v: View, x0: number, y0: number, w: number, h: number, c: number): void {
  for (let y = y0; y < y0 + h; y++) v.scr.fill(c, y * SW + x0, y * SW + x0 + w);
}

function drawMessage(v: View, text: string): void {
  const ui = v.style.ui;
  const lines = wrap(text, 30);
  const cols = Math.max(...lines.map((l) => l.length));
  const w = cols * 8 + 20;
  const h = lines.length * 9 + 17;
  const x0 = (SW - w) >> 1;
  const y0 = PIC_Y + ((PH - h) >> 1);
  fill(v, x0, y0, w, h, ui.white);
  fill(v, x0, y0, w, 1, ui.black);
  fill(v, x0, y0 + h - 1, w, 1, ui.black);
  fill(v, x0, y0, 1, h, ui.black);
  fill(v, x0 + w - 1, y0, 1, h, ui.black);
  fill(v, x0 + 3, y0 + 3, w - 6, 2, ui.red);
  fill(v, x0 + 3, y0 + h - 5, w - 6, 2, ui.red);
  fill(v, x0 + 3, y0 + 3, 2, h - 6, ui.red);
  fill(v, x0 + w - 5, y0 + 3, 2, h - 6, ui.red);
  lines.forEach((l, i) => drawText(v.scr, SW, x0 + 10, y0 + 9 + i * 9, l, ui.black));
}

function render(v: View): void {
  const sc = scenes[state.scene];
  const pic = v.pics[state.scene];
  const { scr, style } = v;
  const ui = style.ui;

  if (style.pw === 1) scr.set(pic, PIC_Y * SW);
  else
    for (let y = 0; y < PH; y++)
      for (let cx = 0; cx < PW / 2; cx++) {
        const o = (y + PIC_Y) * SW + cx * 2;
        scr[o] = scr[o + 1] = pic[y * (PW / 2) + cx];
      }

  const items: { y: number; draw: () => void }[] = [];
  for (const a of casts[state.scene]) {
    items.push({
      y: a.y,
      draw: () => {
        groundShadow(v, sc, a.x, a.y, a.kind === 'wolf' ? 12 : 7);
        const l = sc.light ? sc.light[Math.min(PH - 1, Math.round(a.y)) * PW + Math.round(a.x)] : 1;
        const dark = l < 0.3 ? 2 : l < 0.7 ? 1 : 0;
        drawSprite(scr, SW, PIC_Y, style, spriteFor(v, a), a.x, a.y, a.dir === 'left', dark, sc);
      },
    });
  }
  sc.flames.forEach((f, k) => items.push({ y: f.y, draw: () => drawFlame(v, sc, f.x, f.y, k) }));
  items.sort((p, q) => p.y - q.y).forEach((it) => it.draw());

  if (state.depth) {
    for (let y = 0; y < PH; y++)
      for (let x = 0; x < PW; x++) {
        const i = y * PW + x;
        const p = sc.pri[i];
        scr[(y + PIC_Y) * SW + x] = sc.ctl[i] ? ui.red : p === 0 ? ui.black : style.scene(R.rock, 0.25 + (0.75 * Math.min(p, PH)) / PH, 0, 0);
      }
  }

  // Interface
  fill(v, 0, 0, SW, 8, ui.white);
  drawText(scr, SW, 8, 0, 'Score: 0 of 200', ui.black);
  drawText(scr, SW, 200, 0, 'H 40 M 20 S 30', ui.black);
  fill(v, 0, PIC_Y + PH, SW, SH - PIC_Y - PH, ui.black);
  const cursor = (state.tick >> 3) & 1 ? '_' : ' ';
  drawText(scr, SW, 0, PIC_Y + PH + 8, '>' + state.input + cursor, ui.grey);
  if (state.msg) drawMessage(v, state.msg);

  const { rgba, pal32 } = v;
  for (let i = 0; i < SW * SH; i++) rgba[i] = pal32[scr[i]];
  v.ctx.putImageData(v.img, 0, 0);
}

const SHEET_W = 320;
const SHEET_H = 112;
const sheetCache = new Map<View, { ctx: CanvasRenderingContext2D; img: ImageData; px: Uint32Array; buf: Uint8Array }>();

/** Every animation looping in place at game speed, so it can be judged without playing. */
function drawSheet(v: View): void {
  let c = sheetCache.get(v);
  if (!c) {
    v.sheet.width = SHEET_W;
    v.sheet.height = SHEET_H;
    const ctx = v.sheet.getContext('2d')!;
    const img = ctx.createImageData(SHEET_W, SHEET_H);
    c = { ctx, img, px: new Uint32Array(img.data.buffer), buf: new Uint8Array(SHEET_W * SHEET_H) };
    sheetCache.set(v, c);
  }
  const st = v.style;
  const { buf } = c;
  const isDark = (x: number, y: number): boolean => y >= 56 && x >= 200;
  for (let y = 0; y < SHEET_H; y++)
    for (let x = 0; x < SHEET_W; x++) {
      const qx = st.pw === 2 ? x >> 1 : x;
      buf[y * SHEET_W + x] = isDark(x, y) ? st.scene(R.stone, 0.42, qx, y) : st.scene(R.snow, 0.84, qx, y);
    }
  const cell = (col: number, row: number, label: string, kind: Kind, facing: Facing, act: Action, frame: number, flip = false): void => {
    const x = col * 40 + 20;
    const y = row * 56 + 46;
    drawSprite(buf, SHEET_W, 0, st, spriteOf(v, kind, facing, act, frame), x, y, flip, 0, null);
    drawText(buf, SHEET_W, x - label.length * 4, y + 2, label, isDark(x, y) ? st.ui.white : st.ui.black);
  };
  const t = state.tick;
  const hero = (t / 3) & 3;
  const woman = (t / 4) & 3;
  const run = (t / 2) & 3;
  const shamble = (t / 5) & 3;
  // A swing is three frames held two ticks each, then a rest before it repeats.
  const phase = t % 22;
  const swinging = phase < 8;
  const sf = Math.min(2, phase >> 1);
  const swing = (col: number, row: number, kind: Kind, facing: Facing): void =>
    cell(col, row, 'hit', kind, facing, swinging ? 'swing' : 'idle', swinging ? sf : 0);

  cell(0, 0, 'down', 'hero', 'down', 'walk', hero);
  cell(1, 0, 'right', 'hero', 'side', 'walk', hero);
  cell(2, 0, 'left', 'hero', 'side', 'walk', hero, true);
  cell(3, 0, 'up', 'hero', 'up', 'walk', hero);
  swing(4, 0, 'hero', 'side');
  swing(5, 0, 'hero', 'down');
  swing(6, 0, 'hero', 'up');
  cell(7, 0, 'idle', 'hero', 'down', 'idle', 0);

  cell(0, 1, 'down', 'villager', 'down', 'walk', woman);
  cell(1, 1, 'right', 'villager', 'side', 'walk', woman);
  cell(2, 1, 'up', 'villager', 'up', 'walk', woman);
  cell(3, 1, 'wolf', 'wolf', 'side', 'walk', run);
  cell(4, 1, 'wolf', 'wolf', 'side', 'walk', run, true);
  cell(5, 1, 'walk', 'wight', 'down', 'walk', shamble);
  cell(6, 1, 'walk', 'wight', 'side', 'walk', shamble, true);
  swing(7, 1, 'wight', 'side');

  for (let i = 0; i < SHEET_W * SHEET_H; i++) c.px[i] = v.pal32[buf[i]];
  c.ctx.putImageData(c.img, 0, 0);
}

// ---------------------------------------------------------------------------------------------
// Simulation (just enough to judge the art in motion)

function tryMove(sc: Scene, a: Actor, dx: number, dy: number): boolean {
  const nx = a.x + dx;
  const ny = a.y + dy;
  if (sc.blocked(nx, ny) || sc.blocked(nx - 4, ny) || sc.blocked(nx + 4, ny)) return false;
  a.x = nx;
  a.y = ny;
  return true;
}

/** Step the hero one tick in a direction. Returns false if nothing moved. */
function walk(sc: Scene, a: Actor, dx: number, dy: number): boolean {
  a.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
  const mx = dx ? tryMove(sc, a, dx * 2, 0) : false;
  const my = dy ? tryMove(sc, a, 0, dy) : false;
  a.act = 'walk';
  if (mx || my) a.t++;
  a.frame = (a.t / 3) & 3;
  return mx || my;
}

function startSwing(a: Actor): void {
  a.act = 'swing';
  a.t = 0;
  a.frame = 0;
}

// A loop through each scene that passes behind and in front of things.
const ROUTES: Record<SceneName, [number, number][]> = {
  village: [[70, 150], [84, 122], [190, 110], [252, 102], [284, 102], [266, 146], [150, 142]],
  dungeon: [[84, 150], [84, 112], [150, 110], [232, 112], [280, 146], [176, 160], [150, 144]],
};
const routeAt: Record<SceneName, number> = { village: 0, dungeon: 0 };

function demoStep(sc: Scene, a: Actor): void {
  const route = ROUTES[state.scene];
  const i = routeAt[state.scene];
  const [tx, ty] = route[i];
  const dx = Math.abs(tx - a.x) >= 2 ? Math.sign(tx - a.x) : 0;
  const dy = Math.abs(ty - a.y) >= 1 ? Math.sign(ty - a.y) : 0;
  if ((dx || dy) && walk(sc, a, dx, dy)) return;
  routeAt[state.scene] = (i + 1) % route.length;
  if (i % 2 === 1) {
    a.dir = i % 4 === 1 ? 'right' : 'left';
    startSwing(a);
  }
}

function tick(): void {
  state.tick++;
  const sc = scenes[state.scene];
  if (state.msg) return;
  for (const a of casts[state.scene]) {
    if (a.kind === 'hero') {
      if (a.act === 'swing') {
        a.t++;
        a.frame = Math.min(2, a.t >> 1);
        if (a.t >= 8) a.act = 'idle';
        continue;
      }
      if (state.demo) {
        demoStep(sc, a);
        continue;
      }
      const k = state.keys;
      const dx = (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0);
      const dy = (k.has('ArrowDown') ? 1 : 0) - (k.has('ArrowUp') ? 1 : 0);
      if (dx || dy) walk(sc, a, dx, dy);
      else a.act = 'idle';
    } else if (a.kind === 'villager') {
      if (a.wait > 0) {
        a.wait--;
        a.act = 'idle';
        continue;
      }
      const dx = a.tx - a.x;
      const dy = a.ty - a.y;
      if (Math.abs(dx) < 1.5 && Math.abs(dy) < 1) {
        a.wait = 40 + Math.floor(hash2(state.tick, 1, 3) * 80);
        a.tx = a.x0 + hash2(state.tick, 2, 3) * (a.x1 - a.x0);
        a.ty = 134 + hash2(state.tick, 3, 3) * 18;
        a.dir = 'down';
        continue;
      }
      a.act = 'walk';
      a.dir = Math.abs(dx) >= 1.5 ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      const ok = Math.abs(dx) >= 1.5 ? tryMove(sc, a, Math.sign(dx), 0) : tryMove(sc, a, 0, Math.sign(dy) * 0.5);
      if (!ok) a.tx = a.x, (a.ty = a.y);
      a.t++;
      a.frame = (a.t / 4) & 3;
    } else {
      const speed = a.kind === 'wolf' ? 2.4 : 0.7;
      if (a.wait > 0) {
        a.wait--;
        a.act = 'idle';
        if (a.wait === 0) a.dir = a.dir === 'left' ? 'right' : 'left';
        continue;
      }
      a.act = 'walk';
      a.x += a.dir === 'right' ? speed : -speed;
      a.t++;
      a.frame = (a.t / (a.kind === 'wolf' ? 2 : 5)) & 3;
      if (a.x > a.x1 || a.x < a.x0) {
        a.x = Math.max(a.x0, Math.min(a.x1, a.x));
        a.wait = a.kind === 'wolf' ? 30 : 20;
      }
    }
  }
}

const FALLBACK = [
  'That accomplishes nothing, though you do it with great conviction.',
  'The parser regards you the way the pines do: patiently, and without help.',
  'Not here. Possibly not anywhere.',
];
let fallbackAt = 0;

function respond(raw: string): void {
  const c = raw.trim().toLowerCase();
  if (!c) return;
  const has = (...w: string[]): boolean => w.some((x) => c.includes(x));
  if (has('barrow', 'dungeon')) setScene('dungeon');
  else if (has('village', 'hollowmere')) setScene('village');
  else if (has('help')) state.msg = 'Arrow keys walk. Ctrl swings. Type "look", "look well", "look hall", "look wolf", "barrow" or "village".';
  else if (has('well')) state.msg = 'A stone well with a little roof of its own. The rope is frozen stiff. So, presumably, is the bucket.';
  else if (has('hall', 'house', 'door')) state.msg = "The Elder's hall. The door is shut, and has the air of a door that prefers it that way.";
  else if (has('wolf')) state.msg = 'It paces the tree line and watches you with professional interest.';
  else if (has('wight', 'dead')) state.msg = 'It has been dead a long time and has not let that slow it down.';
  else if (has('fire', 'brazier')) state.msg = 'Warm. Suspiciously well tended.';
  else if (c === 'look' || c === 'l' || has('look around')) state.msg = INTRO[state.scene];
  else state.msg = FALLBACK[fallbackAt++ % FALLBACK.length];
}

// ---------------------------------------------------------------------------------------------
// Page

const views = STYLES.filter((s) => !only || only.includes(s.id)).map(makeView);
const grid = document.getElementById('grid')!;
const bar = document.getElementById('bar')!;

function applyScale(): void {
  for (const v of views) {
    // Height follows from the aspect ratio, so a narrow window can shrink the canvas to fit.
    v.canvas.style.width = `${SW * scale}px`;
    v.sheet.style.width = `${v.sheet.width * scale}px`;
  }
}

function setScene(name: SceneName): void {
  state.scene = name;
  state.msg = null;
  refreshButtons();
}

const buttons: { el: HTMLButtonElement; on: () => boolean }[] = [];
function button(label: string, click: () => void, on: () => boolean): void {
  const el = document.createElement('button');
  el.textContent = label;
  el.onclick = () => {
    click();
    refreshButtons();
    el.blur();
  };
  bar.appendChild(el);
  buttons.push({ el, on });
}
function refreshButtons(): void {
  for (const b of buttons) b.el.classList.toggle('on', b.on());
}
function label(text: string): void {
  const el = document.createElement('span');
  el.textContent = text;
  bar.appendChild(el);
}

label('Scene');
button('Village', () => setScene('village'), () => state.scene === 'village');
button('Barrow hall', () => setScene('dungeon'), () => state.scene === 'dungeon');
label('Size');
for (const s of [1, 2, 3])
  button(`${s}x`, () => {
    scale = s;
    applyScale();
  }, () => scale === s);
label('Speed');
for (const [name, ms] of [['1x', 50], ['1/2', 100], ['1/4', 200]] as [string, number][])
  button(name, () => (state.tickMs = ms), () => state.tickMs === ms);
label('Hero');
button('Auto-walk', () => (state.demo = !state.demo), () => state.demo);
label('Debug');
button('Depth and collision', () => (state.depth = !state.depth), () => state.depth);

for (const v of views) {
  const card = document.createElement('div');
  card.className = 'card';
  const h = document.createElement('h2');
  h.textContent = v.style.name;
  const p = document.createElement('p');
  p.textContent = v.style.blurb;
  drawSheet(v);
  card.append(h, p, v.canvas, v.sheet);
  grid.appendChild(card);
}
applyScale();
refreshButtons();

window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.altKey) return;
  if (e.key.startsWith('Arrow') || e.key === 'Control') {
    // Taking the controls ends the auto-walk.
    if (state.demo) {
      state.demo = false;
      refreshButtons();
    }
  }
  if (e.key.startsWith('Arrow')) {
    state.keys.add(e.key);
    e.preventDefault();
    return;
  }
  if (e.key === 'Control') {
    const hero = casts[state.scene][0];
    if (!state.msg && hero.act !== 'swing') startSwing(hero);
    return;
  }
  if (e.ctrlKey) return;
  if (state.msg) {
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
      state.msg = null;
      e.preventDefault();
    }
    return;
  }
  if (e.key === 'Enter') {
    const cmd = state.input;
    state.input = '';
    respond(cmd);
  } else if (e.key === 'Backspace') {
    state.input = state.input.slice(0, -1);
    e.preventDefault();
  } else if (e.key.length === 1 && state.input.length < 37) {
    state.input += e.key;
    if (e.key === ' ') e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => state.keys.delete(e.key));
window.addEventListener('blur', () => state.keys.clear());

let last = performance.now();
let acc = 0;
function frame(now: number): void {
  acc += Math.min(250, now - last);
  last = now;
  while (acc >= state.tickMs) {
    tick();
    acc -= state.tickMs;
  }
  for (const v of views) {
    render(v);
    drawSheet(v);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Handy when poking at the test from the console.
Object.assign(window, { art: { state, casts, scenes, setScene, views } });
