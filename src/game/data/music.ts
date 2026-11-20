// The game's music, written out as data. Nine original pieces.
//
// The mood aimed for is northern and unhurried: modal harmony, drones, a harp picking out slow
// broken chords, a flute or horn carrying a tune over the top. Warm in the village and by a
// fire, sparse out in the wild, cold underground.

import type { TuneDef } from '../../engine/tune';

/** One bar of broken chord for the harp, in eighth notes: up through the chord and back. */
const arp = (n: string[]): string => `${n[0]}:.5 ${n[1]}:.5 ${n[2]}:.5 ${n[3]}:.5 ${n[4]}:.5 ${n[3]}:.5 ${n[2]}:.5 ${n[1]}:.5 |`;
const DM = ['D3', 'A3', 'D4', 'F4', 'A4'];
const C = ['C3', 'G3', 'C4', 'E4', 'G4'];
const BB = ['Bb2', 'F3', 'Bb3', 'D4', 'F4'];
const F = ['F2', 'C3', 'F3', 'A3', 'C4'];
const AM = ['A2', 'E3', 'A3', 'C4', 'E4'];
const G = ['G2', 'D3', 'G3', 'B3', 'D4'];

/** The valley: the main theme. D Dorian, the raised sixth giving it a little light. */
const valley: TuneDef = {
  id: 'valley', bpm: 72, beats: 4, bars: 16,
  parts: [
    {
      inst: 'pad', vol: 0.34,
      notes: '[D3 A3 F4]:8 | [C3 G3 E4]:8 | [Bb2 F3 D4]:4 | [F2 C3 A3]:4 | [C3 G3 E4]:4 | [A2 E3 C4]:4 | [D3 A3 F4]:4 | [F2 C3 A3]:4 | [G2 D3 B3]:4 | [D3 A3 F4]:4 | [Bb2 F3 D4]:4 | [C3 G3 E4]:4 | [D3 A3 F4]:8 |',
    },
    {
      inst: 'harp', vol: 0.45,
      notes: [DM, DM, C, C, BB, F, C, AM, DM, F, G, DM, BB, C, DM, DM].map(arp).join(' '),
    },
    {
      inst: 'flute', vol: 0.5,
      notes:
        '-:16 | D5:2 F5:1 D5:1 | C5:3 A4:1 | G4:2 C5:1 E5:1 | E5:3 -:1 | D5:1.5 E5:.5 F5:2 | A5:2 G5:1 F5:1 | G5:1.5 F5:.5 E5:1 D5:1 | D5:4 | F5:2 D5:2 | E5:2 C5:1 E5:1 | D5:4 | -:4 |',
    },
    {
      inst: 'bass', vol: 0.2,
      notes: 'D2:8 | C2:8 | Bb1:4 | F2:4 | C2:4 | A1:4 | D2:4 | F2:4 | G2:4 | D2:4 | Bb1:4 | C2:4 | D2:8 |',
    },
  ],
};

/** One bar of the village waltz for the harp, by chord: a bass note, then the chord broken above it. */
const W = {
  G: 'G2:1 D3:.5 G3:.5 B3:.5 G3:.5 |',
  C: 'C3:1 G3:.5 C4:.5 E4:.5 C4:.5 |',
  D: 'D3:1 A3:.5 D4:.5 F#4:.5 D4:.5 |',
  Em: 'E2:1 B2:.5 E3:.5 G3:.5 E3:.5 |',
  Am: 'A2:1 E3:.5 A3:.5 C4:.5 A3:.5 |',
};

/** Hollowmere: a slow waltz in G, cosier than the weather warrants. */
const village: TuneDef = {
  id: 'village', bpm: 100, beats: 3, bars: 32,
  parts: [
    {
      inst: 'harp', vol: 0.55,
      notes:
        'G2:1 D3:.5 G3:.5 B3:.5 G3:.5 | G2:1 D3:.5 G3:.5 B3:.5 G3:.5 | C3:1 G3:.5 C4:.5 E4:.5 C4:.5 | G2:1 D3:.5 G3:.5 B3:.5 G3:.5 | ' +
        'E2:1 B2:.5 E3:.5 G3:.5 E3:.5 | C3:1 G3:.5 C4:.5 E4:.5 C4:.5 | D3:1 A3:.5 D4:.5 F#4:.5 D4:.5 | D3:1 A3:.5 D4:.5 F#4:.5 D4:.5 | ' +
        'G2:1 D3:.5 G3:.5 B3:.5 G3:.5 | B2:1 F#3:.5 B3:.5 D4:.5 B3:.5 | C3:1 G3:.5 C4:.5 E4:.5 C4:.5 | G2:1 D3:.5 G3:.5 B3:.5 G3:.5 | ' +
        'A2:1 E3:.5 A3:.5 C4:.5 A3:.5 | D3:1 A3:.5 D4:.5 F#4:.5 D4:.5 | G2:1 D3:.5 G3:.5 B3:.5 G3:.5 | G2:1 D3:1 G3:1 | ' +
        // Second strain: the same waltz, turned toward E minor and back.
        [W.Em, W.Em, W.C, W.C, W.G, W.G, W.D, W.D, W.Em, W.Em, W.C, W.C, W.Am, W.D, W.G].join(' ') + ' G2:1 D3:1 G3:1 |',
    },
    {
      inst: 'flute', vol: 0.5,
      notes:
        'B4:1 D5:2 | G5:2 F#5:1 | E5:2 C5:1 | D5:3 | E5:1 G5:1 B5:1 | A5:2 G5:1 | F#5:2 A5:1 | D5:3 | ' +
        'B4:1 D5:2 | F#5:2 D5:1 | E5:1 G5:1 E5:1 | D5:3 | C5:2 E5:1 | D5:1 F#5:1 A5:1 | G5:3 | -:3 | ' +
        'E5:2 G5:1 | G5:1 E5:2 | E5:2 C5:1 | G4:3 | B4:1 D5:2 | G5:2 D5:1 | F#5:2 A5:1 | D5:3 | ' +
        'E5:1 G5:1 B5:1 | B5:2 G5:1 | E5:2 G5:1 | C5:3 | A4:1 C5:1 E5:1 | D5:2 F#5:1 | G5:3 | -:3 |',
    },
    {
      inst: 'pad', vol: 0.36,
      notes:
        '[G3 B3 D4]:6 | [C3 E3 G3]:3 | [G3 B3 D4]:3 | [E3 G3 B3]:3 | [C3 E3 G3]:3 | [D3 F#3 A3]:6 | ' +
        '[G3 B3 D4]:3 | [B2 D3 F#3]:3 | [C3 E3 G3]:3 | [G3 B3 D4]:3 | [A2 C3 E3]:3 | [D3 F#3 A3]:3 | [G3 B3 D4]:6 | ' +
        '[E3 G3 B3]:6 | [C3 E3 G3]:6 | [G3 B3 D4]:6 | [D3 F#3 A3]:6 | [E3 G3 B3]:6 | [C3 E3 G3]:6 | [A2 C3 E3]:3 | [D3 F#3 A3]:3 | [G3 B3 D4]:6 |',
    },
  ],
};

/** By a fire: a lute-like pattern in A minor with a low tune over it. */
const hearth: TuneDef = {
  id: 'hearth', bpm: 66, beats: 4, bars: 16,
  parts: [
    {
      inst: 'harp', vol: 0.6,
      notes:
        'A2:1 E3:.5 A3:.5 C4:1 E4:1 | F2:1 C3:.5 F3:.5 A3:1 C4:1 | C3:1 G3:.5 C4:.5 E4:1 G4:1 | G2:1 D3:.5 G3:.5 B3:1 D4:1 | ' +
        'A2:1 E3:.5 A3:.5 C4:1 E4:1 | F2:1 C3:.5 F3:.5 A3:1 C4:1 | E2:1 B2:.5 E3:.5 G#3:1 B3:1 | A2:1 E3:.5 A3:.5 C4:1 A3:1 | ' +
        // Second strain: out through C and back by way of E.
        'C3:1 G3:.5 C4:.5 E4:1 G4:1 | G2:1 D3:.5 G3:.5 B3:1 D4:1 | A2:1 E3:.5 A3:.5 C4:1 E4:1 | E2:1 B2:.5 E3:.5 G3:1 B3:1 | ' +
        'F2:1 C3:.5 F3:.5 A3:1 C4:1 | C3:1 G3:.5 C4:.5 E4:1 G4:1 | E2:1 B2:.5 E3:.5 G#3:1 B3:1 | A2:1 E3:.5 A3:.5 C4:1 A3:1 |',
    },
    {
      inst: 'flute', vol: 0.42,
      notes:
        'A4:2 C5:2 | A4:3 -:1 | G4:2 E5:2 | D5:3 -:1 | C5:2 E5:2 | F5:2 E5:1 C5:1 | B4:3 -:1 | A4:4 | ' +
        'E5:2 G5:2 | D5:3 -:1 | C5:2 E5:1 C5:1 | B4:3 -:1 | A4:2 C5:2 | E5:2 D5:1 C5:1 | B4:2 G#4:2 | A4:4 |',
    },
    {
      inst: 'pad', vol: 0.3,
      notes:
        '[A2 E3 C4]:4 | [F2 C3 A3]:4 | [C3 G3 E4]:4 | [G2 D3 B3]:4 | [A2 E3 C4]:4 | [F2 C3 A3]:4 | [E2 B2 G#3]:4 | [A2 E3 C4]:4 | ' +
        '[C3 G3 E4]:4 | [G2 D3 B3]:4 | [A2 E3 C4]:4 | [E2 B2 G3]:4 | [F2 C3 A3]:4 | [C3 G3 E4]:4 | [E2 B2 G#3]:4 | [A2 E3 C4]:4 |',
    },
  ],
};

/** The wild: a drone on E, a horn calling across a great deal of empty space. */
const wild: TuneDef = {
  id: 'wild', bpm: 54, beats: 4, bars: 16,
  parts: [
    { inst: 'pad', vol: 0.5, notes: '[E2 B2 E3]:16 | [C2 G2 E3]:8 | [D2 A2 F#3]:8 | [E2 B2 E3]:16 | [A2 E3 C4]:8 | [B2 F#3 B3]:8 |' },
    { inst: 'choir', vol: 0.34, notes: '-:8 | [E4 G4 B4]:8 | [E4 G4 C5]:8 | [D4 F#4 A4]:8 | -:8 | [E4 G4 B4]:8 | [E4 A4 C5]:8 | [D#4 F#4 B4]:8 |' },
    {
      inst: 'horn', vol: 0.4,
      notes: '-:8 | B3:2 E4:2 | D4:3 -:1 | E4:2 G4:2 | E4:4 | F#4:2 A4:2 | F#4:3 -:1 | -:8 | B3:2 E4:1 G4:1 | B4:4 | A4:2 E4:2 | C4:3 -:1 | B3:4 | -:4 |',
    },
    {
      inst: 'harp', vol: 0.4,
      notes:
        'E4:1 -:3 | B4:1 G4:1 -:2 | -:4 | E5:1 B4:1 -:2 | G4:1 -:3 | E4:1 C5:1 -:2 | A4:1 -:3 | F#4:1 D5:1 -:2 | ' +
        'E4:1 -:3 | B4:1 G4:1 -:2 | -:4 | E5:1 B4:1 -:2 | A4:1 -:3 | C5:1 E5:1 -:2 | B4:1 -:3 | F#4:1 -:3 |',
    },
  ],
};

/** Under the barrow: a low drone, a choir moving by a half step, and a bell with nothing to say. */
const barrow: TuneDef = {
  id: 'barrow', bpm: 48, beats: 4, bars: 8,
  parts: [
    { inst: 'strings', vol: 0.4, notes: '[D2 A2]:32 |' },
    { inst: 'choir', vol: 0.36, notes: '[D3 F3 A3]:8 | [Eb3 G3 Bb3]:8 | [D3 F3 A3]:8 | [C3 Eb3 G3]:4 | [D3 F3 A3]:4 |' },
    { inst: 'bell', vol: 0.4, notes: '-:2 D5:2 | Eb5:3 -:1 | -:4 | A4:2 F5:2 | -:1 D5:3 | -:4 | Eb5:1 D5:3 | -:4 |' },
  ],
};

/**
 * One bar of the battle figure for the low strings, by chord, in eighth notes grouped 3+3+2: the
 * root three times, the note beside it three times, and a turn back. It never climbs out of a
 * narrow space and never spells out a chord.
 */
const GRIP = {
  E: 'E3:.5 E3:.5 E3:.5 F3:.5 F3:.5 F3:.5 E3:.5 D3:.5 |',
  F: 'F3:.5 F3:.5 F3:.5 G3:.5 G3:.5 G3:.5 F3:.5 E3:.5 |',
  C: 'C3:.5 C3:.5 C3:.5 D3:.5 D3:.5 D3:.5 C3:.5 B2:.5 |',
  D: 'D3:.5 D3:.5 D3:.5 E3:.5 E3:.5 E3:.5 D3:.5 C3:.5 |',
};
const FIGHT = ['E', 'E', 'E', 'E', 'F', 'F', 'E', 'E', 'C', 'C', 'D', 'D', 'F', 'F', 'E', 'F'] as const;
const FIGHT_ROOT = { E: 'E2', F: 'F2', C: 'C2', D: 'D2' };

/**
 * A fight: E Phrygian, the flattened second (F) always pressing down on the home note. Drums and
 * bass strike together in uneven threes (3+3+2), the strings grind on one note and its neighbour,
 * and a horn worries at a three-note cell, moving with the strings. Quicker and lighter than doom,
 * which is kept for the two great fights: no choir, nothing below C2, no long held notes.
 */
const battle: TuneDef = {
  id: 'battle', bpm: 132, beats: 4, bars: 16,
  parts: [
    // Struck on the first, the fourth and the seventh eighth of every bar; a turn into each half.
    {
      inst: 'drum', vol: 0.42,
      notes: Array(2).fill(Array(7).fill('k:1.5 k:1.5 t:1 |').join(' ') + ' k:1.5 k:1.5 t:.5 t:.5 |').join(' '),
    },
    // No shaker until the second half, and then only on the beat.
    { inst: 'drum', vol: 0.18, notes: '-:32 | ' + Array(8).fill('s:1 s:1 s:1 s:1 |').join(' ') },
    { inst: 'strings', vol: 0.34, notes: FIGHT.map((c) => GRIP[c]).join(' ') },
    {
      inst: 'horn', vol: 0.38,
      notes:
        '-:8 | E4:1.5 F4:1.5 E4:1 | G4:1.5 F4:1.5 E4:1 | F4:1.5 G4:1.5 F4:.5 -:.5 | F4:3 -:1 | B3:1.5 C4:1.5 B3:1 | E4:1.5 F4:1.5 E4:1 | ' +
        'G4:1.5 A4:1.5 G4:1 | C5:3 -:1 | A4:1.5 C5:1.5 A4:1 | A4:3 G4:1 | F4:1.5 G4:1.5 F4:.5 -:.5 | C5:3 -:1 | B4:1.5 C5:1.5 B4:1 | F4:3 -:1 |',
    },
    // Short blows with the kick drum rather than a walking line.
    { inst: 'bass', vol: 0.24, notes: FIGHT.map((c) => `${FIGHT_ROOT[c]}:.5 -:1 ${FIGHT_ROOT[c]}:.5 -:1 ${FIGHT_ROOT[c]}:.5 -:.5 |`).join(' ') },
  ],
};

/** Out of doors after dark: a held chord in A minor, a few high notes a long way apart, and a great deal of quiet. */
const night: TuneDef = {
  id: 'night', bpm: 50, beats: 4, bars: 16,
  parts: [
    // Four bars of A minor, two each of F and G; then A minor again, D minor, E minor.
    { inst: 'pad', vol: 0.5, notes: '[A2 E3 C4]:16 | [F2 C3 A3]:8 | [G2 D3 B3]:8 | [A2 E3 C4]:16 | [D2 A2 F3]:8 | [E2 B2 G3]:8 |' },
    { inst: 'choir', vol: 0.3, notes: '-:16 | [A3 C4 F4]:8 | [G3 B3 D4]:8 | -:16 | [F3 A3 D4]:8 | [E3 G3 B3]:8 |' },
    {
      inst: 'bell', vol: 0.36,
      notes:
        'E5:1 -:3 | -:4 | C5:1 -:1 A4:1 -:1 | -:4 | A4:1 -:3 | C5:1 -:3 | D5:1 -:1 B4:1 -:1 | -:4 | ' +
        'E5:1 -:3 | -:2 A5:1 -:1 | -:4 | C5:1 -:3 | A4:1 -:1 D5:1 -:1 | -:4 | B4:1 -:3 | -:4 |',
    },
    {
      inst: 'harp', vol: 0.36,
      notes:
        '-:4 | -:4 | A3:1 E4:1 -:2 | -:4 | -:4 | F3:1 C4:1 -:2 | -:4 | G3:1 D4:1 -:2 | ' +
        '-:4 | -:4 | A3:1 E4:1 -:2 | -:4 | -:4 | D3:1 A3:1 -:2 | -:4 | E3:1 B3:1 -:2 |',
    },
  ],
};

/** A safe place a long way from home: a shrine, a steading with smoke at the roof. F major, and in no hurry. */
const haven: TuneDef = {
  id: 'haven', bpm: 76, beats: 4, bars: 16,
  parts: [
    { inst: 'harp', vol: 0.46, notes: [F, C, DM, BB, F, C, BB, C, DM, BB, F, C, BB, C, F, F].map(arp).join(' ') },
    {
      inst: 'flute', vol: 0.44,
      notes: '-:16 | A4:2 C5:2 | E5:3 D5:1 | D5:2 F5:2 | E5:4 | F5:2 D5:2 | D5:3 Bb4:1 | C5:2 A4:2 | G4:4 | Bb4:2 D5:2 | C5:2 E5:2 | F5:4 | -:4 |',
    },
    {
      inst: 'pad', vol: 0.3,
      notes:
        '[F2 C3 A3]:4 | [C3 G3 E4]:4 | [D3 A3 F4]:4 | [Bb2 F3 D4]:4 | [F2 C3 A3]:4 | [C3 G3 E4]:4 | [Bb2 F3 D4]:4 | [C3 G3 E4]:4 | ' +
        '[D3 A3 F4]:4 | [Bb2 F3 D4]:4 | [F2 C3 A3]:4 | [C3 G3 E4]:4 | [Bb2 F3 D4]:4 | [C3 G3 E4]:4 | [F2 C3 A3]:8 |',
    },
  ],
};

/** One bar of the low string figure for the doom tune, by chord: root, fifth, octave, and back. */
const OST = {
  Dm: 'D2:.5 A2:.5 D3:.5 A2:.5 D2:.5 A2:.5 F3:.5 A2:.5 |',
  Bb: 'Bb1:.5 F2:.5 Bb2:.5 F2:.5 Bb1:.5 F2:.5 D3:.5 F2:.5 |',
  Gm: 'G1:.5 D2:.5 G2:.5 D2:.5 G1:.5 D2:.5 Bb2:.5 D2:.5 |',
  A: 'A1:.5 E2:.5 A2:.5 E2:.5 A1:.5 E2:.5 C#3:.5 E2:.5 |',
};
const DOOM = ['Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'Gm', 'A', 'A', 'Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'A', 'Dm', 'Dm'] as const;
const ROOT = { Dm: 'D2', Bb: 'Bb1', Gm: 'G1', A: 'A1' };

/** Something that takes a whole fight to bring down: slower than the battle tune, lower, and heavier. */
const doom: TuneDef = {
  id: 'doom', bpm: 96, beats: 4, bars: 16,
  parts: [
    { inst: 'drum', vol: 0.38, notes: Array(16).fill('k:1 t:1 k:.5 k:.5 t:1 |').join(' ') },
    { inst: 'strings', vol: 0.3, notes: DOOM.map((c) => OST[c]).join(' ') },
    { inst: 'choir', vol: 0.28, notes: '[D3 F3 A3]:8 | [D3 F3 Bb3]:8 | [D3 G3 Bb3]:8 | [C#3 E3 A3]:8 | [D3 F3 A3]:8 | [D3 F3 Bb3]:8 | [D3 G3 Bb3]:4 | [C#3 E3 A3]:4 | [D3 F3 A3]:8 |' },
    {
      inst: 'horn', vol: 0.37,
      notes:
        'D4:4 | F4:2 A4:2 | D4:3 F4:1 | Bb4:4 | G4:2 Bb4:2 | D5:4 | C#5:2 A4:2 | E4:4 | ' +
        'D4:2 A4:2 | F4:4 | Bb4:2 D5:2 | F5:4 | G4:2 Bb4:2 | A4:2 C#5:2 | D5:8 |',
    },
    { inst: 'bass', vol: 0.2, notes: DOOM.map((c) => `${ROOT[c]}:1 ${ROOT[c]}:1 ${ROOT[c]}:1 ${ROOT[c]}:1 |`).join(' ') },
  ],
};

export const music: Record<string, TuneDef> = { valley, village, hearth, wild, barrow, battle, night, doom, haven };
