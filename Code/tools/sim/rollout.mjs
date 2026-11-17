// node rollout.mjs <levelsFile> <seeds> <bot> — per level: win %, Cores left, Cores lost early / steady (w5+, not Breach) / Breach
const [file, SEEDS, BOT] = process.argv.slice(2);
const { runLevel } = await import('./engine.js');
const { LEVELS } = await import(file);
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
console.log(`${file.split('/').pop()} ${BOT} ${SEEDS} seeds`);
for (let li = 1; li < LEVELS.length; li++) {
  const W = LEVELS[li].waves; const rs = [];
  for (let seed = 1; seed <= +SEEDS; seed++) {
    const o = runLevel(li, { seed, bot: BOT, levels: LEVELS });
    rs.push({ win: o.lostAtWave === null, left: Math.max(0, o.livesEnd),
      early: o.waves.slice(0, 4).reduce((a, w) => a + w.leaks, 0),
      steady: o.waves.filter((w, i) => i >= 4 && !W[i].surge).reduce((a, w) => a + w.leaks, 0),
      breach: o.waves.filter((w, i) => W[i].surge).reduce((a, w) => a + w.leaks, 0),
      bank: avg(o.waves.slice(-3).map(w => w.tokensStart)) });
  }
  const f = k => avg(rs.map(r => r[k])).toFixed(1);
  console.log(`L${li} win ${Math.round(rs.filter(r => r.win).length / rs.length * 100)}% left ${f('left')} early ${f('early')} steady ${f('steady')} breach ${f('breach')}`);
}
