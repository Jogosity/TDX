// TDX headless sanity tests — run: node tests/sim.mjs (from Code/)
import { HexGrid } from '../js/hex.js';
import { PathField, smoothPath } from '../js/path.js';
import { Tower, cellPx } from '../js/entities.js';
import { WaveController } from '../js/waves.js';
import { LEVELS, WEAPONS, TOWERS, TOWER_ORDER, ENEMIES, UPGRADE, PLAYER, VERSION } from '../js/config.js';
import { Enemy } from '../js/entities.js';
import { loadSave } from '../js/save.js';
import { relocateBlockers, crashShuffle } from '../js/crash.js';
import { placeBlockers, placeLockouts, placeExtraSpawns } from '../js/board.js';

let pass = 0, fail = 0;
const check = (name, cond) => { cond ? pass++ : fail++; console.log(cond ? ' PASS' : ' FAIL', name); };

const grid = new HexGrid();
grid.layout(390, 620);
check('cell count matches row widths', grid.cells.size === LEVELS[0].grid.rowWidths.reduce((a,b)=>a+b,0));
check('has spawns and exits', grid.spawns.length >= 1 && grid.exits.length >= 1);

// tall-viewport layout: play space shifts down into the spare bottom space
check('play space shifts down but the base stays on-screen',
  grid.baseY > 500 && grid.baseY <= 620 - 8);

const field = new PathField(grid);
check('all spawns reachable on empty grid', grid.spawns.every(s => field.reachable(s)));
const sp = smoothPath(field.waypointsFrom(grid.spawns[0]));
check('smoothed path has length', sp.total > 100 && sp.pts.length > 20);

// Firewall: wall row 5 except leftmost cell
const row5 = [...grid.cells.values()].filter(c => c.r === 5).sort((a,b)=>a.q-b.q);
for (let i = 1; i < row5.length; i++) row5[i].tower = new Tower('vault', row5[i]);
field.recompute();
check('gap keeps spawns reachable', grid.spawns.every(s => field.reachable(s)));
check('closing the only gap is Firewalling', field.wouldFirewall(row5[0], []) === true);
const safeCell = [...grid.cells.values()].find(c => c.r === 2 && !c.occupied && Math.abs(c.q - row5[0].q) > 2);
check('placing far from the gap is legal', field.wouldFirewall(safeCell, []) === false);
for (let i = 1; i < row5.length; i++) row5[i].tower = null;
field.recompute();

// Wave rhythm: big wave, fixed dps, expect MAV halt then RTV resume
const wdef = LEVELS[0].waves[7];
const enemies = [];
const wc = new WaveController(wdef, grid, field, LEVELS[0].enemyDelta);
let t = 0, kills = 0, peak = 0, halted = false, resumed = false;
while (t < 600 && !(wc.done && enemies.length === 0)) {
  const dt = 0.1; t += dt;
  wc.update(dt, enemies);
  peak = Math.max(peak, wc.activeValue(enemies));
  if (wc.rtvArmed) halted = true;
  else if (halted && !wc.done) resumed = true;
  const target = enemies.find(e => e.alive);
  if (target) { target.health -= 60*dt; if (target.health <= 0) { target.alive = false; kills++; } }
  for (let i = enemies.length-1; i>=0; i--) if (!enemies[i].alive) enemies.splice(i,1);
}
console.log(`  wave8: kills=${kills} peak=${peak}/${wdef.mav} time=${t.toFixed(0)}s`);
check('wave budget fully spent', wc.budgetLeft < 30);
check('active EV never exceeded MAV', peak <= wdef.mav);
check('MAV halt occurred', halted);
check('RTV resume occurred', resumed);
check('wave terminates', t < 600);

// --- scatterShot (Defrag): radial ring of pellets, dead at range edge --------
{
  const cell = [...grid.cells.values()].find(c => !c.occupied && c.r === 5);
  const defrag = new Tower('defrag', cell);
  const px = cellPx(grid);
  const foe = {
    alive: true, x: cell.x + px, y: cell.y, radius: 8,
    path: { total: 100 }, dist: 0, hits: 0,
    damage(n) { this.hits += n; },
  };
  const projectiles = [];
  // new towers construct on the build clock and are offline until done
  defrag.update(0.5, [foe], projectiles, grid);
  check('towers are offline while constructing', projectiles.length === 0 && defrag.upgrading !== null);
  defrag.update(3.0, [foe], projectiles, grid);   // finish the build
  check('construction completes on the clock', defrag.upgrading === null);
  defrag.update(0.5, [foe], projectiles, grid);
  check('scatterShot fires a full pellet ring', projectiles.length === WEAPONS.scatterShot.pelletCount);
  let maxTravel = 0;
  for (let i = 0; i < 200 && projectiles.some(p => p.alive); i++) {
    for (const p of projectiles) if (p.alive) { p.update(0.05, [foe], []); maxTravel = Math.max(maxTravel, p.traveled); }
  }
  check('pellets die at the range edge', projectiles.every(p => !p.alive) && maxTravel <= WEAPONS.scatterShot.range * px * 1.2);
  check('at least one pellet hit the adjacent enemy', foe.hits > 0);
  cell.tower = null;
}

// --- upgrade path: tier interpolation, costs, refunds -------------------------
{
  const cell = [...grid.cells.values()].find(c => !c.occupied && c.r === 4);
  const t = new Tower('threader', cell);
  check('towers build at Tier 1', t.tier === 1);
  check('tier 2 costs 2x base', t.upgradeCost === TOWERS.threader.cost * UPGRADE.costMult[0]);
  t.applyTier(4);
  check('tier 4 hits the configured stat targets',
    t.maxHealth === TOWERS.threader.tier4.health && t.weapon.damage === TOWERS.threader.tier4.damage);
  const t2 = new Tower('threader', cell);
  t2.applyTier(2);
  const midHealth = TOWERS.threader.health + (TOWERS.threader.tier4.health - TOWERS.threader.health) / 3;
  check('intermediate tiers interpolate linearly', Math.abs(t2.maxHealth - midHealth) <= 1);
  t2.spent += 200; // one upgrade bought
  check('sell refund covers upgrade spend', t2.sellValue === Math.floor((100 + 200) * PLAYER.sellRefund));
  cell.tower = null;
}

// --- tower roster: DDOS restored, Defrag added, Limiter hidden ----------------
check('DDOS is back on the grenade launcher', TOWERS.ddos.weapon === 'grenadeLauncher');
check('Defrag carries the scattershot', TOWERS.defrag.weapon === 'scatterShot');
check('Limiter is hidden from the tray but kept in code',
  !TOWER_ORDER.includes('limiter') && TOWERS.limiter !== undefined);

// --- Collection (Core) config sanity ------------------------------------------
check('threader is the only free tower',
  TOWERS.threader.blueprints === 0 &&
  TOWER_ORDER.filter(k => k !== 'threader').every(k => TOWERS[k].blueprints > 0));
check('BP costs stay in the 10–20 spec range',
  TOWER_ORDER.filter(k => k !== 'threader').every(k =>
    TOWERS[k].blueprints >= 10 && TOWERS[k].blueprints <= 20));
check('level bpPool only references real, lockable towers',
  LEVELS.every(l => (l.bpPool || []).every(k => TOWERS[k] && TOWERS[k].blueprints > 0)));

// --- save defaults + migration (headless: no localStorage) ---------------------
{
  const s = loadSave();
  check('fresh save starts with only threader unlocked',
    s.towersUnlocked.length === 1 && s.towersUnlocked[0] === 'threader');
  check('fresh save has object blueprint counts', typeof s.blueprints === 'object' && s.blueprints !== null);
  check('fresh save has no tier unlocks (all Tier 1)',
    typeof s.tierUnlocks === 'object' && Object.keys(s.tierUnlocks).length === 0);
}

// legacy save migration: global tiersUnlocked → per-tower tierUnlocks
{
  const store = {
    'tdx-save-v1': JSON.stringify({
      bits: 5, tiersUnlocked: 3, blueprints: 2, towersUnlocked: ['threader', 'vault'],
    }),
  };
  globalThis.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const s = loadSave();
  check('legacy global tier unlock migrates to every tower',
    TOWER_ORDER.every(k => s.tierUnlocks[k] === 3) && s.tiersUnlocked === undefined);
  check('legacy numeric blueprint count resets to object', typeof s.blueprints === 'object');
  delete globalThis.localStorage;
}

// --- CRASH: blocker relocation invariants --------------------------------------
{
  const blockerCount = 6;
  const candidates = [...grid.cells.values()].filter(c =>
    !c.spawn && !c.exit && c.r > 0 && c.r < grid.exits[0].r);
  // seed blockers the same way the game does
  let placed = 0, guard = 0;
  while (placed < blockerCount && guard++ < 300) {
    const c = candidates[Math.floor(Math.random() * candidates.length)];
    if (c.occupied) continue;
    c.blocker = true;
    const { dist } = field.compute();
    if (grid.spawns.every(sp => dist.has(sp.key))) placed++;
    else c.blocker = false;
  }
  field.recompute();
  // sprinkle legal towers so crashes have something to crush
  let towersPlaced = 0;
  for (const c of candidates) {
    if (towersPlaced >= 8) break;
    if (c.occupied || field.wouldFirewall(c, [])) continue;
    c.tower = new Tower('threader', c);
    towersPlaced++;
    field.recompute();
  }
  // hammer it: 25 consecutive crashes must hold every invariant
  let countStable = true, neverFirewalled = true, maxKilled = 0, totalKilled = 0;
  for (let i = 0; i < 25; i++) {
    const destroyed = relocateBlockers(grid, field, 2);
    maxKilled = Math.max(maxKilled, destroyed.length);
    totalKilled += destroyed.length;
    const bl = [...grid.cells.values()].filter(c => c.blocker).length;
    if (bl !== blockerCount) countStable = false;
    if (!grid.spawns.every(sp => field.reachable(sp))) neverFirewalled = false;
  }
  console.log(`  crash: 25 events, towers destroyed total=${totalKilled} maxPerCrash=${maxKilled}`);
  check('CRASH keeps the blocker count stable', countStable);
  check('CRASH never firewalls the map', neverFirewalled);
  check('CRASH kills at most 2 towers per event', maxKilled <= 2);
  // cleanup
  for (const c of grid.cells.values()) { c.blocker = false; c.tower = null; }
  field.recompute();
}

// --- Area Unlock: every level board builds and survives crashes ---------------
{
  let reachOk = true, lockoutOk = true, spawnOk = true, crashOk = true;
  for (const lvl of LEVELS) {
    const g = new HexGrid(lvl.grid);
    g.layout(390, 620);
    const f = new PathField(g);
    if (lvl.spawns > 1) placeExtraSpawns(g, f, lvl.spawns - 1);
    placeBlockers(g, f, lvl.blockers);
    placeLockouts(g, lvl.lockouts);
    f.recompute();
    if (g.spawns.length !== lvl.spawns) spawnOk = false;
    if (g.spawns[0].r !== 0) spawnOk = false;                      // anchored on top edge
    if (!g.spawns.slice(1).every(sp => sp.r <= 4)) spawnOk = false; // extras in top 5 rows
    if (!g.spawns.every(sp => f.reachable(sp))) reachOk = false;
    const lockouts = [...g.cells.values()].filter(c => c.lockout);
    if (lockouts.length !== lvl.lockouts) lockoutOk = false;
    if (lockouts.some(c => c.occupied)) lockoutOk = false;          // passable for enemies
    // repeated crashes must preserve every board invariant
    for (let i = 0; i < 8; i++) {
      const destroyed = crashShuffle(g, f, 2);
      if (destroyed.length > 2) crashOk = false;
      if ([...g.cells.values()].filter(c => c.blocker).length !== lvl.blockers) crashOk = false;
      if ([...g.cells.values()].filter(c => c.lockout).length !== lvl.lockouts) crashOk = false;
      if (g.spawns.length !== lvl.spawns || g.spawns[0].r !== 0) crashOk = false;
      if (!g.spawns.slice(1).every(sp => sp.r <= 4)) crashOk = false;
      if (!g.spawns.every(sp => f.reachable(sp))) crashOk = false;
    }
  }
  check('all 5 level boards build with reachable spawns', reachOk);
  check('lockouts: right counts, passable for enemies', lockoutOk);
  check('entry points: counts, top-edge anchor, top-5-row rule', spawnOk);
  check('crash shuffle preserves board invariants on every level', crashOk);
}

check('all wave defs are sane (0 < rtv < mav <= tev, valid rosters)', LEVELS.every(l =>
  l.waves.every(w => w.rtv > 0 && w.rtv < w.mav && w.mav <= w.tev &&
    w.unlocked.length > 0 && w.unlocked.every(k => ENEMIES[k]))));
check('region-locked BP pools per spec',
  LEVELS[0].bpPool.includes('vault') && LEVELS[1].bpPool.includes('defrag') &&
  LEVELS[2].bpPool.includes('ddos') && LEVELS[3].bpPool.includes('deleter'));

// --- Milestone 2 Stage A: version, per-level budgets, enemy delta -------------
check('version has number + alphabetical codename',
  /^\d+\.\d+$/.test(VERSION.number) && /^[A-Z]/.test(VERSION.codename));
check('every level defines a starting budget',
  LEVELS.every(l => Number.isFinite(l.startTokens) && l.startTokens > 0));
check('starting budgets never shrink across levels',
  LEVELS.every((l, i) => i === 0 || l.startTokens >= LEVELS[i - 1].startTokens));
{
  // enemy delta actually scales spawned enemies (health + attack damage)
  const d = LEVELS[4].enemyDelta;
  const e = new Enemy('hack', grid.spawns[0], field, grid, d);
  check('enemy delta scales spawn health',
    e.maxHealth === Math.round(ENEMIES.hack.health * d.health));
  const v = new Enemy('virus', grid.spawns[0], field, grid, d);
  check('enemy delta carries the damage multiplier', v.damageMult === d.damage);
}

// --- Milestone 2 Phase B1: Pulse (burst rifle) + Compressor (pump shotgun) ----
{
  const px = cellPx(grid);
  const cell = [...grid.cells.values()].find(c => !c.occupied && c.r === 5);
  const mkFoe = (dx) => ({
    alive: true, x: cell.x + dx, y: cell.y, radius: 8,
    path: { total: 100 }, dist: 0, hits: 0, count: 0,
    damage(n) { this.hits += n; this.count++; },
  });

  check('Pulse + Compressor are in the tray and need Blueprints',
    TOWER_ORDER.includes('pulse') && TOWER_ORDER.includes('compressor') &&
    TOWERS.pulse.blueprints > 0 && TOWERS.compressor.blueprints > 0);
  check('Pulse matches Threader range', WEAPONS.pulseRifle.range === WEAPONS.machineGun.range);

  // Pulse: whole clip = clipSize bursts of burstCount rounds, then a reload
  const pulse = new Tower('pulse', cell);
  pulse.upgrading = null;                       // skip the build clock
  const foe = mkFoe(px);
  const shots = [];
  let reloadSeenAt = -1;
  for (let i = 0; i < 400; i++) {               // 0.01s steps, 4s
    pulse.update(0.01, [foe], shots, grid);
    if (pulse.reloading > 0 && reloadSeenAt < 0) reloadSeenAt = shots.length;
  }
  const w = WEAPONS.pulseRifle;
  check('Pulse fires full 3-round bursts before reloading',
    reloadSeenAt === w.clipSize * w.burstCount);

  // burst rhythm: rounds within a burst are burstInterval apart, pulses 1/fireRate apart
  const p2 = new Tower('pulse', cell);
  p2.upgrading = null;
  const times = [];
  const sink = { push: () => times.push(t2) };
  let t2 = 0;
  for (let i = 0; i < 200; i++) { t2 = +(i * 0.01).toFixed(2); p2.update(0.01, [foe], sink, grid); }
  const gapIn = times[1] - times[0], gapPulse = times[3] - times[0];
  check('Pulse rhythm: tight burst, then a pause',
    Math.abs(gapIn - w.burstInterval) < 0.025 && Math.abs(gapPulse - 1 / w.fireRate) < 0.025);

  // Compressor: aimed fan of pellets, all inside the 45° cone
  const comp = new Tower('compressor', cell);
  comp.upgrading = null;
  const near = mkFoe(px * 0.9);
  const pellets = [];
  comp.update(0.01, [near], pellets, grid);
  const sg = WEAPONS.pumpShotgun;
  check('Compressor fires a full pellet fan', pellets.length === sg.pelletCount);
  check('Compressor pellets stay inside the 45° cone',
    pellets.every(p => Math.abs(p.angle) <= sg.cone / 2 + sg.spread + 1e-9));
  for (let i = 0; i < 100 && pellets.some(p => p.alive); i++) {
    for (const p of pellets) if (p.alive) p.update(0.02, [near], []);
  }
  check('Compressor pellets hit up close and die at range',
    near.count > 0 && pellets.every(p => !p.alive));

  // tier 4 targets apply to the new weapons too
  const t4 = new Tower('compressor', cell);
  t4.applyTier(4);
  check('new towers hit their tier-4 targets',
    t4.weapon.damage === TOWERS.compressor.tier4.damage && t4.maxHealth === TOWERS.compressor.tier4.health);
}

// --- Milestone 2 Phase 2B: Bug (tower hunter) + Stinger (detour raider) --------
{
  for (const c of grid.cells.values()) { c.blocker = false; c.tower = null; }
  field.recompute();
  const D = LEVELS[0].enemyDelta;
  const spawn = grid.spawns[0];

  // Bug: hunts a far tower (well outside Virus scan range), never walks to base
  const far = [...grid.cells.values()]
    .filter(c => !c.exit && !c.spawn)
    .sort((a, b) => Math.hypot(b.x - spawn.x, b.y - spawn.y) - Math.hypot(a.x - spawn.x, a.y - spawn.y))[0];
  const prey = new Tower('vault', far);
  far.tower = prey;
  field.recompute();
  const bug = new Enemy('bug', spawn, field, grid, D);
  let leaked = false;
  for (let i = 0; i < 600 && prey.alive; i++) {   // 0.05s steps, 30s
    bug.update(0.05, grid, [prey]);
    if (bug.reachedBase) leaked = true;
  }
  const farDist = Math.hypot(far.x - spawn.x, far.y - spawn.y) / cellPx(grid);
  check('Bug hunts a tower far beyond Virus scan range', farDist > ENEMIES.virus.attack.scanRange && prey.health < prey.maxHealth);
  check('Bug ignores the base while towers stand', !leaked);
  check('Bug drains its tower to destruction', !prey.alive);
  far.tower = null;
  field.recompute();
  // ... then, with no towers left, it heads for the base
  for (let i = 0; i < 1200 && bug.alive; i++) bug.update(0.05, grid, [prey]);
  check('Bug falls back to the base once no towers remain', bug.reachedBase);

  // Bug retargets at random across towers
  const cells = [...grid.cells.values()].filter(c => !c.exit && !c.spawn && c.r >= 3 && c.r <= 6);
  const picks = new Set();
  const ts = cells.slice(0, 4).map(c => { const t = new Tower('vault', c); c.tower = t; return t; });
  field.recompute();
  for (let i = 0; i < 40; i++) {
    const b = new Enemy('bug', spawn, field, grid, D);
    b.update(0.01, grid, ts);
    picks.add(b.attackTarget?.id);
  }
  check('Bug picks its tower at random', picks.size >= 3);
  for (const c of cells.slice(0, 4)) c.tower = null;
  field.recompute();

  // Stinger: detours off the optimal route, still always reaches the base
  const optimal = smoothPath(field.waypointsFrom(spawn)).total;
  let longer = 0, offPath = true, reached = 0;
  const onPath = new Set();
  for (let c = spawn; c; c = field.next.get(c.key)) onPath.add(c.key);
  for (let i = 0; i < 20; i++) {
    const st = new Enemy('stinger', spawn, field, grid, D);
    if (!st.detourCell || onPath.has(st.detourCell.key)) offPath = false;
    if (st.path.total > optimal * 1.05) longer++;
    for (let k = 0; k < 2000 && st.alive; k++) st.update(0.05, grid, []);
    if (st.reachedBase) reached++;
  }
  check('Stinger detours via a cell off the optimal route', offPath);
  check('Stinger routes are longer than optimal', longer >= 15);
  check('Stinger always reaches the base', reached === 20);
  check('Stinger spawns in packs of 2–4', ENEMIES.stinger.pack.min === 2 && ENEMIES.stinger.pack.max === 4);

  // a mid-route path rebuild (tower placed / CRASH) keeps the same detour
  const st2 = new Enemy('stinger', spawn, field, grid, D);
  const keep = st2.detourCell;
  for (let k = 0; k < 10; k++) st2.update(0.05, grid, []);
  st2.buildPath(field, grid);
  check('Stinger keeps its detour through a path rebuild', st2.detourCell === keep && st2.detourAt < Infinity);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
