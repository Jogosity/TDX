# TDX Dev Log

Cross-session continuity notes. Newest session at top. Companion to `TDX_Initial_Design.md`.

---
# ✅ MILESTONE 2 COMPLETE — v1.02 "Basic" — 2026-10-13

Signed off by Jogo at the end of Session 12. Shipped across Sessions 9–12:

- **Tweaks** — version display (now v1.02 — BASIC), per-level starting budgets, enemy delta verified + shown on Level Select.
- **Backup** — private GitHub repo (github.com/Jogosity/TDX), Backup Procedure, one-working-copy rule (iCloud `05_TDX`), `push.followTags` so milestone tags ride along with Desktop pushes.
- **Towers** — Pulse (3-round burst rifle) and Compressor (45° pump-shotgun cone, new aimed-pellet weapon class); burst/reload fix; two-row tray.
- **Enemies** — Bug (random tower hunter, walks open cells, ignores the base until no towers remain) and Stinger (packs of 2–4 on detour routes). Golden path no longer predictable (Jogo's playtest).
- **Blueprints** — primary/secondary/tertiary drop slots per level (15/5/3%) with a promotion rule; every lockable tower now drops somewhere; far more pickups.
- **Tooling** — debug spawn pause, button flash + Tokens/BITS header; `Code/serve.py` no-cache dev server; `tests/run.html` browser test runner (no Node on the Mac mini). Tests 48 → **74**.

**Carried forward:** new enemies into wave rosters → M3 (first task). Juicy BP pickup FX → M3. Tracer, Overclock, Cypher, Bit Rot, Turtle → Content backlog (on hold).

**Roadmap now:** M3 "Cobol" — Secure & Simulate (difficulty sim + balance) → M4 "Disc Drive" — Narrative & Content → M5 "Elm" — Re-engagement → M6 "Fortran" — Onboarding & Presentation.

---
## Session 12 — 2026-10-13 — Phase 2B: Bug + Stinger (first pass)

Session opened with admin: Mac mini infra (server command needs the full iCloud path; phone via LAN IP works), and a GitHub Desktop duplicate-clone cleanup — **one working copy only**, the iCloud `05_TDX` (rule added to QuickStart). Jogo restructured the roadmap: M2 phases renumbered (2A towers ✅, 2B enemies, 3A/3B on hold, 4 integration); new **M4 "Disc Drive" — Narrative and Content**; Re-engagement → M5 Elm; Onboarding → M6 Fortran. Unit art now specced in `Assets/Tower_Designs.png`. Plan after 2B: hold content, go to **M3 difficulty**.

### Bug (Enemy 6) — tower hunter
- `hunter: true` + `attack {10 dmg / 1.0s}`: on spawn picks a **random tower anywhere** (Vaults count), flies straight at it like Virus, drains it; retargets at random when it dies. With no towers left it walks the normal path and costs a life. New towers pull it back into hunting.
- 30 EV / 30 hp / fast / **reward 30** (spec 10 × the ~3× hand-tune scale, Jogo approved). Art: orange oval with two leading legs.
- Virus close-in/drain logic extracted to `Enemy.closeInAndDrain()`, shared by both.

### Stinger (Enemy 7) — detour raider
- `detour: { min 0.25, max 0.8, extraSteps 2 }`: on spawn picks a random cell 25–80% of the way to the exit whose route costs **≥2 extra steps** over optimal (hex boards have many equally-short routes, so "off the BFS path" alone wasn't a real detour — the first test caught it). Tight boards settle for the longest detour available. Then optimal path to base.
- Detour persists through path rebuilds (tower placed / CRASH) until passed. New `PathField.routeBetween()` + `distancesFrom()`.
- 350 EV / 70 hp / fast / packs 2–4 / **reward 90**. Art: orange 4-point star (X).

### Integration
- Debug SPAWN tab + main-menu Enemies screen pick both up automatically. **Not in any wave roster yet** — that lands at the start of M3, where the sim tunes rosters anyway.

### Tests
56 → **66 checks**: Bug hunts beyond Virus scan range, ignores base while towers stand, kills its tower, falls back to base, random target choice; Stinger detour off-route, routes longer than optimal, always reaches base, pack 2–4, detour survives rebuild. 66/66, stable across 6 repeated runs (randomised behaviours). Smoke-played at 375×812: Bugs swarm Threaders, Stingers fan out wide, no console errors.

### Playtest asks
- Bug: random target means Bugs often cross the whole board — is that fun, or should it prefer nearer towers?
- Stinger: is a 2-step detour visibly "non-optimal" enough? (`extraSteps` in config)

### Playtest round 1 (same day)
- Bug health 30 → **90** (died too easily).
- "Stinger won't debug-spawn" turned out to be **browser caching** of old JS under `python3 -m http.server`. New `Code/serve.py` sends `Cache-Control: no-store`; QuickStart now uses `python3 Code/serve.py`. Use it for all phone testing.

### Tweak round (Jogo's list)
- **Debug buttons flash** cyan on every tap (restarts on rapid taps).
- **Debug header wallet**: current Tokens + BITS beside the DEBUG title, refreshed on each tap.
- **Bugs walk open cells only** — no more flying straight over blockers/towers. They BFS-route (`PathField.routeToAny`) to any free cell touching their random target, then hold and drain. Unreachable towers are skipped when picking; route re-plans when the board changes; with no reachable tower they take the base path (re-scanning for new towers every 0.5s). Lockouts stay walkable (enemy-owned by design). Virus still closes in directly.
- Tests 66 → **67** (Bug routes around a blocker line to its tower). 67/67 ×5 runs.
- Jogo's playtest read: the new units fill real gaps — the golden path is no longer predictable; both enemy types survive long enough to threaten without making the game unplayable.

### Blueprint drop slots (Jogo's design)
Problem: one BP tower per level at a flat 8% → a level's whole collection loop finished mid-first-clear, then drops stopped forever; L5, Pulse and Compressor had none.
- **Three slots per level**, each rolled independently per kill: **primary 15% · secondary 5% · tertiary 3%** (`BLUEPRINTS.dropRates`). A slot whose tower is unlocked drops nothing. Multi-drops from one kill fan out so each stays tappable.
- **Promotion rule** (a guide, not rigid): secondary → next level's primary, tertiary → next level's secondary. L1/L2 get a tertiary to unlock the first towers sooner.

```
Level  Primary     Secondary   Tertiary
L1     Vault       Defrag      DDOS
L2     Defrag      DDOS        Compressor
L3     DDOS        Compressor  —
L4     Compressor  Deleter     —
L5     Deleter     Pulse       —
```
- `LEVELS[i].bpPool` is now `{ primary, secondary, tertiary }`; roll logic is DOM-free `rollBlueprints()` in `board.js`. Jogo: err on too-quick unlocks for now.
- Tests 67 → **74**: slot presence, rates, promotion rule, every lockable tower drops somewhere, observed rates over 40k rolls, unlocked never drop, independent slots.
- Juicier pickups (magnet/counter/effects) parked for later.

**M2 signed off — v1.02 Basic, tagged `v1.02-basic`. Next: M3 "Cobol".**

---
## Session 11 — 2026-10-12 — Phase B1: Pulse + Compressor (first pass)

Run remotely on Jogo's Mac mini. Config read as source of truth (no hand-edits since S10).

### New towers (TOWERS + WEAPONS, art, tray)
- **Pulse** — `pulseRifle`: 3-round bursts (0.08s between rounds), 1.5 pulses/s, clip = 5 pulses (15 rounds), 1.8s reload, 14 dmg/round, range 2.3 (= Threader). Cost 400 / 150hp, tier4 350hp / 30 dmg. Art: three slim rounds side by side, centre one leading. Violet.
  - Paper DPS ≈ 49 sustained (vs Threader 20) — per-cell upgrade over Threader, but 4 Threaders still out-DPS one Pulse per Token. That's the playtest question if Pulse is meant to supplant Threader.
- **Compressor** — new `pumpShotgun` (aimed cone class): 8 pellets fanned evenly across a 45° cone, 7 dmg each, 1.4 pumps/s, clip 4, 2.4s reload, range 1.8, pellets fly straight and die at the range edge (reuses the Defrag pellet path). Cost 400 / 100hp, tier4 250hp / 15 dmg. Art: 45° fan wedge on a pump block. Mint-teal.
  - Paper max ≈ 42 DPS if every pellet lands (point-blank on one target, or into packs); at full range the fan is ~1.5 cells wide so single targets eat only a few pellets.
- **Engine**: weapons with `cone` + `pelletCount` fire an aimed pellet fan. **Burst/reload fix**: a clip's last burst now finishes before the reload starts — previously the final pulse fired 1 round and the other 2 leaked out after the reload (no existing tower used clip + burst, so it never showed).
- **BPs**: both set to 16 but **not in any bpPool yet** — region locks are Phase E (Pulse→L4, Compressor→L3). For playtest: Debug → ECONOMY → Unlock all towers.

### From the Todos "Phase 1" list (playtest support)
- **Tray double-stacks** once the roster passes 5: 7 towers = 4 + 3 grid, slightly shorter buttons. Single row unchanged at ≤5.
- **Debug: Pause / Resume wave spawning** (ECONOMY tab) — holds natural wave spawns; debug SPAWN still works, so you can line up one enemy type against a test build.

### Tests
48 → **56 checks**: roster/BP presence, Pulse = Threader range, full 3-round bursts before reload (15 rounds per clip), burst rhythm (tight burst then 1/fireRate pause), Compressor fan count, pellets inside the 45° cone, pellets hit up close and die at range, tier-4 targets on the new tower. 56/56.
- Node isn't installed on the Mac mini, so I added `tests/run.html` — a browser runner for the same `sim.mjs` (shims `process.exit` + a mockable `localStorage`). Serve `Code/` and open `/tests/run.html`. `node tests/sim.mjs` still works wherever Node exists.
- Smoke-played L1 at phone size (375×812): both towers place, build, aim and fire; tray fits; no console errors.

### Playtest asks for Jogo
- Pulse: does the burst read and feel distinct from Threader? Is 400 right for ~2.5× Threader DPS?
- Compressor: is 1.8 range too short to matter? Does it want to sit at chokes / beside the path?
- Both are first-pass numbers — tune freely in config.

**Next: playtest + iterate B1, then Phase B2 (Tracer + Overclock).**

---
## Session 10 — 2026-07-22 — Phase B0: git repo (the safety step)

Jogo checked the build over and called it solid → B0 before any unit code.

- **Pre-commit cleanliness**: deleted stray `Code/sim.mjs` (Session-1 harness, superseded by `tests/sim.mjs` — the two had diverged). Suite still 48/48 after removal.
- **Repo**: `git init` at `05_TDX/` root (whole project per Jogo — Code, Docs, Notes, Assets), branch `main`, `.gitignore` (.DS_Store, iCloud artifacts, editor cruft). Initial commit tagged **v1.01-altair**; 27 files tracked, tree clean.
- **Backup procedure** written into `TDX_QuickStart.md`: session cadence (tests green → commit → push), milestone-only tagging rule, one-time remote setup for Jogo (GitHub Desktop or terminal), iCloud/git caveat (iCloud can evict file contents — hit it twice this session; GitHub is the real backup). QuickStart prompt also refreshed to current state (48 checks, roadmap pointer).
- **Published**: Jogo installed GitHub Desktop, added the existing local repo, published private as **github.com/Jogosity/TDX**. First push verified (origin/main at the session-10 commit). **B0 CLOSED.** Tag push hiccup solved: Terminal auth rejects account passwords (GitHub is token-only since 2021), so instead the repo got `push.followTags` — tags now ride along with ordinary Desktop pushes, no Terminal needed. `v1.01-altair` confirmed on the remote.

**Next session: Phase B1 — Pulse + Compressor towers.**

---
## Session 9 — 2026-07-21 — Milestone 2 planned + Stage A landed

### Milestone 2 — "Basic" (per TDX_Todos.md + TDX_Towers_and_Enemies.md)
Scope agreed with Jogo: tweaks + Tower & Enemy Expansion (4 towers, 5 enemies). Decisions:
- **Difficulty sim stays parked** — its own sub-project after M2, with the full roster to balance against.
- **GitHub repo/backup** is the milestone after M2 (per todos).
- **Versioning**: display shows v1.01 Altair now; bumps to **v1.02 Basic** only when the full M2 feature set has landed. Codenames Altair→Kernel listed in the todos.
- **New-tower BP regions** (my spread, approved): Tracer→L2, Compressor→L3, Pulse→L4, Overclock→L5 — later levels get 2 BP types, L5 finally has a pool.
- **Per-level budgets**: my best guesses, Jogo hand-tunes.

**Stages:**
- **A — Tweaks** ✅ this session (below).
- **B — Weapons + towers**, rising engine work: Pulse (burst — mostly config) · Compressor (pump shotgun, multi-pellet cone) · Tracer (new laser-beam weapon class) · Overclock (new adjacency damage-buff aura, +10%/tier).
- **C — Simple enemies**: Turtle (pure config) · Stinger (fast pack + non-optimal-route pathing) · Bug (tower-hunter, ignores base until towers are gone).
- **D — Exotic enemies**: Cypher (cell-teleport movement, untargetable while phased, skips every 2nd cell) · Bit Rot (contact-range damage aura; Limiter slows movement, not damage).
- **E — Integration**: bpPools, new enemies into L2–L5 rosters, tests per mechanic, v1.02 bump.

⚠️ Spec note for Stage C: Stinger says "same stats as Worm (config = source of truth)" but lists different stats (70hp, EV 350, reward 40). Jogo to pick at implementation.

### Stage A — done
- **Version display**: `VERSION` in config (`{ number, codename }` + bump-rule comment); rendered dim at the bottom of the Main Menu home screen ("v1.01 — ALTAIR").
- **Per-level starting budgets**: `LEVELS[i].startTokens` = 300 / 340 / 390 / 450 / 520 (scales with delta; `PLAYER.startTokens` is now fallback only). game.js reads the level value on init.
- **Enemy delta verified fully working**: health scaled at spawn (`maxHealth = round(health × delta.health)`), `damageMult` applied to Virus tower-damage, both spawn paths (waves + debug spawn) pass the level delta. Now displayed on each Level Select row: `Δ HP ×n · DMG ×n · START n TOKENS`.
- **Tests**: 43 → **48 checks** (version sanity, budgets present + monotonic, delta health/damage application). BP-pool check loosened from exact-match to `includes` so Stage E pool additions won't break it. 48/48 passing.

### Session-start note
Config hand-tunes since S8 preserved as source of truth (DDOS 400 / Defrag 500 / Deleter 700 costs, Worm 350hp @ 1.7× medium, raised rewards, Limiter 600/80hp, MG dmg 4, Virus attack 15/0.8s).

### Same-day addendum — roadmap through M5 agreed
Jogo reviewed the plan and reframed the unit expansion: **phased, not a single swoop** — units will iterate as they mature. Formal roadmap now lives at the bottom of `TDX_Todos.md` (Milestones section, replacing the old "Following Milestone" stub):

- **M2 "Basic"** rephased: A ✅ → **B0 GitHub repo** → B1 Pulse+Compressor → B2 Tracer+Overclock → C Turtle+Stinger+Bug → D Cypher+Bit Rot → E integration + v1.02. Playtest/iterate between phases.
- **M3 "Cobol" — Secure & Simulate**: difficulty simulator + full balance pass. Hard dependency: M2 roster must be settled first (new units = noise in the sim).
- **M4 "Disc drive" — Re-engagement**: finish Daily Quests design, Modules 4+5. After the sim, so reward drips tune against a balanced economy.
- **M5 "Elm" — Onboarding & Presentation**: FTUE, sound, polish. Deliberately last — onboarding teaches the final systems.
- Guiding intent recorded: the game is a **360° demonstration of game craft** — each milestone a presentable exhibit.

**Git repo pulled forward** from "following milestone" into M2 Phase B0 (my recommendation, approved): version control belongs *before* the unit-iteration churn. Jogo has a GitHub account, no repos yet — B0 = create private repo, .gitignore, initial commit tagged v1.01-altair, backup procedure documented.

Jogo is checking the current build is clean before Phase B0/B1 begins. No further code this session.

**Next session: Phase B0 (GitHub repo) → Phase B1 (Pulse + Compressor).**

---
# ✅ MILESTONE 1 COMPLETE — 2026-07-17

Declared by Jogo at the end of Session 8. Shipped across Sessions 1–8:

- **Core battle loop** — hex grid, pathing/firewalling, weapon system (MG / grenade / sniper / 360° scattershot), 5 towers (+hidden Limiter), 5 enemies, TEV/EV/MAV/RTV wave rhythm, CRASH events.
- **Retention Modules 1–3** — Upgrade Path (per-tower tiers, BITS + Tokens, build/upgrade clocks), Collection Core (region-locked Blueprints, tower unlocks), Area Unlock (5 levels, per-level grids/themes, lockouts, multi-spawn, linear progression, level select).
- **Infrastructure** — main menu (Play/Levels/Towers/Enemies), tabbed debug menu, localStorage save with migrations, 43-check headless test suite, DOM-free board/crash/sim modules.

**Known-open, deliberately parked:**
- Game currently too easy (over-corrected); L2–L5 waves are genWaves scaffolds → both wait for the **AI difficulty-analysis sub-project**.
- Roster is thin for 5 levels → **more towers + enemies next sprint** (config-driven, scaffold ready; L5 bpPool empty).
- Retention Modules 4 (Re-engagement — Daily Quests design still cut off at "Eg.") and 5 (Collection secondary) not started.
- Maps auto-centre (no lateral asymmetry); Limiter parked pending balance rethink; no cost-cap on crash tower kills; no sound; multi-cell towers unstarted.

**Next:** Jogo defines Milestone 2 objectives → plan the milestone and stages together.

---
## Session 8 — 2026-07-17 — Area Unlock (Retention Module 3): 5 levels

### Tweaks first (per todos)
- **Wreck effect**: cells that lose a tower (Crash or Virus) burn for 2s — flickering lightning arcs + rising embers.
- **Wave lead-in**: 3s grace (`WAVE_START_DELAY`) before spawning starts on every wave — time to read the map and any CRASH aftermath.

### Area Unlock, per the updated Retention Modules doc
- **5 levels**, per-level grid shapes (my best-guess formats, deliberately varied): L1 Shallow Breach (current funnel, 72 cells) · L2 The Narrows (small/tight, 49) · L3 Wide Delta (wide/short, 66) · L4 Deep Trench (narrow/tall, 69) · L5 The Sprawl (big board, 84). Row widths auto-centre; true lateral asymmetry would need offset support — parked.
- **Themes**: subtle cool variants per level (aqua → mint → indigo → ice) via `LEVELS[i].theme` merged over renderer defaults. Lockouts share a magenta "enemy-owned" look everywhere.
- **Lockout cells** (from L2, 2–5/level): enemies pass, player can't build. Dashed magenta hex + centre dot. Placement/pathing rules test-guarded.
- **Entry points**: L1 1, L2/L3 2, L4/L5 3. First spawn anchored on the top edge; extras anywhere in the top 5 rows (reachability-checked).
- **CRASH now shuffles everything**: blockers (≤2 tower kills, as before) + lockouts + extra entry points (`crashShuffle`). First spawn never moves.
- **Progression**: linear unlock in the save (`levelsUnlocked`); PLAY always starts the latest unlocked level; LEVEL SELECT screen in the main menu for replays (CLEARED / CURRENT / LOCKED). Levels now init in-page — no reload between level starts.
- **Region-locked BPs** per spec: Vault→L1, Defrag→L2, DDOS→L3, Deleter→L4, L5 empty until the roster grows.
- **Enemy deltas** ramp 1.0/1.0 → 1.75/1.5; BITS rewards 3→8.
- **Waves**: L1 keeps Jogo's hand-tuned 8 waves verbatim. L2–L5 use a `genWaves` scaffold (tev/mav growth curves, roster ramps, 8–10 waves) — explicitly placeholder until the difficulty sim tunes them.
- **Debug**: Unlock/Lock all levels buttons in ECONOMY.
- **Board logic extracted** to DOM-free `js/board.js` (blockers/lockouts/extra spawns) so the sim tests every level layout directly.

### Scaffold notes for next sprint (more towers/enemies)
Everything content-side is config-driven: a new tower = TOWERS entry + tray art case + BP count + a level's bpPool slot; a new enemy = ENEMIES entry + art case + wave roster mention. No engine work expected.

### Tests
43/43 (was 37): all 5 boards build with reachable spawns, lockout counts/passability, entry-point rules, crash invariants across every level, wave-def sanity, region-lock pools.

---
## Session 7 — 2026-07-17 — CRASH events land

Last core-battle feature from the original design doc, built ahead of the difficulty work (it affects difficulty) and Level unlocks.

### Mechanics (per design doc)
- Cadence: rolled 3–4 waves between crashes (`CRASH` block in config). The crash strikes **1.5s after a due wave opens** — sudden, mid-play.
- All blockers relocate to fresh cells. A blocker may land on a tower and destroy it — hard cap 2 kills per crash. Relocation is firewall-checked per placement (spawns always stay connected); enemy paths rebuild after.
- Presentation: full-screen screenshake (decaying jitter), chromatic-glitch **CRASH** caption (red/cyan offset copies, flicker, fade) and a colour flash in the first beats.

### Implementation notes
- Core relocation logic lives in `js/crash.js`, DOM-free, so the sim tests hammer it directly: 25 consecutive crashes must keep blocker count stable, never firewall, never exceed 2 kills. 37/37 tests total.
- Crash timers tick regardless of phase, so a scheduled crash lands even if the wave ends during the lead-in.
- Debug → ECONOMY gains **Trigger CRASH now** for visual testing.
- Not implemented (design doc "might"): cost cap on destroyable towers. Revisit if losing a Deleter to a crash feels too brutal.

### Next (agreed with Jogo)
CRASH ✓ → Level unlocks / level select (scaffold for regional tower unlocks) → more towers to thicken the mix → AI difficulty analysis.

---
## Session 6 — 2026-07-17 — UI/UX todo sweep + build timer

Second TDX_Todos pass (all ticked in the doc):

- **Menu cog**: ⚙️ now sits top-left of the main menu overlay (visible on Home, Towers and Enemies screens) — debug menu reachable without starting a run.
- **Sniper feel**: Deleter round is now a small arrowhead at 45 cells/s (was 20) with a long fading trail. Per-weapon projectile `shape`/`trail` config added — other weapons unchanged.
- **Play space shift**: grid + base now drop down by up to 2 hex heights (3×size) of the spare bottom space on tall screens (per the iOS screenshot); clamped so the base always stays on-screen. Test-guarded.
- **Confetti kills**: all enemy kills now burst into 14–20 pastel square particles (spin, slight gravity, 0.7s). `makeConfetti()` in render.js — tune count/speed/size there; variants later. Tower deaths and BP pickups keep the old radial effect.
- **Build timer** (Jogo mid-session request): new towers construct on the same 3s clock-timer as upgrades — offline, dimmed, clock overlay, then online. `BUILD_TIME` in config.

Tests: 34/34 (build-offline, construction-completes, layout-shift checks added).

Playtest note from Jogo: game is currently too easy after the over-correction — deliberately parked for the AI difficulty-analysis sub-project.

---
## Session 5 — 2026-07-17 — Tier unlocks go per-tower

Playtest verdict from Jogo: game is now too easy (over-corrected from too hard) — expected, feeds the AI difficulty-analysis sub-project coming in a few days.

### Change: Tier 2/3/4 unlocks are now per tower TYPE, not global
- Save: `tierUnlocks: { threader: 3, ... }` (absent = Tier 1). Legacy global `tiersUnlocked` migrates to every tower at its old value, so no player progress lost.
- Costs unchanged per step (3/8/15 BITS) but now paid per tower type — total BITS sink is ~5x deeper, as intended.
- UI per Jogo's spec: unlock control sits on the right-hand side of each tower's row in the Main Menu Towers screen, and only the *next* tier is offered (one at a time). Row shows `TIER n/4` + `UNLOCK Tn ◆cost`. BP-locked towers show BP progress instead (can't buy tiers for a tower you don't own).
- In-game ◆ TIERS menu now shows the same per-tower list (`THREADER · T2/4` etc.). The separate global tier rows section is gone.
- In-battle upgrade gating now checks the tower's own type unlock.

### Tests
31 checks (was 28): fresh-save tierUnlocks empty, legacy migration seeds all towers + strips the old field (via a mocked localStorage), numeric-blueprints migration. 31/31 passing.

### Notes
- Difficulty analysis next: grow `tests/sim.mjs` into the headless balance simulator (tower DPS vs real pathing, config sweeps, leak reports) per the Session 2 direction.

---
## Session 4 — 2026-07-17 — TDX_Todos sweep: tower fix, Collection Core, debug menu, main menu

Worked through `Docs/TDX_Todos.md` (all four sections done). Jogo's latest config hand-tune (rewards, Virus dmg 15, Slice packs 5–8) preserved.

### Tower design fix (human error, per todos)
- **DDOS restored** to the grenade launcher, original stacked-dots art, aims again. tier4 dmg target 36.
- **Defrag** is the new home of the 360° scattershot (same stats it had on DDOS, cost 300, mint-green, radial-burst art, idle spin, 14 BPs).
- **Limiter pulled from the UI** — the real OP culprit (wrecks TTK of everything near it). Kept fully working in code + config, just absent from `TOWER_ORDER`; flagged as a balance issue in a config comment.

### Collection Core — fully implemented (Retention Module 2)
- All towers except Threader start locked. Config: each tower has `blueprints` (needed to unlock): Vault 10, DDOS 12, Defrag 14, Deleter 18 (Limiter 12, hidden).
- **BP drops are level-pool defined** (Jogo's call — pre-builds Region Lock): `LEVELS[].bpPool` lists which tower BPs can drop; each drop is a random *still-locked* pool tower. 8% per kill, 10s lifetime, tap to collect.
- Drops render in the owning tower's colour; pickup toast names the tower (`Vault Blueprint (3/10)`); hitting the count **unlocks instantly mid-game** with an `UNLOCKED` toast.
- Tray shows lock state: 🔒 + BP progress instead of cost; tapping a locked tower explains itself.
- Save schema: per-tower BP counts + `towersUnlocked` (migrates the old numeric scaffold).

### Debug menu
- ⚙️ cog top-left → full-screen tabbed overlay (takes touch priority). Tabs are a registry (`ui.debugTabDefs`) — add `{ label, build(el) }` and it appears; built for growth as requested.
- **ECONOMY tab**: +100 Tokens, +10 Bits, Unlock all towers, Lock all towers (also resets BP counts), Reset all settings (wipes save), Quit to main menu.
- **SPAWN tab**: one button per enemy type, spawns a single instance. Works outside waves too — the combat sim now runs whenever enemies exist, so debug spawns path/fight during the build phase.

### Main menu
- Game boots to a main menu (playfield/HUD fully hidden). PLAY starts the run; level complete / game over return to the menu (fresh reload; save persists).
- **TOWERS screen**: every tray tower with icon, description, status (UNLOCKED / BP x/y), plus the tier-unlock rows (BITS) — shared component with the in-game ◆ TIERS menu, which stays per the retention doc.
- **ENEMIES screen**: icon + short description per enemy. Descriptions for both live in config (`desc`).

### Tests
`tests/sim.mjs` 20 → **28 checks** (roster fix, BP config sanity incl. the 10–20 spec range, bpPool validity, save defaults/migration). 28/28 passing.

### Open questions for Jogo
- Threader-only start: 300 Tokens = 3 Threaders on wave 1 — first-run difficulty needs a playtest look.
- Drop pool ignores already-unlocked towers, so late-level drops thin out — if you'd rather bank spare BPs for future regions, easy switch.
- Level select is still just PLAY → Level 1; proper level select is next when Level 2 exists. CRASH events remain the outstanding roadmap item.

---
## Session 3 — 2026-07-16 — DDOS rework, Upgrade Path (Retention Module 1), Blueprint scaffold

Config treated as player-edited source of truth (MG dmg 3, 300 start Tokens, raised kill rewards) — all preserved.

### DDOS rework — new `scatterShot` weapon class
- DDOS was OP (grenade splash × the doubled enemy density). Replaced its weapon with a new **radial** weapon class: `scatterShot` fires a full 360° ring of 12 straight-flying pellets (7 dmg each), 4 blasts per clip, 2.4s reload, range 2.0. Pellets hit the first enemy they touch and die at the range edge. Radial weapons don't aim — DDOS now has a slow idle spin and new radially-symmetric art (centre dot + three at 120°).
- `grenadeLauncher` stays in config unused, for a future rocket/mortar tower.
- Play pattern change: DDOS now wants to be *surrounded* (mid-path islands), not parked behind a choke.

### Crude balance pass (manual, pre-sim)
- Deleter sniper 30 → **110 dmg** (was 5.6 effective DPS for a 500-token tower — worse than a Threader; now one-shots a delta-1 Hack).
- All other numbers left as Jogo's hand-tune. **Needs playtest**: scatterShot pellet dmg (7) and Deleter 110 are guesses.

### Retention Module 1 — Upgrade Path (built to `TDX_Retention_Modules.md` spec)
- Tiers 1–4; towers always built at Tier 1.
- **Tier access** unlocked with BITS in a new Upgrade Menu (◆ TIERS button in HUD, available during play): Tier 2/3/4 = 3/8/15 BITS. Level 1 completion (+3 BITS) unlocks Tier 2 on the first win — deliberate first-taste loop.
- **Applying** an upgrade: tap tower → Upgrade button beside Sell, costs Tokens at 2x/3x/4x base cost, takes 3s (tower offline, clock-timer drawn over it, aura suspended). Tapping a "LOCKED" upgrade button opens the Upgrade Menu.
- Stats: config lists Tier 1 (base) and `tier4` targets; intermediates linear-interpolated per the spec. Current tier4 targets — Threader 250hp/9dmg, Vault 600hp, Limiter 350hp/0.3 slow, DDOS 350hp/18dmg, Deleter 200hp/300dmg.
- Sell refund = 66% of total spend (base + upgrades). Tier pips (yellow dots) drawn under upgraded towers.
- New `js/save.js`: localStorage profile (BITS, tiersUnlocked, blueprints), safe in headless node. BITS now persist across runs.

### Retention Module 2 — Collection (Core) — scaffold only
- Doc marks Module 2 NOT READY, so only the safe core was built: enemies have an 8% chance to drop a Blueprint (pulsing yellow diamond, 10s lifetime, generous 26px tap radius, tap priority over placement). Collecting persists a total count to the save.
- Deliberately NOT done: tower locking (all-but-Threader) and per-tower BP targets — would gut the game mid-development; waiting until the module is marked READY.

### Tests
`tests/sim.mjs` grown 12 → **20 checks**: scatterShot ring count, pellet range-edge death, pellet hit registration, Tier-1 build, 2x cost rule, tier-4 stat targets, linear interpolation, sell-refund-covers-upgrades. 20/20 passing.

### Open questions for Jogo
- Tower being *offline* during the 3s upgrade was my call (spec silent) — makes mid-wave upgrades a real decision. Revert if it feels bad.
- Tier unlock costs (3/8/15 BITS) and BP drop rate (8%) are first guesses.
- Playtest focus: does DDOS feel fair now? Is Deleter worth 500?

Next per roadmap: CRASH events → main menu/level select.

---
## Session 2 — 2026-07-15 — Post-playtest quick fixes

Jogo confirmed: terminal + mobile deployment both work. First playable verified in hand.

- Art fix: Threader/Vault were transposed in the mockup — Threader is now a simple arrowhead, Vault the solid hexagon.
- Weapon towers (Threader, DDOS, Deleter) now rotate to face their target, with continuous tracking between shots. Threader's gun-barrel element removed.
- Hack, Crack, Virus, Slice flipped vertically — tips now lead, reading as arrows flying down-screen. (Worm intentionally unchanged.)
- Balance (rough pass, pre-real-balancing): Threader/DDOS/Deleter weapon damage cut 75% (2/15/30). All wave TEV/MAV/RTV doubled for denser fields.
- Tests still 12/12.

End of session: all five fixes confirmed working in play. Jogo is hand-tuning `config.js` for a rough first balance pass — treat config values as player-edited; read the file, don't assume the Session 1 numbers.

Direction agreed for later: AI-first difficulty analysis — grow `tests/sim.mjs` into a headless simulator (tower DPS vs. real pathing, batch config sweeps, leak/spike reports) instead of manual playtest-and-retype loops. This comes AFTER the remaining feature TODOs.

Roadmap order discussed: CRASH events → main menu/level select (prerequisite for Level 2) → meta modules (upgrades, blueprints, login rewards, finish Daily Quests section in design doc) → AI-first balance analysis.

---
## Session 1 — 2026-07-15 — First playable: core battle loop

### Built
Full core loop in `Code/` (vanilla JS ES modules, canvas, no dependencies):

- `js/hex.js` — pointy-top axial hex grid; funnel shape from mockup (row widths in config); spawn zone top, base below bottom row.
- `js/path.js` — BFS flow field toward exits; Firewall legality check (also protects cells under live enemies); Catmull-Rom smoothing so enemies move on curves.
- `js/entities.js` — weapon system (damage, fireRate, clip/reload + burst, spread, projectile speed, splash — ready for shotguns/rockets later); all 5 towers and 5 enemies from the design doc; Virus latches onto towers within scan range and applies DoT; Limiter is a non-stacking 50% slow aura.
- `js/waves.js` — TEV/EV/MAV/RTV exactly per design doc, incl. the sub-wave halt/surge rhythm. Slice spawns in packs of 3–5 (packs respect the MAV cap).
- `js/render.js` — procedural neon synthwave art matching both mockups; glows via shadowBlur; blast/hit/death effects; range rings; placement preview (green legal / red illegal).
- `js/ui.js` + `index.html` — HUD (wave, lives pill, Tokens/Bits), tower tray with drawn icons, tap-to-place, tap tower → sell popup (66% refund), banners between waves.
- `js/game.js` — state machine: build → wave → wave-clear pause → next wave → level complete / game over. Random blockers placed at level start (path-safety checked).
- `tests/sim.mjs` — headless test harness: `node tests/sim.mjs` (12 checks: grid, pathing, firewall, wave rhythm).

### Blanks filled (tune freely, all in `js/config.js`)
- Speeds (cells/sec): low 0.45, medium 0.75, fast 1.4 (Worm = medium ×1.25).
- Weapons: machine gun 8 dmg @ 5/s r2.3; grenade 60 dmg splash 1.1 r3.5; sniper 120 dmg r6.5.
- Virus: 10 dmg / 1s reload, scan range 2.5 cells.
- Start: 250 Tokens, 15 lives (from mockup). Level 1: 8 waves, 6 blockers, delta 1.0/1.0, +3 BITS on completion.
- Enemy unlock order: Hack → Slice (w2) → Crack (w3) → Worm (w5) → Virus (w7).
- Grid: rows [7,8,8,8,8,8,7,6,5,4,3], 1 spawn cell centred on top row.

### How to run
`cd Code && python3 -m http.server 8000` → open `http://localhost:8000` (ES modules need a server; on phone, use your machine's LAN IP). Portrait layout, works with mouse too.

### Deliberately deferred (per scope decision)
- CRASH events (blocker reshuffle, screenshake, ≤2 tower kills per crash)
- Enemy Lockout cells (design doc says hold for later)
- Meta modules: Upgrade Path (BITS), Blueprint collection, login rewards, daily quests
- Main menu / level select (level-complete button currently reloads)
- Multi-cell towers, sound, saving

### Notes / open questions for Jogo
- Design doc cuts off mid-sentence in Daily Quests ("Eg.") — needs finishing.
- Balance is a first guess; wave 8 sim shows healthy MAV/RTV surge rhythm but real play-testing needed.
- Suggest next session: playtest + balance pass, then CRASH.
