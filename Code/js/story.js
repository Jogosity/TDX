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

import { AVATAR_DIR, DEFAULT_AVATAR } from './narrative.js';

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

  // 1. Level Data: background, then bar, title, teletyped description, Continue.
  showLevelData(levelText, { wallet, onBack, onContinue }) {
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
  showArchive(run, strings, { wallet, onBack, onStart, host = this.root }) {
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
    for (const k of ['bio', 'type', 'description']) if (run.archive[k]) factEls.push(rv(h('div', 'archive-fact', run.archive[k]), 'right'));
    facts.append(...factEls);
    who.appendChild(facts);
    body.appendChild(who);

    const memEls = [rv(h('div', 'mem-head', strings.Core_Memory_Heading), 'fade'), rv(paras('mem-text', run.core.text), 'up')];
    if (run.secondary.length) {
      memEls.push(rv(h('div', 'mem-head', strings.Secondary_Memories_Heading), 'fade'));
      const list = h('div', 'mem-list');
      for (const m of run.secondary) { const p = rv(paras('mem-text', m.text), 'up'); list.appendChild(p); memEls.push(p); }
      body.append(memEls[0], memEls[1], memEls[2], list);
    } else body.append(...memEls);
    card.appendChild(body);

    const tail = [];
    if (onStart) {
      const warn = rv(h('div', 'story-warning'), 'fade');
      const words = h('div', 'sw-text');
      words.append(h('div', '', strings.Archive_Attack_Line1), h('div', '', strings.Archive_Attack_Line2));
      warn.append(h('span', 'chev teal'), words, h('span', 'chev teal'));
      const btn = rv(blueBtn('Start >>', onStart), 'up');
      card.append(warn, btn);
      tail.push(warn, btn);
    }

    const order = [card.querySelector('.story-back'), bar, info, heading, av, ...factEls, ...memEls, ...tail];
    if (!onStart) { for (const el of order) el?.classList.add('in'); card.classList.add('in'); return; }   // pop-up: instant
    const t = this.seq(order, TIMING.cardIn);
    this.later(() => tail[0]?.classList.add('pulse'), t + 300);
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
      av.appendChild(iconBtn('Icon_Info.png', 'result-info', 'Archive details', () => this.showArchivePopup(r.run, strings)));
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
    for (let i = 1; i <= steps; i++) this.later(() => countTo(Math.round((r.lives * i) / steps)), pillAt + (TIMING.countUp * i) / steps);
    // memories lost land one at a time, a beat apart
    const t = this.seq(order, start, TIMING.step);
    this.later(() => btn.classList.add('in'), t + 400);
  }

  showArchivePopup(run, strings) {
    this.showArchive(run, strings, { host: this.popup, onBack: () => this.popup.classList.remove('show') });
  }
}
