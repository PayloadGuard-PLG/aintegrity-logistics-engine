# AIntegrity Logistics Engine — Technical Whitepaper

**Version 1.0 — Sprint 2 (2026-06-03)**

---

## 1. Purpose

The AIntegrity Logistics Engine is a deterministic, offline-first investment projection tool for tracked physical assets. Its goal is pre-commitment decision support: given a proposed maintenance investment cycle, a calibrated cost model, and an asset profile, output the projected outcome — per-metric gains, updated CCI, operational readiness impact — before any resource is committed.

The engine is a pure-functional, formally verified computation layer. It has no network calls, no accounts, and no external dependencies at runtime. All projection logic is expressed as closed-form mathematics over calibrated constants.

---

## 2. Domain Model

### 2.1 Vocabulary

| Concept | Engine term |
|---|---|
| Physical asset under management | Asset |
| Maintenance or training intervention | Investment cycle |
| Composite performance score | CCI (Composite Capacity Index) |
| Asset performance classification | Efficiency class (Class-A · Standard · Degraded) |
| Classification tier upgrade | Lifecycle stage upgrade (Stage0–Stage4) |
| Operational readiness level | Operational readiness (0–100) |
| Support infrastructure level | Support level (0–4) |
| Primary performance metric | Primary metric — trained at full cost efficiency |
| Secondary performance metric | Secondary metric — costs ~4.5× more per point |
| Assigned operational role | Primary metric set |

### 2.2 Asset record

Each asset carries: efficiency class, maturity index, primary metric set, lifecycle stage, per-metric values, operational readiness, and support level. These are the complete inputs to every projection.

---

## 3. Mathematical Model

### 3.1 CCI formula

```
CCI = floor( Σ(all metric values) / metricCount )
```

`metricCount` is a domain-configured constant (default 10). CCI is a truncated mean — floor, not round or ceil. This is the single authoritative performance score used for ceiling checks and lock conditions.

### 3.2 Exponential cost curve

The resource cost to advance a metric by one point grows exponentially with the metric's current value:

```
cost(m) = C₀ × exp(m / K)
```

where:
- **C₀** (`costCurveBase`) = 2.94 — base cost at metric = 0
- **K** (`costCurveDecay`) = 47 — exponential scale constant

Both constants are transferred from the source domain with high confidence (CV 3.2% across 5 independent observations). They are structural constants — the exponential cost shape is domain-agnostic.

### 3.3 Geometric budget decay

For repeated investment cycles, budget does not accumulate linearly. Each successive cycle delivers a geometrically decaying share of resources:

```
effectiveCycles = (1 - δ^N) / (1 - δ)
budgetPerMetric = effectiveCycles × baseResourcesPerCycle / numMetrics
```

where **δ** (`cycleBudgetDecay`) = 0.99 (provisional — geometric shape confirmed in source domain).

This explains why long run counts (N=40, N=114) deliver far less than N times the single-cycle yield — the geometric series plateaus rapidly. At N=114: effectiveCycles = 68.2 vs naive 114.

### 3.4 Metric gain integral

Given a starting metric value, budget, and combined multiplier:

```
metricGainFromBudget(startMetric, budget, mult)
```

The function integrates the inverse cost curve — summing how many points the budget purchases when each successive point costs `cost(startMetric + pointsGained) / mult`. This is the innermost loop of the engine, formally verified by Dafny (P5–P6) and Crosshair (P8, P9).

### 3.5 Combined multiplier

```
combinedMultiplier({
  maturityIndex,        // asset age bracket → efficiency factor
  efficiencyClass,      // Class-A / Standard / Degraded
  isPrimary,            // primary vs secondary metric cost weight
  thresholdsCrossed,    // in-session CCI thresholds crossed → decay
  boostActive,          // 2× boost flag
  cycleIntensityMult,   // conditioning intensity level
})
```

All six factors compose multiplicatively. The multiplier is fully parameterised — no hardcoded special cases.

### 3.6 Operational readiness drain

```
drain = baseDrainPerCycle × intensityMult × (1 − supportReduction)
```

If `drain < zeroDrainThreshold` (0.38%), the cycle is zero-drain. Support level 4 at minimum intensity achieves zero drain.

### 3.7 Lifecycle stage upgrade

Stage upgrades add flat bonuses to primary metrics only. Cumulative additions are stored in `stageMetricAdditions`. The CCI contribution:

```
stageCciContrib(stage, primaryMetricCount) =
  floor(stageMetricAdditions[stage] × primaryMetricCount / metricCount)
```

### 3.8 Ceiling and lock

Investment is locked when base CCI reaches the capacity ceiling. Evaluated via `evaluateRuleSet` — a parameterised rule engine supporting both `lock-when-good` (performance ceiling) and `lock-when-bad` (maintenance floor) polarities.

```typescript
isInvestmentLocked(baseCci) →
  evaluateRuleSet(
    { '__base_cci__': baseCci },
    [{ parameter: '__base_cci__', operator: '>=', threshold: CAPACITY_CEILING,
       polarity: 'lock-when-good' }]
  ).locked
```

---

## 4. Engine Pipeline

The engine is a linear, deterministic sequence of pure functions in `src/engine/engineMath.ts`:

```
OCR ingest (Zod boundary)
→ investmentBudgetPerMetric       geometric budget allocation
→ combinedMultiplier               efficiency factor composition
→ metricGainFromBudget            per-metric gain integral
→ cciFromMetrics                   CCI computation
→ evaluateRuleSet                  ceiling / lock check
→ propagateUncertainty            confidence band (optional)
```

No step has side effects. No step reads external state. The same inputs always produce the same outputs.

### 4.1 Zod ingest boundary

All external data (OCR scan results) is validated at `src/logic/investmentPipelineSchema.ts` before entering the engine. Invalid inputs throw `ZodError` — they never reach the math layer. The Dafny `MetricValue` newtype proves that validated inputs satisfy the gain loop's preconditions.

### 4.2 Uncertainty propagation (Phase B4)

When constants are marked `assumed` or `provisional`, the engine computes a propagated variance band:

```
σ²_gain ≈ (∂gain/∂C₀)² × σ²_C₀ + (∂gain/∂K)² × σ²_K
```

The caller provides sensitivities via finite difference. Output is a `ProjectionBand` with `estimate`, `ci95Lo`, `ci95Hi`, and provenance flags indicating which constants contributed uncertainty.

### 4.3 Intervention model (Phase B2)

`applyIntervention` models maintenance resets — partial, full, or restore-to-fraction. Formally verified:
- **P20**: result metrics ≥ input metrics (monotone — intervention never degrades)
- **P21**: result metrics ≤ domain cap (bounded)

### 4.4 Dynamics model (Phase B1)

The `DynamicsModel` interface supports pluggable degradation and recovery projections:
- `ExponentialDynamicsModel` — calibrate from C-MAPSS EGT margin data
- `LinearDynamicsModel` — calibrate from DR-Train SDLL per MGT data
- `ThresholdStepDynamicsModel` — calibrate from Backblaze SMART 187 distribution

---

## 5. Formal Verification

**Proof count: 30/30 pass.** Three independent tools cover complementary domains.

### 5.1 Z3 SMT proofs (15 properties)

| Property | Statement |
|---|---|
| P7 | Budget non-negative |
| P10 | Combined multiplier positive |
| P11 | Secondary metric weight < primary weight |
| P12 | Efficiency class ordering strict (Class-A > Standard > Degraded) |
| P13 | Maturity multipliers non-increasing with maturity index |
| P14 | CCI deterministic (same inputs → same output) |
| P15 | CCI non-decreasing when any metric increases |
| P18 | Ceiling: state < threshold → not locked (no false lockouts) |
| P18-param | Parameterised threshold, lock-when-bad polarity |
| P19 | Ceiling: state ≥ threshold → locked (no missed lockouts) |
| P19-param | Parameterised threshold, lock-when-bad polarity |
| P22 | Propagated variance ≥ 0 (confidence band always valid) |
| P1–P4 | Budget model: non-negativity, step identity, zero-sessions |

### 5.2 Crosshair symbolic contracts (8 properties)

PEP 316 pre/post contracts on `verification/engine_pure.py`, discharged by symbolic execution:

| Property | Function | Contract |
|---|---|---|
| P5 | `metric_gain_from_budget` | gain ≥ 0 |
| P6 | `metric_gain_from_budget` | gain ≤ budget / cost(startMetric) |
| P8 | `combined_multiplier` | result > 0 |
| P9 | `maturity_multiplier` | result ∈ (0, 2] |
| P16 | `readiness_drain_pct` | result ∈ [0, 1] |
| P17 | `is_investment_locked` | returns bool |
| P20 | `apply_intervention` | result ≥ input (monotone) |
| P21 | `apply_intervention` | result ≤ cap (bounded) |

### 5.3 Dafny proofs (P1–P6 + MetricValue newtype)

Budget model (P1–P4) and gain loop termination/bounds (P5–P6) verified as Dafny lemmas with NLSAT solver (`/proverOpt:O:smt.arith.solver=6`). `MetricValue` newtype (`0.0 ≤ r ≤ 9999.0`) proves that Zod-validated inputs satisfy the gain loop's preconditions.

### 5.4 Hypothesis differential tests (7 functions)

200-example property-based tests comparing Python spec (`verification/engine_pure.py`) against TypeScript engine (`src/engine/engineMath.ts`) via persistent Node.js subprocess. Tolerance ε = 1×10⁻¹⁰.

Functions tested: `investmentBudgetPerMetric`, `metricGainFromBudget`, `cciFromMetrics`, `combinedMultiplier`, `applyPeriodicDegradation`, `isInvestmentLocked`, `readinessDrainPct`.

### 5.5 CI

Both proof jobs run on every PR to main via `.github/workflows/proofs.yml` (z3-crosshair job: ~2m; dafny job: ~17s). All 30 properties must pass before merge.

---

## 6. Calibration Policy

Every engine constant must be back-calculated from actual field observations (before/after metric readings from controlled interventions). If no empirical observation exists, the constant is labelled **ASSUMED**.

**Current calibration status:**

| Constant | Value | Status |
|---|---|---|
| `costCurveBase` (C₀) | 2.94 | ✅ Transferred — CV 3.2%, 5 source domain observations |
| `costCurveDecay` (K) | 47 | ✅ Transferred — CV 3.2%, 5 source domain observations |
| `baseResourcesPerCycle` | 676 | ⚠️ ASSUMED — back-calculate from first field observation |
| `cycleBudgetDecay` (δ) | 0.99 | ⚠️ Provisional — geometric shape confirmed in source domain |
| `secondaryMetricWeight` | 0.22 | ⚠️ ASSUMED |
| `capacityCeiling` | 180 | ⚠️ ASSUMED — replace with domain-specific CeilingRule[] |
| `maturityMultipliers` | bracketed | ⚠️ ASSUMED — calibrate from asset age cohort data |
| `efficiencyClassMultipliers` | 1.5 / 1.0 / 0.5 | ⚠️ ASSUMED — calibrate from asset spec data |

**To add a field observation:** record before/after metric readings in `profiles/calibration_data.json` with asset ID, cycle type, and cycle count. Back-calculate the implied constant. Update `_meta` to `source: 'field-fit'`, `confidence: 'high'`, and update the table above.

---

## 7. Mobile Application

### 7.1 Overview

Built on React Native / Expo SDK 54. Offline-first — all computation runs on-device. No server or account required for projection.

**Tab structure:**
- **Assets** — asset roster, CCI summary, lifecycle stage overview
- **Plan** — investment cycle planning: select asset, cycle type, count → projected CCI gain
- **Drills** — conditioning cycle management, operational readiness tracking
- **Investment** — OCR-driven document scan, projection output
- **Results** — historical projection vs actual comparison

### 7.2 OCR pipeline

Asset profiles and investment documents are ingested via ML Kit OCR. The scan result passes through the Zod ingest boundary (`DocumentScanResultSchema`) before any engine computation. Invalid or partial scans are rejected with structured errors — never silently propagated to the math layer.

### 7.3 Continuous delivery

Merge to `main` → GitHub Actions (`eas-update.yml`) pushes an OTA JavaScript bundle via EAS Update. No app store submission required for logic-layer changes.

**EAS configuration:**
- Project: `d61de2f2-abc7-495e-a89a-03ee878db83b` (`@sdarkvader/aintegrity-logistics-engine`)
- Android package: `com.payloadguard.logisticsengine`
- Runtime version policy: `appVersion`

---

## 8. Constant Provenance System

Every constant in `profiles/logistics_v1.json` carries a `_meta` sibling:

```json
"costCurveBase": 2.94,
"costCurveBase_meta": {
  "source": "game",
  "n": 5,
  "cv": 0.032,
  "confidence": "high",
  "citation": "Back-calculated from source domain; structural constant, domain-agnostic"
}
```

`getConstantMeta(key)` (TypeScript) and `load_constant_meta(key)` (Python) expose provenance at runtime. `propagateUncertainty` uses `variance` from `_meta` to compute confidence bands. Any constant without field evidence has `source: 'assumed'` and `confidence: 'assumed'`.

---

## 9. Known Limitations

| Limitation | Impact | Status |
|---|---|---|
| `baseResourcesPerCycle` is ASSUMED | Absolute projected gains approximate until first field calibration | Open |
| `maturityMultipliers` are ASSUMED | Age-related efficiency may be wrong | Open — calibrate from asset age cohort data |
| `efficiencyClassMultipliers` are ASSUMED | Class-A vs Degraded differentiation unverified | Open — calibrate from asset spec data |
| `cycleBudgetDecay` is provisional | Long-run (N > 50) projections carry wider uncertainty | Open |
| Domain vocabulary not populated | `metricVocabulary`, asset classes, efficiency labels use placeholder values | Sprint 3 |
| Route names retain source-domain conventions | `app/player/`, `app/coach/` not yet renamed | Sprint 3 |

---

## 10. Development Quick Reference

```bash
# TypeScript check
npx tsc --noEmit

# All 30 proofs
pytest tests/proofs/ -m proof -v --timeout=60

# Dafny
dafny verify verification/dafny/budget_model.dfy
dafny verify --boogie /proverOpt:O:smt.arith.solver=6 verification/dafny/gain_engine.dfy

# Push (NEVER push to main — triggers EAS OTA to production devices)
git push -u origin claude/squad-optimiservp-BQH8C
```

**Active branch:** `claude/squad-optimiservp-BQH8C`
**Remote:** `payloadguard-plg/aintegrity-logistics-engine`
**Full specification:** `SPEC.md`
**Calibration log:** `profiles/calibration_data.json`
**Proof status:** 30/30 (Sprint 1, 2026-06-03)
