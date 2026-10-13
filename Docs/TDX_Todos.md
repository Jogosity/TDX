
**Tweaks**
- [x] Add a version number to the Main Menu in the game. We will start at v1.01 - Altair ✅ S9: `VERSION` in config, shown bottom of Main Menu home
	- [x] We will increment the build number at the conclusion of each milestone.
	- [x] Version numbers will also have a codename that increments in alphabetical order. We'll start at A and the designation v1.01 to keep everything aligned. List of A to K designations below.
	- [x] Version numbers are only bumped when the full feature set for that milestone has been landed. (Rule noted in config comment — M2 closes as v1.02 Basic)
- [x] Display the enemy level delta on the Level Select - ensure Level Delta is fully implemented and working ✅ S9: verified (HP scale + damage mult incl. Virus) + shown per level row
- [x] Add a per-level Starting budget to the config, rather than re-using the same starting budget for all levels. ✅ S9: `LEVELS[i].startTokens` 300/340/390/450/520 (best-guess — hand-tune)
	

**Version IDs**
Altair - Start here V1.01
Basic
Cobol 
Disc drive
Elm
Fortran
Goto
Hypercard
Int
Java
Kernel

**Major Feature - Tower and Enemy Expansion**
	 - See the document TDX_Towers_and_Enemies.md

**Phase 1 and 2 of New Towers and Enemies**
- [x] Build Tower 6 and 7 (Pulse and Compressor)
- [x] Build Enemy 6 and 7 (Bug and Stinger) ✅ S12
- [x] Add a double stacked for the Tower cards. ✅ S11
- [x] Include new enemies in the debug menu so that they can be insta-spawned. ✅ S12
- [x] Add a Pause/Unpause Spawning button to the Debug menu. ✅ S11 This will pause the natural enemy spawn, but allow the spawning of enemies via the debug menu.


Phase 3
- [ ] Build Towers 8 and 9 (on hold)
- [ ] Build Enemy 8 and 0 (on hold)




---

# Milestones

The game is intended as a 360° demonstration of game craft — each milestone should be a complete, presentable exhibit, not just a feature dump. Version bumps only when a milestone's full feature set has landed.

## M2 — "Basic" (v1.02) — Tower & Enemy Expansion — IN PROGRESS
New units land in small phases with playtest + iteration between each. No rushing units to "done" — they mature across phases.

- [x] **Phase 1 — Tweaks** ✅ S9 (version display, per-level budgets, delta verify + Level Select display)
- [x] **Phase 1 — GitHub repo** ✅ S10: local repo at project root (initial commit tagged v1.01-altair, stray Code/sim.mjs removed, backup procedure in QuickStart) → published private to github.com/Jogosity/TDX via GitHub Desktop. CLOSED
- [x] **Phase 2A — Familiar-weapon towers**: Pulse (burst rifle — mostly config) + Compressor (pump shotgun — multi-pellet cone). Playtest, iterate. ✱ S11: first pass landed (both towers, double-stack tray, debug spawn pause, 56 checks) — awaiting playtest
- [x] **Phase 2B — Simple enemies**: ✱ S12: first pass landed (debug SPAWN only — wave rosters at M3 start, 66 checks) — awaiting playtest. Bug (Tower hunter - ignores base - details updated in TDX_Towers_and_Enemies) + Stinger (Fast base attacker, non-optimal route. Details updated in TDX_Towers_and_Enemies
- [ ] **Phase 3A— (ON HOLD) New-system towers**: Tracer (laser-beam weapon class) + Overclock (adjacency damage-buff aura). Playtest, iterate.
- [ ] **Phase 3B — (ON HOLD) Exotic enemies**: Cypher (teleport, untargetable while phased) + Bit Rot (contact damage aura; Limiter slows movement, never damage).
- [ ] **Phase 4 — Integration + close**: BP regions (Tracer→L2, Compressor→L3, Pulse→L4, Overclock→L5), new enemies into L2–L5 rosters, tests per mechanic, bump to v1.02 Basic.

## M3 — "Cobol" (v1.03) — Secure & Simulate
Requires the M2 roster settled first — new units add too much noise to balance against a moving target.

- [ ] Grow `tests/sim.mjs` into the headless difficulty simulator (tower DPS vs real pathing, batch config sweeps, leak/spike reports).
- [ ] Full balance pass: all 5 levels × full roster; replace genWaves scaffolds with tuned waves.
- [ ] Sim-answerable parked questions: Limiter rebalance/return, crash cost-cap, per-level budget tuning.


## M4 — "Disc Drive" (v1.04) — Narrative and Content
Add a narrative system and content to give meaning to the game
Jogo to do all the creative. (lots of design to be done for this MS)
- [ ] Create a character a text panel system to convey narrative beats.
- [ ] Create a .MD file to allow easy management of the text and image assets
- [ ] Define the characters and factions 
- [ ] Write the characters and they dialogue

## M5 — "Elm" (v1.05) — Re-engagement
After the sim: quest/login rewards feed the economy, so they tune against a balanced game.

- [ ] Finish the Daily Quests design in the design doc (still cut off at "Eg.").
- [ ] Retention Module 4 — Re-engagement: daily logins, quests, BITS hooks.
- [ ] Retention Module 5 — Collection (secondary).




## M6 — "Fortran" (v1.06) — Onboarding & Presentation
Last of the main beats: onboarding teaches the *final* systems and depends on tuned difficulty.

- [ ] FTUE / tutorial + new-player difficulty on-ramp.
- [ ] Sound.
- [ ] Polish backlog: lateral map asymmetry, effect variants, remaining small items.


*End of doc*



