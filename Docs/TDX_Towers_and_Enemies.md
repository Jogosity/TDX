###### Player Towers and Stats
We will start off with just 5 towers. We will add the next ones as the game developers

NOTE WELL - Any stats listed here are not necessarily canonical.
Balancing takes place after this doc was written

**TOWER 1 - COMPLETE**
 - **Threader**
 - A tower armed with a machine gun type weapon.
 - Appearance: Blue mouse pointer
	 - Size - 1 cell
	 - Cost  - 100
	 - Health - 100
	 - Weapon - Machine Gun
	 - Damage - low
	 - Fire rate  - constant/no clip reload
	 - Range - low


**TOWER 2 - COMPLETE**
 - **Vault** 
 - A player-placed blocker, no offensive capability
 - Appearance: Solid blue hex
	 - Size - 1 cell
	 - Cost  - 60
	 - Health - 200


**TOWER 3 - COMPLETE**
 - **DDOS**
 - A tower armed with a Grenade weapon.
 - Appearance: 3 stacked circles
	 - Size - 1 cell
	 - Cost  - 300
	 - Health - 150
	 - Weapon - Grenade Launcher
	 - Damage - high
	 - Fire rate  - low
	 - Range - medium

**TOWER 4 - COMPLETE**
 - **Deleter**
 - A tower armed with a Sniper weapon.
 - Appearance: Three stacked triangles
	 - Size - 1 cell
	 - Cost  - 500
	 - Health - 80
	 - Weapon - sniper rifle
	 - Damage - high
	 - Fire rate  - low
	 - Range - high

**TOWER 5 - COMPLETE
 - **Defrag**
 - A tower armed with a 360 degree scattershot
 - Appearance: Green radiation symbol
	 - Size - 1 cell
	 - Cost  - 300
	 - Health - 100
	 - Weapon - radial scattershot
	 - Damage - low (per particle)
	 - Fire rate  - low
	 - Range - low

**TOWER 6 - COMPLETE
Pulse**
A Pulse rifle tower.
Fires a burst of 3 bullets. Then a slight pause. Then 3 bullets.
Has a limited clip size so far fire around 5 pulses before needing a full reload.
This unit will eventually supplant the Threader as the de-facto base attacker
Appearance: Three pointed stripes, lilac in colour
 - Size - 1 cell
	 - Cost  - 400
	 - Health - 150
	 - Weapon - Pulse Rifle (Destiny2 archetpye)
	 - Damage - low (per bullet)
	 - Fire rate  - High
	 - Clip size - Medium
	 - Reload - Medium
	 - Range - Same as Threader


**TOWER 7 - COMPLETE
Compressor**
A Shotgun tower. Wide scattering, short range. Can fire several times in quick succession before needing to reload
Appearance: Teal loudspeaker
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



 **TOWER 8 - COMPLETE BUT OFFLINE**
 - **Limiter**
 - An AoE tower that slows down nearby enemies
 - Appearance: Blue "pause" icon
	 - Size - 1 cell
	 - Cost  - 200
	 - Health - 150
	 - Weapon - AoE slow down
	 - Effect - 50% speed reduction
	 - Range - low


**TOWER 9 - TODO/ON HOLD**
**Tracer -** A laserbeam/trace rifle. Fires a solid beam/line to a target enemy.
Appearance: Two hemispheres
	 - Size - 1 cell
	 - Cost  - 300
	 - Health - 100
	 - Weapon - Laser beam
	 - Damage - low (per particle)
	 - Fire rate  - constant - imparts low damage every 0.5s
	 - Clip size - medium
	 - Reload - long
	 - Range - Medium



**TOWER 10 - TODO/ON HOLD**
**Overclock -** A special support tower that increases the damage output of any tower it is physically touching (adjacent cells)
Appearance: 
	 - Size - 1 cell
	 - Cost  - 800
	 - Health - 100
	 - Weapon - AoE slow down
	 - Effect - 10% damage increase per tier
	 - Range - contact only



###### Enemies
We'll start off with 5 enemy classes and build up from there as we develop the game

**ENEMY 1 - COMPLETE**
**Hack -** Default enemy
Appearance: Pink chevron
 - EV - 100
 - Health - 100
 - Speed - medium
 - Reward - 10

**ENEMY 2 - COMPLETE**
**Crack** - tank enemy
Appearance: Red double point
- EV - 150
 - Health - 500
 - Speed - low
 - Reward - 15

**ENEMY 3 - COMPLETE**
**Virus -** Attacking enemy
Appearance: Pale red triple spike
- EV - 300
 - Health - 150
 - Speed - medium
 - Damage - 10
 - Reload - 1s
 - Reward - 30

**ENEMY 4 - COMPLETE**
**Worm -** Faster, heavier
Appearance: Slim yellow diamond
- EV - 300
 - Health - 200
 - Speed - medium
 - Reward - 30

**ENEMY 5 - COMPLETE**
**Slice -** pack enemy, cheap and fast - spawn in groups
Appearance: Small, yellow arrowheads
 - EV - 30
 - Health - 30
 - Speed - fast
 - Reward - 8


**ENEMY 6 - COMPLETE (first pass S12)**
**Bug -** Fast virus. Does not target the base at all. Each bug will attack a random tower. Will only attack a base if there are no towers left to attack
Appearance: Orange oval with points
- EV - 30
 - Health - 30
 - Speed - fast
 - Damage - 10
 - Reload - 1.0s
 - Reward - 10


**ENEMY 7 - COMPLETE (first pass S12)**
**Stinger -** Fast unit that takes non-optimal route to Base.
Appearance: Orange 4-pointed star
- EV - 350
 - Health - 70
 - Speed - Fast
 - Reward - 40
 - Spawns in Packs min: 2, max 4



**ENEMY 8 - ON HOLD**
**Cypher -** A ghost unit. Will appear for 2 seconds. Then vanish. Whilst it is invisible the unit cannot be targeted.
Cypher does not move smoothly. It teleports from cell to cell. But it skips every second cell.
The path is standard, optimal path.
The Cypher Spawns - checks it's route. Disappears. It them teleports to the one-after-next cell on its path. It does this throughout its cycle.
Appearance: TBD
- EV - 300
 - Health - 200
 - Speed - medium/Special
 - Reward - 40



**ENEMY 9 - ON HOLD**
**Turtle -** Super heavy tank. Soaks up damage, meaning your towers are not shooting at other targets.
Appearance: TBD
- EV - 200
 - Health - 2000
 - Speed - SLOW
 - Reward - 50


**Enemy 10 - ON HOLD** 
**Bit Rot -** Move slowly through the level and imparts slow damage on every unit within range.
Target range is contact only - so the cells immediately adjacent to the unit.
Movement speed IS affected by Limiter
Damage output is NOT affected by Limiter
Appearance: TBD
- EV - 300
 - Health - 800
 - Speed - SLOW
 - Reward - 120



Shapes for new units can be found in the image "Tower_Designs.PNG" in the assets folder.

