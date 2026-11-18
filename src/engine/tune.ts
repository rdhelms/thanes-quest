// Music as data. A tune is a tempo, a length in bars, and a few parts written in a small
// notation. This file only parses and checks that notation; making sound is the browser's job.
//
// Notation, tokens separated by spaces:
//   D4:2          a note for two beats            [D3 A3 F4]:4   a chord
//   -:1           a rest                          k:1 t:.5 s:.5  drum hits (kick, tom, shaker)
//   |             a bar line (ignored when playing, checked when validating)

export interface PartDef {
  inst: 'pad' | 'harp' | 'flute' | 'strings' | 'horn' | 'bass' | 'bell' | 'choir' | 'drum';
  /** Loudness, 0..1. */
  vol: number;
  notes: string;
}

export interface TuneDef {
  id: string;
  bpm: number;
  /** Beats in a bar. */
  beats: number;
  bars: number;
  parts: PartDef[];
}

export interface TuneEvent {
  /** Start, in beats from the top of the loop. */
  at: number;
  /** Length in beats. */
  len: number;
  /** Frequencies to sound; empty for a drum hit. */
  freqs: number[];
  drum?: 'k' | 't' | 's';
}

const SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Frequency of a note name such as A4, F#3 or Bb2. Returns 0 if it is not one. */
export function pitch(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return 0;
  const semis = SEMITONE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
  return 440 * Math.pow(2, (semis - 69) / 12);
}

/** Turn a part's notation into timed events. Problems are collected rather than thrown. */
export function parsePart(notes: string, beatsPerBar: number, errors: string[] = []): TuneEvent[] {
  const events: TuneEvent[] = [];
  let at = 0;
  let barStart = 0;
  for (const tok of notes.match(/\[[^\]]+\]:[\d.]+|\S+/g) ?? []) {
    if (tok === '|') {
      if (Math.abs(at - barStart - beatsPerBar) > 1e-6 && Math.abs((at - barStart) % beatsPerBar) > 1e-6)
        errors.push(`bar ending at beat ${at} is ${at - barStart} beats long, not a multiple of ${beatsPerBar}`);
      barStart = at;
      continue;
    }
    const cut = tok.lastIndexOf(':');
    const what = tok.slice(0, cut);
    const len = Number(tok.slice(cut + 1));
    if (cut < 0 || !(len > 0)) {
      errors.push(`"${tok}" has no length`);
      continue;
    }
    if (what === 'k' || what === 't' || what === 's') events.push({ at, len, freqs: [], drum: what });
    else if (what !== '-') {
      const names = what.startsWith('[') ? what.slice(1, -1).trim().split(/\s+/) : [what];
      const freqs = names.map(pitch);
      if (freqs.some((f) => !f)) errors.push(`"${tok}" is not a note`);
      else events.push({ at, len, freqs });
    }
    at += len;
  }
  return events;
}

/** The length of a part in beats. */
export function partLength(notes: string, beatsPerBar: number): number {
  const ev = parsePart(notes.replace(/-:/g, 'C4:'), beatsPerBar);
  return ev.reduce((end, e) => Math.max(end, e.at + e.len), 0);
}

/** Check a tune: every token parses, every bar adds up, every part fills the loop exactly. */
export function validateTune(t: TuneDef): string[] {
  const errs: string[] = [];
  const total = t.bars * t.beats;
  t.parts.forEach((p, i) => {
    const mine: string[] = [];
    parsePart(p.notes, t.beats, mine);
    const len = partLength(p.notes, t.beats);
    if (Math.abs(len - total) > 1e-6) mine.push(`is ${len} beats long, but the tune is ${total}`);
    for (const m of mine) errs.push(`tune ${t.id}, part ${i} (${p.inst}): ${m}`);
  });
  return errs;
}
