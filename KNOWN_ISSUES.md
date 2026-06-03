# Known Issues

## Open

| # | Area | Description | Priority |
|---|---|---|---|
| 1 | drillXpFactor | `drillXpFactor = 0.3` is provisional and uncalibrated. Drill projections in Results may be significantly under or over actual gains. Needs actual before/after stat data from a controlled drill run to back-calculate the true value. | High |
| 2 | Drill presets — Results picker | Only the first preset pushed from Drills appears in Results DRILL PLANS; additional pushes don't appear until player is reselected. Underlying cause: `drillPlanHistory` state not refreshed after second push within same session. | High |
| 3 | OCR — missing GK stats | ×114 Extensive GK scan detected 8/11 stats (THROWING, AERIAL REACH, FITNESS missed). OCR blocks embed adjacent column values, e.g. `"143+ 35-48 Throwing"` — these aren't standalone tokens. Workaround: tap GK category button after scan to force-reload all 11 GK stats. | Medium |
| 4 | New role — manual entry | `player/new.tsx` and `player/[id].tsx` have no UI fields for `newRole`/`newRolePoints`. Scanner populates on scan; manual entry not exposed. | Medium |
| 6 | Fastest/Fast talent not confirmed | `Fastest=1.5`, `Fast=1.25` are community estimates. No empirical calibration against a confirmed-Fastest/Fast player yet. | Medium |
| 9 | Slow talent — no confirmed data point | Slow (0.47) was derived from LJDark Leo ×114 using the linear budget model. With the geometric model (`sessionBudgetDecay=0.99`), LJDark Leo's result is consistent with Normal (1.0). 0.47 is **invalidated**. Back-calculate from a confirmed-Slow player using the geometric budget formula to establish a new Slow multiplier. | High |
| 7 | Premium sponsor cooldown | `isPremiumSponsor` stored in `ManagerProfile` but the Faster Condition Recovery cooldown reduction is not factored into engine output. | Low |
| 8 | Squad-wide OVR projection | Results/Plan project a single player in isolation. The observed ~+7 OVR/season from squad-wide Very Easy drilling at L4 zero-drain is not expressible in UI. | Low |

---

## Fixed — Sprint 34 (2026-05-20)

| ID | Area | Fix |
|---|---|---|
| F63 | ×N anomaly — identical gains for ×20 and ×40 sessions | Root cause confirmed: geometric session budget decay. `sessionBudgetDecay=0.99` means each successive session delivers 0.99× the previous session's XP. Effective sessions = `(1 − 0.99^N) / (1 − 0.99)`. For N=40: 33.1 (not 40). For N=114: 68.2 (not 114). LJDark Leo ×114 actual result 173 OVR — geometric model projects 172 (error −1 ✓), linear model projects 182 (error +9 ✗). Added `sessionBudgetDecay` to `game_2025.json`; updated `coachBudgetPerStat()` in `engineMath.ts`. Closes issue #5. |
| F64 | Scan-ranges bypass blocked blank-coach scans | `runProjection` was using `(lo+hi)/2` from game scan ranges when available, falling back to formula. Blank coach scans (no player selected in-game) produce no gain ranges, making the bypass irrelevant. Removed — projection always uses the formula. Formula is now accurate for all scan modes. |
| F65 | CI syntax error in `coaches.tsx:227` | `scan.multiplier ?? parseInt(sessions, 10) \|\| 1` → `(scan.multiplier ?? parseInt(sessions, 10)) \|\| 1`. JS requires parens when mixing `??` with `\|\|`. |

---

## Fixed — Sprint 32 (2026-05-18)

| ID | Area | Fix |
|---|---|---|
| F56 | customCoachEngine — deprecated shim, no GameProfile | `predictCustomDrill` called `calculateDynamicGain` (deprecated shim in `coachMath.ts`) without a `GameProfile`. Fallback hardcoded `ageFactor = 0.2` for any player over 21. Fixed: rewritten to call `estimateStatGainPct` with actual `statValue`, `talent`, and `profile`. XP budget = `sessions × baseXpPerSession × coachMultiplier`. `PlayerStats` interface gains `statValue` and `talent` fields; function gains `profile` parameter. |
| F62 | OVR formula — `Math.ceil` wrong | `qualityPctToOvr()` used `Math.ceil`. Grant T2→T3 clean tier upgrade (displayed sum=2615) gives game OVR 174. `floor(174.33)=174` ✓, `ceil=175` ✗. Sprint 27's "ceil confirmation" was an artefact of fractional stat accumulation pushing internal sum above displayed sum. Fixed to `Math.floor` in `xpEngine.ts`. All OVR projection and display now correct. |

---

## Fixed — Sprint 31 (2026-05-18)

| ID | Area | Fix |
|---|---|---|
| F57 | Coaches tab crash on sessions input | Sprint 30 removed the tier section but left `setSelectedTier(null)` in the sessions `onChangeText` handler. App crashed on keystroke. Removed the stale call. |
| F58 | CROSSING never detected by coach scanner | 3-column OCR merge: ML Kit collapsed adjacent-column text into single blocks (`"194 + 4-6 Crossing"`). CROSSING (ATT column) never appeared as a standalone token. Secondary embedded-stat regex scan added to `rowText` in `coachScanner.ts`. |
| F59 | bXPS=220 massively under-predicts with exponential cost model | Sprint 25 switched to the exponential model without re-calibrating bXPS. Back-calculated from four Dallas/Grant data points: 409–495, mean 443 → set to 450. Validated against Dallas ×4 Safeguard all-three-stats ranges. |
| F60 | DMC STRENGTH incorrectly essential | STRENGTH was in DMC's white list from prior MC/AMC adjacency carry-over. Game confirms grey for pure DMC. Moved to secondary in `roleWeights.ts`. |
| F61 | OCR misreads TACKLING as TACKIING or TACKL1NG | `OCR_STAT_CORRECTIONS` map added in `playerScanner.ts` to normalise these misreads. |

---

## Fixed — Sprint 30 (2026-05-18)

| ID | Area | Fix |
|---|---|---|
| F50 | Coaches tab tier section caused duplicate tier state | Tier section fully removed from Coaches tab. Tier upgrade now only in Results. |
| F51 | Drill projections wildly inflated (169→212 for 100 cycles) | `drillXpFactor = 0.3` added — scales drill budget down from coach baseline (provisional). |
| F52 | Drill presets invisible in Drills tab on first load | `drillPresetService.getAll()` moved to `useEffect` — presets now load correctly on mount. |
| F53 | Coach projection included VH intensity multiplier (×1.7) | Removed `drillLevelMultiplier` from coach pipeline. Coaches use `drillMult = 1.0` (no intensity). |
| F54 | GK category toggled off after scan | `selectCoachCategory` changed from toggle logic to always-assign — tapping GK always reloads all 11 stats. |
| F55 | Results tab had no drill plan input | Results rewritten as combined hub: drill plan history + coach session history + tier + condition. |

---

## Fixed — Sprints 28–29 (2026-05-16)

| ID | Area | Fix |
|---|---|---|
| F45 | Concatenated role OCR tokens (`"MLAML"`, `"DLMLAML"`) silently dropped roles | Greedy parser in `playerScanner.ts`: tries longest known role first, consumes left-to-right |
| F46 | Player selector invisible with single player in squad | `squad.length > 1` → `squad.length > 0` in coaches and drills tabs |
| F47 | Focused coach scan — OCR returned uppercase TYPE/CATEGORY, pipeline rejected | Normalised via `COACH_TYPES.find()` / `COACH_CATS.find()` lookups before string comparison |
| F48 | Focused coach with 0 detected stats fell through to white-stat fallback incorrectly | Guard added in `coachPipeline.ts` before white-stat fallback: Focused + 0 detections → return `[]`, activating manual picker |
| F49 | OVR scale mismatch in Coaches — fractional `ovrAfter` vs ceil-based `ovrBefore` | Reverted intermediate fractional OVR attempt; consistent `computeOvrWithPadding` throughout |

---

## Fixed — Sprint 27 Addendum (2026-05-15)

| ID | Area | Fix |
|---|---|---|
| F43 | OVR formula used `Math.floor` — wrong for non-integer means | Fixed in `qualityPctToOvr()`: `Math.floor` → `Math.ceil`. Confirmed from 4 data points (McGinty, Rogers, Grant T2, Grant T3) |
| F44 | Rogers 3rd role stored as AMC (should be DL) | Corrected in `player_seeds.json` and `calibration_data.json`; white/grey sets corrected |

---

## Fixed — Sprint 27 (2026-05-15)

| ID | Area | Fix |
|---|---|---|
| F40 | Role OCR false positives from dark/inactive position labels | Detection anchored to `Roles:` label Y-band (`±28px`) in `playerScanner.ts` |
| F41 | coachScanner returned uppercase type/category strings — pipeline comparison failed | Normalised via lookup arrays in `coachScanner.ts` |
| F42 | No-player-selected state (arrow-only coach tiles) produced 0 stats | Arrow indicator detection added (`↑`, `^`, `›`) — captures stat name with zero gain values |

---

## Fixed — Sprint 26 (2026-05-14)

| ID | Area | Fix |
|---|---|---|
| F37 | Star decay bug — `starsGained + gain` passed to cost function instead of `starsGainedInSession` | Fixed in `estimateStatGainPct` (Sprint 24). This is re-documented here for clarity. |
| F38 | `baseXpPerSession` was 150 — too low | Raised to 220 (Sprint 24), confirmed against Standard Defending ×40 real data |
| F39 | XP cost table values above 200 too low | Empirically raised: 200-219=150, 220-239=200, 240-259=260, 260-279=340, 280-339=440 |

---

## Fixed — Sprint 24 (2026-05-13)

| ID | Area | Fix |
|---|---|---|
| F34 | Star decay applied cumulatively per point gained, not per OVR star threshold | `estimateStatGainPct`: pass `starsGainedInSession` only (not `+ gain`). Cost now depends on stat value, not cumulative session points |
| F35 | Projections showed +12 for Tackling 122 (should be +40-50) | Consequence of F34 fix |
| F36 | GK white stat list had FITNESS as grey | GK white = 11 stats (all 10 GK-specific + FITNESS). Grey = STRENGTH, AGGRESSION, SPEED, CREATIVITY. Confirmed Sprint 17, re-confirmed Sprint 24 |

---

## Fixed — Sprint 8 and earlier

| ID | Area | Fix |
|---|---|---|
| F22 | Star decay caused near-zero gains | `starDecayPerSession` corrected; budget divided by `drill.stats.length` |
| F17–F21 | Various plan tab and OVR display bugs | See DEVLOG.md sprints 7–8 |
| F1–F16 | Core formula bugs (OVR divisor, tier as flat OVR, grey weight, 180-rule) | Resolved Sprints 4–6 |
