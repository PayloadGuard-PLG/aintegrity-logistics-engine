# Squad Optimiser — Technical Whitepaper

**Version 2.5 — Sprint 35**

---

## 1. Purpose

Squad Optimiser is a decision-support tool for mobile football management games that use a stat-based OVR (Overall Rating) system. Its goal is deterministic, pre-spend investment planning: given a fixed resource pool and a set of player candidates, output a ranked, step-by-step plan that tells the manager exactly what to apply, in what order, and what final OVR each player will reach.

This document describes the underlying models, calibration methodology, data structures, and known limitations.

---

## 2. Core Model Overview

The OVR projection pipeline has three stages, applied in strict order:

```
Drill Sessions  →  Tier Upgrade  →  Restorers (condition)
```

**Drills-first rule:** Drills must be run before tier upgrade. Tier upgrade raises the base value of white stats permanently — any drills run afterwards train from a higher baseline where XP costs are greater. Running drills first maximises total gain per resource unit.

**Restorers are not OVR.** Restorers restore condition (15% per restorer). They appear as an informational step in the plan but produce zero OVR change.

---

## 3. XP Engine

### 3.1 OVR Formula

```
OVR = floor(mean(all 15 stats))
```

`qualityOvrDivisor = 1` — OVR is the **floor** (truncated) of the unweighted mean of all 15 attributes. Confirmed definitively Sprint 32 from Grant T2→T3 clean tier upgrade test:

| Player | Displayed stat sum | sum/15 | floor | ceil | Game OVR |
|---|---|---|---|---|---|
| Grant T2 (displayed) | 2355 | 157.00 | 157 | 157 | 157 ✓ (ambiguous) |
| Grant T3 (displayed) | 2615 | 174.33 | **174** | 175 | **174 ✓** |

T3 is the decisive case: `floor(174.33) = 174` matches the game; `ceil = 175` does not. Sprint 27's "4-data-point ceil confirmation" was misleading — the displayed stat sum in those cases was lower than the internal sum (fractional stat accumulation from training). The internal sum was sufficient for floor and ceil to agree on displayed values. The clean tier upgrade (no training, stat change is a known integer increment) eliminates this ambiguity. `qualityPctToOvr()` in `xpEngine.ts` uses `Math.floor`.

### 3.2 XP cost per 1% stat gain

```typescript
xpNeededFor1Pct(
  statValue: number,       // current stat value (%)
  age: number,
  starsGainedInSession: number,
  talent: TalentTier,
  isWhite: boolean,        // essential stat for this role?
  twoxAd: boolean,
  drillLevelMult: number,  // from profile drillLevelMultipliers
  profile: GameProfile
): number
```

**XP budget per stat — coach session (geometric decay model):**
```
effectiveSessions = (1 − 0.99^N) / (1 − 0.99)
xpBudget = effectiveSessions × baseXpPerSession / selectedStats.count
```

Each successive coaching session delivers 0.99× the previous session's XP (`sessionBudgetDecay = 0.99`, confirmed Sprint 34). Budget divided equally across all stats the coach covers.

| Sessions (N) | Effective | Example: 5-stat coach |
|---|---|---|
| ×4 | 3.94 | 3.94 × 676 / 5 = 532 XP/stat |
| ×40 | 33.1 | 33.1 × 676 / 5 = 4,475 XP/stat |
| ×114 | 68.2 | 68.2 × 676 / 11 = 4,191 XP/stat (GK) |

**XP budget per stat — drill session (Sprint 30):**
```
xpBudget = cycles × baseXpPerSession × drillXpFactor / drill.stats.length
```

Drills award significantly less XP per session than academy coaches. `drillXpFactor = 0.3` is a provisional scaling factor (uncalibrated — needs real drill before/after data).

**Calibration — Standard Defending ×40 (Ricky Grant, age 20, Normal talent):**

| Stat | Start | Observed gain | Model |
|---|---|---|---|
| Tackling | 120 | +59–73 | ~62 ✓ |

This data point was originally used to calibrate `baseXpPerSession = 220` (Sprint 24, against the stepped cost table). The exponential model introduced in Sprint 25 required a separate recalibration — see Sprint 31 below.

**Calibration — Sprint 31 bXPS recalibration (220 → 450):**

Four independent data points across two players (Cptn Dallas ×4 Safeguard, Ricky Grant ×40 Defending) implied bXPS 409–495, mean 443. Set to 450.

**Calibration — current bXPS = 676 (post-Sprint 31 re-derivation):**

After further recalibration against Grant's full 5-stat Standard Defending ×40 (all stats within game range), `baseXpPerSession` was updated to **676**. This is the value currently in `profiles/game_2025.json`. The exponential cost model (K=47, C₀=2.94) was also re-fitted simultaneously — all five Defending stats landing inside game ranges validates both parameters together.

**Calibration — ×114 Extensive GK (Jables JaseysBoi, age 18) — Sprint 34/35:**

Before: 145 OVR (T0). Actual game result: **173 OVR (+28)**. This data point resolved the ×N anomaly and confirmed `sessionBudgetDecay = 0.99`:

- Linear model (pre-Sprint 34): `114 × 676 / 11 = 7,006 XP/stat` → projects 182 OVR. Error +9. **Wrong.**
- Geometric model (confirmed): `68.2 × 676 / 11 = 4,191 XP/stat` → projects 172 OVR. Error −1. **Correct.**

All 11 GK stat engine projections landed inside the game's displayed gain ranges (Sprint 35). OVR error < 1%.

Player was previously misidentified as "LJDark Leo" (a user handle, not a player name). Correct in-game name is **Jables JaseysBoi** (formerly Lewis MacGregor — account renamed). DB stores talent as "Slow" but the formula at 1.0 (Normal) matches the result exactly — talent is not a formula variable.

**Calibration — exponential model derivation:**

Tackling 120 and Positioning 228 observed simultaneously under the same XP budget. The gain ratio validates the exponential cost curve structure (see §3.3). K=47 was fitted via calibration solver minimising CV across five Grant ×40 observations (CV=3.2%).

**Note — Training XP ≠ stat-gain XP:** The "Training XP" display is a separate resource and does not map to the XP budget modelled here.

**Cost per 1% gain on a single stat:**
```
base       = xpCostTable[statValue]   (see §3.3)
ageMult    = ageTable[age]
talentMult = talentMultipliers[talentTier]
greyMult   = 1.0 if isWhite else 0.22   // profile.greyWeightMultiplier — confirmed Sprint 33
adMult     = 2.0 if twoxAdActive else 1.0

xpCost = base / (ageMult × talentMult × greyMult × adMult × drillLevelMult)
```

The engine iterates 1% at a time from the current stat value, subtracting `xpCost` from the budget, until the budget is exhausted. Sub-integer progress banks as a fractional carry.

### 3.3 XP cost model — exponential (current)

XP cost per 1% gain follows a continuous exponential curve (Sprint 25):

```
xpBase(stat) = C₀ × exp(stat / K)

C₀ = 2.94   (base cost at stat = 0)
K  = 47      (scale constant; cost doubles every ~33 stat points)
```

This supersedes the stepped cost table used through Sprint 24. K=47 was fitted via a calibration solver that minimises coefficient of variation across five Grant ×40 Standard Defending observations (CV=3.2%). C₀=2.94 confirmed from the gain ratio between Tackling 120 and Positioning 228 in the same coaching session.

**Examples (Normal talent, age 20, white stat):**

| Stat | xpBase | Example cost (÷ ageMult 1.0) |
|---|---|---|
| 60 | 2.94 × e^(60/47) ≈ 10.7 | ~11 XP / 1% |
| 120 | 2.94 × e^(120/47) ≈ 38.9 | ~39 XP / 1% |
| 180 | 2.94 × e^(180/47) ≈ 141 | ~141 XP / 1% |
| 228 | 2.94 × e^(228/47) ≈ 396 | ~396 XP / 1% |
| 260 | 2.94 × e^(260/47) ≈ 864 | ~864 XP / 1% |

Cost growth is continuous — no step discontinuities at round-number boundaries.

**Known limitation — K=47 breaks at T5+/T6 stat levels (stat ≥ 300):**

K=47 was calibrated from stat range ~90–260. At stat=330 (T6 Legendary), cost(330) = 3,295 XP/point — 87× more expensive than stat=120. Engine predicts near-zero gain for a 1,332 XP budget (×4 Focused session). Game shows +3–4.

| K | Predicted gain at stat=330, budget=1332, ageMult=0.61 |
|---|---|
| 47 | 0.25 ← engine |
| 76 | 3.53 ← matches game |

Implied K≈76 from Nerimala (Age 28, T6, Fitness/Creativity 323–330, Focused Physical ×4). K=47 confirmed valid to ~260; insufficient data above 300 to commit to a new constant. **Do not change K in the engine until 3+ data points in the 260–330 range confirm a consistent value.**

**Fallback:** If `xpCostBase` or `xpCostDecayK` are absent from the game profile, `xpBaseForStat()` falls back to the stepped table stored in `profile.xpCostTable`. The stepped table remains in `game_2025.json` as a reference but is not used when the exponential parameters are present.

### 3.4 Age multipliers

Values marked ✅ are confirmed from real game screenshot data. Values marked ⚠️ are assumed from community estimates or table interpolation — treat projections for those ages as approximate.

| Age | Multiplier | Status |
|---|---|---|
| 17 | 1.10 | ⚠️ Assumed |
| 18 | 1.00 | ✅ Confirmed (Grant age 20 → same bracket, projection matches) |
| 19 | 1.00 | ✅ Confirmed |
| 20 | 1.00 | ✅ Confirmed (Grant age 20 calibration anchor) |
| 21 | 0.85 | ⚠️ Assumed |
| 22 | 0.85 | ⚠️ Assumed |
| 23 | 0.85 | ⚠️ Assumed |
| 24 | 0.72 | ✅ Confirmed (Garry McCluskey age 24 — Fitness 213 → +2-3 actual, engine +3.5 at ageMult=0.72 ✓) |
| 25 | 0.72 | ⚠️ Assumed (same bracket) |
| 26 | 0.61 | ✅ Confirmed (McGinty age 27 → same bracket, projection matches) |
| 27 | 0.61 | ✅ Confirmed (McGinty age 27 calibration) |
| 28 | 0.61 | ✅ Confirmed (Nerimala age 28 — same bracket as McGinty; Focused Physical ×4, K=47 failure indicates stat cost model issue, not ageMult. ageMult=0.61 assumed correct.) |
| 29 | 0.50 | ⚠️ Assumed |
| 30+ | 0 (clamped) | ⚠️ Assumed |

Ages not in the table interpolate linearly between the two nearest entries (`getAgeMultiplier` in `xpEngine.ts`).

### 3.5 Talent tier multipliers

Values marked ✅ are confirmed from game data. Values marked ⚠️ are community estimates — projections for those talent tiers may be off by 10–50%.

| Talent | Multiplier | Status |
|---|---|---|
| Fastest | 1.50 | ⚠️ Community estimate — not empirically confirmed |
| Fast | 1.25 | ⚠️ Community estimate — not empirically confirmed |
| Average | 1.10 | ⚠️ Community estimate — not empirically confirmed |
| Normal | 1.00 | ✅ Confirmed (Grant, Rogers, McGinty, Nerimala — multiple sessions) |
| Slow | 0.70 | ⚠️ Community estimate — 0.47 invalidated (derived from linear budget model). No confirmed Slow data point exists. Formula uses 1.0 regardless; DB talent field is informational only. |

**Talent is not a formula variable.** All confirmed calibration data (including the Jables JaseysBoi ×114 session, which the DB recorded as "Slow") is fully explained by age + exponential stat cost with talent locked at 1.0. The `talentMultipliers` table in `game_2025.json` exists for informational display only and is not used in any projection.

### 3.6 Drill level multipliers (XP — drills only)

Each drill has one fixed intensity level. The multiplier scales XP yield for that drill.

| Level | XP multiplier |
|---|---|
| Very Easy | 1.0 |
| Easy | 1.15 |
| Medium | 1.3 |
| Hard | 1.55 |
| Very Hard | 1.7 |

**These multipliers do NOT apply to coach sessions.** Academy coaches have no adjustable intensity — `drillLevelMult = 1.0` is hardcoded for all coach projections. Earlier docs that said coaches run at "Very Hard (×1.7)" were incorrect — that was a bug fixed in Sprint 29.

**Note:** Condition loss uses a separate set of multipliers (`condLevelMultipliers`) — see §5. The two sets are not interchangeable.

### 3.7 Grey stat weight

Stats outside a player's role essential list (grey stats) receive `greyMult = 0.22` (`profile.greyWeightMultiplier`). They still gain from coaching and drills but at significantly reduced XP efficiency vs white (essential) stats — grey stats cost approximately 4.5× more XP per point gained. Confirmed from Grant ×40 HEADING (grey, stat=155, actual +11–15, model matches with greyMult=0.22).

### 3.8 Star decay

Star decay reduces training efficiency as cumulative OVR gained within a session crosses star thresholds. Each threshold is +20 OVR gained in a session.

```
starsGained = floor(ovrGainedSoFarInSession / 20)
sessionMult = starDecayPerSession ^ starsGained
```

`starDecayPerSession = 0.85`. `starOvrThreshold = 20` is confirmed. Note: the ×N anomaly (×20 and ×40 sessions producing nearly identical projected gains) was previously attributed to this star decay plateau — **that hypothesis is superseded**. The anomaly is fully explained by `sessionBudgetDecay = 0.99` (geometric session budget decay, §3.2, confirmed Sprint 34). Star decay is a within-session mechanism (OVR threshold crossings during a single run) and is orthogonal to cross-session budget decay.

In `applyDrillSessionsToStats`, `starsGained` is computed from cumulative OVR gained since the start of the call (`runningOvr - ovrBefore`) and passed into `estimateStatGainPct`. This means each stat's gain calculation accounts for the decay earned by all preceding stats and drills in the same session.

---

## 4. Tier Upgrade Model

Tier upgrades are applied after all drills. The bonus is a flat attribute addition per **white (essential) stat** only. Grey role stats and off-role stats receive no tier increment. OVR is recalculated from all 15 updated values.

```
whiteStats = getWhiteStatKeys(player.role)   // essential stats for all player roles

for each stat in player.stats:
    if stat in whiteStats:
        stat += tierAttrAddition[targetTier] - tierAttrAddition[fromTier]

OVR = floor(mean(all 15 updated stats))
```

**Confirmed from direct game observation (Sprint 16).** Earlier Sprint 12 calibration claimed role stats (white+grey) received the full increment based on Ricky Grant Elite→Stellar data; that interpretation has been superseded.

### 4.1 Tier attribute additions and point costs

Each tier type has its own independent point pool. Rare points, Elite points, Stellar points, etc. are separate currencies.

| Tier | Attr addition | Points required |
|---|---|---|
| Rare | +10 | 100 |
| Elite | +30 | 90 |
| Stellar | +50 | 50 |
| Master | +80 | 25 |
| Epic | +120 | 15 |
| Legendary | +160 | 10 |

*Point costs are empirically verified as of 2025.*

### 4.2 OVR gain estimation (example)

Stellar upgrade on a striker (9 white stats: POSITIONING, HEADING, PASSING, DRIBBLING, SHOOTING, FINISHING, STRENGTH, SPEED, CREATIVITY), each white stat at 100:
- White stats: +50 each → 150 (below cap ✓)
- Grey + off-role stats: unchanged
- OVR delta: (50 × 9) / 15 = 450/15 = +30.0 OVR

---

## 5. Condition Model (Restorers)

Restorers restore condition. They do **not** increase OVR.

```
conditionRestored = min(restorers × 15%, 100%)
```

Restorers appear as an informational `condition` step in the plan with `ovrBefore === ovrAfter`.

**Cooldown timer:** The Training Centre has a real-time condition recovery timer. Once it expires, condition returns to ~99%. This is not modelled in the engine — the plan outputs total restorers required without scheduling across cooldown windows.

**Optimal drill cadence (timer-based strategy):** Once condition hits ~99% (timer expired), run drills immediately rather than waiting for the final 1%. Each drill costs ~6% condition. The number of full training cycles available before the next fixture determines total investable XP:

```
cycles = floor(hours_until_fixture × 60 / cooldown_minutes)
total_xp_budget = cycles × sessionCount × baseXpPerSession
```

If a game is scheduled for the next day, the manager has a known time window and can plan how many cycles to run. Premium sponsor shortens the cooldown, directly increasing cycles per window. The decision of what to train in each cycle depends on subscription tier:

| Scenario | Optimal use per cycle |
|---|---|
| FTP / no Zero-Drain | Main player white stats — maximise XP per condition unit spent |
| Premium sub, faster cooldown | More cycles per window enables secondary stat or team play form drills between main sessions |
| Fan Club L4 (Zero-Drain) | Timer irrelevant — condition never drops; unlimited drilling regardless of fixture schedule |

**Premium sponsor — Faster Condition Recovery:** Milestone track grants cooldown reductions (+10% at milestone 6, further at milestone 12), meaning more drill cycles per real-time hour. `ManagerProfile.isPremiumSponsor` is stored but the cooldown reduction is not yet factored into engine output — see §10.

**Drill condition loss — confirmed formula (Sprint 11)**

Condition loss is **level-based, not drill-specific**. Every drill shares the same `baseLoss = 0.75%`. Actual loss per drill:

```
conditionLoss = baseLoss × COND_LEVEL_MULTIPLIERS[drillLevel] × (1 − fanClubReduction)
```

**Condition level multipliers (`COND_LEVEL_MULTIPLIERS`) — confirmed from confirmed screenshots:**

| Drill level | Multiplier |
|---|---|
| Very Easy | 1 |
| Easy | 2 |
| Medium | 3 |
| Hard | 4 |
| Very Hard | 5 |

**Fan Club drain reduction:**

| Fan Club Level | Reduction | Retention |
|---|---|---|
| L0 | −10% | 0.90 |
| L1 | −15% | 0.85 |
| L2 | −20% | 0.80 |
| L3 | −25% | 0.75 |
| L4 | −50% | 0.50 |

**Verification (all values match confirmed observations):**

| Level | Fan Club | Formula | Result | Observed |
|---|---|---|---|---|
| Very Easy | L4 | 0.75 × 1 × 0.50 | 0.375% | 0% (see zero-drain below) ✓ |
| Easy | L4 | 0.75 × 2 × 0.50 | 0.75% | 0.75% ✓ |
| Very Hard | L0 | 0.75 × 5 × 0.90 | 3.375% | 3.38% ✓ |
| Very Hard | L4 | 0.75 × 5 × 0.50 | 1.875% | 1.88% ✓ |

**Zero-Drain Protocol — confirmed:** Very Easy + Fan Club L4 = 0.375%, which falls below the game's display threshold and shows as **0.00%**. Engine `isZeroDrain` fires when `conditionLoss < 0.5%` — which is exclusive to VE+L4 under current fan club and level ranges. Easy+L4 = 0.75% is above the threshold and is not zero drain.

Note: active chants may further reduce condition — not yet modelled.

---

## 6. Team Play System

Team Play is a separate scoring system that affects match performance but does **not** influence individual player stat training. It is currently unmodelled in the engine — tracked here for future implementation.

### 6.1 Structure

Four pillars, each with its own current score, cap, and level (1–10). Cap increases as the pillar is levelled up via the ADVANCE button. Combined score = sum of all four current values vs sum of all four caps.

**Confirmed pillar caps by level (2026-05-08):**

| Level | Pillar cap | Formula |
|---|---|---|
| 3/10 | 16 | level × 2 + 10 |
| 4/10 | 18 | level × 2 + 10 |
| 5/10 | 20 | level × 2 + 10 |
| 6/10 | 22 | level × 2 + 10 |
| 10/10 | 30 | level × 2 + 10 (projected) |

**Formula confirmed:** `pillarCap = (level × 2) + 10`. Verified across all four pillars simultaneously.

**Confirmed pillar state (fully maxed, 2026-05-08):**

| Pillar | Score | Cap | Level | Bonus | Min players required | Eligible roles |
|---|---|---|---|---|---|---|
| Attack | 18 | 18 | 4/10 | +20% | ≥ 3 | ST · AMC · AML · AMR · ML · MR |
| Defence | 22 | 22 | 6/10 | +25% | ≥ 4 | GK · DC · DL · DR |
| Possession | 20 | 20 | 5/10 | +25% | ≥ 4 | ML · MR · MC · DMC |
| Condition | 16 | 16 | 3/10 | +15% | ≥ 8 | ANY (Physical & Mental drills) |
| **Total** | **76** | **76** | — | — | — | — |

**Reward Channel boost:** Attack shows 18+1 from Reward Channel (match-day only, does not persist between sessions).

**Daily decay:** All four pillar scores decrease by 2 or more per day. Decay applies at the daily server reset.

**Bonus % by level (observed):**

| Level | Attack bonus | Defence bonus | Possession bonus | Condition bonus |
|---|---|---|---|---|
| 3/10 | — | — | — | +15% |
| 4/10 | +20% | — | — | — |
| 5/10 | — | — | +25% | — |
| 6/10 | — | +25% | — | — |

Note: L5 and L6 both show +25% — whether bonus plateaus at L5 or scales differently between pillars needs further data.

### 6.2 Free daily maintenance (all managers)

Four free teamplay training drills are available daily, accessible by watching ads. These drills specifically raise teamplay pillar scores. A ×1.5 (150%) multiplier applies to the teamplay gain from these drills.

**Effective free daily boost:** 4 drills × 1.5 multiplier — sufficient to offset the ~2-point daily decay if used consistently.

### 6.3 Match Advisor (premium)

The Match Advisor grants **+150% Teamplay multiplier on all training sessions** — not just the 4 free teamplay drills. Duration: 7 days from activation. Also purchasable as a 1-day version for 25 tokens at any time. Source: premium sponsor milestone rewards.

| Boost type | Scope | Duration | Cost |
|---|---|---|---|
| 4 free ad drills (×1.5 / 150%) | Teamplay drills only | Daily | Free |
| Match Advisor (+150%) | All training sessions | 7 days | Premium milestone |
| Match Advisor (+150%) | All training sessions | 1 day | 25 tokens |

The Match Advisor applies to every drill a player runs, meaning normal individual-player training sessions simultaneously advance teamplay pillars.

**Confirmed observed effect (2026-05-08):** 41 × Touch Training Very Easy with Match Advisor active → Attack pillar +7 above its current level cap (L4 cap = 18, reached 25 effective). Match Advisor can temporarily push pillars above their level cap. This excess above cap is not retained permanently — it represents form gained from training that the pillar level ceiling does not limit.

**Variety penalty:** The game warns "Training today lacked variety. Different intensities and types in drills enhance teamplay impact." Repeating the same drill across all 41 sessions reduces per-session teamplay efficiency. Rotating drills or mixing intensities maximises pillar gain rate.

### 6.4 Reward Channel — daily reward track

The Reward Channel (Reward Channel) is a sequential reward track completed by watching video ads. **Progress resets every 24 hours.** All boosts are match-day only and do not influence training.

**Reward track (in order):**

| Step | Reward | Notes |
|---|---|---|
| 1 | Daily Appearance | Daily login reward bundle |
| 2 | Special Sponsor | +5 sponsor points · completes "Video Master" sponsor task |
| 3 | Playbook | 1 random Basic Playbook drill · completes Playbook shop videos |
| 4 | Match Advisor (2×) | Limited training run with 2× teamplay multiplier |
| 5 (Milestone) | Teamplay Form Boost: Random | Applied to all matches until end of season day |
| Between 5–10 | Advisor Bonus (+2%) | +2% Possession before a scheduled fixture · requires 3 watches |
| 10 (Milestone) | Signature Boost | All players' Special Abilities boosted for all matches today |

**Matches to unlock Advisor Bonus:** Watch an ad before each of 3 fixtures ("GO TO FIXTURES"). +2% Possession for that match. Number of fixtures available depends on how many competitions you're active in: League + Association (clan of up to 6) + Friendly Championship + accepted Friend Friendlies = 1–6 matches per day.

**Teamplay Form Boost — exact probabilities (confirmed from UI):**

Same distribution applied independently to each of the 4 pillars per draw. You always receive exactly one boost on one random pillar.

| Boost | Probability |
|---|---|
| +1 | 7% |
| +2 | 10% |
| +3 | 5.5% |
| +4 | 2.5% |
| **Any boost on this pillar** | **25%** |

Since 4 pillars × 25% = 100%, every draw guarantees a boost on exactly one pillar. Expected boost value: **~+2.14** on the selected pillar.

**Signature Boost:** All players' Special Abilities enhanced for all matches until end of season day. Does not affect training.

**Associations (clans):** Groups of up to 6 players. Association matches count toward fixture availability for Advisor Bonus watches.

### 6.5 Training Level and Drill Quality

Training Level is a separate progression track from individual player OVR. It is advanced by accumulating Training XP (the "+1 per player" shown in training reports — distinct from stat-gain XP).

**Confirmed facts (2026-05-08):**
- Maximum Training Level = **111** (stated in tooltip: "The Maximum Training Level is 111")
- Training XP at Level 111: **1,855,042** (displayed as accumulated total at max)
- Each level up unlocks a new drill or improves an existing one
- Drill quality tiers (e.g. "World-class, +35 Training effect") are determined by Training Level unlocks applied to that drill
- The `+35 Training effect` on Touch Training at World-class quality affects Training XP yield per session, not stat-gain XP — it does not affect the stat gain model

**Training XP vs stat-gain XP:** These are entirely separate systems. Training XP fills the level bar and unlocks drills. Stat-gain XP (modelled as `baseXpPerSession × multipliers`) drives actual player stat improvements. The two numbers do not interact.

### 6.7 Strategic priority

| Manager type | Team play approach |
|---|---|
| FTP | 4 free daily drills (watch ads) to hold pillars above decay baseline |
| Premium (no coach) | Same as FTP + faster condition cooldown = more training cycles available |
| Premium (Match Advisor active) | All individual player drills also advance teamplay — no separate maintenance needed for 7 days |

---

## 6a. Validated Season Meta — Squad-Wide Growth

**Observed outcome:** ~+7 OVR per season from sustained Very Easy drills at Fan Club L4.

This strategy compounds three mechanics simultaneously:

### Training loop
1. **Zero-drain at L4 + Very Easy** — condition never drops; drill cycles are unlimited regardless of fixture schedule.
2. **Spam all low white stats** — train the stats furthest below tier cap first. XP cost is lowest at the bottom of the range; the gain per session is highest here. Once a stat hits the current tier cap, skip it until the next tier upgrade.
3. **Don't wait for perfect condition** — 50% condition reduction (L4) means you can chain drills continuously; perfect-condition waiting wastes cycles.

### Teamplay maintenance (free)
4. **4 free ad drills daily (×4 multiplier)** — train Attack, Defence, and Possession on relevant positions using the free daily ad drills. This offsets daily decay and steadily pushes pillar levels higher, raising match performance without spending condition.

### Squad-wide effect
5. **Train across the whole squad** — the aggregate XP flowing through all 11+ players means more integer thresholds crossed per day than single-player projection suggests. Each player's white stats accumulate fractionally; when a crossing fires, it feeds into OVR for that player. Across the squad, crossings happen constantly.
6. **Role opening** — as stats hit new thresholds, adjacent roles unlock. This widens available drilling options and enables Match Advisor to cover a broader teamplay pillar set.

### Season yield
~+7 OVR is the observed aggregate for this approach. Individual player gains are smaller (fractional each cycle); the season total comes from hundreds of crossings across all players.

**Engine note:** The current Plan tab projects a single player in isolation. Squad-wide cumulative gain is not modelled — the +7 OVR/season figure is an observed season benchmark, not an engine output.

---

## 7. Role and Stat Classification

Each player role defines:
- **Essential stats** (white) — directly drive OVR for this role; receive full weight (`greyMult = 1.0`)
- **Secondary stats** (grey) — trained at reduced weight (`greyMult = 0.22`) — approximately 4.5× more XP per point than white stats

Every role maps exactly 15 stats (essential + secondary = 15). Verified from game screenshots (Sprint 17).

| Role | White (essential) | Grey (secondary) |
|---|---|---|
| ST | POSITIONING, HEADING, PASSING, DRIBBLING, SHOOTING, FINISHING, STRENGTH, SPEED, CREATIVITY (9) | TACKLING, MARKING, BRAVERY, CROSSING, FITNESS, AGGRESSION (6) |
| GK | REFLEXES, AGILITY, ANTICIPATION, RUSHING OUT, COMMUNICATION, THROWING, KICKING, PUNCHING, AERIAL REACH, CONCENTRATION, FITNESS (11) | STRENGTH, AGGRESSION, SPEED, CREATIVITY (4) |
| AMC | HEADING, PASSING, DRIBBLING, SHOOTING, FINISHING, FITNESS, SPEED, CREATIVITY (8) | TACKLING, MARKING, POSITIONING, BRAVERY, CROSSING, STRENGTH, AGGRESSION (7) |
| AML | PASSING, DRIBBLING, CROSSING, SHOOTING, FINISHING, FITNESS, SPEED, CREATIVITY (8) | TACKLING, MARKING, POSITIONING, HEADING, BRAVERY, STRENGTH, AGGRESSION (7) |
| AMR | same as AML | same as AML |
| ML | POSITIONING, PASSING, DRIBBLING, CROSSING, FITNESS, SPEED, CREATIVITY (7) | TACKLING, MARKING, HEADING, BRAVERY, SHOOTING, FINISHING, STRENGTH, AGGRESSION (8) |
| MR | same as ML | same as ML |
| MC | TACKLING, MARKING, POSITIONING, BRAVERY, PASSING, DRIBBLING, FITNESS, STRENGTH, SPEED, CREATIVITY (10) | HEADING, CROSSING, SHOOTING, FINISHING, AGGRESSION (5) |
| DMC | TACKLING, MARKING, POSITIONING, HEADING, BRAVERY, PASSING, FITNESS, AGGRESSION, CREATIVITY (9) | DRIBBLING, CROSSING, SHOOTING, FINISHING, SPEED, STRENGTH (6) |
| DC | POSITIONING, HEADING, FITNESS, STRENGTH, AGGRESSION (5) | TACKLING, MARKING, BRAVERY, PASSING, DRIBBLING, CROSSING, SHOOTING, FINISHING, SPEED, CREATIVITY (10) |
| DL | TACKLING, MARKING, POSITIONING, BRAVERY, CROSSING, FITNESS, AGGRESSION, SPEED (8) | HEADING, PASSING, DRIBBLING, SHOOTING, FINISHING, STRENGTH, CREATIVITY (7) |
| DR | same as DL | same as DL |

**Multi-role white union:** When a player has two or three roles, the white set is the union of all roles' essential lists. `isWhiteStat(roles, stat)` returns true if the stat is essential for any of the player's roles. `ROLE_CROSSOVER_WHITES[R1][R2]` lists stats that become white when R2 is added to a player with R1.

Role adjacency is validated at player creation. The validation is **transitive** — each additional role must be adjacent to any already-accepted role (not just the primary). Example: ST+AMC+MC is valid because MC is adjacent to AMC, even though MC is not directly adjacent to ST.

---

## 8. Manager Style

The manager style controls the resource pool available for planning:

| Style | Resource pool |
|---|---|
| FTP | Free-to-play — no store purchases |
| Hybrid | Owned resources + store within `storeBudget` |
| PTW | All available resources |

---

## 9. Drill Optimiser

The drill optimiser (`getBestDrillSelections`) recommends all drills sorted by ROI, letting the manager identify the highest-value training for a player's role.

Each drill returns:
- `name` — drill name
- `type` — Attack / Defence / Physical
- `efficiency` — fraction 0–1 of the drill's stats that are white (essential) for this player's role (rendered as % in UI)
- `conditionCost` — per-drill condition % lost (direct game display value; 0 when `isZeroDrain`)
- `isZeroDrain` — true when `conditionLoss < 0.5%` (only VE+L4 qualifies under current ranges)
- `avgWhiteStatValue` — mean current value of white stats this drill trains; lower = cheaper XP per gain = higher ROI
- `whiteHits` — `{ stat: string; white: boolean }[]` — every stat the drill trains, flagged white or grey

**All 25 drills are shown for every player** (no efficiency filter). Drills are sorted ascending by `avgWhiteStatValue` — cheapest gains first. Drills that train no white stats for a given role (Infinity value) sink to the bottom naturally.

Drills are classified as `isBase: true` (core daily drills available always) or `isBase: false` (event or lab drills with restricted availability).

---

## 10. Data Structures

### Player

```typescript
interface Player {
  id: string;
  name: string;
  role: string[];          // Up to 3 adjacent roles
  age: number;
  overall: number;         // Current OVR
  tier: TierName;
  stats: Record<string, number>;  // Individual stat values; {} if not entered
  isMutantCandidate: boolean;
  snapshot?: { stats: Record<string, number>; overall: number; tier: TierName } | null;
}
```

### SquadPlanRun

```typescript
interface SquadPlanRun {
  id: string;
  playerId: string;
  label: string | null;
  sessions: number;
  selectedStats: string[];
  ovrBefore: number;
  ovrAfter: number;
  gains: { stat: string; from: number; gain: number; isWhite: boolean }[];
  tier: TierName | null;
  createdAt: number;
}
```

### DrillSession

```typescript
interface DrillSession {
  drillName: string;
  sessionCount: number;    // How many times this drill is run
  drillLevel: DrillLevel;  // 'Very Easy' | 'Easy' | 'Medium' | 'Hard' | 'Very Hard'
}
```

### ManagerProfile

```typescript
interface ManagerProfile {
  style: ManagerStyle;     // 'FTP' | 'Hybrid' | 'PTW'
  tierPoints: Partial<Record<TierName, number>>;  // Per-tier separate balances
  restorers: number;
  isPremiumSponsor: boolean;
  storeBudget?: number;    // Hybrid only
  twoxAdActive: boolean;
  talentTier: TalentTier;
  drillLevel: DrillLevel;
}
```

### InvestmentPlan

```typescript
interface InvestmentPlan {
  player: { name: string; currentOvr: number };
  steps: InvestmentStep[];   // Ordered: drills → tier → condition
  finalOvr: number;
  totalOvrGain: number;
  totalResourceCost: string;
  recommendation: string;    // Human-readable summary
  warnings: string[];
}
```

---

## 11. Limitations and Open Questions

| Item | Status |
|---|---|
| OVR formula | `Math.floor` — confirmed Sprint 32 from Grant T2→T3 clean tier upgrade. `floor(2615/15) = 174` ✓. `ceil = 175` ✗. Fixed in `qualityPctToOvr()`. |
| Session budget decay | `sessionBudgetDecay = 0.99` confirmed Sprint 34. Effective sessions = `(1 − 0.99^N) / (1 − 0.99)`. Jables JaseysBoi ×114: 68.2 effective → 172 OVR projected, actual 173 ✓. 11/11 GK stat ranges confirmed Sprint 35. |
| Coach XP baseline | `baseXpPerSession = 676` — confirmed Sprint 33 from Grant ×40 Standard Defending (all 5 stats within game range). |
| Drill XP scaling | `drillXpFactor = 0.3` provisional — uncalibrated. Needs actual before/after stat data from a controlled drill run to back-calculate the true factor. |
| XP cost model | Exponential `C₀ × exp(stat/K)` with C₀=2.94, K=47 — K confirmed via CV minimisation across 5 Grant ×40 observations (CV=3.2%). C₀ confirmed from Tackling/Positioning gain ratio. |
| Talent multipliers | Normal (×1.0) confirmed for Grant, Rogers, McGinty, Nerimala. Talent is not a formula variable — locked to 1.0 for all players. Slow (0.70) is a community estimate placeholder; 0.47 was invalidated (linear budget artefact). Fastest/Fast/Average are community estimates. |
| ×N anomaly | **RESOLVED** Sprint 34 — explained by `sessionBudgetDecay = 0.99`. Not a plateau artefact. |
| K=47 at T5+/T6 | K=47 fails at stat ≥ 300. Nerimala (T6, stat=330, age 28) Focused ×4: engine +0.25, game +3-4. Implied K≈76. Do not change engine K until 3+ data points in 260–330 range confirm a consistent value. |
| Star decay curve | `starDecayPerSession = 0.85`. Within-session only (OVR star thresholds). Separate from session budget decay. |
| GK white stat list | 11 white (REFLEXES, AGILITY, ANTICIPATION, RUSHING OUT, COMMUNICATION, THROWING, KICKING, PUNCHING, AERIAL REACH, CONCENTRATION, FITNESS) + 4 grey (STRENGTH, AGGRESSION, SPEED, CREATIVITY). Confirmed Sprint 17. |
| Tier bonus scope | White (essential) stats only — confirmed Sprint 16. Grey role stats and off-role stats receive 0 increment. |
| Individual stat entry | Drill-level projection requires per-stat values. Players with only an OVR get drill gains skipped; projection falls back to tier-only estimate with a warning. |
| Condition level multipliers | Confirmed Sprint 11: VE×1, E×2, M×3, H×4, VH×5. |
| Role OCR | Anchored to Roles: label Y-band Sprint 27. Fallback to full-text regex when label not found. If screenshot crops role badge area entirely, zero roles detected — existing role selection is preserved (not overwritten). |
| Touch Training drill | Present in DRILL_LIST (added Sprint 8). Trains HEADING, CREATIVITY, CONCENTRATION, DRIBBLING. Very Easy intensity. |
| Team Play system | Documented §6, not modelled in OVR engine. |
| Premium sponsor cooldown | `isPremiumSponsor` stored but condition recovery cooldown reduction not applied in engine output. |
| Formation/synergy | Not modelled. |

---

## 14. On-Device OCR System

**Design principle:** This app makes zero LLM or external API calls. All text extraction is performed on-device using ML Kit (`@react-native-ml-kit/text-recognition`). No Anthropic key, no OpenAI key, no network request is made during a scan.

### 14.1 Player Card Scanner (`src/logic/playerScanner.ts`)

Scans a screenshot of a player's confirmed card and extracts:
- All 15 stats + their values
- OVR, age, name, roles, tier, talent

**Algorithm — Y-baseline token pairing:**

1. ML Kit returns a list of `Block → Line → Element` tokens, each with a bounding box (`frame.top`, `frame.left`).
2. Tokens are flattened to a list of `{ text, top, left }`.
3. For each token, check if `text.toUpperCase()` is a known stat name (single word) or if the next token completes a two-word stat (e.g. `RUSHING OUT`). Two-word match requires both tokens to be within `Y_TOL = 28px` vertically.
4. For each matched stat name, look for numbers to its RIGHT on the same baseline using `Y_TOL_VAL = 20px` (tighter than `Y_TOL = 28px` to exclude section-header totals such as `DEFENCE 173`). Take the leftmost valid number (1–500). Fallback: look directly below the label (within `Y_BELOW = 40px`, within 100px horizontally).

**Role detection (Sprint 27):**

Role extraction is anchored to the Y-band of the "Roles:" label token (±28px). The scanner finds the "Roles:" label by text match, records its `top` value, then restricts role token scanning to that Y band. This prevents false positives from dark/inactive position labels elsewhere on the game card.

```typescript
const rolesLabelTok = tokens.find(t => /^roles?\s*:?$/i.test(t.text.trim()));
const roleRowY = rolesLabelTok?.top;
const roleSourceTokens = roleRowY != null
  ? tokens.filter(t => Math.abs(t.top - roleRowY) < Y_TOL)
  : tokens;
```

Within the band, tokens are split on whitespace and badge punctuation (`[\s,./|·•·()\[\]<>:]+`) and matched against `KNOWN_ROLES`. The game may emit multiple roles as a single OCR token (e.g. `"DL ML AML"`). A `fullText` regex backup runs when no "Roles:" label is found by OCR.

**Multi-role entry:** Up to 3 roles may be selected in the game's position grid. The union of all roles' essential stats forms the white stat set for projection (union rule — DL+ML+AML unlocks whites from all three positions).

**Name heuristic:**
- Find the first OCR block whose text starts with a capital letter followed by a lowercase letter (`/^[A-Z][a-z]/`)
- Exclude: known roles, known tiers, UI blocklist (`Squad`, `Contract`, `Overview`, `Skills`, `Stats`, `Training`, `Playstyle`, `Celebrations`, `Trainer`, `Personal`, `Defence`, `Attack`, `Physical`, `Goalkeeping`, `Safeguard`, `Special`, `Ability`, `Team`, `None`, `Select`, `Player`, `Start`, `Reward`)
- Exclude: any block whose text starts with a digit (`/^\d/.test()`) — prevents squad number from being read as name
- This avoids reading game UI labels or squad numbers as player names

**Tier/talent:** Full-text regex for known tier names (`Legendary`, `Epic`, `Master`, `Stellar`, `Elite`, `Rare`) and talent tokens (`Fastest`, `Fast`, `Average`, `Normal`, `Slow`). `None` is NOT in the tier list — absence of a tier token → `undefined` → UI defaults to `None`.

### 14.2 Coach Preview Scanner (`src/logic/coachScanner.ts`)

Scans a screenshot of the coach assignment preview screen and extracts:
- Coach type (Standard / Focused / Extensive), category (Attacking / Defending / Physical / Safeguard), multiplier (×N) — matched independently from separate header tokens, not a single combined regex
- Highlighted stat names — only the stats the coach boosts, not all visible stats

**Two scan states the scanner must handle:**

| State | Highlighted row shows | Non-highlighted row shows |
|---|---|---|
| Player selected | `MARKING 87 +6–9` (gain range inline) | `TACKLING 57` (value only) |
| No player selected | `MARKING ↑` (arrow indicator) | `TACKLING` (name only) |

**Gain range detection (player-selected state):**

`GAIN_RE = /\+?\s*(\d+)\s*[–\-—]\s*(\d+)/` — the `+` prefix is optional because OCR on teal/white highlight backgrounds may drop or mangle it. Three dash variants matched (en-dash, hyphen, em-dash). Sanity checks: `lo > 0`, `hi > lo`, `hi <= 300`, `lo <= 150` (prevents stat values misread as range boundaries).

Y tolerances are split to prevent adjacent-row bleed:
- `Y_TOL_NAME = 25px` — stat name detection (allows two-word names e.g. RUSHING OUT)
- `Y_TOL_VAL = 18px` — gain range row lookup, tighter than row spacing (~22px)

Right-of-stat-name filter (`t.left > tok.left`) is essential — the 3-column coach layout places stats from three categories at the same Y coordinate; a gain range for a stat in column 1 must not be attributed to column 2.

**Focused-coach category filter (Sprint 35):**

For Focused coaches specifically, the right-of-stat filter alone is insufficient. A DEF-column stat's row text can extend far enough rightward to reach a PHY-column gain range on the same Y. Example: with a Focused Physical coach boosting only FITNESS and CREATIVITY, TACKLING's row text reads "190 Passing 301 Fitness 330 +3-4" — the scanner picked up FITNESS's +3-4 as TACKLING's gain range.

Fix: after identifying a stat name, if `coachType === 'Focused'` and the stat is not in `CATEGORY_STAT_SETS[coachCategory]`, skip it before gain detection. Standard and Extensive coaches are unaffected — they use the pipeline's full-category override regardless of OCR count.

**Arrow indicator detection (no-player-selected state):**

When no player is selected, highlighted rows show a `↑` character (OCR variants: `^ › > ▲`) but no gain values. The scanner detects these and captures `{ statName, statBefore: 0, gainLo: 0, gainHi: 0 }`. `resolveCoachStats` in `coachPipeline.ts` uses only `statName` — zero values are discarded downstream.

**Coach pipeline (`src/logic/coachPipeline.ts`):**

All post-OCR processing is consolidated here:
1. Raw OCR → `coachScanner.ts` → `CoachScanResult` (header + stat captures)
2. `resolveCoachStats(scan, player, profile)` — extracts stat names only; discards all image gain values
3. XP projection via `ovrProjector.ts` using the selected player's DB stats, not OCR values

The image's `statBefore`, `gainLo`, `gainHi` values belong to whoever's player card was shown in the screenshot, not the selected player. They are discarded immediately after OCR. Only stat names are retained.

**Manual fallback:** When OCR fails to detect the coach header, a manual picker lets the user select coach type, category, multiplier, and individual stats.

**Coaches tab — 3-table layout:**

The coach preview section displays three read-only tables side by side: OFFERING (stat names from scan), CURRENT (player's DB values for those stats), PROJECTED (estimated values after coaching).

**Integration:** The `⊕ SCAN` button in the Coaches tab runs `scanCoachPreview` on a gallery image. Double-tapping a player chip navigates to the player edit screen (`/player/[id]`).

---

## 12. Versioning

| Version | Date | Notes |
|---|---|---|
| 0.1 | Sprint 1 | Foundations — drill optimiser, condition model, role system |
| 0.2 | Sprint 2 | Investment engine — OVR projector, coach-card gain formula, scenario comparator |
| 0.3 | Sprint 5 | XP model, drill sessions, per-tier point pools, OVR formula fix (divisor 4→1), drill level rename, role adjacency transitive fix |
| 0.4 | Sprint 6 | Extended XP cost table to stat 339; baseXpPerSession budget multiplier; Direction B UI; OVR display delta fix |
| 0.5 | Sprint 7 | Drill level selector in Drills tab; talent multiplier labels; zero-drain detection at L4+VE |
| 0.6 | Sprint 8 | Coaches tab (SESSION SIMULATOR); fractional XP model; ROI-based drill sort; GK role constraints confirmed; smarter skip warnings |
| 0.7 | Sprints 9–10 | RESULTS tab; tier bonus applied to all 15 stats (fix); talent on player card; apply-gains write-back; GK stat grid complete; OVR truncation confirmed; Expo Web; Match Advisor + teamplay data logged |
| 0.8 | Sprint 11 | Condition formula overhaul (universal baseLoss=0.75, COND_LEVEL_MULTIPLIERS VE×1→VH×5); all drills visible for all roles; Touch Training rename; Porky in Centre AGGRESSION |
| 0.9 | Sprint 12 | Tier bonus corrected: role stats (white+grey) get full increment, off-role get +1 flat. Player snapshot + one-step revert from edit screen. |
| 1.0 | Sprint 13 | Squad Plan tab (per-player run history, persistent DB). Coach Session Capture screen (squad auto-fill, lo/hi gain logger, live OVR boost preview). Coaches tab: 3-col stat grid, 2× AD removed, SAVE RUN button. |
| 1.1 | Sprint 14 | Consistent DEF/ATT/PHY column colour scheme across all stat surfaces. Role OCR switched to token-exact matching. PR #4 merged to main; main is now source of truth. |
| 1.2 | Sprints 15–16 | Tier rename T0–T6. Drill intensity field + filter. Coach OCR hardened (Y_TOL, GAIN_RE spaces, hi cap). Tier bonus corrected to white stats only. Grey stat visibility fix. Player scanner: split Y tolerances, cap 500, role detection backup, name digit filter. EAS workflow android-only/main-only. |
| 1.3 | Sprint 17 | All 13 role stat baselines corrected to exactly 15 stats each (verified from game). GK corrected to 11 white (all 10 GK stats + FITNESS) + 4 grey (STRENGTH, AGGRESSION, SPEED, CREATIVITY) — verified from direct game card screenshot. DMC added to role selection grid (6×3 layout). `ROLE_CROSSOVER_WHITES` export added. GK auto-inference in scanner (infers GK role when REFLEXES detected but TACKLING absent and no role badge OCR). Maths centralised in `profiles/game_2025.json`. |
| 1.4 | Sprints 18–19 | QualityMeter atom (10-bar OVR display). Scan rejection overlay (INVALID IMAGE). Star decay fix in Results tab. Age table replaced with community-verified values. New role training bar (NewRoleBar) + DB migration 0007. |
| 1.5 | Sprint 20–21 | (same as 1.4 — version numbering corrected retroactively) |
| 1.6 | Sprint 22 | Unified coach pipeline (`coachPipeline.ts`). `scannedStats` is `string[]` — image values discarded. Coaches tab 3-table layout (OFFERING / CURRENT / PROJECTED). `_debugBlocks` logging. |
| 1.7 | Sprint 23 | coachScanner: Y_TOL split (NAME=25, VAL=18); GAIN_RE `+` optional; sanity tightened; arrow indicator detection for no-player-selected state; manual type/category/stat picker fallback; Goalkeeping → Safeguard category mapping. |
| 1.8 | Sprint 24 | Star decay bug fixed in `estimateStatGainPct`. `baseXpPerSession` 150 → 220. Double-tap player chip → player edit screen. `profiles/calibration_data.json` created. |
| 1.9 | Sprint 25 | Exponential XP cost model: `xpBaseForStat = C₀ × exp(stat/K)`, C₀=2.94, K=55. `xpCostBase` and `xpCostDecayK` added to GameProfile interface. Community formula structure confirmed. |
| 2.0 | Sprints 26–27 | Talent confirmed Normal for both calibration players. `player_seeds.json` created. Rogers 3rd role corrected AMC → DL (identical white stats to Grant). Role detection anchored to Roles: label Y-band. Kevin McGinty identified (age 27, AMC). OVR formula fixed `Math.floor` → `Math.ceil` — confirmed from 4 data points. |
| 2.1 | Sprints 28–30 | Animated splash + per-tab background art. Focused coach scan fix (normalise OCR case). Concatenated role token greedy parser. GK category always-reload fix. `drillLevelMult` removed from coach projection (coaches use 1.0, not VH×1.7). `drillXpFactor = 0.3` added for drill budget scaling. Coaches tab tier section removed. Results tab rewritten as combined drill+coach+tier hub with history pickers. `coachHistoryService` + `drillPlanHistoryService` + new DB tables. LJDark Leo ×114 Extensive GK at bXPS=220 gives 143→191 OVR match (pre-recalibration). |
| 2.2 | Sprints 31–32 | **Sprint 31:** `baseXpPerSession` recalibrated 220→450 (exponential model re-baseline from 4 data points). Coaches tab crash on sessions input fixed (stale `setSelectedTier`). CROSSING detection fixed (secondary embedded-stat scan). DMC STRENGTH moved to secondary. `OCR_STAT_CORRECTIONS` for TACKLING misreads. Three new calibration players: Cptn Dallas, Rayne, age-24 DMC. **Sprint 32:** `customCoachEngine.ts` rewritten — deprecated `calculateDynamicGain` shim replaced with `estimateStatGainPct`; `PlayerStats` gains `statValue`+`talent`; function gains `profile` parameter. Branch transition to `claude/test-connection-I2s8B`. |
| 2.3 | Sprint 33 | OVR formula fixed `Math.ceil` → `Math.floor` (confirmed clean integer tier upgrade). Duplicate stat capture fixed (Map-based dedup + nearest-number baseline). Safeguard category corrected to DEF stats. Standard/Extensive full-category override (arrow-only rows excluded from OCR count). Reward Coach detection (`isRewardCoach`). `bXPS` recalibrated 450→676 (Grant ×40 all 5 stats). K re-fitted 55→47 (CV minimisation across 5 Grant observations). `greyWeightMultiplier` confirmed 0.22. Garry McCluskey (age 24) + King Alfie seeds added. ageMult=0.72 confirmed for age 24. Training Camp detection + sentinel. |
| 2.4 | Sprint 34 | `sessionBudgetDecay = 0.99` confirmed from Jables JaseysBoi ×114 actual result 173 OVR (geometric model error −1 ✓, linear error +9 ✗). ×N anomaly resolved. Slow (0.47) invalidated — derived from linear budget; player consistent with Normal under geometric model. Scan-ranges bypass removed from `runProjection` — formula works for blank-coach scans. CI syntax fix (`coaches.tsx:227`). |
| 2.5 | Sprint 35 | Player identity corrected: `ljdark_leo` → Jables JaseysBoi (formerly Lewis MacGregor; same player, account renamed). Gillespie identified as the player called "LJDark Leo" (no observations). Nerimala (G Neri) full name + talent Normal ✅ confirmed from edit screen; 15 stats rescanned. Slow ×0.47 invalidated everywhere; `game_2025.json` Slow reverted to 0.70 (community estimate, informational). K=47 fails at stat ≥ 300: Nerimala Focused ×4 at stat=330 implies K≈76; no engine change yet. Focused-coach cross-column OCR bleed fixed (`coachScanner.ts`): category filter in primary loop prevents DEF-column stat picking up PHY-column gain range. 11/11 GK stat projections confirmed in-range for Jables ×114 session. |

---

## 13. Coaches Tab and Results Hub (Sprint 30)

### 13.1 SESSION SIMULATOR (Coaches tab)

`app/(tabs)/coaches.tsx` — models the effect of a coaching block on a single player. The user specifies:
- **Subject** — player from squad
- **Stat coverage** — 3-column grid. White stats section + Grey/Non-role section. Tap to toggle. Counter shows total selected.
- **Sessions ×N** — how many coaching sessions (e.g. ×30 Standard Attacking, ×114 Extensive GK)
- **Talent** — read from player card (`player.talent`); no per-session dropdown

**No tier section.** The Coaches tab was stripped of its tier upgrade section in Sprint 30. Tier upgrade is available only in the Results tab.

**No intensity row.** Coaches have no adjustable drill level. `drillLevelMult = 1.0` is always used.

The **2× AD multiplier** is absent. The 2× ad boost applies only to Teamplay drills, not Academy coaching. The engine hardcodes `twoxAd = false` for all coach projections.

Output: per-stat gains (float), OVR before/after banner.

**APPLY TO PLAYER CARD** writes post-coach stats + updated OVR back to the player's DB record.

**Auto-save to history:** Each coach scan/projection automatically saves to `coach_scan_history` via `coachHistoryService`. Saved entries appear as selectable items in the Results tab COACHING SESSIONS section.

**GK category:** Tapping the GK category button always loads all 11 GK stats — it does NOT toggle off if already selected (Sprint 30 fix). This ensures a re-tap after a partial scan forces a full reload.

### 13.2 RESULTS HUB (Sprint 30 — full rewrite)

`app/(tabs)/results.tsx` is the single authoritative combined plan view. Four sections:

1. **DRILL PLANS** (amber) — select from `drill_plan_history` entries pushed from the Drills tab. Up to 10. Each shows preset name, drill count, cycles. Tap to add/remove.
2. **COACHING SESSIONS** (steel) — select from `coach_scan_history` entries. Up to 5. Each shows stat count, session count.
3. **TIER UPGRADE** — standard tier picker + points input (same as before).
4. **CONDITION RESTORE** — restorer count input.

**Projection order:** Drill Plans → Coach Sessions → Tier → Condition (drills-first rule enforced by structure).

**PROJECT** runs the chain, producing a per-step OVR breakdown. **ADD TO ROSTER** applies the final stats, OVR, and tier back to the player record in one tap.

**Drill budget in projection:**
```
budget = plan.cycles × baseXpPerSession × drillXpFactor / drill.stats.length
drillLevelMult = profile.drillLevelMultipliers[drill.intensity]
```

**Coach budget in projection:**
```
effectiveSessions = (1 − 0.99^N) / (1 − 0.99)
budget = effectiveSessions × baseXpPerSession / entry.stats.length
drillLevelMult = 1.0
```

### 13.3 Stat Grid Visual Design

All screens that display individual stats use a three-column colour language — DEF (Defending), ATT (Attacking), PHY (Physical). Each stat is permanently assigned to exactly one column regardless of which screen it appears on or whether it is white or grey for the current player.

| Column | Hex | Stats |
|---|---|---|
| DEF | `#4A7FC1` | TACKLING, MARKING, POSITIONING, HEADING, BRAVERY, REFLEXES, AGILITY, ANTICIPATION, RUSHING OUT, COMMUNICATION |
| ATT | `#7C3AED` | PASSING, DRIBBLING, CROSSING, SHOOTING, FINISHING, THROWING, KICKING, PUNCHING, AERIAL REACH, CONCENTRATION |
| PHY | `#C05621` | FITNESS, STRENGTH, AGGRESSION, SPEED, CREATIVITY |

**Rendering convention:**
- Each stat cell carries a 2px left border in its column colour.
- White (essential) stats: border and label at full column colour, value in foreground ink.
- Grey (secondary/non-role) stats: border at `cc + '44'` (dimmed), label in `inkMuted`, value muted.
- Selected state (Coaches stat grid): full column colour for all border, background tint, label and value text.

This convention is implemented via a `statColor(stat)` helper and `STAT_COLS`/`COL_COLORS` constants declared locally in each stat-rendering file. The columns do not change per role — they are fixed to the stat, not the player. The white/grey distinction (which varies by role) is layered on top via brightness/opacity only.

### 13.4 COACH SESSION CAPTURE (`/coach/capture`)

`app/coach/capture.tsx` — calibration data logger. Lets the user enter what the confirmed coach preview shows (per-stat gain ranges) and saves the data for reference.

**Sections:**
1. **Coach Type** — TYPE (STANDARD / FOCUSED / EXTENSIVE) + CATEGORY (ATTACKING / DEFENDING / PHYSICAL / SAFEGUARD) + MULTIPLIER ×N
2. **Player Card** — squad auto-fill chip row. Selecting a player copies OVR, age, talent, and all stats from the player card. White/grey classification is derived from the player's role via `getWhiteStatKeys` / `getAllStatKeys`.
3. **Highlighted Stats** — tap any stat to expand it. Enter CURRENT value (pre-filled from card) + +GAIN LO and +GAIN HI observed in the game preview. OVR BOOST LO/HI panels auto-calculate using `computeOvrWithPadding`.
4. **Actions** — SAVE TO LOG (persists run to Squad Plan), PROJECT (navigates to Coaches tab).

Stat classification in the Capture screen correctly reflects the selected player's role — white stats show under WHITE — ESSENTIAL, grey under GREY — SECONDARY / NON-ROLE.

### 13.4 History Services (Sprint 30)

Two new services bridge the Drills/Coaches tabs to the Results hub:

**`src/services/coachHistoryService.ts`** — `CoachHistoryEntry` type, `save()`, `getForPlayer()`. Backed by `coach_scan_history` table (ensured idempotently in `src/db/index.ts`). The Coaches tab auto-saves each projection run here. The Results tab reads it to populate the COACHING SESSIONS picker.

**`src/services/drillPlanHistoryService.ts`** — `DrillPlanEntry` type, `save()`, `getForPlayer()`. Backed by `drill_plan_history` table. The Drills tab calls `pushToResults()` which saves the active preset here. The Results tab reads it to populate the DRILL PLANS picker.

**Legacy:** `squad_plan_runs` table (migration 0004) is retained for DB backward compatibility. `squadPlanService` is still in place. The Coaches SAVE RUN button still writes to this table for reference history.
