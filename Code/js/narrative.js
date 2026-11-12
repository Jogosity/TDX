// TDX — narrative content (M4 "Disc Drive").
// Jogo writes the content in Apple Numbers and exports CSV (File → Export To →
// CSV) into content/TDX_Text/ (Numbers names the folder after the source file
// TDX_Text.numbers), one file per table, under the export's own names:
//   Archives-Table 1.csv     one row per archive (person, business …) + its memories
//   Levels-Table 1.csv       one row per level: Level_Number, Level_Label,
//                            Level_Narrative_Label, Level_Narrative_Desc,
//                            Level_Archives (the Classes the level draws from)
//   Screen Text-Table 1.csv  StringID, Text: fixed wording on the screens
//   Tutorials-Table 1.csv    Tutorial_Message, Text: the Tutorial's boxes (S24)
// This module parses them (DOM-free, Node-testable), picks the archive and
// memories for a run, and works out which memories are lost.

export const CONTENT_DIR = 'content/TDX_Text/';
export const CONTENT_FILES = {
  archives: 'Archives-Table 1.csv',
  levels: 'Levels-Table 1.csv',
  strings: 'Screen Text-Table 1.csv',
  tutorials: 'Tutorials-Table 1.csv',
};
export const AVATAR_DIR = 'assets/avatars/';
export const DEFAULT_AVATAR = 'Av_BLANK_S.png';

// Screen strings used when Screen Text leaves one out.
export const DEFAULT_STRINGS = {
  Archive_Heading: 'Archive Record',
  Core_Memory_Heading: 'Core Memory',          // not shown since S20 (★ marks it); kept so the CSV key stays valid
  Secondary_Memories_Heading: 'Secondary Memories',   // not shown since S20 (• marks them)
  Archive_Attack_Line1: 'Victim under attack',   // not shown since S23 (banner removed); kept so the CSV key stays valid
  Archive_Attack_Line2: 'Defend their data!',
  Archive_Data_Risk: 'Data at Risk:',           // S23: small grey header above the Sub-Class line
  Result_Win_Title: 'SUCCESS',
  Result_Lose_Title: 'FAILURE',
  Result_Win_Label: 'Archive defended',
  Result_Lose_Label: 'Archive breached',
  Result_Cores_Label: 'Cores protected',
  Memories_Lost_Heading: 'Memories Lost:',
  No_Memories_Lost: 'None. Every memory is safe.',
  Analytics_Heading: 'Analytics Report',
  Analytics_Built: 'Towers built',
  Analytics_Lost: 'Towers lost',
  Analytics_Upgraded: 'Towers upgraded',
  Analytics_Earned: 'Tokens earned',
  Analytics_Spent: 'Tokens spent',
  Analytics_Kills: 'Enemies destroyed',
  Analytics_Cores_Lost: 'Cores lost to',
  Analytics_No_Cores_Lost: 'None. Every Core held.',
  Archive_Back: 'Back',                       // S26: bottom Back button on the Archive pop-up
  Report_Main_Menu: 'Main Menu',               // S25: Battle Report buttons after a win
  Report_Next_Level: 'Next Level',
  Difficulty_Select: 'Select Difficulty',      // M9: Level Select pop-up "Level N: Select Difficulty"
  Difficulty_Basic: 'Basic',
  Difficulty_Advanced: 'Advanced',
  Analytics_Difficulty: 'Difficulty',
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
// Levels table headings → fields. Any other column (notes …) is ignored.
const LEVEL_COLS = {
  number: 'Level_Number', label: 'Level_Label', narrativeLabel: 'Level_Narrative_Label',
  narrativeDesc: 'Level_Narrative_Desc', archives: 'Level_Archives',
};

// Tutorial text (S24), used when the Tutorials table leaves one out. Screen_N
// match Jogo's Tutorial_Screen_N mockups; Archive_Tut_* caption the Archive
// Record overlay. IDs are matched ignoring spaces ("Screen _8" = "Screen_8").
export const TUTORIAL_DEFAULTS = {
  Screen_1: 'Tap the “Threader” button to select the tower',
  Screen_2: 'Tap an empty cell to place the Threader.\nThreaders are attack towers.',
  Screen_3: 'Place two more Threader towers.',
  Screen_4: 'Tap to select a “Vault” tower',
  Screen_5: 'Vaults are defence towers. Use them to create walls and mazes to slow down enemies',
  Screen_6: 'Defend the Repo from enemy agents.\nIf an enemy reaches the Repo you will lose a Core.',
  Screen_7: 'If you lose too many Cores, the Repo will start to permanently lose data.\nIf you lose them all, the level will be failed.',
  Screen_8: 'Tap to collect a Blueprint.\nBlueprints unlock new towers.',
  Screen_9: 'Earn “Bits” for completing levels.\nYou can use Bits to unlock tower upgrades.',
  Archive_Tut_Top: 'This is the name of the person, or organisation you are protecting',
  Archive_Tut_Bottom: 'This is the data or memories that the cyber attackers are trying to steal - or delete!',
  Tut_Continue: 'Continue',
  Tut_Skip: 'Skip tutorial',
  // M9: the Welcome screen before the Tutorial (Welcome_Screen.png)
  Welcome_line_1_Title: 'Welcome to TDX',
  Welcome_line_2: 'Cyber crime is rife',
  Welcome_line_3: 'Hackers are infiltrating cloud archives and personal repositories all over the world.',
  Welcome_line_4: 'Your job is to protect the people and organisations under attack.',
  Welcome_line_5: 'Enter each data Archive and defeat the attacking agents using your defences.',
  Welcome_line_6_Prompt: 'Begin training',
};
// M9: the five avatars that drop onto the Welcome screen, in landing order.
export const WELCOME_AVATARS = [
  'Av_PersonSetA_1_S.png', 'Av_CompanyStyleB_13_S.png', 'Av_PetStyleB_7_S.png',
  'Av_PersonSetB_5_S.png', 'Av_OrgStyleB_7_S.png',
];
export const tutorialId = (id) => (id || '').replace(/\s+/g, '');

// Parse the CSV exports. Returns { levels, archives, strings, warnings }.
//   levels[n]   = { label, narrativeLabel, narrativeDesc, classes: [Class names] }
//   archives    = [{ id, active, icon, name, bio, type, description, winLabel, loseLabel,
//                    core: [{ text, summary }], secondary: [{ text, summary }] }]
// Only Active = YES archives are ever picked.
export function parseContent({ archives = '', levels = '', strings = '', tutorials = '' } = {}) {
  const warnings = [];
  const out = { levels: {}, archives: [], strings: { ...DEFAULT_STRINGS }, tutorial: { ...TUTORIAL_DEFAULTS }, warnings };

  for (const row of table(tutorials)) {
    const id = tutorialId(row.Tutorial_Message ?? row.StringID);
    if (id && row.Text) out.tutorial[id] = row.Text;
  }

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
    const raw = row[LEVEL_COLS.number] ?? '';
    const n = Number(raw);   // S23: Level 0 = the Tutorial
    if (raw === '' || !Number.isInteger(n) || n < 0) { warnings.push(`Levels: "${raw}" in ${LEVEL_COLS.number} isn't a level number`); continue; }
    if (out.levels[n]) { warnings.push(`Levels: Level ${n} has more than one row (the first is used)`); continue; }
    out.levels[n] = {
      label: row[LEVEL_COLS.label] ?? '',
      narrativeLabel: row[LEVEL_COLS.narrativeLabel] ?? '',
      narrativeDesc: row[LEVEL_COLS.narrativeDesc] ?? '',
      classes: (row[LEVEL_COLS.archives] ?? '').split(',').map(c => c.trim()).filter(Boolean),
    };
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
    // S23: a level whose Classes have no Active archive falls back to any archive; flag it
    if (lv.classes.length && classes.size && !archivePool(out, Number(n), { strict: true }).length)
      warnings.push(`Level ${n}: no Active archive in ${lv.classes.join(', ')} yet (it borrows from the other Classes)`);
  }
  return out;
}

const usable = (a) => a.active && a.name && a.core.length > 0;

// Archives that can be picked for a level (level number; 0 = Tutorial): Active ones
// of the level's Classes; if the level names none (or none of its Classes has
// an Active archive yet), any Active archive.
// S23: the Tutorial Class is only ever used by a level that names it, never as a fallback.
export const TUTORIAL_CLASS = 'tutorial';
export function archivePool(content, levelNo, { strict = false } = {}) {
  const classes = (content.levels[levelNo]?.classes ?? []).map(norm);
  const all = content.archives.filter(usable);
  const named = all.filter(a => classes.includes(norm(a.type)));
  if (named.length || strict) return named;
  const general = all.filter(a => norm(a.type) !== TUTORIAL_CLASS);
  return general.length ? general : all;
}

const pickN = (arr, n, rand) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
};

export const SECONDARY_SHOWN = 2;   // S18: was 3 (Jogo: less text on the Archive screen)

// One run's narrative: the archive, its one Core Memory and SECONDARY_SHOWN Secondary
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

// How many of the run's memories are lost on a win (S26, Jogo's dial): one more
// memory goes at each of these Cores-lost counts. The two others go first, the
// Core Memory last. Losing the level (all 15 Cores) loses everything.
export const MEMORY_LOSS_AT = [3, 7, 13];

export function memoriesLost(coresLost, shown) {
  return Math.min(shown, MEMORY_LOSS_AT.filter(n => coresLost >= n).length);
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
