// TDX — wave control, straight from the design doc:
//   TEV  Total Enemy Value   — full budget for the wave
//   EV   Enemy Value         — cost/weight of one enemy
//   MAV  Max Active Value    — cap on the EV-weight alive at once
//   RTV  Respawn Trigger Value — active weight must fall below this
//                                (after hitting MAV) before spawning resumes.
// The MAV/RTV pair creates the sub-wave rhythm: spawning halts at MAV,
// then kicks back in hard once actives drop under RTV.

import { ENEMIES, WAVE_START_DELAY } from './config.js';
import { Enemy } from './entities.js';

export class WaveController {
  constructor(waveDef, grid, field, delta) {
    this.def = waveDef;
    this.grid = grid;
    this.field = field;
    this.delta = delta;
    this.budgetLeft = waveDef.tev;
    this.rtvArmed = false;       // RTV check inactive until MAV is first hit
    // grace period: lets players read the map (and any CRASH aftermath)
    this.spawnTimer = WAVE_START_DELAY;
    this.pendingPack = [];       // queued pack members (Slice groups)
    this.done = false;           // budget fully spent
  }

  activeValue(enemies) {
    let v = 0;
    for (const e of enemies) if (e.alive) v += e.def.ev;
    return v;
  }

  // Wave is complete when the budget is spent and the field is clear.
  isComplete(enemies) {
    return this.done && enemies.every(e => !e.alive);
  }

  update(dt, enemies) {
    if (this.done) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;

    const active = this.activeValue(enemies);

    // MAV / RTV gate
    if (this.rtvArmed) {
      if (active > this.def.rtv) return;   // wait for the field to thin out
      this.rtvArmed = false;               // resume: refill toward MAV
    }
    if (active >= this.def.mav) {
      this.rtvArmed = true;
      return;
    }

    // flush queued pack members first (still respecting the MAV cap)
    if (this.pendingPack.length > 0) {
      if (active + ENEMIES[this.pendingPack[0]].ev > this.def.mav) {
        this.rtvArmed = true;
        return;
      }
      this.spawnOne(this.pendingPack.shift(), enemies);
      this.spawnTimer = 0.25;
      return;
    }

    // pick an affordable enemy type: within remaining TEV and MAV headroom
    const headroom = Math.min(this.budgetLeft, this.def.mav - active);
    const pool = this.def.unlocked.filter(k => ENEMIES[k].ev <= headroom);
    if (pool.length === 0) {
      if (this.budgetLeft < this.cheapestEV()) this.done = true;
      this.spawnTimer = 0.3;
      return;
    }
    const key = pool[Math.floor(Math.random() * pool.length)];
    const def = ENEMIES[key];

    if (def.pack) {
      const n = def.pack.min + Math.floor(Math.random() * (def.pack.max - def.pack.min + 1));
      const affordable = Math.min(n, Math.floor(this.budgetLeft / def.ev));
      for (let i = 1; i < affordable; i++) this.pendingPack.push(key);
      if (affordable > 0) this.spawnOne(key, enemies);
    } else {
      this.spawnOne(key, enemies);
    }
    this.spawnTimer = this.def.spawnInterval;
    if (this.budgetLeft < this.cheapestEV()) this.done = true;
  }

  cheapestEV() {
    return Math.min(...this.def.unlocked.map(k => ENEMIES[k].ev));
  }

  spawnOne(key, enemies) {
    const spawns = this.grid.spawns;
    const cell = spawns[Math.floor(Math.random() * spawns.length)];
    enemies.push(new Enemy(key, cell, this.field, this.grid, this.delta));
    this.budgetLeft -= ENEMIES[key].ev;
  }
}
