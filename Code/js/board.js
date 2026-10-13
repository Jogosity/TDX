// TDX — board setup helpers (blockers, Lockout cells, extra entry points).
// DOM-free so the headless sim can exercise every level layout.

import { BLUEPRINTS } from './config.js';

// Interior candidate cells: not spawn/exit, not top row, above the exit row.
const interior = (grid) => [...grid.cells.values()].filter(c =>
  !c.spawn && !c.exit && c.r > 0 && c.r < grid.exits[0].r);

// Random blockers; every placement is checked so no spawn gets firewalled.
export function placeBlockers(grid, field, count) {
  const candidates = interior(grid);
  let placed = 0, guard = 0;
  while (placed < count && guard++ < 300) {
    const c = candidates[Math.floor(Math.random() * candidates.length)];
    if (c.occupied || c.lockout) continue;
    c.blocker = true;
    const { dist } = field.compute();
    if (grid.spawns.every(s => dist.has(s.key))) {
      placed++;
    } else {
      c.blocker = false; // would firewall — retry elsewhere
    }
  }
  field.recompute();
  return placed;
}

// Lockouts are passable for enemies, so no path checks needed — just keep
// them off spawns/exits/blockers/towers and other lockouts.
export function placeLockouts(grid, count) {
  const candidates = interior(grid).filter(c => !c.occupied && !c.lockout);
  let placed = 0, guard = 0;
  while (placed < count && guard++ < 200 && candidates.length > 0) {
    const i = Math.floor(Math.random() * candidates.length);
    const c = candidates.splice(i, 1)[0];
    c.lockout = true;
    placed++;
  }
  return placed;
}

export function clearLockouts(grid) {
  for (const c of grid.cells.values()) c.lockout = false;
}

// Extra entry points (2nd/3rd spawns). The 1st spawn stays anchored on the
// top edge (placed by HexGrid.build); extras may sit anywhere in the top 5
// rows. Cells must be free and connected to the base.
export function placeExtraSpawns(grid, field, count) {
  field.recompute();
  const candidates = [...grid.cells.values()].filter(c =>
    c.r <= 4 && !c.spawn && !c.exit && !c.occupied && !c.lockout && field.reachable(c));
  let placed = 0, guard = 0;
  while (placed < count && guard++ < 200 && candidates.length > 0) {
    const i = Math.floor(Math.random() * candidates.length);
    const c = candidates.splice(i, 1)[0];
    c.spawn = true;
    grid.spawns.push(c);
    placed++;
  }
  return placed;
}

export function clearExtraSpawns(grid) {
  const extras = grid.spawns.slice(1);
  for (const c of extras) c.spawn = false;
  grid.spawns = grid.spawns.slice(0, 1);
}

// Blueprint drops for one kill: each bpPool slot (primary/secondary/tertiary)
// rolls independently at its BLUEPRINTS.dropRates chance; slots whose tower is
// already unlocked never drop. Returns the tower keys that dropped.
export function rollBlueprints(bpPool, isUnlocked, rng = Math.random) {
  const out = [];
  for (const [slot, rate] of Object.entries(BLUEPRINTS.dropRates)) {
    const tower = bpPool?.[slot];
    if (tower && !isUnlocked(tower) && rng() < rate) out.push(tower);
  }
  return out;
}
