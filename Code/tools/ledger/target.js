// TDX Ledger — the target difficulty curve.
// Pressure per wave we're aiming for. 1.0 = the break point (leaks above).
// Each level's start and end live in js/levels.js (design.target), set in the
// Level Editor; the game never reads them.
//
// Shape per level: open at `start`, climb in a straight line to `end` on the
// final wave, with a breather of DIP on the wave after the middle one.

export const DIP = 0.1;
export const DEFAULT_TARGET = { start: 0.5, end: 0.9 };   // a level with no design.target

export function targetCurve(target = DEFAULT_TARGET, waveCount, dip = DIP) {
  const t = target ?? DEFAULT_TARGET;
  const mid = Math.floor((waveCount - 1) / 2);
  return Array.from({ length: waveCount }, (_, i) => {
    const v = waveCount > 1 ? t.start + (t.end - t.start) * (i / (waveCount - 1)) : t.end;
    return i === mid + 1 && i < waveCount - 1 ? v - dip : v;
  });
}
