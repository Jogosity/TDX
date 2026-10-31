// TDX M4 Phase A (E15): Bug + Stinger roster check. From Code/:
//   node tools/sim/m4_roster.mjs [seeds] [levels e.g. 3,4,5] [stinger reward]
// Compares the current config against candidate rosters built at runtime
// (config.js is not touched). Prints runs lost, lives left, leaks, towers
// lost to drain and Viruses per level, for the live and reactive bots.
// E15's result is now in config.js; the candidates below are the experiment
// as run against the M3 config (rosters without Bug/Stinger, old EVs).

import { runScenario } from './run.mjs';
import { LEVELS, ENEMIES } from '../../js/config.js';

// Per level (0-based): wave index from which each unit joins, plus optional
// pick weights applied to every wave after wave 1.
export const CANDIDATES = {
  'add only': {
    2: { add: { stinger: 2 } },
    3: { add: { stinger: 1, bug: 1 } },
    4: { add: { stinger: 1, bug: 1 } },
  },
  'add + Virus weight': {
    2: { add: { stinger: 2 }, weights: { virus: 1.25 } },
    3: { add: { stinger: 1, bug: 1 }, weights: { virus: 1.5 } },
    4: { add: { stinger: 1, bug: 1 }, weights: { virus: 1.5 } },
  },
};

export function withRoster(levels, cand) {
  return levels.map((lv, li) => {
    const c = cand[li];
    if (!c) return lv;
    return { ...lv, waves: lv.waves.map((w, i) => ({
      ...w,
      unlocked: [...w.unlocked, ...Object.keys(c.add || {}).filter(u => i >= c.add[u] && !w.unlocked.includes(u))],
      ...(c.weights && i > 0 ? { weights: c.weights } : {}),
    })) };
  });
}

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

export function report(li, name, opts, levels, seeds) {
  const r = runScenario(li, { ...opts, levels }, seeds);
  return `L${li + 1} ${name.padEnd(9)} lost ${String(Math.round(r.lossRate * 100)).padStart(3)}%  lives ${r.livesEnd.toFixed(1).padStart(6)}  leaks ${sum(r.waves.map(w => w.leaks)).toFixed(1).padStart(5)}  towersLostDrain ${sum(r.waves.map(w => w.lostDrain)).toFixed(1).padStart(5)}  viruses ${sum(r.waves.map(w => w.viruses)).toFixed(1).padStart(5)}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const SEEDS = +(process.argv[2] || 30);
  const ONLY = (process.argv[3] || '3,4,5').split(',').map(n => +n - 1);
  const STINGER_REWARD = process.argv[4] ? +process.argv[4] : ENEMIES.stinger.reward;
  const BOTS = { live: {}, reactive: { bot: 'reactive' } };
  for (const li of ONLY) for (const [bn, opts] of Object.entries(BOTS)) {
    console.log(`${report(li, bn, opts, LEVELS, SEEDS)}  [current config]`);
    const keep = ENEMIES.stinger.reward;
    ENEMIES.stinger.reward = STINGER_REWARD;
    for (const [cn, cand] of Object.entries(CANDIDATES)) console.log(`${report(li, bn, opts, withRoster(LEVELS, cand), SEEDS)}  [${cn}, Stinger reward ${STINGER_REWARD}]`);
    ENEMIES.stinger.reward = keep;
  }
}
