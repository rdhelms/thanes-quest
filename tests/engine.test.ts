import { describe, expect, it } from 'vitest';
import * as combat from '../src/engine/combat';
import { gainSkill, hurtPlayer, levelNeed } from '../src/engine/combat';
import { Parser, matches } from '../src/engine/parser';
import { Shell } from '../src/engine/shell';
import { Sim } from '../src/engine/sim';
import type { ActorState, Intent } from '../src/engine/types';
import { validate } from '../src/engine/validate';
import { behaviours } from '../src/game/behaviours';
import { content } from '../src/game/content';
import { game, type, walk } from './helpers';

function memoryStore(): { get(k: string): string | null; set(k: string, v: string): void } {
  const m = new Map<string, string>();
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v) };
}

describe('content', () => {
  it('passes validation', () => {
    expect(validate(content)).toEqual([]);
  });

  it('is rejected when broken', () => {
    const bad = structuredClone(content);
    bad.rooms.village.things!.push({ id: 'ghost', nouns: ['phantasm'], x: 10, y: 10, look: '' });
    bad.rooms.village.exits = { w: 'nowhere' };
    bad.rooms.ford.scene.props.push({ t: 'gazebo', x: 1, y: 1 });
    const errs = validate(bad).join('\n');
    expect(errs).toContain('"phantasm" is not in the vocabulary');
    expect(errs).toContain('unknown room "nowhere"');
    expect(errs).toContain('thing "ghost" cannot be reached');
    expect(errs).toContain('unknown prop "gazebo"');
  });
});

describe('parser', () => {
  const p = new Parser(content.vocab);

  it('reduces synonyms and drops filler words', () => {
    expect(p.parse('Examine the WELL, please')).toEqual({ ok: true, verb: 'look', nouns: ['well'] });
    expect(p.parse('pick up the firewood')).toEqual({ ok: true, verb: 'take', nouns: ['woodpile'] });
    expect(p.parse('ask the woman about the elder')).toEqual({ ok: true, verb: 'ask', nouns: ['sigga', 'elder'] });
    expect(p.parse('read the standing stone')).toEqual({ ok: true, verb: 'read', nouns: ['menhir'] });
  });

  it('reports unknown words and missing verbs', () => {
    expect(p.parse('defenestrate well')).toEqual({ ok: false, why: 'unknown', word: 'defenestrate' });
    expect(p.parse('the well')).toEqual({ ok: false, why: 'noverb', nouns: ['well'] });
    expect(p.parse('   ')).toEqual({ ok: false, why: 'empty' });
  });

  it('matches patterns', () => {
    expect(matches('open door', 'open', ['door'])).toBe(true);
    expect(matches('open door', 'open', [])).toBe(false);
    expect(matches('take log|woodpile', 'take', ['woodpile'])).toBe(true);
    expect(matches('ask sigga *', 'ask', ['sigga', 'elder'])).toBe(true);
    expect(matches('dance', 'dance', ['well'])).toBe(false);
  });
});

describe('simulation', () => {
  it('describes the room and the things in it', () => {
    const sim = game();
    expect(type(sim, 'look')).toEqual([content.rooms.ford.look]);
    expect(type(sim, 'look at the bridge')[0]).toContain('handrails');
    expect(type(sim, 'look well')).toEqual([content.text.notHere]);
  });

  it('requires being close to take things, and scores once', () => {
    const sim = game('village', 160, 160);
    expect(type(sim, 'take wood')).toEqual(['You are not close enough.']);
    sim.p.x = 146;
    sim.p.y = 124;
    const score = sim.state.score;
    expect(type(sim, 'take wood')[0]).toContain('You take a split log');
    expect(sim.p.inv.log).toBe(1);
    expect(sim.state.score).toBe(score + 1);
    expect(type(sim, 'take wood')[0]).toContain('One log is plenty');
    expect(sim.state.score).toBe(score + 1);
  });

  it('holds a conversation', () => {
    const sim = game('village', 160, 160);
    const who = sim.rs.actors.find((a) => a.ref === 'sigga')!;
    sim.p.x = who.x - 20;
    sim.p.y = who.y;
    expect(type(sim, 'talk to woman')[0]).toContain('I am Sigga');
    expect(type(sim, 'talk to woman')[0]).toContain('Still here');
    expect(type(sim, 'ask sigga about the barrow')[0]).toContain('old mound');
    expect(type(sim, 'ask sigga about snow')[0]).toContain('I would not know');
  });

  it('cannot cross the river except by the bridge', () => {
    const sim = game();
    sim.p.x = 80;
    walk(sim, 0, -1, 200);
    expect(sim.state.room).toBe('ford');
    expect(sim.p.y).toBeGreaterThan(130);
    sim.p.x = 160;
    sim.p.y = 160;
    sim.step([{ t: 'move', dx: 0, dy: -1 }]);
    for (let i = 0; i < 200 && sim.state.room === 'ford'; i++) sim.step();
    expect(sim.state.room).toBe('village');
    expect(sim.p.y).toBeGreaterThan(150);
  });

  it('goes through doors and comes back out where it went in', () => {
    const sim = game('village', 69, 130);
    walk(sim, 0, -1, 30);
    // Still holding "up" on arrival must not carry the player back out.
    expect(sim.state.room).toBe('hall');
    expect(sim.p.y).toBe(112);
    walk(sim, 0, -1, 30);
    expect(sim.state.room).toBe('village');
    expect(Math.abs(sim.p.x - 69)).toBeLessThan(6);
  });

  it('keeps a sealed door sealed until the right word is spoken', () => {
    const sim = game('barrow', 160, 130);
    walk(sim, 0, -1, 30);
    expect(sim.state.room).toBe('barrow');
    expect(type(sim, 'veth')).toEqual([content.text.wordUnknown]);
    sim.teach('word:veth');
    expect(type(sim, 'veth')[0]).toContain('slides down into the earth');
    expect(sim.state.flags['barrow.open']).toBe(true);
    walk(sim, 0, 1, 6);
    walk(sim, 0, -1, 30);
    expect(sim.state.room).toBe('ante');
  });

  it('has puzzles that can kill', () => {
    const sim = game('tarn', 124, 160);
    sim.step([{ t: 'move', dx: 0, dy: -1 }]);
    let died = '';
    for (let i = 0; i < 60 && !died; i++) {
      sim.step();
      for (const e of sim.drain()) if (e.t === 'died') died = e.text;
    }
    expect(died).toContain('CRACK');
    const tick = sim.state.tick;
    walk(sim, 1, 0, 10);
    expect(sim.state.tick).toBe(tick);

    const safe = game('tarn', 124, 160);
    safe.teach('word:iska');
    expect(type(safe, 'iska')[0]).toContain('thickens');
    walk(safe, 0, -1, 24);
    expect(safe.p.dead).toBe(false);
    expect(type(safe, 'take amulet')[0]).toContain('chip the amulet free');
  });

  it('is deterministic and survives a save and restore', () => {
    const script: Intent[][] = [];
    for (let i = 0; i < 900; i++) {
      const it: Intent[] = [];
      if (i === 5) it.push({ t: 'move', dx: 0, dy: -1 });
      if (i === 120) it.push({ t: 'move', dx: -1, dy: 0 });
      if (i === 90) it.push({ t: 'say', line: 'dance' }, { t: 'attack' });
      if (i === 300) it.push({ t: 'say', line: 'flibber' });
      script.push(it);
    }
    const a = new Sim(content, { seed: 7, behaviours });
    const b = new Sim(content, { seed: 7, behaviours });
    script.forEach((it) => a.step(it));
    script.slice(0, 250).forEach((it) => b.step(it));
    // Save b mid-run, restore into a third simulation, and finish the script there.
    const c = new Sim(content, { saved: JSON.parse(JSON.stringify(b.state)), behaviours });
    script.slice(250).forEach((it) => c.step(it));
    expect(c.state).toEqual(a.state);
    // The script walks north into the village, then west through the wolves and out past the
    // edge of the hand-made map, so fighting and generated country are both covered.
    expect(a.state.room).toMatch(/^wild_/);
  });
});

describe('shell', () => {
  it('pauses for messages, takes typed commands, and saves', () => {
    const store = memoryStore();
    const shell = new Shell(content, store, false, behaviours);
    expect(shell.modal?.k).toBe('msg');
    const before = shell.sim.state.tick;
    shell.tick();
    expect(shell.sim.state.tick).toBe(before);
    shell.keyDown('Enter');
    expect(shell.modal).toBeUndefined();

    for (const ch of 'look') shell.keyDown(ch);
    expect(shell.input).toBe('look');
    shell.keyDown('Enter');
    shell.tick();
    expect(shell.modal).toEqual({ k: 'msg', text: content.rooms.ford.look });
    shell.keyDown('Enter');

    shell.keyDown('ArrowLeft');
    for (let i = 0; i < 10; i++) shell.tick();
    shell.keyUp('ArrowLeft');
    const x = shell.sim.p.x;
    expect(x).toBeLessThan(content.start.x);

    shell.save('Slot 1', true);
    shell.restart();
    expect(shell.sim.p.x).toBe(content.start.x);
    expect(shell.restore('Slot 1')).toBe(true);
    expect(shell.sim.p.x).toBe(x);
    expect(shell.restore('Slot 3')).toBe(false);
  });

  it('offers a choice of what to raise on gaining a level', () => {
    const shell = new Shell(content, memoryStore(), false, behaviours);
    shell.keyDown('Enter');
    gainSkill(shell.sim, 'blade', 400);
    shell.tick();
    while (shell.modal?.k !== 'list') shell.keyDown('Enter');
    expect(shell.modal.items).toEqual(['Health', 'Mana', 'Stamina']);
    shell.keyDown('ArrowDown');
    shell.keyDown('Enter');
    shell.tick();
    expect(shell.sim.p.maxMp).toBe(30);
  });
});

/** A fresh game in the pinewood with one stunned wolf in front of the player. */
function arena(): { sim: Sim; foe: ActorState } {
  const sim = game('pinewood', 200, 132);
  sim.p.dir = 'right';
  const foe = sim.rs.actors.find((a) => a.id === 'wolf1')!;
  sim.rs.actors = [foe];
  foe.x = sim.p.x + 16;
  foe.y = sim.p.y;
  foe.ai.stun = 1000;
  return { sim, foe };
}

describe('combat', () => {
  it('lands a swing on what is in front of the player, and only that', () => {
    const { sim, foe } = arena();
    sim.give('sword');
    type(sim, 'equip sword');
    const hp = foe.hp;
    sim.step([{ t: 'attack' }]);
    for (let i = 0; i < 8; i++) sim.step();
    expect(foe.hp).toBeLessThan(hp);
    expect(sim.p.skills.blade.xp + sim.p.skills.blade.lv).toBeGreaterThan(5);

    const after = foe.hp;
    sim.p.dir = 'left';
    foe.x = sim.p.x + 16;
    sim.step([{ t: 'attack' }]);
    for (let i = 0; i < 8; i++) sim.step();
    expect(foe.hp).toBe(after);
  });

  it('kills, and the kill is remembered when the room is re-entered', () => {
    const { sim, foe } = arena();
    sim.give('sword');
    type(sim, 'equip sword');
    for (let i = 0; i < 400 && foe.act !== 'dead'; i++) {
      foe.x = sim.p.x + 16;
      foe.y = sim.p.y;
      sim.step(i % 10 === 0 ? [{ t: 'attack' }] : []);
    }
    expect(foe.act).toBe('dead');
    expect(sim.state.flags['wolves.killed']).toBe(1);
    sim.enterRoom('pinewood', 200, 132);
    expect(sim.rs.actors.filter((a) => a.kind === 'enemy').map((a) => a.id)).toEqual(['wolf2']);
  });

  it('is deadly to stand around in', () => {
    const sim = game('pinewood', 200, 132);
    let died = '';
    for (let i = 0; i < 3000 && !died; i++) {
      sim.step();
      for (const e of sim.drain()) if (e.t === 'died') died = e.text;
    }
    expect(died).toContain('wolf');
  });

  it('blocks blows from the front', () => {
    const { sim } = arena();
    hurtPlayer(sim, 10, sim.p.x + 10, sim.p.y, 'x');
    const open = 40 - sim.p.hp;
    sim.p.hp = 40;
    sim.p.hurtT = 0;
    sim.p.blocking = true;
    hurtPlayer(sim, 10, sim.p.x + 10, sim.p.y, 'x');
    expect(40 - sim.p.hp).toBeLessThan(open / 2);
    expect(sim.p.skills.block.xp).toBeGreaterThan(0);
    // From behind, the guard does nothing.
    sim.p.hp = 40;
    sim.p.hurtT = 0;
    hurtPlayer(sim, 10, sim.p.x - 10, sim.p.y, 'x');
    expect(40 - sim.p.hp).toBe(open);
  });

  it('turns practice into skill and skill into levels', () => {
    const sim = game();
    gainSkill(sim, 'blade', 18);
    expect(sim.p.skills.blade.lv).toBe(6);
    gainSkill(sim, 'blade', 400);
    expect(sim.p.level).toBeGreaterThan(1);
    expect(sim.p.pendingLevels).toBe(sim.p.level - 1);
    expect(sim.p.xp).toBeLessThan(levelNeed(sim.p.level));
    sim.step([{ t: 'level', pool: 'hp' }]);
    expect(sim.p.maxHp).toBe(50);
    expect(sim.p.pendingLevels).toBe(sim.p.level - 2);
  });
});

describe('magic', () => {
  it('learns a spell from a tome and casts it', () => {
    const { sim, foe } = arena();
    expect(type(sim, 'cast flame')).toEqual([content.text.noSpell]);
    sim.give('tomeFlame');
    expect(type(sim, 'read the book')[0]).toContain('how fire is spoken to');
    expect(sim.p.spells).toEqual(['flame']);
    expect(sim.p.skills.lore.lv).toBeGreaterThan(5);
    foe.x = sim.p.x + 60;
    const hp = foe.hp;
    type(sim, 'cast flame');
    expect(sim.p.mp).toBeLessThan(20);
    expect(sim.rs.shots.length).toBe(1);
    for (let i = 0; i < 20; i++) sim.step();
    expect(foe.hp).toBeLessThan(hp);
    expect(sim.rs.shots.length).toBe(0);
    sim.p.mp = 0;
    expect(type(sim, 'cast flame')).toEqual([content.text.noMana]);
  });

  it('speaks runewords only once learned, and then only so often', () => {
    const { sim, foe } = arena();
    expect(type(sim, 'veth')).toEqual([content.text.wordUnknown]);
    sim.teach('word:veth');
    const x = foe.x;
    expect(type(sim, 'Veth!')).toEqual([]);
    expect(foe.x).toBeGreaterThan(x + 20);
    expect(sim.p.cd['word:veth']).toBeGreaterThan(200);
    expect(type(sim, 'veth')).toEqual([content.text.wordTired]);
  });

  it('needs light in dark places', () => {
    const sim = game('sleepers', 60, 130);
    sim.rs.actors = [];
    expect(sim.isDark()).toBe(true);
    expect(type(sim, 'look')).toEqual([content.text.dark]);
    sim.teach('light');
    type(sim, 'cast light');
    expect(sim.isDark()).toBe(false);
    expect(type(sim, 'look')).toEqual([content.rooms.sleepers.look]);
  });
});

describe('things found in QA', () => {
  it('splits long messages across boxes that each fit', () => {
    const shell = new Shell(content, memoryStore(), false, behaviours);
    shell.modals = [];
    const win = content.rooms.hall.rules!.flatMap((r) => r.do).find((e) => 'win' in e) as { win: string };
    shell.message(win.win);
    expect(shell.modals.length).toBeGreaterThan(1);
    for (const m of shell.modals) {
      if (m.k !== 'msg') throw new Error('expected a message');
      expect(m.text.split('\n').length).toBeLessThanOrEqual(14);
    }
    const boxes = shell.modals.flatMap((m) => (m.k === 'msg' ? [m] : []));
    expect(boxes[0].more).toBe(true);
    expect(boxes[boxes.length - 1].more).toBe(false);
    expect(boxes.map((m) => m.text).join(' ')).toContain('THANE');
  });

  it('says so when the person you name is somewhere else', () => {
    const sim = game('village', 160, 160);
    expect(type(sim, 'talk to elder')).toEqual([content.text.personAway]);
    // Asking whoever is nearby about her is a different thing.
    const who = sim.rs.actors.find((a) => a.ref === 'sigga')!;
    sim.p.x = who.x - 20;
    sim.p.y = who.y;
    expect(type(sim, 'ask about the elder')[0]).toContain('Marta Coldhand');
    expect(type(sim, 'talk to the woman')[0]).toContain('Sigga');
  });

  it('lets a runeword be spoken as well as typed bare', () => {
    for (const line of ['say veth', 'shout VETH!', 'speak veth']) {
      const sim = game('barrow', 160, 126);
      sim.teach('word:veth');
      expect(type(sim, line)[0], line).toContain('slides down into the earth');
    }
  });

  it('answers compass words and lists exits', () => {
    const sim = game();
    expect(type(sim, 'north')[0]).toContain('Hollowmere');
    expect(type(sim, 'go west')[0]).toContain('Bandit Camp');
    expect(type(sim, 's')[0]).toContain('To the south lies');
    expect(type(game('barrow', 160, 130), 'n')).toEqual([content.text.noWay.replace('%s', 'north')]);
    const exits = type(sim, 'exits')[0];
    expect(exits).toContain('North: Hollowmere.');
    expect(exits).toContain('East: The Old Watchtower.');
    expect(type(game('hall', 160, 130), 'leave')[0]).toContain('A door to: Hollowmere.');
  });

  it('reminds the player what to do next', () => {
    const sim = game();
    expect(type(sim, 'think')).toEqual([content.text.noHint]);
    sim.setQuest('hearth', 1);
    sim.drain();
    expect(type(sim, 'hint')[0]).toContain('The Cold Hearth: Elder Marta wants');
  });

  it('understands the phrasings players actually try', () => {
    const lines: [string, string, string][] = [
      ['ante', 'push the wolf carving', 'You are not close enough.'],
      ['inn', 'buy healing potion', 'six silver'],
      ['inn', 'rent room', 'Four silver'],
      ['hut', 'ask fenn about magic', 'two kinds'],
      ['village', 'unequip', 'already empty'],
      ['village', 'sell hatchet', 'silver to spare'],
      ['tarn', 'freeze lake', 'With what?'],
    ];
    for (const [room, line, expected] of lines) {
      const sim = game(room, 160, 130);
      const who = sim.rs.actors.find((a) => a.kind === 'npc');
      if (who) Object.assign(sim.p, { x: who.x - 16, y: who.y + 4 });
      expect(type(sim, line).join(' '), `${room}: ${line}`).toContain(expected);
    }
  });

  it('uses Space to attack only when nothing is being typed', () => {
    const shell = new Shell(content, memoryStore(), false, behaviours);
    shell.modals = [];
    shell.keyDown(' ');
    shell.tick();
    expect(shell.sim.p.act).toBe('swing');
    expect(shell.input).toBe('');
    for (const ch of 'look at') shell.keyDown(ch);
    expect(shell.input).toBe('look at');
  });

  it('ignores saved games from an incompatible build', () => {
    const store = memoryStore();
    const shell = new Shell(content, store, false, behaviours);
    shell.save('Slot 1', true);
    expect(shell.restore('Slot 1')).toBe(true);
    const file = JSON.parse(store.get('thanes-quest:save:Slot 1')!);
    store.set('thanes-quest:save:Slot 1', JSON.stringify({ ...file, content: 0 }));
    expect(shell.restore('Slot 1')).toBe(false);
    store.set('thanes-quest:save:Slot 1', JSON.stringify({ ...file, state: { ...file.state, room: 'atlantis' } }));
    expect(shell.restore('Slot 1')).toBe(false);
  });
});

describe('conversation, hints and first run', () => {
  it('offers only a new game to someone who has never played', () => {
    const store = memoryStore();
    const fresh = new Shell(content, store, false, behaviours);
    fresh.showTitle();
    const title = fresh.modal;
    if (title?.k !== 'list') throw new Error('expected the title menu');
    expect(title.items).toEqual(['Begin a new saga']);

    // Play into the next room, which autosaves; a later visit may continue from there.
    fresh.modals = [];
    fresh.sim.enterRoom('village', 160, 160);
    fresh.sim.step();
    fresh.tick();
    const back = new Shell(content, store, false, behaviours);
    back.showTitle();
    const again = back.modal;
    if (again?.k !== 'list') throw new Error('expected the title menu');
    expect(again.items).toEqual(['Begin a new saga', 'Continue: Hollowmere, score 1']);
    // Simply opening the game again must not have replaced that save with a fresh start.
    back.keyDown('Enter');
    expect(back.sim.state.room).toBe('village');
  });

  it('runs a conversation as a menu of things to say', () => {
    const shell = new Shell(content, memoryStore(), false, behaviours);
    shell.modals = [];
    shell.sim.enterRoom('village', 104, 156);
    shell.sim.drain();
    shell.submit('talk to smith');
    shell.tick();
    const first = shell.modal;
    if (first?.k !== 'msg') throw new Error('expected speech');
    expect(first.who).toBe('Odd the smith');
    expect(first.text).toContain('Forge is dead');
    shell.keyDown('Enter');
    shell.tick();
    const menu = shell.modal;
    if (menu?.k !== 'list') throw new Error('expected the conversation menu');
    expect(menu.title).toBe('Odd the smith');
    expect(menu.items).toEqual(['Buy the iron sword (25 silver)', 'Buy the round shield (15 silver)', 'Buy the mail shirt (45 silver)', 'The dead forge', 'The barrow', 'Farewell']);

    // Buying from the menu works, and the bought thing leaves the menu.
    shell.sim.p.gold = 30;
    shell.keyDown('Enter');
    shell.tick();
    expect(shell.sim.p.inv.sword).toBe(1);
    expect(shell.sim.p.weapon).toBe('sword');
    while (shell.modal?.k === 'msg') shell.keyDown('Enter');
    shell.tick();
    const after = shell.modal;
    if (after?.k !== 'list') throw new Error('expected the menu again');
    expect(after.items[0]).toBe('Buy the round shield (15 silver)');
    shell.keyDown('Escape');
    shell.tick();
    expect(shell.modal).toBeUndefined();
  });

  it('keeps instructions out of mouths', () => {
    const spoken: string[] = [];
    const collect = (t: unknown): void => {
      if (typeof t === 'string') spoken.push(t);
      else if (Array.isArray(t)) t.forEach((b) => spoken.push((b as { say: string }).say));
    };
    for (const ch of Object.values(content.chars)) {
      collect(ch.talk);
      Object.values(ch.topics ?? {}).forEach(collect);
      if (ch.shrug) spoken.push(ch.shrug);
    }
    // What the Elder and the people of the steadings say through the game's text counts too.
    for (const [key, line] of Object.entries(content.text)) if (key.startsWith('bounty.') || key.startsWith('rumour.')) spoken.push(line);
    // Command words in capitals, key names, and "type"/"ask me about" are the tell-tales.
    const manual = /\b(TYPE|EQUIP|READ|CAST|BUY|GIVE|SLEEP|LIGHT|TALK|ASK|LOOK|TAKE|Shift|Ctrl|Tab|Enter)\b|[Aa]sk me about|\(Type/;
    expect(spoken.filter((s) => manual.test(s))).toEqual([]);
    expect(spoken.length).toBeGreaterThan(80);
  });

  it('readies a first or better weapon without being told', () => {
    const sim = game('village', 160, 160);
    sim.give('hatchet');
    expect(sim.p.weapon).toBe('hatchet');
    sim.give('sword');
    expect(sim.p.weapon).toBe('sword');
    sim.give('bow');
    expect(sim.p.weapon).toBe('sword');
    sim.give('shield');
    expect(sim.p.shield).toBe('shield');
  });

  it('suggests what can be done where the player stands', () => {
    const shell = new Shell(content, memoryStore(), false, behaviours);
    shell.modals = [];
    shell.sim.enterRoom('village', 172, 126);
    shell.sim.drain();
    shell.modals = [];
    const lines = shell.suggest().map((s) => s.line);
    expect(lines).toContain('take hatchet');
    expect(lines).toContain('look');
    shell.sim.p.x = 220;
    shell.sim.p.y = 156;
    expect(shell.suggest()[0]).toEqual({ label: 'Talk to Sigga', line: 'talk to sigga' });
    shell.sim.teach('flame');
    shell.sim.teach('word:veth');
    expect(shell.suggest().map((s) => s.label)).toEqual(expect.arrayContaining(['Cast Flame', 'VETH']));
  });
});

describe('the frontier', () => {
  it('generates country beyond the map that is sound and always the same', async () => {
    const { roomOf, wildId } = await import('../src/engine/frontier');
    const { buildScene } = await import('../src/engine/build');
    const { blockedEdges, canReach, reachable } = await import('../src/engine/walk');
    const parser = new Parser(content.vocab);
    const back = { n: 's', s: 'n', e: 'w', w: 'e' } as const;
    const names = new Set<string>();
    for (const [x, y] of [[0, 2], [-2, 0], [2, 1], [1, -2], [-2, -2], [3, 3], [0, 5], [-7, 2], [12, -9], [40, 40]]) {
      const id = wildId(x, y);
      const r = roomOf(content, id)!;
      expect(r, id).toBeDefined();
      names.add(r.name);
      // Every way out leads somewhere that leads back.
      for (const [side, to] of Object.entries(r.exits ?? {}) as ['n' | 's' | 'e' | 'w', string][])
        expect(roomOf(content, to)?.exits?.[back[side]], `${id} ${side} -> ${to}`).toBe(id);
      // It can be walked across, and everything in it can be reached.
      const seen = reachable(buildScene(r.scene), 160, 137);
      expect(blockedEdges(seen, r.scene.walkTop, Object.keys(r.exits ?? {}).join('')), id).toEqual([]);
      for (const t of r.things ?? []) {
        expect(canReach(seen, t.x, t.y, t.reach ?? 30), `${id} ${t.id}`).toBe(true);
        for (const n of t.nouns) expect(parser.hasNoun(n), `${id} noun ${n}`).toBe(true);
        for (const line of t.try ?? []) expect(parser.parse(line).ok, line).toBe(true);
      }
      for (const s of r.spawns ?? []) expect(content.enemies[s.kind], s.kind).toBeDefined();
      // A different copy of the content generates the identical room.
      expect(roomOf(structuredClone(content), id)).toEqual(r);
    }
    expect(names.size).toBeGreaterThan(6);
    // Further out is harder.
    expect(roomOf(content, wildId(0, 2))!.spawns![0].level).toBe(0);
    expect(roomOf(content, wildId(0, 9))!.spawns![0].level).toBeGreaterThan(4);
    // Cells that hold a hand-made room are not generated over.
    expect(roomOf(content, wildId(0, 0))).toBeUndefined();
  });

  it('joins the hand-made map at its open edges', () => {
    const sim = game();
    expect(type(sim, 'exits')[0]).toContain('South:');
    sim.step([{ t: 'move', dx: 0, dy: 1 }]);
    for (let i = 0; i < 40 && sim.state.room === 'ford'; i++) sim.step();
    expect(sim.state.room).toBe('wild_0_2');
    const score = sim.state.score;
    expect(score).toBeGreaterThan(0);
    // ...and back again, to the same place.
    sim.rs.actors = [];
    sim.step([{ t: 'move', dx: 0, dy: -1 }]);
    for (let i = 0; i < 200 && sim.state.room !== 'ford'; i++) sim.step();
    expect(sim.state.room).toBe('ford');
    expect(sim.p.y).toBeGreaterThan(150);
  });

  it('brings fallen enemies back after a while, where they are meant to return', () => {
    const sim = game('pinewood', 200, 132);
    const wolf = sim.rs.actors.find((a) => a.id === 'wolf1')!;
    wolf.hp = 0.1;
    wolf.x = sim.p.x + 16;
    wolf.y = sim.p.y;
    wolf.ai.stun = 100;
    sim.p.dir = 'right';
    sim.step([{ t: 'attack' }]);
    for (let i = 0; i < 8; i++) sim.step();
    expect(sim.rs.dead).toContain('wolf1');
    sim.enterRoom('pinewood', 200, 132);
    expect(sim.rs.actors.some((a) => a.id === 'wolf1')).toBe(false);
    sim.state.tick += 2400;
    sim.enterRoom('pinewood', 200, 132);
    expect(sim.rs.actors.some((a) => a.id === 'wolf1')).toBe(true);
  });
});

describe('fighting with some skill', () => {
  it('turns a blow aside entirely if the guard goes up at the last moment', () => {
    const sim = game('pinewood', 200, 132);
    sim.p.dir = 'right';
    const foe = sim.rs.actors.find((a) => a.id === 'wolf1')!;
    sim.rs.actors = [foe];
    sim.step([{ t: 'block', on: true }]);
    hurtPlayer(sim, 10, sim.p.x + 10, sim.p.y, 'x', foe);
    expect(sim.p.hp).toBe(40);
    expect(foe.ai.stun).toBeGreaterThan(20);
    // A guard held for a while only softens the blow.
    sim.p.hurtT = 0;
    sim.state.tick += 30;
    hurtPlayer(sim, 10, sim.p.x + 10, sim.p.y, 'x', foe);
    expect(sim.p.hp).toBeLessThan(40);
    expect(sim.p.hp).toBeGreaterThan(34);
  });

  it('does not let one foe be staggered again and again', () => {
    const sim = game('pinewood', 200, 132);
    const foe = sim.rs.actors.find((a) => a.id === 'wolf1')!;
    sim.rs.actors = [foe];
    foe.hp = 1000;
    const { hitEnemy } = combat;
    hitEnemy(sim, foe, 1, 'blade');
    expect(foe.ai.stun).toBe(6);
    foe.ai.stun = 0;
    hitEnemy(sim, foe, 1, 'blade');
    expect(foe.ai.stun).toBe(0);
  });

  it('grants perks as skills rise, and they do something', () => {
    const sim = game('pinewood', 200, 132);
    expect(combat.hasPerk(sim, 'thrift')).toBe(false);
    sim.p.skills.sorcery.lv = 9;
    sim.p.skills.sorcery.xp = 0;
    sim.drain();
    gainSkill(sim, 'sorcery', 30);
    expect(combat.hasPerk(sim, 'thrift')).toBe(true);
    expect(sim.drain().some((e) => e.t === 'say' && e.text.startsWith('Thrift.'))).toBe(true);
    sim.teach('flame');
    sim.p.mp = 20;
    type(sim, 'cast flame');
    expect(sim.p.mp).toBeCloseTo(20 - 6 * 0.75 + 0.04, 1);
  });

  it('wears armour', () => {
    const sim = game();
    hurtPlayer(sim, 10, sim.p.x, sim.p.y + 5, 'x');
    const bare = 40 - sim.p.hp;
    sim.p.hp = 40;
    sim.p.hurtT = 0;
    sim.give('mail');
    expect(sim.p.armor).toBe('mail');
    hurtPlayer(sim, 10, sim.p.x, sim.p.y + 5, 'x');
    expect(40 - sim.p.hp).toBeCloseTo(bare * 0.75, 5);
  });
});

describe('music', () => {
  it('is well formed: every bar adds up and every part fills its tune', async () => {
    const { validateTune, pitch, parsePart } = await import('../src/engine/tune');
    for (const t of Object.values(content.music)) expect(validateTune(t), t.id).toEqual([]);
    expect(pitch('A4')).toBe(440);
    expect(pitch('C4')).toBeCloseTo(261.63, 1);
    expect(pitch('H9')).toBe(0);
    expect(parsePart('C4:1 [E4 G4]:2 -:1 k:.5', 4).map((e) => [e.at, e.len, e.freqs.length, e.drum])).toEqual([[0, 1, 1, undefined], [1, 2, 2, undefined], [4, 0.5, 0, 'k']]);
    expect(validateTune({ id: 'bad', bpm: 60, beats: 4, bars: 1, parts: [{ inst: 'harp', vol: 1, notes: 'C4:3 |' }] })[0]).toContain('3 beats');
  });

  it('follows the player: a tune for each place, and another for a fight', () => {
    const shell = new Shell(content, memoryStore(), false, behaviours);
    shell.showTitle();
    expect(shell.musicCue()).toBe('valley');
    shell.modals = [];
    shell.sim.enterRoom('inn', 160, 130);
    expect(shell.musicCue()).toBe('hearth');
    shell.sim.enterRoom('pinewood', 200, 132);
    shell.sim.rs.actors.find((a) => a.kind === 'enemy')!.x = 230;
    expect(shell.musicCue()).toBe('battle');
    shell.sim.rs.actors = [];
    expect(shell.musicCue()).toBe('battle');
    shell.uiTick += 100;
    expect(shell.musicCue()).toBe('wild');
  });
});

describe('the turning day', () => {
  it('runs from day through dusk to night and back', async () => {
    const { DAY_LENGTH } = await import('../src/engine/sim');
    const sim = game();
    expect(sim.daylight()).toBe(1);
    const seen: number[] = [];
    for (let t = 0; t < DAY_LENGTH; t += DAY_LENGTH / 48) {
      sim.state.tick = t;
      seen.push(sim.daylight());
    }
    expect(Math.min(...seen)).toBe(0);
    expect(Math.max(...seen)).toBe(1);
    expect(seen.filter((v) => v > 0 && v < 1).length).toBeGreaterThan(4);
    sim.state.tick = DAY_LENGTH;
    expect(sim.daylight()).toBe(1);
  });
});

describe('reading a fight', () => {
  it('shows a blow coming before it lands', () => {
    const sim = game('pinewood', 200, 132);
    const foe = sim.rs.actors.find((a) => a.id === 'wolf1')!;
    sim.rs.actors = [foe];
    foe.x = sim.p.x + 16;
    foe.y = sim.p.y;
    let warned = 0;
    let struckAt = -1;
    for (let i = 0; i < 40 && struckAt < 0; i++) {
      sim.step();
      if (foe.ai.wind > 0) warned++;
      if (sim.p.hp < 40) struckAt = i;
    }
    expect(struckAt).toBeGreaterThan(0);
    // Several ticks of warning: long enough to raise a guard.
    expect(warned).toBeGreaterThanOrEqual(4);
  });
});

describe('answering a blow', () => {
  const duel = (): { sim: Sim; foe: ActorState } => {
    const sim = game('camp', 200, 150);
    const foe = sim.rs.actors.find((a) => a.id === 'bandit1')!;
    sim.rs.actors = [foe];
    foe.x = sim.p.x + 16;
    foe.y = sim.p.y;
    sim.p.dir = 'right';
    return { sim, foe };
  };

  it('parries when the guard goes up after the wind-up has begun, however early', () => {
    const { sim, foe } = duel();
    while (!(foe.ai.wind > 0)) sim.step();
    // Straight away, with most of the wind-up still to come.
    sim.step([{ t: 'block', on: true }]);
    for (let i = 0; i < 20 && !(foe.ai.stun > 0); i++) sim.step();
    expect(sim.p.hp).toBe(40);
    expect(foe.ai.stun).toBeGreaterThan(10);
  });

  it('only blocks when the guard was already up before the wind-up', () => {
    const { sim, foe } = duel();
    foe.ai.cool = 12;
    sim.step([{ t: 'block', on: true }]);
    for (let i = 0; i < 60 && sim.p.hp === 40; i++) sim.step();
    expect(sim.p.hp).toBeLessThan(40);
    expect(sim.p.hp).toBeGreaterThan(36);
    expect(foe.ai.stun ?? 0).toBe(0);
  });

  it('lets a guard be turned to face a new threat', () => {
    const { sim } = duel();
    sim.rs.actors = [];
    sim.step([{ t: 'block', on: true }, { t: 'move', dx: -1, dy: 0 }]);
    const x = sim.p.x;
    sim.step();
    expect(sim.p.dir).toBe('left');
    expect(sim.p.x).toBe(x);
  });

  it('explains the warning the first time one is given', () => {
    const { sim, foe } = duel();
    sim.drain();
    while (!(foe.ai.wind > 0)) sim.step();
    expect(sim.drain().some((e) => e.t === 'note' && e.text.includes('gold !'))).toBe(true);
  });
});

describe('the map', () => {
  it('charts where the player has been and where that leads', async () => {
    const { chart, cellOf } = await import('../src/engine/frontier');
    const sim = game();
    let cells = chart(content, sim.state.flags, sim.state.room);
    expect(cells.filter((c) => c.mark).map((c) => c.name)).toEqual(['The River Ford']);
    expect(cells.find((c) => c.here)?.name).toBe('The River Ford');
    // The ways on from the ford are known of, but not yet known.
    expect(cells.filter((c) => !c.mark).length).toBe(4);
    sim.enterRoom('village', 160, 150);
    sim.enterRoom('inn', 160, 130);
    cells = chart(content, sim.state.flags, sim.state.room);
    // Indoors, you are shown where the door leads out.
    expect(cells.find((c) => c.here)?.name).toBe('Hollowmere');
    expect(cellOf(content, 'throne')).toEqual([0, -1]);
    sim.enterRoom('wild_2_1', 20, 140);
    cells = chart(content, sim.state.flags, sim.state.room);
    expect(cells.find((c) => c.here)).toMatchObject({ x: 2, y: 1 });
  });

  it('opens from a typed command and closes on a key', () => {
    const shell = new Shell(content, memoryStore(), false, behaviours);
    shell.modals = [];
    shell.submit('map');
    shell.tick();
    expect(shell.modal?.k).toBe('map');
    shell.keyDown('Enter');
    expect(shell.modal).toBeUndefined();
  });
});

describe('words the scenery uses', () => {
  it('are answered as scenery, not as nonsense', () => {
    const sim = game();
    expect(type(sim, 'look at the handrails')[0]).toBe('You see nothing special about the handrails.');
    expect(type(sim, 'take plates')[0]).toContain('only part of the scenery');
    expect(type(sim, 'look at the gazebo')[0]).toContain('no use for the word');
  });

  it('keeps hints short enough to show', () => {
    const bad = structuredClone(content);
    bad.rules.push({ on: 'wait', do: [{ note: 'x'.repeat(81) }] });
    expect(validate(bad).join()).toContain('over 80 characters');
  });
});

describe('what the wild holds', () => {
  /** The first cell of a kind, searching outward from the map. */
  const cellOfKind = async (kind: string, also: (id: string) => boolean = () => true): Promise<string> => {
    const { kindAt, roomOf } = await import('../src/engine/frontier');
    for (let r = 2; r < 12; r++)
      for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++)
          if (Math.max(Math.abs(x), Math.abs(y)) === r && kindAt(content, x, y) === kind && roomOf(content, `wild_${x}_${y}`) && also(`wild_${x}_${y}`)) return `wild_${x}_${y}`;
    throw new Error(`no ${kind} country found`);
  };

  it('comes in every kind the game describes', async () => {
    const { kindAt } = await import('../src/engine/frontier');
    const seen = new Set<string>();
    for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) seen.add(kindAt(content, x, y) ?? 'map');
    for (const kind of Object.keys(content.frontier!.odds)) expect(seen.has(kind), kind).toBe(true);
    // No one kind crowds out the rest.
    expect(kindAt(content, 0, 0)).toBeNull();
  });

  it('has shrines that mend whoever asks, once a day', async () => {
    const id = await cellOfKind('shrine');
    const sim = game(id, 160, 140);
    expect(sim.rs.actors.filter((a) => a.kind === 'enemy')).toEqual([]);
    const shrine = sim.room.things!.find((t) => t.id === 'shrine')!;
    sim.p.hp = 5;
    expect(type(sim, 'pray')[0]).toContain('do not seem to hear');
    sim.p.x = shrine.x;
    sim.p.y = shrine.y + 6;
    expect(type(sim, 'pray')[0]).toContain('You kneel in the snow');
    expect(sim.p.hp).toBe(sim.p.maxHp);
    // Which boon depends on the shrine; there is always one.
    expect(['ward', 'might', 'light'].some((k) => Number(sim.state.flags[k] ?? 0) > sim.state.tick)).toBe(true);
    sim.p.hp = 5;
    expect(type(sim, 'pray at the shrine')[0]).toContain('given for today');
    expect(sim.p.hp).toBeLessThan(6);
  });

  it('has steadings where somebody will trade and say what lies nearby', async () => {
    const { roomOf } = await import('../src/engine/frontier');
    const id = await cellOfKind('steading', (r) => (roomOf(content, r)!.npcs ?? []).length > 0);
    const sim = game(id, 160, 140);
    const who = sim.rs.actors.find((a) => a.kind === 'npc')!;
    sim.p.x = who.x + 10;
    sim.p.y = who.y;
    sim.p.gold = 7;
    sim.give('pelt');
    sim.give('bearskin');
    expect(type(sim, 'sell pelt')[0]).toContain('Four silver');
    expect(type(sim, 'sell bearskin')[0]).toContain('ten silver');
    expect(sim.p.gold).toBe(21);
    expect(type(sim, 'buy draught')[0]).toContain('red draught');
    expect(sim.p.inv.potion).toBe(1);
    const said = type(sim, `ask ${content.chars[who.ref].nouns[0]} about news`);
    expect(said.length).toBe(2);
    expect(said[1]).toMatch(/ridges? (north|south|east|west)|every direction/);
  });

  it('marks the way home', async () => {
    const { roomOf } = await import('../src/engine/frontier');
    const id = await cellOfKind('open', (r) => (roomOf(content, r)!.things ?? []).some((t) => t.id === 'waymark'));
    const [, x, y] = /wild_(-?\d+)_(-?\d+)/.exec(id)!.map(Number);
    const look = roomOf(content, id)!.things!.find((t) => t.id === 'waymark')!.look;
    if (x > 0) expect(look).toContain('west');
    if (x < 0) expect(look).toContain('east');
    if (y > 0) expect(look).toContain('north');
    if (y < 0) expect(look).toContain('south');
  });

  it('has things to gather, and remains to search', async () => {
    const { roomOf } = await import('../src/engine/frontier');
    const herbs = await cellOfKind('pines', (r) => (roomOf(content, r)!.things ?? []).some((t) => t.id === 'herb'));
    let sim = game(herbs, 160, 140);
    sim.rs.actors = [];
    const herb = sim.room.things!.find((t) => t.id === 'herb')!;
    sim.p.x = herb.x;
    sim.p.y = herb.y + 4;
    expect(type(sim, 'pick the mushrooms')[0]).toContain('frostcaps');
    sim.p.hp = 10;
    type(sim, 'eat frostcap');
    expect(sim.p.hp).toBeGreaterThan(17);
    expect(sim.p.inv.herb).toBeUndefined();

    const bones = await cellOfKind('open', (r) => (roomOf(content, r)!.things ?? []).some((t) => t.id === 'bones'));
    sim = game(bones, 160, 140);
    sim.rs.actors = [];
    const b = sim.room.things!.find((t) => t.id === 'bones')!;
    sim.p.x = b.x;
    sim.p.y = b.y + 4;
    expect(type(sim, 'search the bones')[0]).toContain('silver');
    expect(sim.p.gold).toBeGreaterThan(0);
    expect(type(sim, 'search the bones')[0]).toContain('Let them rest');
  });

  it('breeds bigger things further out', async () => {
    const { roomOf } = await import('../src/engine/frontier');
    const kinds = new Set<string>();
    for (let x = 5; x < 9; x++) for (let y = -4; y <= 4; y++) for (const s of roomOf(content, `wild_${x}_${y}`)?.spawns ?? []) kinds.add(s.kind);
    expect([...kinds]).toEqual(expect.arrayContaining(['bear', 'rimewalker', 'chief']));
    const sim = game('farm', 100, 150);
    sim.spawn('bear', 130, 150);
    const bear = sim.rs.actors[sim.rs.actors.length - 1];
    combat.hitEnemy(sim, bear, 999, 'blade');
    expect(sim.p.inv.bearskin).toBe(1);
  });

  it('keeps the camp chest shut while its own robbers live, whoever else has died', () => {
    const sim = game('camp', 56, 162);
    sim.state.flags['bandits.killed'] = 9;
    expect(type(sim, 'open chest')[0]).toContain('still very much here');
    sim.rs.actors = [];
    expect(type(sim, 'open chest')[0]).toContain('seed grain');
  });
});

describe('after the first saga', () => {
  const thane = (room: string, x: number, y: number): Sim => {
    const sim = game(room, x, y);
    sim.state.flags['hearth.lit'] = true;
    sim.state.flags['marta.met'] = true;
    sim.state.flags['quest:hearth'] = 5;
    sim.enterRoom(room, x, y);
    sim.drain();
    return sim;
  };

  it('lets the smith temper a blade and mail, for more each time', () => {
    const sim = thane('village', 124, 158);
    const odd = sim.rs.actors.find((a) => a.ref === 'odd')!;
    sim.p.x = odd.x + 8;
    sim.p.y = odd.y;
    sim.give('sword');
    sim.p.gold = 200;
    expect(combat.edge(sim)).toBe(1);
    expect(type(sim, 'sharpen my sword')[0]).toContain('Better');
    expect(sim.p.gold).toBe(160);
    expect(combat.edge(sim)).toBeCloseTo(1.125);
    type(sim, 'temper sword');
    expect(sim.p.gold).toBe(90);
    expect(sim.state.flags['temper.weaponCost']).toBe(100);
    expect(type(sim, 'temper sword')[0]).toContain('you are short');
    expect(type(sim, 'temper mail')[0]).toContain('wool');
    sim.give('mail');
    expect(combat.armourOf(sim)).toBe(25);
    type(sim, 'temper mail');
    expect(combat.armourOf(sim)).toBe(29);
    const shell = new Shell(content, memoryStore(), false, behaviours);
    expect(shell.sim.fill('{temper.weaponCost} silver')).toBe('40 silver');
  });

  it('keeps the forge cold until the hearth is lit', () => {
    const sim = game('village', 124, 158);
    const odd = sim.rs.actors.find((a) => a.ref === 'odd')!;
    sim.p.x = odd.x + 8;
    sim.p.y = odd.y;
    sim.give('sword');
    sim.p.gold = 200;
    expect(type(sim, 'temper sword')[0]).toContain('With what fire');
    expect(sim.p.gold).toBe(200);
  });

  it('has the Elder send the Thane further and further out, and pay for it', () => {
    const sim = thane('hall', 200, 124);
    const marta = sim.rs.actors.find((a) => a.ref === 'marta')!;
    const stand = (): void => {
      sim.p.x = marta.x - 10;
      sim.p.y = marta.y;
    };
    stand();
    expect(type(sim, 'talk to elder')[0]).toContain('more work');
    const offer = type(sim, 'talk to elder');
    expect(offer.join(' ')).toMatch(/ridges? (north|south|east|west)/);
    expect(offer.join(' ')).toContain("New task: The Elder's Work");
    const first = String(sim.state.flags['bounty.room']);
    expect(first).toMatch(/^wild_/);
    expect(sim.state.flags.goal).toBe(first);
    expect(type(sim, 'journal')).toEqual([]);
    expect(type(sim, 'think')[0]).toContain(String(sim.state.flags['bounty.name']));
    // Asked again, she only repeats herself.
    expect(type(sim, 'ask elder about work').join(' ')).toContain('will not see to itself');

    // Go there and deal with it.
    sim.enterRoom(first, 160, 140);
    const foes = sim.rs.actors.filter((a) => a.kind === 'enemy');
    expect(foes.length).toBeGreaterThan(0);
    for (const f of foes) combat.hitEnemy(sim, f, 9999, 'blade');
    expect(sim.state.flags['bounty.done']).toBe(true);
    expect(sim.state.flags['quest:bounty']).toBe(2);

    sim.enterRoom('hall', 200, 124);
    stand();
    const gold = sim.p.gold;
    const score = sim.state.score;
    expect(type(sim, 'talk to elder').join(' ')).toContain('25 silver');
    expect(sim.p.gold).toBe(gold + 25);
    expect(sim.state.score).toBe(score + 5);
    expect(sim.state.flags.goal).toBeUndefined();

    // The next lies further off and pays more.
    type(sim, 'ask elder about work');
    const second = String(sim.state.flags['bounty.room']);
    expect(second).not.toBe(first);
    expect(sim.state.flags['bounty.pay']).toBe(40);
    const far = (id: string): number => Math.max(...id.split('_').slice(1).map((n) => Math.abs(Number(n))));
    expect(far(second)).toBeGreaterThanOrEqual(3);
  });

  it('shows where the Thane has been sent on the map', async () => {
    const { chart } = await import('../src/engine/frontier');
    const sim = game();
    sim.state.flags.goal = 'wild_4_-2';
    const cell = chart(content, sim.state.flags, sim.state.room).find((c) => c.goal);
    expect(cell).toMatchObject({ x: 4, y: -2, mark: '' });
  });
});

describe('housekeeping', () => {
  it('keeps every standing hint short enough to show whole', () => {
    for (const key of ['parryHint', 'shieldHint', 'tomeHint']) expect(content.text[key].length, key).toBeLessThanOrEqual(80);
  });

  it('forgets who was in a room once it is left, so saves stay small', () => {
    const sim = game('pinewood', 200, 132);
    expect(sim.state.rooms.pinewood.actors.length).toBeGreaterThan(0);
    sim.enterRoom('village', 160, 150);
    expect(sim.state.rooms.pinewood.actors).toEqual([]);
    sim.enterRoom('pinewood', 200, 132);
    expect(sim.state.rooms.pinewood.actors.length).toBeGreaterThan(0);
  });

  it('keeps count of deeds', () => {
    const sim = game('pinewood', 200, 132);
    const wolf = sim.rs.actors.find((a) => a.kind === 'enemy')!;
    combat.hitEnemy(sim, wolf, 999, 'blade');
    sim.drain();
    sim.step([{ t: 'say', line: 'skills' }]);
    const page = sim.drain().find((e) => e.t === 'page');
    expect(page && page.t === 'page' && page.lines.join(' ')).toContain('Foes felled: 1');
  });
});

describe('under the old towers', () => {
  const towerCell = async (): Promise<string> => {
    const { kindAt, roomOf } = await import('../src/engine/frontier');
    for (let r = 2; r < 12; r++)
      for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++)
          if (Math.max(Math.abs(x), Math.abs(y)) === r && kindAt(content, x, y) === 'ruin' && roomOf(content, `wild_${x}_${y}`)!.doors?.length) return `wild_${x}_${y}`;
    throw new Error('no tower found');
  };

  it('has a vault that is dark, guarded, reachable and worth it', async () => {
    const { roomOf, cellOf } = await import('../src/engine/frontier');
    const { buildScene } = await import('../src/engine/build');
    const { reachable, canReach } = await import('../src/engine/walk');
    const above = await towerCell();
    const door = roomOf(content, above)!.doors![0];
    const vault = roomOf(content, door.to)!;
    expect(vault.dark).toBe(true);
    expect(vault.spawns!.length).toBeGreaterThan(0);
    expect(cellOf(content, vault.id)).toEqual(above.split('_').slice(1).map(Number));
    // Everything in it can be walked to from the foot of the stair.
    const seen = reachable(buildScene(vault.scene), door.x, door.y);
    for (const t of vault.things!) expect(canReach(seen, t.x, t.y, t.reach ?? 30), t.id).toBe(true);
    for (const s of vault.spawns!) expect(canReach(seen, s.x, s.y, 4), s.id).toBe(true);
    // The same vault every time.
    expect(roomOf(content, door.to)).toBe(vault);
  });

  it('is entered by the tower door and left by the stair, back to the same spot', async () => {
    const { roomOf } = await import('../src/engine/frontier');
    const above = await towerCell();
    const door = roomOf(content, above)!.doors![0];
    const sim = game(above, 160, 140);
    sim.rs.actors = [];
    sim.p.x = Math.round((door.x0 + door.x1) / 2);
    sim.p.y = door.y1 + 6;
    walk(sim, 0, -1, 12);
    expect(sim.state.room).toBe(door.to);
    expect(sim.isDark()).toBe(true);
    expect(type(sim, 'look')[0]).toContain('pitch dark');
    sim.give('torch');
    type(sim, 'light torch');
    expect(sim.isDark()).toBe(false);
    sim.rs.actors = [];
    const hoard = sim.room.things!.find((t) => t.id === 'hoard')!;
    sim.p.x = hoard.x - 20;
    sim.p.y = hoard.y;
    expect(type(sim, 'take the treasure')[0]).toContain('silver');
    expect(sim.p.gold).toBeGreaterThan(20);
    expect(type(sim, 'take the treasure')[0]).toContain('best of it');
    const rune = sim.room.things!.find((t) => t.id === 'rune')!;
    sim.p.x = rune.x;
    sim.p.y = rune.y + 4;
    const lore = sim.p.skills.lore.lv * 100 + sim.p.skills.lore.xp;
    expect(type(sim, 'read the rune')[0]).toContain('old tongue');
    expect(sim.p.skills.lore.lv * 100 + sim.p.skills.lore.xp).toBeGreaterThan(lore);
    // Out by the stair.
    sim.p.x = 60;
    sim.p.y = 112;
    walk(sim, -1, 0, 4);
    walk(sim, 0, -1, 8);
    expect(sim.state.room).toBe(above);
    expect(Math.abs(sim.p.x - (door.x0 + door.x1) / 2)).toBeLessThan(8);
  });
});

describe('the menu', () => {
  it('keeps settings on a page of their own, and flips them in place', () => {
    const shell = new Shell(content, memoryStore(), false, behaviours);
    shell.modals = [];
    shell.keyDown('Escape');
    const menu = shell.modal;
    if (menu?.k !== 'list') throw new Error('expected the menu');
    expect(menu.items).toContain('Map');
    expect(menu.items.length).toBeLessThanOrEqual(10);
    menu.sel = menu.items.indexOf('Settings');
    shell.keyDown('Enter');
    const settings = shell.modal;
    if (settings?.k !== 'list') throw new Error('expected the settings');
    expect(settings.items[0]).toBe('Music: on');
    shell.keyDown('Enter');
    const again = shell.modal;
    if (again?.k !== 'list') throw new Error('expected the settings again');
    expect(again.items[0]).toBe('Music: off');
    expect(again.sel).toBe(0);
    expect(shell.settings.music).toBe(false);
    // Esc goes back up a level, not straight out.
    shell.keyDown('Escape');
    expect(shell.modal?.k === 'list' && shell.modal.items[0]).toBe('Resume');
  });
});

describe('the people of the steadings', () => {
  it('live in one place each, the same place every time', async () => {
    const { homes, kindAt, roomOf } = await import('../src/engine/frontier');
    const at = homes(content);
    expect(Object.keys(at).sort()).toEqual(['brekka', 'ivar', 'runa']);
    const lived: Record<string, number> = {};
    for (let y = -10; y <= 10; y++)
      for (let x = -10; x <= 10; x++)
        if (kindAt(content, x, y) === 'steading') for (const n of roomOf(content, `wild_${x}_${y}`)!.npcs ?? []) lived[n.char] = (lived[n.char] ?? 0) + 1;
    expect(lived).toEqual({ brekka: 1, ivar: 1, runa: 1 });
    for (const [who, [x, y]] of Object.entries(at)) expect(roomOf(content, `wild_${x}_${y}`)!.npcs![0].char).toBe(who);
  });

  const visit = async (who: string): Promise<Sim> => {
    const { homes } = await import('../src/engine/frontier');
    const [x, y] = homes(content)[who];
    const sim = game(`wild_${x}_${y}`, 160, 140);
    const a = sim.rs.actors.find((k) => k.ref === who)!;
    sim.p.x = a.x + 10;
    sim.p.y = a.y;
    return sim;
  };

  it('carries a message between two people too stubborn to send it themselves', async () => {
    const sim = await visit('ivar');
    type(sim, 'talk to ivar');
    expect(type(sim, 'ask ivar about marta').join(' ')).toContain('not dead yet');
    expect(sim.state.flags['quest:message']).toBe(1);
    sim.state.flags['marta.met'] = true;
    sim.enterRoom('hall', 200, 124);
    const marta = sim.rs.actors.find((a) => a.ref === 'marta')!;
    sim.p.x = marta.x - 10;
    sim.p.y = marta.y;
    expect(type(sim, 'talk to elder')[0]).toContain('one grey glove');
    expect(sim.p.inv.glove).toBe(1);
    expect(String(sim.state.flags['goal.ivar'])).toMatch(/^wild_/);
    expect(type(sim, 'journal')).toEqual([]);
    sim.enterRoom(String(sim.state.flags['goal.ivar']), 160, 140);
    const ivar = sim.rs.actors.find((a) => a.ref === 'ivar')!;
    sim.p.x = ivar.x + 10;
    sim.p.y = ivar.y;
    expect(type(sim, 'talk to ivar').join(' ')).toContain('boar-spear');
    expect(sim.p.weapon).toBe('spear');
    expect(sim.p.inv.glove).toBeUndefined();
    expect(sim.state.flags['goal.ivar']).toBe(false);
  });

  it('sends the player after a bear that is only there once it has been asked about', async () => {
    const { lair, roomOf } = await import('../src/engine/frontier');
    const den = lair(content, 'greyback')!;
    const denId = `wild_${den[0]}_${den[1]}`;
    expect(roomOf(content, denId)!.mark).toBe('crag');
    let sim = game(denId, 160, 150);
    expect(sim.rs.actors.some((a) => a.ref === 'greyback')).toBe(false);

    sim = await visit('brekka');
    type(sim, 'talk to brekka');
    expect(type(sim, 'ask brekka about bears').join(' ')).toContain('Greyback');
    expect(sim.state.flags['goal.greyback']).toBe(denId);
    expect(String(sim.state.flags['greyback.way'])).toMatch(/ridge|right here/);
    sim.enterRoom(denId, 160, 150);
    const bear = sim.rs.actors.find((a) => a.ref === 'greyback')!;
    expect(bear).toBeTruthy();
    combat.hitEnemy(sim, bear, 9999, 'blade');
    expect(sim.state.flags['quest:greyback']).toBe(2);
    expect(sim.state.flags['goal.greyback']).toBe(false);
    sim.enterRoom(String(sim.state.flags['goal.brekka']), 160, 140);
    const brekka = sim.rs.actors.find((a) => a.ref === 'brekka')!;
    sim.p.x = brekka.x + 10;
    sim.p.y = brekka.y;
    expect(type(sim, 'talk to brekka').join(' ')).toContain('keep you warm');
    expect(sim.p.armor).toBe('bearcloak');
    expect(combat.armourOf(sim)).toBe(35);
  });

  it('trades frostcaps for a tonic that strengthens for good', async () => {
    const sim = await visit('runa');
    sim.give('herb', 2);
    expect(type(sim, 'buy tonic')[0]).toContain('Not two');
    sim.give('herb');
    expect(type(sim, 'trade for a tonic')[0]).toContain('mortar');
    expect(sim.p.inv.herb).toBeUndefined();
    expect(type(sim, "drink runa's tonic")[0]).toContain('bottom of a well');
    expect(sim.p.maxHp).toBe(45);
  });
});

describe('ways back', () => {
  it('keeps a save from the last place nothing was hunting the player', () => {
    const store = memoryStore();
    const shell = new Shell(content, store, false, behaviours);
    shell.modals = [];
    shell.tick();
    shell.sim.enterRoom('village', 160, 150);
    shell.tick();
    shell.sim.enterRoom('pinewood', 300, 140);
    shell.tick();
    const read = (slot: string): string => JSON.parse(store.get(`thanes-quest:save:${slot}`)!).state.room;
    expect(read('auto')).toBe('pinewood');
    expect(read('safe')).toBe('village');
  });

  it('carries a Thane home by the hearth-ember, but not out of a fight, and not too often', () => {
    const sim = game('wild_3_1', 160, 140);
    sim.give('ember');
    if (sim.rs.actors.some((a) => a.kind === 'enemy')) {
      expect(type(sim, 'use ember')[0]).toContain('trying to kill you');
      sim.rs.actors = [];
    }
    expect(type(sim, 'breathe on the ember')[0]).toContain('square at Hollowmere');
    expect(sim.state.room).toBe('village');
    sim.enterRoom('wild_3_1', 160, 140);
    sim.rs.actors = [];
    expect(type(sim, 'use ember')[0]).toContain('gone grey');
    expect(sim.state.room).toBe('wild_3_1');
    sim.state.tick += 9600;
    type(sim, 'use ember');
    expect(sim.state.room).toBe('village');
    expect(type(sim, 'use ember')[0]).toContain('already where it wants to be');
  });

  it('says so the first time the player walks off the map', () => {
    const sim = game('tower', 300, 140);
    sim.rs.actors = [];
    sim.drain();
    walk(sim, 1, 0, 12);
    expect(sim.state.room).toBe('wild_2_1');
    expect(sim.drain().some((e) => e.t === 'note' && e.text.includes('MAP'))).toBe(true);
  });
});

describe('a world that notices', () => {
  it('describes the village differently once the hearth is lit', () => {
    const sim = game('village', 104, 158);
    expect(type(sim, 'look')[0]).toContain('pretending not to stare');
    expect(type(sim, 'look at the forge')[0]).toContain('went out a week ago');
    sim.state.flags['hearth.lit'] = true;
    expect(type(sim, 'look')[0]).toContain('smoke standing straight up');
    expect(type(sim, 'look at the forge')[0]).toContain('ringing');
    expect(type(sim, 'look at smith')[0]).toContain('forge-light');
  });

  it('knows the time, the night sky and the way home', async () => {
    const { DAY_LENGTH } = await import('../src/engine/sim');
    const sim = game('wild_3_-2', 160, 140);
    sim.rs.actors = [];
    expect(type(sim, 'what time is it')[0]).toContain('It is day');
    expect(type(sim, 'which way is home')[0]).toContain('Hollowmere lies to the south-west');
    sim.state.tick = Math.round(DAY_LENGTH * 0.7);
    expect(type(sim, 'time')[0]).toContain('It is night');
    expect(type(sim, 'look at the stars')[0]).toContain('More stars');
  });

  it('answers the things people ask shopkeepers', () => {
    const sim = game('inn', 250, 118);
    expect(type(sim, 'how much is the ale')[0]).toContain('Ale is a silver');
    expect(type(sim, 'warm my hands')[0]).toContain('feeling comes back');
    expect(type(sim, 'heal me')[0]).toContain('red draught');
  });
});

describe('generated rooms as content', () => {
  it('pass the same checks as hand-made rooms: every word known, every item real, everything reachable', async () => {
    const { roomOf } = await import('../src/engine/frontier');
    const grown = structuredClone(content);
    let added = 0;
    for (let y = -7; y <= 7; y++)
      for (let x = -7; x <= 7; x++) {
        const def = roomOf(content, `wild_${x}_${y}`);
        if (!def) continue;
        grown.rooms[def.id] = def;
        added++;
        for (const d of def.doors ?? []) {
          const under = roomOf(content, d.to);
          if (under) grown.rooms[under.id] = under;
        }
      }
    expect(added).toBeGreaterThan(200);
    expect(validate(grown)).toEqual([]);
  }, 60000);
});

describe('the second saga', () => {
  it('begins when the first of the Elder\'s work is paid for, if the crown is still carried', () => {
    const sim = game('hall', 200, 124);
    Object.assign(sim.state.flags, { 'hearth.lit': true, 'marta.met': true, 'marta.thane': true, 'quest:hearth': 5, 'bounty.room': 'wild_2_1', 'bounty.done': true, 'bounty.pay': 25 });
    sim.give('crown');
    const marta = sim.rs.actors.find((a) => a.ref === 'marta')!;
    sim.p.x = marta.x - 10;
    sim.p.y = marta.y;
    const said = type(sim, 'talk to elder').join(' ');
    expect(said).toContain('cold enough to feel through the leather');
    expect(sim.state.flags['quest:crown']).toBe(1);
  });

  it('keeps its door hidden until the word of uncovering is spoken', () => {
    const sim = game('frostgate', 160, 124);
    sim.rs.actors = [];
    sim.teach('word:orun');
    walk(sim, 0, -1, 8);
    expect(sim.state.room).toBe('frostgate');
    expect(type(sim, 'open the door')[0]).toContain('not found by pushing');
    expect(type(sim, 'orun')[0]).toContain('doorway');
    expect(sim.sceneKey()).not.toBe('frostgate#10');
    sim.p.y = 126;
    walk(sim, 0, -1, 10);
    expect(sim.state.room).toBe('rimehall');
  });

  it('has a smith who throws ice at those who stand off, and an anvil that unmakes what he made', () => {
    const sim = game('rimehall', 60, 134);
    const smith = sim.rs.actors.find((a) => a.ref === 'coldsmith')!;
    smith.x = 250;
    smith.y = 134;
    let thrown = false;
    for (let i = 0; i < 80 && !thrown; i++) {
      sim.step();
      thrown = sim.rs.shots.some((s) => s.from === 'enemy' && s.kind === 'frost');
    }
    expect(thrown).toBe(true);
    sim.give('crown');
    sim.p.x = 160;
    sim.p.y = 144;
    sim.p.hurtT = 0;
    expect(type(sim, 'put crown on anvil')[0]).toContain('its owner has just noticed');
    combat.hitEnemy(sim, smith, 9999, 'blade');
    sim.rs.shots = [];
    sim.p.hp = sim.p.maxHp;
    const hp = sim.p.maxHp;
    expect(type(sim, 'put crown on anvil').join(' ')).toContain('second saga');
    expect(sim.p.maxHp).toBe(hp + 20);
    expect(type(sim, 'look')[0]).toContain('dripping');
  });
});

describe('growing stronger over a long game', () => {
  it('wears one trinket, and it does what it says', () => {
    const sim = game();
    sim.give('sword');
    const bare = combat.edge(sim);
    sim.give('token');
    expect(sim.p.trinket).toBe('token');
    expect(combat.edge(sim)).toBeCloseTo(bare * 1.12);
    sim.give('torc');
    expect(sim.p.trinket).toBe('token');
    expect(type(sim, 'wear the torc')[0]).toContain('iron torc');
    expect(combat.edge(sim)).toBe(bare);
    expect(combat.armourOf(sim)).toBe(8);
    sim.give('mail');
    expect(combat.armourOf(sim)).toBe(33);
    type(sim, 'put on the hearthstone');
    expect(sim.p.trinket).toBe('torc');
    sim.give('hearthstone');
    type(sim, 'wear hearthstone');
    sim.p.hp = 10;
    sim.step();
    expect(sim.p.hp).toBeGreaterThan(10.02);
  });

  it('turns up trinkets among the grave-goods of some vaults, a different one in different places', async () => {
    const { kindAt, roomOf } = await import('../src/engine/frontier');
    const found = new Set<string>();
    let vaults = 0;
    for (let y = -10; y <= 10; y++)
      for (let x = -10; x <= 10; x++) {
        if (kindAt(content, x, y) !== 'ruin') continue;
        const vault = roomOf(content, `crypt_${x}_${y}`);
        if (!vault) continue;
        vaults++;
        for (const r of vault.rules ?? []) for (const e of r.do) if ('give' in e && content.items[e.give].kind === 'trinket') found.add(e.give);
      }
    expect(vaults).toBeGreaterThan(8);
    expect(found.size).toBeGreaterThanOrEqual(3);
  });

  it('goes on granting perks well past the early levels', () => {
    const sim = game('pinewood', 200, 132);
    const wolf = sim.rs.actors.find((a) => a.kind === 'enemy')!;
    sim.rs.actors = [wolf];
    expect(content.perks.filter((k) => k.lv >= 35).length).toBe(6);
    sim.p.skills.lore.lv = 40;
    sim.teach('word:veth');
    type(sim, 'veth');
    const quick = sim.p.cd['word:veth'];
    sim.p.skills.lore.lv = 39;
    sim.p.cd['word:veth'] = 0;
    type(sim, 'veth');
    expect(quick).toBeLessThan(sim.p.cd['word:veth'] * 0.7);
    sim.p.skills.mending.lv = 35;
    sim.give('potion');
    sim.p.hp = 1;
    type(sim, 'drink potion');
    expect(sim.p.hp).toBeGreaterThan(38);
  });
});

describe('a world with time in it', () => {
  it('sends something extra abroad in the wild after dark, and only then', async () => {
    const { DAY_LENGTH } = await import('../src/engine/sim');
    const { roomOf } = await import('../src/engine/frontier');
    const id = 'wild_3_1';
    const night = roomOf(content, id)!.spawns!.filter((s) => s.when === 'night');
    expect(night.length).toBe(1);
    const sim = game(id, 160, 140);
    expect(sim.rs.actors.some((a) => a.id.endsWith(':night'))).toBe(false);
    sim.state.tick = Math.round(DAY_LENGTH * 0.7);
    sim.enterRoom(id, 160, 140);
    expect(sim.rs.actors.some((a) => a.id.endsWith(':night'))).toBe(true);
  });

  it('remarks on dusk and dawn out of doors, with a warning the first time', async () => {
    const { DAY_LENGTH } = await import('../src/engine/sim');
    const sim = game('farm', 100, 150);
    sim.state.tick = Math.round(DAY_LENGTH * 0.48) - 2;
    sim.drain();
    for (let i = 0; i < 6; i++) sim.step();
    expect(sim.drain().some((e) => e.t === 'note' && e.text.includes('the dead walk further'))).toBe(true);
    sim.state.tick += DAY_LENGTH - 6;
    for (let i = 0; i < 6; i++) sim.step();
    expect(sim.drain().some((e) => e.t === 'note' && e.text === content.text.dusk)).toBe(true);
  });

  it('keeps a list of deeds that only ever shows what has been done', () => {
    const sim = game();
    const read = (): string[] => {
      sim.drain();
      sim.step([{ t: 'say', line: 'deeds' }]);
      const page = sim.drain().find((e) => e.t === 'page');
      return page && page.t === 'page' ? page.lines : [];
    };
    expect(read()).toEqual(['Came north to Hollowmere with nothing but a road behind you.']);
    sim.state.flags['hearth.lit'] = true;
    sim.state.flags['bounty.n'] = 3;
    const lines = read().join(' ');
    expect(lines).toContain('named Thane');
    expect(lines).toContain('3 times so far');
    expect(lines).not.toContain('crown');
  });
});

describe('game to hunt', () => {
  const deerCell = async (): Promise<string> => {
    const { roomOf } = await import('../src/engine/frontier');
    for (let r = 2; r < 10; r++)
      for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++)
          if (Math.max(Math.abs(x), Math.abs(y)) === r && (roomOf(content, `wild_${x}_${y}`)?.spawns ?? []).some((s) => s.kind === 'deer')) return `wild_${x}_${y}`;
    throw new Error('no deer anywhere');
  };

  it('grazes by day, is not there at night, and does not count as a foe', async () => {
    const { DAY_LENGTH } = await import('../src/engine/sim');
    const id = await deerCell();
    const sim = game(id, 160, 140);
    const deer = sim.rs.actors.find((a) => a.ref === 'deer')!;
    expect(deer).toBeTruthy();
    expect(combat.hostile(sim, deer)).toBe(false);
    sim.rs.actors = [deer];
    // With nothing but a deer about, the place is quiet, and a hearth-ember will work.
    const { test } = await import('../src/engine/rules');
    expect(test(sim, { quiet: true })).toBe(true);
    sim.state.tick = Math.round(DAY_LENGTH * 0.7);
    sim.enterRoom(id, 160, 140);
    expect(sim.rs.actors.some((a) => a.ref === 'deer')).toBe(false);
  });

  it('bolts from anyone who walks up, but falls to an arrow from a distance', async () => {
    const id = await deerCell();
    let sim = game(id, 160, 140);
    let deer = sim.rs.actors.find((a) => a.ref === 'deer')!;
    sim.rs.actors = [deer];
    sim.p.x = deer.x > 160 ? deer.x - 60 : deer.x + 60;
    sim.p.y = deer.y;
    for (let i = 0; i < 200 && sim.rs.actors.length; i++) sim.step();
    expect(sim.rs.actors.length).toBe(0);
    expect(sim.p.inv.venison).toBeUndefined();

    sim = game(id, 160, 140);
    deer = sim.rs.actors.find((a) => a.ref === 'deer')!;
    sim.rs.actors = [deer];
    sim.give('bow');
    type(sim, 'equip bow');
    sim.p.x = deer.x > 160 ? deer.x - 110 : deer.x + 110;
    sim.p.y = deer.y;
    sim.p.dir = deer.x > sim.p.x ? 'right' : 'left';
    sim.step([{ t: 'attack' }]);
    for (let i = 0; i < 60 && !sim.p.inv.venison; i++) sim.step();
    expect(sim.p.inv.venison).toBe(1);
    sim.p.hp = 10;
    type(sim, 'eat venison');
    expect(sim.p.hp).toBeGreaterThan(25);
  });
});

describe('a Thane at home', () => {
  it('has a bed by the hearth he lit, and neighbours who have noticed', () => {
    const sim = game('hall', 160, 120);
    expect(type(sim, 'sleep')[0]).not.toContain('bench made up');
    sim.state.flags['hearth.lit'] = true;
    sim.p.hp = 3;
    expect(type(sim, 'sleep')[0]).toContain('bench made up');
    expect(sim.p.hp).toBe(sim.p.maxHp);
    sim.state.flags['crown.unmade'] = true;
    sim.state.flags['quest:stores'] = 2;
    sim.enterRoom('farm', 160, 146);
    const gorm = sim.rs.actors.find((a) => a.ref === 'gorm')!;
    sim.p.x = gorm.x + 8;
    sim.p.y = gorm.y;
    expect(type(sim, 'talk to gorm')[0]).toContain('gone soft');
  });

  it('is offered the way home on a touch screen, when there is one', () => {
    const shell = new Shell(content, memoryStore(), false, behaviours);
    shell.modals = [];
    shell.sim.give('ember');
    shell.sim.enterRoom('wild_3_1', 160, 140);
    shell.sim.rs.actors = [];
    expect(shell.suggest().map((s) => s.line)).toContain('use ember');
    shell.sim.enterRoom('village', 160, 150);
    expect(shell.suggest().map((s) => s.line)).not.toContain('use ember');
  });
});

describe('places with names of their own', () => {
  it('has a bell in thin ice that kills the careless and rewards the patient', () => {
    let sim = game('bellmere', 160, 158);
    sim.rs.actors = [];
    let died = '';
    sim.step([{ t: 'move', dx: 0, dy: -1 }]);
    for (let i = 0; i < 30 && !died; i++) {
      sim.step();
      for (const e of sim.drain()) if (e.t === 'died') died = e.text;
    }
    expect(died).toContain('the ice speaks');

    sim = game('bellmere', 160, 158);
    sim.rs.actors = [];
    sim.teach('word:iska');
    expect(type(sim, 'ring the bell')[0]).toContain('a long way out');
    type(sim, 'iska');
    walk(sim, 0, -1, 14);
    expect(sim.p.dead).toBe(false);
    expect(type(sim, 'read the bell')[0]).toContain('I WAS NOT ANSWERED');
    const mana = sim.p.maxMp;
    expect(type(sim, 'hit the bell').join(' ')).toContain('one note');
    expect(sim.p.maxMp).toBe(mana + 10);
    expect(type(sim, 'ring bell')[0]).toContain('said what it had to say');
  });

  it('has a tree it is unwise to climb', () => {
    const sim = game('hangtree', 160, 160);
    sim.drain();
    sim.step([{ t: 'say', line: 'climb the tree' }]);
    expect(sim.p.dead).toBe(true);
  });

  it('is told of by the people of the steadings, and marked on the map', async () => {
    const { homes } = await import('../src/engine/frontier');
    const at = homes(content).runa;
    const sim = game(`wild_${at[0]}_${at[1]}`, 160, 140);
    const runa = sim.rs.actors.find((a) => a.ref === 'runa')!;
    sim.p.x = runa.x + 8;
    sim.p.y = runa.y;
    type(sim, 'talk to runa');
    const said = type(sim, 'ask runa about news').join(' ');
    expect(said).toMatch(/bell|dead oak|wall of ice|stone table/);
    expect(Object.keys(sim.state.flags).some((k) => k.startsWith('goal.'))).toBe(true);
  });
});

describe('vaults that differ', () => {
  it('come with guards up, or guards that wake with the hoard, and some with a flagstone to regret', async () => {
    const { kindAt, roomOf } = await import('../src/engine/frontier');
    let guarded = 0;
    let ambush = '';
    let trapped = '';
    for (let y = -12; y <= 12; y++)
      for (let x = -12; x <= 12; x++) {
        if (kindAt(content, x, y) !== 'ruin') continue;
        const v = roomOf(content, `crypt_${x}_${y}`);
        if (!v) continue;
        if (v.spawns!.length) guarded++;
        else if (!ambush) ambush = v.id;
        if (v.zones?.length && !trapped) trapped = v.id;
      }
    expect(guarded).toBeGreaterThan(3);
    expect(ambush).not.toBe('');
    expect(trapped).not.toBe('');

    // The quiet kind: nothing stirs until the treasure is lifted.
    let sim = game(ambush, 60, 126);
    sim.state.flags.light = 1e9;
    expect(sim.rs.actors.filter((a) => a.kind === 'enemy').length).toBe(0);
    const hoard = sim.room.things!.find((t) => t.id === 'hoard')!;
    sim.p.x = hoard.x - 20;
    sim.p.y = hoard.y;
    expect(type(sim, 'take treasure').join(' ')).toContain('waiting to see what you would do');
    expect(sim.rs.actors.filter((a) => a.kind === 'enemy').length).toBeGreaterThan(0);

    // The other kind: a stone that gives.
    sim = game(trapped, 60, 126);
    sim.rs.actors = [];
    const plate = sim.room.zones![0];
    sim.p.x = plate.x0 - 6;
    sim.p.y = (plate.y0 + plate.y1) >> 1;
    const hp = sim.p.hp;
    walk(sim, 1, 0, 8);
    expect(sim.p.hp).toBeLessThan(hp);
    const after = sim.p.hp;
    walk(sim, -1, 0, 10);
    walk(sim, 1, 0, 10);
    expect(sim.p.hp).toBeGreaterThanOrEqual(after);
  });
});

describe('finding the way', () => {
  it('lets the map be looked about with the arrow keys', () => {
    const shell = new Shell(content, memoryStore(), false, behaviours);
    shell.modals = [];
    shell.submit('map');
    shell.tick();
    const m = shell.modal;
    if (m?.k !== 'map') throw new Error('expected the map');
    shell.keyDown('ArrowUp');
    shell.keyDown('ArrowRight');
    expect([m.dx, m.dy]).toEqual([1, -1]);
    for (let i = 0; i < 20; i++) shell.keyDown('ArrowLeft');
    expect(m.dx).toBe(-8);
    shell.keyDown('Escape');
    expect(shell.modal).toBeUndefined();
  });

  it('gives generated places names varied enough to tell apart', async () => {
    const { roomOf } = await import('../src/engine/frontier');
    const names = new Map<string, number>();
    let cells = 0;
    for (let y = -4; y <= 4; y++)
      for (let x = -4; x <= 4; x++) {
        const def = roomOf(content, `wild_${x}_${y}`);
        if (!def) continue;
        cells++;
        names.set(def.name, (names.get(def.name) ?? 0) + 1);
      }
    // Nearly every place within four screens of home has a name to itself.
    expect(names.size).toBeGreaterThan(cells * 0.85);
  });
});

describe('arriving', () => {
  it('never leaves the player in a pocket cut off from the rest of a room, wherever they walk in', async () => {
    const { roomOf } = await import('../src/engine/frontier');
    const { mainGround } = await import('../src/engine/walk');
    const sim = game();
    let tried = 0;
    for (let cy = -7; cy <= 7; cy++)
      for (let cx = -7; cx <= 7; cx++) {
        const id = `wild_${cx}_${cy}`;
        if (!roomOf(content, id)) continue;
        const sc = sim.scene(id);
        const ground = mainGround(sc);
        // Every height at which the west and east edges can be crossed, and a sweep of the north and south.
        const spots: [number, number][] = [];
        for (let y = sc.walkTop + 2; y < 166; y += 3) spots.push([7, y], [312, y]);
        for (let x = 10; x < 312; x += 12) spots.push([x, sc.walkTop + 2], [x, 164]);
        for (const [x, y] of spots) {
          sim.enterRoom(id, x, y);
          tried++;
          if (!ground[Math.round(sim.p.y) * 320 + Math.round(sim.p.x)]) throw new Error(`${id}: arriving at ${x},${y} puts the player at ${sim.p.x},${sim.p.y}, which is cut off`);
          // And from there, at least one step can be taken that is not straight back out.
          const { x: px, y: py } = sim.p;
          const open = [[2, 0], [-2, 0], [0, 1], [0, -1]].some(([dx, dy]) => ground[(py + dy) * 320 + px + dx]);
          if (!open) throw new Error(`${id}: arriving at ${x},${y} leaves the player unable to move at ${px},${py}`);
        }
      }
    expect(tried).toBeGreaterThan(10000);
  }, 60000);
});

describe('nobody stuck in the furniture', () => {
  it('puts every creature in every room on ground it can walk on, however it got there', async () => {
    const { roomOf } = await import('../src/engine/frontier');
    const { mainGround } = await import('../src/engine/walk');
    const sim = game();
    sim.state.flags.light = 1e9;
    const ids = [...Object.keys(content.rooms)];
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (roomOf(content, `wild_${x}_${y}`)) ids.push(`wild_${x}_${y}`);
    let seen = 0;
    for (const night of [false, true]) {
      sim.state.tick = night ? 6720 : 100;
      for (const id of ids) {
        sim.enterRoom(id, 160, 140);
        const ground = mainGround(sim.scene());
        // The boss's reinforcements arrive at fixed spots, wherever the furniture is.
        sim.behaviours.bossPhase?.(sim, 2);
        for (const a of sim.rs.actors) {
          if (a.kind !== 'enemy') continue;
          seen++;
          if (!ground[Math.round(a.y) * 320 + Math.round(a.x)]) throw new Error(`${id}: ${a.ref} at ${a.x},${a.y} is inside something`);
        }
      }
    }
    expect(seen).toBeGreaterThan(500);
  }, 60000);

  it('sets the player down on real ground at every edge and door of every hand-made room', async () => {
    const { roomOf } = await import('../src/engine/frontier');
    const { mainGround } = await import('../src/engine/walk');
    const sim = game();
    for (const id of Object.keys(content.rooms)) {
      const def = roomOf(content, id)!;
      const sc = sim.scene(id);
      const ground = mainGround(sc);
      const spots: [number, number][] = [];
      if (def.exits?.w) for (let y = sc.walkTop + 2; y < 166; y += 3) spots.push([312, y]);
      if (def.exits?.e) for (let y = sc.walkTop + 2; y < 166; y += 3) spots.push([7, y]);
      if (def.exits?.n || def.exits?.s) for (let x = 10; x < 312; x += 8) spots.push([x, sc.walkTop + 2], [x, 164]);
      for (const other of Object.values(content.rooms)) for (const d of other.doors ?? []) if (d.to === id) spots.push([d.x, d.y]);
      for (const [x, y] of spots) {
        sim.enterRoom(id, x, y);
        if (!ground[Math.round(sim.p.y) * 320 + Math.round(sim.p.x)]) throw new Error(`${id}: arriving at ${x},${y} puts the player at ${sim.p.x},${sim.p.y}`);
      }
    }
  });
});

describe('the fourth word', () => {
  it('is only to be read after dark', async () => {
    const { DAY_LENGTH } = await import('../src/engine/sim');
    const sim = game('dolmen', 160, 136);
    expect(type(sim, 'read rune')[0]).toContain('Bare rock');
    expect(type(sim, 'look at the rune')[0]).toContain('WHEN THE SUN IS GONE');
    sim.state.tick = Math.round(DAY_LENGTH * 0.7);
    expect(type(sim, 'look')[0]).toContain('a rune is alight');
    expect(type(sim, 'read rune')[0]).toContain('SOL');
    expect(sim.p.words).toContain('word:sol');
    expect(sim.sceneKey()).toBe('dolmen#01');
    sim.state.tick = 100;
    expect(sim.sceneKey()).toBe('dolmen#01');
  });

  it('strikes the dead, spares the living, and lights the dark', () => {
    const sim = game('sleepers', 160, 130);
    sim.teach('word:sol');
    expect(sim.isDark()).toBe(true);
    const wight = sim.rs.actors.find((a) => a.ref === 'wight')!;
    wight.x = sim.p.x + 30;
    wight.y = sim.p.y;
    const hp = wight.hp;
    sim.spawn('wolf', sim.p.x - 30, sim.p.y);
    const wolf = sim.rs.actors[sim.rs.actors.length - 1];
    const wolfHp = wolf.hp;
    type(sim, 'sol');
    expect(wight.hp).toBeLessThan(hp - 15);
    expect(wight.ai.stun).toBeGreaterThan(10);
    expect(wolf.hp).toBe(wolfHp);
    expect(sim.isDark()).toBe(false);
  });
});

describe('shrines of different kinds', () => {
  it('give one of three boons, the same shrine always the same one, and might makes blows land harder', async () => {
    const { kindAt } = await import('../src/engine/frontier');
    const boons = new Set<string>();
    for (let y = -12; y <= 12 && boons.size < 3; y++)
      for (let x = -12; x <= 12 && boons.size < 3; x++) {
        if (kindAt(content, x, y) !== 'shrine') continue;
        const sim = game(`wild_${x}_${y}`, 160, 140);
        const shrine = sim.room.things!.find((t) => t.id === 'shrine')!;
        sim.p.x = shrine.x;
        sim.p.y = shrine.y + 6;
        type(sim, 'pray');
        for (const k of ['ward', 'might', 'light']) if (Number(sim.state.flags[k] ?? 0) > sim.state.tick) boons.add(k);
        if (sim.state.flags.might) expect(combat.edge(sim)).toBeCloseTo(1.25);
      }
    expect([...boons].sort()).toEqual(['light', 'might', 'ward']);
  });
});

describe('fighting from the keyboard', () => {
  it('parries when Shift goes down as the warning shows, all the way through the key handling', () => {
    const shell = new Shell(content, memoryStore(), false, behaviours);
    shell.modals = [];
    const sim = shell.sim;
    sim.enterRoom('camp', 200, 150);
    const foe = sim.rs.actors.find((a) => a.id === 'bandit1')!;
    sim.rs.actors = [foe];
    foe.x = sim.p.x + 16;
    foe.y = sim.p.y;
    shell.keyDown('ArrowRight');
    shell.tick();
    shell.keyUp('ArrowRight');
    shell.modals = [];
    let parried = false;
    for (let i = 0; i < 80 && !parried; i++) {
      // The moment a player would see the "!" and react.
      if (foe.ai.wind > 0 && !sim.p.blocking) shell.keyDown('Shift');
      shell.tick();
      shell.modals = [];
      parried = (foe.ai.stun ?? 0) > 10;
    }
    expect(parried).toBe(true);
    expect(sim.p.hp).toBe(40);
    shell.keyUp('Shift');
    shell.tick();
    expect(sim.p.blocking).toBe(false);
    // And the opening is real: a swing now lands.
    const hp = foe.hp;
    shell.keyDown('Control');
    for (let i = 0; i < 8; i++) shell.tick();
    expect(foe.hp).toBeLessThan(hp);
  });
});

describe('fair warning', () => {
  it('says so when a creature has grown tougher than its kind', () => {
    const sim = game('farm', 100, 150);
    sim.spawn('wolf', 140, 150);
    expect(type(sim, 'look at the wolf')[0]).not.toContain('bigger and meaner');
    sim.rs.actors = sim.rs.actors.filter((a) => a.kind !== 'enemy');
    sim.spawn('wolf', 140, 150, 2);
    expect(type(sim, 'look at the wolf')[0]).toContain('bigger and meaner');
    sim.rs.actors = sim.rs.actors.filter((a) => a.kind !== 'enemy');
    sim.spawn('wolf', 140, 150, 10);
    expect(type(sim, 'look at the wolf')[0]).toContain('never seen one like it');
  });
});

describe('thinking it over', () => {
  it('mentions what is within reach, as things that could be typed', () => {
    const sim = game('village', 172, 126);
    const said = type(sim, 'think')[0];
    expect(said).toContain('Within reach, you could:');
    expect(said).toContain('TAKE HATCHET');
    sim.enterRoom('ford', 160, 160);
    expect(type(sim, 'think')[0]).not.toContain('Within reach');
  });
});

describe('marks on the map', () => {
  it('drops the mark from a place that was only pointed out, once it has been found', async () => {
    const { chart } = await import('../src/engine/frontier');
    const sim = game();
    sim.state.flags['goal.bellmere'] = 'bellmere';
    expect(chart(content, sim.state.flags, sim.state.room).some((c) => c.goal)).toBe(true);
    sim.drain();
    sim.enterRoom('bellmere', 60, 156);
    expect(sim.drain().some((e) => e.t === 'note' && e.text.includes('the place you were sent to'))).toBe(true);
    expect(chart(content, sim.state.flags, sim.state.room).some((c) => c.goal)).toBe(false);
    // A task's mark stays until the task is done.
    sim.state.flags['goal.gate'] = 'frostgate';
    sim.enterRoom('frostgate', 160, 150);
    expect(sim.state.flags['goal.gate']).toBe('frostgate');
  });
});

describe('doing things out of order', () => {
  it('lets the second saga be finished by someone who simply walked west and found it', () => {
    const sim = game('frostgate', 160, 126);
    sim.rs.actors = [];
    sim.teach('word:orun');
    sim.give('crown');
    sim.give('sword');
    sim.drain();
    type(sim, 'orun');
    expect(sim.state.flags['quest:crown']).toBe(3);
    sim.enterRoom('rimehall', 60, 126);
    const smith = sim.rs.actors.find((a) => a.ref === 'coldsmith')!;
    combat.hitEnemy(sim, smith, 99999, 'blade');
    sim.rs.shots = [];
    sim.p.x = 160;
    sim.p.y = 144;
    expect(type(sim, 'put the crown on the anvil').join(' ')).toContain('second saga');
    expect(sim.state.flags['quest:crown']).toBe(5);
    // Fenn hears how it ended, though he never set it going.
    sim.state.flags['fenn.met'] = true;
    sim.enterRoom('hut', 190, 130);
    const fenn = sim.rs.actors.find((a) => a.ref === 'fenn')!;
    sim.p.x = fenn.x - 10;
    sim.p.y = fenn.y;
    expect(type(sim, 'talk to fenn')[0]).toContain('puddle');
    // And being paid for the Elder's first task afterwards does not start it over.
    Object.assign(sim.state.flags, { 'hearth.lit': true, 'marta.met': true, 'marta.thane': true, 'marta.thaw': true, 'quest:hearth': 5, 'bounty.room': 'wild_2_1', 'bounty.done': true, 'bounty.pay': 25 });
    sim.enterRoom('hall', 200, 124);
    const marta = sim.rs.actors.find((a) => a.ref === 'marta')!;
    sim.p.x = marta.x - 10;
    sim.p.y = marta.y;
    type(sim, 'talk to elder');
    expect(sim.state.flags['quest:crown']).toBe(5);
  });

  it('keeps the Greyback out of his lair until somebody has cause to hunt him, and after he is dead', async () => {
    const { lair } = await import('../src/engine/frontier');
    const at = lair(content, 'greyback')!;
    const id = `wild_${at[0]}_${at[1]}`;
    const sim = game(id, 160, 150);
    expect(sim.rs.actors.some((a) => a.ref === 'greyback')).toBe(false);
    sim.state.flags['quest:greyback'] = 1;
    sim.enterRoom(id, 160, 150);
    const bear = sim.rs.actors.find((a) => a.ref === 'greyback')!;
    combat.hitEnemy(sim, bear, 99999, 'blade');
    sim.enterRoom(id, 160, 150);
    expect(sim.rs.actors.some((a) => a.ref === 'greyback')).toBe(false);
  });
});

describe('night music', () => {
  it('plays out of doors after dark, but not indoors, and not over a fight', async () => {
    const { DAY_LENGTH } = await import('../src/engine/sim');
    const shell = new Shell(content, memoryStore(), false, behaviours);
    shell.modals = [];
    shell.sim.enterRoom('village', 160, 150);
    expect(shell.musicCue()).toBe('village');
    shell.sim.state.tick = Math.round(DAY_LENGTH * 0.7);
    expect(shell.musicCue()).toBe('night');
    shell.sim.enterRoom('inn', 160, 130);
    expect(shell.musicCue()).toBe('hearth');
    shell.sim.enterRoom('pinewood', 200, 132);
    shell.sim.rs.actors.find((a) => a.kind === 'enemy')!.x = 230;
    expect(shell.musicCue()).toBe('battle');
  });
});

describe('boss music', () => {
  it('takes over from the battle tune while a boss is in the fight', () => {
    const shell = new Shell(content, memoryStore(), false, behaviours);
    shell.modals = [];
    shell.sim.state.flags.light = 1e9;
    shell.sim.enterRoom('throne', 100, 130);
    expect(shell.musicCue()).toBe('doom');
    shell.sim.rs.actors = [];
    shell.uiTick += 100;
    expect(shell.musicCue()).toBe('barrow');
  });
});

describe('lettering', () => {
  it('can draw every character the game ever shows', async () => {
    const { hasGlyph } = await import('../src/engine/font');
    const { roomOf } = await import('../src/engine/frontier');
    const missing = new Map<string, string>();
    const visit = (v: unknown, where: string): void => {
      if (typeof v === 'string') {
        for (const ch of v) if (ch !== '\n' && !hasGlyph(ch) && !missing.has(ch)) missing.set(ch, `${where}: ${v.slice(0, 40)}`);
      } else if (Array.isArray(v)) v.forEach((x) => visit(x, where));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (k !== 'notes' && k !== 'scene') visit(x, where);
    };
    visit({ ...content, music: undefined, vocab: undefined }, 'content');
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) visit(roomOf(content, `wild_${x}_${y}`), `wild_${x}_${y}`);
    expect([...missing]).toEqual([]);
  });
});

describe('gentle fights', () => {
  it('is a setting that softens every blow and is saved with the game', () => {
    const store = memoryStore();
    const shell = new Shell(content, store, false, behaviours);
    shell.modals = [];
    shell.tick();
    hurtPlayer(shell.sim, 10, shell.sim.p.x + 10, shell.sim.p.y, 'x');
    const fair = 40 - shell.sim.p.hp;
    shell.keyDown('Escape');
    const menu = shell.modal;
    if (menu?.k !== 'list') throw new Error('expected the menu');
    menu.sel = menu.items.indexOf('Settings');
    shell.keyDown('Enter');
    const settings = shell.modal;
    if (settings?.k !== 'list') throw new Error('expected the settings');
    settings.sel = settings.items.indexOf('Fights: fair');
    expect(settings.sel).toBeGreaterThan(0);
    shell.keyDown('Enter');
    expect(shell.modal?.k === 'list' && shell.modal.items).toContain('Fights: gentle');
    shell.modals = [];
    shell.tick();
    shell.sim.p.hp = 40;
    shell.sim.p.hurtT = 0;
    hurtPlayer(shell.sim, 10, shell.sim.p.x + 10, shell.sim.p.y, 'x');
    expect(40 - shell.sim.p.hp).toBeCloseTo(fair * 0.6, 5);
    shell.save('Slot 1', true);
    expect(JSON.parse(store.get('thanes-quest:save:Slot 1')!).state.flags.gentle).toBe(true);
  });
});

describe('a room from anywhere', () => {
  it('is accepted or rejected on its own, as plain data', async () => {
    const { roomOf } = await import('../src/engine/frontier');
    // What a room is, in full: it survives being turned to text and back.
    const room = JSON.parse(JSON.stringify(roomOf(content, 'wild_3_1')));
    expect(validate(content, room)).toEqual([]);
    room.scene.props.push({ t: 'gazebo', x: 10, y: 10 });
    room.things.push({ id: 'ghost', nouns: ['phantasm'], x: 160, y: 20, look: 'x' });
    room.spawns.push({ id: 'x', kind: 'dragon', x: 1, y: 1 });
    room.rules.push({ on: 'defenestrate chest', do: [{ give: 'unobtainium' }] });
    const errs = validate(content, room).join('\n');
    expect(errs).toContain('unknown prop "gazebo"');
    expect(errs).toContain('"phantasm" is not in the vocabulary');
    expect(errs).toContain('unknown enemy "dragon"');
    expect(errs).toContain('verb "defenestrate" is not in the vocabulary');
    expect(errs).toContain('unknown item "unobtainium"');
    expect(errs).toContain('thing "ghost" cannot be reached');
  });
});

describe('the white hart', () => {
  it('is out there, rarely and far from home, and worth the arrows', async () => {
    const { roomOf } = await import('../src/engine/frontier');
    let near = 0;
    let far = 0;
    for (let y = -10; y <= 10; y++)
      for (let x = -10; x <= 10; x++) {
        const n = (roomOf(content, `wild_${x}_${y}`)?.spawns ?? []).filter((s) => s.kind === 'whitehart').length;
        if (Math.max(Math.abs(x), Math.abs(y)) < 4) near += n;
        else far += n;
      }
    expect(near).toBe(0);
    expect(far).toBeGreaterThan(1);
    expect(far).toBeLessThan(30);
    const sim = game('farm', 100, 150);
    sim.spawn('whitehart', 200, 150);
    const hart = sim.rs.actors[sim.rs.actors.length - 1];
    expect(combat.hostile(sim, hart)).toBe(false);
    combat.hitEnemy(sim, hart, 99, 'archery');
    expect(sim.p.trinket).toBe('antlers');
    expect(sim.p.inv.venison).toBe(2);
  }, 60000);
});

describe('giving things to people who could use them', () => {
  const beside = (sim: Sim, who: string): void => {
    const a = sim.rs.actors.find((k) => k.ref === who)!;
    sim.p.x = a.x + 8;
    sim.p.y = a.y;
  };

  it('mends the hunter, who repays it in teaching', () => {
    const sim = game('pinewood', 276, 144);
    sim.rs.actors = sim.rs.actors.filter((a) => a.kind === 'npc');
    beside(sim, 'toke');
    sim.give('potion', 2);
    const archery = sim.p.skills.archery.lv;
    expect(type(sim, 'give the draught to toke')[0]).toContain('Draw with your back');
    expect(sim.p.skills.archery.lv).toBeGreaterThan(archery + 2);
    expect(sim.p.inv.potion).toBe(1);
    // Once is enough: after that a draught offered is just a draught kept.
    expect(type(sim, 'give potion to toke')[0]).not.toContain('Draw with your back');
    expect(sim.p.inv.potion).toBe(1);
  });

  it('gets mittens for a pelt, silver for a rug, and a surprise from a ewe', () => {
    let sim = game('village', 236, 156);
    beside(sim, 'sigga');
    sim.give('pelt');
    const sp = sim.p.maxSp;
    expect(type(sim, 'give pelt to sigga')[0]).toContain('mittens');
    expect(sim.p.maxSp).toBe(sp + 8);

    sim = game('hall', 200, 124);
    sim.give('bearskin');
    expect(type(sim, 'give the bearskin to the elder')[0]).toContain('Twenty silver');
    expect(sim.p.gold).toBe(20);

    sim = game('farm', 100, 146);
    sim.give('herb');
    expect(type(sim, 'give frostcaps to the sheep')[0]).toContain('six silver');
    expect(sim.p.gold).toBe(6);
    expect(sim.p.inv.herb).toBeUndefined();
  });
});

describe('spare things', () => {
  it('lets one worn thing be taken off by name, and a spare trinket be sold to the smith', () => {
    const sim = game('village', 124, 156);
    const odd = sim.rs.actors.find((a) => a.ref === 'odd')!;
    sim.p.x = odd.x + 8;
    sim.p.y = odd.y;
    sim.give('sword');
    sim.give('torc');
    expect(type(sim, 'sell torc')[0]).toContain('Take it off first');
    sim.give('token');
    expect(type(sim, 'sell trinket')[0]).toContain('Twelve silver');
    expect(sim.p.inv.token).toBeUndefined();
    expect(sim.p.trinket).toBe('torc');
    expect(type(sim, 'take off the torc')[0]).toBe('You take off the iron torc.');
    expect(sim.p.trinket).toBeNull();
    expect(sim.p.weapon).toBe('sword');
    type(sim, 'sell torc');
    expect(sim.p.gold).toBe(24);
  });
});

describe('the word of uncovering, tried everywhere', () => {
  it('has something to show in every outdoor screen of the valley', () => {
    const outdoors = Object.values(content.rooms).filter((r) => r.scene.kind === 'outdoor' && Math.max(...content.frontier!.grid[r.id].map(Math.abs)) <= 1);
    expect(outdoors.length).toBe(9);
    for (const room of outdoors) {
      const sim = game(room.id, 160, 150);
      sim.rs.actors = sim.rs.actors.filter((a) => a.kind === 'npc');
      sim.teach('word:orun');
      const said = type(sim, 'orun');
      expect(said.length, room.id).toBeGreaterThan(0);
      expect(said[0], room.id).toContain('ORUN');
    }
  });

  it('pays once at the ford, and not again', () => {
    const sim = game();
    sim.teach('word:orun');
    type(sim, 'orun');
    expect(sim.p.gold).toBe(8);
    sim.p.cd['word:orun'] = 0;
    expect(type(sim, 'orun')[0]).toContain('never was');
    expect(sim.p.gold).toBe(8);
  });
});

describe('function keys', () => {
  it('give help, quiet, the last line back, and the map', () => {
    const shell = new Shell(content, memoryStore(), false, behaviours);
    shell.modals = [];
    shell.keyDown('F1');
    expect(shell.modal?.k).toBe('page');
    shell.modals = [];
    shell.keyDown('F2');
    expect([shell.settings.music, shell.settings.sound]).toEqual([false, false]);
    shell.keyDown('F2');
    expect([shell.settings.music, shell.settings.sound]).toEqual([true, true]);
    shell.submit('look at the bridge');
    shell.tick();
    shell.modals = [];
    shell.keyDown('F3');
    expect(shell.input).toBe('look at the bridge');
    shell.input = '';
    shell.keyDown('F4');
    shell.tick();
    expect(shell.modal?.k).toBe('map');
  });
});

describe('being told what is going wrong', () => {
  it('says so when a swing is thrown on no breath, but not every time', () => {
    const sim = game('farm', 100, 150);
    sim.p.sp = 0;
    sim.drain();
    const swing = (): boolean => {
      sim.p.sp = 0;
      sim.step([{ t: 'attack' }]);
      for (let i = 0; i < 9; i++) sim.step();
      return sim.drain().some((e) => e.t === 'note' && e.text.includes('winded'));
    };
    expect(swing()).toBe(true);
    expect(swing()).toBe(false);
  });
});

describe('swapping weapons', () => {
  it('goes from blade to bow and back without either being named', () => {
    const sim = game();
    expect(type(sim, 'swap')[0]).toBe(content.text.noSwap);
    sim.give('sword');
    sim.give('bow');
    expect(sim.p.weapon).toBe('sword');
    type(sim, 'swap');
    expect(sim.p.weapon).toBe('bow');
    type(sim, 'switch weapon');
    expect(sim.p.weapon).toBe('sword');
    type(sim, 'equip bow');
    type(sim, 'q');
    expect(sim.p.weapon).toBe('sword');
  });
});

describe('looking away', () => {
  it('pauses the world until the player comes back', () => {
    const shell = new Shell(content, memoryStore(), false, behaviours);
    shell.modals = [];
    shell.pause();
    expect(shell.modal).toBeUndefined();
    shell.tick();
    shell.pause();
    expect(shell.modal?.k === 'list' && shell.modal.title).toBe('Paused');
    const tick = shell.sim.state.tick;
    for (let i = 0; i < 10; i++) shell.tick();
    expect(shell.sim.state.tick).toBe(tick);
    shell.pause();
    expect(shell.modals.length).toBe(1);
    shell.keyDown('Enter');
    shell.tick();
    expect(shell.sim.state.tick).toBe(tick + 1);
  });
});

describe('pointing at the picture', () => {
  it('walks there, stops on arrival, and gives up against something solid', () => {
    const shell = new Shell(content, memoryStore(), false, behaviours);
    shell.modals = [];
    shell.sim.enterRoom('farm', 130, 164);
    shell.tick();
    shell.modals = [];
    shell.walkTo(200, 158);
    for (let i = 0; i < 120; i++) shell.tick();
    expect(Math.abs(shell.sim.p.x - 200)).toBeLessThanOrEqual(2);
    expect(Math.abs(shell.sim.p.y - 158)).toBeLessThanOrEqual(1);
    expect(shell.sim.p.act).toBe('idle');
    // Straight at the farmhouse: no way through, so the walk ends short of it.
    shell.walkTo(236, 100);
    for (let i = 0; i < 200; i++) shell.tick();
    expect(shell.sim.p.act).toBe('idle');
    expect(shell.sim.p.y).toBeGreaterThan(104);
    // A key takes over at once.
    shell.walkTo(20, 150);
    shell.tick();
    shell.keyDown('ArrowRight');
    const x = shell.sim.p.x;
    for (let i = 0; i < 5; i++) shell.tick();
    expect(shell.sim.p.x).toBeGreaterThan(x);
  });
});
