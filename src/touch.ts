// Touch controls for phones and tablets: a thumb pad, action buttons, a command field that uses
// the device's own keyboard, and a row of suggestions for what can be done here. All of it just
// feeds the same key presses and typed lines a keyboard would.

import { SH, SW, type Renderer } from './engine/render';
import type { Modal, Shell } from './engine/shell';

const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] as const;

export function isTouchDevice(): boolean {
  return new URLSearchParams(location.search).has('touch') || matchMedia('(hover: none) and (pointer: coarse)').matches;
}

export function setupTouch(shell: Shell, renderer: Renderer, canvas: HTMLCanvasElement, refit: () => void): void {
  document.documentElement.classList.add('touch');
  shell.startHint = 'Pad walks. Tap a button below, or type.';
  shell.roomy = true;

  // --- thumb pad: slide in any of eight directions
  const pad = document.getElementById('dpad')!;
  const held = new Set<string>();
  const press = (want: Set<string>): void => {
    for (const k of ARROWS) {
      if (want.has(k) && !held.has(k)) shell.keyDown(k);
      if (!want.has(k) && held.has(k)) shell.keyUp(k);
    }
    held.clear();
    want.forEach((k) => held.add(k));
    pad.dataset.dir = [...want].map((k) => k.slice(5).toLowerCase()).join(' ');
  };
  const aim = (e: PointerEvent): void => {
    const r = pad.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const want = new Set<string>();
    if (Math.hypot(dx, dy) > r.width * 0.12) {
      const a = Math.atan2(dy, dx);
      const slice = Math.PI / 8;
      if (Math.abs(a) < 3 * slice) want.add('ArrowRight');
      if (Math.abs(a) > 5 * slice) want.add('ArrowLeft');
      if (a > slice && a < 7 * slice) want.add('ArrowDown');
      if (a < -slice && a > -7 * slice) want.add('ArrowUp');
    }
    press(want);
  };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pad.setPointerCapture(e.pointerId);
    aim(e);
  });
  pad.addEventListener('pointermove', (e) => pad.hasPointerCapture(e.pointerId) && aim(e));
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) pad.addEventListener(type, () => press(new Set()));

  // --- action buttons
  for (const b of document.querySelectorAll<HTMLButtonElement>('#acts button')) {
    const key = b.dataset.key!;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.classList.add('down');
      shell.keyDown(key);
    });
    for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const)
      b.addEventListener(type, () => {
        if (!b.classList.contains('down')) return;
        b.classList.remove('down');
        shell.keyUp(key);
      });
  }

  // --- the command field
  const form = document.getElementById('say') as HTMLFormElement;
  const field = document.getElementById('cmd') as HTMLInputElement;
  field.addEventListener('input', () => (shell.input = field.value.slice(0, 37)));
  field.addEventListener('focus', () => {
    document.documentElement.classList.add('typing');
    refit();
  });
  field.addEventListener('blur', () => {
    document.documentElement.classList.remove('typing');
    refit();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const line = field.value;
    field.value = '';
    shell.input = '';
    field.blur();
    if (shell.modal) shell.keyDown('Enter');
    else if (line.trim()) shell.submit(line);
  });

  // --- suggestions: rebuilt only when they change
  const chips = document.getElementById('chips')!;
  let shown = '';
  setInterval(() => {
    const list = shell.suggest();
    const sig = list.map((s) => s.line).join('|');
    if (sig === shown) return;
    shown = sig;
    chips.replaceChildren(
      ...list.map((s) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = s.label;
        b.addEventListener('click', () => shell.submit(s.line));
        return b;
      }),
    );
  }, 250);

  setupPanel(shell);

  window.visualViewport?.addEventListener('resize', refit);
  // Safari ignores the page's "no zooming"; a pinch would otherwise zoom the whole game.
  document.addEventListener('gesturestart', (e) => e.preventDefault());
}

/**
 * Held upright, a phone has room under the picture for the game's words in the page's own type,
 * at a size that can be read: the open message or page, the open menu as rows to tap, and, with
 * nothing open, the last few things said. Built from the shell's state each frame, like the
 * suggestions; a tap here does just what OK or a tap on the box in the picture would.
 */
function setupPanel(shell: Shell): void {
  const panel = document.getElementById('panel')!;
  const said: { who?: string; text: string; raw: string; open: boolean; note?: boolean }[] = [];
  const KEEP = 8;
  let noted = '';
  let seen: Modal | undefined | null = null;
  let sel = -1;
  let rows: HTMLButtonElement[] = [];
  /** Run each frame while the past is shown: keeps it at the newest as the room for it changes. */
  let keep: (() => void) | null = null;

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  /** A card: a heading, a body that scrolls if it must, and room for a line at its foot. */
  const card = (kind: string, head?: string, close?: () => void): [HTMLDivElement, HTMLDivElement] => {
    const c = el('div', `card ${kind}`);
    if (head || close) {
      const h = el('div', 'head');
      h.append(el('span', '', head ?? ''));
      if (close) {
        const x = el('button', 'close', '\u2715');
        x.type = 'button';
        x.setAttribute('aria-label', 'Close');
        x.addEventListener('click', () => close());
        h.append(x);
      }
      c.append(h);
    }
    const body = el('div', 'body');
    c.append(body);
    // Words or rows running on past the foot of the card fade out there, to say there is more.
    const below = (): void => void body.classList.toggle('below', body.scrollTop + body.clientHeight < body.scrollHeight - 4);
    body.addEventListener('scroll', below);
    requestAnimationFrame(below);
    return [c, body];
  };
  /**
   * A tap on a message or a page answers it, as OK does; but where the words run on past the
   * foot of the card, a tap first shows the rest of them.
   */
  const answerable = (c: HTMLElement, body: HTMLElement, more: boolean): void => {
    const go = el('div', 'go');
    c.append(go);
    const hidden = (): boolean => body.scrollTop + body.clientHeight < body.scrollHeight - 4;
    const label = (): void => void (go.textContent = hidden() ? 'Tap to read on \u25be' : more ? 'Tap for more \u25b8' : 'Tap to go on \u25b8');
    body.addEventListener('scroll', label);
    requestAnimationFrame(label);
    c.addEventListener('click', () => {
      if (shell.modal !== seen) return;
      if (hidden()) body.scrollBy({ top: body.clientHeight - 24, behavior: 'smooth' });
      else shell.keyDown('Enter');
    });
  };

  const build = (m: Modal | undefined): void => {
    keep = null;
    rows = [];
    sel = -1;
    if (!m) {
      // Nothing open: what was said lately, dimmed, newest at the foot.
      const [c, body] = card('past');
      for (const s of said) {
        const p = el('p', s.note ? 'note' : '');
        if (s.who) p.append(el('b', '', s.who + ' '));
        p.append(s.text);
        body.append(p);
      }
      panel.replaceChildren(...(said.length ? [c] : []));
      // Kept scrolled to the newest, as the space for it changes, unless the player has scrolled back.
      let pinned = true;
      const pin = (): void => void (pinned && (body.scrollTop = body.scrollHeight));
      body.addEventListener('scroll', () => (pinned = body.scrollTop + body.clientHeight >= body.scrollHeight - 4));
      keep = pin;
      pin();
      return;
    }
    let c: HTMLDivElement;
    let body: HTMLDivElement;
    if (m.k === 'msg') {
      [c, body] = card('msg', m.who);
      body.append(el('p', 'words', unwrap(m.text, 32)));
      answerable(c, body, !!m.more);
    } else if (m.k === 'page') {
      [c, body] = card('page', m.title);
      // A page laid out in columns keeps its columns; any other reads as running text.
      const cols = m.lines.some((l) => /\S {2,}\S/.test(l));
      body.append(el('p', cols ? 'words cols' : 'words', cols ? m.lines.join('\n') : unwrap(m.lines.join('\n'), 34)));
      answerable(c, body, !!m.more);
    } else if (m.k === 'list') {
      [c, body] = card('list', m.title, m.cancel ? () => shell.modal === m && shell.keyDown('Escape') : undefined);
      rows = m.items.map((item, i) => {
        // A row laid out in two columns (a thing and its weight) keeps the second at the right.
        const cols = /^(.*\S) {2,}(\S+)$/.exec(item);
        const b = el('button', 'row', cols ? cols[1] : item);
        if (cols) b.append(el('span', 'num', cols[2]));
        b.type = 'button';
        b.addEventListener('click', () => {
          if (shell.modal !== m) return;
          m.sel = i;
          shell.keyDown('Enter');
        });
        return b;
      });
      body.append(...rows);
      // A long menu of short rows goes in two columns, so more of it is in reach at once.
      if (m.items.length > 5 && m.items.every((t) => t.length <= 16)) body.classList.add('two');
    } else {
      [c, body] = card('map', 'The map');
      body.append(el('p', 'words', 'Tap a place on the map to see its name. The pad moves about it.'));
      const b = el('button', 'row', 'Close the map');
      b.type = 'button';
      b.addEventListener('click', () => shell.modal === m && shell.keyDown('Enter'));
      c.append(b);
    }
    panel.replaceChildren(c);
  };

  const frame = (): void => {
    const m = shell.modal;
    document.documentElement.classList.toggle('boxed', !!m);
    if (m !== seen) {
      // Remember what is said as it is shown; a message that runs over several boxes is kept whole.
      const last = said[said.length - 1];
      if (m && m.k === 'msg' && !m.any) {
        if (last?.open && last.who === m.who) {
          last.raw += '\n' + m.text;
          last.text = unwrap(last.raw, 32);
        } else said.push({ who: m.who, text: unwrap(m.text, 32), raw: m.text, open: false });
        said[said.length - 1].open = !!m.more;
        if (said.length > KEEP) said.shift();
      } else if (last && m?.k !== 'msg') last.open = false;
      seen = m;
      build(m);
    }
    // A passing remark under the picture (a room's name, a hint) joins them too.
    const note = `${shell.noteText}|${shell.noteUntil}`;
    if (note !== noted) {
      noted = note;
      const last = said[said.length - 1];
      if (shell.noteText && !(last?.note && last.text === shell.noteText)) {
        said.push({ text: shell.noteText, raw: shell.noteText, open: false, note: true });
        if (said.length > KEEP) said.shift();
        if (!m) build(m);
      }
    }
    keep?.();
    if (m?.k === 'list' && m.sel !== sel) {
      rows[sel]?.classList.remove('sel');
      sel = m.sel;
      rows[sel]?.classList.add('sel');
      rows[sel]?.scrollIntoView({ block: 'nearest' });
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/**
 * The game wraps its words to fit the box in the picture. Here they reflow to the panel's width
 * instead: a line break the wrapping made is a space again, and one the writer made is kept.
 */
function unwrap(text: string, cols: number): string {
  const lines = text.split('\n');
  // A line too long for the box was never wrapped at all.
  if (lines.some((l) => l.length > cols)) return text;
  let out = lines[0];
  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1];
    const next = lines[i];
    const soft = prev && next && prev.length + 1 + next.split(' ')[0].length > cols;
    out += (soft ? ' ' : '\n') + next;
  }
  return out;
}

/**
 * A tap or a click on the picture answers a message, picks a row from a list, or looks at a place
 * on the map. For fingers and for mice alike.
 */
export function setupPointer(shell: Shell, renderer: Renderer, canvas: HTMLCanvasElement): void {
  canvas.addEventListener('pointerdown', (e) => {
    const m = shell.modal;
    if (!m) {
      // With nothing to answer, pointing at the picture means: walk there.
      const r = canvas.getBoundingClientRect();
      const [x, y] = [((e.clientX - r.left) / r.width) * SW, ((e.clientY - r.top) / r.height) * SH - 8];
      if (y >= 0 && y < 168) shell.walkTo(Math.round(x), Math.round(y));
      return;
    }
    e.preventDefault();
    if (m.k === 'map') {
      // A tap on the map looks at that place; a tap off it closes the map.
      const r = canvas.getBoundingClientRect();
      const cell = renderer.hitMap(((e.clientX - r.left) / r.width) * SW, ((e.clientY - r.top) / r.height) * SH);
      if (cell && (cell[0] !== m.dx || cell[1] !== m.dy)) {
        [m.dx, m.dy] = cell;
        return;
      }
    }
    if (m.k === 'list') {
      const r = canvas.getBoundingClientRect();
      const row = renderer.hitList(((e.clientX - r.left) / r.width) * SW, ((e.clientY - r.top) / r.height) * SH);
      if (row < 0) return;
      m.sel = row;
    }
    shell.keyDown('Enter');
  });
}
