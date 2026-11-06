// TDX — wave control, straight from the design doc:
//   TEV  Total Enemy Value   — full budget for the wave
//   EV   Enemy Value         — cost/weight of one enemy
//   MAV  Max Active Value    — cap on the EV-weight alive at once
//   RTV  Respawn Trigger Value — active weight must fall below this
//                                (after hitting MAV) before spawning resumes.
// The MAV/RTV pair creates the sub-wave rhythm: spawning halts at MAV,
// then kicks back in hard once actives drop under RTV.

import { ENEMIES, WAVE_START_DELAY, SURGE } from './config.js';
import { Enemy } from './entities.js';

// Roster pick: uniform unless the wave carries pick weights (M4 E15), e.g.
// { virus: 1.5 } = Virus 1.5× as likely as each other affordable type.
// Mirrored in tools/ledger/ledger.js.
export function pickWeighted(pool, weights, rand) {
  if (!weights) return pool[Math.floor(rand() * pool.length)];
  const w = pool.map(k => weights[k] ?? 1);
  let r = rand() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) if ((r -= w[i]) < 0) return pool[i];
  return pool[pool.length - 1];
}

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
    this.clock = 0;              // seconds since the wave started
    this.lastSpawn = {};         // enemy key → clock time of its last spawn
    // Breach Surge: wait → warn (countdown) → pour → over. See SURGE in config.
    this.surge = waveDef.surge > 0
      ? { state: 'wait', ev: waveDef.tev * waveDef.surge, timer: 0, next: 0 }
      : null;
  }

  // ENEMIES[k].spawnCooldown: minimum seconds between two spawns of that type
  // (stops Viruses arriving back to back and stacking on one tower).
  onCooldown(key) {
    const cd = ENEMIES[key].spawnCooldown;
    return cd > 0 && this.lastSpawn[key] !== undefined && this.clock - this.lastSpawn[key] < cd;
  }

  activeValue(enemies) {
    let v = 0;
    for (const e of enemies) if (e.alive) v += e.def.ev;
    return v;
  }

  // Wave is complete when the budget is spent and the field is clear.
  isComplete(enemies) {
    return this.done && (!this.surge || this.surge.state === 'over') && enemies.every(e => !e.alive);
  }

  update(dt, enemies) {
    this.clock += dt;
    if (this.surge) this.updateSurge(dt, enemies);
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
    const pool = this.def.unlocked.filter(k => ENEMIES[k].ev <= headroom && !this.onCooldown(k));
    if (pool.length === 0) {
      if (this.budgetLeft < this.cheapestEV()) this.done = true;
      this.spawnTimer = 0.3;
      return;
    }
    const key = pickWeighted(pool, this.def.weights, Math.random);
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

  updateSurge(dt, enemies) {
    const sg = this.surge;
    if (sg.state === 'wait') {
      if (this.budgetLeft <= this.def.tev * (1 - SURGE.trigger) || this.done) {
        sg.state = 'warn';
        sg.timer = SURGE.warning;
      }
    } else if (sg.state === 'warn') {
      sg.timer -= dt;
      if (sg.timer <= 0) { sg.state = 'pour'; sg.next = 0; sg.door = 0; }
    } else if (sg.state === 'pour') {
      sg.timer -= dt;
      while (sg.timer <= 0 && sg.state === 'pour') {
        const affordable = this.def.unlocked.filter(k => ENEMIES[k].ev <= sg.ev);
        if (affordable.length === 0) { sg.state = 'over'; break; }
        // spawn cooldowns still apply: no Virus stacks inside a surge (S21 playtest)
        const pool = affordable.filter(k => !this.onCooldown(k));
        if (pool.length === 0) { sg.timer += SURGE.gap; break; }
        const key = pickWeighted(pool, this.def.weights, Math.random);
        const spawns = this.grid.spawns;
        this.spawnOne(key, enemies, spawns[sg.door++ % spawns.length], false);
        sg.ev -= ENEMIES[key].ev;
        sg.timer += SURGE.gap;
      }
    }
  }

  cheapestEV() {
    return Math.min(...this.def.unlocked.map(k => ENEMIES[k].ev));
  }

  // fromBudget = false for surge spawns: they come from the surge's own pool.
  spawnOne(key, enemies, cell = null, fromBudget = true) {
    const spawns = this.grid.spawns;
    cell ??= spawns[Math.floor(Math.random() * spawns.length)];
    enemies.push(new Enemy(key, cell, this.field, this.grid, this.delta));
    this.lastSpawn[key] = this.clock;
    if (!fromBudget) return;
    this.budgetLeft -= ENEMIES[key].ev;
  }
}
