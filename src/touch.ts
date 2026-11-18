// Touch controls for phones and tablets: a thumb pad, action buttons, a command field that uses
// the device's own keyboard, and a row of suggestions for what can be done here. All of it just
// feeds the same key presses and typed lines a keyboard would.

import { SH, SW, type Renderer } from './engine/render';
import type { Shell } from './engine/shell';

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

  window.visualViewport?.addEventListener('resize', refit);
}

/**
 * A tap or a click on the picture answers a message, picks a row from a list, or looks at a place
 * on the map. For fingers and for mice alike.
 */
export function setupPointer(shell: Shell, renderer: Renderer, canvas: HTMLCanvasElement): void {
  canvas.addEventListener('pointerdown', (e) => {
    const m = shell.modal;
    if (!m) return;
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
