


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


Phase 3
- [ ] Build Towers 8 and 9 (on hold)
- [ ] Build Enemy 8 and 0 (on hold)




---

# Milestones

The game is intended as a 360° demonstration of game craft — each milestone should be a complete, presentable exhibit, not just a feature dump. Version bumps only when a milestone's full feature set has landed.




## M5 - "Elm" (v1.05) - Balance and Expansion
- [x] Create a better Editor tool to manage the enemy composition and TEV and MAEV ✅ S17 (`Code/tools/editor/`)
- [x] Increase level count to 10 - experiment with size/shape and play length - eg. much higher TEV for later levels. ✅ S17 (L6–L10 drafts; shape them in the editor)
- [x] NEW - Add a pie chart to the Ledger for each level showing the typical token income from the various enemy types. I want to be able to see where the income is coming from when the balance skews to too easy. (Hypothesis: the swarm attacks reward too highly) - Claude to do on Tuesday mornng. ✅ S18 (Ledger → Token income)
- [x] Swarm rewards overheating the economy: Slice 9, Stinger 21 by the per-HP rule ✅ S18 (see `TDX_AI_Balance_Notes.md`)
- [x] NEW - Stinger and Bug units not doing enough work. Maybe too easy to kill before they have an impact. Jogo to tweak.
- [x] Replace the L2–L5 `genWaves` scaffolds with hand-tuned waves; CRASH cost-cap and BP drop rates (from M3).
- [x] Work through the "M4 ideas" list at the end of `TDX_M3_Difficulty_Plan.md`: L5's early Virus count, unit EVs (Worms rare, Hacks uncommon), Defrag as an anti-virus tower, targeting rules, Virus behaviour, tower value (DDOS, Compressor, Pulse), the Ledger's Virus spiral, L3 layout.
- [x] Look at ebb and flow within waves - perhaps using flow rate and "invisible" sub waves during a single wave.
- [x] Upgrade values from one rule (`UPGRADE.valueShare` 0.6) ✅ S19 (see `TDX_AI_Balance_Notes.md` F4)
- [x] NEW (S21) - Blueprint spread across 10 levels: same system, but no level without BPs until every tower is unlocked. Now: L4, L7, L9, L10 have empty pools; each tower has one primary level. ✅ S21 (L1–L8 spread, see Devlog)
- [x] NEW (S21) - Investigate a massive-attack mechanic: an overwhelming "panic moment" wave event. Built as Breach Surge (option 1).
- [x] NEW (S21) - Place surges per level: one per level from L4, ~75% through, 0.3–0.5. Tune after playtest.
- [x] Watch the economy after the F4 upgrade change; revisit upgrade prices (`costMult`) if Tokens run hot or cold.
- [x] Expand on Tower Upgrade system - consider "abilities" as an upgrade as well as just firepower. Eg. Threaders can become more defensive of neighbours. DDOs can look for concentrated packs. If this doesn't work, purely numeric boosts is always a solid fallback.
- [x] Return to formal balance management to close Milestone
- [x] NEW (S21) - Missing avatar: `Av_OrgStyleB_7_S.png` is referenced in the content CSVs but not in `Code/assets/avatars/`.
- [x] Update QuickStart (still at Session 17) before banking v1.05. ✅ S22
- [x] REMINDER (S21) - Stinger reward: HP is now 80, so the F1 swarm rule gives 24. ✅ S21 set to 24.



## M6 - "Goto" (v1.06) - Publishing to Github Pages
- [x] Set up a Github page ✅ S21 (live at https://jogosity.github.io/TDX/)
- [x] Get TDX deployed to that page automatically ✅ S21 (`.github/workflows/pages.yml` publishes on every push to main)
- ➜ Moved to backlog (S21): custom domain punkarcade.net.




## M7 — "Fortran" (v1.07) — Onboarding & Presentation
Last of the main beats: onboarding teaches the *final* systems and depends on tuned difficulty.


- [ ] UI/UX improvement to narrative screens
	- [x] READY - Add small, pale grey "Data at risk" header above the Data class line on the Archive Details screen (see new screen mockup Archive_Details_Screen-UPDATE_7th_Nov.png)
	- [x] READY - Remove the "Victim Under Attack" banner and chevrons from the Archive Details screen.
	- [x] READY - Fix max height of Archive details screen to not overflow on iPhone. Add a scroll bar for long text blocks. The Scroll bar should be invisible when not used. (The Tail Feathers data set is particularly long and useful as a test case)
	- [x] READY - Increase the granularity in which  Archives as assigned to levels. Initially this will be "Human Early" "Human Late" "Business Early" and "Business Late"- which allows more in depth narratives to be hold over to later in the game.
	- [x] READY - Add an "Archive Class" column to the Levels tab, to define what Archive Classes can be used on that level. Later levels can use more than one phases, separated by commas.
	- [x] READY - Add an overlay to the Archive Details screen when players play the Tutorial level. The overlay will explain what the various bits of text mean. (Screen mockup at Archive_Details_Screen_Tut.png)
		- [x] Tap the "Continue" button on that overlay in order to reveal the standard Archive Details Screen.
		- [x] The overlay will show everyt ime the player starts the tutorial level.
- [ ] TUTORIAL LEVEL
	- [x] READY - Create a new Level 0 for use as the tutorial level.
		- [x] Use the Level 0 description and Tutorial Archive
	- [ ] READY - Use the existing editor to define a custom shape for the level (Jogo to do this, long and narrow)
	- [x] READY - Customise the settings for Tutorial level. Just 3 waves, 500 starting tokens, small TEV and MAV
	- [x] The Tutorial level can be played normally, before the formal FTUE is implemented. ✅ S23
- [ ] FTUE SEQUENCE
	- [x] READY - Create a formal, step-by-step tutorial that directs players what to press and what will happen. Will take place on the new Tutorial map. ✅ S24 (js/tutorial.js)
	- [x] READY - Override all of the players unlocks and upgrades the Tutorial mission. Lock all towers apart from Threader in wave1, and Threader and Vault in wave 2)
	- [x] READY - Place the Threader selection and placement tutorials on Wave 1 of the Tutorial mission.
	- [x] READY - Place the Vault selection and use tutorials on wave 2.
	- [x] READY - Place the Repo defence tutorials on Wave 3 of the tutorial.
	- [x] READY - Create Tutorial Box suite that includes a Text panel, pointer allows and button highlighters. (Screen design found in the Screens folder.)
	- [x] READY - Add a special overlay over the Archive Details Screen before the the Tutorial Mission - see the mockup "Archive_Details_Screen_Tut.png"
		- [x] This overlay should always show when the player selects the Tutorial mission. When the player taps "continue" the overlay will dispel and the normal Archive Details screen is now visible.
	- [x] READY - Add a new Tutorial tab to the Text Table to contain all tutorial text.
		- [x] READY - Pull the tutorial text in from the Tutorial CSV - it should match the Tutorial screen mockups. But I may edit the text in the CSV to make changes.
	- [x] READY - Improved Tower Upgrade screen.
		- [x] Screen mockup in the usual place called, "Towers_Info.png"
		- [x] Include chevrons to indicate current Tier, highlighted chevron to indicated an available upgrade, pale chevrons to indicate non-avilable upgrades. (Because you don't have enough Bits.)
		- [x] Add a description of what the next upgrade will offer
		- [x] Display the current number of bits the player owns.
		- [x] Use a scroll-bar because the list is too long for the screen.
		- [x] READY - Put a of Red-Dot notification icon on each tower entry in the towers menu counting the number of upgrades the player can afford to that tower.
	- [x] READY - Add a red-dot notification icon to the Towers button on the main menu if the player has enough Bits to buy an upgrade. Use a 1,2,3 or 3+ digit in the red dot to show how many upgrades the player can afford.
- [x] READY - Add a light-up sequence to the 3 arrows on the Deleter unit to show when it will fire. (One... two... three... fire)
- [x] READY - Screenflow update. After a successful level, the Battle report screen should have two buttons “Next Level” (right and side, bright blue) and “Main Menu” (left hand side, dark colour)
- [x] READY - remove the pointer arrows from the Tutorial screen 5 (place a vault). It is better to let the player choose where to put the vault)
- [ ] Polish backlog: lateral map asymmetry, effect variants, remaining small items.
- [x] Juicy Blueprint pickup FX (bigger collect effect), carried from M2 sign-off via the old M6. ✅ S21 (Blueprint swoop to the tray button)


New MS - Sound - will go here...


## M8 — "Hypercard" (v1.08) — Re-engagement
After the sim: quest/login rewards feed the economy, so they tune against a balanced game.

- [ ] Finish the Daily Quests design in the design doc (still cut off at "Eg.").
- [ ] Retention Module 4 — Re-engagement: daily logins, quests, BITS hooks.
- [ ] Extend Bits economy. Longer unlock path, more ways to earn bits. An additional T5 unlock that allows you to auto-build the tower at T2 for T2 price. (No need to build a T1 version. Option shown on tapping to build.)
- [ ] Maybe even a few expensive Bits purchase to start each level with +50 Token.




## Backlog — low priority (S21)
- [ ] Add my custom domain (punkarcade.net) to the site. Yes. I do own this!


## Content backlog — ON HOLD (no milestone yet)
Specced in TDX_Towers_and_Enemies.md. If any return after M3, re-run the difficulty sim with them in.
- [ ] Limiter (Tower that slows enemies, but is expensive)
- [ ] Data Mine (Temp tower that explodes after a few seconds delay)
- [ ] Cypher (Enemy that can teleport, untargetable while teleporting)
- [ ] Expand game to 15 or 20 levels
- [ ] Add a T5 upgrade to all towers that builds them at T2
- [ ] Reloop - (Tower that goes around and heals damaged towers)

- [ ] Bit Rot (Enemy contact damage aura; Limiter slows movement, never damage).
- [ ] Tracer (laser-beam weapon class)
- [ ] Overclock (adjacency damage-buff aura).
- [ ] Turtle (Enemy super-heavy tank).
- [ ] Retention Module 5 — Collection (secondary).


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


