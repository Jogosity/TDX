// node tools/sim/vsrun.mjs ../Notes/runs/<run>.json [seeds] [bot] [{opts}] — a bot on the exact board of a recorded run, wave by wave beside it
import fs from 'fs';
import { runLevel } from './engine.js';
const r = JSON.parse(fs.readFileSync(process.argv[2])); const SEEDS = +(process.argv[3] || 10), BOT = process.argv[4] || 'skilled', O = JSON.parse(process.argv[5] || '{}');
const runs = []; for (let seed = 1; seed <= SEEDS; seed++) runs.push(runLevel(r.level, { seed, bot: BOT, board: r.board, ...O }));
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
console.log(`${r.name} (you: ${r.livesEnd} Cores left, ${r.tokensEnd} Tokens at end) vs ${BOT} ${JSON.stringify(O)}: wins ${runs.filter(x => x.lostAtWave === null).length}/${SEEDS}, Cores left ${avg(runs.map(x => Math.max(0, x.livesEnd))).toFixed(1)}`);
console.log('  w | you: tok leaks towers | bot: tok leaks towers upg');
r.waves.forEach((w, i) => {
  const ws = runs.map(x => x.waves[i]); const n = Object.values(w.towersEnd ?? {}).flat().reduce((a, c) => a + c, 0);
  console.log(` ${String(i + 1).padStart(2)} | ${String(w.tokens).padStart(8)} ${String(w.leaks).padStart(5)} ${String(n).padStart(6)} | ${avg(ws.map(x => x.tokensStart)).toFixed(0).padStart(8)} ${avg(ws.map(x => x.leaks)).toFixed(1).padStart(5)} ${avg(ws.map(x => x.towersStart)).toFixed(1).padStart(6)} ${avg(ws.map(x => x.upgrades)).toFixed(1).padStart(4)}`);
});
