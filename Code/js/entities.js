// TDX — towers, enemies, projectiles and the weapon system.

import { WEAPONS, TOWERS, ENEMIES, PLAYER, UPGRADE, BUILD_TIME } from './config.js';
import { smoothPath, pointAt } from './path.js';

let nextId = 1;

// cell-to-pixel scale: distance between adjacent hex centres
export const cellPx = (grid) => Math.sqrt(3) * grid.size;

// ---------------------------------------------------------------------------
// Tower
// ---------------------------------------------------------------------------
export class Tower {
  constructor(typeKey, cell) {
    this.id = nextId++;
    this.type = typeKey;
    this.def = TOWERS[typeKey];
    this.cell = cell;
    this.x = cell.x;
    this.y = cell.y;
    this.health = this.def.health;
    this.maxHealth = this.def.health;
    this.alive = true;
    this.aim = -Math.PI / 2;
    // upgrade state (Retention Module 1): built at Tier 1
    this.tier = 1;
    this.spent = this.def.cost;          // total Tokens invested (base + upgrades)
    // new towers construct on the same clock-timer as upgrades (offline until done)
    this.upgrading = { remaining: BUILD_TIME, total: BUILD_TIME, toTier: 1 };
    // weapon/aura are per-tower instances so tiers can modify them
    this.weapon = this.def.weapon ? { ...WEAPONS[this.def.weapon] } : null;
    this.aura = this.def.aura ? { ...this.def.aura } : null;
    this.cooldown = 0;
    this.clip = this.weapon ? this.weapon.clipSize : 0;
    this.reloading = 0;
    this.burstLeft = 0;
    this.burstTimer = 0;
    this.flash = 0;
  }

  get sellValue() { return Math.floor(this.spent * PLAYER.sellRefund); }

  // Tier 1 = base stat, TOWERS[x].tier4 = Tier 4 stat, linear in between.
  tierStat(base, key, tier) {
    const t4 = this.def.tier4?.[key];
    if (t4 === undefined) return base;
    return base + (t4 - base) * (tier - 1) / (UPGRADE.maxTier - 1);
  }

  // Token cost of the NEXT tier, or null at max tier.
  get upgradeCost() {
    if (this.tier >= UPGRADE.maxTier) return null;
    return this.def.cost * UPGRADE.costMult[this.tier - 1];
  }

  beginUpgrade() {
    this.upgrading = { remaining: UPGRADE.applyTime, total: UPGRADE.applyTime, toTier: this.tier + 1 };
  }

  applyTier(tier) {
    const base = TOWERS[this.type];
    const healthFrac = this.health / this.maxHealth;
    this.maxHealth = Math.round(this.tierStat(base.health, 'health', tier));
    this.health = Math.round(this.maxHealth * healthFrac);
    if (this.weapon) {
      const w = WEAPONS[base.weapon];
      this.weapon.damage = this.tierStat(w.damage, 'damage', tier);
    }
    if (this.aura && this.def.tier4?.slowFactor !== undefined) {
      this.aura.factor = this.tierStat(base.aura.factor, 'slowFactor', tier);
    }
    this.tier = tier;
  }

  damage(amount) {
    this.health -= amount;
    if (this.health <= 0) this.alive = false;
  }

  update(dt, enemies, projectiles, grid) {
    this.flash = Math.max(0, this.flash - dt * 4);

    // applying an upgrade: tower is offline for UPGRADE.applyTime seconds
    if (this.upgrading) {
      this.upgrading.remaining -= dt;
      if (this.upgrading.remaining <= 0) {
        this.applyTier(this.upgrading.toTier);
        this.upgrading = null;
        this.justUpgraded = true; // lets the UI refresh an open popup
        this.flash = 1;
      }
      return;
    }

    if (!this.weapon) return;
    const px = cellPx(grid);
    const rangePx = this.weapon.range * px;

    // continuous tracking — the tower visibly turns to face its target
    // (radial weapons fire in all directions and don't aim)
    if (!this.weapon.radial) {
      const tracked = this.pickTarget(enemies, rangePx);
      if (tracked) this.aim = Math.atan2(tracked.y - this.y, tracked.x - this.x);
    }

    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) this.clip = this.weapon.clipSize;
      return;
    }
    this.cooldown -= dt;

    // mid-burst?
    if (this.burstLeft > 0) {
      this.burstTimer -= dt;
      if (this.burstTimer <= 0) {
        const target = this.pickTarget(enemies, rangePx);
        if (target) this.fire(target, projectiles, grid);
        this.burstLeft--;
        this.burstTimer = this.weapon.burstInterval;
        // the clip's last burst finishes before the reload starts
        if (this.burstLeft === 0 && this.weapon.clipSize > 0 && this.clip <= 0) {
          this.reloading = this.weapon.reloadTime;
        }
      }
      return;
    }

    if (this.cooldown > 0) return;
    const target = this.pickTarget(enemies, rangePx);
    if (!target) return;

    this.fire(target, projectiles, grid);
    this.cooldown = 1 / this.weapon.fireRate;
    if (this.weapon.burstCount > 1) {
      this.burstLeft = this.weapon.burstCount - 1;
      this.burstTimer = this.weapon.burstInterval;
    }
    if (this.weapon.clipSize > 0) {
      this.clip--;   // one clip unit per trigger pull (a whole burst)
      if (this.clip <= 0 && this.burstLeft === 0) this.reloading = this.weapon.reloadTime;
    }
  }

  // "First" targeting: the enemy closest to the base along its path.
  pickTarget(enemies, rangePx) {
    let best = null, bestRemain = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d > rangePx) continue;
      const remain = e.path.total - e.dist;
      if (remain < bestRemain) { bestRemain = remain; best = e; }
    }
    return best;
  }

  fire(target, projectiles, grid) {
    const w = this.weapon;
    if (w.radial) {
      // full 360° ring of pellets, evenly spaced with a little jitter
      this.flash = 1;
      for (let i = 0; i < w.pelletCount; i++) {
        const angle = (Math.PI * 2 * i) / w.pelletCount
          + (Math.random() - 0.5) * 2 * w.spread;
        projectiles.push(new Projectile(this, null, angle, grid));
      }
      return;
    }
    if (w.cone) {
      // shotgun: pellets fanned evenly across the cone, centred on the target
      const centre = Math.atan2(target.y - this.y, target.x - this.x);
      this.aim = centre;
      this.flash = 1;
      for (let i = 0; i < w.pelletCount; i++) {
        const angle = centre - w.cone / 2 + (w.cone * (i + 0.5)) / w.pelletCount
          + (Math.random() - 0.5) * 2 * w.spread;
        projectiles.push(new Projectile(this, null, angle, grid));
      }
      return;
    }
    const angle = Math.atan2(target.y - this.y, target.x - this.x)
      + (Math.random() - 0.5) * 2 * w.spread;
    this.aim = angle;
    this.flash = 1;
    projectiles.push(new Projectile(this, target, angle, grid));
  }
}

// ---------------------------------------------------------------------------
// Projectile — homing for single-target weapons, point-detonation for splash.
// ---------------------------------------------------------------------------
export class Projectile {
  constructor(tower, target, angle, grid) {
    const w = tower.weapon;
    this.weapon = w;
    this.sourceType = tower.type;
    this.x = tower.x;
    this.y = tower.y;
    this.speed = w.projectileSpeed * cellPx(grid);
    this.angle = angle;
    this.target = target;
    this.splashPx = w.splashRadius * cellPx(grid);
    // splash weapons aim at a point (grenade lobs at where the target is now)
    this.aimPoint = w.splashRadius > 0 ? { x: target.x, y: target.y } : null;
    // radial and shotgun pellets fly straight and die at the weapon's range edge
    this.pellet = !!(w.radial || w.cone);
    if (this.pellet) this.maxDist = w.range * cellPx(grid) * 1.1;
    this.traveled = 0;
    this.alive = true;
    this.age = 0;
  }

  update(dt, enemies, effects) {
    this.age += dt;
    if (this.age > 4) { this.alive = false; return; }
    const step = this.speed * dt;

    if (this.pellet) {
      const adv = Math.min(step, this.maxDist - this.traveled); // stop at range edge
      this.x += Math.cos(this.angle) * adv;
      this.y += Math.sin(this.angle) * adv;
      this.traveled += adv;
      // hit the nearest enemy the pellet is now touching
      let hit = null, hitD = Infinity;
      for (const e of enemies) {
        if (!e.alive) continue;
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d <= e.radius + step * 0.5 && d < hitD) { hitD = d; hit = e; }
      }
      if (hit) {
        hit.damage(this.weapon.damage);
        effects.push({ kind: 'hit', x: hit.x, y: hit.y, color: this.weapon.projectile.color, t: 0, dur: 0.15 });
        this.alive = false;
        return;
      }
      if (this.traveled >= this.maxDist) this.alive = false;
      return;
    }

    if (this.aimPoint) {
      const dx = this.aimPoint.x - this.x, dy = this.aimPoint.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d <= step) { this.detonate(enemies, effects); return; }
      this.angle = Math.atan2(dy, dx);
      this.x += (dx / d) * step;
      this.y += (dy / d) * step;
      return;
    }

    // homing
    const t = this.target;
    if (!t || !t.alive) { this.alive = false; return; }
    const dx = t.x - this.x, dy = t.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d <= step + t.radius) {
      t.damage(this.weapon.damage);
      effects.push({ kind: 'hit', x: t.x, y: t.y, color: this.weapon.projectile.color, t: 0, dur: 0.15 });
      this.alive = false;
      return;
    }
    this.angle = Math.atan2(dy, dx);
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
  }

  detonate(enemies, effects) {
    this.alive = false;
    effects.push({ kind: 'blast', x: this.aimPoint.x, y: this.aimPoint.y, r: this.splashPx, color: this.weapon.projectile.color, t: 0, dur: 0.3 });
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - this.aimPoint.x, e.y - this.aimPoint.y);
      if (d <= this.splashPx + e.radius) e.damage(this.weapon.damage);
    }
  }
}

// ---------------------------------------------------------------------------
// Enemy
// ---------------------------------------------------------------------------
export class Enemy {
  constructor(typeKey, spawnCell, field, grid, delta) {
    this.id = nextId++;
    this.type = typeKey;
    this.def = ENEMIES[typeKey];
    this.maxHealth = Math.round(this.def.health * delta.health);
    this.health = this.maxHealth;
    this.damageMult = delta.damage;
    this.x = spawnCell.x + (Math.random() - 0.5) * grid.size * 0.6;
    this.y = spawnCell.y + (Math.random() - 0.5) * grid.size * 0.4;
    this.alive = true;
    this.reachedBase = false;
    this.slow = 1;         // recomputed each frame from Limiter auras
    this.angle = Math.PI / 2;
    this.radius = this.def.size * grid.size;
    this.attackTimer = 0;
    this.attackTarget = null;
    this.hitFlash = 0;
    this.buildPath(field, grid);
  }

  buildPath(field, grid) {
    this.field = field;
    const cell = this.currentCell(grid);
    const start = { x: this.x, y: this.y };
    this.detourAt = Infinity;   // arc length where the detour cell is passed
    let wps;
    if (this.def.hunter && this.attackTarget?.alive && cell) {
      // Bug: walk open cells (never over blockers/towers) to beside its target
      const leg = this.huntLeg(cell, field, this.attackTarget);
      wps = leg ? [start, ...leg.map(c => ({ x: c.x, y: c.y }))] : [start, start];
    } else if (cell && field.reachable(cell)) {
      const leg = this.def.detour && !this.detourDone ? this.detourLeg(cell, field) : null;
      if (leg) {
        // start → detour cell (shortest open route) → optimal path to base
        const tail = field.waypointsFrom(leg[leg.length - 1]).slice(1);
        wps = [start, ...leg.map(c => ({ x: c.x, y: c.y })), ...tail];
        this.detourAt = leg.length;   // waypoint index of the detour cell
      } else {
        wps = [start, ...field.waypointsFrom(cell)];
      }
    } else {
      wps = [start, { x: grid.baseX, y: grid.baseY }];
    }
    this.path = smoothPath(wps);
    // smoothPath emits 8 samples per waypoint segment — map index → arc length
    if (this.detourAt !== Infinity) this.detourAt = this.path.lens[this.detourAt * 8] ?? Infinity;
    this.dist = 0;
  }

  // Bug: open-cell route from `cell` to any free cell touching the tower.
  huntLeg(cell, field, tower) {
    const goals = new Set();
    for (const n of field.grid.neighbors(tower.cell)) if (!n.occupied) goals.add(n.key);
    return goals.size ? field.routeToAny(cell, goals) : null;
  }

  // Bug: choose a random tower it can actually walk to (null if none).
  pickHuntTarget(towers, grid) {
    const cell = this.currentCell(grid);
    const pool = towers.filter(t => t.alive);
    while (pool.length && cell) {
      const t = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      if (this.huntLeg(cell, this.field, t)) return t;
    }
    return null;
  }

  // Stinger: pick (or keep) a detour cell off the optimal route, partway to the
  // exit, and return the open cell route to it. null = no detour available.
  detourLeg(cell, field) {
    const grid = field.grid;
    const keep = this.detourCell;
    if (keep && !keep.occupied && field.reachable(keep)) {
      const leg = field.routeBetween(cell, keep);
      if (leg) return leg;
    }
    // A genuine detour: going via the cell must cost at least
    // detour.extraSteps more than the best route (a hex board has many
    // equally-short routes, so merely "off the BFS path" isn't enough).
    const d0 = field.dist.get(cell.key);
    const fromHere = field.distancesFrom(cell);
    const lo = d0 * this.def.detour.min, hi = d0 * this.def.detour.max;
    const extra = new Map();   // cell → steps added by routing through it
    for (const c of grid.cells.values()) {
      const d = field.dist.get(c.key);
      if (d === undefined || d < lo || d > hi || c.occupied || !fromHere.has(c.key)) continue;
      extra.set(c, fromHere.get(c.key) + d - d0);
    }
    // tight boards may not offer extraSteps — settle for the longest available
    const need = Math.min(this.def.detour.extraSteps, Math.max(0, ...extra.values()));
    const candidates = need > 0 ? [...extra].filter(([, x]) => x >= need).map(([c]) => c) : [];
    if (candidates.length === 0) { this.detourDone = true; return null; }
    this.detourCell = candidates[Math.floor(Math.random() * candidates.length)];
    return field.routeBetween(cell, this.detourCell);
  }

  currentCell(grid) {
    let best = null, bestD = Infinity;
    for (const cell of grid.cells.values()) {
      if (cell.occupied) continue;
      const d = (cell.x - this.x) ** 2 + (cell.y - this.y) ** 2;
      if (d < bestD) { bestD = d; best = cell; }
    }
    return best;
  }

  damage(amount) {
    if (!this.alive) return;
    this.health -= amount;
    this.hitFlash = 1;
    if (this.health <= 0) this.alive = false;
  }

  // Fly straight at attackTarget; once adjacent, hold position and drain it.
  closeInAndDrain(dt, px) {
    const t = this.attackTarget;
    const d = Math.hypot(t.x - this.x, t.y - this.y);
    this.angle = Math.atan2(t.y - this.y, t.x - this.x);
    if (d <= px * 1.05) { // adjacent-cell distance: apply damage over time
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        t.damage(this.def.attack.damage * this.damageMult);
        this.attackTimer = this.def.attack.reload;
      }
      return;
    }
    const step = this.def.speed * this.slow * px * dt;
    this.x += Math.cos(this.angle) * step;
    this.y += Math.sin(this.angle) * step;
  }

  update(dt, grid, towers) {
    this.hitFlash = Math.max(0, this.hitFlash - dt * 6);
    const px = cellPx(grid);

    // Bug-class behaviour: hunt a random tower anywhere on the board.
    // With no towers left, fall back to walking the path to the base.
    // Walks open cells only (like any enemy) — never across blockers or towers.
    if (this.def.hunter) {
      if (this.attackTarget && !this.attackTarget.alive) this.attackTarget = null;
      // (while walking to base, re-scan for new towers every 0.5s)
      this.huntScan = (this.huntScan ?? 0) - dt;
      if (!this.attackTarget && (!this.pathing || this.huntScan <= 0)) {
        this.huntScan = 0.5;
        this.attackTarget = this.pickHuntTarget(towers, grid);
        if (this.attackTarget || !this.pathing) {
          this.pathing = !this.attackTarget;    // no reachable tower → head for base
          this.buildPath(this.field, grid);
        }
      }
      if (this.attackTarget) {
        const t = this.attackTarget;
        if (Math.hypot(t.x - this.x, t.y - this.y) <= px * 1.05) {
          this.closeInAndDrain(dt, px);        // adjacent: hold and drain
          return;
        }
        this.dist += this.def.speed * this.slow * px * dt;
        const p = pointAt(this.path, this.dist);
        this.x = p.x; this.y = p.y; this.angle = p.angle;
        // route ended without contact (board changed) → re-plan next frame
        if (this.dist >= this.path.total) this.attackTarget = null;
        return;
      }
    }

    // Virus-class behaviour: latch onto a nearby tower and drain it.
    else if (this.def.attack) {
      if (this.attackTarget && !this.attackTarget.alive) this.attackTarget = null;
      if (!this.attackTarget) {
        // Prefer a tower no other Virus is draining, so two don't stack into
        // what looks like one (M3 E14). Falls back to a taken tower if that's all in range.
        let free = null, freeD = this.def.attack.scanRange * px;
        let any = null, anyD = freeD;
        for (const t of towers) {
          if (!t.alive) continue;
          const d = Math.hypot(t.x - this.x, t.y - this.y);
          if (d < anyD) { anyD = d; any = t; }
          const taken = t.drainer && t.drainer !== this && t.drainer.alive && t.drainer.attackTarget === t;
          if (!taken && d < freeD) { freeD = d; free = t; }
        }
        this.attackTarget = free ?? any;
        if (free) free.drainer = this;
      }
      if (this.attackTarget) { this.closeInAndDrain(dt, px); return; }
    }

    // normal path-following
    this.dist += this.def.speed * this.slow * px * dt;
    if (this.dist >= this.detourAt) this.detourDone = true;  // Stinger detour passed
    const p = pointAt(this.path, this.dist);
    this.x = p.x;
    this.y = p.y;
    this.angle = p.angle;
    if (this.dist >= this.path.total) {
      this.reachedBase = true;
      this.alive = false;
    }
  }
}
