// TDX — pointy-top hex grid, axial coordinates (q, r).

import { LEVELS } from './config.js';

export const HEX_DIRS = [
  [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
];

export const keyOf = (q, r) => `${q},${r}`;

export class Cell {
  constructor(q, r) {
    this.q = q;
    this.r = r;
    this.key = keyOf(q, r);
    this.x = 0; // pixel centre, set by layout()
    this.y = 0;
    this.blocker = false;
    this.tower = null;   // Tower instance or null
    this.spawn = false;
    this.lockout = false; // enemy-owned: passable for enemies, unbuildable for the player
    this.exit = false;   // feeds the base
  }
  // occupied blocks BOTH movement and building; lockout only blocks building
  get occupied() { return this.blocker || this.tower !== null; }
}

export class HexGrid {
  // gridDef: { rowWidths, spawnCells } — per level (LEVELS[i].grid)
  constructor(gridDef = LEVELS[0].grid) {
    this.def = gridDef;
    this.cells = new Map();
    this.spawns = [];
    this.exits = [];
    this.size = 24; // px, set by layout()
    this.baseX = 0;
    this.baseY = 0;
    this.build();
  }

  build() {
    const widths = this.def.rowWidths;
    for (let r = 0; r < widths.length; r++) {
      const count = widths[r];
      // centre the row: pixel x is proportional to q + r/2
      const qStart = Math.round(-(count - 1) / 2 - r / 2);
      for (let i = 0; i < count; i++) {
        const cell = new Cell(qStart + i, r);
        this.cells.set(cell.key, cell);
      }
    }
    // spawn zones: centred on top row
    const topRow = [...this.cells.values()].filter(c => c.r === 0)
      .sort((a, b) => a.q - b.q);
    const mid = Math.floor(topRow.length / 2);
    const half = Math.floor(this.def.spawnCells / 2);
    for (let i = 0; i < this.def.spawnCells; i++) {
      const c = topRow[mid - half + i];
      if (c) { c.spawn = true; this.spawns.push(c); }
    }
    // exits: entire bottom row
    const lastR = widths.length - 1;
    this.exits = [...this.cells.values()].filter(c => c.r === lastR);
    this.exits.forEach(c => { c.exit = true; });
  }

  get(q, r) { return this.cells.get(keyOf(q, r)); }

  neighbors(cell) {
    const out = [];
    for (const [dq, dr] of HEX_DIRS) {
      const n = this.get(cell.q + dq, cell.r + dr);
      if (n) out.push(n);
    }
    return out;
  }

  // Fit the grid into a w×h pixel viewport; returns hex size used.
  layout(w, h) {
    const widths = this.def.rowWidths;
    const rows = widths.length;
    const maxW = Math.max(...widths);
    // pointy-top: cell width = sqrt(3)*size, row step = 1.5*size
    const padX = 10, padTop = 14, padBase = 96; // room for the base art below
    const sizeW = (w - padX * 2) / (Math.sqrt(3) * (maxW + 0.5));
    const sizeH = (h - padTop - padBase) / (1.5 * (rows - 1) + 2);
    this.size = Math.min(sizeW, sizeH);
    const gridPixelW = Math.sqrt(3) * this.size * (maxW + 0.5);
    const ox = w / 2;
    // On tall screens the width constraint wins and dead space collects at the
    // bottom. Push the whole play space down by up to ~2 hex heights (3×size)
    // of whatever room is spare, keeping the base inside the viewport.
    const contentBottom = padTop + this.size + 1.5 * this.size * (rows - 1) + this.size * 2.1;
    const spare = h - contentBottom - 12;
    const shiftY = Math.min(Math.max(spare, 0), this.size * 3);
    const oy = padTop + this.size + shiftY;
    for (const cell of this.cells.values()) {
      cell.x = ox + Math.sqrt(3) * this.size * (cell.q + cell.r / 2);
      cell.y = oy + 1.5 * this.size * cell.r;
    }
    // base sits below the bottom row, centred
    const lastR = rows - 1;
    const bottom = this.exits.reduce((s, c) => s + c.x, 0) / this.exits.length;
    this.baseX = bottom;
    this.baseY = oy + 1.5 * this.size * lastR + this.size * 2.1;
    this.baseR = this.size * 1.7;
    void gridPixelW;
    return this.size;
  }

  cellAt(x, y) {
    // nearest-centre lookup is robust and cheap at this grid size
    let best = null, bestD = Infinity;
    for (const cell of this.cells.values()) {
      const d = (cell.x - x) ** 2 + (cell.y - y) ** 2;
      if (d < bestD) { bestD = d; best = cell; }
    }
    if (best && bestD <= this.size * this.size) return best;
    return null;
  }

  cellDist(a, b) {
    // axial hex distance
    const dq = a.q - b.q, dr = a.r - b.r;
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
  }

  pxDist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}
