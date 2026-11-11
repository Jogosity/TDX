


**Version IDs**
Altair - Start here V1.01
Basic
Cobol 
Disc drive
Elm
Fortran
Goto
Hypercard
Integer
Java
Kernel




---

# Milestones

The game is intended as a 360° demonstration of game craft — each milestone should be a complete, presentable exhibit, not just a feature dump. Version bumps only when a milestone's full feature set has landed.





## M8 — "Hypercard" (v1.08) — Sound and Music ✅ COMPLETE 10 Nov
Add sound and music to all relevant areas of the game. Sourcing: synth SFX made in code + Meta Sound and Music tracks (swap for free/credit-required before any wider release).
- [x] UI Sound effects - button-tap noise (bleeps or clicks) - positive/forward movement and negative/backward movement. Error beep noise
- [x] UI Whoosh for major screens moving on (Eg. Results screen)
- [x] Music Loops
	- [x] Menu music
	- [x] Main game music — became the wave pool: a track runs for 3 waves, lowered between waves (Jogo, 10 Nov)
	- [x] Final wave game music — dropped in favour of the pool
	- [x] Victory sting
	- [x] Fail sting
- [x] In-game sound effects
	- [x] Weapon fire
	- [x] Enemy destruction
	- [x] Tower Destruction
	- [x] Virus/Bug attack warning (short spot effect when the attack starts, not a constant alarm)
- [x] New tool - Sound Mixer
	- [x] Allow testing and balancing of effects, eg. Tap a Threader icon to trigger the sound.
	- [x] Allow things like volume, speed, pitch and length changes.
- [x] Extras: anti-spam voice cap with priorities, SOUND settings tab, teletype + Cores count-up clicks

## M9 — "Integer" (v1.09) — Re-engagement
After the sim: quest/login rewards feed the economy, so they tune against a balanced game.

- [x] READY - Minor tweak - add a Complete Tutorial button to the Economy Debug Menu
- [x] READY - Minor tweak - move the Economy Debug menu to the left hand position and make it the default tab to open. Currently it is the Sound menu, which less commonly used that the Economy menu.
- [x] READY - Retention Module 4 — Re-engagement: daily play streaks, Daily Quests, BITS hooks. (Designs needed)
	- [x] Claude to come up with the Quests themselves. Simple, standard fare is fine. A list of about 12 should be enough with 3 quests active each day. Start off with metrics from the Analytics screen, maybe add some about building specific types of tower. See what you can come up with. 
	- [x] Add a button to reset quests to the Economy debug tab. (+ Complete all, Next day, Break streak)
	- [x] Quests should give a few Bits each. ✅ S27: Daily Quests panel, streak — see TDX_M9_Quests_Plan.md
- [x] READY - Difficulty levels Basic and Advanced (We balance the game for Advanced, which is me playing with full knowledge and skill, and the ledger saying we are right on the edge.) Basic, nerfs the Difficulty delta by X% across all levels. ✅ 11 Nov: Basic = ×0.8 HP and damage (js/difficulty.js, set in the Curve tool; F13). Plan: TDX_M9_Difficulty_Plan.md
	- [x] Interface - Difficulty is selected on the Levels menu
	- [x] The player must complete a level on Basic, in order to play it on Advanced
	- [x] Two new lozenges are added to each level box. These track what version of the level has been unlocked - Basic and Advanced.
	- [x] Levels unlock on Basic. 
	- [x] When the player has unlocked a level, but not completed it on Basic, the Advanced lozenge is hidden.
	- [x] When the player has unlocked a level, and has completed it on Basic, the Advanced lozenge is visible, but greyed out.
	- [x] When the player has unlocked a level, and has completed it on Advanced, the Advanced lozenge is in fully colour.
	- [x] When both difficulties are available, tapping a level to start it, will open a pop-up dialog box showing the number of the level (2,3,4 etc) and the prompt "Select difficulty"
		- [x] Two buttons "Basic" and "Advanced" appear on that menu. Tapping one starts the game on that difficulty.
	- [x] When the player completes a level, the "Next level" button will try to match the difficulty of the level just played.
		- [x] If the next level has not been completed on Advanced, the game will silently revert to Basic. (built as: drops to Basic only when Advanced is not open on the next level, Jogo 11 Nov)
	- [x] The Battle Analytics screen should state the difficulty that the level was just played on.
	- [x] Extras: HUD difficulty tag, Curve tool Basic knobs, Sim sweep (tools/sim/difficulty.mjs), Economy debug buttons, save v3 migration
- [ ]  NOT READY - Extend Bits economy. Longer unlock path, more ways to earn bits. 
	- [ ] Model economy for longer rollout of features.
	- [ ] More Bits to upgrade a tower, more BPs to unlock a tower.
	- [ ] Maybe even a few expensive Bits purchase to start each level with +50 Token.
- [ ] NOT READY - Daily Specials - New Towers that turn up on a random basis per-day and fit into Slot 8 - see Content Backlog for some ideas. (Would start with just 2)
- [ ] NOT READY - Firewalled enemies -  Shielded enemies that take less damage whilst shielded.
	- [ ] Firewalled enemies have a glow around them or some visual cue that makes them clearly a V2 of the base unit.
	- [ ] Some specialist towers rip shields to shreds allowing normal damage. (Deleter, Tracer)
- [ ] NOT READY - New Enemies - See Content Backlog for ideas





## Content backlog
Specced in TDX_Towers_and_Enemies.md. If any return after M3, re-run the difficulty sim with them in.
- [ ] Limiter Tower (slows enemies, but is expensive)
	- [ ] Already built. Needs Balancing
- [ ] Data Mine Tower (Temp tower that explodes after a few seconds delay)
	- [ ] Should be easy. Basic version explodes on a timer, or when attacked by Virus/Bug
	- [ ] Special Power - detonates on contact from any tower.
- [ ] Reloop  - Tower- Mobile tower that pathfinds through the maze to find damaged towers to repair
	- [ ] Works autonomously
	- [ ] Has very low health
	- [ ] Cannot pass through cells occupied by a tower/lockout/blocker/entrypoint.
	- [ ] Can pass mobile enemies
- [ ] Tracer Tower (laser-beam weapon class)
	- [ ] Medium range
	- [ ] Slow damage
	- [ ] Rips away shields very quickly
- [ ] Overclock Tower  - applies damage buff to adjacent towers.
	- [ ] T1 can only feed 1 tower, T2 can feed 2 etc.
- [ ] Cypher  (Enemy) can teleport, untargetable while teleporting.
	- [ ] Can teleport through blockers, vaults and towers
	- [ ] Will move a few sectors, then teleport a few sectors
- [ ] Bit Rot  (enemy) - Infected Tank
	- [ ] Moves slowly, has high health
	- [ ] Applies health loss to all player towers that it touches
- [ ] Trojan (enemy) - converts towers to enemies
	- [ ] Picks a random enemy to convert a tower to
- [ ] Spawner (enemy)
	- [ ] Delivers a set of Hacks to a specific point
- [ ] Glitch (enemy)
	- [ ] Picks a sector and converts it to a lockout
- [ ] Expand game to 15 or 20 levels
- [ ] Set up a Cloudflare account and link it to my Github, then swap the published version to Cloudflare and abandon the GitHub Pages and set my Repo to Private again


## Feature Backlog — ON HOLD low priority (S21)
- [ ] Add my custom domain (punkarcade.net) to the site. Yes. I do own this!
- [ ] An additional T5 unlock that allows you to auto-build the tower at T2 for T2 price. (No need to build a T1 version. Option shown on tapping to build.)


## Abandoned Backlog — ON HOLD
- [ ] Lateral map asymmetry: per-row sideways offsets so a board can lean or dog-leg (needs a `rowOffsets` level field + editor support). Moved from M7, 9 Nov.


*End of doc*


## MAD IDEA for M5
Build me a proper game editor where I can make simple drag and drop edits to the levels.

What enemies are in them
Drag and drop

What is the TEV and MAEV - sliders

Intensity curve - start, mid and end wave intensity
Pull points on a curve

Level design
Number of locked sectors, entry points - 
Sliders, hit shuffle
Min distance to base for entry points


