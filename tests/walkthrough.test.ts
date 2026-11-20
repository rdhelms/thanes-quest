import { describe, expect, it } from 'vitest';
import { questKey } from '../src/engine/rules';
import { content } from '../src/game/content';
import { Bot, awardsOnOffer, game, pointsOnOffer } from './helpers';

/**
 * Plays the whole game from a new start, earning every point on offer, using nothing but the intents a
 * keyboard sends: no teleporting, no flags set by hand. If any room, rule, fight or quest is
 * broken, this fails.
 */
function playThrough(reloadEvery = 0, sloth = 0): Bot {
  const bot = new Bot(game());
  bot.reloadEvery = reloadEvery;
  bot.sloth = sloth;
  const { sim } = bot;
  const has = (item: string): boolean => (sim.p.inv[item] ?? 0) > 0;

  // The ford, then into Hollowmere.
  bot.walkTo(196, 162, 20);
  expect(bot.say('read sign')).toContain('HOLLOWMERE');
  // Up the road to the village: a screen of it, with perhaps a wolf on it.
  bot.travel('village');
  expect(sim.state.room).toBe('village');
  bot.walkTo(172, 126, 12);
  bot.say('take hatchet');
  bot.say('equip hatchet');
  expect(sim.p.weapon).toBe('hatchet');
  bot.walkTo(146, 124, 12);
  bot.say('take wood');
  expect(has('log')).toBe(true);
  bot.meet('sigga');
  expect(bot.say('talk to sigga')).toContain('I am Sigga');

  // The Elder gives the main quest.
  bot.door('hall');
  bot.meet('marta');
  expect(bot.say('talk to elder')).toContain('Nine days ago');
  expect(sim.p.gold).toBe(10);
  bot.door('village');
  bot.door('inn');
  bot.walkTo(250, 112, 14);
  bot.say('talk to halla');
  bot.door('village');

  // East: the farmer, the hermit and his free spell book.
  bot.travel('farm');
  bot.meet('gorm');
  expect(bot.say('talk to farmer')).toContain('seed grain');
  bot.travel('tarn');
  expect(sim.state.room).toBe('tarn');
  bot.door('hut');
  bot.walkTo(122, 150, 14);
  bot.say('take tome');
  expect(bot.say('read tome')).toContain('how fire is spoken to');
  bot.meet('fenn');
  bot.say('talk to fenn');
  expect(bot.say('ask fenn about the barrow')).toContain('VETH');
  expect(bot.say('ask fenn about the tarn')).toContain('amulet');
  bot.door('tarn');

  // South-east: the watchtower, its lookout, and the word ISKA.
  bot.travel('tower');
  expect(sim.state.room).toBe('tower');
  bot.fight();
  bot.walkTo(100, 138, 12);
  expect(bot.say('read the stone')).toContain('ISKA');

  // West along the river to the bandit camp.
  bot.travel('camp');
  expect(sim.state.room).toBe('camp');
  bot.fight();
  bot.walkTo(56, 162, 14);
  expect(bot.say('open chest')).toContain('seed grain');

  // North through the pinewood to the ridge for VETH, killing wolves for Toke on the way.
  bot.travel('pinewood');
  expect(sim.state.room).toBe('pinewood');
  bot.fight();
  bot.meet('toke');
  expect(bot.say('talk to hunter')).toContain('Kill three');
  bot.travel('ridge');
  expect(sim.state.room).toBe('ridge');
  bot.fight();
  bot.walkTo(152, 132, 12);
  expect(bot.say('touch the rune')).toContain('VETH');
  bot.travel('pinewood');
  bot.meet('toke');
  expect(bot.say('talk to hunter')).toContain('A bargain is a bargain');
  expect(has('bow')).toBe(true);

  // Back east: return the grain, freeze the tarn, fetch the amulet.
  bot.travel('farm');
  bot.meet('gorm');
  expect(bot.say('talk to farmer')).toContain('twenty-five silver');
  bot.travel('tarn');
  bot.waitFor('word:iska');
  expect(bot.say('iska')).toContain('thickens');
  bot.walkTo(124, 137, 4);
  bot.say('take amulet');
  expect(has('amulet')).toBe(true);
  bot.door('hut');
  bot.meet('fenn');
  expect(bot.say('give amulet to fenn')).toContain('Light');
  bot.say('read tome');
  expect(sim.p.spells).toContain('light');
  bot.say('buy mend');
  bot.say('read tome');
  expect(sim.p.spells).toContain('mend');
  bot.door('tarn');

  // Arm up in the village. The pelts go to the smith first: a pack has only so much room.
  bot.travel('village');
  bot.meet('odd');
  sellAll(bot, 'pelt');
  expect(bot.say('buy sword')).toContain('iron sword');
  bot.say('equip sword');
  bot.door('inn');
  // The hatchet has done its work. It can wait in the chest at the foot of the bed.
  bot.walkTo(44, 118, 16);
  expect(bot.say('put the hatchet in the chest')).toContain('You put the hatchet in the chest');
  expect(has('hatchet')).toBe(false);
  bot.walkTo(250, 112, 14);
  while (sim.p.gold >= 6 && sim.fits('potion')) bot.say('buy potion');
  bot.door('village');

  // The barrow.
  bot.travel('barrow');
  bot.walkTo(160, 126, 8);
  bot.waitFor('word:veth');
  expect(bot.say('veth')).toContain('slides down');
  bot.door('ante');
  bot.walkTo(124, 112, 10);
  bot.say('push wolf');
  bot.walkTo(170, 112, 10);
  bot.say('push stag');
  bot.walkTo(216, 112, 10);
  expect(bot.say('push crown')).toContain('way down is open');
  bot.door('sleepers');
  bot.say('cast light');
  expect(sim.isDark()).toBe(false);
  bot.waitFor('word:iska');
  bot.fight();
  while (sim.p.hp < sim.p.maxHp - 12 && sim.p.mp >= 8) bot.say('cast mend');
  bot.waitFor('word:iska');
  bot.door('throne');
  bot.fight();
  expect(sim.state.flags['king.dead']).toBe(true);
  expect(has('crown')).toBe(true);
  bot.walkTo(286, 112, 12);
  expect(bot.say('read rune')).toContain('ORUN');
  bot.walkTo(270, 158, 14);
  expect(bot.say('take treasure')).toContain('sixty');

  // Out again, and light the hearth.
  bot.door('sleepers');
  bot.door('ante');
  bot.door('barrow');
  bot.travel('village');
  bot.door('hall');
  bot.meet('marta');
  expect(bot.say('talk to elder')).toContain('You light it');
  bot.walkTo(160, 110, 10);
  bot.say('light hearth');
  expect(sim.state.won).toBe(true);
  // The village has come in to see it. The night ends at the door, with the ember and the crown.
  expect(sim.rs.actors.filter((a) => a.kind === 'npc').length).toBe(6);
  expect(has('ember')).toBe(false);

  // Loose ends, for every last point: the hidden cache and the last two spell books.
  bot.door('village');
  expect(bot.log.join(' ')).toContain("So ends the first saga of THANE'S QUEST");
  expect(has('ember') && has('crown')).toBe(true);
  bot.travel('tower');
  bot.say('orun');
  bot.walkTo(150, 160, 12);
  expect(bot.say('open chest')).toContain('forty silver');
  bot.travel('tarn');
  bot.door('hut');
  // The books already read go back on Fenn's shelf, where they weigh on nobody.
  bot.meet('fenn');
  expect(bot.say('return the books to fenn')).toContain('on a shelf is a book');
  expect(has('tomeFlame') || has('tomeLight') || has('tomeMend')).toBe(false);
  bot.say('buy frost');
  bot.say('read tome');
  bot.say('buy ward');
  bot.say('read tome');
  return bot;
}

/** Sell every one of a thing to whoever is at hand, as long as they are buying. */
function sellAll(bot: Bot, item: string): void {
  for (let n = bot.p.inv[item] ?? 0; n > 0; n = bot.p.inv[item] ?? 0) {
    bot.say(`sell ${item}`);
    if ((bot.p.inv[item] ?? 0) >= n) throw new Error(`Nobody here would buy the ${item}: ${bot.log[bot.log.length - 1]}`);
  }
}

const STORY = ['hearth', 'stores', 'wolves', 'errand'];

describe('walkthrough', () => {
  it('can be played from the first screen to the end of the first saga', () => {
    const bot = playThrough();
    const { state } = bot.sim;
    expect(state.won).toBe(true);
    for (const id of STORY) expect(state.flags[questKey(id)], id).toBe(content.quests[id].done);
    expect(state.player.words.sort()).toEqual(['word:iska', 'word:orun', 'word:veth']);
    expect(state.player.spells.sort()).toEqual(['flame', 'frost', 'light', 'mend', 'ward']);
    expect(state.score).toBeGreaterThan(150);
    // QA=1 npm test prints how the story left the player, for judging pace.
    if ((globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.QA) {
      const p = state.player;
      console.log(JSON.stringify({ minutes: Math.round(state.tick / 1200), level: p.level, maxHp: p.maxHp, gold: p.gold, score: state.score, skills: Object.fromEntries(Object.entries(p.skills).map(([k, v]) => [k, v.lv])), minHp: bot.minHp }));
    }
  }, 20000);

  it('plays out identically every time', () => {
    expect(playThrough().sim.state).toEqual(playThrough().sim.state);
  }, 30000);

  it('plays out identically when saved and restored every few seconds along the way', () => {
    // Nothing the game knows may live anywhere but in what is saved.
    expect(playThrough(37).sim.state).toEqual(playThrough().sim.state);
  }, 30000);
});

describe('a slower hand', () => {
  it('can still finish the first saga, if not comfortably', () => {
    // A player who dithers most of a second after every swing, and never once raises a guard.
    const bot = playThrough(0, 14);
    expect(bot.sim.state.won).toBe(true);
    if ((globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.QA) console.log('SLOW ' + JSON.stringify(bot.minHp));
  }, 20000);
});

describe('a Thane', () => {
  it('can do everything the valley and the country beyond it have to offer', async () => {
    const { homes, lair, roomOf } = await import('../src/engine/frontier');
    // Saved and restored every few seconds throughout, as a real player's game would be.
    const bot = playThrough(61);
    const { sim } = bot;
    const has = (item: string): boolean => (sim.p.inv[item] ?? 0) > 0;
    const cell = (at: [number, number]): string => `wild_${at[0]}_${at[1]}`;
    /** Whatever the journal says just now must have every blank filled in. */
    const journalReads = (): void => {
      for (const q of Object.values(content.quests)) {
        const stage = Number(sim.state.flags[questKey(q.id)] ?? 0);
        if (!stage || !q.stages[stage]) continue;
        const line = sim.fill(q.stages[stage]);
        expect(line, q.name).not.toMatch(/\{|  | ,| \.|at , /);
        for (const hole of q.stages[stage].match(/\{[\w.]+\}/g) ?? []) expect(String(sim.state.flags[hole.slice(1, -1)] ?? content.flags?.[hole.slice(1, -1)] ?? ''), `${q.name} ${hole}`).not.toBe('');
      }
    };
    const elder = (): void => {
      bot.travel('village');
      bot.door('hall');
      bot.meet('marta');
    };

    // From the hermit's hut back to the village, to arm properly.
    bot.door('tarn');
    bot.travel('village');
    bot.meet('odd');
    expect(bot.say('buy longsword')).toContain('Sixty silver');
    expect(bot.say('buy mail')).toContain('Forty-five');
    // The iron sword goes back to the man who made it, and the bow into the chest at the inn:
    // the country out there is long, and the wolves in it have pelts worth carrying home.
    expect(bot.say('sell the sword back')).toContain('10 silver');
    expect(has('sword')).toBe(false);
    bot.door('inn');
    bot.walkTo(44, 118, 16);
    expect(bot.say('put bow in chest')).toContain('You put the hunting bow in the chest');
    expect(bot.say('look in the chest')).toContain('a hatchet, a hunting bow');
    bot.door('village');

    // The Elder's work: out to wherever she names, and back to be paid.
    bot.door('hall');
    bot.meet('marta');
    expect(bot.say('talk to elder')).toContain('more work');
    bot.meet('marta');
    expect(bot.say('talk to elder')).toContain("The Elder's Work");
    const target = String(sim.state.flags['bounty.room']);
    const pay = Number(sim.state.flags['bounty.pay']);
    journalReads();
    bot.door('village');
    bot.travel(target);
    expect(sim.state.flags['bounty.done']).toBe(true);
    elder();
    const gold = sim.p.gold;
    expect(bot.say('talk to elder')).toContain(`${pay} silver`);
    expect(sim.p.gold).toBe(gold + pay);
    bot.door('village');

    // Spend it at the forge.
    bot.meet('odd');
    sim.p.gold = Math.max(sim.p.gold, 40);
    expect(bot.say('have my sword tempered')).toContain('Better');
    expect(sim.p.temper?.weapon).toBe(1);

    // Ivar's message, and Marta's answer.
    const at = homes(content);
    bot.travel(cell(at.ivar));
    bot.meet('ivar');
    bot.say('talk to ivar');
    expect(bot.say('ask ivar about the elder')).toContain('not dead yet');
    elder();
    expect(bot.say('talk to elder')).toContain('grey glove');
    journalReads();
    bot.door('village');
    bot.travel(cell(at.ivar));
    bot.meet('ivar');
    expect(bot.say('talk to ivar')).toContain('boar-spear');
    expect(sim.p.weapon).toBe('spear');

    // Brekka's bear.
    bot.travel(cell(at.brekka));
    bot.meet('brekka');
    bot.say('talk to brekka');
    expect(bot.say('ask brekka about bears')).toContain('Greyback');
    journalReads();
    bot.travel(cell(lair(content, 'greyback')!));
    expect(sim.state.flags[questKey('greyback')]).toBe(2);
    journalReads();
    bot.travel(cell(at.brekka));
    bot.meet('brekka');
    expect(bot.say('talk to brekka')).toContain('keep you warm');
    expect(sim.p.armor).toBe('bearcloak');
    // Six of the wolves met on the way are worth more to Brekka than to anybody: she makes a pack of them.
    const room = sim.limit();
    expect(bot.say('ask brekka about a pack')).toContain('They can carry yours');
    expect(sim.limit()).toBe(room + 20);

    // Frostcaps for Runa: gathered wherever they grow nearest.
    const patches: string[] = [];
    for (let r = 2; r <= 6 && patches.length < 3; r++)
      for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++)
          if (Math.max(Math.abs(x), Math.abs(y)) === r && patches.length < 3 && (roomOf(content, cell([x, y]))?.things ?? []).some((t) => t.id === 'herb')) patches.push(cell([x, y]));
    for (const id of patches) {
      bot.travel(id);
      const herb = sim.room.things!.find((t) => t.id === 'herb')!;
      bot.walkTo(herb.x, herb.y + 3, 14);
      bot.say('pick frostcaps');
    }
    expect(sim.p.inv.herb).toBe(3);
    bot.travel(cell(at.runa));
    bot.meet('runa');
    bot.say('talk to runa');
    expect(bot.say('trade frostcaps for a tonic')).toContain('mortar');
    const hp = sim.p.maxHp;
    bot.say('drink tonic');
    expect(sim.p.maxHp).toBe(hp + 5);
    expect(has('tonic')).toBe(false);

    // Two places with names of their own: a bell in the ice to the east, a tree of ropes to the north.
    bot.travel('bellmere');
    bot.waitFor('word:iska');
    expect(bot.say('iska')).toContain('out to the bell');
    bot.walkTo(160, 142, 4);
    const mana = sim.p.maxMp;
    expect(bot.say('ring the bell')).toContain('one note');
    expect(sim.p.maxMp).toBe(mana + 10);
    bot.travel('hangtree');
    bot.walkTo(174, 136, 14);
    expect(bot.say('cut down the ropes')).toContain('least that can be done');
    bot.waitFor('word:orun');
    expect(bot.say('orun')).toContain('a lid');
    bot.walkTo(204, 140, 12);
    expect(bot.say('open chest')).toContain('Seventy silver');
    expect(has('torc')).toBe(true);

    // And one to the south, which keeps what it has until dark.
    bot.travel('dolmen');
    bot.walkTo(160, 136, 10);
    if (sim.daylight() >= 0.35) expect(bot.say('read the rune')).toContain('WHEN THE SUN IS GONE');
    while (sim.daylight() >= 0.35) bot.step();
    expect(bot.say('read the rune')).toContain('SOL');
    expect(sim.p.words).toContain('word:sol');

    // The second saga: the crown, the Frost Gate, and the anvil it was made on.
    expect(sim.state.flags[questKey('crown')]).toBe(1);
    bot.travel('village');
    bot.door('inn');
    bot.walkTo(250, 112, 14);
    while (sim.p.gold >= 6 && (sim.p.inv.potion ?? 0) < 8 && sim.fits('potion')) bot.say('buy potion');
    bot.door('village');
    bot.travel('tarn');
    bot.door('hut');
    bot.meet('fenn');
    expect(bot.say('show fenn the crown')).toContain('Frost Gate');
    expect(bot.say('tell fenn about orun')).toContain('Sixty years');
    expect(sim.state.flags['goal.gate']).toBe('frostgate');
    journalReads();
    bot.door('tarn');
    bot.travel('frostgate');
    bot.walkTo(160, 128, 10);
    bot.waitFor('word:orun');
    expect(bot.say('orun')).toContain('doorway');
    bot.door('rimehall');
    bot.waitFor('word:iska');
    bot.fight();
    expect(sim.state.flags['smith.dead']).toBe(true);
    bot.walkTo(160, 142, 16);
    const before = sim.p.maxHp;
    expect(bot.say('put the crown on the anvil')).toContain('second saga');
    expect(sim.p.maxHp).toBe(before + 20);
    expect(has('crown')).toBe(false);
    bot.door('frostgate');
    bot.travel('tarn');
    bot.door('hut');
    bot.meet('fenn');
    expect(bot.say('talk to fenn')).toContain('puddle');

    // Home the quick way, to a village that has noticed.
    bot.door('tarn');
    expect(bot.say('breathe on the ember')).toContain('square at Hollowmere');
    expect(bot.say('look')).toContain('a drip at every eave');
    bot.door('hall');
    bot.meet('marta');
    expect(bot.say('talk to elder')).toContain('the well thawed');
    expect(bot.say('deeds')).toBe('');

    // The third saga: the dead still walk. Marta asks, Fenn reasons it out, and the barrow has a second door.
    expect(bot.say('talk to elder')).toContain('what they are waiting for');
    bot.door('village');
    bot.travel('tarn');
    bot.door('hut');
    bot.meet('fenn');
    expect(bot.say('talk to fenn')).toContain('whose dead they are');
    bot.door('tarn');
    bot.travel('barrow');
    bot.walkTo(140, 132, 10);
    expect(bot.say('veth')).toContain('see it before it can hear you');
    bot.waitFor('word:orun');
    expect(bot.say('orun')).toContain('a second door');
    bot.waitFor('word:veth');
    expect(bot.say('veth')).toContain("servants' stair");
    bot.door('tally');
    bot.say('cast light');
    expect(bot.say('read the tally')).toContain('nine thousand and eleven');
    bot.door('winterhall');
    expect(bot.say('look')).toContain('stone cold');
    expect(sim.rs.actors.filter((a) => a.kind === 'npc').length).toBe(5);
    bot.walkTo(160, 116, 10);
    expect(bot.say('cast flame')).toContain('It would have to be brought');
    bot.waitFor('word:sol');
    expect(bot.say('sol')).toContain('ashamed');
    expect(bot.say('light the hearth')).toContain("coal from Marta's hearth");
    expect(has('ember')).toBe(false);
    bot.waitFor('word:sol');
    expect(bot.say('sol')).toContain('third saga');
    expect(sim.rs.actors.length).toBe(0);
    // The count on the stair can be closed now, and the Elder has another coal.
    bot.door('tally');
    bot.say('cast light');
    bot.walkTo(236, 150, 20);
    expect(bot.say('use the chisel')).toContain('Nine thousand and eleven, and done');
    bot.door('barrow');
    expect(bot.say('look')).toContain('a thread of smoke');
    bot.travel('village');
    bot.door('hall');
    bot.meet('marta');
    expect(bot.say('talk to elder')).toContain('I have a hearthful');
    expect(has('ember')).toBe(true);

    // Nothing the content offers has been left undone.
    for (const q of Object.values(content.quests)) if (!q.repeats) expect(sim.state.flags[questKey(q.id)], q.name).toBe(q.done);
    for (const id of awardsOnOffer().keys()) expect(sim.state.scored, id).toContain(id);
    expect(sim.state.score).toBeGreaterThan(pointsOnOffer());
  }, 60000);
});

describe('beyond the map', () => {
  it('can be walked, fought through and walked back from', () => {
    const bot = new Bot(game('tower', 160, 140));
    const { sim } = bot;
    // Kitted out as someone who has finished the first saga would be.
    sim.give('longsword');
    sim.give('mail');
    sim.give('potion', 6);
    sim.teach('word:iska');
    sim.p.maxHp = sim.p.hp = 90;
    sim.p.skills.blade.lv = 20;
    bot.fight();
    const visited: string[] = [];
    for (let i = 0; i < 3; i++) {
      bot.exit('e');
      visited.push(sim.state.room);
      bot.fight();
      if ((sim.room.things ?? []).some((t) => t.id === 'cache')) {
        const chest = sim.room.things!.find((t) => t.id === 'cache')!;
        bot.walkTo(chest.x, chest.y + 4, 14);
        expect(bot.say('open chest')).toContain('silver');
      }
    }
    // Off the east edge of the valley, one ring further out each time.
    expect(visited).toEqual(['wild_3_2', 'wild_4_2', 'wild_5_2']);
    expect(sim.state.score).toBeGreaterThanOrEqual(5);
    for (let i = 0; i < 3; i++) bot.exit('w');
    expect(sim.state.room).toBe('tower');
  });
});
