// TDX run recorder (M9). A debug switch (ECONOMY tab, saved as save.recordRuns)
// logs one run as compact JSON: the board, every build / upgrade / sell, towers
// lost, leaks, waves, surges and CRASHes, plus a sample every 2 s. At the end
// of the run it POSTs to serve.py (/runs/save → Notes/runs/), and keeps the
// last few runs in localStorage so the debug menu can download them anywhere.
// Used to compare Jogo's play with the Sim's bots (tools/sim). No DOM here.

import { VERSION, ENEMIES } from './config.js';

const KEEP_KEY = 'tdx-runs';
const KEEP = 5;
const SAMPLE_EVERY = 2;   // seconds, during waves
const cellId = (c) => c ? [c.q, c.r] : null;
const r1 = (v) => Math.round(v * 10) / 10;

export class Recorder {
  constructor() { this.run = null; this.nextId = 1; this.ids = new WeakMap(); this.sampleT = 0; }

  get on() { return !!this.run; }
  id(t) { if (!this.ids.has(t)) this.ids.set(t, this.nextId++); return this.ids.get(t); }

  start(s, grid, save) {
    this.nextId = 1; this.ids = new WeakMap(); this.sampleT = 0;
    const cells = [...grid.cells.values()];
    this.run = {
      v: 1, game: `${VERSION.number} ${VERSION.codename}`, at: new Date().toISOString(),
      level: s.levelIndex, name: s.level.name, difficulty: s.difficulty, t0: s.time,
      startTokens: s.tokens, lives: s.lives,
      board: {
        spawns: grid.spawns.map(cellId),
        blockers: cells.filter(c => c.blocker).map(cellId),
        lockouts: cells.filter(c => c.lockout).map(cellId),
      },
      meta: { towersUnlocked: [...save.towersUnlocked], tierUnlocks: { ...save.tierUnlocks } },
      events: [], samples: [], waves: [],
    };
  }

  ev(s, type, data = {}) {
    if (!this.run) return;
    this.run.events.push({ t: r1(s.time - this.t0()), w: s.waveIndex + 1, ph: s.phase === 'wave' ? 'w' : 'b', e: type, tok: s.tokens, ...data });
  }
  t0() { return this.run.t0; }

  build(s, tower) { this.ev(s, 'build', { id: this.id(tower), type: tower.type, cell: cellId(tower.cell) }); }
  upgrade(s, tower) { this.ev(s, 'upgrade', { id: this.id(tower), type: tower.type, tier: tower.tier + 1, cost: tower.upgradeCost }); }
  sell(s, tower) { this.ev(s, 'sell', { id: this.id(tower), type: tower.type, tier: tower.tier, refund: tower.sellValue }); }
  lost(s, tower, cause) { this.ev(s, 'lost', { id: this.id(tower), type: tower.type, tier: tower.tier, cause, by: cause === 'drain' ? tower.attackedBy : undefined }); }
  leak(s, enemy) { this.ev(s, 'leak', { type: enemy.type, lives: s.lives }); }

  waveStart(s) {
    if (!this.run) return;
    this.cur = { wave: s.waveIndex + 1, start: r1(s.time - this.run.t0), tokens: s.tokens, lives: s.lives, towers: this.board(s), kills: 0, leaks: 0, earned: 0 };
    this.ev(s, 'wave_start');
  }
  kill(s, enemy) { if (this.cur) { this.cur.kills++; this.cur.earned += enemy.def.reward; } }
  leaked(s, enemy) { if (this.cur) this.cur.leaks++; this.leak(s, enemy); }
  waveEnd(s) {
    if (!this.run || !this.cur) return;
    Object.assign(this.cur, { end: r1(s.time - this.run.t0), tokensEnd: s.tokens, livesEnd: s.lives, towersEnd: this.board(s) });
    this.run.waves.push(this.cur); this.cur = null;
  }

  // tower counts by type and tier, e.g. { threader: [5, 2, 0, 0] }
  board(s) {
    const out = {};
    for (const t of s.towers) { const a = (out[t.type] ??= [0, 0, 0, 0]); a[Math.min(3, t.tier - 1)]++; }
    return out;
  }

  tick(s, dt) {
    if (!this.run || s.phase !== 'wave') return;
    this.sampleT += dt;
    if (this.sampleT < SAMPLE_EVERY) return;
    this.sampleT = 0;
    let ev = 0, n = 0;
    for (const e of s.enemies) if (e.alive) { ev += ENEMIES[e.type].ev; n++; }
    this.run.samples.push([r1(s.time - this.t0()), s.waveIndex + 1, s.tokens, s.lives, s.towers.length, n, ev]);
  }

  // end of run: returns the JSON text, posts it, keeps a copy
  finish(s, win) {
    if (!this.run) return null;
    if (this.cur) this.waveEnd(s);
    Object.assign(this.run, { win, livesEnd: Math.max(0, s.lives), tokensEnd: s.tokens, wavesPlayed: this.run.waves.length, stats: s.stats,
      sampleCols: ['t', 'wave', 'tokens', 'lives', 'towers', 'enemies', 'enemyEV'] });
    delete this.run.t0;
    const text = JSON.stringify(this.run);
    const name = `L${this.run.level}-${this.run.difficulty}-${win ? 'win' : 'loss'}-${this.run.at.slice(0, 16).replace(/[-:T]/g, '')}`;
    keepRun(name, text);
    try {
      fetch('/runs/save', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Run-Name': name }, body: text })
        .catch(() => { /* no serve.py (GitHub Pages): the copy in localStorage stays */ });
    } catch { /* ignore */ }
    this.run = null;
    return text;
  }
}

export function keptRuns() {
  try { return JSON.parse(globalThis.localStorage?.getItem(KEEP_KEY) || '[]'); } catch { return []; }
}
function keepRun(name, text) {
  try {
    const runs = keptRuns().filter(r => r.name !== name);
    runs.unshift({ name, text });
    globalThis.localStorage?.setItem(KEEP_KEY, JSON.stringify(runs.slice(0, KEEP)));
  } catch { /* storage full or blocked: the POST still went */ }
}
