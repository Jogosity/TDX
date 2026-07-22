// TDX — persistent player profile (localStorage).
// Holds the meta-layer: BITS balance, unlocked upgrade tier, blueprint counts.
// Safe in headless/node contexts (no localStorage → in-memory only).

import { TOWER_ORDER } from './config.js';

const KEY = 'tdx-save-v1';

const DEFAULTS = () => ({
  bits: 0,
  tierUnlocks: {},              // per tower type: highest tier unlocked, e.g. { threader: 3 } (absent = 1)
  blueprints: {},               // per tower type: BPs collected, e.g. { ddos: 7 }
  towersUnlocked: ['threader'], // Collection (Core): everything else starts locked
  levelsUnlocked: 0,            // Area Unlock: index of the highest playable level
});

export function loadSave() {
  const s = DEFAULTS();
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) Object.assign(s, JSON.parse(raw));
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
  return s;
}

export function clearSave() {
  try { globalThis.localStorage?.removeItem(KEY); } catch { /* ignore */ }
}

export function writeSave(save) {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(save));
  } catch { /* private mode etc. — play continues without persistence */ }
}
