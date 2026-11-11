# TDX M9 "Integer" (v1.09): Difficulty Settings Plan

Status: **planning (2026-11-11).** This covers the "Difficulty levels Basic and Advanced" item in `TDX_Todos.md` (M9). Daily Quests is being built in a separate thread at the same time. Sources: `TDX_Todos.md` (Mac copy of 11 Nov) and the v1.08 code (`save.js`, `game.js`, `ui.js`, `story.js`, `levels.js`, `tools/sim/`).

## The idea, in one line
The game as it is balanced today **is Advanced**. Basic is the same level with a lighter enemy delta. Every level unlocks on Basic, and clearing it on Basic opens it on Advanced.

## What I found in the code
- **Enemy delta** (`LEVELS[i].enemyDelta { health, damage }`) is read in two places only: `WaveController` and the debug spawn. Both pass it to `new Enemy(...)`. One function that returns the effective delta for the chosen difficulty covers both, so there's no need to touch the balance in `levels.js`.
- **The save only knows `levelsUnlocked`** (the frontier index). It has no record of *which* levels were cleared, so it needs a new per-level, per-difficulty clear record. That means a save migration (v2 → v3).
- **L0 and L1 have a delta of 1.0.** A rule that only shrinks the part *above* 1.0 would leave Basic L1 exactly as hard as Advanced L1. So Basic has to scale the whole multiplier (see D1).
- **Bits pay out on every win**, replays included (`onWaveComplete`). See D3.
- **Next Level** goes through a reload with `sessionStorage['tdx-next-level']`. The difficulty can be carried the same way.
- **The Analytics screen** (`story.showAnalytics`) builds its rows from `strings`, so the difficulty line just needs a new string.

## Order of work
1. **Config and engine.** Add `DIFFICULTY` to config.js: `{ basic: { health: 0.8, damage: 0.8 }, advanced: { health: 1, damage: 1 } }`, with a helper `effectiveDelta(level, difficulty)`. `s.difficulty` is set by `startRun(idx, difficulty)`, and the debug spawn uses the same delta. Tests: Basic multiplies both stats, Advanced matches today exactly, and the Tutorial ignores difficulty.
2. **Save v3.** Add `cleared: { basic: [levelIdx...], advanced: [...] }` plus helpers `isCleared(save, i, diff)` and `advancedOpen(save, i)`. Clearing on Basic unlocks the next level, the same way `levelsUnlocked` works now. Clearing on Advanced also counts as a Basic clear. The migration is described in D4. Tests: the migration, unlock order, and the "Advanced needs Basic" rule.
3. **Level Select lozenges.** Each level row gets two pills, BASIC and ADVANCED:
   - Locked level: no pills (the row stays dimmed as it is now).
   - Unlocked, not cleared: BASIC shows outlined/grey, ADVANCED is hidden.
   - Cleared on Basic: BASIC shows in full colour, ADVANCED shows greyed.
   - Cleared on Advanced: both show in full colour.
   - The delta line shows the difficulty you'd play next (or both, if that fits on a phone).
4. **Difficulty pop-up.** Tapping a level that only has Basic open starts it straight away. If Advanced is open, a pop-up shows the level number, "Select difficulty", and **Basic** / **Advanced** buttons, plus the existing Cross icon to cancel. The Level Select PLAY button opens the same pop-up for the selected level. Strings go in the Strings table so you can reword them.
5. **Next Level and Results.** Next Level keeps the difficulty you just played if Advanced is open on the next level, otherwise it silently plays Basic (see D5). The Analytics Report gets a "Difficulty: Basic/Advanced" row. I'd also add a small tag in the HUD next to "Level N" (D6).
6. **Debug (Economy tab).** Add "Clear level on Basic" and "Clear level on Advanced" for the selected level, and make "Unlock all levels" / "Lock all levels" also set or wipe the clear records.
7. **Sim and Ledger check for X.** Add a `difficulty` option to `runLevel` and a Basic column in `tools/sim/run.mjs`. Run the live and skilled bots on L1–L10 at both difficulties. The goal is that the weaker "live" bot clears every level on Basic and Advanced stays exactly where it is. Then pick X from the sweep (15 / 20 / 25 / 30%) and log the result as a finding in `TDX_AI_Balance_Notes.md`.
8. **Ship.** Test on iPhone, then update the devlog, QuickStart and tests. The v1.09 tag waits for all of M9 (Daily Quests too).

## Decisions for Jogo (my recommendation first)
**D1. How Basic nerfs the delta: scale the whole multiplier, starting at 20% off health and damage.** For example, L5's ×1.6 HP becomes ×1.28, and L1's ×1.0 becomes ×0.8. Health and damage get separate numbers in config so either can be tuned alone, and the Sim sweep in step 7 sets the final X. (The other option, shrinking only the part above 1.0, does nothing to L0 or L1.)

**D2. The Tutorial (L0) has no difficulty choice.** It always plays as it does now, with no pills and no pop-up, and clearing it unlocks L1 on Basic.

**D3. Bits are the same on both difficulties for now.** Bits economy changes belong to the "Extend Bits economy" item, which is still NOT READY. A later option is a one-time Bits bonus for the first Advanced clear of each level, which gives players a reason to go back.

**D4. Existing saves: every level already cleared counts as cleared on both Basic and Advanced.** Those levels were beaten at today's balance, which *is* Advanced. The current frontier level opens on Basic only. Nobody loses progress.

**D5. The Next Level rule. Please confirm my reading.** The Todo says "If the next level has not been completed on Advanced, the game will silently revert to Basic." Read word for word, you could only play Advanced through Next Level on a level you've already *beaten* on Advanced. I think the intent is "if Advanced isn't open yet on the next level" (that is, it hasn't been cleared on Basic), so that's what I'd build. Played on Advanced → next level on Advanced if it's open, otherwise Basic. Played on Basic → always Basic.

**D6. Show the difficulty in the HUD too** (for example "Level 4 · ADV" next to the level name), so a screenshot or a mid-level glance tells you which one you're on. This is small, and easy to drop if you don't want it.

## Overlap with the Daily Quests thread (agreed between the two threads)
- The Daily Quests thread adds its own `quests` block to the save, which fills itself in without a version bump. This plan owns the `SAVE_VERSION` 2 → 3 bump.
- That thread also takes the two READY debug tweaks (Economy tab moved to the left and opened by default, Complete Tutorial button). The difficulty debug buttons go in after those land.
- One quest ("Win a level on Advanced") reads `state.difficulty` and `save.cleared` through `advancedOpen()`, so those names stay stable.
