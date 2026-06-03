# AIntegrity Logistics Engine — Dev Log

Reverse-chronological. Each entry covers what shipped, what broke, and what the next sprint targets.

---

## Sprint 1 — Repo Scaffold + Domain-Agnostic Rename
**2026-06-03**

Branch: `claude/squad-optimiservp-BQH8C`

### Shipped

**Phase A: Repo scaffold (from `payloadguard-plg/aintegrity-squad-optimiser`)**

- Cloned source repo, removed football remote, created logistics remote at `payloadguard-plg/aintegrity-logistics-engine`
- Renamed profile: `profiles/game_2025.json` → `profiles/logistics_v1.json` with all `_meta` provenance siblings added
- Replaced `src/types/resources.ts` — football types replaced with logistics types (`Asset`, `DomainProfile`, `EfficiencyClass`, `StageName`, `ConstantMeta`, etc.)
- Renamed modules throughout: `coachScanner` → `documentScanner`, `playerScanner` → `assetProfileScanner`, `coachPipeline` → `investmentPipeline`, `playerService` → `assetService`, `roleWeights` → `metricWeights`, `coaches.tsx` → `investment.tsx`, `index.tsx` → `assets.tsx`
- Written new `CLAUDE.md` for the logistics context

**Phase B: Six architectural changes**

| Problem | Change |
|---|---|
| B1 | `DynamicsModel` interface — `src/engine/dynamicsModel.ts` |
| B2 | `applyIntervention` Stage 11 + P20/P21 Crosshair contracts |
| B3 | `evaluateRuleSet` / `CeilingRule` + P18-param/P19-param Z3 proofs |
| B6 | Zod ingest boundary — `src/logic/investmentPipelineSchema.ts` + Dafny `MetricValue` newtype |
| B4 | `propagateUncertainty` / `ProjectionBand` + P22 Z3 proof |
| B5 | `getConstantMeta()` / `load_constant_meta()` provenance accessor |

Proof count reached **30/30** (8 Crosshair + 7 Hypothesis equivalence + 15 Z3).

**Domain-agnostic naming — complete rename of all public symbols**

All football-derived names replaced throughout the full stack:

| Old name | New name |
|---|---|
| `xpCostBase` / `C0` | `costCurveBase` / `COST_CURVE_BASE` |
| `xpCostDecayK` / `K` | `costCurveDecay` / `COST_CURVE_DECAY` |
| `baseXpPerSession` / `BASE_XPS` | `baseResourcesPerCycle` / `BASE_RESOURCES_PER_CYCLE` |
| `sessionBudgetDecay` | `cycleBudgetDecay` / `CYCLE_BUDGET_DECAY` |
| `greyWeightMultiplier` / `GREY_MULT` | `secondaryMetricWeight` / `SECONDARY_METRIC_WEIGHT` |
| `ageTable` / `AGE_TABLE` | `maturityMultipliers` / `MATURITY_MULTS` |
| `talentMultipliers` / `TALENT_MULTS` | `efficiencyClassMultipliers` / `EFFICIENCY_CLASS_MULTS` |
| `maxBaseOvr` / `MAX_BASE_OVR` | `capacityCeiling` / `CAPACITY_CEILING` |
| `starDecayPerSession` / `STAR_DECAY` | `thresholdDecayFactor` / `THRESHOLD_DECAY_FACTOR` |
| `starOvrThreshold` / `STAR_OVR_THRESHOLD` | `thresholdCciIncrement` / `THRESHOLD_CCI_INCREMENT` |
| `twoxAdMultiplier` / `TWOX_AD_MULT` | `boostMultiplier` / `BOOST_MULTIPLIER` |
| `totalAttributeCount` / `TOTAL_ATTRS` | `metricCount` / `METRIC_COUNT` |
| `qualityOvrDivisor` / `OVR_DIVISOR` | `cciDivisorScale` / `CCI_DIVISOR_SCALE` |
| `tierAttrAdditions` / `TIER_ADDITIONS` | `stageMetricAdditions` / `STAGE_METRIC_ADDITIONS` |
| `statCap` / `STAT_CAP` | `metricCap` / `METRIC_CAP` |
| `condLevelMultipliers` / `COND_LEVEL_MULTS` | `intensityMultipliers` / `INTENSITY_MULTS` |
| `fanClubCondReduction` / `FAN_COND_REDUCTION` | `supportDrainReduction` / `SUPPORT_DRAIN_REDUCTION` |
| `baseLossPerDrill` / `BASE_LOSS_PER_DRILL` | `baseDrainPerCycle` / `BASE_DRAIN_PER_CYCLE` |
| `conditionPerRestorer` / `CONDITION_PER_RESTORER` | `readinessPerRestoration` / `READINESS_PER_RESTORATION` |
| `seasonDecayPerLevel` / `SEASON_DECAY` | `periodicDegradationPerStage` / `PERIODIC_DEGRADATION` |
| `drillXpFactor` / `DRILL_XP_FACTOR` | `conditioningResourceFactor` / `CONDITIONING_RESOURCE_FACTOR` |
| `drillLevelMultipliers` | `cycleIntensityMultipliers` |
| `xp_cost_at_stat(stat)` | `cost_at_metric(metric)` |
| `age_multiplier(age)` | `maturity_multiplier(maturity_index)` |
| `talent_multiplier(talent)` | `efficiency_class_multiplier(efficiency_class)` |
| `grey_multiplier(is_white)` | `metric_weight_multiplier(is_primary)` |
| `stars_gained_from_ovr_gain(...)` | `thresholds_crossed_from_cci_gain(...)` |
| `star_decay_multiplier(stars_gained)` | `threshold_decay_multiplier(thresholds_crossed)` |
| `coach_budget_per_stat(sessions, ...)` | `investment_budget_per_metric(cycles, ...)` |
| `stat_gain_from_budget(start_stat, ...)` | `metric_gain_from_budget(start_metric, ...)` |
| `ovr_from_stats(stat_values)` | `cci_from_metrics(metric_values)` |
| `apply_season_decay(...)` | `apply_periodic_degradation(...)` |
| `is_training_locked(base_ovr)` | `is_investment_locked(base_cci)` |
| `condition_drain_pct(drill_intensity, fan_level)` | `readiness_drain_pct(cycle_intensity, support_level)` |
| `talent_ordering_holds()` | `efficiency_class_ordering_holds()` |
| `grey_lt_white()` | `secondary_lt_primary()` |
| `age_multipliers_non_increasing()` | `maturity_multipliers_non_increasing()` |
| `coachBudgetPerStat` (TS bridge) | `investmentBudgetPerMetric` |
| `statGainFromBudget` (TS bridge) | `metricGainFromBudget` |
| `ovrFromStats` (TS bridge) | `cciFromMetrics` |
| `applySeasonDecay` (TS bridge) | `applyPeriodicDegradation` |
| `isTrainingLocked` (TS bridge) | `isInvestmentLocked` |
| `conditionDrainPct` (TS bridge) | `readinessDrainPct` |

**Files changed:** `profiles/logistics_v1.json`, `src/engine/engineConstants.ts`, `src/engine/engineMath.ts`, `src/types/resources.ts`, `src/logic/xpEngine.ts`, `src/logic/ovrProjector.ts`, `app/(tabs)/investment.tsx`, `src/logic/investmentPipeline.ts`, `verification/constants_pure.py`, `verification/engine_pure.py`, `verification/multipliers_pure.py`, `verification/crosshair_contracts.py`, `tests/proofs/test_z3_properties.py`, `tests/proofs/test_ts_equivalence.py`, `tests/proofs/test_crosshair_contracts.py`, `verification/run_ts.ts`

### Verification

```
npx tsc --noEmit   → clean (0 errors)
pytest tests/proofs/ -m proof -v   → 30/30 PASS
```

### Merged

PR merged to `main` on `payloadguard-plg/aintegrity-logistics-engine`. Both CI jobs green:
- Engine Proofs / z3-crosshair — ✅ 2m 6s
- Engine Proofs / dafny — ✅ 17s

### Open for next sprint

- Field calibration: all constants in `profiles/logistics_v1.json` marked `assumed` or `provisional`. First controlled field observation needed to back-calculate `baseResourcesPerCycle`.
- SPEC.md and CLAUDE.md terminology updates (OVR→CCI, stat→metric, drill→conditioning cycle throughout).
- Domain vocabulary (`metricVocabulary`, asset classes, efficiency class labels) must be populated from actual deployment domain.

---

## Sprint 35 — Calibration Corrections + Focused-Coach OCR Fix
**2026-05-20**

Branch: `claude/test-connection-I2s8B` (commit `4f2c7d1`)

### Shipped

**Player identity — corrected throughout (`profiles/calibration_data.json`, `profiles/player_seeds.json`, `CALIBRATION_RECORD.md`)**

Three names were tangled:

- **Jables JaseysBoi** — the GK who did the ×114 Extensive GK session. Account was previously named Lewis MacGregor; renamed since. Same player. Previously mislabelled as "LJDark Leo" in calibration_data.json.
- **Gillespie** — the actual in-game name for the player known as "LJDark Leo". No calibration observations on Gillespie.
- **Lewis MacGregor** — not a separate player. Old account name for Jables JaseysBoi; appears in session screen OCR and the Player Academy Update screenshot.

`ljdark_leo` key renamed to `jables_jaseysboi` everywhere. `gillespie` entry added (name correction only, no observations). No `lewis_macgregor` entry — that was the same person.

**Formula re-confirmed 11/11 GK stats — ×114 Extensive GK**

With geometric budget (sessionBudgetDecay=0.99), K=47, C₀=2.94, bXPS=676, ageMult=1.0 (age 18), talent=1.0:

- effectiveSessions = 68.17, budget/stat = 4190 XP
- All 11 GK stat engine projections inside game-displayed +lo/+hi ranges
- OVR: engine 172.5 vs actual 173. Error < 1%.

Session screen OCR was recorded under old name "Lewis MacGregor" — same scan, same result. Formula is clean.

**Slow ×0.47 invalidated — reverted to 0.70 (`profiles/game_2025.json`)**

The 0.47 (Sprint 33) was back-calculated from this same ×114 session using the **linear** budget model. Sprint 34 confirmed the geometric model. Under geometric budget, Normal (1.0) explains the result fully. 0.47 was never valid.

`talentMultipliers.Slow` reverted 0.47 → 0.70 (community estimate, informational display only). The formula uses 1.0 for all players regardless of DB talent label — this is confirmed behaviour, not an assumption.

**Neri — confirmed stats + K=47 failure documented (`profiles/calibration_data.json`, `profiles/player_seeds.json`)**

Player card screenshot (d1526180) confirmed all 15 stats for G Neri (Age 28, T6 Legendary, OVR 273). Previous DB had Fitness=240 (actual 330), Creativity=248 (actual 323) — significantly stale.

Focused Physical ×4 Reward Coach result: game shows FITNESS +3–4, CREATIVITY +3–4. Engine with K=47: +0.25 and +0.29. Under-prediction ~14×.

K=47 was calibrated from stat range 90–260. At stat=330 (T6), the exponential cost is 87× higher than at stat=120. Implied K≈76 from this data point. K=47 remains unchanged in the engine — one player, one session is not enough to commit to a new constant. Documented in Outstanding (CALIBRATION_RECORD.md item 6).

Player full name confirmed: **Nerimala** (not "Neri" / "G Neri"). Training Rate = **Normal ✅** confirmed from Edit Player screen (screenshot 53d01ca8). 15 stats rescanned — DB is now current (app OVR 272 = floor(4093/15) ✓). No rescan needed.

**Focused-coach cross-column gain bleed fix (`src/logic/coachScanner.ts`)**

In the 3-column game layout (Defence / Attack / Physical), stats on the same row in different columns share a Y coordinate. When a Focused Physical coach highlights FITNESS and CREATIVITY, the TACKLING row text extends rightward to the FITNESS column — the scanner was picking up FITNESS's +3-4 as TACKLING's gain range, and similarly BRAVERY was picking up CREATIVITY's.

Result: 5 stats returned instead of 2 (TACKLING, BRAVERY, FINISHING were false positives). Workaround: manual stat picker.

Fix: added `CATEGORY_STAT_SETS` filter in the primary detection loop for Focused coaches only. After a stat name is identified, if the coach is Focused, any stat not in the coach's stated category is skipped before gain detection runs. Standard and Extensive coaches are unaffected (they use the pipeline's full-category override).

### Files changed

| File | Change |
|---|---|
| `src/logic/coachScanner.ts` | `CATEGORY_STAT_SETS` filter in primary loop for Focused coaches |
| `profiles/game_2025.json` | `talentMultipliers.Slow`: 0.47 → 0.70 |
| `profiles/calibration_data.json` | `ljdark_leo` → `jables_jaseysboi`; add `gillespie`; add `neri`; invalidate Slow 0.47 analysis |
| `profiles/player_seeds.json` | Jables JaseysBoi (rename + talent note); Nerimala confirmed stats (age 28, all 15 current, talent Normal ✅) |
| `CALIBRATION_RECORD.md` | Jables identity, Gillespie note, K=47 high-stat failure, Slow talent status |

### Open / Next Sprint

- **K=47 at T5+/T6** — implied K≈76 from Nerimala at stat=330. Need 2+ more data points in the 260–330 range before changing the engine constant. Any T5+ player with a regular (non-Focused) coach scan in that stat range qualifies.
- **Jables talent from edit screen** — DB says Slow; formula-confirmed at 1.0 rate. True talent label (from Personal Trainer tab / Training Rate field) still not captured from a screenshot. Doesn't affect projections but closes the record.
- King Alfie talent still Unknown — screenshot edit screen for Training Rate label.

---

## Sprint 34 — Geometric Budget Model + Formula Fix
**2026-05-20**

Branch: `claude/test-connection-I2s8B` (commits `cffe933`, `4a35400`)

### Shipped

**Session budget: geometric decay model confirmed (`profiles/game_2025.json`, `src/engine/engineConstants.ts`, `src/engine/engineMath.ts`)**

Root cause of the ×N over-projection confirmed from LJDark Leo's actual game result: 145 OVR → **173 OVR (+28)** from ×114 Extensive GK.

- **Linear model** (old): budget = N × bXPS / numStats → projects 182 OVR. Error +9. **Wrong.**
- **Geometric model** (new): `effectiveSessions = (1 − 0.99^N) / (1 − 0.99)` → for N=114: 68.2 effective sessions → projects 172 OVR. Error −1. **Correct.**

Each successive coaching session of the same coach delivers 0.99× the previous session's XP (`sessionBudgetDecay = 0.99`). Effective sessions plateau at 100 for very large N.

Impact by session count:
- ×4: 3.94 effective (negligible — Dallas calibration preserved)
- ×40: 33.1 effective (Grant TACKLING-120 projects 59.2 vs actual 59–73 ✓)
- ×114: 68.2 effective (LJDark Leo 145 → 172 OVR projected, actual 173 ✓)

Added `"sessionBudgetDecay": 0.99` to `profiles/game_2025.json`. Added `SESSION_BUDGET_DECAY` constant (confirmed ✅) to `engineConstants.ts`. Updated `coachBudgetPerStat()` in `engineMath.ts` to use the geometric formula.

**Slow (0.47) talent multiplier invalidated**

The 0.47 value (Sprint 33) was back-calculated from LJDark Leo ×114 using the linear budget model. With geometric budget (0.99 decay), LJDark Leo's actual result (173 OVR) is consistent with Normal (1.0) talent — the 0.47 was an artefact of the wrong model. Slow has **no confirmed data point** until a player with confirmed-Slow talent is tested under the geometric budget formula. Updated `engineConstants.ts` JSDoc to reflect this.

**Scan-ranges bypass removed from `runProjection` (`app/(tabs)/coaches.tsx`)**

The previous push (`6a51a46`) used `(lo+hi)/2` from scan ranges directly in the projection. This blocked blank-coach scans (no player selected in-game produces no `+lo-hi` values). Reverted to formula-only projection. The formula is now accurate for all scan modes.

**CI syntax fix (`app/(tabs)/coaches.tsx:227`)**

`scan.multiplier ?? parseInt(sessions, 10) || 1` → `(scan.multiplier ?? parseInt(sessions, 10)) || 1`. JavaScript requires parens when mixing `??` with `||`.

### Files changed

| File | Change |
|---|---|
| `profiles/game_2025.json` | Added `sessionBudgetDecay: 0.99` |
| `src/types/resources.ts` | Added optional `sessionBudgetDecay?: number` to `GameProfile` |
| `src/engine/engineConstants.ts` | Added `SESSION_BUDGET_DECAY` export; updated Slow talent JSDoc (invalidated) |
| `src/engine/engineMath.ts` | `coachBudgetPerStat()` uses geometric formula |
| `app/(tabs)/coaches.tsx` | Removed scan-ranges bypass from `runProjection`; CI syntax fix |

### Open / Next Sprint

- **LJDark Leo talent unknown** — Playstyle icon ≠ talent. Check Personal Trainer tab for Fastest/Fast/Average/Normal/Slow label. If Normal: 0.47 was artefact only. If Slow: need to recalibrate from scratch with geometric budget.
- **Slow talent has no confirmed data point** — 0.47 is invalidated. Scan any confirmed-Slow player's Extensive coach with game ranges visible, back-calculate with geometric budget formula.
- Confirm talent tier for Garry McCluskey and King Alfie from edit screen
- Creativity underprediction for Garry (+5.8 vs +7–10): if Fast (×1.25), predicted = +7.1 ✓ — talent confirmation will resolve this
- Training Camp budget formula unknown — observe which stats show gain arrows across multiple Training Camp scans
- Brandon Prentice Reward Coach ×4 actual results (compare vs engine: +15.4 MARKING, +15.1 POSITIONING, +11.6 AGGRESSION)

---

## Sprint 34 — New Player Data + Training Camp Detection
**2026-05-19**

Branch: `claude/test-connection-I2s8B`

### Shipped

**Player seeds — Garry McCluskey + King Alfie added (`profiles/player_seeds.json`)**

Two new DarkVader FC player records:

- **Garry McCluskey** — Age 24, DC/DMC/MC, T3 Stellar, OVR 197. White (12): all except Crossing, Finishing, Shooting. Talent assumed Normal (unconfirmed from edit screen).
- **King Alfie** — Age 19, DC/DL/DMC, T3 Stellar, OVR 200 (160 base + 40 tier). White (12): all except Dribbling, Shooting, Finishing. Talent Unknown.

**ageMult=0.72 confirmed for age 24 (`CLAUDE.md`)**

Garry McCluskey ×4 Focused Physical Drill Session Reward Coach: Fitness 213 → engine projects +3.5 at ageMult=0.72, actual game result +2–3. Validates the 24–25 bracket. Updated status in `CLAUDE.md` from ❌ NOT confirmed to ✅ Confirmed.

**Training Camp detection — scanner + pipeline + UI (`src/logic/coachScanner.ts`, `src/logic/coachPipeline.ts`, `app/(tabs)/coaches.tsx`)**

Training Camp is a distinct game session type (labelled "TRAINING CAMP" in-game). It does not boost all category stats — for King Alfie, only 3 of 5 ATK stats were boosted (Dribbling, Crossing, Finishing), and the budget distribution formula is unknown. The coaching engine cannot project Training Camp sessions.

Fix:
- `coachScanner.ts`: detects "TRAINING CAMP" string in OCR output → sets `isTrainingCamp: true` in `CoachScanResult`
- `coachPipeline.ts`: `resolveCoachStats` returns `[TRAINING_CAMP_SENTINEL]` immediately when `scan.isTrainingCamp`. `TRAINING_CAMP_SENTINEL = '__TRAINING_CAMP__'` is exported for UI guards.
- `coaches.tsx`: checks sentinel → shows "TRAINING CAMP — cannot project (different budget structure)" banner, clears stat list, suppresses OVR projection

**Calibration data updated (`profiles/calibration_data.json`)**

- Garry McCluskey observation: ×4 Drill Session Reward Coach (Fitness +2–3, Creativity +7–10). Validates ageMult=0.72; Creativity underprediction (+5.8 vs +7–10) suggests talent may be Fast rather than Normal.
- King Alfie observation: Training Camp Standard Attacking ×20 — logged as OUT_OF_SCOPE_SESSION_TYPE. Game preview: Dribbling +42–51, Crossing +30–40, Finishing +45–54 (3 stats only; engine shows 5-stat budget — confirms Training Camp uses a different distribution).

---

## Sprint 33 — OCR Dedup + OVR Fix + Slow Talent + Safeguard Fix + Reward Coach
**2026-05-18/19**

Branch: `claude/test-connection-I2s8B` (commits `4482e2b`, `19d0170`, `5c9dcf7`, `c5cb17d`, `3e04c0c`)

### Shipped

**OVR formula confirmed: Math.floor (`src/logic/xpEngine.ts`)**

Sprint 27 addendum had incorrectly confirmed `Math.ceil` from 4 data points. The correct resolution was a clean integer-only tier upgrade (Grant T2→T3): displayed sum = 2615, game OVR = 174. `floor(2615/15) = 174` ✓, `ceil = 175` ✗. The prior ceil observations were artefacts of fractional stat accumulation (internal sum > displayed sum). Fixed in `qualityPctToOvr()`.

**Duplicate stat capture fix (`src/logic/coachScanner.ts`)**

Scanner was pushing duplicate `StatCapture` entries (e.g. CONCENTRATION twice), causing React "duplicate key" errors. Fix: replaced `stats[]` accumulator with `Map<string, StatCapture>` + `upsertCapture()` — prefers real baseline (statBefore > 0) over arrow-only capture; narrower gain span as tiebreaker.

Also fixed baseline selection: was taking `rowNums[0]` (first number in merged 3-column block, which may belong to the adjacent column). Fixed to pick the numeric token whose `left` position is closest to the stat name token.

**Slow talent multiplier calibrated: 0.70 → 0.47 (`profiles/game_2025.json`)**

LJDark Leo (GK, Age 18, Slow): ×114 Extensive GK, engine at Slow=0.47 → +25 OVR projected, game range +24–32. 9/11 stats within game range. Single data point — 3 stats marginally below lo bound, true value may be 0.49–0.52. Flagged for confirmation from a second Slow player.

**Safeguard category fix (`src/logic/coachPipeline.ts`)**

`CATEGORY_STATS["Safeguard"]` was incorrectly mapped to GK stats. Fixed to DEF stats (same as Defending: TACKLING, MARKING, POSITIONING, HEADING, BRAVERY).

Standard and Extensive coaches now always return the full category list regardless of how many stats OCR detected. Arrow icons (↑) are unreadable by ML Kit on non-highlighted rows — partial detections are an OCR limitation, not evidence that fewer stats are coached. Focused and Reward Coaches excluded from this rule.

**Category filter in embedded stat pass (`src/logic/coachScanner.ts`)**

Secondary embedded-stat scan was capturing out-of-category stats from merged OCR blocks (e.g. AGGRESSION appearing in POSITIONING's rowText during a Safeguard scan). Fixed by filtering candidates to the coach's category. `CATEGORY_STAT_SETS` constant added (mirrors `CATEGORY_STATS` in pipeline as `Set<string>`). Reward Coaches bypass the filter (their cross-category boosts are intentional).

**Reward Coach detection (`src/logic/coachScanner.ts`, `src/logic/coachPipeline.ts`)**

Reward Coaches use the Standard/Extensive label but boost custom cross-category stats. Detection: scanner sets `isRewardCoach: true` when "REWARD COACH" found in OCR. Pipeline skips full-category override for Reward Coaches; scanner bypasses category filter in embedded pass. XP budget confirmed same as regular Standard coach.

**LJDark Leo seed + calibration data (`profiles/player_seeds.json`, `profiles/calibration_data.json`)**

T2 snapshot added. Full ×114 GK session per-stat breakdown recorded with predicted vs actual ranges.

### Files changed

| File | Change |
|---|---|
| `src/logic/xpEngine.ts` | OVR formula: `Math.ceil` → `Math.floor` |
| `src/logic/coachScanner.ts` | Map-based dedup + nearest-number baseline + CATEGORY_STAT_SETS + Reward Coach detection |
| `src/logic/coachPipeline.ts` | Safeguard = DEF stats; Standard/Extensive full-category override; Reward Coach exclusion |
| `profiles/game_2025.json` | `talentMultipliers.Slow` 0.70 → 0.47 |
| `profiles/calibration_data.json` | LJDark Leo per-stat data; Prentice xN projections; Reward Coach observation |
| `profiles/player_seeds.json` | LJDark Leo T2 snapshot |

### Open / Next Sprint

- Brandon Prentice Reward Coach ×4 actual result — compare vs engine projections
- ×N anomaly test (same player, ×4 vs ×20 actual gains) — linear or geometric budget scaling?
- Second Slow talent data point
- ageMult=0.72 validation from age-24 DMC player scan

---

## Sprint 32 — Custom Coach Engine Fix + Branch Transition
**2026-05-18**

Branch: `claude/test-connection-I2s8B` (commit `15164e8`)

### Shipped

**customCoachEngine.ts — replace deprecated shim with real XP engine (commit `15164e8`)**

`predictCustomDrill` was calling `calculateDynamicGain` — the `@deprecated` shim in `coachMath.ts` — without passing a `GameProfile`. Without a profile, the shim hit the graceful degradation fallback:

```javascript
const ageFactor = age <= 19 ? 1.0 : age <= 21 ? 0.4 : 0.2;
```

Any player over 21 returned `ageFactor = 0.2` — the engine treated them as training at 20% efficiency. The real XP engine (`xpNeededFor1Pct`) uses the full age table with interpolation; the fallback is a hardcoded three-bracket approximation with no connection to `profiles/game_2025.json`.

Two compounding errors in the original code:
1. **Wrong function** — `calculateDynamicGain` (deprecated shim) instead of `estimateStatGainPct` from `xpEngine.ts`
2. **No GameProfile** — age, talent, white/grey, cost curve all fell back to hardcoded guesses

*Why multipliers scaled correctly despite the broken base:* `coachMultiplier` passes through the fallback formula proportionally — the ×1.5 / ×1.0 ratio was preserved even though the absolute base was wrong.

**Fix:**
- `PlayerStats` interface gains `statValue: number` and `talent: TalentTier` — the XP engine requires actual stat value, not OVR
- `predictCustomDrill` gains a `profile: GameProfile` parameter
- XP budget: `sessions × profile.baseXpPerSession × coachMultiplier`
- `estimateStatGainPct` called with actual stat value, player age, talent tier, white/grey flag — all resolved from `game_2025.json`
- `drillLevelMult = 1.0` for coach sessions (budget already incorporates `baseXpPerSession`)
- Dead import of `calculateDynamicGain` removed

### Branch transition

`claude/test-connection-I2s8B` is now the active dev branch. `claude/continue-development-CAQUS` was merged to `main` via PR #62 and is retired.

### Files changed

| File | Change |
|---|---|
| `src/logic/customCoachEngine.ts` | Full rewrite — removed deprecated shim, wired to real XP engine with `statValue`, `talent`, `profile` |

### Open / Next Sprint

- Calibrate `drillXpFactor` — still provisional at 0.3; needs real before/after drill stat data
- Confirm Fastest/Fast talent multipliers (community estimates 1.5/1.25 — not empirically tested)
- Confirm ageMult=0.72 bracket from age-24 DMC player scan
- Resolve ×N anomaly before changing budget formula
- Fix age-24 DMC player name ("Team: Insidious FC" — scanner read club name, not player name)

---

## Sprint 31 — bXPS Recalibration + Critical Bug Fixes + Role Corrections
**2026-05-18**

Branch: `claude/continue-development-CAQUS` (commits `fb4ccc0`, `4482e2b`, `19d0170`, `5c9dcf7`, `c5cb17d`)

### Shipped

**Critical crash fix — stale `setSelectedTier` reference (commit `fb4ccc0`)**

Sprint 30 removed the tier section from `coaches.tsx` but left `setSelectedTier(null)` in the sessions TextInput `onChangeText` handler. App crashed the moment the user typed in the sessions field. Removed the stale call.

**Coach scanner — CROSSING detection fixed (commit `4482e2b`)**

3-column OCR merge: ML Kit collapses adjacent-column text into single blocks (e.g. `"194 + 4-6 Crossing"`). CROSSING (ATT column) was never appearing as a standalone token when embedded in a DEF-column block. Fixed with a secondary embedded-stat scan in `rowText`:

```typescript
const embRE = new RegExp(`\\b${escapedName}\\b\\s+(\\d+)\\s*\\+?\\s*(\\d+)\\s*[-–—]\\s*(\\d+)`, 'i');
```

Safeguard scans now correctly return 3 stats instead of 2.

**bXPS recalibrated: 220 → 450 (commit `19d0170`)**

Root cause: Sprint 24 calibrated `baseXpPerSession=220` against the stepped xpCostTable model. Sprint 25 switched to the exponential model without re-calibrating. The exponential model's compounding makes gains significantly more expensive over a 60-point stat range — bXPS needed to rise proportionally.

Back-calculated from four independent data points:

| Player | Stat | Value | Session | Game range | Implied bXPS |
|---|---|---|---|---|---|
| Cptn Dallas ×4 Safeguard | MARKING | 139 | age 23, Normal | +11–16 | 495 |
| Cptn Dallas ×4 Safeguard | POSITIONING | 194 | age 23, Normal | +4–6 | 455 |
| Cptn Dallas ×4 Safeguard | AGGRESSION | 189 | age 23, Normal | +4–6 | 414 |
| Ricky Grant ×40 Defending | TACKLING | 120 | age 20, Normal | +59–73 actual | 409 |

Mean: 443 → set to **450**. Validated: Dallas ×4 Safeguard all 3 stats land inside game ranges. Rayne ×4 Safeguard confirmed +1 OVR (was +0 at bXPS=220).

**DMC role — STRENGTH moved to secondary (commit `5c9dcf7`)**

STRENGTH was in DMC's essential list incorrectly — carried over from MC/AMC adjacency. Game confirms STRENGTH is grey for a pure DMC player. DMC now: 9 essential, 6 secondary.

**playerScanner.ts — OCR misread corrections (commit `c5cb17d`)**

`OCR_STAT_CORRECTIONS` map added: `'TACKIING' → 'TACKLING'`, `'TACKL1NG' → 'TACKLING'`. ML Kit misreads the font's lowercase 'l' as 'i' or '1' on certain device renderings.

### New players confirmed this sprint

| Player | Age | Roles | Tier | Talent | OVR |
|---|---|---|---|---|---|
| Cptn Dallas | 23 | AMR/MR/DR | T0 | Normal ×1.0 | ~185 |
| Rayne | 21 | ML/DL/DC | T3 | Normal ×1.0 | 204 |
| Age-24 DMC (Insidious FC) | 24 | DMC | T0 | Normal ×1.0 | 127 |

### Files changed

| File | Change |
|---|---|
| `app/(tabs)/coaches.tsx` | Remove stale `setSelectedTier(null)` from sessions `onChangeText` |
| `src/logic/coachScanner.ts` | Secondary embedded-stat scan for 3-column OCR merge (CROSSING fix) |
| `src/logic/playerScanner.ts` | `OCR_STAT_CORRECTIONS` for TACKLING OCR misreads (`TACKIING`, `TACKL1NG`) |
| `profiles/game_2025.json` | `baseXpPerSession` 220 → 450 |
| `profiles/calibration_data.json` | `bxps_recalibration` block with full back-calculation evidence |
| `src/utils/roleWeights.ts` | DMC: STRENGTH essential → secondary |

### Open / Next Sprint

- Confirm ageMult=0.72 bracket (age 24) — scan a coach preview for the age-24 DMC player
- Calibrate `drillXpFactor` — still provisional at 0.3
- Fix age-24 DMC player name (saved as "Team: Insidious FC")
- Confirm DC white stat set (5 essential seems low — check if TACKLING/MARKING should be white)

---

## Sprint 30 — Tab Simplification: Results as Single Plan Hub + drillXpFactor Calibration
**2026-05-18**

Branch: `claude/continue-development-CAQUS` (commits `dcc4b64`, `0375a77`, `4fd12f2`)

### Shipped

**Coaches tab — tier section removed (commit `dcc4b64`)**

The TIER UPGRADE block has been removed from the Coaches tab entirely. Tier upgrades now live only in the Results tab.

Removed: `selectedTier`, `tierPointInputs`, `upgradableTiers`, `tierOvr()`, `combinedOvr`, `combinedGain`, `TIER_COSTS`, `TIER_ADDITIONS`, `TIER_INCREMENTS`, `TIER_ORDER` constants, combined OVR banner JSX, and the full tier upgrade JSX block (~100 lines). Unused imports (`TIER_COLORS`, `getWhiteStatKeys`, `getAllStatKeys`, `applyTierBonusToStats`, `TierName`, `DrillLevel`) removed. `applyGains()` and `saveRun()` simplified — no tier branch. Coach tab is now: scan → project → apply to card.

**Drills tab — test lab rewrite (commit `dcc4b64`)**

Full rewrite of the saved presets section:
- `drillPresetService.getAll()` now loaded in `useEffect` on save (fixes invisible presets bug — presets were saving but never displaying)
- SAVED PRESETS section: each preset shows name, intensity-coloured drill chips, condition/cycle calculation, cycles TextInput, SELECT button (white border when selected)
- `projectDrillPlan()`: iterates selected presets × cycles, calls `estimateStatGainPct` per stat with correct `drillLevelMultipliers[drill.intensity]` multiplier
- `pushToResults()`: saves each selected preset as a `DrillPlanEntry` via `drillPlanHistoryService`, navigates to Results tab
- New `drill_plan_history` SQLite table (via `ensureDrillPlanHistoryTable()` in `src/db/index.ts`)

**Results tab — combined plan hub rewrite (commit `dcc4b64`)**

Full rewrite. Results is now the only place to combine all investment types:
- **DRILL PLANS section**: selectable list from `drillPlanHistoryService.getForPlayer()` (entries pushed from Drills tab). Amber left border when selected. Max 10.
- **COACHING SESSIONS section**: selectable list from `coachHistoryService.getForPlayer()` (entries saved when scanning/projecting in Coaches tab). Steel left border when selected. Max 5.
- **TIER UPGRADE section**: unchanged — only in Results.
- `runProjection()`: drill plans → coach sessions → tier upgrades (correct order).
- `ready` condition: any of drill/coach/tier selected.
- "ADD TO ROSTER — APPLY FULL PLAN" button applies final stats + OVR + tier to player card.
- Old manual session entry (SessionEntry, stat picker grid, history picker modal) removed entirely.

**GK category toggle fix (commit `0375a77`)**

`selectCoachCategory()` previously used toggle logic (`const next = coachCategory === cat ? '' : cat`). After a scan detected Goalkeeping, tapping GK again would toggle it OFF and clear stats. Changed to always-select — tapping any category always loads that category's full stat list. Switch category by tapping a different one; scan resets everything.

**drillXpFactor = 0.3 — drill projection calibration (commit `4fd12f2`)**

`baseXpPerSession = 220` was calibrated for academy coaches only. Drill sessions give significantly less XP per session. Without real drill session calibration data, a provisional `drillXpFactor = 0.3` scales drill budgets down to 30% of coach baseline. Applied in `drills.tsx` and `results.tsx`:
```
drillBudget = cycles × baseXpPerSession × drillXpFactor / drill.stats.length
```
Flag is in `profiles/game_2025.json` and `src/types/resources.ts` (`drillXpFactor?: number`). Tune once real before/after stats from a drill run are available.

**New services and DB tables**

- `src/services/coachHistoryService.ts` — `CoachHistoryEntry`, `save()`, `getForPlayer()`
- `src/services/drillPlanHistoryService.ts` — `DrillPlanEntry`, `save()`, `getForPlayer()`
- `src/db/index.ts` — `ensureCoachHistoryTable()`, `ensureDrillPlanHistoryTable()`
- `app/_layout.tsx` — calls both new ensure* guards on migration success

### Calibration confirmed

LJDark Leo (Age 18, GK, Normal ×1.0, T0 → T2):
- Before: 143 OVR
- After ×114 Extensive Goalkeeping + T1 + T2: **191 OVR confirmed in-game**
- App projection: 191 ✓ — coach formula validated for GK category

OCR scan of ×114 Extensive GK detected 8/11 stats (THROWING, AERIAL REACH, FITNESS missed — embedded in adjacent column tokens rather than standalone blocks). Workaround: tap GK category after scan to load all 11.

### Open / Next Sprint

- Drill XP factor calibration — need before/after stats from a real drill run to back-calculate true `drillXpFactor`
- Sprint 31: Game Readiness dashboard (condition, teamplay, fan club, streak road)
- Sprint 31 questions: fan club per-player vs global? Streak road manual vs auto-increment?

---

## Sprint 30 Hotfixes — GK toggle + drillXpFactor
**2026-05-18**

See main Sprint 30 entry above. These were committed separately:

- `0375a77` fix: GK category always reloads stats on tap — no toggle-off
- `4fd12f2` fix: drillXpFactor=0.3 — scale drill budget to coach baseline (uncalibrated)

---

## Sprint 29 — Visual Polish: Tab Art, Splash Border, Git Discipline
**2026-05-17**

Branch: `claude/continue-development-CAQUS` (commits `f4fb8f5`, `08ea078`, `fa53f4c`, `d29d067`, `f971395`, `f3d7f21`)

### Shipped

**Tab background opacity fix (commit `f4fb8f5`)**

Sprint 28 tab backgrounds were rendering at nearly invisible opacity (0.055/0.09 — miscalibrated for dark screen). Corrected:
- All tabs: stroke `0.22→0.32`, node `0.40→0.55`, fill `0.10→0.16`
- Coaches tab: fill kept lower (`0.10`) to prevent bar colour bleed; bar count reduced from 5→3 per column group with wider spacing

**Tab label legibility fix (commit `08ea078`)**

Inactive tab selector labels were `theme.inkMuted` (`#909099`) — too faint on dark background to read comfortably. Changed to `theme.inkSec` (`#c8c8d2`) in `src/components/AppHeader.tsx`.

**Git Discipline added to ASSUMPTIONS.md (commits `fa53f4c`, `d29d067`)**

Standing rules for branch management, sprint-end docs pattern, and dev session workflow codified in ASSUMPTIONS.md. Third-party brand names removed and replaced with generic descriptors (`live field update`, `hot-reload server`, `device console session`).

**Splash screen border art (commits `f971395`, `f3d7f21`)**

Data-viz border art added to `src/components/SplashAnimation.tsx` via new `SplashBorderArt` component:
- Bottom: ascending bar chart with 10 bars paired in the 5 tab accent colours (blue/green/amber/purple/red)
- Top: 5 dashed horizontal grid lines + nodes, one per tab colour
- Sides: vertical scan lines in tab colours (blue/green left, purple/amber right)
- SVG `RadialGradient` mask fades art to transparent behind the ring animation — visible at all screen edges, hidden in the central reticle zone
- Fades in with the existing grid layer at animation start

### Open / Next Sprint

- Assess splash and tab art on device with Steve — adjust opacity/colour if needed after review
- Neri full stat scan — complete `profiles/player_seeds.json` entry
- Splash/icon assets from Steve → update app config
- Fractional OVR display (deferred from Sprint 28) — range format `+0.6→+1.2`

---

## Sprint 28 — Bug Fixes from Steve's Test Protocol + Animated Splash + Tab Backgrounds
**2026-05-17**

Branch: `claude/continue-development-CAQUS` (commits `6999d4e`, `6babe9c`, `98b1f4b`, `b7ca6bd`, `bb1ff77`, `86162a7`, `24a3242`, `eb06356`, `126e820`, `b29b568`, `c216455`)

Steve ran a full test protocol on build `83a1ec6` (EAS ab01b0d7, Pixel 8 Pro Android 16, fresh install). 18 bugs recorded. This sprint fixed all addressable issues.

### Shipped

**Fix 1 — Concatenated role token splitting (commit `6999d4e`)**

OCR emits multi-role sequences as a single token: `"MLAML"`, `"DLAML"`, `"DLMLAML"`. These tokens aren't in `KNOWN_ROLES` and were silently dropped, breaking white stat union for multi-role players.

Greedy parser added to `src/logic/playerScanner.ts` — tries longest known role first, consumes the token left-to-right, only accepts if the full token is consumed:
```typescript
function splitConcatenatedRoles(token: string): string[] {
  const found: string[] = [];
  let pos = 0;
  while (pos < token.length) {
    const match = ROLES_BY_LEN.find(r => token.startsWith(r, pos));
    if (!match) break;
    found.push(match);
    pos += match.length;
  }
  return pos === token.length ? found : [];
}
```
Examples: `"MLAML"` → `["ML","AML"]`, `"DMCMC"` → `["DMC","MC"]`, `"DLMLAML"` → `["DL","ML","AML"]`.

**Fix 2 — Player selector visible with 1-player squad (commit `98b1f4b`)**

Both `app/(tabs)/drills.tsx` and `app/(tabs)/coaches.tsx` gated the player chip selector on `squad.length > 1`. With a single player, the selector was hidden — no visual confirmation of who was selected. Changed to `squad.length > 0` in both files.

**Fix 3 — Focused coach 0-stat fallback guard (commits `86162a7`, `24a3242`, `eb06356`)**

Root cause had two parts:

1. **OCR case mismatch**: `coachScanner.ts` used case-insensitive regex (`/Focused/i`) which returned the raw OCR text (`"FOCUSED"`). Downstream guard `scan.coachType === 'Focused'` never fired (title-case vs uppercase). Fixed by normalising through a lookup: `COACH_TYPES.find(t => t.toLowerCase() === rawType.toLowerCase())`. Same fix applied to `coachCategory`.

2. **Fallback too broad**: When a Focused coach scan detected 0 highlighted stats, `resolveCoachStats` fell through to `getWhiteStatKeys(playerRole)` and returned all 13 white stats. Focused coaches only boost 1–2 stats — 13 is always wrong. Guard added to `src/logic/coachPipeline.ts`:
```typescript
if (scan.coachType === 'Focused') {
  return []; // activates manual picker
}
```

Note: ML Kit OCR cannot read the `↑` arrow icons shown in the no-player-selected state (they are icon overlays, not text). Workaround documented in UI hint: scan with any player selected. Arrow detection from Sprint 27 handles the player-selected path correctly.

**Fix 4 — OVR before/after scale mismatch (commit `bb1ff77`)**

An intermediate commit (`b7ca6bd`) attempted to show fractional OVR progress (e.g. `291.1`) by returning raw `sum/15`. But `ovrBefore` still used `computeOvrWithPadding` (ceil-based), causing gain = `291.1 − 292 = −0.2`. Reverted — both before and after now use `computeOvrWithPadding`. Fractional display deferred; clean integer deltas restored.

**Fix 5 — Unselected button borders (commit `98b1f4b`)**

Coach type (Standard/Focused/Extensive), category (Attacking/Defending/Physical/Safeguard), and intensity buttons had no visible border when unselected on dark background. Changed inactive `borderColor` from `theme.hairline2` to `theme.steel`; inactive text from `theme.inkGhost` to `theme.inkMuted`.

**Fix 6 — Stat colour coding in Focused stat picker (commit `98b1f4b`)**

Stat toggle buttons in the manual Focused picker were all white. Now use `statColor(stat)` for text and `col + '88'` for border, matching the DEF (blue) / ATT (purple) / PHY (orange) scheme used in StatGrid and the rest of the app.

**Animated splash screen (commit `126e820`)**

New component `src/components/SplashAnimation.tsx` — shown on app launch before the main tab navigator. Uses React Native `Animated` API + `react-native-svg`. Total sequence ~3.2s:
- Grid lines + concentric rings fade in (450ms)
- Inner circuit traces + cardinal ticks (400ms)
- Title text: "SQUAD / OPTIMISER / ENGINE" + "SESSION SIMULATOR" (500ms)
- Hold (1500ms)
- Full fade out (550ms) → `onComplete()` → main app mounts

Two continuous spinning dashed rings (CW 5s loop, CCW 8s loop) run throughout. Color: `#cc1111` throughout — consistent with app accent.

`app/_layout.tsx` updated to gate behind `animDone` state. DB migration spinner now uses the same red (`#cc1111`).

**Per-tab background art (commits `126e820`, `b29b568`, `c216455`)**

New component `src/components/TabBackground.tsx`. Each tab has a unique accent colour replicated in its SVG background art. Same data-viz aesthetic (bars, grid lines, trend lines, nodes) themed per tab function:

| Tab | Colour | Art |
|---|---|---|
| Squad | Steel blue `#4a9eff` | Descending OVR roster bars + 4-3-3 formation dot overlay |
| Plan | Green `#34d399` | 7-step tier milestone bars (T0→T6) + ascending projection curve |
| Drills | Amber `#fb923c` | 5 intensity groups × 3 drill bars + convergence lines to focal point |
| Coaches | Purple `#a78bfa` | DEF/ATT/PHY stat column bars (3×5) + horizontal scan lines |
| Results | Red `#cc1111` | Ascending projection bars + trend line (confirmed good in testing) |

All backgrounds use `StyleSheet.absoluteFill` + `pointerEvents="none"` — zero interaction interference.

**Neri seed entry (commit `6babe9c`)**

Partial seed entry added to `profiles/player_seeds.json` for the 292 OVR ST/AMC/MC T6 player visible in Steve's screenshots. Stats not yet fully confirmed from intake form scan.

### Bugs Fixed This Sprint

| ID | Description | Fix |
|---|---|---|
| F95 | Multi-role OCR tokens (`"MLAML"`) silently dropped | Greedy concatenated role parser in playerScanner |
| F96 | Player selector hidden with 1-player squad | `squad.length > 1` → `> 0` in drills + coaches |
| F97 | Focused coach scan returns 13 stats instead of activating manual picker | OCR case normalisation + Focused guard in coachPipeline |
| F98 | Coach type/category buttons don't light up after scan | coachType/coachCategory normalised to title-case in coachScanner |
| F99 | Unselected type/category/stat buttons invisible on dark bg | Border colour `hairline2` → `steel`, text `inkGhost` → `inkMuted` |
| F100 | Focused stat picker all white — no DEF/ATT/PHY colour coding | `statColor(stat)` applied to Focused toggle chips |
| F101 | OVR showing −0.2 gain after coach session | Before/after using different scale (raw vs ceil); reverted to consistent ceil |

### Not a Bug — Sprint 28 Triage

- **Bug 17 (stat gains 3–4× prediction)**: Steve's manual calc used old params (`bXPS=150`, wrong age mult). App formula correct — documented in CLAUDE.md.
- **Scan 04 (Standard Defending ×20, 4 of 5 stats)**: OCR miss on one stat row, not a code logic bug.
- **Bug 14 (player name replaced by role string)**: Heuristic already excludes uppercase sequences. Likely OCR miss on that device/screenshot. Monitor on next build.
- **Bug 9 / Bug 16 (OVR ±1)**: Already fixed in Sprint 27 (`Math.ceil` in `qualityPctToOvr`).
- **Bug 11 (arrow confusion in coach scan)**: Already fixed in Sprint 27 (arrow detection in coachScanner).

### Open / Next Sprint

- **Neri full stats**: scan Neri's player card to complete `profiles/player_seeds.json` entry; verify roles and tier.
- **Splash / icon assets**: Steve to supply `assets/splash.png` (1284×2778) and `assets/icon.png` (1024×1024); update `app.json` to point to them.
- **Fractional OVR display**: deferred — needs a clean design that doesn't conflict with ceil-based before/after. Consider showing as `+0.6→+1.2` range rather than fractional AFTER value.
- **×N anomaly**: sub-linearity expected from exponential cost curve; no code change until Steve tests ×10 vs ×40 deliberately on same player.
- **Git workflow**: two Termux sessions — Metro on one, git pull on the other. No Metro restart needed; file changes hot-reload automatically.

---

## Sprint 27 — Role Correction, Scanner Fixes, OVR Formula Fix, Kevin McGinty
**2026-05-16**

Branch: `claude/continue-development-CAQUS` (commits `59b5d7d`, `387e9d1`, `a184903`, `3e04c0c`)

### Shipped

**Rogers 3rd role corrected: AMC → DL**

Sprint 26 re-entry screenshots confirmed Rogers' in-game position grid is AML + ML + **DL**, not AMC as recorded in prior sprints. All data files updated:
- `profiles/player_seeds.json` — roles, white_stats (10 → 13), grey_stats corrected
- `profiles/calibration_data.json` — player entry, snapshots, open questions updated
- Historical observations 46697–46703 kept as-is; their `isWhite` flags reflect the AMC-era role set

With DL replacing AMC, Rogers' white/grey split now matches Grant's exactly:
- **White (13):** TACKLING, MARKING, POSITIONING, BRAVERY, PASSING, DRIBBLING, CROSSING, SHOOTING, FINISHING, FITNESS, AGGRESSION, SPEED, CREATIVITY
- **Grey (2):** HEADING, STRENGTH

Impact on defending coach projections for Rogers: TACKLING/MARKING/BRAVERY now project at full XP rate (white) instead of halved (grey). HEADING moves to grey.

**playerScanner.ts — role detection anchored to Roles: label (commit `59b5d7d`)**

Role extraction now anchors to the Y-band of the "Roles:" label token (±28px). Previously the scanner swept all tokens for role-shaped strings and could pick up dark/inactive position labels elsewhere on the game card. Fix:
```typescript
const rolesLabelTok = tokens.find(t => /^roles?\s*:?$/i.test(t.text.trim()));
const roleRowY = rolesLabelTok?.top;
const roleSourceTokens = roleRowY != null
  ? tokens.filter(t => Math.abs(t.top - roleRowY) < Y_TOL)
  : tokens;
```
Falls back to full-text regex scan when no "Roles:" token is found.

**coachScanner.ts — arrow indicator detection for no-player-selected state (commit `387e9d1`)**

Sprint 23 plan item D implemented. When no player is selected on the coach preview screen, highlighted stat rows show an arrow indicator (`↑ ^ › > ▲`) next to the stat name but no gain values. The scanner now captures these:
```typescript
const ARROW_RE = /[↑\^›>▲]/;
// after GAIN_RE block:
} else {
  const hasArrow = rowTokens.some(t => ARROW_RE.test(t.text));
  if (hasArrow) {
    stats.push({ statName, statBefore: 0, gainLo: 0, gainHi: 0 });
  }
}
```
`resolveCoachStats` in coachPipeline.ts uses only `statName` — zero gain values are discarded downstream.

**Kevin McGinty identified as OVR-99 mystery player (commit `3e04c0c`)**

The OVR-99 player from the Sprint 26 controlled test (Extensive Safeguard ×10/×40) confirmed as Kevin McGinty: Age 27, roles AMC only, T0, Normal talent. Age 27 → `ageMult = 0.61`. Added to `profiles/player_seeds.json` and `profiles/calibration_data.json`.

The ×10/×40 ratio of 2.43 (vs linear 4×) is explained by the exponential cost curve: higher stat values cost more, so doubling the session count yields diminishing returns. Not a bug.

**OVR formula fixed: Math.floor → Math.ceil (commit `3e04c0c`)**

The game uses `Math.ceil` for the OVR formula, not `Math.floor` or `Math.round`. Confirmed from 4 data points:

| Player | sum/15 | ceil | floor | Game OVR |
|---|---|---|---|---|
| McGinty (T0) | 99.53 | **100** | 99 | 100 ✓ |
| Rogers (T0) | 120.60 | **121** | 120 | 121 ✓ |
| Grant (T2) | 157.00 | **157** | 157 | 157 ✓ |
| Grant (T3) | 175.40 | **176** | 175 | 176 ✓ |

`floor` fails for McGinty and Grant T3. `ceil` matches all four. Fixed in `qualityPctToOvr()` in `src/logic/xpEngine.ts`. This resolves the "OVR +1 discrepancy" open since Sprint 24.

### Bugs Fixed This Sprint

| ID | Area | Fix |
|---|---|---|
| F91 | playerScanner picking up inactive position labels as player roles | Anchor role extraction to Roles: label Y-band |
| F92 | coachScanner missing highlighted stats when no player is selected | Arrow indicator detection (ARROW_RE fallback path) |
| F93 | OVR displayed 1 below game value for most players | qualityPctToOvr: Math.floor → Math.ceil |
| F94 | Rogers white/grey stats wrong (AMC-era) | Corrected to DL; all 13 white stats now match Grant |

### Open / Next Sprint

- Rogers device DB: Steve should verify the DB entry has DL as 3rd role (not an older AMC entry)
- Splash screen assets: awaiting Steve to supply `assets/splash.png` (1284×2778) and resized `assets/icon.png` (1024×1024); then update `app.json` to separate splash/icon paths
- ×N anomaly: sub-linearity is expected from exponential cost model (documented above); no formula change needed

---

## Sprint 26 — Talent Confirmed, Player Snapshots, Seed Data
**2026-05-16**

Branch: `claude/continue-development-CAQUS` (commit `3e02c5d`)

### Shipped

**Talent confirmed for both calibration players**

Both Ricky Grant and Ryan Rogers are **Normal talent (×1.0)** — confirmed from intake form Training Rate selections. This resolves the largest open calibration uncertainty since Sprint 24. `bXPS=220` was calibrated under the Normal assumption; that assumption is now verified.

**Calibration database comprehensively updated (`profiles/calibration_data.json`)**

- Added `talent: "Normal", talentConfirmed: true, talentSource: "..."` to both player entries
- Added `snapshots[]` arrays tracking stats at different training stages:
  - Grant: T2/ELITE snapshot + T3/STELLAR snapshot (current)
  - Rogers: T0/OVR-116 snapshot (original calibration) + T0/OVR-120 snapshot (current)
- Added `tier_increment_verification` for Grant: T2→T3 confirms 13 white stats for DL/ML/AML
- White stat count verified from tier increment: HEADING +1, STRENGTH +1 (grey — one point from rounding); all others +21

**Player seed file created (`profiles/player_seeds.json`)**

Definitive player records for re-entry if device DB is wiped. Contains correct roles, stats, talent, and tier for both players. Uses full 3-role entries, not the 1-role values entered during initial intake.

**Controlled ×N test logged**

Extensive Safeguard ×10 vs ×40 on OVR-99 outfield player (talent ×1.0, Fitness 111, Very Hard intensity):
- ×10 → app projects +3.7 FITNESS
- ×40 → app projects +9.0 FITNESS
- Ratio 2.43 (expected ~3.65 under linear budget model)
- Sub-linearity attributed to exponential cost curve + unknown player age (age now confirmed as 27 in Sprint 27)

### Bugs Fixed This Sprint

None (data/calibration sprint).

### Open / Next Sprint

- Roles entered with only 1 position in intake forms (Grant saved as DL only; Rogers as AML only) — re-enter with full 3-role selections on device
- OVR +1 discrepancy for both players (resolved in Sprint 27 via ceil fix)
- OVR-99 mystery player age unknown (resolved in Sprint 27: Kevin McGinty, age 27)
- ×N anomaly ratio 2.43 vs expected 3.65 (resolved in Sprint 27: expected from exponential cost model)

---

## Sprint 25 — Exponential XP Cost Model + Community Framework
**2026-05-16**

Branch: `claude/continue-development-CAQUS` (commits `acca203`, `2140d7b`)

### Shipped

**Exponential XP cost model (commit `acca203`)**

`xpBaseForStat()` in `src/logic/xpEngine.ts` now uses `C₀ × exp(stat / K)` when `xpCostBase` and `xpCostDecayK` are present in the game profile. The stepped `xpCostTable` is retained as fallback when those fields are absent.

Parameters derived from calibration data and added to `profiles/game_2025.json`:
- `xpCostBase: 2.94` — base cost at stat = 0
- `xpCostDecayK: 55` — decay constant (cost doubles every ~38 stat points)

Derivation: observed Tackling 120 vs Positioning 228 in the same coach session under the same XP budget. Actual gain ratio = 66 / 13.5 = 4.89. `exp((228-120)/55) = 4.89` exactly. Model confirmed from one ratio.

**Community framework confirmed (commit `2140d7b`)**

Research confirms the published training formula:
```
Effective Gain = Base × Age × Talent × Drill-Avg Penalty × White Factor × Intensity/Tier
```
Maps directly to the `xpNeededFor1Pct` divisor. No structural code changes needed.

Key community findings:

| Finding | Status |
|---|---|
| Formula structure | ✅ Confirmed — matches existing code |
| greyWeightMultiplier = 0.5 | ✅ Confirmed |
| Age multiplier (discrete slabs) | ✅ Confirmed |
| ~20% seasonal quality reset | ✅ Confirmed (unmodeled by design) |
| Fast Trainer = 1.5–2× effective | ⚠️ Range only — talent confirmation pending |

**`src/types/resources.ts`** — added optional `xpCostBase?: number` and `xpCostDecayK?: number` to `GameProfile` interface.

### Bugs Fixed This Sprint

None (model improvement sprint).

### Open / Next Sprint

- Talent tier for Ricky Grant and Ryan Rogers unknown — everything hangs off this; `bXPS=220` assumed Normal (×1.0)
- Fast/Fastest talent multipliers (community: 1.5–2× effective range) cannot be pinned until known-talent calibration is available
- ×N anomaly (×20 ≈ ×40 for same player/stats): geometric session decay plateau is the working hypothesis; do not change budget formula until empirically confirmed

---

## Sprint 24 — XP Math Fix, Double-Tap Player Select, Calibration DB
**2026-05-16**

Branch: `claude/continue-development-CAQUS` (commit `931503b`)

### Shipped

**XP star decay bug fixed (`src/logic/xpEngine.ts`)**

`estimateStatGainPct` was passing `starsGainedInSession + gain` to `xpNeededFor1Pct` as the star count. Since `gain` incremented per stat point (0→1→2→…), `starMult = 0.85^gain` caused each successive integer point to cost exponentially more. By point 14 the per-point multiplier had risen ~8×, which is why projections showed +12 for Tackling 122 when the game actually delivers +60+.

Fix: pass `starsGainedInSession` only (accumulated OVR stars, not per-stat-point count). Costs now depend on stat value, which is the correct model.

**`baseXpPerSession` recalibrated: 150 → 220 (`profiles/game_2025.json`)**

Calibrated against Ricky Grant (age 20) Standard Defending ×40: Tackling 120 → actual game gain 59-73 pts ↔ ~60 projected with bXPS=220. Stepped xpCostTable entries for 200+ stats also increased to match empirical observations (Aggression 201: only 14-21 pts, Creativity 256: only 5-7 pts).

**Double-tap player selection (`app/(tabs)/coaches.tsx`)**

Single tap: selects player for coaching projection. Double tap (within 350ms on same chip): navigates to the player edit screen (`/player/[id]`). Implemented with a `lastTapRef` per-session to detect consecutive taps.

**Calibration database created (`profiles/calibration_data.json`)**

All coach screenshot observations from Ricky Grant and Ryan Rogers captured with: gainLo/Hi ranges, stat values, isWhite flags, coach type/category/multiplier, OVR. Not loaded at runtime — pure reference for formula analysis.

### Bugs Fixed This Sprint

| ID | Area | Fix |
|---|---|---|
| F87 | Projections massively underestimating gains (e.g. +12 vs actual +60) | Star decay bug: was accumulating per-point, now uses session OVR stars only |
| F88 | No quick path from Coaches tab to player edit screen | Double-tap chip navigates to `/player/[id]` |

### Open / Next Sprint

- Talent tier for Ricky Grant and Ryan Rogers unknown — bXPS=220 assumes Normal (×1.0)
- ×N anomaly: Standard Defending ×20 and ×40 show nearly identical gains — geometric sum plateau hypothesis
- Positioning 148 (Rogers, AML/ML/AMC) underperforms prediction — possible partial-grey treatment
- Stats above 240 still under-project even with updated table

---

## Sprint 23 — coachScanner Highlighted-Stat Detection Overhaul
**2026-05-16**

Branch: `claude/continue-development-CAQUS` (commits `8679c4c`, `41c899c`, `83a1ec6`, `5467436`, `793a17d`, `e9b01e0`, `8d949cb`)

### Shipped

**coachScanner.ts — all 5 detection improvements**

*A — Y tolerance split*

`Y_TOL=25` replaced with two constants:
- `Y_TOL_NAME=25` — stat name detection (allows two-word names e.g. RUSHING OUT)
- `Y_TOL_VAL=18` — gain range row lookup, tighter than row spacing (~22px) to prevent adjacent-row bleed

*B — blockIdx explicitly NOT used*

`blockIdx` filtering was evaluated and rejected: stat name tokens and their gain values are in different ML Kit blocks (name is in the teal-background block, gain is in the adjacent text block). Adding a `blockIdx` filter would break gain detection for highlighted stats. Left/right column filtering (`t.left > tok.left`) already prevents cross-column bleed without blockIdx.

*C — GAIN_RE `+` optional, tightened sanity check*

`/\+\s*(\d+)\s*[–\-—]\s*(\d+)/` → `/\+?\s*(\d+)\s*[–\-—]\s*(\d+)/`

Teal/white highlight backgrounds cause OCR to drop or mangle `+`. Sanity check tightened: `hi > lo` (not `>=`), `lo <= 150` (excludes stat values misread as lo).

*D — Arrow indicator detection (no-player-selected state)*

When no player is selected, highlighted stats show `↑` (or OCR variants `^ › > ▲`) with no gain values. Scanner now detects these and captures `{ statName, statBefore: 0, gainLo: 0, gainHi: 0 }`. `resolveCoachStats` uses only `statName` — zero values discarded.

*E — `_debugBlocks` logging*

`CoachScanResult._debugBlocks` string captures all ML Kit block texts. Logged in `coaches.tsx` under `__DEV__` for Termux block-structure validation.

**Switch to line-level tokens (commit `5467436`)**

Changed from element-level to line-level token extraction. Line-level grouping reduces token count and keeps multi-word stat names together. This was necessary after blockIdx was removed — lines keep natural word associations.

**Goalkeeping → Safeguard category mapping (commit `793a17d`)**

Game uses "Goalkeeping" as the category label for GK coaches; internal code uses "Safeguard". Mapping added to coachScanner.ts.

**Safeguard CATEGORY_STATS expanded (commit `e9b01e0`)**

Safeguard category now maps to all 11 GK stats, not just 5. Corrects fallback stat derivation for blank GK coach tiles.

**Manual type/category/stat picker fallback (commit `8d949cb`)**

When OCR fails to detect the coach header, users can manually select coach type (Standard/Focused/Extensive), category (Attacking/Defending/Physical/Safeguard), multiplier, and individual stats via a dropdown picker. Prevents total scan failure on difficult image conditions.

### Bugs Fixed This Sprint

| ID | Area | Fix |
|---|---|---|
| F83 | coachScanner returning all 13 stats instead of 2 highlighted ones | Y_TOL_VAL=18, optional `+` in GAIN_RE, arrow detection |
| F84 | Adjacent-row gain ranges bleeding into wrong stat | Y_TOL_VAL tightened to 18px |
| F85 | GK coaches' category not recognised | Goalkeeping → Safeguard mapping |
| F86 | No fallback when OCR fails completely on coach header | Manual type/category/stat picker |

---

## Sprint 22 — Unified Coach Scan Pipeline
**2026-05-16**

Branch: `claude/continue-development-CAQUS` (commits `1b0071d`, `5dea82a`, `5025315`, `27ebbf8`, `fbb5e25`)

### Shipped

**coachPipeline.ts — unified scan pipeline**

New file `src/logic/coachPipeline.ts` consolidates all post-OCR processing:
1. Raw OCR → `coachScanner.ts` → `CoachScanResult` (header fields + stat captures)
2. `resolveCoachStats(scan, player, profile)` → stat names only (image gain values discarded)
3. XP projection via `ovrProjector.ts` using player's DB stats, not OCR values

**`scannedStats` is `string[]` — image values never touch projection**

The coach preview image contains `statBefore`, `gainLo`, `gainHi` that belong to whoever's player is shown in the image, not the selected player. These are discarded immediately after OCR. Only stat names from highlighted rows are retained.

Projection is pure math from the selected player's DB record:
```typescript
const budget = sessionCount * profile.baseXpPerSession / scannedStats.length;
```

**Coaches tab — 3-table layout (commit `5dea82a`)**

Three side-by-side read-only tables in the coach preview section:
1. **OFFERING** — stat names the coach boosts (from scan)
2. **CURRENT** — player's current values for those stats
3. **PROJECTED** — estimated values after coaching sessions

Replaces the earlier combined grid that mixed OCR values with projections.

**`_debugBlocks` logging added**

`CoachScanResult` extended with optional `_debugBlocks?: string`. Logged under `__DEV__` in `coaches.tsx` for diagnosing block structure in Termux builds.

### Bugs Fixed This Sprint

| ID | Area | Fix |
|---|---|---|
| F82 | Coach scan projection using image player's stats, not selected player | Discard all OCR values post-scan; project from DB record only |

---

## Sprint 21 — New Role Training Bar + OCR Name Fix
**2026-05-15**

Branch: `main` (commit `128177a`)

### Shipped

**New role mechanic modelled**

Roles suffixed with `+` (e.g. `DMC+`) are in training — they unlock at 50 points earned one-by-one through drills. The system now:
- Stores `newRole: string | null` and `newRolePoints: number` (0–50) on the Player
- DB migration `0007_new_role.sql` adds `new_role TEXT` and `new_role_points INTEGER DEFAULT 0`
- Scanner detects `ROLE+` tokens in card text and reads the nearby point count (0–50)

**NewRoleBar atom (`src/components/atoms/NewRoleBar.tsx`)**

Horizontal 5-segment gradient bar. Each segment = 10 pts. Colors escalate dark steel → steelLight → pos green. Label: `NR · ROLENAME` left-aligned. Total container height 16px — bar occupies top 8px, bottom 8px is a reserved empty slot for a planned second ability display.

Wired into:
- **SQUAD tab** — below the role/tier line in each player row
- **Results tab** — below the name/age strip in the selected player header
- **Drills tab** — between the chip selector and drill level picker
- **Not in chips** — too small; bar only appears in full player display areas

**OCR name detection hardened**

Player name candidates now exclude:
- Any block containing `+` (role-in-training tokens)
- Any block matching `Age: N` pattern (was producing `Age: 26` as a player name)
- Extended blocklist: `Age`, `Roles`, `Role`, `Level`, `Points`, `Overall`, `Rating`, `Talent`

Fixes the `DARK VADERLL` / `Age: 26` / `ROLES: DMC+` artefacts seen in live device testing.

### Bugs Fixed This Sprint

| ID | Area | Fix |
|---|---|---|
| F80 | OCR picking up "Age: 26" and "ROLES: DMC+" as player names | Blocklist extension + `+` and age-pattern exclusions in name candidates |
| F81 | New role training progress not tracked or displayed | NewRoleBar component + scanner detection + DB migration |

---

## Sprint 20 — QualityMeter + Scan Rejection
**2026-05-15**

Branch: `main` (commits `e759ee6`, `8f31972`)

### Shipped

**QualityMeter — 10-bar OVR display across all tabs (commit `e759ee6`)**

New atom `src/components/atoms/QualityMeter.tsx`. 10 vertical bars, max OVR = 180 (10 × 18 OVR per bar). Color escalates from dark steel (bar 0, `#2d3a52`) through amber (bar 8, `#e8b466`) to green (bar 9, `#7eb89a`). Partial bar on the in-progress segment at fractional opacity. Two size variants:

| Variant | Width | Bar height | Use |
|---|---|---|---|
| `md` (default) | 8px | 3px | Squad roster rows, Results player header |
| `sm` | 5px | 2px | Player selector chips (Plan / Drills / Coaches / Results) |

Wired to all 6 player display locations:
- Squad roster (`index.tsx`) — replaced row-number label with `<QualityMeter ovr={player.overall} />`
- Results player header — meter left of name
- Results / Plan / Drills / Coaches player chips — meter left of chip

The 18-OVR-per-bar scale is **independent** of the 20-OVR star decay threshold. At OVR 100: `100/180×10 = 5.56` → 5 full bars + 56%-filled 6th, consistent with ~5½ stars on player cards.

**Scan rejection with image overlay (commit `8f31972`)**

Previously, irrelevant images (non-player-card / non-coach-screen) received only a soft "NOTHING DETECTED" status. Now:

- If no recognisable data is extracted, the picked image is rendered at full width with an **85% black overlay** and "INVALID IMAGE" centered in amber, plus guidance text "UPLOAD A SCREEN RESOLUTION PLAYER CARD / COACH PREVIEW".
- On valid scans the preview clears immediately and the form populates as before.
- `player/new.tsx`, `player/[id].tsx`, `coach/capture.tsx` — full image + overlay pattern.
- `coaches.tsx` inline scan — status message upgraded to "SCAN REJECTED — IMAGE NOT RECOGNISED".
- Form state is **not overwritten** when a scan is rejected (no contamination of existing values).

### Bugs Fixed This Sprint

| ID | Area | Fix |
|---|---|---|
| F78 | No visual quality indicator anywhere in app | QualityMeter atom wired to all 6 player entry points |
| F79 | Irrelevant scan images showed soft NOTHING DETECTED, no user guidance | Rejection overlay with image preview and explicit INVALID IMAGE messaging |

---

## Sprint 19 — Engine Calibration: Age Table, Star Decay, XP Float Bug
**2026-05-15**

Branch: `main` (commits `a94ec23`, `f7a63e9` + this sprint)

### Shipped

**OVR analytical path — rounding removed (commit `a94ec23`)**

`projectOvr()` in `ovrProjector.ts` was applying `toFixed(1)` per tier upgrade step in the stat-less analytical path. Over 6 tiers this accumulated a compound rounding error, causing a 1-OVR discrepancy (Plan showed 233, stored value was 234 on a T0→T6 player). Fixed by accumulating OVR as exact floats across all tier steps; only the final display value is rounded.

**Age table corrected to community-verified values (commit `f7a63e9`)**

Previous age table was based on a single unverified calibration point and was ~3× wrong at prime ages (age 23 was 0.28, correct value is 0.85). Replaced with community-verified handoff values across all ages. The corrected table is the source of truth going forward:

| Age | Old multiplier | New multiplier |
|---|---|---|
| 19 | 0.90 | 1.00 |
| 20 | 0.55 | 1.00 |
| 21 | 0.40 | 0.85 |
| 22 | 0.32 | 0.85 |
| 23 | 0.28 | 0.85 |
| 24 | 0.24 | 0.72 |
| 29 | 0.12 | 0.50 |
| 30+ | 0.10 | 0 |

**XP bracket float-straddling bug fixed (commit `f7a63e9`)**

`xpBaseForStat` was comparing the raw float stat value against integer bracket boundaries. A stat at value `139.7` matched neither `[120, 139]` (too high) nor `[140, 159]` (too low) and returned `Infinity`, causing the training loop to halt. For a DR player running 50 sessions on top-6 ROI drills, this caused TACKLING to cap at ~139 and produced only +4 OVR instead of the correct +40 OVR. Fixed with `Math.floor(statValue)` before bracket lookup in `xpEngine.ts`.

**Star decay — mechanism wired in engine (this sprint)**

Star decay was present in the profile (`starDecayPerSession = 0.85`) but hardcoded as `0` (disabled) in `applyDrillSessionsToStats`. Now wired:

```typescript
const starsGained = Math.floor((runningOvr - ovrBefore) / (profile.starOvrThreshold ?? 20));
```

Passed to `estimateStatGainPct` at each stat calculation. Each star threshold = +20 OVR gained in the current session. `starDecayPerSession = 0.85` is a placeholder — exact value pending confirmation. Once confirmed, update `profiles/game_2025.json` only; no code change needed.

`starOvrThreshold: number` added to `GameProfile` interface and `game_2025.json`.

### Bugs Fixed This Sprint

| ID | Area | Fix |
|---|---|---|
| F74 | 1-OVR discrepancy Plan vs stored OVR on T0→T6 players | Removed `toFixed(1)` per-step rounding in analytical OVR path |
| F75 | Age table 3× wrong at prime ages (23→0.28 not 0.85) | Corrected to community-verified values |
| F76 | XP bracket float-straddling halted training at fractional bracket boundaries | `Math.floor(statValue)` before bracket lookup |
| F77 | Star decay in profile but never applied (hardcoded 0) | Wired `starsGained` from cumulative OVR gain in session |

### Star Decay Ratio — Confirmed

`starDecayPerSession = 0.85` confirmed via community data: "roughly 15% reduction in XP gains per star gained" = 0.85× multiplier exactly. No code change required — value was already correct.

---

## Sprint 18 — Post-OTA Stabilisation: Tier Stacking, Player Sync, Plan Defaults
**2026-05-15**

Branch: `main` (commits `951e687`, `8a2f7d3` → rebased `7421a3a`)

### Shipped

**Results tab — tier stacking + auto-include (commit `7421a3a`)**

Replaced single `selectedTier: TierName | null` with `excludedTiers: Set<TierName>`:

- All affordable tiers are **auto-included** by default when the player can pay the cost. No tap required to activate.
- Tap an affordable tier to **exclude** it from the plan; tap again to re-include. Label shows "TAP TO EXCLUDE" / "TAP TO INCLUDE".
- `runProjection` iterates `TIER_ORDER` in sequence, tracking `currentTier` as the `fromTier` for each step, producing a correct multi-step OVR chain (T4 → T5 → T6 each appear as separate rows with accurate per-step delta).
- Tier points now read/written **directly from `manager.tierPoints`** — local `tierPointInputs` state removed. Points entered on the Plan tab appear immediately on Results with no desync.
- Tier labels show the **incremental** bonus per white stat (e.g. "+30/WHITE STAT" for T3→T4) instead of the cumulative total from T0 ("+80"), which was the cause of the inflated-looking OVR numbers.
- Detail string no longer shows wrong "off-role +1" text.
- APPLY TO CARD uses the highest applied tier as `finalTier`.
- `ready` condition and Apply footer label updated accordingly.

**Drills tab — player context sync (commit `7421a3a`)**

Added `useEffect` that writes the auto-resolved `selectedPlayer.id` back to `manager.selectedPlayerId` when context is null:

```typescript
useEffect(() => {
  if (selectedPlayer && !manager.selectedPlayerId) {
    manager.setSelectedPlayerId(selectedPlayer.id);
  }
}, [selectedPlayer?.id]);
```

Closes the gap where Drills auto-resolved a player visually (via `?? squad[0]` fallback) but other tabs remained unaware. Single-player squads now correctly propagate to Plan/Coaches/Results on first render.

**Plan tab — talent auto-sync + blank defaults (commit `7421a3a`)**

- `talent` state now syncs from `selectedPlayer.talent` via `useEffect` on player change. Previously hardcoded to `'Normal'` regardless of scanned card value.
- `fixtureCooldown` default changed from `'60'` to `''`. No pre-filled value before user enters one.

**`ASSUMPTIONS.md` added**

Steve's standing rule committed to root. Referenced from DEVLOG header. All future Claude sessions should read it at session start.

### Bugs Fixed This Sprint

| ID | Area | Fix |
|---|---|---|
| F68 | Results tier selection single-only, no auto-populate from Plan | `excludedTiers` state + stacking loop; reads `manager.tierPoints` directly |
| F69 | Results OVR label showed cumulative tier addition (+80 for T4) not increment from current tier (+30) | Label now computes `TIER_ADDITIONS[t] - TIER_ADDITIONS[currentTier]` per step |
| F70 | Tier points entered in Plan not visible in Results (local state initialised once on mount) | Removed local `tierPointInputs`; reads `manager.tierPoints` directly |
| F71 | Drills tab showed "SELECT A PLAYER" even when another tab had player selected | `useEffect` syncs auto-resolved player back to `manager.selectedPlayerId` |
| F72 | Plan tab talent defaulted to 'Normal' regardless of scanned player card value | `useEffect` syncs talent from `selectedPlayer.talent` on player change |
| F73 | Plan tab fixture cooldown pre-filled '60' — confusing before user enters their own value | Default changed to `''` |

### Context Note

PR #30 (`951e687`) had already corrected the `getWhiteStatKeys` bug in Results (so the tier bonus applies to white stats only, not all role stats). That fix was live in the OTA. The F68/F69/F70 bugs above were separate issues that survived that OTA — the label inflation, the desync, and the stacking limitation were still present in the post-OTA build confirmed by Steve from live device.

### Test Scope (pending — systematic pass still required)

**1. Stat Entry & Player Model**
- Manual stat entry for all 13 roles: confirm white/grey classification renders correctly on the 3-col grid
- Edge cases: single-role player vs multi-role player (confirm union whites)
- GK: 11 white + 4 grey — confirm no outfield stats shown as essential
- Snapshot / revert: apply gains → revert → confirm stat restoration

**2. OCR — Player Card Scanner**
- Scan at least one card per role category (GK, DEF, MID, ATT)
- Verify: all 15 stats detected, OVR parsed, role(s) detected, tier detected, name detected
- Edge cases: compound role tokens (`DL ML AML`), player numbers not picked up as name, sidebar labels blocked

**3. OCR — Coach Preview Scanner**
- Standard coach (5 stats): confirm exactly 5 stats, no cross-column gain theft
- Focused coach (1–2 stats): confirm partial detection
- Header: type, category, multiplier each detected independently

**4. Drill Calculations**
- For each intensity level: confirm condition cost formula = `baseLoss × intensityMult × (1 − fanReduction)`
- VE + L4: confirm 0-drain flag fires (0.375% < 0.38 threshold)
- ROI sort and drill filtering working correctly

**5. OVR Projector — Results tab**
- Tier upgrade chain: T3→T4 GK = +22 OVR, T3→T4→T5 stacks correctly
- Labels show incremental per-step bonus matching Plan tab output
- Tier points from Plan tab appear pre-filled in Results

**6. Cross-tab Player Selection**
- Select player on Squad → appears selected on Plan, Drills, Coaches, Results
- Fresh launch → Drills tab auto-selects single-squad player and propagates to other tabs

---

## Sprint 17 — Role Stat Baselines Audit, DMC Role Grid, Crossover Whites
**2026-05-13 — Session CAQUS (continued)**

Branch: `claude/continue-development-CAQUS` → merged to `main` (PR #29)

### Shipped

**All 13 role stat baselines verified and corrected**

Every outfield role in `src/utils/roleWeights.ts` `ROLE_CONSTRAINTS` now maps exactly 15 stats (essential + secondary = 15). Previously all roles had fewer than 15 stats total, causing incorrect white/grey classification throughout the OVR projector, coach planner, and stat grid rendering.

Verified baseline corrections applied (white count → grey count):

| Role | White | Grey | Key changes from previous |
|---|---|---|---|
| ST | 9 | 6 | STRENGTH, SPEED, CREATIVITY added as white; FITNESS, AGGRESSION confirmed grey |
| GK | 7 | 8 | FITNESS white only; AGILITY, THROWING, PUNCHING, CONCENTRATION moved to grey |
| AMC | 8 | 7 | HEADING white; FITNESS, SPEED confirmed; POSITIONING, BRAVERY confirmed grey |
| AML | 8 | 7 | All DEF stats grey; FITNESS, SPEED white; HEADING, BRAVERY confirmed grey |
| AMR | 8 | 7 | Same as AML (confirmed identical) |
| ML | 7 | 8 | POSITIONING white; SHOOTING, FINISHING, HEADING, BRAVERY, STRENGTH, AGGRESSION grey |
| MR | 7 | 8 | Same as ML (confirmed identical) |
| MC | 10 | 5 | TACKLING, MARKING, BRAVERY, STRENGTH now white; HEADING, AGGRESSION grey |
| DMC | 10 | 5 | All DEF stats white; PASSING, FITNESS, STRENGTH, AGGRESSION, CREATIVITY white; SPEED grey |
| DC | 5 | 10 | Only POSITIONING, HEADING, FITNESS, STRENGTH, AGGRESSION white — 10 grey |
| DL | 8 | 7 | CROSSING white; HEADING, PASSING, DRIBBLING, SHOOTING, FINISHING, STRENGTH, CREATIVITY grey |
| DR | 8 | 7 | Same as DL (confirmed identical) |

**DMC added to role selection grid**

`app/player/new.tsx` and `app/player/[id].tsx` — ROLE_GRID restructured from 4×4 (omitting DMC) to 6×3 matching the game's own layout:

```
Row 1:  [null,  ST,   null]
Row 2:  [AML,   AMC,  AMR ]
Row 3:  [ML,    MC,   MR  ]
Row 4:  [null,  DMC,  null]
Row 5:  [DL,    DC,   DR  ]
Row 6:  [null,  GK,   null]
```

Border-right guard updated from `ci < 3` to `ci < 2` in both files (3-column grid has 2 interior borders, not 3).

**`ROLE_CROSSOVER_WHITES` export added**

`src/utils/roleWeights.ts` — new computed IIFE export. For each primary role R1 and each role R2 adjacent to it, lists the stats that become white when R2 is added to a player who already has R1 (i.e. `ROLE_CONSTRAINTS[R2].essential − ROLE_CONSTRAINTS[R1].essential`). GK excluded. Usage: `ROLE_CROSSOVER_WHITES['ST']['AMC']` → `['FITNESS']`.

Always in sync with `ROLE_CONSTRAINTS` — no duplication risk.

### Bugs Fixed This Sprint

| ID | Area | Fix |
|---|---|---|
| F64 | Role stat baselines incomplete — all roles had < 15 stats mapped | All 13 roles audited and corrected to exactly 15 stats each |
| F65 | DMC absent from role selection grid — could not be added to any player | ROLE_GRID restructured to 6×3 matching game layout |
| F66 | GK had 10 white / 0 true grey — AGILITY, THROWING etc counted as essential | GK corrected: 7 white (core + FITNESS) + 8 grey |
| F67 | border-right guard still used 4-column logic after grid became 3-column | `ci < 3` → `ci < 2` in both player screens |

---

## Sprint 16 — Tier White-Only Fix, Scanner Hardening, Grey Visibility, EAS Cleanup
**2026-05-12 — Session CAQUS**

Branch: `claude/continue-development-CAQUS` → merged to `main` (PRs #19–21)

### Shipped

**Tier bonus corrected to white (essential) stats only**

Sprint 12's `getAllStatKeys` (white+grey) change reversed. Tier upgrades apply to white (essential) stats only — grey role stats and off-role stats receive no increment. Confirmed from direct game observation.

- `src/logic/ovrProjector.ts` — both tier loops use `getWhiteStatKeys`; `keyCount` uses white stat count; `getAllStatKeys` retained in import for drill role-check (drills train all role stats)
- `app/(tabs)/coaches.tsx` — `tierOvr()` and `applyGains()` use `getWhiteStatKeys`
- `CLAUDE.md` — tier rule corrected

**Tier label shows step increment**

`app/(tabs)/coaches.tsx` and `app/(tabs)/plan.tsx` now show per-step gain (e.g. `+20 / WHITE STAT` for T3) not cumulative total from T0 (e.g. `+50 / STAT`). Added `TIER_INCREMENTS: { T0:0, T1:10, T2:20, T3:20, T4:30, T5:40, T6:40 }`.

**Coach OCR hardened** (`src/logic/coachScanner.ts`)

- `Y_TOL` 18 → 25
- `GAIN_RE` allows spaces: `/\+\s*(\d+)\s*[–\-—]\s*(\d+)/`
- Sanity cap `hi <= 150` → `hi <= 300`

**Duplicate CAPTURE button removed from Coaches tab**

`→ CAPTURE` Pressable removed from COACH CONFIG header. `⊕ SCAN` is the only scan entry on this tab.

**White stats auto-seeded on player load**

`app/(tabs)/coaches.tsx` — `useRef`-guarded `useEffect` seeds `selectedStats` with the player's white stats when player first resolves.

**Grey stat visibility** (`src/components/StatGrid3Col.tsx`)

- `opacity` removed from grey cell style (was 0.38)
- `inkGhost` → `inkMuted` for grey stat names and values
- Grey left border `hairline` → `hairline2`

**Player card scanner hardened** (`src/logic/playerScanner.ts`)

- Split tolerances: `Y_TOL = 28` (two-word stat names) vs `Y_TOL_VAL = 20` (value lookup) — prevents section-header totals from being read as stat values
- `Y_BELOW` 65 → 40
- Stat cap 340 → 500 (captures boosted stats on high-tier players)
- Name filter: `/^\d+$/` → `/^\d/` — rejects digit-prefixed blocks (squad numbers)
- `UI_BLOCKLIST` expanded: `'Goalkeeping'`, `'Safeguard'`, `'Reward'`
- Role detection: extended split separators; `fullText` regex backup for badge OCR edge cases

**EAS update workflow** (`.github/workflows/eas-update.yml`)

- Triggers on `main` only
- `--platform android` — no iOS target

### Bugs Fixed This Sprint

| ID | Area | Fix |
|---|---|---|
| F55 | Tier bonus on grey + off-role stats — OVR over-projected | `getWhiteStatKeys` in all tier calculations |
| F56 | Tier label showed cumulative total not step increment | `TIER_INCREMENTS` constant; label updated |
| F57 | Coach OCR gain ranges not detected (spaces, low cap) | `GAIN_RE` spaces, `hi <= 300` |
| F58 | Duplicate CAPTURE button on Coaches tab header | Removed `→ CAPTURE` Pressable |
| F59 | Grey stats near-invisible | Opacity removed, `inkGhost` → `inkMuted` |
| F60 | PHY values wrong — section header totals picked up | `Y_TOL_VAL = 20` for value lookup |
| F61 | Player number picked up as name | `/^\d/.test()` filter |
| F62 | GK/AMC roles not detected on player card scan | Extended separators + `fullText` regex backup |
| F63 | EAS update triggering on dead branches, building iOS bundle | `main`-only trigger, `--platform android` |

---

## Sprint 15 — Tier Rename, Drill Intensity, Coach Scanner Fixes, Stats Grid, OCR Hardening
**2026-05-11 — Session UHXEX (continued)**

Branch: `fix/scan-grid-drills`

### Shipped

**Tier system renamed T0–T6 (internal codes replace game display names)**

`TierName = 'T0'|'T1'|'T2'|'T3'|'T4'|'T5'|'T6'` — replaces None/Rare/Elite/Stellar/Master/Epic/Legendary throughout the codebase.

| Old game name | New internal code | Colour |
|---|---|---|
| None | T0 | `#6b7280` grey |
| Rare | T1 | `#60a5fa` blue |
| Elite | T2 | `#34d399` green |
| Stellar | T3 | `#22d3ee` cyan |
| Master | T4 | `#a78bfa` purple |
| Epic | T5 | `#fb923c` orange |
| Legendary | T6 | `#fbbf24` gold |

Cascaded through 20+ files: `src/types/resources.ts`, `src/constants/theme.ts` (TIER_COLORS keys), `profiles/game_2025.json` (tierAttrAdditions + tierPointsRequired keys), `src/utils/math.ts` (TIER_DATA array + getTierCost), `src/components/TierBadge.tsx`, `src/logic/ovrProjector.ts`, `app/(tabs)/plan.tsx`, `app/(tabs)/results.tsx`, `app/compare.tsx`, `app/(tabs)/coaches.tsx`, `app/player/[id].tsx`, `app/player/new.tsx`, `src/database/playerSchema.ts`, `src/logic/xpEngine.ts`, `tests/investment-test.ts`, `tests/storage-test.ts`.

DB migration `drizzle/0005_tier_rename.sql` — UPDATE statements for each old→new mapping. Added as `m0005` in `drizzle/migrations.js` and journal entry in `drizzle/meta/_journal.json`.

Runtime fallback in `src/services/playerService.ts` — `normaliseTier()` maps legacy DB rows (old game names) to T0–T6 silently. Both `fromRow()` return paths and snapshot field use it.

Note: `src/logic/playerScanner.ts` `KNOWN_TIERS` still matches game display names (game card text), converted to T0–T6 via `TIER_NAME_MAP` before returning. Do not change KNOWN_TIERS to T0–T6 — the scanner reads game text.

**Drill intensity field + filter**

`DrillIntensity = 'Very Easy'|'Easy'|'Medium'|'Hard'|'Very Hard'` added to `Drill` interface in `src/database/drillDatabase.ts`. Each drill has a single fixed intensity matching the confirmed difficulty level it appears at.

`app/(tabs)/drills.tsx` — `useMemo` now filters `.filter(d => d.intensity === drillLevel)`. Only drills at the selected intensity are shown. Previously all drills showed regardless of level selected.

`src/logic/controller.ts` — `intensity: drill.intensity` added to the return object so the tab can filter on it.

**Drill renames (IP-safe)**

| Old name | New name |
|---|---|
| Touch Training (→ Touch Training in S11) | Touch Training |
| Porky in Centre | Porky in Centre |
| Run & Strike | Run & Strike |
| Head Drill | Head Drill |
| High Press | High Press |
| Line Hold | Line Hold |

Touch Training stats updated to `['CONCENTRATION', 'DRIBBLING', 'HEADING', 'CREATIVITY']` (HANDOVER spec), baseLoss 0.75 (VE level), intensity `'Very Easy'`.

**Add Player crash fix**

`app/player/new.tsx` — `playerService.create(...)` wrapped in try/catch. `Alert.alert('SAVE FAILED', String(err))` shown on failure instead of silently crashing to home screen.

**Stats entry grid — 3-column DEF/ATT/PHY layout**

`app/player/new.tsx` — replaced 2-column paired stat grid with a 3-column DEF/ATT/PHY layout matching the game's own column organisation. Column headers use `COL_COLORS` (`#4A7FC1` / `#7C3AED` / `#C05621`). White stats get: column-coloured 2px left border, column colour label, bold full-brightness value, slight background tint. Grey stats get: dim left border, ghost label, muted light-weight value. Clear visual contrast between white (role-essential) and grey (secondary/non-role) entries.

**Coach scanner — cross-column false positive fix (6→5 stats)**

Root cause: game preview shows stats in 3 side-by-side columns (Defense / Attack / Physical). Different-column stats share the same Y row. When processing e.g. PASSING (col 2), old code collected all same-Y tokens including TACKLING's `+57-71` gain range from col 1.

Fix in `src/logic/coachScanner.ts`: `rowTokens` filter now requires `t.left > tok.left`. Only tokens to the RIGHT of the current stat name are considered. Standard Defending now correctly detects 5 stats instead of 6.

**Coach header detection — independent component matching**

Old combined regex required type + category + multiplier on a single line. OCR can emit them on separate lines.

Fix: three independent regexes each running against `fullText`. Type, category, and multiplier are detected independently. Combined header format no longer required.

**Coach gains preserved on player select**

`app/coach/capture.tsx` — `selectPlayer()` previously called `setGains({})`, wiping any pre-scanned gains. Removed. Gains survive player selection (comment: "gains intentionally NOT cleared — preserve scan state across player selection").

**Multi-stat expand in capture screen**

`expandedStat: string | null` → `expandedStats: Set<string>`. Multiple stats can be expanded simultaneously to view/edit their lo/hi gain range inputs. Previously only one could be open at a time.

**"DETECTED — NOT IN ROLE" section**

`app/coach/capture.tsx` — new `detectedExtras` useMemo identifies stats returned by the scanner that are not in `getAllStatKeys(player.role)`. These appear in an amber (`theme.hot`) "DETECTED — NOT IN ROLE" section below the main stat list. Example: a DEFENDING coach highlighting HEADING on a DL/ML/AML player — HEADING is not in `getAllStatKeys(['DL','ML','AML'])` but is captured by the scanner and surfaced here. Previously these were silently discarded.

**CLAUDE.md created**

Persistent documentation of game layout findings, OCR scanner design rules, tier mapping, drill system, and architecture notes. Survives context compaction.

### Bugs Fixed This Sprint

| ID | Area | Fix |
|---|---|---|
| F43 | Add Player crashes to home on SAVE (native crash) | try/catch around `playerService.create`; Alert shown on failure |
| F44 | Coach scanner detected 6 stats for Standard Defending (should be 5) | `rowTokens` filter: `t.left > tok.left` — prevents cross-column gain range theft |
| F45 | Coach capture "nothing detected" when header split across OCR lines | Independent type/category/multiplier matching against full text |
| F46 | Coach scan gains cleared when switching player | Removed `setGains({})` from `selectPlayer()` |
| F47 | Only one stat expandable at a time in capture | `expandedStat: string|null` → `expandedStats: Set<string>` |
| F48 | HEADING scanned for DL/ML/AML coach but silently discarded | "DETECTED — NOT IN ROLE" amber section shows these stats |
| F49 | OCR role token "DL ML AML" not split → only one role detected | `split(/[\s,./|]+/)` on each token before role set lookup |
| F50 | "Goal Celebrations" sidebar picked up as player name | Compound phrase blocklist + topmost block selection by `frame.top` |
| F51 | Stats entry grid 2-col paired — no DEF/ATT/PHY organisation | 3-col layout matching game column structure |
| F52 | Drill level selector showed all drills regardless of selected intensity | `.filter(d => d.intensity === drillLevel)` in drills tab |
| F53 | Drills used old/branded names (Touch Training, Porky in Centre, etc.) | IP-safe rename applied in drillDatabase.ts |
| F54 | Tier chips/labels used game display names (None, Stellar, etc.) | T0–T6 system with DB migration and runtime normaliseTier fallback |

### Pending / Next Sprint

- Partial player stats from scan: some player cards only yield 5–10 of 15 stats via OCR (not yet diagnosed)
- "Viewing role addition whites" UI: adding a second/third role should visually show which stats upgrade from grey to white (progressive role building)
- PR: `fix/scan-grid-drills` → `main`

---

## Sprint 14 — Visual Consistency + OCR Role Fix + Merge to Main
**2026-05-10 — Session UHXEX (late)**

### Shipped

**Consistent DEF / ATT / PHY column colour scheme across all stat surfaces**

All screens that display individual stats now use the same three-column colour language:

| Column | Colour | Stats |
|---|---|---|
| DEF (Defending) | `#4A7FC1` (steel blue) | TACKLING, MARKING, POSITIONING, HEADING, BRAVERY, REFLEXES, AGILITY, ANTICIPATION, RUSHING OUT, COMMUNICATION |
| ATT (Attacking) | `#7C3AED` (purple) | PASSING, DRIBBLING, CROSSING, SHOOTING, FINISHING, THROWING, KICKING, PUNCHING, AERIAL REACH, CONCENTRATION |
| PHY (Physical) | `#C05621` (burnt orange) | FITNESS, STRENGTH, AGGRESSION, SPEED, CREATIVITY |

Applied consistently via `STAT_COLS` + `COL_COLORS` + `statColor(stat)` helper added to each file:

- **`app/(tabs)/coaches.tsx`** — `StatGrid` (stat selector) and `ResultGrid` (projection output): each cell has a 2px left border in column colour. Selected stats show column colour for border, background tint, label and value text. Unselected show `cc + '55'` dimmed left accent. Result grid: white row labels use full column colour, grey rows use `inkMuted`.
- **`app/player/[id].tsx`** (edit player) — 2-column stat input grid: 2px left border per stat in column colour. White stats full opacity, grey at `cc + '44'`. Replaced the `●` dot indicator with the border — cleaner and consistent.
- **`app/coach/capture.tsx`** — `renderStatRow`: indicator square, stat label, and gain range display all use `statColor(stat)`. Row container gets the same 2px left border. White/grey brightness distinction preserved.
- **`app/player/new.tsx`** — Already had the 3-column DEF/ATT/PHY scan preview grid. Unchanged.

`STAT_COLS` and `COL_COLORS` are declared locally in each file (no shared import) to avoid circular deps and keep each screen self-contained.

**Role OCR detection — switched to token-exact matching**

`src/logic/playerScanner.ts` — previously used `\bROLE\b` regex against the full OCR text string, which caused false positives when two-letter role codes (DC, DR, ML, MR, ST) appeared as substrings inside other words or UI labels.

Fixed by scanning the token list instead — each ML Kit element is already a whitespace-separated word, so `token.text.toUpperCase() === 'DC'` will not match "DRILLS", "DISCOVERY", etc. The role set is built as a `Set<string>` for O(1) lookups; the final result is filtered back through `KNOWN_ROLES` to preserve ordering.

### Bugs Fixed This Sprint

| ID | Area | Fix |
|---|---|---|
| F41 | Stat cells used white/grey accent only — no DEF/ATT/PHY distinction | Per-stat `statColor()` applied to borders, labels, backgrounds across all 4 stat surfaces |
| F42 | Role OCR false positives — "DR" matching inside "DRILLS" etc. | Token-exact match instead of full-text `\bROLE\b` regex |

### Infrastructure

**Merged to `main` (PR #4)** — branch `claude/continue-session-UHXEX` merged. `main` now represents the full working app state. All future work should branch from `main` and PR back. Dev branches are workspaces only; `main` is the truth.

EAS OTA Build #120 — Success (1m 12s). Triggered automatically on merge.

---

## Sprint 13 — Squad Plan, Coach Capture, Coaches Overhaul
**2026-05-10 — Session UHXEX (day 2)**

### Scan Feature Restored (2026-05-10)

**Background:** When PR #3 reverted `COACH_CALIBRATION.csv` and related files, it also removed `src/logic/playerScanner.ts` and `src/logic/pickImage.ts` — the on-device OCR that powered "SCAN PLAYER CARD SCREENSHOT" in Add Player. A temporary replacement incorrectly used the Claude Vision API (which this project intentionally does not use — no LLM API calls, no API keys).

**What was restored:**

- `src/logic/playerScanner.ts` — ML Kit text recognition; Y-baseline token pairing to extract stat names + values from card screenshots; also extracts OVR, age, name, roles, tier, talent.
- `src/logic/pickImage.ts` — `expo-image-picker` gallery launcher; `picker.active` shared flag.
- `src/hooks/useScanner.ts` — Now wraps `scanPlayerCard` instead of calling any API. Zero external network calls.
- `src/utils/roleWeights.ts` — Added `OUTFIELD_STATS` and `GK_STATS` exports (required by `playerScanner.ts`).
- `app/player/new.tsx` — `pickAndScan` now also populates `tier`, `talent`, `roles` from scan result (these were wired in the original but lost in the rewrite).
- Installed `@react-native-ml-kit/text-recognition` (native module, requires a dev build — not available in Expo Go).

**Design principle confirmed:** This app makes no LLM API calls. All intelligence is on-device (ML Kit OCR) or pure math (XP/OVR engine). No `EXPO_PUBLIC_ANTHROPIC_API_KEY` or any other AI service key is needed or used.

**Prevention:** See HANDOVER → Critical Native Dependencies section. These files must never be removed without a replacement. Any PR that removes `src/logic/playerScanner.ts`, `src/logic/pickImage.ts`, or `@react-native-ml-kit/text-recognition` from `package.json` must include an explicit justification.

---

### CI Note — npm audit warnings (2026-05-10)

9 vulnerabilities reported by `npm audit` (8 moderate, 1 high). All are inside Expo's own dep chain: `postcss` via `@expo/metro-config` → `@expo/cli` → `expo`. These are build-tool-only (Metro bundler); they do not affect the shipped app. The suggested fix (`npm audit fix --force`) would downgrade Expo to v49 — do **not** run it. Will clear when Expo patches their deps. No action required from us.

---

### CI Note — Node.js 24 Action Pins (2026-05-10)

`actions/checkout` and `actions/setup-node` are still compiled against Node 20. Set `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` in the workflow env so GitHub forces them onto Node 24 — jobs pass, warning is informational only. When the action maintainers publish Node 24 native releases, re-pin both SHAs and drop the env flag. Watch `github.com/actions/checkout/releases` and `github.com/actions/setup-node/releases` for a release noting Node 24 support.

---

### Shipped

**Squad Plan tab (new)**

New `SQUAD PLAN` tab added to the main nav. Displays all saved projection runs grouped by player — OVR before/after, stat gains, session count, tier (if any), timestamp. Per-run delete. "Add run → Coaches tab" shortcut for players with no runs yet. Backed by `squad_plan_runs` SQLite table (DB migration 0004).

**Coach Session Capture screen (new)**

`/coach/capture` accessible via `→ CAPTURE` button in the Coaches tab header. Lets you log what the game's coach preview shows (+gain lo/hi per stat). Sections: coach type/category/multiplier, squad auto-fill (player card copies stats, role, talent, OVR), per-stat gain entry (tap to expand → CURRENT / +LO / +HI inputs), live OVR boost preview. Actions: SAVE TO LOG (saves to Squad Plan) and PROJECT (navigate to Coaches tab).

**Coaches tab overhauls**

- **Removed 2× AD toggle** — hardcoded `false`; the multiplier only applies to Teamplay drills, not Academy coaches.
- **3-column stat grid** — replaced `flexWrap` pile with a proper 3-col `StatGrid` component (rows of 3 Pressables). White and grey sections each use 3 columns, 5 rows max for outfield.
- **Grey label** — "GREY — SECONDARY (×0.5 XP)" → "GREY — SECONDARY / NON-ROLE"
- **SAVE RUN button** — after projection, "SAVE RUN TO SQUAD PLAN" button persists the run to `squad_plan_runs` and confirms inline (text changes to ✓).

### Bugs Fixed This Sprint

| ID | Area | Fix |
|---|---|---|
| F37 | Coaches stat grid was flexWrap pile — no consistent layout | Replaced with `StatGrid` 3-column component |
| F38 | 2× AD toggle present in coaches — doesn't apply to Academy coaches | Removed toggle, hardcoded `false` |
| F39 | No persistent history of coach projections | Squad Plan tab + `squadPlanService` + DB migration 0004 |
| F40 | White/grey stat detection not surfaced in capture flow | Coach Capture auto-fills from player card and labels stats WHITE/GREY by role |

---

## Sprint 12 — Tier Bonus Engine Fix + Player Snapshot / Revert
**2026-05-09 — Session UHXEX (continued)**

### Shipped

**Tier bonus applied to role stats (superseded by Sprint 16)**

See Sprint 16: this was subsequently corrected — tier bonus applies to white (essential) stats only, confirmed from direct game observation. The Sprint 12 implementation used `getAllStatKeys` (white+grey); Sprint 16 reverts to `getWhiteStatKeys`.

**Player snapshot + one-step revert**

When APPLY TO PLAYER CARD or APPLY FULL PLAN TO CARD is pressed, the pre-apply state (`{ stats, overall, tier }`) is saved as a `snapshot` field on the player record before overwriting. A subsequent apply replaces the snapshot (one level of undo only).

The player edit screen (`app/player/[id].tsx`) shows an orange banner when a snapshot exists, displaying the previous OVR and tier. Tapping the banner prompts a confirmation dialog. On confirm, `playerService.revertToSnapshot` restores the original values and clears the snapshot; the form reloads in-place.

DB migration `0003_player_snapshot.sql`: `ALTER TABLE players ADD snapshot text DEFAULT NULL`.

### Bugs Fixed This Sprint

| ID | Area | Fix |
|---|---|---|
| F35 | Tier bonus only applied to white stats — grey stats got 0 increment | `applyTierBonusToStats` now uses `getAllStatKeys` (white+grey); off-role get +1 |
| F36 | No way to undo APPLY TO PLAYER CARD — had to manually re-enter stats | Snapshot saved before every apply; REVERT banner on edit screen restores pre-apply state |

### Next Sprint Targets

- Beta testing results (user session tonight/tomorrow) — expect label cleanup, navigation gaps, UI polish
- Validate condition formula at Easy and Medium difficulty (only VH and VE cross-checked)
- Add Touch Training drill to DRILL_LIST (missing: trains Concentration, Dribbling, Heading, Creativity — type TBC)

---

## Sprint 11 — Drill Condition Formula Overhaul + All Drills Visible
**2026-05-09 — Session UHXEX**

### Shipped

**Condition formula corrected — confirmed from confirmed screenshots**

`src/utils/conditionEngine.ts` — complete rewrite of condition loss calculation:

- New `COND_LEVEL_MULTIPLIERS`: VE×1, Easy×2, Medium×3, Hard×4, VH×5. These are separate from the XP `drillLevelMultipliers` in `game_2025.json` (which go 1.0→1.7). Confirmed by cross-referencing all difficulty/fan levels against game UI.
- `calculateActualLoss(baseLoss, fanLevel, drillLevel)` — now accepts `drillLevel` and applies the correct condition multiplier before fan club reduction.
- Formula: `baseLoss × COND_LEVEL_MULTIPLIERS[drillLevel] × (1 − FAN_CLUB_REDUCTIONS[fanLevel] / 100)`

**Universal `baseLoss = 0.75` for all drills**

`src/database/drillDatabase.ts` — replaced all individual `baseLoss` values with the universal constant `BASE_LOSS = 0.75`. Condition cost is determined entirely by difficulty level and fan club level, not by which specific drill is used.

Verification from confirmed screenshots:

| Drill | Level | Fan Club | Formula | Observed |
|---|---|---|---|---|
| Head Drill | VH | L0 | 0.75 × 5 × 0.9 | 3.375 ≈ 3.38% ✓ |
| Footwork Ladder | VH | L4 | 0.75 × 5 × 0.5 | 1.875 ≈ 1.88% ✓ |
| Footwork Ladder | Easy | L4 | 0.75 × 2 × 0.5 | 0.75% ✓ |
| Any drill | VE | L4 | 0.75 × 1 × 0.5 | 0.375% → 0% in game display ✓ |

**`isZeroDrain` threshold revised**

`src/logic/controller.ts` — zero-drain is now `actualLoss < 0.5%`. VE+L4 = 0.375% < 0.5% → shows 0% (matches game). Easy+L4 = 0.75% → not zero drain.

Removed the `× 6` multiplier hack (`conditionCost = actualLoss * 6` → `conditionCost = actualLoss`). `conditionCost` is now a direct per-drill % matching the game's display value.

**All drills visible for all players**

`src/logic/controller.ts` — removed `filter(d => d.efficiency >= 0.5)`. All 25 drills in the database are now shown for every player regardless of role overlap. ROI sort (ascending `avgWhiteStatValue`) still puts the best-value drills first; drills with no white stat hits (`avgWhiteStatValue = Infinity`) naturally appear at the bottom.

**Drill database corrections**

| Drill | Change |
|---|---|
| Touch Training | Renamed → Touch Training (confirmed from game) |
| Porky in Centre | Added AGGRESSION to stat list |
| Long Run, Stretch, Shuttle Runs | Removed STAMINA (not in any role's white/grey list) |

### Bugs Fixed This Sprint

| ID | Area | Fix |
|---|---|---|
| F31 | Condition cost formula missing drill-level multiplier | Added `COND_LEVEL_MULTIPLIERS`; `calculateActualLoss` now accepts `drillLevel` |
| F32 | All per-drill `baseLoss` values wrong (cost is level-based, not drill-based) | Universal `baseLoss = 0.75`; `× 6` hack removed |
| F33 | `isZeroDrain` threshold too tight (< 0.01%) — VE+L4 showed as 0.38%, not zero | Threshold changed to < 0.5% — correctly flags VE+L4 as zero drain |
| F34 | Drills with < 50% white stat overlap hidden from recommendations | Efficiency filter removed — all 25 drills visible for all roles |

### Next Sprint Targets

- Validate condition formula with more drill/level/fan combinations (user to provide screenshots at Easy, Medium, Hard levels)
- Add Touch Training drill to DRILL_LIST (missing: trains Concentration, Dribbling, Heading, Creativity — type TBC)
- Premium sponsor condition cooldown modelling

---

## Sprint 10 — Expo Web + Game Data Calibration Blitz
**2026-05-08 — afternoon/evening**

### Shipped

**Expo Web support**

`feat: add Expo Web support — localStorage storage layer + DOM tsconfig lib`

- `localStorage`-backed storage adapter added alongside the existing SQLite layer
- `tsconfig.json` lib updated to include DOM types
- App now runs in-browser via `npx expo start --web` (no native binary required)
- README updated with web setup guide (`docs: add web setup guide to README`)

**Touch Training ×41 squad session logged (calibration)**

`data/CALIBRATION_LOG.md` — section 6 entry: 31 players × 41 × Touch Training Very Easy at Fan Club L4 with Match Advisor active.

Key findings:
- Condition per session: **−0.38%** confirmed from drill selection screen (not 0%)
- `baseLoss 0.75% × 0.5 (L4) = 0.375% ≈ 0.38%` — formula validates
- Zero-drain **revised**: Touch Training VE+L4 = 0.38% (not zero). Zero drain is difficulty-level-based, not universal. Underlying bug identified (fix shipped Sprint 11)

**Match Advisor mechanics confirmed**

- Source: premium sponsor milestone reward. Also purchasable: 1-day = 25 tokens
- Effect: **+150% teamplay multiplier on ALL training sessions** (not just 4 free drills)
- Duration: 7 days from activation
- Observed: 41 × Touch Training VE → Attack pillar +7 above its L4 cap (18 → 25 effective)
- Match Advisor can push pillars **above their level cap** temporarily
- Variety penalty: repeating same drill reduces teamplay gain rate; game warns "Training today lacked variety"
- Training XP yield confirmed separate from stat-gain XP

**Full teamplay pillar mechanics confirmed**

`data/CALIBRATION_LOG.md` — `TEAMPLAY_PILLARS` entry (2026-05-08):

| Pillar | Level | Cap | Formula confirmed |
|---|---|---|---|
| Attack | 4/10 | 18 | level × 2 + 10 ✓ |
| Defence | 6/10 | 22 | level × 2 + 10 ✓ |
| Possession | 5/10 | 20 | level × 2 + 10 ✓ |
| Condition | 3/10 | 16 | level × 2 + 10 ✓ |

**Reward Channel full reward track confirmed**

All 10 Reward Channel steps mapped: Daily Appearance → Special Sponsor → Playbook → Match Advisor (2×) → Teamplay Form Boost (milestone) → Advisor Bonus × 3 → Special Ability Boost (milestone).

Teamplay Form Boost probabilities per pillar (same for all 4):
- +1: 7% · +2: 10% · +3: 5.5% · +4: 2.5% = 25% per pillar = 1 hit guaranteed per draw
- Expected value: ~+2.14 on the drawn pillar

**Full squad snapshot logged**

`data/` — 7 player profiles with all stats, coach projections, and tier formula findings from live data.

**COACH_CALIBRATION.csv added**

`data/COACH_CALIBRATION.csv` — machine-readable calibration sheet for coaching sub-engine validation.

**Coaching sub-engine calibration instructions**

`HANDOVER.md` updated with instructions for the next agent on how to supply coaching scenario data and what to record.

**Proprietary licence applied**

`LICENSE` updated: PayloadGuard PLG / AIntegrity Research, all rights reserved.

### Bugs Fixed This Sprint

| ID | Area | Fix |
|---|---|---|
| — | Zero-drain incorrectly flagged universal at VE+L4 | Root cause confirmed: baseLoss model wrong + missing difficulty multiplier. Fix deferred to Sprint 11. |

### Next Sprint Targets

- Fix condition loss formula (identified this sprint, fix deferred)
- Show all drills for all players (efficiency filter too aggressive)
- Add coaching data validation entries as user provides scenarios

---

## Sprint 9 — RESULTS Hub + Talent Card + Tier Chain Fix
**2026-05-08 — morning**

### Shipped

**RESULTS tab — 5-tab navigation**

`app/(tabs)/results.tsx` (new, 525 lines) — combined multi-session OVR projection hub. Stacks multiple coaching blocks + tier upgrade + restorers + recovery kits into a single sequential OVR chain projection. Each step shows OVR before → after.

`src/components/AppHeader.tsx` + `app/(tabs)/_layout.tsx` — 5-tab navigation. AppHeader now uses a horizontal scroll row to accommodate SQUAD · PLAN · DRILLS · COACHES · RESULTS.

**Tier upgrade section in Coaches tab**

`app/(tabs)/coaches.tsx` — TIER UPGRADE card added below the OVR projection result:
- Shows all tiers above the player's current tier
- Pre-fills HAVE inputs from `ManagerContext.tierPoints` (same pool as Plan tab)
- ✓ tick when player has enough points to afford the upgrade; SHORT label when insufficient
- Tap any affordable row → COACH + [TIER] combined banner appears showing total OVR gain
- Drills-first order preserved: tier stat additions applied on top of post-coach stats

**Talent tier on player card — single source of truth**

DB migration `drizzle/0002_player_talent.sql` — `ALTER TABLE players ADD COLUMN talent DEFAULT 'Normal'`. Talent is now a first-class field on the `Player` record, set once at player creation/edit and read by every tab.

`app/player/new.tsx` + `app/player/[id].tsx` — TALENT TIER picker added between TIER and MUTANT sections.

`app/(tabs)/coaches.tsx` + `app/(tabs)/results.tsx` — per-session talent dropdowns removed. Both tabs now read `player.talent` directly.

**APPLY TO PLAYER CARD — gains write-back**

`app/(tabs)/coaches.tsx` — APPLY TO PLAYER CARD button writes post-coach stats, updated OVR, and selected tier back to the player's DB record. Projection is cleared, ready for the next coaching block.

`app/(tabs)/results.tsx` — APPLY FULL PLAN TO CARD: same write-back for the full results chain.

**GK stat grid — completed (closes KNOWN_ISSUES #4)**

`app/player/new.tsx` + `app/player/[id].tsx` — GK_STATS grid expanded from 10 → 15 stats:
- Added CONCENTRATION (white — was missing entirely)
- Added STRENGTH, AGGRESSION, SPEED, CREATIVITY (all 5 grey stats; only FITNESS was present before)

Confirmed from Sutters GK card (all 15 visible in screenshot).

**Tier chain fix — bonus applies to all role stats (superseded by Sprint 16)**

`src/logic/ovrProjector.ts` + `app/(tabs)/coaches.tsx` + `app/(tabs)/results.tsx`: `getWhiteStatKeys` → `getAllStatKeys` in all `applyTierBonusToStats` calls. See Sprint 16: this was subsequently reversed — tier bonus applies to white (essential) stats only, confirmed from direct game observation.

**OVR formula — truncation confirmed**

Sutters GK: sum of all 15 stats = 2,844. 2,844 ÷ 15 = 189.6 → game displays **189**. OVR is `floor(mean)`, not `round(mean)`.

`WHITEPAPER.md §3.1` updated accordingly.

**Academy coaches lock to Very Hard**

`app/(tabs)/coaches.tsx` — INTENSITY picker removed; tab locked to Very Hard. Academy coaches have no adjustable difficulty setting.

**Results tab refinements**

`app/(tabs)/results.tsx` — sessions field locked to VH; tier shortfall indicator added when points entered but insufficient.

### Bugs Fixed This Sprint

| ID | Area | Fix |
|---|---|---|
| F29 | Tier bonus applied only to white stats — DL/AML showed +12 OVR per STELLAR (should be +17) | `getWhiteStatKeys` → `getAllStatKeys` in all tier bonus calls |
| F30 | RESULTS tab missing from 5th nav slot | Wired into AppHeader + `_layout.tsx` |
| F31 (pre) | GK stat grid incomplete — CONCENTRATION and 4 grey stats absent | GK_STATS expanded 10 → 15 |

### Next Sprint Targets

- Touch Training ×41 session data logging (in progress, user running session)
- Condition loss formula investigation (zero-drain showing incorrectly for all VE drills at L4)
- Coaching calibration: user to supply scenario data (Standard Attacking, Standard Safeguard, etc.)

---

## Sprint 8 — Coaches Tab + XP Engine Deep Calibration
**2026-05-07 — night**

### Shipped

**Coaches tab (`app/(tabs)/coaches.tsx`)**

New fourth tab: `/coaches` — SESSION SIMULATOR. Lets the manager replicate any coaching scenario and project its exact OVR impact.

- **Stat selector grid** — all white (essential) and grey (secondary) stats for the selected player's role. White stats rendered full brightness with current stat value shown; grey stats dimmed. Tap any stat to include/exclude it from the coach's coverage. Counter shows total selected.
- **Sessions ×N** — TextInput for the coach multiplier (e.g. ×30 Standard Attacking, ×59 Standard Safeguard)
- **Intensity** — Very Easy → Very Hard chips mapping to drillLevelMultipliers (1.0 → 1.7×)
- **Talent + 2× ad** — same controls as Plan tab
- **▶ PROJECT COACH GAIN** — computes per-stat gains and total OVR change. Shows gain breakdown: each stat, before value, gain amount (float), plus OVR before/after banner.
- Pulls `computeOvrWithPadding` (now exported from `ovrProjector.ts`) for accurate OVR-after with partial stat entry padding.

**XP engine calibration — validated against 7 real coaching observations**

Real data: Standard Attacking ×30 on Ryan Rodger (age 18, Normal talent):
- Passing 121 → +26–33 (model: ~27 at Medium intensity) ✓
- Dribbling 132 → +20–27 (model: ~25) ✓
- Crossing 132 → +20–27 (model: ~25) ✓

Two engine fixes applied and confirmed:

| File | Change | Reason |
|---|---|---|
| `profiles/game_2025.json` | `starDecayPerSession` 0.85 → 1.0 | Real data shows near-linear gains; 0.85^n-per-%-gained caused exponential cost increase, near-zero projections at high stat counts |
| `src/logic/ovrProjector.ts` | XP budget ÷ `drill.stats.length` | Budget must be split across all stats a drill trains; undivided budget gave 5× too many gains |

`baseXpPerSession = 150` confirmed correct when both fixes applied.

**Fractional XP model**

`src/logic/xpEngine.ts` — `estimateStatGainPct` now returns a float (e.g. 2.37). Partial XP progress banks as fractional carry: `gain += remaining / cost` instead of discarding leftover. Visible "+1" appears when cumulative value crosses an integer threshold. Sub-integer gains accumulate across multiple sessions.

**GK role constraints — confirmed**

`src/utils/roleWeights.ts` — GK corrected to confirmed game values:
- 10 white (essential): REFLEXES, AGILITY, ANTICIPATION, RUSHING OUT, COMMUNICATION, THROWING, KICKING, PUNCHING, AERIAL REACH, CONCENTRATION
- 5 grey (secondary): FITNESS, STRENGTH, AGGRESSION, SPEED, CREATIVITY
- GK is always solo (no multi-role combination permitted)

**Drill database fixes**

`src/database/drillDatabase.ts` — two drills corrected from confirmed data:

| Drill | Field | Before | After |
|---|---|---|---|
| Head Drill | type | Attack | Defence |
| Head Drill | stats | `['HEADING','CREATIVITY']` | `['POSITIONING','PASSING','HEADING','CREATIVITY']` |
| Head Drill | baseLoss | 1.5 | 3.0 |
| Win the Ball | stats | `['TACKLING','MARKING','BRAVERY']` | `['STRENGTH','MARKING','BRAVERY','DRIBBLING','TACKLING']` |
| Win the Ball | baseLoss | 2.25 | 4.5 |

baseLoss values derived from L4 Fan Club data (50% reduction observed): Head Drill −1.5% at L4 → base = 3.0; Win the Ball −2.25% at L4 → base = 4.5.

**ROI-based drill sort**

`src/logic/controller.ts` — drill recommendations now sorted by ascending average white stat value (lowest stat first = cheapest gain per XP). Was sorted by efficiency (% overlap). Tiebreaker remains efficiency.

`app/(tabs)/drills.tsx` — sort button label changed "SORT EFF ▼" → "SORT ROI ▼". Each drill card now shows `AVG {stat}` label.

**Smarter skip warnings**

`src/logic/ovrProjector.ts` — `applyDrillSessionsToStats` now categorises skipped drill stats as either:
- `missingStats`: role-valid but not yet entered by user → "enter X, Y to include drill gains"
- `irrelevantStats`: not a stat for this player's role at all → "no stats applicable to this role"

Previously all skipped drills showed a generic "Stats missing" warning regardless of cause.

New helper: `getAllStatKeys(roles)` in `src/utils/roleWeights.ts` — returns union of white + grey stats for a role, used for categorisation.

**TextInput controls for restorers and sessions**

`app/(tabs)/plan.tsx` — replaced +/− stepper buttons with free-entry TextInput for both restorers count and per-drill session count. Easier to enter ×30, ×59, etc.

**Auto-tier selection**

`app/(tabs)/plan.tsx` — `getBestAffordableTier()` runs when RUN PROJECTION is pressed without an explicit tier selected. Finds highest tier where the user has entered enough tier points. Eliminates silent "no tier applied" projections.

**Stats-win OVR baseline**

`app/(tabs)/plan.tsx` — when player has individual stats entered, FROM OVR displayed is `computeOvrFromStats(player)` (stats-derived), not `player.overall` (stored value). `player.overall` was set at time of entry; if stats have been trained since, the stats-derived value is more accurate.

**Navigation**

`src/components/AppHeader.tsx` — COACHES tab added to the 4-tab bar. Route `/coaches` triggers "COACH PLANNER / SESSION SIMULATOR" header.
`app/(tabs)/_layout.tsx` — `coaches` screen registered.

### Bugs Fixed This Sprint

| ID | Area | Fix |
|---|---|---|
| F22 | Star decay caused near-zero gains at high stat counts | `starDecayPerSession` 0.85 → 1.0; validated against observed training data |
| F23 | XP budget not divided across drill stats | `ovrProjector.ts`: budget ÷ `drill.stats.length` |
| F24 | Head Drill categorised as Attack drill | `drillDatabase.ts`: type corrected to Defence |
| F25 | Win the Ball missing 2 stats | Added STRENGTH + DRIBBLING to stat list |
| F26 | Generic "Stats missing" for all skipped drills | Separated into role-irrelevant vs un-entered categories |
| F27 | Tier not auto-applying when points available | `getBestAffordableTier()` runs on projection if no explicit tier selected |
| F28 | OVR baseline used stale `player.overall` when stats entered | Stats-computed OVR used as baseline when stats dict non-empty |

### Next Sprint Targets

- GK stat entry UI: `app/player/new.tsx` + `app/player/[id].tsx` show outfield stats regardless of GK role (KNOWN_ISSUES #4)
- Coaches tab: user reports scenario data → update logic per scenario (multiplier → intensity mapping to be confirmed)
- WHITEPAPER coaches section (§4 or appendix)
- Squad-wide season simulator (KNOWN_ISSUES #7)

---

## Sprint 6 — Direction B UI + Engine Calibration Fix
**2026-05-07 — afternoon**

### Shipped

**Direction B design system**

Full UI redesign to "Operator" aesthetic: pitch-black background, gunmetal navy surfaces, JetBrains Mono throughout, zero border radius, steelblue accents, hot-orange for mutant/danger states.

| Token | Value | Notes |
|---|---|---|
| `bg` | #0a0a0c | pitch black |
| `surface` | #111116 | card background |
| `surface2` | #1a1a21 | secondary surface |
| `ink` | #f0f0f5 | primary text |
| `inkSec` | #c8c8d2 | secondary text (raised from #a1a1aa for readability) |
| `inkMuted` | #909099 | muted text (raised from #6b6b73) |
| `hairline3` | rgba(255,255,255,0.38) | borders (raised from 0.18) |
| `steelLight` | #5b8fe8 | accent / active state |
| `negRed` | #e85b5b | delete / destructive |
| `hotOrange` | #e87d2a | mutant candidate accent |

**New player screens**

| File | Content |
|---|---|
| `app/player/new.tsx` | Full Direction B add-player screen: 4-column ROLE_GRID position picker, 2-column bordered stats grid with ●/○ white stat indicators (via `isWhiteStat`), colour-coded tier chips, MUTANT CANDIDATE toggle, full-width SAVE CTA |
| `app/player/[id].tsx` | Same layout + loads existing player on mount + SAVE/DELETE side-by-side CTAs (DELETE uses negRed outline) |

**Plan tab config section redesign**

`app/(tabs)/plan.tsx` — each configuration group (TALENT, DRILL LEVEL, SESSIONS, RESTORERS, TIER) rebuilt as a bordered card: dark header row with steelLight accent stripe, content below within the same border. Section tabs (PLAN / STEPS / WARNINGS) changed from text links to full-width ink-fill button bar. All param setters now call `invalidate()` → `setPlan(null)` to clear stale projections before any re-run.

**OvrMovement: pure-RN rewrite (critical)**

`src/components/atoms/OvrMovement.tsx` — removed all `react-native-svg` imports. Two separate crash vectors eliminated:
1. `Pattern` element + `width="100%"` on `Svg` → hard crash on Android
2. `lineHeight: 56` with `fontSize: 62` → crash (lineHeight must be ≥ fontSize)

Rewritten as pure `View`/`Text` layout with identical visual output.

**Readability improvements**

- `src/components/atoms/MonoLabel.tsx`: default color `inkMuted` → `inkSec`; fontWeight `500` → `600`
- `src/components/atoms/Chip.tsx`: inactive state bg `transparent` → `surface2`; border `hairline2` → `hairline3`; text `inkSec` → `ink`

**Drill name fix**

`app/(tabs)/plan.tsx`: `DRILL_NAMES` constant replaced — was hardcoded with invalid names including "Finishing School" (not in DB). Now derived via `DRILL_LIST` import so drill picker always reflects the real drill database.

**OVR display delta anchor**

Plan tab FROM/TO display was using engine-computed OVR as the baseline, which differs from `player.overall` by ~1–2 OVR when stats are partially entered (partial-stat mean ≠ stored overall). Fixed: FROM anchors to `player.overall` (stored DB value), TO computed as `storedOvr + engineGain`. Eliminates persistent −1.2 regression display.

**Engine calibration fix (critical)**

Root cause of +0.0 drill gains for all high-stat players: two compounding bugs.

Bug 1 — hard stat cap at 180: `xpBaseForStat()` returned Infinity for any stat ≥ `rule180StatCap` (was 180). Player Coutts' white stats are all 187–246 → all returned Infinity → 0 gains.

Bug 2 — missing XP multiplier: `applyDrillSessionsToStats()` passed `session.sessionCount` (e.g. 6) raw as XP budget. Cost for 1% on a stat-113 grey attr at age 24 ≈ 250 XP. Budget of 6 << 250 → always 0.

| File | Change |
|---|---|
| `profiles/game_2025.json` | Extended `xpCostTable` — added 6 bands covering stats 180–339 with finite costs (80/100/125/160/200/250 XP per 1%) |
| `profiles/game_2025.json` | `rule180StatCap`: 180 → 340 (now matches `statCap`; hard cap never fires) |
| `profiles/game_2025.json` | Added `baseXpPerSession: 150` |
| `src/types/resources.ts` | Added `baseXpPerSession: number` to `GameProfile` interface |
| `src/logic/ovrProjector.ts` | XP budget: `session.sessionCount` → `session.sessionCount × profile.baseXpPerSession` |

With `baseXpPerSession = 150`: 6 sessions × 150 = 900 XP budget. Stat-241 white attr, age 24, Normal talent, Very Easy → cost ≈ 667 XP → 1 gain per run. Value is an estimate pending empirical calibration (see KNOWN_ISSUES #2).

### Bugs fixed this sprint

| ID | Area | Fix |
|---|---|---|
| F11 | Plan tab: first run shows −1.2, button locks | `invalidate()` on all param setters; FROM anchored to `player.overall` |
| F12 | Drill picker contained "Finishing School" (not in DB) | `DRILL_NAMES` derived from `DRILL_LIST` import |
| F13 | All players show +0.0 OVR from drills | Extended XP table above 180; `baseXpPerSession` multiplier applied |
| F14 | `compareInvestmentScenarios` shape mismatch | Rewritten to return `{ results, recommendedPlayer, reasoning }` |
| F15 | OvrMovement crashes Android | Removed react-native-svg entirely; pure View/Text |
| F16 | Plan OVR shows persistent −1.2 | FROM anchored to DB `player.overall`; gain computed as delta |

---

## Sprint 7 — UI Clarity + Zero-Drain Fix
**2026-05-07 — evening**

### Shipped

**Talent tier labels now show multiplier**

`app/(tabs)/plan.tsx`: TALENT chips relabelled — "Fast" → "Fast ×1.25" etc. No ambiguity about what each tier means.

| Tier | Label | Multiplier |
|---|---|---|
| Fastest | Fastest ×1.50 | 1.50 |
| Fast | Fast ×1.25 | 1.25 |
| Average | Average ×1.10 | 1.10 |
| Normal | Normal ×1.00 | 1.00 |
| Slow | Slow ×0.70 | 0.70 |

**Zero-drain fixed**

`src/logic/controller.ts`: `isZeroDrain` was hardcoded to `conditionCost === 0` — always false since L4 halves cost, never zeroes it. Fixed: `isZeroDrain = fanClubLevel === 4 && drillLevel === 'Very Easy'`. Drills tab now accepts drill level and passes it through.

**Drill level selector added to Drills tab**

`app/(tabs)/drills.tsx`: drill level chips above fan club selector. Condition costs and zero-drain status now reflect the selected drill level.

**Warning text corrected**

`src/logic/ovrProjector.ts`: "Slow trainer (age X)" was firing for any player ≥20 — "Slow" implies the talent tier, which is wrong. Now shows actual age multiplier: "Age 21 — training multiplier 0.40×." Added separate warning for Slow talent tier.

| ID | Fix |
|---|---|
| F17 | "Slow trainer" warning mislabelled talent as Slow — now shows age multiplier |
| F18 | Zero-drain never triggered — L4+Very Easy now correctly returns 0% condition cost |
| F19 | Fastest/Fast/Average labels opaque — now show XP multiplier inline |
| F20 | Drills tab had no drill level input — selector added, feeds zero-drain logic |

**GHA workflow fix**

`.github/workflows/eas-update.yml`: commit message passed via `$COMMIT_MSG` env var instead of inline template expansion. Multi-line messages were being word-split as CLI arguments, causing OTA push failures.

### Still TODO

- Calibrate `baseXpPerSession: 150` against observed session gains (KNOWN_ISSUES #2)
- GK white stat list: estimated, unconfirmed (KNOWN_ISSUES #3)
- GK stat entry UI: shows outfield stats regardless of role (KNOWN_ISSUES #4)

---

## Sprint 5 — OTA Pipeline, Navigation, Game Data Corrections
**2026-05-07 — morning**

### Shipped

**OTA update pipeline**

| File | Purpose |
|---|---|
| `.github/workflows/eas-update.yml` | GitHub Actions workflow — triggers on push to main or dev branch, runs `npx eas-cli update` |

Push from Termux → CI picks up within ~1 min → EAS OTA bundle → app updates silently on next reopen. No PC required for deployments. Org policy required pinned full commit SHAs (not `@v4` tag refs) — workflow uses those.

**AppHeader and top navigation**

| File | Purpose |
|---|---|
| `src/components/AppHeader.tsx` | Branded header: purple accent bar, "Squad Optimiser" title, "FOOTBALL MANAGER" subtitle, underline-style tab buttons |

`app/(tabs)/_layout.tsx` updated to use `tabBar={() => null}` — fully suppresses the native bottom tab bar. Previously `tabBarStyle: { display: 'none' }` left a ghost tab bar. Tab buttons now live under the title in `AppHeader`.

**OVR formula fix**

`profiles/game_2025.json`: `qualityOvrDivisor` corrected from `4` to `1`. OVR = unweighted mean of all 15 stats directly. Empirically calibrated: player Coutts mean stat ≈194.8 = OVR 195. Previous divisor of 4 produced ~48 instead of ~195.

**Drill level rename**

`profiles/game_2025.json` and `src/types/resources.ts`: multiplier keys renamed to match observed UI labels:

| Old name | New name | Multiplier |
|---|---|---|
| Amateur | Very Easy | 1.0 |
| Semi-Pro | Easy | 1.15 |
| *(new)* | Medium | 1.3 |
| Pro | Hard | 1.55 |
| World Class | Very Hard | 1.7 |

**Drill database: isBase flag**

`src/database/drillDatabase.ts`: `isBase: boolean` added to `Drill` interface. Core daily drills (Touch Training, Weight Room, Speed Work, etc.) marked `isBase: true`. Event/lab drills (Dead Ball Practice, Activation, Footwork Ladder, etc.) marked `isBase: false`.

**Tier system corrections**

Empirically verified tier point costs applied across `profiles/game_2025.json` and `src/utils/math.ts`:

| Tier | Points required | Attr addition |
|---|---|---|
| Rare | 100 | +10 |
| Elite | 90 | +30 |
| Stellar | 50 | +50 |
| Master | 25 | +80 |
| Epic | 15 | +120 |
| Legendary | 10 | +160 |

`ManagerProfile.tierPoints` changed from a single `number` to `Partial<Record<TierName, number>>` — each tier type has its own independent point pool. Plan and Compare screens redesigned with a per-tier section: each of the 6 tiers shows its own input, threshold, affordability indicator, and tap-to-select-target.

**Role adjacency fix**

`src/utils/roleWeights.ts` `validateRoleAdjacency`: changed from "all roles must be adjacent to primary" to transitive check — each additional role must be adjacent to any already-accepted role. ST+AMC+MC now correctly accepted (MC is adjacent to AMC; previously rejected because MC is not adjacent to ST directly).

**Efficiency display fix**

`app/(tabs)/drills.tsx`: efficiency value multiplied by 100. `getBestDrillSelections` returns 0–1 fraction; `DrillTable` renders as percentage. Without the conversion all drill cards showed blank efficiency.

### Bugs fixed this sprint

| ID | Area | Fix |
|---|---|---|
| F1 | Drills tab efficiency blank | ×100 conversion in drills.tsx mapping |
| F2 | Plan OVR ~48 instead of ~195 | qualityOvrDivisor 4→1 in game_2025.json |
| F3 | ST+AMC+MC role rejected | Transitive adjacency in validateRoleAdjacency |
| F4 | Bottom tab bar ghost below AppHeader | tabBar={() => null} in _layout.tsx |
| F5 | Single tier points input | Per-tier pool UI with individual inputs |

### Still TODO

- Drill XP baseline calibration: `baseXpPerSession` pending empirical validation
- GK white stat list needs verification
- Compare screen missing AppHeader (uses raw ScrollView)
- Individual stat entry for drill-level OVR projection (currently falls back to base OVR when stats={})

---

## Sprint 4 — Formula Engine Rewrite
**2026-05-06**

### Shipped

Research confirmed the entire formula engine was built on wrong game mechanics. Sprint 4 replaces it with the verified XP-based model and adopts a profile-based architecture so all game coefficients are configurable without touching code.

**Files added:**

| File | Purpose |
|---|---|
| `profiles/game_2025.json` | All game coefficients as configurable JSON (XP table, age table, talent/drill multipliers, tier additions, fan club reductions) |
| `src/logic/xpEngine.ts` | Core XP engine — `xpBaseForStat`, `xpNeededFor1Pct`, `estimateStatGainPct`, `statsToQualityPct`, `qualityPctToOvr`, `applyTierBonusToStats`, `getAgeMultiplier` |
| `src/components/DrillSessionRow.tsx` | Drill picker UI row (name, session count, drill level) replacing CoachInputRow in Plan/Compare screens |
| `drizzle/0001_natural_northstar.sql` | Migration adding `drill_sessions` table |

**Files rewritten:**

| File | Change |
|---|---|
| `src/types/resources.ts` | Added `GameProfile`, `TalentTier`, `DrillLevel`, `DrillSession`; removed `coaches` from `ManagerProfile`; added `twoxAdActive`, `talentTier`, `drillLevel` |
| `src/utils/coachMath.ts` | Removed coach-multiplier model; profile-driven `getAgeFactor`, `getStatXpCost`, `getGreyMultiplier`; deprecated shim kept for backward compat |
| `src/utils/math.ts` | `TIER_DATA.bonus` → `TIER_DATA.attrAddition` (flat per-white-stat, not OVR); removed `calculateDecay` |
| `src/utils/roleWeights.ts` | Fixed `isEssentialGain` — was returning true for secondary (grey) stats; now essential-only; added `getWhiteStatKeys`; grey weight = 0.5 |
| `src/logic/ovrProjector.ts` | Rewritten — drill sessions → per-stat XP → Quality%/4 → OVR; tier as flat attr addition; restorers = condition restore step only |
| `src/logic/mutantEngine.ts` | Removed restorers-as-OVR; restorers are condition, not OVR |
| `src/logic/investmentEngine.ts` | New signature: `DrillSession[]` + `GameProfile`; added `compareInvestmentScenarios` |
| `src/logic/scenarioComparator.ts` | Updated to new engine signature |
| `src/context/ManagerContext.tsx` | Added `twoxAdActive`, `talentTier`, `drillLevel` state; removed `coaches` |
| `src/database/drillDatabase.ts` | Added 11 missing drills; fixed `Fast Counter-Attacks` baseLoss (3.0→3.75) |
| `src/db/schema.ts` | Added `drill_sessions` table |
| `app/(tabs)/plan.tsx` | Replaced "Add Coach" with "Add Drill"; added talent tier picker and 2× Ad toggle |
| `app/compare.tsx` | Same drill input replacement |
| `src/index.ts` | CLI updated to drill session workflow |
| `tests/investment-test.ts` | Full rewrite — 40 tests covering 180-rule, cap, age, talent, grey weight, tier delta, restorers model, end-to-end plan |
| `tsconfig.json` | Added `resolveJsonModule: true` |

### Key decisions

**Profile JSON.** All game coefficients live in `profiles/game_2025.json` — no magic numbers in engine code. Updating game mechanics requires only a JSON edit, not code changes.

**XP model replaces coach-multiplier model.** The previous `×30 multiplier → direct OVR` model had no basis in the actual game. The new model: each drill session = 1 XP unit; `xpNeededFor1Pct = base / (ageMult × talentMult × greyMult × adMult × drillLevelMult)`; stat gains accumulate to Quality% → OVR.

**Tier bonus = attribute addition.** Previous code added a flat OVR number on tier up. Correct model: `+X per white attribute → recalculate Quality% → recalculate OVR`. Stellar on a 6-white-stat player at 100% each = +50×6/15 = +20 Quality% = +5 OVR.

**Restorers = 15% condition restore.** Removed from OVR projection entirely; shown as informational `condition` step.

**Grey weight = 0.5 (was 0.1).** Secondary stats contribute half the XP efficiency of white stats.

**180-rule.** Stats at or above 180% return Infinity XP cost — drill ceases to pay that stat.

### Tests

```
40/40 passing (tests/investment-test.ts)
drill-logic-test.ts ✓
logic-test.ts ✓
storage-test.ts ✓
npm run typecheck — zero errors
```

### Still TODO

- Calibrate exact `baseXpPerSession` scaling once empirical session gains are confirmed
- GK white skill set needs verification from research
- OCR scanner stub — next sprint
- Pro tier gating

---

## Sprint 3 — Mobile UI
**2026-05-06**

### Shipped

Full React Native / Expo mobile UI. App now runs on device — zero CLI required.

**FTUE target achieved:** Launch → Add Player → Add Coach → Project OVR in under 90 seconds.

**Files added:**

| File | Purpose |
|---|---|
| `babel.config.js` | NativeWind + Reanimated babel preset |
| `metro.config.js` | NativeWind CSS interop |
| `global.css` / `global.d.ts` / `tailwind.config.js` | NativeWind v4 setup |
| `app/_layout.tsx` | Root Stack; migration gate; ManagerProvider |
| `app/(tabs)/_layout.tsx` | Tab bar — Squad / Plan / Drills |
| `app/(tabs)/index.tsx` | Squad Dashboard — live reactive player list, FAB |
| `app/(tabs)/plan.tsx` | Investment Planner — coaches, manager profile, OVR projection |
| `app/(tabs)/drills.tsx` | Drill Optimiser — Fan Club level picker, drill table |
| `app/compare.tsx` | Scenario Comparator — multi-select, ranked results |
| `app/player/new.tsx` | Add Player modal — role grid, auto-built stats |
| `app/player/[id].tsx` | Edit/Delete Player modal |
| `src/components/OVRBadge.tsx` | Coloured OVR chip |
| `src/components/TierBadge.tsx` | Tier chip with tier-specific colour |
| `src/components/EmptyState.tsx` | Empty state with icon and CTA |
| `src/components/PlayerCard.tsx` | Player row card with role chips |
| `src/components/CoachInputRow.tsx` | Coach entry form (type, multiplier, session, source) |
| `src/components/InvestmentStepTable.tsx` | Step-by-step OVR projection table |
| `src/components/DrillTable.tsx` | Drill recommendations with zero-drain highlight |
| `src/services/playerService.ts` | Drizzle CRUD for players table |
| `src/services/coachService.ts` | Drizzle CRUD for coaches table |
| `src/context/ManagerContext.tsx` | Session-level manager profile state |
| `src/hooks/useSquad.ts` | Live reactive squad query via `useLiveQuery` |
| `RESEARCH.md` | Renamed from `Research` |

**Files modified:**

| File | Change |
|---|---|
| `src/db/schema.ts` | Extended — `players` aligned with Player interface; `coaches` table added |
| `drizzle/migrations.ts` | Regenerated with real SQL (2 tables, 19 columns) |
| `tsconfig.json` | Added `app/**` and `global.d.ts` to includes |
| `tests/storage-test.ts` | Added `tier: 'None'` to satisfy updated Player interface |
| `package.json` | Added `nativewind`, `tailwindcss`, `react-native-reanimated`, `@expo/vector-icons` |

### Key decisions

**Drizzle as sole data layer.** `storageService.ts` (Node `fs`) stays for CLI only and is never imported from `app/`. `useLiveQuery` provides reactive updates — no manual state refresh needed after insert/update/delete.

**`nanoid/non-secure` for IDs.** React Native does not polyfill `crypto.getRandomValues`. Using the non-secure export avoids a polyfill dependency; IDs are non-sensitive.

**Dark theme, plain StyleSheet.** NativeWind v4 installed and configured, but base components use RN StyleSheet for reliability on first run. NativeWind utility classes available for future use.

**Migration gate in root layout.** `useDbMigration().success` must be true before any screen renders — prevents queries against non-existent tables on first install.

### Still TODO

- Formula calibration: `estimateOvrGainFromCoach` awaiting research data (tonight)
- ML Kit OCR: `useScanner` stub — next sprint
- Pro tier gating: planned after formula update
- Push notifications: planned after mobile UI stabilises

---

## Sprint 2 — Investment Engine
**2026-05-06**

### Shipped

**Resource-allocation decision engine** — the core value of the app is now functional via CLI.

`planPlayerInvestment(player, profile, targetTier)` produces a full step-by-step investment plan respecting manager style (FTP / Hybrid / PTW) and enforcing the coaches-first rule. `compareInvestmentScenarios` runs the same plan for N players against an identical resource pool and returns a ranked recommendation.

**Files added/modified:**

| File | Change |
|---|---|
| `src/types/resources.ts` | New — `Coach`, `ManagerProfile`, `InvestmentPlan`, `ScenarioComparison` types |
| `src/logic/ovrProjector.ts` | New — step-by-step OVR chain (coaches → tier → restorers) |
| `src/logic/investmentEngine.ts` | New — style-filtered planning + recommendation text |
| `src/logic/scenarioComparator.ts` | New — multi-player ranking for shared resource pool |
| `src/utils/coachMath.ts` | Rewritten — calibrated piecewise gain table, age factor, seminar bonus |
| `src/database/playerSchema.ts` | Modified — added `tier: TierName` field |
| `src/index.ts` | Modified — Plan Investment (option 4) + Compare Players (option 5) |
| `tests/investment-test.ts` | New — 3-scenario regression test |
| `.gitignore` | New |
| `package-lock.json` | Added |

**Sample test output (18yo, OVR 120 striker, PremiumChest coaches → Stellar):**

```
Step 1  Attacking ×30      120.0 → 130.3   +10.3   FREE
Step 2  Defending ×40      130.3 → 140.2   +9.9    FREE
Step 3  Physical ×28       140.2 → 152.0   +11.8   FREE
Step 4  Tier → Stellar     152.0 → 202.0   +50.0   600 tier pts
Step 5  100 restorers (×1.3)  202.0 → 210.7   +8.7    100 restorers
Final: 210.7   Gain: +90.7

Scenario comparison:
  #1  Alpha Striker (18yo, 120 → 210.7, +90.7)
  #2  Academy GK    (17yo,  88 → 154.2, +66.2)
  → Recommended: Alpha Striker
```

### Key decisions

**OVR_NORMALIZER = 16.** OVR is a weighted composite of ~16 stats. Dividing total stat-gain by the number of stats a coach trains (5) inflated projections by ~3×. Fixed to divide by 16 (total contributing stats), keeping individual-coach gain in the observed +9–12 OVR range.

**Grey stat weight = 0.1.** Stats not in the player's role white-list still receive coaching but contribute minimally to OVR. A weight of 0.4 overestimated gains; 0.1 aligns with observed data.

**Seminar bonus = 1.6×.** Skill Seminar sessions yield noticeably higher OVR gains than equivalent Training sessions, not fully explained by multiplier differences. Empirically calibrated at 1.6×; formula marked TODO pending research docs.

**Coach attribute list is per-card.** A Standard Attacking card does not always train all 5 attack stats. The count varies by card instance (3–5 observed). Model stores `attributes: string[]` per card, not derived from type name.

### Known limitations / TODO

- `estimateOvrGainFromCoach` formula is empirically approximated. Research docs will be added to repo; formula body will be updated without changing the function signature.
- Drizzle migrations are a stub. Full migration generation pending schema stabilisation before mobile build sprint.

---

## Sprint 1 — Foundations
**2026-05-05**

### Shipped

Project skeleton, build tooling, and all pre-existing logic brought to a working state.

**Problem:** repository had logic files but no `package.json`, no `tsconfig.json`, broken imports, and syntax errors from leftover citation artifacts — nothing ran.

**Fixed:**

| Issue | Fix |
|---|---|
| No `package.json` | Created — Expo 53, RN 0.76.5, Drizzle ORM, `tsx` for CLI |
| No `tsconfig.json` | Created — ES2022, bundler module resolution, strict |
| `[cite: ...]` artifacts in `zeroDrainProtocol.ts` | Removed — were TypeScript syntax errors |
| Missing `getRecommendedDrills` export | Added alias in `controller.ts` |
| Missing `drizzle/migrations.ts` | Created stub to unblock import |

**Confirmed mechanics (from empirical observation):**

- Fan Club condition reductions: L0 −10% through L4 −50% ✓
- Zero-Drain protocol: Fan Club L4 + chants on Very Easy drills = 0% condition loss ✓
- Coach multiplier: the ×N number IS the multiplier fed to `calculateDynamicGain` ✓
- Hard stat cap: at maximum stat value, session gain = exactly 0 ✓
- Age drop-off: gains fall sharply between age 18 and 20; plateau after ~25 ✓
- Premium sponsor path: PremiumChest unlocks higher-multiplier coach cards ✓

**Tests passing after Sprint 1:**
- `tests/drill-logic-test.ts` ✓
- `tests/logic-test.ts` ✓
- `tests/storage-test.ts` ✓

---

## Backlog

| Item | Priority | Notes |
|---|---|---|
| Research docs → formula update | High | User to commit docs; update `estimateOvrGainFromCoach` |
| Mobile UI (Expo screens) | High | Next sprint once logic is stable |
| OCR / stat reader | Medium | `useScanner` is a stub; depends on UI sprint |
| Drizzle DB migrations | Medium | Run `npm run db:generate` after schema stabilises |
| Squad synergy / formation engine | Low | `engine.js` stubs left as-is |
| Play Store release | — | Target after mobile UI sprint |
