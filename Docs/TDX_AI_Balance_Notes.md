# TDX — AI-assisted balance: findings log

Raw material for a more formal write-up on how the tools (Ledger, Sim, Level Editor) and Claude were used to balance TDX. One entry per finding: the question, the method, the numbers, the decision.

---

## F1 — Swarm rewards overheat the economy (S18, 2026-11-03)

**Question (Jogo).** The game gets too easy late on because the Token wallet is bottomless. Can better swarm rewards be *derived* rather than hand-tweaked, without touching every unit?

**Evidence that pointed here.** The new Ledger "Token income" pies (S18) showed Slice + Stinger earning ~52% of all kill income from L3 onwards (L1 8%, L2 36%).

**Why swarms overpay.** The wave builder picks enemies by *count* (weighted picks), and each pick costs its EV from the wave budget. Swarm units are cheap per pick and Slice arrives in packs of 5–8, so they show up in large numbers. A reward that looks fair per unit adds up to a large share of income.

**Method.** Tested three candidate pricing rules, each anchored on Hack (the baseline unit, 30 Tokens):

| Unit | Tokens per 100 EV | per 100 HP | per 100 threat (HP × speed) |
|---|---|---|---|
| Hack | 30 | 30 | 30 |
| Crack | 9.7 | 5.8 | 9.7 |
| Virus | 13.3 | 26.7 | 26.7 |
| Worm | 12.0 | 17.1 | 10.1 |
| Slice | 16.7 | 33.3 | 17.9 |
| Bug | 27.3 | 33.3 | 17.9 |
| Stinger | **44.4** | **57.1** | 30.6 |

- *Per EV* (Slice 18, Stinger 27) and *per threat* (Slice 17, Stinger 39) both **raise** swarm pay, so both were rejected.
- *Per HP* (Tokens per point of damage the player has to deal) gives Slice 9, Stinger 21, Bug 27. It is the only rule of the three that cuts income.

**Ledger result (per HP, Slice 9 / Stinger 21):** kill income down ~17% from L3; swarm share of income ~52% → ~41%; pressure-vs-target gap closes on every level (e.g. L5 −0.20 → −0.13, L3 −0.23 → −0.17). Note: the Ledger reads every level as "too easy" because it ignores drain.

**Sim result (8 seeds; live bot / reactive bot; loss rate and Tokens banked going into the last wave):**

| Level | Current | Per HP |
|---|---|---|
| L3 | 38%/4.4k · 50%/5.1k | 38%/2.2k · 50%/2.5k |
| L5 | 25%/5.6k · 13%/8.2k | 63%/2.1k · 63%/2.7k |
| L7 | 13%/12.2k · 25%/13.2k | 0%/8.4k · 13%/8.4k |
| L8 | 63%/16.0k · 88%/17.2k | 63%/7.8k · 88%/9.1k |
| L10 | 63%/15.1k · 88%/15.3k | 63%/5.3k · 100%/9.7k |

The banked wallet roughly halves; loss rates mostly hold. L5 gets noticeably harder (to be checked in play). The Sim bots build Threaders only, so they are a lower bound on player skill.

**Decision.** Applied the rule to the swarm units only: Slice 10 → 9, Stinger 40 → 21. Bug stays at 30 (the rule gives 27, close enough). Documented in `js/config.js` as `reward = round(health × 0.3)`.

**Takeaways for the write-up**
- A visual of income by source (the pies) turned a hunch ("swarms pay too much") into a measured share in minutes.
- Deriving a value from a stated rule, then checking it in two independent models (the analytic Ledger and the agent-based Sim), replaced trial-and-error tuning.
- The "obvious" metrics (pay per EV, pay per threat) pointed the wrong way. The right unit was the work the player actually does: damage dealt.
- Open: confirm in play that L5 isn't now too tight, and check whether Stinger still feels worth killing.

---

## F2 — The HP multiplier quietly devalues every reward (S18, 2026-11-03)

**Observation (Jogo's playtest after F1).** L1–L3 comfortable but tighter on Tokens; L4 tense and well balanced; L5 lost on W10 after being on the edge throughout.

**Diagnosis.** L5 is L4 shifted up one wave (L5 W*n* has L4 W*n*+1's TEV; W10 goes to 18.6k, past anything in L4), with `enemyDelta.health` 1.75 against L4's 1.5. Effective HP on the last wave is ~32.5k vs ~23k (+40%), while kill income is only ~20% higher, because rewards don't scale with the multiplier. At ×1.75, Hack pays 0.17 Tokens per effective HP instead of 0.30. L5 also has Virus (weight 1.5) from W2, rising to ~6.6 per wave; L6 holds Virus to W4 and plays easier despite ×1.9.

**General point.** Every step up in `enemyDelta.health` is an income cut in disguise. Once rewards are priced per HP (F1), the multiplier and the income curve need to be read together: Tokens per effective HP falls as 0.30 / delta.

**Options for L5.** HP multiplier → ~1.6, or end handle down so W10 ≈ 16k, or Virus lane from W3. Recommended: the multiplier first (keeps the curve's shape).

**Decision.** L5 `enemyDelta.health` 1.75 → 1.6 (damage unchanged). Jogo's principle: prefer "screwdriver fixes", one dial turned left or right, over multi-part changes.

---

## F3 — Tower value: specialists priced against the Threader (S18, 2026-11-03)

**Question (Jogo).** What do the numbers say about Defrag and Compressor? Good units, but they don't feel worth it.

**Method.** A bench using the game's own `Tower` and `Projectile` code (`js/entities.js`): one Tier 1 tower beside a straight route, a continuous stream of enemies at real speed, measuring HP actually removed per second (overkill not counted), per 100 Tokens. The Ledger's tower table rests on guessed pellet-hit rates (Defrag 25%, Compressor 60%); the bench measures what actually lands.

**Before** (HP/s per 100 Tokens; Hack single file / Slice packs of 6):

| Tower | Single file | Packs | Cost |
|---|---|---|---|
| Threader | 17 | 17 | 100 |
| Pulse | 9 | 7 | 400 |
| Compressor | 5–7 | 6 | 400 |
| DDOS | 2.5 | 6 | 400 |
| Deleter | 2.6 | 0.8 | 700 |
| Defrag | 2 | 1.5 | 500 |

Threader is also the toughest per Token (100 HP per 100 Tokens vs 25–38), so Virus drain punishes the expensive towers hardest. Defrag's radial ring sends most pellets into empty space.

**Rule.** Anchor on Pulse: a specialist should remove about half a Threader's HP per Token. The premium pays for its role. One dial per tower.

**Decision (Jogo).**
- Defrag: damage per pellet 7 → 30 (Tier 4 18 → 77, scaled with it).
- Compressor: damage per pellet 7 → 10 (Tier 4 15 → 21).
- Deleter: price 700 → 200 (damage would be wasted as overkill on small enemies; upgrade costs scale from price).
- DDOS unchanged: its value is range. It works from behind the front line, which a damage bench doesn't measure.

**After** (Hack / Slice packs / Crack): Pulse 9.1 / 7.5 / 9.2; Compressor 7.0 / 8.3 / 8.9; Defrag 7.9 / 5.4 / 8.5; Deleter 9.2 / 2.9 / 9.8. Threader still 17. All specialists now sit at Pulse's level, except Deleter against packs (a sniper by design).

**Takeaways for the write-up**
- Measuring with the real combat code beat the analytic model, which leans on guessed hit rates for pellet weapons.
- Two principles from Jogo shaped the fix: "screwdriver fixes" (one dial per unit), and protecting a unit's unique role (DDOS range) from a metric that can't see it.
- Open: re-derive the Ledger's `pelletHit` assumptions from the bench so its tower table agrees; playtest how Defrag, Compressor and the cheaper Deleter feel now.

**Playtest (Jogo, L4, same day).** Clear improvement: Defrag and Compressor are now worth deploying in tactical spots, which makes the game more fun. The attack units (Virus, Bug) demand constant attention at the top of the board and pull the eye off the Repo; that split attention is good for the game. Outcome: the numbers fix opened up a placement decision that didn't exist before, when Threader spam was the only sensible buy (cf. the M3 "Vault-and-Threader loop").

---

## F4 — Upgrade values from one rule (S19, 2026-11-04)

**Question (Jogo).** Is there a solid method for upgrade values (price and HP/DPS) for Threader, Pulse, Defrag, Compressor and DDOS? Deleter is excluded (changes coming).

**Measured problem.** Same bench as F3, per tier. The value of each upgrade step (HP/s added per 100 Tokens of that upgrade) was about 20% of a new tower's at T2, falling to almost nothing at T4. Upgrades cost 2×, 3× and 4× the build price, while damage grew by only ~×2.2 at T4. Building another tower always beat upgrading. Deleter's T3 and T4 added nothing (T2 already one-shots a Hack).

**Principle.** An upgrade buys firepower in a cell that's already in use. Board space is the scarce resource, especially late, when the enemy HP multiplier rises. So an upgrade should be a little worse per Token than a new tower (the density premium), but never worthless.

**Rule.** The Tier 2 upgrade delivers a set share (`UPGRADE.valueShare`) of the tower's own T1 value per Token. Damage and HP rise by the same step each tier, so the share tapers as prices climb:
`stat(tier) = base × (1 + (tier − 1) × costMult[0] × valueShare)`

| valueShare | T2 | T3 | T4 | Fully upgraded overall | T4 vs T1 |
|---|---|---|---|---|---|
| 0.75 | 75% | 50% | 38% | 55% | ×5.5 |
| **0.60** | **60%** | **40%** | **30%** | **46%** | **×4.6** |
| 0.50 | 50% | 33% | 25% | 40% | ×4.0 |

**Decision.** `valueShare: 0.6`. Prices unchanged. The five towers carry `upgrade: 'rule'` in place of hand-set `tier4` values; `tierStat()` in `config.js` is shared by the game, the Ledger and the tests. One global dial now sets every upgrade.

**Verification** (bench, a Hack every 0.4 s; share of T1 value per Token for each step, T2 / T3 / T4):

| Tower | Enemy HP ×1.5 (L4) | Enemy HP ×2 (L8) |
|---|---|---|
| Threader | 60 / 40 / 30 | 60 / 40 / 30 |
| DDOS | 60 / 39 / 27 | 60 / 39 / 29 |
| Pulse | 59 / 38 / 16 | 60 / 38 / 29 |
| Compressor | 58 / 33 / 18 | 59 / 37 / 23 |
| Defrag | 53 / 24 / 10 | 58 / 39 / 10 |

Rapid-fire towers hit the rule exactly. Heavy hitters fall short at T4 against L4 enemies because of **overkill**: a T4 Defrag pellet (138) nearly kills a Hack outright, so the rest of the ring is wasted. The gap closes as the enemy HP multiplier rises (Pulse T4 16% → 29%), so top-tier heavy towers come into their own late, which is what Jogo wants the delta to do.

**Caveat found on the way.** A sparse enemy stream caps what any bench can measure (a tower can't remove more HP than walks past it). Value tests have to use a dense stream.

**Takeaways for the write-up**
- One rule with one dial replaced 10 hand-set numbers; the value it promises is a test (`upgrade value rule` in `tests/sim.mjs`).
- The metric stayed consistent across F1–F4: Tokens versus HP the player has to remove.
- Overkill is the limit of the linear rule. It turns the enemy HP multiplier into a natural pacing force for heavy towers.
- Open: playtest; Deleter's upgrade path (excluded); whether Defrag T4 needs a cap or different growth.

**Playtest (Jogo, same morning).** Early test good; comfortable with the power curve. Unknown: the knock-on effect on the economy. Upgrade prices may need a look later. If so, the same rule takes a price dial (`costMult`) as readily as a power dial.

---

## F5 — A Sim bot that diversifies and upgrades (S19, 2026-11-04)

**Why.** On L5–L10 the existing bots (Threader-only, Tier 1) lost late while sitting on 3–10k unspent Tokens: their tower count plateaus mid-level because no good build cell is left. That is exactly the case upgrades exist for.

**The 'skilled' bot** (`tools/sim/engine.js`, preset in `BOT_PRESETS`):
- The reactive bot's Virus reflexes (picket Vaults, Vault beside a latched Virus, rebuilds).
- Threaders only for the first 8 guns and waves 1–3, then the `DIVERSE` order: Threader, Defrag, Threader, Compressor, Threader, Pulse, Threader, DDOS (DDOS kept ≥ 2.6 cells from the route). Deleter excluded.
- Once no build cell is left, spare Tokens go into upgrades: the gun covering the most path, preferring lower tiers. All tiers assumed unlocked (a skilled player's ceiling).

**What we learned building it.** Saving up for a 400–500 Token specialist starves the early waves. Always saving lost L5 5/8 and L6 7/8; never saving meant specialists almost never got built. The rule that works is **save only while calm**: hold Tokens for the next specialist only while nothing has leaked this wave; under pressure, build Threaders now. This matches M3's E9 finding (killing grounds didn't pay for the bot) and explains it. The cost was the waiting, not the towers.

**Results** (8 seeds; runs lost, reactive → skilled):

| Level | Reactive | Skilled | Notes |
|---|---|---|---|
| L5 | 1/8 | 1/8 | ~7 specialists, 17 upgraded towers by the end |
| L6 | 1/8 | 1/8 | |
| L7 | 1/8 | 0/8 | easiest of the six |
| L8 | 7/8 | 5/8 | every loss now at W1–2; late waves fully held (0 leaks W4+) |
| L9 | 6/8 | 4/8 | early losses W1–4; late leaks W12–13 remain |
| L10 | 8/8 | 6/8 | late collapse W8+ remains; upgrades only start ~W11 |

Bank before the last wave falls from 3–10k to ~0.3k: the skilled bot spends everything.

**Read.**
- Upgrades fix the late game on L8 completely. What's left there is the wave 2 cliff (L6, L8, L9, L10), a curve problem, not an economy one.
- L10's late waves out-scale even a bot that upgrades. Its board doesn't fill until ~W11, so Tokens still go into Threaders while leaks grow.
- L7 is soft.

**Takeaway for the write-up.** Giving the bot the player's real options (diversify, upgrade) changed the diagnosis. The late game is no longer the problem; the starts are.

---

## F6 — Slice packs need a cooldown (S20, 2026-11-05)

**Observation (Jogo).** Slices often arrive by the dozen and fill the field (MAV) with exciting but fragile units. Jogo's comparison: TDX plays like a Horde mode, where spacing out swarm spawns is a standard fix.

**Cause (from `js/waves.js`).** No cooldown on Slice (only Virus had `spawnCooldown`). One Slice pick queues a 5–8 pack, spawned 0.25 s apart, and the very next pick can be Slice again. On top of that, the spawner only picks units that fit in the space left under MAV, so as the field fills the cheapest units (Slice 60, Stinger 90, Hack 100) win most picks. Slices were ~55% of all spawns but only ~20% of a wave's EV and ~12% of its HP.

**Fix (one dial).** `ENEMIES.slice.spawnCooldown: 5`, the existing Virus mechanism. The clock runs from the last Slice of a pack, so there's always a gap between packs; pack size unchanged.

**Result** (skilled bot, 8 seeds; runs lost / Slice share of spawns / Stinger share):

| Level | Before | After |
|---|---|---|
| L5 | 1/8 · 55% · 20% | 1/8 · 35% · 31% |
| L6 | 1/8 · 56% · 21% | 0/8 · 36% · 29% |
| L7 | 0/8 · 57% · 20% | 1/8 · 36% · 30% |
| L8 | 5/8 · 55% · 19% | 5/8 · 33% · 30% |
| L9 | 4/8 · 56% · 20% | 4/8 · 34% · 29% |
| L10 | 6/8 · 55% · 20% | **2/8** · 35% · 30% |

Total spawns fall ~12%. The freed MAV room goes partly to Stingers (the next cheapest swarm unit, 20% → 30%) and partly to heavier units. L10's late collapse mostly disappears; the wave 2 cliff (L8, L9) is untouched, as expected.

**Takeaway.** A spawn pattern problem, not a stats one: the fix was pacing, not numbers on the unit. Watch Stinger: if it now crowds the field, the same dial applies.

---

## Method note — two screwdrivers (Jogo, S20)

After F1–F6 put rewards, tower value, upgrades and spawn pacing on rules, per-level balance boils down to two dials:
- **Enemy delta** (`enemyDelta.health`/`damage`): the power curve across the campaign, and how hard the late waves push (F2).
- **Starting Tokens** (`startTokens`): the opening. The wave 1–2 losses on L6, L8, L9 and L10 happen before kill income matters, so cash in hand at the start is the matching dial.

**Playtest (Jogo, S20, after F1–F6).** L1–L4 "better than ever": more varied enemies. All won with 12–14 of 15 Cores and 1.5–2.5k Tokens banked, so still on the easy side for a skilled player (the designer), but it "feels really close". If L1–L4 need tightening later: enemy delta first, per the two screwdrivers.

---

## F7 — Upgrading is now at parity with building (S20, 2026-11-05)

**Playtest (Jogo, L5–L10).** Things are well under control once towers get upgraded. Jogo left more cells empty than before and kept fewer, better towers; got value from every tower type; the action feels good.

**Sim.** Skilled bot on all 10 levels, plus a variant matching Jogo's style (`upgradeAt: 12`: from 12 guns, upgrade before building). 8 seeds each; runs lost / Cores left in won runs / guns on the board at the end:

| Level | Start / delta | Skilled | Upgrade-first |
|---|---|---|---|
| L1 | 300 · 1/1 | 3/8 · 6.4 · 33 | 3/8 · 6.2 · 24 |
| L2 | 340 · 1.15/1.1 | 0/8 · 10.9 · 21 | 0/8 · 10.9 · 15 |
| L3 | 390 · 1.3/1.2 | 4/8 · 7.8 · 33 | 4/8 · 7.5 · 20 |
| L4 | 450 · 1.5/1.35 | 0/8 · 10.1 · 34 | 0/8 · 11.0 · 19 |
| L5 | 520 · 1.6/1.5 | 1/8 · 9.4 · 38 | 2/8 · 9.2 · 29 |
| L6 | 570 · 1.9/1.6 | 0/8 · 11.5 · 42 | 0/8 · 11.4 · 31 |
| L7 | 610 · 1.95/1.65 | 1/8 · 14.0 · 38 | 1/8 · 14.0 · 30 |
| L8 | 660 · 2/1.75 | 5/8 · 15.0 · 40 | 5/8 · 14.7 · 34 |
| L9 | 800 · 2.1/1.8 | 4/8 · 9.3 · 48 | 5/8 · 7.0 · 39 |
| L10 | 900 · 2.4/1.9 | 2/8 · 10.5 · 45 | 2/8 · 4.5 · 34 |

**Read.**
- **Upgrading and building are now worth about the same.** The upgrade-first bot gets the same results with 20–40% fewer guns, which matches Jogo's experience and is what the F4 rule (60% of a new tower's value, plus the density premium) set out to do. "Fewer, better towers" is now a real strategy.
- **Almost every loss is in the opening** (waves 1–5; L8 all at W1–2). Runs that survive the opening win comfortably, often with 14–15 Cores (L7, L8).
- The bot's opening is weaker than a human's (it loses L1 3/8; Jogo keeps 12–14 Cores), so read early losses relatively: **L3, L8 and L9** have the hardest openings.
- So the levels split exactly along the two screwdrivers: starting Tokens for the hard openings (L3, L8, L9), enemy delta for the late game where survivors coast (L6–L8).

---

## F8 — Turning the two screwdrivers (S20, 2026-11-05)

Skilled bot sweeps on one dial at a time (8 seeds, confirmed at 16). Runs lost / Cores left in won runs.

**Starting Tokens (openings).**
- L8: 660 → 950. Lost 5/16 → 1/16 (all losses had been at W1–2).
- L9: 800 → 1000. Lost 7/16 → 2/16.
- L10: 900 → 1000 to keep starting Tokens rising level to level; no measurable change (7/16 vs 6/16).
- L3: left alone. The bot loses it 4/8 at 390, but it also loses L1 3/8, while Jogo wins both with 12–14 Cores. That's the bot's weak opening, not L3.

**Enemy delta (power curve).**
- L6: health 1.9 → 2.1. Losses unchanged (1/16), Cores left 11.5 → 9.9.
- L7: health 1.95 → 2.2. Cores left 13.4 → 12.8, losses 3/16 → 4/16. Little effect on the late game.
- L8: raising delta on top of the new start (2.25, 2.5) only brought W2 losses back.

**Finding.** Enemy delta is flat across a level, so it bites hardest in the opening, before upgrades are bought; late on, upgrades out-scale it. It's a good dial for overall level difficulty, but a weak one for "survivors coast in the late waves". The targeted dial for that is the curve's end handle (late-wave TEV) in the editor.

**Applied (Jogo's go-ahead).** `js/levels.js`: L6 health 2.1, L7 health 2.2, L8 start 950, L9 start 1000, L10 start 1000. Starting Tokens still rise level to level, so the editor's ordering check stays quiet.

## F9 — Breach Surge: a panic dial that bites without wiping (S21, 2026-11-06)

**Question.** How big can a one-off mid-wave surge be before it stops being a scare and starts deciding the level?

**Method.** Skilled bot, 30 seeds per cell, L4–L10. One surge per level, either at ~75% through the level or on the final wave, sizes 0.2 / 0.3 / 0.5 / 0.8 × that wave's TEV. Measured: runs lost, cores left, leaks on the surge wave.

**Results (surge at ~75%).** Loss rate in percentage points over no surge, and leaks on the surge wave:

| Level | 0.2 | 0.3 | 0.5 | 0.8 |
|---|---|---|---|---|
| L4 W8 | +0, 0.3 | +4, 1.2 | +7, 3.4 | +17, 6.6 |
| L5 W8 | +0, 10.6 | +0, 12.5 | +3, 16.0 | +20, 23.5 |
| L6 W9 | +0, 0.1 | +0, 0.3 | +7, 1.6 | +10, 3.7 |
| L7 W9 | +0, 0.1 | +0, 0.3 | +3, 1.1 | +10, 4.0 |
| L8 W9 | +0, 0.0 | +4, 0.3 | +10, 0.8 | +10, 8.9 |
| L9 W10 | +3, 5.6 | +7, 6.7 | +10, 8.8 | +27, 17.7 |
| L10 W12 | +7, 31.4 | +7, 34.5 | +10, 39.1 | +20, 51.1 |

On the final wave the same sizes change the loss rate by 0–7 points: by then a bot that has survived has the guns, and the run ends before the leak bill compounds.

**Finding.** Surge damage is roughly linear up to 0.5 × TEV and turns sharply around 0.8, where the surge's EV alone exceeds the MAV the defence was built for. Mid-level surges cost cores *and* the rebuild economy; last-wave surges mostly just cost cores. So placement is the drama dial and size is the danger dial. A good panic band for a defence built to the curve is 0.3–0.5.

## Method note — a third screwdriver: board pressure (Jogo, S21, 2026-11-06)

Jogo's edit in the editor before the surge work, in his words: "More blockers and Lockouts mean less firepower and high risk from crashes. This adds some oomph to the level and forces a little more planning."

Board as saved (entry points / blockers / lockouts):

| L1 | L2 | L3 | L4 | L5 | L6 | L7 | L8 | L9 | L10 |
|---|---|---|---|---|---|---|---|---|---|
| 1/6/0 | 2/5/3 | 2/8/0 | 3/7/4 | 3/10/5 | 3/9/5 | 3/9/5 | 3/10/6 | 3/12/7 | 4/17/10 |

**Why it is a separate dial.** Enemy delta and starting Tokens change the numbers on either side of the fight. Board pressure changes the *space*:
- **Firepower ceiling.** Blockers and Lockouts remove buildable cells, so the cells that reach a lot of path become scarce. The player can afford more guns than there are good places to put them, which pushes them towards upgrades (F7) over sprawl.
- **CRASH risk.** More blockers means more of them relocating on each CRASH, so a tower is more likely to be crushed (capped at 2 per crash). Jogo's framing: CRASH is a momentary spike of pressure, not a permanent debuff. The lasting cost of a dense board is the firepower ceiling above; CRASH adds a sharp moment on top of it, which a denser board makes sharper.
- **Planning.** Entry points split the inflow (a mid-level Breach Surge pours from all of them, F9), and the extra ones move on CRASH, so a maze that works now may not work after the next shuffle.

So per-level balance now has three screwdrivers: **enemy delta** (power across the campaign and the late waves), **starting Tokens** (the opening) and **board pressure** (blockers, lockouts and entry points: how much of the money becomes useful firepower, and how risky each placement is). The Breach Surge (F9) sits on top as a per-wave *drama* dial rather than a difficulty dial.

**Measurement caveat.** The Sim bots place towers greedily by path coverage and don't plan around CRASH. They feel the firepower ceiling but not the planning, so expect board pressure to read milder in the sims than it plays. This is a known gap for the write-up: the bots can't yet judge placement risk.

## F10 — Jogo's tougher-units pass, before and after (S21, 2026-11-06)

**Change (Jogo).** Worm HP 350 → 400, Bug 90 → 105, Stinger 70 → 80 (reward left at 21; the F1 rule gives 24). Enemy HP × raised: L4 1.5 → 1.6, L6 2.1 → 2.4, L7 2.2 → 2.8, L8 2.0 → 2.95, L9 2.1 → 2.8, L10 2.4 → 3.0. Several levels moved from "Too easy" to "On target" in the editor's Ledger view.

**Method.** Skilled bot, 30 seeds per level, the committed version (surges in) against the working copy.

| Level | Runs lost (before → after) | Cores left | Stinger + Bug leaks per run |
|---|---|---|---|
| L1 | 53% → 53% | 2.8 → 2.6 | – |
| L2 | 0% → 3% | 12.7 → 12.1 | – |
| L3 | 33% → 37% | 5.5 → 3.7 | 2.5 → 3.2 |
| L4 | 17% → 27% | 8.8 → 6.5 | 4.0 → 26.5 |
| L5 | 30% → 63% | 6.0 → 3.2 | 28.2 → 70.8 |
| L6 | 20% → 60% | 7.7 → 2.6 | 0.7 → 19.1 |
| L7 | 10% → 60% | 11.0 → 3.5 | 0.4 → 73.3 |
| L8 | 13% → 83% | 12.2 → 0.7 | 3.3 → 178.0 |
| L9 | 37% → 87% | 6.8 → 1.3 | 15.0 → 138.3 |
| L10 | 40% → 90% | 6.0 → 0.9 | 91.1 → 182.5 |

**Finding.** The Stinger and Bug now do real work: from L4 on, they leak 5–50× more than before. Stacked with the late-level HP rises, the sims put L5–L10 well past the bot's limit. The losses spread across the whole level, not just the W1–W2 openings, so this is a power problem, not just an opening problem. Calibration: the bot is harsher than Jogo (it loses 53% of L1 runs, which Jogo clears with 12–14 Cores), so its numbers rank levels rather than predict Jogo's result. The largest single jump is L8 (HP × +48%).

