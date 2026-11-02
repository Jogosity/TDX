// TDX Level Editor — the page. Everything you change lands in `levels` (a
// copy of js/levels.js); Save writes it back through serve.py. The game, the
// Sim, the Ledger and the tests all read that one file.

import { LEVELS, ENEMIES, TOWERS, TOWER_ORDER, BLUEPRINTS, GRID } from '../../js/config.js';
import { COL } from '../../js/render.js';
import { buildBoard, validateLevels, LIMITS } from './validate.js';
import { formatLevels } from './format.js';
import { targetCurve } from '../ledger/target.js';
import {
  curveLine, curveAt, applyCurve, setWaveCount, rosterLanes, setRosterLanes,
  normalizeLevel, blankLevel, ENEMY_KEYS, OPENING,
} from './model.js';

const $ = id => document.getElementById(id);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmt = (n, d = 0) => Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d }) : '–';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shortName = L => L.name.split(': ')[1] ?? L.name;
const LOCKABLE = TOWER_ORDER.filter(k => TOWERS[k].blueprints > 0);
const SLOTS = ['primary', 'secondary', 'tertiary'];

// ---------------------------------------------------------------- state
let levels = structuredClone(LEVELS).map(normalizeLevel);
let cur = 0;
let savedText = formatLevels(levels);
let boardSeed = 1;
let live = null;        // Ledger for the current level: { forVersion, waves }
let campaign = null;    // Ledger for every level (strip verdicts, unlock track)
let version = 0;        // bumps on every change
let problems = { errors: [], warnings: [] };
const level = () => levels[cur];

// ---------------------------------------------------------------- undo / redo
// A gesture (one drag, one slider move, one typing burst) is one undo step.
const undoStack = [], redoStack = [];
let inGesture = false;
const snapshot = () => JSON.stringify({ levels, cur });
function begin() {
  if (inGesture) return;
  undoStack.push(snapshot());
  if (undoStack.length > 300) undoStack.shift();
  redoStack.length = 0;
  inGesture = true;
}
function end() { inGesture = false; chrome(); }
function edit(fn) { begin(); fn(); end(); changed(); }
function restore(text) {
  const s = JSON.parse(text);
  levels = s.levels; cur = Math.min(s.cur, levels.length - 1);
  changed(true);
}
function undo() { if (!undoStack.length) return; redoStack.push(snapshot()); restore(undoStack.pop()); }
function redo() { if (!redoStack.length) return; undoStack.push(snapshot()); restore(redoStack.pop()); }

// ---------------------------------------------------------------- change fan-out
let validateTimer = 0, campaignTimer = 0;
function changed(rebuild = false) {
  version++;
  if (rebuild) buildKnobs();
  renderStrip(); renderName(); renderBoard(); renderCurve(); renderPressure(); renderLanes(); renderUnlocks();
  requestLive();
  clearTimeout(campaignTimer); campaignTimer = setTimeout(requestCampaign, 450);
  clearTimeout(validateTimer); validateTimer = setTimeout(() => { problems = validateLevels(levels); renderProblems(); chrome(); }, 250);
  chrome();
}
function selectLevel(i) {
  if (i === cur || i < 0 || i >= levels.length) return;
  cur = i; live = null; boardSeed = 1;
  changed(true);
}

// Header: saved / unsaved / problems, undo + redo availability.
function chrome() {
  const dirty = formatLevels(levels) !== savedText;
  const st = $('status');
  const errs = problems.errors.length;
  st.className = errs ? 'bad' : dirty ? 'dirty' : '';
  st.textContent = errs ? `${errs} problem${errs > 1 ? 's' : ''} to fix before saving` : dirty ? 'Unsaved changes' : 'Saved. Commit with GitHub Desktop when you’re happy.';
  $('undo').disabled = !undoStack.length;
  $('redo').disabled = !redoStack.length;
  $('save').disabled = !dirty || errs > 0;
  window.onbeforeunload = dirty ? () => true : null;
}

// ---------------------------------------------------------------- Ledger (workers)
// Two workers: one answers the current level fast while you drag, the other
// redoes the whole campaign shortly after you stop.
const liveWorker = new Worker(new URL('./ledger-worker.js', import.meta.url), { type: 'module' });
const campWorker = new Worker(new URL('./ledger-worker.js', import.meta.url), { type: 'module' });
let liveBusy = false, liveAgain = false;
function requestLive() {
  if (liveBusy) { liveAgain = true; return; }
  liveBusy = true; liveAgain = false;
  liveWorker.postMessage({ id: { version, cur }, levels: [level()], samples: 150 });
}
liveWorker.onmessage = ({ data }) => {
  liveBusy = false;
  if (data.id.cur === cur) {
    live = data.result[0];
    if (campaign?.[cur] && campaign.length === levels.length) campaign[cur] = live;
    renderPressure(); renderLanes(); renderStrip(); renderUnlocks();
  }
  if (liveAgain) requestLive();
};
function requestCampaign() { campWorker.postMessage({ id: version, levels, samples: 150 }); }
campWorker.onmessage = ({ data }) => {
  if (data.id !== version) return;     // stale: a newer request is on its way
  campaign = data.result;
  renderStrip(); renderUnlocks();
};

const verdictOf = l => {
  if (!l) return ['', '…', 0];
  const d = l.waves.reduce((s, w) => s + (w.pressure - w.target), 0) / l.waves.length;
  return d < -0.1 ? ['easy', 'Too easy', d] : d > 0.1 ? ['hard', 'Too hard', d] : ['ok', 'On target', d];
};

// ---------------------------------------------------------------- controls
// A slider row. Builds once per level (rebuilding would drop the drag).
function knob(host, { label, value, min, max, step, show, set, note }) {
  const wrap = document.createElement('div');
  wrap.className = 'knob';
  wrap.innerHTML = `<label>${label}</label><output></output><input type="range" min="${min}" max="${max}" step="${step}">${note ? `<span class="note">${note}</span>` : ''}`;
  const input = wrap.querySelector('input'), out = wrap.querySelector('output');
  input.value = value; out.textContent = show(value);
  input.addEventListener('input', () => { begin(); const v = +input.value; out.textContent = show(v); set(v); changed(); });
  input.addEventListener('change', end);
  host.appendChild(wrap);
}

function buildKnobs() {
  const L = level(), c = L.design.curve;
  // board
  const b = $('boardKnobs'); b.innerHTML = '';
  knob(b, { label: 'Entry points', value: L.spawns, min: LIMITS.spawns[0], max: LIMITS.spawns[1], step: 1, show: v => v, set: v => { L.spawns = v; } });
  knob(b, { label: 'Entry rows', value: L.grid.entryRows, min: 1, max: 10, step: 1, show: v => `top ${v}`, set: v => { L.grid.entryRows = v; },
    note: 'Extra entry points appear in this many rows from the top.' });
  knob(b, { label: 'Min distance to base', value: L.grid.entryMinDist, min: 0, max: 20, step: 1, show: v => v ? `${v} steps` : 'any', set: v => { L.grid.entryMinDist = v; },
    note: 'Extra entry points are at least this many steps from the base.' });
  knob(b, { label: 'Blockers', value: L.blockers, min: 0, max: 30, step: 1, show: v => v, set: v => { L.blockers = v; } });
  knob(b, { label: 'Lockouts (locked sectors)', value: L.lockouts, min: 0, max: 20, step: 1, show: v => v, set: v => { L.lockouts = v; } });
  // theme
  const th = $('theme'); th.innerHTML = '';
  for (const [key, label] of [['cellFill', 'Cell'], ['cellLine', 'Edge'], ['blockerFill', 'Blocker'], ['blockerLine', 'Blocker edge']]) {
    const lab = document.createElement('label');
    lab.innerHTML = `<input type="color" value="${L.theme[key] ?? COL[key]}"> ${label}`;
    const inp = lab.querySelector('input');
    inp.addEventListener('input', () => { begin(); L.theme[key] = inp.value; changed(); });
    inp.addEventListener('change', end);
    th.appendChild(lab);
  }
  const reset = document.createElement('button');
  reset.className = 'small'; reset.textContent = 'Baseline colours';
  reset.addEventListener('click', () => edit(() => { L.theme = {}; buildKnobs(); }));
  th.appendChild(reset);
  // curve
  const k = $('curveKnobs'); k.innerHTML = '';
  const reshape = fn => v => { fn(v); applyCurve(L); };
  knob(k, { label: 'Waves', value: L.waves.length, min: LIMITS.waves[0], max: LIMITS.waves[1], step: 1, show: v => v, set: v => setWaveCount(L, v) });
  knob(k, { label: 'Peak TEV', value: c.tev, min: 500, max: 40000, step: 100, show: v => fmt(v), set: reshape(v => { c.tev = v; }),
    note: 'Enemy budget at full intensity.' });
  knob(k, { label: 'Peak MAV', value: c.mav, min: 100, max: 8000, step: 10, show: v => fmt(v), set: reshape(v => { c.mav = v; }),
    note: 'Field cap at full intensity (grows with √intensity).' });
  knob(k, { label: 'Spawn gap, quiet', value: c.interval[0], min: 0.2, max: 3, step: 0.05, show: v => `${v.toFixed(2)} s`, set: reshape(v => { c.interval[0] = v; }),
    note: 'Seconds between spawns at zero intensity.' });
  knob(k, { label: 'Spawn gap, peak', value: c.interval[1], min: 0.2, max: 3, step: 0.05, show: v => `${v.toFixed(2)} s`, set: reshape(v => { c.interval[1] = v; }),
    note: 'Seconds between spawns at full intensity.' });
  $('opening').checked = !!c.opening;
  // economy
  const e = $('econKnobs'); e.innerHTML = '';
  knob(e, { label: 'Start Tokens', value: L.startTokens, min: 50, max: 3000, step: 10, show: v => fmt(v), set: v => { L.startTokens = v; } });
  knob(e, { label: 'BITS reward', value: L.rewardBits, min: 0, max: 30, step: 1, show: v => v, set: v => { L.rewardBits = v; } });
  knob(e, { label: 'Enemy HP ×', value: L.enemyDelta.health, min: 0.5, max: 5, step: 0.05, show: v => `×${v.toFixed(2)}`, set: v => { L.enemyDelta.health = v; } });
  knob(e, { label: 'Enemy damage ×', value: L.enemyDelta.damage, min: 0.5, max: 5, step: 0.05, show: v => `×${v.toFixed(2)}`, set: v => { L.enemyDelta.damage = v; } });
}

$('opening').addEventListener('change', () => edit(() => {
  const L = level(), lanes = rosterLanes(L);
  L.design.curve.opening = $('opening').checked;
  // turning the opening off gives wave 1 the roster lanes that start at wave 2
  if (!L.design.curve.opening) for (const l of Object.values(lanes)) if (l.from === 1) l.from = 0;
  setRosterLanes(L, lanes);
  applyCurve(L);
}));
$('clearPins').addEventListener('click', () => edit(() => { delete level().design.curve.points; applyCurve(level()); }));

// ---------------------------------------------------------------- level strip
let dragCard = null;
function renderStrip() {
  const host = $('strip');
  host.innerHTML = levels.map((L, i) => {
    const [cls, label] = verdictOf(campaign?.[i]);
    return `<div class="card${i === cur ? ' on' : ''}" draggable="true" data-i="${i}">
      <span class="n">L${i + 1} · ${esc(shortName(L))}</span><span class="pill ${cls}">${label}</span>
      <span class="m">${L.waves.length} waves · ${L.spawns} entr${L.spawns > 1 ? 'ies' : 'y'} · ${L.grid.rowWidths.length} rows · ${fmt(L.startTokens)} T</span></div>`;
  }).join('');
}
const strip = $('strip');
strip.addEventListener('click', e => { const c = e.target.closest('.card'); if (c) selectLevel(+c.dataset.i); });
strip.addEventListener('dragstart', e => { const c = e.target.closest('.card'); dragCard = +c.dataset.i; e.dataTransfer.setData('text/plain', 'level'); e.dataTransfer.effectAllowed = 'move'; });
strip.addEventListener('dragover', e => {
  if (dragCard == null) return;
  e.preventDefault();
  strip.querySelectorAll('.card').forEach(c => c.classList.remove('drop-before'));
  const c = e.target.closest('.card');
  if (c) c.classList.add('drop-before');
});
strip.addEventListener('drop', e => {
  e.preventDefault();
  const c = e.target.closest('.card');
  const from = dragCard; dragCard = null;
  if (!c || from == null) return renderStrip();
  let to = +c.dataset.i;
  if (to === from) return renderStrip();
  edit(() => {
    const keep = levels[cur];
    const [moved] = levels.splice(from, 1);
    if (to > from) to--;
    levels.splice(to, 0, moved);
    cur = levels.indexOf(keep);
  });
});
strip.addEventListener('dragend', () => { dragCard = null; renderStrip(); });

$('addLevel').addEventListener('click', () => edit(() => { levels.splice(cur + 1, 0, blankLevel(cur + 2)); cur++; live = null; buildKnobs(); }));
$('dupLevel').addEventListener('click', () => edit(() => {
  const copy = structuredClone(level()); copy.name += ' copy';
  levels.splice(cur + 1, 0, copy); cur++; live = null; buildKnobs();
}));
$('delLevel').addEventListener('click', () => {
  if (levels.length < 2 || !confirm(`Delete ${level().name}? (Undo brings it back.)`)) return;
  edit(() => { levels.splice(cur, 1); cur = Math.min(cur, levels.length - 1); live = null; buildKnobs(); });
});

// ---------------------------------------------------------------- name + problems
function renderName() { const n = $('name'); if (document.activeElement !== n) n.value = level().name; }
$('name').addEventListener('input', () => { begin(); level().name = $('name').value; changed(); });
$('name').addEventListener('change', end);

function renderProblems() {
  const { errors, warnings } = problems;
  $('problems').innerHTML = !errors.length && !warnings.length
    ? '<span class="ok">All levels pass the checks.</span>'
    : `<ul>${errors.map(m => `<li class="e">${esc(m)}</li>`).join('')}${warnings.map(m => `<li class="w">${esc(m)}</li>`).join('')}</ul>`;
}

// ---------------------------------------------------------------- board
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rowHandles = [];
function renderBoard() {
  const L = level(), canvas = $('board'), wrap = $('boardWrap');
  const w = wrap.clientWidth, h = 520, dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // the real board code, with a fixed seed so the picture holds still while you edit
  const real = Math.random;
  Math.random = seeded(boardSeed * 7919 + cur);
  let grid, field;
  try { ({ grid, field } = buildBoard(L, [w, h])); } finally { Math.random = real; }

  const col = { ...COL, ...L.theme };
  const s = grid.size * GRID.hexMargin;
  const hex = (x, y, r) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); }
    ctx.closePath();
  };
  for (const c of grid.cells.values()) {
    const [fill, line] = c.spawn ? [col.spawnFill, col.spawnLine] : c.blocker ? [col.blockerFill, col.blockerLine]
      : c.lockout ? [col.lockoutFill, col.lockoutLine] : [col.cellFill, col.cellLine];
    hex(c.x, c.y, s);
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    ctx.setLineDash(c.lockout ? [4, 4] : []); ctx.stroke(); ctx.setLineDash([]);
    if (c.exit) { ctx.fillStyle = 'rgba(255,176,32,0.12)'; ctx.fill(); }
  }
  // enemy routes from each entry point
  if ($('showRoute').checked) {
    ctx.strokeStyle = 'rgba(78,243,255,0.6)'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    for (const sp of grid.spawns) {
      ctx.beginPath(); ctx.moveTo(sp.x, sp.y);
      let c = sp, guard = 0;
      while (c && !c.exit && guard++ < 400) { c = field.next.get(c.key); if (c) ctx.lineTo(c.x, c.y); }
      ctx.stroke();
    }
  }
  // base
  ctx.fillStyle = COL.base; ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.arc(grid.baseX, grid.baseY, grid.baseR * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  // row-end handles (drag to widen or narrow a row)
  rowHandles = [];
  const cw = Math.sqrt(3) * grid.size;
  L.grid.rowWidths.forEach((_, r) => {
    const row = [...grid.cells.values()].filter(c => c.r === r).sort((a, b) => a.x - b.x);
    for (const [cell, side] of [[row[0], -1], [row[row.length - 1], 1]]) {
      const x = cell.x + side * cw * 0.72, y = cell.y;
      rowHandles.push({ x, y, r, side, cw });
      ctx.beginPath(); ctx.arc(x, y, Math.max(4, grid.size * 0.2), 0, Math.PI * 2);
      ctx.fillStyle = dragRow?.r === r ? '#ffffff' : 'rgba(78,243,255,0.55)'; ctx.fill();
    }
  });

  const cells = [...grid.cells.values()];
  const open = cells.filter(c => !c.spawn && !c.exit && !c.blocker && !c.lockout).length;
  const routes = grid.spawns.map(sp => field.dist.get(sp.key)).filter(v => v != null);
  $('boardStats').textContent = `${cells.length} cells · ${open} buildable · route${routes.length > 1 ? 's' : ''} ${routes.join(' / ')} steps · roll #${boardSeed}`;
}
let dragRow = null;
const boardWrap = $('boardWrap');
boardWrap.addEventListener('pointerdown', e => {
  const r = boardWrap.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const hit = rowHandles.find(hd => Math.hypot(hd.x - x, hd.y - y) < Math.max(12, hd.cw * 0.4));
  if (!hit) return;
  dragRow = { ...hit, x0: x, w0: level().grid.rowWidths[hit.r] };
  boardWrap.setPointerCapture(e.pointerId);
  begin();
});
boardWrap.addEventListener('pointermove', e => {
  if (!dragRow) return;
  const x = e.clientX - boardWrap.getBoundingClientRect().left;
  const w = clamp(dragRow.w0 + Math.round(((x - dragRow.x0) * dragRow.side * 2) / dragRow.cw), LIMITS.rowWidth[0], LIMITS.rowWidth[1]);
  if (w !== level().grid.rowWidths[dragRow.r]) { level().grid.rowWidths[dragRow.r] = w; changed(); }
});
const dropRow = () => { if (!dragRow) return; dragRow = null; end(); renderBoard(); };
boardWrap.addEventListener('pointerup', dropRow);
boardWrap.addEventListener('pointercancel', dropRow);
$('shuffle').addEventListener('click', () => { boardSeed++; renderBoard(); });
$('showRoute').addEventListener('change', renderBoard);
$('rowAdd').addEventListener('click', () => edit(() => {
  const rw = level().grid.rowWidths;
  if (rw.length >= LIMITS.rows[1]) return;
  const i = rw.indexOf(Math.max(...rw));       // repeat the widest row
  rw.splice(i, 0, rw[i]);
}));
$('rowDel').addEventListener('click', () => edit(() => {
  const rw = level().grid.rowWidths;
  if (rw.length <= LIMITS.rows[0]) return;
  rw.splice(Math.floor(rw.length / 2), 1);      // from the middle: keeps the entry and base rows
}));
addEventListener('resize', () => renderBoard());

// ---------------------------------------------------------------- SVG chart helpers
const svgEl = (W, H, body) => `<svg viewBox="0 0 ${W} ${H}" role="img">${body}</svg>`;
function pointerIn(host, e, W, H) {
  const r = host.querySelector('svg').getBoundingClientRect();
  return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
}
const handle = (id, x, y, rad, fill, label = '') =>
  `<g class="handle" data-h="${id}"><circle cx="${x}" cy="${y}" r="${rad + 8}" fill="transparent"/>
   <circle cx="${x}" cy="${y}" r="${rad}" fill="${fill}" stroke="#04121c" stroke-width="2"/>${label}</g>`;

// ---------------------------------------------------------------- intensity curve
const CW = 760, CH = 260, CP = { l: 52, r: 16, t: 16, b: 28 };
let curveTop = null;      // y-axis top, frozen during a drag so the chart doesn't swim
let curveDrag = null;
function curveGeom(L) {
  const n = L.waves.length, c = L.design.curve;
  const bw = (CW - CP.l - CP.r) / n;
  const top = curveTop ?? Math.max(c.tev * 1.15, ...L.waves.map(w => w.tev * 1.08));
  return {
    n, c, bw, top,
    x: i => CP.l + (i + 0.5) * bw,
    X: u => CP.l + (u * (n - 1) + 0.5) * bw,
    y: v => CP.t + (1 - v / top) * (CH - CP.t - CP.b),
    inv: py => (1 - (py - CP.t) / (CH - CP.t - CP.b)) * top,
    invU: px => n > 1 ? ((px - CP.l) / bw - 0.5) / (n - 1) : 0.5,
  };
}
function renderCurve() {
  const L = level(), g = curveGeom(L), { c, n } = g;
  let s = '';
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = (g.top / ticks) * i;
    s += `<line class="grid" x1="${CP.l}" x2="${CW - CP.r}" y1="${g.y(v)}" y2="${g.y(v)}"/><text x="${CP.l - 6}" y="${g.y(v) + 4}" text-anchor="end">${fmt(Math.round(v / 100) * 100)}</text>`;
  }
  L.waves.forEach((w, i) => {
    const x0 = g.x(i) - g.bw * 0.34, bwid = g.bw * 0.68;
    const tip = `W${i + 1}\nTEV ${fmt(w.tev)}   MAV ${fmt(w.mav)}   RTV ${fmt(w.rtv)}\nSpawn gap ${w.spawnInterval}s\n${w.unlocked.map(k => ENEMIES[k].name).join(', ')}${w.weights ? `\nWeights ${Object.entries(w.weights).map(([k, v]) => `${ENEMIES[k].name} ×${v}`).join(', ')}` : ''}`;
    s += `<rect data-tip="${esc(tip)}" x="${x0}" y="${g.y(w.tev)}" width="${bwid}" height="${g.y(0) - g.y(w.tev)}" rx="3" fill="#3987e5" opacity="${c.opening && i === 0 ? 0.55 : 0.85}"/>`;
    s += `<line x1="${x0}" x2="${x0 + bwid}" y1="${g.y(w.mav)}" y2="${g.y(w.mav)}" stroke="#ffd9c4" stroke-width="2" pointer-events="none"/>`;
    s += `<text x="${g.x(i)}" y="${CH - 8}" text-anchor="middle">W${i + 1}</text>`;
  });
  // the curve itself
  let d = '';
  for (let k = 0; k <= 80; k++) { const u = k / 80; d += `${k ? 'L' : 'M'}${g.X(u).toFixed(1)},${g.y(curveLine(c, u) * c.tev).toFixed(1)}`; }
  s += `<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.5" pointer-events="none"/>`;
  // per-wave dots (pins)
  L.waves.forEach((_, i) => {
    const pinned = c.points?.[i] != null;
    s += handle(`w${i}`, g.x(i), g.y(curveAt(c, i, n) * c.tev), pinned ? 6 : 4.5, pinned ? 'var(--pin)' : '#cfe9ff');
  });
  // the three big handles
  if (n > 1) {
    s += handle('start', g.X(0), g.y(c.start * c.tev), 9, 'var(--accent)');
    s += handle('mid', g.X(c.midAt), g.y(c.mid * c.tev), 9, 'var(--accent)');
    s += handle('end', g.X(1), g.y(c.end * c.tev), 9, 'var(--accent)');
  }
  $('curve').innerHTML = svgEl(CW, CH, s);
}
const curveHost = $('curve');
curveHost.addEventListener('pointerdown', e => {
  const h = e.target.closest('[data-h]');
  if (!h) return;
  curveTop = curveGeom(level()).top;
  curveDrag = h.dataset.h;
  curveHost.setPointerCapture(e.pointerId);
  begin();
  e.preventDefault();
});
curveHost.addEventListener('pointermove', e => {
  if (!curveDrag) return tipAt(e);
  const L = level(), g = curveGeom(L), c = L.design.curve;
  const [px, py] = pointerIn(curveHost, e, CW, CH);
  const v = +clamp(g.inv(py) / c.tev, 0.02, 1.25).toFixed(3);
  if (curveDrag === 'start') c.start = v;
  else if (curveDrag === 'end') c.end = v;
  else if (curveDrag === 'mid') { c.mid = v; c.midAt = +clamp(g.invU(px), 0.1, 0.9).toFixed(3); }
  else {
    const i = +curveDrag.slice(1);
    c.points ??= L.waves.map(() => null);
    c.points[i] = v;
  }
  applyCurve(L);
  changed();
});
const dropCurve = () => { if (!curveDrag) return; curveDrag = null; curveTop = null; end(); renderCurve(); };
curveHost.addEventListener('pointerup', dropCurve);
curveHost.addEventListener('pointercancel', dropCurve);
curveHost.addEventListener('dblclick', e => {
  const h = e.target.closest('[data-h]');
  if (!h || h.dataset.h[0] !== 'w') return;
  const c = level().design.curve, i = +h.dataset.h.slice(1);
  if (c.points?.[i] == null) return;
  edit(() => { c.points[i] = null; applyCurve(level()); });
});
curveHost.addEventListener('pointerleave', () => { $('tip').style.display = 'none'; });

// ---------------------------------------------------------------- pressure vs target
const PW = 760, PH = 180, PP = { l: 52, r: 16, t: 12, b: 24 };
let pressTop = null, pressDrag = null;
function pressGeom(L, rows) {
  const n = L.waves.length, bw = (PW - PP.l - PP.r) / n;
  const top = pressTop ?? Math.max(1.2, ...rows.map(r => Math.min(r.pressure, 3) + 0.1), L.design.target.start + 0.15, L.design.target.end + 0.15);
  return { n, bw, top, x: i => PP.l + (i + 0.5) * bw, y: v => PP.t + (1 - Math.min(v, top) / top) * (PH - PP.t - PP.b), inv: py => (1 - (py - PP.t) / (PH - PP.t - PP.b)) * top };
}
function renderPressure() {
  const L = level(), n = L.waves.length;
  const target = targetCurve(L.design.target, n);
  const fresh = live && live.waves.length === n;
  const rows = fresh ? live.waves : [];
  const g = pressGeom(L, rows);
  let s = '';
  for (const v of [0, 0.5, 1, 1.5, 2, 2.5, 3]) {
    if (v > g.top) break;
    s += `<line class="grid" x1="${PP.l}" x2="${PW - PP.r}" y1="${g.y(v)}" y2="${g.y(v)}"/><text x="${PP.l - 6}" y="${g.y(v) + 4}" text-anchor="end">${v.toFixed(1)}</text>`;
  }
  s += `<line x1="${PP.l}" x2="${PW - PP.r}" y1="${g.y(1)}" y2="${g.y(1)}" stroke="var(--critical)" stroke-dasharray="4 4" opacity="0.7"/>`;
  const maxV = Math.max(1, ...rows.map(r => r.viruses));
  rows.forEach((r, i) => { if (r.viruses > 0.05) s += `<rect x="${g.x(i) - g.bw / 2}" y="${PP.t}" width="${g.bw}" height="${PH - PP.t - PP.b}" fill="#ff6a4f" opacity="${0.05 + 0.18 * r.viruses / maxV}"/>`; });
  for (let i = 0; i < n; i++) s += `<text x="${g.x(i)}" y="${PH - 6}" text-anchor="middle">W${i + 1}</text>`;
  const line = vals => vals.map((v, i) => `${i ? 'L' : 'M'}${g.x(i).toFixed(1)},${g.y(v).toFixed(1)}`).join('');
  s += `<path d="${line(target)}" fill="none" stroke="var(--ink-2)" stroke-width="2" stroke-dasharray="6 5"/>`;
  if (fresh) {
    s += `<path d="${line(rows.map(r => r.pressure))}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>`;
    rows.forEach((r, i) => { s += `<circle data-tip="W${i + 1}\nPressure ${fmt(r.pressure, 2)}\nTarget ${fmt(target[i], 2)}\nViruses ${fmt(r.viruses, 1)}" cx="${g.x(i)}" cy="${g.y(r.pressure)}" r="4" fill="var(--accent)"/>`; });
  }
  s += handle('tstart', g.x(0), g.y(L.design.target.start), 7, 'var(--ink-2)');
  if (n > 1) s += handle('tend', g.x(n - 1), g.y(L.design.target.end), 7, 'var(--ink-2)');
  $('pressure').innerHTML = svgEl(PW, PH, s);
  if (fresh) {
    const [cls, label, dd] = verdictOf({ waves: rows });
    $('verdict').innerHTML = `Ledger: <b class="pill ${cls}">${label}</b> (average ${dd >= 0 ? '+' : ''}${fmt(dd, 2)} against the target). The Ledger can't see Virus and Bug drain or Stinger detours: run the Sim before you trust a close call.`;
  } else $('verdict').textContent = 'Ledger working…';
}
const pressHost = $('pressure');
pressHost.addEventListener('pointerdown', e => {
  const h = e.target.closest('[data-h]');
  if (!h) return;
  pressTop = pressGeom(level(), live?.waves ?? []).top;
  pressDrag = h.dataset.h;
  pressHost.setPointerCapture(e.pointerId);
  begin(); e.preventDefault();
});
pressHost.addEventListener('pointermove', e => {
  if (!pressDrag) return tipAt(e);
  const L = level(), g = pressGeom(L, live?.waves ?? []);
  const v = +clamp(g.inv(pointerIn(pressHost, e, PW, PH)[1]), 0.1, 2).toFixed(3);
  L.design.target[pressDrag === 'tstart' ? 'start' : 'end'] = v;
  if (live) live.waves.forEach((w, i) => { w.target = targetCurve(L.design.target, L.waves.length)[i]; });
  renderPressure(); chrome();
});
const dropPress = () => { if (!pressDrag) return; pressDrag = null; pressTop = null; end(); changed(); };
pressHost.addEventListener('pointerup', dropPress);
pressHost.addEventListener('pointercancel', dropPress);
pressHost.addEventListener('pointerleave', () => { $('tip').style.display = 'none'; });

function tipAt(e) {
  const t = e.target.closest?.('[data-tip]'), tip = $('tip');
  if (!t) { tip.style.display = 'none'; return; }
  tip.textContent = t.dataset.tip;
  tip.style.display = 'block';
  const r = tip.getBoundingClientRect();
  tip.style.left = `${Math.min(e.clientX + 14, innerWidth - r.width - 8)}px`;
  tip.style.top = `${Math.min(e.clientY + 14, innerHeight - r.height - 8)}px`;
}

// ---------------------------------------------------------------- roster lanes
let picked = null;       // tap-to-place: a chip picked from a palette
function renderLanes() {
  const L = level(), n = L.waves.length, lanes = rosterLanes(L), opening = L.design.curve.opening;
  $('enemyPalette').innerHTML = ENEMY_KEYS.map(k =>
    `<span class="chip${lanes[k] ? ' used' : ''}${picked === k ? ' picked' : ''}" draggable="true" data-enemy="${k}" title="EV ${ENEMIES[k].ev} · ${esc(ENEMIES[k].desc)}"><i style="background:${ENEMIES[k].color}"></i>${ENEMIES[k].name}</span>`).join('');
  const counts = live && live.waves.length === n ? live.waves.map(w => w.counts) : null;
  const cols = `grid-template-columns: 96px repeat(${n}, minmax(0, 1fr)) auto`;
  const cells = (extra = '') => Array.from({ length: n }, (_, i) =>
    `<div class="lane-cell${opening && i === 0 ? ' opening' : ''}" data-col="${i}" ${extra}></div>`).join('');
  let html = `<div class="lane-grid" style="${cols}"><div></div>${Array.from({ length: n }, (_, i) => `<div class="lane-head">W${i + 1}</div>`).join('')}<div></div>`;
  if (opening) {
    html += `<div class="lane-name">Opening</div>${cells()}<div class="lane-tools" style="color:var(--muted)">W1: ${OPENING.roster.map(k => ENEMIES[k].name).join(' + ')}</div>`;
  }
  for (const k of ENEMY_KEYS) {
    const l = lanes[k];
    if (!l) continue;
    const left = (l.from / n) * 100, width = ((l.to - l.from + 1) / n) * 100;
    const cnt = counts ? Array.from({ length: l.to - l.from + 1 }, (_, j) => {
      const v = counts[l.from + j]?.[k] ?? 0;
      return `<span>${v >= 0.95 ? Math.round(v) : v > 0.05 ? '·' : ''}</span>`;
    }).join('') : '';
    html += `<div class="lane-name"><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${ENEMIES[k].color};margin-right:6px"></i>${ENEMIES[k].name}</div>
      <div style="grid-column: span ${n}; position: relative" class="lane-track" data-enemy="${k}">
        <div style="display:grid;grid-template-columns:repeat(${n},1fr)">${cells()}</div>
        <div class="bar" data-lane="${k}" style="left:calc(${left}% + 2px);width:calc(${width}% - 4px);background:${ENEMIES[k].color}">
          <span class="end" data-end="from"></span><span class="cnt">${cnt}</span><span class="end" data-end="to"></span></div>
      </div>
      <div class="lane-tools">
        <button class="small" data-w="${k}" data-d="-1" title="Less likely">−</button><output title="Pick weight">×${l.weight}</output>
        <button class="small" data-w="${k}" data-d="1" title="More likely">+</button>
        <button class="small" data-rm="${k}" title="Remove from this level">✕</button></div>`;
  }
  html += `<div class="lane-name" style="color:var(--muted)">Add here</div><div style="grid-column: span ${n}; display:grid; grid-template-columns:repeat(${n},1fr)" class="lane-track" data-add="1">${cells()}</div><div></div></div>`;
  $('lanes').innerHTML = html;
}
const lanesHost = $('lanes');
const laneEdit = fn => edit(() => { const L = level(), lanes = rosterLanes(L); fn(lanes, L); setRosterLanes(L, lanes); });
function addEnemyAt(k, col) {
  laneEdit((lanes, L) => {
    const first = L.design.curve.opening ? 1 : 0;
    col = Math.max(first, col);
    if (lanes[k]) lanes[k].from = Math.min(col, lanes[k].to);
    else lanes[k] = { from: col, to: L.waves.length - 1, weight: 1 };
  });
}
// palette chips: drag onto a wave, or tap a chip then tap a wave
$('enemyPalette').addEventListener('dragstart', e => { const c = e.target.closest('[data-enemy]'); e.dataTransfer.setData('text/x-enemy', c.dataset.enemy); });
$('enemyPalette').addEventListener('click', e => { const c = e.target.closest('[data-enemy]'); if (!c) return; picked = picked === c.dataset.enemy ? null : c.dataset.enemy; renderLanes(); });
lanesHost.addEventListener('dragover', e => {
  if (!e.dataTransfer.types.includes('text/x-enemy')) return;
  const cell = e.target.closest('[data-col]'); if (!cell) return;
  e.preventDefault();
  lanesHost.querySelectorAll('.drop').forEach(x => x.classList.remove('drop'));
  cell.classList.add('drop');
});
lanesHost.addEventListener('dragleave', () => lanesHost.querySelectorAll('.drop').forEach(x => x.classList.remove('drop')));
lanesHost.addEventListener('drop', e => {
  e.preventDefault();
  const cell = e.target.closest('[data-col]'), k = e.dataTransfer.getData('text/x-enemy');
  if (cell && k) addEnemyAt(k, +cell.dataset.col);
});
lanesHost.addEventListener('click', e => {
  const w = e.target.closest('[data-w]'), rm = e.target.closest('[data-rm]');
  if (w) return laneEdit(lanes => { const l = lanes[w.dataset.w]; l.weight = clamp(+(l.weight + 0.25 * +w.dataset.d).toFixed(2), 0.25, 4); });
  if (rm) return laneEdit(lanes => { delete lanes[rm.dataset.rm]; });
  const cell = e.target.closest('[data-col]');
  if (cell && picked && !e.target.closest('.bar')) { const k = picked; picked = null; addEnemyAt(k, +cell.dataset.col); }
});
// bars: drag the middle to move, the ends to resize
let barDrag = null;
lanesHost.addEventListener('pointerdown', e => {
  const bar = e.target.closest('.bar'); if (!bar) return;
  const track = bar.closest('.lane-track').getBoundingClientRect();
  const lanes = rosterLanes(level()), k = bar.dataset.lane;
  barDrag = { k, mode: e.target.dataset.end ?? 'move', x0: e.clientX, colW: track.width / level().waves.length, from0: lanes[k].from, to0: lanes[k].to };
  lanesHost.setPointerCapture(e.pointerId);
  begin(); e.preventDefault();
});
lanesHost.addEventListener('pointermove', e => {
  if (!barDrag) return;
  const L = level(), n = L.waves.length, first = L.design.curve.opening ? 1 : 0;
  const d = Math.round((e.clientX - barDrag.x0) / barDrag.colW);
  const lanes = rosterLanes(L), l = lanes[barDrag.k];
  let { from0: from, to0: to } = barDrag;
  if (barDrag.mode === 'move') { const dd = clamp(d, first - from, n - 1 - to); from += dd; to += dd; }
  else if (barDrag.mode === 'from') from = clamp(from + d, first, to);
  else to = clamp(to + d, from, n - 1);
  if (from === l.from && to === l.to) return;
  l.from = from; l.to = to;
  setRosterLanes(L, lanes);
  changed();
});
const dropBar = () => { if (!barDrag) return; barDrag = null; end(); };
lanesHost.addEventListener('pointerup', dropBar);
lanesHost.addEventListener('pointercancel', dropBar);

// ---------------------------------------------------------------- unlocks
// Expected Blueprints per level = expected kills × the slot's drop rate,
// counted until the tower reaches its Blueprint count.
function unlockTrack() {
  const kills = levels.map((_, i) => campaign?.[i]?.waves.reduce((s, w) => s + w.kills, 0) ?? null);
  return LOCKABLE.map(k => {
    let bp = 0, at = null;
    const perLevel = levels.map((L, i) => {
      const slot = SLOTS.find(s => L.bpPool[s] === k);
      if (slot && at == null && kills[i] != null) {
        bp += kills[i] * BLUEPRINTS.dropRates[slot];
        if (bp >= TOWERS[k].blueprints) at = i;
      }
      return { slot, bp };
    });
    return { k, at, perLevel, need: TOWERS[k].blueprints };
  });
}
function renderUnlocks() {
  const L = level();
  const inUse = new Set(Object.values(L.bpPool));
  $('towerPalette').innerHTML = LOCKABLE.map(k =>
    `<span class="chip${inUse.has(k) ? ' used' : ''}${picked === `t:${k}` ? ' picked' : ''}" draggable="true" data-tower="${k}" title="${TOWERS[k].blueprints} Blueprints to unlock"><i style="background:${TOWERS[k].color}"></i>${TOWERS[k].name}</span>`).join('');
  $('slots').innerHTML = SLOTS.map(s => {
    const k = L.bpPool[s];
    return `<div class="slot" data-slot="${s}"><div class="t">${s[0].toUpperCase() + s.slice(1)} · ${Math.round(BLUEPRINTS.dropRates[s] * 100)}% per kill</div>${k
      ? `<span class="chip" draggable="true" data-tower="${k}" data-from="${s}"><i style="background:${TOWERS[k].color}"></i>${TOWERS[k].name} <button class="small" data-clear="${s}" title="Empty this slot">✕</button></span>`
      : '<span style="color:var(--muted);font-size:12px">Drop a tower here</span>'}</div>`;
  }).join('');
  const track = unlockTrack();
  const head = levels.map((_, i) => `<th class="${i === cur ? 'on' : ''}" data-level="${i}" style="cursor:pointer">L${i + 1}</th>`).join('');
  const body = track.map(t => `<tr><td><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${TOWERS[t.k].color};margin-right:6px"></i>${TOWERS[t.k].name} <span style="color:var(--muted)">(${t.need})</span></td>${t.perLevel.map((p, i) => {
    const cls = i === cur ? 'on' : '';
    const letter = p.slot ? p.slot[0].toUpperCase() : '';
    if (t.at === i) return `<td class="${cls}" title="~${fmt(p.bp, 1)} Blueprints by the end of L${i + 1}"><span class="u" style="background:${TOWERS[t.k].color}">${letter} ✓</span></td>`;
    if (t.at != null && i > t.at) return `<td class="${cls}" style="color:var(--muted)">${letter ? `<span title="Already unlocked: this slot drops nothing">${letter}</span>` : ''}</td>`;
    return `<td class="${cls}" title="${p.slot ? `~${fmt(p.bp, 1)} of ${t.need} Blueprints so far` : ''}"><span class="s">${letter}${p.slot && campaign ? ` ${fmt(p.bp, 0)}` : ''}</span></td>`;
  }).join('')}<td>${t.at != null ? `L${t.at + 1}` : campaign ? '<span style="color:var(--warn)">never</span>' : '…'}</td></tr>`).join('');
  $('track').innerHTML = `<table><thead><tr><th>Tower (BPs)</th>${head}<th>Unlocks</th></tr></thead><tbody>${body}</tbody></table>`;
}
const setSlot = (slot, k, from) => edit(() => {
  const bp = level().bpPool;
  for (const s of SLOTS) if (bp[s] === k) delete bp[s];        // a tower sits in one slot per level
  if (from && bp[slot]) bp[from] = bp[slot];                  // dragging between slots swaps
  bp[slot] = k;
  level().bpPool = normalizeLevel(level()).bpPool;
});
const unlockPanel = $('slots').parentElement;
unlockPanel.addEventListener('dragstart', e => {
  const c = e.target.closest('[data-tower]'); if (!c) return;
  e.dataTransfer.setData('text/x-tower', JSON.stringify({ k: c.dataset.tower, from: c.dataset.from ?? null }));
});
unlockPanel.addEventListener('dragover', e => {
  const s = e.target.closest('[data-slot]'); if (!s || !e.dataTransfer.types.includes('text/x-tower')) return;
  e.preventDefault();
  unlockPanel.querySelectorAll('.slot').forEach(x => x.classList.toggle('drop', x === s));
});
unlockPanel.addEventListener('dragleave', e => { if (!e.target.closest('[data-slot]')) unlockPanel.querySelectorAll('.slot').forEach(x => x.classList.remove('drop')); });
unlockPanel.addEventListener('drop', e => {
  const s = e.target.closest('[data-slot]'); if (!s) return;
  e.preventDefault();
  const { k, from } = JSON.parse(e.dataTransfer.getData('text/x-tower'));
  setSlot(s.dataset.slot, k, from);
});
unlockPanel.addEventListener('click', e => {
  const clear = e.target.closest('[data-clear]');
  if (clear) return edit(() => { delete level().bpPool[clear.dataset.clear]; level().bpPool = normalizeLevel(level()).bpPool; });
  const th = e.target.closest('[data-level]');
  if (th) return selectLevel(+th.dataset.level);
  const chip = e.target.closest('#towerPalette [data-tower]');
  if (chip) { picked = picked === `t:${chip.dataset.tower}` ? null : `t:${chip.dataset.tower}`; return renderUnlocks(); }
  const slot = e.target.closest('[data-slot]');
  if (slot && picked?.startsWith('t:')) { const k = picked.slice(2); picked = null; setSlot(slot.dataset.slot, k, null); }
});

// ---------------------------------------------------------------- save
async function save() {
  problems = validateLevels(levels); renderProblems();
  if (problems.errors.length) { chrome(); $('problems').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  levels = levels.map(normalizeLevel);
  const text = formatLevels(levels);
  const st = $('status');
  try {
    const res = await fetch('./save', { method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: text });
    if (!res.ok) throw new Error(await res.text());
    savedText = text;
    chrome();
  } catch (err) {
    st.className = 'bad';
    st.textContent = `Not saved: ${err.message.includes('fetch') ? 'can’t reach serve.py (is it running?)' : err.message}`;
  }
}
$('save').addEventListener('click', save);
$('undo').addEventListener('click', undo);
$('redo').addEventListener('click', redo);
addEventListener('keydown', e => {
  if (!(e.metaKey || e.ctrlKey)) return;
  const k = e.key.toLowerCase();
  if (k === 's') { e.preventDefault(); if (!$('save').disabled) save(); }
  else if (k === 'z' && document.activeElement?.type !== 'text') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (k === 'y' && document.activeElement?.type !== 'text') { e.preventDefault(); redo(); }
});

// ---------------------------------------------------------------- boot
buildKnobs();
changed();
problems = validateLevels(levels); renderProblems();
requestCampaign();
chrome();
