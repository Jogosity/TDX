// Bot on a recorded run's board with that run's tier unlocks and the tower types it used.
import fs from 'fs'; import { runLevel, JOGO_MIX } from './engine.js';
const r = JSON.parse(fs.readFileSync(process.argv[2])); const SEEDS = +(process.argv[3] || 10);
const used = new Set(r.events.filter(e => e.e === 'build').map(e => e.type));
const mix = JOGO_MIX.filter(t => used.has(t)); const O = { tierUnlocks: r.meta.tierUnlocks, mix };
const avg = a => a.reduce((x, y) => x + y, 0) / a.length; const rs = [];
for (let seed = 1; seed <= SEEDS; seed++) rs.push(runLevel(r.level, { seed, bot: 'jogo', board: r.board, ...O }));
const n = r.waves.length;
console.log(`${r.name}: you ${r.win ? 'won' : 'lost'} with ${r.livesEnd} Cores | bot ${rs.filter(x => x.lostAtWave === null).length}/${SEEDS} wins, Cores left ${avg(rs.map(x => Math.max(0, x.livesEnd))).toFixed(1)}  mix ${mix}`);
const lostYou = w => r.events.filter(e => e.e === 'lost' && e.w === w).length;
console.log(' w | you leaks lost tok | bot leaks lostDrain lostCrash tok');
for (let i = 0; i < n; i++) { const ws = rs.map(x => x.waves[i]);
  console.log(` ${String(i + 1).padStart(2)} | ${String(r.waves[i].leaks).padStart(9)} ${String(lostYou(i + 1)).padStart(4)} ${String(r.waves[i].tokens).padStart(4)} | ${avg(ws.map(w => w.leaks)).toFixed(1).padStart(9)} ${avg(ws.map(w => w.towersLostDrain)).toFixed(1).padStart(9)} ${avg(ws.map(w => w.towersLostCrash)).toFixed(1).padStart(9)} ${avg(ws.map(w => w.tokensStart)).toFixed(0).padStart(4)}`); }
