


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
- [ ] Replace the L2–L5 `genWaves` scaffolds with hand-tuned waves; CRASH cost-cap and BP drop rates (from M3).
- [ ] Work through the "M4 ideas" list at the end of `TDX_M3_Difficulty_Plan.md`: L5's early Virus count, unit EVs (Worms rare, Hacks uncommon), Defrag as an anti-virus tower, targeting rules, Virus behaviour, tower value (DDOS, Compressor, Pulse), the Ledger's Virus spiral, L3 layout.
- [ ] Look at ebb and flow within waves - perhaps using flow rate and "invisible" sub waves during a single wave.
- [ ] Expand on Tower Upgrade system - consider "abilities" as an upgrade as well as just firepower. Eg. Threaders can become more defensive of neighbours. DDOs can look for concentrated packs. If this doesn't work, purely numeric boosts is always a solid fallback.
- [ ] Return to formal balance management to close Milestone



## M6 - "Goto" (v1.06) - Publishing to Github Pages
- [ ] Set up a Github page
- [ ] Get TDX deployed to that page automatically
- [ ] Add my custom domain (punkarcade.net) to the site. Yes. I do own this!




## M7 — "Fortran" (v1.07) — Onboarding & Presentation
Last of the main beats: onboarding teaches the *final* systems and depends on tuned difficulty.

- [ ] FTUE / tutorial + new-player difficulty on-ramp.
- [ ] Sound.
- [ ] Polish backlog: lateral map asymmetry, effect variants, remaining small items.
- [ ] Juicy Blueprint pickup FX (bigger collect effect), carried from M2 sign-off via the old M6.




## M8 — "Hypercard" (v1.08) — Re-engagement
After the sim: quest/login rewards feed the economy, so they tune against a balanced game.

- [ ] Finish the Daily Quests design in the design doc (still cut off at "Eg.").
- [ ] Retention Module 4 — Re-engagement: daily logins, quests, BITS hooks.
- [ ] Retention Module 5 — Collection (secondary).



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


