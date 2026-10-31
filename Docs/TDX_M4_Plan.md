# TDX M4 "Disc Drive" (v1.04): Plan

Status: **agreed 2026-10-23; Phases A–D built in Session 16, waiting on Jogo's playtest.**
Sources: `TDX_Todos.md` (M4), `TDX_Game_Narrative_Content.md`, `Notes/Narrative.md`, the screen mockups in `Assets/Screens/`, the M4 ideas list in `TDX_M3_Difficulty_Plan.md`.

## What M4 delivers
1. **Bug + Stinger in the wave rosters**, then a Sim + Ledger check so M3's balance survives.
2. **Under-attack warning** (Virus drain, and Bug drain too), built to `Virus_Attack_Warning.png`.
3. **New-tower-unlocked message**, replacing today's small toast.
4. **Narrative screens**: Level Data, Archive Record, Level Result (win/lose), plus the Info pop-up.
5. **Narrative content file** (.md) that Jogo edits without touching code.
6. **Memory loss system**: random memories per run, lost in proportion to Cores lost.

## Order of work (one phase per session or so)

### Phase A: Bug + Stinger into rosters, balance check
- Today the late-level roster `ALL` is Hack, Slice, Crack, Worm, Virus. Add Bug and Stinger from L3 (proposal: Stinger from L3 wave 3, Bug from L4 wave 2, both in L5 after wave 1). Keep their current EVs (Bug 170, Stinger 130).
- Sim: 40 seeds per level before and after, compare runs lost, towers alive, leaks (same table as E6). Ledger: confirm pressure vs target per level.
- Pass mark: no level moves more than one "verdict" band from its M3 result (L1–L4 slightly easy, L5 slightly hard). If it does, one tuning knob only (EV or first wave), logged as E15 in the plan.
- Short playtest by Jogo.

### Phase B: In-game messages
- **Under-attack warning**: red striped banner under the HUD ("WARNING! Virus attacking your units"), the attacked tower's hex glows red while it's drained. Fires when a Virus or Bug latches on; Bug gets its own line ("Bug attacking your units"). Throttled so it doesn't flicker (shows ~2.5 s, re-arms after ~6 s).
- **Tower unlocked**: same banner style in green (`Icon_Chevron_Green.png` exists for this), "NEW TOWER UNLOCKED: PULSE", and the tray card pulses once.
- Both are one shared "alert strip" component, so later alerts (Crash, wave incoming) reuse it.

### Phase C: Content file + loader
- The game reads one file at runtime: proposed `Code/content/TDX_Narrative.md`. Format is **exactly Jogo's current `Key: value` lines**, so Obsidian stays the editor. Headings (`##`) are ignored by the parser; they're just for Jogo.
- Images the game uses are copied into the served folder: `Code/assets/avatars/` (the `_S` resized set) and `Code/assets/icons/`. Needed because the dev server (and GitHub Pages in M7) only serve `Code/`.
- Parser rules: archives are numbered (`Archive1_…`, `Archive2_…`); any number of Core and Secondary memories; empty values are skipped; missing icon falls back to `Av_BLANK_S.png`. Problems (e.g. a typo'd key) show as warnings in the debug menu, never a crash.
- Tests added to `tests/sim.mjs` for the parser and memory-loss maths.

### Phase D: The screens and flow
Flow: Main Menu → **Level Data** → **Archive Record** → Gameplay → **Level Result** → Main Menu.
- Built in HTML/CSS (frames, glow, bars, buttons at runtime), using Jogo's icons for back, info, result tick/cross.
- **Level Data**: Back (to menu), `Level_N_Label` in the bar, `Narrative_Label`, `Narrative_Desc`, Continue.
- **Archive Record**: Back (to Level Data), info icon + "Archive Record" bar, avatar, Name / Bio / Type / Description, the run's one Core Memory (full text) and three Secondary Memories (full text), "Victim under attack / Defend their data!", Start.
- **Level Result**: success/fail icon, RESULT, outcome label, "Cores protected" pill (yellow on win, red on loss), the archive's avatar with Info button (opens Archive Record as a pop-up with Back), "Memories Lost" list (summaries), Continue.
- Replaces today's LEVEL COMPLETE / game-over banner. BITS reward and "next level unlocked" text move onto the Result screen.

### Memory loss rules (from the Todos)
- Each run picks 1 Core Memory and 3 Secondary Memories at random from the archive.
- Memories lost = floor(4 × coresLost ÷ (startCores − 1)), capped at 4. With 15 Cores: lose 4 → 1 memory, 8 → 2, 12 → 3, 14 (one Core left) → all 4. Works for any Core count.
- Secondaries go first (random order), the Core Memory goes last, so losing it always means you were down to the wire. Losing the level loses everything.

### Phase E: Close
Playtest on phone, devlog, `VERSION` → 1.04 Disc Drive. Jogo commits and tags via GitHub Desktop.

## Questions for Jogo (my recommendation in bold)
1. **Archive choice per level**: fully random from the whole pool, or each level names its pool? **Each level names a pool** (`Level_1_Archives: 1, 2, 3`), falling back to the whole pool if blank. That's what lets the story escalate (people at L1, organisations later, the hostile-org twist).
2. **Cores pill**: the mockup says X/5; the game has 15. **Show the real count (X/15).**
3. **Narrative screens on retry**: show both every time, or skip Level Data on a replay? **Show both, Continue is one tap**; easy to change.
4. **Where the content file lives**: **`Code/content/TDX_Narrative.md` becomes the master** and `Docs/TDX_Game_Narrative_Content.md` is retired (one copy, no drift). Obsidian can open it there.
5. **Outcome label** ("Archive outcome label" on the Result screen): **two strings in the .md**, `Result_Win_Label` and `Result_Lose_Label`, optionally overridden per archive.

Small content notes spotted: Level 3's description is keyed `Level_4_Narrative_Desc` (so L4's gets overwritten), and two Archive2 lines are missing their colon. The parser will flag these.

## Experiment log

### E15 — Bug + Stinger into the rosters (2026-10-23)
Hypothesis: adding the two units changes difficulty little. Sim, 100 seeds per level, live and reactive bots (`tools/sim/m4_roster.mjs`).

| Level, bot | M3 config: lost / lives / Viruses | Added as-is | E15 final |
|---|---|---|---|
| L3 live | 9% / 7.7 / 17.9 | 7% / 9.1 / 15.6 | 9% / 8.2 / 18.8 |
| L3 reactive | 22% / −0.5 / 17.8 | 10% / 6.9 / 14.6 | 16% / 0.3 / 18.2 |
| L4 live | 10% / 2.0 / 27.7 | 4% / 11.3 / 21.8 | 6% / 10.3 / 30.0 |
| L4 reactive | 17% / −0.7 / 27.8 | 10% / 9.3 / 21.6 | 7% / 8.0 / 28.9 |
| L5 live | 34% / −40 / 32.9 | 9% / 8.2 / 25.5 | 14% / 6.0 / 34.0 |
| L5 reactive | 35% / −11 / 32.4 | 15% / 5.3 / 24.8 | 35% / −18 / 34.3 |

- Added as-is: much easier. Uniform picks per type mean two new types dilute the Virus (−20%).
- Virus pick weight alone restored Virus numbers but L3–L5 stayed easy: Bug and Stinger are weaker than their Threat EV (Stinger also paid 90 Tokens).
- **Final (in config.js):** Virus weight 1.25 (L3) / 1.5 (L4, L5); Bug EV 110; Stinger EV 90, reward 40. Three knobs, not the one the plan allowed: one fixes the dilution, the other two reprice the units.
- Ledger: L1–L2 unchanged; L3–L5 late waves read easier (off-target 0.30/0.35/0.36 → 0.35/0.41/0.42). The Ledger doesn't model Bug drain or detours.
- Verdict: pending Jogo's playtest. Rollback: remove `weights` and the Bug/Stinger roster entries in config.js, restore the old EVs (noted in the ENEMIES comment).
