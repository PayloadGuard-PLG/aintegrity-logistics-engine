# Squad Optimiser — Open Research Questions

This document is a self-contained briefing for anyone doing formula research or calibration
work on the Squad Optimiser. Read it before touching the XP engine, profile constants, or
scanner logic.

---

## Context

The app projects stat gains from academy coaching sessions. Core formula:

```
budget per stat = sessions × baseXpPerSession / numStats
xpCost per 1% gain = C₀ × exp(stat / K) / (ageMult × talentMult × greyMult × adMult × drillLevelMult)
```

Constants (from `profiles/game_2025.json`):
- `C₀ = 2.94`, `K = 55` (exponential cost curve)
- `baseXpPerSession = 450` (calibrated Sprint 31 from 4 data points, Normal talent)
- `greyWeightMultiplier = 0.5` (grey stats cost 2× white)
- OVR = `floor(sum of all 15 stats / 15)`

All calibration observations live in `profiles/calibration_data.json`.
All confirmed player records live in `profiles/player_seeds.json`.

---

## Issue 1 — Slow Talent Multiplier (single data point, needs confirmation)

**Status:** Calibrated to 0.47. Single player, single session. Flag for re-confirmation.

**Evidence:**
- Player: LJDark Leo, GK, Age 18, T2, Slow talent
- Session: ×114 Extensive Goalkeeping, 11 white stats
- Game projected: +24–32 OVR (+28 midpoint)
- Engine at `Slow = 0.47`: +25 OVR ✓ (within game range)
- Engine at `Slow = 0.70` (community estimate): +38 OVR ✗ (over by ~10)

**Per-stat breakdown (engine vs game lo–hi):**

| Stat | Engine | Game range | In range? |
|---|---|---|---|
| REFLEXES | 38.1 | 35–48 | ✓ |
| AGILITY | 38.8 | 36–49 | ✓ |
| ANTICIPATION | 32.4 | 31–44 | ✓ |
| RUSHING OUT | 25.8 | 28–33 | ✗ (−2.2 below lo) |
| COMMUNICATION | 41.1 | 36–51 | ✓ |
| THROWING | 27.4 | 29–36 | ✗ (−1.6 below lo) |
| KICKING | 34.2 | 32–46 | ✓ |
| PUNCHING | 39.6 | 35–49 | ✓ |
| AERIAL REACH | 35.6 | 34–47 | ✓ |
| CONCENTRATION | 32.0 | 31–43 | ✓ |
| FITNESS | 28.6 | 29–38 | ✗ (−0.4 below lo) |

9/11 within range. 3 consistently below the low bound. Pattern: mild systematic
under-prediction. Implied true Slow value is slightly above 0.47 — possibly 0.49–0.52.

**What to get:** One more Extensive coaching session on any confirmed Slow player.
Scan the coach preview (player selected in game) to read the game's projected +lo–hi per stat
and OVR boost. Back-calculate the implied multiplier:
```
implied_mult = 0.47 × (engine_gain_at_0.47 / game_midpoint_gain)
```
Average across all stats. If the mean implied mult differs from 0.47 by more than ±0.03,
update `talentMultipliers.Slow` in `game_2025.json`.

---

## Issue 2 — Fastest / Fast / Average Talent Multipliers (community estimates only)

**Status:** Unconfirmed. No empirical data from any non-Normal, non-Slow player.

| Talent | Current value | Source |
|---|---|---|
| Fastest | 1.50 | Community estimate |
| Fast | 1.25 | Community estimate |
| Average | 1.10 | Community estimate |
| Normal | 1.00 | Confirmed (Grant, Rodger — Sprint 26) |
| Slow | 0.47 | Calibrated (Jables — Sprint 32) |

**What to get:** Find a player with confirmed Fast or Fastest talent (check Edit Player screen —
talent is shown explicitly). Scan a coach preview for them. Back-calculate:
```
implied_mult = engine_gain_at_1.0 × (game_midpoint_gain / engine_gain_at_1.0)
             = budget / xpCost_per_pct / game_midpoint_gain
```
A controlled session on a stat in the 100–180 range (where the cost curve is well-validated)
gives the cleanest signal.

---

## Issue 3 — Age Multiplier Validation Gaps

**Status:** Confirmed for ages 18–20 (×1.0) and age 27 (×0.61). All other brackets unconfirmed.

| Age | Multiplier | Status |
|---|---|---|
| 17 | 1.10 | Unconfirmed |
| 18–20 | 1.00 | Confirmed |
| 21–23 | 0.85 | Unconfirmed |
| 24–25 | 0.72 | **In progress** — age-24 DMC player added, no clean scan yet |
| 26–28 | 0.61 | Confirmed (McGinty age 27) |
| 29 | 0.50 | Unconfirmed |
| 30+ | 0 | Unconfirmed (assumed from game UI "Max Stars" lock) |

**What to get:** For each unconfirmed bracket, scan a coach preview for a known-talent Normal
player at that age. Use a white stat in the 100–160 range for the clearest prediction.
Compare engine gain vs game projected gain. Back-calculate:
```
implied_ageMult = predicted_gain_at_ageMult_1.0 / game_midpoint_gain
```

Priority: age 24–25 (bracket 0.72) first — the age-24 DMC player is already in the DB.

---

## Issue 4 — Drill XP Factor (completely uncalibrated)

**Status:** `drillXpFactor = 0.3` is a placeholder. Never validated against real data.

Drills award XP differently from coaches. The factor scales down from the coach baseline:
```
budget per stat = cycles × baseXpPerSession × drillXpFactor / drill.stats.length
```

**What to get:** A controlled drill run with a known player. Record stat values before and after
a single drill cycle (screenshot the player card before, run the drill, screenshot after).
Back-calculate:
```
implied_factor = actual_stat_gain × xpCost_per_pct / (cycles × baseXpPerSession / numStats)
```
Run at least 3 different drills at different intensity levels. The factor may vary by intensity
— if it does, each intensity level needs its own factor. Currently the code assumes one global
factor for all drills.

---

## Issue 5 — ×N Session Scaling (geometric decay hypothesis unresolved)

**Status:** Open. The game may apply geometric session decay, making ×40 yield only slightly
more than ×20.

**Theory:** If `starDecayPerSession = 0.85` applies per session, the effective XP budget is:
```
effectiveBudget = bXPS × sum(0.85^k, k=0..N-1) = bXPS × (1 − 0.85^N) / (1 − 0.85)
```
This plateaus: ×20 → 6.38 effective sessions; ×40 → 6.66. Ratio: 1.04.
If true, `×40` only gives 4% more gain than `×20` — nearly identical.

**Current state:** `starDecayPerSession` is NOT applied in the engine. Budget uses linear `N × bXPS`.
Four data points (Dallas ×4, Grant ×40) fit the linear model well. But no deliberate ×N comparison
has been run.

**What to get:** Same player, same coach, same stats — compare ×4 vs ×20 vs ×40 actual gains.
If ×20 ≈ ×40, the geometric decay hypothesis is confirmed. If gains scale linearly, keep the
current model. This is the highest-impact open question for projection accuracy at large session counts.

---

## Issue 6 — OCR: Arrow Icons Not Readable (Focused coach limitation)

**Status:** Known limitation. No code fix possible without game changes.

When a Focused coach preview is scanned **without a player selected** in the game, highlighted
stats show `↑` arrow icons instead of `+lo–hi` text. ML Kit cannot read icon overlays.

**Current behaviour:** Focused coach with 0 detected stats returns `[]` → coaches tab shows
a manual stat picker (category chips). User selects the 1–2 boosted stats manually.

**Workaround confirmed:** Scan with **any player selected** in the game. The game then renders
`+lo–hi` as text (not icons), which ML Kit reads reliably.

**Remaining gap:** Standard/Extensive coaches also use arrow icons for low-gain stats (e.g.
TACKLING, HEADING, BRAVERY in a Safeguard scan showed no numeric ranges). The pipeline fix
(always use full category list for Standard/Extensive) handles this correctly, but the scanner
itself only detects the 1–2 stats with readable numeric ranges.

---

## Issue 7 — Role Constraints: DC May Be Incomplete

**Status:** Uncertain. Only 5 essential stats confirmed for DC:
`POSITIONING, HEADING, FITNESS, STRENGTH, AGGRESSION`

This seems low. TACKLING and MARKING are defensive fundamentals. The current data comes from
inference, not a direct game observation of a pure DC player's tier upgrade (which would show
exactly which stats receive the white tier bonus).

**What to get:** Run a tier upgrade on a pure DC player and screenshot before/after. Identify
which stats increased by the tier increment — those are the white (essential) stats. Compare
against `roleWeights.ts` DC essential list.

---

## Issue 8 — Projection Accuracy Above Stat 200

**Status:** Provisional. `xpCostTable` entries above 200 were raised empirically (Sprint 24)
but the exponential model (`2.94 × exp(stat/55)`) is used instead of the table.

At high stat values, the model may still under-predict cost:
- CREATIVITY 256 and AGGRESSION 201 observed gaining fewer points than predicted
- At stat 260: model predicts ~371 XP/%, empirical evidence suggests it could be higher

Grant (DL/ML/AML, age 20, Normal) has CREATIVITY 257, FITNESS 261 — both above 200.
Any coaching session on these stats gives a calibration point in the high-cost range.

**What to get:** Scan a coach preview that includes a stat ≥ 220 for a known-talent Normal
player. The game's projected `+lo–hi` for that stat gives the implied XP cost:
```
implied_xpCost = budget_per_stat / game_midpoint_gain
budget_per_stat = sessions × 450 / numStats
```
Compare against `2.94 × exp(stat / 55)`. If ratio differs from 1.0 by more than 15%, update K.

---

## Summary: Priority Order

| Priority | Issue | Effort | Impact |
|---|---|---|---|
| 1 | Slow talent re-confirmation (Issue 1) | Low — one scan | Confirms or refines 0.47 |
| 2 | ×N scaling test (Issue 5) | Medium — 3 sessions same player | Resolves biggest structural uncertainty |
| 3 | Age 24–25 bracket (Issue 3) | Low — one scan of age-24 DMC | Confirms 0.72 or corrects it |
| 4 | Drill XP factor (Issue 4) | Medium — controlled drill before/after | Enables drill projection |
| 5 | Fast/Fastest talent (Issue 2) | Low — one scan if player available | Pins two unconfirmed multipliers |
| 6 | DC role whiteness (Issue 7) | Low — one tier upgrade screenshot | Corrects or confirms DC essential set |
| 7 | High-stat cost curve (Issue 8) | Low — any scan with stat ≥ 220 | Improves projection at elite stat levels |
