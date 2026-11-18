// TDX — slot density (F16, 18 Nov 2026). DOM-free: the Ledger, the Level
// Editor, the Sim and the tests all use it.
//
//   slot density = gun slots ÷ route length
//   gun slots    = free cells (not blocker, Lockout, entry or exit) whose
//                  Threader range (2.3 cells) reaches an enemy route
//   route length = cells an enemy walks from its entry to the base, on the
//                  empty board, averaged over the entry points
//
// It's how many towers a full board can bring to bear on each cell of the
// route: the ceiling once Tokens stop being the limit (late waves, banking).
// Calibration (Jogo's fresh-save run, 18 Nov): L5–L7 sit at ~3.6 and play at
// the brink on Advanced. Wide levels are allowed on purpose (more room for a
// varied roster), so the bands describe a level, they don't flag an error.

import { buildBoard } from '../editor/validate.js';
import { smoothPath } from '../../js/path.js';
import { cellPx } from '../../js/entities.js';

export const SLOT_RANGE = 2.3;                       // WEAPONS.machineGun.range (Threader)
export const SLOT_BANDS = { tight: 3.5, open: 4.0 }; // below tight = Tight, above open = Open, between = Brink

export function slotBand(density) {
  if (!Number.isFinite(density)) return { key: 'none', label: '–' };
  return density < SLOT_BANDS.tight ? { key: 'tight', label: 'Tight' }
    : density > SLOT_BANDS.open ? { key: 'open', label: 'Open' } : { key: 'brink', label: 'Brink' };
}

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One board: { free, route, slots, strong, density }.
export function boardSlots(grid, field) {
  const px = cellPx(grid), reach = SLOT_RANGE * px;
  const pts = []; let route = 0, n = 0;
  for (const sp of grid.spawns) {
    if (!field.reachable(sp)) continue;
    const p = smoothPath(field.waypointsFrom(sp));
    route += p.total / px; n++;
    for (const q of p.pts) pts.push(q);
  }
  const free = [...grid.cells.values()].filter(c => !c.occupied && !c.spawn && !c.lockout && !c.exit && !c.blocker);
  const cover = free.map(c => { let k = 0; for (const p of pts) if (Math.hypot(p.x - c.x, p.y - c.y) <= reach) k++; return k; });
  const best = Math.max(0, ...cover);
  const slots = cover.filter(k => k > 0).length;
  const strong = best > 0 ? cover.filter(k => k >= best / 2).length : 0;   // cells seeing ≥ half the best cell's route
  route = n ? route / n : 0;
  return { free: free.length, route, slots, strong, density: route > 0 ? slots / route : NaN };
}

// A level, averaged over `boards` random rolls (blockers, Lockouts and extra
// entries are random in the game). Same seed → same numbers on every load.
export function slotDensity(level, { boards = 20, seed = 1 } = {}) {
  const acc = { free: 0, route: 0, slots: 0, strong: 0 };
  const real = Math.random;
  try {
    for (let b = 0; b < boards; b++) {
      Math.random = seeded(seed * 7919 + b * 104729);
      const { grid, field } = buildBoard(level);
      const r = boardSlots(grid, field);
      for (const k in acc) acc[k] += r[k] / boards;
    }
  } finally { Math.random = real; }
  const density = acc.route > 0 ? acc.slots / acc.route : NaN;
  return { ...acc, density, band: slotBand(density) };
}
