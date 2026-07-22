// TDX — CRASH event core: relocate blockers, Lockout cells and extra entry
// points. Kept DOM-free so the headless sim can test it directly.
//
// Rules (per design doc):
// - all blockers move to new locations
// - a blocker may land on a player tower, destroying it — but at most
//   maxKills towers per crash
// - the map must never be firewalled: every spawn stays connected
// - lockouts and 2nd/3rd entry points also move; the 1st entry point stays
//   anchored on the top edge

import { placeLockouts, clearLockouts, placeExtraSpawns, clearExtraSpawns } from './board.js';

// Returns the list of destroyed Tower instances (already detached from
// their cells). The caller handles effects, token/UI fallout and repathing.
export function relocateBlockers(grid, field, maxKills) {
  const old = [...grid.cells.values()].filter(c => c.blocker);
  const count = old.length;
  for (const c of old) c.blocker = false;

  const destroyed = [];
  const candidates = [...grid.cells.values()].filter(c =>
    !c.spawn && !c.exit && c.r > 0 && c.r < grid.exits[0].r);

  let placed = 0, guard = 0;
  while (placed < count && guard++ < 500) {
    const c = candidates[Math.floor(Math.random() * candidates.length)];
    if (c.blocker) continue;
    if (c.tower && destroyed.length >= maxKills) continue;

    const victim = c.tower;
    if (victim) c.tower = null;      // tentatively crush
    c.blocker = true;
    const { dist } = field.compute();
    if (grid.spawns.every(s => dist.has(s.key))) {
      placed++;
      if (victim) destroyed.push(victim);
    } else {
      c.blocker = false;             // would firewall — put it back, retry
      if (victim) c.tower = victim;
    }
  }

  field.recompute();
  return destroyed;
}

// Full CRASH board shuffle: blockers first (may crush towers), then lockouts
// and extra entry points jump to fresh legal cells.
export function crashShuffle(grid, field, maxKills) {
  const lockoutCount = [...grid.cells.values()].filter(c => c.lockout).length;
  const extraSpawnCount = grid.spawns.length - 1;
  clearLockouts(grid);
  clearExtraSpawns(grid);
  const destroyed = relocateBlockers(grid, field, maxKills);
  placeLockouts(grid, lockoutCount);
  if (extraSpawnCount > 0) placeExtraSpawns(grid, field, extraSpawnCount);
  field.recompute();
  return destroyed;
}
