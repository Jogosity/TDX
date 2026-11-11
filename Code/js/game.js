// TDX — game state machine and main loop.

import { Tutorial, tutorialTowers, HintBox } from './tutorial.js';
const NEXT_LEVEL_KEY = 'tdx-next-level';
import { PLAYER, TOWERS, TOWER_ORDER, ENEMIES, LEVELS, UPGRADE, BLUEPRINTS, CRASH, effectiveDelta } from './config.js';
import { loadSave, writeSave, clearSave } from './save.js';
import * as saveApi from './save.js';   // M9: optional Difficulty helpers (advancedOpen) for the quests
import * as quests from './quests.js';
import { crashShuffle } from './crash.js';
import { placeBlockers, placeLockouts, placeExtraSpawns, rollBlueprints } from './board.js';
import { HexGrid } from './hex.js';
import { PathField } from './path.js';
import { Tower, Enemy, cellPx } from './entities.js';
import { WaveController } from './waves.js';
import { Renderer, makeConfetti } from './render.js';
import { UI } from './ui.js';
import { Story } from './story.js';
import { loadNarrative, rollRun, memoriesLost } from './narrative.js';
import { audio, sfx } from './audio.js';
import { Recorder } from './recorder.js';   // M9: debug run recorder
import { deathSound, fireSound } from './sounds.js';

// Per-level numbers for the Analytics Report (S20). Tokens earned = kill
// rewards + sell refunds (not starting Tokens); spent = builds + upgrades;
// lost = towers drained or crushed by a CRASH; leakedBy = Cores taken, by enemy.
// M9 (Daily Quests): damage = enemy health removed, bps = Blueprints collected,
// builtBy / killedBy = counts per tower / enemy type.
const newLevelStats = () => ({ built: 0, lost: 0, upgraded: 0, earned: 0, spent: 0, kills: 0, leakedBy: {},
  damage: 0, bps: 0, builtBy: {}, killedBy: {} });

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new Renderer(this.canvas);
    this.grid = null;
    this.field = null;
    this.spawnPaused = false;   // debug: hold natural wave spawning
    this.rec = new Recorder();  // M9: records runs when save.recordRuns is on

    this.save = loadSave();
    if (quests.ensureQuests(this.save, this.questCtx())) writeSave(this.save);   // M9: today's Daily Quests
    audio.setSettings(this.save.audio);   // M8: the SOUND tab's settings

    this.state = {
      grid: null,
      phase: 'build', // build | wave | levelComplete | gameOver
      level: LEVELS[0],
      levelIndex: 0,
      difficulty: 'basic',  // M9: 'basic' | 'advanced' for this run
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
      surge: null,          // 'warn' | 'pour' while a Breach Surge runs (entry points pulse)
      time: 0,
      stats: newLevelStats(),   // Analytics Report (S20)
    };

    this.wave = null;
    this.pendingCrash = null;                    // seconds until a scheduled crash lands
    this.wavesToCrash = this.rollCrashInterval();
    this.ui = new UI(this);
    this.story = new Story();
    this.run = null;                             // this run's archive + memories (M4)
    this.narrativeReady = loadNarrative().then((c) => {
      this.narrative = c;
      // levels with no Level_N rows play without a Level Data screen (M5: 10 levels)
      // S23: the level number is the index (Level 0 = Tutorial)
      LEVELS.forEach((_, i) => { if (!c.levels[i]) c.warnings.push(`Levels: no Level_${i} rows yet (its Level Data screen is skipped)`); });
      if (c.warnings.length) console.warn('TDX narrative:', c.warnings);
      return c;
    });

    window.addEventListener('resize', () => this.layout());

    this.initLevel(this.latestLevelIndex());
    this.ui.refresh();
    this.ui.showMainMenu();   // boot lands on the main menu, not the battlefield
    // S25: Battle Report → Next Level reloads, then starts that level here
    let next = null;
    try { next = sessionStorage.getItem(NEXT_LEVEL_KEY); sessionStorage.removeItem(NEXT_LEVEL_KEY); } catch { /* none */ }
    const [nextIdx, nextDiff] = String(next ?? '').split(':');   // M9: 'index:difficulty'
    if (next !== null && nextIdx !== '' && +nextIdx <= this.latestLevelIndex()) this.startRun(+nextIdx, nextDiff || 'basic');

    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  // --- level lifecycle --------------------------------------------------------
  latestLevelIndex() {
    return Math.min(this.save.levelsUnlocked, LEVELS.length - 1);
  }

  // M9: Advanced only where it's open; the Tutorial is always Basic.
  playableDifficulty(idx, difficulty) {
    return difficulty === 'advanced' && saveApi.advancedOpen(this.save, idx) ? 'advanced' : 'basic';
  }

  // Build (or rebuild) the battlefield for a level and reset the run state.
  initLevel(idx, difficulty = 'basic') {
    const s = this.state;
    s.levelIndex = idx;
    s.level = LEVELS[idx];
    s.difficulty = this.playableDifficulty(idx, difficulty);
    this.grid = new HexGrid(s.level.grid);
    this.field = new PathField(this.grid);
    s.grid = this.grid;

    s.phase = 'build';
    s.waveIndex = 0;
    s.tokens = s.level.startTokens ?? PLAYER.startTokens;
    s.stats = newLevelStats();
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
    s.surge = null;
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
    if (this.collectDropAt(x, y)) {
      if (this.hint && this.hintDrop) this.finishBlueprintHint();
      return;
    }
    if (this.hint && this.hintDrop) return;   // S25: only the Blueprint can be tapped under its hint
    const p = this.state.placing;
    const cell = this.grid.cellAt(x, y);
    if (p) {
      if (!cell) { this.ui.clearSelection(); return; }
      p.cell = cell;
      p.legal = this.isLegalPlacement(cell);
      if (!p.legal) {
        sfx('ui_error');
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
    this.state.stats.built++;
    this.state.stats.spent += def.cost;
    this.state.stats.builtBy[type] = (this.state.stats.builtBy[type] ?? 0) + 1;
    const tower = new Tower(type, cell);
    cell.tower = tower;
    this.state.towers.push(tower);
    this.rec.build(this.state, tower);
    this.onPathChanged();
    sfx('build');
    this.ui.refresh();
    this.tutorial?.event('build', type);
    this.questTick();
  }

  selectTower(tower) {
    this.state.selectedTower = tower;
    if (tower) this.ui.showTowerPopup(tower);
    else this.ui.hideTowerPopup();
  }

  // --- upgrades (Retention Module 1) ------------------------------------------
  // Tier access is per tower TYPE: unlocking Tier 3 for Threaders doesn't
  // touch Deleters. Absent from the save = Tier 1 only.
  tierUnlockOf(type) { return this.inTutorial ? 1 : (this.save.tierUnlocks[type] || 1); }   // S24: Tutorial = Tier 1

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
      if (st.reason === 'locked') { sfx('ui_popup'); this.ui.showUpgradeMenu(); }
      else if (st.reason === 'tokens') { sfx('ui_error'); this.ui.toast('Not enough Tokens'); }
      return;
    }
    this.rec.upgrade(this.state, t);
    this.state.tokens -= t.upgradeCost;
    this.state.stats.upgraded++;
    this.state.stats.spent += t.upgradeCost;
    t.spent += t.upgradeCost;
    t.beginUpgrade();
    sfx('upgrade');
    this.ui.refresh();
    this.questTick();
    this.ui.showTowerPopup(t); // reflect new state immediately
  }

  // Unlock the NEXT tier for one tower type, paid in BITS.
  unlockTier(type) {
    const next = this.tierUnlockOf(type) + 1;
    const cost = UPGRADE.tierUnlockBits[next];
    if (cost === undefined) return; // already at max tier
    if (this.save.bits < cost) { sfx('ui_error'); this.ui.toast('Not enough BITS'); return; }
    this.save.bits -= cost;
    this.save.tierUnlocks[type] = next;
    writeSave(this.save);
    this.state.bits = this.save.bits;
    sfx('unlock');
    this.ui.toast(`${TOWERS[type].name} Tier ${next} unlocked`);
    this.ui.refresh();
  }

  // --- blueprints (Collection Core) ---------------------------------------------
  isTowerUnlocked(type) {
    // S24: the Tutorial overrides the save: Threader on wave 1, + Vault from wave 2
    if (this.inTutorial) return tutorialTowers(this.state.waveIndex).includes(type);
    return this.save.towersUnlocked.includes(type);
  }

  bpCount(type) { return this.save.blueprints[type] || 0; }

  // Each of the level's bpPool slots rolls independently (see BLUEPRINTS).
  // Multiple drops from one kill fan out slightly so each stays tappable.
  rollBlueprint(x, y) {
    const towers = rollBlueprints(this.state.level.bpPool, (k) => this.isTowerUnlocked(k));
    towers.forEach((tower, i) => {
      const a = (Math.PI * 2 * i) / towers.length, off = towers.length > 1 ? 14 : 0;
      this.state.drops.push({ x: x + Math.cos(a) * off, y: y + Math.sin(a) * off, age: 0, tower, color: TOWERS[tower].color });
    });
    if (towers.length) this.blueprintHint(this.state.drops[this.state.drops.length - 1]);
  }

  // S25: the first Blueprint a player ever sees freezes the board under the
  // Screen_8 box; collecting it closes the box (once per save).
  blueprintHint(drop) {
    if (this.hint || this.inTutorial || this.save.hints.blueprint || !this.narrative) return;
    const canvas = this.canvas;
    this.hint = new HintBox({
      text: this.narrative.tutorial.Screen_8,
      point: () => { const r = canvas.getBoundingClientRect(); return { x: r.left + drop.x, y: r.top + drop.y - 10 }; },
      allow: (t) => t === canvas,
      onDone: () => { this.hint = null; },
    });
    this.hintDrop = drop;
  }

  collectDropAt(x, y) {
    const drops = this.state.drops;
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      if (Math.hypot(d.x - x, d.y - y) <= BLUEPRINTS.tapRadius) {
        drops.splice(i, 1);
        sfx('blueprint');
        const def = TOWERS[d.tower];
        const n = (this.save.blueprints[d.tower] || 0) + 1;
        this.save.blueprints[d.tower] = n;
        this.state.stats.bps++;
        this.questTick();
        this.state.effects.push({ kind: 'death', x: d.x, y: d.y, color: d.color, t: 0, dur: 0.4 });
        const unlocks = n >= def.blueprints && !this.isTowerUnlocked(d.tower);
        if (unlocks) this.save.towersUnlocked.push(d.tower);   // instant unlock, mid-game
        writeSave(this.save);                                   // saved now; the UI catches up on landing
        // S21: the Blueprint swoops down to its tower's tray button, then counts
        this.ui.flyBlueprint(d.x, d.y, d.tower, d.color, () => {
          if (unlocks) this.ui.towerUnlocked(d.tower);
          else this.ui.toast(`${def.name} Blueprint (${n}/${def.blueprints})`);
          this.ui.refresh();
        });
        return true;
      }
    }
    return false;
  }

  finishBlueprintHint() {
    this.save.hints.blueprint = true;
    writeSave(this.save);
    this.hintDrop = null;
    this.hint.close();
  }

  // --- Daily Quests (M9) --------------------------------------------------------
  // What the quest rules need from elsewhere: the Difficulty work's
  // advancedOpen(save, i), once it exists (the Advanced quest waits for it).
  questCtx() { return { advancedOpen: saveApi.advancedOpen }; }

  // Mid-level: announce a quest the moment the run finishes it (not saved yet;
  // the run's numbers are added at the end of the level).
  questTick() {
    if (this.inTutorial || !this.save.quests.set.length) return;
    const live = quests.liveProgress(this.save, this.state.stats);
    this.questToasted ??= new Set();
    this.save.quests.set.forEach((e, i) => {
      if (quests.isDone(this.save, i) || this.questToasted.has(i) || !quests.isDone(this.save, i, live)) return;
      this.questToasted.add(i);
      this.ui.alert('good', 'QUEST COMPLETE', quests.questName(e, this.narrative?.strings).toUpperCase(), 2.6);
    });
  }

  // End of a level: add the run to the quests. Returns the Result note line.
  commitQuests(win) {
    const s = this.state;
    const done = quests.commitRun(this.save, s.stats, { win, difficulty: s.difficulty }, s.level);
    if (!done.length) { writeSave(this.save); return ''; }
    writeSave(this.save);
    const names = done.map(i => quests.questName(this.save.quests.set[i], this.narrative?.strings));
    return `Quest${names.length > 1 ? 's' : ''} complete: ${names.join(', ')}.`;
  }

  // Main Menu panel: claim quest i. Returns the BITS paid.
  claimQuest(i) {
    const paid = quests.claim(this.save, i);
    if (paid) { writeSave(this.save); this.state.bits = this.save.bits; }
    return paid;
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
    this.ui.refreshMenu();
  }

  debugLockAllTowers() {
    this.save.towersUnlocked = ['threader'];
    this.save.blueprints = {};    // restart the collection loop cleanly
    writeSave(this.save);
    this.ui.refresh();
    this.ui.refreshMenu();
  }

  debugUnlockAllLevels() {
    this.save.levelsUnlocked = LEVELS.length - 1;
    for (let i = 0; i < LEVELS.length - 1; i++) saveApi.recordClear(this.save, i, 'basic');   // M9: unlocked = cleared on Basic before it
    writeSave(this.save);
    this.ui.refresh();
    this.ui.refreshMenu();
  }

  debugLockAllLevels() {
    this.save.levelsUnlocked = 0;
    this.save.cleared = { basic: [], advanced: [] };   // M9
    writeSave(this.save);
    this.ui.refresh();
    this.ui.refreshMenu();
  }

  debugResetAll() { clearSave(); window.location.reload(); }

  // M9: mark the Tutorial done (Level 1 opens). In the Tutorial itself, back to the menu.
  debugCompleteTutorial() {
    this.save.levelsUnlocked = Math.max(this.save.levelsUnlocked, 1);
    saveApi.recordClear(this.save, 0, 'basic');   // M9
    writeSave(this.save);
    if (this.inTutorial) { window.location.reload(); return; }
    this.ui.refresh();
    this.ui.refreshMenu();
  }

  // M9 Daily Quests debug: reroll (new set, progress cleared), complete all
  // (finished but not claimed), next day (clock +1 day), break the streak.
  debugQuests(action) {
    const ctx = this.questCtx();
    if (action === 'reroll') quests.debugReroll(this.save, ctx);
    if (action === 'complete') quests.debugCompleteAll(this.save);
    if (action === 'nextDay') quests.debugNextDay(this.save, ctx);
    if (action === 'breakStreak') quests.debugBreakStreak(this.save);
    this.questToasted = new Set();
    writeSave(this.save);
    this.ui.refreshMenu();
  }

  debugQuitToMenu() { window.location.reload(); } // boot lands on the main menu

  // Show the Result screen for the current level without playing it.
  async debugPreviewResult(win, lives) {
    const content = await this.narrativeReady;
    this.run ??= rollRun(content, this.state.levelIndex);
    this.state.lives = lives;
    this.state.phase = win ? 'levelComplete' : 'gameOver';
    this.endLevel(win, '(debug preview)');
  }

  // M9 Difficulty debug. Each returns the toast text.
  debugClearNext() {
    const i = this.save.levelsUnlocked;
    saveApi.recordClear(this.save, i, 'basic');
    if (i + 1 < LEVELS.length) this.save.levelsUnlocked = i + 1;
    writeSave(this.save); this.ui.refresh(); this.ui.refreshMenu();
    return `${LEVELS[i].name} cleared on Basic`;
  }
  debugAdvancedAll() {
    for (const i of [...this.save.cleared.basic]) saveApi.recordClear(this.save, i, 'advanced');
    writeSave(this.save); this.ui.refresh(); this.ui.refreshMenu();
    return 'Every Basic clear is now an Advanced clear';
  }
  debugWipeAdvanced() {
    this.save.cleared.advanced = [];
    writeSave(this.save); this.ui.refresh(); this.ui.refreshMenu();
    return 'Advanced clears wiped';
  }

  debugSpawnEnemy(type) {
    if (!ENEMIES[type]) return;
    const spawns = this.grid.spawns;
    const cell = spawns[Math.floor(Math.random() * spawns.length)];
    this.state.enemies.push(new Enemy(type, cell, this.field, this.grid, effectiveDelta(this.state.level, this.state.difficulty)));
  }

  sellSelected() {
    const t = this.state.selectedTower;
    if (!t) return;
    this.rec.sell(this.state, t);
    this.state.tokens += t.sellValue;
    this.state.stats.earned += t.sellValue;
    sfx('sell');
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
  // M4 flow: Level Data → Archive Record → battlefield. Back steps out again.
  // A screen with no content in the CSVs is skipped.
  async startRun(levelIndex = this.latestLevelIndex(), difficulty = 'basic') {
    difficulty = this.playableDifficulty(levelIndex, difficulty);
    const content = await this.narrativeReady;
    const levelNo = levelIndex;   // S23: level number = index (0 = Tutorial)
    this.run = rollRun(content, levelNo);
    const wallet = { tokens: LEVELS[levelIndex].startTokens ?? PLAYER.startTokens, bits: this.save.bits };
    const text = content.levels[levelNo];
    const go = () => { this.story.hide(); this.beginLevel(levelIndex, difficulty); };
    const toLevel = () => (text
      ? this.story.showLevelData(text, { wallet, onBack: () => this.story.hide(), onContinue: toArchive })
      : toArchive());
    const toArchive = () => (this.run
      ? this.story.showArchive(this.run, content.strings, { wallet, onBack: text ? toLevel : () => this.story.hide(), onStart: go,
        tutorial: LEVELS[levelIndex].tutorial ? content.tutorial : null })   // S24: Tutorial overlay
      : go());
    toLevel();
  }

  beginLevel(levelIndex, difficulty = 'basic') {
    this.initLevel(levelIndex, difficulty);
    if (this.save.recordRuns && !this.state.level.tutorial) this.rec.start(this.state, this.grid, this.save);   // M9
    // S24: Level 0 runs the Tutorial (FTUE), the same way every time it's played
    this.tutorial?.destroy();
    this.inTutorial = !!this.state.level.tutorial;
    this.tutorial = this.inTutorial && this.narrative ? new Tutorial(this, this.narrative.tutorial) : null;
    this.ui.hideMainMenu();
    audio.stopMusic();   // M8: the menu music fades; each wave picks its own track
    this.ui.refresh();
    this.buildPhaseBanner(this.state.level.name.toUpperCase(),
      'Viral agents are inbound. Deploy towers to defend the data repo, then start the wave.');
  }

  // The START WAVE banner; in the Tutorial, the wave's tutorial boxes come first.
  buildPhaseBanner(title, text) {
    const show = () => this.ui.showBanner(title, text, 'START WAVE');
    if (this.tutorial?.hasSteps(this.state.waveIndex, 'build')) {
      this.ui.hideBanner();
      this.tutorial.runWave(this.state.waveIndex, show);
    } else show();
  }

  onBannerButton() {
    const s = this.state;
    if (s.phase === 'build') {
      this.ui.hideBanner();
      s.phase = 'wave';
      this.rec.waveStart(s);
      const def = s.level.waves[s.waveIndex];
      this.wave = new WaveController(def, this.grid, this.field, effectiveDelta(s.level, s.difficulty));
      // M8 (Jogo, 10 Nov): a track from the pool runs for 3 waves (AUDIO.wavesPerTrack)
      sfx('wave_start');
      audio.startWaveMusic(s.waveIndex);
      this.tutorial?.waveStarted(s.waveIndex);   // S24: the wave's in-wave tutorial boxes
      // CRASH cadence: every 3–4 waves, striking shortly after the wave opens
      // (S23: never in the Tutorial; it stays about the basics)
      if (!s.level.tutorial && --this.wavesToCrash <= 0) {
        this.pendingCrash = CRASH.leadIn;
        this.wavesToCrash = this.rollCrashInterval();
      }
      this.ui.refresh();
    } else if (s.phase === 'levelComplete' || s.phase === 'gameOver') {
      window.location.reload(); // fresh boot lands on the main menu
    }
  }

  // Breach Surge (S21): the alert strip counts down, then shouts as it pours.
  syncSurge() {
    const s = this.state, sg = this.wave.surge;
    const phase = sg && (sg.state === 'warn' || sg.state === 'pour') ? sg.state : null;
    if (phase === 'warn') {
      const secs = Math.ceil(sg.timer);
      if (secs !== this.surgeCount) { this.surgeCount = secs; this.ui.surgeCountdown(secs); }
    } else if (phase === 'pour' && s.surge !== 'pour') {
      this.ui.surgeBreach();
      s.shake = Math.max(s.shake, 0.5);
    }
    if (phase !== s.surge && phase) this.rec.ev(s, `surge_${phase}`);
    if (!phase) this.surgeCount = null;
    s.surge = phase;
  }

  onWaveComplete() {
    const s = this.state;
    this.rec.waveEnd(s);
    this.wave = null;
    s.waveIndex++;
    if (s.waveIndex >= s.level.waves.length) {
      s.phase = 'levelComplete';
      this.save.bits += s.level.rewardBits;
      saveApi.recordClear(this.save, s.levelIndex, s.difficulty);   // M9
      // linear progression: clearing the frontier level unlocks the next
      let unlockNote = '';
      if (s.levelIndex === this.save.levelsUnlocked && s.levelIndex + 1 < LEVELS.length) {
        this.save.levelsUnlocked = s.levelIndex + 1;
        unlockNote = ` ${LEVELS[s.levelIndex + 1].name} unlocked.`;
      }
      writeSave(this.save);
      s.bits = this.save.bits;
      this.ui.refresh();
      const bitsNote = s.level.rewardBits ? `+${s.level.rewardBits} BITS earned.` : '';   // Tutorial: no rewards
      this.endLevel(true, `${bitsNote}${unlockNote}`.trim());
    } else {
      s.phase = 'build';
      audio.musicBreak(true);   // the track keeps going, lowered, until the next wave
      sfx('wave_clear');
      this.ui.refresh();
      this.buildPhaseBanner(`WAVE ${s.waveIndex} CLEARED`, 'Rebuild and reinforce, then launch the next wave.');
    }
  }

  gameOver() {
    this.state.phase = 'gameOver';
    this.endLevel(false, '');
  }

  // End of a level (M4): hold on the board, verdict over it, then the Result
  // screen slides on. Timings in story.js TIMING.
  endLevel(win, note) {
    this.rec.finish(this.state, win);   // M9: saves the run if recording
    note = [note, this.commitQuests(win)].filter(Boolean).join(' ');
    this.ui.hideBanner();
    this.ui.clearSelection();
    this.selectTower(null);
    this.ui.hideUpgradeMenu();
    audio.stopMusic();                          // M8: the loop fades, the sting plays
    sfx(win ? 'sting_win' : 'sting_fail');
    this.story.showVerdict(win, this.narrative.strings, () => this.showResult(win, note));
  }

  // Level Result (M4): memories lost scale with Cores lost; a loss takes all.
  showResult(win, note) {
    const s = this.state;
    const run = this.run;
    const shown = run ? run.lossOrder.length : 0;
    const lostN = win ? memoriesLost(s.maxLives - s.lives, shown) : shown;
    this.story.showResult(
      { win, lives: Math.max(0, s.lives), maxLives: s.maxLives, run, lost: run ? run.lossOrder.slice(0, lostN) : [], note },
      this.narrative.strings,
      { wallet: { tokens: s.tokens, bits: this.save.bits }, onContinue: () => this.showAnalytics() },
    );
    // S25: the first Result screen that pays Bits explains them (Screen_9, once per save)
    if (win && s.level.rewardBits > 0 && !this.save.hints.bits && this.narrative) {
      setTimeout(() => {
        const bits = document.querySelector('#story .story-wallet div:nth-child(2)');
        if (!bits || this.hint) return;
        this.hint = new HintBox({
          text: this.narrative.tutorial.Screen_9, tick: true, overStory: true, dir: 'up',
          point: () => { const r = bits.getBoundingClientRect(); return { x: r.left + r.width * 0.6, y: r.bottom }; },
          onDone: () => { this.hint = null; this.save.hints.bits = true; writeSave(this.save); },
        });
      }, 2600);
    }
  }

  // Analytics Report (S20): the level in numbers, then back to the menu.
  showAnalytics() {
    this.story.showAnalytics(this.state.stats, this.narrative.strings, {
      wallet: { tokens: this.state.tokens, bits: this.save.bits },
      difficulty: this.state.level.tutorial ? null : this.state.difficulty,   // M9
      onContinue: () => window.location.reload(),
      // S25: after a win, Next Level goes straight into the next level's story screens
      onNext: this.state.phase === 'levelComplete' && this.state.levelIndex + 1 < LEVELS.length
        ? () => this.queueNextLevel(this.state.levelIndex + 1) : null,
    });
  }

  // A fresh boot is the clean way to reset a level, so Next Level reloads with a
  // note to start that level (sessionStorage; falls back to the main menu).
  // M9: it asks for the difficulty just played; startRun drops to Basic if
  // Advanced isn't open on the next level yet (D5).
  queueNextLevel(idx, difficulty = this.state.difficulty) {
    try { sessionStorage.setItem(NEXT_LEVEL_KEY, `${idx}:${difficulty}`); } catch { /* menu instead */ }
    window.location.reload();
  }

  // --- CRASH -----------------------------------------------------------------
  rollCrashInterval() {
    return CRASH.everyMin + Math.floor(Math.random() * (CRASH.everyMax - CRASH.everyMin + 1));
  }

  executeCrash() {
    const s = this.state;
    const destroyed = crashShuffle(this.grid, this.field, CRASH.maxTowerKills);
    sfx('crash');
    s.stats.lost += destroyed.length;
    this.rec.ev(s, 'crash', { killed: destroyed.length });
    for (const t of destroyed) {
      this.rec.lost(s, t, 'crash');
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

  // M8: towers flag what happened this frame (entities stay sound-free for the Sim)
  towerSounds() {
    for (const t of this.state.towers) {
      if (t.fired) { t.fired = false; if (t.def.weapon) sfx(fireSound(t.def.weapon)); }
      if (t.upgradeDone) { sfx(t.upgradeDone === 1 ? 'build_done' : 'upgrade_done'); t.upgradeDone = 0; }
    }
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

    // level over (M4): the board holds still under the verdict and Result screen
    if (s.phase === 'levelComplete' || s.phase === 'gameOver') return;
    // S24: a Tutorial box during a running wave freezes the board until it's dealt with
    if (s.phase === 'wave' && this.tutorial?.update(dt, s.enemies.length)) return;
    if (this.hintDrop) return;   // S25: so does the first-Blueprint hint

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
      this.towerSounds();
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
    this.rec.tick(s, dt);
    if (inWave) this.syncSurge();

    for (const t of s.towers) t.update(dt, s.enemies, s.projectiles, this.grid);
    this.towerSounds();
    this.syncPopup();
    for (const e of s.enemies) if (e.alive) e.update(dt, this.grid, s.towers);
    for (const p of s.projectiles) p.update(dt, s.enemies, s.effects);

    // under-attack warning (M4): any tower being drained right now
    const hit = s.towers.find(t => t.attackedFor > 0);
    if (hit) this.ui.attackWarning(hit.attackedBy);

    // towers destroyed by Virus attacks
    const destroyed = s.towers.filter(t => !t.alive);
    if (destroyed.length > 0) {
      s.stats.lost += destroyed.length;
      sfx('tower_die');
      for (const t of destroyed) {
        this.rec.lost(s, t, 'drain');
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
      s.stats.damage += e.dmgTaken || 0;
      if (e.reachedBase) {
        s.stats.leakedBy[e.type] = (s.stats.leakedBy[e.type] ?? 0) + 1;
        s.lives--;
        this.rec.leaked(s, e);
        s.baseFlash = 1;
        sfx('core_lost');
        if (s.lives <= 0) { this.gameOver(); return; }
      } else {
        s.tokens += e.def.reward;
        this.rec.kill(s, e);
        s.stats.kills++;
        s.stats.killedBy[e.type] = (s.stats.killedBy[e.type] ?? 0) + 1;
        sfx(deathSound(e.type));
        s.stats.earned += e.def.reward;
        s.effects.push(makeConfetti(e.x, e.y));
        this.rollBlueprint(e.x, e.y);
      }
    }
    s.projectiles = s.projectiles.filter(p => p.alive);
    if (dirty) {
      s.enemies = s.enemies.filter(e => e.alive);
      this.ui.refresh();
      this.questTick();
    }

    if (inWave && this.wave && this.wave.isComplete(s.enemies)) this.onWaveComplete();
  }
}

window.tdx = new Game();   // console handle for testing (tdx.state, tdx.ui …)
