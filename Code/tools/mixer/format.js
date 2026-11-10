// TDX Sound Mixer — writes js/sounds.js.
// One formatter for the Mixer's Save and for the tests, so a save only changes
// the lines you touched: one sound per block, its dials on the first line and
// its recipe below. Pure, no DOM.

const WIDTH = 120;
const IDENT = /^[A-Za-z_$][\w$]*$/;

const HEADER = `// TDX — the sound list (M8 "Hypercard"). Written by the Sound Mixer (tools/mixer/, Save button).
// Hand edits are fine: the Mixer reads this file back as it is. All sound tuning
// lives here, like balance lives in config.js.
//
// Each sound:
//   group / label   where the Mixer lists it and what it's called there
//   bus       'ui' | 'sfx' | 'music'   which volume slider it follows
//   priority  0–100. When every voice is busy, a new sound may cut off a
//             lower-priority one; it never cuts an equal or higher one.
//   voices    how many copies of this sound may play at once
//   gap       minimum seconds between two starts of this sound
//   vary      random pitch spread per play (0.08 = ±8%), so repeats don't drone
//   pitch     playback pitch/speed (1 = as made; linked, see TDX_M8_Plan D3)
//   gain      volume trim on top of the recipe
//   for       enemy types that use this death sound (enemy group only)
//   synth     the recipe (see js/synth.js)   — or —   file: 'assets/audio/x.mp3'
//
// Anti-spam (Jogo, 9 Nov): voices + gap stop one sound flooding (six Threaders
// share 3 voices); AUDIO.maxVoices caps everything at once; priority decides
// who is heard when the cap is hit, so rare heavy shots and game events
// outrank the rapid-fire guns.
`;

const FOOTER = `
// Lookups (fixed code, not data: the Mixer rewrites everything above this line).
export const fireSound = (weapon) => \`fire_\${weapon}\`;
export const deathSound = (type) =>
  Object.keys(SOUNDS).find(id => SOUNDS[id].group === 'Enemies' && SOUNDS[id].for?.includes(type)) ?? 'enemy_die';
`;

// Key order inside a sound, so diffs stay tidy whatever order the Mixer built it in.
const SOUND_KEYS = ['group', 'label', 'bus', 'priority', 'voices', 'gap', 'vary', 'pitch', 'gain', 'for', 'file', 'synth'];
const RECIPE_KEYS = ['at', 'wave', 'freq', 'freqEnd', 'slideTime', 'duty', 'attack', 'hold', 'release', 'punch',
  'arpAt', 'arpMul', 'vibRate', 'vibDepth', 'noise', 'lowpass', 'lowpassEnd', 'crush', 'volume', 'seed', 'layers'];

function lit(v) {
  if (typeof v === 'string') return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (typeof v === 'number') return Number.isFinite(v) ? String(+v.toFixed(4)) : 'null';
  if (v === null || v === undefined) return 'null';
  return String(v);
}
const keyOf = k => (IDENT.test(k) ? k : lit(k));

function ordered(obj, order) {
  const keys = [...order.filter(k => k in obj), ...Object.keys(obj).filter(k => !order.includes(k))];
  return keys.filter(k => obj[k] !== undefined).map(k => [k, obj[k]]);
}

function inline(v, order) {
  if (Array.isArray(v)) return `[${v.map(x => inline(x, order)).join(', ')}]`;
  if (v && typeof v === 'object') {
    const parts = ordered(v, order ?? []).map(([k, x]) => `${keyOf(k)}: ${inline(x, k === 'layers' ? RECIPE_KEYS : order)}`);
    return parts.length ? `{ ${parts.join(', ')} }` : '{}';
  }
  return lit(v);
}

function recipe(r, indent) {
  const one = inline(r, RECIPE_KEYS);
  if (indent.length + one.length <= WIDTH || !r.layers?.length) return one;
  const pad = indent + '  ';
  const head = ordered(r, RECIPE_KEYS).filter(([k]) => k !== 'layers').map(([k, x]) => `${keyOf(k)}: ${lit(x)}`);
  const layers = r.layers.map(l => `${pad}  ${inline(l, RECIPE_KEYS)},`).join('\n');
  return `{ ${head.length ? head.join(', ') + ', ' : ''}layers: [\n${layers}\n${pad}] }`;
}

function soundBlock(id, s) {
  const dials = ordered(s, SOUND_KEYS).filter(([k]) => k !== 'synth').map(([k, x]) => `${keyOf(k)}: ${inline(x)}`).join(', ');
  const body = s.synth ? `\n    synth: ${recipe(s.synth, '    ')},` : '';
  return `  ${keyOf(id)}: { ${dials},${body}\n  },`;
}

function flat(name, obj) {
  // a list of objects (the wave track pool) gets one entry per line
  const val = (v) => (Array.isArray(v) && v.some(x => x && typeof x === 'object')
    ? `[\n${v.map(x => `    ${inline(x)},`).join('\n')}\n  ]` : inline(v));
  const rows = Object.entries(obj).map(([k, v]) => `  ${keyOf(k)}: ${val(v)},`);
  return `export const ${name} = {\n${rows.join('\n')}\n};\n`;
}

export function formatSounds({ AUDIO, SOUNDS, MUSIC }) {
  return `${HEADER}\n${flat('AUDIO', AUDIO)}\nexport const SOUNDS = {\n${Object.entries(SOUNDS).map(([id, s]) => soundBlock(id, s)).join('\n')}\n};\n\n`
    + `// Music. menu: plays on the main menu. waves: the pool (Jogo, 10 Nov): a track (not the\n`
    + `// last one) starts from the top and loops for AUDIO.wavesPerTrack waves; between waves it\n`
    + `// drops to AUDIO.breakLevel. file: null = no track. Files live in Code/assets/audio/.\n`
    + `${flat('MUSIC', MUSIC)}${FOOTER}`;
}

export const SOUNDS_FILE_HEADER = HEADER.split('\n')[0];
