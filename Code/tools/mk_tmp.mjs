import fs from 'node:fs';
const root = process.argv[2];
const { LEVELS } = await import(root + '/js/levels.js');
const M = await import(root + '/tools/editor/model.js');
const { formatLevels } = await import(root + '/tools/editor/format.js');
if (LEVELS[0].tutorial) { console.log('already there'); process.exit(0); }
const waves = [
  { tev: 300, mav: 150, rtv: 75, spawnInterval: 1.8, unlocked: ['hack'] },
  { tev: 600, mav: 250, rtv: 125, spawnInterval: 1.3, unlocked: ['hack', 'slice'] },
  { tev: 900, mav: 330, rtv: 165, spawnInterval: 1.1, unlocked: ['hack', 'slice'] },
];
const tut = {
  name: 'Level 0: Tutorial',
  tutorial: true,
  grid: { rowWidths: [4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 3], spawnCells: 1, entryRows: 2, entryMinDist: 0 },
  spawns: 1, blockers: 2, lockouts: 0, startTokens: 500,
  enemyDelta: { health: 1, damage: 1 }, rewardBits: 0, bpPool: {}, theme: {},
  waves,
  design: { curve: M.fitCurve(waves, false), target: { start: 0.3, end: 0.5 } },
};
const out = [tut, ...LEVELS].map(M.normalizeLevel);
fs.writeFileSync(root + '/js/levels.js', formatLevels(out));
console.log('written', out.length);
