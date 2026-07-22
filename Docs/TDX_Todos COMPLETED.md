**No action needed on this doc, Claude.**
I'm keeping this as a rolling log of the big things we did though the Todo's list. No need to be comprehensive, just the big stuff.



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



