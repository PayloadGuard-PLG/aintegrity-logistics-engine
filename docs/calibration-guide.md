# Calibration Guide — Plain English

> **Who this is for:** Anyone setting up the app for a new domain, or investigating why
> projections are higher or lower than actual results. No technical background required.

---

## What Is Calibration?

The app projects what will happen to an asset's metrics if you invest in it — before you
commit the investment. For those projections to be trustworthy, the app needs to know how
your specific assets actually respond to investment. That knowledge lives in a single file:
`profiles/logistics_v1.json` (or whatever your profile is named).

**Calibration** is the process of setting the numbers in that file so that the app's
projections match what you actually observe in the field.

A poorly calibrated app is worse than no app — it gives you confident wrong answers.
A well-calibrated app tells you, reliably: "if you run this maintenance cycle, that
asset's reliability score will increase by approximately 12 points."

---

## The Golden Rule

> **Always calibrate from real observations.** Never guess, never copy numbers from
> another domain, never use a manufacturer's theoretical specification as a confirmed value.
>
> An observation is: "Before the maintenance event, the metric was X. After, it was Y."
> That's it. Two numbers and a known maintenance type.

---

## The Parameters — What Each One Does

There are ten parameters you can calibrate. They fall into four groups:

| Group | Parameters | What they control |
|---|---|---|
| **Budget** | `baseXpPerSession`, `sessionBudgetDecay` | How much investment capacity a cycle generates |
| **Cost curve** | `xpCostBase` (C₀), `xpCostDecayK` (K) | How expensive it gets to improve an asset at higher metric values |
| **Asset factors** | `ageTable`, `talentMultipliers`, `greyWeightMultiplier` | How efficiently a specific asset converts investment into improvement |
| **Degradation & readiness** | `seasonDecayPerLevel`, `condLevelMultipliers`, `maxBaseOvr` | How assets degrade over time and how readiness is consumed |

---

## Parameter 1 — Investment Budget per Cycle (`baseXpPerSession`)

### What it does

This is the total investment capacity one cycle generates, before it is divided across the
metrics being targeted. Think of it as the "size of the bucket" each maintenance session
fills.

### The default

The source system uses **676** (empirically confirmed). For a new domain, treat this as
assumed until you calibrate it.

### How it affects projections

| `baseXpPerSession` too LOW | `baseXpPerSession` too HIGH |
|---|---|
| App predicts smaller gains than you actually see | App predicts larger gains than you actually see |
| Projections consistently under-shoot | Projections consistently over-shoot |
| Same direction error across all assets, all metrics | Same direction error across all assets, all metrics |

**Key sign:** If every projection is wrong by roughly the same percentage (e.g. app says
+8 but you always get +12), the budget parameter is the likely cause — not the cost curve.

### How to calibrate it

**What you need:** One controlled observation — one asset, one maintenance cycle, one
metric you measured before and after.

**Step 1.** Before the maintenance cycle, record the metric value. Call it `m_before`.

**Step 2.** Run the maintenance cycle. Afterwards, record the metric value. Call it `m_after`.
The gain is `Δm = m_after − m_before`.

**Step 3.** Open the profile file. Find `baseXpPerSession`. Adjust it up or down and
re-run the projection until the app predicts a number close to `Δm` for that observation.

**Step 4.** Confirm with a second observation on a different asset (same maintenance type).
If the same value works for both, mark it ✅ Confirmed. If it only fits one, mark it ⚠️ Provisional.

**Rule of thumb for adjustment:**
- App projects 20% too low → increase `baseXpPerSession` by ~20%
- App projects 20% too high → decrease `baseXpPerSession` by ~20%

---

## Parameter 2 — Cost Curve Base (`xpCostBase`, also called C₀)

### What it does

This controls the starting cost of improving a metric when it is at its lowest value.
A low metric value (e.g. Reliability = 20) costs less to improve than a high value
(e.g. Reliability = 180). `xpCostBase` sets the baseline cost at the bottom of the scale.

You do not calibrate this in isolation — it is always calibrated together with the
cost curve shape (K, see Parameter 3).

### How it affects projections

| C₀ too LOW | C₀ too HIGH |
|---|---|
| App predicts too much gain at ALL metric levels | App predicts too little gain at ALL metric levels |
| Over-predictions are proportionally equal across low and high metrics | Under-predictions are proportionally equal |

### How to calibrate it (with K, together)

See Parameter 3 — C₀ and K are always calculated as a pair.

---

## Parameter 3 — Cost Curve Shape (`xpCostDecayK`, also called K)

### What it does

This controls how steeply the cost of improvement rises as a metric gets higher. It is the
most important calibration parameter because it determines the shape of the entire
improvement curve.

- **Small K** (e.g. K = 20): Cost rises very steeply. An asset at metric 100 is dramatically
  harder to improve than one at metric 50. High-value assets barely improve.
- **Large K** (e.g. K = 200): Cost rises slowly. The improvement curve is nearly flat.
  High-value assets improve almost as easily as low-value ones.

The source system uses **K = 47** (confirmed from field observations). This means the cost
of improving a metric roughly doubles every 33 metric points.

### How it affects projections

| K too SMALL | K too LARGE |
|---|---|
| High-metric assets: huge under-predictions | High-metric assets: huge over-predictions |
| Low-metric assets: roughly correct or slight over-prediction | Low-metric assets: roughly correct or slight under-prediction |
| The error gets worse as metric value increases | The error gets worse as metric value increases |

**Key sign for K being wrong:** The size of the prediction error depends on the metric
value. Small errors at low metric values, large errors at high metric values = K is wrong.
If errors are consistent regardless of metric value, K is probably fine and the budget
parameter is the issue.

### How to calibrate C₀ and K together

**What you need:** Two observations on the **same** asset class, same maintenance type,
but different metric values.

Example:
- Observation A: Metric = 80, single maintenance cycle → gain of +18
- Observation B: Metric = 140, same maintenance cycle → gain of +7

**Step 1.** Calculate the gain ratio: `18 / 7 = 2.57`

**Step 2.** Calculate K using the formula:
```
K = (metric_B − metric_A) / ln(gain_A / gain_B)
K = (140 − 80) / ln(2.57)
K = 60 / 0.944
K = 63.6  →  round to 64
```

**Step 3.** Once K is known, calculate C₀ from one observation.
This is done by the back-calculation tool or by trial-and-error in the profile:
adjust C₀ until the app correctly predicts Observation A's gain. Observation B should
then also be correct (within ±10%) because K was derived from their ratio.

**Step 4.** Mark both C₀ and K as ⚠️ Provisional after one pair of observations.
Confirm with a second independent pair from a different asset. If both pairs give
consistent K values (within ±15%), mark ✅ Confirmed.

### Quick verification

After updating C₀ and K, run projections for three assets at different metric values.
Plot actual vs projected. If the projections are consistently above or below the actuals
by the same amount across all metric values, adjust `baseXpPerSession`. If the error
grows with metric value, adjust K. If the error is proportional to the metric value
itself, adjust C₀.

---

## Parameter 4 — Session Budget Decay (`sessionBudgetDecay`)

### What it does

When you run multiple consecutive cycles on the same asset, the investment budget does
not simply multiply. Each additional cycle yields slightly less than the one before it.
This decay factor (default: 0.99) means each cycle delivers 99% of the budget the previous
one delivered.

This matters for long investment runs. Ten cycles at 0.99 decay delivers about 9.56 cycles
worth of budget, not 10. A hundred cycles delivers about 63.4 cycles worth — not 100.
This is why doubling the number of cycles does not double the gain.

### The confirmed default

**0.99** — confirmed in the source system from a 114-cycle investment run. The linear
model (no decay) over-predicted by +9 CCI. The geometric model (decay = 0.99) was off by
only −1. **Do not change this value without a long-run empirical test.**

### How it affects projections

| `sessionBudgetDecay` too LOW (e.g. 0.95) | `sessionBudgetDecay` too HIGH (e.g. 1.0) |
|---|---|
| Long runs dramatically under-predict | Long runs over-predict (linear model) |
| Short runs (1–5 cycles) are barely affected | Short runs are barely affected |
| Errors grow rapidly with number of cycles | Errors grow with number of cycles |

**Key sign:** Short-run projections accurate but long-run projections wrong = decay is
miscalibrated. To test: compare a 5-cycle and a 50-cycle projection against actual results.
If the 5-cycle is accurate but the 50-cycle overshoots, decay is too high (or = 1.0).

### How to calibrate it

**What you need:** One long-run observation — 20+ cycles on a single asset, measured
before and after.

**Step 1.** Record the metric value before and after the multi-cycle investment run.
Note the number of cycles (N).

**Step 2.** Calculate the effective sessions:
```
effective_sessions = (1 − decay^N) / (1 − decay)
```

Try different decay values (0.97, 0.98, 0.99, 0.995, 1.0) until the projected gain
matches the actual. The value that gives the closest match is your calibrated decay.

**Step 3.** Cross-check with a short run (4–5 cycles). If both fit, mark ✅ Confirmed.

**Example:**
- 50 cycles, decay = 0.99 → effective sessions = (1 − 0.99^50) / 0.01 = 39.4
- 50 cycles, decay = 1.00 → effective sessions = 50 (linear)
- If actual gain matches 39.4 sessions of budget, use 0.99. If it matches 50, use 1.0.

---

## Parameter 5 — Maturity Multipliers (`ageTable`)

### What it does

Different assets respond to investment at different rates depending on how old or mature
they are. A newer asset (or a younger worker) may improve faster. An older, well-worn
asset may respond more slowly to the same investment.

The `ageTable` is a lookup table that maps maturity level to an efficiency multiplier.
A multiplier of 1.0 = baseline rate. A multiplier of 0.72 means the asset gains 72% as
much from the same investment compared to a baseline asset.

### Default structure

```json
"ageTable": {
  "0":  1.0,
  "1":  1.0,
  "2":  0.95,
  "3":  0.85,
  "4":  0.72
}
```

The numbers here are placeholders for a new domain. Only the source system's values
are empirically confirmed.

### How it affects projections

| Maturity multiplier too HIGH for a given level | Maturity multiplier too LOW for a given level |
|---|---|
| App over-predicts gains for assets at that maturity level | App under-predicts gains for assets at that maturity level |
| Other maturity levels are unaffected | Other maturity levels are unaffected |

**Key sign:** Projections accurate for some assets but consistently wrong for others,
and the assets where it's wrong share the same maturity level.

### How to calibrate it

**What you need:** One controlled observation per maturity bracket you want to calibrate.
To calibrate the multiplier for maturity level 3, you need an asset at level 3 with a
known before/after observation.

**Step 1.** Identify which maturity bracket you are calibrating. Use an asset whose
maturity is known.

**Step 2.** Temporarily set `ageTable[<level>] = 1.0` (baseline). Run the projection.
Note what the app predicts.

**Step 3.** The actual gain divided by the baseline projection gives you the multiplier:
```
multiplier = actual_gain / projection_at_multiplier_1.0
```

**Step 4.** Set `ageTable[<level>]` to this value. Re-run projection — it should now
match the actual observation.

**Example:**
- Asset at maturity 3. Baseline projection (multiplier 1.0) = +25 points.
- Actual gain observed = +18 points.
- Multiplier = 18 / 25 = **0.72**. Set `ageTable["3"] = 0.72`.

**Step 5.** Confirm with a second asset at the same maturity level. If both observations
give a consistent multiplier (within ±15%), mark ✅ Confirmed.

---

## Parameter 6 — Efficiency Class Multipliers (`talentMultipliers`)

### What it does

Some assets of the same type are simply better at converting investment into improvement.
A high-grade vehicle may respond faster to maintenance. A highly skilled worker may learn
faster. These intrinsic efficiency differences are captured by the efficiency class
multiplier.

The class names (Fast, Normal, Slow, etc.) are labels you define for your domain. The
multipliers are what the calibration determines.

### Default structure

```json
"talentMultipliers": {
  "Class-A":   1.5,
  "Class-B":   1.25,
  "Standard":  1.0,
  "Degraded":  0.47
}
```

**Standard = 1.0** is always the baseline. Everything else is calibrated relative to it.

### How it affects projections

| Multiplier too HIGH for a class | Multiplier too LOW for a class |
|---|---|
| App over-predicts gains for all assets of that class | App under-predicts gains for all assets of that class |
| Standard-class assets are unaffected | Standard-class assets are unaffected |
| The error scales with investment size | The error scales with investment size |

### How to calibrate it

**Critical:** Before calibrating efficiency class multipliers, calibrate your budget
parameters (C₀, K, `baseXpPerSession`) against Standard-class assets first. Then use
those confirmed parameters to isolate the class multiplier.

**Step 1.** Take a Standard-class asset and run a projection. Confirm it is accurate.
This validates your base parameters.

**Step 2.** Take an asset in the class you want to calibrate (e.g. Class-A). Use the same
maintenance type.

**Step 3.** Run the projection with `Class-A multiplier = 1.0` (temporarily). Note the
baseline projection.

**Step 4.** Observe the actual gain from the maintenance cycle.

**Step 5.** Calculate the multiplier:
```
multiplier = actual_gain / baseline_projection
```

**Step 6.** Set the multiplier. Confirm with a second asset of the same class.

**Example:**
- Class-A asset. Baseline projection (multiplier 1.0) = +20 points.
- Actual gain = +31 points.
- Multiplier = 31 / 20 = **1.55**. Set `talentMultipliers["Class-A"] = 1.55`.

**Important:** Never calibrate a class multiplier from only one observation and mark it
Confirmed. With only one observation, the difference between "this is a Class-A asset"
and "this particular session had unusually good conditions" is indistinguishable.
Mark as ⚠️ Provisional until you have ≥2 independent observations.

---

## Parameter 7 — Secondary Metric Penalty (`greyWeightMultiplier`)

### What it does

Not all metrics respond equally to a given investment cycle. Some metrics are central to
an asset's primary function (primary / white metrics). Others are relevant but peripheral
(secondary / grey metrics). Improving a secondary metric costs more investment per point
gained — the improvement is less efficient.

`greyWeightMultiplier` is a fraction between 0 and 1 that reduces the effective budget
applied to secondary metrics. A value of 0.5 means secondary metrics cost twice as much
per point as primary metrics.

### The confirmed default

**0.22** (from the source system, back-calculated from specific observations). This may
be different for your domain. In many maintenance contexts, 0.5 (half efficiency) is a
reasonable starting assumption.

### How it affects projections

| `greyWeightMultiplier` too HIGH | `greyWeightMultiplier` too LOW |
|---|---|
| App over-predicts gains on secondary metrics | App under-predicts gains on secondary metrics |
| Primary metric projections are unaffected | Primary metric projections are unaffected |

**Key sign:** Primary metrics project accurately but secondary metrics are consistently
wrong in the same direction = this parameter is miscalibrated.

### How to calibrate it

**What you need:** One observation where a secondary metric was improved by a known
maintenance cycle, alongside a primary metric in the same cycle.

**Step 1.** Run a maintenance cycle that targets both a primary metric and a secondary metric.
Record before and after for both.

**Step 2.** Calculate what the app projects for the primary metric gain with
`greyWeightMultiplier = 1.0`. If your base parameters are calibrated, this should roughly
match the actual primary metric gain.

**Step 3.** Calculate what the app projects for the secondary metric gain with
`greyWeightMultiplier = 1.0`. It will over-predict (since secondaries are harder to improve).

**Step 4.** The multiplier is:
```
greyWeightMultiplier = actual_secondary_gain / projected_secondary_gain_at_1.0
```

**Example:**
- Primary metric (Reliability): projected +20 at multiplier 1.0. Actual: +21. ✓ Base OK.
- Secondary metric (LoadCapacity): projected +20 at multiplier 1.0. Actual: +11.
- greyWeightMultiplier = 11 / 20 = **0.55**

---

## Parameter 8 — Degradation Per Period (`seasonDecayPerLevel`)

### What it does

Without ongoing maintenance, assets degrade. This parameter controls how many points each
metric drops per idle period (one period might be one month, one quarter, or one season —
you define what a period means for your domain).

The default is **20 points per period**, which in the source system was confirmed as a flat
reduction (every metric drops by the same amount regardless of its current value).

### How it affects projections

| Too HIGH | Too LOW |
|---|---|
| App predicts more degradation than actually occurs | App predicts less degradation than actually occurs |
| Assets reach minimum thresholds faster than expected | Assets appear to hold their value longer than reality |

### How to calibrate it

**What you need:** Measure a set of metrics on an asset, leave it idle for one full period,
then measure again.

**Step 1.** Record all metric values before the idle period.

**Step 2.** After one complete period without any maintenance, record all metrics again.

**Step 3.** Calculate the average drop across all metrics.

**Step 4.** Set `seasonDecayPerLevel` to this average. If all metrics dropped by similar
amounts (flat decay), the default model is a good fit. If metrics dropped proportionally
to their value (e.g. high metrics dropped more), note this — the model may need adjustment.

**Important:** Check whether the degradation is flat (same number of points regardless
of metric value) or proportional (percentage of current value). The default model assumes
flat. If your domain shows proportional decay, flag this in `calibration_data.json` —
a model change may be needed.

---

## Parameter 9 — Readiness Drain (`condLevelMultipliers`)

### What it does

Conditioning operations (maintenance checks, calibration runs, readiness drills) consume
an asset's operational readiness. The intensity of the operation determines how much
readiness is consumed. Higher intensity = more drain.

`condLevelMultipliers` maps intensity levels to drain multipliers. The base drain is then
multiplied by the support level reduction (see `fanClubCondReduction` / support level below).

### Default structure

```json
"condLevelMultipliers": [1, 2, 3, 4, 5]
```

Level 1 (Very Easy) multiplies the base drain by 1. Level 5 (Very Hard) multiplies by 5.

### How to calibrate it

**What you need:** Measure the readiness percentage before and after a conditioning
operation at each intensity level, on an asset with no support level reduction (support
level 0).

**Step 1.** Record readiness % before the operation.

**Step 2.** Run the operation at intensity Level 1 (lowest). Record readiness % after.
The drop is your base drain at Level 1.

**Step 3.** Repeat for each intensity level. Calculate the multiplier as:
```
multiplier = drain_at_level_N / drain_at_level_1
```

**Step 4.** Update `condLevelMultipliers` with your values.

---

## Parameter 10 — Support Level Reduction (`fanClubCondReduction`)

### What it does

The support level an asset operates under can reduce the readiness drain from conditioning
operations. A well-supported asset can run more conditioning operations before needing
recovery.

### Default structure

```json
"fanClubCondReduction": [10, 15, 20, 25, 50]
```

Support Level 0 = 10% drain reduction. Support Level 4 = 50% drain reduction.

### The zero-drain threshold

When the calculated drain after applying support reduction falls below **0.38%**, the
operation is considered zero-drain (no readiness cost). This threshold is confirmed from
the source system. Only the lowest intensity operation at the highest support level hits
this threshold.

### How to calibrate it

**What you need:** Measure readiness drain at each support level while holding intensity
constant.

**Step 1.** Run the same intensity operation on the same asset at Support Level 0.
Record drain. This is your baseline.

**Step 2.** Increase support to Level 1. Run the same operation. Record drain.
Calculate reduction: `reduction% = 1 − (drain_level_1 / drain_level_0)`.

**Step 3.** Repeat for each support level.

**Step 4.** Update `fanClubCondReduction` with your observed reduction percentages.

---

## Parameter 11 — Investment Lock Ceiling (`maxBaseOvr`)

### What it does

When an asset's CCI (Composite Capability Index) reaches this ceiling, further investment
is blocked. The asset has reached maximum capability for its current classification.
Investment can resume after a classification upgrade or if degradation drops the CCI
below the ceiling.

### Default

**180** (confirmed from source system). For a new domain, this is the maximum CCI value
at which your investment operations are still available. Set it to the practical upper
limit for your asset class.

### How to determine it

Check the documentation or specifications for your asset class. What is the highest CCI
score that still permits maintenance investment? Set `maxBaseOvr` to that value. This is
typically a domain constraint, not something you calibrate empirically.

---

## The Invest-then-Upgrade Rule

**Always invest first. Always upgrade the classification after. This is the only valid order — the system enforces it.**

```
Step 1 — INVEST
  Asset CCI is below the ceiling (maxBaseOvr).
  Use the app to project investment outcomes before committing.
  Run the investment cycle(s).

Step 2 — NATURAL PROGRESSION (optional)
  In-service operation may further improve metrics up to the ceiling.
  This is not modelled by the engine — it is observed post-investment.

Step 3 — CCI LOCKS
  When base CCI reaches maxBaseOvr, further investment is blocked.
  The app shows this state; no more cycles can run.

Step 4 — CLASSIFICATION UPGRADE
  Upgrade the asset's lifecycle stage (tier up).
  Each upgrade adds a flat bonus to all primary metrics.
  Total CCI now exceeds maxBaseOvr — this is expected and correct.
  (e.g. an asset at CCI 180 base + Stage 3 bonus = CCI 238 total)
```

**Why the order cannot be reversed:** A classification upgrade raises the asset's total CCI above the ceiling. If you upgrade first, the base CCI calculation would be distorted by the upgrade bonus — and investment is locked because the total CCI exceeds `maxBaseOvr`. You cannot invest into an already-upgraded asset at ceiling. The game enforces this; the engine models it.

**Empirical confirmation — Jables (GK, Age 18):**

| Stage | Predicted | Actual |
|---|---|---|
| Base CCI before investment | 145 | 145 |
| After ×114 investment cycles | 172.5 | 173 |
| After natural in-service operation | — | ~180 (investment locked) |
| After T0→T2 (Stage 2) upgrade | 194 | 195–196 |
| After T2→T4 (Stage 4 / Master) upgrade | engine-checked | **238** |

Largest error: 0.5 CCI at the investment stage. Final 238 = `floor(3572/15)` ✓. All stages projected in advance without internal system access.

**Confirmed classification upgrade increments (source system):**

| Upgrade | Per-primary-metric increment | Cumulative from Stage 0 |
|---|---|---|
| Stage 0 → Stage 1 | +10 | +10 |
| Stage 1 → Stage 2 | +20 | +30 |
| Stage 2 → Stage 3 | +20 | +50 |
| Stage 3 → Stage 4 | +30 | +80 |
| Stage 4 → Stage 5 | +40 | +120 |
| Stage 5 → Stage 6 | +40 | +160 |

Grey / secondary metrics receive **zero** upgrade bonus at every stage. Only primary metrics are affected.

---

## Putting It Together — Calibration Sequence

When calibrating a new domain from scratch, work in this order:

```
1. Set K and C₀ (cost curve) — these set the curve shape
2. Set baseXpPerSession (budget) — this sets the overall scale
3. Confirm sessionBudgetDecay (0.99 is a strong default) — only change with long-run data
4. Set ageTable (maturity multipliers) — calibrate per maturity bracket
5. Set talentMultipliers (efficiency classes) — calibrate relative to Standard baseline
6. Set greyWeightMultiplier (secondary metric penalty)
7. Set seasonDecayPerLevel (degradation per idle period)
8. Set condLevelMultipliers + fanClubCondReduction (operational readiness drain)
9. Set maxBaseOvr (investment ceiling — usually a domain spec, not empirical)
```

Do not try to calibrate all parameters at once. Calibrate K and C₀ first. Then B.
Then the per-asset factors. Then the degradation and readiness parameters.

---

## Worked Example — Calibrating a New Domain from Scratch

**Domain:** Fleet of 12 maintenance vehicles. Metric: "Mechanical Reliability" (0–300 scale).
**Investment type:** Scheduled preventive maintenance, 4-hour session.
**Asset class:** Standard-grade vehicles.
**Support level:** None (level 0 for initial calibration).

---

### Step 1 — Collect two observations with different metric starting values

**Vehicle A:** Reliability before = 85. Run one maintenance session. Reliability after = 102.
Gain = **+17 points**.

**Vehicle B:** Reliability before = 155. Run one maintenance session. Reliability after = 165.
Gain = **+10 points**.

Both vehicles are confirmed Standard grade, both sessions were 4 hours.

---

### Step 2 — Calculate K

```
Gain ratio = 17 / 10 = 1.70
Metric difference = 155 − 85 = 70
K = 70 / ln(1.70) = 70 / 0.531 = 131.8  →  round to 132
```

Enter `"xpCostDecayK": 132` in your profile.

---

### Step 3 — Calculate C₀

With K = 132, back-calculate C₀ from Vehicle A's observation.
Adjust `xpCostBase` in the profile until the app projects approximately +17 for Vehicle A
at Reliability 85. (The exact calculation is iterative — use the app's projection screen
as your back-calculation tool.)

---

### Step 4 — Calculate baseXpPerSession

The projection for Vehicle A should now be close to +17. If the app is projecting +14
instead, it means the budget is 82% of what it should be (14/17 = 0.82).

Increase `baseXpPerSession` by the inverse: `current_value / 0.82`. Repeat until
Vehicle A projects approximately +17.

---

### Step 5 — Verify against Vehicle B

Check that the app now also projects approximately +10 for Vehicle B at Reliability 155.
If it does, both K and baseXpPerSession are well-calibrated for this asset class.

---

### Step 6 — Record in calibration_data.json

```json
{
  "observation_id": "001",
  "date": "2026-06-01",
  "asset": "Vehicle A",
  "asset_class": "Standard",
  "maturity_level": 2,
  "metric": "MechanicalReliability",
  "metric_before": 85,
  "metric_after": 102,
  "gain": 17,
  "session_type": "PreventiveMaintenance_4hr",
  "sessions": 1,
  "notes": "Controlled observation, confirmed Standard grade"
}
```

Mark C₀ and K as ⚠️ Provisional (one pair of observations). After two more independent
pairs, mark ✅ Confirmed.

---

## Diagnosing Wrong Projections

Use this table when the app's projections don't match reality:

| What you observe | Most likely cause | Which parameter to adjust |
|---|---|---|
| All projections too high by ~same % | Budget too large | Reduce `baseXpPerSession` |
| All projections too low by ~same % | Budget too small | Increase `baseXpPerSession` |
| Low-metric assets: accurate. High-metric: too high | K too large | Reduce `xpCostDecayK` |
| Low-metric assets: accurate. High-metric: too low | K too small | Increase `xpCostDecayK` |
| All projections wrong at same scale regardless of metric | C₀ wrong | Recalculate C₀ from K |
| Short runs accurate, long runs too high | Decay too high | Reduce `sessionBudgetDecay` |
| Short runs accurate, long runs too low | Decay too low | Increase `sessionBudgetDecay` |
| One maturity bracket consistently wrong | Maturity multiplier wrong | Recalibrate `ageTable[level]` |
| One asset class consistently wrong | Class multiplier wrong | Recalibrate `talentMultipliers[class]` |
| Primary metrics accurate, secondary wrong | Grey weight wrong | Recalibrate `greyWeightMultiplier` |
| Readiness drains faster than expected | Support reduction too small | Recalibrate `fanClubCondReduction` |
| No investment available when CCI is reasonable | Lock ceiling too low | Increase `maxBaseOvr` |

---

## Calibration Status — Tracking Your Progress

Maintain this table in `profiles/calibration_data.json` for your domain. Update it
after every new observation.

| Parameter | Current value | Status | Evidence |
|---|---|---|---|
| `xpCostDecayK` (K) | — | ⚠️ Assumed | Not yet calibrated |
| `xpCostBase` (C₀) | — | ⚠️ Assumed | Not yet calibrated |
| `baseXpPerSession` | — | ⚠️ Assumed | Not yet calibrated |
| `sessionBudgetDecay` | 0.99 | ✅ Confirmed | Inherited from source system — verify with long-run test |
| `ageTable` (each level) | — | ⚠️ Assumed | Calibrate per level |
| `talentMultipliers` | — | ⚠️ Assumed | Calibrate against Standard baseline |
| `greyWeightMultiplier` | 0.22 | ⚠️ Assumed | Inherited — verify with secondary metric observation |
| `seasonDecayPerLevel` | 20 | ⚠️ Assumed | Verify with one idle-period measurement |
| `condLevelMultipliers` | [1,2,3,4,5] | ⚠️ Assumed | Measure per intensity level |
| `fanClubCondReduction` | [10,15,20,25,50] | ⚠️ Assumed | Measure per support level |
| `maxBaseOvr` | 180 | ⚠️ Assumed | Set from domain spec |

**Status key:**
- ✅ Confirmed: ≥2 independent observations, consistent result
- ⚠️ Provisional: 1 observation
- ⚠️ Assumed: No observation — placeholder value

---

## What Happens in the Verification Layer

Every time you change a parameter in the profile, the proof suite re-checks 19 safety
properties. You do not need to understand the proofs — the key thing to know is:

**If you run `pytest tests/proofs/ -m proof -v` and a proof fails, the parameter you
changed violated a mathematical guarantee.** The proof output will name the property
and show you which input values triggered the failure.

Common causes:
- Setting K so small that the cost curve becomes numerically unstable for high metric values
- Setting `sessionBudgetDecay > 1.0` (budget would grow with more sessions — physically wrong)
- Setting a multiplier to 0 or negative

When a proof fails, treat it as a finding — restore the previous value, record the
failure in `calibration_data.json`, and investigate why the observation implied a value
that breaks the proof.

**Never change the engine to make a proof pass.** The proofs verify the engine is
correct. A proof failure means either your constant is wrong or a genuine edge case was
found.

---

*This guide covers the Squad Optimiser / Logistics Engine profile file. All parameter
values must be verified from real field observations before the app is used for
operational decisions.*
