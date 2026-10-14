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
