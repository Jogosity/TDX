// TDX — persistent player profile (localStorage).
// Holds the meta-layer: BITS balance, unlocked upgrade tier, blueprint counts.
// Safe in headless/node contexts (no localStorage → in-memory only).

import { TOWER_ORDER, UPGRADE } from './config.js';
import { AUDIO } from './sounds.js';
import { repairQuests } from './quests.js';

const KEY = 'tdx-save-v1';
export const SAVE_VERSION = 3;   // S23: 2 = Level 0 (Tutorial) added at LEVELS[0]; M9: 3 = per-difficulty clears

const DEFAULTS = () => ({
  bits: 0,
  tierUnlocks: {},              // per tower type: highest tier unlocked, e.g. { threader: 3 } (absent = 1)
  blueprints: {},               // per tower type: BPs collected, e.g. { ddos: 7 }
  towersUnlocked: ['threader'], // Collection (Core): everything else starts locked
  levelsUnlocked: 0,            // Area Unlock: index of the highest playable level (0 = Tutorial)
  cleared: { basic: [], advanced: [] },   // M9: level indices cleared on each difficulty
  saveVersion: SAVE_VERSION,
  hints: {},                    // S25 one-time hints shown: { blueprint, bits }
  audio: { ...AUDIO.defaults }, // M8: { muted, music, sfx } — the cog menu's SOUND tab
  recordRuns: false,            // M9 debug: run recorder (js/recorder.js)
});

export function loadSave() {
  const s = DEFAULTS();
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) { s.saveVersion = 1; Object.assign(s, JSON.parse(raw)); }   // old saves carry no version
  } catch { /* corrupt or unavailable — fall back to defaults */ }
  // migrate pre-Collection saves (blueprints was a plain number)
  if (typeof s.blueprints !== 'object' || s.blueprints === null) s.blueprints = {};
  if (!Array.isArray(s.towersUnlocked)) s.towersUnlocked = ['threader'];
  if (!s.towersUnlocked.includes('threader')) s.towersUnlocked.push('threader');
  // migrate global tier unlocks (tiersUnlocked: number) → per-tower tierUnlocks
  if (typeof s.tierUnlocks !== 'object' || s.tierUnlocks === null) s.tierUnlocks = {};
  if (typeof s.tiersUnlocked === 'number') {
    if (s.tiersUnlocked > 1) {
      for (const k of TOWER_ORDER) {
        s.tierUnlocks[k] = Math.max(s.tierUnlocks[k] || 1, s.tiersUnlocked);
      }
    }
    delete s.tiersUnlocked;
  }
  if (typeof s.levelsUnlocked !== 'number' || s.levelsUnlocked < 0) s.levelsUnlocked = 0;
  // S23 (v2): Level 0 (Tutorial) slid in front of Level 1. A save from before it
  // moves up one level and counts the Tutorial as cleared, so nobody loses progress.
  if (s.saveVersion < 2) { s.levelsUnlocked += 1; s.saveVersion = 2; }
  // M9 (v3): per-difficulty clears. Levels beaten before Difficulty existed were
  // beaten at today's balance, which is Advanced, so they count on both (D4).
  if (typeof s.cleared !== 'object' || s.cleared === null) s.cleared = {};
  for (const d of ['basic', 'advanced']) {
    s.cleared[d] = Array.isArray(s.cleared[d]) ? [...new Set(s.cleared[d].filter(i => Number.isInteger(i) && i >= 0))].sort((a, b) => a - b) : [];
  }
  if (s.saveVersion < 3) {
    for (let i = 0; i < s.levelsUnlocked; i++) recordClear(s, i, i === 0 ? 'basic' : 'advanced');
    s.saveVersion = 3;
  }
  // S25: one-time hints. Players who already collected Blueprints / earned Bits skip them.
  if (typeof s.hints !== 'object' || s.hints === null) s.hints = {};
  if (Object.values(s.blueprints).some(n => n > 0) || s.towersUnlocked.length > 1) s.hints.blueprint = true;
  if (s.bits > 0 || Object.keys(s.tierUnlocks).length > 0) s.hints.bits = true;
  // M8: sound settings (older saves have none; fill any missing field)
  if (typeof s.audio !== 'object' || s.audio === null) s.audio = {};
  s.audio = { ...AUDIO.defaults, ...s.audio };
  for (const k of ['music', 'sfx']) if (typeof s.audio[k] !== 'number' || !(s.audio[k] >= 0 && s.audio[k] <= 1)) s.audio[k] = AUDIO.defaults[k];
  s.audio.muted = !!s.audio.muted;
  // M9: Daily Quests block (older saves have none; quests.js fills and repairs it)
  s.quests = repairQuests(s.quests);
  return s;
}

// M9 Difficulty. An Advanced clear also counts as a Basic clear. Advanced opens
// on a level once it is cleared on Basic; the Tutorial (0) is Basic only.
export const isCleared = (save, idx, diff = 'basic') => !!save.cleared?.[diff]?.includes(idx);
export const advancedOpen = (save, idx) => idx > 0 && isCleared(save, idx, 'basic');
export function recordClear(save, idx, diff) {
  const add = (d) => { const a = save.cleared[d]; if (!a.includes(idx)) { a.push(idx); a.sort((x, y) => x - y); } };
  add('basic');
  if (diff === 'advanced' && idx > 0) add('advanced');
}

// S25 red dots: how many of a tower's next tiers the player could unlock in a
// row with the Bits they hold (0 for a locked tower or one at max tier).
export function affordableTiers(save, type, costs = UPGRADE.tierUnlockBits, maxTier = UPGRADE.maxTier) {
  if (!save.towersUnlocked.includes(type)) return 0;
  let bits = save.bits, n = 0;
  for (let t = (save.tierUnlocks[type] || 1) + 1; t <= maxTier && costs[t] !== undefined && bits >= costs[t]; t++) { bits -= costs[t]; n++; }
  return n;
}
// The main menu's Towers dot: the total of the Towers menu's dots (Jogo, 9 Nov).
export const upgradesAffordable = (save) => TOWER_ORDER.reduce((n, k) => n + affordableTiers(save, k), 0);
export const dotLabel = (n) => (n > 3 ? '3+' : String(n));

export function clearSave() {
  try { globalThis.localStorage?.removeItem(KEY); } catch { /* ignore */ }
}

export function writeSave(save) {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(save));
  } catch { /* private mode etc. — play continues without persistence */ }
}
