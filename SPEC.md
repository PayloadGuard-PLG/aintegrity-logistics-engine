# AIntegrity Logistics Engine — Technical Specification

**Branch:** `claude/squad-optimiservp-BQH8C`
**Profile:** `profiles/logistics_v1.json`
**Proof status:** 30/30 pass (8 Crosshair · 7 Hypothesis differential · 15 Z3)
**TypeScript:** clean (`npx tsc --noEmit`)

---

## 1. Domain Vocabulary

| Concept | Engine term | Notes |
|---|---|---|
| Physical asset under management | Asset | vehicle, equipment, personnel |
| Maintenance/training investment | Investment cycle | consumes resource units |
| Composite performance score | CCI (Composite Capacity Index) | `floor(Σmetrics / totalAttributeCount)` |
| Asset performance tier | Efficiency class | Class-A · Standard · Degraded |
| Classification tier upgrade | Lifecycle stage upgrade | Stage0–Stage4 |
| Operational readiness level | Operational readiness | 0–100; replaces condition |
| Support infrastructure level | Support level | 0–4; affects drain reduction |
| Primary performance metric | Primary metric | trained at full efficiency |
| Secondary performance metric | Secondary metric | costs ~4.5× more per point |
| Assigned operational role | Primary metric set | determines which metrics are primary |

---

## 2. Engine Constants (`profiles/logistics_v1.json`)

All constants loaded at module init by both `src/engine/engineConstants.ts` and `verification/constants_pure.py`. A constant change that breaks a proof is a CI failure — not a reason to weaken the property.

| Key | Symbol | Value | Calibration status |
|---|---|---|---|
| `xpCostBase` | C₀ | 2.94 | ✅ Transferred (high confidence) — CV 3.2% across 5 source domain observations. Structural constant, domain-agnostic. |
| `xpCostDecayK` | K | 47 | ✅ Transferred (high confidence) — CV 3.2%. Recalibrate from first logistics field dataset. |
| `baseXpPerSession` | BASE_XPS | 676 | ⚠️ ASSUMED — placeholder. Back-calculate from first controlled field observation (before/after metric readings). |
| `sessionBudgetDecay` | δ | 0.99 | ⚠️ Provisional — geometric decay shape confirmed in source domain. Recalibrate from repeated-intervention data. |
| `greyWeightMultiplier` | GREY_MULT | 0.22 | ⚠️ ASSUMED — placeholder secondary metric cost penalty. Calibrate from operational data. |
| `maxBaseOvr` | MAX_BASE_OVR | 180 | ⚠️ ASSUMED — placeholder ceiling. Replace with domain-specific `CeilingRule[]`. |
| `ageTable` | AGE_TABLE | bracketed | ⚠️ ASSUMED — maturity brackets placeholder. Calibrate from asset age cohort data. |
| `talentMultipliers` | TALENT_MULTS | Class-A: 1.5 · Standard: 1.0 · Degraded: 0.5 | ⚠️ ASSUMED — efficiency class multipliers. Calibrate from asset specification data. |
| `totalAttributeCount` | TOTAL_ATTRS | 10 | Domain-configured. Divisor in CCI formula. |
| `qualityOvrDivisor` | OVR_DIVISOR | 1 | Combined divisor = TOTAL_ATTRS × OVR_DIVISOR = 10. |
| `statCap` | STAT_CAP | 9999 | Hard ceiling on individual metric values. |
| `condLevelMultipliers` | COND_LEVEL_MULTS | Minimal:1 … Maximum:5 | Conditioning intensity multipliers. |
| `fanClubCondReduction` | FAN_COND_REDUCTION | [10, 15, 20, 25, 50] % | Support level drain reduction table. |
| `baseLossPerDrill` | BASE_LOSS_PER_DRILL | 0.75 % | Base readiness drain per conditioning cycle. |
| `zeroDrainThreshold` | ZERO_DRAIN_THRESHOLD | 0.38 % | Below this drain rate → zero-drain flag set. |
| `conditionPerRestorer` | CONDITION_PER_RESTORER | 15 % | Readiness restored per restorative intervention. |
| `seasonDecayPerLevel` | SEASON_DECAY | 20 pts | Flat metric decay per periodic degradation event. |
| `starDecayPerSession` | STAR_DECAY | 0.85 | In-cycle decay per CCI star threshold crossed. |
| `starOvrThreshold` | STAR_OVR_THRESHOLD | 20 | CCI gain needed to cross one star threshold. |
| `twoxAdMultiplier` | TWOX_AD_MULT | 2.0 | Multiplier when 2× boost active. |
| `drillXpFactor` | DRILL_XP_FACTOR | 0.3 | ⚠️ Uncalibrated — conditioning resource scaling factor. |

**Provenance accessor (Phase B5):**
```typescript
getConstantMeta('xpCostBase')        // → { source:'game', n:5, cv:0.032, confidence:'high', ... }
getConstantMeta('baseXpPerSession')  // → { source:'assumed', n:0, confidence:'assumed', ... }
```

---

## 3. Core Type Definitions (`src/types/resources.ts`)

### 3.1 Constant provenance

```typescript
type ConstantSource     = 'game' | 'literature-seeded' | 'field-fit';
type ConstantConfidence = 'high' | 'provisional' | 'assumed';

interface ConstantMeta<T> {
  readonly value:      T;
  readonly source:     ConstantSource;
  readonly n:          number;          // number of independent observations
  readonly cv?:        number;          // coefficient of variation
  readonly confidence: ConstantConfidence;
  readonly citation?:  string;
  readonly variance?:  number;          // for uncertainty propagation
}
```

### 3.2 Domain asset types

```typescript
type AssetClass      = string;   // e.g. 'vehicle' | 'equipment' | 'personnel'
type EfficiencyClass = string;   // 'Class-A' | 'Standard' | 'Degraded'
type StageName       = 'Stage0' | 'Stage1' | 'Stage2' | 'Stage3' | 'Stage4';
type SupportLevel    = 0 | 1 | 2 | 3 | 4;
type MetricName      = string;   // domain-defined label

interface Asset {
  id:                   string;
  name:                 string;
  assetClass:           AssetClass;
  efficiencyClass:      EfficiencyClass;
  maturityLevel:        number;               // lifecycle age index
  primaryMetrics:       MetricName[];         // determines primary (white) metrics
  lifecycleStage:       StageName;
  metrics:              Record<MetricName, number>;
  operationalReadiness: number;               // 0–100
  supportLevel:         SupportLevel;
}
```

### 3.3 Ceiling rules (Phase B3)

```typescript
type CeilingOperator = '>=' | '<=' | '>' | '<';

interface CeilingRule {
  readonly parameter:  MetricName | '__base_cci__';
  readonly operator:   CeilingOperator;
  readonly threshold:  number;
  readonly source:     string;   // citation: e.g. "EN 13231-1 §6.2"
  readonly polarity:   'lock-when-good' | 'lock-when-bad';
}

interface RuleSetEvaluation {
  readonly locked:         boolean;
  readonly triggeredRules: CeilingRule[];
}
```

### 3.4 Intervention types (Phase B2)

```typescript
type InterventionType = 'partial-reset' | 'full-reset' | 'restore-to-fraction';

interface InterventionParams {
  readonly targetPct:       number;       // 0–1; full-reset = 1.0
  readonly affectedMetrics: MetricName[];
}

interface InterventionConfig {
  readonly type:             InterventionType;
  readonly name:             string;
  readonly paramConstraints: { minTargetPct: number; maxTargetPct: number };
}
```

### 3.5 Uncertainty bands (Phase B4)

```typescript
interface ProjectionBand {
  readonly estimate:  number;
  readonly variance:  number;
  readonly ci95Lo:    number;   // estimate − 1.96 × √variance
  readonly ci95Hi:    number;   // estimate + 1.96 × √variance
  readonly provenanceFlags: {
    lowestConfidence:    ConstantConfidence;
    anyLiteratureSeeded: boolean;
    anyAssumed:          boolean;
  };
}
```

### 3.6 Dynamics models (Phase B1)

```typescript
type DynamicsModelType = 'exponential' | 'linear' | 'threshold-step';

interface DynamicsModel {
  readonly type:        DynamicsModelType;
  readonly metricLabel: string;
  degradationProjection(metric: number, time: number): number;
  recoveryProjection(metric: number, time: number): number;
}

interface LinearDynamicsModel extends DynamicsModel {
  readonly type:                   'linear';
  readonly degradationRatePerUnit: number;  // calibrate from field records
  readonly recoveryRatePerUnit:    number;
}

interface ThresholdStepDynamicsModel extends DynamicsModel {
  readonly type:  'threshold-step';
  readonly steps: ReadonlyArray<{ threshold: number; degradationRate: number }>;
}
```

---

## 4. Engine Functions (`src/engine/engineMath.ts`)

### 4.1 XP cost curve — Stage 1

```typescript
xpCostAtStat(stat: number): number
```
Returns the resource-unit cost per metric point at the given current value.

**Formula:** `C₀ × exp(stat / K)` where C₀ = 2.94, K = 47.

Cost doubles every ~32.6 metric points (`K × ln(2)`). At stat = 0 cost = 2.94; at stat = 200 cost ≈ 669.

---

### 4.2 Maturity multiplier — Stage 2a

```typescript
ageMultiplier(age: number): number
```
Returns training efficiency multiplier for asset maturity index. Linearly interpolates between bracketed table entries in `ageTable`.

**Logistics profile (assumed — all ⚠️):**

| Maturity index | Multiplier |
|---|---|
| 17 | 1.10 (assumed) |
| 18–20 | 1.00 |
| 21–23 | 0.85 |
| 24–25 | 0.72 |
| 26–28 | 0.61 |
| 29 | 0.50 (assumed) |
| 30 | 0.00 (assumed) |

---

### 4.3 Efficiency class multiplier — Stage 2b

```typescript
talentMultiplier(talent: string): number
```
Looks up `TALENT_MULTS[talent]`, defaults to 1.0 if unknown.

**Logistics profile (all ⚠️ ASSUMED):** Class-A: 1.5 · Standard: 1.0 · Degraded: 0.5.

---

### 4.4 Metric weight — Stage 2c

```typescript
greyMultiplier(isWhite: boolean): number
```
Returns 1.0 for primary metrics, `GREY_MULT` (0.22) for secondary. Secondary metrics cost ~4.5× more resource units per point.

---

### 4.5 In-cycle star decay — Stage 2d

```typescript
starsGainedFromOvrGain(sessionOvrGain: number): number
starDecayMultiplier(starsGained: number): number
```
`starsGained = floor(sessionOvrGain / STAR_OVR_THRESHOLD)`. Decay factor = `STAR_DECAY^starsGained`. Applied once the asset's CCI crosses a star threshold within a cycle.

---

### 4.6 Combined efficiency multiplier — Stage 3

```typescript
combinedMultiplier(params: {
  age:           number;
  talent:        string;
  isWhite:       boolean;
  starsGained:   number;
  twoxAd:        boolean;
  drillLevelMult: number;
}): number
```
Composes all efficiency factors into a single divisor on the cost curve.

**Formula:** `η = ageMultiplier × talentMultiplier × greyMultiplier × starDecayMultiplier × adMultiplier × drillLevelMult`

**Proved P10:** η > 0 for all valid inputs.
**Proved P11:** η(secondary) < η(primary) — secondary metrics always cost more.
**Proved P12:** Degraded < Standard < Class-A (strict ordering, exhaustive bijection).
**Proved P13:** ageMultiplier is non-increasing with maturity index.

---

### 4.7 Investment cycle budget — Stage 4a

```typescript
coachBudgetPerStat(sessions: number, selectedStats: string[]): number
```
Returns resource units per metric for an investment cycle of `sessions` repetitions.

**Formula:**
```
effectiveSessions = (1 − δ^sessions) / (1 − δ)    where δ = sessionBudgetDecay = 0.99
budgetPerMetric   = effectiveSessions × BASE_XPS / |selectedStats|
```

The geometric series plateaus: 114 cycles → 68.2 effective cycles (not 114). This resolves the long-standing ×N anomaly (×20 and ×40 cycles giving similar gains).

**Proved P1:** budget > 0 when sessions > 0.
**Proved P2:** budget monotone non-decreasing in sessions.
**Proved P3:** geometric budget ≤ linear budget.
**Proved P4:** budget = 0 when sessions = 0.

---

### 4.8 Conditioning cycle budget — Stage 4b

```typescript
drillBudgetPerStat(cycles: number, numStatsDrilled: number): number
```
`cycles × BASE_XPS × DRILL_XP_FACTOR / numStatsDrilled`. DRILL_XP_FACTOR = 0.3 (⚠️ uncalibrated).

---

### 4.9 Metric gain integral — Stage 5

```typescript
statGainFromBudget(startStat: number, budget: number, mult: number): number
```
Iterates one metric point at a time from `startStat`. Each point costs `xpCostAtStat(current) / mult`. Terminates when budget exhausted or `STAT_CAP` reached. Sub-integer remainder banked as fractional carry.

```
gain = 0
while remaining > 0 and current < STAT_CAP:
    cost = C₀ × exp(current / K) / mult
    if cost > remaining:
        gain += remaining / cost   // fractional carry
        break
    remaining -= cost; gain += 1; current += 1
```

**Proved P5:** gain ≥ 0 (Dafny + Crosshair).
**Proved P6:** gain ≤ STAT_CAP − startStat (Dafny + Crosshair).
**Proved P7a:** mult ≤ 0 → gain = 0.
**Proved P7b:** budget ≤ 0 → gain = 0.
**Proved P8:** gain monotone non-decreasing in budget (Crosshair).
**Proved P9:** gain monotone non-decreasing in mult (Crosshair).

**Validated input type (Dafny newtype):**
```dafny
newtype MetricValue = r: real | 0.0 <= r <= 9999.0 witness 0.0
```

---

### 4.10 CCI formula — Stage 6

```typescript
ovrFromStats(stats: Record<string, number>): number
```
**Formula:** `floor(Σ(all metric values) / (TOTAL_ATTRS × OVR_DIVISOR))`

With logistics profile: `floor(Σ / 10)`.

Classification tier bonuses are baked into metric values, so total CCI and base CCI use the same formula; `tierOvrContrib()` and `baseOvrFromTotal()` expose the two-component split.

**Proved P14:** CCI is deterministic — identical metric sums always yield the same CCI.
**Proved P15:** CCI is non-decreasing when any metric increases.

---

### 4.11 Tier contribution — Stage 7

```typescript
tierOvrContrib(tier: string, whiteStatCount: number): number
baseOvrFromTotal(totalOvr: number, tier: string, whiteStatCount: number): number
```
Tier bonus applies to primary metrics only. `tierOvrContrib = floor(TIER_ADDITIONS[tier] × whiteStatCount / TOTAL_ATTRS)`.

---

### 4.12 Ceiling check — Stage 8

```typescript
evaluateRuleSet(
  state: Record<string, number>,
  rules: CeilingRule[],
): RuleSetEvaluation
```
Evaluates a list of `CeilingRule` entries against a metric snapshot. Returns `{ locked, triggeredRules }`. Supports all four operators (`>=`, `<=`, `>`, `<`) and both polarities.

```typescript
isTrainingLocked(baseOvr: number): boolean
```
Convenience wrapper: `evaluateRuleSet({ '__base_cci__': baseOvr }, [{ parameter: '__base_cci__', operator: '>=', threshold: MAX_BASE_OVR, ... }]).locked`.

**Proved P18:** base_cci < threshold → NOT locked (no false lock-outs).
**Proved P19:** base_cci ≥ threshold → locked (no missed lock-outs).
**Proved P18+P19 bijection:** is_locked ↔ base_cci ≥ threshold (exhaustive).
**Proved P18-param:** parameterised threshold T, `>=` operator — false lock-out impossible.
**Proved P19-param:** parameterised threshold T, `>=` operator — missed lock-out impossible.
**Proved P18/P19 lock-when-bad polarity:** `<=` operator (maintenance polarity) bijection holds.

---

### 4.13 Readiness drain — Stage 9

```typescript
conditionDrainPct(drillIntensity: string, fanLevel: number): number
isZeroDrain(drainPct: number): boolean
```
**Formula:** `BASE_LOSS_PER_DRILL × COND_LEVEL_MULTS[intensity] × (1 − FAN_COND_REDUCTION[fanLevel] / 100)`

**Proved P16:** drain ≥ 0 for all valid inputs (Crosshair).
**Proved P17:** drain non-increasing as support level increases (Crosshair).

---

### 4.14 Readiness restoration — Stage 10

```typescript
conditionRestoredPct(restorers: number): number
```
`restorers × CONDITION_PER_RESTORER`. Pure linear scaling; no ceiling applied here (caller clamps to 100).

---

### 4.15 Periodic degradation — Season decay

```typescript
applySeasonDecay(
  metrics: Record<string, number>,
  seasonCount: number,
): Record<string, number>
```
Applies flat `SEASON_DECAY × seasonCount` reduction to every metric. Returns new snapshot; original not mutated.

---

### 4.16 Maintenance intervention — Phase B2

```typescript
applyIntervention(
  metrics:         Record<string, number>,
  type:            'partial-reset' | 'full-reset' | 'restore-to-fraction',
  targetPct:       number,              // 0–1; full-reset = 1.0
  affectedMetrics: string[],
  domainCap:       Record<string, number>,
): Record<string, number>
```
Applies a maintenance action to a subset of metrics. Monotone and bounded by construction.

**Formula per affected metric:**
- `full-reset`: `result[k] = cap[k]`
- `partial-reset` / `restore-to-fraction`: `result[k] = min(cap[k], current + (cap[k] − current) × targetPct)`
- Clamp: `result[k] = min(cap[k], max(current[k], target))`

**Proved P20:** `result[k] ≥ metrics[k]` — intervention never degrades a metric (Crosshair).
**Proved P21:** `result[k] ≤ domainCap[k]` — intervention never exceeds ceiling (Crosshair).

**Calibration targets:**
- `partial-reset` `targetPct` ← tamping records (typical 0.65–0.85 of cap)
- `full-reset` `targetPct = 1.0` ← component replacement events
- `restore-to-fraction` `targetPct` ∈ [0.70, 0.80] ← preservation interventions

---

### 4.17 Uncertainty propagation — Phase B4

```typescript
propagateUncertainty(
  estimate:        number,
  sensitivityC0:   number,   // ∂gain/∂C0 — caller computes via finite diff
  sensitivityK:    number,   // ∂gain/∂K
  varC0:           number,   // from ConstantMeta<number>.variance on C0
  varK:            number,   // from ConstantMeta<number>.variance on K
  provenanceFlags: ProjectionBand['provenanceFlags'],
): ProjectionBand
```
First-order error propagation via the delta method.

**Formula:** `σ²_gain ≈ (∂gain/∂C0)² × σ²_C0 + (∂gain/∂K)² × σ²_K`

Sensitivities are computed externally by finite differences:
```
sensitivityC0 = (gain(C0 + ε) − gain(C0 − ε)) / (2ε)
sensitivityK  = (gain(K  + ε) − gain(K  − ε)) / (2ε)
```

Output: `{ estimate, variance, ci95Lo = estimate − 1.96√variance, ci95Hi = estimate + 1.96√variance }`.

**Proved P22:** variance ≥ 0 for all inputs with `varC0 ≥ 0`, `varK ≥ 0` (Z3).

---

### 4.18 Efficiency class back-calculation

```typescript
estimateTalentFromGain(params: {
  statBefore:    number;
  gainMid:       number;    // midpoint of observed gain range
  sessions:      number;
  statNames:     string[];
  categorySize:  number;
  age:           number;
  isWhite:       boolean;
  twoxAd:        boolean;
  drillLevelMult: number;
}): { bestTier: string; confidence: 'high' | 'low'; candidateScores: Record<string, number> }
```
Iterates all known efficiency classes, forward-projects each, returns the closest match. `confidence = 'high'` if best error < 20% of `gainMid`.

---

### 4.19 Full investment projection

```typescript
projectCoachGains(params: {
  sessions:           number;
  statValues:         Record<string, number>;
  whiteStats:         Set<string>;
  age:                number;
  talent:             string;
  sessionOvrGainSoFar: number;
  twoxAd:             boolean;
  drillLevelMult:     number;
}): Record<string, number>
```
End-to-end composed pipeline. Calls `coachBudgetPerStat`, `combinedMultiplier`, and `statGainFromBudget` for each metric. Returns fractional gain per metric name.

---

### 4.20 Constant provenance accessor — Phase B5

```typescript
// src/engine/engineConstants.ts
getConstantMeta(key: string): {
  source: string; n: number; cv?: number; confidence: string; citation?: string; variance?: number;
} | undefined
```
Returns the `_meta` sibling object from `logistics_v1.json` for any constant key.

```python
# verification/constants_pure.py
def load_constant_meta(key: str) -> dict | None
```
Python mirror. Returns `None` if key has no `_meta` entry.

---

## 5. Zod Ingest Boundary (`src/logic/investmentPipelineSchema.ts`)

All external data is validated before it reaches the engine.

```typescript
// Per-metric capture from OCR
MetricCaptureSchema = z.object({
  metricName:  z.string(),
  valueBefore: z.number().nonnegative().max(9999),
  gainLo:      z.number().nonnegative(),
  gainHi:      z.number().nonnegative(),
}).refine(d => d.gainHi >= d.gainLo)

// Full document scan result
DocumentScanResultSchema = z.object({
  investmentType:     z.string().optional(),
  investmentCategory: z.string().optional(),
  cycleCount:         z.number().positive().max(1000).optional(),
  metrics:            z.array(MetricCaptureSchema),
  isRewardCycle:      z.boolean().optional(),
})

// Domain-vocabulary validator (injected at startup)
buildMetricNameSchema(vocab: string[]): ZodString
// Rejects any metric name not in DomainProfile.metricVocabulary
```

`resolveInvestmentMetrics()` calls `DocumentScanResultSchema.parse()` as its first statement. A `ZodError` is thrown before any engine math runs.

**Dafny newtype (gain_engine.dfy):** Validated inputs satisfy the gain loop precondition:
```dafny
newtype MetricValue = r: real | 0.0 <= r <= 9999.0 witness 0.0
lemma MetricValueSatisfiesGainPrecondition(mv: MetricValue, mult: real)
  requires mult > 0.0
  ensures mv as real >= 0.0 && mv as real <= 9999.0
```

---

## 6. DynamicsModel Interface (`src/engine/dynamicsModel.ts`)

Pluggable degradation/recovery model. The gain loop is not touched — this is called by the investment pipeline outside the loop.

```typescript
makeDynamicsModel(config: DomainDynamicsConfig): DynamicsModel
```

Three implementations:
- `LinearDynamicsModel` — constant rate per unit time (calibrate from time-series maintenance records)
- `ExponentialDynamicsModel` — exponential approach to floor/ceiling (calibrate from C-MAPSS-style EGT margin data)
- `ThresholdStepDynamicsModel` — piecewise constant by condition band (calibrate from SMART-attribute failure distributions)

Calibration inputs:
- `degradationRatePerUnit` ← before/after metric readings per unit operational time
- `recoveryRatePerUnit` ← before/after readings from intervention records
- `steps[].threshold` ← empirical condition band boundaries

---

## 7. Formal Proof Index

All 30 properties pass. A proof failure is a finding — never silence it by weakening the property or adjusting the engine to match.

| ID | Statement | Tool | File |
|---|---|---|---|
| P1 | `sessions > 0 → budget > 0` | Dafny | `verification/dafny/budget_model.dfy` |
| P2 | Budget monotone non-decreasing in sessions | Dafny | `verification/dafny/budget_model.dfy` |
| P3 | Geometric budget ≤ linear budget | Dafny | `verification/dafny/budget_model.dfy` |
| P4 | `sessions = 0 → budget = 0` | Dafny | `verification/dafny/budget_model.dfy` |
| P5 | `gain ≥ 0` | Dafny + Crosshair | `gain_engine.dfy`, `crosshair_contracts.py` |
| P6 | `gain ≤ STAT_CAP − startStat` | Dafny + Crosshair | `gain_engine.dfy`, `crosshair_contracts.py` |
| P7a | `mult ≤ 0 → gain = 0` | Z3 | `test_z3_properties.py` |
| P7b | `budget ≤ 0 → gain = 0` | Z3 | `test_z3_properties.py` |
| P8 | gain monotone non-decreasing in budget | Crosshair | `crosshair_contracts.py` |
| P9 | gain monotone non-decreasing in mult | Crosshair | `crosshair_contracts.py` |
| P10 | `combined_multiplier > 0` for all valid inputs | Z3 | `test_z3_properties.py` |
| P11 | `grey_multiplier(secondary) < grey_multiplier(primary)` | Z3 | `test_z3_properties.py` |
| P12 | Degraded < Standard < Class-A (strict) | Z3 | `test_z3_properties.py` |
| P13 | Maturity multiplier non-increasing with maturity index | Z3 | `test_z3_properties.py` |
| P14 | CCI deterministic — same metric sum → same CCI | Z3 | `test_z3_properties.py` |
| P15 | CCI non-decreasing when any metric increases | Z3 | `test_z3_properties.py` |
| P16 | Readiness drain ≥ 0 | Crosshair | `crosshair_contracts.py` |
| P17 | Drain non-increasing as support level increases | Crosshair | `crosshair_contracts.py` |
| P18 | `base_cci < MAX_BASE_OVR → NOT locked` (no false lock-outs) | Z3 | `test_z3_properties.py` |
| P19 | `base_cci ≥ MAX_BASE_OVR → locked` (no missed lock-outs) | Z3 | `test_z3_properties.py` |
| P18+P19 | `is_locked ↔ base_cci ≥ MAX_BASE_OVR` (bijection) | Z3 | `test_z3_properties.py` |
| P18-param | P18 for arbitrary threshold T, `>=` operator | Z3 | `test_z3_properties.py` |
| P19-param | P19 for arbitrary threshold T, `>=` operator | Z3 | `test_z3_properties.py` |
| P18/P19-bad | `<=` operator (lock-when-bad polarity) bijection holds | Z3 | `test_z3_properties.py` |
| P20 | `applyIntervention`: result[k] ≥ input[k] (monotone) | Crosshair | `crosshair_contracts.py` |
| P21 | `applyIntervention`: result[k] ≤ domainCap[k] (bounded) | Crosshair | `crosshair_contracts.py` |
| P22 | `propagateUncertainty`: variance ≥ 0 | Z3 | `test_z3_properties.py` |
| Equiv-1 | `coachBudgetPerStat`: Python ≡ TypeScript, ε=1e-10 | Hypothesis | `test_ts_equivalence.py` |
| Equiv-2 | `statGainFromBudget`: Python ≡ TypeScript, ε=1e-10 | Hypothesis | `test_ts_equivalence.py` |
| Equiv-3 | `ovrFromStats`: Python ≡ TypeScript, ε=1e-10 | Hypothesis | `test_ts_equivalence.py` |
| Equiv-4 | `combinedMultiplier`: Python ≡ TypeScript, ε=1e-10 | Hypothesis | `test_ts_equivalence.py` |
| Equiv-5 | `applySeasonDecay`: Python ≡ TypeScript, ε=1e-10 | Hypothesis | `test_ts_equivalence.py` |
| Equiv-6 | `isTrainingLocked`: Python ≡ TypeScript | Hypothesis | `test_ts_equivalence.py` |
| Equiv-7 | `conditionDrainPct`: Python ≡ TypeScript, ε=1e-10 | Hypothesis | `test_ts_equivalence.py` |
| MetricValue | Validated inputs satisfy gain loop precondition | Dafny | `gain_engine.dfy` |

Total: 30 proof assertions (counted as per `pytest -m proof` output).

---

## 8. Pipeline Summary

```
[Field document / asset profile]
        │
        ▼ ML Kit Vision (on-device OCR)
[Token stream: { text, frame }[]]
        │
        ▼ documentScanner.ts / assetProfileScanner.ts
[DocumentScanResult / AssetProfile]
        │
        ▼ DocumentScanResultSchema.parse()  ← Zod boundary; ZodError on bad data
[ValidatedDocumentScanResult]
        │
        ▼ resolveInvestmentMetrics()        ← metric list resolution
[string[]]  ← metric names for this cycle
        │
        ▼ coachBudgetPerStat(sessions, metrics)
[budgetPerMetric: number]
        │
        ▼  for each metric:
        │   combinedMultiplier({ age, talent, isWhite, starsGained, twoxAd, drillLevelMult })
        │   statGainFromBudget(startStat, budget, mult)
        ▼
[gains: Record<MetricName, number>]
        │
        ▼ ovrFromStats(newMetrics)
[CCI: number]
        │
        ▼ evaluateRuleSet(state, rules)
[RuleSetEvaluation: { locked, triggeredRules }]
        │
        ▼ (if !locked) propagateUncertainty(estimate, ∂C0, ∂K, σ²_C0, σ²_K, provenance)
[ProjectionBand: { estimate, variance, ci95Lo, ci95Hi, provenanceFlags }]
```

---

## 9. Calibration Targets (Next Steps)

| Constant | What to measure | How |
|---|---|---|
| `baseXpPerSession` | Before/after metric readings from one controlled investment cycle | Scan asset profile before. Run known cycle. Scan after. Back-calculate via `statGainFromBudget` inverse. |
| `sessionBudgetDecay` | Repeated-intervention data: run ×4 and ×20 of the same cycle on the same asset | Compare gains at each multiplier; fit geometric series to the ratio. |
| `greyWeightMultiplier` | A secondary metric in the same cycle as a primary metric (same budget, same asset) | Ratio of gains gives `GREY_MULT` directly: `gainGrey / gainPrimary ≈ GREY_MULT`. |
| `ageTable` | Multiple assets from different maturity brackets, same cycle | One data point per bracket; `ageMultiplier = observedGain / (budget × talentMult × greyMult / xpCost)`. |
| `talentMultipliers` | Asset specification sheets labelled with efficiency class | Controlled cycle, confirmed class, back-calculate multiplier. |
| `domainCap` for `applyIntervention` | Intervention records (before/after for maintenance events) | `targetPct = (metricAfter − metricBefore) / (cap − metricBefore)`. |

All observations go into `profiles/calibration_data.json`.

---

*Generated from branch `claude/squad-optimiservp-BQH8C` — 2026-06-03.*
