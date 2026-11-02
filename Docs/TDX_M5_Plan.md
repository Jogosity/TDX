# TDX M5 "Elm" (v1.05): Plan

Status: **steps 1–7 built in Session 17** (see the devlog). Jogo said go: "build it, we'll iterate faster that way". First goals: a drag-and-drop Level Editor, then 10 levels with the tower unlocks spread across them. The balance pass comes after.
Sources: `TDX_Todos.md` (M5 + the MAD IDEA notes), `TDX_QuickStart.md`, the M4 close in the devlog, the code as of v1.04.

## What this first stretch delivers
1. **Level Editor** at `Code/tools/editor/` (http://localhost:8000/tools/editor/ while `serve.py` runs). Drag and drop, sliders, a live board preview and live Ledger pressure. One **Save** writes the level file the game, Sim, Ledger and tests all read.
2. **10 levels**, built in the editor, with tower unlocks redistributed across them.
3. **Sim, Ledger and tests in step** with the new level file and level count.

## Decisions for Jogo (my recommendation first)

**D1. Level data gets its own file, written by the editor.** Levels move out of `config.js` into `Code/js/levels.js`, a data-only file (no formulas). The game, Sim, Ledger and tests import it exactly as they import config today. The editor saves through a small save route added to `serve.py`. It only accepts that one file and only from this machine. There are no backup copies: git is the backup, and GitHub Desktop shows each Save as a readable diff. You can still hand-edit the file. *Alternative:* the editor makes a file you download and drop in. That's clunkier and easy to forget.

**D2. Waves are stored as plain numbers. The curve is a shaping tool.** Each wave keeps its explicit TEV, MAV, RTV, roster and spawn interval, so what the game plays is what you see in the file. The curve handles (start, mid, end) are saved alongside so the editor reopens as you left it. Dragging a handle reshapes every wave, and dragging one wave's point hand-tunes just that wave. This retires `genWaves`, which covers the M5 todo "replace the L2–L5 scaffolds with hand-tuned waves". *Alternative:* store only the curve and generate waves at load. That gives a smaller file but makes per-wave hand-tuning awkward.

**D3. The editor takes over from the Ledger's Shaping dials.** They do the same job less directly ("change this in config.js"). The Ledger keeps its reports and the editor shows Ledger pressure live, so there's one place to shape a level. I'd remove the dials once the editor is in.

**D4. Unlock spread (starting point; you'd drag it around in the editor).** Today, with 5 levels, everything unlocks by L5. With 10, roughly one new tower every 1.5 levels:

| Tower | Expected unlock | Primary drop in | Secondary drop in |
|---|---|---|---|
| Vault | L1 | L1 | — |
| Defrag | L2 | L2 | L1 |
| DDOS | L3–4 | L3, L4 | L2 |
| Compressor | L5 | L5 | L4 |
| Deleter | L6–7 | L6, L7 | L5 |
| Pulse | L8–9 | L8, L9 | L7 |
| (none) | L10 | full arsenal, mastery level | |

The current rule "this level's secondary is the next level's primary" is a guide, and a tower that's primary for two levels breaks it. The test would change to check that every lockable tower drops somewhere and that its first drop comes before its expected unlock level.

## The editor

One page. Tap a level on the left, and the level fills the rest of the page.

- **Level strip** (left): 10 cards. Drag to reorder, duplicate, add or delete. Each card shows waves, entry points and the Ledger verdict.
- **Board** (top): a live hex preview drawn with the game's real board code. Sliders for **entry points**, **blockers**, **locked sectors** and a new **min distance to base for entry points**. Drag each row's end to widen or narrow the board. **Shuffle** re-rolls the random layout to show you a range of what players will get. Sliders also set the theme colours.
- **Intensity** (middle): wave-count slider. **TEV** and **MAV** range sliders (first wave to last wave), and the curve with three pull points (start, mid, end) plus a point per wave for hand-tuning. The Ledger's pressure line and your target line sit over it and update as you drag.
- **Roster lane**: enemy chips in a palette. Drag a chip onto the wave timeline to choose the wave it joins, drag its tail to the wave it leaves, and nudge its pick weight (the Virus ×1.5 kind) with +/−. Wave 1's opening rule (Hack and Slice only, spread out) is shown and kept.
- **Unlocks and economy**: drag tower chips into the level's Primary, Secondary and Tertiary drop slots. An unlock track across all 10 levels shows roughly when each tower unlocks (expected kills × drop rate). It also has sliders for start Tokens, BITS reward, and enemy HP and damage scaling.
- **Save**: checks the same rules the tests check (reachable spawns, sane waves, real towers) and won't save a broken level. Undo and redo work while the page is open.
- **Later, if it earns its place:** a "Sim 20 seeds" button that runs the real Sim in the browser.

Layout randomness stays as it is (blockers, locked sectors and extra entry points are rolled each run). The editor sets the counts and rules, not fixed cells. If you'd like hand-placed cells as well, that's a later step.

## 10 levels

- **L1–L5** keep their shapes and play the same on day one. The data move is proven by a test that the game produces identical waves before and after.
- **L6–L10** are drafted in the editor as first passes that try new shapes and lengths (bigger boards, more entry points, longer games with much higher TEV late on). Names and themes are placeholders for you to change. Then you shape them by hand.
- `target.js` (the Ledger's target curve) grows to 10 levels.
- **Narrative**: the game copes with missing `Level_6`–`Level_10` rows in the Levels CSV (the STORY tab lists them). You add those rows in Numbers when ready.
- **Saves**: `levelsUnlocked` is an index, so existing progress stays valid.

## Order of work
1. **Data move** — `js/levels.js`, all readers switched over, `genWaves` output written out as plain waves. Identical-waves test. No gameplay change.
2. **Editor shell** — save route in `serve.py`, level strip, Save with checks, undo.
3. **Board panel** — real preview, sliders, row-width drag, shuffle, min entry distance (also added to `board.js` so the game uses it).
4. **Intensity panel** — curve with pull points, TEV/MAV sliders, live Ledger pressure vs target.
5. **Roster lane + unlocks/economy.**
6. **10 levels** — draft L6–L10, unlock spread, `target.js`, tests, then a Sim + Ledger run over all 10.
7. **Tidy** — remove the Ledger Shaping dials, update QuickStart and the devlog. You playtest.

Steps 1–2 make a sensible first session. You can try the editor from step 3 onwards.
