# TDX M8 "Hypercard" (v1.08): Plan

Status: **planning (2026-11-09).** M8 is Sound and Music. Re-engagement has moved to M9 "Integer". Sources: `TDX_Todos.md` (M8 list, Mac copy of 9 Nov), the v1.07 code.

## What I found
- The game has no audio code yet: no AudioContext, no sound files, and no volume settings. M8 builds it from scratch.
- `TDX_QuickStart.md` still says "Sound milestone, then M8 Hypercard — Re-engagement". Update it to read M8 = Sound and Music and M9 Integer = Re-engagement.

## Sourcing decision (Jogo, 9 Nov): synth SFX + licensed music
- **SFX are generated in code** (small synth recipes in the style of ZzFX/sfxr). That means no file weight, a retro-computer sound that fits the Altair-to-Kernel theme, and Mixer sliders that change the sound itself.
- **Fallback samples** for anything synth does badly (whooshes, big explosions): Kenney CC0 packs only.
- **Music** comes only from sources whose licence clearly covers use in a game: incompetech (CC-BY, credit needed), OpenGameArt CC0 loops, Pixabay (check the terms for each track), or a paid AI-music plan that grants commercial rights. Avoid the Meta Sound Collection and the YouTube Audio Library, since their licences are aimed at videos on those platforms.
- Keep a `CREDITS` section (in-game or in the README) listing every music track and its licence.

## Sound list
**UI:** tap forward, tap back, error, popup open/close, screen whoosh (Results, Level Select, story).
**Music:** menu loop, main game loop, final-wave loop, victory sting, fail sting.
**In-game:** fire for each tower (or each weapon class, see D2), enemy destroyed, tower destroyed, Virus/Bug attack warning (one short cue when the attack starts).
**Added in review:** build, upgrade, sell, wave start, Core/life lost, Bits earned, Blueprint drop, story/tutorial popup.

## Order of work
1. **Audio engine** (`js/audio.js`): a single sound list in config (id, synth recipe or file, volume, pitch, variation, voice cap, cooldown). Separate music, SFX and UI channels into a master channel. Audio unlocks on the first tap, pauses on `visibilitychange`, and follows the iOS silent switch where the browser supports it (`navigator.audioSession`). Mute plus separate music and SFX volume go in the cog menu and are stored in `save.js`. Tests cover the voice cap and cooldown logic.
2. **Sound Mixer** (`tools/mixer/`, next to the editor and Ledger): every sound grouped as UI / Towers / Enemies / Music. Tap a tower or enemy icon to hear its sound. Sliders set volume, pitch/speed, length (trim + fade), variation and the synth settings. Export writes the sound list back the way the editor writes levels (`format.js` pattern). A "stress" button fires 20 towers at once to test the anti-spam limits.
3. **UI sounds**, hooked up by button type (forward / back / error) so new buttons get sound automatically.
4. **In-game SFX** with voice caps and cooldowns so a full board doesn't turn into noise. The warning cue hooks into the existing alert strip.
5. **Music**: crossfade from menu to game to final wave (triggered on the level's last wave), with stings that briefly lower the music under them.
6. **Ship**: test on a real iPhone (unlock, silent switch, background), check the download size on GitHub Pages, update the devlog and QuickStart, tag v1.08-hypercard.

## Decisions for Jogo (my recommendation first)
**D1. Mute and volume settings go in the cog menu**, with separate Music and SFX sliders and settings saved between sessions. Sound is on by default and music volume starts lower than SFX.

**D2. Fire sounds: one per weapon class to begin with** (bullet, splash, beam/pulse, delete), each with slight pitch variation per tower. Unique sounds for every tower can come later in the Mixer if they earn it. Enemy deaths work the same way: one shared pop with variation, plus bigger versions for Crack and Worm.

**D3. Speed and pitch stay linked in the Mixer** (the browser's natural playback-rate behaviour). For synth sounds, length and pitch are separate settings anyway, so this only affects the fallback samples and music.

**D4. Music files are MP3 or AAC (m4a)**, about 1 MB per loop, so they play everywhere including older iPhones. Menu music loads up front and the other tracks load in the background.
