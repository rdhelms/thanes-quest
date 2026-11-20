// Turns a typed line into a verb and nouns, using word groups from the game's vocabulary.

import type { VocabDef } from './types';

export type Parsed =
  | { ok: true; verb: string; nouns: string[] }
  | { ok: false; why: 'empty' }
  | { ok: false; why: 'unknown'; word: string }
  | { ok: false; why: 'noverb'; nouns: string[] };

const MAX_PHRASE = 3;

export class Parser {
  private verbs = new Map<string, string>();
  private nouns = new Map<string, string>();
  private ignore: Set<string>;

  constructor(vocab: VocabDef) {
    this.ignore = new Set(vocab.ignore);
    for (const [id, words] of Object.entries(vocab.verbs)) for (const w of [id, ...words]) this.verbs.set(w, id);
    this.addNouns(vocab.nouns);
  }

  addNouns(groups: Record<string, string[]>): void {
    for (const [id, words] of Object.entries(groups)) for (const w of [id, ...words]) this.nouns.set(w, id);
  }

  hasVerb(id: string): boolean {
    return [...this.verbs.values()].includes(id);
  }

  /** The verb a word or phrase stands for, if it is one. */
  verbOf(phrase: string): string | undefined {
    return this.verbs.get(phrase);
  }

  hasNoun(id: string): boolean {
    return [...this.nouns.values()].includes(id);
  }

  parse(line: string): Parsed {
    const words = line
      .toLowerCase()
      .replace(/[^a-z0-9' ]+/g, ' ')
      .split(' ')
      // "Runa's tonic" is read as "runa tonic".
      .map((w) => w.replace(/'s$/, '').replace(/^'+|'+$/g, ''))
      .filter(Boolean);
    if (!words.length) return { ok: false, why: 'empty' };

    let verb = '';
    const nouns: string[] = [];
    let i = 0;
    while (i < words.length) {
      let hit = false;
      // Longest phrase first, so "pick up" beats "pick".
      for (let n = Math.min(MAX_PHRASE, words.length - i); n >= 1 && !hit; n--) {
        const phrase = words.slice(i, i + n).join(' ');
        // The verb usually comes first, but need not: "have my sword tempered".
        const asVerb = !verb ? this.verbs.get(phrase) : undefined;
        // A plain plural of a known thing is that thing: "crowns", "candles".
        const asNoun = this.nouns.get(phrase) ?? (n === 1 && !this.verbs.has(phrase) && !this.ignore.has(phrase) ? this.nouns.get(phrase.replace(/s$/, '')) ?? this.nouns.get(phrase.replace(/es$/, '')) : undefined);
        if (asVerb) verb = asVerb;
        else if (asNoun) nouns.push(asNoun);
        else continue;
        i += n;
        hit = true;
      }
      if (hit) continue;
      if (!this.ignore.has(words[i])) return { ok: false, why: 'unknown', word: words[i] };
      i++;
    }
    if (!verb) return nouns.length ? { ok: false, why: 'noverb', nouns } : { ok: false, why: 'empty' };
    return { ok: true, verb, nouns };
  }
}

/**
 * Does a parsed command match a pattern such as "open door", "ask elder *" or "take torch|brand"?
 * The pattern must account for every noun typed; * stands for any one noun.
 */
export function matches(pattern: string, verb: string, nouns: string[]): boolean {
  const parts = pattern.split(' ').filter(Boolean);
  if (parts.length !== nouns.length + 1) return false;
  const fits = (part: string, word: string): boolean => part === '*' || part.split('|').includes(word);
  return fits(parts[0], verb) && nouns.every((n, i) => fits(parts[i + 1], n));
}
