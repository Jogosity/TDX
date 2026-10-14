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
  const lerp = (base, t4) => (t4 === undefined ? base : base + (t4 - base) * (tier - 1) / (cfg.UPGRADE.maxTier - 1));
  let cost = t.cost;
  for (let i = 0; i < tier - 1; i++) cost += t.cost * cfg.UPGRADE.costMult[i];
  const out = { key, name: t.name, tier, cost, health: Math.round(lerp(t.health, t.tier4?.health)) };
  if (!t.weapon) return { ...out, dps: 0, dpsNominal: 0, range: 0, reach: 0, dpsPer100: 0, passPer100: 0 };
  const w = cfg.WEAPONS[t.weapon];
  const damage = lerp(w.damage, t.tier4?.damage) * knobs.towerDamage;
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
  let budget = wave.tev * knobs.waveSize;
  const cheapest = Math.min(...wave.unlocked.map(k => E[k].ev));
  const counts = {};
  let time = 0, events = 0;
  while (budget >= cheapest) {
    const headroom = Math.min(budget, wave.mav);
    const pool = wave.unlocked.filter(k => E[k].ev <= headroom);
    if (!pool.length) break;
    const key = pool[Math.floor(rand() * pool.length)];
    const def = E[key];
    let n = 1;
    if (def.pack) {
      const want = def.pack.min + Math.floor(rand() * (def.pack.max - def.pack.min + 1));
      n = Math.min(want, Math.floor(budget / def.ev));
    }
    counts[key] = (counts[key] ?? 0) + n;
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
  return { byType, hp, reward, count, spawnTime: time, tank };
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
    const waves = level.waves.map((wave, wi) => {
      const w = waveLedger(cfg, level, wave, knobs, a, rand);
      const towers = tokens / tower.cost;                // fractional — a smooth "firepower"
      const dps = towers * tower.dps;
      const traverse = pathLen / cfg.SPEED.medium;
      const window = w.spawnTime + traverse;              // seconds the wave's HP arrives over
      const inflow = w.hp / window;                       // enemy HP per second
      const throughput = dps > 0 ? inflow / dps : Infinity;
      const soak = w.tank ? dps * (tower.reach / w.tank.speed) : 0;   // damage one tank takes
      const tankP = w.tank ? (soak > 0 ? w.tank.hp / soak : Infinity) : 0;
      const row = {
        ...w, tankUnit: w.tank,
        level: li, wave: wi, label: `L${li + 1}·W${wi + 1}`,
        tokens, towers, dps, inflow, window, throughput, tank: tankP,
        pressure: Math.max(throughput, tankP),
        tev: wave.tev * knobs.waveSize, mav: wave.mav, spawnInterval: wave.spawnInterval,
      };
      tokens += w.reward;                                 // assumes every enemy is killed
      return row;
    });
    return { index: li, name: level.name, delta: level.enemyDelta, pathLen, waves };
  });
}
