**No action needed on this doc, Claude.**
I'm keeping this as a rolling log of the big things we did though the Todo's list. No need to be comprehensive, just the big stuff.



## M7 — "Fortran" (v1.07) — Onboarding & Presentation ✅ COMPLETE (9 Nov, S26)
Last of the main beats: onboarding teaches the *final* systems and depends on tuned difficulty.


- [x] UI/UX improvement to narrative screens
	- [x] READY - Add small, pale grey "Data at risk" header above the Data class line on the Archive Details screen (see new screen mockup Archive_Details_Screen-UPDATE_7th_Nov.png)
	- [x] READY - Remove the "Victim Under Attack" banner and chevrons from the Archive Details screen.
	- [x] READY - Fix max height of Archive details screen to not overflow on iPhone. Add a scroll bar for long text blocks. The Scroll bar should be invisible when not used. (The Tail Feathers data set is particularly long and useful as a test case)
	- [x] READY - Increase the granularity in which  Archives as assigned to levels. Initially this will be "Human Early" "Human Late" "Business Early" and "Business Late"- which allows more in depth narratives to be hold over to later in the game.
	- [x] READY - Add an "Archive Class" column to the Levels tab, to define what Archive Classes can be used on that level. Later levels can use more than one phases, separated by commas.
	- [x] READY - Add an overlay to the Archive Details screen when players play the Tutorial level. The overlay will explain what the various bits of text mean. (Screen mockup at Archive_Details_Screen_Tut.png)
		- [x] Tap the "Continue" button on that overlay in order to reveal the standard Archive Details Screen.
		- [x] The overlay will show everyt ime the player starts the tutorial level.
- [x] TUTORIAL LEVEL
	- [x] READY - Create a new Level 0 for use as the tutorial level.
		- [x] Use the Level 0 description and Tutorial Archive
	- [x] READY - Use the existing editor to define a custom shape for the level (Jogo to do this, long and narrow)
	- [x] READY - Customise the settings for Tutorial level. Just 3 waves, 500 starting tokens, small TEV and MAV
	- [x] The Tutorial level can be played normally, before the formal FTUE is implemented. ✅ S23
- [x] FTUE SEQUENCE
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
- [x] Juicy Blueprint pickup FX (bigger collect effect), carried from M2 sign-off via the old M6. ✅ S21 (Blueprint swoop to the tray button)




## M6 - "Goto" (v1.06) - Publishing to Github Pages
- [x] Set up a Github page ✅ S21 (live at https://jogosity.github.io/TDX/)
- [x] Get TDX deployed to that page automatically ✅ S21 (`.github/workflows/pages.yml` publishes on every push to main)
- ➜ Moved to backlog (S21): custom domain punkarcade.net.




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


## M3 — "Cobol" (v1.03) — Secure & Simulate — ✅ COMPLETE (S15, 2026-10-21)
Requires the M2 roster settled first — new units add too much noise to balance against a moving target.

- [x] Grow `tests/sim.mjs` into the headless difficulty simulator (tower DPS vs real pathing, batch config sweeps, leak/spike reports).
- [x] Full balance pass: all 5 levels, method built (Ledger + Sim + tuning loop, E1–E14 in `TDX_M3_Difficulty_Plan.md`). L1–L4 play slightly easy, L5 slightly hard.
- ➜ Moved to **M5**: replace the L2–L5 `genWaves` scaffolds with hand-tuned waves.
- [x] Sim-answerable parked questions: per-level budget tuning (wave 1 fix, E7). Limiter → content backlog.
- ➜ Moved to **M5**: CRASH cost-cap and BP drop rates (not yet measured).
- [x] Bugs - Fix the 4s Spawn Cooldown - ensure system is working



## M2 — "Basic" (v1.02) — Tower & Enemy Expansion — ✅ COMPLETE (S12, 2026-10-13)
New units land in small phases with playtest + iteration between each. No rushing units to "done" — they mature across phases.

- [x] **Phase 1 — Tweaks** ✅ S9 (version display, per-level budgets, delta verify + Level Select display)
- [x] **Phase 1 — GitHub repo** ✅ S10: local repo at project root (initial commit tagged v1.01-altair, stray Code/sim.mjs removed, backup procedure in QuickStart) → published private to github.com/Jogosity/TDX via GitHub Desktop. CLOSED
- [x] **Phase 2A — Familiar-weapon towers** ✅ S11: Pulse (3-round burst rifle) + Compressor (45° pump shotgun), double-stack tray, debug spawn pause.
- [x] **Phase 2B — Simple enemies** ✅ S12: Bug (random tower hunter, walks open cells, ignores base) + Stinger (packs of 2–4, detour route). Playtested + one tweak round (Bug hp ×3, debug flash + wallet, Bug routing).
- [x] **Phase 4 — Integration + close** ✅ S12: BP regions replaced by primary/secondary/tertiary BP drop slots (15/5/3%, promotion rule); tests per mechanic (74 checks); bumped to **v1.02 Basic**.
- ➜ Moved out: new enemies into L2–L5 wave rosters → **M3** (the sim tunes rosters anyway). Phases 3A/3B → **Content backlog (on hold)** below.



**Major Feature - Tower and Enemy Expansion**
	 - See the document TDX_Towers_and_Enemies.md

**Phase 1 and 2 of New Towers and Enemies**
- [x] Build Tower 6 and 7 (Pulse and Compressor)
- [x] Build Enemy 6 and 7 (Bug and Stinger) ✅ S12
- [x] Add a double stacked for the Tower cards. ✅ S11
- [x] Include new enemies in the debug menu so that they can be insta-spawned. ✅ S12
- [x] Add a Pause/Unpause Spawning button to the Debug menu. ✅ S11 This will pause the natural enemy spawn, but allow the spawning of enemies via the debug menu.



**Tweaks**
- [x] Add a version number to the Main Menu in the game. We will start at v1.01 - Altair ✅ S9: `VERSION` in config, shown bottom of Main Menu home
	- [x] We will increment the build number at the conclusion of each milestone.
	- [x] Version numbers will also have a codename that increments in alphabetical order. We'll start at A and the designation v1.01 to keep everything aligned. List of A to K designations below.
	- [x] Version numbers are only bumped when the full feature set for that milestone has been landed. (Rule noted in config comment — M2 closes as v1.02 Basic)
- [x] Display the enemy level delta on the Level Select - ensure Level Delta is fully implemented and working ✅ S9: verified (HP scale + damage mult incl. Virus) + shown per level row
- [x] Add a per-level Starting budget to the config, rather than re-using the same starting budget for all levels. ✅ S9: `LEVELS[i].startTokens` 300/340/390/450/520 (best-guess — hand-tune)
	



1. **Tweaks**
- [x] Show a lightning/fire effect for 2 seconds or some other indication on a cell if a player's tower has been destroyed in a Crash or by a Virus.
- [x] Add a 3 second delay at the start of all Waves before spawning actually begins. This gives players a chance to read the map, and to see the results of a Crash if there has been one.



2. **Retention Module: Area Expansion**
- [x] Expand game to 5 levels
- [x] See the full design in the TDX Retention Modules .md - now updated 





- [x] Add the Cog debug icon to the Towers menu and Main menu so I can get at it without needing to run the game.
- [x] Make the Deleter fire a much faster particle, a small arrowhead with a long trail. Emphasis the feeling of a sniper shot.
- [x] Move the entire play space down by the height of around 2 Hexes. There is a lot of empty space at the bottom. See screenshot in Assets folder - TDX-iOS-17thJul_01.png
- [x] Create a larger, more colourful explosion. Use small square particles in pastel colours, almost like a burst of confetti. Use it for all enemy kills. We might tweak some values later of create smaller/larger variants.
- [x] (added in-session) Build timer: new towers construct on the same 3s clock-timer as upgrades.




**Tower Design**
Human error - we removed the DDOS grenade launcher and replaced it with a Scattershot. This was a mistake. It is the Limiter that is OP. It massively overpowers the TTK of all nearby towers. Proposed fix
1. Re-implement the original DDOS unit with the grenade launcher
2. Keep the scattershot unit - we’ll call it the Defrag.
3. Remove the Limiter from the UI but keep it in code. It could be a balance issue. 


**Collection Core - Unlockable towers**
1. Fully implement this system according to the spec. Fill in any blanks in the design or ask for clarification.
2. Lock all towers apart from Threader
3. Make sure that each tower has its own BP colour and that the name of the tower is displayed when the BP is picked up.
4. Add a new variable to each tower in the config file: “Blueprints” which is the number of blueprints needed to unlock that tower.


**Debug Menu**
We need to start creating some dev and test support in the game.
We need a small Cog ⚙️ button in the top left corner of the screen. This will bring up the debug menu.
The debug menu can cover the screen and take touch input priority.
We’ll be adding lots of features to the debug menu so a flexible architecture is advised.
In the past I have created a double or triple tabbed menu system for the Debug menu - these have always been created by Claude installs running in VS Code and creating a game in HTML - so you got this!

The first tab to add is Economy and unlocks. It’ll need some buttons.
 - Add 100 tokens
 - Add 10 Bits
 - Unlock all towers
 - Lock all towers
 - Reset all Settings
 - Quit to main menu
 The second tab to add is a Spawn Enemy menu
  - One button per enemy type, will always spawn a single instance of the selected menu.

**Main Menu**
The needs to open on a Main Menu without the game UI or play field visible.
The Main Menu will have a main "Play" button, plus a "Towers" button and an "Enemies" button. 

The Towers button should display a list of all Towers with a description and status (Locked/Unlocked/BP progress/Level)
The player can unlock Towers Upgrade Tiers in this menu.
Tower availability is an instant unlock during the game when the player collects enough BPS for that type of tower.
The Enemy menu just needs a list of the enemies with a short description of what they do.


*End of doc*



