// node tools/sim/pressure.mjs <seeds> <knob mav|tev|both> <x,x,...> <run.json...>
// Scales MAV (and RTV) and/or TEV on waves 5+ that aren't Breach waves, plays the
// jogo bot on each recorded board, reports Cores lost: before w5 / steady w5+ / Breach, and banked-mode Tokens.
import fs from 'fs';
import { runLevel } from './engine.js';
import { LEVELS } from '../../js/config.js';
const [SEEDS, KNOB, XS, ...files] = process.argv.slice(2);
const runs = files.map(f => JSON.parse(fs.readFileSync(f)));
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
console.log(`jogo bot, ${SEEDS} seeds per board, knob ${KNOB} on waves 5+ (not Breach)`);
for (const r of runs) {
  console.log(`\n${r.name}  (you lost: early ${r.waves.slice(0,4).reduce((a,w)=>a+w.leaks,0)}, steady ${r.waves.slice(4).filter((w,i)=>!LEVELS[r.level].waves[i+4].surge).reduce((a,w)=>a+w.leaks,0)}, Breach ${r.waves.filter((w,i)=>LEVELS[r.level].waves[i].surge).reduce((a,w)=>a+w.leaks,0)})`);
  const variants = KNOB === 'json' ? JSON.parse(XS) : XS.split(',').map(Number);
  for (const x of variants) {
    const levels = LEVELS.map((L, i) => i !== r.level ? L : { ...L, waves: L.waves.map((w, wi) => {
      if (wi < 4 || w.surge) return w;
      const o = { ...w };
      if (KNOB === 'json') {
        if (x.mav) { o.mav = Math.round(w.mav * x.mav); o.rtv = Math.round(w.rtv * x.mav); }
        if (x.tev) o.tev = Math.round(w.tev * x.tev);
        if (x.si) o.spawnInterval = +(w.spawnInterval * x.si).toFixed(3);
        if (x.w) o.weights = { ...(w.weights || {}), ...x.w };
        return o;
      }
      if (KNOB !== 'tev') { o.mav = Math.round(w.mav * x); o.rtv = Math.round(w.rtv * x); }
      if (KNOB !== 'mav') o.tev = Math.round(w.tev * x);
      return o;
    }) });
    const res = [];
    for (let seed = 1; seed <= +SEEDS; seed++) for (const bank of [false, true]) {
      const o = runLevel(r.level, { seed, bot: 'jogo', board: r.board, levels, ...(bank ? { upgradeOnLeak: 1 } : {}) });
      const W = levels[r.level].waves;
      res.push({ bank, early: o.waves.slice(0, 4).reduce((a, w) => a + w.leaks, 0),
        steady: o.waves.filter((w, i) => i >= 4 && !W[i].surge).reduce((a, w) => a + w.leaks, 0),
        breach: o.waves.filter((w, i) => W[i].surge).reduce((a, w) => a + w.leaks, 0),
        worst: Math.max(...o.waves.filter((w, i) => i >= 4 && !W[i].surge).map(w => w.leaks)),
        left: Math.max(0, o.livesEnd), win: o.lostAtWave === null,
        bankLate: avg(o.waves.slice(-3).map(w => w.tokensStart)) });
    }
    const sp = res.filter(q => !q.bank), bk = res.filter(q => q.bank);
    const f = (a, k) => avg(a.map(q => q[k])).toFixed(1);
    console.log(` ${JSON.stringify(x)}: spend-bot early ${f(sp,'early')} steady ${f(sp,'steady')} (worst wave ${f(sp,'worst')}) Breach ${f(sp,'breach')} Cores left ${f(sp,'left')} wins ${sp.filter(q=>q.win).length}/${sp.length} | bank-bot Cores left ${f(bk,'left')} late bank ${f(bk,'bankLate')}`);
  }
}
