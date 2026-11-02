// TDX Level Editor — runs the Ledger off the page so dragging stays smooth.
// In: { id, levels, samples }. Out: { id, result } with per level and wave
// the numbers the editor draws (pressure, target, enemy counts).

import * as C from '../../js/config.js';
import { computeLedger, DEFAULT_KNOBS, DEFAULT_ASSUMPTIONS } from '../ledger/ledger.js';

self.onmessage = ({ data: { id, levels, samples } }) => {
  const ledger = computeLedger({ ...C, LEVELS: levels }, DEFAULT_KNOBS, { ...DEFAULT_ASSUMPTIONS, samples });
  const result = ledger.map(l => ({
    gap: l.gap,
    waves: l.waves.map(w => ({
      pressure: Number.isFinite(w.pressure) ? w.pressure : 9,
      target: w.target,
      viruses: w.viruses,
      counts: Object.fromEntries(Object.entries(w.byType).map(([k, v]) => [k, v.count])),
      kills: w.count,
    })),
  }));
  self.postMessage({ id, result });
};
