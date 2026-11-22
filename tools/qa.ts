// QA tool: measurements a person would otherwise have to play for hours to get.
//
//   npm run qa -- words      words used in descriptions that the parser does not know
//   npm run qa -- fights     how a player of ordinary skill fares in each fight

import { Sim } from '../src/engine/sim';
import { roomOf } from '../src/engine/frontier';
import type { ActorState, Intent } from '../src/engine/types';
import { routeTo } from '../src/engine/walk';
import { behaviours } from '../src/game/behaviours';
import { content } from '../src/game/content';

// ---------------------------------------------------------------------------------------------
// Words: anything a description mentions should at least be understood.

const STOP = new Set(
  ('a an and are as at be been but by can could did do does for from had has have he her here his how i if in into is it its just like me more most much my no nor not now of off on one only or other our out over own same she so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who whom why will with you your ' +
   'all any both each few nothing something anything nobody everybody somebody everyone whoever whatever again once already still yet ever never always almost quite rather really perhaps maybe away back down far near around along across between behind beside beyond above below toward towards about against before after since during without within upon ' +
   'looks look seems seem stands stand lies lie runs run leads lead goes go comes come came went gone made make makes take takes taken took give gives given gave get gets got put keep keeps kept let lets say says said tell tells told know knows knew known think thinks thought see sees saw seen want wants wanted need needs feel feels felt find finds found leave leaves left turn turns turned call calls called try tries tried ask asks asked use uses used work works').split(' '),
);

function words(): void {
  const sim = new Sim(content, { behaviours });
  const seen = new Map<string, string[]>();
  const note = (text: string, where: string): void => {
    for (const w of text.toLowerCase().replace(/[^a-z' -]+/g, ' ').split(/[\s-]+/)) {
      const word = w.replace(/^'+|'+$/g, '').replace(/'s$/, '');
      if (word.length < 3 || STOP.has(word)) continue;
      (seen.get(word) ?? seen.set(word, []).get(word)!).push(where);
    }
  };
  for (const r of Object.values(content.rooms)) {
    note(r.look, r.id);
    for (const t of r.things ?? []) note(t.look, `${r.id}/${t.id}`);
  }
  const unknown: [string, string[]][] = [];
  for (const [w, where] of seen) {
    const r = sim.parser.parse(`look ${w}`);
    if (!r.ok && r.why === 'unknown') unknown.push([w, where]);
  }
  unknown.sort((a, b) => b[1].length - a[1].length);
  console.log(`${seen.size} distinct words in descriptions; ${unknown.length} unknown to the parser.`);
  console.log(unknown.map(([w, where]) => `${w} (${[...new Set(where)].slice(0, 3).join(', ')})`).join('\n'));
}

// ---------------------------------------------------------------------------------------------
// Fights: a stand-in for a person. It sees what a person sees, and is as slow as one.

interface Skill { react: number; guards: boolean; drinks: boolean }
const NOVICE: Skill = { react: 8, guards: false, drinks: true };
const DECENT: Skill = { react: 6, guards: true, drinks: true };

const alive = (a: ActorState): boolean => a.kind === 'enemy' && a.act !== 'dead';

/** Fight everything in the room. Returns health left (0 if dead) and how long it took. */
function brawl(sim: Sim, who: Skill, maxTicks = 4000): { hp: number; ticks: number; parries: number } {
  const p = sim.p;
  let wait = 0;
  let guardFor = 0;
  let sawWind = -1;
  let parries = 0;
  const start = sim.state.tick;
  const send = (it: Intent[]): void => {
    if (p.pendingLevels > 0) it = [...it, { t: 'level', pool: 'hp' }];
    sim.step(it);
    for (const e of sim.drain())
      if (e.t === 'note' && e.text === 'Parried!') {
        parries++;
        // The opening is the point of a parry: drop the guard and strike.
        guardFor = Math.min(guardFor, 2);
        wait = 0;
      }
  };
  for (let t = 0; t < maxTicks && !p.dead; t++) {
    const foes = sim.rs.actors.filter((a) => alive(a) && content.enemies[a.ref]?.ai !== 'prey');
    if (!foes.length) break;
    const e = foes.reduce((a, b) => (Math.hypot(a.x - p.x, (a.y - p.y) * 2) < Math.hypot(b.x - p.x, (b.y - p.y) * 2) ? a : b));
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const it: Intent[] = [];
    if (who.drinks && p.hp < p.maxHp * 0.35 && p.inv.potion && wait <= 0) {
      it.push({ t: 'say', line: 'drink potion' });
      wait = 14;
    }
    // Guarding: notice a wind-up, and get the shield up a reaction time later.
    const threat = foes.find((f) => f.ai.wind > 0 && Math.hypot(f.x - p.x, (f.y - p.y) * 2) < 60);
    if (who.guards && threat && sawWind < 0 && guardFor <= 0) sawWind = who.react;
    if (sawWind > 0 && --sawWind === 0) {
      const tdx = threat ? threat.x - p.x : dx;
      it.push({ t: 'move', dx: Math.sign(tdx) || 1, dy: 0 }, { t: 'block', on: true });
      guardFor = 12;
      sawWind = -1;
      send(it);
      continue;
    }
    if (guardFor > 0) {
      if (--guardFor === 0) it.push({ t: 'block', on: false });
      send(it);
      continue;
    }
    if (wait > 0) {
      wait--;
      send(it);
      continue;
    }
    const facing = (dx > 0 && p.dir === 'right') || (dx < 0 && p.dir === 'left');
    if (Math.abs(dx) < 24 && Math.abs(dy) <= 6) {
      if (!facing) it.push({ t: 'move', dx: Math.sign(dx) || 1, dy: 0 });
      else if (p.act !== 'swing') {
        it.push({ t: 'move', dx: 0, dy: 0 }, { t: 'attack' });
        wait = 8 + who.react;
      }
    } else it.push({ t: 'move', dx: Math.abs(dx) >= 20 ? Math.sign(dx) : 0, dy: Math.abs(dy) > 3 ? Math.sign(dy) : 0 });
    send(it);
  }
  return { hp: p.dead ? 0 : Math.round(p.hp), ticks: sim.state.tick - start, parries };
}

interface Kit { name: string; items: string[]; hp: number; blade: number }
const KITS: Kit[] = [
  { name: 'hatchet', items: ['hatchet'], hp: 40, blade: 5 },
  { name: 'sword+shield', items: ['sword', 'shield'], hp: 50, blade: 9 },
  { name: 'longsword+mail', items: ['longsword', 'shield', 'mail'], hp: 70, blade: 16 },
  { name: 'veteran', items: ['longsword', 'shield', 'mail'], hp: 120, blade: 30 },
];

function fights(): void {
  // The story's fights, two of the valley's roads, then the frontier at one, two, three, four
  // and seven screens beyond the valley.
  const rooms = ['pinewood', 'ridge', 'tower', 'camp', 'hangtree', 'dolmen', 'northgate', 'wild_2_1', 'wild_1_-2', 'wild_3_1', 'wild_3_0', 'wild_4_1', 'wild_-4_2', 'wild_1_-5', 'wild_6_2', 'wild_-6_-3', 'wild_9_0', 'wild_0_9'];
  const row = (cells: string[]): void => console.log(cells.map((c, i) => c.padEnd(i ? 17 : 12)).join(''));
  for (const who of [NOVICE, DECENT]) {
    console.log(`\n${who === NOVICE ? 'NOVICE: slow, never guards' : 'DECENT: guards when a blow is coming'}   (wins/10, health left, seconds)`);
    row(['room', ...KITS.map((k) => k.name)]);
    for (const room of rooms) {
      const def = roomOf(content, room)!;
      const cells = [room];
      for (const kit of KITS) {
        let wins = 0;
        let hp = 0;
        let secs = 0;
        let parries = 0;
        for (let seed = 1; seed <= 10; seed++) {
          const sim = new Sim(content, { behaviours, seed });
          for (const it of kit.items) sim.give(it);
          sim.give('potion', 2);
          sim.p.maxHp = sim.p.hp = kit.hp;
          sim.p.skills.blade.lv = kit.blade;
          sim.state.flags.light = 1e9;
          sim.enterRoom(room, 300, 140, 'left');
          sim.drain();
          const r = brawl(sim, who);
          if (r.hp > 0) wins++;
          hp += r.hp;
          secs += r.ticks / 20;
          parries += r.parries;
        }
        cells.push(`${wins}/10 ${Math.round(hp / 10)}hp ${Math.round(secs / 10)}s${parries ? ` p${parries}` : ''}`);
      }
      row([...cells, `${def.mark ?? ''}: ${(def.spawns ?? []).map((sp) => sp.kind + (sp.level ? '+' + sp.level : '')).join(' ')}`]);
    }
  }
}

const mode = process.argv[2];
if (mode === 'words') words();
else if (mode === 'fights') fights();


// ---------------------------------------------------------------------------------------------
// Country: what the frontier holds, cell by cell.

import { kindAt } from '../src/engine/frontier';

function country(r: number): void {
  const tally = new Map<string, number>();
  const firsts = new Map<string, string[]>();
  for (let y = -r; y <= r; y++) {
    let line = '';
    for (let x = -r; x <= r; x++) {
      const k = kindAt(content, x, y);
      line += (k ? k.slice(0, 2) : '##') + ' ';
      if (!k) continue;
      tally.set(k, (tally.get(k) ?? 0) + 1);
      const list = firsts.get(k) ?? firsts.set(k, []).get(k)!;
      if (list.length < 4) list.push(`wild_${x}_${y}`);
    }
    console.log(line);
  }
  for (const [k, n] of tally) console.log(k.padEnd(10), String(n).padStart(4), firsts.get(k)!.join(' '));
  // Every cell must generate, and say what it holds.
  let made = 0;
  const census = new Map<string, number>();
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) {
      const def = roomOf(content, `wild_${x}_${y}`);
      if (!def) continue;
      made++;
      for (const s of def.spawns ?? []) census.set(s.kind, (census.get(s.kind) ?? 0) + 1);
      for (const t of def.things ?? []) if (!['snow', 'sky', 'trees'].includes(t.id)) census.set(`thing:${t.id}`, (census.get(`thing:${t.id}`) ?? 0) + 1);
      for (const n of def.npcs ?? []) census.set(`npc:${n.char}`, (census.get(`npc:${n.char}`) ?? 0) + 1);
    }
  console.log(`${made} cells generated.`, [...census].map(([k, n]) => `${k} ${n}`).join(', '));
}
if (mode === 'country') country(Number(process.argv[3] ?? 6));

// ---------------------------------------------------------------------------------------------
// Music: nobody here can listen, but clashing notes can be counted. For every half beat of every
// tune, list the notes sounding together and flag semitone and tritone clashes between parts.

import { parsePart } from '../src/engine/tune';

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
const pc = (f: number): number => ((Math.round(12 * Math.log2(f / 440)) % 12) + 12 + 9) % 12;

function musicCheck(): void {
  for (const t of Object.values(content.music)) {
    const parts = t.parts.filter((p) => p.inst !== 'drum').map((p) => ({ inst: p.inst, ev: parsePart(p.notes, t.beats) }));
    const total = t.bars * t.beats;
    let clashes = 0;
    const lines: string[] = [];
    for (let at = 0; at < total; at += 0.5) {
      const sounding: { inst: string; n: number; fresh: boolean }[] = [];
      for (const p of parts)
        for (const e of p.ev) {
          // Plucked notes ring briefly; held ones for their length.
          const len = p.inst === 'harp' || p.inst === 'bell' ? Math.min(e.len, 1) : e.len;
          if (e.at <= at + 1e-6 && at < e.at + len - 1e-6) for (const f of e.freqs) sounding.push({ inst: p.inst, n: pc(f), fresh: Math.abs(e.at - at) < 1e-6 });
        }
      const bad: string[] = [];
      for (let i = 0; i < sounding.length; i++)
        for (let j = i + 1; j < sounding.length; j++) {
          const a = sounding[i];
          const b = sounding[j];
          if (a.inst === b.inst || !(a.fresh || b.fresh)) continue;
          const d = Math.abs(a.n - b.n) % 12;
          const iv = Math.min(d, 12 - d);
          if (iv === 1 || iv === 6) bad.push(`${NAMES[a.n]}(${a.inst})/${NAMES[b.n]}(${b.inst})${iv === 6 ? ' tritone' : ''}`);
        }
      if (bad.length) {
        clashes++;
        lines.push(`  bar ${Math.floor(at / t.beats) + 1} beat ${(at % t.beats) + 1}: ${[...new Set(bad)].join(', ')}`);
      }
    }
    // Range of the tune-carrying part, and its biggest leap.
    const lead = t.parts.find((p) => p.inst === 'flute' || p.inst === 'horn' || p.inst === 'bell');
    let leap = 0;
    if (lead) {
      const notes = parsePart(lead.notes, t.beats).map((e) => Math.round(12 * Math.log2(e.freqs[0] / 440)));
      for (let i = 1; i < notes.length; i++) leap = Math.max(leap, Math.abs(notes[i] - notes[i - 1]));
    }
    console.log(`${t.id}: ${t.bars} bars at ${t.bpm} bpm (${Math.round((total * 60) / t.bpm)}s loop), ${clashes} clashing half-beats of ${total * 2}, widest leap in the tune ${leap} semitones`);
    for (const l of lines) console.log(l);
  }
}
if (mode === 'music') musicCheck();

// ---------------------------------------------------------------------------------------------
// Phrases: things a player might plausibly type about the newer parts of the game. Lists the
// ones that got no proper answer (an unknown word, "that is a thing, not a deed", or a stock
// fallback), so the vocabulary and rules can be widened.

import { homes, kindAt as kindOf } from '../src/engine/frontier';

function firstOf(kind: string, also: (id: string) => boolean = () => true): string {
  for (let r = 2; r < 14; r++)
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++)
        if (Math.max(Math.abs(x), Math.abs(y)) === r && kindOf(content, x, y) === kind && also(`wild_${x}_${y}`)) return `wild_${x}_${y}`;
  throw new Error(kind);
}

function phrases(): void {
  const at = homes(content);
  const home = (who: string): string => `wild_${at[who][0]}_${at[who][1]}`;
  const tower = firstOf('ruin', (id) => !!roomOf(content, id)!.doors?.length);
  const sets: { where: string; by?: string; flags?: Record<string, string | number | boolean>; give?: string[]; lines: string[] }[] = [
    {
      where: firstOf('shrine'), by: 'shrine',
      lines: ['pray', 'kneel', 'pray to the stones', 'touch the stones', 'look at the cairn', 'leave an offering', 'give silver to the shrine', 'ask for a blessing', 'bless me', 'read the runes', 'sit in the ring', 'sleep', 'make an offering', 'worship', 'look at the offerings', 'take the coin', 'take bead', 'thank the stones'],
    },
    {
      where: home('brekka'), by: 'brekka', give: ['pelt', 'bearskin', 'herb'],
      lines: ['hello', 'talk to trapper', 'ask brekka about wolves', 'ask about the bear', 'ask about the greyback', 'ask brekka about traps', 'ask about her dog', 'buy draught', 'sell pelts', 'sell bearskin', 'sell everything', 'trade', 'what do you sell', 'ask about news', 'ask about rumours', 'ask brekka about the shrine', 'ask about the dead', 'look at the pelts', 'look at the hut', 'enter hut', 'knock on door', 'ask brekka about ivar', 'ask about runa', 'ask about marta', 'ask about the way home', 'buy food', 'sleep here', 'rest', 'ask brekka about herself'],
    },
    {
      where: home('ivar'), by: 'ivar',
      lines: ['ask ivar about his hand', 'ask about the glove', 'ask ivar about marta', 'ask about bears', 'ask about hunting', 'ask about the spear', 'look at spear', 'ask ivar about the village', 'ask about the cold', 'ask about brekka', 'ask about runa', 'ask about the barrow', 'ask ivar about the north', 'give glove to ivar', 'ask about his knees', 'ask about the wolves', 'ask ivar about the old days'],
    },
    {
      where: home('runa'), by: 'runa', give: ['herb'],
      lines: ['ask runa about mushrooms', 'ask about frostcaps', 'ask about the tonic', 'buy tonic', 'make me a tonic', 'brew a tonic', 'ask about fenn', 'ask about the dead wood', 'ask about healing', 'heal me', 'ask runa about potions', 'ask about halla', 'ask runa about red moss', 'give frostcap to runa', 'sell mushrooms', 'ask about ivar', 'ask about brekka', 'ask about herbs'],
    },
    {
      where: tower,
      lines: ['look at the tower', 'enter the tower', 'go down the stairs', 'go down', 'descend', 'climb down', 'look at the wall', 'look at the doorway', 'look at the stair', 'climb the tower', 'search the tower', 'look at the ruins'],
    },
    {
      where: tower.replace('wild', 'crypt'), flags: { light: 1e9 }, by: 'hoard',
      lines: ['look', 'look at the treasure', 'take the gold', 'loot the treasure', 'take arm-rings', 'take cup', 'open the coffin', 'look in the coffin', 'push the lid', 'look at the niches', 'look at the urns', 'take urn', 'read the rune', 'touch the rune', 'look at the walls', 'go up', 'leave', 'climb the stairs', 'look at the pillars', 'search'],
    },
    {
      where: firstOf('deadwood'),
      lines: ['look at the trees', 'climb tree', 'chop tree', 'take wood', 'take branch', 'break a branch', 'listen', 'look at the bark', 'burn the trees', 'look at the frost'],
    },
    {
      where: firstOf('crags'),
      lines: ['look at the crags', 'climb the crags', 'climb rocks', 'look at the ledge', 'look at the bones', 'look for a cave', 'enter the den', 'look at the den', 'search the rocks', 'smell'],
    },
    {
      where: firstOf('open', (id) => (roomOf(content, id)!.things ?? []).some((t) => t.id === 'waymark')), by: 'waymark',
      lines: ['look at the cairn', 'read the cairn', 'look at the arrow', 'look at the rag', 'take the rag', 'follow the arrow', 'add a stone', 'push the cairn', 'climb the cairn', 'look at the kettle', 'which way is home', 'where is hollowmere'],
    },
    {
      where: 'village', by: 'odd', flags: { 'hearth.lit': true }, give: ['sword', 'mail', 'bearskin', 'ember'],
      lines: ['temper sword', 'sharpen sword', 'improve my blade', 'upgrade armour', 'temper mail', 'temper armour', 'reinforce my mail', 'repair sword', 'fix my sword', 'ask odd about tempering', 'ask odd about the forge', 'ask about steel', 'how much to temper', 'look at the forge', 'look at the fire', 'use ember', 'look at ember', 'open the box', 'warm my hands', 'sell bearskin', 'ask odd about the spear', 'make me a sword', 'forge a sword', 'buy armour', 'buy a bow', 'buy arrows'],
    },
    {
      where: 'hall', by: 'marta', flags: { 'hearth.lit': true, 'marta.met': true, 'marta.thane': true, 'quest:hearth': 5 },
      lines: ['ask for work', 'ask marta for work', 'ask about a job', 'ask elder about bounty', 'ask about the reavers', 'what should i do', 'ask about the ember', 'ask marta about ivar', 'ask about the thane', 'ask about my title', 'ask about pay', 'ask about the reward', 'ask about brekka', 'ask marta about the frontier', 'ask about the map', 'ask about the wild', 'look at the hearth', 'warm myself', 'sit by the fire', 'ask marta about the glove'],
    },
    {
      where: 'wild_2_1',
      lines: ['map', 'look at map', 'where am i', 'which way to the village', 'go home', 'go north', 'north', 'travel to hollowmere', 'run away', 'flee', 'hide', 'camp', 'make camp', 'light a fire', 'rest', 'wait', 'look for tracks', 'follow the tracks', 'hunt', 'skin the wolf', 'take pelt', 'dig in the snow', 'make a snowball', 'eat snow', 'look at the sky', 'look at the stars', 'look at the moon', 'what time is it', 'time'],
    },
  ];
  const stock = new Set([...content.fallbacks, content.text.noVerb]);
  let asked = 0;
  let missed = 0;
  for (const set of sets) {
    const out: string[] = [];
    for (const line of set.lines) {
      const sim = new Sim(content, { behaviours });
      for (const [k, v] of Object.entries(set.flags ?? {})) sim.state.flags[k] = v;
      for (const g of set.give ?? []) sim.give(g, 3);
      sim.p.gold = 500;
      sim.enterRoom(set.where, 160, 140);
      sim.rs.actors = sim.rs.actors.filter((a) => a.kind !== 'enemy');
      const who = set.by && (sim.rs.actors.find((a) => a.ref === set.by) ?? sim.things().find((t) => t.id === set.by));
      if (who) {
        sim.p.x = who.x + 8;
        sim.p.y = who.y + 2;
      }
      sim.drain();
      sim.step([{ t: 'say', line }]);
      const ev = sim.drain();
      const said = ev.flatMap((e) => (e.t === 'say' ? [e.text] : e.t === 'page' ? ['(page)'] : e.t === 'map' ? ['(map)'] : e.t === 'note' ? [e.text] : e.t === 'walk' ? ['(walks)'] : []));
      asked++;
      const first = said[0] ?? '(nothing)';
      if (stock.has(first) || first.startsWith('The saga has no use') || first === '(nothing)' || first === content.text.notHere || first === content.text.shrug) {
        missed++;
        out.push(`  ${line}  ->  ${first.slice(0, 70)}`);
      }
    }
    if (out.length) console.log(`${set.where}${set.by ? ' (' + set.by + ')' : ''}\n${out.join('\n')}`);
  }
  console.log(`${asked} lines tried, ${missed} without a proper answer.`);
}
if (mode === 'phrases') phrases();

// ---------------------------------------------------------------------------------------------
// Soak: an unkillable bot walks a long way through the frontier, into every vault it passes,
// touching everything. It is looking for crashes, dead ends and things that cannot be reached.

import { Bot } from '../tests/helpers';

function soak(steps: number): void {
  const sim = new Sim(content, { behaviours });
  const bot = new Bot(sim);
  sim.give('longsword');
  sim.give('torch');
  sim.teach('word:iska');
  sim.p.maxHp = sim.p.hp = 1e6;
  sim.p.skills.blade.lv = 60;
  sim.enterRoom('tower', 160, 140);
  const seen = new Set<string>();
  const problems: string[] = [];
  let rooms = 0;
  let vaults = 0;
  // A spiral out from the valley.
  const cells: [number, number][] = [];
  for (let r = 2; cells.length < steps; r++)
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (Math.max(Math.abs(x), Math.abs(y)) === r && cells.length < steps) cells.push([x, y]);
  for (const [x, y] of cells) {
    const id = `wild_${x}_${y}`;
    if (!roomOf(content, id)) continue;
    try {
      bot.travel(id);
      rooms++;
      const def = sim.room;
      for (const t of def.things ?? []) {
        if ((t.reach ?? 30) > 100 || seen.has(`${id}/${t.id}`)) continue;
        seen.add(`${id}/${t.id}`);
        bot.walkTo(t.x, t.y + 3, Math.max(10, (t.reach ?? 30) - 8));
        for (const line of t.try ?? []) bot.say(line);
        if (t.take) bot.say(`take ${t.nouns[0]}`);
      }
      for (const d of def.doors ?? []) {
        bot.door(d.to);
        vaults++;
        bot.say('light torch');
        bot.fight();
        for (const t of sim.room.things ?? []) if ((t.reach ?? 30) <= 100) (bot.walkTo(t.x, t.y + 3, (t.reach ?? 30) - 8), (t.try ?? []).forEach((l) => bot.say(l)));
        bot.door(id);
      }
    } catch (e) {
      problems.push(`${id}: ${(e as Error).message}`);
      // Carry on from somewhere sane.
      sim.p.dead = false;
      sim.enterRoom('tower', 160, 140);
    }
  }
  console.log(`${rooms} rooms walked, ${vaults} vaults entered, ${sim.state.score} points, ${sim.p.gold} silver, ${Math.round(sim.state.tick / 1200)} minutes of game time.`);
  console.log(problems.length ? problems.join('\n') : 'No problems.');
}
if (mode === 'soak') soak(Number(process.argv[3] ?? 60));

// ---------------------------------------------------------------------------------------------
// Fuzz: a monkey at the keyboard. Random keys and random two- and three-word commands, in random
// rooms, for a long time. Any exception is a bug; so is any number that stops being a number.

function fuzz(ticks: number): void {
  let seed = 12345;
  const rnd = (): number => ((seed = (Math.imul(seed, 1664525) + 1013904223) | 0) >>> 0) / 4294967296;
  const pick = <T>(list: readonly T[]): T => list[Math.floor(rnd() * list.length)];
  const verbs = Object.keys(content.vocab.verbs).filter((v) => !['save', 'restore', 'restart', 'quit', 'help'].includes(v));
  const nouns = Object.keys(content.vocab.nouns);
  const hand = Object.keys(content.rooms);
  const anyRoom = (): string => {
    const r = rnd();
    if (r < 0.4) return pick(hand);
    const id = `wild_${Math.floor(rnd() * 15) - 7}_${Math.floor(rnd() * 15) - 7}`;
    const def = roomOf(content, id);
    if (!def) return pick(hand);
    return r < 0.85 || !def.doors?.length ? id : def.doors[0].to;
  };
  let sim = new Sim(content, { behaviours, seed: 7 });
  const flagsToTry = ['hearth.lit', 'marta.stopped', 'hall.laid', 'gate.open', 'winter.broken', 'thaw.home', 'coal.given', 'sol.said', 'marta.met', 'tarn.frozen', 'bell.frozen'];
  const items = Object.keys(content.items);
  const problems = new Map<string, number>();
  const note = (what: string): void => void problems.set(what, (problems.get(what) ?? 0) + 1);
  let commands = 0;
  let deaths = 0;
  let last = '';
  for (let t = 0; t < ticks; t++) {
    try {
      const r = rnd();
      const intents: Intent[] = [];
      if (r < 0.02) {
        sim.enterRoom(anyRoom(), 20 + rnd() * 280, 100 + rnd() * 60);
        last = `enter ${sim.state.room}`;
      } else if (r < 0.03) sim.state.flags[pick(flagsToTry)] = rnd() < 0.7;
      else if (r < 0.045) sim.give(pick(items));
      else if (r < 0.05) {
        // Somebody to talk to: stand by whoever is here.
        const who = sim.rs.actors.find((a) => a.kind === 'npc');
        if (who) (sim.p.x = who.x + 8), (sim.p.y = who.y);
        const thing = pick(sim.things());
        if (!who && thing && (thing.reach ?? 30) < 100) (sim.p.x = thing.x), (sim.p.y = thing.y + 2);
      } else if (r < 0.2) {
        const line = [pick(verbs), ...(rnd() < 0.85 ? [pick(nouns)] : []), ...(rnd() < 0.25 ? [pick(nouns)] : [])].join(' ');
        last = `"${line}" in ${sim.state.room}`;
        intents.push({ t: 'say', line });
        commands++;
      } else if (r < 0.5) intents.push({ t: 'move', dx: Math.floor(rnd() * 3) - 1, dy: Math.floor(rnd() * 3) - 1 });
      else if (r < 0.58) intents.push({ t: 'attack' });
      else if (r < 0.62) intents.push({ t: 'block', on: rnd() < 0.5 });
      else if (r < 0.63) {
        // A point at the picture: there must always be an answer, and it must stay on the ground.
        const paces = routeTo(sim.scene(), sim.p.x, sim.p.y, Math.floor(rnd() * 320), Math.floor(rnd() * 168));
        last = `a route in ${sim.state.room}`;
        const sc = sim.scene();
        if (paces.length > 4000) note(`a route of ${paces.length} paces in ${sim.state.room}`);
        for (const q of paces) if (sc.blocked(q.x, q.y) || q.y <= sc.walkTop || q.y >= 166) note(`a route off the ground in ${sim.state.room}`);
        if (paces.length) intents.push({ t: 'move', dx: paces[0].dx, dy: paces[0].dy });
      }
      if (sim.p.pendingLevels > 0) intents.push({ t: 'level', pool: pick(['hp', 'mp', 'sp'] as const) });
      sim.step(intents);
      sim.drain();
      // What must always hold.
      const p = sim.p;
      const numbers: [string, number][] = [['hp', p.hp], ['mp', p.mp], ['sp', p.sp], ['x', p.x], ['y', p.y], ['gold', p.gold], ['score', sim.state.score], ['maxHp', p.maxHp]];
      for (const [name, v] of numbers) if (!Number.isFinite(v)) note(`${name} is ${v} after ${last}`);
      if (p.hp > p.maxHp + 1e-6 || p.mp > p.maxMp + 1e-6) note(`over the top after ${last}`);
      if (p.gold < 0) note(`negative silver after ${last}`);
      if (p.x < 0 || p.x >= 320 || p.y < 0 || p.y >= 168) note(`player out of the picture after ${last}`);
      for (const a of sim.rs.actors) if (!Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(a.hp)) note(`${a.ref} is nowhere after ${last}`);
      if (!roomOf(content, sim.state.room)) note(`in a room that does not exist: ${sim.state.room}`);
      if (t % 5000 === 0) JSON.parse(JSON.stringify(sim.state));
      if (p.dead) {
        deaths++;
        // Carry on as a restored player would: same world, back on their feet.
        const st = JSON.parse(JSON.stringify(sim.state));
        st.player.dead = false;
        st.player.hp = st.player.maxHp;
        st.player.act = 'idle';
        sim = new Sim(content, { behaviours, saved: st });
        sim.enterRoom('village', 160, 150);
      }
    } catch (e) {
      note(`CRASH ${(e as Error).message.slice(0, 80)} after ${last}`);
      sim = new Sim(content, { behaviours, seed: t });
    }
  }
  console.log(`${ticks} ticks, ${commands} commands, ${deaths} deaths, ${Object.keys(sim.state.rooms).length} rooms touched at the end.`);
  console.log(problems.size ? [...problems].slice(0, 25).map(([k, n]) => `${n}x ${k}`).join('\n') : 'No problems.');
}
if (mode === 'fuzz') fuzz(Number(process.argv[3] ?? 100000));

// ---------------------------------------------------------------------------------------------
// Campaign: a new Thane, mortal this time, takes the Elder's work again and again, spending the
// pay at the forge and the inn. Does what can be earned keep pace with what has to be fought?

function campaign(rounds: number): void {
  const sim = new Sim(content, { behaviours });
  const bot = new Bot(sim);
  // Roughly how the first saga leaves a player.
  Object.assign(sim.state.flags, { 'hearth.lit': true, 'marta.met': true, 'marta.thane': true, 'quest:hearth': 5, 'seen.village': true, 'hint.parry': true });
  for (const it of ['longsword', 'mail', 'shield', 'torch', 'ember']) sim.give(it);
  for (const w of ['word:veth', 'word:iska', 'word:orun']) sim.teach(w);
  sim.teach('mend');
  sim.p.maxHp = sim.p.hp = 80;
  sim.p.skills.blade.lv = 18;
  sim.p.gold = 40;
  sim.enterRoom('village', 160, 150);
  const row = (c: (string | number)[]): void => console.log(c.map((v, i) => String(v).padEnd([4, 22, 6, 8, 8, 8, 10, 8][i] ?? 8)).join(''));
  row(['#', 'target', 'rings', 'min hp', 'max hp', 'silver', 'temper', 'minutes']);
  for (let n = 1; n <= rounds; n++) {
    try {
      // Spend: draughts first, then the forge.
      bot.door('inn');
      bot.walkTo(250, 112, 14);
      while (sim.p.gold >= 6 && (sim.p.inv.potion ?? 0) < 5) bot.say('buy potion');
      bot.say('sleep');
      bot.door('village');
      bot.meet('odd');
      for (let k = 0; k < 4; k++) {
        const t = sim.p.temper ?? { weapon: 0, armor: 0 };
        const which = t.weapon <= t.armor ? 'sword' : 'mail';
        const cost = 40 + 30 * (which === 'sword' ? t.weapon : t.armor);
        if (sim.p.gold - cost < 18) break;
        bot.say(`temper ${which}`);
      }
      bot.door('hall');
      bot.meet('marta');
      bot.say('ask elder about work');
      const target = String(sim.state.flags['bounty.room'] ?? '');
      if (!target) throw new Error('no work offered');
      bot.minHp = {};
      bot.door('village');
      bot.travel(target);
      if (!sim.state.flags['bounty.done']) throw new Error('target not cleared');
      const low = Math.min(...Object.values(bot.minHp));
      bot.travel('village');
      bot.door('hall');
      bot.meet('marta');
      bot.say('talk to elder');
      bot.door('village');
      const at = target.split('_').slice(1).map(Number);
      const t = sim.p.temper ?? { weapon: 0, armor: 0 };
      row([n, roomOf(content, target)!.name, Math.max(Math.abs(at[0]), Math.abs(at[1])), low, sim.p.maxHp, sim.p.gold, `+${t.weapon}/+${t.armor}`, Math.round(sim.state.tick / 1200)]);
    } catch (e) {
      console.log(`round ${n}: ${(e as Error).message} (in ${sim.state.room} at ${sim.p.x},${sim.p.y}, hp ${Math.round(sim.p.hp)}, dead ${sim.p.dead}, act ${sim.p.act}, foes ${sim.rs.actors.filter((a) => a.kind === 'enemy' && a.act !== 'dead').map((a) => `${a.ref}@${Math.round(a.x)},${Math.round(a.y)}`).join(' ')})`);
      break;
    }
  }
  const p = sim.p;
  console.log(`Level ${p.level}, blade ${p.skills.blade.lv}, score ${sim.state.score}, ${Number(sim.state.flags.kills ?? 0)} foes felled.`);
}
if (mode === 'campaign') campaign(Number(process.argv[3] ?? 10));

// ---------------------------------------------------------------------------------------------
// Menus: every row of every conversation menu must lead somewhere. Each is tried standing next
// to its character, rich and carrying everything, before and after the first saga.

function menus(): void {
  const where: Record<string, string> = {};
  for (const r of Object.values(content.rooms)) for (const n of r.npcs ?? []) where[n.char] = r.id;
  for (const [who, at] of Object.entries(homes(content))) where[who] = `wild_${at[0]}_${at[1]}`;
  const stock = new Set([...content.fallbacks, content.text.noVerb, content.text.notHere, content.text.shrug, content.text.talkNoOne, content.text.notClose, content.text.personAway]);
  let tried = 0;
  const bad: string[] = [];
  for (const ch of Object.values(content.chars)) {
    for (const lit of [false, true]) {
      for (const m of ch.menu ?? []) {
        const sim = new Sim(content, { behaviours });
        if (lit) Object.assign(sim.state.flags, { 'hearth.lit': true, 'quest:hearth': 5, 'quest:north': 1 });
        for (const id of Object.keys(content.items)) sim.give(id, 3);
        for (const w of Object.values(content.words)) sim.teach(w.id);
        sim.p.gold = 999;
        sim.enterRoom(where[ch.id], 160, 140);
        const a = sim.rs.actors.find((k) => k.ref === ch.id);
        if (!a) continue;
        sim.p.x = a.x + 8;
        sim.p.y = a.y + 2;
        sim.rs.actors = sim.rs.actors.filter((k) => k.kind === 'npc');
        sim.step([{ t: 'say', line: `talk to ${ch.nouns[0]}` }]);
        sim.drain();
        // Only rows that would be on offer in this state.
        if (m.if && !m.if.every((c) => ruleTest(sim, c))) continue;
        sim.step([{ t: 'say', line: m.say }]);
        const said = sim.drain().flatMap((e) => (e.t === 'say' ? [e.text] : []));
        tried++;
        const first = said[0] ?? '(nothing)';
        if (stock.has(first) || first === '(nothing)' || first.startsWith('The saga has no use') || first === (ch.shrug ?? '')) bad.push(`${ch.name} / "${m.label}" (${m.say})${lit ? ' after the saga' : ''} -> ${first.slice(0, 60)}`);
      }
    }
  }
  console.log(`${tried} menu rows tried.`);
  console.log(bad.length ? bad.join('\n') : 'Every one leads somewhere.');
}
import { test as ruleTest } from '../src/engine/rules';
if (mode === 'menus') menus();

// ---------------------------------------------------------------------------------------------
// Tries: every command a thing offers (the buttons shown on touch screens, and what THINK lists)
// must get a real answer when the player stands by the thing. Also: LOOK at every thing.

function tries(): void {
  const stock = new Set([...content.fallbacks, content.text.noVerb, content.text.notHere, content.text.cantUse, content.text.notCarried]);
  const ids = Object.keys(content.rooms);
  for (let y = -5; y <= 5; y++)
    for (let x = -5; x <= 5; x++) {
      const def = roomOf(content, `wild_${x}_${y}`);
      if (!def) continue;
      ids.push(def.id);
      for (const d of def.doors ?? []) ids.push(d.to);
    }
  let tried = 0;
  const bad: string[] = [];
  for (const id of ids) {
    const def = roomOf(content, id)!;
    for (const t of def.things ?? []) {
      for (const line of [...(t.try ?? []), `look ${t.nouns[0]}`, ...(t.take ? [`take ${t.nouns[0]}`] : [])]) {
        const sim = new Sim(content, { behaviours });
        sim.state.flags.light = 1e9;
        for (const w of Object.values(content.words)) sim.teach(w.id);
        sim.enterRoom(id, 160, 140);
        sim.rs.actors = sim.rs.actors.filter((a) => a.kind === 'npc');
        if (t.hidden) sim.setThing(t.id, true);
        sim.p.x = t.x;
        sim.p.y = t.y + 2;
        sim.drain();
        sim.step([{ t: 'say', line }]);
        const first = sim.drain().flatMap((e) => (e.t === 'say' ? [e.text] : e.t === 'died' ? ['(died)'] : []))[0] ?? '(nothing)';
        tried++;
        if (stock.has(first) || first === '(nothing)' || first.startsWith('The saga has no use')) bad.push(`${id} / ${t.id}: "${line}" -> ${first.slice(0, 60)}`);
      }
    }
  }
  console.log(`${tried} commands tried in ${ids.length} rooms.`);
  console.log(bad.length ? [...new Set(bad)].slice(0, 30).join('\n') : 'Every one got a real answer.');
}
if (mode === 'tries') tries();

// ---------------------------------------------------------------------------------------------
// Rooms as files. `export <id>` prints any room (hand-made or generated) as JSON: the whole of
// what a room is. `room <file.json>` puts such a file through the gate every room must pass.

import { readFileSync } from 'node:fs';
import { validate } from '../src/engine/validate';
import type { RoomDef } from '../src/engine/types';

if (mode === 'export') console.log(JSON.stringify(roomOf(content, process.argv[3] ?? 'wild_2_1'), null, 2));
if (mode === 'room') {
  const room = JSON.parse(readFileSync(process.argv[3], 'utf8')) as RoomDef;
  const problems = validate(content, room);
  console.log(problems.length ? `${room.id}: rejected\n  ${problems.join('\n  ')}` : `${room.id}: accepted. It can be walked, everything in it can be reached, and every word and item it uses is known.`);
}

const MODES = ['words', 'fights', 'country', 'music', 'phrases', 'soak', 'fuzz', 'campaign', 'menus', 'tries', 'export', 'room', 'run'];
if (!MODES.includes(mode)) console.log(`usage: qa ${MODES.join(' | ')}`);

// ---------------------------------------------------------------------------------------------
// Run: a new Thane who will not fight sets out from the ford and runs for it, one way, as far as
// they can get. When anything comes close they step off the nearest edge of the picture and
// straight back, which is what a player does who has found that the wild forgets them. How far
// they get, and how fast, is how well the wild holds a player back.

function runner(ticks: number): void {
  const PWx = 320;
  for (const way of ['e', 'n', 'w', 's'] as const) {
    for (const seed of [1]) {
      const sim = new Sim(content, { behaviours, seed });
      const p = sim.p;
      const [vx, vy] = { e: [1, 0], w: [-1, 0], n: [0, -1], s: [0, 1] }[way];
      let best = 0;
      let paces: { dx: number; dy: number }[] = [];
      let hops = 0;
      let calm = 0;
      let drift = way === 'e' || way === 'w' ? 'n' : 'e';
      let lastRoom = '';
      let spot: [number, number] | null = null;
      let t = 0;
      const far = (): number => {
        const m = /^wild_(-?\d+)_(-?\d+)$/.exec(sim.state.room);
        return m ? Number(m[1]) * vx + Number(m[2]) * vy : 0;
      };
      for (; t < ticks && !p.dead; t++) {
        const sc = sim.scene();
        const foes = sim.rs.actors.filter((a) => alive(a) && content.enemies[a.ref]?.ai !== 'prey' && !(a.ai.lag > 0));
        const near = Math.min(999, ...foes.map((a) => Math.hypot(a.x - p.x, (a.y - p.y) * 2)));
        const ex = sim.room.exits ?? {};
        const edge = (side: string): [number, number] => (side === 'e' ? [PWx - 7, p.y] : side === 'w' ? [6, p.y] : side === 'n' ? [p.x, sc.walkTop + 1] : [p.x, 198]);
        // Somewhere along an edge that can actually be walked to, as near as may be.
        const plan = (side: string): { dx: number; dy: number }[] => {
          if (lastRoom === sim.state.room + side && spot) return routeTo(sc, p.x, p.y, spot[0], spot[1]);
          lastRoom = sim.state.room + side;
          const spots: [number, number][] = [];
          for (let k = 0; k <= 12; k++) {
            if (side === 'e' || side === 'w') spots.push([side === 'e' ? PWx - 7 : 6, sc.walkTop + 2 + ((198 - sc.walkTop - 4) * k) / 12]);
            else spots.push([8 + (304 * k) / 12, side === 'n' ? sc.walkTop + 1 : 197]);
          }
          spots.sort((a, b) => Math.hypot(a[0] - p.x, (a[1] - p.y) * 2) - Math.hypot(b[0] - p.x, (b[1] - p.y) * 2));
          for (const [tx, ty] of spots) {
            const r = routeTo(sc, p.x, p.y, tx, ty);
            const end = r[r.length - 1] ?? { x: p.x, y: p.y };
            if (Math.hypot(end.x - tx, (end.y - ty) * 2) < 6) {
              spot = [tx, ty];
              return r;
            }
          }
          spot = edge(side);
          return routeTo(sc, p.x, p.y, ...spot);
        };
        if (calm > 0) calm--;
        // Along the seam between two rows of screens: whenever anything comes close, step over
        // into the next row, where everything has just been put back where it started.
        const across = way === 'e' || way === 'w' ? ['n', 's'] : ['e', 'w'];
        let goal: string = way;
        // Up against a wall with no way through: follow it, looking for a gap.
        if (!ex[way as 'n']) {
          if (!ex[drift as 'n']) drift = across.find((s) => s !== drift && ex[s as 'n']) ?? drift;
          goal = drift;
        }
        if (near < 60 && !calm) {
          const sides = across.filter((s) => ex[s as 'n']);
          const d = (s: string): number => Math.hypot(edge(s)[0] - p.x, (edge(s)[1] - p.y) * 2);
          goal = sides.sort((a, b) => d(a) - d(b))[0] ?? way;
        }
        if (t % 6 === 0 || !paces.length) paces = plan(goal);
        const pace = paces.shift() ?? { dx: { e: 1, w: -1 }[goal as 'e'] ?? 0, dy: { n: -1, s: 1 }[goal as 'n'] ?? 0 };
        let dx = pace.dx;
        let dy = pace.dy;
        // At the edge, keep pressing outward.
        if (!paces.length) [dx, dy] = [{ e: 1, w: -1 }[goal as 'e'] ?? 0, { n: -1, s: 1 }[goal as 'n'] ?? 0];
        const room = sim.state.room;
        sim.step([{ t: 'move', dx, dy }]);
        if (sim.state.room !== room) {
          paces = [];
          if (goal !== way) (hops++, (calm = 20));
          best = Math.max(best, far());
        }
      }
      console.log(`${way}: ${best} screens out (${p.dead ? 'dead' : 'alive'}) after ${Math.round(t / 20)}s, ${hops} hops, ${Math.round(p.hp)} hp left`);
    }
  }
}
if (mode === 'run') runner(Number(process.argv[3] ?? 12000));
