// TDX — Daily Quests (M9, Retention Module 4: Re-engagement).
// Pure logic, no DOM: the game, the tests and the Sim all use it.
//
// Each local day the player gets QUESTS.perDay quests, one per tier (easy,
// medium, hard), picked from QUESTS.pool with a seed made from the day, so
// the same day always gives the same set. Progress counts from every level
// except the Tutorial and is added at the end of each run (win or loss).
// Finished quests are claimed on the Main Menu's Daily Quests panel for BITS.
// Claiming at least one quest in a day keeps the streak going; a day with no
// claim breaks it.
//
// Save block (save.quests):
//   day        local day number the set belongs to
//   seed       bumped by the debug Reroll, so a reroll gives a different set
//   dayOffset  debug Next day: days added to the clock
//   set        [{ id, target, bits, tower?, enemy?, limit? }]
//   progress   [n, n, n]
//   claimed    [bool, bool, bool]
//   streak, bestStreak, lastClaimDay

import { QUESTS, QUEST_PROFILE, TOWERS, TOWER_ORDER, ENEMIES } from './config.js';
import { LEVELS } from './levels.js';

export const questDefaults = () => ({
  day: null, seed: 0, dayOffset: 0, set: [], progress: [], claimed: [],
  streak: 0, bestStreak: 0, lastClaimDay: null,
});

// Fill in or fix a save's quest block (older saves have none).
export function repairQuests(q) {
  const d = questDefaults();
  if (typeof q !== 'object' || q === null) return d;
  const out = { ...d, ...q };
  for (const k of ['seed', 'dayOffset', 'streak', 'bestStreak']) if (!Number.isFinite(out[k])) out[k] = 0;
  if (!Number.isFinite(out.day)) out.day = null;
  if (!Number.isFinite(out.lastClaimDay)) out.lastClaimDay = null;
  const known = new Set(QUESTS.pool.map(p => p.id));
  if (!Array.isArray(out.set) || !out.set.every(e => e && known.has(e.id))) { out.set = []; out.day = null; }
  out.progress = out.set.map((_, i) => (Number.isFinite(out.progress?.[i]) ? out.progress[i] : 0));
  out.claimed = out.set.map((_, i) => !!out.claimed?.[i]);
  return out;
}

// Local calendar day as a whole number (days since 1970-01-01 in local time).
export function dayNumber(date = new Date(), offset = 0) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000) + offset;
}
export const today = (save, now = new Date()) => dayNumber(now, save.quests.dayOffset);

// Milliseconds until the next local midnight (the panel's "New quests in …").
export function msToNextDay(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next - now;
}

const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Two significant figures, so targets read cleanly (4,687 → 4,700).
export function niceNumber(n) {
  if (n < 10) return Math.max(1, Math.round(n));
  const p = 10 ** (Math.floor(Math.log10(n)) - 1);
  return Math.round(n / p) * p;
}

// The level a quest's size is measured against: the player's furthest level
// (Tutorial counts as Level 1).
export const frontier = (save) => Math.max(1, Math.min(save.levelsUnlocked, LEVELS.length - 1));
const profileFor = (save) => QUEST_PROFILE[Math.min(frontier(save), QUEST_PROFILE.length) - 1];

// Enemies the player meets in the levels open to them.
export function enemiesMet(save) {
  const met = new Set();
  for (let i = 1; i <= frontier(save); i++) for (const w of LEVELS[i].waves) for (const k of w.unlocked) met.add(k);
  return [...met].filter(k => ENEMIES[k]);
}

const lockedTowerLeft = (save) => TOWER_ORDER.some(k => !save.towersUnlocked.includes(k));

// Can this quest be offered today? ctx.advancedOpen(save, i) comes from the
// Difficulty work; without it the Advanced quest never shows.
export function eligible(def, save, ctx = {}) {
  if (def.needs === 'lockedTower' && !lockedTowerLeft(save)) return false;
  if (def.needs === 'advanced') {
    if (typeof ctx.advancedOpen !== 'function') return false;
    if (!LEVELS.some((_, i) => ctx.advancedOpen(save, i))) return false;
  }
  if (def.pick === 'tower' && !specialistTowers(save).length) return false;
  return true;
}
const specialistTowers = (save) => TOWER_ORDER.filter(k => k !== 'threader' && save.towersUnlocked.includes(k));

// Turn a pool entry into today's concrete quest (its target, and the tower or
// enemy it names).
function makeEntry(def, save, rnd) {
  const e = { id: def.id, bits: def.bits, target: def.target ?? 1 };
  if (def.runs !== undefined) {
    const n = niceNumber(Math.max(def.min ?? 1, profileFor(save)[def.stat === 'winLean' ? 'built' : def.stat] * def.runs));
    if (def.stat === 'winLean') { e.limit = n; e.target = 1; } else e.target = n;
  }
  if (def.pick === 'tower') {
    const pool = specialistTowers(save);
    e.tower = pool[Math.floor(rnd() * pool.length)];
  }
  if (def.pick === 'enemy') {
    const pool = enemiesMet(save);
    e.enemy = pool[Math.floor(rnd() * pool.length)];
    if (QUESTS.swarm.includes(e.enemy)) e.target *= def.swarmMult ?? 1;
  }
  return e;
}

// Today's set: one quest from each tier, skipping ineligible ones and pairs
// that exclude each other.
export function rollSet(save, day, ctx = {}) {
  const rnd = mulberry32(day * 2654435761 + (save.quests.seed || 0) * 40503 + 17);
  const chosen = [];
  for (const tier of QUESTS.tiers) {
    const taken = new Set(chosen.flatMap(c => [c.id, ...(c.excludes ?? [])]));
    const options = QUESTS.pool.filter(d => d.tier === tier && eligible(d, save, ctx)
      && !taken.has(d.id) && !(d.excludes ?? []).some(x => chosen.some(c => c.id === x)));
    if (!options.length) continue;
    chosen.push(options[Math.floor(rnd() * options.length)]);
  }
  return chosen.map(d => makeEntry(d, save, rnd));
}

// New day → new set, progress cleared. Unclaimed quests from earlier days are
// lost. Returns true when a new set was rolled.
export function ensureQuests(save, ctx = {}, now = new Date()) {
  save.quests = repairQuests(save.quests);
  const q = save.quests, day = today(save, now);
  if (q.day === day && q.set.length) return false;
  q.day = day;
  q.set = rollSet(save, day, ctx);
  q.progress = q.set.map(() => 0);
  q.claimed = q.set.map(() => false);
  return true;
}

export const questDef = (id) => QUESTS.pool.find(d => d.id === id);

// How much one run adds to a quest. stats = the level's Analytics stats;
// end = { win, difficulty } at the end of a run, or null while it is still
// being played (the "win a level" quests only count at the end).
export function runAmount(entry, stats, end = null) {
  const def = questDef(entry.id);
  const win = !!end?.win;
  switch (def.stat) {
    case 'kills': case 'built': case 'upgraded': case 'spent': case 'earned': case 'damage': case 'bps':
      return Math.floor(stats[def.stat] ?? 0);
    case 'builtBy': return stats.builtBy?.[entry.tower] ?? 0;
    case 'killedBy': return stats.killedBy?.[entry.enemy] ?? 0;
    case 'wins': return win ? 1 : 0;
    case 'winNoLeak': return win && !Object.values(stats.leakedBy ?? {}).some(n => n > 0) ? 1 : 0;
    case 'winNoLoss': return win && !stats.lost ? 1 : 0;
    case 'winLean': return win && stats.built <= entry.limit ? 1 : 0;
    case 'winAdvanced': return win && end?.difficulty === 'advanced' ? 1 : 0;
    default: return 0;
  }
}

// Progress including a run still being played (for in-level toasts).
export function liveProgress(save, stats, end = null) {
  const q = save.quests;
  return q.set.map((e, i) => Math.min(e.target, q.progress[i] + (stats ? runAmount(e, stats, end) : 0)));
}

export const isDone = (save, i, progress = save.quests.progress) => progress[i] >= save.quests.set[i].target;

// End of a run: add its numbers. Returns the indices of quests it finished.
// The Tutorial never counts.
export function commitRun(save, stats, end, level = {}) {
  const q = save.quests;
  if (level.tutorial || !q.set.length) return [];
  const before = q.set.map((_, i) => isDone(save, i));
  q.progress = liveProgress(save, stats, end);
  return q.set.map((_, i) => i).filter(i => !before[i] && isDone(save, i));
}

// Quests finished but not yet claimed (the panel's red dot).
export const claimable = (save) => save.quests.set.filter((_, i) => isDone(save, i) && !save.quests.claimed[i]).length;

// The streak as it stands today: it survives until a whole day passes with no claim.
export function streakNow(save, now = new Date()) {
  const q = save.quests, d = today(save, now);
  return q.lastClaimDay !== null && d - q.lastClaimDay <= 1 ? q.streak : 0;
}

// Claim quest i. Returns the BITS paid (0 if it can't be claimed).
export function claim(save, i, now = new Date()) {
  const q = save.quests;
  if (!q.set[i] || q.claimed[i] || !isDone(save, i)) return 0;
  const d = today(save, now);
  q.claimed[i] = true;
  save.bits += q.set[i].bits;
  if (q.lastClaimDay !== d) {
    q.streak = q.lastClaimDay !== null && d - q.lastClaimDay === 1 ? q.streak + 1 : 1;
    q.lastClaimDay = d;
    q.bestStreak = Math.max(q.bestStreak, q.streak);
  }
  return q.set[i].bits;
}

// Card text: config wording, or a Screen Text override (StringID Quest_<id>).
export function questText(entry, strings = {}) {
  const def = questDef(entry.id);
  const raw = strings[`Quest_${entry.id}`] || def.text;
  return raw
    .replace('{n}', (entry.limit ?? entry.target).toLocaleString('en-GB'))
    .replace('{tower}', entry.tower ? TOWERS[entry.tower].name : '')
    .replace('{enemy}', entry.enemy ? ENEMIES[entry.enemy].name : '');
}
export const questName = (entry, strings = {}) => strings[`QuestName_${entry.id}`] || questDef(entry.id).name;

// --- debug (Economy tab) -------------------------------------------------------
export function debugReroll(save, ctx = {}, now = new Date()) {
  save.quests.seed++;
  save.quests.day = null;
  ensureQuests(save, ctx, now);
}
export function debugCompleteAll(save) {
  const q = save.quests;
  q.progress = q.set.map(e => e.target);
}
export function debugNextDay(save, ctx = {}, now = new Date()) {
  save.quests.dayOffset++;
  ensureQuests(save, ctx, now);
}
export function debugBreakStreak(save) {
  save.quests.streak = 0;
  save.quests.lastClaimDay = null;
}
