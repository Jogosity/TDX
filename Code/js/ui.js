// TDX — DOM HUD, tower tray, and touch/mouse input.

import { TOWERS, TOWER_ORDER, ENEMIES, UPGRADE, LEVELS, VERSION, tierOffer } from './config.js';
import { drawTowerShape, drawEnemyShape } from './render.js';
import { affordableTiers, upgradesAffordable, dotLabel, writeSave, isCleared, advancedOpen } from './save.js';
import { DEFAULT_STRINGS } from './narrative.js';
import { keptRuns } from './recorder.js';
import { audio, sfx } from './audio.js';
import { questText, isDone, claimable, streakNow, msToNextDay, ensureQuests } from './quests.js';

const redDot = (text) => { const d = document.createElement('span'); d.className = 'red-dot'; d.textContent = text; return d; };

// M8: every button clicks. Back-style buttons get the backward blip; a button
// with data-sfx="name" plays that sound instead, and data-sfx="none" stays quiet
// (the game plays its own sound for those, e.g. build, sell, START WAVE).
const BACK_BUTTONS = '.mm-back, .story-back, #um-close, #debug-close, .story-btn.dark';
const buttonSound = (b) => b.dataset.sfx
  ?? (b.matches(BACK_BUTTONS) || /^back$/i.test(b.textContent.trim()) ? 'ui_back' : 'ui_tap');

const ALERT_REARM = 6;   // seconds before another under-attack warning can show

export class UI {
  constructor(game) {
    this.game = game;
    this.el = {
      wave: document.getElementById('wave-label'),
      level: document.getElementById('level-label'),
      lives: document.getElementById('lives-pill'),
      tokens: document.getElementById('tokens-val'),
      bits: document.getElementById('bits-val'),
      tray: document.getElementById('tray'),
      banner: document.getElementById('banner'),
      bannerTitle: document.getElementById('banner-title'),
      bannerText: document.getElementById('banner-text'),
      bannerBtn: document.getElementById('banner-btn'),
      sellPopup: document.getElementById('sell-popup'),
      sellBtn: document.getElementById('sell-btn'),
      upgradeBtn: document.getElementById('upgrade-btn'),
      tiersBtn: document.getElementById('tiers-btn'),
      upgradeMenu: document.getElementById('upgrade-menu'),
      umTiers: document.getElementById('um-tiers'),
      umClose: document.getElementById('um-close'),
      toast: document.getElementById('toast'),
      alert: document.getElementById('alert-strip'),
      alertTitle: document.getElementById('alert-title'),
      alertText: document.getElementById('alert-text'),
      cogBtn: document.getElementById('cog-btn'),
      debugMenu: document.getElementById('debug-menu'),
      debugTabs: document.getElementById('debug-tabs'),
      debugBody: document.getElementById('debug-body'),
      debugClose: document.getElementById('debug-close'),
      mainMenu: document.getElementById('main-menu'),
      mmCog: document.getElementById('mm-cog'),
      mmPlay: document.getElementById('mm-play'),
      mmTowersBtn: document.getElementById('mm-towers-btn'),
      mmEnemiesBtn: document.getElementById('mm-enemies-btn'),
      mmLevelsBtn: document.getElementById('mm-levels-btn'),
      mmTowerList: document.getElementById('mm-tower-list'),
      mmEnemyList: document.getElementById('mm-enemy-list'),
      mmLevelList: document.getElementById('mm-level-list'),
    };
    this.selectedType = null;
    this.toastTimer = null;
    this.buildTray();
    this.bind();
  }

  buildTray() {
    this.trayBtns = {};
    for (const key of TOWER_ORDER) {
      const def = TOWERS[key];
      const btn = document.createElement('button');
      btn.className = 'tray-btn';
      btn.dataset.type = key;
      btn.dataset.sfx = 'none';   // onTrayTap picks select / error
      btn.appendChild(this.towerIcon(key, 68, 17));
      const name = document.createElement('div');
      name.className = 't-name';
      name.textContent = def.name.toUpperCase();
      const cost = document.createElement('div');
      cost.className = 't-cost';
      cost.textContent = def.cost;
      btn.append(name, cost);
      btn.addEventListener('click', () => this.onTrayTap(key, btn));
      this.el.tray.appendChild(btn);
      this.trayBtns[key] = { btn, cost };
    }
    // double-stack the tray once the roster outgrows a phone-width row
    const n = TOWER_ORDER.length;
    const stacked = n > 5;
    this.el.tray.style.setProperty('--tray-cols', stacked ? Math.ceil(n / 2) : n);
    this.el.tray.classList.toggle('stacked', stacked);
  }

  towerIcon(key, sizePx, shapeSize) {
    const def = TOWERS[key];
    const icon = document.createElement('canvas');
    icon.width = sizePx; icon.height = sizePx;
    const ictx = icon.getContext('2d');
    ictx.translate(sizePx / 2, sizePx / 2);
    ictx.shadowColor = def.glow;
    ictx.shadowBlur = 10;
    drawTowerShape(ictx, key, shapeSize, def);
    return icon;
  }

  enemyIcon(key, sizePx) {
    const def = ENEMIES[key];
    const icon = document.createElement('canvas');
    icon.width = sizePx; icon.height = sizePx;
    const ictx = icon.getContext('2d');
    ictx.translate(sizePx / 2, sizePx / 2);
    ictx.shadowColor = def.color;
    ictx.shadowBlur = 10;
    drawEnemyShape(ictx, key, sizePx * 0.62, def.color);
    return icon;
  }

  onTrayTap(key, btn) {
    if (!this.game.isTowerUnlocked(key)) {
      sfx('ui_error');
      const def = TOWERS[key];
      this.toast(`Locked — collect Blueprints (${this.game.bpCount(key)}/${def.blueprints})`);
      return;
    }
    if (this.selectedType === key) {
      sfx('ui_back');
      this.clearSelection();
      return;
    }
    if (this.game.state.tokens < TOWERS[key].cost) {
      sfx('ui_error');
      this.toast('Not enough Tokens');
      return;
    }
    this.clearSelection();
    this.selectedType = key;
    sfx('ui_select');
    btn.classList.add('selected');
    this.game.startPlacing(key);
    this.game.tutorial?.event('select', key);
  }

  clearSelection() {
    this.selectedType = null;
    for (const b of this.el.tray.children) b.classList.remove('selected');
    this.game.cancelPlacing();
  }

  bind() {
    const canvas = this.game.canvas;
    // M8: one listener gives every button its sound
    for (const b of [this.el.sellBtn, this.el.upgradeBtn, this.el.bannerBtn]) b.dataset.sfx = 'none';
    document.addEventListener('click', (ev) => {
      const b = ev.target.closest?.('button');
      if (!b || b.disabled) return;
      const id = buttonSound(b);
      if (id !== 'none') sfx(id);
    }, true);
    canvas.addEventListener('pointerdown', (ev) => {
      const rect = canvas.getBoundingClientRect();
      this.game.onTap(ev.clientX - rect.left, ev.clientY - rect.top);
    });
    canvas.addEventListener('pointermove', (ev) => {
      const rect = canvas.getBoundingClientRect();
      this.game.onHover(ev.clientX - rect.left, ev.clientY - rect.top);
    });
    this.el.bannerBtn.addEventListener('click', () => this.game.onBannerButton());
    this.el.sellBtn.addEventListener('click', () => this.game.sellSelected());
    this.el.upgradeBtn.addEventListener('click', () => this.game.upgradeSelected());
    this.el.tiersBtn.addEventListener('click', () => this.showUpgradeMenu());
    this.el.umClose.addEventListener('click', () => this.hideUpgradeMenu());
    this.el.cogBtn.addEventListener('click', () => this.showDebugMenu());
    this.el.mmCog.addEventListener('click', () => this.showDebugMenu());
    this.el.debugClose.addEventListener('click', () => this.hideDebugMenu());
    // M4: PLAY → Level Select. S23: until the Tutorial (Level 0) is cleared, PLAY goes straight into it.
    this.el.mmPlay.addEventListener('click', () => (this.game.save.levelsUnlocked === 0 && LEVELS[0]?.tutorial
      ? this.game.startRun(0) : this.showMenuScreen('mm-levels')));
    this.el.mmTowersBtn.addEventListener('click', () => this.showMenuScreen('mm-towers'));
    this.el.mmEnemiesBtn.addEventListener('click', () => this.showMenuScreen('mm-enemies'));
    this.el.mmLevelsBtn.addEventListener('click', () => this.showMenuScreen('mm-levels'));
    // Level Select PLAY: plays the selected (latest unlocked) level; tapping a row still works too
    document.getElementById('mm-levels-play')
      .addEventListener('click', () => this.playLevel(this.game.latestLevelIndex()));
    for (const b of document.querySelectorAll('.mm-back')) {
      b.addEventListener('click', () => this.showMenuScreen('mm-home'));
    }
  }

  refresh() {
    const s = this.game.state;
    this.el.level.textContent = s.level.tutorial ? 'Tutorial' : `Level ${s.levelIndex}`;   // S23: number = index
    // M9 (D6): a small difficulty tag beside "Level N" (none in the Tutorial)
    if (!s.level.tutorial) {
      const tag = document.createElement('span');
      tag.className = `diff-tag ${s.difficulty}`;
      tag.textContent = s.difficulty === 'advanced' ? 'ADV' : 'BASIC';
      this.el.level.appendChild(tag);
    }
    // M9: red REC while the run recorder is logging this level
    if (this.game.rec?.on) {
      const rec = document.createElement('span');
      rec.className = 'rec-tag';
      rec.textContent = '● REC';
      this.el.level.appendChild(rec);
    }
    this.el.wave.textContent = `Wave ${Math.min(s.waveIndex + 1, s.level.waves.length)}/${s.level.waves.length}`;
    this.el.lives.textContent = `${s.lives}/${s.maxLives}`;
    this.el.tokens.textContent = s.tokens;
    this.el.bits.textContent = s.bits;
    for (const key of TOWER_ORDER) {
      const { btn, cost } = this.trayBtns[key];
      const def = TOWERS[key];
      const bpLocked = !this.game.isTowerUnlocked(key);
      btn.classList.toggle('bp-locked', bpLocked);
      cost.classList.toggle('bp-need', bpLocked);
      cost.textContent = bpLocked ? `${this.game.bpCount(key)}/${def.blueprints}` : def.cost;
      const affordable = !bpLocked && s.tokens >= def.cost;
      btn.classList.toggle('locked', !bpLocked && !affordable);
      if (!affordable && this.selectedType === key) this.clearSelection();
    }
    // keep the tower popup honest while tokens change underneath it
    if (s.selectedTower && this.el.sellPopup.style.display === 'block') {
      this.el.sellBtn.textContent = `SELL +${s.selectedTower.sellValue}`;
      this.refreshUpgradeBtn(s.selectedTower);
    }
  }

  showBanner(title, text, btnLabel) {
    this.el.bannerTitle.textContent = title;
    this.el.bannerText.textContent = text;
    if (btnLabel) {
      this.el.bannerBtn.style.display = '';
      this.el.bannerBtn.textContent = btnLabel;
    } else {
      this.el.bannerBtn.style.display = 'none';
    }
    this.el.banner.classList.add('show');
  }

  hideBanner() { this.el.banner.classList.remove('show'); }

  showTowerPopup(tower) {
    this.el.sellBtn.textContent = `SELL +${tower.sellValue}`;
    this.refreshUpgradeBtn(tower);
    this.el.sellPopup.style.display = 'block';
    this.el.sellPopup.style.left = `${tower.x}px`;
    this.el.sellPopup.style.top = `${tower.y}px`;
  }

  refreshUpgradeBtn(tower) {
    const btn = this.el.upgradeBtn;
    const st = this.game.upgradeStatus(tower);
    btn.classList.remove('locked');
    btn.disabled = false;
    if (tower.upgrading) {
      btn.textContent = 'UPGRADING…';
      btn.disabled = true;
    } else if (tower.tier >= UPGRADE.maxTier) {
      btn.textContent = 'MAX TIER';
      btn.disabled = true;
    } else if (st.reason === 'locked') {
      btn.textContent = `TIER ${tower.tier + 1} LOCKED`;
      btn.classList.add('locked'); // tap opens the Upgrade Menu
    } else {
      const p = tower.def.power;
      const power = p && p.tier === tower.tier + 1 ? ` · ★ ${p.name.toUpperCase()}` : '';
      btn.textContent = `TIER ${tower.tier + 1} −${tower.upgradeCost}${power}`;
      btn.disabled = st.reason === 'tokens';
    }
  }

  hideTowerPopup() { this.el.sellPopup.style.display = 'none'; }

  // Tier unlocks are per tower TYPE. Only the next tier is offered — one
  // unlock control at a time, on the right-hand side of the tower's row.
  // Returns a span (state) or a button (unlock) for that right-hand slot.
  tierControl(type, onChange) {
    const cur = this.game.tierUnlockOf(type);
    if (!this.game.isTowerUnlocked(type)) {
      const s = document.createElement('span');
      s.className = 'um-state';
      s.textContent = 'TOWER LOCKED';
      return s;
    }
    if (cur >= UPGRADE.maxTier) {
      const s = document.createElement('span');
      s.className = 'um-state';
      s.textContent = 'MAX TIER';
      return s;
    }
    const cost = UPGRADE.tierUnlockBits[cur + 1];
    const btn = document.createElement('button');
    btn.className = 'mi-unlock';
    btn.textContent = `UNLOCK T${cur + 1} ◆${cost}`;
    btn.disabled = this.game.save.bits < cost;
    btn.addEventListener('click', () => { this.game.unlockTier(type); onChange?.(); });
    return btn;
  }

  // Per-tower tier list for the in-game ◆ TIERS menu.
  buildTierList(container) {
    container.innerHTML = '';
    for (const key of TOWER_ORDER) {
      const def = TOWERS[key];
      const row = document.createElement('div');
      row.className = 'um-tier';
      if (this.game.tierUnlockOf(key) >= UPGRADE.maxTier) row.classList.add('owned');
      const label = document.createElement('span');
      label.textContent = `${def.name.toUpperCase()} · T${this.game.tierUnlockOf(key)}/${UPGRADE.maxTier}`;
      if (def.power) label.title = `★ ${def.power.name} (Tier ${def.power.tier}): ${def.power.desc}`;
      row.appendChild(label);
      row.appendChild(this.tierControl(key, () => this.buildTierList(container)));
      container.appendChild(row);
    }
  }

  showUpgradeMenu() {
    this.buildTierList(this.el.umTiers);
    this.el.upgradeMenu.classList.add('show');
  }

  hideUpgradeMenu() { this.el.upgradeMenu.classList.remove('show'); }

  // --- main menu ---------------------------------------------------------------
  showMainMenu() {
    this.el.mainMenu.classList.add('show');
    audio.playMusic('menu');   // M8
    const ver = document.getElementById('mm-version');
    if (ver) ver.textContent = `v${VERSION.number} — ${VERSION.codename.toUpperCase()}`;
    this.showMenuScreen('mm-home');
  }

  hideMainMenu() { this.el.mainMenu.classList.remove('show'); }

  showMenuScreen(id) {
    for (const sc of this.el.mainMenu.querySelectorAll('.menu-screen')) {
      sc.classList.toggle('show', sc.id === id);
    }
    this.buildMenuScreen(id);
    this.refreshTowerDot();
  }

  // --- M9 Daily Quests panel (Main Menu, Engagement_Screens.png) ---------------
  // Three cards: in progress (yellow count), done (green count, tap to collect),
  // claimed (dimmed under a tick). Red dot = quests waiting to be collected.
  buildQuestPanel() {
    const panel = document.getElementById('mm-quests');
    if (!panel) return;
    const save = this.game.save;
    if (ensureQuests(save, this.game.questCtx())) writeSave(save);   // a new day while the menu was open
    const q = save.quests, strings = this.game.narrative?.strings ?? {};
    panel.querySelector('.red-dot')?.remove();
    const n = claimable(save);
    if (n > 0) panel.appendChild(redDot(dotLabel(n)));
    const streak = streakNow(save);
    document.getElementById('dq-streak').textContent = streak > 0 ? `${streak} day streak` : '';
    const cards = document.getElementById('dq-cards');
    cards.innerHTML = '';
    q.set.forEach((e, i) => {
      const done = isDone(save, i), claimed = q.claimed[i];
      const card = document.createElement(done && !claimed ? 'button' : 'div');
      card.className = 'dq-card' + (claimed ? ' claimed' : done ? ' done' : '');
      const text = document.createElement('div');
      text.className = 'dq-text';
      text.textContent = questText(e, strings);
      const count = document.createElement('div');
      count.className = 'dq-count';
      count.textContent = `${Math.min(q.progress[i], e.target).toLocaleString('en-GB')}/${e.target.toLocaleString('en-GB')}`;
      card.append(text, count);
      if (claimed) { const tick = document.createElement('div'); tick.className = 'dq-tick'; tick.textContent = '✔'; card.appendChild(tick); }
      if (done && !claimed) {
        card.dataset.sfx = 'none';
        card.addEventListener('click', () => this.collectQuest(i, card));
      }
      cards.appendChild(card);
    });
    const foot = document.getElementById('dq-foot');
    if (n > 0) foot.textContent = 'Tap to Collect';
    else {
      const mins = Math.ceil(msToNextDay() / 60000);
      foot.textContent = `New quests in ${mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`}`;
    }
  }

  // Claim: the card flashes, "+N ◆" floats up, then the panel redraws.
  collectQuest(i, card) {
    const paid = this.game.claimQuest(i);
    if (!paid) return;
    sfx('unlock');
    const r = card.getBoundingClientRect();
    const pop = document.createElement('div');
    pop.className = 'dq-pop';
    pop.textContent = `+${paid} ◆ BITS`;
    pop.style.left = `${r.left + r.width / 2}px`;
    pop.style.top = `${r.top}px`;
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 1200);
    card.classList.add('collecting');
    setTimeout(() => { this.buildQuestPanel(); this.refreshTowerDot(); }, 350);
  }

  // S25: red dot on the main menu's TOWERS button: the total of the Towers menu's dots.
  refreshTowerDot() {
    const btn = this.el.mmTowersBtn;
    btn.querySelector('.red-dot')?.remove();
    const n = upgradesAffordable(this.game.save);
    if (n > 0) btn.appendChild(redDot(dotLabel(n)));
  }

  buildMenuScreen(id) {
    if (id === 'mm-towers') this.buildTowersScreen();
    if (id === 'mm-enemies') this.buildEnemiesScreen();
    if (id === 'mm-levels') this.buildLevelsScreen();
    if (id === 'mm-home') this.buildQuestPanel();
  }

  // Rebuild the open menu screen after progress changes underneath it (debug
  // unlocks), e.g. Level Select stays open behind the debug menu.
  refreshMenu() {
    const open = this.el.mainMenu.querySelector('.menu-screen.show');
    if (open) this.buildMenuScreen(open.id);
    this.refreshTowerDot();
  }

  // M9: a Screen Text string (the CSV), falling back to the built-in default
  str(key) { return this.game.narrative?.strings?.[key] ?? DEFAULT_STRINGS[key] ?? key; }

  diffPill(text, cls) {
    const p = document.createElement('div');
    p.className = `diff-pill ${cls}`.trim();
    p.textContent = text;
    return p;
  }

  // M9: start a level from Level Select. Basic only → straight in; Advanced
  // open → the "Select Difficulty" pop-up first.
  playLevel(i) {
    if (!advancedOpen(this.game.save, i)) { this.game.startRun(i, 'basic'); return; }
    this.showDifficultyPicker(i);
  }

  showDifficultyPicker(i) {
    this.hideDifficultyPicker();
    const pop = document.createElement('div');
    pop.id = 'diff-pop';
    const box = document.createElement('div');
    box.className = 'diff-box';
    const title = document.createElement('div');
    title.className = 'diff-title';
    title.textContent = `Level ${i}: ${this.str('Difficulty_Select')}`;
    const row = document.createElement('div');
    row.className = 'diff-row';
    for (const d of ['basic', 'advanced']) {
      const b = document.createElement('button');
      b.className = 'diff-btn';
      b.dataset.diff = d;
      b.textContent = this.str(d === 'basic' ? 'Difficulty_Basic' : 'Difficulty_Advanced');
      b.addEventListener('click', (e) => { e.stopPropagation(); this.hideDifficultyPicker(); this.game.startRun(i, d); });
      row.appendChild(b);
    }
    box.append(title, row);
    box.addEventListener('click', (e) => e.stopPropagation());
    pop.appendChild(box);
    pop.addEventListener('click', () => { sfx('ui_back'); this.hideDifficultyPicker(); });   // tap outside closes it
    this.el.mainMenu.appendChild(pop);
    sfx('ui_popup');
  }

  hideDifficultyPicker() { document.getElementById('diff-pop')?.remove(); }

  buildLevelsScreen() {
    const list = this.el.mmLevelList;
    const save = this.game.save;
    const unlocked = save.levelsUnlocked;
    const selected = this.game.latestLevelIndex();   // what the PLAY button starts
    list.innerHTML = '';
    LEVELS.forEach((lvl, i) => {
      const item = document.createElement('div');
      item.className = i === selected ? 'mm-item selected' : 'mm-item';
      const body = document.createElement('div');
      body.className = 'mi-body';
      const name = document.createElement('div');
      name.className = 'mi-name';
      name.textContent = lvl.name.toUpperCase();
      const desc = document.createElement('div');
      desc.className = 'mi-desc';
      desc.textContent = `${lvl.waves.length} waves · ${lvl.spawns} entry point${lvl.spawns > 1 ? 's' : ''}`
        + (lvl.rewardBits ? ` · +${lvl.rewardBits} BITS` : '');
      const delta = document.createElement('div');
      delta.className = 'mi-desc';
      delta.textContent = `Δ HP ×${lvl.enemyDelta.health.toFixed(2)} · DMG ×${lvl.enemyDelta.damage.toFixed(2)} · START ${lvl.startTokens} TOKENS`;
      body.append(name, desc, delta);
      // M9 (Engagement_Screens.png): Basic / Advanced pills. Basic once unlocked;
      // Advanced appears greyed once Basic is cleared, full colour once cleared on it.
      const side = document.createElement('div');
      side.className = 'mi-side';
      if (i <= unlocked) {
        side.appendChild(this.diffPill(this.str('Difficulty_Basic'), ''));
        if (advancedOpen(save, i)) side.appendChild(this.diffPill(this.str('Difficulty_Advanced'), isCleared(save, i, 'advanced') ? '' : 'dim'));
      } else {
        const status = document.createElement('div');
        status.className = 'mi-status locked';
        status.textContent = 'Locked';
        side.appendChild(status);
      }
      item.append(body, side);
      if (i <= unlocked) {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => this.playLevel(i));
      } else {
        item.style.opacity = '0.5';
        item.addEventListener('click', () => this.toast('Complete the previous level first'));
      }
      list.appendChild(item);
    });
  }

  // S25: Towers Info screen (Jogo's Towers_Info.png): Bits held, then per tower
  // its tier chevrons (owned solid; the next one outlined and pulsing if the Bits
  // cover it, pale if not), what the next tier offers, and the red dot.
  buildTowersScreen() {
    const list = this.el.mmTowerList;
    const keep = list.scrollTop;
    list.innerHTML = '';
    document.getElementById('mm-towers-bits').textContent = this.game.save.bits;
    for (const key of TOWER_ORDER) {
      const def = TOWERS[key];
      const item = document.createElement('div');
      item.className = 'mm-item tower-card';
      item.appendChild(this.towerIcon(key, 48, 12));
      const body = document.createElement('div');
      body.className = 'mi-body';
      const name = document.createElement('div');
      name.className = 'mi-name';
      name.textContent = def.name.toUpperCase();
      const desc = document.createElement('div');
      desc.className = 'mi-desc';
      desc.textContent = def.desc;
      body.append(name, desc);
      const side = document.createElement('div');
      side.className = 'mi-side';
      const status = document.createElement('div');
      status.className = 'mi-status';
      if (this.game.isTowerUnlocked(key)) {
        status.classList.add('unlocked');
        status.textContent = `TIER ${this.game.tierUnlockOf(key)}/${UPGRADE.maxTier}`;
        side.appendChild(status);
        const ctl = this.tierControl(key, () => { this.buildTowersScreen(); this.refreshTowerDot(); });
        if (ctl.tagName === 'BUTTON') side.appendChild(ctl); // MAX already shown above
        // S25: red dot = upgrades this tower can take with the Bits held
        const n = affordableTiers(this.game.save, key);
        if (n > 0) { item.classList.add('has-dot'); item.appendChild(redDot(String(n))); }
      } else {
        status.classList.add('locked');
        status.textContent = `BP ${this.game.bpCount(key)}/${def.blueprints}`;
        side.appendChild(status);
      }
      item.append(body, side);
      item.append(...this.tierDetails(key));
      list.appendChild(item);
    }
    list.scrollTop = keep;
    this.syncScrollbar(list);
  }

  // Chevron row + next-tier text for one tower on the Towers Info screen.
  tierDetails(key) {
    const unlocked = this.game.isTowerUnlocked(key);
    const cur = this.game.tierUnlockOf(key);
    const nextCost = UPGRADE.tierUnlockBits[cur + 1];
    const canBuy = unlocked && nextCost !== undefined && this.game.save.bits >= nextCost;
    const chev = document.createElement('div');
    chev.className = 'tier-chevrons' + (unlocked ? '' : ' locked');
    for (let t = 1; t <= UPGRADE.maxTier; t++) {
      const c = document.createElement('span');
      c.className = 'chev-seg ' + (t <= cur && unlocked ? 'owned' : t === cur + 1 && canBuy ? 'next' : 'pale');
      chev.appendChild(c);
    }
    const info = document.createElement('div');
    info.className = 'tier-offer';
    const lines = !unlocked ? [`Collect ${TOWERS[key].name} Blueprints to unlock this tower.`]
      : cur >= UPGRADE.maxTier ? ['All tiers unlocked.'] : tierOffer(key, cur + 1);
    for (const l of lines) { const p = document.createElement('div'); p.textContent = l; info.appendChild(p); }
    return [chev, info];
  }

  // Always-visible scroll bar beside a list (iOS hides native ones when idle).
  syncScrollbar(list) {
    const track = list.parentElement.querySelector('.list-track');
    if (!track) return;
    const thumb = track.firstElementChild;
    const update = () => {
      const { scrollHeight: sh, clientHeight: ch, scrollTop: st } = list;
      track.style.display = sh > ch + 2 ? '' : 'none';
      const h = Math.max(30, (ch / sh) * track.clientHeight);
      thumb.style.height = `${h}px`;
      thumb.style.transform = `translateY(${(st / Math.max(1, sh - ch)) * (track.clientHeight - h)}px)`;
    };
    if (!list.dataset.sb) { list.dataset.sb = '1'; list.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update); }
    requestAnimationFrame(update);
  }

  buildEnemiesScreen() {
    const list = this.el.mmEnemyList;
    list.innerHTML = '';
    for (const key of Object.keys(ENEMIES)) {
      const def = ENEMIES[key];
      const item = document.createElement('div');
      item.className = 'mm-item';
      item.appendChild(this.enemyIcon(key, 48));
      const body = document.createElement('div');
      body.className = 'mi-body';
      const name = document.createElement('div');
      name.className = 'mi-name';
      name.textContent = def.name.toUpperCase();
      const desc = document.createElement('div');
      desc.className = 'mi-desc';
      desc.textContent = def.desc;
      body.append(name, desc);
      item.appendChild(body);
      list.appendChild(item);
    }
  }

  // --- debug menu ----------------------------------------------------------------
  // Tab registry: add new tabs here — { label, build(bodyEl) }.
  get debugTabDefs() {
    return [
      {
        label: 'ECONOMY',   // M9: first tab, and the one the menu opens on
        build: (el) => {
          this.dbgButton(el, 'Add 100 Tokens', () => this.game.debugAddTokens(100));
          this.dbgButton(el, 'Add 10 Bits', () => this.game.debugAddBits(10));
          this.dbgButton(el, 'Trigger CRASH now', () => { this.hideDebugMenu(); this.game.executeCrash(); });
          const pause = this.dbgButton(el, this.pauseLabel(), () => {
            this.game.spawnPaused = !this.game.spawnPaused;
            pause.textContent = this.pauseLabel();
            this.toast(this.game.spawnPaused ? 'Wave spawning paused' : 'Wave spawning resumed');
          });
          this.dbgButton(el, 'Unlock all towers', () => this.game.debugUnlockAllTowers());
          this.dbgButton(el, 'Lock all towers', () => this.game.debugLockAllTowers());
          this.dbgButton(el, 'Unlock all levels', () => this.game.debugUnlockAllLevels());
          this.dbgButton(el, 'Lock all levels', () => this.game.debugLockAllLevels());
          this.dbgButton(el, 'Complete Tutorial', () => this.game.debugCompleteTutorial());
          // M9 Difficulty
          this.dbgButton(el, 'Clear next level on Basic', () => this.toast(this.game.debugClearNext()));
          this.dbgButton(el, 'Clear all Basic levels on Advanced', () => this.toast(this.game.debugAdvancedAll()));
          this.dbgButton(el, 'Wipe Advanced clears', () => this.toast(this.game.debugWipeAdvanced()));
          // M9 run recorder: logs your runs for the Sim (saved to Notes/runs/ by serve.py)
          const rec = this.dbgButton(el, this.recLabel(), () => {
            this.game.save.recordRuns = !this.game.save.recordRuns;
            writeSave(this.game.save);
            rec.textContent = this.recLabel();
            this.toast(this.game.save.recordRuns ? 'Recording from the next level you start' : 'Run recording off');
          });
          this.dbgButton(el, 'Download last recorded run', () => {
            const last = keptRuns()[0];
            if (!last) { this.toast('No recorded runs yet'); return; }
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([last.text], { type: 'application/json' }));
            a.download = `${last.name}.json`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          });
          // M9 Daily Quests
          this.dbgButton(el, 'Reroll quests (clears progress)', () => { this.game.debugQuests('reroll'); this.toast('New quests rolled'); });
          this.dbgButton(el, 'Complete all quests (unclaimed)', () => { this.game.debugQuests('complete'); this.toast('Quests ready to collect'); });
          this.dbgButton(el, 'Quests: next day', () => { this.game.debugQuests('nextDay'); this.toast(`Quest clock +${this.game.save.quests.dayOffset} day(s)`); });
          this.dbgButton(el, 'Quests: break streak', () => { this.game.debugQuests('breakStreak'); this.toast('Streak reset'); });
          this.dbgButton(el, 'Reset all settings', () => this.game.debugResetAll(), true);
          this.dbgButton(el, 'Quit to main menu', () => this.game.debugQuitToMenu(), true);
        },
      },
      { label: 'SOUND', build: (el) => this.buildSoundTab(el) },
      {
        label: 'STORY',
        build: (el) => {
          const c = this.game.narrative;
          const info = document.createElement('div');
          info.className = 'dbg-note';
          if (!c) info.textContent = 'Narrative still loading…';
          else {
            const names = c.archives.filter(a => a.active && a.core.length).map(a => `${a.name} (${a.type || 'no Class'})`);
            info.textContent = `Active archives: ${names.length ? names.join(', ') : 'none'}.\n`
              + (c.warnings.length ? `Problems in the content CSVs:\n• ${c.warnings.join('\n• ')}` : 'No problems in the content CSVs.');
          }
          el.appendChild(info);
          this.dbgButton(el, 'Preview Level Result: win, 10/15', () => { this.hideDebugMenu(); this.game.debugPreviewResult(true, 10); });
          this.dbgButton(el, 'Preview Level Result: win, 1/15', () => { this.hideDebugMenu(); this.game.debugPreviewResult(true, 1); });
          this.dbgButton(el, 'Preview Level Result: loss', () => { this.hideDebugMenu(); this.game.debugPreviewResult(false, 0); });
        },
      },
      {
        label: 'SPAWN',
        build: (el) => {
          for (const key of Object.keys(ENEMIES)) {
            this.dbgButton(el, `Spawn ${ENEMIES[key].name}`, () => {
              this.game.debugSpawnEnemy(key);
              this.toast(`${ENEMIES[key].name} spawned`);
            });
          }
        },
      },
    ];
  }

  // M8 SOUND tab: mute, Music and SFX volume. Saved with the profile.
  buildSoundTab(el) {
    const save = this.game.save;
    const apply = () => { audio.setSettings(save.audio); writeSave(save); };
    const mute = this.dbgButton(el, '', () => {
      save.audio.muted = !save.audio.muted;
      apply();
      mute.textContent = this.muteLabel();
    });
    mute.textContent = this.muteLabel();
    mute.dataset.sfx = 'none';
    for (const [key, label, test] of [['music', 'Music', null], ['sfx', 'Sound effects', 'ui_select']]) {
      const row = document.createElement('label');
      row.className = 'snd-row';
      const name = document.createElement('span');
      name.textContent = label;
      const val = document.createElement('span');
      val.className = 'snd-val';
      const slider = document.createElement('input');
      slider.type = 'range'; slider.min = 0; slider.max = 100; slider.step = 5;
      slider.value = Math.round(save.audio[key] * 100);
      val.textContent = `${slider.value}%`;
      slider.addEventListener('input', () => {
        save.audio[key] = slider.value / 100;
        val.textContent = `${slider.value}%`;
        audio.setSettings(save.audio);
      });
      slider.addEventListener('change', () => { apply(); if (test) sfx(test); });
      row.append(name, slider, val);
      el.appendChild(row);
    }
  }

  muteLabel() { return this.game.save.audio.muted ? '🔇 Sound off: tap to turn on' : '🔊 Sound on: tap to mute'; }

  dbgButton(parent, label, onTap, danger = false) {
    const b = document.createElement('button');
    b.className = 'dbg-btn' + (danger ? ' danger' : '');
    b.textContent = label;
    b.addEventListener('click', () => {
      b.classList.remove('flash');
      void b.offsetWidth;            // restart the animation on rapid taps
      b.classList.add('flash');
      onTap();
      this.refreshDebugWallet();
    });
    parent.appendChild(b);
    return b;
  }

  // Debug header: the player's current Tokens and BITS, refreshed on every tap.
  refreshDebugWallet() {
    const el = document.getElementById('debug-wallet');
    if (!el || !this.game.state) return;
    el.innerHTML = `<span class="w-tokens">◼ ${this.game.state.tokens} TOKENS</span>`
      + `<span class="w-bits">◆ ${this.game.save.bits} BITS</span>`;
  }

  recLabel() { return this.game.save.recordRuns ? 'Record runs: ON' : 'Record runs: OFF'; }
  pauseLabel() { return this.game.spawnPaused ? 'Resume wave spawning' : 'Pause wave spawning'; }

  showDebugMenu() {
    this.activeDebugTab = this.activeDebugTab ?? 0;
    this.renderDebugTabs();
    this.refreshDebugWallet();
    this.el.debugMenu.classList.add('show');
  }

  hideDebugMenu() { this.el.debugMenu.classList.remove('show'); }

  renderDebugTabs() {
    const defs = this.debugTabDefs;
    this.el.debugTabs.innerHTML = '';
    defs.forEach((def, i) => {
      const tab = document.createElement('button');
      tab.className = 'dbg-tab' + (i === this.activeDebugTab ? ' active' : '');
      tab.textContent = def.label;
      tab.addEventListener('click', () => { this.activeDebugTab = i; this.renderDebugTabs(); });
      this.el.debugTabs.appendChild(tab);
    });
    this.el.debugBody.innerHTML = '';
    defs[this.activeDebugTab].build(this.el.debugBody);
  }

  // --- alert strip (M4) --------------------------------------------------------
  // One strip under the HUD for big in-game messages: red = warning,
  // green = good news. Reused for any future alert (CRASH, wave incoming).
  alert(kind, title, text, secs = 2.6) {
    const a = this.el.alert;
    this.el.alertTitle.textContent = title;
    this.el.alertText.textContent = text;
    a.className = `show ${kind}`;
    void a.offsetWidth;                 // restart the entry animation
    a.classList.add('pop');
    clearTimeout(this.alertTimer);
    this.alertTimer = setTimeout(() => { a.className = kind; }, secs * 1000);
  }

  // Throttled: one warning per ALERT_REARM seconds, however many attacks.
  attackWarning(enemyType) {
    const now = performance.now() / 1000;
    if (now - (this.lastAttackWarning ?? -Infinity) < ALERT_REARM) return;
    this.lastAttackWarning = now;
    sfx('warn_attack');   // M8: one short cue as the attack starts, never a constant alarm
    this.alert('warn', 'WARNING!', `${ENEMIES[enemyType]?.name ?? 'Enemy'} attacking your units`);
  }

  // Breach Surge (S21): one alert per countdown second (each re-pops the strip),
  // then the breach itself.
  surgeCountdown(secs) {
    sfx('surge_tick');
    this.alert('warn', 'BREACH DETECTED', `Surge in ${secs}`, 1.2);
  }

  surgeBreach() {
    sfx('surge_breach');
    this.alert('warn', 'BREACH!', 'Every entry point is flooding', 2.6);
  }

  towerUnlocked(type) {
    sfx('unlock');
    this.alert('good', 'TOWER UNLOCKED', TOWERS[type].name.toUpperCase(), 3);
    const btn = this.trayBtns[type]?.btn;
    if (btn) { btn.classList.remove('just-unlocked', 'bp-hit'); void btn.offsetWidth; btn.classList.add('just-unlocked'); }
  }

  // S21: a collected Blueprint swoops from the board down to its tower's tray
  // button (rises, then dives), the button pulses, then onArrive runs.
  // x, y: canvas coordinates of the drop.
  flyBlueprint(x, y, type, color, onArrive) {
    const btn = this.trayBtns[type]?.btn;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!btn || reduced || !document.body.animate) { onArrive(); return; }
    const c = this.game.canvas.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const x0 = c.left + x, y0 = c.top + y;
    const x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
    const fly = document.createElement('div');
    fly.className = 'bp-fly';
    fly.style.setProperty('--bp', color);
    document.body.appendChild(fly);
    const at = (px, py, s, r) => `translate(${px}px, ${py}px) translate(-50%, -50%) rotate(${r}deg) scale(${s})`;
    const anim = fly.animate([
      { transform: at(x0, y0, 1, 45), offset: 0 },
      { transform: at(x0 + (x1 - x0) * 0.15, y0 - 56, 1.9, 225), offset: 0.35 },
      { transform: at(x1, y1, 0.7, 405), offset: 1 },
    ], { duration: 1000, easing: 'cubic-bezier(0.45, 0, 0.25, 1)', fill: 'forwards' });
    anim.onfinish = () => {
      fly.remove();
      btn.style.setProperty('--bp', color);
      btn.classList.remove('bp-hit'); void btn.offsetWidth; btn.classList.add('bp-hit');
      onArrive();
    };
  }

  toast(msg) {
    this.el.toast.textContent = msg;
    this.el.toast.style.opacity = '1';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.el.toast.style.opacity = '0'; }, 1400);
  }
}
