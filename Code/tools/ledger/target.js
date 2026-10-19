// TDX Ledger — the target difficulty curve (Jogo's to redraw).
// Pressure per wave we're aiming for. 1.0 = the break point (leaks above).
// Edit these numbers and reload the ledger; the game never reads this file.
//
// Shape per level: open at `start`, climb in a straight line to `end` on the
// final wave, with a breather of `dip` on the wave after the middle one.

export const TARGET = {
  levels: [
    { start: 0.5, end: 1.0 },   // L1 Shallow Breach
    { start: 0.5, end: 0.875 },  // L2 The Narrows
    { start: 0.5, end: 0.9 },    // L3 Wide Delta
    { start: 0.5, end: 0.925 },  // L4 Deep Trench
    { start: 0.5, end: 0.95 },   // L5 The Sprawl
  ],
  dip: 0.1,
};

export function targetCurve(levelIndex, waveCount, target = TARGET) {
  const t = target.levels[levelIndex] ?? target.levels[target.levels.length - 1];
  const mid = Math.floor((waveCount - 1) / 2);
  return Array.from({ length: waveCount }, (_, i) => {
    const v = waveCount > 1 ? t.start + (t.end - t.start) * (i / (waveCount - 1)) : t.end;
    return i === mid + 1 && i < waveCount - 1 ? v - target.dip : v;
  });
}
