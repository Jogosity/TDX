// TDX — central game data. All balance lives here.
// Speeds are in cells/second, ranges in cells. Converted to pixels at runtime.

export const SPEED = { low: 0.45, medium: 0.75, fast: 1.4 };

// Version. Codenames run alphabetically (Altair, Basic, Cobol, Disc drive,
// Elm, Fortran, Goto, Hypercard, Int, Java, Kernel, ...). The number/codename
// only bumps when a milestone's FULL feature set has landed.
// Milestone 1 → v1.01 Altair. Milestone 2 → v1.02 Basic. M3 closes as v1.03 Cobol.
export const VERSION = { number: '1.02', codename: 'Basic' };

export const PLAYER = {
  startTokens: 300,   // fallback only — per-level budgets live in LEVELS[i].startTokens
  startLives: 15,
  sellRefund: 0.66,
};

// ---------------------------------------------------------------------------
// Weapon system.
// Primary values: damage, fireRate (shots/sec), clipSize + reloadTime.
// Secondary values: burstCount, burstInterval, spread (radians),
// projectileSpeed (cells/sec), splashRadius (cells).
// clipSize 0 = no clip / never reloads. splashRadius 0 = single target.
// Designed so burst-fire, shotguns, rockets and grenades slot in later.
// ---------------------------------------------------------------------------
export const WEAPONS = {
  machineGun: {
    damage: 4, fireRate: 5, clipSize: 0, reloadTime: 0,
    burstCount: 1, burstInterval: 0, spread: 0.06,
    projectileSpeed: 11, splashRadius: 0, range: 2.3,
    projectile: { color: '#4ef3ff', size: 3 },
  },
  grenadeLauncher: {
    damage: 15, fireRate: 0.5, clipSize: 3, reloadTime: 2.5,
    burstCount: 1, burstInterval: 0, spread: 0.03,
    projectileSpeed: 5, splashRadius: 1.0, range: 3.5,
    projectile: { color: '#7f7bff', size: 6 },
  },
  sniperRifle: {
    damage: 110, fireRate: 0.3, clipSize: 1, reloadTime: 2.0,
    burstCount: 1, burstInterval: 0, spread: 0,
    projectileSpeed: 45, splashRadius: 0, range: 6.5,
    // shape 'arrow' + trail: fast arrowhead with a long streak — sniper feel
    projectile: { color: '#8fd0ff', size: 4, shape: 'arrow', trail: 16 },
  },
  // 360° scattershot: fires a full ring of straight-flying pellets.
  // radial: true → no aiming; pelletCount pellets per blast, damage is per pellet.
  scatterShot: {
    damage: 7, fireRate: 0.8, clipSize: 4, reloadTime: 2.4,
    burstCount: 1, burstInterval: 0, spread: 0.12,
    projectileSpeed: 7, splashRadius: 0, range: 2.0,
    radial: true, pelletCount: 12,
    projectile: { color: '#7f7bff', size: 3.5 },
  },
  // Pulse rifle (M2 B1): 3-round bursts. One clip unit = one whole burst, so
  // clipSize 5 = 5 pulses (15 rounds) before a full reload. fireRate = pulses/sec.
  pulseRifle: {
    damage: 14, fireRate: 1.5, clipSize: 5, reloadTime: 1.8,
    burstCount: 3, burstInterval: 0.08, spread: 0.04,
    projectileSpeed: 14, splashRadius: 0, range: 2.3,   // same reach as Threader
    projectile: { color: '#c3b8ff', size: 3 },
  },
  // Pump shotgun (M2 B1): aimed cone of straight-flying pellets.
  // cone = total spread angle (radians); pellets fan evenly across it and die
  // at the range edge like scatterShot. damage is per pellet.
  pumpShotgun: {
    damage: 7, fireRate: 1.4, clipSize: 4, reloadTime: 2.4,
    burstCount: 1, burstInterval: 0, spread: 0.05,
    projectileSpeed: 9, splashRadius: 0, range: 1.8,
    cone: Math.PI / 4, pelletCount: 8,                    // 45° fan per spec
    projectile: { color: '#7af0e2', size: 2.6 },
  },
};

// ---------------------------------------------------------------------------
// Upgrade Path (Retention Module 1).
// Towers are always built at Tier 1. Tier ACCESS is unlocked with BITS in the
// Upgrade Menu (persistent). APPLYING an upgrade to a tower in the field costs
// Tokens: costMult × the tower's base cost per step, and takes applyTime secs.
// Per-tower upgradeable stats live in TOWERS[x].tier4 — the Tier 4 value.
// Tier 1 is the base stat; tiers 2–3 are linearly interpolated between them.
// ---------------------------------------------------------------------------
// Seconds to construct a new tower — same clock-timer system as upgrades.
export const BUILD_TIME = 3;

// Grace period at the start of every wave before spawning begins — time to
// read the map and see the aftermath of a CRASH.
export const WAVE_START_DELAY = 3;

// ---------------------------------------------------------------------------
// CRASH events. Every everyMin–everyMax waves the battlefield resets:
// all blockers jump to new cells (may crush up to maxTowerKills towers),
// with screenshake, a glitching CRASH caption and a colour flash.
// ---------------------------------------------------------------------------
export const CRASH = {
  everyMin: 3, everyMax: 4,  // waves between crashes (rolled each time)
  leadIn: 1.5,               // seconds into the wave before it strikes
  maxTowerKills: 2,          // per design doc: ≤2 towers lost per crash
  shakeTime: 0.9,            // seconds of screenshake
  captionTime: 1.4,          // seconds the CRASH caption glitches on screen
};

export const UPGRADE = {
  maxTier: 4,
  costMult: [2, 3, 4],            // Tokens: tier 1→2, 2→3, 3→4 (× base cost)
  applyTime: 3,                   // seconds, clock timer shown over the tower
  tierUnlockBits: { 2: 3, 3: 8, 4: 15 },
};

// ---------------------------------------------------------------------------
// Collection (Core) — Retention Module 2.
// Defeated enemies may drop Blueprints for still-locked towers in the
// level's bpPool slots. Tap to collect; towers unlock instantly at their BP count
// (TOWERS[x].blueprints). Drops are drawn in the owning tower's colour.
// ---------------------------------------------------------------------------
export const BLUEPRINTS = {
  // Per-level drop slots (LEVELS[i].bpPool = { primary, secondary, tertiary }).
  // Each kill rolls every slot independently; a slot whose tower is already
  // unlocked drops nothing. Rule of thumb: a level's secondary becomes the next
  // level's primary, tertiary → secondary — a guide, not a rigid structure.
  dropRates: { primary: 0.15, secondary: 0.05, tertiary: 0.03 },  // per enemy kill
  lifetime: 10,       // seconds before an uncollected drop fades away
  tapRadius: 26,      // px — generous for thumbs
};

// ---------------------------------------------------------------------------
// Towers. weapon: key into WEAPONS, or null (Vault) or aura def (Limiter).
// ---------------------------------------------------------------------------
// blueprints: BPs needed to unlock the tower (0 = always unlocked).
// desc: shown in the Main Menu Towers screen.
export const TOWERS = {
  threader: {
    name: 'Threader', cost: 100, health: 100,
    weapon: 'machineGun',
    tier4: { health: 250, damage: 9 },
    blueprints: 0,
    desc: 'Rapid-fire machine gun. Cheap, reliable lane damage.',
    color: '#6db4ff', glow: '#4ef3ff',
  },
  vault: {
    name: 'Vault', cost: 60, health: 200,
    weapon: null,
    tier4: { health: 600 },
    blueprints: 10,
    desc: 'Armoured blocker. No weapon — shapes enemy paths.',
    color: '#3f8bff', glow: '#3f8bff',
  },
  // Limiter is OP (wrecks TTK of everything nearby) — pulled from the UI
  // pending a balance rethink, but kept in code. Not in TOWER_ORDER.
  limiter: {
    name: 'Limiter', cost: 600, health: 80,
    weapon: null,
    aura: { type: 'slow', factor: 0.5, range: 1.8 },
    tier4: { health: 350, slowFactor: 0.3 },
    blueprints: 12,
    desc: 'Slow-field aura. Enemies inside crawl at half speed.',
    color: '#7f7bff', glow: '#a98bff',
  },
  ddos: {
    name: 'DDOS', cost: 400, health: 150,
    weapon: 'grenadeLauncher',
    tier4: { health: 350, damage: 36 },
    blueprints: 12,
    desc: 'Grenade launcher. Lobbed splash damage at medium range.',
    color: '#57a9ff', glow: '#57a9ff',
  },
  defrag: {
    name: 'Defrag', cost: 500, health: 150,
    weapon: 'scatterShot',
    tier4: { health: 350, damage: 18 },
    blueprints: 14,
    desc: '360° scattershot. Strongest when enemies surround it.',
    color: '#49e6b0', glow: '#49e6b0',
  },
  deleter: {
    name: 'Deleter', cost: 700, health: 80,
    weapon: 'sniperRifle',
    tier4: { health: 200, damage: 300 },
    blueprints: 18,
    desc: 'Long-range sniper. Huge single hits, slow cycle.',
    color: '#4ec9ff', glow: '#8fd0ff',
  },
  // --- M2 Phase B1 (first pass — playtest + iterate) -------------------------
  // BP drops: Compressor L2 tertiary → L3 secondary → L4 primary;
  // Pulse L5 secondary (see LEVELS[i].bpPool).
  pulse: {
    name: 'Pulse', cost: 400, health: 150,
    weapon: 'pulseRifle',
    tier4: { health: 350, damage: 30 },
    blueprints: 16,
    desc: 'Burst rifle. Three-round pulses, Threader reach, heavier hits.',
    color: '#9b8cff', glow: '#b8a8ff',
  },
  compressor: {
    name: 'Compressor', cost: 400, health: 100,
    weapon: 'pumpShotgun',
    tier4: { health: 250, damage: 15 },
    blueprints: 16,
    desc: 'Pump shotgun. 45° pellet fan — brutal up close, short reach.',
    color: '#4fd8c8', glow: '#7af0e2',
  },
};

// Limiter deliberately absent (kept in code, hidden from play).
export const TOWER_ORDER = ['threader', 'vault', 'ddos', 'defrag', 'deleter', 'pulse', 'compressor'];

// ---------------------------------------------------------------------------
// Enemies. EV = Enemy Value (wave budget weight). reward = Tokens on kill.
// EV = Threat EV (M3 E3, 2026-10-19): HP × speed, scaled so Hack = 100,
// rounded to 10 — the firepower an enemy demands to kill in one pass.
// Abilities (Virus drain, Bug hunting, Stinger detour) not priced in yet —
// except Virus, held at its hand-set 300 (stats say 150; its tower drain
// made it lethal at 150 in Jogo's playtest).
// Previous hand-set EVs: hack 100, crack 150, virus 300, worm 200,
// slice 30, bug 30, stinger 350.
// attack: only present on tower-attacking enemies (Virus).
// pack: spawns in groups.
// ---------------------------------------------------------------------------
export const ENEMIES = {
  hack: {
    name: 'Hack', ev: 100, health: 100, speed: SPEED.medium, reward: 30,
    desc: 'Default raider. Medium speed, no tricks.',
    color: '#ff4fae', size: 0.36,
  },
  crack: {
    name: 'Crack', ev: 360, health: 600, speed: SPEED.low, reward: 35,
    desc: 'Slow tank. Soaks a full clip and keeps coming.',
    color: '#ff3131', size: 0.46,
  },
  virus: {
    name: 'Virus', ev: 300, health: 150, speed: SPEED.medium, reward: 40,
    attack: { damage: 15, reload: 0.8, scanRange: 2.5 },
    desc: 'Tower hunter. Latches on nearby and drains towers down.',
    color: '#ff6a4f', size: 0.40,
  },
  worm: {
    name: 'Worm', ev: 600, health: 350, speed: SPEED.medium * 1.7, reward: 60,
    desc: 'Fast and heavy. Punishes thin defences.',
    color: '#ffa03c', size: 0.40,
  },
  slice: {
    name: 'Slice', ev: 60, health: 30, speed: SPEED.fast, reward: 14,
    desc: 'Pack runner. Cheap, fast, arrives in groups.',
    pack: { min: 5, max: 8 },
    color: '#ffd9c4', size: 0.26,
  },
  // --- M2 Phase 2B (first pass — playtest + iterate) ----------------------------
  // Not in any wave roster yet (debug SPAWN only) — rosters land with M3's sim.
  // Rewards follow the hand-tuned ~3× spec scale of the existing roster.
  bug: {
    name: 'Bug', ev: 170, health: 90, speed: SPEED.fast, reward: 30,
    // hunter: ignores the base, flies straight at a random tower and drains it;
    // retargets randomly when it dies. Only heads for the base once no towers remain.
    hunter: true,
    attack: { damage: 10, reload: 1.0 },
    desc: 'Tower hunter. Picks a random tower and swarms it — ignores the base.',
    color: '#ff8a1f', size: 0.30,
  },
  stinger: {
    name: 'Stinger', ev: 130, health: 70, speed: SPEED.fast, reward: 90,
    // detour: routes via a random off-path cell partway down the board, then
    // takes the optimal path to the base. min/max = fraction of the start
    // cell's distance-to-exit where the detour cell may sit; extraSteps = how
    // many cells longer than the optimal route the detour must be (at least).
    detour: { min: 0.25, max: 0.8, extraSteps: 2 },
    pack: { min: 2, max: 4 },
    desc: 'Fast raider. Packs of 2–4 taking unpredictable routes.',
    color: '#ff7a2e', size: 0.36,
  },
};

// ---------------------------------------------------------------------------
// Level data (Retention Module 3 — Area Unlock).
// Per level: grid shape, entry points (spawns), blockers, Lockout cells
// (enemy may pass, player may not build), enemy delta, region-locked bpPool,
// colour theme (subtle cool variants), and wave definitions.
// Levels unlock linearly; PLAY starts the latest unlocked level.
// L2–L5 waves are generated scaffolds (genWaves) — tune freely or replace
// with explicit arrays once the difficulty sim is running.
// ---------------------------------------------------------------------------
const ALL = ['hack', 'slice', 'crack', 'worm', 'virus'];

// Wave 1 cold-start (M3 E5): every level opens with light enemies only,
// spawned further apart, so the opening Tokens can get a defence up before
// the tanks (Worm, Crack) arrive in wave 2. Applies to L1 and genWaves.
const OPENING_ROSTER = ['hack', 'slice'];
const OPENING_SPREAD = 1.5;       // wave 1 spawnInterval multiplier

const genWaves = (count, { tev0, tevGrowth, mav0, mavGrowth, interval0, intervalStep, roster }) =>
  Array.from({ length: count }, (_, i) => {
    const mav = Math.round((mav0 * Math.pow(mavGrowth, i)) / 10) * 10;
    const interval = Math.max(0.5, +(interval0 - intervalStep * i).toFixed(2));
    return {
      tev: Math.round((tev0 * Math.pow(tevGrowth, i)) / 100) * 100,
      mav,
      rtv: Math.round((mav * 0.5) / 10) * 10,
      unlocked: i === 0 ? OPENING_ROSTER : roster(i),
      spawnInterval: i === 0 ? +(interval * OPENING_SPREAD).toFixed(2) : interval,
    };
  });

export const LEVELS = [
  {
    name: 'Level 1: Shallow Breach',
    grid: { rowWidths: [7, 8, 8, 8, 8, 8, 7, 6, 5, 4, 3], spawnCells: 1 },
    spawns: 1,
    blockers: 6,
    lockouts: 0,
    startTokens: 300,             // per-level starting budget (best-guess — tune freely)
    enemyDelta: { health: 1.0, damage: 1.0 },
    rewardBits: 3,
    bpPool: { primary: 'vault', secondary: 'defrag', tertiary: 'ddos' },
    theme: {},                    // baseline blue
    waves: [
      { tev: 1200, mav: 600,  rtv: 300, unlocked: OPENING_ROSTER,                          spawnInterval: 1.8 },  // was [hack], 1.2 (×1.5)
      { tev: 1600, mav: 700,  rtv: 360, unlocked: ['hack', 'slice'],                       spawnInterval: 1.1 },
      { tev: 2000, mav: 800,  rtv: 400, unlocked: ['hack', 'slice', 'crack'],              spawnInterval: 1.0 },
      { tev: 2600, mav: 900,  rtv: 440, unlocked: ['hack', 'slice', 'crack'],              spawnInterval: 0.9 },
      { tev: 3200, mav: 1000, rtv: 500, unlocked: ['hack', 'slice', 'crack', 'worm'],      spawnInterval: 0.9 },
      { tev: 4000, mav: 1100, rtv: 560, unlocked: ['hack', 'slice', 'crack', 'worm'],      spawnInterval: 0.8 },
      { tev: 4800, mav: 1200, rtv: 600, unlocked: ['hack', 'slice', 'crack', 'worm', 'virus'], spawnInterval: 0.8 },
      { tev: 6000, mav: 1400, rtv: 700, unlocked: ['hack', 'slice', 'crack', 'worm', 'virus'], spawnInterval: 0.7 },
    ],
  },
  {
    name: 'Level 2: The Narrows',
    grid: { rowWidths: [6, 7, 7, 6, 6, 5, 5, 4, 3], spawnCells: 1 },  // small + tight
    spawns: 2,
    blockers: 5,
    lockouts: 3,
    startTokens: 340,
    enemyDelta: { health: 1.15, damage: 1.1 },
    rewardBits: 4,
    bpPool: { primary: 'defrag', secondary: 'ddos', tertiary: 'compressor' },
    theme: { cellFill: '#0a1a36', cellLine: '#1d4a5e', blockerFill: '#122a44', blockerLine: '#2e6e86' },
    waves: genWaves(8, {
      tev0: 1800, tevGrowth: 1.22, mav0: 700, mavGrowth: 1.09,
      interval0: 1.1, intervalStep: 0.05,
      roster: (i) => (i < 2 ? ['hack', 'slice', 'crack'] : i < 4 ? ['hack', 'slice', 'crack', 'worm'] : ALL),
    }),
  },
  {
    name: 'Level 3: Wide Delta',
    grid: { rowWidths: [9, 10, 10, 10, 9, 8, 6, 4], spawnCells: 1 },  // wide + short
    spawns: 2,
    blockers: 8,
    lockouts: 4,
    startTokens: 390,
    enemyDelta: { health: 1.3, damage: 1.2 },
    rewardBits: 5,
    bpPool: { primary: 'ddos', secondary: 'compressor' },
    theme: { cellFill: '#0a1c30', cellLine: '#1a5a52', blockerFill: '#10304a', blockerLine: '#2e8a76' },
    waves: genWaves(9, {
      tev0: 2400, tevGrowth: 1.2, mav0: 800, mavGrowth: 1.09,
      interval0: 1.0, intervalStep: 0.05,
      roster: (i) => (i < 1 ? ['hack', 'slice', 'crack', 'worm'] : ALL),
    }),
  },
  {
    name: 'Level 4: Deep Trench',
    grid: { rowWidths: [5, 6, 6, 7, 7, 7, 7, 6, 6, 5, 4, 3], spawnCells: 1 },  // narrow + tall
    spawns: 3,
    blockers: 7,
    lockouts: 4,
    startTokens: 450,
    enemyDelta: { health: 1.5, damage: 1.35 },
    rewardBits: 6,
    bpPool: { primary: 'compressor', secondary: 'deleter' },
    theme: { cellFill: '#100f3e', cellLine: '#33308a', blockerFill: '#191856', blockerLine: '#4a48a8' },
    waves: genWaves(10, {
      tev0: 3000, tevGrowth: 1.2, mav0: 900, mavGrowth: 1.08,
      interval0: 1.0, intervalStep: 0.05,
      roster: () => ALL,
    }),
  },
  {
    name: 'Level 5: The Sprawl',
    grid: { rowWidths: [8, 9, 10, 10, 9, 9, 8, 7, 6, 5, 3], spawnCells: 1 },  // big board
    spawns: 3,
    blockers: 10,
    lockouts: 5,
    startTokens: 520,
    enemyDelta: { health: 1.75, damage: 1.5 },
    rewardBits: 8,
    bpPool: { primary: 'deleter', secondary: 'pulse' },
    theme: { cellFill: '#0e1a2a', cellLine: '#3a5a78', blockerFill: '#16283c', blockerLine: '#5a7e9e' },
    waves: genWaves(10, {
      tev0: 3600, tevGrowth: 1.2, mav0: 1000, mavGrowth: 1.08,
      interval0: 0.95, intervalStep: 0.05,
      roster: () => ALL,
    }),
  },
];

// ---------------------------------------------------------------------------
// Global grid constants. Per-level shape lives in LEVELS[i].grid.
// Lockout colours are shared across themes (enemy-owned = magenta).
// ---------------------------------------------------------------------------
export const GRID = {
  hexMargin: 0.97,    // visual gap between cells
};
