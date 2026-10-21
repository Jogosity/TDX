# TDX — M3 "Cobol" — Difficulty Management (working notes)

Started 2026-10-14. **Banked 2026-10-21 as v1.03 Cobol** (E14). Working notes, not a showcase doc. Polish later.

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
- Sweep numbers against the target; each change is an experiment logged below. Work is on main; git history is the rollback.

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
5. [x] Sim v1: bots (greedy, live, reactive) + killing ground; checked against the Ledger (E6–E11)
5b. [x] Ledger v3–v5: burst pressure, Virus tax, Jogo's review (E7, E10, E12)
6. [x] Target curves (E2, `tools/ledger/target.js`)
7. [ ] Tuning loop, in progress. Done: wave 1 cold start (E7), Virus cooldown (E11). Next: step 2, Virus schedule and TEV growth per level, previewed with the Shaping dials
8. [ ] Ledger: model the Virus spiral (flat tax reads L4–L5 too easy)
9. [ ] L3 layout: hardest level on the board, not the numbers (Jogo failed it, E11)
Parked, joint with M4: tower value (DDOS, Compressor, Pulse; E9). M4 ideas list at the end.

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

### E6 — Sim v1: measuring the Virus drain (2026-10-20)
Built `Code/tools/sim/` (`engine.js` = headless copy of the game.js loop + bot; `run.mjs` = experiment runner, `node tools/sim/run.mjs [seeds]` from Code/). Uses the real game modules (towers, enemies, waves, pathing, CRASH) with a seeded Math.random. Bot "live": Threaders only, Tier 1, spends every Token between waves and mid-wave as kills pay, on the cell that sees the most path. No reactions to Viruses. Lives may go negative so every wave is measured.
Setups, 40 seeds per level: **no drain** (Virus keeps HP/speed/reward, loses its attack), **drain** (the game as is), **drain + Vaults** (20% of builds are decoy Vaults beside the path, inside gun cover).

| Level | Runs lost: no drain → drain | Towers alive by last wave: no drain → drain | Leaks, whole level: no drain → drain |
|---|---|---|---|
| L1 | 5% → 5% | 36 → 34 | 6 → 6 |
| L2 | 5% → 3% | 23 → 23 | 5 → 5 |
| L3 | 38% → 43% | 32 → 28 | 16 → 51 |
| L4 | 25% → 70% | 35 → 14 | 18 → 294 |
| L5 | 65% → 93% | 43 → 11 | 24 → 542 |

Findings:
- **Without the drain the ledger is right:** from wave 3 on, leaks are ~0–1 per wave and the bot owns the board. Too easy.
- **With the drain, L4–L5 collapse into a death spiral** for a player who doesn't react: Viruses kill towers → fewer kills → fewer Tokens → can't rebuild. Towers plateau at 11–16 while the no-drain bot reaches 35–43.
- **Price of a Virus, unopposed:** it destroys 1–2 Threaders (100–200 Tokens of towers) and pays 40. Reason: a lone Threader loses the duel (Virus drains 15 per 0.8 s ≈ 19 DPS, × enemy damage delta, kills 100 HP in ~5 s; one Threader (20 DPS) needs ~7–13 s to kill a 150 HP × health-delta Virus). Two Threaders in range roughly break even.
- **Passive decoy Vaults don't help** (slightly worse: Tokens not spent on guns). Vaults work as a *reaction* (Jogo's play), which this bot doesn't do. The difficulty from L3 up now lives in the player's response to Viruses.
- **Wave 1, sim vs ledger:** the bot leaks 9–16 at L3–L5 wave 1 (mostly Slice packs), the ledger said 0.74–0.79 pressure. L3–L5 have 2–3 entry points, so a handful of Threaders is split across paths; the ledger doesn't model that, and the bot may place worse than a person. Needs Jogo's real numbers to calibrate.

Next: a reactive bot (builds a Vault/Threader next to a latched Virus) to measure how much reaction is worth; calibrate wave 1 against Jogo's play; add "towers lost per Virus" to the ledger.

### E7 — Wave 1 cap halved + ledger burst pressure (2026-10-20)
Jogo's read of L3 wave 1: a very high-pressure cold start with no time to set up; the short board lets Slices "rip you to shreds", and you never get a beachhead. Sim v1 agreed (wave 1 leaks 9.8 at L3); the ledger didn't (0.74).
Sim test of wave 1 fixes, 30 seeds, drain on — average wave 1 leaks L1…L5:
- Now: 1.2 / 3.5 / 9.8 / 9.1 / 16.2
- **Halve MAV (and RTV): 0.1 / 0.2 / 1.7 / 1.5 / 4.9** (wave 2 leaks also fall; same enemies and Tokens in total)
- Start Tokens +50%: 0.2 / 0.4 / 1.9 / 4.6 / 5.6 (fattens an economy that's already too rich late)
- Hack only: 0.5 / 1.1 / 5.7 / 5.0 / 11.8 · spread ×2: 0.4 / 1.9 / 7.8 / 6.8 / 13.5 · half TEV: 0.2 / 1.6 / 5.7 / 5.0 / 9.5 (but wave 2 leaks rise: fewer Tokens)

Applied (Jogo's call): `OPENING_MAV = 0.5` in `config.js`, applied to wave 1 MAV and RTV on every level (L1 W1 300/150; L2–L5 350/400/450/500). Re-run confirms: wave 1 leaks 0.1 / 0.3 / 1.7 / 1.5 / 4.9; runs lost 7% / 0% / 20% / 73% / 87% (L4–L5 losses are the drain spiral from E6). Tests 74/74.

Ledger v3: **burst pressure** = full-field HP (MAV) × entries^entrySplit ÷ (DPS × time to cross the board at the HP-weighted speed). Throughput is an average; burst is the peak. New assumption slider "Entry split" (0.5, picked because it reproduced the sim's wave 1 leak ranking L1 < L2 < L4 < L3 < L5). Pressure is now the highest of throughput, tank and burst. Before the change it read wave 1 at 0.65 / 1.31 / 1.67 / 1.54 / 1.89; now 0.44 / 0.66 / 0.84 / 0.77 / 0.94.

Verdict: **kept.** Jogo's playtest (2026-10-20): "really hard but I scraped by with a win on all 5 levels. We are getting really close now." L5 wave 1 still leaks ~5 in the sim.

Follow-up (Jogo, 2026-10-20): the Viruses are the biggest difficulty factor, and play splits in two. Near the base: a dense killing ground of Threaders, backed by DDOS and a Compressor or two, which looks after itself. Up at the entry points: constantly "bailing water", building Vaults and rebuilding Threaders to stop Viruses spreading down the board and collapsing the base defence. It works, but the game is collapsing into one **Vault-and-Threader loop**: a dominant strategy, so a content/design problem (→ M4), not a numbers one.
Levers noted for M4 (not decided): Viruses that ignore Vaults or prefer the most valuable tower; a tower/upgrade that answers drain another way (repel, cleanse); Bugs in rosters (they hunt anywhere, punishing a single killing ground).
Proposed M3 next step: a reactive bot that plays the loop, to measure what it's worth per level, the baseline any new content must break.

### E8 — Reactive bot: the Vault-and-rebuild loop (2026-10-20)
Jogo's proposal, one step at a time: teach the bot the loop. New bot `reactive` in `tools/sim/engine.js` ('live' plus reactions, checked 4× a second, 1 s reaction delay, 120 Tokens held back mid-wave for reactions):
- Vault beside a Virus that has latched onto a tower (so the Vault is its nearest next target).
- Picket: a Vault on the route just before an approaching Virus's first contact, if that contact would be a gun (rarely triggers: Viruses usually spawn within reach of a tower already).
- Rebuild a drained tower as a Threader on the same cell once no Virus is within 1.5 cells.

30 seeds per level, drain on, current config:

| Level | Runs lost: passive → reactive | Leaks, whole level | Towers at the end | Vaults built / rebuilds per run |
|---|---|---|---|---|
| L1 | 7% → 7% | 4 → 3 | 36 → 36 | 4 / 0.5 |
| L2 | 0% → 0% | 1 → 1 | 24 → 24 | 5 / 0.4 |
| L3 | 20% → 23% | 16 → 13 | 30 → 32 | 16 / 3.5 |
| L4 | 73% → 40% | 313 → 166 | 12 → 25 | 25 / 16 |
| L5 | 87% → 67% | 517 → 337 | 9 → 23 | 25 / 16 |

Findings:
- **The loop is worth a lot on L4–L5** (loss rate −33 and −20 points, towers alive doubled) and nothing on L1–L2, where Viruses arrive late and few. It confirms the loop is the strategy that matters once Viruses are common.
- The bot still loses most L5 runs that Jogo won. The rest of the gap is the half the bot can't do: the killing ground near the base (dense Threaders + DDOS + Compressors) and better placement. Threader-only Tier-1 bot = a floor, not a peer.
- **Why Viruses are so sticky (read from `entities.js`, not yet measured):** towers target "First", the enemy with the least path left. A latched Virus stops moving, so while other enemies stream past it is never the closest to the base and the guns ignore it. A Virus parked near the entry drains until the stream clears. That's why the answer has to be Vaults (soak) rather than firepower, and it's a lever for M4 (targeting rules, a tower that prefers latched enemies).

Next: decide whether to give the bot a killing ground (DDOS/Compressor near the base) to close the gap to Jogo, or treat E8 as the baseline for M4 content.

### E9 — Bot skill: a killing ground near the base (2026-10-20)
Jogo's call: teach the bot his base defence (dense Threaders, DDOS artillery, a Compressor or two) on top of the E8 reactions. New `greedyBuild` options in `tools/sim/engine.js`: `mix` (build order cycled once `screen` Threaders exist; the bot saves up for the next big tower), `baseBias` (weights route near the base when picking gun cells), and `KILLING_GROUND` = Threader, Threader, DDOS, Threader, Threader, Compressor. Towers assumed unlocked.

Runs lost, 10 seeds, reactive bot as baseline (L3 / L4 / L5):
- Reactive, Threaders only: 20% / 50% / 40%
- + guns pulled towards the base (bias 2): 50% / 40% / 100%
- + killing-ground mix from the 5th gun: 40% / 60% / 100%
- + mix and bias 1: 40% / 70% / 100%; mix and bias 2: 70% / 60% / 100%
- Late, sparse versions (mix from the 13th gun, one big tower in 5): DDOS 30% / 50% / 50%; Compressor 30% / 50% / 50%; both + bias 1: 20% / 40% / 90%

Findings:
- **No version of the killing ground beat plain Threader spam for the bot.** Saving 400 Tokens for a DDOS or Compressor while the field fills costs more than it returns; pulling guns to the base leaves the entry undefended against Viruses.
- This matches the Ledger's tower value table (E1): a Threader gives ~20 DPS per 100 Tokens, DDOS and Compressor a fraction of that. **By the numbers the game rewards Threaders**, which is part of why play collapses into the Vault-and-Threader loop. That half is a numbers problem (M3), not only content.
- Why Jogo's killing ground still works for him is open: better placement (where routes merge), splash on clumped Slice packs, upgrades, or simply that a person spreads attention better. The bot can't settle that; a playtest note can.

Next candidate (numbers): rebalance DDOS / Compressor / Pulse value (cost or damage) so a mixed defence pays, then re-run E8/E9. Kept the killing-ground options in the bot for that test.

E9 follow-up (Jogo): DDOS is long-range artillery, kept a few cells back from the front, screened by Threaders or Vaults. Its DPS per Token isn't great; its range is what makes it useful. Compressor is "probably rubbish" (Threaders would be better); that sits as much in M4 as M3.
Tested in the sim (new `standoff` option: `{ ddos: 2.6 }` keeps DDOS ≥ 2.6 cells from the route, outside a Virus's 2.5-cell scan):
- **Safety confirmed:** on L5 (10 runs) standoff DDOS lost 833 HP to drain vs 2,835 on the route; drain kills 18 → 5.
- **But outcomes don't improve** (20 runs, runs lost L3 / L4 / L5): Threaders only 25% / 50% / 55%; DDOS on route 30% / 50% / 100%; DDOS standoff 25% / 50% / 90%; standoff + cost 250: 40% / 45% / 70%; standoff + damage ×2: 25% / 55% / 65%. Even a doubled DDOS only matches Threader spam for the bot.
Read: range buys survival, not enough damage. For a bot that can't feel the moment-to-moment value, Threaders stay the best buy. Tower value (DDOS, Compressor, Pulse) is parked as a joint M3/M4 item rather than tuned now.

### E10 — Late game step 1: the Virus tax in the ledger (2026-10-20)
The reactive bot's per-wave leaks show the late game isn't uniformly "too easy": L1–L3 flatten (Viruses arrive late in L1/L2), L4–L5 spiral into collapse. Goal: every level climbs steadily to its target. Plan: (1) make the ledger honest about the drain, (2) re-shape each level's growth with it, (3) check with the reactive bot, then Jogo plays.
Note on sim leak numbers (Jogo asked): every leak costs a life as in the game; the sim simply keeps playing past 0 lives so late waves are measured on every run, and records the game-over wave separately (that's "runs lost"). Big leak counts = a bot that has already lost.

Measured, 30 seeds, Tokens of towers lost per Virus (drained towers × 100 + Vaults × 60):

| Level | Viruses per run | Passive bot | Reactive bot |
|---|---|---|---|
| L1 | 5–6 | 153 | 179 |
| L2 | 11–12 | 85 | 120 |
| L3 | 22–25 | 148 | 185 |
| L4 | 37–38 | 192 | 243 |
| L5 | 43–44 | 145 | 207 |

Reacting doesn't make a Virus cheaper (Vaults + rebuilds cost Tokens); it keeps you alive (reactive bot still alive at the end of L4: 60% vs 27%; L5 33% vs 13%).
Ledger v4: `virusTax` assumption = 200 Tokens per Virus (slider; ~205 weighted by Virus count). Half is taken off firepower in the wave the Virus arrives, all of it from the next wave on. New "Virus tax" column in the wave table.

Ledger before → after, average off target and shape:
- L1 0.34 → 0.33: still falls away, 0.44 → 0.27 (only 6 Viruses, all late). Too easy late.
- L2 0.33 → 0.26: dips to 0.37 at W5, climbs to 0.45. Too easy, wrong shape.
- L3 0.36 → 0.21: ~0.85–0.95 from wave 1 to the end. Flat and hard from the start.
- L4 0.41 → 0.15: ~0.8–0.87 throughout. Flat.
- L5 0.41 → 0.22: ~0.85–0.95 throughout. Flat and hard.
Matches the sim's ordering (runs lost L2 0% < L1 7% < L3 23% < L4 40% < L5 67%) except L3 vs L4. The ledger still can't show the spiral itself (a flat tax per Virus doesn't compound), so the sim stays the judge for L4–L5.

Read: with the drain priced in, **the shape problem is the Virus schedule**: L1–L2 get too few and too late; L3–L5 get them from wave 2, so pressure is high and flat from the start instead of climbing. Step 2 lever: when Viruses enter each roster and how big their share is, then TEV growth.

### E11 — Virus spawn cooldown (2026-10-20)
Jogo: a big Virus problem was two of them coincident on screen. It looks like one Virus, and towers fall apart fast. There was no cooldown: each spawn picks a type at random, so back-to-back Viruses happen, take the same route and latch onto the same nearest tower (read from `waves.js` / `entities.js`). Measured with the reactive bot (10 seeds): 14–19% of drain time on L3–L5 was 2+ Viruses on one tower, so roughly a quarter to a third of drain damage. Options: (1) spawn cooldown (numbers), (2) Viruses avoid a tower already being drained (behaviour, M4-ish), (3) show the stack (presentation). Jogo's call: (1), and he likes that it frees EV for other base attackers such as Worms.

Change: new per-enemy `spawnCooldown` (seconds) in `ENEMIES`; `waves.js` skips a type still on cooldown when picking (waits if nothing else fits). Virus = **4 s**. The ledger's wave replay honours it too. New test "Virus spawns respect spawnCooldown"; 75/75.

Sim, reactive bot, 20 seeds — runs lost L1…L5 / Viruses per L4 run / share of drain time stacked on L4:
- 0 s: 5% / 0% / 25% / 50% / 55% · 39 · 17%
- 3 s: 5% / 0% / 25% / 40% / 40% · 31 · 10%
- **4 s: 5% / 0% / 25% / 30% / 50% · 28 · 8%**
- 6 s: 5% / 0% / 25% / 35% / 60% · 28 · 9%
- 8 s: 5% / 0% / 30% / 40% / 60% · 26 · 9%
Viruses per run drop ~25–30% (the TEV goes to other units: Worms per L4 run 16 → 20). Stacking roughly halves; what's left is Viruses spawned seconds apart finding the same tower later. Beyond 4 s nothing improves (20 seeds is noisy at ±10 points).

Ledger with cooldown + Virus tax (avg off target): L1 0.34, L2 0.29, L3 0.24, L4 0.27, L5 0.29. L3–L5 now open at 0.8–0.9 and fall to ~0.35 by the end — the "too easy late" shape is back on paper, but the ledger's flat tax can't show the drain spiral, and the sim still loses 30–50% of L4–L5 runs. Next: Jogo's playtest, then step 2 (Virus schedule / TEV growth per level).
Verdict (Jogo's playtest): **failed L3** — "just about keeping up but the Virus attrition got me." L3's physical layout (wide, short, two entries) makes it harder than the others; consistent with the sim's wave 1 burst and the ledger's Virus-tax read. Decision: **no more small value changes for now.** Jogo reviews the Ledger first and comes back with questions before any further changes.

### E12 — Ledger v5: Jogo's review (2026-10-21)
Jogo's questions and the answers are in `TDX_Ledger_Review.md`. All its proposals are in:
- **Campaign pressure**: one Pressure line (worst of throughput, tank, burst, Virus tax included) against the target. Virus waves are shaded, darker for more Viruses. A "Show the parts" tick brings back the three part lines.
- **Shaping dials** replace the What-if knobs. They work on one level at a time: Virus first wave, Last wave size (a TEV ramp), Start Tokens, Wave 1 cap. A box under them says what to change in `config.js`. Preview only; nothing is saved.
- **Level summary** cards: a small pressure-vs-target curve and a verdict (Too easy / On target / Too hard, from the average signed distance, ±0.1).
- **Calibration** (was Model assumptions): collapsed by default, each value says whether it's a guess or sim-measured (E7, E10).
- Sections named: Shaping dials, Calibration, Campaign pressure, Level summary, Enemy arrivals, Fill rate, Wave table, Tower value, Enemy value, How the ledger works.

Read: L3 is **On target** and the other four say **Too easy**, mostly because pressure falls in the second half of each level while the target climbs. Play (and the sim's 30–50% L4–L5 losses) says otherwise. That gap is the Virus spiral the flat tax can't show, so the late-level verdicts are optimistic.

### E13 — Virus damage 15 → 10 (2026-10-21)
Jogo's call: less drain on the player's Tokens and more time to react. `ENEMIES.virus.attack.damage` 15 → 10 (reload 0.8 unchanged), so Virus DPS goes from 19 to 12.5 at L1 and from 28 to 19 at L5. A Threader now lasts about 8 s at L1 and 5 s at L5, instead of 5 s and 3.5 s. Tests: 75/75.

Sim, reactive bot, 20 seeds. Runs lost L1…L5, with towers killed by drain per run on L3/L4/L5:
- 15: 5% / 0% / 25% / 30% / 50% · 26 / 60 / 75
- **10: 5% / 0% / 10% / 10% / 30% · 19 / 39 / 58**
Viruses per run are unchanged. Towers lost to drain drop by about 30%, and losses on L3–L4 fall the most. Virus tax re-measured with a new sim metric (`tokensLostDrain`: Tokens of towers lost, Vaults included), reactive bot, 30 seeds. Tokens lost per Virus, L1…L5:
- damage 15 (with the E11 cooldown): 103 / 83 / 123 / 189 / 204, about 167 weighted (E10 was ~200, before the cooldown)
- **damage 10: 72 / 49 / 80 / 118 / 150, about 113 weighted**
Ledger `virusTax` 200 → **110**. Every level now reads Too easy (average signed distance −0.16 for L3 to −0.34 for L1). Pressure opens at 0.44–0.94 and falls to about 0.25 by each level's end, while the target climbs.
Verdict: waiting on Jogo's playtest.

### E14 — Virus spawn cooldown check, and Virus spread (2026-10-21)
Jogo's playtest after E13:
1. L1–L4 are a bit too easy again, but not by much.
2. L5 is too hard: many Viruses, early.
3. The method feels right, and swinging between too easy and too hard is where we should be. He'd rather end up too easy than too hard.
4. Viruses, Cracks and Slices dominate. Worms are rare and Hacks uncommon. Revisit EVs when the last units go in, along with tower behaviour (e.g. Threaders defend themselves when attacked).
5. There's little ebb and flow within a wave. Later milestone.
6. The 4 s Virus cooldown doesn't seem to work.

Check (sim, reactive bot, 20 seeds, logging every Virus spawn): **the cooldown works.** L3 and L5 together had ~1,000 Viruses, and the smallest gap between two was exactly 4.00 s (median 10–13 s). What doesn't work is the *goal*: Viruses spawn apart, but a latched Virus stays put, so later ones reach the same tower. At damage 10 each drain lasts longer, and 14% (L3) to 19% (L5) of latched Virus time was two or more on one tower, worse than E11's 8%.

Fix: a Virus looking for a tower prefers one no other Virus is draining. It only stacks when every tower in scan range is already taken (`entities.js`; towers carry a `drainer`). Stacked share: **14% → 2% (L3), 19% → 2% (L5).** Runs lost, L1…L5: 5 / 0 / 10 / 10 / 35% (was 5 / 0 / 10 / 10 / 30%; within noise). Two new tests; 77/77.
`spawnCooldown` is generic per enemy type, so any unit can use it (e.g. Worms or Bugs later).
Verdict: M3 banked after this (Jogo). Points 1, 2, 4 and 5 move to the M4 list.

---
## M4 ideas found during M3 (not decided — collected so they aren't lost)
- **Viruses dominate the second half of every level** (Jogo, E11). Play collapses into the Vault-and-Threader loop (E8).
- **Defrag → anti-virus unit** (Jogo): Defrag is useless as it stands; rework it to target Viruses specifically. Adds an offensive answer to the drain alongside the purely defensive Vault loop. Fits E8's finding that "First" targeting ignores a latched Virus while others stream past.
- **Targeting rules:** a tower (or mode) that prefers latched/attacking enemies.
- **Virus behaviour:** ignore Vaults or prefer the most valuable tower (breaks the decoy loop). (Avoiding a tower already being drained is done, E14.)
- **From the E13 playtest:** L5 opens with too many Viruses too early; L1–L4 slightly easy. Unit EVs (Worms rare, Hacks uncommon, Viruses/Cracks/Slices dominate) once the last units are in. Threaders defend themselves when attacked. More ebb and flow within a wave.
- **Show a Virus stack** (offset or "×2" badge) so two never look like one.
- **Tower value:** DDOS earns its place by range (out of Virus scan), not damage; Compressor probably rubbish; Pulse untested. Joint M3/M4 (E9).
- **Bugs into rosters:** they hunt towers anywhere, punishing a single killing ground.

Next in M3: Jogo tries Ledger v5 and the Shaping dials. Then step 2 (Virus schedule and TEV growth per level), using the dials to preview it.
