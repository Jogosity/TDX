# TDX — Next Session Quick Start

Paste the prompt below into a fresh session (with the JogoHome folder connected).

---

We're continuing the TDX project — a mobile-first HTML5 tower defence game we're building together across sessions. **Milestones 1 (v1.01 Altair), 2 (v1.02 Basic — Tower & Enemy Expansion) and 3 (v1.03 Cobol — Difficulty Management) are complete.** Next is **M4 "Disc Drive" — Narrative and Content**. The full roadmap lives at the bottom of TDX_Todos.md; the repo is private at github.com/Jogosity/TDX.

Before doing anything else, read these files in `1_projects/05_TDX/`:
1. `Docs/TDX_Devlog.md` — session history and decisions. Read the MILESTONE 3 COMPLETE summary and the newest session entry first.
2. `Docs/TDX_Todos.md` — the milestone roadmap (M3 objectives) at the bottom.
3. `Docs/TDX_Retention_Modules.md` — retention module designs and their current status.
4. `Docs/TDX_Initial_Design.md` — the original design doc (reference).
5. `Code/js/config.js` — all balance and level data. I may have hand-edited this since the last session; treat it as the current source of truth.

The codebase in `Code/` is a working game (vanilla JS ES modules, canvas, no dependencies). Run `node tests/sim.mjs` from the Code folder before and after any changes (77 checks passing as of M3 close; no Node? serve Code/ and open `/tests/run.html`). To play: `python3 Code/serve.py` from the `05_TDX` folder (no-cache dev server, port 8000; phone via LAN IP).

The project is a git repo (root of `05_TDX/`) — commit at the end of every session per the Backup Procedure at the bottom of this doc. The Milestones roadmap (M3–M6) is at the bottom of `TDX_Todos.md`.

Where we left off (Session 15): **M3 "Cobol" is banked as v1.03.** Read the MILESTONE 3 COMPLETE summary in the devlog. The balance tools stay in the repo for later passes: the Ledger at `Code/tools/ledger/` (open http://localhost:8000/tools/ledger/ while `python3 Code/serve.py` runs) and the Sim (`node tools/sim/run.mjs [seeds]` from Code/). The plan's experiment log (`Docs/TDX_M3_Difficulty_Plan.md`, E1–E14) and its M4 ideas list carry the open balance questions. Next is M4: narrative and content, where Jogo leads the creative.

Today: [state the step from the plan's Order of work]

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
