// TDX Sim v1 — headless game loop + bot player. No DOM; runs in Node.
// Mirrors js/game.js update() and level setup. Keep in step with game.js:
// if the game loop changes, change runWave() here too.
//
// Randomness: the game uses Math.random everywhere (board, spawns, aim
// spread, CRASH). runLevel() swaps in a seeded generator for the duration
// of a run so every result can be replayed exactly.

import { HexGrid } from '../../js/hex.js';
import { PathField, smoothPath, pointAt } from '../../js/path.js';
import { Tower, cellPx } from '../../js/entities.js';
import { WaveController } from '../../js/waves.js';
import { placeBlockers, placeLockouts, placeExtraSpawns } from '../../js/board.js';
import { crashShuffle } from '../../js/crash.js';
import { LEVELS, TOWERS, WEAPONS, ENEMIES, PLAYER, CRASH } from '../../js/config.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tower HP lost to enemy attacks (Virus/Bug drain). CRASH kills bypass damage().
let drainTally = 0;
const baseDamage = Tower.prototype.damage;
Tower.prototype.damage = function (amount) {
  drainTally += Math.min(amount, Math.max(0, this.health));
  baseDamage.call(this, amount);
};

const DT = 1 / 30;
const WAVE_TIMEOUT = 900;    // seconds of sim time before a wave is abandoned

export const DEFAULT_OPTS = {
  seed: 1,
  levels: LEVELS,
  crash: true,               // CRASH events as in the game
  bot: 'live',               // see BOTS below: 'greedy' (between waves only) or 'live'
  vaultShare: 0,             // fraction of builds that are decoy Vaults
  reactDelay: 1.0,           // 'reactive' bot: seconds before it responds to a latched Virus
  reserve: 120,              // 'reactive' bot: Tokens held back mid-wave for reactions
  picket: true,              // 'reactive': Vault in front of an approaching Virus
  besideVault: true,         // 'reactive': Vault beside a latched Virus
  mix: null,                 // build order cycled by normal building, e.g. KILLING_GROUND; null = Threaders only
  baseBias: 0,               // >0 weights path near the base (killing ground); 2 = strongly
  screen: 4,                 // Threaders built first before the mix starts
  standoff: null,            // { ddos: 2.6 } = keep that tower ≥ 2.6 cells from the route
  noDrain: false,            // Virus keeps HP/speed/reward but loses its attack (walks like a Hack)
  viewport: [390, 844],      // phone portrait; speeds are in cells so this only sets px scale
};

// --- state -------------------------------------------------------------------
function initLevel(idx, opts) {
  const level = opts.levels[idx];
  const grid = new HexGrid(level.grid);
  grid.layout(...opts.viewport);
  const field = new PathField(grid);
  if (level.spawns > 1) placeExtraSpawns(grid, field, level.spawns - 1);
  placeBlockers(grid, field, level.blockers);
  placeLockouts(grid, level.lockouts);
  field.recompute();
  return {
    levelIndex: idx, level, grid, field,
    tokens: level.startTokens ?? PLAYER.startTokens,
    lives: PLAYER.startLives,
    towers: [], enemies: [], projectiles: [], effects: [],
    wavesToCrash: rollCrashInterval(),
  };
}

const rollCrashInterval = () =>
  CRASH.everyMin + Math.floor(Math.random() * (CRASH.everyMax - CRASH.everyMin + 1));

function onPathChanged(s) {
  s.field.recompute();
  for (const e of s.enemies) if (e.alive) e.buildPath(s.field, s.grid);
}

export function buildTower(s, type, cell) {
  s.tokens -= TOWERS[type].cost;
  const t = new Tower(type, cell);
  cell.tower = t;
  s.towers.push(t);
  onPathChanged(s);
  return t;
}

// --- one wave (mirrors Game.update during phase 'wave') ------------------------
function runWave(s, opts, bot) {
  const def = s.level.waves[s.waveIndex];
  const wave = new WaveController(def, s.grid, s.field, s.level.enemyDelta);
  let pendingCrash = null;
  if (opts.crash && --s.wavesToCrash <= 0) {
    pendingCrash = CRASH.leadIn;
    s.wavesToCrash = rollCrashInterval();
  }
  const m = {
    wave: s.waveIndex + 1, tokensStart: s.tokens + s.spentThisBreak, towersStart: s.towers.length,
    spawned: {}, kills: 0, leaks: 0, leakedBy: {}, towersLostDrain: 0, tokensLostDrain: 0, towersLostCrash: 0,
    drain: 0, duration: 0, timedOut: false, vaultsBuilt: 0, rebuilds: 0,
  };
  s.metrics = m;
  const drain0 = drainTally;
  const seen = new Set();
  let t = 0;
  while (true) {
    t += DT;
    if (t > WAVE_TIMEOUT) { m.timedOut = true; break; }

    if (pendingCrash !== null) {
      pendingCrash -= DT;
      if (pendingCrash <= 0) {
        pendingCrash = null;
        const destroyed = crashShuffle(s.grid, s.field, CRASH.maxTowerKills);
        for (const tw of destroyed) tw.alive = false;
        m.towersLostCrash += destroyed.length;
        if (destroyed.length) s.towers = s.towers.filter(x => x.alive);
        onPathChanged(s);
      }
    }

    // Limiter auras (non-stacking slow)
    const px = cellPx(s.grid);
    for (const e of s.enemies) e.slow = 1;
    for (const tw of s.towers) {
      if (!tw.aura || tw.aura.type !== 'slow' || tw.upgrading) continue;
      const r = tw.aura.range * px;
      for (const e of s.enemies) if (e.alive && Math.hypot(e.x - tw.x, e.y - tw.y) <= r) e.slow = Math.min(e.slow, tw.aura.factor);
    }

    wave.update(DT, s.enemies);
    for (const e of s.enemies) if (!seen.has(e)) { seen.add(e); m.spawned[e.type] = (m.spawned[e.type] || 0) + 1; }

    for (const tw of s.towers) tw.update(DT, s.enemies, s.projectiles, s.grid);
    for (const e of s.enemies) if (e.alive) e.update(DT, s.grid, s.towers);
    for (const p of s.projectiles) p.update(DT, s.enemies, s.effects);
    s.effects.length = 0;

    const destroyed = s.towers.filter(x => !x.alive);
    if (destroyed.length) {
      for (const tw of destroyed) {
        tw.cell.tower = null;
        if (tw.type !== 'vault') (s.lostCells ??= []).push(tw.cell);   // for the reactive bot's rebuilds
      }
      m.towersLostDrain += destroyed.length;
      for (const tw of destroyed) m.tokensLostDrain += TOWERS[tw.type].cost;   // Tokens of towers lost (E13 tax)
      s.towers = s.towers.filter(x => x.alive);
      onPathChanged(s);
    }

    let dirty = false;
    for (const e of s.enemies) {
      if (e.alive || e.resolved) continue;
      e.resolved = true; dirty = true;
      if (e.reachedBase) { s.lives--; m.leaks++; m.leakedBy[e.type] = (m.leakedBy[e.type] || 0) + 1; }
      else { s.tokens += e.def.reward; m.kills++; }
    }
    s.projectiles = s.projectiles.filter(p => p.alive);
    if (dirty) s.enemies = s.enemies.filter(e => e.alive);

    if (bot.duringWave) bot.duringWave(s, opts, t);
    if (wave.isComplete(s.enemies)) break;
  }
  m.duration = +t.toFixed(1);
  m.drain = Math.round(drainTally - drain0);
  m.livesAfter = s.lives;
  m.towersEnd = s.towers.length;
  return m;
}

// --- a whole level -----------------------------------------------------------------
// Lives may go negative: the run continues so every wave gets measured, and
// lostAtWave records where the real game would have ended.
export function runLevel(levelIndex, userOpts = {}) {
  const opts = { ...DEFAULT_OPTS, ...userOpts };
  const realRandom = Math.random;
  Math.random = mulberry32(opts.seed * 7919 + levelIndex * 104729);
  const virusAttack = ENEMIES.virus.attack;
  if (opts.noDrain) delete ENEMIES.virus.attack;
  try {
    const bot = BOTS[opts.bot];
    const s = initLevel(levelIndex, opts);
    const waves = [];
    let lostAtWave = null;
    for (s.waveIndex = 0; s.waveIndex < s.level.waves.length; s.waveIndex++) {
      const before = s.tokens;
      bot.betweenWaves(s, opts);
      s.spentThisBreak = before - s.tokens;
      const m = runWave(s, opts, bot);
      waves.push(m);
      if (lostAtWave === null && s.lives <= 0) lostAtWave = m.wave;
    }
    return { level: levelIndex + 1, seed: opts.seed, lostAtWave, livesEnd: s.lives, waves };
  } finally {
    Math.random = realRandom;
    ENEMIES.virus.attack = virusAttack;
  }
}

// --- bots ----------------------------------------------------------------------------
// Path samples every enemy will walk right now (one smoothed path per spawn).
function pathSamples(s) {
  const pts = [];
  for (const sp of s.grid.spawns) {
    if (!s.field.reachable(sp)) continue;
    const p = smoothPath(s.field.waypointsFrom(sp));
    p.pts.forEach((pt, i) => pts.push({ x: pt.x, y: pt.y, d: p.lens[i] }));
  }
  return pts;
}

const freeCells = (s) => [...s.grid.cells.values()].filter(c =>
  !c.occupied && !c.spawn && !c.lockout && !c.exit);

// Gun spot: most path within reach (= most shooting time per enemy).
// baseBias > 0 weights each path point by how far along the route it is,
// pulling guns towards the base (a killing ground).
// standoff > 0: only cells at least that many cells from the route (artillery
// kept out of a Virus's scan range, the way Jogo uses DDOS).
function bestGunCell(s, range, baseBias = 0, standoff = 0) {
  const pts = pathSamples(s);
  const r = range * cellPx(s.grid);
  const keep = standoff * cellPx(s.grid);
  const far = Math.max(1, ...pts.map(p => p.d));
  let best = null, bestScore = 0;
  for (const c of freeCells(s)) {
    if (keep > 0 && pts.some(p => Math.hypot(p.x - c.x, p.y - c.y) < keep)) continue;
    let score = 0;
    for (const p of pts) if (Math.hypot(p.x - c.x, p.y - c.y) <= r) score += Math.pow(p.d / far, baseBias);
    if (score > bestScore && !s.field.wouldFirewall(c, s.enemies)) { bestScore = score; best = c; }
  }
  return best;
}

// Decoy Vault spot: beside the path, covered by as many guns as possible,
// as early on the path as possible (Viruses latch onto the nearest tower).
function bestVaultCell(s) {
  const pts = pathSamples(s);
  const px = cellPx(s.grid);
  const guns = s.towers.filter(t => t.weapon);
  let best = null, bestScore = -Infinity;
  for (const c of freeCells(s)) {
    let nearest = Infinity, along = Infinity;
    for (const p of pts) {
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d < nearest) { nearest = d; along = p.d; }
    }
    if (nearest > px * 1.1) continue;                     // must sit beside the path
    const cover = guns.filter(g => Math.hypot(g.x - c.x, g.y - c.y) <= g.weapon.range * px).length;
    const score = cover * 1000 - along / px;
    if (score > bestScore && !s.field.wouldFirewall(c, s.enemies)) { bestScore = score; best = c; }
  }
  return best;
}

// Jogo's killing ground (E9): dense Threaders, DDOS artillery, a Compressor or two.
export const KILLING_GROUND = ['threader', 'threader', 'ddos', 'threader', 'threader', 'compressor'];

const greedyBuild = (s, opts, reserve = 0) => {
  let builds = s.towers.length;
  for (let guard = 0; guard < 60; guard++) {
    const wantVault = opts.vaultShare > 0 && s.towers.some(t => t.weapon)
      && s.towers.filter(t => t.type === 'vault').length < Math.floor((builds + 1) * opts.vaultShare);
    let type = wantVault ? 'vault' : 'threader';
    if (!wantVault && opts.mix) {
      // cycle the mix by guns built so far; save up for the next big tower
      const guns = s.towers.filter(t => t.weapon).length;
      if (guns >= opts.screen) type = opts.mix[(guns - opts.screen) % opts.mix.length];
    }
    if (s.tokens - reserve < TOWERS[type].cost) break;
    const range = TOWERS[type].weapon ? WEAPONS[TOWERS[type].weapon].range : 0;
    const standoff = opts.standoff?.[type] ?? 0;
    const cell = type === 'vault' ? bestVaultCell(s) : bestGunCell(s, range, opts.baseBias, standoff);
    if (!cell) break;
    buildTower(s, type, cell);
    builds++;
  }
};

const BOTS = {
  // Spends every Token between waves, Tier 1 only. Threaders on the cells
  // that see the most path; optional share of decoy Vaults. Never sells,
  // never upgrades, never builds mid-wave — no reactions to Viruses.
  greedy: { betweenWaves: greedyBuild },
  // Same, but also spends Tokens mid-wave as kills pay out (checked every
  // second), which is closer to how a person plays. Still no Virus reactions.
  live: {
    betweenWaves: greedyBuild,
    duringWave(s, opts, t) {
      if (Math.floor(t) !== Math.floor(t - DT)) greedyBuild(s, opts);
    },
  },
  // 'live' plus Jogo's Virus loop (E8), checked 4× a second:
  //  1. A Virus latched onto a tower for reactDelay seconds gets a Vault built
  //     on a free cell beside it, so when its target dies the Vault is the
  //     nearest tower and soaks the drain while the guns work on it.
  //  2. A tower the drain destroyed is rebuilt as a Threader on the same cell
  //     once no Virus is within 1.5 cells of it.
  //  Reactions come first; normal building keeps `reserve` Tokens back so
  //  there's money for them.
  reactive: {
    betweenWaves(s, opts) {
      s.lostCells = [];        // the break's normal building replaces losses
      s.vaultedVirus = new WeakSet();
      greedyBuild(s, opts);
    },
    duringWave(s, opts, t) {
      if (Math.floor(t * 4) === Math.floor((t - DT) * 4)) return;
      const px = cellPx(s.grid);
      const viruses = s.enemies.filter(e => e.alive && e.def.attack && !e.def.hunter);
      // 0. Picket: an approaching Virus whose first tower would be a gun gets a
      //    Vault on the route just before that point, so it latches there instead
      if (opts.picket) for (const v of viruses) {
        if (v.attackTarget || s.vaultedVirus.has(v)) continue;
        v.seenAt ??= t;
        if (t - v.seenAt < opts.reactDelay) continue;
        const first = firstContact(s, v);
        if (!first || first.tower.type === 'vault') continue;
        if (s.tokens < TOWERS.vault.cost) break;
        const cell = cellNear(s, first.before);
        if (!cell) continue;
        buildTower(s, 'vault', cell);
        s.vaultedVirus.add(v);
        s.metrics.vaultsBuilt++;
      }
      // 1. Vault beside each latched Virus
      if (opts.besideVault) for (const v of viruses) {
        const target = v.attackTarget;
        if (!target?.alive || Math.hypot(target.x - v.x, target.y - v.y) > px * 1.05) { v.latchedAt = null; continue; }
        v.latchedAt ??= t;
        if (t - v.latchedAt < opts.reactDelay || s.vaultedVirus.has(v)) continue;
        if (s.tokens < TOWERS.vault.cost) break;
        const cell = cellNear(s, v);
        if (!cell) continue;
        buildTower(s, 'vault', cell);
        s.vaultedVirus.add(v);
        s.metrics.vaultsBuilt++;
      }
      // 2. Rebuild drained towers once the area is clear
      s.lostCells = (s.lostCells ?? []).filter(c => {
        if (c.occupied) return false;
        if (viruses.some(v => Math.hypot(v.x - c.x, v.y - c.y) <= px * 1.5)) return true;
        if (s.tokens < TOWERS.threader.cost || s.field.wouldFirewall(c, s.enemies)) return true;
        buildTower(s, 'threader', c);
        s.metrics.rebuilds++;
        return false;
      });
      if (Math.floor(t) !== Math.floor(t - DT)) greedyBuild(s, opts, opts.reserve);
    },
  },
};

// Where a walking Virus will first find a tower within its scan range:
// { tower, before: a route point ~1 cell earlier } or null.
function firstContact(s, v) {
  const px = cellPx(s.grid);
  const scan = v.def.attack.scanRange * px;
  const step = px * 0.25;
  let back = null;
  for (let d = v.dist; d < v.path.total; d += step) {
    const p = pointAt(v.path, d);
    for (const tw of s.towers) {
      if (Math.hypot(tw.x - p.x, tw.y - p.y) < scan) return back ? { tower: tw, before: back } : null;
    }
    if (d - v.dist >= px) back = pointAt(v.path, d - px);
  }
  return null;
}

// Free cell nearest to a point, within ~1.5 cells of it (somewhere to drop a Vault).
function cellNear(s, e) {
  const px = cellPx(s.grid);
  let best = null, bestD = px * 1.6;
  for (const c of freeCells(s)) {
    const d = Math.hypot(c.x - e.x, c.y - e.y);
    if (d < bestD && !s.field.wouldFirewall(c, s.enemies)) { bestD = d; best = c; }
  }
  return best;
}
