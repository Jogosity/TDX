// TDX Sim — Difficulty sweep (M9). From Code/:
//   node tools/sim/difficulty.mjs [seeds] [bot] [x,x,...]
// Plays every level (not the Tutorial) on Advanced and on Basic at each
// multiplier x (applied to HP and damage alike), and prints the win rate and
// average Cores lost per level, so the Basic setting can be picked by evidence.

import { runLevel } from './engine.js';
import { LEVELS, DIFFICULTY } from '../../js/config.js';

const SEEDS = +(process.argv[2] || 10);
const BOT = process.argv[3] || 'live';
const XS = (process.argv[4] || '0.9,0.8,0.7').split(',').map(Number);
const START = 15;   // PLAYER.startLives

const keep = { ...DIFFICULTY.basic };
function play(li, difficulty) {
  let wins = 0, lost = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const r = runLevel(li, { seed, bot: BOT, difficulty });
    if (r.lostAtWave === null) wins++;
    lost += START - Math.max(0, r.livesEnd);
  }
  return { win: wins / SEEDS, lost: lost / SEEDS };
}

const cols = [['Advanced', 'advanced', null], ...XS.map(x => [`Basic ×${x}`, 'basic', x])];
console.log(`Difficulty sweep: ${BOT} bot, ${SEEDS} seeds per cell. Each cell: win % / average Cores lost (of ${START}).`);
console.log(['Level'.padEnd(22), ...cols.map(c => c[0].padStart(14))].join(''));
const totals = cols.map(() => ({ win: 0, n: 0 }));
for (let li = 0; li < LEVELS.length; li++) {
  if (LEVELS[li].tutorial) continue;
  const cells = cols.map(([, diff, x], ci) => {
    if (x !== null) { DIFFICULTY.basic.health = x; DIFFICULTY.basic.damage = x; }
    const r = play(li, diff);
    totals[ci].win += r.win; totals[ci].n++;
    return `${Math.round(r.win * 100)}% / ${r.lost.toFixed(1)}`.padStart(14);
  });
  console.log([LEVELS[li].name.slice(0, 21).padEnd(22), ...cells].join(''));
}
console.log(['All levels'.padEnd(22), ...totals.map(t => `${Math.round(t.win / t.n * 100)}%`.padStart(14))].join(''));
Object.assign(DIFFICULTY.basic, keep);
