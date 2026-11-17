// Damage dealt per Token invested, by tower type (Sim). node dmgprobe.mjs <seeds> <bot> [levels a,b,..] [levelsFile]
import { runLevel } from './engine.js';
import { Projectile, Enemy } from '../../js/entities.js';
import { TOWERS } from '../../js/config.js';
const [SEEDS, BOT, LV, FILE] = process.argv.slice(2);
const { LEVELS } = await import(FILE || '../../js/levels.js');
let SRC = null; const by = {}, kills = {}; const dmg = {}, spent = {}, built = {};
const up = Projectile.prototype.update;
Projectile.prototype.update = function (...a) { SRC = this.sourceType; try { return up.apply(this, a); } finally { SRC = null; } };
const ed = Enemy.prototype.damage;
Enemy.prototype.damage = function (amount) { const h = Math.max(0, this.health); ed.call(this, amount); const k = SRC ?? 'other'; const d = Math.min(h, h - Math.max(0, this.health)); dmg[k] = (dmg[k] || 0) + d; const b = (by[k] ??= {}); b[this.type] = (b[this.type] || 0) + d; if (!this.alive && h > 0) { const kk = (kills[k] ??= {}); kk[this.type] = (kk[this.type] || 0) + 1; } };
const levels = LV ? LV.split(',').map(Number) : LEVELS.map((_, i) => i).slice(1);
for (const li of levels) for (let seed = 1; seed <= +SEEDS; seed++) {
  const seen = new Set();
  runLevel(li, { seed, bot: BOT, levels: LEVELS, ...JSON.parse(process.env.OPTS || '{}'), onWave: s => s.towers.forEach(t => seen.add(t)) });
  for (const t of seen) { spent[t.type] = (spent[t.type] || 0) + t.spent; built[t.type] = (built[t.type] || 0) + 1; }
}
const tot = Object.values(dmg).reduce((a, b) => a + b, 0);
console.log(`${BOT} bot, levels ${levels}, ${SEEDS} seeds`);
console.log('type        built  Tokens   damage  share  dmg/Token');
for (const k of Object.keys(TOWERS)) if (dmg[k] || built[k]) console.log(`${k.padEnd(11)} ${String(built[k] || 0).padStart(6)} ${String(Math.round(spent[k] || 0)).padStart(7)} ${String(Math.round(dmg[k] || 0)).padStart(8)} ${((dmg[k] || 0) / tot * 100).toFixed(1).padStart(5)}% ${((dmg[k] || 0) / (spent[k] || 1)).toFixed(1).padStart(9)}`);
if (dmg.other) console.log('other', Math.round(dmg.other));
for (const k of ['threader', 'deleter', 'compressor', 'defrag', 'pulse']) if (by[k]) { const t = Object.values(by[k]).reduce((a, b) => a + b, 0); console.log(`${k} damage by enemy: ` + Object.entries(by[k]).sort((a, b) => b[1] - a[1]).map(([e, v]) => `${e} ${(v / t * 100).toFixed(0)}%`).join(', ') + ` | kills: ` + Object.entries(kills[k] || {}).sort((a, b) => b[1] - a[1]).map(([e, v]) => `${e} ${v}`).join(', ')); }
