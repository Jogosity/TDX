// TDX — narrative content (M4 "Disc Drive").
// Content lives in content/TDX_Narrative.md as `Key: value` lines, edited by
// Jogo in Obsidian. This module parses it (DOM-free, Node-testable), picks the
// archive and memories for a run, and works out which memories are lost.

export const NARRATIVE_URL = 'content/TDX_Narrative.md';
export const AVATAR_DIR = 'assets/avatars/';
export const DEFAULT_AVATAR = 'Av_BLANK_S.png';

// Screen strings used when the .md leaves one out.
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

const KEY_LINE = /^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/;
const BARE_KEY = /^[A-Za-z]+\d*_[A-Za-z0-9_]+$/;     // a key that lost its colon
const LEVEL_KEY = /^Level_(\d+)_(Label|Narrative_Label|Narrative_Desc|Archives)$/;
const ARCHIVE_KEY = /^Archive(\d+)_(Icon|Name|Bio|Type|Description|Win_Label|Lose_Label|(Core|Secondary)Memory(\d+)(_Summary)?)$/;

// Parse the .md. Returns { levels, archives, strings, warnings }.
//   levels[n]   = { label, narrativeLabel, narrativeDesc, archives: [ids] }
//   archives[n] = { id, icon, name, bio, type, description, winLabel, loseLabel,
//                   core: [{ text, summary }], secondary: [{ text, summary }] }
// Rules: `#` headings, `>` note lines and blank lines are ignored; a plain line right after a
// key line continues that value as a new paragraph; empty values are skipped.
export function parseNarrative(text) {
  const raw = {};            // key → value, in file order
  const warnings = [];
  let last = null;
  text.split(/\r?\n/).forEach((line, i) => {
    const t = line.trim();
    if (!t) { last = null; return; }
    if (t.startsWith('#') || t.startsWith('>')) { last = null; return; }   // headings, notes
    const m = t.match(KEY_LINE);
    if (m) {
      if (m[1] in raw && raw[m[1]]) warnings.push(`Line ${i + 1}: ${m[1]} appears twice (last one wins)`);
      raw[m[1]] = m[2].trim();
      last = m[1];
    } else if (BARE_KEY.test(t)) {
      warnings.push(`Line ${i + 1}: "${t}" has no colon`);
      last = null;
    } else if (last) {
      raw[last] = raw[last] ? `${raw[last]}\n${t}` : t;
    } else {
      warnings.push(`Line ${i + 1}: text with no key ("${t.slice(0, 30)}…")`);
    }
  });

  const levels = {}, archives = {}, strings = { ...DEFAULT_STRINGS };
  const level = (n) => (levels[n] ??= { label: '', narrativeLabel: '', narrativeDesc: '', archives: [] });
  const archive = (n) => (archives[n] ??= {
    id: n, icon: DEFAULT_AVATAR, name: '', bio: '', type: '', description: '',
    winLabel: '', loseLabel: '', core: [], secondary: [],
  });
  const memSlots = {};       // archive id → { core: {m: {text, summary}}, secondary: {...} }

  for (const [key, value] of Object.entries(raw)) {
    let m;
    if ((m = key.match(LEVEL_KEY))) {
      const lv = level(+m[1]);
      if (m[2] === 'Archives') lv.archives = value.split(/[,\s]+/).filter(Boolean).map(Number).filter(n => n > 0);
      else lv[{ Label: 'label', Narrative_Label: 'narrativeLabel', Narrative_Desc: 'narrativeDesc' }[m[2]]] = value;
    } else if ((m = key.match(ARCHIVE_KEY))) {
      const id = +m[1], a = archive(id);
      if (m[3]) {
        const kind = m[3] === 'Core' ? 'core' : 'secondary';
        const slot = ((memSlots[id] ??= { core: {}, secondary: {} })[kind][+m[4]] ??= { text: '', summary: '' });
        slot[m[5] ? 'summary' : 'text'] = value;
      } else if (value) {
        a[{ Icon: 'icon', Name: 'name', Bio: 'bio', Type: 'type', Description: 'description',
            Win_Label: 'winLabel', Lose_Label: 'loseLabel' }[m[2]]] = value;
      }
    } else if (key in DEFAULT_STRINGS) {
      if (value) strings[key] = value;
    } else if (key === 'Heading') {
      if (value) strings.Archive_Heading = value;        // Jogo's original key
    } else {
      warnings.push(`Unknown key: ${key}`);
    }
  }

  // memories: keep numbered order, drop empty ones, default the summary
  for (const [id, slots] of Object.entries(memSlots)) {
    for (const kind of ['core', 'secondary']) {
      archives[id][kind] = Object.keys(slots[kind]).map(Number).sort((a, b) => a - b)
        .map(n => slots[kind][n])
        .filter(mem => mem.text)
        .map(mem => ({ text: mem.text, summary: mem.summary || mem.text }));
    }
  }
  for (const a of Object.values(archives)) {
    if (!a.name) warnings.push(`Archive${a.id} has no Name`);
    if (a.core.length === 0) warnings.push(`Archive${a.id} has no Core Memory`);
  }
  for (const [n, lv] of Object.entries(levels)) {
    for (const id of lv.archives) if (!archives[id]) warnings.push(`Level_${n}_Archives names Archive${id}, which doesn't exist`);
  }
  return { levels, archives, strings, warnings };
}

// Archives that can be picked for a level (1-based level number): the
// level's pool if it names one, otherwise every archive with a Name.
export function archivePool(content, levelNo) {
  const usable = (a) => a && a.name && a.core.length > 0;
  const named = (content.levels[levelNo]?.archives ?? []).map(id => content.archives[id]).filter(usable);
  return named.length ? named : Object.values(content.archives).filter(usable);
}

const pickN = (arr, n, rand) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
};

export const SECONDARY_SHOWN = 3;

// One run's narrative: the archive, its one Core Memory and three Secondary
// Memories (random), plus the order they'll be lost in: Secondaries first in
// random order, the Core Memory last. Null if the .md has no usable archive.
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

export async function loadNarrative(url = NARRATIVE_URL) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseNarrative(await res.text());
  } catch (err) {
    const empty = parseNarrative('');
    empty.warnings.push(`Couldn't load ${url}: ${err.message}`);
    return empty;
  }
}
