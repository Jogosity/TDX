// TDX — game state machine and main loop.

import { PLAYER, TOWERS, TOWER_ORDER, ENEMIES, LEVELS, UPGRADE, BLUEPRINTS, CRASH } from './config.js';
import { loadSave, writeSave, clearSave } from './save.js';
import { crashShuffle } from './crash.js';
import { placeBlockers, placeLockouts, placeExtraSpawns } from './board.js';
import { HexGrid } from './hex.js';
import { PathField } from './path.js';
import { Tower, Enemy, cellPx } from './entities.js';
import { WaveController } from './waves.js';
import { Renderer, makeConfetti } from './render.js';
import { UI } from './ui.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new Renderer(this.canvas);
    this.grid = null;
    this.field = null;
    this.spawnPaused = false;   // debug: hold natural wave spawning

    this.save = loadSave();

    this.state = {
      grid: null,
      phase: 'build', // build | wave | levelComplete | gameOver
      level: LEVELS[0],
      levelIndex: 0,
      waveIndex: 0,
      tokens: LEVELS[0].startTokens ?? PLAYER.startTokens,
      bits: this.save.bits,
      lives: PLAYER.startLives,
      maxLives: PLAYER.startLives,
      towers: [],
      enemies: [],
      projectiles: [],
      effects: [],
      drops: [],            // blueprint drops awaiting a tap
      placing: null,        // { type, cell, legal }
      selectedTower: null,
      baseFlash: 0,
      shake: 0,             // 1 → 0 screenshake envelope
      crashFx: null,        // { t, dur } while the CRASH caption glitches
      time: 0,
    };

    this.wave = null;
    this.pendingCrash = null;                    // seconds until a scheduled crash lands
    this.wavesToCrash = this.rollCrashInterval();
    this.ui = new UI(this);

    window.addEventListener('resize', () => this.layout());

    this.initLevel(this.latestLevelIndex());
    this.ui.refresh();
    this.ui.showMainMenu();   // boot lands on the main menu, not the battlefield

    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  // --- level lifecycle --------------------------------------------------------
  latestLevelIndex() {
    return Math.min(this.save.levelsUnlocked, LEVELS.length - 1);
  }

  // Build (or rebuild) the battlefield for a level and reset the run state.
  initLevel(idx) {
    const s = this.state;
    s.levelIndex = idx;
    s.level = LEVELS[idx];
    this.grid = new HexGrid(s.level.grid);
    this.field = new PathField(this.grid);
    s.grid = this.grid;

    s.phase = 'build';
    s.waveIndex = 0;
    s.tokens = s.level.startTokens ?? PLAYER.startTokens;
    s.lives = PLAYER.startLives;
    s.towers = [];
    s.enemies = [];
    s.projectiles = [];
    s.effects = [];
    s.drops = [];
    s.placing = null;
    s.selectedTower = null;
    s.baseFlash = 0;
    s.shake = 0;
    s.crashFx = null;
    this.wave = null;
    this.pendingCrash = null;
    this.wavesToCrash = this.rollCrashInterval();

    this.layout();
    // order matters: extra entry points first, then blockers (whose firewall
    // check must cover every spawn), then passable lockouts
    if (s.level.spawns > 1) placeExtraSpawns(this.grid, this.field, s.level.spawns - 1);
    placeBlockers(this.grid, this.field, s.level.blockers);
    placeLockouts(this.grid, s.level.lockouts);
    this.field.recompute();
  }

  layout() {
    if (!this.grid) return;
    this.renderer.resize();
    this.grid.layout(this.renderer.w, this.renderer.h);
    // entity pixel positions derive from cells; rebuild enemy paths
    for (const t of this.state.towers) { t.x = t.cell.x; t.y = t.cell.y; }
    for (const e of this.state.enemies) if (e.alive) e.buildPath(this.field, this.grid);
  }

  // --- placement -------------------------------------------------------------
  startPlacing(type) {
    this.state.placing = { type, cell: null, legal: false };
    this.selectTower(null);
  }

  cancelPlacing() { this.state.placing = null; }

  onHover(x, y) {
    const p = this.state.placing;
    if (!p) return;
    const cell = this.grid.cellAt(x, y);
    p.cell = cell;
    p.legal = cell ? this.isLegalPlacement(cell) : false;
  }

  onTap(x, y) {
    // blueprint drops take tap priority — they're small and time-limited
    if (this.collectDropAt(x, y)) return;
    const p = this.state.placing;
    const cell = this.grid.cellAt(x, y);
    if (p) {
      if (!cell) { this.ui.clearSelection(); return; }
      p.cell = cell;
      p.legal = this.isLegalPlacement(cell);
      if (!p.legal) {
        this.ui.toast(this.placementError(cell));
        return;
      }
      this.buildTower(p.type, cell);
      this.ui.clearSelection();
      return;
    }
    // select / deselect a tower
    if (cell && cell.tower) this.selectTower(cell.tower);
    else this.selectTower(null);
  }

  isLegalPlacement(cell) {
    if (cell.occupied || cell.spawn || cell.lockout) return false;
    if (this.state.tokens < TOWERS[this.state.placing.type].cost) return false;
    if (this.field.wouldFirewall(cell, this.state.enemies)) return false;
    return true;
  }

  placementError(cell) {
    if (cell.tower) return 'Cell already holds a tower';
    if (cell.blocker) return 'Cell is blocked';
    if (cell.spawn) return 'Cannot build on a spawn zone';
    if (cell.lockout) return 'LOCKOUT — enemy-held cell';
    if (this.state.tokens < TOWERS[this.state.placing.type].cost) return 'Not enough Tokens';
    return 'FIREWALL — path must stay open';
  }

  buildTower(type, cell) {
    const def = TOWERS[type];
    this.state.tokens -= def.cost;
    const tower = new Tower(type, cell);
    cell.tower = tower;
    this.state.towers.push(tower);
    this.onPathChanged();
    this.ui.refresh();
  }

  selectTower(tower) {
    this.state.selectedTower = tower;
    if (tower) this.ui.showTowerPopup(tower);
    else this.ui.hideTowerPopup();
  }

  // --- upgrades (Retention Module 1) ------------------------------------------
  // Tier access is per tower TYPE: unlocking Tier 3 for Threaders doesn't
  // touch Deleters. Absent from the save = Tier 1 only.
  tierUnlockOf(type) { return this.save.tierUnlocks[type] || 1; }

  // Can this tower take its next tier right now? Returns { ok, reason }.
  upgradeStatus(tower) {
    if (tower.upgrading) return { ok: false, reason: 'upgrading' };
    if (tower.tier >= UPGRADE.maxTier) return { ok: false, reason: 'max' };
    if (tower.tier + 1 > this.tierUnlockOf(tower.type)) return { ok: false, reason: 'locked' };
    if (this.state.tokens < tower.upgradeCost) return { ok: false, reason: 'tokens' };
    return { ok: true };
  }

  upgradeSelected() {
    const t = this.state.selectedTower;
    if (!t) return;
    const st = this.upgradeStatus(t);
    if (!st.ok) {
      if (st.reason === 'locked') this.ui.showUpgradeMenu();
      else if (st.reason === 'tokens') this.ui.toast('Not enough Tokens');
      return;
    }
    this.state.tokens -= t.upgradeCost;
    t.spent += t.upgradeCost;
    t.beginUpgrade();
    this.ui.refresh();
    this.ui.showTowerPopup(t); // reflect new state immediately
  }

  // Unlock the NEXT tier for one tower type, paid in BITS.
  unlockTier(type) {
    const next = this.tierUnlockOf(type) + 1;
    const cost = UPGRADE.tierUnlockBits[next];
    if (cost === undefined) return; // already at max tier
    if (this.save.bits < cost) { this.ui.toast('Not enough BITS'); return; }
    this.save.bits -= cost;
    this.save.tierUnlocks[type] = next;
    writeSave(this.save);
    this.state.bits = this.save.bits;
    this.ui.toast(`${TOWERS[type].name} Tier ${next} unlocked`);
    this.ui.refresh();
  }

  // --- blueprints (Collection Core) ---------------------------------------------
  isTowerUnlocked(type) { return this.save.towersUnlocked.includes(type); }

  bpCount(type) { return this.save.blueprints[type] || 0; }

  // A drop belongs to a random still-locked tower from this level's bpPool.
  rollBlueprint(x, y) {
    const pool = (this.state.level.bpPool || []).filter(k => !this.isTowerUnlocked(k));
    if (pool.length === 0) return;                 // everything here is unlocked
    if (Math.random() >= BLUEPRINTS.dropChance) return;
    const tower = pool[Math.floor(Math.random() * pool.length)];
    this.state.drops.push({ x, y, age: 0, tower, color: TOWERS[tower].color });
  }

  collectDropAt(x, y) {
    const drops = this.state.drops;
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      if (Math.hypot(d.x - x, d.y - y) <= BLUEPRINTS.tapRadius) {
        drops.splice(i, 1);
        const def = TOWERS[d.tower];
        const n = (this.save.blueprints[d.tower] || 0) + 1;
        this.save.blueprints[d.tower] = n;
        this.state.effects.push({ kind: 'death', x: d.x, y: d.y, color: d.color, t: 0, dur: 0.4 });
        if (n >= def.blueprints && !this.isTowerUnlocked(d.tower)) {
          this.save.towersUnlocked.push(d.tower);   // instant unlock, mid-game
          this.ui.toast(`${def.name.toUpperCase()} UNLOCKED`);
        } else {
          this.ui.toast(`${def.name} Blueprint (${n}/${def.blueprints})`);
        }
        writeSave(this.save);
        this.ui.refresh();
        return true;
      }
    }
    return false;
  }

  // --- debug menu API -------------------------------------------------------------
  debugAddTokens(n) { this.state.tokens += n; this.ui.refresh(); }

  debugAddBits(n) {
    this.save.bits += n;
    writeSave(this.save);
    this.state.bits = this.save.bits;
    this.ui.refresh();
  }

  debugUnlockAllTowers() {
    this.save.towersUnlocked = [...TOWER_ORDER];
    writeSave(this.save);
    this.ui.refresh();
  }

  debugLockAllTowers() {
    this.save.towersUnlocked = ['threader'];
    this.save.blueprints = {};    // restart the collection loop cleanly
    writeSave(this.save);
    this.ui.refresh();
  }

  debugUnlockAllLevels() {
    this.save.levelsUnlocked = LEVELS.length - 1;
    writeSave(this.save);
    this.ui.refresh();
  }

  debugLockAllLevels() {
    this.save.levelsUnlocked = 0;
    writeSave(this.save);
    this.ui.refresh();
  }

  debugResetAll() { clearSave(); window.location.reload(); }

  debugQuitToMenu() { window.location.reload(); } // boot lands on the main menu

  debugSpawnEnemy(type) {
    if (!ENEMIES[type]) return;
    const spawns = this.grid.spawns;
    const cell = spawns[Math.floor(Math.random() * spawns.length)];
    this.state.enemies.push(new Enemy(type, cell, this.field, this.grid, this.state.level.enemyDelta));
  }

  sellSelected() {
    const t = this.state.selectedTower;
    if (!t) return;
    this.state.tokens += t.sellValue;
    this.removeTower(t);
    this.selectTower(null);
    this.ui.refresh();
  }

  removeTower(tower) {
    tower.alive = false;
    tower.cell.tower = null;
    this.state.towers = this.state.towers.filter(x => x !== tower);
    this.onPathChanged();
  }

  onPathChanged() {
    this.field.recompute();
    for (const e of this.state.enemies) if (e.alive) e.buildPath(this.field, this.grid);
  }

  // --- flow ------------------------------------------------------------------
  // PLAY uses the latest unlocked level; Level Select passes an index.
  startRun(levelIndex = this.latestLevelIndex()) {
    this.initLevel(levelIndex);
    this.ui.hideMainMenu();
    this.ui.refresh();
    this.ui.showBanner(this.state.level.name.toUpperCase(),
      'Viral agents are inbound. Deploy towers to defend the data repo, then start the wave.', 'START WAVE');
  }

  onBannerButton() {
    const s = this.state;
    if (s.phase === 'build') {
      this.ui.hideBanner();
      s.phase = 'wave';
      const def = s.level.waves[s.waveIndex];
      this.wave = new WaveController(def, this.grid, this.field, s.level.enemyDelta);
      // CRASH cadence: every 3–4 waves, striking shortly after the wave opens
      if (--this.wavesToCrash <= 0) {
        this.pendingCrash = CRASH.leadIn;
        this.wavesToCrash = this.rollCrashInterval();
      }
      this.ui.refresh();
    } else if (s.phase === 'levelComplete' || s.phase === 'gameOver') {
      window.location.reload(); // fresh boot lands on the main menu
    }
  }

  onWaveComplete() {
    const s = this.state;
    this.wave = null;
    s.waveIndex++;
    if (s.waveIndex >= s.level.waves.length) {
      s.phase = 'levelComplete';
      this.save.bits += s.level.rewardBits;
      // linear progression: clearing the frontier level unlocks the next
      let unlockNote = '';
      if (s.levelIndex === this.save.levelsUnlocked && s.levelIndex + 1 < LEVELS.length) {
        this.save.levelsUnlocked = s.levelIndex + 1;
        unlockNote = ` ${LEVELS[s.levelIndex + 1].name} unlocked.`;
      }
      writeSave(this.save);
      s.bits = this.save.bits;
      this.ui.refresh();
      this.ui.showBanner('LEVEL COMPLETE', `The repo held. +${s.level.rewardBits} BITS earned.${unlockNote}`, 'MAIN MENU');
    } else {
      s.phase = 'build';
      this.ui.refresh();
      this.ui.showBanner(`WAVE ${s.waveIndex} CLEARED`, 'Rebuild and reinforce, then launch the next wave.', 'START WAVE');
    }
  }

  gameOver() {
    this.state.phase = 'gameOver';
    this.ui.showBanner('REPO BREACHED', 'All memory cores stolen. The system has fallen.', 'MAIN MENU');
  }

  // --- CRASH -----------------------------------------------------------------
  rollCrashInterval() {
    return CRASH.everyMin + Math.floor(Math.random() * (CRASH.everyMax - CRASH.everyMin + 1));
  }

  executeCrash() {
    const s = this.state;
    const destroyed = crashShuffle(this.grid, this.field, CRASH.maxTowerKills);
    for (const t of destroyed) {
      t.alive = false;
      s.effects.push({ kind: 'death', x: t.x, y: t.y, color: '#4ef3ff', t: 0, dur: 0.4 });
      s.effects.push({ kind: 'wreck', x: t.x, y: t.y, t: 0, dur: 2.0 });
    }
    if (destroyed.length > 0) {
      s.towers = s.towers.filter(t => t.alive);
      if (s.selectedTower && !s.selectedTower.alive) this.selectTower(null);
    }
    this.onPathChanged();
    s.shake = 1;
    s.crashFx = { t: 0, dur: CRASH.captionTime };
    this.ui.refresh();
  }

  // an upgrade finishing while the popup is open needs a UI nudge
  syncPopup() {
    const t = this.state.selectedTower;
    if (t && t.justUpgraded) {
      t.justUpgraded = false;
      this.ui.showTowerPopup(t);
      this.ui.refresh();
    }
  }

  // --- main loop ---------------------------------------------------------------
  frame(now) {
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.update(dt);
    this.renderer.draw(this.state);
    requestAnimationFrame((t) => this.frame(t));
  }

  update(dt) {
    const s = this.state;
    s.time += dt;
    s.baseFlash = Math.max(0, s.baseFlash - dt * 2);

    // effects age out
    for (const fx of s.effects) fx.t += dt;
    s.effects = s.effects.filter(fx => fx.t < fx.dur);

    // blueprint drops fade whether or not a wave is running
    for (const d of s.drops) d.age += dt;
    s.drops = s.drops.filter(d => d.age < BLUEPRINTS.lifetime);

    // CRASH timers run regardless of phase so a scheduled crash always lands
    s.shake = Math.max(0, s.shake - dt / CRASH.shakeTime);
    if (s.crashFx) { s.crashFx.t += dt; if (s.crashFx.t >= s.crashFx.dur) s.crashFx = null; }
    if (this.pendingCrash !== null) {
      this.pendingCrash -= dt;
      if (this.pendingCrash <= 0) { this.pendingCrash = null; this.executeCrash(); }
    }

    // Combat simulates during a wave, or whenever debug-spawned enemies exist.
    const inWave = s.phase === 'wave';
    if (!inWave && s.enemies.length === 0) {
      // upgrade timers still run during the between-wave break
      for (const t of s.towers) if (t.upgrading) t.update(dt, s.enemies, s.projectiles, this.grid);
      this.syncPopup();
      return;
    }

    // Limiter auras — non-stacking slow (offline while an upgrade is applying)
    const px = cellPx(this.grid);
    for (const e of s.enemies) e.slow = 1;
    for (const t of s.towers) {
      if (!t.aura || t.aura.type !== 'slow' || t.upgrading) continue;
      const rangePx = t.aura.range * px;
      for (const e of s.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - t.x, e.y - t.y) <= rangePx) {
          e.slow = Math.min(e.slow, t.aura.factor);
        }
      }
    }

    // Debug: spawning can be paused (debug-spawned enemies still arrive)
    if (inWave && !this.spawnPaused) this.wave.update(dt, s.enemies);

    for (const t of s.towers) t.update(dt, s.enemies, s.projectiles, this.grid);
    this.syncPopup();
    for (const e of s.enemies) if (e.alive) e.update(dt, this.grid, s.towers);
    for (const p of s.projectiles) p.update(dt, s.enemies, s.effects);

    // towers destroyed by Virus attacks
    const destroyed = s.towers.filter(t => !t.alive);
    if (destroyed.length > 0) {
      for (const t of destroyed) {
        t.cell.tower = null;
        s.effects.push({ kind: 'death', x: t.x, y: t.y, color: '#4ef3ff', t: 0, dur: 0.4 });
        s.effects.push({ kind: 'wreck', x: t.x, y: t.y, t: 0, dur: 2.0 });
      }
      s.towers = s.towers.filter(t => t.alive);
      this.onPathChanged();
      if (s.selectedTower && !s.selectedTower.alive) this.selectTower(null);
    }

    // enemy resolution: kills pay Tokens, leaks cost lives
    let dirty = false;
    for (const e of s.enemies) {
      if (e.alive || e.resolved) continue;
      e.resolved = true;
      dirty = true;
      if (e.reachedBase) {
        s.lives--;
        s.baseFlash = 1;
        if (s.lives <= 0) { this.gameOver(); return; }
      } else {
        s.tokens += e.def.reward;
        s.effects.push(makeConfetti(e.x, e.y));
        this.rollBlueprint(e.x, e.y);
      }
    }
    s.projectiles = s.projectiles.filter(p => p.alive);
    if (dirty) {
      s.enemies = s.enemies.filter(e => e.alive);
      this.ui.refresh();
    }

    if (inWave && this.wave && this.wave.isComplete(s.enemies)) this.onWaveComplete();
  }
}

new Game();
