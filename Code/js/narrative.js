// TDX — narrative content (M4 "Disc Drive").
// Jogo writes the content in Apple Numbers and exports CSV (File → Export To →
// CSV) into content/TDX_Text/ (Numbers names the folder after the source file
// TDX_Text.numbers), one file per table, under the export's own names:
//   Archives-Table 1.csv     one row per archive (person, business …) + its memories
//   Levels-Table 1.csv       StringID, Text: Level_N_Label / _Narrative_Label /
//                            _Narrative_Desc / _Archives (the Classes the level draws from)
//   Screen Text-Table 1.csv  StringID, Text: fixed wording on the screens
// This module parses them (DOM-free, Node-testable), picks the archive and
// memories for a run, and works out which memories are lost.

export const CONTENT_DIR = 'content/TDX_Text/';
export const CONTENT_FILES = {
  archives: 'Archives-Table 1.csv',
  levels: 'Levels-Table 1.csv',
  strings: 'Screen Text-Table 1.csv',
};
export const AVATAR_DIR = 'assets/avatars/';
export const DEFAULT_AVATAR = 'Av_BLANK_S.png';

// Screen strings used when Screen Text leaves one out.
export const DEFAULT_STRINGS = {
  Archive_Heading: 'Archive Record',
  Core_Memory_Heading: 'Core Memory',
  Secondary_Memories_Heading: 'Secondary Memories',
  Archive_Attack_Line1: 'Victim under attack',
  Archive_Attack_Line2: 'Defend their data!',
  Result_Win_Title: 'SUCCESS',
  Result_Lose_Title: 'FAILURE',
  Result_Win_Label: 'Archive defended',
  Result_Lose_Label: 'Archive breached',
  Result_Cores_Label: 'Cores protected',
  Memories_Lost_Heading: 'Memories Lost:',
  No_Memories_Lost: 'None. Every memory is safe.',
};

// RFC 4180 CSV: quoted fields may hold commas, quotes ("") and line breaks.
export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Rows as objects keyed by the header row. Headings and cells are trimmed;
// trailing line breaks inside a cell go, line breaks within it stay.
function table(text) {
  const [header = [], ...rows] = parseCSV(text);
  const keys = header.map(k => k.trim());
  return rows.map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])))
    .filter(r => Object.values(r).some(v => v));
}

const norm = (s) => s.trim().toLowerCase();

// Archives table headings (Jogo's names) → fields. Memory columns are found by
// pattern: "Core Memory 2", "Core Memory 2 Summary", "Secondary Memory 5" …
const ARCHIVE_COLS = {
  name: ['Name'], active: ['Active'], icon: ['Archive Icon', 'Icon', 'Avatar'],
  type: ['Archive Class', 'Class'], description: ['Archive Sub-Class', 'Sub-Class'],
  bio: ['Archive Desc', 'Desc', 'Bio'],
  winLabel: ['Win Label'], loseLabel: ['Lose Label'],
};
const MEM_COL = /^(core|secondary) memory (\d+)( summary)?$/i;
const LEVEL_KEY = /^Level_(\d+)_(Label|Narrative_Label|Narrative_Desc|Archives)$/;

// Parse the three CSV exports. Returns { levels, archives, strings, warnings }.
//   levels[n]   = { label, narrativeLabel, narrativeDesc, classes: [Class names] }
//   archives    = [{ id, active, icon, name, bio, type, description, winLabel, loseLabel,
//                    core: [{ text, summary }], secondary: [{ text, summary }] }]
// Only Active = YES archives are ever picked.
export function parseContent({ archives = '', levels = '', strings = '' } = {}) {
  const warnings = [];
  const out = { levels: {}, archives: [], strings: { ...DEFAULT_STRINGS }, warnings };

  table(archives).forEach((row, i) => {
    const get = (f) => { for (const k of ARCHIVE_COLS[f]) if (row[k]) return row[k]; return ''; };
    const a = {
      id: i + 1, active: norm(get('active')) === 'yes',
      icon: get('icon') || DEFAULT_AVATAR,
      name: get('name'), bio: get('bio'), type: get('type'), description: get('description'),
      winLabel: get('winLabel'), loseLabel: get('loseLabel'), core: [], secondary: [],
    };
    const slots = { core: {}, secondary: {} };
    for (const [k, v] of Object.entries(row)) {
      const m = k.match(MEM_COL);
      if (!m) continue;
      const slot = (slots[m[1].toLowerCase()][+m[2]] ??= { text: '', summary: '' });
      slot[m[3] ? 'summary' : 'text'] = v;
    }
    for (const kind of ['core', 'secondary']) {
      a[kind] = Object.keys(slots[kind]).map(Number).sort((x, y) => x - y)
        .map(n => slots[kind][n]).filter(mem => mem.text)
        .map(mem => ({ text: mem.text, summary: mem.summary || mem.text }));
    }
    if (!a.name) return;                      // blank spacer rows
    if (a.active && a.core.length === 0) warnings.push(`${a.name} is Active but has no Core Memory`);
    if (a.active && a.secondary.length < SECONDARY_SHOWN) warnings.push(`${a.name} is Active but has fewer than ${SECONDARY_SHOWN} Secondary Memories`);
    out.archives.push(a);
  });

  for (const row of table(levels)) {
    const id = (row.StringID || '').trim();
    if (!id) continue;
    const m = id.match(LEVEL_KEY);
    if (!m) { warnings.push(`Levels: unknown StringID "${id}"`); continue; }
    // tolerate a Text cell that repeats its own key ("Level_1_Label: Archive 001")
    let text = row.Text || '';
    if (text.startsWith(`${id}:`)) text = text.slice(id.length + 1).trim();
    const lv = (out.levels[+m[1]] ??= { label: '', narrativeLabel: '', narrativeDesc: '', classes: [] });
    if (m[2] === 'Archives') lv.classes = text.split(',').map(c => c.trim()).filter(Boolean);
    else lv[{ Label: 'label', Narrative_Label: 'narrativeLabel', Narrative_Desc: 'narrativeDesc' }[m[2]]] = text;
  }

  for (const row of table(strings)) {
    const id = (row.StringID || '').trim();
    if (!id) continue;
    if (id in DEFAULT_STRINGS) { if (row.Text) out.strings[id] = row.Text; }
    else warnings.push(`Screen Text: unknown StringID "${id}"`);
  }

  const classes = new Set(out.archives.map(a => norm(a.type)));
  for (const [n, lv] of Object.entries(out.levels)) {
    for (const c of lv.classes) if (!classes.has(norm(c))) warnings.push(`Level ${n} draws from Class "${c}", which no archive has`);
  }
  return out;
}

const usable = (a) => a.active && a.name && a.core.length > 0;

// Archives that can be picked for a level (1-based level number): Active ones
// of the level's Classes; if the level names none (or none of its Classes has
// an Active archive yet), any Active archive.
export function archivePool(content, levelNo) {
  const classes = (content.levels[levelNo]?.classes ?? []).map(norm);
  const all = content.archives.filter(usable);
  const named = all.filter(a => classes.includes(norm(a.type)));
  return named.length ? named : all;
}

const pickN = (arr, n, rand) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
};

export const SECONDARY_SHOWN = 3;

// One run's narrative: the archive, its one Core Memory and three Secondary
// Memories (random), plus the order they'll be lost in: Secondaries first in
// random order, the Core Memory last. Null if there's no usable archive.
export function rollRun(content, levelNo, rand = Math.random) {
  const pool = archivePool(content, levelNo);
  if (pool.length === 0) return null;
  const archive = pool[Math.floor(rand() * pool.length)];
  const core = pickN(archive.core, 1, rand)[0];
  const secondary = pickN(archive.secondary, SECONDARY_SHOWN, rand);
  const lossOrder = [...pickN(secondary, secondary.length, rand), core];
  return { archive, core, secondary, lossOrder };
}

// How many of the run's memories are lost (Jogo's rule, M4 Todos). One per
// `step` Cores lost, step = ceil((startCores − 1) / shown): with 15 Cores and 4
// memories, lose 4 → 1, 8 → 2, 12 → 3. The last memory (the Core Memory) only
// goes when you're down to one Core. Losing the level loses everything.
export function memoriesLost(coresLost, startCores, shown) {
  if (shown <= 0 || coresLost <= 0) return 0;
  if (coresLost >= startCores - 1) return shown;
  const step = Math.max(1, Math.ceil((startCores - 1) / shown));
  return Math.min(shown - 1, Math.floor(coresLost / step));
}

export async function loadNarrative(dir = CONTENT_DIR) {
  const texts = {}, failed = [];
  await Promise.all(Object.entries(CONTENT_FILES).map(async ([key, file]) => {
    try {
      const res = await fetch(dir + encodeURIComponent(file), { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      texts[key] = await res.text();
    } catch (err) { failed.push(`Couldn't load ${dir}${file}: ${err.message}`); }
  }));
  const content = parseContent(texts);
  content.warnings.unshift(...failed);
  return content;
}
