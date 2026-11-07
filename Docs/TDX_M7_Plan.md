# TDX M7 "Fortran" (v1.07): Plan

Status: **in progress.** Steps 1–3 built in Session 23 (devlog); Jogo reshapes Level 0 next. Jogo's calls: D1 yes; D2 boot to main menu, first PLAY → Tutorial; D3 no rewards at all; D4 losable for now. M7 is Onboarding & Presentation: a Tutorial level (Level 0), a formal FTUE on top of it, and the narrative-screen UX items. Sources: `TDX_Todos.md` (M7 list), the M5/M6 close in the devlog, the code and content as of v1.06.

## What I found
- The content side is already ahead of the code. `Levels-Table 1.csv` has a **Level 0** row (Tutorial / Press Play / "Learn how to play the game…") drawing from the **Tutorial** class, and `Archives-Table 1.csv` has an Active **Tutorial** archive. Archives already use the finer classes (Human Early, Human Late, Business Early, Business Late), and the Levels tab's `Level_Archives` column already names one or more classes per level, comma separated.
- The game still numbers levels as array index + 1 (`levelNo = levelIndex + 1` in `game.js`, `Level N` in the HUD), so Level 0's text and archive are never read yet.
- Tests: 128 passing on the Mac before any change.

## Order of work
1. **Narrative-screen UX** (all READY): "Data at Risk" header above the class line, remove the "Victim under attack" banner and chevrons, cap the Archive Record's height on iPhone with a scroll area whose bar only shows while scrolling (Tail Feathers as the test case), and a content check that every class a level names exists (the Archive Class granularity is already in the CSVs; this makes it safe).
2. **Level 0 plumbing**: Tutorial added as the first entry in `levels.js`, level number = index, save migration, Level Select / HUD / editor / Sim / Ledger / tests in step.
3. **Tutorial settings**: 3 waves, 500 starting Tokens, small TEV and MAV, gentle roster (Hack, then Slice). Jogo shapes the board in the editor (long and narrow).
4. **Playtest**: Level 0 plays as a normal level before any FTUE exists.
5. **FTUE** (NOT READY, waits for Jogo's screen designs): Tutorial Box suite, step script, Tutorial tab in the Text Table, scripter in the editor.
6. Deleter fire light-up, polish backlog, then v1.07.

## Decisions for Jogo (my recommendation first)

**D1. Level 0 lives in `levels.js` as the first level, and the level number becomes the array index.** The editor then shapes it like any other level, and "Level 0" in the CSV lines up with `LEVELS[0]`. Existing saves move up by one (`levelsUnlocked + 1`, with the Tutorial counted as done) so nobody loses progress. *Alternative:* a separate `TUTORIAL` entry outside the list. Fewer moving parts in the save, but the editor, Sim and Ledger would each need a special case.

**D2. A brand-new player's first PLAY goes straight into the Tutorial**, skipping Level Select. After that, PLAY works as now and the Tutorial stays replayable from Level Select. Players with existing progress never get pushed into it.

**D3. Tutorial rewards: a small BITS reward, no Blueprint drops** (Vault stays L1's primary). Revisit when the FTUE script decides whether it teaches Blueprints or upgrades.

**D4. The Tutorial can be lost for now** (it's a normal level until the FTUE lands). Once the FTUE is in, I'd make it unlosable (Cores never drop below 1) so the first session always ends in SUCCESS.

## FTUE sketch (to firm up once the screen designs land)
- **Tutorial Box suite**: a text panel (portrait + text + Next), a pointer arrow, a highlight ring around a button or hex, and a dim mask that blocks taps everywhere except the target.
- **Step script** in a new **Tutorial** tab of `TDX_Text.numbers`, one row per step: StepID, Text, Target (a UI element or a hex), Advance on (tap / tower placed / wave started / enemy killed / wave cleared), Pause game (yes/no). Adding or rewording steps needs no code, same as the narrative.
- A first-pass step list: welcome → tap the Threader card → place it on the highlighted hex → start the wave → Tokens from kills → place a second tower → upgrade a tower → the Core and what a leak costs → wave 3 runs free → SUCCESS.
- **Editor scripter** last: the step list with a live preview of each step on the Tutorial board.
