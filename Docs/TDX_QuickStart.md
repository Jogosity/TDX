# TDX — Next Session Quick Start

Paste the prompt below into a fresh session (with the JogoHome folder connected).

---

We're continuing the TDX project — a mobile-first HTML5 tower defence game we're building together across sessions. **Milestone 1 is complete** (core battle loop + Retention Modules 1–3). **Milestone 2 ("Basic" — Tower & Enemy Expansion, phased) is in progress**: Stage A (tweaks) and Phase B0 (GitHub repo, private at github.com/Jogosity/TDX) are done. The full M2–M5 roadmap lives at the bottom of TDX_Todos.md.

Before doing anything else, read these files in `1_projects/05_TDX/`:
1. `Docs/TDX_Devlog.md` — session history and decisions. Read the MILESTONE 1 COMPLETE summary and the newest session entry first.
2. `Docs/TDX_Todos.md` — the Milestone 2 objectives for this session.
3. `Docs/TDX_Retention_Modules.md` — retention module designs and their current status.
4. `Docs/TDX_Initial_Design.md` — the original design doc (reference).
5. `Code/js/config.js` — all balance and level data. I may have hand-edited this since the last session; treat it as the current source of truth.

The codebase in `Code/` is a working game (vanilla JS ES modules, canvas, no dependencies). Run `node tests/sim.mjs` from the Code folder before and after any changes (67 checks passing as of M2 Phase 2B; no Node? serve Code/ and open `/tests/run.html`). To play: `python3 Code/serve.py` from the `05_TDX` folder (no-cache dev server, port 8000; phone via LAN IP).

The project is a git repo (root of `05_TDX/`) — commit at the end of every session per the Backup Procedure at the bottom of this doc. The Milestones roadmap (M2–M5, phased) is at the bottom of `TDX_Todos.md`.

Where we left off (Session 12): Phase 2A towers (Pulse, Compressor) and 2B enemies (Bug, Stinger) landed as first passes, 66/66 tests green. Content is now on hold; next is M3 "Cobol" — the difficulty simulator. New units are specced in `Docs/TDX_Towers_and_Enemies.md` — they land in small phases with playtest + iteration between each; don't rush units to "done". Parked for later milestones (see roadmap): difficulty sim (M3, needs the roster settled first), Re-engagement modules (M4), onboarding/sound/polish (M5).

Today: [state the phase from the Milestones section of TDX_Todos.md — next up: M3 Cobol, difficulty simulator]

Update the devlog and commit to git at the end of the session.

---

# Backup Procedure (git)

The repo root is `1_projects/05_TDX/` (whole project: Code, Docs, Notes, Assets). `.DS_Store` and iCloud artifacts are gitignored.

**Every session (Claude does this):**
1. `node tests/sim.mjs` green before committing.
2. `git add -A && git commit` with a session-summary message.
3. `git push` (once the remote exists).

**Milestone close only:** tag the commit `vX.XX-codename` (e.g. `v1.01-altair`) — same rule as the version display: tag only when the milestone's full feature set has landed.

**One-time remote setup (Jogo, on the Mac — needs your GitHub login):**
- Easiest: install GitHub Desktop → File → Add Local Repository → select the `05_TDX` folder → Publish repository (tick "keep private").
- Or terminal: create a private repo named `TDX` at github.com/new (no README/gitignore — the repo already has history), then from the `05_TDX` folder:
  `git remote add origin https://github.com/YOURUSER/TDX.git`
  `git push -u origin main --tags`

**One working copy only:** GitHub Desktop must point at this iCloud `05_TDX` folder (File → Add Local Repository). Don't clone the repo anywhere else — two copies drift apart. Hover a repo in Desktop's dropdown to see its path before removing anything.

**Auth note:** Terminal git asks for a password but GitHub no longer accepts account passwords (token-only since 2021) — don't fight it. The repo has `push.followTags` set, so milestone tags ride along automatically with a normal GitHub Desktop "Push origin". No Terminal needed.

**Caveat:** the repo lives inside iCloud Drive, which can evict file contents ("dataless" files) and confuse git. GitHub is the real backup; if git ever acts strangely locally, download the folder fully in Finder (right-click → Download Now) before running git commands.
