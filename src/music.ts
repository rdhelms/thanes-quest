// Plays tunes (data, see engine/tune.ts) with a small synthesiser built from WebAudio parts:
// a few instruments, a reverb, and a scheduler that queues one bar at a time. Browser only.

import { parsePart, type PartDef, type TuneDef, type TuneEvent } from './engine/tune';

type Ctx = BaseAudioContext;

/** A decaying burst of noise: the sound of a large stone room. */
function impulse(ctx: Ctx, seconds: number): AudioBuffer {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6);
  }
  return buf;
}

function noise(ctx: Ctx): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

interface Rig {
  ctx: Ctx;
  /** Where instruments send their sound: dry and into the reverb. */
  bus: GainNode;
  noise: AudioBuffer;
}

/** An oscillator through a gain envelope. Returns the gain node so callers can add filters. */
function tone(r: Rig, type: OscillatorType, freq: number, t: number, stop: number, detune = 0): OscillatorNode {
  const o = r.ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  o.start(t);
  o.stop(stop);
  return o;
}

function envelope(r: Rig, t: number, peak: number, attack: number, hold: number, release: number): GainNode {
  const g = r.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + Math.max(attack, hold));
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(attack, hold) + release);
  return g;
}

function lowpass(r: Rig, freq: number, q = 0.7): BiquadFilterNode {
  const f = r.ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

/** Sound one note or drum hit on an instrument. `dur` is in seconds. */
function play(r: Rig, inst: PartDef['inst'], ev: TuneEvent, t: number, dur: number, vol: number): void {
  const { ctx } = r;
  if (inst === 'drum') {
    if (ev.drum === 's') {
      const src = ctx.createBufferSource();
      src.buffer = r.noise;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 5200;
      const g = envelope(r, t, vol * 0.25, 0.002, 0.01, 0.06);
      src.connect(hp).connect(g).connect(r.bus);
      src.start(t);
      src.stop(t + 0.2);
      return;
    }
    const low = ev.drum === 'k';
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(low ? 120 : 190, t);
    o.frequency.exponentialRampToValueAtTime(low ? 44 : 95, t + (low ? 0.2 : 0.12));
    const g = envelope(r, t, vol * (low ? 0.9 : 0.5), 0.003, 0.02, low ? 0.32 : 0.18);
    o.connect(g).connect(r.bus);
    o.start(t);
    o.stop(t + 0.6);
    // The skin of the drum: a short thud of filtered noise.
    const src = ctx.createBufferSource();
    src.buffer = r.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = low ? 180 : 420;
    const ng = envelope(r, t, vol * 0.3, 0.002, 0.01, 0.09);
    src.connect(bp).connect(ng).connect(r.bus);
    src.start(t);
    src.stop(t + 0.25);
    return;
  }

  // Chords share the loudness out between their notes.
  const each = vol / Math.sqrt(ev.freqs.length);
  for (const f of ev.freqs) {
    if (inst === 'harp') {
      const ring = Math.max(dur, 1.4);
      const g = envelope(r, t, each * 0.5, 0.004, 0.02, ring);
      tone(r, 'triangle', f, t, t + ring + 0.2).connect(g);
      const over = ctx.createGain();
      over.gain.value = 0.25;
      tone(r, 'sine', f * 2, t, t + ring + 0.2).connect(over).connect(g);
      g.connect(lowpass(r, 3200)).connect(r.bus);
    } else if (inst === 'flute') {
      const g = envelope(r, t, each * 0.34, 0.07, dur * 0.92, 0.22);
      const o = tone(r, 'sine', f, t, t + dur + 0.5);
      const edge = ctx.createGain();
      edge.gain.value = 0.2;
      const o2 = tone(r, 'triangle', f, t, t + dur + 0.5);
      // A little vibrato, arriving after the note has begun.
      const lfo = tone(r, 'sine', 5.2, t, t + dur + 0.5);
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(0, t);
      depth.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.5, dur));
      lfo.connect(depth);
      depth.connect(o.frequency);
      depth.connect(o2.frequency);
      o.connect(g);
      o2.connect(edge).connect(g);
      g.connect(lowpass(r, 2600)).connect(r.bus);
    } else if (inst === 'bell') {
      const ring = 3.6;
      const g = envelope(r, t, each * 0.3, 0.004, 0.01, ring);
      const car = tone(r, 'sine', f, t, t + ring + 0.2);
      const mod = tone(r, 'sine', f * 3.51, t, t + ring + 0.2);
      const index = ctx.createGain();
      index.gain.setValueAtTime(f * 1.6, t);
      index.gain.exponentialRampToValueAtTime(f * 0.05, t + 1.6);
      mod.connect(index).connect(car.frequency);
      car.connect(g).connect(r.bus);
    } else if (inst === 'choir') {
      const g = envelope(r, t, each * 0.5, Math.min(1.2, dur * 0.4), dur, 1.8);
      const mix = ctx.createGain();
      for (const cents of [-9, 0, 8]) tone(r, 'sawtooth', f, t, t + dur + 2.2, cents).connect(mix);
      // Two resonances roughly where an "ah" sits.
      for (const [freq, q] of [[720, 5], [1150, 6]]) {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = freq;
        bp.Q.value = q;
        mix.connect(bp).connect(g);
      }
      g.connect(r.bus);
    } else if (inst === 'bass') {
      const g = envelope(r, t, each * 0.6, 0.02, dur * 0.9, 0.3);
      tone(r, 'triangle', f, t, t + dur + 0.5).connect(g);
      tone(r, 'sine', f, t, t + dur + 0.5).connect(g);
      g.connect(lowpass(r, 420)).connect(r.bus);
    } else {
      // pad, strings, horn: sawtooth voices, darkened; they differ in how fast they speak.
      const attack = inst === 'pad' ? Math.min(0.9, dur * 0.4) : inst === 'horn' ? 0.14 : 0.06;
      const release = inst === 'pad' ? 1.6 : 0.35;
      const cutoff = inst === 'pad' ? 620 : inst === 'horn' ? 760 : 980;
      const g = envelope(r, t, each * (inst === 'pad' ? 0.22 : 0.26), attack, dur * 0.96, release);
      const lp = lowpass(r, cutoff, inst === 'horn' ? 1.4 : 0.7);
      for (const cents of [-7, 6]) tone(r, 'sawtooth', f, t, t + dur + release + 0.2, cents).connect(lp);
      if (inst === 'horn') tone(r, 'square', f, t, t + dur + release + 0.2).connect(lp);
      lp.connect(g).connect(r.bus);
    }
  }
}

/** Build the signal chain: instruments -> (dry + reverb) -> compressor -> out. */
function rig(ctx: Ctx, out: AudioNode): Rig {
  const bus = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 4;
  const verb = ctx.createConvolver();
  verb.buffer = impulse(ctx, 3);
  const wet = ctx.createGain();
  wet.gain.value = 0.32;
  bus.connect(comp);
  bus.connect(verb).connect(wet).connect(comp);
  comp.connect(out);
  return { ctx, bus, noise: noise(ctx) };
}

interface Parsed {
  tune: TuneDef;
  parts: { def: PartDef; events: TuneEvent[] }[];
}

const parse = (tune: TuneDef): Parsed => ({ tune, parts: tune.parts.map((def) => ({ def, events: parsePart(def.notes, tune.beats) })) });

function scheduleBar(r: Rig, p: Parsed, bar: number, t: number): void {
  const beat = 60 / p.tune.bpm;
  const from = bar * p.tune.beats;
  for (const part of p.parts)
    for (const ev of part.events)
      if (ev.at >= from && ev.at < from + p.tune.beats) play(r, part.def.inst, ev, t + (ev.at - from) * beat, ev.len * beat, part.def.vol);
}

export class Music {
  private rig: Rig | null = null;
  private master: GainNode | null = null;
  private tunes = new Map<string, Parsed>();
  private playing: { id: string; gain: GainNode; rig: Rig; next: number; bar: number } | null = null;
  private want: string | null = null;
  private on = true;

  constructor(tunes: Record<string, TuneDef>, private volume = 0.5) {
    for (const t of Object.values(tunes)) this.tunes.set(t.id, parse(t));
    setInterval(() => this.pump(), 120);
  }

  /** Call once sound is allowed (after a key press or tap). */
  attach(ctx: AudioContext): void {
    if (this.master) return;
    this.master = ctx.createGain();
    this.master.gain.value = this.on ? this.volume : 0;
    this.master.connect(ctx.destination);
    this.rig = rig(ctx, this.master);
  }

  setEnabled(on: boolean): void {
    if (on === this.on) return;
    this.on = on;
    if (this.master && this.rig) this.master.gain.setTargetAtTime(on ? this.volume : 0, this.rig.ctx.currentTime, 0.3);
  }

  /** Ask for a tune by id. Changing tune cross-fades over a couple of seconds. */
  cue(id: string | null): void {
    this.want = id && this.tunes.has(id) ? id : null;
  }

  private pump(): void {
    const base = this.rig;
    if (!base || !this.master) return;
    const ctx = base.ctx;
    const now = ctx.currentTime;
    if (this.playing && this.playing.id !== this.want) {
      const old = this.playing;
      old.gain.gain.setTargetAtTime(0, now, 0.6);
      setTimeout(() => old.gain.disconnect(), 4000);
      this.playing = null;
    }
    if (!this.playing && this.want && this.on) {
      // Each tune gets its own fader, so the outgoing one can die away under the incoming one.
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.setTargetAtTime(1, now, 0.8);
      gain.connect(base.bus);
      this.playing = { id: this.want, gain, rig: { ...base, bus: gain }, next: now + 0.15, bar: 0 };
    }
    const p = this.playing;
    if (!p || !this.on) return;
    const parsed = this.tunes.get(p.id)!;
    const barLen = (60 / parsed.tune.bpm) * parsed.tune.beats;
    // After a pause (music switched off, tab asleep) pick up from now rather than catching up.
    if (p.next < now) p.next = now + 0.1;
    while (p.next < now + 0.7) {
      scheduleBar(p.rig, parsed, p.bar, p.next);
      p.next += barLen;
      p.bar = (p.bar + 1) % parsed.tune.bars;
    }
  }
}

/**
 * Render the opening seconds of a tune without playing it and report how loud it is.
 * Used to check that a tune makes sound and does not clip, by someone who cannot listen.
 */
export async function measure(tune: TuneDef, seconds = 12): Promise<{ peak: number; rms: number; silentTenths: number }> {
  const ctx = new OfflineAudioContext(2, Math.floor(44100 * seconds), 44100);
  const out = ctx.createGain();
  out.connect(ctx.destination);
  const r = rig(ctx, out);
  const parsed = parse(tune);
  const barLen = (60 / tune.bpm) * tune.beats;
  for (let bar = 0, t = 0.1; t < seconds; bar++, t += barLen) scheduleBar(r, parsed, bar % tune.bars, t);
  const buf = await ctx.startRendering();
  const d = buf.getChannelData(0);
  let peak = 0;
  let sum = 0;
  let silent = 0;
  const win = Math.floor(44100 / 10);
  for (let i = 0; i < d.length; i += win) {
    let wmax = 0;
    for (let j = i; j < Math.min(d.length, i + win); j++) {
      const a = Math.abs(d[j]);
      if (a > wmax) wmax = a;
      sum += d[j] * d[j];
    }
    if (wmax > peak) peak = wmax;
    if (wmax < 0.002) silent++;
  }
  return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(4), silentTenths: silent };
}
