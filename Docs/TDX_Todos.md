


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



## M4 — "Disc Drive" (v1.04) — Narrative and Content
Add a narrative system and content to give meaning to the game.
This will be achieved through information screens before and after each level.
Jogo to do all the creative. (lots of design to be done for this MS)

- [x] Create a character a text panel system to convey narrative beats.
	- [x] These screens have been designed - they can be found in the folder: Users/Jogosity/Library/Mobile Documents/iCloud~md~obsidian/Documents/JogoHome/1_projects/05_TDX/Assets/Screens
	- [x] There are 3 screens  - The Level Data screen, the Archive Data Screen and the Level Results Screen.
	- [x] These fit into the current screen flow in this order. 1. Main Menu. 2 Level Data Screen. 3. Archive Data Screen. 4. Gameplay. 5 Level Result Screen Win or Loss.
	- [x] I have provided a few versions of each screen - one with the type of content we can expect in the final game, and one called BLANK that simply names the text strings we will need for each piece of content.
- [x] I will provide the icons and buttons necessary to build the pictorial elements of the screen. But the basic furniture of frames and blocks can be generated at runtime.
- [x] We'll need to create a .MD file to allow easy management of the text and image assets
	- [x] The MD file will need a set of named strings for each Level and Archive.
	- [x] The Level Data screen shows some framing narrative. Each level will have a single specific Level Data screen.
	- [x] The Archive Data screen is show just before the level starts. It is a more specific piece of narrative framing and describes in detail the owner of the data archive that the enemies are attacking in the game.
	- [x] The Archive Data will pull from a pool of content. Typically an Archive Data will be a bio of a person of company and an associated avatar or logo.
	- [x] I will create the basic MD layout for the Level Data and Archive Data content. This will match the images of the screens.
	- [x] The Level Results screen shows the win/lose state and relevant win/lose icon.
		- [x] The level result also shows she number of memory cores remaining. With colour coding of Yellow meaning win, and red meaning lose.
		- [x] The level result screen shows the Icon of the Archive being attacked in this level.
		- [x] The level result screen shows the memory summary of any memories stolen during the attack. This keeps the amount of data on the screen low enough to be readable.
		- [x] The INFO button in the level result screen should popup the Archive Data screen so that people can remind themselves of the narrative strands. (This pop-up screen will have a BACK button to take you back to the level results screen)
- [x] How does the memory narrative system work?
	- [x] Each archive contains the details of a person or organisation.
	- [x] Archives can only have one person or one organisation.
	- [x] The Bio, Type and Description fields are just text strings that I can use to give a variety of context to the game.
	- [x] Archives have Core Memories and Secondary Memories.
		- [x] Core Memories are really important things to the person or org.
		- [x] Each Archive can have several Core Memories.
		- [x] Only ONE Core Memory is ever selected to be shown on the Archive Data in each game. The selection is random.
		- [x] Each archive can have lots of Secondary Memories
		- [x] Only 3 Secondary Memories are selected to be shows on the Archive Data screen in each game. The selection is random.
		- [x] OnlyCore or Secondary memories actually selected for that particular game can be lost.
		- [x] Lost Memories are listed on the Level Results screen.
		- [x] The number of Memories lost is based on the number of Cores in that level. The more Cores you lose, the more Memories are subsequently lost.
		- [x] You do not lose one memory per core. Instead you lose one memory for every 4 Cores lost. Since we have 15 Cores right now, you always lose the Core Memory when you are reduced to just 1 remaining Core. This means you can lose all memories but still win the level. Something of a pyrrhic victory.
		- [x] We might end up with different numbers of Cores in future levels. If this happens we'll use a formula to spread out the Memory loss rather than hard numbers.
	- [x] Because the content is stored in an MD file, I should be able to add content regularly without needing to refactor the game.
- [x] The value of the Memory Narrative system is that I can tell an interesting emergent story using really simple tools. For example, one of the Organisations you have helped defend, could end up emerging as a hostile actor that is actually performing the attacks. This will be a fun thing to write.

- [ ] Jogo - Define the characters and factions and write their content - IN PROGRESS


- [x] Game features - Units - Add Bug + Stinger  to the L3–L5 wave rosters. Then a quick Sim + Ledger check so M4 doesn't undo M3's balance.
- [x] Game features - UX - Warning when towers are under attack (Virus drain especially). From M6. (See Virus_Attack_Warning.png)
- [x] Game features - UX - Clear message when a new tower has been unlocked. From M6.



## M5 - "Elm" (v1.05) - Balance and Expansion
- [x] Create a better Editor tool to manage the enemy composition and TEV and MAEV ✅ S17 (`Code/tools/editor/`)
- [x] Increase level count to 10 - experiment with size/shape and play length - eg. much higher TEV for later levels. ✅ S17 (L6–L10 drafts; shape them in the editor)
- [x] NEW - Add a pie chart to the Ledger for each level showing the typical token income from the various enemy types. I want to be able to see where the income is coming from when the balance skews to too easy. (Hypothesis: the swarm attacks reward too highly) - Claude to do on Tuesday mornng. ✅ S18 (Ledger → Token income)
- [x] Swarm rewards overheating the economy: Slice 9, Stinger 21 by the per-HP rule ✅ S18 (see `TDX_AI_Balance_Notes.md`)
- [ ] NEW - Stinger and Bug units not doing enough work. Maybe too easy to kill before they have an impact. Jogo to tweak.
- [x] Replace the L2–L5 `genWaves` scaffolds with hand-tuned waves; CRASH cost-cap and BP drop rates (from M3).
- [x] Work through the "M4 ideas" list at the end of `TDX_M3_Difficulty_Plan.md`: L5's early Virus count, unit EVs (Worms rare, Hacks uncommon), Defrag as an anti-virus tower, targeting rules, Virus behaviour, tower value (DDOS, Compressor, Pulse), the Ledger's Virus spiral, L3 layout.
- [x] Look at ebb and flow within waves - perhaps using flow rate and "invisible" sub waves during a single wave.
- [x] Upgrade values from one rule (`UPGRADE.valueShare` 0.6) ✅ S19 (see `TDX_AI_Balance_Notes.md` F4)
- [x] NEW (S21) - Blueprint spread across 10 levels: same system, but no level without BPs until every tower is unlocked. Now: L4, L7, L9, L10 have empty pools; each tower has one primary level. ✅ S21 (L1–L8 spread, see Devlog)
- [x] NEW (S21) - Investigate a massive-attack mechanic: an overwhelming "panic moment" wave event. Built as Breach Surge (option 1).
- [x] NEW (S21) - Place surges per level: one per level from L4, ~75% through, 0.3–0.5. Tune after playtest.
- [ ] Watch the economy after the F4 upgrade change; revisit upgrade prices (`costMult`) if Tokens run hot or cold.
- [x] Expand on Tower Upgrade system - consider "abilities" as an upgrade as well as just firepower. Eg. Threaders can become more defensive of neighbours. DDOs can look for concentrated packs. If this doesn't work, purely numeric boosts is always a solid fallback.
- [ ] Return to formal balance management to close Milestone
- [ ] NEW (S21) - Missing avatar: `Av_OrgStyleB_7_S.png` is referenced in the content CSVs but not in `Code/assets/avatars/`.
- [ ] Update QuickStart (still at Session 17) before banking v1.05.
- [x] REMINDER (S21) - Stinger reward: HP is now 80, so the F1 swarm rule gives 24. ✅ S21 set to 24.



## M6 - "Goto" (v1.06) - Publishing to Github Pages
- [x] Set up a Github page ✅ S21 (live at https://jogosity.github.io/TDX/)
- [x] Get TDX deployed to that page automatically ✅ S21 (`.github/workflows/pages.yml` publishes on every push to main)
- ➜ Moved to backlog (S21): custom domain punkarcade.net.




## M7 — "Fortran" (v1.07) — Onboarding & Presentation
Last of the main beats: onboarding teaches the *final* systems and depends on tuned difficulty.

- [ ] FTUE / tutorial + new-player difficulty on-ramp.
	- [ ] Create a new Level 0 for use as the tutorial level.
	- [ ] Use the existing editor to define a custom shape for the level.
	- [ ] Create Tutorial Box suite that includes a Text panel, pointer allows and button highlighters. (Screen design to be supplied.)
	- [ ] Add a new Tutorial section to the Text Table to contain all tutorial text.
	- [ ] Add a tutorial scripter to the Editor
- [ ] Sound.
- [ ] Polish backlog: lateral map asymmetry, effect variants, remaining small items.
- [x] Juicy Blueprint pickup FX (bigger collect effect), carried from M2 sign-off via the old M6. ✅ S21 (Blueprint swoop to the tray button)




## M8 — "Hypercard" (v1.08) — Re-engagement
After the sim: quest/login rewards feed the economy, so they tune against a balanced game.

- [ ] Finish the Daily Quests design in the design doc (still cut off at "Eg.").
- [ ] Retention Module 4 — Re-engagement: daily logins, quests, BITS hooks.
- [ ] Retention Module 5 — Collection (secondary).



## Backlog — low priority (S21)
- [ ] Add my custom domain (punkarcade.net) to the site. Yes. I do own this!


## Content backlog — ON HOLD (no milestone yet)
Specced in TDX_Towers_and_Enemies.md. If any return after M3, re-run the difficulty sim with them in.
- [ ] Tracer (laser-beam weapon class) + Overclock (adjacency damage-buff aura).
- [ ] Limiter (Tower that slows enemies)
- [ ] Cypher (teleport, untargetable while phased) + Bit Rot (contact damage aura; Limiter slows movement, never damage).
- [ ] Turtle (super-heavy tank).


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


