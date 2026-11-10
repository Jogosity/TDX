


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


Phase 3
- [ ] Build Towers 8 and 9 (on hold)
- [ ] Build Enemy 8 and 0 (on hold)




---

# Milestones

The game is intended as a 360° demonstration of game craft — each milestone should be a complete, presentable exhibit, not just a feature dump. Version bumps only when a milestone's full feature set has landed.





## M8 — "Hypercard" (v1.08) — Sound and Music ✅ COMPLETE 10 Nov
Add sound and music to all relevant areas of the game. Sourcing: synth SFX made in code + Meta Sound and Music tracks (swap for free/credit-required before any wider release).
- [x] UI Sound effects - button-tap noise (bleeps or clicks) - positive/forward movement and negative/backward movement. Error beep noise
- [x] UI Whoosh for major screens moving on (Eg. Results screen)
- [x] Music Loops
	- [x] Menu music
	- [x] Main game music — became the wave pool: a track runs for 3 waves, lowered between waves (Jogo, 10 Nov)
	- [x] Final wave game music — dropped in favour of the pool
	- [x] Victory sting
	- [x] Fail sting
- [x] In-game sound effects
	- [x] Weapon fire
	- [x] Enemy destruction
	- [x] Tower Destruction
	- [x] Virus/Bug attack warning (short spot effect when the attack starts, not a constant alarm)
- [x] New tool - Sound Mixer
	- [x] Allow testing and balancing of effects, eg. Tap a Threader icon to trigger the sound.
	- [x] Allow things like volume, speed, pitch and length changes.
- [x] Extras: anti-spam voice cap with priorities, SOUND settings tab, teletype + Cores count-up clicks

## M9 — "Integer" (v1.09) — Re-engagement
After the sim: quest/login rewards feed the economy, so they tune against a balanced game.

- [ ] Finish the Daily Quests design in the design doc (still cut off at "Eg.").
- [ ] Retention Module 4 — Re-engagement: daily logins, quests, BITS hooks.
- [ ] Extend Bits economy. Longer unlock path, more ways to earn bits. An additional T5 unlock that allows you to auto-build the tower at T2 for T2 price. (No need to build a T1 version. Option shown on tapping to build.)
- [ ] Maybe even a few expensive Bits purchase to start each level with +50 Token.




## Backlog — low priority (S21)
- [ ] Add my custom domain (punkarcade.net) to the site. Yes. I do own this!
- [ ] Lateral map asymmetry: per-row sideways offsets so a board can lean or dog-leg (needs a `rowOffsets` level field + editor support). Moved from M7, 9 Nov.


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


