# TDX — M3 "Cobol" — Difficulty Management (working notes)

Started 2026-10-14. Working notes, not a showcase doc. Polish later.

## Why
TDX is a portfolio piece for game craft *and* AI operation. Building a game with AI is now easy; building the tool chain and support structures around it is the differentiator. M3 is where that shows: methodology matters as much as results. We plan, try approaches, make mistakes and roll back.

## Thesis
Difficulty ≈ f(enemy inflow, enemy power, player resource inflow, tower power). Layout modifies it, but ~80% lives in the basic numbers. That's where the lens goes first.

Not in scope: player-facing difficulty modes, adaptive difficulty.

## Approach — three layers, each checks the one below

### 1. The Ledger (pure maths + visualisation)
- Browser tool that imports `Code/js/config.js` directly — one source of truth shared with the game.
- Visual first (Jogo is an artist/designer), raw numbers underneath.
- Per level and wave: enemy HP arriving per second (with delta), tokens available (start + kill rewards), damage per token per tower (clip/reload/burst/splash aware), pressure ratio = needed vs affordable.
- Sliders to try values without editing config.

### 2. The Sim (headless)
- Grow `tests/sim.mjs` into headless games with simple bot players, run in Node.
- First job: check the Ledger's predictions; then measure the layout share (path length, time in range, CRASH).
- Covers ~90% of validation. Jogo hand-tests a few tiers to confirm it's on track.

### 3. The Tuning Loop
- Target: a hand-drawn pressure curve per level (rising, with dips after big waves). Starting point — see how it pans out.
- Sweep numbers against the target; each change is an experiment on its own git branch, so it rolls back cleanly.

### Experiment log
Running log in Docs: hypothesis → change → result → verdict. Mistakes included.

## Tooling decisions
- Node on the Mac (LTS) — installing 2026-10-14. Lets the sim run thousands of games headless and lets sessions run tests on the Mac.

## First look (back-of-envelope, not a sim result)
- Threader ≈ 20 DPS / 100 tokens (0.20 per token). Pulse ≈ 41 DPS / 400 tokens (≈0.10) after reloads. Cheapest tower ≈ 2× as efficient per token, before range/splash.
- Last playtest read: game too easy. L2–L5 waves are genWaves placeholders; Bug + Stinger not in rosters yet.

## Order of work
1. [x] Plan agreed (this doc)
2. [x] Node installed (v24.21.0) + `node tests/sim.mjs` green on the Mac (74/74)
3. [x] Ledger v1: tower efficiency + per-wave enemy inflow vs token inflow, L1–L5
3b. [x] Ledger v2: target curve, fill panel, Threat EV (S14)
4. [ ] Bug + Stinger into L1–L5 rosters
5. [ ] Sim v1: bot player, compare with Ledger
6. [ ] Target curves, then tuning loop

## Experiment log

### E1 — Ledger v1 baseline (2026-10-14)
Tool: `Code/tools/ledger/` (open `/tools/ledger/` via `python3 Code/serve.py`). Maths in `ledger.js` (DOM-free, Node-importable), page in `index.html`. Reads `config.js` live.
Model: player puts every Token into Tier-1 Threaders, every enemy dies, field treated as empty (no MAV throttle). Pressure 1.0 = break point.

Findings (ledger predictions, not yet sim-checked):
- **Every level peaks at wave 1, then collapses.** L1 0.69 → 0.15; L2–L5 open at 1.9–2.5 and end at 0.12–0.15. Matches the "too easy" playtest read.
- **Cause: Tokens compound, enemy HP doesn't.** Tokens are cumulative (towers persist), wave HP grows ~1.2× per wave. The economy outruns the threat by mid-level.
- **L2–L5 wave 1 is a wall:** genWaves `tev0` is high vs `startTokens` (e.g. L3 W1 ≈ 6,000 HP vs 390 Tokens).
- **Threader is the best value by far:** 20 DPS per 100 Tokens vs Pulse 10, Compressor 6, others 2–3.
- **Upgrades are poor value:** Tier 4 Threader = 4.5 DPS per 100 Tokens (4× worse than building another). Board space and tower HP may justify them; the sim will tell.
- **EV doesn't track HP:** HP per EV ranges 0.2 (Stinger) to 4.0 (Crack). Crack-heavy waves carry far more HP than their TEV suggests.

Verdict: baseline recorded. Next questions for Jogo before tuning.

### E2 — Target curve, Fill and Threat EV (2026-10-19, Ledger v2)
Ideas from Jogo: **Fill Rate** (how fast EV reaches MAV) and a **more scientific EV**.
Added to the ledger:
- **Target curve** in `tools/ledger/target.js` (ledger-only; the game never reads it). Per level: start 0.5 → end 0.85/0.875/0.9/0.925/0.95 (L1→L5), straight climb, −0.1 dip on the wave after the middle one. Tiles show average distance from target.
- **Fill panel**: time to fill MAV vs time to clear a full field, per wave.
- **Threat EV** = HP × speed, scaled to Hack = 100. Price ratio = EV ÷ Threat EV; Tokens per 100 threat.

Findings (ledger predictions):
- **Fill speed is not the problem:** every wave fills MAV in ~6–8 s. **What fills is**: wave-1 full-field HP is 600 (L1) vs 1,600–2,600 (L2–L5) while start Tokens only go 300 → 520. W1 time to clear a full field: L1 10 s, L2–L5 22–26 s.
- **Off target** by 0.39 (L1) to 0.61 (L5) average: too hard at W1, far too easy from W3 on.
- **EV mispricing:** Crack ×0.42, Worm ×0.34, Bug ×0.18 (underpriced); Virus ×2.0, Stinger ×2.7 (overpriced, before abilities). Rewards per threat range 9.7 (Crack) to 68.9 (Stinger).

Levers on the table (not applied): opening-wave spawn interval / MAV / roster, start Tokens, EV re-pricing (+ TEV rescale), rewards tied to threat. Ability values (Virus drain, Bug hunting, Stinger detour) → sim to measure.

### E3 — Enemy EVs switched to Threat EV (2026-10-19)
Jogo's call: replace the hand-set EVs with Threat EV (HP × speed, Hack = 100, rounded to 10). Abilities not priced in.
- `config.js` ENEMIES ev: Hack 100, Crack 150→**360**, Virus 300→**150**, Worm 200→**600**, Slice 30→**60**, Bug 30→**170**, Stinger 350→**130**. Old values kept in a comment above ENEMIES for rollback.
- `tests/sim.mjs`: "wave budget fully spent" now checks `budgetLeft < cheapestEV()` (was hard-coded `< 30`, the old Slice EV). 74/74.

Ledger before → after (avg off-target · W1 pressure · last-wave pressure · W1 full-field HP):
- L1 0.39→0.38 · 0.69→0.69 · 0.15→0.20 · 600→600
- L2 0.54→0.41 · 1.92→1.38 · 0.15→0.22 · 1,599→823
- L3 0.60→0.48 · 2.45→1.80 · 0.15→0.21 · 1,996→893
- L4 0.58→0.51 · 1.99→1.80 · 0.12→0.17 · 1,982→1,173
- L5 0.61→0.51 · 2.32→1.81 · 0.13→0.18 · 2,598→1,535

Read: closer to target everywhere, wave-1 walls lower. But TEV is unchanged, so every wave now carries **~45% less total HP** (fewer, properly priced Cracks/Worms). Mid–late game is still far too easy; the shape (spike then collapse) is unchanged. Uniform TEV scaling doesn't fix it (×1.8 in the ledger makes W1 worse and late game no better) → the next levers are the TEV growth curve and the economy (rewards, compounding Tokens).

Verdict: pending Jogo's playtest.

### E4 — Virus back to 300 EV (2026-10-19)
Jogo's playtest of E3: at 150 EV the Virus came in large numbers and its tower drain obliterated the defence. Jogo loves the unit ("makes the game alive"), so it keeps its HP and damage and goes back to **300 EV** (hand-set, ability priced in by eye until the sim measures it). Decision: keep working on main for now (nothing risky yet). Tests 74/74.

### E5 — Wave 1 cold-start options (ledger, not applied yet)
Wave 1 pressure (W1) / wave 2 (W2) / avg off-target, L2–L5, against current config:
- Baseline: W1 1.35–1.81, W2 0.78–0.94.
- **A. W1 roster = Hack + Slice only (L2–L5):** W1 0.72–0.94, W2 0.66–0.71; off-target improves on every level. One field per level.
- B. Hack + Slice + Crack: barely helps (W1 1.35–1.87). Worm (tank) and Crack (HP) are the W1 problem.
- C. Hack + Slice and W1 TEV = 3–4× start Tokens: W1 0.52–0.74 but the wall moves to W2 (0.77–1.09): a smaller W1 pays fewer Tokens.
- D. W1 spawn interval ×2: only helps throughput; L3–L5 W1 is tank-bound (Worm), unchanged.
- Start Tokens alone: W1 0.5 needs ~920 / 1,400 / 1,620 / 1,890 (L2–L5), 2.7–3.6× today.

**E5 applied (2026-10-19): option A + wave 1 spread ×1.5.** Jogo asked what spreading wave 1 out does on its own: spawn interval ×2 takes L1 0.69→0.46 and L2 1.35→1.10, but L3–L5 stay at 1.80 because wave 1 there is tank-bound (one Worm), and spacing doesn't change tank pressure. Combined with the Hack + Slice roster it works everywhere.
- `config.js`: new `OPENING_ROSTER = ['hack','slice']` and `OPENING_SPREAD = 1.5`, applied to wave 1 of every level (genWaves for L2–L5; L1 W1 hand-edited: roster was `['hack']`, interval 1.2→1.8). Rollback: set `OPENING_SPREAD = 1`, and remove the `i === 0` roster override.
- Ledger W1 / W2 / avg off-target: L1 0.44 / 0.31 / 0.35 · L2 0.62 / 0.67 / 0.32 · L3 0.74 / 0.71 / 0.35 · L4 0.69 / 0.68 / 0.40 · L5 0.79 / 0.69 / 0.39 (W1 was 0.69–1.81).
- Fill time ≈ clear time at wave 1 (7–9 s each): the balanced opening from Jogo's Fill Rate idea. Worm and Crack now first appear in wave 2. Tests 74/74.

Verdict: **kept.** Jogo's playtest (L1–L3): "the best game I have had by a long long way… very very intense." Open question: the ledger still rates the late waves far too easy (end pressure ~0.2), which may not match play. If intensity held to the last wave, the ledger is underrating something (Virus drain, board congestion) and the sim must measure it; if not, next lever is the TEV growth curve / economy.

Follow-up (Jogo, 2026-10-19): the late-game intensity is the **Virus drain**. It is the biggest difficulty driver and turns the game into real-time strategy: react fast to Virus attacks, use Vaults to soak damage and protect Threaders and DDOS towers, or as a distraction. This is the intended direction (Bug units exist for it). The ledger assumes towers never take damage, so its late-wave "too easy" is a firepower-only reading. **Next: Sim v1 measures the drain** (tower HP and DPS lost per Virus, with and without a Vault), then the ledger gets a "firepower after drain" line. Bug into rosters once the sim can measure it.
