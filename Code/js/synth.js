// TDX — tiny retro synth (M8 "Hypercard"). Turns a recipe of numbers into
// samples, so sound effects need no files: the Sound Mixer edits the recipe and
// the game renders it once into a buffer. Pure maths, no browser APIs, so the
// tests can render every sound headlessly.
//
// A recipe (all times in seconds, all optional except freq):
//   wave       'square' | 'saw' | 'triangle' | 'sine' | 'noise'
//   freq       start pitch (Hz)          freqEnd    end pitch (Hz, slides there)
//   slideTime  how long the slide takes (default: the whole sound)
//   duty       square wave pulse width 0–1 (0.5 = classic square)
//   attack / hold / release   the volume envelope (rise, stay, fade)
//   punch      extra volume at the start of the hold, fading out (0–1)
//   arpAt / arpMul   jump the pitch by ×arpMul at arpAt (coin-style blips)
//   vibRate / vibDepth   wobble (Hz, fraction of pitch)
//   noise      mix in white noise 0–1 (crunch on a tone)
//   lowpass / lowpassEnd   tone filter 0–1 (1 = open), can sweep (whooshes)
//   crush      bit-crush steps (0 = off, 4 = very lo-fi)
//   volume     0–1
//   seed       makes the noise the same every render
//   layers     [{ at, ...recipe }] extra voices mixed in at 'at' seconds (stings)

export const WAVES = ['square', 'saw', 'triangle', 'sine', 'noise'];

export const synthLength = (r) => (r.attack ?? 0.005) + (r.hold ?? 0.05) + (r.release ?? 0.1);

// Total length including layers.
export function recipeLength(r) {
  let len = r.freq ? synthLength(r) : 0;
  for (const l of r.layers ?? []) len = Math.max(len, (l.at ?? 0) + recipeLength(l));
  return len;
}

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Render one voice (no layers) into out[] starting at sample offset.
function renderVoice(r, rate, out, offset) {
  const a = Math.max(0.001, r.attack ?? 0.005), h = r.hold ?? 0.05, rel = Math.max(0.001, r.release ?? 0.1);
  const dur = a + h + rel;
  const n = Math.ceil(dur * rate);
  const f0 = Math.max(1, r.freq), f1 = Math.max(1, r.freqEnd ?? r.freq);
  const slide = Math.max(0.001, r.slideTime ?? dur);
  const duty = r.duty ?? 0.5, noiseMix = r.noise ?? 0, vol = r.volume ?? 0.5;
  const crush = r.crush ?? 0, punch = r.punch ?? 0;
  const lp0 = r.lowpass ?? 1, lp1 = r.lowpassEnd ?? lp0;
  const rand = rng(r.seed ?? 7);
  let phase = 0, held = rand() * 2 - 1, lpOut = 0;
  for (let i = 0; i < n && offset + i < out.length; i++) {
    const t = i / rate;
    let f = f0 * Math.pow(f1 / f0, Math.min(1, t / slide));
    if (r.arpAt && t >= r.arpAt) f *= r.arpMul ?? 1.5;
    if (r.vibDepth) f *= 1 + r.vibDepth * Math.sin(2 * Math.PI * (r.vibRate ?? 6) * t);
    phase += f / rate;
    if (phase >= 1) { phase -= Math.floor(phase); held = rand() * 2 - 1; }
    let s;
    switch (r.wave) {
      case 'saw': s = 2 * phase - 1; break;
      case 'triangle': s = 1 - 4 * Math.abs(phase - 0.5); break;
      case 'sine': s = Math.sin(2 * Math.PI * phase); break;
      case 'noise': s = held; break;
      default: s = phase < duty ? 1 : -1;
    }
    if (noiseMix) s = s * (1 - noiseMix) + (rand() * 2 - 1) * noiseMix;
    // one-pole low-pass, cutoff sweeping lp0 → lp1 over the sound
    const lp = lp0 + (lp1 - lp0) * (t / dur);
    if (lp < 1) { const k = Math.max(0.001, lp * lp); lpOut += (s - lpOut) * k; s = lpOut; }
    if (crush > 0) s = Math.round(s * crush) / crush;
    let env = t < a ? t / a : t < a + h ? 1 + punch * (1 - (t - a) / Math.max(h, 0.001)) : 1 - (t - a - h) / rel;
    env = Math.max(0, env);
    out[offset + i] += s * env * vol;
  }
}

// Render a full recipe (with layers) to a Float32Array of mono samples.
function renderInto(r, rate, out, offset) {
  if (r.freq) renderVoice(r, rate, out, offset);
  for (const l of r.layers ?? []) renderInto(l, rate, out, offset + Math.round((l.at ?? 0) * rate));
}

export function renderSynth(recipe, rate = 44100) {
  const out = new Float32Array(Math.max(1, Math.ceil(recipeLength(recipe) * rate)));
  renderInto(recipe, rate, out, 0);
  // soft clip so stacked layers never crack
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i]);
  return out;
}
