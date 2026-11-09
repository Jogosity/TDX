// TDX — Tutorial / FTUE (M7 "Fortran", S24). Runs on Level 0 only.
//
// Built to Jogo's Tutorial_Screen_1–7 mockups.
//   wave 1, build phase (before START WAVE):
//           Screen_1 select Threader → Screen_2 place it → Screen_3 place 2 more (tick)
//   wave 2, once the wave is running (Jogo, S24 playtest):
//           Screen_4 select Vault → Screen_5 place it
//   wave 3, once the wave is running: Screen_6 the Repo and Cores (tick) → Screen_7 losing data (tick)
// A running wave freezes while its box is up (game.update checks tutorial.holds()).
// when: 'build' (default) or 'wave'; a 'wave' step shows TUTORIAL_WAVE_DELAY s after the wave's first enemy appears.
// A box without a tick closes when the player does what it asks; a box with a
// tick closes on the tick (Screen_3's tick appears once both towers are down).
// While a box is up, taps outside its target are blocked. Text comes from the
// Tutorials CSV (narrative.js TUTORIAL_DEFAULTS when a row is missing).
//
// TutorialScript is the DOM-free step machine (Node-tested); Tutorial draws it.

// Towers the Tutorial allows, whatever the player's save holds (Tier 1 only).
export const tutorialTowers = (waveIndex) => (waveIndex >= 1 ? ['threader', 'vault'] : ['threader']);

// do: 'select' (tap the tray card) | 'build' (place `count` towers) | none (tick only)
// point: where the arrow points ('tray' = the step's tower card, 'board', 'base')
// box: 'mid' (middle of the board) | 'low' (just above the tray)
export const TUTORIAL_STEPS = [
  { id: 'Screen_1', wave: 0, do: 'select', tower: 'threader', point: 'tray', box: 'mid' },
  { id: 'Screen_2', wave: 0, do: 'build', tower: 'threader', point: 'board', box: 'low' },
  { id: 'Screen_3', wave: 0, do: 'build', tower: 'threader', count: 2, tick: true, box: 'mid' },
  { id: 'Screen_4', wave: 1, when: 'wave', do: 'select', tower: 'vault', point: 'tray', box: 'mid' },
  { id: 'Screen_5', wave: 1, when: 'wave', do: 'build', tower: 'vault', box: 'low' },   // no arrow: the player picks the spot (Jogo, 9 Nov)
  { id: 'Screen_6', wave: 2, when: 'wave', tick: true, point: 'base', box: 'mid' },
  { id: 'Screen_7', wave: 2, when: 'wave', tick: true, point: 'base', box: 'mid' },
];
export const TUTORIAL_WAVE_DELAY = 1.5;   // seconds after the first enemy is on the board
const whenOf = (s) => s.when ?? 'build';

export class TutorialScript {
  constructor(steps = TUTORIAL_STEPS) {
    this.steps = steps;
    this.i = -1;          // index of the step on screen, -1 = none
    this.done = 0;        // builds done toward the current step's count
    this.skipped = false;
    this.live = false;    // a box is up (S24 fix: a finished step must not react to later builds)
  }
  get step() { return this.live ? this.steps[this.i] ?? null : null; }
  hasSteps(wave, when = 'build') {
    return !this.skipped && this.steps.some((s, k) => s.wave === wave && whenOf(s) === when && k > this.i);
  }
  // Start the given wave's steps for that moment ('build' or 'wave'). Returns the step now showing, or null.
  begin(wave, when = 'build') {
    if (this.skipped) return null;
    const k = this.steps.findIndex((s, j) => j > this.i && s.wave === wave && whenOf(s) === when);
    if (k < 0) { this.live = false; return null; }
    this.i = k; this.done = 0; this.live = true;
    return this.step;
  }
  // The step's action is complete, so its tick can show (or it advances).
  get ready() {
    const s = this.step;
    if (!s) return false;
    if (s.do === 'build') return this.done >= (s.count ?? 1);
    return !s.do;
  }
  // A game event. Returns 'next' (move on), 'tick' (show the tick) or null.
  event(kind, tower) {
    const s = this.step;
    if (!s || s.do !== kind || s.tower !== tower) return null;
    if (kind === 'build') this.done++;
    if (kind === 'select' || this.ready) return s.tick ? 'tick' : 'next';
    return null;
  }
  // Move to the next step in the same wave. Returns it, or null when the wave's steps are done.
  next() {
    const cur = this.step;
    const n = this.steps[this.i + 1];
    if (cur && n && n.wave === cur.wave && whenOf(n) === whenOf(cur)) { this.i++; this.done = 0; return this.step; }
    this.live = false;
    return null;
  }
  skip() { this.skipped = true; this.live = false; this.i = this.steps.length; }
  // What a tap may reach while this step is up.
  allows(target, tower) {
    const s = this.step;
    if (!s) return true;
    if (target === 'tick') return !!s.tick && this.ready;
    if (target === 'tray') return !!s.do && tower === s.tower;
    if (target === 'board') return s.do === 'build' && !this.ready;
    return false;
  }
}

const whenOfStep = (s) => (s ? whenOf(s) : null);
const ICONS = 'assets/icons/';
const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// The Tutorial Box suite: text panel (+ tick), arrow, tray-card highlight, Skip.
export class Tutorial {
  constructor(game, text) {
    this.game = game;
    this.text = text;
    this.script = new TutorialScript();
    this.after = null;

    const app = document.getElementById('app');
    this.root = h('div', 'tut-layer');
    this.box = h('div', 'tut-box');
    this.msg = h('div', 'tut-msg');
    this.count = h('div', 'tut-count');
    this.tick = h('button', 'tut-tick');
    this.tick.setAttribute('aria-label', 'OK');
    const tickImg = h('img'); tickImg.src = ICONS + 'Icon_Button_Tick.png'; tickImg.alt = '';
    this.tick.appendChild(tickImg);
    this.tick.addEventListener('click', () => this.onTick());
    this.box.append(this.msg, this.count, this.tick);
    this.arrow = h('div', 'tut-arrow');
    this.skipBtn = h('button', 'tut-skip', text.Tut_Skip);
    this.skipBtn.addEventListener('click', () => this.skip());
    this.root.append(this.arrow, this.box, this.skipBtn);
    app.appendChild(this.root);

    // Block taps outside the step's target (capture phase, before anything else sees them).
    this.guard = (ev) => {
      if (!this.root.classList.contains('show')) return;
      const t = ev.target;
      if (t.closest?.('.tut-skip, #cog-btn, #debug-menu, #story, #story-popup')) return;
      if (t.closest?.('.tut-tick') && this.script.allows('tick')) return;
      const tray = t.closest?.('#tray button');
      if (tray && this.script.allows('tray', tray.dataset.type)) return;
      if (t === this.game.canvas && this.script.allows('board')) return;
      ev.stopPropagation(); ev.preventDefault();
    };
    for (const k of ['pointerdown', 'click']) document.addEventListener(k, this.guard, true);
    this.onResize = () => this.place();
    window.addEventListener('resize', this.onResize);
  }

  destroy() {
    for (const k of ['pointerdown', 'click']) document.removeEventListener(k, this.guard, true);
    window.removeEventListener('resize', this.onResize);
    this.clearGlow();
    this.root.remove();
  }

  hasSteps(wave, when) { return this.script.hasSteps(wave, when); }

  // Run the wave's build-phase steps, then call `after` (shows the START WAVE banner).
  runWave(wave, after, when = 'build') {
    this.after = after;
    const s = this.script.begin(wave, when);
    if (s) this.show(s); else this.finish();
  }

  // START WAVE pressed: arm the wave's in-wave steps (they show after a short delay).
  waveStarted(wave) { this.pending = this.hasSteps(wave, 'wave') ? { wave, t: TUTORIAL_WAVE_DELAY } : null; }

  // Called every frame while a wave runs. Returns true while the wave should freeze.
  update(dt, enemiesOnBoard) {
    if (this.pending) {
      if (enemiesOnBoard > 0) this.pending.t -= dt;
      if (this.pending.t <= 0) { const w = this.pending.wave; this.pending = null; this.runWave(w, null, 'wave'); }
    }
    return this.holds();
  }
  holds() { return this.root.classList.contains('show') && whenOfStep(this.script.step) === 'wave'; }

  // Game hooks: a tray card was selected / a tower was built.
  event(kind, tower) {
    const r = this.script.event(kind, tower);
    if (r === 'next') this.advance();
    else if (r === 'tick') this.show(this.script.step);
    else if (kind === 'build' && this.script.step) this.show(this.script.step);   // count went up
  }

  onTick() { if (this.script.allows('tick')) this.advance(); }

  advance() {
    const s = this.script.next();
    if (s) this.show(s); else this.finish();
  }

  finish() {
    this.root.classList.remove('show');
    this.clearGlow();
    const fn = this.after; this.after = null;
    fn?.();
  }

  skip() {
    this.script.skip();
    this.finish();
    this.destroy();
    this.game.tutorial = null;
    this.game.ui.refresh();
  }

  show(s) {
    this.msg.textContent = '';
    for (const line of (this.text[s.id] ?? '').split('\n')) this.msg.appendChild(h('p', '', line));
    const left = s.count ? s.count - this.script.done : 0;
    this.count.textContent = s.count && left > 0 ? `${this.script.done}/${s.count}` : '';
    this.tick.classList.toggle('show', !!s.tick && this.script.ready);
    this.box.dataset.pos = s.box;
    this.clearGlow();
    if (s.do && s.tower) this.game.ui.trayBtns[s.tower]?.btn.classList.add('tut-glow');
    this.root.classList.add('show');
    this.box.classList.remove('in'); void this.box.offsetWidth; this.box.classList.add('in');
    this.place();
  }

  clearGlow() { for (const b of document.querySelectorAll('.tut-glow')) b.classList.remove('tut-glow'); }

  // Position the box and arrow against the live layout.
  place() {
    const s = this.script.step;
    if (!s || !this.root.classList.contains('show')) return;
    const app = this.root.getBoundingClientRect();
    const tray = document.getElementById('tray').getBoundingClientRect();
    const canvas = this.game.canvas.getBoundingClientRect();
    const boxH = this.box.offsetHeight;
    const boxTop = s.box === 'low' ? tray.top - app.top - boxH - 14 : (canvas.top - app.top) + canvas.height * 0.42 - boxH / 2;
    this.box.style.top = `${Math.round(boxTop)}px`;
    this.skipBtn.style.top = `${Math.round(canvas.top - app.top + 6)}px`;
    const a = this.arrow;
    a.className = 'tut-arrow';
    if (s.point === 'tray' && s.tower) {
      const r = this.game.ui.trayBtns[s.tower].btn.getBoundingClientRect();
      a.classList.add('down');
      a.style.left = `${r.left - app.left + r.width / 2}px`;
      a.style.top = `${r.top - app.top - 52}px`;
    } else if (s.point === 'board') {
      // S26: aim at an open, buildable cell (never a Blocked one) nearest the
      // spot just above the box's centre; fall back to that spot if none.
      a.classList.add('up');
      const g = this.game.grid;
      const ox = canvas.left - app.left, oy = canvas.top - app.top;
      const wantX = app.width / 2, wantY = boxTop - 58 - g.size * 0.7;
      let best = null, bd = Infinity;
      for (const c of g.cells.values()) {
        if (c.occupied || c.spawn || c.exit || c.lockout) continue;
        const cy = oy + c.y;
        if (cy > wantY + 1) continue;                       // keep the arrow clear of the box
        if (this.game.field.wouldFirewall(c, this.game.state.enemies)) continue;
        const d = (ox + c.x - wantX) ** 2 + (cy - wantY) ** 2;
        if (d < bd) { bd = d; best = c; }
      }
      a.style.left = `${best ? ox + best.x : wantX}px`;
      a.style.top = `${best ? oy + best.y + g.size * 0.3 : boxTop - 58}px`;
    } else if (s.point === 'base') {
      const g = this.game.grid;
      a.classList.add('down');
      a.style.left = `${canvas.left - app.left + g.baseX}px`;
      a.style.top = `${canvas.top - app.top + g.baseY - g.baseR - 56}px`;
    } else a.classList.add('none');
  }
}

// --- One-time hints (S25) -------------------------------------------------------
// A single Tutorial-style box shown once per save, outside the Tutorial level:
//   blueprint  Screen_8 on the first Blueprint drop: the board freezes, the arrow
//              points at the drop, and collecting it closes the box
//   bits       Screen_9 on the first Result screen that pays Bits: arrow on the
//              Bits count, tick to close
// Which hints are done lives in save.hints (loadSave marks them done for players
// who already know: Blueprints collected / Bits earned).
export class HintBox {
  // point(): { x, y } in page px for the arrow tip, re-read on every place().
  // allow(target): may this tap through? onDone(): called once when it closes.
  // dir: 'down' (arrow above the point, pointing at it) or 'up' (arrow below it, pointing up).
  constructor({ text, point, dir = 'down', tick = false, overStory = false, allow = () => false, onDone = () => {} }) {
    this.point = point; this.allow = allow; this.onDone = onDone; this.dir = dir;
    this.root = h('div', 'tut-layer show' + (overStory ? ' over-story' : ''));
    this.box = h('div', 'tut-box in');
    for (const line of (text ?? '').split('\n')) this.box.appendChild(h('p', 'tut-msg', line));
    this.arrow = h('div', 'tut-arrow ' + dir);
    this.root.append(this.arrow, this.box);
    if (tick) {
      const t = h('button', 'tut-tick show');
      t.setAttribute('aria-label', 'OK');
      const img = h('img'); img.src = ICONS + 'Icon_Button_Tick.png'; img.alt = '';
      t.appendChild(img);
      t.addEventListener('click', () => this.close());
      this.box.appendChild(t);
    }
    document.getElementById('app').appendChild(this.root);
    this.guard = (ev) => {
      if (ev.target.closest?.('.tut-tick, #cog-btn, #debug-menu') || this.allow(ev.target)) return;
      ev.stopPropagation(); ev.preventDefault();
    };
    for (const k of ['pointerdown', 'click']) document.addEventListener(k, this.guard, true);
    this.onResize = () => this.place();
    window.addEventListener('resize', this.onResize);
    this.place();
  }
  place() {
    const app = this.root.getBoundingClientRect();
    const p = this.point();
    const x = p.x - app.left, y = p.y - app.top;
    this.arrow.style.left = `${x}px`;
    const bh = this.box.offsetHeight;
    let top;
    // 'up' (the Bits hint): the box sits in the Result screen's open space, clear of the title
    if (this.dir === 'up') { this.arrow.style.top = `${y + 4}px`; top = app.height * 0.6 - bh / 2; }
    else {
      this.arrow.style.top = `${y - 54}px`;
      // keep the box clear of the arrow: below the point if it's high up, else above it
      top = y < app.height * 0.45 ? y + 24 : y - 54 - 18 - bh;
    }
    this.box.style.top = `${Math.round(Math.max(8, Math.min(app.height - bh - 8, top)))}px`;
  }
  close() {
    if (!this.root) return;
    for (const k of ['pointerdown', 'click']) document.removeEventListener(k, this.guard, true);
    window.removeEventListener('resize', this.onResize);
    this.root.remove(); this.root = null;
    this.onDone();
  }
}
