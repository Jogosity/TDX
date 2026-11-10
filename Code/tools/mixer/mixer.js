// TDX Sound Mixer (M8 "Hypercard"). Audition, shape and balance every sound,
// stress-test the anti-spam rules, then Save to js/sounds.js (via serve.py).
// Uses the game's own engine and synth, so what you hear here is what plays.

import * as SND from '../../js/sounds.js';
import { AudioEngine } from '../../js/audio.js';
import { renderSynth, recipeLength, WAVES } from '../../js/synth.js';
import { TOWERS, TOWER_ORDER, ENEMIES, WEAPONS } from '../../js/config.js';
import { drawTowerShape, drawEnemyShape } from '../../js/render.js';
import { formatSounds } from './format.js';

const $ = (id) => document.getElementById(id);
const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

// ---------------------------------------------------------------- state
const data = { AUDIO: structuredClone(SND.AUDIO), SOUNDS: structuredClone(SND.SOUNDS), MUSIC: structuredClone(SND.MUSIC) };
const original = structuredClone(data.SOUNDS);
let savedText = formatSounds(data);
let current = Object.keys(data.SOUNDS)[0];
let layer = -1;            // -1 = the main voice, 0.. = layers[i]

// Music paths are relative to Code/; the Mixer lives two folders down.
const musicView = {};
function syncMusicView() {
  const view = (m) => ({ ...m, file: m?.file ? '../../' + m.file : null });
  musicView.menu = view(data.MUSIC.menu);
  musicView.waves = (data.MUSIC.waves ?? []).map(view);
  engine.musicBuffers.clear();
}
const engine = new AudioEngine(data.SOUNDS, musicView, data.AUDIO);   // musicView: menu + waves, paths fixed up
engine.live = new Set();
engine.setSettings({ muted: false, music: 1, sfx: 1 });
syncMusicView();
document.addEventListener('pointerdown', () => { engine.unlock(); setTimeout(() => { $('wake').style.display = engine.ready ? 'none' : ''; }, 100); });

const play = (id, opts = {}) => engine.play(id, { force: true, ...opts });

// ---------------------------------------------------------------- slider specs
// [key, label, min, max, step, default, log?]
const DIALS = [
  ['priority', 'Priority', 0, 100, 1, 50], ['voices', 'Voices', 1, 8, 1, 4], ['gap', 'Gap (s)', 0, 3, 0.01, 0],
  ['vary', 'Pitch vary', 0, 0.5, 0.01, 0], ['pitch', 'Pitch', 0.25, 4, 0.01, 1], ['gain', 'Gain', 0, 2, 0.01, 1],
];
const RECIPE = [
  ['Pitch', [['freq', 'Pitch (Hz)', 20, 5000, 1, 440, true], ['freqEnd', 'Slide to (Hz)', 20, 5000, 1, null, true],
    ['slideTime', 'Slide time', 0.001, 1.5, 0.001, null], ['duty', 'Square width', 0.05, 0.95, 0.01, 0.5]]],
  ['Envelope', [['attack', 'Attack', 0.001, 0.5, 0.001, 0.005], ['hold', 'Hold', 0, 1.5, 0.005, 0.05],
    ['release', 'Release', 0.001, 2, 0.005, 0.1], ['punch', 'Punch', 0, 1, 0.01, 0]]],
  ['Movement', [['arpAt', 'Jump at (s)', 0, 0.6, 0.005, 0], ['arpMul', 'Jump ×', 0.25, 4, 0.005, 1.5],
    ['vibRate', 'Vibrato Hz', 0, 40, 0.5, 6], ['vibDepth', 'Vibrato depth', 0, 0.3, 0.005, 0]]],
  ['Tone', [['noise', 'Noise mix', 0, 1, 0.01, 0], ['lowpass', 'Low-pass', 0, 1, 0.01, 1],
    ['lowpassEnd', 'Low-pass to', 0, 1, 0.01, null], ['crush', 'Bit-crush', 0, 16, 1, 0]]],
  ['Level', [['volume', 'Volume', 0, 1, 0.01, 0.5], ['seed', 'Noise seed', 1, 99, 1, 7]]],
];

const toSlider = (v, s) => (s[6] ? Math.log(v / s[2]) / Math.log(s[3] / s[2]) * 1000 : v);
const fromSlider = (x, s) => (s[6] ? Math.round(s[2] * Math.pow(s[3] / s[2], x / 1000)) : +x);

// One slider row bound to obj[key]. onChange(final) after each edit.
function sliderRow(obj, spec, onChange) {
  const [key, label, min, max, step, def, log] = spec;
  const row = h('label', 'srow');
  const name = h('span', '', label);
  const range = h('input'); range.type = 'range';
  range.min = log ? 0 : min; range.max = log ? 1000 : max; range.step = log ? 1 : step;
  const num = h('input'); num.type = 'number'; num.min = min; num.max = max; num.step = step;
  const show = () => {
    const v = obj[key];
    row.classList.toggle('unset', v === undefined);
    const shown = v ?? def ?? (key === 'freqEnd' ? obj.freq : key === 'lowpassEnd' ? (obj.lowpass ?? 1) : key === 'slideTime' ? recipeLength(obj) : min);
    range.value = toSlider(shown, spec);
    num.value = v === undefined ? '' : v;
    num.placeholder = def === null ? 'off' : String(def);
  };
  range.addEventListener('input', () => { obj[key] = fromSlider(range.value, spec); show(); onChange(false); });
  range.addEventListener('change', () => onChange(true));
  num.addEventListener('change', () => {
    if (num.value === '') delete obj[key]; else obj[key] = Math.min(max, Math.max(min, +num.value));
    show(); onChange(true);
  });
  show();
  row.append(name, range, num);
  return row;
}

// ---------------------------------------------------------------- sidebar
function iconCanvas(draw) {
  const c = h('canvas'); c.width = 80; c.height = 80;
  const x = c.getContext('2d'); x.translate(40, 40); draw(x);
  return c;
}

function buildIcons() {
  const t = $('tower-icons');
  for (const key of TOWER_ORDER) {
    const def = TOWERS[key];
    if (typeof def.weapon !== 'string') continue;
    const id = SND.fireSound(def.weapon);
    const b = h('button', 'icon-btn');
    b.dataset.sound = id;
    b.append(iconCanvas((x) => { x.shadowColor = def.glow; x.shadowBlur = 10; drawTowerShape(x, key, 22, def); }), h('span', '', def.name));
    b.addEventListener('click', () => { select(id); play(id); });
    t.appendChild(b);
  }
  const e = $('enemy-icons');
  for (const key of Object.keys(ENEMIES)) {
    const def = ENEMIES[key];
    const id = SND.deathSound(key);
    const b = h('button', 'icon-btn');
    b.dataset.sound = id;
    b.append(iconCanvas((x) => { x.shadowColor = def.color; x.shadowBlur = 10; drawEnemyShape(x, key, 30, def.color); }), h('span', '', def.name));
    b.addEventListener('click', () => { select(id); play(id); });
    e.appendChild(b);
  }
}

function buildList() {
  const list = $('list');
  list.innerHTML = '';
  const groups = {};
  for (const [id, s] of Object.entries(data.SOUNDS)) (groups[s.group ?? 'Other'] ??= []).push(id);
  for (const [g, ids] of Object.entries(groups)) {
    const sec = h('div', 'group');
    sec.appendChild(h('h3', '', g));
    for (const id of ids) {
      const b = h('button', 'snd');
      b.dataset.id = id;
      b.append(h('span', '', data.SOUNDS[id].label ?? id), h('small', '', data.SOUNDS[id].bus));
      b.addEventListener('click', () => { select(id); play(id); });
      sec.appendChild(b);
    }
    list.appendChild(sec);
  }
  markList();
}

function markList() {
  for (const b of document.querySelectorAll('.snd')) {
    b.classList.toggle('sel', b.dataset.id === current);
    b.classList.toggle('changed', JSON.stringify(data.SOUNDS[b.dataset.id]) !== JSON.stringify(original[b.dataset.id]));
  }
  for (const b of document.querySelectorAll('.icon-btn')) b.classList.toggle('sel', b.dataset.sound === current);
}

// ---------------------------------------------------------------- the selected sound
function select(id) {
  if (id !== current) { current = id; layer = data.SOUNDS[id].synth?.freq ? -1 : (data.SOUNDS[id].synth?.layers?.length ? 0 : -1); }
  drawSound();
}

function drawSound() {
  const s = data.SOUNDS[current];
  $('s-label').textContent = s.label ?? current;
  $('s-id').textContent = current;
  // dials
  const dials = $('dials');
  dials.innerHTML = '';
  const bus = h('label', 'srow');
  const sel = h('select');
  for (const b of ['ui', 'sfx', 'music']) { const o = h('option', '', b); o.value = b; sel.appendChild(o); }
  sel.value = s.bus;
  sel.addEventListener('change', () => { s.bus = sel.value; edited(true); buildList(); });
  bus.append(h('span', '', 'Bus'), sel, h('span'));
  dials.appendChild(bus);
  for (const spec of DIALS) dials.appendChild(sliderRow(s, spec, edited));
  drawRecipe();
  drawWave();
  markList();
}

// the recipe object being edited (main voice or a layer)
const target = () => { const r = data.SOUNDS[current].synth; return layer < 0 ? r : r.layers[layer]; };

function drawRecipe() {
  const s = data.SOUNDS[current];
  const tabs = $('layer-tabs');
  tabs.innerHTML = '';
  const box = $('recipe');
  box.innerHTML = '';
  if (!s.synth) { box.appendChild(h('p', 'sub', 'This sound plays a file, not a synth recipe.')); return; }
  const r = s.synth;
  const tab = (label, i) => {
    const b = h('button', 'small' + (i === layer ? ' on' : ''), label);
    b.addEventListener('click', () => { layer = i; drawRecipe(); });
    tabs.appendChild(b);
  };
  tab(r.freq ? 'Main voice' : 'Main voice (off)', -1);
  (r.layers ?? []).forEach((_, i) => tab(`Layer ${i + 1}`, i));
  const add = h('button', 'small', '+ Layer');
  add.addEventListener('click', () => {
    const base = structuredClone(target()?.freq ? target() : { wave: 'square', freq: 440, hold: 0.08, volume: 0.2 });
    delete base.layers;
    base.at = +(recipeLength(r)).toFixed(3);
    (r.layers ??= []).push(base);
    layer = r.layers.length - 1;
    edited(true); drawRecipe();
  });
  tabs.appendChild(add);
  if (layer >= 0) {
    const del = h('button', 'small', '− Remove this layer');
    del.addEventListener('click', () => {
      r.layers.splice(layer, 1);
      if (!r.layers.length) delete r.layers;
      layer = -1; edited(true); drawRecipe();
    });
    tabs.appendChild(del);
  }

  const t = target();
  if (layer < 0 && !r.freq) {
    box.appendChild(h('p', 'sub', 'This sound is built from layers only. Pick a layer above, or give it a main voice too.'));
    const on = h('button', 'small', 'Add a main voice');
    on.addEventListener('click', () => { Object.assign(r, { wave: 'square', freq: 440, hold: 0.08, volume: 0.2 }); edited(true); drawRecipe(); });
    box.appendChild(on);
    return;
  }
  const waves = h('div', 'waves');
  for (const w of WAVES) {
    const b = h('button', 'small' + ((t.wave ?? 'square') === w ? ' on' : ''), w);
    b.addEventListener('click', () => { t.wave = w; edited(true); drawRecipe(); });
    waves.appendChild(b);
  }
  if (layer < 0) {
    const off = h('button', 'small', 'Turn main voice off');
    off.title = 'Keep only the layers';
    off.disabled = !r.layers?.length;
    off.addEventListener('click', () => { for (const k of Object.keys(r)) if (k !== 'layers') delete r[k]; layer = 0; edited(true); drawRecipe(); });
    waves.appendChild(off);
  }
  box.appendChild(waves);
  const grid = h('div', 'sliders');
  if (layer >= 0) { grid.appendChild(h('div', 'sgroup', 'Timing')); grid.appendChild(sliderRow(t, ['at', 'Starts at (s)', 0, 3, 0.005, 0], edited)); }
  for (const [g, specs] of RECIPE) {
    grid.appendChild(h('div', 'sgroup', g));
    for (const spec of specs) grid.appendChild(sliderRow(t, spec, edited));
  }
  box.appendChild(grid);
}

function drawWave() {
  const c = $('wave'), s = data.SOUNDS[current];
  const dpr = window.devicePixelRatio || 1;
  c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
  const x = c.getContext('2d');
  x.clearRect(0, 0, c.width, c.height);
  if (!s.synth) return;
  const rate = 22050, d = renderSynth(s.synth, rate);
  const w = c.width, mid = c.height / 2, amp = c.height * 0.46;
  x.strokeStyle = 'rgba(255,255,255,0.12)'; x.beginPath(); x.moveTo(0, mid); x.lineTo(w, mid); x.stroke();
  x.fillStyle = '#4ef3ff';
  const per = d.length / w;
  let peak = 0;
  for (let i = 0; i < w; i++) {
    let lo = 0, hi = 0;
    const j0 = Math.floor(i * per), j1 = Math.max(j0 + 1, Math.floor((i + 1) * per));
    for (let j = j0; j < j1 && j < d.length; j++) { if (d[j] < lo) lo = d[j]; if (d[j] > hi) hi = d[j]; }
    peak = Math.max(peak, hi, -lo);
    x.fillRect(i, mid - hi * amp, 1, Math.max(1, (hi - lo) * amp));
  }
  // layer start marks
  x.fillStyle = '#ffb020';
  for (const l of s.synth.layers ?? []) x.fillRect((l.at ?? 0) / (d.length / rate) * w, 0, Math.max(1, dpr), c.height);
  $('s-meta').textContent = `Length ${(d.length / rate).toFixed(2)} s · peak ${Math.round(peak * 100)}% · priority ${s.priority} · ${s.voices} voice${s.voices > 1 ? 's' : ''}, gap ${s.gap ?? 0} s`;
}

let autoTimer = null;
function edited(final) {
  engine.invalidate(current);
  drawWave();
  markList();
  setStatus();
  if ($('auto').checked) { clearTimeout(autoTimer); autoTimer = setTimeout(() => play(current), final ? 0 : 160); }
}

// ---------------------------------------------------------------- buttons
$('play').addEventListener('click', () => play(current));
$('play5').addEventListener('click', () => { for (let i = 0; i < 5; i++) setTimeout(() => play(current), i * 260); });
$('mutate').addEventListener('click', () => {
  const t = target();
  if (!t?.freq) return;
  for (const [, specs] of RECIPE) for (const [key, , min, max] of specs) {
    if (typeof t[key] !== 'number' || key === 'seed') continue;
    t[key] = +Math.min(max, Math.max(min, t[key] * (0.85 + Math.random() * 0.3))).toFixed(4);
  }
  edited(true); drawRecipe();
});
$('revert').addEventListener('click', () => {
  data.SOUNDS[current] = structuredClone(original[current]);
  layer = -1;
  edited(true); drawSound();
});
$('stop').addEventListener('click', () => { stressStop = true; engine.stopAll(); });

// ---------------------------------------------------------------- stress test
const STRESS_DEFAULT = { threader: 6, ddos: 2, defrag: 1, deleter: 1, pulse: 2, compressor: 1 };
const stressCounts = {};
let stressStop = false;
function buildStress() {
  const box = $('stress-towers');
  for (const key of TOWER_ORDER) {
    if (typeof TOWERS[key].weapon !== 'string') continue;
    stressCounts[key] = STRESS_DEFAULT[key] ?? 1;
    const l = h('label', '', TOWERS[key].name);
    const n = h('input'); n.type = 'number'; n.min = 0; n.max = 20; n.value = stressCounts[key];
    n.addEventListener('change', () => { stressCounts[key] = Math.max(0, +n.value || 0); });
    l.appendChild(n);
    box.appendChild(l);
  }
  const g = $('globals');
  g.appendChild(sliderRow(data.AUDIO, ['maxVoices', 'All SFX voices', 2, 32, 1, 14], () => { engine.pools.sfx.max = data.AUDIO.maxVoices; setStatus(); }));
  g.appendChild(sliderRow(data.AUDIO, ['maxUiVoices', 'UI voices', 1, 8, 1, 4], () => { engine.pools.ui.max = data.AUDIO.maxUiVoices; setStatus(); }));
}

// A weapon's real timing: cooldown, bursts, clip and reload (as in entities.js).
function gunState(w) { return { w, cool: Math.random() / w.fireRate, burst: 0, burstT: 0, clip: w.clipSize, reload: 0 }; }
function gunTick(g, dt) {
  const w = g.w;
  if (g.reload > 0) { g.reload -= dt; if (g.reload <= 0) g.clip = w.clipSize; return false; }
  if (g.burst > 0) {
    g.burstT -= dt;
    if (g.burstT > 0) return false;
    g.burst--; g.burstT = w.burstInterval;
    if (g.burst === 0 && w.clipSize > 0 && g.clip <= 0) g.reload = w.reloadTime;
    return true;
  }
  g.cool -= dt;
  if (g.cool > 0) return false;
  g.cool = 1 / w.fireRate;
  if (w.burstCount > 1) { g.burst = w.burstCount - 1; g.burstT = w.burstInterval; }
  if (w.clipSize > 0) { g.clip--; if (g.clip <= 0 && g.burst === 0) g.reload = w.reloadTime; }
  return true;
}

$('stress-run').addEventListener('click', () => {
  engine.unlock();
  stressStop = false;
  const guns = [];
  for (const [key, n] of Object.entries(stressCounts)) for (let i = 0; i < n; i++) guns.push({ id: SND.fireSound(TOWERS[key].weapon), g: gunState(WEAPONS[TOWERS[key].weapon]) });
  const tally = {};
  engine.onRequest = (id, r) => {
    const t = (tally[id] ??= { played: 0, gap: 0, voices: 0, busy: 0, cut: 0 });
    if (r.ok) t.played++; else t[r.reason]++;
    if (r.steal) (tally[r.steal.id] ??= { played: 0, gap: 0, voices: 0, busy: 0, cut: 0 }).cut++;
  };
  const kills = +$('kills').value || 0, secs = +$('secs').value || 8;
  let t = 0, peak = 0, last = performance.now();
  const step = () => {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
    last = now; t += dt;
    for (const gun of guns) if (gunTick(gun.g, dt)) engine.play(gun.id);
    if (Math.random() < kills * dt) engine.play(Math.random() < 0.2 ? 'enemy_die_big' : 'enemy_die');
    const pool = engine.pools.sfx; pool.prune(engine.ctx.currentTime);
    const n = pool.voices.length; peak = Math.max(peak, n);
    $('meter').style.width = `${(n / pool.max) * 100}%`;
    $('meter').classList.toggle('full', n >= pool.max);
    $('meter-text').textContent = `Voices: ${n} of ${pool.max} now · peak ${peak} · ${t.toFixed(1)} s`;
    drawTally(tally);
    if (t < secs && !stressStop) requestAnimationFrame(step);
    else engine.onRequest = null;
  };
  requestAnimationFrame(step);
});

function drawTally(tally) {
  const tb = $('stress-table');
  tb.innerHTML = '<tr><th>Sound</th><th>Priority</th><th>Played</th><th>Gap</th><th>Voice limit</th><th>Pool full</th><th>Cut off</th></tr>';
  for (const [id, t] of Object.entries(tally).sort((a, b) => (data.SOUNDS[b[0]].priority) - (data.SOUNDS[a[0]].priority))) {
    const tr = h('tr');
    const cells = [data.SOUNDS[id].label ?? id, data.SOUNDS[id].priority, t.played, t.gap, t.voices, t.busy, t.cut];
    cells.forEach((v, i) => { const td = h('td', i >= 5 && v > 0 ? 'drop' : '', String(v)); tr.appendChild(td); });
    tb.appendChild(tr);
  }
}

// ---------------------------------------------------------------- music
function buildMusic() {
  const box = $('music');
  box.innerHTML = '';
  data.MUSIC.waves ??= [];
  const row = (label, cue, m, onRemove) => {
    const r = h('div', 'music-row');
    const file = h('input'); file.type = 'text'; file.placeholder = 'no track yet'; file.value = m.file ?? '';
    file.addEventListener('change', () => { m.file = file.value.trim() || null; syncMusicView(); setStatus(); });
    const gain = h('input'); gain.type = 'number'; gain.min = 0; gain.max = 2; gain.step = 0.05; gain.value = m.gain ?? 1; gain.title = 'Gain';
    gain.addEventListener('change', () => { m.gain = +gain.value; syncMusicView(); setStatus(); });
    const credit = h('input'); credit.type = 'text'; credit.placeholder = 'credit / licence'; credit.value = m.credit ?? '';
    credit.addEventListener('change', () => { m.credit = credit.value; setStatus(); });
    const btns = h('span');
    const btn = h('button', 'small music-play', '▶');
    btn.addEventListener('click', () => {
      engine.unlock();
      const playing = engine.cue === cue;
      for (const b of box.querySelectorAll('.music-play')) b.textContent = '▶';
      if (playing) { engine.stopMusic(); return; }
      if (!m.file) { $('status').textContent = `No track in ${label} yet`; return; }
      engine.playMusic(cue, { restart: true, fadeIn: cue === 'menu' }); btn.textContent = '■';
    });
    btns.appendChild(btn);
    if (onRemove) {
      const del = h('button', 'small', '×'); del.title = 'Remove this track';
      del.addEventListener('click', onRemove);
      btns.appendChild(del);
    }
    r.append(h('span', '', label), file, gain, credit, btns);
    box.appendChild(r);
  };
  row('Menu', 'menu', data.MUSIC.menu);
  box.appendChild(h('p', 'sub', 'Wave pool: one of these (never the one just played) starts from the top and loops for the set number of waves, lowered between waves, then the next wave picks a new one.'));
  data.MUSIC.waves.forEach((m, i) => row(`Wave ${i + 1}`, `wave:${i}`, m, () => {
    engine.stopMusic(); data.MUSIC.waves.splice(i, 1); syncMusicView(); buildMusic(); setStatus();
  }));
  const add = h('button', 'small', '+ Wave track');
  add.addEventListener('click', () => { data.MUSIC.waves.push({ file: null, gain: 1, credit: '' }); syncMusicView(); buildMusic(); setStatus(); });
  box.appendChild(add);
  const pick = h('button', 'small', '▶ Next wave (random pick)');
  pick.addEventListener('click', () => {
    engine.unlock();
    const i = engine.playWaveMusic();
    for (const b of box.querySelectorAll('.music-play')) b.textContent = '▶';
    $('status').textContent = i < 0 ? 'No wave tracks with a file yet' : `Playing Wave ${i + 1}`;
  });
  box.appendChild(pick);
  const brk = h('button', 'small', 'Wave break: off');
  brk.title = 'Hear the music lowered, as between waves';
  brk.addEventListener('click', () => { engine.unlock(); engine.musicBreak(!engine.inBreak); brk.textContent = `Wave break: ${engine.inBreak ? 'on' : 'off'}`; brk.classList.toggle('on', engine.inBreak); });
  box.appendChild(brk);
}

function buildMusicGlobals() {
  const g = $('music-globals');
  g.appendChild(sliderRow(data.AUDIO, ['musicFade', 'Fade out (s)', 0, 5, 0.1, 1.2], setStatus));
  g.appendChild(sliderRow(data.AUDIO, ['stingDuck', 'Music under sting', 0, 1, 0.05, 0.25], setStatus));
  g.appendChild(sliderRow(data.AUDIO, ['wavesPerTrack', 'Waves per track', 1, 10, 1, 3], setStatus));
  g.appendChild(sliderRow(data.AUDIO, ['breakLevel', 'Music between waves', 0, 1, 0.05, 0.35], () => { if (engine.inBreak) engine.musicBreak(true); setStatus(); }));
  g.appendChild(sliderRow(data.AUDIO.defaults, ['music', 'New player music', 0, 1, 0.05, 0.6], setStatus));
  g.appendChild(sliderRow(data.AUDIO.defaults, ['sfx', 'New player SFX', 0, 1, 0.05, 0.8], setStatus));
}

// ---------------------------------------------------------------- save
function setStatus() {
  const st = $('status'), dirty = formatSounds(data) !== savedText;
  st.className = dirty ? 'dirty' : '';
  st.textContent = dirty ? 'Unsaved changes' : 'Saved. Commit with GitHub Desktop when you’re happy.';
  $('save').disabled = !dirty;
}

async function save() {
  const st = $('status'), text = formatSounds(data);
  st.textContent = 'Saving…';
  try {
    const res = await fetch('./save', { method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: text });
    if (!res.ok) throw new Error(await res.text());
    savedText = text;
    Object.assign(original, structuredClone(data.SOUNDS));
    setStatus(); markList();
  } catch (err) {
    st.className = 'bad';
    st.textContent = `Not saved: ${err.message.includes('fetch') ? 'can’t reach serve.py (is it running?)' : err.message}`;
  }
}
$('save').addEventListener('click', save);
window.addEventListener('beforeunload', (e) => { if (formatSounds(data) !== savedText) e.preventDefault(); });
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); if (!$('save').disabled) save(); return; }
  if (e.key === ' ' && !e.target.closest('input, select, textarea, button')) { e.preventDefault(); play(current); }
});
window.addEventListener('resize', drawWave);

// ---------------------------------------------------------------- boot
buildIcons();
buildList();
buildStress();
buildMusic();
buildMusicGlobals();
select(current);
drawSound();
setStatus();
