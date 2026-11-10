# TDX — Next Session Quick Start

Paste the prompt below into a fresh session (with the JogoHome folder connected).

---

We're continuing the TDX project — a mobile-first HTML5 tower defence game we're building together across sessions. **Milestones 1 (v1.01 Altair), 2 (v1.02 Basic — Tower & Enemy Expansion), 3 (v1.03 Cobol — Difficulty Management), 4 (v1.04 Disc Drive — Narrative and Content), 5 (v1.05 Elm — Balance and Expansion), 6 (v1.06 Goto — Publishing), 7 (v1.07 Fortran — Onboarding & Presentation: Tutorial level, FTUE, one-time hints) and 8 (v1.08 Hypercard — Sound and Music) are complete.** Next is **M9 "Integer" — Re-engagement**. The full roadmap lives at the bottom of TDX_Todos.md; the repo is at github.com/Jogosity/TDX and the game is live at https://jogosity.github.io/TDX/ (every push to main publishes it).

Before doing anything else, read these files in `1_projects/05_TDX/`:
1. `Docs/TDX_Devlog.md` — session history and decisions. Read the MILESTONE 5 and 6 COMPLETE summaries and the newest session entry first.
2. `Docs/TDX_Todos.md` — the milestone roadmap (M7 objectives) at the bottom.
   Also: `Docs/TDX_AI_Balance_Notes.md` — balance findings (F1–F10) for the agentic difficulty-balancing write-up. Add new findings there.
3. `Docs/TDX_Retention_Modules.md` — retention module designs and their current status.
4. `Docs/TDX_Initial_Design.md` — the original design doc (reference).
5. `Code/js/config.js` (balance: towers, weapons, enemies) and `Code/js/levels.js` (the 10 levels, written by the Level Editor). I may have changed either since the last session; treat them as the current source of truth.

The codebase in `Code/` is a working game (vanilla JS ES modules, canvas, no dependencies). Run `node tests/sim.mjs` from the Code folder before and after any changes (193 checks passing as of M8 close; no Node? serve Code/ and open `/tests/run.html`). To play: `python3 Code/serve.py` from the `05_TDX` folder (no-cache dev server, port 8000; phone via LAN IP).

The project is a git repo (root of `05_TDX/`) — Jogo commits at the end of every session per the Backup Procedure at the bottom of this doc. The Milestones roadmap is at the bottom of `TDX_Todos.md`.

Where we left off (Session 23): **M7 is under way** (plan: `Docs/TDX_M7_Plan.md`). Done: the Archive Record UX items and **Level 0: Tutorial** (`LEVELS[0]`, level number = index, save v2 migration, first PLAY goes into the Tutorial, no rewards). Next: Jogo reshapes Level 0 in the Level Editor and playtests; then the FTUE once Jogo's Tutorial Box screen designs land. Tools: Level Editor at http://localhost:8000/tools/editor/ (Save only from the Mac, via `serve.py`), Ledger at /tools/ledger/, Sound Mixer at /tools/mixer/ (Save from the Mac, writes js/sounds.js), Sim with `node tools/sim/run.mjs [seeds]` from Code/. Jogo prefers one-dial "screwdriver" fixes and commits with GitHub Desktop.

Today: [state the step from the M7 list]

Update the devlog at the end of the session (Jogo commits).

---

# Backup Procedure (git)

The repo root is `1_projects/05_TDX/` (whole project: Code, Docs, Notes, Assets). `.DS_Store` and iCloud artifacts are gitignored.

**Every session:**
1. `node tests/sim.mjs` green before committing.
2. Jogo commits and pushes with GitHub Desktop (Claude doesn't commit).

**Milestone close only:** tag the commit `vX.XX-codename` (e.g. `v1.01-altair`) — same rule as the version display: tag only when the milestone's full feature set has landed.

**One-time remote setup (Jogo, on the Mac — needs your GitHub login):**
- Easiest: install GitHub Desktop → File → Add Local Repository → select the `05_TDX` folder → Publish repository (tick "keep private").
- Or terminal: create a private repo named `TDX` at github.com/new (no README/gitignore — the repo already has history), then from the `05_TDX` folder:
  `git remote add origin https://github.com/YOURUSER/TDX.git`
  `git push -u origin main --tags`

**One working copy only:** GitHub Desktop must point at this iCloud `05_TDX` folder (File → Add Local Repository). Don't clone the repo anywhere else — two copies drift apart. Hover a repo in Desktop's dropdown to see its path before removing anything.

**Auth note:** Terminal git asks for a password but GitHub no longer accepts account passwords (token-only since 2021) — don't fight it. The repo has `push.followTags` set, so milestone tags ride along automatically with a normal GitHub Desktop "Push origin". No Terminal needed.

**Caveat:** the repo lives inside iCloud Drive, which can evict file contents ("dataless" files) and confuse git. GitHub is the real backup; if git ever acts strangely locally, download the folder fully in Finder (right-click → Download Now) before running git commands.
