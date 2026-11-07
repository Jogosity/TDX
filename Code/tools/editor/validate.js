// TDX Level Editor — level checks. The editor won't save a level with an
// error; warnings are shown but don't block. tests/sim.mjs runs the same
// checks over js/levels.js, so the editor and the tests always agree.

import { ENEMIES, TOWERS, TOWER_ORDER } from '../../js/config.js';
import { HexGrid } from '../../js/hex.js';
import { PathField } from '../../js/path.js';
import { placeBlockers, placeLockouts, placeExtraSpawns } from '../../js/board.js';

export const LIMITS = {
  rows: [4, 16], rowWidth: [2, 12], waves: [1, 20], spawns: [1, 4],
};

const num = v => typeof v === 'number' && Number.isFinite(v);

// Build a level's board the way the game does (entry points, blockers, lockouts).
export function buildBoard(level, viewport = [390, 620]) {
  const grid = new HexGrid(level.grid);
  grid.layout(...viewport);
  const field = new PathField(grid);
  if (level.spawns > 1) placeExtraSpawns(grid, field, level.spawns - 1);
  placeBlockers(grid, field, level.blockers);
  placeLockouts(grid, level.lockouts);
  field.recompute();
  return { grid, field };
}

// Roll the board `tries` times and report what went wrong at least once.
export function boardProblems(level, tries = 12) {
  const out = new Set();
  for (let t = 0; t < tries; t++) {
    const { grid, field } = buildBoard(level);
    const cells = [...grid.cells.values()];
    if (grid.spawns.length !== level.spawns) out.add(`only room for ${grid.spawns.length} of ${level.spawns} entry points (widen the top rows, add entry rows or lower the min distance)`);
    if (cells.filter(c => c.blocker).length !== level.blockers) out.add('not enough room for every blocker');
    if (cells.filter(c => c.lockout).length !== level.lockouts) out.add('not enough room for every Lockout');
    if (!grid.spawns.every(s => field.reachable(s))) out.add('an entry point is cut off from the base');
  }
  return [...out];
}

export function validateLevel(level, index = 0) {
  const errors = [], warnings = [];
  const L = `L${index}`;
  const err = m => errors.push(`${L}: ${m}`), warn = m => warnings.push(`${L}: ${m}`);

  if (!level.name?.trim()) err('needs a name');
  const rw = level.grid?.rowWidths ?? [];
  if (rw.length < LIMITS.rows[0] || rw.length > LIMITS.rows[1]) err(`needs ${LIMITS.rows[0]}–${LIMITS.rows[1]} rows`);
  if (!rw.every(w => Number.isInteger(w) && w >= LIMITS.rowWidth[0] && w <= LIMITS.rowWidth[1])) err(`row widths must be ${LIMITS.rowWidth[0]}–${LIMITS.rowWidth[1]}`);
  if (!(level.spawns >= LIMITS.spawns[0] && level.spawns <= LIMITS.spawns[1])) err(`entry points must be ${LIMITS.spawns[0]}–${LIMITS.spawns[1]}`);
  if (!(level.blockers >= 0) || !(level.lockouts >= 0)) err('blockers and Lockouts can’t be negative');
  if (!(num(level.startTokens) && level.startTokens > 0)) err('start Tokens must be above 0');
  if (!(level.enemyDelta?.health > 0 && level.enemyDelta?.damage > 0)) err('enemy HP and damage scaling must be above 0');
  if (!(level.rewardBits >= 0)) err('BITS reward can’t be negative');

  const slots = Object.values(level.bpPool ?? {});
  for (const k of slots) if (!TOWERS[k] || !(TOWERS[k].blueprints > 0)) err(`"${k}" can’t drop Blueprints`);
  if (new Set(slots).size !== slots.length) warn('the same tower is in two drop slots');

  const waves = level.waves ?? [];
  if (waves.length < LIMITS.waves[0] || waves.length > LIMITS.waves[1]) err(`needs ${LIMITS.waves[0]}–${LIMITS.waves[1]} waves`);
  waves.forEach((w, i) => {
    const W = `W${i + 1}`;
    if (!(w.rtv > 0 && w.rtv < w.mav && w.mav <= w.tev)) err(`${W} needs 0 < RTV < MAV ≤ TEV`);
    if (!(w.spawnInterval > 0)) err(`${W} spawn interval must be above 0`);
    if (w.surge !== undefined && !(w.surge > 0 && w.surge <= 2)) err(`${W} surge must be above 0 and at most 2 (× TEV)`);
    if (!w.unlocked?.length) err(`${W} has no enemies`);
    else if (!w.unlocked.every(k => ENEMIES[k])) err(`${W} has an unknown enemy`);
    else if (Math.min(...w.unlocked.map(k => ENEMIES[k].ev)) > w.mav) err(`${W}: MAV is below every enemy's EV, nothing can spawn`);
  });

  if (!errors.length) for (const p of boardProblems(level)) err(p);
  return { errors, warnings };
}

export function validateLevels(levels) {
  const errors = [], warnings = [];
  levels.forEach((l, i) => {
    const r = validateLevel(l, i);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
    if (i > 0 && !levels[i - 1].tutorial && l.startTokens < levels[i - 1].startTokens) warnings.push(`L${i}: starts with fewer Tokens than L${i - 1}`);
  });
  if (!levels.length) errors.push('needs at least one level');
  // every lockable tower in the tray should drop somewhere
  const dropped = new Set(levels.flatMap(l => Object.values(l.bpPool ?? {})));
  for (const k of TOWER_ORDER) {
    if (TOWERS[k].blueprints > 0 && !dropped.has(k)) warnings.push(`${TOWERS[k].name} never drops, so it can never unlock`);
  }
  return { errors, warnings };
}
