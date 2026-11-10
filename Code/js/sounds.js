// TDX — the sound list (M8 "Hypercard"). Written by the Sound Mixer (tools/mixer/, Save button).
// Hand edits are fine: the Mixer reads this file back as it is. All sound tuning
// lives here, like balance lives in config.js.
//
// Each sound:
//   group / label   where the Mixer lists it and what it's called there
//   bus       'ui' | 'sfx' | 'music'   which volume slider it follows
//   priority  0–100. When every voice is busy, a new sound may cut off a
//             lower-priority one; it never cuts an equal or higher one.
//   voices    how many copies of this sound may play at once
//   gap       minimum seconds between two starts of this sound
//   vary      random pitch spread per play (0.08 = ±8%), so repeats don't drone
//   pitch     playback pitch/speed (1 = as made; linked, see TDX_M8_Plan D3)
//   gain      volume trim on top of the recipe
//   for       enemy types that use this death sound (enemy group only)
//   synth     the recipe (see js/synth.js)   — or —   file: 'assets/audio/x.mp3'
//
// Anti-spam (Jogo, 9 Nov): voices + gap stop one sound flooding (six Threaders
// share 3 voices); AUDIO.maxVoices caps everything at once; priority decides
// who is heard when the cap is hit, so rare heavy shots and game events
// outrank the rapid-fire guns.

export const AUDIO = {
  maxVoices: 14,
  maxUiVoices: 4,
  musicFade: 1.2,
  stingDuck: 0.25,
  wavesPerTrack: 3,
  breakLevel: 0.35,
  defaults: { muted: false, music: 0.6, sfx: 0.8 },
};

export const SOUNDS = {
  ui_tap: { group: 'UI', label: 'Tap (forward)', bus: 'ui', priority: 90, voices: 2, gap: 0.03, vary: 0.02, gain: 1,
    synth: { wave: 'sine', freq: 37, freqEnd: 1751, slideTime: 0.04, duty: 0.14, attack: 0.002, hold: 0.025, release: 0.04, arpMul: 0.985, vibRate: 1, volume: 0.22 },
  },
  ui_back: { group: 'UI', label: 'Back', bus: 'ui', priority: 90, voices: 2, gap: 0.03, vary: 0.02, gain: 1,
    synth: { wave: 'sine', freq: 39, freqEnd: 280, slideTime: 0.05, duty: 0.13, attack: 0.002, hold: 0.03, release: 0.05, arpMul: 1.175, vibRate: 0.5, volume: 0.22 },
  },
  ui_select: { group: 'UI', label: 'Select a tower', bus: 'ui', priority: 90, voices: 2, gap: 0.03, vary: 0, gain: 1,
    synth: { wave: 'triangle', freq: 107, attack: 0.002, hold: 0.06, release: 0.05, arpAt: 0.035, arpMul: 0.985, vibRate: 3, volume: 0.35 },
  },
  ui_error: { group: 'UI', label: 'Error', bus: 'ui', priority: 95, voices: 1, gap: 0.25, vary: 0, gain: 1,
    synth: { wave: 'square', freq: 20, slideTime: 0.001, duty: 0.29, attack: 0.003, hold: 0.07, release: 0.03, arpMul: 4, lowpass: 0, lowpassEnd: 0, crush: 14, volume: 0.22, seed: 4, layers: [
        { at: 0.11, wave: 'square', freq: 120, attack: 0.003, hold: 0.09, release: 0.05, crush: 6, volume: 0.22 },
      ] },
  },
  ui_popup: { group: 'UI', label: 'Pop-up box', bus: 'ui', priority: 85, voices: 1, gap: 0.1, vary: 0, gain: 1,
    synth: { wave: 'sine', freq: 520, freqEnd: 1040, slideTime: 0.08, attack: 0.005, hold: 0.05, release: 0.12, vibRate: 30, vibDepth: 0.02, volume: 0.3 },
  },
  ui_whoosh: { group: 'UI', label: 'Screen whoosh', bus: 'ui', priority: 80, voices: 1, gap: 0.3, vary: 0.05, gain: 1,
    synth: { wave: 'noise', freq: 3000, attack: 0.12, hold: 0.05, release: 0.191, lowpass: 0.15, lowpassEnd: 0.55, volume: 0.45, seed: 11 },
  },
  ui_type: { group: 'UI', label: 'Teletype key', bus: 'ui', priority: 60, voices: 2, gap: 0.02, vary: 0.12, gain: 1,
    synth: { wave: 'noise', freq: 4000, attack: 0.001, hold: 0.004, release: 0.015, noise: 0, lowpass: 0.7, volume: 0.25, seed: 21 },
  },
  fire_machineGun: { group: 'Towers', label: 'Threader fire', bus: 'sfx', priority: 20, voices: 3, gap: 0.06, vary: 0.1, gain: 1,
    synth: { wave: 'square', freq: 3042, freqEnd: 600, duty: 0.3, attack: 0.001, hold: 0.01, release: 0.03, noise: 0.4, volume: 0.12 },
  },
  fire_pulseRifle: { group: 'Towers', label: 'Pulse fire', bus: 'sfx', priority: 30, voices: 3, gap: 0.05, vary: 0, gain: 1,
    synth: { wave: 'saw', freq: 42, freqEnd: 248, duty: 0.15, attack: 0.001, hold: 0, release: 0.191, vibRate: 1, noise: 0.3, lowpass: 0.5, lowpassEnd: 0.13, crush: 0, volume: 0.27 },
  },
  fire_pumpShotgun: { group: 'Towers', label: 'Compressor fire', bus: 'sfx', priority: 35, voices: 2, gap: 0.1, vary: 0.08, gain: 1,
    synth: { wave: 'noise', freq: 314, freqEnd: 57, slideTime: 0.078, duty: 0.09, attack: 0.001, hold: 0.03, release: 0.826, noise: 0.43, lowpass: 0.59, lowpassEnd: 0.18, crush: 11, volume: 0.35, seed: 8 },
  },
  fire_scatterShot: { group: 'Towers', label: 'Defrag fire', bus: 'sfx', priority: 35, voices: 2, gap: 0.12, vary: 0.06, gain: 1,
    synth: { wave: 'sine', freq: 420, freqEnd: 140, attack: 0.002, hold: 0.04, release: 0.12, noise: 0.35, crush: 8, volume: 0.2 },
  },
  fire_grenadeLauncher: { group: 'Towers', label: 'DDOS fire', bus: 'sfx', priority: 40, voices: 2, gap: 0.15, vary: 0.06, gain: 1,
    synth: { wave: 'noise', freq: 5000, freqEnd: 23, slideTime: 1.268, duty: 0.39, attack: 0.037, hold: 0, release: 0.471, punch: 0.8, arpAt: 0, arpMul: 0.555, vibRate: 1, noise: 0, lowpass: 0.67, lowpassEnd: 0.29, crush: 0, volume: 0.13 },
  },
  fire_sniperRifle: { group: 'Towers', label: 'Deleter fire', bus: 'sfx', priority: 60, voices: 2, gap: 0.1, vary: 0.04, gain: 1,
    synth: { wave: 'saw', freq: 2200, freqEnd: 47, slideTime: 0.14, attack: 0.001, hold: 0.06, release: 0.701, lowpass: 0.9, lowpassEnd: 0.3, volume: 0.22 },
  },
  build: { group: 'Towers', label: 'Build', bus: 'sfx', priority: 70, voices: 2, gap: 0.05, vary: 0.03, gain: 1,
    synth: { wave: 'triangle', freq: 45, freqEnd: 660, slideTime: 0.08, attack: 0.002, hold: 0.07, release: 0.08, lowpass: 0.11, crush: 10, volume: 0.4 },
  },
  build_done: { group: 'Towers', label: 'Tower online', bus: 'sfx', priority: 50, voices: 2, gap: 0.08, vary: 0, gain: 1,
    synth: { wave: 'square', freq: 840, duty: 0.2, attack: 0.002, hold: 0.05, release: 0.05, arpAt: 0.03, arpMul: 1.5, volume: 0.1 },
  },
  sell: { group: 'Towers', label: 'Sell', bus: 'sfx', priority: 70, voices: 1, gap: 0.05, vary: 0, gain: 1,
    synth: { wave: 'saw', freq: 303, duty: 0.95, attack: 0.002, hold: 0.1, release: 0.08, arpAt: 0.05, arpMul: 0.75, volume: 0.18 },
  },
  upgrade: { group: 'Towers', label: 'Upgrade start', bus: 'sfx', priority: 70, voices: 1, gap: 0.05, vary: 0, gain: 1,
    synth: { wave: 'triangle', freq: 37, freqEnd: 880, duty: 0.21, attack: 0.01, hold: 0.25, release: 1.011, vibRate: 14, vibDepth: 0.03, volume: 0.35 },
  },
  upgrade_done: { group: 'Towers', label: 'Upgrade done', bus: 'sfx', priority: 70, voices: 1, gap: 0.1, vary: 0, gain: 1,
    synth: { wave: 'triangle', freq: 659.3, duty: 0.25, attack: 0.002, hold: 0.12, release: 0.1, arpAt: 0.06, arpMul: 1.335, volume: 0.18 },
  },
  tower_die: { group: 'Towers', label: 'Tower destroyed', bus: 'sfx', priority: 80, voices: 2, gap: 0.1, vary: 0.02, gain: 1,
    synth: { wave: 'noise', freq: 36, freqEnd: 69, duty: 0.67, attack: 0.138, hold: 0.055, release: 1.241, punch: 0, arpMul: 0.83, vibRate: 8.5, noise: 0.18, lowpass: 0.6, lowpassEnd: 0.05, crush: 0, volume: 0.5, seed: 9, layers: [
        { at: 0.02, wave: 'saw', freq: 500, freqEnd: 50, attack: 0.002, hold: 0.1, release: 0.3, crush: 4, volume: 0.2 },
      ] },
  },
  enemy_die: { group: 'Enemies', label: 'Enemy destroyed', bus: 'sfx', priority: 45, voices: 4, gap: 0.04, vary: 0.15, gain: 1,
    synth: { wave: 'noise', freq: 417, freqEnd: 1200, slideTime: 0.05, duty: 0.4, attack: 0.001, hold: 0.065, release: 0.096, noise: 0.3, crush: 6, volume: 0.16 },
  },
  enemy_die_big: { group: 'Enemies', label: 'Big enemy destroyed', bus: 'sfx', priority: 65, voices: 2, gap: 0.08, vary: 0.08, gain: 1, for: ['crack', 'worm'],
    synth: { wave: 'noise', freq: 40, freqEnd: 25, attack: 0.002, hold: 0.06, release: 0.771, punch: 0.5, noise: 0.26, lowpass: 0.7, lowpassEnd: 0.1, crush: 5, volume: 0.45, seed: 5, layers: [
        { at: 0, wave: 'square', freq: 300, freqEnd: 60, attack: 0.002, hold: 0.05, release: 0.2, crush: 5, volume: 0.18 },
      ] },
  },
  core_lost: { group: 'Game', label: 'Core lost', bus: 'sfx', priority: 85, voices: 1, gap: 0.3, vary: 0, gain: 1,
    synth: { wave: 'saw', freq: 220, freqEnd: 110, attack: 0.005, hold: 0.12, release: 0.18, lowpass: 0.6, volume: 0.25 },
  },
  warn_attack: { group: 'Game', label: 'Virus/Bug attack warning', bus: 'sfx', priority: 90, voices: 1, gap: 2, vary: 0, gain: 1,
    synth: { wave: 'square', freq: 988, duty: 0.5, attack: 0.002, hold: 0.07, release: 0.02, volume: 0.16, layers: [
        { at: 0.12, wave: 'square', freq: 740, attack: 0.002, hold: 0.07, release: 0.04, volume: 0.16 },
      ] },
  },
  crash: { group: 'Game', label: 'CRASH', bus: 'sfx', priority: 95, voices: 1, gap: 1, vary: 0, gain: 1,
    synth: { wave: 'noise', freq: 400, attack: 0.005, hold: 0.3, release: 0.6, lowpass: 0.8, lowpassEnd: 0.05, crush: 3, volume: 0.55, seed: 13, layers: [
        { at: 0, wave: 'square', freq: 90, freqEnd: 40, attack: 0.005, hold: 0.3, release: 0.5, crush: 3, volume: 0.25 },
      ] },
  },
  blueprint: { group: 'Game', label: 'Blueprint collected', bus: 'sfx', priority: 75, voices: 1, gap: 0.1, vary: 0, gain: 1,
    synth: { wave: 'square', freq: 988, duty: 0.5, attack: 0.002, hold: 0.2, release: 0.15, arpAt: 0.07, arpMul: 1.335, volume: 0.16 },
  },
  unlock: { group: 'Game', label: 'Unlock', bus: 'sfx', priority: 95, voices: 1, gap: 0.5, vary: 0, gain: 1,
    synth: { layers: [
        { at: 0, wave: 'square', freq: 523.3, duty: 0.25, attack: 0.002, hold: 0.08, release: 0.04, volume: 0.16 },
        { at: 0.1, wave: 'square', freq: 659.3, duty: 0.25, attack: 0.002, hold: 0.08, release: 0.04, volume: 0.16 },
        { at: 0.2, wave: 'square', freq: 784, duty: 0.25, attack: 0.002, hold: 0.08, release: 0.04, volume: 0.16 },
        { at: 0.3, wave: 'square', freq: 1046.5, duty: 0.25, attack: 0.002, hold: 0.25, release: 0.2, vibRate: 7, vibDepth: 0.01, volume: 0.18 },
      ] },
  },
  wave_start: { group: 'Waves', label: 'Wave start', bus: 'sfx', priority: 80, voices: 1, gap: 0.5, vary: 0, gain: 1,
    synth: { wave: 'sine', freq: 110, freqEnd: 440, attack: 0.05, hold: 0.25, release: 1.801, noise: 0.18, lowpass: 0.3, lowpassEnd: 0.8, volume: 0.3 },
  },
  wave_clear: { group: 'Waves', label: 'Wave cleared', bus: 'sfx', priority: 80, voices: 1, gap: 0.5, vary: 0, gain: 1,
    synth: { wave: 'triangle', freq: 784, attack: 0.005, hold: 0.2, release: 0.901, arpAt: 0.09, arpMul: 1.335, volume: 0.35 },
  },
  surge_tick: { group: 'Waves', label: 'Surge countdown', bus: 'sfx', priority: 85, voices: 1, gap: 0.5, vary: 0, gain: 1,
    synth: { wave: 'square', freq: 1320, duty: 0.5, attack: 0.002, hold: 0.04, release: 0.06, volume: 0.15 },
  },
  surge_breach: { group: 'Waves', label: 'Surge breach', bus: 'sfx', priority: 95, voices: 1, gap: 1, vary: 0, gain: 1,
    synth: { wave: 'noise', freq: 300, freqEnd: 100, attack: 0.01, hold: 0.5, release: 0.3, vibRate: 9, vibDepth: 0.06, lowpass: 0.3, lowpassEnd: 0.08, volume: 0.25 },
  },
  sting_win: { group: 'Stings', label: 'Victory sting', bus: 'music', priority: 100, voices: 1, gap: 1, vary: 0, gain: 1,
    synth: { layers: [
        { at: 0, wave: 'square', freq: 523.3, duty: 0.25, attack: 0.003, hold: 0.1, release: 0.05, volume: 0.18 },
        { at: 0.12, wave: 'square', freq: 659.3, duty: 0.25, attack: 0.003, hold: 0.1, release: 0.05, volume: 0.18 },
        { at: 0.24, wave: 'square', freq: 784, duty: 0.25, attack: 0.003, hold: 0.1, release: 0.05, volume: 0.18 },
        { at: 0.36, wave: 'square', freq: 1046.5, duty: 0.25, attack: 0.003, hold: 0.5, release: 0.5, vibRate: 6, vibDepth: 0.01, volume: 0.2 },
        { at: 0.36, wave: 'triangle', freq: 261.65, attack: 0.01, hold: 0.5, release: 0.5, volume: 0.35 },
      ] },
  },
  sting_fail: { group: 'Stings', label: 'Fail sting', bus: 'music', priority: 100, voices: 1, gap: 1, vary: 0, gain: 1,
    synth: { layers: [
        { at: 0, wave: 'saw', freq: 440, attack: 0.005, hold: 0.18, release: 0.05, lowpass: 0.5, volume: 0.16 },
        { at: 0.25, wave: 'saw', freq: 349.2, attack: 0.005, hold: 0.18, release: 0.05, lowpass: 0.5, volume: 0.16 },
        { at: 0.5, wave: 'saw', freq: 293.7, freqEnd: 276.078, attack: 0.005, hold: 0.6, release: 0.6, vibRate: 5, vibDepth: 0.02, lowpass: 0.45, volume: 0.18 },
        { at: 0.5, wave: 'triangle', freq: 146.85, attack: 0.01, hold: 0.6, release: 0.6, volume: 0.35 },
      ] },
  },
};

// Music. menu: plays on the main menu. waves: the pool (Jogo, 10 Nov): a track (not the
// last one) starts from the top and loops for AUDIO.wavesPerTrack waves; between waves it
// drops to AUDIO.breakLevel. file: null = no track. Files live in Code/assets/audio/.
export const MUSIC = {
  menu: { file: 'assets/audio/ALongGate.mp4', gain: 1, credit: 'Meta Sound and Music' },
  waves: [
    { file: 'assets/audio/SoLongSoWhat.mp4', gain: 1, credit: ' Meta Sound and Music' },
    { file: 'assets/audio/WhatIsBass.mp4', gain: 1, credit: ' Meta Sound and Music' },
    { file: 'assets/audio/Static.mp4', gain: 1, credit: ' Meta Sound and Music' },
    { file: 'assets/audio/StrangeThings.mp4', gain: 1, credit: ' Meta Sound and Music' },
  ],
};

// Lookups (fixed code, not data: the Mixer rewrites everything above this line).
export const fireSound = (weapon) => `fire_${weapon}`;
export const deathSound = (type) =>
  Object.keys(SOUNDS).find(id => SOUNDS[id].group === 'Enemies' && SOUNDS[id].for?.includes(type)) ?? 'enemy_die';
