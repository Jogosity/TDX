# TDX Ledger review — answers to Jogo's questions (2026-10-21)

Working notes. Nothing has been changed yet; the proposals at the end wait for Jogo's call.

## 1. Campaign Pressure

**Is it still accurate?** For what it measures, yes: enemy HP arriving versus the firepower your Tokens can buy, now with a Virus tax (each Virus costs about 200 Tokens of towers, measured by the sim). What it can't show is the Virus *spiral*: a flat cost per Virus doesn't compound the way losing towers does in play, so on L4–L5 it reads easier than the game (and the sim) actually are. It's a good map of the numbers, not a replay of a game.

**Tank pressure, and why it doesn't match play.** It asks one question: "can the single toughest enemy (Crack or Worm) walk through your defence?" It divides that enemy's HP by the damage it would take while crossing one tower's reach, assuming every tower focuses it. It spikes on the wave a new tough enemy first appears, then falls as you build. It doesn't match play because tanks aren't what makes the game hard; Viruses are. I'd drop it from the main view.

**The levers to reach the target feel (climb, dip, peak).** Each wave has four dials in `config.js`, and each level has two:
- *TEV*: how much enemy in the wave (overall weight).
- *Roster*: which enemies can appear, and from which wave. The Virus entry wave is the biggest single lever we've found.
- *MAV*: how many at once (the fill-rate lever from E7).
- *Spawn interval*: how spread out.
- Per level: *start Tokens* and *kill rewards* (the player's income).
The dip after the midpoint would come from one lighter wave (lower TEV, or no Viruses that wave).

**Should the Virus be in the graphs?** Yes, but as part of one line, not another line. Right now there are four lines (throughput, tank, burst, target). Proposal: show **one Pressure line** (the worst of the parts, Virus tax included) against the target, and shade the waves where Viruses are present. A "show parts" toggle brings the separate lines back when you want to dig in. That cuts the chart to two lines plus shading.

## 2. What-if knobs

They multiply every wave of every level by the same amount (all enemies tougher, all rewards higher...). That's why they only stretch or squash the curve: they can't change its *shape*, and shape is the problem. Proposal: replace them with **per-level shaping dials** that preview a change before you put it in `config.js`: Virus entry wave, TEV growth per wave, start Tokens, wave-1 cap. Or remove the panel if you'd rather edit the config directly.

## 3. The five level panels

The big number is that level's **peak pressure**: its single hardest wave (L1 0.44 means its hardest wave is at 0.44). Below it: which wave that is, the last wave's pressure, and the average distance from the target curve. It's too much to read at a glance. Proposal: rename them **Level summary** and show a small curve per level against its target, plus one verdict: *Too easy*, *On target* or *Too hard*.

## 4 and 5. Enemy arrivals, Tower value, Enemy value

Keep as they are.

## 6. Model assumptions

These are the guesses the ledger has to make about how a player plays: which tower they buy, how many enemies a grenade hits, how far towers sit from the route, the Virus tax, how much extra entry points split your defence. They're calibration settings, not design controls: the sim measures them and I set them. Proposal: rename it **Calibration**, collapse it by default, and show the sim-measured value beside each one. You shouldn't need to touch it.

## Section names (proposal)

| Now | Proposed name |
|---|---|
| What-if knobs | **Shaping dials** (per level), or removed |
| Model assumptions | **Calibration** (collapsed) |
| Campaign pressure | **Campaign pressure** (one line + target + Virus shading) |
| Five tiles | **Level summary** |
| Level chart (titled with the level's name) | **Enemy arrivals** |
| Fill | **Fill rate** |
| Wave numbers (fold-out table) | **Wave table** |
| Tower value / Damage per enemy pass | **Tower value** (both charts) |
| Enemy value | **Enemy value** |
| How the ledger works | **How the ledger works** |
