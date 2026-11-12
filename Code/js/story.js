// TDX — narrative screens (M4 "Disc Drive"), built to Jogo's mockups in
// Assets/Screens: Level Data → Archive Record → (game) → Level Result, plus the
// Archive Record as a pop-up from the Result screen's Info button.
// Frames, bars and buttons are HTML/CSS; icons and avatars are Jogo's images.
// Text comes from the content CSVs (content/TDX_Text/) via narrative.js.
//
// Timing: each screen builds in sequence (background first, then its parts).
// Elements start hidden with a `rv` class plus a style (rv-left, rv-up …) and
// get `in` added on a schedule. Tapping a screen mid-build finishes it at once.
// All timings live in TIMING so they're easy to tune.

import { AVATAR_DIR, DEFAULT_AVATAR, WELCOME_AVATARS } from './narrative.js';
import { ENEMIES } from './config.js';
import { drawEnemyShape } from './render.js';
import { sfx } from './audio.js';

const ICONS = 'assets/icons/';

export const TIMING = {
  cardIn: 350,         // ms: background card fades/scales in
  step: 160,           // ms between elements in a sequence
  typeCps: 38,         // teletype characters per second (Level Data description)
  typeParaPause: 350,  // ms pause between paragraphs while typing
  endHold: 900,        // ms on the board after the last kill / last Core before the verdict
  verdictHold: 2200,   // ms the SUCCESS / FAILURE verdict sits over the board
  slideIn: 450,        // ms for the Result screen to slide on
  countUp: 600,        // ms for the Cores pill to count up
  welcomePause: 650,   // ms: Welcome screen, the short pause after each section
  welcomeQuick: 180,   // ms: Welcome screen, Welcome_line_3 → Welcome_line_4 ("quick succession")
  avatarDrop: 320,     // ms: one avatar's drop onto the Welcome screen (CSS .rv-drop matches)
  avatarStep: 300,     // ms between avatar landings
};

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const h = (tag, cls, text) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
};

// Mark an element for a timed reveal: style = left | right | up | pop | fade | bar
const rv = (el, style = 'up') => { el.classList.add('rv', `rv-${style}`); return el; };

// Multi-paragraph text: each line of the value is its own paragraph.
const paras = (cls, text) => {
  const box = h('div', cls);
  for (const line of (text || '').split('\n')) box.appendChild(h('p', '', line));
  return box;
};

const avatar = (archive, cls) => {
  const img = h('img', cls);
  img.alt = archive?.name || '';
  img.src = AVATAR_DIR + (archive?.icon || DEFAULT_AVATAR);
  img.onerror = () => { img.onerror = null; img.src = AVATAR_DIR + DEFAULT_AVATAR; };
  return img;
};

const iconBtn = (file, cls, label, onTap) => {
  const b = h('button', cls);
  b.setAttribute('aria-label', label);
  const img = h('img');
  img.src = ICONS + file;
  img.alt = '';
  b.appendChild(img);
  b.addEventListener('click', onTap);
  return b;
};

const blueBtn = (label, onTap) => {
  const b = h('button', 'story-btn', label);
  b.addEventListener('click', onTap);
  return b;
};

// A small canvas with the enemy drawn the way the board draws it.
const enemyIcon = (type) => {
  const c = h('canvas', 'an-icon');
  const css = 30, dpr = window.devicePixelRatio || 1;
  c.width = c.height = css * dpr;
  const ctx = c.getContext('2d');
  const def = ENEMIES[type];
  if (!def) return c;
  ctx.scale(dpr, dpr);
  ctx.translate(css / 2, css / 2);
  if (type !== 'worm') ctx.scale(1, -1);   // point down, as on the board
  ctx.shadowColor = def.color;
  ctx.shadowBlur = 8;
  drawEnemyShape(ctx, type, css * 0.62, def.color);
  return c;
};

export class Story {
  constructor() {
    this.root = document.getElementById('story');
    this.popup = document.getElementById('story-popup');
    this.verdict = document.getElementById('verdict');
    this.timers = [];
    this.finishers = [];   // run on tap-to-skip: complete whatever is mid-build
  }

  // --- scheduling ---------------------------------------------------------------
  later(fn, ms) {
    if (reducedMotion()) ms = 0;
    const id = setTimeout(() => { this.timers = this.timers.filter(t => t !== id); fn(); }, ms);
    this.timers.push(id);
  }

  clearTimers() {
    for (const id of this.timers) clearTimeout(id);
    this.timers = [];
    this.finishers = [];
  }

  // Reveal els one after another from `start` ms; returns when the last one shows.
  seq(els, start = 0, step = TIMING.step) {
    els.filter(Boolean).forEach((el, i) => this.later(() => el.classList.add('in'), start + i * step));
    return start + Math.max(0, els.filter(Boolean).length - 1) * step;
  }

  // Tap anywhere on a building screen: show everything now.
  skip(host) {
    for (const id of this.timers) clearTimeout(id);
    this.timers = [];
    for (const fn of this.finishers.splice(0)) fn();
    for (const el of host.querySelectorAll('.rv')) el.classList.add('in');
  }

  // --- teletype ---------------------------------------------------------------------
  // Types `text` into `box` one character at a time. The full text is laid out
  // up front (hidden) so the card never jumps as lines fill. Calls done() at the end.
  teletype(box, text, start, done) {
    box.innerHTML = '';
    const parts = (text || '').split('\n').map((line) => {
      const p = h('p');
      const shown = h('span', 'tt-shown');
      const rest = h('span', 'tt-rest', line);
      p.append(shown, rest);
      box.appendChild(p);
      return { line, shown, rest };
    });
    const cursor = h('span', 'tt-cursor');
    let pi = 0, ci = 0;
    const finish = () => {
      for (const pt of parts) { pt.shown.textContent = pt.line; pt.rest.textContent = ''; }
      cursor.remove();
      done?.();
      done = null;
    };
    this.finishers.push(finish);
    const tick = () => {
      const pt = parts[pi];
      if (!pt) { this.finishers = this.finishers.filter(f => f !== finish); finish(); return; }
      if (ci === 0) pt.shown.after(cursor);
      ci++;
      pt.shown.textContent = pt.line.slice(0, ci);
      pt.rest.textContent = pt.line.slice(ci);
      if (pt.line[ci - 1].trim()) sfx('ui_type');   // M8: a key click per letter (not spaces)
      if (ci >= pt.line.length) { pi++; ci = 0; this.later(tick, TIMING.typeParaPause); }
      else this.later(tick, 1000 / TIMING.typeCps);
    };
    this.later(tick, start);
  }

  // --- shared furniture ------------------------------------------------------------------
  // The glowing card (revealed first), optional Back button, wallet top right.
  card(host, { onBack, wallet } = {}) {
    if (host === this.root) this.clearTimers();
    host.classList.remove('slide-in', 'slid');
    host.innerHTML = '';
    host.onclick = null;
    if (wallet) {
      const w = h('div', 'story-wallet');
      w.innerHTML = `<div>Tokens ${wallet.tokens}<span class="cur-swatch tok"></span></div>`
        + `<div>Bits ${wallet.bits}<span class="cur-swatch bit"></span></div>`;
      host.appendChild(w);
    }
    const card = rv(h('div', 'story-card'), 'card');
    if (onBack) card.appendChild(rv(iconBtn('Icon_Button_Back.png', 'story-back', 'Back', onBack), 'pop'));
    host.appendChild(card);
    host.classList.add('show');
    this.later(() => card.classList.add('in'), 20);
    // tap-to-skip while the screen is still building (buttons still work as normal)
    host.onclick = (ev) => { if (!ev.target.closest('button')) this.skip(host); };
    return card;
  }

  hide() {
    this.clearTimers();
    this.root.classList.remove('show');
    this.popup.classList.remove('show');
  }

  // 0. Welcome (M9, Welcome_Screen.png): shown at the start of every Tutorial run.
  // Builds in five sections, each teletyped, with a short pause after each:
  //   title → line 2 → lines 3 + 4 (quick succession) → five avatars drop in
  //   (a key click as each lands) → line 5, then the Begin Training button.
  // Tap to skip shows the whole screen at once.
  showWelcome(text, { onBegin }) {
    sfx('ui_whoosh');
    const card = this.card(this.root);
    card.classList.add('welcome');
    let skipped = false;
    // registered first, so it runs before the active teletype's finisher on a skip
    this.finishers.push(() => {
      skipped = true;
      for (const [box, line] of boxes) { box.textContent = line; box.style.visibility = ''; }
    });
    const boxes = [];
    const typed = (cls, id) => {
      const box = h('div', cls);
      const line = text[id] || '';
      box.textContent = line;   // full text laid out from the start, so nothing jumps
      box.style.visibility = 'hidden';
      boxes.push([box, line]);
      return box;
    };
    const title = typed('welcome-title', 'Welcome_line_1_Title');
    const l2 = typed('welcome-line', 'Welcome_line_2');
    const l3 = typed('welcome-line', 'Welcome_line_3');
    const l4 = typed('welcome-line', 'Welcome_line_4');
    const l5 = typed('welcome-line', 'Welcome_line_5');
    const pics = h('div', 'welcome-avatars');
    const avs = WELCOME_AVATARS.map((file, i) => {
      const img = rv(h('img', `welcome-av av-${i + 1}`), 'drop');
      img.alt = '';
      img.src = AVATAR_DIR + file;
      img.onerror = () => { img.onerror = null; img.src = AVATAR_DIR + DEFAULT_AVATAR; };
      pics.appendChild(img);
      return img;
    });
    const btn = rv(blueBtn(text.Welcome_line_6_Prompt || 'Begin training', onBegin), 'up');
    const body = h('div', 'welcome-body');
    body.append(title, l2, l3, l4, pics, l5);
    card.append(h('div', 'welcome-spacer'), body, h('div', 'welcome-spacer'), btn);

    // teletype one box, then call next after `pause` ms (nothing more once skipped)
    const type = (box, start, pause, next) => this.later(() => {
      if (skipped) return;
      box.style.visibility = '';
      this.teletype(box, box.textContent, 0, () => { if (!skipped) this.later(next, pause); });
    }, start);
    const dropAvatars = () => {
      avs.forEach((img, i) => {
        this.later(() => img.classList.add('in'), i * TIMING.avatarStep);
        this.later(() => sfx('ui_type'), i * TIMING.avatarStep + TIMING.avatarDrop);   // as it lands
      });
      this.later(() => type(l5, 0, 250, () => btn.classList.add('in')),
        (avs.length - 1) * TIMING.avatarStep + TIMING.avatarDrop + TIMING.welcomePause);
    };
    type(title, TIMING.cardIn + 200, TIMING.welcomePause, () =>
      type(l2, 0, TIMING.welcomePause, () =>
        type(l3, 0, TIMING.welcomeQuick, () =>
          type(l4, 0, TIMING.welcomePause, dropAvatars))));
  }

  // 1. Level Data: background, then bar, title, teletyped description, Continue.
  showLevelData(levelText, { wallet, onBack, onContinue }) {
    sfx('ui_whoosh');   // M8
    const card = this.card(this.root, { onBack, wallet });
    card.classList.add('level-data');
    card.appendChild(h('div', 'story-spacer'));
    const bar = rv(h('div', 'story-bar'), 'bar');
    const label = rv(h('span', '', levelText.label), 'fade');
    bar.appendChild(label);
    card.appendChild(bar);
    const body = h('div', 'story-body centered');
    const title = rv(h('h2', 'story-title', levelText.narrativeLabel), 'up');
    const desc = h('div', 'story-desc');
    body.append(title, desc);
    card.appendChild(body);
    const btn = rv(blueBtn('Continue', onContinue), 'up');
    card.appendChild(btn);

    const t = this.seq([card.querySelector('.story-back'), bar, label, title], TIMING.cardIn, TIMING.step * 1.6);
    this.teletype(desc, levelText.narrativeDesc, t + 400, () => this.later(() => btn.classList.add('in'), 250));
  }

  // 2. Archive Record: who the enemies are attacking this run.
  // onStart null = pop-up mode (from the Result screen): Back only, no build-up.
  // lost: memories lost this run (from the Result screen's Info button), shown in red.
  // tutorial: the Tutorial text table (S24). When given, the card opens under Jogo's
  // Archive_Details_Screen_Tut overlay: captions + red outlines + Continue, which
  // starts the level (M9, Jogo 12 Nov: no second, plain Archive Record after it).
  showArchive(run, strings, { wallet, onBack, onStart, host = this.root, lost = [], tutorial = null }) {
    sfx(host === this.root ? 'ui_whoosh' : 'ui_popup');   // M8
    const card = this.card(host, { onBack, wallet });
    card.classList.add('archive');
    const bar = rv(h('div', 'story-bar with-icon'), 'bar');
    const info = rv(h('img', 'story-bar-icon'), 'pop');
    info.src = ICONS + 'Icon_Info.png';
    info.alt = '';
    const heading = rv(h('span', '', strings.Archive_Heading), 'fade');
    bar.append(info, heading);
    card.appendChild(bar);

    const body = h('div', 'story-body');
    const who = h('div', 'archive-who');
    const av = rv(avatar(run.archive, 'archive-avatar'), 'left');
    who.appendChild(av);
    const facts = h('div', 'archive-facts');
    const factEls = [rv(h('div', 'archive-name', run.archive.name), 'right')];
    // Archive Class (type) is a writing aid, not shown (S18).
    // S23: the Sub-Class line gets a small grey "Data at Risk:" header (Jogo's 7 Nov mockup).
    if (run.archive.bio) factEls.push(rv(h('div', 'archive-fact', run.archive.bio), 'right'));
    if (run.archive.description) {
      const risk = h('div', 'archive-fact risk');
      risk.append(h('div', 'archive-risk-head', strings.Archive_Data_Risk), h('div', '', run.archive.description));
      factEls.push(rv(risk, 'right'));
    }
    facts.append(...factEls);
    who.appendChild(facts);
    body.appendChild(who);

    // S20: no headings. ★ marks the Core Memory, • each Secondary Memory;
    // memories lost this run are red. (\uFE0E keeps ★ a text glyph, not an emoji.)
    const memory = (m, mark) => {
      const el = rv(paras('mem-text' + (lost.includes(m) ? ' gone' : ''), m.text), 'up');
      const first = el.querySelector('p');
      if (first) first.prepend(h('span', 'mem-mark', mark));
      return el;
    };
    // S23: the memories scroll inside the card so the card never runs off an iPhone
    // screen; the scroll bar only shows while scrolling (see .archive-scroll).
    const scroll = h('div', 'archive-scroll');
    let idle = 0;
    scroll.addEventListener('scroll', () => {
      scroll.classList.add('scrolling');
      clearTimeout(idle);
      idle = setTimeout(() => scroll.classList.remove('scrolling'), 900);
    }, { passive: true });
    const memEls = [memory(run.core, '\u2605\uFE0E')];
    scroll.appendChild(memEls[0]);
    if (run.secondary.length) {
      const list = h('div', 'mem-list');
      for (const m of run.secondary) { const el = memory(m, '\u2022'); list.appendChild(el); memEls.push(el); }
      scroll.appendChild(list);
    }
    body.appendChild(scroll);
    card.appendChild(body);

    // S23: the "Victim under attack" banner and chevrons are gone (Jogo's 7 Nov mockup).
    const tail = [];
    if (onStart && tutorial) {
      card.classList.add('tut-mode');
      const capTop = rv(h('div', 'tut-cap top', tutorial.Archive_Tut_Top), 'fade');
      const capBottom = rv(h('div', 'tut-cap bottom', tutorial.Archive_Tut_Bottom), 'fade');
      body.prepend(capTop);
      body.appendChild(capBottom);
      const cont = rv(blueBtn(tutorial.Tut_Continue, onStart), 'up');
      card.append(cont);
      tail.push(capTop, capBottom, cont);
    } else if (onStart) {
      const btn = rv(blueBtn('Start >>', onStart), 'up');
      card.append(btn);
      tail.push(btn);
    } else if (onBack) {
      // S26: pop-up from the Result screen — a normal Back button at the bottom
      // as well as the arrow at the top (Jogo's redundancy ask)
      const btn = rv(blueBtn(strings.Archive_Back ?? 'Back', onBack), 'up');
      card.append(btn);
      tail.push(btn);
    }

    const order = [card.querySelector('.story-back'), bar, info, heading, av, ...factEls, ...memEls, ...tail];
    if (!onStart) { for (const el of order) el?.classList.add('in'); card.classList.add('in'); return; }   // pop-up: instant
    this.seq(order, TIMING.cardIn);
  }

  // 3a. Verdict over the board: icon + SUCCESS / FAILURE, then onDone.
  showVerdict(win, strings, onDone) {
    this.clearTimers();
    const v = this.verdict;
    v.innerHTML = '';
    v.className = win ? 'win' : 'lose';
    const icon = rv(h('img', 'verdict-icon'), 'pop');
    icon.src = ICONS + (win ? 'Icon_Result_Success.png' : 'Icon_Result_Fail.png');
    icon.alt = '';
    const title = rv(h('div', 'verdict-title', win ? strings.Result_Win_Title : strings.Result_Lose_Title), 'pop');
    v.append(icon, title);
    this.later(() => v.classList.add('show'), TIMING.endHold);
    this.seq([icon, title], TIMING.endHold + 150, 250);
    this.later(onDone, TIMING.endHold + TIMING.verdictHold);
  }

  // 3b. Level Result: slides on over the board, then builds in sequence.
  showResult(r, strings, { wallet, onContinue }) {
    sfx('ui_whoosh');   // M8
    const card = this.card(this.root, { wallet });
    this.root.classList.add('slide-in');
    this.later(() => this.root.classList.add('slid'), 20);
    this.later(() => this.verdict.classList.remove('show'), TIMING.slideIn);
    card.classList.add('result', r.win ? 'win' : 'lose');
    const icon = rv(h('img', 'result-icon'), 'pop');
    icon.src = ICONS + (r.win ? 'Icon_Result_Success.png' : 'Icon_Result_Fail.png');
    icon.alt = '';
    const title = rv(h('div', 'result-title', r.win ? strings.Result_Win_Title : strings.Result_Lose_Title), 'pop');
    card.append(icon, title);

    const body = h('div', 'story-body centered');
    const outcomeText = r.win ? (r.run?.archive.winLabel || strings.Result_Win_Label)
                              : (r.run?.archive.loseLabel || strings.Result_Lose_Label);
    const outcome = rv(h('div', 'result-outcome', outcomeText), 'fade');
    const coresLabel = rv(h('div', 'result-cores-label', strings.Result_Cores_Label), 'fade');
    const pill = rv(h('div', 'result-pill', `0/${r.maxLives}`), 'pop');
    body.append(outcome, coresLabel, pill);
    const order = [icon, title, outcome, coresLabel, pill];

    if (r.run) {
      const av = rv(h('div', 'result-avatar'), 'pop');
      av.appendChild(avatar(r.run.archive, 'archive-avatar'));
      av.appendChild(iconBtn('Icon_Info.png', 'result-info', 'Archive details', () => this.showArchivePopup(r.run, strings, r.lost)));
      body.appendChild(av);
      const lost = h('div', 'result-lost');
      const head = rv(h('div', 'mem-head', strings.Memories_Lost_Heading), 'fade');
      lost.appendChild(head);
      order.push(av, head);
      if (r.lost.length === 0) { const n = rv(h('div', 'mem-text dim', strings.No_Memories_Lost), 'fade'); lost.appendChild(n); order.push(n); }
      for (const m of r.lost) { const el = rv(h('div', 'mem-text lost', m.summary), 'glitch'); lost.appendChild(el); order.push(el); }
      body.appendChild(lost);
    }
    if (r.note) { const n = rv(h('div', 'result-note', r.note), 'fade'); body.appendChild(n); order.push(n); }
    card.appendChild(body);
    const btn = rv(blueBtn('Continue', onContinue), 'up');
    card.appendChild(btn);

    // the pill counts up to the Cores left as it appears
    const start = TIMING.slideIn + 150;
    const pillAt = start + order.indexOf(pill) * TIMING.step;
    const countTo = (n) => { pill.textContent = `${n}/${r.maxLives}`; };
    this.finishers.push(() => countTo(r.lives));
    const steps = Math.max(1, r.lives);
    // M8 (Jogo, 10 Nov): the teletype click on every step of the count
    for (let i = 1; i <= steps; i++) this.later(() => { countTo(Math.round((r.lives * i) / steps)); if (r.lives > 0) sfx('ui_type'); }, pillAt + (TIMING.countUp * i) / steps);
    // memories lost land one at a time, a beat apart
    const t = this.seq(order, start, TIMING.step);
    this.later(() => btn.classList.add('in'), t + 400);
  }

  // 4. Analytics Report (S20): the level in numbers, after the Result screen.
  // stats from game.js newLevelStats(); labels from Screen Text (narrative.js).
  // S25: onNext given (a won level with a level after it) → Main Menu (left, dark) +
  // Next Level (right, bright blue) instead of Continue. onContinue = Main Menu.
  showAnalytics(stats, strings, { wallet, onContinue, onNext = null, difficulty = null }) {
    sfx('ui_whoosh');   // M8
    const card = this.card(this.root, { wallet });
    card.classList.add('analytics');
    card.appendChild(h('div', 'story-spacer'));
    const bar = rv(h('div', 'story-bar'), 'bar');
    const label = rv(h('span', '', strings.Analytics_Heading), 'fade');
    bar.appendChild(label);
    card.appendChild(bar);

    const body = h('div', 'story-body');
    const order = [bar, label];
    const row = (name, value, cls = '') => {
      const r = rv(h('div', 'an-row ' + cls), 'up');
      r.append(h('span', 'an-label', name), h('span', 'an-value', String(value)));
      body.appendChild(r);
      order.push(r);
      return r;
    };
    // M9: which difficulty this run was (none for the Tutorial)
    if (difficulty) row(strings.Analytics_Difficulty ?? 'Difficulty',
      difficulty === 'advanced' ? (strings.Difficulty_Advanced ?? 'Advanced') : (strings.Difficulty_Basic ?? 'Basic'), 'diff ' + difficulty);
    row(strings.Analytics_Built, stats.built);
    row(strings.Analytics_Lost, stats.lost);
    row(strings.Analytics_Upgraded, stats.upgraded);
    row(strings.Analytics_Earned, stats.earned, 'tok');
    row(strings.Analytics_Spent, stats.spent, 'tok');
    row(strings.Analytics_Kills, stats.kills);

    const leaks = Object.entries(stats.leakedBy).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    const head = rv(h('div', 'mem-head an-head', strings.Analytics_Cores_Lost), 'fade');
    body.appendChild(head);
    order.push(head);
    if (leaks.length === 0) {
      const none = rv(h('div', 'an-none', strings.Analytics_No_Cores_Lost), 'fade');
      body.appendChild(none);
      order.push(none);
    }
    for (const [type, n] of leaks) {
      const r = rv(h('div', 'an-leak'), 'up');
      r.append(enemyIcon(type), h('span', 'an-label', ENEMIES[type]?.name ?? type), h('span', 'an-value', `\u00D7${n}`));
      body.appendChild(r);
      order.push(r);
    }
    card.appendChild(body);
    let btn;
    if (onNext) {
      btn = rv(h('div', 'story-btn-row'), 'up');
      const menu = h('button', 'story-btn dark', strings.Report_Main_Menu);
      menu.addEventListener('click', onContinue);
      btn.append(menu, blueBtn(strings.Report_Next_Level, onNext));
    } else btn = rv(blueBtn('Continue', onContinue), 'up');
    card.appendChild(btn);
    const t = this.seq(order, TIMING.cardIn, TIMING.step);
    this.later(() => btn.classList.add('in'), t + 300);
  }

  showArchivePopup(run, strings, lost = []) {
    this.showArchive(run, strings, { host: this.popup, lost, onBack: () => this.popup.classList.remove('show') });
  }
}
