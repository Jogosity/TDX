


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
- [ ] READY - Add a Welcome screen at the start of the tutorial to set up the context of the game.
	- [ ] This screen will always display at the start of the tutorial on replays.
	- [ ] Welcome_screen.png is available for reference
	- [ ] The text is available in the Tutorial Tab of the TDX_Text file
	- [ ] All text will use a teletype reveal and the teletype sound effect
	- [ ] The screen will reveal each section in sequence
		- [ ] 1. "Welcome_line_1_Title" will appear, then a short pause
		- [ ] 2. "Welcome_line_2" will appear, then a short pause
		- [ ] 3. "Welcome_line_3" and "Welcome_line_4"  will appear in quick succession, then a short pause
		- [ ] 4. Five avatar images will appear on the screen in sequence. Use a scale and rotate effect as if they are dropping onto the screen, start with the images slightly larger than they appear on the final static.
			- [ ] Use a Teletype key sound effect as each one lands.
			- [ ] Pause for a short time after the 5th image
		- [ ] 5. "Welcome_line_5" will appear, then the prompt button, which use "Welcome_line_6_prompt"
		- [ ] The following images will be used on the welcome screen
			- [ ] Av_PersonSetA_1_S.png
			- [ ] Av_CompanyStyleB_13_S.png
			- [ ] Av_PetStyleB_7_S.png
			- [ ] Av_PersonSetB_5_S.png
			- [ ] Av_OrgStyleB_7_S.png
- [ ] NOT READY - Scale the BP drops to the EV of the enemy. Use the Hack and the basis.
	- [ ] Lower EV units have a lower likelihood to drop a BP, larger RV units have a larger chance of a drop.
	- [ ] This reduces the BP-drop spam from swarm enemies.
	- [ ] It is part of spreading out the upgrade and unlock paths.
- [ ]  NOT READY - Extend Bits economy. Longer unlock path, more ways to earn bits. 
	- [ ] Adapt economy for longer rollout of features.
	- [x] Daily Quests are a new Bits income path
	- [ ] More Bits to upgrade the towers, especially the T3 and T4.
	- [ ] Increase the number BPs to unlock a tower - focus on the later towers. Leave the unlocks of Vault and Defrag at their current initial unlock. (We want the player to get the variation going to make the game more fun)
	- [ ] Maybe even a few expensive Bits purchase to start each level with +50 Token.
	- [ ] Add an item store
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


