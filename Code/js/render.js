// TDX — canvas renderer. Neon synthwave: dark blue field, glowing shapes.
// All art is procedural per the design doc (no bitmaps).

import { TOWERS, WEAPONS, GRID, UPGRADE } from './config.js';
import { cellPx } from './entities.js';

const COL = {
  bg: '#050820',
  cellFill: '#0c1434',
  cellLine: '#1d2c5c',
  spawnFill: '#7a1230',
  spawnLine: '#c42a55',
  blockerFill: '#152047',
  blockerLine: '#3a4f96',
  lockoutFill: '#38103a',   // enemy-held: magenta family, shared across themes
  lockoutLine: '#c44ae0',
  base: '#ffb020',
  baseHot: '#ffd569',
  illegal: '#ff3860',
  ok: '#39ff6a',
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 0;
    this.h = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  draw(state) {
    const { grid } = state;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    // CRASH screenshake: jitter the whole world while the envelope decays
    const shaking = state.shake > 0;
    if (shaking) {
      ctx.save();
      ctx.translate((Math.random() - 0.5) * 16 * state.shake,
                    (Math.random() - 0.5) * 16 * state.shake);
    }

    this.drawCells(grid, state);
    this.drawBase(grid, state);
    if (state.placing) this.drawPlacementPreview(state);
    this.drawAuras(state);
    for (const t of state.towers) this.drawTower(ctx, t, grid, state.time);
    for (const e of state.enemies) if (e.alive) this.drawEnemy(ctx, e, grid);
    for (const p of state.projectiles) this.drawProjectile(ctx, p);
    this.drawDrops(state);
    this.drawEffects(state);
    if (state.selectedTower) this.drawRangeRing(state.selectedTower, grid);

    if (shaking) ctx.restore();
    if (state.crashFx) this.drawCrashFx(state.crashFx);
  }

  // CRASH caption + colour flash: chromatic-offset glitch text mid-screen
  drawCrashFx(fx) {
    const ctx = this.ctx;
    const k = fx.t / fx.dur;
    ctx.save();
    // colour flash in the first moments
    if (k < 0.22) {
      ctx.globalAlpha = (1 - k / 0.22) * 0.30;
      ctx.fillStyle = Math.random() < 0.5 ? '#ff3860' : '#4ef3ff';
      ctx.fillRect(0, 0, this.w, this.h);
    }
    const size = Math.min(this.w * 0.22, 92);
    ctx.font = `800 ${size}px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = this.w / 2;
    const cy = this.h * 0.42 + (Math.random() - 0.5) * 6 * (1 - k);
    const off = 3 + 5 * (1 - k) * Math.random();
    const fade = k > 0.75 ? (1 - k) / 0.25 : 1;
    const flicker = Math.random() < 0.12 ? 0.35 : 1;
    ctx.globalAlpha = 0.85 * fade * flicker;
    ctx.fillStyle = '#ff3860';
    ctx.fillText('CRASH', cx - off, cy);
    ctx.fillStyle = '#4ef3ff';
    ctx.fillText('CRASH', cx + off, cy);
    ctx.globalAlpha = fade * flicker;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ff3860';
    ctx.shadowBlur = 24;
    ctx.fillText('CRASH', cx, cy);
    ctx.restore();
  }

  hexPath(ctx, x, y, size) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 90); // pointy-top
      const px = x + size * Math.cos(a);
      const py = y + size * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  drawCells(grid, state) {
    const ctx = this.ctx;
    // per-level colour theme (subtle cool variants) merged over the defaults
    const col = { ...COL, ...(state.level?.theme || {}) };
    const s = grid.size * GRID.hexMargin;
    for (const cell of grid.cells.values()) {
      if (cell.spawn) {
        ctx.fillStyle = col.spawnFill;
        ctx.strokeStyle = col.spawnLine;
        ctx.shadowColor = col.spawnLine;
        ctx.shadowBlur = 12;
      } else if (cell.blocker) {
        ctx.fillStyle = col.blockerFill;
        ctx.strokeStyle = col.blockerLine;
        ctx.shadowColor = col.blockerLine;
        ctx.shadowBlur = 8;
      } else if (cell.lockout) {
        ctx.fillStyle = col.lockoutFill;
        ctx.strokeStyle = col.lockoutLine;
        ctx.shadowColor = col.lockoutLine;
        ctx.shadowBlur = 8;
      } else {
        ctx.fillStyle = col.cellFill;
        ctx.strokeStyle = col.cellLine;
        ctx.shadowBlur = 0;
      }
      this.hexPath(ctx, cell.x, cell.y, s);
      ctx.fill();
      ctx.lineWidth = 1;
      if (cell.lockout) ctx.setLineDash([4, 4]);   // dashed = passable, unbuildable
      ctx.stroke();
      ctx.setLineDash([]);
      if (cell.blocker) this.drawBlockerHatch(ctx, cell, s);
      if (cell.lockout) this.drawLockoutMark(ctx, cell, s, col);
    }
    ctx.shadowBlur = 0;
  }

  // small enemy-glyph dot marking a Lockout cell
  drawLockoutMark(ctx, cell, s, col) {
    ctx.save();
    ctx.fillStyle = col.lockoutLine;
    ctx.globalAlpha = 0.8;
    ctx.shadowColor = col.lockoutLine;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(cell.x, cell.y, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawBlockerHatch(ctx, cell, s) {
    ctx.save();
    this.hexPath(ctx, cell.x, cell.y, s * 0.98);
    ctx.clip();
    ctx.strokeStyle = COL.blockerLine;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) {
      ctx.moveTo(cell.x - s + i * s * 0.45, cell.y - s);
      ctx.lineTo(cell.x - s + i * s * 0.45 + s, cell.y + s);
    }
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawBase(grid, state) {
    const ctx = this.ctx;
    const hurt = state.baseFlash > 0;
    ctx.save();
    ctx.shadowColor = hurt ? COL.illegal : COL.base;
    ctx.shadowBlur = 26;
    const g = ctx.createLinearGradient(0, grid.baseY - grid.baseR, 0, grid.baseY);
    g.addColorStop(0, hurt ? '#ff5a5a' : COL.baseHot);
    g.addColorStop(1, hurt ? '#c22030' : '#ff9210');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(grid.baseX, grid.baseY, grid.baseR, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawAuras(state) {
    const ctx = this.ctx;
    const px = cellPx(state.grid);
    for (const t of state.towers) {
      if (!t.aura || t.upgrading) continue;
      ctx.save();
      ctx.globalAlpha = 0.10 + 0.04 * Math.sin(state.time * 3);
      ctx.fillStyle = t.def.glow;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.aura.range * px, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawRangeRing(tower, grid) {
    if (!tower.weapon && !tower.aura) return;
    const px = cellPx(grid);
    const range = tower.weapon ? tower.weapon.range : tower.aura.range;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(78, 243, 255, 0.5)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, range * px, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawPlacementPreview(state) {
    const { grid, placing } = state;
    const cell = placing.cell;
    if (!cell) return;
    const ctx = this.ctx;
    const ok = placing.legal;
    ctx.save();
    ctx.shadowColor = ok ? COL.ok : COL.illegal;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = ok ? COL.ok : COL.illegal;
    ctx.lineWidth = 2;
    this.hexPath(ctx, cell.x, cell.y, grid.size * 0.92);
    ctx.stroke();
    ctx.restore();
    if (ok) {
      const def = TOWERS[placing.type];
      const px = cellPx(grid);
      const range = def.weapon
        ? WEAPONS[def.weapon].range
        : (def.aura ? def.aura.range : 0);
      if (range) {
        ctx.save();
        ctx.strokeStyle = 'rgba(57, 255, 106, 0.35)';
        ctx.setLineDash([5, 7]);
        ctx.beginPath();
        ctx.arc(cell.x, cell.y, range * px, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // --- towers ---------------------------------------------------------------
  drawTower(ctx, t, grid, time) {
    const s = grid.size;
    if (t.attackedFor > 0) {              // under attack (M4): pulsing red cell
      ctx.save();
      ctx.globalAlpha = 0.45 + 0.25 * Math.sin(time * 10);
      ctx.fillStyle = '#c4123f';
      ctx.shadowColor = '#ff0a54';
      ctx.shadowBlur = 16;
      this.hexPath(ctx, t.x, t.y, s * 0.94);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(t.x, t.y);
    if (t.weapon) {
      if (t.weapon.radial) ctx.rotate(time * 0.6);        // slow idle spin
      else ctx.rotate(t.aim + Math.PI / 2);               // face the target
    }
    if (t.upgrading) ctx.globalAlpha = 0.45;              // offline while applying
    ctx.shadowColor = t.def.glow;
    ctx.shadowBlur = 14 + t.flash * 10;
    drawTowerShape(ctx, t.type, s * 0.62, t.def);
    ctx.restore();
    if (t.health < t.maxHealth) {
      this.drawHealthBar(ctx, t.x, t.y - s * 0.95, s * 1.2, t.health / t.maxHealth, '#4ef3ff');
    }
    if (t.tier > 1) this.drawTierPips(ctx, t, s);
    if (t.upgrading) this.drawUpgradeClock(ctx, t, s);
  }

  // small dots under the tower: one per tier above 1
  drawTierPips(ctx, t, s) {
    ctx.save();
    ctx.fillStyle = '#ffe93c';
    ctx.shadowColor = '#ffe93c';
    ctx.shadowBlur = 6;
    const n = t.tier - 1;
    for (let i = 0; i < n; i++) {
      const x = t.x + (i - (n - 1) / 2) * 7;
      ctx.beginPath();
      ctx.arc(x, t.y + s * 0.92, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // clock-timer over a tower that's building or upgrading
  drawUpgradeClock(ctx, t, s) {
    const total = t.upgrading.total || UPGRADE.applyTime;
    const frac = 1 - t.upgrading.remaining / total; // 0 → 1 as it completes
    const r = s * 0.42;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 233, 60, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffe93c';
    ctx.shadowColor = '#ffe93c';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(t.x, t.y, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
    // clock hand
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x + Math.cos(-Math.PI / 2 + frac * Math.PI * 2) * r * 0.7,
               t.y + Math.sin(-Math.PI / 2 + frac * Math.PI * 2) * r * 0.7);
    ctx.stroke();
    ctx.restore();
  }

  // --- blueprint drops ---------------------------------------------------------
  drawDrops(state) {
    const ctx = this.ctx;
    for (const d of state.drops) {
      const pulse = 0.75 + 0.25 * Math.sin(state.time * 5 + d.x);
      const fade = d.age > 7 ? Math.max(0, 1 - (d.age - 7) / 3) : 1; // blink out
      const color = d.color || '#ffe93c'; // owning tower's colour
      ctx.save();
      ctx.globalAlpha = fade * pulse;
      ctx.translate(d.x, d.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.fillRect(-5, -5, 10, 10);
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = fade * pulse * 0.9;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-5, -5, 10, 10);
      ctx.restore();
    }
  }

  // --- enemies ----------------------------------------------------------------
  drawEnemy(ctx, e, grid) {
    const s = e.radius * 2;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle + Math.PI / 2);
    if (e.type !== 'worm') ctx.scale(1, -1); // tip leads: arrows flying down-screen
    ctx.shadowColor = e.def.color;
    ctx.shadowBlur = 12;
    if (e.hitFlash > 0) {
      ctx.globalAlpha = 1;
      ctx.filter = `brightness(${1 + e.hitFlash * 1.5})`;
    }
    drawEnemyShape(ctx, e.type, s, e.def.color);
    ctx.restore();
    if (e.health < e.maxHealth) {
      this.drawHealthBar(ctx, e.x, e.y - e.radius - 6, s, e.health / e.maxHealth, e.def.color);
    }
  }

  drawProjectile(ctx, p) {
    const c = p.weapon.projectile;
    ctx.save();
    ctx.shadowColor = c.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = c.color;

    if (c.shape === 'arrow') {
      // sniper round: small arrowhead + long fading trail
      const tx = -Math.cos(p.angle), ty = -Math.sin(p.angle);
      const trailLen = c.size * (c.trail || 12);
      const grad = ctx.createLinearGradient(p.x, p.y, p.x + tx * trailLen, p.y + ty * trailLen);
      grad.addColorStop(0, c.color);
      grad.addColorStop(1, 'rgba(143, 208, 255, 0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = c.size * 0.7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + tx * trailLen, p.y + ty * trailLen);
      ctx.stroke();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -c.size * 1.6);
      ctx.lineTo(c.size, c.size * 1.2);
      ctx.lineTo(0, c.size * 0.3);
      ctx.lineTo(-c.size, c.size * 1.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, c.size, 0, Math.PI * 2);
    ctx.fill();
    // motion streak
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = c.color;
    ctx.lineWidth = c.size * 0.8;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - Math.cos(p.angle) * c.size * 4, p.y - Math.sin(p.angle) * c.size * 4);
    ctx.stroke();
    ctx.restore();
  }

  drawEffects(state) {
    const ctx = this.ctx;
    for (const fx of state.effects) {
      const k = fx.t / fx.dur;
      if (fx.kind === 'blast') {
        ctx.save();
        ctx.globalAlpha = (1 - k) * 0.7;
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 3 * (1 - k) + 1;
        ctx.shadowColor = fx.color;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, fx.r * (0.3 + 0.7 * k), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (fx.kind === 'hit') {
        ctx.save();
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = fx.color;
        ctx.shadowColor = fx.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, 3 + 5 * k, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (fx.kind === 'confetti') {
        // burst of pastel squares — used for all enemy kills
        for (const part of fx.parts) {
          const d = part.speed * k;
          const px = fx.x + Math.cos(part.angle) * d;
          const py = fx.y + Math.sin(part.angle) * d + 55 * k * k; // slight gravity
          ctx.save();
          ctx.globalAlpha = (1 - k) * 0.95;
          ctx.translate(px, py);
          ctx.rotate(part.rot + part.spin * k);
          ctx.fillStyle = part.color;
          ctx.shadowColor = part.color;
          ctx.shadowBlur = 6;
          ctx.fillRect(-part.size / 2, -part.size / 2, part.size, part.size);
          ctx.restore();
        }
      } else if (fx.kind === 'wreck') {
        // 2s electric fire on a cell that just lost a tower (Crash / Virus)
        ctx.save();
        ctx.globalAlpha = (1 - k) * (Math.random() < 0.25 ? 0.4 : 0.95);
        ctx.lineWidth = 1.6;
        for (let arc = 0; arc < 3; arc++) {
          ctx.strokeStyle = arc === 0 ? '#ffffff' : (arc === 1 ? '#ffd569' : '#ff5a3c');
          ctx.shadowColor = '#ff8c3c';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          let ax = fx.x, ay = fx.y;
          const dir = Math.random() * Math.PI * 2;
          ctx.moveTo(ax, ay);
          for (let seg = 0; seg < 4; seg++) {
            ax += Math.cos(dir + (Math.random() - 0.5) * 1.6) * (4 + Math.random() * 7);
            ay += Math.sin(dir + (Math.random() - 0.5) * 1.6) * (4 + Math.random() * 7);
            ctx.lineTo(ax, ay);
          }
          ctx.stroke();
        }
        // embers drifting up
        for (let e = 0; e < 3; e++) {
          const ex = fx.x + (Math.random() - 0.5) * 18;
          const ey = fx.y - k * (14 + e * 9) + (Math.random() - 0.5) * 4;
          ctx.fillStyle = e === 0 ? '#ffd569' : '#ff5a3c';
          ctx.beginPath();
          ctx.arc(ex, ey, 1.6 + Math.random(), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (fx.kind === 'death') {
        ctx.save();
        ctx.globalAlpha = (1 - k) * 0.8;
        ctx.strokeStyle = fx.color;
        ctx.shadowColor = fx.color;
        ctx.shadowBlur = 14;
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i + k * 0.8;
          const r0 = 4 + 14 * k, r1 = r0 + 6 * (1 - k);
          ctx.beginPath();
          ctx.moveTo(fx.x + Math.cos(a) * r0, fx.y + Math.sin(a) * r0);
          ctx.lineTo(fx.x + Math.cos(a) * r1, fx.y + Math.sin(a) * r1);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  drawHealthBar(ctx, cx, y, w, frac, color) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(cx - w / 2, y, w, 3.5);
    ctx.fillStyle = color;
    ctx.fillRect(cx - w / 2, y, w * Math.max(0, frac), 3.5);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Confetti kill burst — pastel squares, used for every enemy kill.
// Variants later: scale `speed`/`size`/count for bigger or smaller bursts.
// ---------------------------------------------------------------------------
const CONFETTI_COLORS = ['#ffd9e8', '#c9f7ff', '#fff5c9', '#d9ffd4', '#ecd9ff', '#ffe4c9'];

export function makeConfetti(x, y) {
  const parts = [];
  const n = 14 + Math.floor(Math.random() * 6);
  for (let i = 0; i < n; i++) {
    parts.push({
      angle: Math.random() * Math.PI * 2,
      speed: 26 + Math.random() * 46,          // px travelled over the burst
      size: 3 + Math.random() * 3.5,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 6,
    });
  }
  return { kind: 'confetti', x, y, parts, t: 0, dur: 0.7 };
}

// ---------------------------------------------------------------------------
// Procedural unit art (matches TDX-Mockup2 silhouettes)
// ---------------------------------------------------------------------------

// Weapon-tower art points "up" in local space; the renderer rotates the
// whole shape toward the tower's aim.
export function drawTowerShape(ctx, type, s, def) {
  ctx.fillStyle = def.color;
  switch (type) {
    case 'threader': { // simple arrowhead
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.05);
      ctx.lineTo(s * 0.72, s * 0.75);
      ctx.lineTo(0, s * 0.28);
      ctx.lineTo(-s * 0.72, s * 0.75);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'vault': { // solid hexagon
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 180 * (60 * i - 90);
        ctx[i ? 'lineTo' : 'moveTo'](s * Math.cos(a), s * Math.sin(a));
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'limiter': { // two rounded bars
      const bw = s * 0.42, bh = s * 1.5, gap = s * 0.18;
      roundRect(ctx, -bw - gap / 2, -bh / 2, bw, bh, bw / 2);
      ctx.fill();
      roundRect(ctx, gap / 2, -bh / 2, bw, bh, bw / 2);
      ctx.fill();
      break;
    }
    case 'ddos': { // three stacked dots (original grenade-launcher art)
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(0, i * s * 0.62, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'defrag': { // radial burst: centre dot + three at 120° (360° scattershot)
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * s * 0.62, Math.sin(a) * s * 0.62, s * 0.24, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'deleter': { // stacked chevrons
      for (let i = 0; i < 4; i++) {
        const y = -s * 0.75 + i * s * 0.48;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s * 0.75, y + s * 0.36);
        ctx.lineTo(-s * 0.75, y + s * 0.36);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'pulse': { // three slim rounds side by side — the 3-round burst
      for (let i = -1; i <= 1; i++) {
        const x = i * s * 0.42;
        const top = i === 0 ? -s * 1.0 : -s * 0.7;   // centre round leads
        const w = s * 0.15;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x + w, top + s * 0.32);
        ctx.lineTo(x + w, s * 0.8);
        ctx.lineTo(x - w, s * 0.8);
        ctx.lineTo(x - w, top + s * 0.32);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'compressor': { // 45° fan wedge with a solid pump block behind it
      const r = s * 1.15, half = Math.PI / 8;      // 22.5° each side
      const cy = s * 0.45;                          // fan apex sits low
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.arc(0, cy, r, -Math.PI / 2 - half, -Math.PI / 2 + half);
      ctx.closePath();
      ctx.fill();
      roundRect(ctx, -s * 0.34, cy - s * 0.05, s * 0.68, s * 0.42, s * 0.1);
      ctx.fill();
      break;
    }
  }
}

export function drawEnemyShape(ctx, type, s, color) {
  ctx.fillStyle = color;
  switch (type) {
    case 'hack': { // pink kite, point down
      kite(ctx, s * 0.55, s);
      break;
    }
    case 'crack': { // wide red wedge with a notch
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, -s * 0.5);
      ctx.lineTo(s * 0.6, -s * 0.5);
      ctx.lineTo(s * 0.28, s * 0.5);
      ctx.lineTo(0, s * 0.14);
      ctx.lineTo(-s * 0.28, s * 0.5);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'virus': { // three thin spikes
      for (let i = -1; i <= 1; i++) {
        ctx.save();
        ctx.translate(i * s * 0.34, 0);
        kite(ctx, s * 0.16, s * (i === 0 ? 1 : 0.85));
        ctx.restore();
      }
      break;
    }
    case 'worm': { // single slim spike
      kite(ctx, s * 0.26, s * 1.15);
      break;
    }
    case 'slice': { // small chevron
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, -s * 0.5);
      ctx.lineTo(0, s * 0.5);
      ctx.lineTo(s * 0.55, -s * 0.5);
      ctx.lineTo(0, -s * 0.1);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'bug': { // orange oval body with two little legs/mandibles leading
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.08, s * 0.4, s * 0.46, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * s * 0.12, s * 0.3);
        ctx.lineTo(side * s * 0.32, s * 0.6);
        ctx.lineTo(side * s * 0.34, s * 0.28);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'stinger': { // 4-pointed star with concave sides
      const r = s * 0.62, inner = s * 0.18;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i + Math.PI / 4;   // points on the diagonals, X-shaped
        const rad = i % 2 === 0 ? r : inner;
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
}

function kite(ctx, halfW, h) {
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.45);
  ctx.lineTo(halfW, -h * 0.25);
  ctx.lineTo(0, h * 0.55);
  ctx.lineTo(-halfW, -h * 0.25);
  ctx.closePath();
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
