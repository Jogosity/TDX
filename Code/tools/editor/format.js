// TDX Level Editor — writes js/levels.js.
// One formatter for the editor's Save and for tests, so a save never makes a
// noisy diff: anything short fits on one line (a wave is one line), anything
// long breaks over several lines. Pure, no DOM.

const WIDTH = 110;
const IDENT = /^[A-Za-z_$][\w$]*$/;

const HEADER = `// TDX — level data. Written by the Level Editor (tools/editor/, Save button).
// Hand edits are fine: the editor reads this file back as it is.
// LEVELS[0] is Level 0, the Tutorial (tutorial: true); the level number is the index.
//
// Per level: grid shape (rowWidths; entry points sit in the top entryRows rows
// and at least entryMinDist steps from the base), entry points, blockers and
// Lockouts (counts; cells are rolled every run and on every CRASH), starting
// Tokens, enemy delta, BITS reward, Blueprint drop slots, colour theme, waves.
// Waves: tev / mav / rtv / spawnInterval / unlocked roster / optional pick
// weights (see waves.js).
// design: editor and Ledger only, the game never reads it. curve = the
// intensity curve's handles, target = the Ledger's target pressure.
`;

function lit(v) {
  if (typeof v === 'string') return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (typeof v === 'number') return Number.isFinite(v) ? String(+v.toFixed(6)) : 'null';
  if (v === null || v === undefined) return 'null';
  return String(v);
}

const keyOf = k => (IDENT.test(k) ? k : lit(k));

function inline(v) {
  if (Array.isArray(v)) return `[${v.map(inline).join(', ')}]`;
  if (v && typeof v === 'object') {
    const parts = Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => `${keyOf(k)}: ${inline(x)}`);
    return parts.length ? `{ ${parts.join(', ')} }` : '{}';
  }
  return lit(v);
}

function block(v, indent) {
  const one = inline(v);
  if (indent.length + one.length <= WIDTH || !v || typeof v !== 'object') return one;
  const pad = indent + '  ';
  if (Array.isArray(v)) return `[\n${v.map(x => pad + block(x, pad) + ',').join('\n')}\n${indent}]`;
  const rows = Object.entries(v).filter(([, x]) => x !== undefined)
    .map(([k, x]) => `${pad}${keyOf(k)}: ${block(x, pad)},`);
  return `{\n${rows.join('\n')}\n${indent}}`;
}

// Levels are always one key per line, so a change to one field is a one-line diff.
function levelBlock(level) {
  const rows = Object.entries(level).filter(([, x]) => x !== undefined).map(([k, x]) => {
    if (k === 'waves') return `    waves: [\n${x.map(w => `      ${inline(w)},`).join('\n')}\n    ],`;
    return `    ${keyOf(k)}: ${block(x, '    ')},`;
  });
  return `  {\n${rows.join('\n')}\n  },`;
}

export function formatLevels(levels) {
  return `${HEADER}\nexport const LEVELS = [\n${levels.map(levelBlock).join('\n')}\n];\n`;
}

export const LEVELS_FILE_HEADER = HEADER.split('\n')[0];
