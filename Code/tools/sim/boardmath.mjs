// Board geometry per level, averaged over random boards: free cells, route length, gun slots (free cells whose
// Threader range 2.3 reaches the route), and how much route each slot sees.
import { HexGrid } from '../../js/hex.js';
import { PathField, smoothPath } from '../../js/path.js';
import { cellPx } from '../../js/entities.js';
import { placeBlockers, placeLockouts, placeExtraSpawns } from '../../js/board.js';
import { mulberry32 } from './engine.js';
const file = process.argv[2]; const N = +(process.argv[3] || 20);
const { LEVELS } = await import(file);
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
console.log(file.split('/').pop());
console.log('Level              cells free  route  slots slots/route  deepSlots');
for (let li = 1; li < LEVELS.length; li++) {
  const L = LEVELS[li]; const acc = [];
  for (let s = 1; s <= N; s++) {
    const real = Math.random; Math.random = mulberry32(s * 31 + li);
    try {
      const grid = new HexGrid(L.grid); grid.layout(390, 844); const field = new PathField(grid);
      if (L.spawns > 1) placeExtraSpawns(grid, field, L.spawns - 1);
      placeBlockers(grid, field, L.blockers); placeLockouts(grid, L.lockouts); field.recompute();
      const px = cellPx(grid); const pts = []; let route = 0, n = 0;
      for (const sp of grid.spawns) { if (!field.reachable(sp)) continue; const p = smoothPath(field.waypointsFrom(sp)); route += p.total / px; n++; pts.push(...p.pts); }
      const free = [...grid.cells.values()].filter(c => !c.occupied && !c.spawn && !c.lockout && !c.exit && !c.blocker);
      const cover = c => pts.filter(p => Math.hypot(p.x - c.x, p.y - c.y) <= 2.3 * px).length;
      const covs = free.map(cover);
      const slots = covs.filter(v => v > 0).length;
      const deep = covs.filter(v => v >= 0.5 * Math.max(...covs)).length;   // cells seeing at least half the best cell's route
      acc.push({ cells: grid.cells.size, free: free.length, route: route / n, slots, deep });
    } finally { Math.random = real; }
  }
  const f = k => avg(acc.map(a => a[k]));
  console.log(`${L.name.slice(0, 18).padEnd(18)} ${f('cells').toFixed(0).padStart(5)} ${f('free').toFixed(0).padStart(4)} ${f('route').toFixed(1).padStart(6)} ${f('slots').toFixed(0).padStart(6)} ${(f('slots') / f('route')).toFixed(2).padStart(11)} ${f('deep').toFixed(0).padStart(10)}`);
}
