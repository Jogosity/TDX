// TDX — pathfinding: BFS flow field toward the exits, Firewall legality
// check, and Catmull-Rom smoothing so enemies move on curves, not zig-zags.

export class PathField {
  constructor(grid) {
    this.grid = grid;
    this.dist = new Map();   // cell.key -> steps to exit
    this.next = new Map();   // cell.key -> next cell toward exit
    this.recompute();
  }

  // BFS from all exit cells outward. Blocked cells are impassable.
  // extraBlocked: optional Set of cell keys treated as blocked (for checks).
  compute(extraBlocked = null) {
    const dist = new Map();
    const next = new Map();
    const queue = [];
    for (const exit of this.grid.exits) {
      if (this.isBlocked(exit, extraBlocked)) continue;
      dist.set(exit.key, 0);
      queue.push(exit);
    }
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      for (const n of this.grid.neighbors(cur)) {
        if (dist.has(n.key)) continue;
        if (this.isBlocked(n, extraBlocked)) continue;
        dist.set(n.key, dist.get(cur.key) + 1);
        next.set(n.key, cur);
        queue.push(n);
      }
    }
    return { dist, next };
  }

  isBlocked(cell, extraBlocked) {
    if (cell.occupied) return true;
    if (extraBlocked && extraBlocked.has(cell.key)) return true;
    return false;
  }

  recompute() {
    const { dist, next } = this.compute();
    this.dist = dist;
    this.next = next;
  }

  reachable(cell) { return this.dist.has(cell.key); }

  // Firewall rule: placing on `cell` is illegal if it would cut off any
  // spawn zone — or strand any cell currently holding a live enemy.
  wouldFirewall(cell, enemies) {
    const extra = new Set([cell.key]);
    const { dist } = this.compute(extra);
    for (const s of this.grid.spawns) {
      if (!dist.has(s.key)) return true;
    }
    for (const e of enemies) {
      if (!e.alive) continue;
      const c = e.currentCell(this.grid);
      if (c && c.key !== cell.key && !dist.has(c.key)) return true;
    }
    return false;
  }

  // BFS step counts from one cell to every open cell it can reach.
  distancesFrom(from) {
    const dist = new Map([[from.key, 0]]);
    const queue = [from];
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      for (const n of this.grid.neighbors(cur)) {
        if (dist.has(n.key) || this.isBlocked(n)) continue;
        dist.set(n.key, dist.get(cur.key) + 1);
        queue.push(n);
      }
    }
    return dist;
  }

  // Shortest open route between two cells (BFS over unoccupied cells).
  // Returns the cell list from `from` to `to` inclusive, or null if cut off.
  routeBetween(from, to) {
    const prev = new Map([[from.key, null]]);
    const queue = [from];
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      if (cur.key === to.key) {
        const cells = [];
        for (let c = cur; c; c = prev.get(c.key)) cells.push(c);
        return cells.reverse();
      }
      for (const n of this.grid.neighbors(cur)) {
        if (prev.has(n.key) || this.isBlocked(n)) continue;
        prev.set(n.key, cur);
        queue.push(n);
      }
    }
    return null;
  }

  // Waypoint list (cell centres) from a cell to the exit, then the base point.
  waypointsFrom(cell) {
    const pts = [];
    let cur = cell;
    let guard = 0;
    while (cur && guard++ < 500) {
      pts.push({ x: cur.x, y: cur.y });
      if (cur.exit) break;
      cur = this.next.get(cur.key) || null;
    }
    pts.push({ x: this.grid.baseX, y: this.grid.baseY });
    return pts;
  }
}

// --- Catmull-Rom smoothing -------------------------------------------------
// Turns waypoints into a dense polyline with cumulative arc length, so an
// enemy can advance by (speed * dt) pixels along a smooth curve.

export function smoothPath(waypoints, samplesPerSeg = 8) {
  if (waypoints.length < 2) return { pts: waypoints.slice(), lens: [0], total: 0 };
  const P = waypoints;
  const pts = [P[0]];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[Math.min(P.length - 1, i + 2)];
    for (let s = 1; s <= samplesPerSeg; s++) {
      const t = s / samplesPerSeg;
      pts.push(catmullRom(p0, p1, p2, p3, t));
    }
  }
  const lens = [0];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    lens.push(total);
  }
  return { pts, lens, total };
}

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

// Position (and heading) at arc-length d along a smoothed path.
export function pointAt(path, d) {
  const { pts, lens, total } = path;
  if (d <= 0) return { x: pts[0].x, y: pts[0].y, angle: angleOf(pts, 0) };
  if (d >= total) {
    const n = pts.length - 1;
    return { x: pts[n].x, y: pts[n].y, angle: angleOf(pts, n - 1) };
  }
  // binary search the segment
  let lo = 0, hi = lens.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (lens[mid] <= d) lo = mid; else hi = mid;
  }
  const segLen = lens[hi] - lens[lo] || 1;
  const t = (d - lens[lo]) / segLen;
  return {
    x: pts[lo].x + (pts[hi].x - pts[lo].x) * t,
    y: pts[lo].y + (pts[hi].y - pts[lo].y) * t,
    angle: Math.atan2(pts[hi].y - pts[lo].y, pts[hi].x - pts[lo].x),
  };
}

function angleOf(pts, i) {
  const a = pts[i], b = pts[Math.min(pts.length - 1, i + 1)];
  return Math.atan2(b.y - a.y, b.x - a.x);
}
