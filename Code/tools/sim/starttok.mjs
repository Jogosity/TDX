// node tools/sim/starttok.mjs <seeds> <bot> <difficulty> [+a,+b] — Cores lost in waves 1–2 and overall, with extra starting Tokens per level
import { runLevel } from './engine.js';
import { LEVELS, PLAYER } from '../../js/config.js';
const [SEEDS, BOT, DIFF, ADDS] = process.argv.slice(2);
const adds = [0, ...(ADDS || '50,100').split(',').map(Number)];
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
console.log(`${BOT} bot, ${DIFF}, ${SEEDS} seeds. Each cell: Cores lost in waves 1–2 / win % / Cores left`);
console.log('Level'.padEnd(24) + 'start' + adds.map(a => `+${a}`.padStart(22)).join(''));
for (let li = 1; li < LEVELS.length; li++) {
  const base = LEVELS[li].startTokens ?? PLAYER.startTokens;
  const cells = adds.map(a => {
    const levels = LEVELS.map((L, i) => i === li ? { ...L, startTokens: base + a } : L);
    const rs = []; for (let seed = 1; seed <= +SEEDS; seed++) rs.push(runLevel(li, { seed, bot: BOT, levels, difficulty: DIFF }));
    return `${avg(rs.map(r => r.waves[0].leaks + r.waves[1].leaks)).toFixed(1)} / ${Math.round(rs.filter(r => r.lostAtWave === null).length / rs.length * 100)}% / ${avg(rs.map(r => Math.max(0, r.livesEnd))).toFixed(1)}`.padStart(22);
  });
  console.log(LEVELS[li].name.slice(0, 23).padEnd(24) + String(base).padStart(5) + cells.join(''));
}
