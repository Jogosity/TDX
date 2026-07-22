
**Project Type:** Mobile Game
**Genre:** Tower Defence
**Sub-Genre:** Free Grid
**Viewpoint:** Top Down
**Engine:** HTML5


#### **Design Overview**
TDX is the working title of a mobile-first tower defence game.
The design works by having a open hex-grid of cells that can be used to place towers in a near-freeform way.
Some cells will contain pre-placed blockers - creating restrictions on tower placement and generating interesting pathing options.

Enemies will spawn from pre-placed Spawn Zones and move along the hex grid in a smoothed, curve, rather than a series of linear moves. The Spawn Zones will generally be at the top of the screen.

The player's base will be located at the bottom of the screen and will contain the players lives. Each time an enemy reaches the base a life will be lost and the enemy will despawn.


###### Game Structure
The game will be comprised of Levels and Waves.
A level is a large section of gameplay that comprises of multiple waves - sometimes up to a dozen or more.
A wave is a continual stream of enemies that enter the battlefield. See below for more details.

After each wave, the game pauses, allowing the player to reassess the battlefield and rebuild some towers without the pressure of attack.

At the end of the level, the game essentially concludes and the player is returned to the main menu, where they can select the next level.


**Economy**
Towers cost Tokens to build. The player starts with a budget of Tokens that is enough to build 2 or 3 towers.
Killing enemies rewards tokens.
Different enemies give a different amount of Tokens.
Collecting Tokens is automatic and instant on the death of the enemy.

Players can sell towers that they no longer want on the battlefield.
Selling a tower earns 66% of it's original cost in Tokens.

###### **Theme**
The narrative theme of the game will be a cyberspace hack on a computer system. 
The player's base is a data repo, and the enemies are essential viral agent stealing fragments of memory from the repo.

This framing means the graphics can be standard shapes that can easily be generated and rendered in HTML5 without the need to import bitmap images. 
The art style can be a neon, synthwave aesthetic, with a dark blue backdrop and bright, neon coloured enemies and player towers with soft glows around them.


###### **Player Towers**
The player will have a range of towers that can be deployed across the map. Most towers will take up a single hex-cell. However as the game develops, we might create towers that take up 2 or more cells.

Towers will have fairly standard offensive outputs for the TS genre.
Basic towers will be standard, close range projectiles with varying degrees of fire rate, damage and reload times. 

It will be valuable to construct a comprehensive weapon system to mange the main values of the weapons, including the primary values (fire rate, damage, reload) as well as some secondary values (bullets in a burst, bullet spread, projectile velocity) so that more exotic weapons such as burst-file, shotguns, rocket and grenade launchers can be created.

Advanced Towers can have status effects -  such as Damage Up for allied towers, or Slow for enemy units within their AoE.

###### Tower Placement Restrictions
 - Towers cannot be placed on cells that already contain a tower.
 - Towers cannot be placed on cells that contain a blocker
 - Towers cannot be placed on a cell if it will completely block the pathway to the enemy base. This would be called Firewalling and is an illegal move.
    We will retain a secondary restriction on the back burner - the Enemy Lockout cell would be a cell that the enemy have locked - preventing the player putting a tower on that cell, but still allowing the enemy to move unimpeded over that cell. (This differs from a Blocker, in that a blocker prevents both sides from using that cell.)
    Enemy Lockout cells will NOT be part of the first playable - let's save them until we need them


###### **Enemy Units**
Enemies will mostly attempt to move towards the player's base in an optimal path. 
Most enemies have no offensive capability - apart from their ability to steal a memory core/life from the player's base.
A small number of specialised units will attack the player's own towers. These offence-enemies will move to an adjacent cell to the target tower and start applying damage over time. 


###### **Enemy Population and Wave Control**
The enemy waves will be managed by 2 main factors.
1. Enemies get unlocked over the early waves and levels, making the game get more interesting and varied as it goes on.
2. The size and length of each wave is managed by a numeric cost of each enemy, against a total budget available for the wave. This is essentially a "Horde" population management system. There are more details on this in the specific Wave Control section


###### Level Population Control
Levels have relatively little data associated with them
 - Number of Waves - speaks for itself
 - Enemies available - a list of which enemy units are available to be spawned into the level.
 - Number of Blockers in the level.
 - Enemy delta - this is the multiplier of health and damage that is applied to all enemies on that complete level. Generally there is a different delta for Health and Damage, allowing finer control of the difficulty.
 - Enemy Delta is a central part of the difficulty ramp of the game.

###### **Wave Control**
Each wave of enemies is governed by a **Total Enemy Value - TEV.**
This is the compete budget available to the entire wave.

Each enemy is assigned an **Enemy Value - EV**
This is the weight or cost of that enemy. Basic enemies have a low EV, tougher or more specialist enemies have a higher EV.

There is also a **Max Active Value - MAV**
This is the maximum weight of enemies that are allowed to be active at one time.
If the wave reaches this value, it will stop spawning enemies.

There is also a **Respawn Trigger Value - RTV**
This is the trigger value at which the game will restart spawning enemies

MAV and TRV are used in combination.
 - At the start of the game, the RTV-check is inactive.
 - When the MAV is reached, the game will stop spawning enemies and the RTV check is activated
 - When the player has defeated enough enemies for the active enemies to fall below the RTV, the game will then start respawning enemies and attempt to fill back up to the MAV.
 - This system creates a sub-wave rhythm to the play, allowing the enemy spawning to halt, and then suddenly kick into action. Without the RTV, enemies would end up spawning one at a time every time and enemy died, and the rhythm of play could be come stilted.

It is possible that we will add additional values to enemies to help balance their flow into a level. We will hold off on that until we know more about how the system is working in practice.
The system architecture should be constructed in a way that allows for additional values to be inserted.


###### CRASH
Every 3 or 4 waves a sudden event will strike the battlefield. 
The CRASH is a resetting of some parts of the battlefield - the Blockers all move to new locations. This is denoted by screenshake - the caption CRASH displayed in the middle of the screen, and any sort of glitching of colour flash effect that can be achieved 
This can include a Blocker being placed on a cell already containing a player's Tower. If this happens the Tower is destroyed.
The number of towers that can be destroyed in a single CRASH is limited to 2 per Crash.
	We might also limit the cost of the Tower that can be destroyed.




