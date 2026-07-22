# TDX — Next Session Quick Start

Paste the prompt below into a fresh session (with the JogoHome folder connected).

---

We're continuing the TDX project — a mobile-first HTML5 tower defence game we're building together across sessions. **Milestone 1 is complete** (core battle loop + Retention Modules 1–3); we're starting Milestone 2.

Before doing anything else, read these files in `1_projects/05_TDX/`:
1. `Docs/TDX_Devlog.md` — session history and decisions. Read the MILESTONE 1 COMPLETE summary and the newest session entry first.
2. `Docs/TDX_Todos.md` — the Milestone 2 objectives for this session.
3. `Docs/TDX_Retention_Modules.md` — retention module designs and their current status.
4. `Docs/TDX_Initial_Design.md` — the original design doc (reference).
5. `Code/js/config.js` — all balance and level data. I may have hand-edited this since the last session; treat it as the current source of truth.

The codebase in `Code/` is a working game (vanilla JS ES modules, canvas, no dependencies). Run `node tests/sim.mjs` from the Code folder before and after any changes (43 checks passing at milestone close). To play: `cd Code && python3 -m http.server 8000` (phone via LAN IP).

Where we left off — Milestone 1 shipped:
- Full battle loop: 5 levels with per-level grids/themes, lockout cells, multi-spawn entry points, CRASH events, wave TEV/MAV/RTV rhythm.
- Retention: per-tower upgrade tiers (BITS + Tokens), region-locked Blueprint collection with tower unlocks, linear level progression + level select.
- Main menu, tabbed debug menu (⚙️), persistent save with migrations.

Known-open items parked for Milestone 2 planning:
- Difficulty: game too easy; L2–L5 waves are generated scaffolds — awaiting the AI difficulty-analysis sub-project (grow tests/sim.mjs into a headless balance simulator).
- Content: more towers + enemies to thicken the mix (scaffold ready — config entry + art case; L5 bpPool is empty).
- Retention Modules 4 (Re-engagement; Daily Quests design unfinished in the design doc) and 5 (Collection secondary).
- Smaller: lateral map asymmetry, Limiter rebalance, crash cost-cap, sound.

Today: I'll define the Milestone 2 objectives, then let's plan the milestone and break it into stages before writing any code.

Update the devlog at the end of the session.
