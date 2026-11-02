// TDX Level Editor — the level model: the intensity curve, roster lanes and
// the file's key order. Pure, no DOM: the editor, the tests and one-off
// scripts share it.
//
// Waves in js/levels.js are plain numbers (what the game plays). The curve is
// a shaping tool stored in level.design.curve: touching it rewrites every
// wave's tev / mav / rtv / spawnInterval. Rosters are edited as lanes (each
// enemy joins at one wave and leaves after another) and rewrite `unlocked`
// and `weights`. The two never touch each other's fields.

import { ENEMIES } from '../../js/config.js';

// Wave 1 cold start (M3 E5/E7): light enemies only, spawned further apart,
// half the field cap. Applied when design.curve.opening is on.
export const OPENING = { roster: ['hack', 'slice'], spread: 1.5, mav: 0.5 };
export const RTV_RATIO = 0.5;       // rtv = mav × this (sub-wave rhythm)
// Roster order as the M1–M4 waves list them (order only changes which enemy a
// given random roll picks, not the odds); new enemies go on the end.
const ROSTER_ORDER = ['hack', 'slice', 'crack', 'worm', 'virus', 'stinger', 'bug'];
export const ENEMY_KEYS = [...ROSTER_ORDER.filter(k => ENEMIES[k]), ...Object.keys(ENEMIES).filter(k => !ROSTER_ORDER.includes(k))];

const round = (v, step) => Math.round(v / step) * step;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------------------
// Intensity curve. curve = { start, mid, midAt, end, points, tev, mav,
// interval: [slow, fast], opening }. start/mid/end are intensities (0..1) at
// the first wave, at midAt (0..1 of the way along) and at the last wave;
// points[i] (or null) pins one wave's intensity by hand. Intensity 1 = the
// peak: tev waves are TEV × I, MAV × √I (the field cap grows slower than the
// budget, as in the hand-set M1–M4 waves), spawn interval runs slow → fast.
// ---------------------------------------------------------------------------
export function curveAt(curve, i, n) {
  if (curve.points?.[i] != null) return curve.points[i];
  return curveLine(curve, n > 1 ? i / (n - 1) : 1);
}

// Smooth line through the three handles (monotone cubic: never overshoots,
// bends like a real difficulty ramp).
export function curveLine(curve, x) {
  const m = clamp(curve.midAt, 0.05, 0.95);
  const P = [[0, curve.start], [m, curve.mid], [1, curve.end]];
  const d = [(P[1][1] - P[0][1]) / m, (P[2][1] - P[1][1]) / (1 - m)];
  const mid = d[0] * d[1] > 0 ? (2 * d[0] * d[1]) / (d[0] + d[1]) : 0;
  const t = [clamp(1.5 * d[0] - 0.5 * mid, Math.min(0, 3 * d[0]), Math.max(0, 3 * d[0])), mid,
             clamp(1.5 * d[1] - 0.5 * mid, Math.min(0, 3 * d[1]), Math.max(0, 3 * d[1]))];
  const k = x <= m ? 0 : 1;
  const [x0, y0] = P[k], [x1, y1] = P[k + 1], h = x1 - x0;
  const u = clamp((x - x0) / h, 0, 1), u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * y0 + (u3 - 2 * u2 + u) * h * t[k] + (-2 * u3 + 3 * u2) * y1 + (u3 - u2) * h * t[k + 1];
}

export function waveNumbers(curve, i, n) {
  const I = clamp(curveAt(curve, i, n), 0.02, 1.5);
  const open = curve.opening && i === 0;
  const tev = Math.max(100, round(curve.tev * I, 100));
  let mav = Math.max(60, round(curve.mav * Math.sqrt(I) * (open ? OPENING.mav : 1), 10));
  mav = Math.min(mav, tev);
  const rtv = Math.max(10, round(mav * RTV_RATIO, 10));
  const [slow, fast] = curve.interval;
  const spawnInterval = +((slow + (fast - slow) * clamp(I, 0, 1)) * (open ? OPENING.spread : 1)).toFixed(2);
  return { tev, mav, rtv, spawnInterval };
}

// Rewrite the numbers of every wave from the curve (rosters untouched).
export function applyCurve(level) {
  const c = level.design.curve, n = level.waves.length;
  level.waves = level.waves.map((w, i) => ({ ...w, ...waveNumbers(c, i, n) }));
  return level;
}

// Best-fit curve for waves that were never shaped by the editor (M1–M4 data).
// A wave the curve misses by more than 4% gets a pinned point at its own TEV.
export function fitCurve(waves, opening = true) {
  const n = waves.length;
  const tev = Math.max(...waves.map(w => w.tev));
  const I = waves.map(w => w.tev / tev);
  const mid = Math.floor((n - 1) / 2);
  const last = waves[n - 1];
  const mav = round(last.mav / Math.sqrt(I[n - 1]), 10);
  const rest = waves.slice(opening ? 1 : 0);
  const slow = Math.max(...rest.map(w => w.spawnInterval));
  const fast = Math.min(...rest.map(w => w.spawnInterval));
  const curve = {
    start: +I[0].toFixed(3), mid: +I[mid].toFixed(3), midAt: n > 1 ? +(mid / (n - 1)).toFixed(3) : 0.5,
    end: +I[n - 1].toFixed(3), tev, mav, interval: [slow, fast], opening,
  };
  const pins = I.map((v, i) => (Math.abs(curveAt(curve, i, n) - v) > 0.04 * v ? +v.toFixed(4) : null));
  if (pins.some(p => p != null)) curve.points = pins;
  return curve;
}

// Change the wave count, stretching the curve's pins and every roster lane.
export function setWaveCount(level, n) {
  const old = level.waves.length;
  if (n === old || n < 1) return level;
  const lanes = rosterLanes(level);
  const c = level.design.curve;
  if (c.points) c.points = Array.from({ length: n }, (_, i) => (i < old ? c.points[i] : null));
  const tmpl = level.waves[old - 1];
  level.waves = Array.from({ length: n }, (_, i) => level.waves[i] ?? { ...tmpl });
  for (const l of Object.values(lanes)) {
    if (l.to >= old - 1) l.to = n - 1;
    l.to = Math.min(l.to, n - 1);
    l.from = Math.min(l.from, n - 1);
  }
  setRosterLanes(level, lanes);
  return applyCurve(level);
}

// ---------------------------------------------------------------------------
// Roster lanes. { key: { from, to, weight } } with 0-based wave indexes.
// Wave 1 under the opening rule is fixed to OPENING.roster and is not part of
// any lane (a lane starting at wave 2 still counts as "from the start").
// ---------------------------------------------------------------------------
export function rosterLanes(level) {
  const lanes = {};
  const opening = level.design?.curve?.opening;
  level.waves.forEach((w, i) => {
    if (opening && i === 0) return;
    for (const k of w.unlocked) {
      const l = lanes[k] ??= { from: i, to: i, weight: 1 };
      l.to = i;
      if (w.weights?.[k] != null) l.weight = w.weights[k];
    }
  });
  return lanes;
}

export function setRosterLanes(level, lanes) {
  const opening = level.design?.curve?.opening;
  level.waves = level.waves.map((w, i) => {
    const out = { ...w };
    delete out.weights;
    if (opening && i === 0) { out.unlocked = [...OPENING.roster]; return out; }
    out.unlocked = ENEMY_KEYS.filter(k => lanes[k] && lanes[k].from <= i && i <= lanes[k].to);
    const weights = {};
    for (const k of out.unlocked) if (lanes[k].weight !== 1) weights[k] = lanes[k].weight;
    if (Object.keys(weights).length) out.weights = weights;
    return out;
  });
  return level;
}

// ---------------------------------------------------------------------------
// File order. Every level is written in this key order so saves diff cleanly.
// ---------------------------------------------------------------------------
const LEVEL_KEYS = ['name', 'grid', 'spawns', 'blockers', 'lockouts', 'startTokens', 'enemyDelta',
  'rewardBits', 'bpPool', 'theme', 'waves', 'design'];
const WAVE_KEYS = ['tev', 'mav', 'rtv', 'spawnInterval', 'unlocked', 'weights'];
const GRID_KEYS = ['rowWidths', 'spawnCells', 'entryRows', 'entryMinDist'];
const CURVE_KEYS = ['start', 'mid', 'midAt', 'end', 'points', 'tev', 'mav', 'interval', 'opening'];

const ordered = (obj, keys) => {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  for (const k of Object.keys(obj)) if (!(k in out) && obj[k] !== undefined) out[k] = obj[k];
  return out;
};

export function normalizeLevel(level) {
  const L = ordered(level, LEVEL_KEYS);
  L.grid = ordered(L.grid, GRID_KEYS);
  L.waves = L.waves.map(w => ordered(w, WAVE_KEYS));
  const bp = {};
  for (const slot of ['primary', 'secondary', 'tertiary']) if (L.bpPool?.[slot]) bp[slot] = L.bpPool[slot];
  L.bpPool = bp;
  if (L.design) {
    L.design = ordered(L.design, ['curve', 'target']);
    if (L.design.curve) {
      const c = ordered(L.design.curve, CURVE_KEYS);
      if (c.points && c.points.every(p => p == null)) delete c.points;
      L.design.curve = c;
    }
  }
  return L;
}

// A fresh level to start from (Add level in the editor).
export function blankLevel(n) {
  const curve = { start: 0.2, mid: 0.55, midAt: 0.5, end: 1, tev: 6000, mav: 1400, interval: [1.1, 0.7], opening: true };
  const level = {
    name: `Level ${n}: New Level`,
    grid: { rowWidths: [7, 8, 8, 8, 8, 8, 7, 6, 5, 4, 3], spawnCells: 1, entryRows: 5, entryMinDist: 0 },
    spawns: 1, blockers: 6, lockouts: 2, startTokens: 300,
    enemyDelta: { health: 1, damage: 1 }, rewardBits: 3,
    bpPool: { primary: 'vault' }, theme: {},
    waves: Array.from({ length: 8 }, () => ({ tev: 100, mav: 100, rtv: 50, spawnInterval: 1, unlocked: ['hack'] })),
    design: { curve, target: { start: 0.5, end: 0.9 } },
  };
  applyCurve(level);
  setRosterLanes(level, { hack: { from: 1, to: 7, weight: 1 }, slice: { from: 1, to: 7, weight: 1 } });
  return normalizeLevel(level);
}
