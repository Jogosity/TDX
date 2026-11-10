# TDX Dev Log

Cross-session continuity notes. Newest session at top. Companion to `TDX_Initial_Design.md`.

---
# ✅ MILESTONE 8 COMPLETE — v1.08 "Hypercard" — 2026-11-10

Closed by Jogo after a day of tuning ("Sound and Music are in and behaving well"). M8 was Sound and Music; plan in `Docs/TDX_M8_Plan.md`.
- **Synth SFX, no sound files** (`js/synth.js`): every effect is a small recipe rendered in code, tuned by Jogo in the Mixer to Beta quality.
- **Audio engine** (`js/audio.js`): music / SFX / UI buses, mobile first-tap unlock, pause in the background, iOS silent switch where supported, master limiter.
- **Anti-spam**: per-sound voices and gap, a 14-voice cap, and priorities so rare heavy shots and game events beat rapid fire.
- **Sound Mixer** (`tools/mixer/`): tap tower and enemy icons, shape every sound live, stress-test the voice rules with a full board, set music, Save to `js/sounds.js` via `serve.py`.
- **Music**: menu track plus a pool of 4 wave tracks (Meta Sound and Music, credited in `sounds.js`); a track runs for 3 waves, drops to 35% between waves, fades on change; win and fail stings.
- **SOUND tab** in the cog menu (mute, Music, Sound effects), saved with the profile.
- Hooks everywhere: buttons, tray, story whooshes, Tutorial and hint pop-ups, teletype and Cores count-up clicks, all game events.
- Also landing with this close (from other threads): Deleter price 200 → 400 (finding F11; F12 on T2 Threaders, no change) and enemy delta tweaks on two levels in `levels.js`. Strongest-at-T2 for the Deleter is not built yet.
- `VERSION` → **1.08 Hypercard**. Tests 161 → **193**.

Next: M9 "Integer" — Re-engagement.

---
# ✅ MILESTONE 6 COMPLETE — v1.06 "Goto" — 2026-11-07

Banked by Jogo with M5. M6 was Publishing: the game is live at **https://jogosity.github.io/TDX/**.
- `.github/workflows/pages.yml` publishes on every push to `main`. Only the playable game goes up (`Code/index.html`, `js/`, `assets/`, `content/`); the Level Editor, Ledger, tests and `serve.py` stay local.
- The custom domain (punkarcade.net) moved to the low-priority backlog.
- `VERSION` → **1.06 Goto** (one bump covers both milestones).

---
# ✅ MILESTONE 5 COMPLETE — v1.05 "Elm" — 2026-11-07

Banked by Jogo after the S21 playtests (L1–L4 "better than ever"; L8 "VERY intense… loads of fun, perfectly on the edge" once its surge stopped stacking Viruses). M5 was Balance and Expansion, and like M3 it was as much about **method** as results: every balance change went through a rule, the Sim or the Ledger, and the findings are written up for the agentic difficulty-balancing write-up in `Docs/TDX_AI_Balance_Notes.md` (F1–F10 plus method notes). Plan: `Docs/TDX_M5_Plan.md`.

- **Level Editor** (`tools/editor/`, S17): drag-and-drop board, intensity curve with pins, roster lanes, Blueprint slots and unlock track, live Ledger pressure against a target, Save with checks, undo. Levels live in `js/levels.js`.
- **10 levels** (S17–S21), shaped by Jogo in the editor: more entry points, blockers and Lockouts later on ("board pressure", the third screwdriver).
- **Economy by rule:** swarm units pay per HP (F1: Slice 9, Stinger 24); tower value measured as HP removed per second per 100 Tokens (F3); upgrades from one rule, `UPGRADE.valueShare` 0.6 (F4).
- **Special Powers**, one per tower from a tier: Self Defence, Self Repair, Long Choke, AntiVirus, Cluster Bomb, Overclock (S19).
- **Sim 'skilled' bot** that diversifies and upgrades (F5); Ledger Token-income pies (S18).
- **Spawning:** Slice pack cooldown, "horde mode" (F6); tougher Worm, Bug and Stinger (F10).
- **Breach Surge** (S21): a per-wave panic moment. Countdown on the alert strip, entry points throb, then an extra x × TEV pours from every entry point past the MAV cap (keeping spawn cooldowns). One per level from L4. Editor: click a bar to toggle, Surge size knob. Sweep in F9.
- **Blueprints** spread over L1–L8, with a swoop from the board to the tower's tray button.
- **UX:** Analytics Report after each level, ★/• memory marks with lost memories in red, "Level N" in the HUD, Level Select PLAY button, icon layout fix.
- Tests 104 → **128**.

Carried forward to M7 "Fortran" (Onboarding & Presentation): Tutorial level (L0) and FTUE, narrative-screen UX items, Deleter fire light-up, polish backlog. Balance keeps rolling: L8–L10 retests after the surge fix.

---
## Session 26 — 2026-11-09 — M8 "Hypercard" starts: the audio engine

Plan: `Docs/TDX_M8_Plan.md`. M8 is now Sound and Music (Re-engagement moved to M9 "Integer"). Jogo's calls: synth SFX + licensed music; the four plan recommendations (D1–D4) accepted; a voice cap with priorities for the sound chaos.

- **`js/synth.js`**: a tiny retro synth. A recipe of numbers (wave, pitch slide, envelope, punch, arpeggio, vibrato, noise, low-pass sweep, bit-crush, layers) renders to samples, so no sound files. Pure maths, Node-tested.
- **`js/sounds.js`**: the sound list, where all sound tuning lives (like config.js for balance). 31 sounds: UI (tap, back, select, error, popup, whoosh), one fire sound per weapon, enemy death (small, and big for Crack/Worm), Core lost, Virus/Bug attack warning, build / tower online / sell / upgrade / upgrade done / tower destroyed / CRASH / Blueprint / unlock, wave start / cleared, surge tick / breach, win and fail stings. `MUSIC` has the menu / game / final-wave cues with `file: null` until tracks are sourced.
- **`js/audio.js`**: music, SFX and UI buses into a master limiter; wakes on the first tap (mobile rule); pauses while the page is hidden; asks iOS for an 'ambient' session (silent switch) where Safari supports it; music crossfades and stings duck the loop.
- **Anti-spam (`VoicePool`)**: per sound `voices` (copies at once) and `gap` (seconds between starts), plus `AUDIO.maxVoices` = 14 overall. When the pool is full a new sound cuts the oldest lowest-priority voice if it outranks it, otherwise it's dropped. Priorities rank rare, heavy shots over rapid fire (Deleter 60 > DDOS 40 > Defrag/Compressor 35 > Pulse 30 > Threader 20), game events above guns, stings 100. Test: a full board firing for 10 s peaks at 10/14 voices and the Deleter is never dropped.
- **Hooks**: every button clicks (one listener; back-style buttons blip down, `data-sfx` overrides); tray select/deselect/error; story screens whoosh; Tutorial and hint boxes pop; game events in game.js. Entities only set flags (`fired`, `upgradeDone`), so the Sim stays sound-free.
- **SOUND tab** first in the cog menu: mute, Music and Sound effects sliders, saved in the profile (`save.audio`, defaults music 60%, SFX 80%).
- Tests 161 → **181**. Browser check at iPhone size: audio starts on the first tap, sounds fire in a wave, no errors.

### Sound Mixer (`tools/mixer/`, same session)
Open http://localhost:8000/tools/mixer/ with `serve.py` running (Save only from the Mac, like the editor).
- **Tap to hear**: tower icons play their fire sound, enemy icons their death sound; the list on the left has every sound by group (UI, Towers, Enemies, Game, Waves, Stings), with a dot on ones changed since the last save.
- **Shape it**: the waveform shows the sound; Dials (bus, priority, voices, gap, pitch vary, pitch, gain) and Recipe sliders (pitch and slide, envelope, punch, jump, vibrato, noise, low-pass sweep, bit-crush, volume) play the sound as you drag. Layers: add, remove, set their start time. Mutate nudges every setting a little; Revert undoes one sound. Space plays, Cmd+S saves.
- **Stress test**: fires a board (tower counts editable, default 6 Threaders, 2 DDOS, 2 Pulse, 1 each of the rest) using each weapon's real timing from config.js, plus kills per second, through the real voice rules. A live voice meter, and a table of played / dropped (gap, voice limit, pool full) / cut off per sound. The global voice caps are editable there.
- **Music**: a file path, gain and credit per cue (menu, game, final) with a play button; crossfade time, music level under stings, and new-player volume defaults.
- **Save** writes `js/sounds.js` through a new `serve.py` route (`POST /tools/mixer/save`, header-checked like the editor's). `sounds.js` is now in the Mixer's own format (each sound has `group` and `label`; big enemy deaths list their enemies in `for`), so a save is a one-line diff per change.
- Engine: `play(id, { force })` skips the anti-spam rules for the Mixer's Play button; `stopAll()`.
- Tests 181 → **185** (format round-trip, sounds.js is in Mixer format).

Jogo confirmed (9 Nov): in-game sound and the Mixer both work on the Mac.

10 Nov: **Teletype clicks** (Jogo). New `ui_type` sound (UI group, "Teletype key"): a short noise click per letter as the Level Data text types out, skipping spaces (`Story.teletype`). Priority 60, below taps, so typing never blocks a button sound.

10 Nov: **Wave music pool** (Jogo's plan). `MUSIC` is now `menu` (main menu, fades in) plus `waves`, a list of tracks (4 slots). Each wave start picks a track with a file (never the one just played, if there's a choice; `pickTrack` in audio.js), plays it from the top at full volume (the tracks have their own fade-in) and loops it; when the wave is cleared or the level ends it fades out over `AUDIO.musicFade`. The build phase is silent, and entering a level fades the menu music. The old game/final cues are gone. Mixer Music panel: Menu row, Wave 1–N rows with play and remove, "+ Wave track", "Next wave (random pick)". Tests 185 → **190**.

10 Nov, after playtest (Jogo: switching every wave was jarring): **a track now runs for 3 waves** (`AUDIO.wavesPerTrack`), switching at the start of waves 4, 7, 10… (`trackChangeDue`). Between waves it keeps playing at `AUDIO.breakLevel` (0.35) instead of fading out, and comes back to full at the next wave start. A track change fades the old one out as the new one starts from the top. Mixer: "Waves per track" and "Music between waves" sliders, a "Wave break" toggle to hear the lowered level; the engine now reads the Mixer's live AUDIO copy. Tests 190 → **193**. The Result screen's Cores count-up also plays `ui_type` on each step (Jogo, 10 Nov). Next: Jogo reworks the sounds themselves in the Mixer, then music tracks.

## Session 25 — 2026-11-09 — READY batch: Battle Report buttons, red dots, Deleter light-up, Towers Info

- **Tutorial Screen 5** (place a Vault) has no arrow now, so the player picks the spot.
- **Battle Report after a win:** Main Menu (left, dark outline) + Next Level (right, bright cyan), like Level Select's BACK/PLAY. Next Level reloads (the clean reset) and starts the next level's story screens (`sessionStorage` note `tdx-next-level`). A loss, or the last level, keeps Continue. Labels: Screen Text `Report_Main_Menu`, `Report_Next_Level`.
- **Red dots** (`save.js`: `affordableTiers`, `upgradesAffordable`): each tower in the Towers menu shows how many of its next tiers the Bits held could unlock in a row; the main menu's TOWERS button shows the total of those dots (1, 2, 3, 3+; Jogo's call). Locked towers never count.
- **Deleter light-up:** the 3 back chevrons light one, two, three across the fire cycle (reload + cooldown, `Tower.charge`), then it fires and they go dark; the front chevron stays lit. Tray and menu icons draw fully lit.
- **Towers Info screen** (Jogo's `Towers_Info.png`): Bits held + explainer line under TOWERS; each tower card has 4 tier chevrons (owned = solid yellow, next = outlined and pulsing if the Bits cover it, pale otherwise), what the next tier gives (`tierOffer` in config.js: HP/damage before → after, plus the Special Ability at its tier, in green), the red dot, and a list that scrolls with an always-visible cyan bar (iOS hides native bars when idle). Locked towers show pale chevrons and "Collect Blueprints".
- **One-time hints** (`HintBox` in tutorial.js, `save.hints`): the first Blueprint a player ever sees freezes the board under Screen_8 with an arrow on the drop; only the Blueprint can be tapped, and collecting it closes the box. The first Result screen that pays Bits shows Screen_9 with an arrow up at the Bits count and a tick. Each shows once per save; older saves that already have Blueprints / Bits skip them.
- **Archive tutorial overlay** (Jogo's tweak mockup): the red pointers have arrowheads, and the red box round the memories hugs the text instead of filling the empty screen (CSS only, `.tut-mode .archive-scroll`).
- **Bug fix (Jogo): Viruses no longer cross or stand on Blocked cells.** They used to fly straight at a tower and stop wherever they touched it. Now they walk open cells (Lockouts included) to a free cell beside the tower, like the Bug, and ignore a tower they can't reach (`Enemy.pickVirusTarget` in entities.js). When the tower dies they re-plan to the base from where they stand.
- **Archive pop-up** (the (i) on the Battle Report): a normal BACK button at the bottom as well as the arrow at the top. Label: Screen Text `Archive_Back` (default "Back").
- **Memory loss curve** (Jogo): on a win, the 1st memory goes at 3 Cores lost, the 2nd at 7, the Core Memory at 13; losing the level (15) takes all. One dial: `MEMORY_LOSS_AT = [3, 7, 13]` in narrative.js (was one per ceil(14/3) = 5 Cores).
- **Tutorial Screen_2 arrow** (Jogo): it now points at an open, buildable cell just above the box (never a Blocked, Lockout, spawn or exit cell, and never one that would Firewall the path), instead of the fixed screen centre, which could land on a random blocker.
- **M7 "Fortran" complete** (Jogo, 9 Nov): vague polish line dropped, lateral asymmetry to Backlog, `VERSION` → 1.07 Fortran.
- Tests 151 → **161**.

## Session 24 — 2026-11-08 — FTUE: the Tutorial sequence

Built to Jogo's `Assets/Screens/Tutorial_Screen_1–7.png` and `Archive_Details_Screen_Tut.png`. Jogo's calls: Screens 8 (Blueprint) and 9 (Bits) wait for a later level; the Tutorial plays the same way every time, with a Skip button.

### A. Tutorial sequence (`js/tutorial.js`)
- Every box shows in a wave's build phase, before START WAVE, so nothing pauses. Wave 1: Screen_1 select Threader → Screen_2 place it → Screen_3 place 2 more (counter, then tick). Wave 2: Screen_4 select Vault → Screen_5 place it. Wave 3: Screen_6 and Screen_7 point at the Repo (tick each).
- A box without a tick closes when the player does what it asks; a box with a tick closes on the tick. While a box is up, taps outside its target are blocked (capture-phase guard); the debug cog and SKIP TUTORIAL always work.
- Tutorial Box suite: text panel (teal border, glow), Icon_Button_Tick, bobbing teal arrow (tray card / board / Repo), glowing tray card, SKIP TUTORIAL pill under the HUD. Respects reduced motion.
- `TutorialScript` is the DOM-free step machine; steps live in `TUTORIAL_STEPS`.
- **Unlock override:** during the Tutorial, Threader only on wave 1, Threader + Vault from wave 2, all Tier 1. The save is never touched.

### B. Archive Record overlay
- Opening the Tutorial shows the Archive Record under the overlay: captions, red outlines, dimmed content, Continue. Continue clears it and leaves the normal card with Start. Shows every time.

### C. Text
- New CSV `Tutorials-Table 1.csv` (Tutorial_Message, Text) read by `narrative.js`; IDs ignore spaces. Defaults in `TUTORIAL_DEFAULTS`, including the overlay captions (`Archive_Tut_Top`, `Archive_Tut_Bottom`) and `Tut_Continue`, `Tut_Skip`, which Jogo can add as rows to reword.

### D. Jogo's first playtest fixes
- A finished box no longer comes back when more towers are placed (the step machine keeps a `live` flag).
- The Vault boxes (wave 2) and Repo boxes (wave 3) now show **during** the wave: 1.5 s after the wave's first enemy is on the board (`TUTORIAL_WAVE_DELAY`), and the board freezes while the box is up. Wave 1's boxes stay before START WAVE.

### Tests
136 → **151** (step machine, blocked targets, Skip, tower override, CSV text, every step has text). Browser run-through at iPhone 13 size: all 7 boxes, blocked taps, ticks, overlay.

## Session 23 — 2026-11-07 — M7 "Fortran" starts: Archive Record UX, Level 0 (Tutorial)

Plan: `Docs/TDX_M7_Plan.md`. Jogo's calls: Level 0 lives in `levels.js` as LEVELS[0]; new players still boot to the main menu, but PLAY goes straight into the Tutorial until it's cleared; the Tutorial gives **no rewards** (no BITS, no Blueprints) to keep it about learning; it's losable for now.

### A. Archive Record screen (Jogo's 7 Nov mockup)
- Small grey **"Data at Risk:"** header above the Sub-Class line (Screen Text key `Archive_Data_Risk`, default "Data at Risk:").
- "Victim under attack" banner and chevrons removed (CSV keys kept so old exports stay valid).
- The card always fits the screen (min 460px); only the memories scroll, with a soft fade at the bottom edge and a scroll bar that only shows while scrolling. START stays visible. Checked with Tail Feathers at iPhone 13 size.

### B. Archive Classes
- The finer Classes (Human Early/Late, Business Early/Late) and multi-Class `Level_Archives` were already in Jogo's CSVs. Code side: Level 0 is now a valid row; the **Tutorial** Class is never used as a fallback (it was leaking into L1 and L5); a level whose Classes have no Active archive is flagged in the debug STORY tab (currently L1 Business Early, L5 Organisation).

### C. Level 0: Tutorial
- `LEVELS[0]` = `Level 0: Tutorial` (`tutorial: true`): 3 waves (TEV 300/600/900, Hack then Hack + Slice), 500 Tokens, 1 entry point, 2 blockers, no Lockouts, no BITS, no Blueprint drops, no CRASH. Placeholder long-narrow board (12 rows, 4–5 wide) for Jogo to reshape in the editor.
- **Level number = array index** everywhere: narrative lookup, HUD ("Tutorial", then "Level N"), editor/Ledger/Sim labels, validator (the Tokens-order warning skips the Tutorial).
- **Save v2:** saves from before the Tutorial move up one level (Tutorial counted as cleared). New saves start at 0.
- **PLAY** goes straight into the Tutorial while `levelsUnlocked === 0`; after that it opens Level Select as before. Level Select hides "+0 BITS"; the Result note drops "+0 BITS earned".
- Sim: every bot clears the Tutorial with 15/15 Cores.
- Tests 128 → **136**.

### Next
Jogo reshapes Level 0 in the editor and playtests. FTUE waits for the Tutorial Box screen designs.

## Session 21 — 2026-11-06 — Blueprint spread, massive attack

### A. Blueprint spread over L1–L8
One new tower unlocks per level from L1 to L5, Deleter at L6–7; drops run to L8, and L9–L10 have none (everything is unlocked by then). Each tower is teased as a secondary or tertiary drop the level before its primary, with a catch-up drop the level after.

| Level | Primary 15% | Secondary 5% | Tertiary 3% |
|---|---|---|---|
| L1 | Vault | Defrag | |
| L2 | Defrag | Vault | DDOS |
| L3 | DDOS | Defrag | Vault |
| L4 | Compressor | DDOS | Pulse |
| L5 | Pulse | Compressor | Deleter |
| L6 | | Deleter | Pulse |
| L7 | Deleter | | |
| L8 | | Deleter | |

Checked with a drop model (Ledger kill counts × drop rates × share of drops tapped, 1,500 runs). Median unlock level at 50% of drops tapped: Vault 1, Defrag 2, DDOS 3, Compressor 4, Pulse 5, Deleter 6. At 30% tapped, 1 player in 10 still lacks Vault or Defrag after L3.

### B. Blueprint pickup swoop
A tapped Blueprint rises, spins and dives to its tower's tray button (1.0 s, Jogo's call after first try at 0.7 s), which pulses in the tower's colour; then the count toast or TOWER UNLOCKED fires. The save is written at the tap, so nothing is lost mid-flight. `ui.flyBlueprint()`; skipped under reduced motion.

### C. Level Select PLAY button
BACK (dark) and PLAY (bright cyan, same as the main menu PLAY) now sit side by side under the list. PLAY starts the selected level, which is the latest unlocked one (`game.latestLevelIndex()`); that row gets a 2px cyan outline and glow. Tapping any unlocked row still starts that level.

### D. Breach Surge (massive attack, option 1 of 3)
A wave with `surge: x` in `levels.js` gets an extra x × TEV of enemies. Once half the wave's TEV has spawned, the alert strip counts down "BREACH DETECTED / Surge in 5…1" and the entry points throb red. Then "BREACH!" fires with a light shake, and the surge pours from every entry point in turn (one enemy per 0.12 s), ignoring MAV and spawn cooldowns. The wave isn't complete until the surge is out and dead. Shape constants: `SURGE` in config.js (trigger 0.5, warning 5 s, gap 0.12 s, editor default 0.3).
- Editor: click a wave's bar on the Intensity chart to toggle a surge (red stack on the bar); the Surge size knob sets every surge in the level. Validator: 0 < surge ≤ 2.
- Ledger: the surge adds to the wave's budget and lands on top of a full field in the burst check.
- Sim: works through WaveController unchanged. Sweep in Balance Notes F9. Tests 127 passing (6 new).
- Applied (Jogo's go-ahead): one surge per level from L4, ~75% through. L4 W8 0.3, L5 W8 0.3, L6 W9 0.5, L7 W9 0.5, L8 W9 0.5, L9 W10 0.3, L10 W12 0.3.

### F. Surge respects spawn cooldowns (Jogo's L8 playtest)
L8's surge (0.6, Virus weight 1.5) poured a swarm of Viruses that mowed the defence down, and the run never got stable again. Surges ignored spawn cooldowns, so the Virus 4 s cooldown that stops drain stacking didn't apply. Now a surge still ignores MAV but keeps every type's cooldown. Skilled bot on the surge wave, L5–L10: Viruses roughly halve (L8 21 → 11) and towers lost to drain fall 35–65%. New test; 128 passing.

### E. Fix: icons stacked top-left on the Towers and Enemies screens
A global `canvas { position: absolute; inset: 0 }` rule (meant for the game board) caught every icon canvas, so each one needed its own `position: static` patch (tray, Analytics). The rule now targets `#game-canvas` only and the two patches are gone.

## Session 20 — 2026-11-05 — Slice pack cooldown

Slices had no spawn cooldown, so packs landed back to back and the MAV squeeze favoured them (cheapest unit). `ENEMIES.slice.spawnCooldown: 5`. Skilled bot L5–L10: Slice share of spawns 55% → 35%, spawns −12%, L10 losses 6/8 → 2/8; Stingers take up some of the room (20% → 30%). Detail: `Docs/TDX_AI_Balance_Notes.md` F6.

Later: Jogo's L5–L10 playtest (fewer, better, upgraded towers) + skilled bot on all levels, with a new `upgradeAt` option (upgrade before building from N guns). Upgrading now matches building with 20–40% fewer guns; losses sit in the openings (L3, L8, L9), survivors coast late. F7.

Then F8: L6/L7 enemy health 2.1/2.2, L8/L9/L10 starting Tokens 950/1000/1000 (skilled-bot sweeps). Finding: enemy delta bites the opening more than the late game; the curve's end handle is the late-game dial.

### UX (evening)
- Archive screen: Core/Secondary headings gone; ★ before the Core Memory, • before each Secondary Memory. From the Result screen's Info button, memories lost this run show in rgb(247, 0, 93).
- New **Analytics Report** screen after the Result screen (wins and losses): towers built / lost / upgraded, Tokens earned (kills + sells) / spent (builds + upgrades), enemies destroyed, and Cores lost by enemy with the board's own enemy icons. Counts live in `state.stats` (`newLevelStats()` in `js/game.js`); labels are Screen Text strings (`Analytics_*`) so the CSV can reword them.
- HUD: "Level N" above "Wave x/y".

## Session 19 — 2026-11-04 — Upgrade values from one rule

Upgrades were poor value: each step returned ~20% of a new tower's HP/s per Token at T2, near zero at T4 (detail: `Docs/TDX_AI_Balance_Notes.md` F4). New rule: the T2 upgrade gives `UPGRADE.valueShare` (0.6) of the tower's T1 value per Token, with damage and HP rising in equal steps (×4.6 at T4). Threader, Pulse, Defrag, Compressor and DDOS use `upgrade: 'rule'`; Deleter, Vault and Limiter keep `tier4`. `tierStat()` lives in `config.js`, shared by the game, the Ledger and the tests. Tests 107 passing (3 new: the value rule, equal steps, tier4 towers still interpolate).

### Special Powers (one per tower, from a tier)
Data in `TOWERS[x].power` (`js/config.js`); behaviour in `js/entities.js` (`hasPower`). The upgrade button shows ★ and the power name on the tier that switches it on.
- Threader, T2, **Self Defence**: targets an enemy draining it before anything else.
- Vault, T2, **Self Repair**: regains 10% of max HP per second after 5 s without a hit.
- Compressor, T3, **Long Choke**: +50% range (the range ring grows with it).
- Defrag, T2, **AntiVirus**: +50% damage to Viruses and Bugs.
- DDOS, T3, **Cluster Bomb**: grenade blast radius ×2.
- Pulse, T4, **Overclock**: +50% fire rate.
Range, blast and fire rate share one `kind: 'boost'` (a weapon stat × mult). The Ledger's tower table doesn't count powers yet. Tests 118 passing (11 new).

### Sim: 'skilled' bot (F5)
New bot = reactive + Threaders first, specialists from W4 (`DIVERSE` mix, saving up only while nothing has leaked) + upgrades once the board is full. `node tools/sim/run.mjs` now includes it. L5–L10: late waves held far better (L8 late leaks gone); remaining losses are mostly the wave 2 cliff on L6/L8/L9/L10, and L10's late waves. Tests 121 passing.

## Session 18 — 2026-11-03 — Token income pies, swarm rewards by rule

### A. Ledger: Token income
New section after Level summary: a donut per level (starting Tokens + kill income by enemy type), click to select, with a table for the selected level. Campaign Pressure now in two rows of 5.

### B. Swarm rewards from a rule (detail in `Docs/TDX_AI_Balance_Notes.md`, F1)
The pies showed Slice + Stinger earning ~52% of kill income from L3 on. Of three pricing rules anchored on Hack (per EV, per HP, per threat), only per HP cuts swarm pay. Applied to swarm units only: **Slice 10 → 9, Stinger 40 → 21** (`reward = round(health × 0.3)`); Bug stays 30. Ledger: income −17%, swarm share 52% → 41%. Sim: banked Tokens before the last wave roughly halve; L5 gets harder (watch it in play). Tests 105 passing.

### C. Playtest follow-ups
- L5 lost on W10 with the new rewards: its HP multiplier made every reward worth less (F2). L5 `enemyDelta.health` 1.75 → 1.6. Jogo then cleared it with 3 of 15 cores left.
- Tower value bench with the real combat code (F3): Defrag damage 7 → 30 (T4 77), Compressor 7 → 10 (T4 21), Deleter price 700 → 200. DDOS left alone (its value is range). Tests 105 passing.

### D. Archive screen: less text
Archive Class line removed (still in the CSV for writing); 3 memories shown instead of 4 (1 Core + 2 Secondary, `SECONDARY_SHOWN` in `js/narrative.js`); a blank line between Secondary Memories. With 3 memories and 15 Cores, one is lost per 5 Cores lost.

## Session 17 — 2026-11-02 — M5 "Elm" starts: Level Editor, 10 levels

Plan agreed with Jogo: `Docs/TDX_M5_Plan.md` ("build it, we'll iterate faster that way"). Jogo commits via GitHub Desktop.

### A. Level data gets its own file
- `js/levels.js` holds every level as plain data. `config.js` re-exports `LEVELS`, so the game, Sim, Ledger and tests read it unchanged. `genWaves` and the OPENING constants are gone from the game; the waves they made are written out as numbers.
- Proof: the data matched the old config value for value, and the Sim gave identical output before and after (same seeds).
- New per level: `grid.entryRows` (extra entry points sit in the top N rows, was a fixed 5) and `grid.entryMinDist` (at least N steps from the base), used by `board.js` and CRASH.
- `design` per level is for the editor and Ledger only: `curve` (intensity handles) and `target` (the Ledger's start/end pressure, moved out of `tools/ledger/target.js`).

### B. Level Editor (`tools/editor/`)
- http://localhost:8000/tools/editor/ while `serve.py` runs. **Save** writes `js/levels.js` through a new POST route in `serve.py` (localhost only, atomic write, only accepts the editor's own file). Every save is a clean diff: one key per line, one wave per line (`format.js`; a test checks the file is exactly what the editor would write).
- Panels: level strip (drag to reorder, add, duplicate, delete, Ledger verdict per level); **Board** (live preview from the real board code, drag row ends to resize, + / − row, entry points, entry rows, min distance to base, blockers, Lockouts, Shuffle, theme colours, enemy routes); **Intensity** (TEV bars and MAV ticks, three handles bend the curve, per-wave pins, peak TEV/MAV, spawn gaps, cold-start wave 1 toggle); **Ledger pressure** live against a draggable target; **Roster** lanes (drag enemies onto a wave, drag bars and ends, pick weights, expected count per wave); **Unlocks** (drag towers into drop slots; unlock track across all levels) and economy sliders.
- Undo/redo (⌘Z / ⇧⌘Z), ⌘S, unsaved-changes guard. Save is blocked while any level fails the checks (`validate.js`, shared with the tests).
- Curve model (`model.js`): intensity I per wave from a monotone curve through start/mid/end; TEV = peak × I, MAV = peak × √I, RTV = MAV/2, spawn gap slow→fast. M1–M4 waves were fitted; a few waves that sit off the curve carry pins so nothing changed.
- The Ledger's Shaping dials are removed (the editor does that job live); the Ledger points to the editor.

### C. 10 levels and the unlock spread
- L1–L5 unchanged in waves and boards. L6 Twin Gates, L7 The Spire, L8 Crossfire, L9 Deep Core, L10 Root Access are drafts (names and themes are placeholders) with new shapes, 11–15 waves and peak TEV 21k–27k.
- Kill counts are high (Ledger: ~210 kills in L1 up to ~1,500 in L8), so any slot a tower is in usually unlocks it that level. Spread: Vault L1, Defrag L2, DDOS L3, Compressor L5, Deleter L6, Pulse L8; L4, L7, L9, L10 drop nothing new. Tertiary teasers in L1 (Defrag) and L2 (DDOS). Drop rates vs kill counts is a balance-pass question.
- Sim (8 seeds, Threader-only bots, so harder than real play): L6–L7 easy; L8–L10 lose 25–50% of runs, mostly to a wave 2 spike (the first full-size wave). Ledger reads every level "too easy" (its known blind spot: no drain).
- Levels without `Level_N` rows in the Levels CSV skip the Level Data screen; the STORY tab now lists them.
- Tests 94 → **104** (editor checks over levels.js, file format round-trip, curve, lanes, wave count, entry rules). The old BP promotion and fixed-tertiary tests are gone (slots are free-form now).

### Later the same day
- Ledger: Campaign Pressure split into two rows of five levels (same scale on both).
- Fix: debug Unlock / Lock all levels and towers now redraw the open menu screen (Level Select stayed stale behind the debug menu since M4).
- **Levels CSV is one row per level** (Jogo's reorganisation): columns `Level_Number`, `Level_Label`, `Level_Narrative_Label`, `Level_Narrative_Desc`, `Level_Archives`; other columns are ignored. Bad or repeated level numbers show in the STORY tab. The old StringID layout is no longer read. Tests 104 → 105.

### Next
Jogo: "a good session, the editor is really helpful and the workflow is smooth." Next session: Jogo playtests and balances in the editor, then we run the Sim and compare its numbers with his experience. One more day on content, then M6 (game online). Balance pass items: wave 2 on L8–L10, drop rates, L3 reactive losses, and the M4 ideas list.

---
# ✅ MILESTONE 4 COMPLETE — v1.04 "Disc Drive" — 2026-11-02

Banked by Jogo after a playtest: "the balance is ok enough that we've not broken the game", with the rebalance in M5. M4 was Narrative and Content: give the game meaning through screens before and after each level, with Jogo leading the creative. Plan and experiment log: `Docs/TDX_M4_Plan.md` (E15).

- **Narrative screens** (`js/story.js`), built to Jogo's mockups: Level Data (teletype description) → Archive Record → game → SUCCESS/FAILURE verdict over the board → Level Result slides in (Cores pill counts up, lost memories glitch in), with an Info pop-up. Sequential builds, tap to skip, timings in `TIMING`. PLAY now opens Level Select.
- **Memory narrative** (`js/narrative.js`): per run, 1 Core + 3 Secondary memories from a random archive in the level's Class pool. One memory lost per 4 Cores lost; the Core Memory goes at one Core left; a loss takes all.
- **Content workflow:** Jogo writes in Apple Numbers (`TDX_Text.numbers`) and exports CSV into `Code/content/TDX_Text/`. Archives carry an Active flag; levels name the Classes they draw from; problems show in the debug STORY tab. Adding content needs no code.
- **Bug + Stinger in the rosters** (E15): Virus pick weight per level plus repriced EVs keep M3's Virus pressure.
- **Alerts:** red under-attack warning with a pulsing hex; teal tower-unlocked message.
- `VERSION` → **1.04 Disc Drive**. Tests 77 → **94**.

Carried forward to M5 "Elm" (Balance and Expansion): level editor tool, 10 levels, hand-tuned waves, the M4 ideas list, the E15 balance (L4/L5 a little easy in the sim). Content (more Active archives, L2–L5 level text) rolls out continuously through the CSV workflow.

---
## Session 16 — 2026-10-23 — M4 "Disc Drive" starts: rosters, alerts, narrative screens

Plan agreed with Jogo: `Docs/TDX_M4_Plan.md`. Jogo's calls: each level names its archive pool; Cores pill is X/15; both story screens show on retries; the narrative .md moves into Code; win/lose labels live in the .md. Jogo commits via GitHub Desktop.

### A. Bug + Stinger in the rosters (E15, detail in the M4 plan)
- Stinger joins L3 from wave 3; Bug + Stinger join L4 and L5 from wave 2.
- Sim (100 seeds, live + reactive bots): adding them as-is made L3–L5 clearly **easier**. Cause: picks are uniform per type, so two more types cut Virus numbers ~20%, and the Virus is the difficulty.
- Fix: per-level roster pick **weights** (`weights` in genWaves; `pickWeighted` in waves.js, mirrored in the Ledger): Virus ×1.25 (L3), ×1.5 (L4, L5). Repriced Bug EV 170→110, Stinger EV 130→90, Stinger reward 90→40 (both were weaker than Threat EV says; Stinger paid far more Tokens per threat than anything else).
- Result vs M3: Virus counts and towers lost to drain back to M3 levels. L3 and L5 (reactive) match M3; L4 and L5 (live bot) come out a little easier. Ledger rates late waves easier (off-target +0.05) because it can't see Bug drain or Stinger detours, same blind spot it has for the Virus. Jogo's playtest decides.
- Tool: `node tools/sim/m4_roster.mjs [seeds] [levels]`.

### B. In-game alerts
- Alert strip under the HUD using Jogo's chevron art: red "WARNING! Virus/Bug attacking your units" (throttled, one per 6 s) and teal "TOWER UNLOCKED / PULSE" (tray card pulses). The drained tower's hex pulses red.

### C. Narrative content
- `Code/content/TDX_Narrative.md` is the master (old Docs file is a pointer stub). Same `Key: value` format; `>` lines are notes; a plain line after a key is a new paragraph; new keys: `Level_N_Archives`, screen strings (`Result_Win_Label` …), optional per-archive `Win_Label`/`Lose_Label`.
- `js/narrative.js`: parser (flags typos), archive pool, run roll (1 Core + 3 Secondary), memory loss: 1 per 4 Cores lost, Secondaries first, Core Memory at one Core left, all on a loss.
- Images: `Code/assets/avatars/` (copy of Assets/Avatars/Resized) and `Code/assets/icons/` (Jogo's icons with the white background made transparent).

### D. Screens
- `js/story.js`: Level Data → Archive Record → game → Level Result (+ Info pop-up with Back), built to the mockups. Replaces the LEVEL COMPLETE / REPO BREACHED banners; BITS + level unlock note sit on the Result screen.
- Debug menu STORY tab: content problems list, Level Result previews.

### Later: content moves to Numbers → CSV (2026-11-01)
- Jogo writes in Apple Numbers, one table each for Archives, Levels and Screen Text, and exports CSV (File → Export To → CSV) into `Code/content/TDX_Text/` (named after the source file, TDX_Text.numbers) under the export's own names (`Archives-Table 1.csv` …), so exporting takes one click.
- Archives: one row per archive with its memories in that row. Headings: Name, **Active** (YES = in the game), Archive Class (→ Type), Archive Sub-Class (→ Description), Archive Desc (→ Bio), Icon (coming), Core Memory N / Summary, Secondary Memory N / Summary. Any other column (Status, notes) is ignored.
- Level pools now name **Classes**: `Level_N_Archives` = e.g. `Business` or `Human, Corporation`. Blank = any Active archive.
- `narrative.js`: CSV parser (quoted cells, commas, line breaks), trims stray spaces, tolerates a Text cell repeating its key; problems listed in the debug STORY tab. `TDX_Narrative.md` is no longer read.
- Tests 91 → 94.

### Tests
77 → **91** (parser, pools, run roll, memory loss, weighted picks, the real .md parses).

### Next
Jogo playtests on phone (screens, alerts, L3–L5 with Bug + Stinger). Then content writing, polish from playtest, v1.04.

### Same day: screen timing (Jogo's request after the first look)
- **PLAY → Level Select** every time (the existing Levels menu, until a narrative map screen exists).
- **Sequential builds** (`story.js`, all timings in `TIMING`): card first, then Back, bar (wipes in), label, title. The Level Data description **teletypes** with a blinking cursor (38 chars/s, pause between paragraphs), then Continue rises. Archive Record slides its parts in one by one; the warning line pulses. Tap anywhere to finish a build instantly. Respects reduced-motion.
- **End of level:** the board freezes and holds ~0.9 s, then the SUCCESS / FAILURE icon and title pop over the game; ~2.2 s later the Result screen slides up and builds: pill counts up to the Cores left, lost memories glitch in one at a time.

---
# ✅ MILESTONE 3 COMPLETE — v1.03 "Cobol" — 2026-10-21

Banked by Jogo after the Session 15 playtest. M3 was Difficulty Management, and it was about **method as much as results**. Full record: `Docs/TDX_M3_Difficulty_Plan.md` (experiments E1–E14).

- **The Ledger** (`Code/tools/ledger/`, v5): difficulty maths in the browser, read live from `config.js`. Sections: Shaping dials, Calibration, Campaign pressure, Level summary, Enemy arrivals, Fill rate, Wave table, Tower value, Enemy value, How the ledger works.
- **The Sim** (`Code/tools/sim/`): headless games using the real game modules, with greedy, live and reactive bots, a killing-ground option and a DDOS standoff option. Run `node tools/sim/run.mjs [seeds]` from `Code/`.
- **The tuning loop**: target curves, then experiments: EVs to Threat EV, wave 1 cold-start fix, Virus tax measured, Virus spawn cooldown, Virus damage 15 → 10, Viruses spread across towers.
- **Result**: L1–L4 play slightly easy, L5 slightly hard. Jogo: "We don't feel far away. The methodology feels right." He'd rather land slightly easy than slightly hard.
- Tests: 77/77.

Carried forward (M4/M5 lists and the plan's M4 ideas): L5's early Virus count, unit EVs once the last units are in (Worms rare, Hacks uncommon), Threader self-defence, ebb and flow within a wave, the Ledger's missing Virus spiral, L3's layout, Bug + Stinger in rosters, tower value (DDOS, Compressor, Pulse), Defrag as an anti-virus tower.

---
## Session 15 — 2026-10-20 → 21 — Sim v1, the Virus drain, Ledger v5, M3 banked

Full detail in the plan, E6–E14.

### Sim v1 (E6–E9)
- Headless loop mirroring `game.js` `update()`, seeded, using the real modules. Lives can go negative so every wave is measured; `lostAtWave` records the real game over.
- Bots: `greedy`, `live`, `reactive`. The reactive bot builds a Vault beside a latched Virus, keeps a picket Vault, and rebuilds drained towers. Options: killing ground near the base, DDOS standoff.
- Findings: the Virus drain is the difficulty. Play collapses into a Vault-and-Threader loop. "First" targeting ignores a latched Virus. Killing-ground and DDOS tests didn't beat Threader spam.

### Balance changes (`config.js`, `waves.js`, `entities.js`)
- **E7:** wave 1 MAV ×0.5 (`OPENING_MAV`). L3 W1 leaks in the sim fell from 9.8 to 1.7.
- **E11:** per-enemy `spawnCooldown` (generic; Virus = 4 s), enforced in `WaveController`.
- **E13:** Virus damage 15 → 10.
- **E14:** a Virus prefers a tower no other Virus is draining, which cuts stacking from 14–19% to 2%. The cooldown itself was working (smallest gap 4.00 s over ~1,000 spawns); stacking came from later Viruses catching up with a latched one.
- `VERSION` → **1.03 Cobol**.

### Ledger v3–v5 (E7, E10, E12)
- Burst pressure (full field vs damage while crossing), split by entry points.
- Virus tax: Tokens of towers lost per Virus, measured by the sim. Now 110 at damage 10 (E13).
- v5, from Jogo's review (`Docs/TDX_Ledger_Review.md`): one Pressure line plus target with Virus shading, Shaping dials per level (they write the config recipe), Level summary verdicts, collapsed Calibration, every section named.

### Playtests
- After E11: failed L3 to Virus attrition. Decision: no more small value changes until the Ledger review.
- After E13/E14: L1–L4 a bit easy, L5 too hard (many early Viruses), Viruses/Cracks/Slices dominate, little ebb and flow. **M3 banked.**

### Next
**M4 "Disc Drive"**, Narrative and Content (see `TDX_Todos.md`). Jogo wants a break from charts and numbers.

---
## Session 14 — 2026-10-19 — Ledger v2, Threat EV, wave 1 fix: "best game by a long way"

Housekeeping: iCloud connection checked, game + Ledger servers running, Jogo's Live Test note updated. Decision: **keep working on main** for now (nothing risky yet). Full detail in the plan's experiment log (E2–E5).

### Ledger v2 (E2)
- **Target curve** (`tools/ledger/target.js`, ledger-only): per level start 0.5 → end 0.85…0.95 (L1→L5), straight climb, −0.1 dip after the middle wave. Tiles show "off target by".
- **Fill panel** (Jogo's Fill Rate idea): time to fill MAV vs time to clear a full field, per wave.
- **Threat EV** = HP × speed (Hack = 100) and an EV vs Threat EV chart: Crack, Worm, Bug underpriced; Virus, Stinger overpriced (before abilities).

### Balance changes (`config.js`)
- **E3 — EVs → Threat EV:** Hack 100, Crack 360, Worm 600, Slice 60, Bug 170, Stinger 130. Old values in a comment above ENEMIES. Test "wave budget fully spent" now uses `cheapestEV()` (was hard-coded `< 30`).
- **E4 — Virus back to 300 EV:** at 150 it came in large numbers and its drain was lethal. Jogo loves the unit; HP and damage unchanged.
- **E5 — Wave 1 cold-start:** `OPENING_ROSTER = ['hack','slice']` and `OPENING_SPREAD = 1.5` (spawn interval) on wave 1 of every level. Spreading alone didn't help L3–L5 (wave 1 was tank-bound by one Worm). Ledger wave 1 pressure 0.69–1.81 → 0.44–0.79; Worm and Crack now arrive in wave 2.
- Tests 74/74.

### Playtest (Jogo, L1–L3)
"The best game I have had by a long long way… very very intense." The difficulty twist is the **Virus drain**: real-time strategy, react fast to Virus attacks, use Vaults to soak damage and protect Threaders and DDOS towers, or as a distraction. This is the intended direction (Bug units are ready for it).

### What we learned
The ledger assumes towers never take damage, so its late-wave "too easy" (end pressure ~0.2) is a firepower-only reading. Difficulty has two layers: the numbers (ledger) and the drain (real-time, needs the sim).

### Next
**Sim v1 measures the Virus drain** (tower HP and DPS lost per Virus, with and without a Vault) → ledger "firepower after drain" line. Then Bug into rosters, TEV growth curve / economy. Sync note: the Virus revert and plan E4/E5 hadn't reached the Mac on first write; fixed and verified this session.

---
## Session 13 — 2026-10-14 — M3 "Cobol" kicks off: Difficulty Management + the Ledger

Jogo's framing: TDX is a portfolio piece for game craft *and* AI operation. M3 ("Difficulty Management", Jogo's term) is the central thesis: tool chains and methodology matter as much as results. Plan, try approaches, make mistakes, roll back. Not in scope: player-facing difficulty modes or adaptive difficulty. Thesis: ~80% of difficulty is the basic numbers (enemy inflow, enemy power, player resource inflow, tower power); layout is the rest.

### Agreed plan (`Docs/TDX_M3_Difficulty_Plan.md`, working notes)
1. **Ledger**: pure maths + visuals in the browser, reading `config.js` live. Visual first (Jogo is an artist/designer).
2. **Sim**: grow `tests/sim.mjs` into headless bot-player runs; checks the Ledger and measures layout. ~90% of validation; Jogo hand-tests a few tiers.
3. **Tuning loop**: target pressure curve per level (start with Claude's idea and see), sweeps, one git branch per experiment.
Plus a running experiment log (hypothesis → change → result → verdict) in the plan doc.

### Tooling
- **Node installed on the Mac mini** (v24.21.0). `node tests/sim.mjs` from Code/ → 74/74.
- **Ledger v1** at `Code/tools/ledger/` (`ledger.js` = DOM-free maths, Node-importable; `index.html` = zero-dependency SVG charts). Open via `python3 Code/serve.py` → http://localhost:8000/tools/ledger/
  - Campaign pressure (all 48 waves; throughput + tank pressure; 1.0 = leak line), per-level tiles, per-level inflow-vs-firepower chart, tower value (DPS per 100 Tokens, T1 vs T4; damage per enemy pass), enemy value table, what-if sliders + model-assumption sliders.
  - Tower DPS follows entities.js firing exactly (clip/burst/reload). Enemy inflow replays the waves.js picks 400× per wave (seeded).

### Findings (E1 — ledger predictions, not yet sim-checked)
- Every level peaks at wave 1, then decays to ~0.15. L2–L5 W1 is a wall (~2.0). Matches "too easy".
- Cause: Tokens compound (towers persist), enemy HP grows only ~1.2× per wave.
- Threader 20 DPS/100 Tokens vs Pulse 10, Compressor 6, rest 2–3. Upgrades ~4× worse value than building more.
- HP per EV ranges 0.2 (Stinger) to 4.0 (Crack). Crack drives most HP from L1 W3.

### Where we stopped
Jogo walked through the Ledger (level charts, campaign chart). **Next: agree the target pressure curve, then tuning experiments; Bug + Stinger into rosters; Sim v1.** No game code changed this session.

---
# ✅ MILESTONE 2 COMPLETE — v1.02 "Basic" — 2026-10-13

Signed off by Jogo at the end of Session 12. Shipped across Sessions 9–12:

- **Tweaks** — version display (now v1.02 — BASIC), per-level starting budgets, enemy delta verified + shown on Level Select.
- **Backup** — private GitHub repo (github.com/Jogosity/TDX), Backup Procedure, one-working-copy rule (iCloud `05_TDX`), `push.followTags` so milestone tags ride along with Desktop pushes.
- **Towers** — Pulse (3-round burst rifle) and Compressor (45° pump-shotgun cone, new aimed-pellet weapon class); burst/reload fix; two-row tray.
- **Enemies** — Bug (random tower hunter, walks open cells, ignores the base until no towers remain) and Stinger (packs of 2–4 on detour routes). Golden path no longer predictable (Jogo's playtest).
- **Blueprints** — primary/secondary/tertiary drop slots per level (15/5/3%) with a promotion rule; every lockable tower now drops somewhere; far more pickups.
- **Tooling** — debug spawn pause, button flash + Tokens/BITS header; `Code/serve.py` no-cache dev server; `tests/run.html` browser test runner (no Node on the Mac mini). Tests 48 → **74**.

**Carried forward:** new enemies into wave rosters → M3 (first task). Juicy BP pickup FX → M3. Tracer, Overclock, Cypher, Bit Rot, Turtle → Content backlog (on hold).

**Roadmap now:** M3 "Cobol" — Secure & Simulate (difficulty sim + balance) → M4 "Disc Drive" — Narrative & Content → M5 "Elm" — Re-engagement → M6 "Fortran" — Onboarding & Presentation.

---
## Session 12 — 2026-10-13 — Phase 2B: Bug + Stinger (first pass)

Session opened with admin: Mac mini infra (server command needs the full iCloud path; phone via LAN IP works), and a GitHub Desktop duplicate-clone cleanup — **one working copy only**, the iCloud `05_TDX` (rule added to QuickStart). Jogo restructured the roadmap: M2 phases renumbered (2A towers ✅, 2B enemies, 3A/3B on hold, 4 integration); new **M4 "Disc Drive" — Narrative and Content**; Re-engagement → M5 Elm; Onboarding → M6 Fortran. Unit art now specced in `Assets/Tower_Designs.png`. Plan after 2B: hold content, go to **M3 difficulty**.

### Bug (Enemy 6) — tower hunter
- `hunter: true` + `attack {10 dmg / 1.0s}`: on spawn picks a **random tower anywhere** (Vaults count), flies straight at it like Virus, drains it; retargets at random when it dies. With no towers left it walks the normal path and costs a life. New towers pull it back into hunting.
- 30 EV / 30 hp / fast / **reward 30** (spec 10 × the ~3× hand-tune scale, Jogo approved). Art: orange oval with two leading legs.
- Virus close-in/drain logic extracted to `Enemy.closeInAndDrain()`, shared by both.

### Stinger (Enemy 7) — detour raider
- `detour: { min 0.25, max 0.8, extraSteps 2 }`: on spawn picks a random cell 25–80% of the way to the exit whose route costs **≥2 extra steps** over optimal (hex boards have many equally-short routes, so "off the BFS path" alone wasn't a real detour — the first test caught it). Tight boards settle for the longest detour available. Then optimal path to base.
- Detour persists through path rebuilds (tower placed / CRASH) until passed. New `PathField.routeBetween()` + `distancesFrom()`.
- 350 EV / 70 hp / fast / packs 2–4 / **reward 90**. Art: orange 4-point star (X).

### Integration
- Debug SPAWN tab + main-menu Enemies screen pick both up automatically. **Not in any wave roster yet** — that lands at the start of M3, where the sim tunes rosters anyway.

### Tests
56 → **66 checks**: Bug hunts beyond Virus scan range, ignores base while towers stand, kills its tower, falls back to base, random target choice; Stinger detour off-route, routes longer than optimal, always reaches base, pack 2–4, detour survives rebuild. 66/66, stable across 6 repeated runs (randomised behaviours). Smoke-played at 375×812: Bugs swarm Threaders, Stingers fan out wide, no console errors.

### Playtest asks
- Bug: random target means Bugs often cross the whole board — is that fun, or should it prefer nearer towers?
- Stinger: is a 2-step detour visibly "non-optimal" enough? (`extraSteps` in config)

### Playtest round 1 (same day)
- Bug health 30 → **90** (died too easily).
- "Stinger won't debug-spawn" turned out to be **browser caching** of old JS under `python3 -m http.server`. New `Code/serve.py` sends `Cache-Control: no-store`; QuickStart now uses `python3 Code/serve.py`. Use it for all phone testing.

### Tweak round (Jogo's list)
- **Debug buttons flash** cyan on every tap (restarts on rapid taps).
- **Debug header wallet**: current Tokens + BITS beside the DEBUG title, refreshed on each tap.
- **Bugs walk open cells only** — no more flying straight over blockers/towers. They BFS-route (`PathField.routeToAny`) to any free cell touching their random target, then hold and drain. Unreachable towers are skipped when picking; route re-plans when the board changes; with no reachable tower they take the base path (re-scanning for new towers every 0.5s). Lockouts stay walkable (enemy-owned by design). Virus still closes in directly.
- Tests 66 → **67** (Bug routes around a blocker line to its tower). 67/67 ×5 runs.
- Jogo's playtest read: the new units fill real gaps — the golden path is no longer predictable; both enemy types survive long enough to threaten without making the game unplayable.

### Blueprint drop slots (Jogo's design)
Problem: one BP tower per level at a flat 8% → a level's whole collection loop finished mid-first-clear, then drops stopped forever; L5, Pulse and Compressor had none.
- **Three slots per level**, each rolled independently per kill: **primary 15% · secondary 5% · tertiary 3%** (`BLUEPRINTS.dropRates`). A slot whose tower is unlocked drops nothing. Multi-drops from one kill fan out so each stays tappable.
- **Promotion rule** (a guide, not rigid): secondary → next level's primary, tertiary → next level's secondary. L1/L2 get a tertiary to unlock the first towers sooner.

```
Level  Primary     Secondary   Tertiary
L1     Vault       Defrag      DDOS
L2     Defrag      DDOS        Compressor
L3     DDOS        Compressor  —
L4     Compressor  Deleter     —
L5     Deleter     Pulse       —
```
- `LEVELS[i].bpPool` is now `{ primary, secondary, tertiary }`; roll logic is DOM-free `rollBlueprints()` in `board.js`. Jogo: err on too-quick unlocks for now.
- Tests 67 → **74**: slot presence, rates, promotion rule, every lockable tower drops somewhere, observed rates over 40k rolls, unlocked never drop, independent slots.
- Juicier pickups (magnet/counter/effects) parked for later.

**M2 signed off — v1.02 Basic, tagged `v1.02-basic`. Next: M3 "Cobol".**

---
## Session 11 — 2026-10-12 — Phase B1: Pulse + Compressor (first pass)

Run remotely on Jogo's Mac mini. Config read as source of truth (no hand-edits since S10).

### New towers (TOWERS + WEAPONS, art, tray)
- **Pulse** — `pulseRifle`: 3-round bursts (0.08s between rounds), 1.5 pulses/s, clip = 5 pulses (15 rounds), 1.8s reload, 14 dmg/round, range 2.3 (= Threader). Cost 400 / 150hp, tier4 350hp / 30 dmg. Art: three slim rounds side by side, centre one leading. Violet.
  - Paper DPS ≈ 49 sustained (vs Threader 20) — per-cell upgrade over Threader, but 4 Threaders still out-DPS one Pulse per Token. That's the playtest question if Pulse is meant to supplant Threader.
- **Compressor** — new `pumpShotgun` (aimed cone class): 8 pellets fanned evenly across a 45° cone, 7 dmg each, 1.4 pumps/s, clip 4, 2.4s reload, range 1.8, pellets fly straight and die at the range edge (reuses the Defrag pellet path). Cost 400 / 100hp, tier4 250hp / 15 dmg. Art: 45° fan wedge on a pump block. Mint-teal.
  - Paper max ≈ 42 DPS if every pellet lands (point-blank on one target, or into packs); at full range the fan is ~1.5 cells wide so single targets eat only a few pellets.
- **Engine**: weapons with `cone` + `pelletCount` fire an aimed pellet fan. **Burst/reload fix**: a clip's last burst now finishes before the reload starts — previously the final pulse fired 1 round and the other 2 leaked out after the reload (no existing tower used clip + burst, so it never showed).
- **BPs**: both set to 16 but **not in any bpPool yet** — region locks are Phase E (Pulse→L4, Compressor→L3). For playtest: Debug → ECONOMY → Unlock all towers.

### From the Todos "Phase 1" list (playtest support)
- **Tray double-stacks** once the roster passes 5: 7 towers = 4 + 3 grid, slightly shorter buttons. Single row unchanged at ≤5.
- **Debug: Pause / Resume wave spawning** (ECONOMY tab) — holds natural wave spawns; debug SPAWN still works, so you can line up one enemy type against a test build.

### Tests
48 → **56 checks**: roster/BP presence, Pulse = Threader range, full 3-round bursts before reload (15 rounds per clip), burst rhythm (tight burst then 1/fireRate pause), Compressor fan count, pellets inside the 45° cone, pellets hit up close and die at range, tier-4 targets on the new tower. 56/56.
- Node isn't installed on the Mac mini, so I added `tests/run.html` — a browser runner for the same `sim.mjs` (shims `process.exit` + a mockable `localStorage`). Serve `Code/` and open `/tests/run.html`. `node tests/sim.mjs` still works wherever Node exists.
- Smoke-played L1 at phone size (375×812): both towers place, build, aim and fire; tray fits; no console errors.

### Playtest asks for Jogo
- Pulse: does the burst read and feel distinct from Threader? Is 400 right for ~2.5× Threader DPS?
- Compressor: is 1.8 range too short to matter? Does it want to sit at chokes / beside the path?
- Both are first-pass numbers — tune freely in config.

**Next: playtest + iterate B1, then Phase B2 (Tracer + Overclock).**

---
## Session 10 — 2026-07-22 — Phase B0: git repo (the safety step)

Jogo checked the build over and called it solid → B0 before any unit code.

- **Pre-commit cleanliness**: deleted stray `Code/sim.mjs` (Session-1 harness, superseded by `tests/sim.mjs` — the two had diverged). Suite still 48/48 after removal.
- **Repo**: `git init` at `05_TDX/` root (whole project per Jogo — Code, Docs, Notes, Assets), branch `main`, `.gitignore` (.DS_Store, iCloud artifacts, editor cruft). Initial commit tagged **v1.01-altair**; 27 files tracked, tree clean.
- **Backup procedure** written into `TDX_QuickStart.md`: session cadence (tests green → commit → push), milestone-only tagging rule, one-time remote setup for Jogo (GitHub Desktop or terminal), iCloud/git caveat (iCloud can evict file contents — hit it twice this session; GitHub is the real backup). QuickStart prompt also refreshed to current state (48 checks, roadmap pointer).
- **Published**: Jogo installed GitHub Desktop, added the existing local repo, published private as **github.com/Jogosity/TDX**. First push verified (origin/main at the session-10 commit). **B0 CLOSED.** Tag push hiccup solved: Terminal auth rejects account passwords (GitHub is token-only since 2021), so instead the repo got `push.followTags` — tags now ride along with ordinary Desktop pushes, no Terminal needed. `v1.01-altair` confirmed on the remote.

**Next session: Phase B1 — Pulse + Compressor towers.**

---
## Session 9 — 2026-07-21 — Milestone 2 planned + Stage A landed

### Milestone 2 — "Basic" (per TDX_Todos.md + TDX_Towers_and_Enemies.md)
Scope agreed with Jogo: tweaks + Tower & Enemy Expansion (4 towers, 5 enemies). Decisions:
- **Difficulty sim stays parked** — its own sub-project after M2, with the full roster to balance against.
- **GitHub repo/backup** is the milestone after M2 (per todos).
- **Versioning**: display shows v1.01 Altair now; bumps to **v1.02 Basic** only when the full M2 feature set has landed. Codenames Altair→Kernel listed in the todos.
- **New-tower BP regions** (my spread, approved): Tracer→L2, Compressor→L3, Pulse→L4, Overclock→L5 — later levels get 2 BP types, L5 finally has a pool.
- **Per-level budgets**: my best guesses, Jogo hand-tunes.

**Stages:**
- **A — Tweaks** ✅ this session (below).
- **B — Weapons + towers**, rising engine work: Pulse (burst — mostly config) · Compressor (pump shotgun, multi-pellet cone) · Tracer (new laser-beam weapon class) · Overclock (new adjacency damage-buff aura, +10%/tier).
- **C — Simple enemies**: Turtle (pure config) · Stinger (fast pack + non-optimal-route pathing) · Bug (tower-hunter, ignores base until towers are gone).
- **D — Exotic enemies**: Cypher (cell-teleport movement, untargetable while phased, skips every 2nd cell) · Bit Rot (contact-range damage aura; Limiter slows movement, not damage).
- **E — Integration**: bpPools, new enemies into L2–L5 rosters, tests per mechanic, v1.02 bump.

⚠️ Spec note for Stage C: Stinger says "same stats as Worm (config = source of truth)" but lists different stats (70hp, EV 350, reward 40). Jogo to pick at implementation.

### Stage A — done
- **Version display**: `VERSION` in config (`{ number, codename }` + bump-rule comment); rendered dim at the bottom of the Main Menu home screen ("v1.01 — ALTAIR").
- **Per-level starting budgets**: `LEVELS[i].startTokens` = 300 / 340 / 390 / 450 / 520 (scales with delta; `PLAYER.startTokens` is now fallback only). game.js reads the level value on init.
- **Enemy delta verified fully working**: health scaled at spawn (`maxHealth = round(health × delta.health)`), `damageMult` applied to Virus tower-damage, both spawn paths (waves + debug spawn) pass the level delta. Now displayed on each Level Select row: `Δ HP ×n · DMG ×n · START n TOKENS`.
- **Tests**: 43 → **48 checks** (version sanity, budgets present + monotonic, delta health/damage application). BP-pool check loosened from exact-match to `includes` so Stage E pool additions won't break it. 48/48 passing.

### Session-start note
Config hand-tunes since S8 preserved as source of truth (DDOS 400 / Defrag 500 / Deleter 700 costs, Worm 350hp @ 1.7× medium, raised rewards, Limiter 600/80hp, MG dmg 4, Virus attack 15/0.8s).

### Same-day addendum — roadmap through M5 agreed
Jogo reviewed the plan and reframed the unit expansion: **phased, not a single swoop** — units will iterate as they mature. Formal roadmap now lives at the bottom of `TDX_Todos.md` (Milestones section, replacing the old "Following Milestone" stub):

- **M2 "Basic"** rephased: A ✅ → **B0 GitHub repo** → B1 Pulse+Compressor → B2 Tracer+Overclock → C Turtle+Stinger+Bug → D Cypher+Bit Rot → E integration + v1.02. Playtest/iterate between phases.
- **M3 "Cobol" — Secure & Simulate**: difficulty simulator + full balance pass. Hard dependency: M2 roster must be settled first (new units = noise in the sim).
- **M4 "Disc drive" — Re-engagement**: finish Daily Quests design, Modules 4+5. After the sim, so reward drips tune against a balanced economy.
- **M5 "Elm" — Onboarding & Presentation**: FTUE, sound, polish. Deliberately last — onboarding teaches the final systems.
- Guiding intent recorded: the game is a **360° demonstration of game craft** — each milestone a presentable exhibit.

**Git repo pulled forward** from "following milestone" into M2 Phase B0 (my recommendation, approved): version control belongs *before* the unit-iteration churn. Jogo has a GitHub account, no repos yet — B0 = create private repo, .gitignore, initial commit tagged v1.01-altair, backup procedure documented.

Jogo is checking the current build is clean before Phase B0/B1 begins. No further code this session.

**Next session: Phase B0 (GitHub repo) → Phase B1 (Pulse + Compressor).**

---
# ✅ MILESTONE 1 COMPLETE — 2026-07-17

Declared by Jogo at the end of Session 8. Shipped across Sessions 1–8:

- **Core battle loop** — hex grid, pathing/firewalling, weapon system (MG / grenade / sniper / 360° scattershot), 5 towers (+hidden Limiter), 5 enemies, TEV/EV/MAV/RTV wave rhythm, CRASH events.
- **Retention Modules 1–3** — Upgrade Path (per-tower tiers, BITS + Tokens, build/upgrade clocks), Collection Core (region-locked Blueprints, tower unlocks), Area Unlock (5 levels, per-level grids/themes, lockouts, multi-spawn, linear progression, level select).
- **Infrastructure** — main menu (Play/Levels/Towers/Enemies), tabbed debug menu, localStorage save with migrations, 43-check headless test suite, DOM-free board/crash/sim modules.

**Known-open, deliberately parked:**
- Game currently too easy (over-corrected); L2–L5 waves are genWaves scaffolds → both wait for the **AI difficulty-analysis sub-project**.
- Roster is thin for 5 levels → **more towers + enemies next sprint** (config-driven, scaffold ready; L5 bpPool empty).
- Retention Modules 4 (Re-engagement — Daily Quests design still cut off at "Eg.") and 5 (Collection secondary) not started.
- Maps auto-centre (no lateral asymmetry); Limiter parked pending balance rethink; no cost-cap on crash tower kills; no sound; multi-cell towers unstarted.

**Next:** Jogo defines Milestone 2 objectives → plan the milestone and stages together.

---
## Session 8 — 2026-07-17 — Area Unlock (Retention Module 3): 5 levels

### Tweaks first (per todos)
- **Wreck effect**: cells that lose a tower (Crash or Virus) burn for 2s — flickering lightning arcs + rising embers.
- **Wave lead-in**: 3s grace (`WAVE_START_DELAY`) before spawning starts on every wave — time to read the map and any CRASH aftermath.

### Area Unlock, per the updated Retention Modules doc
- **5 levels**, per-level grid shapes (my best-guess formats, deliberately varied): L1 Shallow Breach (current funnel, 72 cells) · L2 The Narrows (small/tight, 49) · L3 Wide Delta (wide/short, 66) · L4 Deep Trench (narrow/tall, 69) · L5 The Sprawl (big board, 84). Row widths auto-centre; true lateral asymmetry would need offset support — parked.
- **Themes**: subtle cool variants per level (aqua → mint → indigo → ice) via `LEVELS[i].theme` merged over renderer defaults. Lockouts share a magenta "enemy-owned" look everywhere.
- **Lockout cells** (from L2, 2–5/level): enemies pass, player can't build. Dashed magenta hex + centre dot. Placement/pathing rules test-guarded.
- **Entry points**: L1 1, L2/L3 2, L4/L5 3. First spawn anchored on the top edge; extras anywhere in the top 5 rows (reachability-checked).
- **CRASH now shuffles everything**: blockers (≤2 tower kills, as before) + lockouts + extra entry points (`crashShuffle`). First spawn never moves.
- **Progression**: linear unlock in the save (`levelsUnlocked`); PLAY always starts the latest unlocked level; LEVEL SELECT screen in the main menu for replays (CLEARED / CURRENT / LOCKED). Levels now init in-page — no reload between level starts.
- **Region-locked BPs** per spec: Vault→L1, Defrag→L2, DDOS→L3, Deleter→L4, L5 empty until the roster grows.
- **Enemy deltas** ramp 1.0/1.0 → 1.75/1.5; BITS rewards 3→8.
- **Waves**: L1 keeps Jogo's hand-tuned 8 waves verbatim. L2–L5 use a `genWaves` scaffold (tev/mav growth curves, roster ramps, 8–10 waves) — explicitly placeholder until the difficulty sim tunes them.
- **Debug**: Unlock/Lock all levels buttons in ECONOMY.
- **Board logic extracted** to DOM-free `js/board.js` (blockers/lockouts/extra spawns) so the sim tests every level layout directly.

### Scaffold notes for next sprint (more towers/enemies)
Everything content-side is config-driven: a new tower = TOWERS entry + tray art case + BP count + a level's bpPool slot; a new enemy = ENEMIES entry + art case + wave roster mention. No engine work expected.

### Tests
43/43 (was 37): all 5 boards build with reachable spawns, lockout counts/passability, entry-point rules, crash invariants across every level, wave-def sanity, region-lock pools.

---
## Session 7 — 2026-07-17 — CRASH events land

Last core-battle feature from the original design doc, built ahead of the difficulty work (it affects difficulty) and Level unlocks.

### Mechanics (per design doc)
- Cadence: rolled 3–4 waves between crashes (`CRASH` block in config). The crash strikes **1.5s after a due wave opens** — sudden, mid-play.
- All blockers relocate to fresh cells. A blocker may land on a tower and destroy it — hard cap 2 kills per crash. Relocation is firewall-checked per placement (spawns always stay connected); enemy paths rebuild after.
- Presentation: full-screen screenshake (decaying jitter), chromatic-glitch **CRASH** caption (red/cyan offset copies, flicker, fade) and a colour flash in the first beats.

### Implementation notes
- Core relocation logic lives in `js/crash.js`, DOM-free, so the sim tests hammer it directly: 25 consecutive crashes must keep blocker count stable, never firewall, never exceed 2 kills. 37/37 tests total.
- Crash timers tick regardless of phase, so a scheduled crash lands even if the wave ends during the lead-in.
- Debug → ECONOMY gains **Trigger CRASH now** for visual testing.
- Not implemented (design doc "might"): cost cap on destroyable towers. Revisit if losing a Deleter to a crash feels too brutal.

### Next (agreed with Jogo)
CRASH ✓ → Level unlocks / level select (scaffold for regional tower unlocks) → more towers to thicken the mix → AI difficulty analysis.

---
## Session 6 — 2026-07-17 — UI/UX todo sweep + build timer

Second TDX_Todos pass (all ticked in the doc):

- **Menu cog**: ⚙️ now sits top-left of the main menu overlay (visible on Home, Towers and Enemies screens) — debug menu reachable without starting a run.
- **Sniper feel**: Deleter round is now a small arrowhead at 45 cells/s (was 20) with a long fading trail. Per-weapon projectile `shape`/`trail` config added — other weapons unchanged.
- **Play space shift**: grid + base now drop down by up to 2 hex heights (3×size) of the spare bottom space on tall screens (per the iOS screenshot); clamped so the base always stays on-screen. Test-guarded.
- **Confetti kills**: all enemy kills now burst into 14–20 pastel square particles (spin, slight gravity, 0.7s). `makeConfetti()` in render.js — tune count/speed/size there; variants later. Tower deaths and BP pickups keep the old radial effect.
- **Build timer** (Jogo mid-session request): new towers construct on the same 3s clock-timer as upgrades — offline, dimmed, clock overlay, then online. `BUILD_TIME` in config.

Tests: 34/34 (build-offline, construction-completes, layout-shift checks added).

Playtest note from Jogo: game is currently too easy after the over-correction — deliberately parked for the AI difficulty-analysis sub-project.

---
## Session 5 — 2026-07-17 — Tier unlocks go per-tower

Playtest verdict from Jogo: game is now too easy (over-corrected from too hard) — expected, feeds the AI difficulty-analysis sub-project coming in a few days.

### Change: Tier 2/3/4 unlocks are now per tower TYPE, not global
- Save: `tierUnlocks: { threader: 3, ... }` (absent = Tier 1). Legacy global `tiersUnlocked` migrates to every tower at its old value, so no player progress lost.
- Costs unchanged per step (3/8/15 BITS) but now paid per tower type — total BITS sink is ~5x deeper, as intended.
- UI per Jogo's spec: unlock control sits on the right-hand side of each tower's row in the Main Menu Towers screen, and only the *next* tier is offered (one at a time). Row shows `TIER n/4` + `UNLOCK Tn ◆cost`. BP-locked towers show BP progress instead (can't buy tiers for a tower you don't own).
- In-game ◆ TIERS menu now shows the same per-tower list (`THREADER · T2/4` etc.). The separate global tier rows section is gone.
- In-battle upgrade gating now checks the tower's own type unlock.

### Tests
31 checks (was 28): fresh-save tierUnlocks empty, legacy migration seeds all towers + strips the old field (via a mocked localStorage), numeric-blueprints migration. 31/31 passing.

### Notes
- Difficulty analysis next: grow `tests/sim.mjs` into the headless balance simulator (tower DPS vs real pathing, config sweeps, leak reports) per the Session 2 direction.

---
## Session 4 — 2026-07-17 — TDX_Todos sweep: tower fix, Collection Core, debug menu, main menu

Worked through `Docs/TDX_Todos.md` (all four sections done). Jogo's latest config hand-tune (rewards, Virus dmg 15, Slice packs 5–8) preserved.

### Tower design fix (human error, per todos)
- **DDOS restored** to the grenade launcher, original stacked-dots art, aims again. tier4 dmg target 36.
- **Defrag** is the new home of the 360° scattershot (same stats it had on DDOS, cost 300, mint-green, radial-burst art, idle spin, 14 BPs).
- **Limiter pulled from the UI** — the real OP culprit (wrecks TTK of everything near it). Kept fully working in code + config, just absent from `TOWER_ORDER`; flagged as a balance issue in a config comment.

### Collection Core — fully implemented (Retention Module 2)
- All towers except Threader start locked. Config: each tower has `blueprints` (needed to unlock): Vault 10, DDOS 12, Defrag 14, Deleter 18 (Limiter 12, hidden).
- **BP drops are level-pool defined** (Jogo's call — pre-builds Region Lock): `LEVELS[].bpPool` lists which tower BPs can drop; each drop is a random *still-locked* pool tower. 8% per kill, 10s lifetime, tap to collect.
- Drops render in the owning tower's colour; pickup toast names the tower (`Vault Blueprint (3/10)`); hitting the count **unlocks instantly mid-game** with an `UNLOCKED` toast.
- Tray shows lock state: 🔒 + BP progress instead of cost; tapping a locked tower explains itself.
- Save schema: per-tower BP counts + `towersUnlocked` (migrates the old numeric scaffold).

### Debug menu
- ⚙️ cog top-left → full-screen tabbed overlay (takes touch priority). Tabs are a registry (`ui.debugTabDefs`) — add `{ label, build(el) }` and it appears; built for growth as requested.
- **ECONOMY tab**: +100 Tokens, +10 Bits, Unlock all towers, Lock all towers (also resets BP counts), Reset all settings (wipes save), Quit to main menu.
- **SPAWN tab**: one button per enemy type, spawns a single instance. Works outside waves too — the combat sim now runs whenever enemies exist, so debug spawns path/fight during the build phase.

### Main menu
- Game boots to a main menu (playfield/HUD fully hidden). PLAY starts the run; level complete / game over return to the menu (fresh reload; save persists).
- **TOWERS screen**: every tray tower with icon, description, status (UNLOCKED / BP x/y), plus the tier-unlock rows (BITS) — shared component with the in-game ◆ TIERS menu, which stays per the retention doc.
- **ENEMIES screen**: icon + short description per enemy. Descriptions for both live in config (`desc`).

### Tests
`tests/sim.mjs` 20 → **28 checks** (roster fix, BP config sanity incl. the 10–20 spec range, bpPool validity, save defaults/migration). 28/28 passing.

### Open questions for Jogo
- Threader-only start: 300 Tokens = 3 Threaders on wave 1 — first-run difficulty needs a playtest look.
- Drop pool ignores already-unlocked towers, so late-level drops thin out — if you'd rather bank spare BPs for future regions, easy switch.
- Level select is still just PLAY → Level 1; proper level select is next when Level 2 exists. CRASH events remain the outstanding roadmap item.

---
## Session 3 — 2026-07-16 — DDOS rework, Upgrade Path (Retention Module 1), Blueprint scaffold

Config treated as player-edited source of truth (MG dmg 3, 300 start Tokens, raised kill rewards) — all preserved.

### DDOS rework — new `scatterShot` weapon class
- DDOS was OP (grenade splash × the doubled enemy density). Replaced its weapon with a new **radial** weapon class: `scatterShot` fires a full 360° ring of 12 straight-flying pellets (7 dmg each), 4 blasts per clip, 2.4s reload, range 2.0. Pellets hit the first enemy they touch and die at the range edge. Radial weapons don't aim — DDOS now has a slow idle spin and new radially-symmetric art (centre dot + three at 120°).
- `grenadeLauncher` stays in config unused, for a future rocket/mortar tower.
- Play pattern change: DDOS now wants to be *surrounded* (mid-path islands), not parked behind a choke.

### Crude balance pass (manual, pre-sim)
- Deleter sniper 30 → **110 dmg** (was 5.6 effective DPS for a 500-token tower — worse than a Threader; now one-shots a delta-1 Hack).
- All other numbers left as Jogo's hand-tune. **Needs playtest**: scatterShot pellet dmg (7) and Deleter 110 are guesses.

### Retention Module 1 — Upgrade Path (built to `TDX_Retention_Modules.md` spec)
- Tiers 1–4; towers always built at Tier 1.
- **Tier access** unlocked with BITS in a new Upgrade Menu (◆ TIERS button in HUD, available during play): Tier 2/3/4 = 3/8/15 BITS. Level 1 completion (+3 BITS) unlocks Tier 2 on the first win — deliberate first-taste loop.
- **Applying** an upgrade: tap tower → Upgrade button beside Sell, costs Tokens at 2x/3x/4x base cost, takes 3s (tower offline, clock-timer drawn over it, aura suspended). Tapping a "LOCKED" upgrade button opens the Upgrade Menu.
- Stats: config lists Tier 1 (base) and `tier4` targets; intermediates linear-interpolated per the spec. Current tier4 targets — Threader 250hp/9dmg, Vault 600hp, Limiter 350hp/0.3 slow, DDOS 350hp/18dmg, Deleter 200hp/300dmg.
- Sell refund = 66% of total spend (base + upgrades). Tier pips (yellow dots) drawn under upgraded towers.
- New `js/save.js`: localStorage profile (BITS, tiersUnlocked, blueprints), safe in headless node. BITS now persist across runs.

### Retention Module 2 — Collection (Core) — scaffold only
- Doc marks Module 2 NOT READY, so only the safe core was built: enemies have an 8% chance to drop a Blueprint (pulsing yellow diamond, 10s lifetime, generous 26px tap radius, tap priority over placement). Collecting persists a total count to the save.
- Deliberately NOT done: tower locking (all-but-Threader) and per-tower BP targets — would gut the game mid-development; waiting until the module is marked READY.

### Tests
`tests/sim.mjs` grown 12 → **20 checks**: scatterShot ring count, pellet range-edge death, pellet hit registration, Tier-1 build, 2x cost rule, tier-4 stat targets, linear interpolation, sell-refund-covers-upgrades. 20/20 passing.

### Open questions for Jogo
- Tower being *offline* during the 3s upgrade was my call (spec silent) — makes mid-wave upgrades a real decision. Revert if it feels bad.
- Tier unlock costs (3/8/15 BITS) and BP drop rate (8%) are first guesses.
- Playtest focus: does DDOS feel fair now? Is Deleter worth 500?

Next per roadmap: CRASH events → main menu/level select.

---
## Session 2 — 2026-07-15 — Post-playtest quick fixes

Jogo confirmed: terminal + mobile deployment both work. First playable verified in hand.

- Art fix: Threader/Vault were transposed in the mockup — Threader is now a simple arrowhead, Vault the solid hexagon.
- Weapon towers (Threader, DDOS, Deleter) now rotate to face their target, with continuous tracking between shots. Threader's gun-barrel element removed.
- Hack, Crack, Virus, Slice flipped vertically — tips now lead, reading as arrows flying down-screen. (Worm intentionally unchanged.)
- Balance (rough pass, pre-real-balancing): Threader/DDOS/Deleter weapon damage cut 75% (2/15/30). All wave TEV/MAV/RTV doubled for denser fields.
- Tests still 12/12.

End of session: all five fixes confirmed working in play. Jogo is hand-tuning `config.js` for a rough first balance pass — treat config values as player-edited; read the file, don't assume the Session 1 numbers.

Direction agreed for later: AI-first difficulty analysis — grow `tests/sim.mjs` into a headless simulator (tower DPS vs. real pathing, batch config sweeps, leak/spike reports) instead of manual playtest-and-retype loops. This comes AFTER the remaining feature TODOs.

Roadmap order discussed: CRASH events → main menu/level select (prerequisite for Level 2) → meta modules (upgrades, blueprints, login rewards, finish Daily Quests section in design doc) → AI-first balance analysis.

---
## Session 1 — 2026-07-15 — First playable: core battle loop

### Built
Full core loop in `Code/` (vanilla JS ES modules, canvas, no dependencies):

- `js/hex.js` — pointy-top axial hex grid; funnel shape from mockup (row widths in config); spawn zone top, base below bottom row.
- `js/path.js` — BFS flow field toward exits; Firewall legality check (also protects cells under live enemies); Catmull-Rom smoothing so enemies move on curves.
- `js/entities.js` — weapon system (damage, fireRate, clip/reload + burst, spread, projectile speed, splash — ready for shotguns/rockets later); all 5 towers and 5 enemies from the design doc; Virus latches onto towers within scan range and applies DoT; Limiter is a non-stacking 50% slow aura.
- `js/waves.js` — TEV/EV/MAV/RTV exactly per design doc, incl. the sub-wave halt/surge rhythm. Slice spawns in packs of 3–5 (packs respect the MAV cap).
- `js/render.js` — procedural neon synthwave art matching both mockups; glows via shadowBlur; blast/hit/death effects; range rings; placement preview (green legal / red illegal).
- `js/ui.js` + `index.html` — HUD (wave, lives pill, Tokens/Bits), tower tray with drawn icons, tap-to-place, tap tower → sell popup (66% refund), banners between waves.
- `js/game.js` — state machine: build → wave → wave-clear pause → next wave → level complete / game over. Random blockers placed at level start (path-safety checked).
- `tests/sim.mjs` — headless test harness: `node tests/sim.mjs` (12 checks: grid, pathing, firewall, wave rhythm).

### Blanks filled (tune freely, all in `js/config.js`)
- Speeds (cells/sec): low 0.45, medium 0.75, fast 1.4 (Worm = medium ×1.25).
- Weapons: machine gun 8 dmg @ 5/s r2.3; grenade 60 dmg splash 1.1 r3.5; sniper 120 dmg r6.5.
- Virus: 10 dmg / 1s reload, scan range 2.5 cells.
- Start: 250 Tokens, 15 lives (from mockup). Level 1: 8 waves, 6 blockers, delta 1.0/1.0, +3 BITS on completion.
- Enemy unlock order: Hack → Slice (w2) → Crack (w3) → Worm (w5) → Virus (w7).
- Grid: rows [7,8,8,8,8,8,7,6,5,4,3], 1 spawn cell centred on top row.

### How to run
`cd Code && python3 -m http.server 8000` → open `http://localhost:8000` (ES modules need a server; on phone, use your machine's LAN IP). Portrait layout, works with mouse too.

### Deliberately deferred (per scope decision)
- CRASH events (blocker reshuffle, screenshake, ≤2 tower kills per crash)
- Enemy Lockout cells (design doc says hold for later)
- Meta modules: Upgrade Path (BITS), Blueprint collection, login rewards, daily quests
- Main menu / level select (level-complete button currently reloads)
- Multi-cell towers, sound, saving

### Notes / open questions for Jogo
- Design doc cuts off mid-sentence in Daily Quests ("Eg.") — needs finishing.
- Balance is a first guess; wave 8 sim shows healthy MAV/RTV surge rhythm but real play-testing needed.
- Suggest next session: playtest + balance pass, then CRASH.
