// The player's side of the screen: the menu and the way back to it, the bag, the character
// sheet, the map, and the line across the top.

import { describe, expect, it } from 'vitest';
import { inventoryPage, itemActions } from '../src/engine/commands';
import { Renderer } from '../src/engine/render';
import { Shell, type Modal } from '../src/engine/shell';
import { behaviours } from '../src/game/behaviours';
import { content } from '../src/game/content';

function memoryStore(): { get(k: string): string | null; set(k: string, v: string): void } {
  const m = new Map<string, string>();
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v) };
}

function playing(room = 'village', x = 160, y = 150, store = memoryStore()): Shell {
  const shell = new Shell(content, store, false, behaviours);
  shell.modals = [];
  shell.sim.enterRoom(room, x, y);
  shell.tick();
  shell.modals = [];
  return shell;
}

type List = Extract<Modal, { k: 'list' }>;

function list(shell: Shell): List {
  const m = shell.modal;
  if (m?.k !== 'list') throw new Error(`expected a menu, not ${m?.k ?? 'nothing'}`);
  return m;
}

/** Choose the row of the open menu that reads `label` (or starts with it). */
function choose(shell: Shell, label: string): void {
  const m = list(shell);
  const i = m.items.findIndex((it) => it === label || it.startsWith(label));
  if (i < 0) throw new Error(`no row "${label}" in ${m.items.join(' | ')}`);
  m.sel = i;
  shell.keyDown('Enter');
}

/** Let the game run until something is open that is not a message or a page, reading those as they come. */
function settle(shell: Shell): string[] {
  const said: string[] = [];
  for (let i = 0, quiet = 0; i < 400 && quiet < 3; i++) {
    const m = shell.modal;
    if (m?.k === 'list' || m?.k === 'map') break;
    if (m) {
      said.push(m.k === 'msg' ? m.text : m.lines.join(' '));
      shell.keyDown('Enter');
      quiet = 0;
    } else {
      shell.tick();
      quiet = shell.busy ? 0 : quiet + 1;
    }
  }
  return said;
}

/** Close whatever is open, the way a player would: Esc on a menu or the map, Enter on anything else. */
function close(shell: Shell): void {
  const m = shell.modal;
  shell.keyDown(m?.k === 'list' || m?.k === 'map' ? 'Escape' : 'Enter');
}

describe('going back', () => {
  it('comes back to the menu from everything it opens, with the cursor where it was', () => {
    for (const row of ['Bag', 'Map', 'Journal', 'Character', 'Deeds', 'Save game', 'Restore game', 'Settings', 'How to play', 'Start again']) {
      const shell = playing();
      shell.keyDown('Escape');
      choose(shell, row);
      expect(shell.backToMenu).toBe(true);
      shell.tick();
      // Read and close whatever came of it, one box at a time, until the menu is back.
      for (let i = 0; i < 20 && !(shell.modal?.k === 'list' && list(shell).title === content.title); i++) {
        if (shell.modal) close(shell);
        else shell.tick();
      }
      const m = list(shell);
      expect(m.title, row).toBe(content.title);
      expect(m.items[m.sel], row).toBe(row);
      // Resume, and the game goes on with nothing waiting to come back.
      choose(shell, 'Resume');
      shell.tick();
      expect(shell.modal, row).toBeUndefined();
      expect(shell.backToMenu).toBe(false);
    }
  });

  it('goes back to the game from Esc on the menu itself', () => {
    const shell = playing();
    shell.keyDown('Escape');
    expect(list(shell).items[0]).toBe('Resume');
    shell.keyDown('Escape');
    shell.tick();
    expect(shell.modal).toBeUndefined();
  });

  it('gives every menu opened from the menu a last row that goes back', () => {
    for (const row of ['Save game', 'Restore game', 'Settings']) {
      const shell = playing();
      shell.keyDown('Escape');
      choose(shell, row);
      const sub = list(shell);
      expect(sub.items[sub.items.length - 1], row).toBe('Back');
      choose(shell, 'Back');
      expect(list(shell).title, row).toBe(content.title);
      expect(list(shell).items[list(shell).sel]).toBe(row);
    }
  });

  it('goes straight back to the game from what is opened directly', () => {
    const ways: [string, (s: Shell) => void][] = [
      ['F4', (s) => s.keyDown('F4')],
      ['Tab', (s) => s.keyDown('Tab')],
      ['F1', (s) => s.keyDown('F1')],
      ['map', (s) => s.submit('map')],
      ['journal', (s) => s.submit('journal')],
      ['skills', (s) => s.submit('skills')],
      ['deeds', (s) => s.submit('deeds')],
      ['inventory', (s) => s.submit('inventory')],
      ['save', (s) => s.submit('save')],
    ];
    for (const [name, open] of ways) {
      const shell = playing();
      open(shell);
      shell.tick();
      expect(shell.modal, name).toBeDefined();
      expect(shell.backToMenu, name).toBe(false);
      for (let i = 0; i < 12 && shell.modal; i++) close(shell);
      shell.tick();
      expect(shell.modal, name).toBeUndefined();
    }
  });

  it('leaves nothing to go back to after starting again, restoring, or dying', () => {
    const store = memoryStore();
    const shell = playing('village', 160, 150, store);
    shell.save('Slot 1', true);
    // Starting again, from the menu.
    shell.keyDown('Escape');
    choose(shell, 'Start again');
    choose(shell, 'Yes');
    expect(shell.backToMenu).toBe(false);
    shell.modals = [];
    shell.tick();
    expect(shell.modal).toBeUndefined();
    // Restoring, from the menu.
    shell.keyDown('Escape');
    choose(shell, 'Restore game');
    choose(shell, 'Slot 1');
    expect(shell.backToMenu).toBe(false);
    expect(shell.sim.state.room).toBe('village');
    shell.tick();
    expect(shell.modal).toBeUndefined();
    // Dying, with the bag waiting to come back after something chosen from it.
    shell.sim.give('bow');
    shell.keyDown('Escape');
    choose(shell, 'Bag');
    choose(shell, 'hunting bow');
    choose(shell, 'Ready');
    expect(shell.backToMenu).toBe(true);
    shell.sim.die('The cold takes you.');
    shell.tick();
    expect(shell.backToMenu).toBe(false);
    // The death box, and then the choice of what to do: and nothing else comes back after it.
    settle(shell);
    expect(list(shell).title).toBe(shell.sim.text('deathPrompt'));
  });
});

describe('the bag', () => {
  const kit = ['sword', 'bow', 'shield', 'mail', 'torc', 'potion', 'potion', 'cheese', 'torch', 'ember', 'pelt', 'crown'];

  function packed(): Shell {
    const shell = playing();
    for (const id of kit) shell.sim.give(id);
    shell.sim.p.gold = 37;
    return shell;
  }

  it('opens from Tab, from typing, and from the menu, as a row for each kind of thing', () => {
    for (const open of [(s: Shell) => s.keyDown('Tab'), (s: Shell) => s.submit('inventory'), (s: Shell) => (s.keyDown('Escape'), choose(s, 'Bag'))]) {
      const shell = packed();
      open(shell);
      const m = list(shell);
      expect(m.title).toContain('Your bag');
      expect(m.title).toContain('Silver: 37');
      expect(m.title).not.toMatch(/gold/i);
      // One row per kind, with the count, then a row to leave by.
      expect(m.items).toContain('red draught x2');
      expect(m.items.filter((it) => it.startsWith('red draught')).length).toBe(1);
      expect(m.items).toContain('iron sword (in hand)');
      expect(m.items).toContain('round shield (in hand)');
      expect(m.items.length).toBe(new Set(kit).size + 1);
      expect(['Close', 'Back']).toContain(m.items[m.items.length - 1]);
    }
  });

  it('says so when it is empty', () => {
    const shell = playing();
    shell.keyDown('Tab');
    const m = list(shell);
    expect(m.title).toContain(shell.sim.text('emptyHanded'));
    expect(m.items).toEqual(['Close']);
    choose(shell, 'Close');
    shell.tick();
    expect(shell.modal).toBeUndefined();
  });

  it('offers what can be done with each kind of thing', () => {
    const shell = packed();
    shell.sim.give('tomeFlame');
    shell.sim.give('token');
    shell.sim.give('glove');
    const sim = shell.sim;
    const acts = (id: string): string[] => itemActions(sim, id).map((a) => `${a.label}: ${a.line}`);
    expect(acts('potion')).toEqual(['Drink: drink potion']);
    expect(acts('cheese')).toEqual(['Eat: eat cheese']);
    expect(acts('tomeFlame')).toEqual(['Read: read tome']);
    expect(acts('ember')).toEqual(['Use: use ember']);
    expect(acts('torch')).toEqual(['Use: use torch']);
    expect(acts('sword')).toEqual(['Put away: unequip sword']);
    expect(acts('bow')).toEqual(['Ready: equip bow']);
    expect(acts('shield')).toEqual(['Put away: unequip shield']);
    expect(acts('mail')).toEqual(['Take off: unequip mail']);
    expect(acts('torc')).toEqual(['Take off: unequip torc']);
    expect(acts('token')).toEqual(['Wear: equip token']);
    // Things with no use have nothing to offer but going back.
    expect(acts('pelt')).toEqual([]);
    expect(acts('glove')).toEqual([]);
  });

  it('names the right one of two things that answer to the same word', () => {
    const shell = playing();
    shell.sim.give('sword');
    shell.sim.give('longsword');
    // Both are swords: the iron one, first in the pack, is "sword", and the steel one has to be called a longsword.
    expect(itemActions(shell.sim, 'sword').map((a) => a.line)).toEqual(['equip sword']);
    expect(itemActions(shell.sim, 'longsword').map((a) => a.line)).toEqual(['unequip longsword']);
    // And with two books, each is called by the word that means it and not the other.
    shell.sim.give('tomeFlame');
    shell.sim.give('tomeFrost');
    expect(itemActions(shell.sim, 'tomeFlame').map((a) => a.line)).toEqual(['read tome']);
    expect(itemActions(shell.sim, 'tomeFrost').map((a) => a.line)).toEqual(['read frost']);
  });

  it('shows a thing, and its actions do just what typing them does', () => {
    const cases: [string, string, (s: Shell) => unknown][] = [
      ['red draught', 'Drink', (s) => [s.sim.p.hp, s.sim.p.inv.potion]],
      ["Gorm's cheese", 'Eat', (s) => [s.sim.p.hp, s.sim.p.inv.cheese]],
      ['hunting bow', 'Ready', (s) => [s.sim.p.weapon, s.sim.p.other]],
      ['mail shirt', 'Take off', (s) => s.sim.p.armor],
      ['iron torc', 'Take off', (s) => s.sim.p.trinket],
      ['round shield', 'Put away', (s) => [s.sim.p.weapon, s.sim.p.shield]],
    ];
    for (const [thing, action, state] of cases) {
      const a = packed();
      const b = packed();
      for (const s of [a, b]) s.sim.p.hp = 10;
      // One chooses it from the bag...
      a.keyDown('Tab');
      choose(a, thing);
      const page = list(a);
      expect(page.title.toLowerCase()).toContain(thing.toLowerCase());
      expect(page.lead).toBe(true);
      expect(page.items[page.items.length - 1]).toBe('Back');
      const line = itemActions(a.sim, Object.keys(a.sim.p.inv).find((id) => content.items[id].name === thing)!).find((x) => x.label === action)!.line;
      choose(a, action);
      const saidA = settle(a);
      // ...the other types it.
      b.submit(line);
      const saidB = settle(b);
      expect(saidA, thing).toEqual(saidB);
      expect(state(a), thing).toEqual(state(b));
      expect(saidA.length, thing).toBeGreaterThan(0);
    }
  });

  it('comes back to the bag after a thing that is not used up, and not after one that is', () => {
    const shell = packed();
    shell.keyDown('Tab');
    choose(shell, 'hunting bow');
    choose(shell, 'Ready');
    settle(shell);
    const back = list(shell);
    expect(back.title).toContain('Your bag');
    expect(back.items[back.sel]).toBe('hunting bow (in hand)');
    expect(shell.sim.p.weapon).toBe('bow');
    // Back out of the bag, and the game goes on.
    shell.keyDown('Escape');
    shell.tick();
    expect(shell.modal).toBeUndefined();

    shell.sim.p.hp = 10;
    shell.keyDown('Tab');
    choose(shell, 'red draught');
    choose(shell, 'Drink');
    settle(shell);
    expect(shell.modal).toBeUndefined();
    expect(shell.sim.p.hp).toBeGreaterThan(10);
  });

  it('goes back from a thing to the bag, by its last row or by Esc', () => {
    const shell = packed();
    shell.keyDown('Tab');
    choose(shell, 'wolf pelt');
    expect(list(shell).items).toEqual(['Back']);
    choose(shell, 'Back');
    expect(list(shell).title).toContain('Your bag');
    expect(list(shell).items[list(shell).sel]).toBe('wolf pelt');
    choose(shell, 'mail shirt');
    shell.keyDown('Escape');
    expect(list(shell).items[list(shell).sel]).toBe('mail shirt (worn)');
  });

  it('calls the money silver', () => {
    const shell = packed();
    expect(inventoryPage(shell.sim).lines.join(' ')).toContain('Silver: 37');
    expect(inventoryPage(shell.sim).lines.join(' ')).not.toMatch(/gold/i);
  });
});

describe('the character sheet', () => {
  it('opens from SKILLS and from the menu, as a sheet with sections', () => {
    for (const open of [(s: Shell) => s.submit('skills'), (s: Shell) => (s.keyDown('Escape'), choose(s, 'Character'))]) {
      const shell = playing();
      shell.sim.state.flags.kills = 3;
      open(shell);
      shell.tick();
      const pages: Extract<Modal, { k: 'page' }>[] = [];
      while (shell.modal?.k === 'page') {
        pages.push(shell.modal);
        shell.keyDown('Enter');
      }
      expect(pages.length).toBe(2);
      expect(pages.every((p) => p.title === 'Character')).toBe(true);
      const first = pages[0].lines;
      expect(first[0]).toMatch(/^Level +1 +Day +1$/);
      expect(first[1]).toMatch(/^Health +\d+\/\d+ +Mana +\d+\/\d+$/);
      expect(first[2]).toMatch(/^Stamina +\d+\/\d+ +Score +\d+$/);
      // Skills are a section of their own, under a heading, and so are perks and travels.
      const heads = pages.flatMap((p) => (p.heads ?? []).map((i) => p.lines[i]));
      expect(heads[0]).toMatch(/^Skill +Next perk$/);
      expect(heads).toContain('Perks');
      expect(heads).toContain('Travels');
      expect(pages[1].lines.join('\n')).toMatch(/Foes felled +3/);
      expect(first.some((l) => /^Blade +\d+ +Riposte at \d+$/.test(l))).toBe(true);
    }
  });
});

describe('the map', () => {
  it('scrolls with the cursor across country bigger than the sheet, and a tap names what is under it', { timeout: 30000 }, () => {
    const shell = playing('wild_2_1');
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 9; x++) shell.sim.state.flags[`seen.wild_${x}_${y}`] = true;
    shell.keyDown('F4');
    shell.tick();
    const m = shell.modal;
    if (m?.k !== 'map') throw new Error('expected the map');
    const r = new Renderer();
    r.draw(shell);
    for (let i = 0; i < 6; i++) shell.keyDown('ArrowRight');
    r.draw(shell);
    expect(m.dx).toBe(6);
    // The view has followed the cursor east.
    expect(m.vx).toBeGreaterThan(0);
    // A tap on any tile in view names it as an offset from the player, scrolled or not.
    const at = (r as unknown as { mapAt: { x: number; y: number; cw: number; ch: number; x0: number; y0: number } }).mapAt;
    const hit = r.hitMap(at.x + (m.dx - at.x0) * at.cw + 3, at.y + (m.dy - at.y0) * at.ch + 3);
    expect(hit).toEqual([m.dx, m.dy]);
    // No further than a step beyond what is known: walked to 9 east of the valley, known of to 10,
    // seen from 2 east.
    for (let i = 0; i < 30; i++) shell.keyDown('ArrowRight');
    expect(m.dx).toBe(10 - 2 + 1);
  });

  it('marks places with names of their own', async () => {
    const { chart } = await import('../src/engine/frontier');
    const shell = playing('village');
    const cells = chart(content, shell.sim.state.flags, shell.sim.state.room);
    expect(cells.find((c) => c.here)?.named).toBe(true);
  });
});

describe('the line across the top', () => {
  it('has room for four figures of score and of silver', () => {
    const shell = playing();
    shell.sim.state.score = 9999;
    shell.sim.p.gold = 9999;
    const r = new Renderer();
    const fb = r.draw(shell);
    // The health bar's label stands where it always does, clear of the silver.
    const ink = (x0: number, x1: number): number => {
      let n = 0;
      for (let y = 0; y < 8; y++) for (let x = x0; x < x1; x++) if (fb[y * 320 + x] === 0) n++;
      return n;
    };
    // Something is drawn for the silver, and nothing is drawn between it and the health bar.
    expect(ink(113, 204)).toBeGreaterThan(0);
    expect(ink(203, 206)).toBe(0);
  });
});
