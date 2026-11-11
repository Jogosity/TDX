# TDX M9 "Integer" (v1.09): Daily Quests Plan

Status: **built (Session 27, 2026-11-11), awaiting playtest.** Hard Mode waits for Difficulty. M9 is Re-engagement. This plan covers Retention Module 4's first slice: **Daily Quests, a daily play streak, and the BITS hooks**, plus the two READY debug-menu tweaks. Difficulty (Basic / Advanced) is being built in a parallel thread. Sources: `TDX_Todos.md` (M9 list, Mac copy of 11 Nov), `General_Retention_Modules.md` (Module 4), `TDX_Retention_Modules.md`, the v1.08 code.

## What I found
- `TDX_Retention_Modules.md` still has Module 4 as a bare "NOT READY" heading, and the old "Daily Quests design … cut off at Eg." line has gone from the Todos. This plan becomes the design. Once agreed, I'll copy the summary into Module 4 so the retention doc is complete.
- **The quest numbers already exist.** `game.js` keeps per-level stats for the Analytics Report: `built, lost, upgraded, earned, spent, kills, leakedBy`. Quests can read these directly. Two are missing and are cheap to add: **kills by enemy type** (`killedBy`, next to `leakedBy`) and **builds by tower type** (`builtBy`).
- **BITS today** come only from level wins: 3 (L1) rising to 12 (L10), Tutorial 0. Tier unlocks cost 3 / 8 / 15 per tower, so the full upgrade tree for 7 towers is 182 BITS. A day of quests should be a useful top-up, not a replacement for playing levels.
- **Blueprints only drop for locked towers** (`rollBlueprints(..., isTowerUnlocked)`), so a "collect Blueprints" quest must not be offered once the collection is complete.
- `save.js` fills missing fields on load (the M8 `audio` block is the pattern), so quests can be added without a save version bump. The Difficulty thread can own any bump.
- The Economy debug tab sits second, after SOUND. Opening it by default and adding a Complete Tutorial button are the two READY tweaks.
- Tests: the M8 suite (`tests/sim.mjs`) is the baseline. I'll run it on the Mac before any change.

## How it works (player view)
- Each day the player gets **3 quests**, picked from a pool of 12 (plus 1 that waits for Difficulty). A new set arrives at **local midnight**.
- Progress counts up during play from any level except the Tutorial. A small toast in the HUD says when a quest is done ("Quest complete: Exterminator"), and the Results screen lists the quest progress that run made.
- Finished quests are **claimed on a new QUESTS screen** from the main menu. Claiming plays the Bits swoop and adds the BITS. A red dot on the QUESTS button shows how many are waiting, using the same dot style as TOWERS.
- **Streak:** every day the player claims at least one quest adds 1 to their streak. Missing a whole day resets it to 0. The streak is shown at the top of the QUESTS screen ("Streak: 4 days") with a longest-streak record underneath.

## The quest pool
Targets are first guesses. Before locking them, I'll size them with the Sim so a set of 3 takes **about 2–3 levels of normal play**. Numbers live in config, so they can be tuned without touching the logic.

| # | Name | Goal | Reads | BITS |
|---|------|------|-------|------|
| 1 | Exterminator | Destroy 150 enemies | `kills` | 2 |
| 2 | Construction Crew | Build 25 towers | `built` | 1 |
| 3 | Overclocked | Upgrade 8 towers | `upgraded` | 2 |
| 4 | Big Spender | Spend 5,000 Tokens | `spent` | 2 |
| 5 | Token Miner | Earn 4,000 Tokens | `earned` | 2 |
| 6 | Victory Lap | Win 2 levels | level wins | 2 |
| 7 | Firewall | Win a level without losing a Core | `leakedBy` empty | 3 |
| 8 | No Casualties | Win a level without losing a tower | `lost` = 0 | 3 |
| 9 | Lean Machine | Win a level with 10 towers built or fewer | `built` | 3 |
| 10 | Specialist | Build 6 **[tower]** | `builtBy` | 2 |
| 11 | Pest Control | Destroy 25 **[enemy]** | `killedBy` | 2 |
| 12 | Archaeologist | Collect 3 Blueprints | BP pickups | 2 |
| 13 | Hard Mode | Win a level on Advanced | Difficulty | 3 |

- **10 and 11 pick their target each day**: Specialist from the player's unlocked towers other than the Threader; Pest Control from enemies in levels the player has unlocked, with counts scaled for swarm units (Slice and Stinger ×3).
- **Eligibility rules**: 12 only while a tower is still locked. 13 only once the player has a level open on Advanced (lands after the Difficulty work, reading its `state.difficulty` and `advancedOpen(save, i)` helper, agreed with that thread). 9 and 8 never appear together, so a day doesn't ask for two "win clean" runs.
- **A day's set** is always one easy count quest (1–5), one medium (6, 10–12) and one challenge (7–9, 13), so every day has something quick to tick off.
- A full set pays **5–7 BITS a day**, a bit less than one L5 win.

## Order of work
1. **READY debug tweaks**: Economy tab moves to the left and opens by default; a Complete Tutorial button goes in it.
2. **Quest engine** (`js/quests.js`, no DOM, so the tests and Sim can use it): the pool in config (`QUESTS` with id, tier, stat, target, BITS, eligibility), a daily pick seeded from the date so the same day always gives the same set, progress updates from game events, claim, and the streak rules. Save block: `quests: { day, set, progress, claimed, streak, bestStreak, lastClaimDay }`.
3. **Game hooks**: add `killedBy` and `builtBy` to the level stats; send build / upgrade / kill / BP / level-end events to the quest engine; toast on completion; quest lines on the Results screen.
4. **QUESTS screen**: button on the main menu next to LEVELS / TOWERS / ENEMIES, the 3 quest cards with progress bars, claim buttons, the streak header, a "new quests in 6h 12m" countdown, and the red dot. Names and descriptions go in a new **Quests** tab of `TDX_Text.numbers` (StringID, Text) so you can reword them without code, like the narrative.
5. **Debug (Economy tab)**: Reset quests (new random set, progress cleared), Complete all quests, Next day (moves the quest clock forward one day to test the rollover and streak), Break streak.
6. **Tests and Sim**: same date gives the same set; rollover at midnight; eligibility rules; progress and claim; streak counting, reset, and clock changes; old saves loading cleanly. A Sim pass for the quest targets per level.
7. **Ship**: Quest 13 once Difficulty lands, playtest on iPhone, devlog and QuickStart, Module 4 written up in the retention doc. v1.09 waits for the rest of M9.

## Decisions for Jogo (my recommendation first)
**D1. Quests are claimed by tapping on the QUESTS screen, not paid out automatically.** The claim moment is the reward reveal the retention doc talks about, and it gives the player a reason to visit the menu each day. Progress itself is automatic. *Alternative:* auto-pay at the end of a level, simpler, but the reward is easy to miss among the Results screen numbers.

**D2. The streak counts days with at least one quest claimed**, not days played. It ties the streak to the quests and stops "open the app and close it" from counting. No streak rewards yet: the counter and the record come first, and streak milestones (bonus BITS at 3 / 7 / 30 days) and streak freezes can follow once we see how it feels. *Alternative:* a 7-day login calendar with a ramping reward, the classic version, but it's a second system to build and tune.

**D3. Progress counts in lost levels too**, except for the "win a level" quests. A loss still built towers and killed enemies, and it makes quests a comfort for a bad run. The Tutorial never counts, so it can't be farmed.

**D4. One free reroll per day.** The player can swap one quest they don't like (for example, a Specialist for a tower they never use) for another from the same tier. It's a small addition that heads off "I can't do that one" frustration. *Alternative:* no rerolls, simpler and purer FOMO.

**D5. The day turns over at local midnight on the device clock.** A player who changes their clock can farm quests. That's acceptable for a single-player web game with no store. *Alternative:* a fixed UTC reset, fairer to compare between players, but it would turn over mid-afternoon for some players.
