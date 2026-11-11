// TDX Difficulty Curve — drag every level's enemyDelta (HP ×, damage ×) on one
// chart and watch the Ledger's pressure react. Save rewrites only the
// `enemyDelta: { … },` line of each level in js/levels.js, so the rest of the
// file (and the Level Editor's formatting) is untouched.
// M9: the Basic panel sets the global Basic multipliers (js/difficulty.js).
// The level lines are Advanced; Basic shows as dotted lines and a Ledger line.

const LEVELS_URL = '../../js/levels.js';
const SAVE_URL = '../editor/save';          // serve.py's Level Editor route
const DIFF_URL = '../../js/difficulty.js';
const DIFF_SAVE_URL = './save-difficulty';  // serve.py's Difficulty Curve route (M9)
const BMIN = 0.3, BMAX = 1;
const DIFF_HEADER = '// TDX — difficulty settings (M9 "Integer"). Written by the Difficulty Curve tool (tools/curve/).';
const MIN = 0.5, MAX = 5, SNAP = 0.05;
const DELTA_LINE = /^    enemyDelta: \{[^}\n]*\},$/gm;
const SERIES = [
  { key: 'health', label: 'HP', color: 'var(--hp)' },
  { key: 'damage', label: 'Damage', color: 'var(--dmg)' },
];

const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const snap = v => Math.min(MAX, Math.max(MIN, Math.round(v / SNAP) * SNAP));
const round = v => +v.toFixed(2);
const fmt = v => `×${v.toFixed(2)}`;
const short = name => name.replace(/^Level (\d+):\s*/, 'L$1 ');

let levels = [];            // full level objects (the worker needs them)
let saved = [];             // [{ health, damage }] as on disk
let fileText = '';          // js/levels.js as loaded / last saved
let undo = [], redo = [];
let sel = null;             // { li, key }
let yMax = 3.5;             // delta chart top, fixed while dragging
let ledgerNow = null, ledgerSaved = null, ledgerBasic = null;
let basic = { health: 0.8, damage: 0.8 };   // DIFFICULTY.basic, being edited
let savedBasic = { ...basic };
let diffText = '';                          // js/difficulty.js as loaded / last saved

const deltas = () => levels.map(l => ({ health: l.enemyDelta.health, damage: l.enemyDelta.damage }));
const deltasDirty = () => levels.some((l, i) => round(l.enemyDelta.health) !== round(saved[i].health) || round(l.enemyDelta.damage) !== round(saved[i].damage));
const basicDirty = () => round(basic.health) !== round(savedBasic.health) || round(basic.damage) !== round(savedBasic.damage);
const dirty = () => deltasDirty() || basicDirty();
// Basic version of one level's delta (the Tutorial ignores difficulty, like config.effectiveDelta)
const basicOf = (l, k) => l.tutorial ? l.enemyDelta[k] : l.enemyDelta[k] * basic[k];
const basicLevels = ls => ls.map(l => l.tutorial ? l : { ...l, enemyDelta: { health: l.enemyDelta.health * basic.health, damage: l.enemyDelta.damage * basic.damage } });
const pctOff = v => `${Math.round((1 - v) * 100)}% easier`;

// ---------------------------------------------------------------- load
async function load() {
  const res = await fetch(LEVELS_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`can't read js/levels.js (${res.status})`);
  fileText = await res.text();
  const mod = await import(`${LEVELS_URL}?t=${Date.now()}`);
  levels = structuredClone(mod.LEVELS);
  const lines = fileText.match(DELTA_LINE) || [];
  if (lines.length !== levels.length) throw new Error(`found ${lines.length} enemyDelta lines for ${levels.length} levels; can't save safely`);
  saved = deltas();
  const dres = await fetch(DIFF_URL, { cache: 'no-store' });
  if (!dres.ok) throw new Error(`can't read js/difficulty.js (${dres.status})`);
  diffText = await dres.text();
  const dmod = await import(`${DIFF_URL}?t=${Date.now()}`);
  basic = { health: dmod.DIFFICULTY.basic.health, damage: dmod.DIFFICULTY.basic.damage };
  savedBasic = { ...basic };
  undo = []; redo = [];
  fitY();
  requestLedger(true);
  render();
}

function fitY() {
  const top = Math.max(...levels.flatMap(l => [l.enemyDelta.health, l.enemyDelta.damage]), ...saved.flatMap(d => [d.health, d.damage]));
  yMax = Math.min(MAX, Math.max(3, Math.ceil((top + 0.4) * 2) / 2));
}

// ---------------------------------------------------------------- edit
// Undo snapshots hold the level deltas and the Basic multipliers together.
const snapshot = () => ({ d: deltas(), b: { ...basic } });
function pushUndo() { undo.push(snapshot()); if (undo.length > 200) undo.shift(); redo = []; }
function apply({ d, b }) { d.forEach((x, i) => { levels[i].enemyDelta.health = x.health; levels[i].enemyDelta.damage = x.damage; }); basic = { ...b }; }

// Set one value; `cascade` moves every later level by the same amount, `link` moves the other line too.
function setValue(li, key, value, base, { cascade = false, link = false } = {}) {
  const keys = link ? SERIES.map(s => s.key) : [key];
  const step = snap(value) - base[li][key];
  for (const k of keys) {
    for (let i = li; i < (cascade ? levels.length : li + 1); i++) {
      levels[i].enemyDelta[k] = round(snap(base[i][k] + step));
    }
  }
}

function changed() { render(); requestLedger(); }

// ---------------------------------------------------------------- Ledger (worker)
const worker = new Worker(new URL('../editor/ledger-worker.js', import.meta.url), { type: 'module' });
let reqId = 0, pending = null, busy = false;
function requestLedger(alsoSaved = false) {
  if (alsoSaved) {
    const savedLevels = levels.map((l, i) => ({ ...l, enemyDelta: { ...saved[i] } }));
    worker.postMessage({ id: { n: ++reqId, kind: 'saved' }, levels: savedLevels, samples: 150 });
  }
  pending = structuredClone(levels);
  pump();
}
function pump() {
  if (busy || !pending) return;
  busy = true;
  worker.postMessage({ id: { n: ++reqId, kind: 'now' }, levels: pending, samples: 150 });
  worker.postMessage({ id: { n: ++reqId, kind: 'basic' }, levels: basicLevels(pending), samples: 150 });
  pending = null;
}
worker.onmessage = ({ data: { id, result } }) => {
  const summary = result.map(l => {
    const p = l.waves.map(w => w.pressure);
    return { peak: Math.max(...p), avg: p.reduce((a, b) => a + b, 0) / p.length, target: Math.max(...l.waves.map(w => w.target)), gap: l.gap };
  });
  if (id.kind === 'saved') ledgerSaved = summary;
  else if (id.kind === 'now') ledgerNow = summary;
  else { ledgerBasic = summary; busy = false; pump(); }
  renderPressure(); renderTable();
};
worker.onerror = e => { status(`Ledger failed: ${e.message}`, 'bad'); };

// ---------------------------------------------------------------- svg helpers
function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
function frame(host, W, H, m) {
  host.textContent = '';
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' }, host);
  const x = i => m.l + (levels.length > 1 ? i * (W - m.l - m.r) / (levels.length - 1) : 0);
  return { svg, x };
}
function path(pts) { return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(''); }

// ---------------------------------------------------------------- delta chart
const DW = 1000, DH = 420, DM = { l: 46, r: 24, t: 18, b: 40 };
const dy = v => DM.t + (1 - (v - MIN) / (yMax - MIN)) * (DH - DM.t - DM.b);
const dyInv = py => MIN + (1 - (py - DM.t) / (DH - DM.t - DM.b)) * (yMax - MIN);

function renderDeltas() {
  const { svg, x } = frame($('deltaChart'), DW, DH, DM);
  for (let v = MIN; v <= yMax + 1e-9; v += 0.5) {
    el('line', { class: 'grid', x1: DM.l, x2: DW - DM.r, y1: dy(v), y2: dy(v), ...(Math.abs(v - 1) < 1e-9 ? { stroke: 'var(--axis)' } : {}) }, svg);
    el('text', { x: DM.l - 8, y: dy(v) + 4, 'text-anchor': 'end' }, svg).textContent = `×${v.toFixed(1)}`;
  }
  levels.forEach((l, i) => {
    el('text', { x: x(i), y: DH - DM.b + 20, 'text-anchor': 'middle' }, svg).textContent = `L${i}`;
    el('title', {}, svg.lastChild).textContent = l.name;
  });
  const showSteps = $('showSteps').checked;
  for (const s of SERIES) {
    el('path', { d: path(saved.map((d, i) => [x(i), dy(d[s.key])])), fill: 'none', stroke: s.color, 'stroke-width': 1.5, 'stroke-dasharray': '4 4', opacity: 0.4 }, svg);
    if ($('showBasic').checked) el('path', { d: path(levels.map((l, i) => [x(i), dy(basicOf(l, s.key))])), fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-dasharray': '1 5', 'stroke-linecap': 'round', opacity: 0.75 }, svg);
    el('path', { d: path(levels.map((l, i) => [x(i), dy(l.enemyDelta[s.key])])), fill: 'none', stroke: s.color, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, svg);
  }
  for (const s of SERIES) {
    levels.forEach((l, i) => {
      const v = l.enemyDelta[s.key];
      const below = s.key === 'damage' && v <= levels[i].enemyDelta.health;   // keep labels off each other
      if (showSteps && i > 0) {
        const prev = levels[i - 1].enemyDelta[s.key];
        const pct = prev ? (v / prev - 1) * 100 : 0;
        const cls = pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat';
        const mx = (x(i) + x(i - 1)) / 2, my = (dy(v) + dy(prev)) / 2 + (below ? 16 : -8);
        el('text', { class: `step ${cls}`, x: mx, y: my, 'text-anchor': 'middle', fill: cls === 'up' ? s.color : cls === 'down' ? 'var(--critical)' : 'var(--warn)', opacity: cls === 'up' ? 0.7 : 1 }, svg)
          .textContent = `${pct >= 0 ? '+' : ''}${Math.round(pct)}%`;
      }
      const g = el('g', { class: `handle${sel && sel.li === i && sel.key === s.key ? ' sel' : ''}`, tabindex: -1 }, svg);
      el('circle', { class: 'hit', cx: x(i), cy: dy(v), r: 14 }, g);
      el('circle', { class: 'dot', cx: x(i), cy: dy(v), r: 6, fill: s.color, stroke: 'var(--page)', 'stroke-width': 2 }, g);
      el('text', { class: 'val', x: x(i), y: dy(v) + (below ? 22 : -12), 'text-anchor': 'middle', fill: s.color }, g).textContent = v.toFixed(2);
      el('title', {}, g).textContent = `${l.name}: ${s.label} ${fmt(v)}`;
      g.addEventListener('pointerdown', e => startDrag(e, i, s.key));
    });
  }
}

function startDrag(e, li, key) {
  e.preventDefault();
  sel = { li, key };
  const base = deltas();
  pushUndo();
  // re-query the svg each time: render() replaces it while you drag
  const toY = ev => { const r = $('deltaChart').querySelector('svg').getBoundingClientRect(); return (ev.clientY - r.top) * (DH / r.height); };
  const offset = dyInv(toY(e)) - base[li][key];   // grab where you clicked, no jump
  let moved = false;
  const move = ev => {
    moved = true;
    setValue(li, key, dyInv(toY(ev)) - offset, base, { cascade: ev.shiftKey, link: $('link').checked });
    changed();
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    if (!moved || deltas().every((d, i) => d.health === base[i].health && d.damage === base[i].damage)) undo.pop();
    const old = yMax; fitY();
    render();
    if (old !== yMax) renderDeltas();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  render();
}

// ---------------------------------------------------------------- pressure chart
const PW = 1000, PH = 300, PM = { l: 46, r: 24, t: 14, b: 36 };
function renderPressure() {
  const host = $('pressChart');
  if (!ledgerNow) { host.innerHTML = '<p class="hint">Running the Ledger…</p>'; return; }
  const all = [...ledgerNow, ...(ledgerSaved || []), ...(ledgerBasic || [])].flatMap(s => [s.peak, s.target]);
  const top = Math.max(1.5, Math.ceil(Math.min(4, Math.max(...all)) * 4 + 1) / 4);
  const { svg, x } = frame(host, PW, PH, PM);
  const y = v => PM.t + (1 - Math.min(v, top) / top) * (PH - PM.t - PM.b);
  for (let v = 0; v <= top + 1e-9; v += 0.25) {
    const isBreak = Math.abs(v - 1) < 1e-9;
    el('line', { class: 'grid', x1: PM.l, x2: PW - PM.r, y1: y(v), y2: y(v), ...(isBreak ? { stroke: 'var(--critical)', 'stroke-dasharray': '6 4', opacity: 0.6 } : {}) }, svg);
    if (Math.round(v * 100) % 50 === 0) el('text', { x: PM.l - 8, y: y(v) + 4, 'text-anchor': 'end' }, svg).textContent = v.toFixed(1);
  }
  levels.forEach((l, i) => { el('text', { x: x(i), y: PH - PM.b + 20, 'text-anchor': 'middle' }, svg).textContent = `L${i}`; });
  const line = (vals, attrs) => el('path', { d: path(vals.map((v, i) => [x(i), y(v)])), fill: 'none', 'stroke-linejoin': 'round', ...attrs }, svg);
  line(ledgerNow.map(s => s.target), { stroke: 'var(--target)', 'stroke-width': 2 });
  if (ledgerSaved) line(ledgerSaved.map(s => s.peak), { stroke: 'var(--muted)', 'stroke-width': 1.5, 'stroke-dasharray': '4 4' });
  if (ledgerBasic) line(ledgerBasic.map(s => s.peak), { stroke: 'var(--basic)', 'stroke-width': 2, 'stroke-dasharray': '1 5', 'stroke-linecap': 'round' });
  line(ledgerNow.map(s => s.avg), { stroke: 'var(--press)', 'stroke-width': 2, opacity: 0.45 });
  line(ledgerNow.map(s => s.peak), { stroke: 'var(--press)', 'stroke-width': 2.5 });
  ledgerNow.forEach((s, i) => {
    el('circle', { cx: x(i), cy: y(s.peak), r: 4.5, fill: 'var(--press)', stroke: 'var(--page)', 'stroke-width': 1.5 }, svg);
    el('text', { class: 'val', x: x(i), y: y(s.peak) - 9, 'text-anchor': 'middle', fill: s.peak > 1 ? 'var(--critical)' : 'var(--ink-2)' }, svg).textContent = s.peak.toFixed(2);
    el('title', {}, svg.lastChild).textContent = `${levels[i].name}: peak ${s.peak.toFixed(2)}, average ${s.avg.toFixed(2)}, target ${s.target.toFixed(2)}`;
  });
}

// ---------------------------------------------------------------- table
function renderTable() {
  const t = $('table');
  const head = '<tr><th>Level</th><th>HP ×</th><th>HP step</th><th>Damage ×</th><th>Damage step</th><th>Peak pressure</th><th>Saved peak</th><th>Target peak</th><th>Gap to target</th><th>Basic HP ×</th><th>Basic dmg ×</th><th>Basic peak</th></tr>';
  const stepCell = (i, k) => {
    if (!i) return '<td class="flat">–</td>';
    const pct = (levels[i].enemyDelta[k] / levels[i - 1].enemyDelta[k] - 1) * 100;
    const cls = pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat';
    return `<td class="${cls}">${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%</td>`;
  };
  const pcls = s => !s ? '' : s.peak > s.target + 0.1 ? 'p-hard' : s.peak < s.target - 0.1 ? 'p-easy' : 'p-ok';
  const rows = levels.map((l, i) => {
    const n = ledgerNow?.[i], o = ledgerSaved?.[i];
    const inp = k => `<input type="number" step="0.05" min="${MIN}" max="${MAX}" data-li="${i}" data-k="${k}" value="${l.enemyDelta[k].toFixed(2)}" class="${round(l.enemyDelta[k]) !== round(saved[i][k]) ? 'changed' : ''}">`;
    return `<tr><td title="${l.name.replace(/"/g, '&quot;')}">${short(l.name)}</td>
      <td>${inp('health')}</td>${stepCell(i, 'health')}<td>${inp('damage')}</td>${stepCell(i, 'damage')}
      <td class="${pcls(n)}">${n ? n.peak.toFixed(2) : '…'}</td><td>${o ? o.peak.toFixed(2) : '…'}</td>
      <td>${n ? n.target.toFixed(2) : '…'}</td><td>${n ? n.gap.toFixed(2) : '…'}</td>
      <td class="b">${basicOf(l, 'health').toFixed(2)}</td><td class="b">${basicOf(l, 'damage').toFixed(2)}</td>
      <td class="b">${ledgerBasic?.[i] ? ledgerBasic[i].peak.toFixed(2) : '…'}</td></tr>`;
  }).join('');
  const focused = document.activeElement?.dataset?.li !== undefined ? `${document.activeElement.dataset.li}:${document.activeElement.dataset.k}` : null;
  t.innerHTML = head + rows;
  if (focused) { const [li, k] = focused.split(':'); t.querySelector(`input[data-li="${li}"][data-k="${k}"]`)?.focus(); }
}
$('table').addEventListener('change', e => {
  const inp = e.target.closest('input'); if (!inp || inp.dataset.li === undefined) return;
  const v = parseFloat(inp.value);
  if (!Number.isFinite(v)) { renderTable(); return; }
  pushUndo();
  setValue(+inp.dataset.li, inp.dataset.k, v, deltas(), { link: $('link').checked });
  fitY(); changed();
});

// ---------------------------------------------------------------- header
function status(text, cls = '') { const s = $('status'); s.textContent = text; s.className = cls; }
function renderHeader() {
  const d = dirty();
  status(d ? 'Unsaved changes' : 'Saved. Commit with GitHub Desktop when you’re happy.', d ? 'dirty' : '');
  $('save').disabled = !d; $('revert').disabled = !d;
  $('undo').disabled = !undo.length; $('redo').disabled = !redo.length;
}
function render() { renderHeader(); renderBasic(); renderDeltas(); renderPressure(); renderTable(); }

// ---------------------------------------------------------------- Basic (global)
function renderBasic() {
  for (const s of SERIES) {
    const k = s.key, v = basic[k];
    const num = $(`b-${k}`), rng = $(`b-${k}-r`);
    if (document.activeElement !== num) num.value = v.toFixed(2);
    rng.value = v;
    num.classList.toggle('changed', round(v) !== round(savedBasic[k]));
    $(`b-${k}-pct`).textContent = pctOff(v);
  }
}
let knobArmed = false;   // one undo step per slider drag
function setBasic(k, v, fromSlider) {
  if (!Number.isFinite(v)) { renderBasic(); return; }
  if (!fromSlider || !knobArmed) { pushUndo(); knobArmed = !!fromSlider; }
  const keys = $('link').checked ? SERIES.map(s => s.key) : [k];
  const nv = +Math.min(BMAX, Math.max(BMIN, v)).toFixed(2);
  for (const key of keys) basic[key] = nv;
  changed();
}
for (const s of SERIES) {
  $(`b-${s.key}-r`).addEventListener('input', e => setBasic(s.key, parseFloat(e.target.value), true));
  $(`b-${s.key}-r`).addEventListener('change', () => { knobArmed = false; });
  $(`b-${s.key}`).addEventListener('change', e => setBasic(s.key, parseFloat(e.target.value), false));
}
$('showBasic').addEventListener('change', renderDeltas);

function doUndo() { if (!undo.length) return; redo.push(snapshot()); apply(undo.pop()); fitY(); changed(); }
function doRedo() { if (!redo.length) return; undo.push(snapshot()); apply(redo.pop()); fitY(); changed(); }
$('undo').addEventListener('click', doUndo);
$('redo').addEventListener('click', doRedo);
$('revert').addEventListener('click', () => { pushUndo(); apply({ d: saved, b: savedBasic }); fitY(); changed(); });
$('showSteps').addEventListener('change', renderDeltas);

// ---------------------------------------------------------------- save
function patched(text) {
  let i = 0;
  return text.replace(DELTA_LINE, () => {
    const d = levels[i++].enemyDelta;
    return `    enemyDelta: { health: ${+d.health.toFixed(6)}, damage: ${+d.damage.toFixed(6)} },`;
  });
}
const diffFile = () => `${DIFF_HEADER}
// The levels are balanced for Advanced. Basic multiplies every level's
// enemyDelta (HP ×, damage ×) by the numbers below. The Tutorial ignores them.
export const DIFFICULTY = {
  basic: { health: ${+basic.health.toFixed(2)}, damage: ${+basic.damage.toFixed(2)} },
  advanced: { health: 1, damage: 1 },
};
`;
async function save() {
  try {
    status('Saving…');
    const files = [];
    if (deltasDirty()) {
      const now = await (await fetch(LEVELS_URL, { cache: 'no-store' })).text();
      if (now !== fileText) {
        status('js/levels.js changed on disk since this page loaded (Level Editor save?). Reload this page, then redo your change.', 'bad');
        return;
      }
      const text = patched(fileText);
      const res = await fetch(SAVE_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: text });
      if (!res.ok) throw new Error(await res.text());
      fileText = text;
      saved = deltas();
      files.push('js/levels.js');
    }
    if (basicDirty()) {
      const now = await (await fetch(DIFF_URL, { cache: 'no-store' })).text();
      if (now !== diffText) {
        status('js/difficulty.js changed on disk since this page loaded. Reload this page, then redo your change.', 'bad');
        return;
      }
      const text = diffFile();
      const res = await fetch(DIFF_SAVE_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: text });
      if (!res.ok) throw new Error(res.status === 404 ? 'serve.py is an old copy; restart it to get the Difficulty save route' : await res.text());
      diffText = text;
      savedBasic = { ...basic };
      files.push('js/difficulty.js');
    }
    requestLedger(true);
    render();
    status(`Saved ${files.join(' and ')}.${files.includes('js/levels.js') ? ' Reload the Level Editor before editing there.' : ''} Commit with GitHub Desktop when you’re happy.`);
  } catch (err) {
    status(`Not saved: ${String(err.message).includes('fetch') ? 'can’t reach serve.py (is it running?)' : err.message}`, 'bad');
  }
}
$('save').addEventListener('click', save);

window.addEventListener('keydown', e => {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); if (!$('save').disabled) save(); return; }
  if (e.target.tagName === 'INPUT') return;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); return; }
  if (sel && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault();
    const base = deltas();
    pushUndo();
    const step = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 0.25 : SNAP);
    setValue(sel.li, sel.key, base[sel.li][sel.key] + step, base, { link: $('link').checked });
    fitY(); changed();
  }
  if (sel && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault();
    sel = { ...sel, li: Math.min(levels.length - 1, Math.max(0, sel.li + (e.key === 'ArrowRight' ? 1 : -1))) };
    renderDeltas();
  }
});
window.addEventListener('beforeunload', e => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });

load().catch(err => status(`Couldn’t load: ${err.message}`, 'bad'));
