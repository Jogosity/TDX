// TDX — DOM HUD, tower tray, and touch/mouse input.

import { TOWERS, TOWER_ORDER, ENEMIES, UPGRADE, LEVELS, VERSION } from './config.js';
import { drawTowerShape, drawEnemyShape } from './render.js';

const ALERT_REARM = 6;   // seconds before another under-attack warning can show

export class UI {
  constructor(game) {
    this.game = game;
    this.el = {
      wave: document.getElementById('wave-label'),
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
      const def = TOWERS[key];
      this.toast(`Locked — collect Blueprints (${this.game.bpCount(key)}/${def.blueprints})`);
      return;
    }
    if (this.selectedType === key) {
      this.clearSelection();
      return;
    }
    if (this.game.state.tokens < TOWERS[key].cost) {
      this.toast('Not enough Tokens');
      return;
    }
    this.clearSelection();
    this.selectedType = key;
    btn.classList.add('selected');
    this.game.startPlacing(key);
  }

  clearSelection() {
    this.selectedType = null;
    for (const b of this.el.tray.children) b.classList.remove('selected');
    this.game.cancelPlacing();
  }

  bind() {
    const canvas = this.game.canvas;
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
    this.el.mmPlay.addEventListener('click', () => this.showMenuScreen('mm-levels'));   // M4: PLAY → Level Select
    this.el.mmTowersBtn.addEventListener('click', () => this.showMenuScreen('mm-towers'));
    this.el.mmEnemiesBtn.addEventListener('click', () => this.showMenuScreen('mm-enemies'));
    this.el.mmLevelsBtn.addEventListener('click', () => this.showMenuScreen('mm-levels'));
    for (const b of document.querySelectorAll('.mm-back')) {
      b.addEventListener('click', () => this.showMenuScreen('mm-home'));
    }
  }

  refresh() {
    const s = this.game.state;
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
      btn.textContent = `TIER ${tower.tier + 1} −${tower.upgradeCost}`;
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
  }

  buildMenuScreen(id) {
    if (id === 'mm-towers') this.buildTowersScreen();
    if (id === 'mm-enemies') this.buildEnemiesScreen();
    if (id === 'mm-levels') this.buildLevelsScreen();
  }

  // Rebuild the open menu screen after progress changes underneath it (debug
  // unlocks), e.g. Level Select stays open behind the debug menu.
  refreshMenu() {
    const open = this.el.mainMenu.querySelector('.menu-screen.show');
    if (open) this.buildMenuScreen(open.id);
  }

  buildLevelsScreen() {
    const list = this.el.mmLevelList;
    const unlocked = this.game.save.levelsUnlocked;
    list.innerHTML = '';
    LEVELS.forEach((lvl, i) => {
      const item = document.createElement('div');
      item.className = 'mm-item';
      const body = document.createElement('div');
      body.className = 'mi-body';
      const name = document.createElement('div');
      name.className = 'mi-name';
      name.textContent = lvl.name.toUpperCase();
      const desc = document.createElement('div');
      desc.className = 'mi-desc';
      desc.textContent = `${lvl.waves.length} waves · ${lvl.spawns} entry point${lvl.spawns > 1 ? 's' : ''} · +${lvl.rewardBits} BITS`;
      const delta = document.createElement('div');
      delta.className = 'mi-desc';
      delta.textContent = `Δ HP ×${lvl.enemyDelta.health.toFixed(2)} · DMG ×${lvl.enemyDelta.damage.toFixed(2)} · START ${lvl.startTokens} TOKENS`;
      body.append(name, desc, delta);
      const status = document.createElement('div');
      status.className = 'mi-status';
      if (i < unlocked) { status.classList.add('unlocked'); status.textContent = 'CLEARED'; }
      else if (i === unlocked) { status.classList.add('unlocked'); status.textContent = 'CURRENT'; }
      else { status.classList.add('locked'); status.textContent = 'LOCKED'; }
      item.append(body, status);
      if (i <= unlocked) {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => this.game.startRun(i));
      } else {
        item.style.opacity = '0.5';
        item.addEventListener('click', () => this.toast('Complete the previous level first'));
      }
      list.appendChild(item);
    });
  }

  buildTowersScreen() {
    const list = this.el.mmTowerList;
    list.innerHTML = '';
    for (const key of TOWER_ORDER) {
      const def = TOWERS[key];
      const item = document.createElement('div');
      item.className = 'mm-item';
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
        const ctl = this.tierControl(key, () => this.buildTowersScreen());
        if (ctl.tagName === 'BUTTON') side.appendChild(ctl); // MAX already shown above
      } else {
        status.classList.add('locked');
        status.textContent = `BP ${this.game.bpCount(key)}/${def.blueprints}`;
        side.appendChild(status);
      }
      item.append(body, side);
      list.appendChild(item);
    }
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
        label: 'ECONOMY',
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
          this.dbgButton(el, 'Reset all settings', () => this.game.debugResetAll(), true);
          this.dbgButton(el, 'Quit to main menu', () => this.game.debugQuitToMenu(), true);
        },
      },
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
    this.alert('warn', 'WARNING!', `${ENEMIES[enemyType]?.name ?? 'Enemy'} attacking your units`);
  }

  towerUnlocked(type) {
    this.alert('good', 'TOWER UNLOCKED', TOWERS[type].name.toUpperCase(), 3);
    const btn = this.trayBtns[type]?.btn;
    if (btn) { btn.classList.remove('just-unlocked'); void btn.offsetWidth; btn.classList.add('just-unlocked'); }
  }

  toast(msg) {
    this.el.toast.textContent = msg;
    this.el.toast.style.opacity = '1';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.el.toast.style.opacity = '0'; }, 1400);
  }
}
