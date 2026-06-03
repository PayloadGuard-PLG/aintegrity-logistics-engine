# Calibration Record

Honest record of what we know, what we've confirmed, and what we've assumed.
Nothing in here is dressed up. If it's assumed, it says so.

---

## The Model — Plain English

Training gain for any player is determined by three things:

1. **How old they are** — older players gain less per session, lose more per season
2. **How high their stats already are** — higher stats cost exponentially more XP per point
3. **Their talent tier** — Slow players gain ~47% as much as Normal players per session

Young players train fast and lose slowly. Old players train slowly and lose quickly.
Slow talent players gain significantly less than Normal players at the same age and stats.

The talent label (Fastest/Fast/Average/Normal/Slow) is confirmed as a formula variable.
Normal (1.0) is confirmed from 6 players. Slow (0.47) is provisional from Cieran Morgan ×30 ATK.
Fast/Average/Fastest remain community estimates — no empirical data.

---

## The Formula

### XP Cost Per Stat Point

```
cost(stat) = C₀ × exp(stat / K)
```

- C₀ = 2.94 ✅ CONFIRMED
- K = 47 ✅ CONFIRMED
- Derived from: Tackling-120 vs Positioning-228 gain ratio in same session, same budget.
  Ratio pins C₀ independently. K confirmed by CV minimisation across 5 Grant ×40 observations.

### Session Budget Per Stat

```
effectiveSessions = (1 - 0.99^N) / (1 - 0.99)
budget = effectiveSessions × 676 / detectedStatCount
```

- baseXpPerSession = 676 ✅ CONFIRMED
  Back-calculated from Grant ×40 Standard Defending. All 5 stats within game range.
- sessionBudgetDecay = 0.99 ✅ CONFIRMED
  Unknown GK ×114 Extensive: predicted 172.5 OVR, actual 173. Linear model gave 182 (error +9).
- detectedStatCount = whatever OCR detects with gain ranges. No assumed category sizes.
  Coach name, type, and category have no bearing on this number.

### Gain Calculation

Solve for g (gain) in the integral:

```
C₀ × K × (exp((stat + g) / K) − exp(stat / K)) = budget × ageMult × greyMult × talentMult
```

Where:
- ageMult = from age table (see below)
- greyMult = 1.0 for white stats, 0.22 for grey stats ✅ CONFIRMED
- talentMult = from talent tier (Normal=1.0 confirmed; Slow=0.47 provisional)

### OVR Formula

```
OVR = floor(sum of all 15 stats / 15)
```

✅ CONFIRMED from Grant T2→T3 clean tier upgrade: sum=2615, floor(2615/15)=174. ceil=175 (wrong).

---

## Age Multipliers

| Age | Multiplier | Status |
|---|---|---|
| 17 | 1.1 | ⚠️ ASSUMED — no data |
| 18–21 | 1.0 | ✅ 18–20 CONFIRMED (Grant age 20). Age 21 extended from confirmed trend — young players train at full rate. Needs one age-21 data point to lock in. |
| 22–23 | 0.85 | ⚠️ ASSUMED — no data. Dallas age 23 confirmed 0.85 but sits at the boundary. |
| 24–25 | 0.72 | ✅ CONFIRMED — McCluskey age 24, Focused Physical ×4. Talent Normal confirmed 2026-05-20. |
| 26–28 | 0.61 | ✅ CONFIRMED — McGinty age 27 |
| 29 | 0.50 | ⚠️ ASSUMED — no data |
| 30+ | 0.0 | ⚠️ ASSUMED — no data |

The most critical unconfirmed values are 22–23 (0.85) and the exact boundary where
the drop from 1.0 begins. One controlled test with a known age-22 player would pin it.

Note: Dallas (age 23) confirmed 0.85 — so the taper does exist by 23. The question
is whether 21 and 22 are still at 1.0 or already reduced. Current assumption: 21 = 1.0.

---

## Talent Multipliers — CONFIRMED FORMULA VARIABLE

Talent multiplier applies as an efficiency factor: higher = cheaper training = more gains per session.
Applied in `combinedMultiplier()` → `talentMultiplier(talent)` → `TALENT_MULTS[talent]`.

| Talent  | Mult | Status |
|---|---|---|
| Normal  | 1.0  | ✅ CONFIRMED — Grant, Rogers, McGinty, Dallas, McCluskey, Jables (6 players, multiple sessions) |
| Slow    | 0.47 | ⚠️ PROVISIONAL — inferred from Cieran Morgan ×30 ATK. 5/5 stats within game range at 0.47. Normal gives 1.48–1.95× over-predictions. Edit screen not yet confirmed. |
| Average | 1.1  | ⚠️ Community estimate — no confirmed empirical data point |
| Fast    | 1.25 | ⚠️ Community estimate — no confirmed empirical data point |
| Fastest | 1.5  | ⚠️ Community estimate — no confirmed empirical data point |

**Prior conclusion "talent not a formula variable" was incorrect.** It was based on all
confirmed calibration players being Normal (×1.0). Cieran Morgan ×30 ATK provides the
first non-Normal data point. The code already applies talent correctly via `combinedMultiplier`.

**Jables DB label "Slow" is a mislabel.** At Slow (0.47), REFLEXES(144, budget 4191) gives
+24.2 — well below the game range of +35–48. Jables fits only at Normal (1.0): OVR 172.5
predicted vs 173 actual, all 11 GK stats in range. DB needs correcting to "Normal".

---

## Coach Name and Category — NOT USED IN FORMULA

The coach name, type (Standard/Focused/Extensive), and category (Attacking/Defending
etc.) have no bearing on gains. A "Training Camp" coach uses the same formula as any
other coach — "Training Camp" is a resource cost label, not a different training mode.

What determines the stat list: OCR scan ranges (+lo-hi) only. Whatever stats have
visible gain ranges in the scan are the stats being boosted. Nothing else.

---

## Tier System

Cumulative flat bonus added to WHITE STATS ONLY when a tier upgrade happens.

| Tier | Cumulative Bonus per White Stat |
|---|---|
| T0 (None) | +0 |
| T1 (Rare) | +10 |
| T2 (Elite) | +30 |
| T3 (Stellar) | +50 |
| T4 (Master) | +80 |
| T5 (Epic) | +120 |
| T6 (Legendary) | +160 |

✅ CONFIRMED from Grant T2→T3: every white stat +20 exactly (delta T3−T2 = 50−30 = 20).
Grey stats receive no tier increment.

---

## Seasonal Decay

```
all stats − 20 per level promoted (white and grey equally)
```

✅ CONFIRMED from Grant T3 before/after season: every stat −17 to −19 (avg ~17,
~3 pts variance from training noise between screenshots). Flat model fits.
Proportional model (20%) is wrong — would be off by 18–26 on high stats.

Old players lose stats at the same flat rate per season as young players. The
difference is recovery rate: young players regain stats faster because ageMult is
higher. Old players cannot recover efficiently — net loss per season grows with age.

---

## Training Lock

Base OVR ≥ 180 → TRAIN button absent, MAX STARS shown.
Base OVR = total OVR − tier contribution.
Individual stats can exceed 180 via tier bonuses. The 180 cap is on the average.

✅ CONFIRMED from game screenshots.

---

## Confirmed Calibration Data Points

### Ricky Grant — age 20, DL/ML/AML, T3/Stellar
×40 Standard Defending:
- TACKLING 120 (white): +59–73 actual, engine: ~60 ✓
- MARKING 167 (white): within range ✓
- POSITIONING 228 (white): within range ✓
- HEADING 155 (grey, greyMult=0.22): +11–15 actual, engine: 12.4 ✓
- BRAVERY (white): within range ✓

T2→T3 tier upgrade: sum=2615, floor(2615/15)=174 ✓ (confirmed OVR formula)

### Cptn Dallas — age 23, AMR/MR/DR, T0
×4 Safeguard:
- MARKING 139 (white): actual +11–16, engine: within range ✓
- POSITIONING 194 (white): actual +4–6, engine: within range ✓
- AGGRESSION 189 (white): actual +4–6, engine: within range ✓
Confirmed ageMult 0.85 for age 23 and bXPS=676.

### Kevin McGinty — age 27, AMC, T0
Controlled Extensive Safeguard test. Confirmed ageMult=0.61 for age 26–28.

### Garry McCluskey — age 24, DC/DMC/MC, T3, Normal talent ✅
Focused Physical ×4. Fitness 213 → engine +3.5, actual +2–3. Confirmed ageMult=0.72 for age 24.
Talent confirmed Normal from Training Rate in Edit Player screen (2026-05-20).
DB rescanned 2026-05-20: all 15 stats current, roles corrected to DC/DMC/MC only (was incorrectly
including DL/DR, causing CROSSING to project as white — now correctly grey at stat value 83).

### Jables JaseysBoi (formerly Lewis MacGregor) — GK, age 18, T0/T1, DarkVader FC
×114 Extensive GK: predicted 172.5 OVR, actual 173 OVR. Error −0.5 (<1%).
Confirmed sessionBudgetDecay=0.99 and geometric budget model.
11/11 GK stat projections within game-displayed ranges at talent mult=1.0, ageMult=1.0.
Session screen OCR recorded under old account name "Lewis MacGregor" — same player, account renamed.
After ×114 + T1 + T2 upgrades: game OVR = 195 (confirmed 2026-05-20).

Note: DB stores talent as "Slow" — this is a mislabel. At Slow (0.47), REFLEXES(144, budget 4191)
gives +24.2, well below the game range of +35–48. Jables fits only at Normal (1.0). DB should be
corrected. The 0.47 Slow value (Sprint 33) was derived from Jables under the linear budget model
(invalid). Cieran Morgan ×30 ATK independently re-confirms 0.47 under the correct geometric model.

### Gillespie
In-game name for the player previously mislabelled "LJDark Leo" in calibration_data.json.
No calibration observations on Gillespie. The ×114 GK calibration session belongs to Jables JaseysBoi.

### Cieran Morgan — age 18, DMC/MC/AMC, T0, talent inferred Slow
×30 Standard Attacking. All 5 ATK stats white (CROSSING white via MC, union rule).
Budget per stat = 26.03 × 676 / 5 = 3,519 XP.

| Stat | Start | Engine (Normal) | Engine (Slow 0.47) | Game range | Slow fits? |
|---|---|---|---|---|---|
| PASSING    | 134 | +43 | +24.9 | +18–26 | ✓ |
| DRIBBLING  | 101 | +65 | +41.4 | +40–48 | ✓ |
| CROSSING   | 97  | +68 | +43.7 | +35–45 | ✓ |
| SHOOTING   | 121 | +51 | +30.7 | +28–33 | ✓ |
| FINISHING  | 102 | +64 | +40.8 | +33–41 | ✓ |

Adjacent talent tests: Fast (+73), Average (+69), Normal (+65) all over-predict. Slow (0.47) is the only tier that fits.
First confirmed calibration point for a non-Normal player. Talent label not yet verified from edit screen.

---

## Logic Flow

### Coach Projection

1. Player stats and age loaded from DB — stats must be current or projection is off
2. Coach scan: OCR detects gain ranges (+lo-hi) for highlighted stats
3. Detected stats = what OCR sees. Coach name and category ignored entirely.
4. `effectiveSessions = (1 - 0.99^N) / 0.01`
5. `budget = effectiveSessions × 676 / detectedStatCount`
6. For each detected stat:
   - Determine white or grey (from player roles)
   - `greyMult = isWhite ? 1.0 : 0.22`
   - `ageMult` from age table
   - Solve integral for gain g
   - `newStat = min(currentStat + g, statCap)`
7. `ovrAfter = sum(all 15 stats after gains) / 15` (to 1 decimal for display)
8. `ovrFloor = floor(ovrAfter)` (matches game display)

### What the Coach Scan Provides

- Which stats are being boosted (from visible gain ranges only)
- Session multiplier N

The game's displayed gain ranges (+lo-hi) are validation only — not formula input.
If the projection lands inside the game's range, the formula holds.
If it doesn't, check: are the DB stats current?

### What Determines Gain

Only three things:
1. Current stat value (determines cost per point via exponential curve)
2. Player age (determines efficiency via age multiplier)
3. Number of sessions × budget decay (determines total XP available)

---

## What Was Removed and Why

| Thing | Why Removed |
|---|---|
| Talent estimator (estimateTalentFromGain) | Circular: used the game's own projected ranges to back-calculate a multiplier, then re-derived the game's answer. Removed from coach flow. |
| Coach category stat filtering | Coach name/category has no bearing on which stats are boosted. OCR detects what's highlighted. Nothing else applies. |
| Standard/Extensive full-category override | Same reason — assumed OCR misses = full category. Wrong. Trust what OCR detects. |
| bXPS 150 → 220 | Calibrated against wrong cost model. 676 confirmed under exponential cost + geometric budget. |
| OVR ceil | 4 data points looked like ceil due to fractional training accumulation. Clean integer-only tier upgrade decisively showed floor. |
| Slow talent 0.47 (first derivation) | Sprint 33 derived 0.47 from Jables ×114 using linear session budget — invalid once geometric model confirmed. Jables is Normal talent (DB mislabel). However, 0.47 re-confirmed independently from Cieran Morgan ×30 ATK under correct geometric model. 0.47 is now provisional for Slow tier pending edit-screen confirmation. |

---

## Outstanding — Needs Real Data

1. **Age 21 bracket** — extended to 1.0 based on observed data trend. One clean test with a known age-21 player and current DB stats to confirm.
2. **Age 22–23 boundary** — 0.85 assumed. Dallas (23) confirms 0.85 exists by age 23. Does it start at 22 or 23?
3. **Drill XP factor** — drillXpFactor=0.3 is provisional. Needs before/after drill-only session.
4. **Grey stat recovery rate for older players** — flat seasonal loss is confirmed. Recovery rate (ageMult × greyMult) is the model — no separate data point yet.
5. **DB stat freshness** — projection accuracy depends entirely on DB stats matching the player's current in-game stats. A stale scan will give wrong results. Rescan the player card before projecting after any training or season.
6. **K=47 breaks at high stats (T5+/T6)** — Neri (Age 28, T6, stat=330): K=47 predicts +0.25 for Focused ×4, game shows +3–4. Implied K≈76 at stat=330. K=47 confirmed valid up to ~260. Do NOT change engine K until at least 3 data points in the 260–330 range confirm a consistent value. Neri is the only T6 data point — one player, one session.
7. **Cieran Morgan talent confirmation** — Slow (0.47) inferred from ×30 ATK data (5/5 stats fit). Confirm by opening Cieran Morgan's edit screen and reading the Personal Trainer tab talent label. If "Slow" → Slow=0.47 confirmed. If "Normal" → discrepancy needs new investigation. Jables DB "Slow" label is a mislabel — he is Normal talent.
8. **Fast/Average/Fastest talent tiers** — community estimates only. No controlled data point exists. Acquire a confirmed-Fast player (edit screen label) and run a coached session to calibrate.
