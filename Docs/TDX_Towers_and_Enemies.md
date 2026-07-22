###### Player Towers and Stats
We will start off with just 5 towers. We will add the next ones as the game developers

NOTE WELL - Any stats listed here are not necessarily canonical.
Balancing takes place after this doc was written

 - **Threader** - COMPLETE
 - A tower armed with a machine gun type weapon.
	 - Size - 1 cell
	 - Cost  - 100
	 - Health - 100
	 - Weapon - Machine Gun
	 - Damage - low
	 - Fire rate  - constant/no clip reload
	 - Range - low

 - **Vault** - COMPLETE
 - A player-placed blocker, no offensive capability
	 - Size - 1 cell
	 - Cost  - 60
	 - Health - 200


 - **DDOS** - COMPLETE
 - A tower armed with a Grenade weapon.
	 - Size - 1 cell
	 - Cost  - 300
	 - Health - 150
	 - Weapon - Grenade Launcher
	 - Damage - high
	 - Fire rate  - low
	 - Range - medium


 - **Deleter** - COMPLETE
 - A tower armed with a Sniper weapon.
	 - Size - 1 cell
	 - Cost  - 500
	 - Health - 80
	 - Weapon - sniper rifle
	 - Damage - high
	 - Fire rate  - low
	 - Range - high


 - **Defrag** - COMPLETE
 - A tower armed with a 360 degree scattershot
	 - Size - 1 cell
	 - Cost  - 300
	 - Health - 100
	 - Weapon - radial scattershot
	 - Damage - low (per particle)
	 - Fire rate  - low
	 - Range - low


 - **Limiter** - COMPLETE BUT OFFLINE
 - An AoE tower that slows down nearby enemies
	 - Size - 1 cell
	 - Cost  - 200
	 - Health - 150
	 - Weapon - AoE slow down
	 - Effect - 50% speed reduction
	 - Range - low


**TOWER 7 - NEW**
**Tracer -** A laserbeam/trace rifle. Fires a solid beam/line to a target enemy.
	 - Size - 1 cell
	 - Cost  - 300
	 - Health - 100
	 - Weapon - Laser beam
	 - Damage - low (per particle)
	 - Fire rate  - constant - imparts low damage every 0.5s
	 - Clip size - medium
	 - Reload - long
	 - Range - Medium


**TOWER 8 - NEW**
**Compressor** - A Shotgun tower. Wide scattering, short range. Can fire several times in quick succession before needing to reload
 - Size - 1 cell
	 - Cost  - 400
	 - Health - 100
	 - Weapon - Shotgun (Pump action archetype)
	 - Damage - low (per particle)
	 - Spread - 45 degrees
	 - Fire rate  - Low
	 - Clip size - Medium
	 - Reload - Medium
	 - Range - Short


**TOWER 9 - NEW**
**Pulse -** A Pulse rifle tower
Fires a burst of 3 bullets. Then a slight pause. Then 3 bullets.
Has a limited clip size so far fire around 5 pulses before needing a full reload.
This unit will eventually supplant the Threader as the de-facto base attacker
 - Size - 1 cell
	 - Cost  - 400
	 - Health - 150
	 - Weapon - Pulse Rifle (Destiny2 archetpye)
	 - Damage - low (per bullet)
	 - Fire rate  - High
	 - Clip size - Medium
	 - Reload - Medium
	 - Range - Same as Threader


**TOWER 10 - NEW**
**Overclock -** A special support tower that increases the damage output of any tower it is physically touching (adjacent cells)
	 - Size - 1 cell
	 - Cost  - 800
	 - Health - 100
	 - Weapon - AoE slow down
	 - Effect - 10% damage increase per tier
	 - Range - contact only



###### Enemies
We'll start off with 5 enemy classes and build up from there as we develop the game

**Hack -** Default enemy
 - EV - 100
 - Health - 100
 - Speed - medium
 - Reward - 10


**Crack** - tank enemy
- EV - 150
 - Health - 500
 - Speed - low
 - Reward - 15


**Virus -** Attacking enemy
- EV - 300
 - Health - 150
 - Speed - medium
 - Damage - 10
 - Reload - 1s
 - Reward - 30


**Worm -** Faster, heavier
- EV - 300
 - Health - 200
 - Speed - medium
 - Reward - 30


**Slice -** pack enemy, cheap and fast - spawn in groups
 - EV - 30
 - Health - 30
 - Speed - fast
 - Reward - 8


**ENEMY 6 - NEW**
**Bug -** Fast virus. Does not target the base at all. Each bug will attack a random tower. Will only attack a base if there are no towers left to attack
- EV - 30
 - Health - 30
 - Speed - fast
 - Damage - 10
 - Reload - 1.0s
 - Reward - 10


**ENEMY 7 - NEW**
**Stinger -** Fast unit that takes non-optimal route to Base.
But the Stinger is FAST.
- EV - 350
 - Health - 70
 - Speed - Fast
 - Reward - 40
 - Spawns in Packs min: 2, max 4



**ENEMY 8 - NEW**
**Cypher -** A ghost unit. Will appear for 2 seconds. Then vanish. Whilst it is invisible the unit cannot be targeted.
Cypher does not move smoothly. It teleports from cell to cell. But it skips every second cell.
The path is standard, optimal path.
The Cypher Spawns - checks it's route. Disappears. It them teleports to the one-after-next cell on its path. It does this throughout its cycle.
- EV - 300
 - Health - 200
 - Speed - medium/Special
 - Reward - 40



**ENEMY 9 - NEW**
**Turtle -** Super heavy tank. Soaks up damage, meaning your towers are not shooting at other targets.
- EV - 200
 - Health - 2000
 - Speed - SLOW
 - Reward - 50


**Enemy 10 - NEW** 
**Bit Rot -** Move slowly through the level and imparts slow damage on every unit within range.
Target range is contact only - so the cells immediately adjacent to the unit.
Movement speed IS affected my Limiter
Damage output is NOT affected by Limiter
- EV - 300
 - Health - 800
 - Speed - SLOW
 - Reward - 120



Please define some shapes for the new units. We can update them later when we have proved them out, or proved them to not work.

