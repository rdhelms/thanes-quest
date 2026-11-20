// Draws one frame into a 320x200 indexed framebuffer from the simulation and interface state.
// Pure with respect to the game: it reads state and keeps only caches.

import { charSprite, type Facing, type Sprite } from './doll';
import { drawText, wrap } from './font';
import { chart, depthOf, parseWild } from './frontier';
import { ICONS } from './icons';
import { bayer4, clamp, hash2, mix, vnoise } from './noise';
import { R, UI, blendThreshold, sceneColour, spriteColour } from './palette';
import { all } from './rules';
import { PH, PW, flameAt, type Scene } from './scene';
import type { Shell } from './shell';
import { DAY_LENGTH } from './sim';
import type { Act, CharSpec, Dir } from './types';

export const SW = 320;
export const SH = 200;
const PIC_Y = 8;

const facingOf = (d: Dir): Facing => (d === 'left' || d === 'right' ? 'side' : d);
const beast = (spec: CharSpec): boolean => !!spec.body && spec.body !== 'human';

/** Map symbols, seven cells square. */
const MARKS: Record<string, { rows: string[]; ramp: number; tone: number }> = {
  wood: { rows: ['...X...', '..XXX..', '..XXX..', '.XXXXX.', '.XXXXX.', 'XXXXXXX', '...X...'], ramp: R.pine, tone: 2 },
  open: { rows: ['.......', '.......', '.X.....', '.....X.', '.......', '..X....', '.......'], ramp: R.rock, tone: 2 },
  mere: { rows: ['.......', '..XXX..', '.XXXXX.', 'XXXXXXX', '.XXXXX.', '..XXX..', '.......'], ramp: R.water, tone: 3 },
  water: { rows: ['.......', '.X...X.', 'X.X.X.X', '...X...', '.X...X.', 'X.X.X.X', '...X...'], ramp: R.water, tone: 3 },
  village: { rows: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', '.XXXXX.', '.XX.XX.', '.XX.XX.'], ramp: R.red, tone: 2 },
  farm: { rows: ['.......', '..XXX..', '.XXXXX.', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', '.......'], ramp: R.thatch, tone: 1 },
  camp: { rows: ['...X...', '...X...', '..XXX..', '..X.X..', '.XX.XX.', '.X...X.', 'XX...XX'], ramp: R.leather, tone: 2 },
  tower: { rows: ['.X.X.X.', '.XXXXX.', '..XXX..', '..XXX..', '..XXX..', '..X.X..', '.XX.XX.'], ramp: R.rock, tone: 1 },
  stone: { rows: ['..XX...', '.XXXX..', '.XXXX..', '.XXXX..', '.XXXX..', '.XXXX..', 'XXXXXX.'], ramp: R.rock, tone: 1 },
  crag: { rows: ['.......', '..X....', '.XXX.X.', '.XXXXXX', 'XXXXXXX', 'XXXXXXX', '.......'], ramp: R.rock, tone: 1 },
  dead: { rows: ['X..X..X', '.X.X.X.', '..XXX..', '...X...', '.X.X...', '..XX...', '...X...'], ramp: R.wood, tone: 1 },
  shrine: { rows: ['.......', '.X.X.X.', '.X.X.X.', '.......', 'X.....X', 'X.XXX.X', '.......'], ramp: R.glow, tone: 1 },
  steading: { rows: ['.....X.', '..XX.X.', '.XXXXX.', 'XXXXXXX', '.XXXXX.', '.XX.XX.', '.......'], ramp: R.wood, tone: 2 },
  gate: { rows: ['XXXXXXX', 'XXXXXXX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX'], ramp: R.ice, tone: 0 },
  barrow: { rows: ['.......', '..XXX..', '.XXXXX.', 'XXXXXXX', 'XXX.XXX', 'XXX.XXX', '.......'], ramp: R.glow, tone: 1 },
};

export class Renderer {
  readonly fb = new Uint8Array(SW * SH);
  private pics = new Map<string, Uint8Array>();
  private sprites = new Map<string, Sprite>();
  /** How dark the picture should be shown, 0 (day) to 1 (night). Indoors it is always 0. */
  night = 0;
  /** The message box on screen, if any: it is not dimmed by night. */
  overlay: { x: number; y: number; w: number; h: number } | null = null;
  /** Where the rows of the list on screen are, so a tap can pick one. */
  private listRows: { x: number; y: number; w: number; n: number; pitch: number } | null = null;

  /** Where the map's grid is on screen, so a tap can pick a cell. */
  private mapAt: { x: number; y: number; cw: number; ch: number; cols: number; rows: number } | null = null;

  /** Which cell of the open map a framebuffer point is in, as an offset from the middle; or null. */
  hitMap(x: number, y: number): [number, number] | null {
    const m = this.mapAt;
    if (!m || x < m.x || y < m.y || x >= m.x + m.cols * m.cw || y >= m.y + m.rows * m.ch) return null;
    return [Math.floor((x - m.x) / m.cw) - (m.cols >> 1), Math.floor((y - m.y) / m.ch) - (m.rows >> 1)];
  }

  /** Which row of the open list contains a framebuffer point, or -1. */
  hitList(x: number, y: number): number {
    const r = this.listRows;
    if (!r || x < r.x || x >= r.x + r.w || y < r.y - 6 || y >= r.y + r.n * r.pitch + 6) return -1;
    // A finger is not a pointer: take the nearest row.
    return Math.max(0, Math.min(r.n - 1, Math.floor((y - r.y) / r.pitch)));
  }

  private pic(id: string, sc: Scene): Uint8Array {
    let pic = this.pics.get(id);
    if (!pic) {
      pic = new Uint8Array(PW * PH);
      for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) pic[y * PW + x] = this.ground(sc, y * PW + x, x, y, 1);
      this.pics.set(id, pic);
    }
    return pic;
  }

  private ground(sc: Scene, i: number, x: number, y: number, dim: number): number {
    if (sc.mix[i] > blendThreshold(x, y)) return sceneColour(sc.ramp2[i], sc.shade2[i] * dim, x, y);
    return sceneColour(sc.ramp[i], sc.shade[i] * dim, x, y);
  }

  private sprite(key: string, spec: CharSpec, dir: Dir, act: Act, frame: number): Sprite {
    const facing = facingOf(dir);
    const f = act === 'walk' || act === 'swing' ? frame : act === 'block' ? 1 : 0;
    const k = `${key}|${facing}|${act}|${f}`;
    let sp = this.sprites.get(k);
    if (!sp) this.sprites.set(k, (sp = charSprite(spec, facing, act, f)));
    return sp;
  }

  private fill(x0: number, y0: number, w: number, h: number, c: number): void {
    for (let y = Math.max(0, y0); y < Math.min(SH, y0 + h); y++) this.fb.fill(c, y * SW + Math.max(0, x0), y * SW + Math.min(SW, x0 + w));
  }

  /** Sprite with its foot point at (ax, ay) in picture coordinates, hidden behind nearer props. */
  private drawSprite(sc: Scene, sp: Sprite, ax: number, ay: number, flip: boolean, dark: number, glowOnly: boolean): void {
    const fx = Math.round(ax);
    const fy = Math.round(ay);
    const bx = fx - (flip ? sp.w - 1 - sp.ox : sp.ox);
    const by = fy - sp.oy;
    for (let j = 0; j < sp.h; j++) {
      const y = by + j;
      if (y < 0 || y >= PH) continue;
      for (let i = 0; i < sp.w; i++) {
        const c = sp.cells[j * sp.w + (flip ? sp.w - 1 - i : i)];
        if (!c) continue;
        const x = bx + i;
        if (x < 0 || x >= PW || sc.pri[y * PW + x] > fy) continue;
        const ramp = (c - 1) >> 2;
        if (glowOnly && ramp !== R.glow) continue;
        const tone = ((c - 1) & 3) - (ramp === R.glow ? 0 : dark);
        this.fb[(y + PIC_Y) * SW + x] = spriteColour(ramp, tone < 0 ? 0 : tone);
      }
    }
  }

  private groundShadow(sc: Scene, ax: number, ay: number, rx: number): void {
    const fx = Math.round(ax);
    const fy = Math.round(ay);
    for (let dy = -2; dy <= 1; dy++)
      for (let dx = -rx; dx <= rx; dx++) {
        if ((dx / rx) ** 2 + ((dy + 0.5) / 2.2) ** 2 > 1) continue;
        const x = fx + dx;
        const y = fy + dy;
        if (x < 0 || x >= PW || y < 0 || y >= PH) continue;
        const i = y * PW + x;
        if (sc.pri[i] === 0) this.fb[(y + PIC_Y) * SW + x] = this.ground(sc, i, x, y, 0.66);
      }
  }

  private drawFlame(sc: Scene, f: { x: number; y: number; up: number; size: number }, tick: number, seed: number): void {
    for (let up = 0; up <= 15 * f.size; up++)
      for (let dx = Math.floor(-8 * f.size); dx <= 8 * f.size; dx++) {
        const s = flameAt(dx / f.size, up / f.size, tick, seed);
        if (s <= 0) continue;
        const x = f.x + dx;
        const y = f.y - f.up - up;
        if (x < 0 || x >= PW || y < 0 || y >= PH || sc.pri[y * PW + x] > f.y) continue;
        this.fb[(y + PIC_Y) * SW + x] = sceneColour(R.fire, s, x, y);
      }
  }

  private drawIcon(sc: Scene, icon: { w: number; h: number; px: ([number, number] | null)[] }, ax: number, ay: number, lift: number): void {
    const bx = Math.round(ax) - (icon.w >> 1);
    const by = Math.round(ay) - icon.h - lift;
    for (let j = 0; j < icon.h; j++)
      for (let i = 0; i < icon.w; i++) {
        const c = icon.px[j * icon.w + i];
        const x = bx + i;
        const y = by + j;
        if (!c || x < 0 || x >= PW || y < 0 || y >= PH || sc.pri[y * PW + x] > ay) continue;
        this.fb[(y + PIC_Y) * SW + x] = spriteColour(c[0], c[1]);
      }
  }

  /** Arrows are a dark streak; bolts are a flickering knot of fire or frost. */
  private drawShot(sc: Scene, s: { x: number; y: number; dx: number; dy: number; kind: string }, tick: number): void {
    const cx = Math.round(s.x);
    const cy = Math.round(s.y) - 15;
    const put = (x: number, y: number, c: number): void => {
      if (x >= 0 && x < PW && y >= 0 && y < PH && sc.pri[y * PW + x] <= s.y) this.fb[(y + PIC_Y) * SW + x] = c;
    };
    if (s.kind === 'arrow') {
      const sx = Math.sign(s.dx);
      const sy = Math.sign(s.dy);
      for (let k = 0; k < 7; k++) put(cx - sx * k, cy - sy * k, spriteColour(k === 0 ? R.metal : R.wood, k === 0 ? 3 : 1));
      return;
    }
    const ramp = s.kind === 'frost' ? R.ice : R.fire;
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.hypot(dx, dy * 1.2) + ((dx * 7 + dy * 13 + tick * 5) & 3) * 0.5;
        if (d < 4.2) put(cx + dx, cy + dy, sceneColour(ramp, 1 - d / 5.5, cx + dx, cy + dy));
      }
  }

  private bar(x: number, label: string, v: number, max: number, colour: number): void {
    drawText(this.fb, SW, x, 0, label, UI.black);
    this.fill(x + 9, 1, 28, 6, UI.black);
    this.fill(x + 10, 2, 26, 4, UI.grey);
    this.fill(x + 10, 2, Math.round((26 * Math.max(0, Math.min(max, v))) / max), 4, colour);
  }

  private box(cols: number, rows: number): { x: number; y: number } {
    const w = cols * 8 + 20;
    const h = rows * 9 + 17;
    const x = (SW - w) >> 1;
    const y = PIC_Y + Math.max(0, (PH - h) >> 1);
    this.overlay = { x, y, w, h };
    this.fill(x, y, w, h, UI.white);
    this.fill(x, y, w, 1, UI.black);
    this.fill(x, y + h - 1, w, 1, UI.black);
    this.fill(x, y, 1, h, UI.black);
    this.fill(x + w - 1, y, 1, h, UI.black);
    this.fill(x + 3, y + 3, w - 6, 2, UI.red);
    this.fill(x + 3, y + h - 5, w - 6, 2, UI.red);
    this.fill(x + 3, y + 3, 2, h - 6, UI.red);
    this.fill(x + w - 5, y + 3, 2, h - 6, UI.red);
    return { x: x + 10, y: y + 9 };
  }

  private drawModal(shell: Shell): void {
    const m = shell.modal;
    this.listRows = null;
    this.mapAt = null;
    this.overlay = null;
    if (!m) return;
    const { fb } = this;
    if (m.k === 'msg') {
      // Speech carries the speaker's name above it.
      const head = m.who ? [m.who, ''] : [];
      const lines = [...head, ...wrap(m.text, 32)];
      const cols = Math.max(...lines.map((l) => l.length), m.more ? 32 : 0);
      const o = this.box(cols, lines.length + (m.more ? 1 : 0));
      lines.forEach((l, i) => drawText(fb, SW, o.x, o.y + i * 9, l, m.who && i === 0 ? UI.red : UI.black));
      if (m.who) this.fill(o.x, o.y + 10, m.who.length * 8, 1, UI.red);
      // A long message continues in the next box.
      if (m.more) drawText(fb, SW, o.x + (cols - 6) * 8, o.y + lines.length * 9, '(more)', UI.red);
    } else if (m.k === 'map') {
      this.drawMap(shell, m.dx, m.dy);
    } else if (m.k === 'page') {
      const body = m.lines.flatMap((l) => (l ? wrap(l, 34) : ['']));
      const lines = [m.title, '', ...body].slice(0, 15);
      const o = this.box(34, lines.length + (m.more ? 1 : 0));
      lines.forEach((l, i) => drawText(fb, SW, o.x, o.y + i * 9, l, i === 0 ? UI.red : UI.black));
      if (m.more) drawText(fb, SW, o.x + 28 * 8, o.y + lines.length * 9, '(more)', UI.red);
    } else {
      if (m.banner) {
        // The game's name, large, with a drop shadow.
        const bx = (SW - m.banner.length * 16) >> 1;
        drawText(fb, SW, bx + 2, 26, m.banner, UI.black, -1, 2);
        drawText(fb, SW, bx, 24, m.banner, UI.gold, -1, 2);
      }
      const title = wrap(m.title, 32);
      const cols = Math.min(37, Math.max(...title.map((l) => l.length), ...m.items.map((l) => l.length + 2)));
      // On touch screens the rows are spaced out, as far as the box allows.
      const pitch = shell.roomy ? Math.max(9, Math.min(14, Math.floor((150 - (title.length + 1) * 9) / m.items.length))) : 9;
      const o = this.box(cols, title.length + 1 + Math.ceil((m.items.length * pitch) / 9));
      title.forEach((l, i) => drawText(fb, SW, o.x, o.y + i * 9, l, UI.black));
      const top = o.y + (title.length + 1) * 9 + ((pitch - 9) >> 1);
      this.listRows = { x: o.x - 2, y: top - 1 - ((pitch - 9) >> 1), w: cols * 8 + 4, n: m.items.length, pitch };
      m.items.forEach((it, i) => {
        const y = top + i * pitch;
        const on = i === m.sel;
        if (on) this.fill(o.x - 2, y - 1 - ((pitch - 9) >> 1), cols * 8 + 4, pitch, UI.black);
        drawText(fb, SW, o.x, y, (on ? '> ' : '  ') + it.slice(0, 35), on ? UI.white : UI.black);
      });
    }
  }

  /** The map: every place walked so far, with the country it is known to lead to marked "?". */
  private drawMap(shell: Shell, curX: number, curY: number): void {
    const { fb } = this;
    const sim = shell.sim;
    const cells = chart(sim.content, sim.state.flags, sim.state.room);
    const here = cells.find((c) => c.here);
    const CW = 16;
    const CH = 12;
    const COLS = 17;
    const ROWS = 9;
    const o = this.box(34, 15);
    drawText(fb, SW, o.x, o.y, 'The country so far', UI.red);
    const top = o.y + 13;
    this.fill(o.x, top, COLS * CW, ROWS * CH, spriteColour(R.stone, 1));
    const cx = here?.x ?? 0;
    const cy = here?.y ?? 0;
    for (const c of cells) {
      const col = c.x - cx + (COLS >> 1);
      const row = c.y - cy + (ROWS >> 1);
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) continue;
      const x = o.x + col * CW;
      const y = top + row * CH;
      // Somewhere you have been sent: a gold frame, whether or not you have found it yet.
      if (c.goal) this.fill(x, y, CW, CH, UI.gold);
      if (!c.mark) {
        this.fill(x + 1, y + 1, CW - 2, CH - 2, spriteColour(R.stone, 2));
        drawText(fb, SW, x + 5, y + 2, c.goal ? '!' : '?', c.goal ? UI.gold : spriteColour(R.rock, 2));
        continue;
      }
      this.fill(x + 1, y + 1, CW - 2, CH - 2, spriteColour(R.snow, c.mark === 'mere' || c.mark === 'water' ? 2 : 3));
      const g = MARKS[c.mark] ?? MARKS.open;
      const ink = spriteColour(g.ramp, g.tone);
      g.rows.forEach((line, j) => {
        for (let i = 0; i < 7; i++) if (line[i] === 'X') fb[(y + 3 + j) * SW + x + 5 + i] = ink;
      });
      // Where you are: a frame that blinks.
      if (c.here && (shell.uiTick >> 3) & 1) {
        this.fill(x, y, CW, 1, UI.red);
        this.fill(x, y + CH - 1, CW, 1, UI.red);
        this.fill(x, y, 1, CH, UI.red);
        this.fill(x + CW - 1, y, 1, CH, UI.red);
      }
    }
    drawText(fb, SW, o.x + COLS * CW - 8, top - 10, 'N', UI.black);
    // The cursor, and what lies under it.
    const kx = o.x + (curX + (COLS >> 1)) * CW;
    const ky = top + (curY + (ROWS >> 1)) * CH;
    if (curX || curY) {
      // White outside and black inside, so it shows against any tile.
      for (const [inset, colour] of [[0, UI.white], [1, UI.black]] as const) {
        this.fill(kx + inset, ky + inset, CW - 2 * inset, 1, colour);
        this.fill(kx + inset, ky + CH - 1 - inset, CW - 2 * inset, 1, colour);
        this.fill(kx + inset, ky + inset, 1, CH - 2 * inset, colour);
        this.fill(kx + CW - 1 - inset, ky + inset, 1, CH - 2 * inset, colour);
      }
    }
    this.mapAt = { x: o.x, y: top, cw: CW, ch: CH, cols: COLS, rows: ROWS };
    const under = cells.find((c) => c.x === cx + curX && c.y === cy + curY);
    const away = [curY < 0 ? `${-curY} north` : curY > 0 ? `${curY} south` : '', curX < 0 ? `${-curX} west` : curX > 0 ? `${curX} east` : ''].filter(Boolean).join(', ');
    const name = !(curX || curY) ? (here ? here.name : sim.room.name) : under?.mark ? under.name : under ? (under.goal ? 'Where you have been sent' : 'Not yet walked') : 'Unknown country';
    drawText(fb, SW, o.x, top + ROWS * CH + 5, (away ? `${name} (${away})` : name).slice(0, 34), UI.black);
  }

  /** On some nights the sky itself is lit: slow green curtains, high up. */
  private aurora(sc: Scene, day: number, tick: number, depth: number): void {
    if (mix(day, 77) / 4294967296 > 0.45) return;
    const t = tick * 0.02;
    for (let x = 0; x < PW; x++) {
      const strength = clamp((vnoise(x * 0.012, t * 0.2 + day, 8) - 0.18) * 2.6) * depth;
      if (strength <= 0) continue;
      const top = 1 + 6 * Math.sin(x * 0.021 + t * 0.6) + 7 * vnoise(x * 0.03, t * 0.3, 5);
      const len = 20 + 20 * vnoise(x * 0.06 + 40, t * 0.5, 6);
      const ray = 0.4 + 0.6 * vnoise(x * 0.45, t * 1.2, 7);
      for (let k = 0; k < len; k++) {
        const y = Math.round(top + k);
        if (y < 0 || y >= PH) continue;
        const i = y * PW + x;
        if (sc.ramp[i] !== R.sky || sc.pri[i] !== 0) continue;
        const s = strength * ray * (1 - k / len) ** 0.8;
        if (s < 0.04 + 0.62 * bayer4(x, y)) continue;
        this.fb[(y + PIC_Y) * SW + x] = sceneColour(R.glow, 0.45 + 0.55 * s, x, y);
      }
    }
  }

  /** Stars and a moon, when it is dark enough to see them and nothing is in the way. */
  private nightSky(sc: Scene, tick: number, day: number): void {
    const depth = (this.night - 0.35) / 0.65;
    if (depth <= 0) return;
    this.aurora(sc, day, tick, depth);
    const sky = (x: number, y: number): boolean => sc.ramp[y * PW + x] === R.sky && sc.pri[y * PW + x] === 0;
    for (let k = 0; k < 70; k++) {
      // The faintest come out last.
      if (hash2(k, 5, 19) > depth) continue;
      const x = Math.floor(hash2(k, 1, 19) * PW);
      const y = Math.floor(hash2(k, 2, 19) ** 1.4 * 78);
      if (!sky(x, y)) continue;
      const twinkle = ((tick >> 3) + k * 7) % 23 === 0;
      this.fb[(y + PIC_Y) * SW + x] = spriteColour(R.star, twinkle ? 0 : hash2(k, 3, 19) < 0.3 ? 3 : 0);
    }
    // A gibbous moon, low in the east.
    for (let dy = -5; dy <= 5; dy++)
      for (let dx = -5; dx <= 5; dx++) {
        const x = 262 + dx;
        const y = 20 + dy;
        if (dx * dx + dy * dy > 27 || (dx + 3) ** 2 + (dy + 1) ** 2 < 14 * (1 - depth) || !sky(x, y)) continue;
        this.fb[(y + PIC_Y) * SW + x] = spriteColour(R.star, (dx - 1) ** 2 + (dy - 2) ** 2 < 5 || (dx + 2) ** 2 + (dy + 2) ** 2 < 3 ? 0 : 3);
      }
  }

  draw(shell: Shell): Uint8Array {
    const { fb } = this;
    const sim = shell.sim;
    const st = sim.state;
    const p = st.player;
    const sc = sim.scene();
    const dark = sim.isDark();

    if (dark) fb.fill(UI.black, PIC_Y * SW, (PIC_Y + PH) * SW);
    // The picture jolts for a moment when the hero is struck.
    else fb.set(this.pic(sim.sceneKey(), sc), PIC_Y * SW + (p.hurtT > 6 ? (p.hurtT & 1 ? 2 : -2) : 0));

    const outdoors = sim.room.scene.kind === 'outdoor';
    this.night = outdoors ? 1 - sim.daylight() : 0;
    if (outdoors && !dark) this.nightSky(sc, shell.uiTick, Math.floor((st.tick + DAY_LENGTH * 0.12) / DAY_LENGTH));

    // Everything standing on the ground, back to front.
    const items: { y: number; draw: () => void }[] = [];
    const lightAt = (x: number, y: number): number => {
      if (!sc.light) return 0;
      const l = sc.light[Math.max(0, Math.min(PH - 1, Math.round(y))) * PW + Math.max(0, Math.min(PW - 1, Math.round(x)))];
      return l < 0.3 ? 2 : l < 0.7 ? 1 : 0;
    };
    const person = (key: string, spec: CharSpec, a: { x: number; y: number; dir: Dir; act: Act; frame: number }, flash: boolean): void => {
      items.push({
        // The hero stands in front of whatever shares his patch of ground, so big things do not hide him.
        y: key === 'hero' ? a.y + 0.5 : a.y,
        draw: () => {
          if (!dark) this.groundShadow(sc, a.x, a.y, Math.round((beast(spec) ? 12 : 7) * (spec.size ?? 1)));
          // A struck figure flashes a tone brighter.
          const tone = flash ? -1 : lightAt(a.x, a.y);
          this.drawSprite(sc, this.sprite(key, spec, a.dir, a.act, a.frame), a.x, a.y, a.dir === 'left', tone, dark);
        },
      });
    };
    for (const a of sim.rs.actors) {
      const spec = a.kind === 'npc' ? sim.content.chars[a.ref]?.spec : sim.content.enemies[a.ref]?.spec;
      if (!spec) continue;
      person(a.ref, spec, a, a.ai.flash > 0);
      // A wounded enemy shows how much fight it has left.
      const full = a.kind === 'enemy' ? a.ai.max ?? sim.content.enemies[a.ref].hp : 0;
      // A foe about to strike says so: this is the moment to guard or step aside.
      if (!dark && a.ai.wind > 0 && a.act !== 'dead') {
        const wx = Math.round(a.x) - 3;
        const wy = Math.round(a.y) - Math.round((beast(spec) ? 22 : 38) * (spec.size ?? 1)) - 10 + PIC_Y;
        items.push({ y: 998, draw: () => (this.fill(wx - 1, wy - 1, 9, 10, UI.black), drawText(fb, SW, wx, wy, '!', UI.gold)) });
      }
      if (!dark && a.act !== 'dead' && a.hp < full) {
        const top = Math.round(a.y) - Math.round((beast(spec) ? 22 : 38) * (spec.size ?? 1));
        const left = Math.round(a.x) - 8;
        items.push({
          y: 999,
          draw: () => {
            this.fill(left, top + PIC_Y, 16, 3, UI.black);
            this.fill(left + 1, top + PIC_Y + 1, Math.max(1, Math.round((14 * Math.max(0, a.hp)) / full)), 1, UI.health);
          },
        });
      }
    }
    // In the dark you can still just make out yourself.
    if (dark) items.push({ y: p.y, draw: () => this.drawSprite(sc, this.sprite('hero', sim.content.hero, p.dir, p.act, p.frame), p.x, p.y, p.dir === 'left', 3, false) });
    if (!dark) {
      for (const t of sim.things()) {
        const icon = t.icon && ICONS[t.icon];
        if (icon) items.push({ y: t.y, draw: () => this.drawIcon(sc, icon, t.x, t.y, t.lift ?? 0) });
      }
      // Where a pointed-at walk is bound: a small mark on the ground, under everything.
      const to = shell.heading;
      if (to && (shell.uiTick >> 2) & 1)
        items.push({
          y: -1,
          draw: () => {
            // Gold over a dark edge: it has to show on snow and on a dark floor alike.
            const arms = [[0, 0], [-2, -1], [2, -1], [-2, 1], [2, 1]];
            for (const [dx, dy] of arms) this.fill(to.x + dx - 1, to.y + dy + PIC_Y, 4, 2, UI.black);
            for (const [dx, dy] of arms) this.fill(to.x + dx, to.y + dy + PIC_Y, 2, 1, UI.gold);
          },
        });
      // Just after a blow the hero flickers, which is also when he cannot be hit again.
      if (!(p.hurtT > 0 && shell.uiTick & 1)) person('hero', sim.content.hero, p, false);
      sc.flames.forEach((f, k) => items.push({ y: f.y, draw: () => this.drawFlame(sc, f, shell.uiTick, k) }));
      for (const s of sim.rs.shots) items.push({ y: s.y, draw: () => this.drawShot(sc, s, shell.uiTick) });
    }
    items.sort((a, b) => a.y - b.y).forEach((it) => it.draw());

    // Snow on the air, out of doors: near flakes fall faster and brighter than far ones. Far from
    // the valley it comes thicker, and sideways.
    if (outdoors) {
      const t = shell.uiTick;
      const at = parseWild(st.room);
      const far = at ? Math.max(0, depthOf(sim.content, at[0], at[1]) - 1) : 0;
      // Once the weather has broken, the wind is gone, and at home there is hardly a flake.
      const still = !!sim.content.calm && all(sim, sim.content.calm);
      const wind = still ? 0 : Math.min(2.4, far * 0.4);
      for (let i = 0, n = still ? (at ? 40 + Math.min(60, far * 8) : 7) : 54 + Math.min(120, far * 20); i < n; i++) {
        const near = i % 3 === 0;
        const speed = (near ? 1.5 : 0.8) + hash2(i, 3, 7) * 0.5;
        const x = Math.floor(hash2(i, 1, 7) * PW + Math.sin((t + i * 37) * 0.04) * 5 + t * ((hash2(i, 4, 7) - 0.5) * 0.4 - wind * (near ? 1 : 0.6)));
        const y = Math.floor(hash2(i, 2, 7) * PH + t * speed);
        fb[(PIC_Y + (((y % PH) + PH) % PH)) * SW + (((x % PW) + PW) % PW)] = spriteColour(R.snow, near ? 3 : 2);
      }
    }

    // Status line
    this.fill(0, 0, SW, 8, UI.white);
    // No ceiling is shown: the world is meant to keep growing, and the score with it.
    drawText(fb, SW, 8, 0, `Score: ${st.score}`, UI.black);
    // Silver in the purse: a coin, and how many.
    const purse = String(p.gold);
    const px0 = 164 - purse.length * 8 - 9;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= 5) fb[(4 + dy) * SW + px0 + 3 + dx] = dx * dx + dy * dy <= 1 ? spriteColour(R.gold, 3) : spriteColour(R.gold, 1);
    drawText(fb, SW, px0 + 8, 0, purse, UI.black);
    // A small sun or moon, so the hour can be told at a glance: night matters out in the wild.
    const light = sim.daylight();
    const sx = 172;
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++) {
        const d = dx * dx + dy * dy;
        if (d > 10) continue;
        const moon = light < 0.5;
        if (moon && (dx + 2) * (dx + 2) + (dy + 1) * (dy + 1) < 8) continue;
        fb[(4 + dy) * SW + sx + dx] = moon ? spriteColour(R.blue, 1) : d > 5 ? UI.gold : spriteColour(R.fire, 3);
      }
    // Badly hurt, the health bar flashes: it is easy to miss in the middle of a fight.
    this.bar(196, 'H', p.hp, p.maxHp, p.hp < p.maxHp * 0.3 && !p.dead && (shell.uiTick >> 2) & 1 ? UI.white : UI.health);
    this.bar(238, 'M', p.mp, p.maxMp, UI.mana);
    this.bar(280, 'S', p.sp, p.maxSp, UI.stamina);

    // Typing line
    this.fill(0, PIC_Y + PH, SW, SH - PIC_Y - PH, UI.black);
    const cursor = !shell.modal && (shell.uiTick >> 3) & 1 ? '_' : ' ';
    drawText(fb, SW, 0, PIC_Y + PH + 8, '>' + shell.input + cursor, UI.grey);
    if (shell.uiTick < shell.noteUntil) {
      // A long hint takes a second line, borrowed from the foot of the picture.
      const note = wrap(shell.noteText, 40).slice(0, 2);
      if (note.length > 1) this.fill(0, PIC_Y + PH - 9, SW, 9, UI.black);
      note.forEach((l, i) => drawText(fb, SW, 0, PIC_Y + PH - (note.length - 1 - i) * 8, l, UI.gold));
    }
    // Runewords the player knows, and how long until each can be spoken again.
    const words = p.words.map((id) => {
      const left = p.cd[id] ?? 0;
      return `${id.replace('word:', '').toUpperCase()}${left > 0 ? ' ' + Math.ceil(left / 20) : ''}`;
    });
    const held = [p.weapon, p.shield].filter(Boolean).map((id) => sim.content.items[id!]?.name ?? id);
    const hands = held.length ? `[${held.join(' + ')}]` : '';
    // Whatever is lending its help just now, at the right-hand end: a ward, borrowed strength, a carried light.
    const until = (k: string): boolean => Number(st.flags[k] ?? 0) > st.tick;
    const boons = [until('ward') ? 'Ward' : '', until('might') ? 'Might' : '', until('light') && sim.room.dark ? 'Light' : ''].filter(Boolean).join(' ');
    if (boons) drawText(fb, SW, SW - boons.length * 8, PIC_Y + PH + 16, boons, UI.gold);
    // The words are what can be typed, so they are never crowded off the line: what is in the
    // hands is shortened to the weapon alone, or left out, before a word is.
    const room = 40 - (boons ? boons.length + 1 : 0);
    const weapon = p.weapon ? `[${sim.content.items[p.weapon]?.name ?? p.weapon}]` : '';
    const line = [hands, weapon, ''].map((h) => [h, ...words].filter(Boolean).join('  ')).find((l) => l.length <= room) ?? words.join(' ');
    drawText(fb, SW, 0, PIC_Y + PH + 16, line.slice(0, room), UI.dim);

    // Something that takes a whole fight to bring down gets its name and its health across the top.
    const boss = dark ? undefined : sim.rs.actors.find((a) => a.kind === 'enemy' && a.act !== 'dead' && sim.content.enemies[a.ref]?.ai === 'boss');
    if (boss) {
      const name = sim.content.enemies[boss.ref].name;
      const w = 160;
      const x0 = (SW - w) >> 1;
      const full = boss.ai.max ?? sim.content.enemies[boss.ref].hp;
      this.fill(x0 - 1, PIC_Y + 3, w + 2, 7, UI.black);
      this.fill(x0, PIC_Y + 4, w, 5, UI.dim);
      this.fill(x0, PIC_Y + 4, Math.max(1, Math.round((w * Math.max(0, boss.hp)) / full)), 5, UI.health);
      const label = name[0].toUpperCase() + name.slice(1);
      const lx = (SW - label.length * 8) >> 1;
      this.fill(lx - 2, PIC_Y + 11, label.length * 8 + 4, 9, UI.black);
      drawText(fb, SW, lx, PIC_Y + 12, label, UI.white);
    }

    this.drawModal(shell);
    return fb;
  }
}
