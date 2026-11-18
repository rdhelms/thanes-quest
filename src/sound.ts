// Square-wave jingles in the spirit of a one-voice speaker. Browser only.

type Note = [freq: number, seconds: number];

const TUNES: Record<string, Note[]> = {
  take: [[660, 0.05], [880, 0.08]],
  score: [[523, 0.07], [659, 0.07], [784, 0.07], [1047, 0.14]],
  quest: [[392, 0.1], [523, 0.1], [659, 0.2]],
  door: [[180, 0.05], [140, 0.08]],
  swing: [[300, 0.03], [200, 0.04]],
  hit: [[140, 0.05], [100, 0.06]],
  hurt: [[220, 0.05], [160, 0.09]],
  block: [[500, 0.03], [420, 0.03]],
  parry: [[880, 0.03], [1320, 0.05], [1760, 0.07]],
  coin: [[1320, 0.04], [1760, 0.06]],
  cast: [[440, 0.04], [660, 0.04], [990, 0.08]],
  word: [[110, 0.12], [165, 0.12], [220, 0.25]],
  level: [[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.08], [1319, 0.2]],
  death: [[392, 0.18], [370, 0.18], [349, 0.18], [330, 0.3], [262, 0.5]],
  win: [[523, 0.12], [523, 0.06], [523, 0.06], [659, 0.18], [784, 0.18], [1047, 0.4]],
};

let ctx: AudioContext | null = null;

/** Browsers only allow sound after a key or click; call this from one. Returns the shared context. */
export function unlockSound(): AudioContext {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function playSound(id: string): void {
  const tune = TUNES[id];
  if (!ctx || !tune) return;
  let t = ctx.currentTime;
  for (const [freq, dur] of tune) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.03, t);
    gain.gain.setValueAtTime(0, t + dur * 0.92);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
    t += dur;
  }
}
