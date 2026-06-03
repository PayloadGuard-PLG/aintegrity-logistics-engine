# Squad Optimiser — Formula Reference

All constants live in `profiles/game_2025.json`. All formulas are implemented against those constants — changing a value in the JSON changes behaviour app-wide with no code edits required.

---

## 1. OVR (Overall Rating)

```
OVR = floor( sum(all 15 stats) / totalAttributeCount )
```

| Constant | JSON key | Value |
|---|---|---|
| totalAttributeCount | `totalAttributeCount` | 15 |

**Source:** `qualityOvrDivisor = 1` — unweighted mean, truncated (floor). Confirmed Sprint 32 from Grant T2→T3 clean tier upgrade: displayed stats sum to 2615, game OVR = 174. `floor(2615/15) = floor(174.33) = 174` ✓. `ceil` gives 175 ✗. Sprint 27's apparent `ceil` confirmation was an artefact of fractional stat accumulation from training — the internal sum was slightly higher than displayed, making floor and ceil coincide for those points. Fixed in `qualityPctToOvr()` in `xpEngine.ts`.

**Training lock:** When `floor(sum / 15) >= maxBaseOvr (180)`, drills and academy coaching are locked. Tier bonuses push displayed OVR well above 180 — the lock is on the base (pre-tier) mean, not the displayed total.

---

## 2. Stat Gain (XP Engine)

### 2.1 XP budget per stat — coach session

```
effectiveSessions = (1 − decay^N) / (1 − decay)
budget = effectiveSessions × baseXpPerSession / selectedStats.count
```

| Constant | JSON key | Value |
|---|---|---|
| baseXpPerSession | `baseXpPerSession` | 676 |
| sessionBudgetDecay | `sessionBudgetDecay` | 0.99 |

Each successive session of the same coach delivers `0.99×` the previous session's XP. `effectiveSessions` converges to `1 / (1 − 0.99) = 100` for very large N.

Effective session counts at key N values:

| Sessions (N) | Effective | vs Linear |
|---|---|---|
| 4 | 3.94 | −1.5% (negligible) |
| 40 | 33.1 | −17% |
| 114 | 68.2 | −40% |

Example: 5-stat coach block for ×40 sessions: `33.1 × 676 / 5 = 4,476 XP per stat`.

**Calibration:** `baseXpPerSession = 676` — confirmed Sprint 33 from Grant ×40 Standard Defending (all 5 stats within game range). `sessionBudgetDecay = 0.99` — confirmed Sprint 34 from LJDark Leo ×114 Extensive GK: linear model projects 182 OVR (actual 173, error +9 ✗); geometric model (68.2 effective) projects 172 OVR (error −1 ✓).

### 2.2 XP budget per stat — drill session

```
budget = cycles × baseXpPerSession × drillXpFactor / drill.stats.length
```

| Constant | JSON key | Value |
|---|---|---|
| drillXpFactor | `drillXpFactor` | 0.3 (provisional — uncalibrated) |

Drills award significantly less XP per session than academy coaches. The `drillXpFactor` scales the budget down from the coach baseline. Current value 0.3 is provisional — needs actual before/after stat data from a controlled drill run to back-calculate the true factor.

### 2.3 XP cost per 1% stat gain

```
xpCost = xpBase(statValue) / ( ageMult × talentMult × greyMult × adMult × drillLevelMult )
```

Each factor:

| Factor | Source | Notes |
|---|---|---|
| `xpBase(statValue)` | exponential formula (§2.4) | Base cost (XP per 1%) at current stat value |
| `ageMult` | `ageTable[age]` | See §2.6 |
| `talentMult` | `talentMultipliers[talent]` | Fastest=1.5 … Slow=0.47 |
| `greyMult` | `greyWeightMultiplier` | 1.0 if white (essential), 0.22 if grey |
| `adMult` | `twoxAdMultiplier` | 2.0 if 2× ad active, else 1.0 |
| `drillLevelMult` | drill intensity (§2.7) or 1.0 for coaches | Fixed per drill; coaches always 1.0 |

**Coach sessions:** `drillLevelMult = 1.0` — coaches have no adjustable intensity. The engine hardcodes 1.0 for all coach projections regardless of drill level multiplier tables.

### 2.4 XP cost model — exponential

```
xpBase(stat) = C₀ × exp(stat / K)

C₀ = 2.94   (xpCostBase in game_2025.json)
K  = 47      (xpCostDecayK — cost doubles every ~33 stat points)
```

Derived from two independent calibration points:
- **Gain ratio (Sprint 25):** Tackling 120 vs Positioning 228 in same budget → ratio 4.89. `exp((228−120)/K) = 4.89` → K=55. Later superseded.
- **CV minimisation (Sprint 33):** 5 Grant ×40 Standard Defending observations; K=47 minimises coefficient of variation (CV=3.2%) across all 5 stats. K=47 adopted as confirmed ✅.

| Stat | xpBase (K=47) |
|---|---|
| 60 | ~10.2 XP/1% |
| 120 | ~35.3 XP/1% |
| 180 | ~121 XP/1% |
| 228 | ~350 XP/1% |
| 260 | ~641 XP/1% |

**Fallback:** If `xpCostBase` / `xpCostDecayK` absent, falls back to stepped `xpCostTable` in JSON.

### 2.5 Stepped XP cost table (fallback / reference)

| Stat range | XP per 1% |
|---|---|
| 0–59 | 8 |
| 60–79 | 10 |
| 80–99 | 20 |
| 100–119 | 30 |
| 120–139 | 40 |
| 140–159 | 50 |
| 160–179 | 60 |
| 180–199 | 80 |
| 200–219 | 150 |
| 220–239 | 200 |
| 240–259 | 260 |
| 260–279 | 340 |
| 280–339 | 440 |

Values above 200 raised Sprint 24 from empirical evidence (Aggression 201 gaining only 14–21 pts, Creativity 256 gaining only 5–7 pts despite high budget). Exponential model supersedes this table.

### 2.6 Age multipliers (confirmed — game_2025.json)

| Age | Multiplier |
|---|---|
| 17 | 1.10 |
| 18 | 1.00 |
| 19 | 1.00 |
| 20 | 1.00 |
| 21 | 0.85 |
| 22 | 0.85 |
| 23 | 0.85 |
| 24 | 0.72 |
| 25 | 0.72 |
| 26 | 0.61 |
| 27 | 0.61 |
| 28 | 0.61 |
| 29 | 0.50 |
| 30+ | 0 (clamped) |

### 2.7 Drill level multipliers (XP — fixed per drill)

Each drill has one fixed intensity. The multiplier scales the XP yield:

| Level | XP multiplier |
|---|---|
| Very Easy | 1.00 |
| Easy | 1.15 |
| Medium | 1.30 |
| Hard | 1.55 |
| Very Hard | 1.70 |

**These do NOT apply to coach sessions.** Coaches always use `drillLevelMult = 1.0`.

### 2.8 Talent multipliers

| Talent | Multiplier |
|---|---|
| Fastest | 1.50 |
| Fast | 1.25 |
| Average | 1.10 |
| Normal | 1.00 |
| Slow | 0.47 |

Normal confirmed for Ricky Grant and Ryan Rogers (Sprint 26). Slow (0.47) was derived Sprint 33 from LJDark Leo ×114 GK using the **linear** budget model — **invalidated Sprint 34**. With geometric budget (`sessionBudgetDecay=0.99`), LJDark Leo's result is consistent with Normal (1.0). Slow has no confirmed data point. Do not present 0.47 as calibrated. Fastest/Fast are community estimates — all three (Slow/Fast/Fastest) require confirmed-talent players tested under the geometric budget model.

### 2.9 Gain iteration

The engine iterates 1% at a time, subtracting `xpCost` from `budget` until the budget is exhausted:

```
remaining = budget
while remaining > 0:
    cost = xpCost(currentStat, age, talent, greyMult, adMult, drillLevelMult)
    if cost > remaining: gain += remaining / cost; break
    remaining -= cost
    currentStat += 1
    gain += 1
```

Sub-integer progress carries forward as a fractional remainder.

---

## 3. Condition Loss per Drill

```
conditionLoss = baseLossPerDrill × condLevelMultipliers[drillLevel] × ( 1 − fanClubCondReduction[fanLevel] )
```

| Constant | JSON key | Value |
|---|---|---|
| baseLossPerDrill | `baseLossPerDrill` | 0.75 |
| condLevelMultipliers | `condLevelMultipliers` | VE=1, Easy=2, Medium=3, Hard=4, VH=5 |
| fanClubCondReduction | `fanClubCondReduction` | [0.10, 0.15, 0.20, 0.25, 0.50] (L0–L4) |

**Note:** `condLevelMultipliers` and `drillLevelMultipliers` are separate tables with different purposes. Condition drain and XP gain are independent systems.

### 3.1 Zero-drain threshold

```
isZeroDrain = conditionLoss < zeroDrainThreshold
```

| Constant | JSON key | Value |
|---|---|---|
| zeroDrainThreshold | `zeroDrainThreshold` | 0.38 |

Only Very Easy + L4 qualifies: `0.75 × 1 × (1 − 0.50) = 0.375 < 0.38` → shown as 0% in-game.

### 3.2 Drill condition reference table

| Level | L0 (−10%) | L1 (−15%) | L2 (−20%) | L3 (−25%) | L4 (−50%) |
|---|---|---|---|---|---|
| Very Easy | 0.675% | 0.638% | 0.600% | 0.563% | **0.375%** → 0 |
| Easy | 1.350% | 1.275% | 1.200% | 1.125% | 0.750% |
| Medium | 2.025% | 1.913% | 1.800% | 1.688% | 1.125% |
| Hard | 2.700% | 2.550% | 2.400% | 2.250% | 1.500% |
| Very Hard | 3.375% | 3.188% | 3.000% | 2.813% | 1.875% |

---

## 4. Condition Restore

```
conditionRestored = restorers × conditionPerRestorer
```

| Constant | JSON key | Value |
|---|---|---|
| conditionPerRestorer | `conditionPerRestorer` | 15 (%) |

Restorers restore condition only. Zero OVR change.

---

## 5. Tier Bonus

Applied after all drills. Affects white (essential) stats only.

### 5.1 Per-step attribute increment

```
increment = tierAttrAdditions[targetTier] − tierAttrAdditions[fromTier]
```

Explicit per-step increments (JSON `tierIncrements`):

| Upgrade | Internal | Game name | Increment per white stat |
|---|---|---|---|
| T0 → T1 | Rare | +10 |
| T1 → T2 | Elite | +20 |
| T2 → T3 | Stellar | +20 |
| T3 → T4 | Master | +30 |
| T4 → T5 | Epic | +40 |
| T5 → T6 | Legendary | +40 |

Cumulative from T0 (`tierAttrAdditions`): T1=+10, T2=+30, T3=+50, T4=+80, T5=+120, T6=+160.

### 5.2 OVR impact of a tier upgrade

```
OVR delta = increment × whiteStatCount / totalAttributeCount
```

| Upgrade | White stats | OVR delta |
|---|---|---|
| T1 on ST (9 white) | +10 × 9 | +6.0 |
| T3 on ST (9 white) | +20 × 9 | +12.0 |
| T3 on DC (5 white) | +20 × 5 | +6.7 |
| T3 on MC (10 white) | +20 × 10 | +13.3 |
| T6 on GK (11 white) | +40 × 11 | +29.3 |
| T6 on MC (10 white) | +40 × 10 | +26.7 |

### 5.3 Tier point costs

| Tier | Internal | Points required |
|---|---|---|
| Rare | T1 | 100 |
| Elite | T2 | 90 |
| Stellar | T3 | 50 |
| Master | T4 | 25 |
| Epic | T5 | 15 |
| Legendary | T6 | 10 |

Each tier has its own independent point pool. Points for Rare cannot be used for Elite, etc.

---

## 6. Drills-First Rule

```
optimal order: Drill Plans → Coach Sessions → Tier upgrade → Restorers
```

Tier upgrades raise the base stat value of white stats permanently. Any training done afterwards costs more XP per gain. Running drills and coaches first maximises total stat gain per resource unit.

The Results tab enforces this ordering in its projection chain.

---

## 7. Coach / Academy Session Model

Academy coaches use the XP formula with `drillLevelMult = 1.0` (no intensity adjustment):

```
budget = sessionCount × baseXpPerSession / selectedStats.count
xpCost = xpBase(statValue) / ( ageMult × talentMult × greyMult × 1.0 × 1.0 )
```

- `twoxAd = false` always (2× ad applies to teamplay drills only)
- No intensity level — `drillLevelMult = 1.0` hardcoded
- `selectedStats.count` = number of stats the coach covers (typically 3–11 depending on type)

---

## 8. Multi-Role White Stat Union

When a player has 2–3 roles, the white stat set is the union of all roles' essential lists:

```
whiteStats = ROLE_CONSTRAINTS[role1].essential
           ∪ ROLE_CONSTRAINTS[role2].essential   (if present)
           ∪ ROLE_CONSTRAINTS[role3].essential   (if present)
```

**White stat counts by role** (affects tier OVR delta via §5.2):

| Role | White count |
|---|---|
| ST | 9 |
| GK | 11 |
| AMC | 8 |
| AML | 8 |
| AMR | 8 |
| ML | 7 |
| MR | 7 |
| MC | 10 |
| DMC | 10 |
| DC | 5 |
| DL | 8 |
| DR | 8 |

---

## 9. End-to-End Projection Chain (Results tab)

```
Step 1: Apply drill plans   → new stats after XP gain (drillXpFactor applied)
Step 2: Apply coach sessions → new stats after XP gain (drillMult = 1.0)
Step 3: Apply tier upgrade  → white stats += increment
Step 4: Recalculate OVR     = ceil( sum(all 15 updated stats) / 15 )
Step 5: Restorers           = condition step (zero OVR change)
```

Multiple drill plans and coach sessions can be chained before tier:

```
Drill Plan 1 → Drill Plan 2 → Coach Session 1 → Coach Session 2 → Tier → Restorers
OVR₀ → OVR₁ → OVR₂ → OVR₃ → OVR₄ → OVR_final
```

All five stages are assembled in the **Results** tab (the only place to combine all resource types).

---

## 10. Teamplay Decay (reference only — not modelled in engine)

```
pillar score decreases by teamPlayDecayPerDay per day
pillarCap = pillarLevel × 2 + 10
```

| Constant | JSON key | Value |
|---|---|---|
| teamPlayDecayPerDay | `teamPlayDecayPerDay` | 2 |
| teamPlayFreeDrillsPerDay | `teamPlayFreeDrillsPerDay` | 4 |
| matchAdvisorMultiplier | `matchAdvisorMultiplier` | 1.5 |
