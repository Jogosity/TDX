
#### Additional Modules - Retention Patterns and Upgrade Paths

This project will make heavy use of additional features targeting retention and long-term play.
We will deal with each retention/long play feature as a separate module.
It may be advantageous to have each module live within its own HTML file.

###### Objective and Strategy
We will be making a suite of games in different genres that will all utilise the same format of Retention Modules. These will be implemented in ways that fit the core mechanics and genre of each game, but the intent and form of the modules will be common.

###### Generic Overviews of Retention Modules

A major document describes all of the 5 most important Retention Patterns here: Read this first.
**[[General_Retention_Modules]]**



# TDX Implementation of Retention Modules


###### **Module 1 - Upgrade Path** - COMPLETE

**Core components**
1. Towers gain upgradeable core stats
2. A new submenu is created for users to see the upgrades they own, and to unlock new ones.
3. A secondary currency is used to purchase unlocks

**How it works**
 - Players can upgrade their towers during gameplay (either during live combat or during the break between waves)
 - Upgrades come in set Tiers - and all towers are always built at Tier 1.
 - Players gain access to additional Tiers by unlocking the Tier in a new Upgrade Menu - accessible from the Main Menu. (We should also try to make this many available during play, it doesn't matter if it covers the gamescreen)
 - Unlocking an upgrade costs a secondary currency called BITS.
	 - BITS are rarer to obtain than Tokens.
	 - BITS are awarded at the end of a completed Level.
	 - Engagement mechanics such as daily logins and quests can give BITS.
 - When an upgrade tier has been unlocked - this means it is available to towers in the field, it is NOT automatically applied to newly built towers.
 - Actually applying an upgrade to a tower in the game involves tapping on the tower after it has been built - this normally shows the Sell button. When an upgrade is available, this action shows a Sell button and an Upgrade button. The Upgrade button should show the cost of the upgrade itself.
 - Applying at upgrade to a Tower costs Tokens. This is normally at a 2x, 3x, 4x cost of the original cost of the tower - for each Upgrade. (This means that we don't need to manage a massive spreadsheet of towers, tiers and upgrade costs)
 - Towers can be upgraded to Tier 4.
 - Applying an upgrade to a tower only affects the specific selected instance of that tower. It does not upgrade every version of that tower in the level.
 - Applying an upgrade to a Tower takes 3 seconds to complete after it is applied. This is depicted by a small clock-timer icon over the tower being upgraded.
 - Typically a Tower has an upgrade to 2 most important stats - Usually Health, plus one other primary output (Damage/AoE effect)
	 - We will do this with list of configs. All towers will have their upgradeable stats listed at Tier 1, and at Tier 4. All intermediate values will be automatically generated on a linear scale between the two extreme values.
	




###### **Module 2: Collection (Core)** - COMPLETE
**Core Components**
1. Additional Towers can be unlocked.
2. New Towers must be unlocked by collect BluePrints.
3. Blueprints are small collectibles that are dropped in-game by defeated enemies
4. All Towers apart from the basic Threader will start locked.
5. The UI must show the unlock status of each tower

**How it Works**
- Blueprints are collectible items dropped from enemies when you defeat them.
- Each tower needs between 10 and 20 BPs to unlock.
- BPs will eventually be Region Locked  - so some Towers will only be available on later levels and areas (See Retention Module 3 - area unlock)
- BPs are collected by tapping on them in the world.
- BPs have a % chance of being dropped by enemies
- Initially all enemies have the same % chance of dropping a BP, but this might change in future iterations.


**Module 3 - Area Unlock** - NOT READY
**Core Components**
1. 4 New levels with a different colour theme for each level grid - maintain a subtle cyan/aqua/cool colour scheme.
2. Enemy Level Delta
3. Level Select button in Main Menu
4. Lock/Unlock for all levels in the debug menu


**How it works**
 - Levels are unlocked in a linear sequence. you have to complete the previous level to play the next one.
 - You can go back and replay older levels from the Main Menu.
 - "PLAY" in the main menu always starts you on the latest available level. Use the Level Select menu to choose a previous level to replay.
 - Different hex grid size/shape for each level (Claude - please best guess some formats for this system - play with width and height. Perfect symmetry is not required for all levels. Small and larger maps give is a good opportunity to see what suits the game the most)
 - Different number of blockers per level 
 - Implement **Lockout** cells - enemy can move over lockouts, player cannot place 
	 - Lockout cells appear from Level 2 onwards - between 2 and 5 lockouts per level.
 - More Enemy Entry points on later levels - 2 on Level 2 and 3. Up to 3 on Level 4 and 5.
	 - At least 1 enemy entry point will be anchored somewhere along the top edge of the map. 2nd and 3rd entry Points can be anywhere on the top 5 rows of cells
 - Lockouts and the 2nd/3rd Entry point can all be moved during a crash.
 - Divide towers into Per level unlock (✅ superseded at M2 close by per-level primary/secondary/tertiary BP drop slots — see TDX_Devlog Session 12 / config `LEVELS[i].bpPool`)
	- [ ] Vault BPs only on Level 1
	- [ ] Defrag BPs only available  on Level 2
	- [ ] DDOS BP only available on Level 3
	- [ ] Deleter BP only available on Level 4
 - The full system will require additional enemies and player towers to really capitalise on the power and appeal of this system. But this will be a later piece of development. The scaffold is the most important thing right now




**Module 4 - Re-Engagement** - NOT READY

**Module 5 - Collection (secondary)** - NOT READY


