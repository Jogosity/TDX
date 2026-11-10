// TDX — audio engine (M8 "Hypercard").
// Three buses (music, sfx, ui) into a master with a limiter. Sound effects are
// synth recipes rendered once into buffers (js/synth.js); music cues are files.
//
// Mobile rules: audio can't start until the first tap, so the engine wakes on
// the first pointer/key event. It pauses while the page is hidden, and on iOS
// it asks for an 'ambient' session so the silent switch mutes the game.
//
// Headless-safe: with no Web Audio (node tests), every call is a no-op, and
// VoicePool (the anti-spam rules) is plain logic the tests drive directly.

import { SOUNDS, MUSIC, AUDIO } from './sounds.js';
import { renderSynth } from './synth.js';

// ---------------------------------------------------------------------------
// VoicePool — who gets to be heard. Pure logic, no audio.
// request() answers { ok, steal, reason }: ok = play it; steal = the voice to
// cut first (or null). Rules, in order:
//   1. gap:    the same sound started too recently → drop
//   2. voices: this sound already has its maximum copies playing → drop
//   3. cap:    the pool is full → cut the lowest-priority voice (oldest first)
//              if the new sound outranks it, otherwise drop
// ---------------------------------------------------------------------------
export class VoicePool {
  constructor(max) {
    this.max = max;
    this.voices = [];       // { id, priority, start, end }
    this.lastStart = {};
  }

  prune(now) { this.voices = this.voices.filter(v => v.end > now); }

  request(id, def, now, length) {
    this.prune(now);
    if (now - (this.lastStart[id] ?? -Infinity) < (def.gap ?? 0)) return { ok: false, reason: 'gap' };
    if (this.voices.filter(v => v.id === id).length >= (def.voices ?? 4)) return { ok: false, reason: 'voices' };
    let steal = null;
    if (this.voices.length >= this.max) {
      for (const v of this.voices) {
        if (!steal || v.priority < steal.priority || (v.priority === steal.priority && v.start < steal.start)) steal = v;
      }
      if (steal.priority >= (def.priority ?? 50)) return { ok: false, reason: 'busy' };
      this.voices = this.voices.filter(v => v !== steal);
    }
    const voice = { id, priority: def.priority ?? 50, start: now, end: now + length };
    this.voices.push(voice);
    this.lastStart[id] = now;
    return { ok: true, steal, voice };
  }
}

// Which wave track plays next: any track with a file, but not the one just
// played when there's another to choose. -1 = none.
export function pickTrack(pool, last, rand = Math.random) {
  let ids = (pool ?? []).map((t, i) => (t?.file ? i : -1)).filter(i => i >= 0);
  if (ids.length > 1) ids = ids.filter(i => i !== last);
  return ids.length ? ids[Math.floor(rand() * ids.length) % ids.length] : -1;
}

// ---------------------------------------------------------------------------
// AudioEngine
// ---------------------------------------------------------------------------
// A wave starts a new track every `wavesPerTrack` waves (Jogo, 10 Nov: 3), so
// waves 1–3 share one, 4–6 the next, and so on.
export const trackChangeDue = (waveIndex, wavesPerTrack = 3) => waveIndex % Math.max(1, Math.round(wavesPerTrack)) === 0;

export class AudioEngine {
  constructor(sounds = SOUNDS, music = MUSIC, cfg = AUDIO) {
    this.sounds = sounds;
    this.music = music;
    this.cfg = cfg;                 // AUDIO (the Mixer passes its live copy)
    this.settings = { ...AUDIO.defaults };
    this.ctx = null;
    this.buffers = new Map();       // id → AudioBuffer
    this.musicBuffers = new Map();  // cue → AudioBuffer | 'loading' | 'missing'
    this.pools = { sfx: new VoicePool(AUDIO.maxVoices), ui: new VoicePool(AUDIO.maxUiVoices), music: new VoicePool(2) };
    this.cue = null;                // the music cue that should be playing
    this.track = null;              // { cue, src, gain }
    this.supported = typeof globalThis.AudioContext === 'function' || typeof globalThis.webkitAudioContext === 'function';
    if (this.supported && typeof document !== 'undefined') this.listen();
  }

  // --- lifecycle -------------------------------------------------------------------
  listen() {
    const wake = () => this.unlock();
    for (const ev of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(ev, wake, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend?.(); else this.ctx.resume?.();
    });
  }

  unlock() {
    if (!this.supported) return;
    if (!this.ctx) {
      // iOS 17+: 'ambient' follows the silent switch and lets the player's own music keep playing
      try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch { /* older Safari */ }
      const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
      this.ctx = new Ctx();
      const c = this.ctx;
      this.limiter = c.createDynamicsCompressor();
      this.limiter.threshold.value = -10; this.limiter.ratio.value = 8;
      this.limiter.attack.value = 0.003; this.limiter.release.value = 0.15;
      this.master = c.createGain();
      this.master.connect(this.limiter); this.limiter.connect(c.destination);
      this.bus = {};
      for (const name of ['music', 'sfx', 'ui']) { this.bus[name] = c.createGain(); this.bus[name].connect(this.master); }
      this.musicDuck = c.createGain();                 // stings duck the music loop only
      this.musicBreakGain = c.createGain();            // the gap between waves lowers it
      this.musicBreakGain.gain.value = this.inBreak ? (this.cfg.breakLevel ?? 0.35) : 1;
      this.musicDuck.connect(this.musicBreakGain);
      this.musicBreakGain.connect(this.bus.music);
      this.applySettings();
      if (this.cue) this.playMusic(this.cue, { force: true });
    }
    if (this.ctx.state === 'suspended' && !(typeof document !== 'undefined' && document.hidden)) this.ctx.resume();
  }

  get ready() { return !!this.ctx && this.ctx.state === 'running'; }

  // --- settings ---------------------------------------------------------------------------
  // { muted, music, sfx } — 0–1 volumes. UI sounds follow the SFX slider.
  setSettings(s) {
    this.settings = { ...AUDIO.defaults, ...this.settings, ...s };
    this.applySettings();
  }

  applySettings() {
    if (!this.ctx) return;
    const s = this.settings, t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.muted ? 0 : 1, t, 0.02);
    this.bus.music.gain.setTargetAtTime(s.music, t, 0.02);
    this.bus.sfx.gain.setTargetAtTime(s.sfx, t, 0.02);
    this.bus.ui.gain.setTargetAtTime(s.sfx, t, 0.02);
  }

  // --- sound effects ------------------------------------------------------------------------
  buffer(id) {
    let b = this.buffers.get(id);
    if (!b) {
      const def = this.sounds[id];
      if (!def?.synth) return null;
      const data = renderSynth(def.synth, this.ctx.sampleRate);
      b = this.ctx.createBuffer(1, data.length, this.ctx.sampleRate);
      b.copyToChannel ? b.copyToChannel(data, 0) : b.getChannelData(0).set(data);
      this.buffers.set(id, b);
    }
    return b;
  }

  // The Mixer changes a recipe: drop its cached buffer so the next play re-renders.
  invalidate(id) { if (id) this.buffers.delete(id); else this.buffers.clear(); }

  // Play a sound by id. opts.pitch multiplies the pitch (and speed);
  // opts.force skips the anti-spam rules (the Mixer's Play button).
  play(id, opts = {}) {
    if (!this.ready || this.settings.muted) return false;
    const def = this.sounds[id];
    if (!def) return false;
    const buf = this.buffer(id);
    if (!buf) return false;
    const rate = (def.pitch ?? 1) * (opts.pitch ?? 1) * (1 + (Math.random() * 2 - 1) * (def.vary ?? 0));
    const length = buf.duration / rate;
    const pool = this.pools[def.bus] ?? this.pools.sfx;
    const r = opts.force ? { ok: true, voice: {} } : pool.request(id, def, this.ctx.currentTime, length);
    if (this.onRequest) this.onRequest(id, r);   // Mixer stress meter
    if (!r.ok) return false;
    if (r.steal?.node) { try { r.steal.node.stop(); } catch { /* already done */ } }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = (def.gain ?? 1) * (opts.gain ?? 1);
    src.connect(g);
    g.connect(this.bus[def.bus] ?? this.bus.sfx);
    src.start();
    r.voice.node = src;
    this.live?.add(src);
    if (this.live) src.onended = () => this.live.delete(src);
    if (def.bus === 'music') this.duck(length);
    return true;
  }

  // Mixer: cut every sound that's playing.
  stopAll() {
    for (const src of this.live ?? []) { try { src.stop(); } catch { /* done */ } }
    for (const p of Object.values(this.pools)) p.voices = [];
    this.stopMusic();
  }

  // --- music ------------------------------------------------------------------------------------
  // Cues: 'menu', or 'wave:N' = MUSIC.waves[N] (Jogo, 10 Nov: a pool of wave tracks).
  musicDef(cue) {
    if (typeof cue !== 'string') return null;
    if (cue.startsWith('wave:')) return this.music.waves?.[+cue.slice(5)] ?? null;
    return this.music[cue] ?? null;
  }

  // Switch to a cue, or null for silence. The old track fades out over AUDIO.musicFade.
  // restart: start the cue again from the top even if it's already playing.
  // fadeIn: false starts at full volume (the wave tracks have their own fade-in).
  playMusic(cue, { restart = false, fadeIn = true, force = false } = {}) {
    if (!restart && !force && cue === this.cue && this.track?.cue === cue) return;
    this.cue = cue;
    if (!this.ctx) return;                      // starts on the first tap
    const fade = this.cfg.musicFade, t = this.ctx.currentTime;
    if (this.track && (restart || this.track.cue !== cue)) {
      const old = this.track;
      old.gain.gain.setTargetAtTime(0, t, fade / 4);
      setTimeout(() => { try { old.src.stop(); } catch { /* gone */ } }, fade * 1000 + 200);
      this.track = null;
    }
    if (!cue || this.track) return;
    const token = this.musicToken = (this.musicToken ?? 0) + 1;   // a newer request wins
    this.loadMusic(cue).then((buf) => {
      if (!buf || this.musicToken !== token || this.track) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf; src.loop = true;          // loops until the wave ends (its own tail = a pause)
      const g = this.ctx.createGain();
      const level = this.musicDef(cue)?.gain ?? 1;
      if (fadeIn) { g.gain.value = 0; g.gain.setTargetAtTime(level, this.ctx.currentTime, fade / 4); } else g.gain.value = level;
      src.connect(g); g.connect(this.musicDuck);
      src.start();
      this.track = { cue, src, gain: g };
    });
  }

  stopMusic() { this.playMusic(null); }

  // A wave starts (Jogo, 10 Nov): back to full volume, and every wavesPerTrack
  // waves (or if nothing is playing) a new track from the pool.
  startWaveMusic(waveIndex) {
    this.musicBreak(false);
    const keep = this.cue?.startsWith?.('wave:') && !trackChangeDue(waveIndex, this.cfg.wavesPerTrack ?? 3);
    return keep ? this.lastWave : this.playWaveMusic();
  }

  // Between waves the track keeps playing, lowered to cfg.breakLevel.
  musicBreak(on) {
    this.inBreak = on;
    if (!this.ctx) return;
    const g = this.musicBreakGain.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(on ? (this.cfg.breakLevel ?? 0.35) : 1, t, this.cfg.musicFade / 4);
  }

  // A new track from the pool (never the last one, if there's a choice),
  // from the top, at full volume. No tracks with a file = silence.
  playWaveMusic(rand = Math.random) {
    const i = pickTrack(this.music.waves, this.lastWave, rand);
    if (i < 0) { this.stopMusic(); return -1; }
    this.lastWave = i;
    this.playMusic(`wave:${i}`, { restart: true, fadeIn: false });
    return i;
  }

  // One load per cue (a promise of the buffer, or null when there's no track).
  loadMusic(cue) {
    if (!this.musicBuffers.has(cue)) {
      const file = this.musicDef(cue)?.file;
      this.musicBuffers.set(cue, !file ? Promise.resolve(null) : fetch(file)
        .then((res) => { if (!res.ok) throw new Error(res.status); return res.arrayBuffer(); })
        .then((data) => this.ctx.decodeAudioData(data))
        .catch((e) => { console.warn(`TDX audio: music '${cue}' (${file}) failed to load`, e); return null; }));
    }
    return this.musicBuffers.get(cue);
  }

  // Stings: the loop dips under them, then comes back.
  duck(secs) {
    const d = this.musicDuck.gain, t = this.ctx.currentTime;
    d.cancelScheduledValues(t);
    d.setTargetAtTime(this.cfg.stingDuck, t, 0.05);
    d.setTargetAtTime(1, t + secs, 0.4);
  }
}

// The game's one engine. sfx() is the call sites' shorthand.
export const audio = new AudioEngine();
export const sfx = (id, opts) => audio.play(id, opts);
