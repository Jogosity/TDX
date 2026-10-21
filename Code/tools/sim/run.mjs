// TDX Sim v1 — experiment runner. From Code/:  node tools/sim/run.mjs [seeds]
// Runs every level under each scenario across many seeds and prints
// per-wave averages. Add scenarios below; each is a set of runLevel options.

import { runLevel } from './engine.js';
import { LEVELS } from '../../js/config.js';

const SEEDS = +(process.argv[2] || 30);

export const SCENARIOS = {
  'no drain':       { noDrain: true },
  'drain':          {},
  'drain + Vaults': { vaultShare: 0.2 },
  'drain, reactive': { bot: 'reactive' },   // E8: Vault-and-rebuild loop
};

const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function runScenario(levelIndex, opts, seeds = SEEDS) {
  const runs = [];
  for (let seed = 1; seed <= seeds; seed++) runs.push(runLevel(levelIndex, { ...opts, seed }));
  const n = runs[0].waves.length;
  const waves = Array.from({ length: n }, (_, i) => {
    const ws = runs.map(r => r.waves[i]);
    const viruses = avg(ws.map(w => w.spawned.virus || 0));
    return {
      wave: i + 1,
      leaks: avg(ws.map(w => w.leaks)),
      towersStart: avg(ws.map(w => w.towersStart)),
      lostDrain: avg(ws.map(w => w.towersLostDrain)),
      lostCrash: avg(ws.map(w => w.towersLostCrash)),
      drain: avg(ws.map(w => w.drain)),
      viruses,
      duration: avg(ws.map(w => w.duration)),
      timeouts: ws.filter(w => w.timedOut).length,
    };
  });
  return {
    level: levelIndex + 1,
    lossRate: runs.filter(r => r.lostAtWave !== null).length / runs.length,
    lostAt: runs.map(r => r.lostAtWave).filter(x => x !== null),
    livesEnd: avg(runs.map(r => r.livesEnd)),
    waves,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const f = (x, d = 1) => x.toFixed(d).padStart(5);
  for (let li = 0; li < LEVELS.length; li++) {
    console.log(`\n=== L${li + 1} ${LEVELS[li].name} (${SEEDS} seeds) ===`);
    for (const [name, opts] of Object.entries(SCENARIOS)) {
      const r = runScenario(li, opts);
      console.log(`-- ${name}: lost ${(r.lossRate * 100).toFixed(0)}% of runs, lives left ${r.livesEnd.toFixed(1)}`);
      console.log('   wave  leaks towers lostDrn lostCrs drainHP viruses  secs');
      for (const w of r.waves) {
        console.log(`   ${String(w.wave).padStart(4)} ${f(w.leaks)} ${f(w.towersStart)} ${f(w.lostDrain,2)}   ${f(w.lostCrash,2)}   ${f(w.drain,0)}   ${f(w.viruses)} ${f(w.duration,0)}${w.timeouts ? ' T/O ' + w.timeouts : ''}`);
      }
    }
  }
}
