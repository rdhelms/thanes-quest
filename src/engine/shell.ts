// The player's side of the game: the typing line, message boxes, menus, saving, and turning held
// keys into intent messages. It owns no world state; in a networked game this is the client.
// Still no DOM here, so tests can drive it.

import { hostile } from './combat';
import { inventoryPage } from './commands';
import { wrap } from './font';
import { roomOf } from './frontier';
import { all } from './rules';
import { Sim, type Behaviour } from './sim';
import type { Content, GameState, Intent } from './types';

export interface Store {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export type Modal =
  | { k: 'msg'; text: string; more?: boolean; who?: string }
  | { k: 'page'; title: string; lines: string[]; more?: boolean }
  /** The map, with a cursor that can be moved about it: dx, dy are its offset from where the player stands. */
  | { k: 'map'; dx: number; dy: number }
  | { k: 'list'; title: string; items: string[]; sel: number; pick: (i: number) => void; cancel: boolean; banner?: string; onCancel?: () => void };

interface SaveFile {
  v: 1;
  /** The content's save version when this was written. */
  content: number;
  label: string;
  state: GameState;
}

const SLOTS = ['Slot 1', 'Slot 2', 'Slot 3'];
const MAX_INPUT = 37;
/** Lines of text a box can hold before it must continue on another. */
const BOX_LINES = 13;
const TICK_MS = 50;

export class Shell {
  sim: Sim;
  input = '';
  private last = '';
  /** Open boxes, front first. The simulation waits while any is open. */
  modals: Modal[] = [];
  /** Sounds to play, drained by the browser layer. */
  sounds: string[] = [];
  settings = { sound: true, music: true, tapToWalk: false };
  /** Interface clock (cursor blink, flames). Not part of the simulation. */
  uiTick = 0;
  /** A passing remark shown under the picture, and the interface tick at which it fades. */
  noteText = '';
  noteUntil = 0;
  private held = new Set<string>();
  private tapDir: [number, number] = [0, 0];
  private sent: [number, number] = [0, 0];
  private queue: Intent[] = [];
  private acc = 0;
  /** The character being spoken with; their menu reopens after each reply. */
  private talkingTo: string | null = null;
  private talkSel = 0;
  /** Shown once as play begins. The browser layer swaps in wording for touch screens. */
  startHint = 'Arrow keys walk. Type HELP for more.';
  /** Space list rows further apart, for fingers. */
  roomy = false;

  constructor(private content: Content, private store: Store, private dev = false, private behaviours: Record<string, Behaviour> = {}) {
    this.sim = this.fresh();
    try {
      Object.assign(this.settings, JSON.parse(store.get('thanes-quest:settings') ?? '{}'));
    } catch {
      // Unreadable settings are simply ignored.
    }
  }

  private fresh(saved?: GameState): Sim {
    const sim = new Sim(this.content, { seed: 1, saved, behaviours: this.behaviours });
    sim.dev = this.dev;
    this.queue = [];
    this.sent = [0, 0];
    this.tapDir = [0, 0];
    this.modals = [];
    this.input = '';
    this.talkingTo = null;
    this.sim = sim;
    if (!saved) this.message(this.content.intro);
    this.absorb();
    return sim;
  }

  /** The opening screen: the game's name over the first room, and a choice of how to start. */
  showTitle(): void {
    // A save from before the first step is no game at all (older builds wrote one on opening).
    const saved = this.read('auto');
    const auto = saved && saved.state.tick > 0 ? saved : null;
    const items = auto ? ['Begin a new saga', `Continue: ${auto.label}`] : ['Begin a new saga'];
    this.modals.unshift({
      k: 'list', title: this.content.tagline, items, sel: auto ? 1 : 0, cancel: false, banner: this.content.title.toUpperCase(),
      pick: (i) => void (i === 1 && this.restore('auto')),
    });
  }

  get modal(): Modal | undefined {
    return this.modals[0];
  }

  /** Show a message, split across several boxes if it is long. */
  message(text: string, who?: string): void {
    const lines = wrap(text, 32);
    for (let i = 0; i < lines.length; i += BOX_LINES) {
      const part = lines.slice(i, i + BOX_LINES);
      // Blank lines at a break would only waste a box.
      while (part.length && !part[0]) part.shift();
      if (!part.length) continue;
      const more = i + BOX_LINES < lines.length;
      if (lines.length <= BOX_LINES) this.modals.push({ k: 'msg', text, who });
      else this.modals.push({ k: 'msg', text: part.join('\n'), more, who });
    }
  }

  private pageOut(title: string, lines: string[]): void {
    const body = lines.flatMap((l) => (l ? wrap(l, 34) : ['']));
    const PAGE = BOX_LINES - 1;
    for (let i = 0; i < Math.max(1, body.length); i += PAGE) {
      const lines = body.slice(i, i + PAGE);
      // A page should not open on a blank line.
      while (lines.length > 1 && !lines[0]) lines.shift();
      this.modals.push({ k: 'page', title, lines, more: i + PAGE < body.length });
    }
  }

  private list(title: string, items: string[], pick: (i: number) => void, cancel = true): void {
    this.modals.unshift({ k: 'list', title, items, sel: 0, pick, cancel });
  }

  // -------------------------------------------------------------------------------------------
  // Time

  /** Advance by real milliseconds; runs as many fixed ticks as fit. */
  advance(ms: number): void {
    this.acc += Math.min(250, ms);
    while (this.acc >= TICK_MS) {
      this.acc -= TICK_MS;
      this.tick();
    }
  }

  tick(): void {
    this.uiTick++;
    if (this.modal) return;
    // Mid-conversation, with the last reply read: offer what else can be said.
    if (this.talkingTo && !this.queue.length) {
      this.openTalk();
      if (this.modal) return;
    }
    const [dx, dy] = this.direction();
    if (dx !== this.sent[0] || dy !== this.sent[1]) {
      this.queue.push({ t: 'move', dx, dy });
      this.sent = [dx, dy];
    }
    const intents = this.queue;
    this.queue = [];
    const first = this.sim.state.tick === 0;
    this.sim.step(intents);
    this.absorb();
    if (first && this.startHint) {
      this.noteText = this.startHint;
      this.noteUntil = this.uiTick + 160;
    }
  }

  private direction(): [number, number] {
    if (this.settings.tapToWalk) return this.tapDir;
    const h = this.held;
    return [(h.has('ArrowRight') ? 1 : 0) - (h.has('ArrowLeft') ? 1 : 0), (h.has('ArrowDown') ? 1 : 0) - (h.has('ArrowUp') ? 1 : 0)];
  }

  /** Turn simulation events into boxes and sounds. */
  private absorb(): void {
    for (const e of this.sim.drain()) {
      if (e.t === 'say') this.message(e.text, e.who);
      else if (e.t === 'talk') this.talkingTo = e.char;
      else if (e.t === 'note') {
        this.noteText = e.text;
        // Long enough to read: hints are a sentence, not a word.
        this.noteUntil = this.uiTick + Math.max(70, e.text.length * 4);
      }
      else if (e.t === 'page') this.pageOut(e.title, e.lines);
      else if (e.t === 'map') this.modals.push({ k: 'map', dx: 0, dy: 0 });
      else if (e.t === 'sound') this.settings.sound && this.sounds.push(e.id);
      else if (e.t === 'room') {
        this.talkingTo = null;
        // Not at the very start: a new game must not overwrite, or pose as, a game in progress.
        if (this.sim.state.tick > 0) {
          this.save('auto', true);
          // And a second, kept from the last place nothing was hunting you: a way back out of a
          // fight that was lost before it began.
          if (!this.sim.rs.actors.some((a) => hostile(this.sim, a))) this.save('safe', true);
        }
        this.noteText = this.sim.room.name;
        this.noteUntil = this.uiTick + 60;
        // Going through a door halts the walk: the key must be pressed again to move on.
        if (!this.sim.p.mdx && !this.sim.p.mdy) {
          this.held.clear();
          this.tapDir = [0, 0];
          this.sent = [0, 0];
        }
      }
      else if (e.t === 'died') {
        this.talkingTo = null;
        this.message(e.text);
        this.modals.push({
          k: 'list', title: this.sim.text('deathPrompt'), items: ['Restore a saved game', 'Start again'], sel: 0, cancel: false,
          pick: (i) => (i === 0 ? this.restoreMenu(true) : this.restart()),
        });
      } else if (e.t === 'won') this.message(e.text);
    }
    if (this.sim.p.pendingLevels > 0 && !this.modals.some((m) => m.k === 'list')) {
      const pools = ['hp', 'mp', 'sp'] as const;
      this.modals.push({
        k: 'list', title: `You have grown stronger: level ${this.sim.p.level - this.sim.p.pendingLevels + 1}. What will you raise?`,
        items: ['Health', 'Mana', 'Stamina'], sel: 0, cancel: false,
        pick: (i) => this.queue.push({ t: 'level', pool: pools[i] }),
      });
    }
    // Arriving in a room stops the walk, so a held key does not carry the player straight through.
    if (this.modal) this.held.clear();
  }

  // -------------------------------------------------------------------------------------------
  // Keys

  keyDown(key: string): boolean {
    const m = this.modal;
    if (m) {
      if (m.k === 'list') {
        if (key === 'ArrowUp') m.sel = (m.sel + m.items.length - 1) % m.items.length;
        else if (key === 'ArrowDown') m.sel = (m.sel + 1) % m.items.length;
        else if (key === 'Enter') {
          this.modals.shift();
          m.pick(m.sel);
        } else if (key === 'Escape' && m.cancel) {
          this.modals.shift();
          m.onCancel?.();
        }
      } else if (m.k === 'map' && key.startsWith('Arrow')) {
        // Look about the map: the place under the cursor is named below it.
        m.dx = Math.max(-8, Math.min(8, m.dx + (key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0)));
        m.dy = Math.max(-4, Math.min(4, m.dy + (key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0)));
      } else if (key === 'Enter' || key === 'Escape' || key === ' ') this.modals.shift();
      return true;
    }
    if (key.startsWith('Arrow')) {
      if (this.settings.tapToWalk) {
        const d: [number, number] = key === 'ArrowLeft' ? [-1, 0] : key === 'ArrowRight' ? [1, 0] : key === 'ArrowUp' ? [0, -1] : [0, 1];
        this.tapDir = d[0] === this.tapDir[0] && d[1] === this.tapDir[1] ? [0, 0] : d;
      } else this.held.add(key);
      return true;
    }
    // Function keys, after the fashion of the old typing adventures.
    if (key === 'F1') this.pageOut('How to play', this.sim.text('help').split('\n'));
    else if (key === 'F2') {
      const on = !(this.settings.music || this.settings.sound);
      this.settings.music = this.settings.sound = on;
      this.store.set('thanes-quest:settings', JSON.stringify(this.settings));
      this.noteText = on ? 'Sound on.' : 'Sound off.';
      this.noteUntil = this.uiTick + 50;
    } else if (key === 'F3') this.input = this.last.slice(0, MAX_INPUT);
    else if (key === 'F4') this.queue.push({ t: 'say', line: 'map' });
    else if (key === 'Control') this.queue.push({ t: 'attack' });
    else if (key === 'Shift') this.queue.push({ t: 'block', on: true });
    // Space on an empty line is a second attack key, for keyboards where Ctrl+arrow is taken.
    else if (key === ' ' && !this.input) this.queue.push({ t: 'attack' });
    else if (key === 'Tab') {
      const pg = inventoryPage(this.sim);
      this.pageOut(pg.title, pg.lines);
    } else if (key === 'Escape') this.menu();
    else if (key === 'Enter') this.submit(this.input || this.last);
    else if (key === 'Backspace') this.input = this.input.slice(0, -1);
    else if (key.length === 1 && this.input.length < MAX_INPUT) this.input += key;
    else return false;
    return true;
  }

  keyUp(key: string): void {
    this.held.delete(key);
    if (key === 'Shift') this.queue.push({ t: 'block', on: false });
  }

  /** Forget held keys, for when the window loses focus. */
  release(): void {
    this.held.clear();
  }

  /** Stop the world while the player is looking elsewhere: it is a poor time to be bitten. */
  pause(): void {
    this.held.clear();
    this.tapDir = [0, 0];
    if (this.modal || this.sim.p.dead || this.sim.state.tick === 0) return;
    this.list('Paused', ['Resume'], () => {});
  }

  /** A typed line. A few commands belong to the player's side and never reach the simulation. */
  submit(line: string): void {
    this.input = '';
    if (!line.trim()) return;
    this.last = line;
    const r = this.sim.parser.parse(line);
    const verb = r.ok ? r.verb : '';
    if (verb === 'save') this.saveMenu();
    else if (verb === 'restore') this.restoreMenu(false);
    else if (verb === 'restart') this.confirmRestart();
    else if (verb === 'help') this.pageOut('How to play', this.sim.text('help').split('\n'));
    else if (verb === 'quit') this.menu();
    else this.queue.push({ t: 'say', line });
  }

  /**
   * Things worth doing right here, as ready-made commands: who to talk to, what to pick up or
   * examine, which spells and words are to hand. Touch screens show these as buttons.
   */
  suggest(): { label: string; line: string }[] {
    if (this.modal) return [];
    const sim = this.sim;
    const p = sim.p;
    const c = this.content;
    const out: { label: string; line: string }[] = [];
    const dist = (x: number, y: number): number => Math.hypot(p.x - x, (p.y - y) * 2);
    const who = sim.rs.actors
      .filter((a) => a.kind === 'npc' && c.chars[a.ref] && dist(a.x, a.y) <= 48)
      .sort((a, b) => dist(a.x, a.y) - dist(b.x, b.y))[0];
    if (who) out.push({ label: `Talk to ${c.chars[who.ref].name}`, line: `talk to ${c.chars[who.ref].nouns[0]}` });
    const close = sim.things().filter((t) => dist(t.x, t.y) <= (t.reach ?? 30));
    for (const t of close) {
      if (t.take) out.push({ label: `Take the ${t.nouns[0]}`, line: `take ${t.nouns[0]}` });
      for (const line of t.try ?? []) out.push({ label: line[0].toUpperCase() + line.slice(1), line });
    }
    out.push({ label: 'Look around', line: 'look' });
    if (sim.room.scene.kind === 'outdoor') out.push({ label: 'Map', line: 'map' });
    if (p.inv.potion && p.hp < p.maxHp * 0.6) out.push({ label: 'Drink a draught', line: 'drink potion' });
    if (p.inv.torch && sim.isDark()) out.push({ label: 'Light the torch', line: 'light torch' });
    const spare = p.other && p.inv[p.other] ? c.items[p.other] : null;
    if (spare) out.push({ label: `Ready the ${spare.name}`, line: 'swap' });
    for (const [id, n] of Object.entries(p.inv)) {
      // Things carried that are worth using where the player now stands, as the game's data marks them.
      const it = c.items[id];
      if (n > 0 && it?.offer && all(sim, it.offer.if)) out.push({ label: it.offer.label, line: it.offer.say });
    }
    for (const id of p.spells) out.push({ label: `Cast ${c.spells[id]?.name ?? id}`, line: `cast ${id}` });
    for (const w of Object.values(c.words)) if (p.words.includes(w.id) && !(p.cd[w.id] > 0)) out.push({ label: w.verb.toUpperCase(), line: w.verb });
    const seen = new Set<string>();
    return out.filter((o) => !seen.has(o.line) && seen.add(o.line)).slice(0, 10);
  }

  private fightUntil = 0;

  /** Which tune suits this moment: the title, a fight, or wherever the player is standing. */
  musicCue(): string {
    const { cues } = this.content;
    if (this.modals.some((m) => m.k === 'list' && m.banner)) return cues.title;
    const sim = this.sim;
    const p = sim.p;
    // A fight is on while something hostile is close or mid-swing; the music lingers a little after.
    const pressed = !p.dead && sim.rs.actors.some((a) => hostile(sim, a) && (a.ai.atk > 0 || Math.hypot(a.x - p.x, (a.y - p.y) * 2) < 120));
    if (pressed) this.fightUntil = this.uiTick + 70;
    if (this.uiTick < this.fightUntil) return cues.boss && sim.rs.actors.some((a) => hostile(sim, a) && this.content.enemies[a.ref]?.ai === 'boss') ? cues.boss : cues.battle;
    // Out of doors after dark, the night has its own music.
    if (cues.night && sim.room.scene.kind === 'outdoor' && sim.daylight() < 0.3) return cues.night;
    return sim.room.music ?? cues.fallback;
  }

  /** The conversation menu: what this character can be asked, sold or given right now. */
  private openTalk(): void {
    const id = this.talkingTo!;
    const def = this.content.chars[id];
    const options = (def?.menu ?? []).filter((m) => all(this.sim, m.if));
    if (!def || !options.length || !this.sim.isNear(id, 60)) {
      this.talkingTo = null;
      return;
    }
    const leave = (): void => void (this.talkingTo = null);
    this.modals.push({
      k: 'list', title: def.name, items: [...options.map((o) => this.sim.fill(o.label)), 'Farewell'], sel: Math.min(this.talkSel, options.length), cancel: true, onCancel: leave,
      pick: (i) => {
        this.talkSel = i;
        if (i >= options.length) leave();
        else this.queue.push({ t: 'say', line: options[i].say });
      },
    });
  }

  // -------------------------------------------------------------------------------------------
  // Menus and saving

  private menu(): void {
    const rows: [string, () => void][] = [
      ['Resume', () => {}],
      ['Map', () => this.queue.push({ t: 'say', line: 'map' })],
      ['Journal', () => this.queue.push({ t: 'say', line: 'journal' })],
      ['Skills', () => this.queue.push({ t: 'say', line: 'skills' })],
      ['Deeds', () => this.queue.push({ t: 'say', line: 'deeds' })],
      ['Save game', () => this.saveMenu()],
      ['Restore game', () => this.restoreMenu(false)],
      ['Settings', () => this.settingsMenu()],
      ['How to play', () => this.pageOut('How to play', this.sim.text('help').split('\n'))],
      ['Start again', () => this.confirmRestart()],
    ];
    this.list(this.content.title, rows.map((r) => r[0]), (i) => rows[i][1]());
  }

  private settingsMenu(sel = 0): void {
    const s = this.settings;
    const flip = (k: 'music' | 'sound' | 'tapToWalk') => (i: number): void => {
      s[k] = !s[k];
      this.tapDir = [0, 0];
      this.store.set('thanes-quest:settings', JSON.stringify(s));
      // Back to the same row, so a setting can be flipped to and fro.
      this.settingsMenu(i);
    };
    const rows: [string, (i: number) => void][] = [
      [`Music: ${s.music ? 'on' : 'off'}`, flip('music')],
      [`Sound effects: ${s.sound ? 'on' : 'off'}`, flip('sound')],
      [`Walking: ${s.tapToWalk ? 'tap to start and stop' : 'hold the key'}`, flip('tapToWalk')],
      [
        `Fights: ${this.sim.state.flags.gentle ? 'gentle' : 'fair'}`,
        (i) => {
          // This one belongs to the game in progress, and is saved with it.
          const gentle = !this.sim.state.flags.gentle;
          this.sim.state.flags.gentle = gentle;
          this.queue.push({ t: 'ease', gentle });
          this.settingsMenu(i);
        },
      ],
      ['Back', () => this.menu()],
    ];
    this.list('Settings', rows.map((r) => r[0]), (i) => rows[i][1](i));
    const m = this.modals[0];
    if (m.k === 'list') {
      m.sel = sel;
      m.onCancel = () => this.menu();
    }
  }

  private read(slot: string): SaveFile | null {
    try {
      const f = JSON.parse(this.store.get(`thanes-quest:save:${slot}`) ?? 'null') as SaveFile | null;
      // Saves from an incompatible build, or pointing at a room that no longer exists, count as empty.
      const ok = f && f.v === 1 && f.state?.v === 1 && f.content === this.content.saveVersion && !!roomOf(this.content, f.state.room);
      return ok ? f : null;
    } catch {
      return null;
    }
  }

  save(slot: string, quiet = false): void {
    const st = this.sim.state;
    if (st.player.dead) return;
    const label = `${this.sim.room.name}, score ${st.score}`;
    this.store.set(`thanes-quest:save:${slot}`, JSON.stringify({ v: 1, content: this.content.saveVersion, label, state: st } satisfies SaveFile));
    if (!quiet) this.message(this.sim.text('saved'));
  }

  restore(slot: string): boolean {
    const f = this.read(slot);
    if (!f) return false;
    this.fresh(f.state);
    return true;
  }

  private slotLabels(withAuto: boolean): { ids: string[]; labels: string[] } {
    const ids = withAuto ? ['auto', 'safe', ...SLOTS] : SLOTS;
    const names: Record<string, string> = { auto: 'Last room', safe: 'Last safe place' };
    const labels = ids.map((id) => `${names[id] ?? id}: ${this.read(id)?.label ?? 'empty'}`);
    return { ids, labels };
  }

  private saveMenu(): void {
    const { ids, labels } = this.slotLabels(false);
    this.list('Save to which slot?', labels, (i) => this.save(ids[i]));
  }

  private restoreMenu(afterDeath: boolean): void {
    const { ids, labels } = this.slotLabels(true);
    const back = (): void => {
      if (!afterDeath) return;
      // Dead players must choose again; there is no game to go back to.
      this.modals.push({
        k: 'list', title: this.sim.text('deathPrompt'), items: ['Restore a saved game', 'Start again'], sel: 0, cancel: false,
        pick: (i) => (i === 0 ? this.restoreMenu(true) : this.restart()),
      });
    };
    this.list('Restore which game?', [...labels, 'Never mind'], (i) => {
      if (i >= ids.length || !this.restore(ids[i])) {
        if (i < ids.length) this.message(this.sim.text('emptySlot'));
        back();
      }
    }, false);
  }

  private confirmRestart(): void {
    this.list('Start again from the beginning?', ['No', 'Yes'], (i) => i === 1 && this.restart());
  }

  restart(): void {
    this.fresh();
  }
}
