// TDX Ledger — the difficulty maths, straight from config.js.
// Pure functions, no DOM: runs in the browser tool and in Node (sim comparisons).
//
// Model (v1, "the 80%"): difficulty = enemy inflow × enemy power vs
// player resource inflow × tower power. Layout is reduced to two numbers —
// nominal path length (board rows) and how far towers sit from the path —
// and the sim will calibrate both later.
//
// Per wave we compute two pressures. 1.0 = the break point; above it, leaks.
//   Throughput pressure = enemy HP arriving per second ÷ the player's total DPS.
//   Tank pressure       = toughest enemy's HP ÷ damage it soaks crossing the
//                         defence (total DPS × time in range).
//
// v2 adds: the target curve (target.js), fill (how fast the field reaches MAV
// and how long a full field takes to clear) and Threat EV (HP × speed).
// v3 adds (M3 E7, from Sim v1): burst pressure = a full field (MAV) of HP ÷
// the damage the defence deals while it crosses the board, with firepower
// split across entry points. Throughput is an average; burst is the peak —
// it's what wave 1 on short, multi-entry boards (L3) actually feels like.
// v4 adds (M3 E10): the Virus tax — Tokens of towers each Virus costs the
// player (drained towers + Vaults to stop it), measured by Sim v1's reactive
// bot. Half is charged against the wave it arrives in, all of it afterwards.

import { targetCurve } from './target.js';

// Mirror of waves.js pickWeighted (kept here so the ledger needs only config.js).
function pickWeighted(pool, weights, rand) {
  if (!weights) return pool[Math.floor(rand() * pool.length)];
  const w = pool.map(k => weights[k] ?? 1);
  let r = rand() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) if ((r -= w[i]) < 0) return pool[i];
  return pool[pool.length - 1];
}

// ---------------------------------------------------------------------------
// Knobs (global what-ifs, never saved) and assumptions (model guesses the
// sim will replace with measurements).
// ---------------------------------------------------------------------------
export const DEFAULT_KNOBS = {
  enemyHp: 1,       // × every enemy's health
  waveSize: 1,      // × every wave's TEV (enemy budget)
  rewards: 1,       // × Tokens per kill
  startTokens: 1,   // × per-level starting Tokens
  towerDamage: 1,   // × every weapon's damage
};

export const DEFAULT_ASSUMPTIONS = {
  buildTower: 'threader',   // the player spends every Token on this tower (Tier 1)
  splashTargets: 1.5,       // average enemies caught per grenade
  pelletHit: { scatterShot: 0.25, pumpShotgun: 0.6 },  // share of pellets that land
  pathOffset: 1,            // cells between a tower and the enemy route (towers sit beside it)
  mazeFactor: 1,            // >1 = player's building stretches the route / time in range
  virusTax: 110,            // Tokens lost per Virus (sim E13, damage 10: 50–150 by level, ~115 averaged; was 200 at damage 15, E10)
  entrySplit: 0.5,          // burst: 0 = towers cover every route, 1 = each entry needs its own towers
                            // (0.5 matched Sim v1's wave 1 leak ranking across L1–L5)
  samples: 400,             // Monte Carlo rolls per wave (enemy picks are random)
  seed: 1234,
};

const PACK_GAP = 0.25;       // waves.js: seconds between pack members

// Small seeded RNG so the ledger shows the same numbers on every load.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Tower power
// ---------------------------------------------------------------------------
// Sustained damage per second, following entities.js exactly: one clip unit
// per trigger pull (a whole burst), reload starts after the clip's last pull,
// and the fire cooldown does not tick during the reload.
//   cycle = clip / fireRate + reloadTime   (clip 0 → never reloads)
export function weaponDps(w, damage, a) {
  const pellets = w.pelletCount ?? 1;
  const perPullNominal = damage * w.burstCount * pellets;
  let hit = 1;
  if (w.splashRadius > 0) hit = a.splashTargets;
  else if (w.radial || w.cone) hit = (a.pelletHit[w.radial ? 'scatterShot' : 'pumpShotgun'] ?? 1);
  // keyed by weapon role so new pellet weapons fall back to their class
  const pulls = w.clipSize > 0 ? w.clipSize : 1;
  const cycle = w.clipSize > 0 ? w.clipSize / w.fireRate + w.reloadTime : 1 / w.fireRate;
  return {
    nominal: (perPullNominal * pulls) / cycle,     // every pellet hits, one target
    effective: (perPullNominal * hit * pulls) / cycle,
    hitFactor: hit,
    cycle,
  };
}

// Length of route a tower covers: a chord of its range circle, with the
// route pathOffset cells from the tower.
export const chord = (range, offset) => 2 * Math.sqrt(Math.max(0, range * range - offset * offset));

export function towerAtTier(cfg, key, tier, knobs, a) {
  const t = cfg.TOWERS[key];
  let cost = t.cost;
  for (let i = 0; i < tier - 1; i++) cost += t.cost * cfg.UPGRADE.costMult[i];
  const out = { key, name: t.name, tier, cost, health: Math.round(cfg.tierStat(t, 'health', t.health, tier)) };
  if (!t.weapon) return { ...out, dps: 0, dpsNominal: 0, range: 0, reach: 0, dpsPer100: 0, passPer100: 0 };
  const w = cfg.WEAPONS[t.weapon];
  const damage = cfg.tierStat(t, 'damage', w.damage, tier) * knobs.towerDamage;
  const d = weaponDps(w, damage, a);
  const reach = chord(w.range, a.pathOffset) * a.mazeFactor;   // cells of route in range
  return {
    ...out, damage, range: w.range, reach,
    dps: d.effective, dpsNominal: d.nominal, hitFactor: d.hitFactor, cycle: d.cycle,
    dpsPer100: (d.effective / cost) * 100,
    // damage dealt to one medium-speed enemy walking through its range, per 100 Tokens
    passPer100: ((d.effective * reach / cfg.SPEED.medium) / cost) * 100,
  };
}

export function towerTable(cfg, knobs = DEFAULT_KNOBS, a = DEFAULT_ASSUMPTIONS) {
  return cfg.TOWER_ORDER.map(key => ({
    key, name: cfg.TOWERS[key].name, blueprints: cfg.TOWERS[key].blueprints,
    tiers: [1, 2, 3, 4].map(tier => towerAtTier(cfg, key, tier, knobs, a)),
  }));
}

// ---------------------------------------------------------------------------
// Enemy inflow — replays waves.js's spawn picks many times.
// Simplification: the field is treated as empty (MAV headroom = MAV). MAV only
// throttles spawning when the player is already behind, so it's a relief valve
// the sim will measure, not part of the raw inflow.
// ---------------------------------------------------------------------------
export function rollWave(cfg, wave, knobs, rand) {
  const E = cfg.ENEMIES;
  // a Breach Surge adds its budget on top (S21; it ignores MAV, see burst below)
  let budget = wave.tev * (1 + (wave.surge ?? 0)) * knobs.waveSize;
  const cheapest = Math.min(...wave.unlocked.map(k => E[k].ev));
  const counts = {};
  let time = 0, events = 0;
  const last = {};                                     // spawnCooldown, as waves.js
  const cooling = k => E[k].spawnCooldown > 0 && last[k] !== undefined && time - last[k] < E[k].spawnCooldown;
  while (budget >= cheapest) {
    const headroom = Math.min(budget, wave.mav);
    const affordable = wave.unlocked.filter(k => E[k].ev <= headroom);
    if (!affordable.length) break;
    const pool = affordable.filter(k => !cooling(k));
    if (!pool.length) { time += 0.3; continue; }      // only cooling types fit: wait, like the game
    const key = pickWeighted(pool, wave.weights, rand);   // same pick as waves.js
    const def = E[key];
    let n = 1;
    if (def.pack) {
      const want = def.pack.min + Math.floor(rand() * (def.pack.max - def.pack.min + 1));
      n = Math.min(want, Math.floor(budget / def.ev));
    }
    counts[key] = (counts[key] ?? 0) + n;
    last[key] = time;
    budget -= def.ev * n;
    time += wave.spawnInterval + PACK_GAP * (n - 1);
    events++;
  }
  return { counts, time, events };
}

export function waveLedger(cfg, level, wave, knobs, a, rand) {
  const E = cfg.ENEMIES;
  const S = a.samples;
  const mean = {};
  let time = 0;
  for (let i = 0; i < S; i++) {
    const r = rollWave(cfg, wave, knobs, rand);
    time += r.time;
    for (const k in r.counts) mean[k] = (mean[k] ?? 0) + r.counts[k] / S;
  }
  time /= S;
  const hpOf = k => E[k].health * level.enemyDelta.health * knobs.enemyHp;
  const byType = {};
  let hp = 0, reward = 0, count = 0;
  for (const k of Object.keys(mean)) {
    byType[k] = { count: mean[k], hp: mean[k] * hpOf(k) };
    hp += byType[k].hp;
    reward += mean[k] * E[k].reward * knobs.rewards;
    count += mean[k];
  }
  // toughest regular: highest HP × speed (time in range shrinks with speed)
  let tank = null;
  for (const k of Object.keys(mean)) {
    if (mean[k] < 0.5) continue;
    const score = hpOf(k) * E[k].speed;
    if (!tank || score > tank.score) tank = { key: k, hp: hpOf(k), speed: E[k].speed, score };
  }
  // Fill: how fast EV lands on the field, and what a full field (MAV) carries.
  let ev = 0;
  for (const k of Object.keys(mean)) ev += mean[k] * E[k].ev;
  const evRate = time > 0 ? ev / time : 0;              // EV spawned per second
  const fills = ev >= wave.mav;                          // a small wave may never reach MAV
  const fillTime = fills && evRate > 0 ? wave.mav / evRate : null;
  // HP on the field at MAV; a Breach Surge lands on top of a full field
  const surgeEv = ev * (wave.surge ?? 0) / (1 + (wave.surge ?? 0));
  const fullHp = ev > 0 ? (Math.min(ev - surgeEv, wave.mav) + surgeEv) * (hp / ev) : 0;
  return { byType, hp, reward, count, spawnTime: time, tank, ev, evRate, fillTime, fullHp };
}

// ---------------------------------------------------------------------------
// The whole ledger: every level, every wave.
// ---------------------------------------------------------------------------
export function computeLedger(cfg, knobs = DEFAULT_KNOBS, a = DEFAULT_ASSUMPTIONS) {
  const rand = rng(a.seed);
  const tower = towerAtTier(cfg, a.buildTower, 1, knobs, a);
  return cfg.LEVELS.map((level, li) => {
    const pathLen = level.grid.rowWidths.length * a.mazeFactor;   // nominal route, cells
    let tokens = (level.startTokens ?? cfg.PLAYER.startTokens) * knobs.startTokens;
    const targets = targetCurve(level.design?.target, level.waves.length);
    const waves = level.waves.map((wave, wi) => {
      const w = waveLedger(cfg, level, wave, knobs, a, rand);
      const viruses = w.byType.virus?.count ?? 0;
      const tax = viruses * a.virusTax;                  // Tokens of towers the drain costs this wave
      const towers = Math.max(0, tokens - tax / 2) / tower.cost;   // fractional — a smooth "firepower"
      const dps = towers * tower.dps;
      const traverse = pathLen / cfg.SPEED.medium;
      const window = w.spawnTime + traverse;              // seconds the wave's HP arrives over
      const inflow = w.hp / window;                       // enemy HP per second
      const throughput = dps > 0 ? inflow / dps : Infinity;
      const soak = w.tank ? dps * (tower.reach / w.tank.speed) : 0;   // damage one tank takes
      const tankP = w.tank ? (soak > 0 ? w.tank.hp / soak : Infinity) : 0;
      // burst: a full field crossing the board at its HP-weighted speed
      let hpSpeed = 0;
      for (const k in w.byType) hpSpeed += w.byType[k].hp * cfg.ENEMIES[k].speed;
      const crossTime = w.hp > 0 ? pathLen / (hpSpeed / w.hp) : Infinity;
      const split = Math.pow(level.spawns ?? 1, a.entrySplit);
      const burst = dps > 0 ? (w.fullHp * split) / (dps * crossTime) : Infinity;
      const row = {
        ...w, tankUnit: w.tank,
        level: li, wave: wi, label: `L${li + 1}·W${wi + 1}`,
        tokens, towers, dps, inflow, window, throughput, tank: tankP, burst, crossTime, viruses, tax,
        pressure: Math.max(throughput, tankP, burst),
        tev: wave.tev * knobs.waveSize, mav: wave.mav, spawnInterval: wave.spawnInterval,
        clearTime: dps > 0 ? w.fullHp / dps : Infinity,   // seconds to clear a full field
        target: targets[wi],
      };
      tokens += w.reward - tax;                           // assumes every enemy is killed
      return row;
    });
    const gap = waves.reduce((sum, w) => sum + Math.abs(w.pressure - w.target), 0) / waves.length;
    return { index: li, name: level.name, delta: level.enemyDelta, pathLen, waves, gap };
  });
}

// ---------------------------------------------------------------------------
// Threat EV — what an enemy should cost from its stats alone.
// To kill an enemy during one pass you need DPS ≈ HP × speed ÷ reach, and
// reach is the same for every enemy, so threat ∝ HP × speed. Scaled so the
// reference enemy (Hack) = its current EV. Abilities (tower damage, hunting,
// detours) aren't in the formula: the sim measures what they add.
// ---------------------------------------------------------------------------
export function enemyThreat(cfg, ref = 'hack') {
  const E = cfg.ENEMIES, r = E[ref];
  const unit = r.ev / (r.health * r.speed);
  return Object.keys(E).map(key => {
    const e = E[key];
    const threatEv = e.health * e.speed * unit;
    const abilities = [e.hunter && 'hunts towers', !e.hunter && e.attack && 'drains towers', e.detour && 'detours'].filter(Boolean);
    return {
      key, name: e.name, ev: e.ev, threatEv,
      priceRatio: e.ev / threatEv,             // <1 underpriced, >1 overpriced
      rewardPer100: (e.reward / threatEv) * 100,
      abilities,
    };
  });
}
