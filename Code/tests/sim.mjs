// TDX headless sanity tests — run: node tests/sim.mjs (from Code/)
import { HexGrid } from '../js/hex.js';
import { PathField, smoothPath } from '../js/path.js';
import { Tower, Projectile, cellPx } from '../js/entities.js';
import { WaveController } from '../js/waves.js';
import { LEVELS, WEAPONS, TOWERS, TOWER_ORDER, ENEMIES, UPGRADE, PLAYER, VERSION, BLUEPRINTS, SURGE, tierStat } from '../js/config.js';
import { Enemy } from '../js/entities.js';
import { tierOffer } from '../js/config.js';
import { loadSave, affordableTiers, upgradesAffordable, dotLabel, SAVE_VERSION } from '../js/save.js';
import { TutorialScript, TUTORIAL_STEPS, tutorialTowers } from '../js/tutorial.js';
import { relocateBlockers, crashShuffle } from '../js/crash.js';
import { placeBlockers, placeLockouts, placeExtraSpawns, rollBlueprints } from '../js/board.js';
import { parseCSV, parseContent, archivePool, rollRun, memoriesLost, DEFAULT_AVATAR, CONTENT_FILES, SECONDARY_SHOWN } from '../js/narrative.js';
import { pickWeighted } from '../js/waves.js';
import { renderSynth, recipeLength, WAVES } from '../js/synth.js';
import { SOUNDS, MUSIC, AUDIO, deathSound, fireSound } from '../js/sounds.js';
import { VoicePool, AudioEngine, sfx, pickTrack, trackChangeDue } from '../js/audio.js';

let pass = 0, fail = 0;
const check = (name, cond) => { cond ? pass++ : fail++; console.log(cond ? ' PASS' : ' FAIL', name); };

const grid = new HexGrid(LEVELS[1].grid);   // S23: LEVELS[0] is the Tutorial; the core checks run on Level 1
grid.layout(390, 620);
check('cell count matches row widths', grid.cells.size === LEVELS[1].grid.rowWidths.reduce((a,b)=>a+b,0));
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
const wdef = LEVELS[1].waves[7];
const enemies = [];
const wc = new WaveController(wdef, grid, field, LEVELS[1].enemyDelta);
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
check('wave budget fully spent', wc.budgetLeft < wc.cheapestEV());
check('active EV never exceeded MAV', peak <= wdef.mav);
check('MAV halt occurred', halted);
check('RTV resume occurred', resumed);
check('wave terminates', t < 600);

// Spawn cooldown (M3 E11): two Viruses never spawn closer than ENEMIES.virus.spawnCooldown
{
  const vdef = { tev: 6000, mav: 3000, rtv: 1500, unlocked: ['virus', 'hack'], spawnInterval: 0.5 };
  const list = [];
  const vc = new WaveController(vdef, grid, field, LEVELS[1].enemyDelta);
  const times = [];
  let seen = 0;
  for (let vt = 0; vt < 120 && !vc.done; vt += 0.1) {
    vc.update(0.1, list);
    for (; seen < list.length; seen++) if (list[seen].type === 'virus') times.push(vc.clock);
    for (const e of list) e.alive = false;      // keep the field empty so MAV never blocks
  }
  const gaps = times.slice(1).map((x, i) => x - times[i]);
  check('Virus spawns respect spawnCooldown', times.length >= 3 && gaps.every(g => g >= ENEMIES.virus.spawnCooldown - 1e-6));
}

// Breach Surge (S21): warns once half the TEV has spawned, then pours surge × TEV
// on top, past the MAV cap, round-robin over the entry points.
{
  const sdef = { tev: 3000, mav: 600, rtv: 300, unlocked: ['hack'], spawnInterval: 0.5, surge: 0.5 };
  const list = [];
  const sc = new WaveController(sdef, grid, field, LEVELS[1].enemyDelta);
  let warnAt = null, pourAt = null, spentAtWarn = null, peakEV = 0, guard = 0;
  while (!sc.isComplete(list) && guard++ < 20000) {
    sc.update(0.05, list);
    if (sc.surge.state === 'warn' && warnAt == null) { warnAt = sc.clock; spentAtWarn = sdef.tev - sc.budgetLeft; }
    if (sc.surge.state === 'pour' && pourAt == null) pourAt = sc.clock;
    peakEV = Math.max(peakEV, sc.activeValue(list));
    if (sc.surge.state !== 'pour') for (const e of list) e.alive = false;   // hold the field until it pours
  }
  const ev = list.reduce((v, e) => v + e.def.ev, 0);
  check('surge: warns once the trigger share of TEV has spawned',
    spentAtWarn >= sdef.tev * SURGE.trigger && spentAtWarn < sdef.tev * SURGE.trigger + 2 * ENEMIES.hack.ev);
  check('surge: pours after the countdown', Math.abs(pourAt - warnAt - SURGE.warning) < 0.11);
  check('surge: adds surge × TEV on top of the wave', ev === sdef.tev * (1 + sdef.surge));
  check('surge: ignores the MAV cap', peakEV > sdef.mav);
  check('surge: wave is not complete until the surge is over', sc.surge.state === 'over');
  // a Virus-heavy surge still respects the Virus spawn cooldown
  const vdef2 = { tev: 3000, mav: 600, rtv: 300, unlocked: ['hack', 'virus'], weights: { virus: 5 }, spawnInterval: 0.5, surge: 2 };
  const vl = [], vc2 = new WaveController(vdef2, grid, field, LEVELS[1].enemyDelta);
  const vt = []; let seen2 = 0, g2 = 0;
  while (!vc2.isComplete(vl) && g2++ < 40000) {
    vc2.update(0.05, vl);
    for (; seen2 < vl.length; seen2++) if (vl[seen2].type === 'virus') vt.push(vc2.clock);
    for (const e of vl) e.alive = false;   // keep the field empty so MAV never blocks
  }
  const vgaps = vt.slice(1).map((x, i) => x - vt[i]);
  check('surge: Viruses keep their spawn cooldown inside a surge', vt.length >= 3 && vgaps.every(g => g >= ENEMIES.virus.spawnCooldown - 1e-6));
  const plain = new WaveController({ ...sdef, surge: undefined }, grid, field, LEVELS[1].enemyDelta);
  check('surge: waves without one have none', plain.surge === null);
}

// Virus spread (M3 E14): a second Virus prefers a tower nobody is draining
// (S26: real towers now — Viruses must be able to walk up to them)
{
  const spawn = grid.spawns[0];
  const hexD = c => Math.hypot(c.x - spawn.x, c.y - spawn.y) / cellPx(grid);
  const open = [...grid.cells.values()].filter(c => !c.occupied && !c.spawn && !c.exit);
  const nearCell = open.filter(c => hexD(c) < 1.1).sort((a, b) => hexD(a) - hexD(b))[0];
  const farCell = open.filter(c => hexD(c) > 1.6 && hexD(c) < 2.2 && !grid.neighbors(nearCell).includes(c))[0];
  const near = new Tower('vault', nearCell), far = new Tower('vault', farCell);
  nearCell.tower = near; farCell.tower = far; field.recompute();
  const a = new Enemy('virus', spawn, field, grid, LEVELS[1].enemyDelta);
  const b = new Enemy('virus', spawn, field, grid, LEVELS[1].enemyDelta);
  a.x = b.x = spawn.x; a.y = b.y = spawn.y;
  a.update(0.01, grid, [near, far]);
  b.update(0.01, grid, [near, far]);
  check('second Virus picks an undrained tower', a.attackTarget === near && b.attackTarget === far);
  const c = new Enemy('virus', spawn, field, grid, LEVELS[1].enemyDelta);
  c.x = spawn.x; c.y = spawn.y;
  c.update(0.01, grid, [near]);
  check('Virus still stacks when every tower in range is taken', c.attackTarget === near);
  nearCell.tower = null; farCell.tower = null; field.recompute();
}

// S26 (Jogo's bug): Viruses never move onto Blocked cells to reach a tower
{
  const spawn = grid.spawns[0];
  const saved = [...grid.cells.values()].map(c => [c, c.blocker]);
  // a tower two cells in from the spawn, walled in by blockers on every side
  const cells = [...grid.cells.values()].filter(c => !c.occupied && !c.spawn && !c.exit);
  const pxs = cellPx(grid);
  const tc = cells.filter(c => { const d = Math.hypot(c.x - spawn.x, c.y - spawn.y) / pxs; return d > 1.6 && d < 2.2; })
    .find(c => grid.neighbors(c).every(n => !n.spawn && !n.exit));
  const prey = new Tower('vault', tc); tc.tower = prey;
  const ring = grid.neighbors(tc);
  for (const n of ring) n.blocker = true;
  field.recompute();
  const v = new Enemy('virus', spawn, field, grid, LEVELS[1].enemyDelta);
  v.x = spawn.x; v.y = spawn.y; v.buildPath(field, grid);
  v.update(0.01, grid, [prey]);
  check('Virus ignores a tower walled in by Blocked cells', v.attackTarget === null);
  // open one side: it walks round to that free cell, never across a blocker
  for (const n of ring) n.blocker = false;
  const blocked = ring.filter(n => Math.hypot(n.x - spawn.x, n.y - spawn.y) < Math.hypot(tc.x - spawn.x, tc.y - spawn.y) + pxs * 0.6);
  for (const n of blocked) n.blocker = true;
  field.recompute();
  const w = new Enemy('virus', spawn, field, grid, LEVELS[1].enemyDelta);
  w.x = spawn.x; w.y = spawn.y; w.buildPath(field, grid);
  let onBlock = false;
  for (let i = 0; i < 400; i++) {
    w.update(0.05, grid, [prey]);
    let best = null, bd = Infinity;
    for (const c of grid.cells.values()) { const d = (c.x - w.x) ** 2 + (c.y - w.y) ** 2; if (d < bd) { bd = d; best = c; } }
    if (best.blocker) onBlock = true;
  }
  check('Virus walks round to a free cell to drain (never onto a Blocked cell)',
    !onBlock && prey.health < prey.maxHealth && blocked.length > 0 && blocked.length < ring.length);
  tc.tower = null;
  for (const [c, b] of saved) c.blocker = b;
  field.recompute();
}

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
  const T = TOWERS.threader, W = WEAPONS[T.weapon];
  check('tier 4 hits the stat targets',
    t.maxHealth === Math.round(tierStat(T, 'health', T.health, 4)) && t.weapon.damage === tierStat(T, 'damage', W.damage, 4));
  const t2 = new Tower('threader', cell);
  t2.applyTier(2);
  // F4 value rule: the Tier 2 upgrade adds valueShare of a new tower's damage per Token
  const perToken1 = W.damage / T.cost, perTokenUp = (t2.weapon.damage - W.damage) / (T.cost * UPGRADE.costMult[0]);
  check('upgrade value rule: Tier 2 gives valueShare of Tier 1 value per Token', Math.abs(perTokenUp / perToken1 - UPGRADE.valueShare) < 1e-9);
  const t3 = new Tower('threader', cell);
  t3.applyTier(3);
  check('rule tiers rise in equal steps', Math.abs((t3.weapon.damage - t2.weapon.damage) - (t2.weapon.damage - W.damage)) < 1e-9);
  check('tier4 towers (Deleter) still interpolate to their target',
    tierStat(TOWERS.deleter, 'damage', WEAPONS.sniperRifle.damage, 4) === TOWERS.deleter.tier4.damage);
  t2.spent += 200; // one upgrade bought
  check('sell refund covers upgrade spend', t2.sellValue === Math.floor((100 + 200) * PLAYER.sellRefund));
  cell.tower = null;
}

// --- Special Powers (S19): one per tower, from its tier ------------------------
{
  const cell = { x: 0, y: 0 };
  const fake = (x, y, remain) => ({ x, y, alive: true, path: { total: remain }, dist: 0 });
  // Threader Self Defence: an enemy draining it beats "First" targeting
  const t1 = new Tower('threader', cell), t2 = new Tower('threader', cell);
  t2.applyTier(2);
  const first = fake(30, 0, 10), drainer = fake(20, 0, 500);
  for (const t of [t1, t2]) { t.attacker = drainer; t.attackedFor = 1; }
  check('Self Defence: off at Tier 1 (First targeting)', t1.pickTarget([first, drainer], 1000) === first);
  check('Self Defence: Tier 2 Threader targets the enemy draining it', t2.pickTarget([first, drainer], 1000) === drainer);
  t2.attackedFor = 0;
  check('Self Defence: back to First once the attack stops', t2.pickTarget([first, drainer], 1000) === first);
  // Vault Self Repair: heals only after `delay` quiet seconds
  const v = new Tower('vault', cell);
  v.upgrading = null; v.applyTier(2);
  const P = TOWERS.vault.power;
  v.health = 50; v.sinceHit = 0;
  for (let i = 0; i < (P.delay - 0.5) * 10; i++) v.update(0.1, [], [], grid);
  check('Self Repair: no healing inside the delay', v.health === 50);
  for (let i = 0; i < 20; i++) v.update(0.1, [], [], grid);
  check('Self Repair: heals perSec × max HP a second after the delay', v.health > 50 && v.health <= 50 + v.maxHealth * P.perSec * 1.6 + 1e-9);
  const v1 = new Tower('vault', cell); v1.upgrading = null; v1.health = 50; v1.sinceHit = 99;
  v1.update(1, [], [], grid);
  check('Self Repair: off at Tier 1', v1.health === 50);
  // Defrag AntiVirus: +50% damage to Viruses and Bugs from Tier 2
  const d1 = new Tower('defrag', cell), d2 = new Tower('defrag', cell);
  d2.applyTier(2);
  const A = TOWERS.defrag.power;
  const p1 = new Projectile(d1, null, 0, grid), p2 = new Projectile(d2, null, 0, grid);
  check('AntiVirus: off at Tier 1', p1.dmgVs({ type: 'virus' }) === d1.weapon.damage);
  check('AntiVirus: Tier 2 Defrag does ×mult to Virus and Bug, normal to others',
    p2.dmgVs({ type: 'virus' }) === d2.weapon.damage * A.mult && p2.dmgVs({ type: 'bug' }) === d2.weapon.damage * A.mult &&
    p2.dmgVs({ type: 'hack' }) === d2.weapon.damage);
  // Boost powers: DDOS blast ×2 from Tier 3, Pulse fire rate ×1.5 at Tier 4
  const dd = new Tower('ddos', cell); dd.applyTier(2); const s2 = dd.weapon.splashRadius; dd.applyTier(3);
  check('Cluster Bomb: DDOS splash ×2 from Tier 3',
    s2 === WEAPONS.grenadeLauncher.splashRadius && dd.weapon.splashRadius === s2 * TOWERS.ddos.power.mult &&
    new Projectile(dd, { x: 1, y: 1 }, 0, grid).splashPx === dd.weapon.splashRadius * cellPx(grid));
  const pu = new Tower('pulse', cell); pu.applyTier(3); const f3 = pu.weapon.fireRate; pu.applyTier(4);
  check('Overclock: Pulse fire rate ×1.5 at Tier 4 only',
    f3 === WEAPONS.pulseRifle.fireRate && pu.weapon.fireRate === f3 * TOWERS.pulse.power.mult);
  // Compressor Long Choke: +50% range from Tier 3, and it sticks through later tiers
  const base = WEAPONS.pumpShotgun.range, c = new Tower('compressor', cell);
  c.applyTier(2); const r2 = c.weapon.range;
  c.applyTier(3); const r3 = c.weapon.range;
  c.applyTier(4);
  check('Long Choke: Compressor range ×1.5 from Tier 3 only',
    r2 === base && Math.abs(r3 - base * TOWERS.compressor.power.mult) < 1e-9 && c.weapon.range === r3);
}

// --- Sim 'skilled' bot (S19): diversifies and upgrades ------------------------
{
  const { runLevel } = await import('../tools/sim/engine.js');
  const r = runLevel(4, { seed: 2, bot: 'skilled' });
  const types = new Set(r.towers.map(t => t.type));
  const ups = r.waves.reduce((a, w) => a + w.upgrades, 0);
  check('skilled bot: builds specialists alongside Threaders', types.has('threader') && [...types].some(t => !['threader', 'vault'].includes(t)));
  check('skilled bot: upgrades towers once the board is full', ups > 0 && r.towers.some(t => t.tier > 1));
  const live = runLevel(4, { seed: 2, bot: 'live' });
  check('live bot unchanged: Threaders only, Tier 1', live.towers.every(t => t.type === 'threader' && t.tier === 1));
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
  LEVELS.every(l => Object.values(l.bpPool || {}).every(k => TOWERS[k] && TOWERS[k].blueprints > 0)));

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

// S23: Level 0 (Tutorial) — save migration, level data, PLAY routing
{
  const mk = (data) => {
    const store = data ? { 'tdx-save-v1': JSON.stringify(data) } : {};
    globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
    const s = loadSave();
    delete globalThis.localStorage;
    return s;
  };
  check('save: a new player starts on Level 0 (Tutorial), current save version', (() => { const s = mk(null); return s.levelsUnlocked === 0 && s.saveVersion === SAVE_VERSION; })());
  check('save: a pre-Tutorial save moves up one level (Tutorial counts as cleared)',
    mk({ bits: 3, levelsUnlocked: 0 }).levelsUnlocked === 1 && mk({ levelsUnlocked: 4 }).levelsUnlocked === 5);
  check('save: one-time hints start unseen for a new player', (() => { const s = mk(null); return !s.hints.blueprint && !s.hints.bits; })());
  check('save: players who collected Blueprints / earned Bits skip those hints',
    mk({ blueprints: { vault: 2 } }).hints.blueprint === true && mk({ towersUnlocked: ['threader', 'vault'] }).hints.blueprint === true
    && mk({ bits: 4 }).hints.bits === true && !mk({ bits: 0 }).hints.bits);
  check('save: a v2 save is left alone', mk({ levelsUnlocked: 0, saveVersion: 2 }).levelsUnlocked === 0
    && mk({ levelsUnlocked: 3, saveVersion: 2 }).levelsUnlocked === 3);
  const T = LEVELS[0];
  check('Level 0 is the Tutorial: 3 waves, 500 Tokens, no BITS, no Blueprints',
    T.tutorial === true && T.waves.length === 3 && T.startTokens === 500 && T.rewardBits === 0 && Object.keys(T.bpPool).length === 0);
  check('only Level 0 is a Tutorial', LEVELS.slice(1).every(l => !l.tutorial));
}

// S24: Tutorial (FTUE) step machine and text
{
  const t = new TutorialScript();
  check('tutorial: wave 1 teaches before START WAVE, waves 2 and 3 once the wave runs',
    t.hasSteps(0) && !t.hasSteps(0, 'wave') && !t.hasSteps(1) && t.hasSteps(1, 'wave') && !t.hasSteps(2) && t.hasSteps(2, 'wave')
    && !t.hasSteps(3, 'wave') && TUTORIAL_STEPS.every(s => s.wave < LEVELS[0].waves.length));
  let s = t.begin(0);
  check('tutorial: wave 1 opens on Screen_1, only the Threader card is tappable',
    s.id === 'Screen_1' && t.allows('tray', 'threader') && !t.allows('tray', 'vault') && !t.allows('board') && !t.allows('tick'));
  check('tutorial: the wrong card does nothing', t.event('select', 'vault') === null && t.step.id === 'Screen_1');
  check('tutorial: selecting the Threader moves to Screen_2 (place it)', t.event('select', 'threader') === 'next' && t.next().id === 'Screen_2' && t.allows('board'));
  check('tutorial: placing it moves to Screen_3', t.event('build', 'threader') === 'next' && t.next().id === 'Screen_3');
  const r1 = t.event('build', 'threader');
  check('tutorial: Screen_3 waits for both towers, then shows the tick', r1 === null && !t.allows('tick')
    && t.event('build', 'threader') === 'tick' && t.allows('tick') && !t.allows('board'));
  check('tutorial: the tick ends wave 1\'s steps', t.next() === null && !t.hasSteps(0));
  check('tutorial: after a wave\'s steps, more towers don\'t bring a box back (S24 fix)',
    t.step === null && t.event('build', 'threader') === null && t.event('select', 'threader') === null && t.allows('tray', 'vault'));
  check('tutorial: no build-phase steps on wave 2', t.begin(1) === null);
  s = t.begin(1, 'wave');
  check('tutorial: wave 2 is the Vault (Screen_4, Screen_5)', s.id === 'Screen_4' && t.event('select', 'vault') === 'next'
    && t.next().id === 'Screen_5' && t.event('build', 'vault') === 'next' && t.next() === null);
  s = t.begin(2, 'wave');
  check('tutorial: wave 3 is the Repo and Cores, tick-only (Screen_6, Screen_7)', s.id === 'Screen_6' && t.allows('tick')
    && !t.allows('board') && !t.allows('tray', 'threader') && t.next().id === 'Screen_7' && t.next() === null && t.begin(3, 'wave') === null);
  const k = new TutorialScript(); k.begin(0); k.skip();
  check('tutorial: Skip ends every step', !k.hasSteps(0) && !k.hasSteps(2, 'wave') && k.begin(1, 'wave') === null && k.allows('board'));
  check('tutorial: towers allowed — Threader on wave 1, + Vault from wave 2',
    tutorialTowers(0).join() === 'threader' && tutorialTowers(1).join() === 'threader,vault' && tutorialTowers(2).join() === 'threader,vault');
  const c = parseContent({ tutorials: 'Tutorial_Message,Text\nScreen _3,Place 2 more.\nScreen_1,\n' });
  check('tutorial text: CSV rows win, spaces in IDs ignored, blanks keep the default',
    c.tutorial.Screen_3 === 'Place 2 more.' && c.tutorial.Screen_1.startsWith('Tap the') && !!c.tutorial.Archive_Tut_Top);
}

// S25: Deleter charge (drives the chevron light-up): 0 just after a shot, rising to 1 when ready
{
  const d = new Tower('deleter', grid.cells.values().next().value);
  const w = d.weapon, total = w.reloadTime + 1 / w.fireRate;
  d.cooldown = 0; d.reloading = 0;
  const ready = d.charge;
  d.reloading = w.reloadTime; d.cooldown = 1 / w.fireRate;       // just fired
  const fired = d.charge;
  d.reloading = 0; d.cooldown = 1 / w.fireRate - (total / 2 - w.reloadTime);   // halfway
  check('Deleter charge: 1 when ready, 0 just after firing, 0.5 halfway', ready === 1 && fired === 0 && Math.abs(d.charge - 0.5) < 1e-9);
  check('towers without a weapon read full charge', new Tower('vault', grid.cells.values().next().value).charge === 1);
}

// S25: Towers Info next-tier text
check('tier offer: HP/damage step + the Special Ability at its tier',
  tierOffer('threader', 2)[0].startsWith('T2: HP 100 → 220') && tierOffer('threader', 2)[1]?.startsWith('Special Ability: Self Defence')
  && tierOffer('threader', 3).length === 1 && tierOffer('vault', 3)[0] === 'T3: HP 333 → 467' && tierOffer('threader', 5).length === 0);

// S25: red-dot counts (affordable tier unlocks; costs T2 3, T3 8, T4 15 Bits)
{
  const sv = (bits, tierUnlocks = {}, towersUnlocked = ['threader', 'vault']) => ({ bits, tierUnlocks, towersUnlocked });
  check('red dot: tiers affordable in a row, per tower', affordableTiers(sv(2), 'threader') === 0 && affordableTiers(sv(3), 'threader') === 1
    && affordableTiers(sv(11), 'threader') === 2 && affordableTiers(sv(26), 'threader') === 3 && affordableTiers(sv(99, { threader: 4 }), 'threader') === 0);
  check('red dot: from the tower\'s current tier; locked towers never count',
    affordableTiers(sv(8, { vault: 2 }), 'vault') === 1 && affordableTiers(sv(99), 'ddos') === 0);
  check('red dot: main menu shows the total of the tower dots, 3+ cap',
    upgradesAffordable(sv(3)) === 2 && upgradesAffordable(sv(11)) === 4 && upgradesAffordable(sv(0)) === 0 && dotLabel(2) === '2' && dotLabel(5) === '3+');
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
    if (!g.spawns.slice(1).every(sp => sp.r < lvl.grid.entryRows)) spawnOk = false; // extras in the entry rows
    if (!g.spawns.slice(1).every(sp => f.dist.get(sp.key) >= lvl.grid.entryMinDist)) spawnOk = false;
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
      if (!g.spawns.slice(1).every(sp => sp.r < lvl.grid.entryRows)) crashOk = false;
      if (!g.spawns.every(sp => f.reachable(sp))) crashOk = false;
    }
  }
  check(`all ${LEVELS.length} level boards build with reachable spawns`, reachOk);
  check('lockouts: right counts, passable for enemies', lockoutOk);
  check('entry points: counts, top-edge anchor, entry rows + min distance', spawnOk);
  check('crash shuffle preserves board invariants on every level', crashOk);
}

check('all wave defs are sane (0 < rtv < mav <= tev, valid rosters)', LEVELS.every(l =>
  l.waves.every(w => w.rtv > 0 && w.rtv < w.mav && w.mav <= w.tev &&
    w.unlocked.length > 0 && w.unlocked.every(k => ENEMIES[k]))));
// --- Blueprint drop slots: primary / secondary / tertiary ----------------------
check('slot rates: primary 15%, secondary 5%, tertiary 3%',
  BLUEPRINTS.dropRates.primary === 0.15 && BLUEPRINTS.dropRates.secondary === 0.05 &&
  BLUEPRINTS.dropRates.tertiary === 0.03);
check('every lockable tray tower drops somewhere',
  TOWER_ORDER.filter(k => TOWERS[k].blueprints > 0)
    .every(k => LEVELS.some(l => Object.values(l.bpPool).includes(k))));
{
  // observed rates over many kills match the slot rates
  const POOL = { primary: 'vault', secondary: 'defrag', tertiary: 'ddos' };   // fixed, not level data
  const counts = {};
  const N = 40000;
  for (let i = 0; i < N; i++) for (const k of rollBlueprints(POOL, () => false)) counts[k] = (counts[k] || 0) + 1;
  const near = (k, r) => Math.abs((counts[k] || 0) / N - r) < 0.01;
  check('drop rolls hit the configured rates per slot',
    near('vault', 0.15) && near('defrag', 0.05) && near('ddos', 0.03));
  const none = rollBlueprints(POOL, () => true, () => 0);
  check('unlocked towers never drop', none.length === 0);
  const pOnly = rollBlueprints(POOL, (k) => k !== 'vault', () => 0);
  check('slots roll independently (others unlocked → primary still drops)',
    pOnly.length === 1 && pOnly[0] === 'vault');
}

// --- Milestone 2 Stage A: version, per-level budgets, enemy delta -------------
check('version has number + alphabetical codename',
  /^\d+\.\d+$/.test(VERSION.number) && /^[A-Z]/.test(VERSION.codename));
check('every level defines a starting budget',
  LEVELS.every(l => Number.isFinite(l.startTokens) && l.startTokens > 0));
{
  // enemy delta actually scales spawned enemies (health + attack damage)
  const d = LEVELS[5].enemyDelta;
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
    t4.weapon.damage === tierStat(TOWERS.compressor, 'damage', WEAPONS.pumpShotgun.damage, 4) &&
    t4.maxHealth === Math.round(tierStat(TOWERS.compressor, 'health', TOWERS.compressor.health, 4)));
}

// --- Milestone 2 Phase 2B: Bug (tower hunter) + Stinger (detour raider) --------
{
  for (const c of grid.cells.values()) { c.blocker = false; c.tower = null; }
  field.recompute();
  const D = LEVELS[1].enemyDelta;
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

  // Bug walks open cells only: never crosses a blocker on the way to its tower
  {
    const target = far;
    const lineCells = [...grid.cells.values()].filter(c => {
      if (c.spawn || c.exit || c === target) return false;
      // cells close to the straight spawn→target line
      const vx = target.x - spawn.x, vy = target.y - spawn.y;
      const t = ((c.x - spawn.x) * vx + (c.y - spawn.y) * vy) / (vx * vx + vy * vy);
      if (t < 0.25 || t > 0.8) return false;
      const px0 = spawn.x + vx * t, py0 = spawn.y + vy * t;
      return Math.hypot(c.x - px0, c.y - py0) < grid.size;
    });
    for (const c of lineCells) { if (!field.wouldFirewall(c, [])) { c.blocker = true; field.recompute(); } }
    const prey2 = new Tower('vault', target);
    target.tower = prey2;
    field.recompute();
    const b = new Enemy('bug', spawn, field, grid, D);
    let crossed = false;
    for (let i = 0; i < 600 && prey2.health === prey2.maxHealth; i++) {
      b.update(0.05, grid, [prey2]);
      let near = null, nd = Infinity;
      for (const c of grid.cells.values()) {
        const d = Math.hypot(c.x - b.x, c.y - b.y);
        if (d < nd) { nd = d; near = c; }
      }
      if (near.blocker) crossed = true;
    }
    check('Bug routes around blockers to reach its tower', !crossed && prey2.health < prey2.maxHealth);
    for (const c of lineCells) c.blocker = false;
    target.tower = null;
    field.recompute();
  }

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

// --- M4: narrative content + memory loss + weighted roster picks -----------------
{
  const arch = [
    'Name,Active,Archive Class,Archive Sub-Class,Archive Desc,Icon,Core Memory 1,Core Memory 1 Summary,Core Memory 2,Core Memory 2 Summary,Secondary Memory 1,Secondary Memory 1 Summary,Secondary Memory 2,Secondary Memory 2 Summary,Secondary Memory 3,Secondary Memory 3 Summary,Secondary Memory 4,Secondary Memory 4 Summary,Status,',
    'Ann ,YES,Human,Memories,Teacher,,"A core, with a comma\nand a ""quote""\n",core,,,s1,S1,s2,,s3,S3,s4,S4,done,',
    ',,,,,,,,,,,,,,,,,,,',
    'Bo,yes,Business,Records,Bakery,Av_X.png,B core,,,,b1,,b2,,b3,,,,,',
    'Cy,,Business,Records,Shop,,C core,,,,c1,,c2,,c3,,,,,',
    'Di,YES,Corporation,Records,Bank,,,,,,d1,,,,,,,,,',
  ].join('\r\n');
  const levels = [
    'Level_Number,Level_Label,Level_Narrative_Label,Level_Narrative_Desc,Level_Archives,Notes,',
    '1,Archive 001,Mischief,"First paragraph.\nSecond paragraph.",Business,ignored,',
    ',,,,,,',
    '2,Archive 002,,,,,',
    '3,Archive 003,,,"Human, Spaceship",,',
    '3,Duplicate,,,,,',
    'x,Bad number,,,,,',
  ].join('\n');
  const strings = 'StringID,Text\nResult_Win_Label,Saved!\nBogus_Key,x\n';
  const c = parseContent({ archives: arch, levels, strings });
  const ann = c.archives.find(a => a.name === 'Ann');
  check('CSV: quoted cells keep commas, quotes and inner line breaks', parseCSV('a,"b,""c""\nd",e\n')[0].join('|') === 'a|b,"c"\nd|e');
  check('content: trailing spaces and trailing line breaks are trimmed',
    !!ann && ann.core[0].text === 'A core, with a comma\nand a "quote"');
  check('content: headings map to Name / Bio / Class / Sub-Class, icon defaults',
    ann.bio === 'Teacher' && ann.type === 'Human' && ann.description === 'Memories' && ann.icon === DEFAULT_AVATAR
    && c.archives.find(a => a.name === 'Bo').icon === 'Av_X.png');
  check('content: empty memories skipped, missing summary uses the text, extra columns ignored',
    ann.core.length === 1 && ann.secondary.length === 4 && ann.secondary[1].summary === 's2');
  check('content: blank rows dropped, Active YES (any case) only', c.archives.length === 4
    && c.archives.filter(a => a.active).map(a => a.name).join() === 'Ann,Bo,Di');
  check('content: one row per level, line break kept, extra columns ignored',
    c.levels[1].label === 'Archive 001' && c.levels[1].narrativeLabel === 'Mischief'
    && c.levels[1].narrativeDesc === 'First paragraph.\nSecond paragraph.' && c.levels[3].classes.join() === 'Human,Spaceship');
  check('content: duplicate level rows and bad level numbers are flagged',
    c.levels[3].label === 'Archive 003' && c.warnings.some(w => w.includes('Level 3 has more than one row'))
    && c.warnings.some(w => w.includes('"x"')));
  check('content: screen strings override defaults, others keep theirs',
    c.strings.Result_Win_Label === 'Saved!' && c.strings.Result_Lose_Label === 'Archive breached');
  check('content: unknown key, missing Class and Core-less Active archive are flagged',
    c.warnings.some(w => w.includes('Bogus_Key')) && c.warnings.some(w => w.includes('Spaceship')) && c.warnings.some(w => w.includes('Di is Active')));
  check('pool: a level draws only Active archives of its Classes', archivePool(c, 1).map(a => a.name).join() === 'Bo');
  check('pool: a level with no Class picks from every Active archive', archivePool(c, 2).map(a => a.name).join() === 'Ann,Bo');
  {
    // S23: Level 0 (Tutorial) parses; the Tutorial Class is never a fallback; empty Classes are flagged
    const tArch = 'Name,Active,Archive Class,Archive Sub-Class,Archive Desc,Core Memory 1\nTut,YES,Tutorial,Sample,Tutorial,t\nEd,YES,Human Early,Memories,Teacher,e\n';
    const tLv = 'Level_Number,Level_Label,Level_Archives\n0,Tutorial,Tutorial\n1,Archive 001,Business Early\n2,Archive 002,Human Early\n';
    const t = parseContent({ archives: tArch, levels: tLv });
    check('content: Level 0 (Tutorial) is a level', t.levels[0]?.label === 'Tutorial' && !t.warnings.some(w => w.includes('"0"')));
    check('pool: Tutorial draws its own Class; the fallback never picks the Tutorial archive',
      archivePool(t, 0).map(a => a.name).join() === 'Tut' && archivePool(t, 1).map(a => a.name).join() === 'Ed');
    check('content: a level whose Classes have no Active archive is flagged',
      t.warnings.some(w => w.startsWith('Level 1: no Active archive')) && !t.warnings.some(w => w.startsWith('Level 2:')));
  }
  let ok = true;
  for (let i = 0; i < 50; i++) {
    const run = rollRun(c, 3);
    const last = run.lossOrder[run.lossOrder.length - 1];
    if (run.archive.name !== 'Ann' || run.secondary.length !== SECONDARY_SHOWN || new Set(run.secondary).size !== SECONDARY_SHOWN || last !== run.core || run.lossOrder.length !== SECONDARY_SHOWN + 1) ok = false;
  }
  check(`run: 1 Core + ${SECONDARY_SHOWN} Secondary from the level\'s Class, Core Memory lost last`, ok);
  check('run: no usable archive → no run', rollRun(parseContent({}), 1) === null);

  const lost = [0, 2, 3, 6, 7, 12, 13, 14].map(n => memoriesLost(n, 3)).join();
  check('memory loss (S26): 1st at 3 Cores lost, 2nd at 7, Core Memory at 13', lost === '0,0,1,1,2,2,3,3');
  check('memory loss: fewer memories shown never over-counts', memoriesLost(13, 2) === 2 && memoriesLost(7, 1) === 1);

  if (globalThis.process?.versions?.node) {
    const fs = await import('node:fs');
    const read = (f) => fs.readFileSync(new URL(`../content/TDX_Text/${f}`, import.meta.url), 'utf8');
    const real = parseContent({ archives: read(CONTENT_FILES.archives), levels: read(CONTENT_FILES.levels), strings: read(CONTENT_FILES.strings), tutorials: read(CONTENT_FILES.tutorials) });
    check('content/TDX_Text CSVs parse with at least one Active archive', archivePool(real, 1).length > 0);
    check('content/TDX_Text: every Tutorial step has text', TUTORIAL_STEPS.every(st => real.tutorial[st.id]?.trim()));
  }

  check('roster pick: uniform without weights', pickWeighted(['a', 'b'], undefined, () => 0.6) === 'b');
  check('roster pick: weights shift the odds', pickWeighted(['a', 'v'], { v: 3 }, () => 0.3) === 'v' && pickWeighted(['a', 'v'], { v: 3 }, () => 0.2) === 'a');
}

// --- M5: level file + Level Editor model ----------------------------------------
{
  const { validateLevels } = await import('../tools/editor/validate.js');
  const M = await import('../tools/editor/model.js');
  const { formatLevels } = await import('../tools/editor/format.js');
  const v = validateLevels(LEVELS);
  check('levels.js passes the Level Editor checks', v.errors.length === 0);
  if (v.errors.length) console.log('   ', v.errors.join('\n    '));
  if (globalThis.process?.versions?.node) {
    const fs = await import('node:fs');
    const text = fs.readFileSync(new URL('../js/levels.js', import.meta.url), 'utf8');
    check('levels.js is exactly what the editor would save (no noisy diffs)', formatLevels(LEVELS.map(M.normalizeLevel)) === text);
  }
  check('every level carries design.curve and design.target', LEVELS.every(l => l.design?.curve && l.design?.target));

  // curve → waves: sane numbers, opening rule on wave 1, rosters untouched
  const L = structuredClone(LEVELS[2]);
  const before = L.waves.map(w => w.unlocked.join());
  delete L.design.curve.points;
  M.applyCurve(L);
  check('curve: regenerated waves are sane', validateLevels([L]).errors.length === 0);
  check('curve: rosters untouched by the curve', L.waves.every((w, i) => w.unlocked.join() === before[i]));
  check('curve: TEV climbs from start to end', L.waves[0].tev < L.waves[L.waves.length - 1].tev);
  check('curve: wave 1 opening (half MAV, 1.5× spread)',
    L.waves[0].mav === Math.min(L.waves[0].tev, Math.max(60, Math.round(L.design.curve.mav * Math.sqrt(L.design.curve.start) * 0.5 / 10) * 10)));
  // a pinned point fixes one wave's TEV
  L.design.curve.points = L.waves.map(() => null); L.design.curve.points[3] = 0.5;
  M.applyCurve(L);
  check('curve: a pinned wave takes its own intensity', L.waves[3].tev === Math.round(L.design.curve.tev * 0.5 / 100) * 100);

  // roster lanes round-trip and rewrite only rosters
  const R = structuredClone(LEVELS[4]);
  const nums = R.waves.map(w => w.tev).join();
  const lanes = M.rosterLanes(R);
  M.setRosterLanes(R, lanes);
  check('lanes: round-trip leaves rosters and weights unchanged',
    JSON.stringify(R.waves.map(w => [w.unlocked, w.weights ?? null])) === JSON.stringify(LEVELS[4].waves.map(w => [w.unlocked, w.weights ?? null])));
  lanes.virus = { from: 5, to: R.waves.length - 1, weight: 2 };
  M.setRosterLanes(R, lanes);
  check('lanes: moving a lane moves the enemy, weights follow',
    !R.waves[4].unlocked.includes('virus') && R.waves[5].unlocked.includes('virus') && R.waves[5].weights.virus === 2);
  check('lanes: wave numbers untouched', R.waves.map(w => w.tev).join() === nums);
  M.setWaveCount(R, R.waves.length + 2);
  check('wave count: lanes that ran to the end still do', R.waves[R.waves.length - 1].unlocked.includes('virus'));

  // entry point rules
  const E = structuredClone(LEVELS[5]);
  E.grid.entryRows = 3; E.grid.entryMinDist = 8; E.spawns = 3;
  let entryOk = true;
  for (let i = 0; i < 20; i++) {
    const g = new HexGrid(E.grid); const f = new PathField(g);
    placeExtraSpawns(g, f, 2); f.recompute();
    if (!g.spawns.slice(1).every(sp => sp.r < 3 && f.dist.get(sp.key) >= 8)) entryOk = false;
  }
  check('entry rules: extras stay in the entry rows and at the min distance', entryOk);
  const tooFar = structuredClone(E); tooFar.grid.entryMinDist = 99;
  check('validator: impossible entry distance is an error', validateLevels([tooFar]).errors.length > 0);
}

// --- M8: sound (synth recipes, sound list, anti-spam voice pool, settings) ------
{
  // every sound renders: right length, not silent, no NaN, never past full scale
  let renders = true, bad = [];
  for (const [id, def] of Object.entries(SOUNDS)) {
    if (!def.synth) continue;
    const data = renderSynth(def.synth, 22050);
    let peak = 0, finite = true;
    for (const v of data) { if (!Number.isFinite(v)) finite = false; peak = Math.max(peak, Math.abs(v)); }
    const lenOk = Math.abs(data.length - Math.ceil(recipeLength(def.synth) * 22050)) <= 1;
    if (!finite || peak < 0.01 || peak > 1 || !lenOk) { renders = false; bad.push(id); }
  }
  check(`sound: every synth recipe renders cleanly${bad.length ? ' (' + bad.join(', ') + ')' : ''}`, renders);
  check('sound: rendering is repeatable (seeded noise)',
    renderSynth(SOUNDS.tower_die.synth, 8000).every((v, i, arr) => v === renderSynth(SOUNDS.tower_die.synth, 8000)[i]) );
  check('sound: every wave shape renders', WAVES.every(w => renderSynth({ wave: w, freq: 440, hold: 0.05 }, 8000).some(v => Math.abs(v) > 0.05)));
  check('sound: a layer starts at its offset',
    (() => { const d = renderSynth({ layers: [{ at: 0.1, wave: 'square', freq: 440, hold: 0.05 }] }, 1000); return d.slice(0, 95).every(v => v === 0) && d.slice(101, 140).some(v => v !== 0); })());

  // the list: valid buses and dials, every weapon and enemy covered
  check('sound list: every sound has a bus, priority, voices and a recipe or file',
    Object.values(SOUNDS).every(d => ['ui', 'sfx', 'music'].includes(d.bus) && d.priority >= 0 && d.priority <= 100 && d.voices >= 1 && (d.synth || d.file)));
  const weapons = [...new Set(Object.values(TOWERS).map(t => t.weapon).filter(w => typeof w === 'string'))];
  check('sound list: every tower weapon has a fire sound', weapons.every(w => SOUNDS[fireSound(w)]));
  check('sound list: every enemy has a death sound', Object.keys(ENEMIES).every(k => SOUNDS[deathSound(k)]));
  check('sound list: heavy weapons outrank rapid fire (Deleter > DDOS > Threader)',
    SOUNDS.fire_sniperRifle.priority > SOUNDS.fire_grenadeLauncher.priority && SOUNDS.fire_grenadeLauncher.priority > SOUNDS.fire_machineGun.priority);
  check('music: a menu track and a wave pool', 'menu' in MUSIC && Array.isArray(MUSIC.waves));
  // wave pool picks (Jogo, 10 Nov)
  const tracks = [{ file: 'a.mp3' }, { file: null }, { file: 'c.mp3' }, { file: 'd.mp3' }];
  let repeats = 0, empties = 0, last = -1;
  for (let i = 0; i < 300; i++) { const n = pickTrack(tracks, last); if (n === last) repeats++; if (!tracks[n]?.file) empties++; last = n; }
  check('music: a wave never repeats the last track when there is a choice', repeats === 0);
  check('music: a wave only picks tracks that have a file', empties === 0);
  check('music: one track is picked again and again', pickTrack([{ file: 'a.mp3' }], 0) === 0);
  check('music: no tracks with a file = silence', pickTrack([{ file: null }], -1) === -1 && pickTrack(undefined, -1) === -1);
  check('music: a new track every 3 waves (waves 1, 4, 7)',
    [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(w => trackChangeDue(w, 3)).join() === '0,3,6');
  check('music: wavesPerTrack 1 changes every wave', [0, 1, 2].every(w => trackChangeDue(w, 1)));
  check('music: the between-waves level is a sensible dial', AUDIO.wavesPerTrack >= 1 && AUDIO.breakLevel > 0 && AUDIO.breakLevel < 1);
  check('music: every pool track gets played', new Set(Array.from({ length: 200 }, (_, i) => pickTrack(tracks, -1, () => (i % 10) / 10))).size === 3);

  // VoicePool: the anti-spam rules
  const gun = { priority: 20, voices: 3, gap: 0.05 }, big = { priority: 80, voices: 2, gap: 0 };
  let pool = new VoicePool(4);
  check('voices: a sound inside its gap is dropped', pool.request('gun', gun, 0, 1).ok && pool.request('gun', gun, 0.02, 1).reason === 'gap');
  pool.request('gun', gun, 0.1, 1); pool.request('gun', gun, 0.2, 1);
  check('voices: a sound at its voice limit is dropped', pool.request('gun', gun, 0.3, 1).reason === 'voices');
  check('voices: finished voices free their slot', pool.request('gun', gun, 1.05, 1).ok);
  pool = new VoicePool(3);
  for (let i = 0; i < 3; i++) pool.request('g' + i, gun, i * 0.1, 5);
  const r = pool.request('boom', big, 0.5, 1);
  check('voices: a full pool cuts its oldest lowest-priority voice for a higher one', r.ok && r.steal?.id === 'g0');
  check('voices: a full pool drops a sound that outranks nothing', pool.request('g9', gun, 0.6, 1).reason === 'busy');
  pool = new VoicePool(2);
  pool.request('a', big, 0, 5); pool.request('b', big, 0, 5);
  check('voices: equal priority never cuts', pool.request('c', big, 0.1, 1).reason === 'busy');
  // a full board firing for 10 s: never more than the cap, and the Deleter is always heard
  pool = new VoicePool(AUDIO.maxVoices);
  let maxNow = 0, deleterDropped = 0;
  for (let t = 0; t < 10; t += 0.01) {
    for (const w of ['machineGun', 'machineGun', 'machineGun', 'pulseRifle', 'pumpShotgun', 'scatterShot']) pool.request(fireSound(w), SOUNDS[fireSound(w)], t, 0.08);
    pool.request('enemy_die', SOUNDS.enemy_die, t, 0.1);
    if (Math.round(t * 100) % 50 === 0 && !pool.request('fire_sniperRifle', SOUNDS.fire_sniperRifle, t, 0.2).ok) deleterDropped++;
    maxNow = Math.max(maxNow, pool.voices.length);
  }
  check(`voices: a full board stays within the cap (${maxNow}/${AUDIO.maxVoices})`, maxNow <= AUDIO.maxVoices);
  check('voices: the Deleter is never drowned out', deleterDropped === 0);

  // the engine is silent and safe with no Web Audio (node, old browsers)
  const eng = new AudioEngine();
  let safe = true;
  try { eng.setSettings({ muted: true }); eng.playMusic('game'); eng.stopMusic(); safe = eng.play('ui_tap') === false && sfx('build') === false; } catch { safe = false; }
  check('audio engine: a no-op without Web Audio', safe);

  // the Sound Mixer's file format
  const { formatSounds, SOUNDS_FILE_HEADER } = await import('../tools/mixer/format.js');
  const text = formatSounds({ AUDIO, SOUNDS, MUSIC });
  check('mixer: a saved file starts with the header serve.py checks', text.startsWith(SOUNDS_FILE_HEADER));
  const back = await import('data:text/javascript;base64,' + (globalThis.Buffer ? Buffer.from(text).toString('base64') : btoa(unescape(encodeURIComponent(text)))));
  check('mixer: a saved file reads back exactly', JSON.stringify(back.SOUNDS) === JSON.stringify(SOUNDS)
    && JSON.stringify(back.AUDIO) === JSON.stringify(AUDIO) && JSON.stringify(back.MUSIC) === JSON.stringify(MUSIC)
    && back.deathSound('crack') === 'enemy_die_big' && back.deathSound('hack') === 'enemy_die');
  if (typeof process !== 'undefined' && process.versions?.node) {
    const fs = await import('node:fs');
    check('sounds.js is exactly what the Mixer would save (no noisy diffs)',
      fs.readFileSync(new URL('../js/sounds.js', import.meta.url), 'utf8') === text);
  }
  check('sound list: every sound has a Mixer group and label', Object.values(SOUNDS).every(d => d.group && d.label));

  // settings in the save
  check('save: new profiles get default sound settings', JSON.stringify(loadSave().audio) === JSON.stringify(AUDIO.defaults));
  {
    const store = { 'tdx-save-v1': JSON.stringify({ bits: 3, audio: { music: 7, muted: 1 } }) };
    globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: () => {}, removeItem: () => {} };
    const a = loadSave().audio;
    delete globalThis.localStorage;
    check('save: broken sound settings are repaired', a.music === AUDIO.defaults.music && a.sfx === AUDIO.defaults.sfx && a.muted === true);
  }
}

// --- M9 Daily Quests ----------------------------------------------------------------
{
  const Q = await import('../js/quests.js');
  const { QUESTS } = await import('../js/config.js');
  const mk = (over = {}) => ({ bits: 0, levelsUnlocked: 3, towersUnlocked: ['threader', 'vault'], quests: null, ...over });
  const at = (d) => new Date(2026, 10, 11 + d, 12);   // local noon, d days after 11 Nov
  const sets = [];
  for (let d = 0; d < 200; d++) { const s = mk(); Q.ensureQuests(s, {}, at(d)); sets.push(s.quests.set); }
  check('quests: the same day always gives the same set', (() => { const s = mk(); Q.ensureQuests(s, {}, at(5)); return JSON.stringify(s.quests.set) === JSON.stringify(sets[5]); })());
  check('quests: sets change from day to day', new Set(sets.map(s => s.map(e => e.id).join())).size > 20);
  check('quests: 3 a day, one from each tier', sets.every(s => s.length === 3 && s.map(e => Q.questDef(e.id).tier).join() === 'easy,medium,hard'));
  check('quests: Victory Lap and Marathon never on the same day', sets.every(s => !(s.some(e => e.id === 'wins') && s.some(e => e.id === 'marathon'))));
  check('quests: every pool quest except Hard Mode turns up', QUESTS.pool.filter(d => d.id !== 'advanced').every(d => sets.some(s => s.some(e => e.id === d.id))));
  check('quests: Hard Mode waits for Advanced to exist', !sets.some(s => s.some(e => e.id === 'advanced')));
  {
    let seen = false;
    for (let d = 0; d < 200 && !seen; d++) { const s = mk(); Q.ensureQuests(s, { advancedOpen: (_, i) => i === 1 }, at(d)); seen = s.quests.set.some(e => e.id === 'advanced'); }
    check('quests: Hard Mode shows once a level is open on Advanced', seen);
  }
  {
    const all = [...TOWER_ORDER];
    let bp = false;
    for (let d = 0; d < 100; d++) { const s = mk({ towersUnlocked: all }); Q.ensureQuests(s, {}, at(d)); bp ||= s.quests.set.some(e => e.id === 'blueprints'); }
    check('quests: no Blueprint quest once every tower is collected', !bp);
  }
  check('quests: Specialist names an unlocked tower other than the Threader',
    sets.flat().filter(e => e.id === 'specialist').every(e => e.tower === 'vault'));
  check('quests: Pest Control names an enemy from the open levels, more for swarms',
    sets.flat().filter(e => e.id === 'pest').every(e => Q.enemiesMet(mk()).includes(e.enemy) && e.target === (QUESTS.swarm.includes(e.enemy) ? 75 : 25)));
  {
    const target = (lv) => { for (let d = 0; d < 300; d++) { const s = mk({ levelsUnlocked: lv }); Q.ensureQuests(s, {}, at(d)); const e = s.quests.set.find(x => x.id === 'kills'); if (e) return e.target; } };
    check('quests: targets grow with the player\'s furthest level', target(10) > target(1) * 4);
  }
  check('quests: targets round to two figures', Q.niceNumber(4687) === 4700 && Q.niceNumber(23.4) === 23 && Q.niceNumber(0.2) === 1);

  // progress
  const s = mk(); Q.ensureQuests(s, {}, at(0));
  s.quests.set = [{ id: 'kills', bits: 2, target: 100 }, { id: 'wins', bits: 2, target: 2 }, { id: 'firewall', bits: 3, target: 1 }];
  s.quests.progress = [0, 0, 0]; s.quests.claimed = [false, false, false];
  const stats = { kills: 60, built: 5, upgraded: 0, spent: 0, earned: 0, damage: 0, bps: 0, lost: 0, leakedBy: {}, builtBy: {}, killedBy: {} };
  check('quests: mid-run progress shows, "win" quests wait for the end', JSON.stringify(Q.liveProgress(s, stats)) === '[60,0,0]');
  check('quests: the Tutorial never counts', Q.commitRun(s, stats, { win: true }, { tutorial: true }).length === 0 && s.quests.progress[0] === 0);
  check('quests: a lost run still counts, except the wins', Q.commitRun(s, stats, { win: false }, {}).length === 0 && JSON.stringify(s.quests.progress) === '[60,0,0]');
  const leaky = { ...stats, leakedBy: { hack: 1 } };
  const done = Q.commitRun(s, leaky, { win: true }, {});
  check('quests: a win finishes count quests and is capped; a leak spoils Firewall', JSON.stringify(done) === '[0]' && JSON.stringify(s.quests.progress) === '[100,1,0]');
  check('quests: one quest to collect', Q.claimable(s) === 1);
  check('quests: an unfinished quest cannot be claimed', Q.claim(s, 1, at(0)) === 0 && s.bits === 0);
  check('quests: claiming pays its BITS once', Q.claim(s, 0, at(0)) === 2 && Q.claim(s, 0, at(0)) === 0 && s.bits === 2);
  check('quests: first claim starts a 1 day streak', Q.streakNow(s, at(0)) === 1);
  const lean = { id: 'lean', bits: 3, target: 1, limit: 10 };
  check('quests: Lean Machine counts a win with few enough towers', Q.runAmount(lean, { ...stats, built: 10 }, { win: true }) === 1 && Q.runAmount(lean, { ...stats, built: 11 }, { win: true }) === 0);
  check('quests: Hard Mode needs an Advanced win', Q.runAmount({ id: 'advanced', target: 1 }, stats, { win: true, difficulty: 'basic' }) === 0
    && Q.runAmount({ id: 'advanced', target: 1 }, stats, { win: true, difficulty: 'advanced' }) === 1);
  check('quests: Specialist and Pest Control read the per-type counts',
    Q.runAmount({ id: 'specialist', tower: 'vault' }, { ...stats, builtBy: { vault: 4 } }) === 4 && Q.runAmount({ id: 'pest', enemy: 'worm' }, { ...stats, killedBy: { worm: 7 } }) === 7);

  // rollover + streak
  Q.ensureQuests(s, {}, at(1));
  check('quests: a new day brings a new set with progress cleared', s.quests.day === Q.dayNumber(at(1)) && s.quests.progress.every(n => n === 0) && s.quests.claimed.every(c => !c));
  check('quests: the streak survives the next day before a claim', Q.streakNow(s, at(1)) === 1);
  Q.debugCompleteAll(s);
  check('debug: Complete all = finished but not claimed', Q.claimable(s) === 3 && s.quests.claimed.every(c => !c));
  Q.claim(s, 0, at(1)); Q.claim(s, 1, at(1));
  check('quests: claiming on the next day grows the streak (once a day)', s.quests.streak === 2 && s.quests.bestStreak === 2);
  check('quests: a whole day with no claim breaks the streak', Q.streakNow(s, at(3)) === 0);
  Q.ensureQuests(s, {}, at(3)); Q.debugCompleteAll(s); Q.claim(s, 2, at(3));
  check('quests: claiming after a gap starts again at 1, best is kept', s.quests.streak === 1 && s.quests.bestStreak === 2);
  const seed = s.quests.seed; s.quests.progress[0] = 5;
  Q.debugReroll(s, {}, at(3));
  check('debug: Reroll rolls again and clears progress', s.quests.seed === seed + 1 && s.quests.progress.every(n => n === 0));
  const day = s.quests.day; Q.debugNextDay(s, {}, at(3));
  check('debug: Next day moves the quest clock on one day', s.quests.day === day + 1 && Q.today(s, at(3)) === day + 1);
  Q.debugBreakStreak(s);
  check('debug: Break streak', Q.streakNow(s, at(3)) === 0);

  // save
  check('save: new profiles get an empty quest block', JSON.stringify(loadSave().quests) === JSON.stringify(Q.questDefaults()));
  {
    const store = { 'tdx-save-v1': JSON.stringify({ bits: 3, quests: { day: 5, set: [{ id: 'nope' }], progress: 'x', streak: 'y' } }) };
    globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: () => {}, removeItem: () => {} };
    const q = loadSave().quests;
    delete globalThis.localStorage;
    check('save: a broken quest block is repaired', q.set.length === 0 && q.day === null && q.streak === 0);
  }
  check('quest text fills in numbers and names', Q.questText({ id: 'specialist', target: 6, tower: 'ddos' }) === 'Build 6 DDOS towers'
    && Q.questText({ id: 'kills', target: 10000 }) === 'Destroy 10,000 enemies'
    && Q.questText({ id: 'kills', target: 5 }, { Quest_kills: 'Zap {n} bugs' }) === 'Zap 5 bugs');
}

// --- M9 Difficulty: Basic / Advanced ---------------------------------------------
{
  const { DIFFICULTY, effectiveDelta } = await import('../js/config.js');
  const S = await import('../js/save.js');
  const L5 = LEVELS[5];
  const adv = effectiveDelta(L5, 'advanced'), bas = effectiveDelta(L5, 'basic');
  check('difficulty: Advanced is the level as balanced', adv.health === L5.enemyDelta.health && adv.damage === L5.enemyDelta.damage);
  check('difficulty: Basic scales HP and damage by DIFFICULTY.basic',
    Math.abs(bas.health - L5.enemyDelta.health * DIFFICULTY.basic.health) < 1e-6 && Math.abs(bas.damage - L5.enemyDelta.damage * DIFFICULTY.basic.damage) < 1e-6);
  check('difficulty: Basic is easier than Advanced on every non-Tutorial level',
    LEVELS.every(l => l.tutorial || (effectiveDelta(l, 'basic').health <= l.enemyDelta.health && effectiveDelta(l, 'basic').damage <= l.enemyDelta.damage)));
  check('difficulty: the Tutorial ignores difficulty', LEVELS[0].tutorial
    && effectiveDelta(LEVELS[0], 'basic').health === LEVELS[0].enemyDelta.health);
  check('difficulty: Basic changes enemy HP in a wave', new Enemy('hack', grid.spawns[0], new PathField(grid), grid, bas).maxHealth
    < new Enemy('hack', grid.spawns[0], new PathField(grid), grid, adv).maxHealth);

  const fresh = loadSave();
  check('save v3: fresh save has empty clear records', S.SAVE_VERSION === 3 && fresh.cleared.basic.length === 0 && fresh.cleared.advanced.length === 0);
  S.recordClear(fresh, 0, 'basic');
  check('save: Tutorial has no Advanced', !S.advancedOpen(fresh, 0) && S.isCleared(fresh, 0, 'basic'));
  check('save: Advanced is closed until Basic is cleared', !S.advancedOpen(fresh, 1));
  S.recordClear(fresh, 1, 'basic');
  check('save: a Basic clear opens Advanced', S.advancedOpen(fresh, 1) && !S.isCleared(fresh, 1, 'advanced'));
  S.recordClear(fresh, 2, 'advanced');
  check('save: an Advanced clear also counts on Basic', S.isCleared(fresh, 2, 'basic') && S.isCleared(fresh, 2, 'advanced'));
  S.recordClear(fresh, 2, 'advanced');
  check('save: clears are recorded once', fresh.cleared.basic.filter(i => i === 2).length === 1);

  const mk = (data) => {
    const store = { 'tdx-save-v1': JSON.stringify(data) };
    globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: () => {}, removeItem: () => {} };
    const out = loadSave();
    delete globalThis.localStorage;
    return out;
  };
  const old = mk({ saveVersion: 2, levelsUnlocked: 4, towersUnlocked: ['threader'] });
  check('save v2 → v3: beaten levels count on Basic and Advanced (D4)',
    old.saveVersion === 3 && [0, 1, 2, 3].every(i => S.isCleared(old, i, 'basic'))
    && [1, 2, 3].every(i => S.isCleared(old, i, 'advanced')) && !S.isCleared(old, 0, 'advanced'));
  check('save v2 → v3: the frontier level opens on Basic only', !S.isCleared(old, 4, 'basic') && !S.advancedOpen(old, 4));
  const v1 = mk({ levelsUnlocked: 2, towersUnlocked: ['threader'] });
  check('save v1 → v3: Tutorial slide then clears', v1.levelsUnlocked === 3 && S.isCleared(v1, 2, 'advanced'));
  const junk = mk({ saveVersion: 3, levelsUnlocked: 1, cleared: { basic: [0, 0, -1, 'x'], advanced: null } });
  check('save v3: a broken clear record is repaired', junk.cleared.basic.join() === '0' && Array.isArray(junk.cleared.advanced));
}

// --- M9 run recorder ---------------------------------------------------------------
{
  const { Recorder } = await import('../js/recorder.js');
  const g = new HexGrid(LEVELS[3].grid); g.layout(390, 620);
  const st = { time: 5, levelIndex: 3, level: LEVELS[3], difficulty: 'advanced', tokens: 390, lives: 15, phase: 'build', waveIndex: 0, towers: [], enemies: [], stats: { built: 1 } };
  const rec = new Recorder();
  rec.start(st, g, { towersUnlocked: ['threader'], tierUnlocks: {} });
  const cell = [...g.cells.values()].find(c => !c.blocker);
  const tw = new Tower('threader', cell); st.towers.push(tw); st.tokens -= 100;
  rec.build(st, tw);
  st.phase = 'wave'; st.time = 9; rec.waveStart(st);
  rec.tick(st, 2.5);
  rec.kill(st, { def: { reward: 30 } });
  st.lives = 14; rec.leaked(st, { type: 'hack' });
  st.time = 40; st.phase = 'build';
  const run = JSON.parse(rec.finish(st, false));
  check('recorder: run has the level, board and a build with its cell', run.level === 3 && run.difficulty === 'advanced'
    && Array.isArray(run.board.spawns) && run.events[0].e === 'build' && run.events[0].cell.length === 2 && run.events[0].ph === 'b');
  check('recorder: wave summary and samples', run.waves.length === 1 && run.waves[0].kills === 1 && run.waves[0].leaks === 1
    && run.waves[0].start === 4 && run.samples.length === 1 && run.sampleCols.length === run.samples[0].length);
  check('recorder: off by default and stops after finish', !rec.on && loadSave().recordRuns === false);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
