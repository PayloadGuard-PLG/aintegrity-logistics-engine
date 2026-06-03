# SYSTEM BLUEPRINT
**AIntegrity Logistics Engine**
Version: 2.0 · Updated: 2026-06-03 · Classification: Internal Architecture Reference

---

> **Summary.** This system is a deterministic, offline-first investment projection engine
> for managing a pool of tracked operational assets. It ingests structured data from
> physical or digital field documents via on-device optical character recognition,
> maintains a persistent local registry of assets and their performance parameters, and
> applies a formally-verified mathematical pipeline to project the outcome of any proposed
> investment cycle before it is committed. All computation is deterministic and
> pure-functional; given the same inputs the engine always produces the same outputs.
> The system carries no network dependency at runtime — it runs entirely on-device.
> A three-layer formal verification stack (Dafny · Z3 · Crosshair) plus Hypothesis
> differential tests prove thirty named safety properties over the core pipeline and gate
> every change to the main branch via CI.

---

## 1. Repository Layout

```
.
├── app/                              # Expo Router screen tree — UI only, no engine logic
│   ├── _layout.tsx                   # Root: DB bootstrap, splash gate, tab navigator
│   ├── (tabs)/
│   │   ├── _layout.tsx               # Tab bar configuration
│   │   ├── assets.tsx                # Asset registry — list, search, quick-select
│   │   ├── investment.tsx            # Investment cycle planner — scan → project → compare
│   │   ├── drills.tsx                # Conditioning operations — schedule, drain forecast
│   │   ├── plan.tsx                  # Deployment planning workspace
│   │   ├── results.tsx               # Historical outcomes log
│   │   └── squad-plan.tsx            # Multi-asset deployment configuration builder
│   ├── coach/                        # ⚠ Sprint 3: rename to app/investment/
│   │   └── capture.tsx               # OCR capture flow for investment cycle documents
│   ├── player/                       # ⚠ Sprint 3: rename to app/asset/
│   │   ├── [id].tsx                  # Asset detail / edit screen
│   │   └── new.tsx                   # Asset intake form (manual entry)
│   └── compare.tsx                   # Side-by-side asset comparison view
│
├── src/
│   ├── engine/                       # ★ Core deterministic math — no React, no I/O
│   │   ├── engineMath.ts             # All projection stages (pure functions)
│   │   ├── engineConstants.ts        # Typed re-exports from profiles/logistics_v1.json
│   │   └── dynamicsModel.ts          # DynamicsModel interface (Phase B1)
│   │
│   ├── logic/                        # Orchestration and scanning pipelines
│   │   ├── documentScanner.ts        # OCR parser — investment cycle documents
│   │   ├── investmentPipeline.ts     # Post-scan routing: category resolution, fallbacks
│   │   ├── investmentPipelineSchema.ts # Zod ingest boundary (Phase B6)
│   │   ├── assetProfileScanner.ts    # OCR parser — asset profile documents
│   │   ├── investmentEngine.ts       # Multi-cycle projection orchestrator
│   │   ├── ovrProjector.ts           # CCI projector with capacity ceiling check
│   │   ├── customCoachEngine.ts      # Parameterised investment cycle evaluator
│   │   ├── scenarioComparator.ts     # A/B scenario comparison engine
│   │   ├── fixtureEngine.ts          # Operational scheduling logic
│   │   ├── zeroDrainEngine.ts        # Zero-readiness-drain cycle detector
│   │   ├── zeroDrainProtocol.ts      # Zero-drain reporting and advisory
│   │   ├── mutantEngine.ts           # Edge-case and stress-scenario evaluator
│   │   ├── xpEngine.ts               # Legacy projection shim (deprecated)
│   │   ├── controller.ts             # High-level action controller
│   │   └── pickImage.ts              # Device camera/gallery abstraction
│   │
│   ├── services/                     # Database access layer (Drizzle ORM + expo-sqlite)
│   │   ├── assetService.ts           # Asset CRUD, tier normalisation, snapshot management
│   │   ├── assetService.web.ts       # Web stub for assetService
│   │   ├── coachService.ts           # ⚠ Sprint 3: rename to investmentService.ts
│   │   ├── coachHistoryService.ts    # ⚠ Sprint 3: rename to investmentHistoryService.ts
│   │   ├── drillPresetService.ts     # Saved conditioning operation presets
│   │   ├── drillPlanHistoryService.ts# Conditioning plan history
│   │   ├── squadPlanService.ts       # Deployment configuration persistence
│   │   └── storageService.ts         # Generic key-value storage abstraction
│   │
│   ├── utils/                        # Stateless utility functions
│   │   ├── metricWeights.ts          # Primary/secondary metric classification by role
│   │   ├── coachMath.ts              # ⚠ Sprint 3: rename — deprecated projection shim
│   │   ├── conditionEngine.ts        # Operational readiness calculation helpers
│   │   ├── optimiserMath.ts          # Allocation optimisation utilities
│   │   ├── modifiers.ts              # Modifier chain helpers
│   │   └── math.ts                   # General-purpose numeric utilities
│   │
│   ├── components/                   # Reusable UI components
│   │   ├── atoms/
│   │   │   ├── Chip.tsx
│   │   │   ├── CornerBrackets.tsx
│   │   │   ├── MonoLabel.tsx
│   │   │   ├── NewRoleBar.tsx
│   │   │   ├── OvrMovement.tsx
│   │   │   └── QualityMeter.tsx
│   │   ├── AppHeader.tsx
│   │   ├── CoachInputRow.tsx
│   │   ├── DrillSessionRow.tsx
│   │   ├── DrillTable.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── HelpModal.tsx
│   │   ├── InvestmentStepTable.tsx   # Per-metric gain breakdown table
│   │   ├── OVRBadge.tsx              # Composite capacity index badge
│   │   ├── PlayerCard.tsx            # Asset summary card
│   │   ├── SplashAnimation.tsx       # Boot sequence animation
│   │   ├── StatGrid3Col.tsx          # Three-column metric grid
│   │   ├── TabBackground.tsx         # Per-tab ambient background art
│   │   └── TierBadge.tsx             # Classification tier badge
│   │
│   ├── database/                     # Legacy database helpers (not on active load path)
│   │   ├── drillDatabase.ts
│   │   └── playerSchema.ts
│   │
│   ├── db/                           # Active database layer
│   │   ├── schema.ts                 # Drizzle table definitions
│   │   ├── index.ts                  # Connection, migration runner, idempotency guards
│   │   └── index.web.ts              # Web stub
│   │
│   ├── hooks/
│   │   ├── useScanner.ts             # OCR scan lifecycle hook
│   │   ├── useSquad.ts               # Asset pool state hook
│   │   └── useSquad.web.ts           # Web stub
│   │
│   ├── constants/
│   │   └── theme.ts                  # Design system tokens
│   │
│   ├── types/
│   │   └── resources.ts              # Canonical TypeScript interfaces and union types
│   │
│   └── context/
│       └── ManagerContext.tsx        # Global operator context provider
│
├── profiles/
│   ├── logistics_v1.json             # ★ Live calibrated constants (OTA-updatable)
│   │                                 #   Single source of truth for every engine parameter.
│   │                                 #   Read by engineConstants.ts and constants_pure.py.
│   ├── game_2025.json                # Retained for reference — source-domain constants
│   ├── calibration_data.json         # Empirical observation log — evidence for every constant
│   └── calibrate.ts                  # Offline constant back-calculation utility
│
├── verification/                     # Formal verification spec layer (Python)
│   ├── __init__.py
│   ├── constants_pure.py             # Python mirror of logistics_v1.json constants
│   ├── engine_pure.py                # Pure Python specification of engineMath.ts
│   ├── multipliers_pure.py           # Multiplier helper functions (pure Python)
│   ├── crosshair_contracts.py        # PEP 316 contract functions for Crosshair
│   ├── run_ts.ts                     # Persistent Node.js subprocess — equivalence test bridge
│   └── dafny/
│       ├── budget_model.dfy          # Dafny proofs P1–P4 (geometric budget series)
│       └── gain_engine.dfy           # Dafny proofs P5–P6 (gain loop bounds + MetricValue newtype)
│
├── tests/
│   ├── proofs/
│   │   ├── __init__.py
│   │   ├── test_z3_properties.py     # Z3 SMT proofs P7, P10–P15, P18–P19, P18-param, P19-param, P22
│   │   ├── test_crosshair_contracts.py # Crosshair contracts P5, P6, P8, P9, P16, P17, P20, P21
│   │   └── test_ts_equivalence.py    # Hypothesis differential tests: Python spec vs TS engine
│   ├── engine-test.ts
│   ├── investment-test.ts
│   ├── projection-test.ts
│   ├── drill-logic-test.ts
│   ├── logic-test.ts
│   ├── storage-test.ts
│   └── sim-ala.ts
│
├── drizzle/
│   └── migrations.ts                 # Compiled migration bundle for expo-sqlite (m0000–m0007)
│
├── docs/
│   └── formal-verification-gap-analysis.md
│
├── .github/workflows/
│   ├── proofs.yml                    # CI: z3-crosshair + dafny (blocks merge to main)
│   └── eas-update.yml                # CI: OTA build and distribution (main only)
│
├── CLAUDE.md                         # Developer notes, calibration policy, sprint log
├── SYSTEM_BLUEPRINT.md               # This document
├── SPEC.md                           # Full function-level specification
├── WHITEPAPER.md                     # Technical whitepaper for external readers
└── tsconfig.json
```

---

## 2. Module Map

### 2.1 Production Runtime Chain

| Module | File | Role |
|---|---|---|
| Calibrated Constants | `profiles/logistics_v1.json` | Single source of truth for all engine parameters. OTA-updatable. Loaded at module init by both TypeScript and Python layers. |
| Engine Constants | `src/engine/engineConstants.ts` | Typed re-exports of every constant from `logistics_v1.json`, each with calibration status in JSDoc. `getConstantMeta(key)` exposes `_meta` provenance. |
| Core Math Engine | `src/engine/engineMath.ts` | Pure functions for all projection stages. No I/O. No React. Formally verified. |
| Dynamics Model | `src/engine/dynamicsModel.ts` | `DynamicsModel` interface — pluggable degradation and recovery projections (Phase B1). |
| OCR Scanner — Investment Cycle | `src/logic/documentScanner.ts` | Parses ML Kit token stream from investment cycle documents; extracts metric names, baseline values, and gain ranges. |
| OCR Scanner — Asset Profile | `src/logic/assetProfileScanner.ts` | Parses ML Kit token stream from asset profile documents; extracts role configuration, maturity bracket, and metric values. |
| Ingest Boundary | `src/logic/investmentPipelineSchema.ts` | Zod schemas validating all OCR output before it reaches the engine. Invalid inputs throw `ZodError` — never silently propagated. |
| Investment Pipeline | `src/logic/investmentPipeline.ts` | Routes scanner output: category resolution, full-category overrides for Standard/Extensive cycles, Reward cycle passthrough. |
| Investment Engine | `src/logic/investmentEngine.ts` | Orchestrates multi-cycle projections across an asset pool. |
| CCI Projector | `src/logic/ovrProjector.ts` | Projects composite capacity index; applies capacity ceiling check before conditioning simulation. |
| Metric Weights | `src/utils/metricWeights.ts` | Maps deployment role configuration to primary/secondary metric classification (union of all assigned roles). |
| Condition Engine | `src/utils/conditionEngine.ts` | Computes operational readiness drain per conditioning operation cycle. |
| Asset Service | `src/services/assetService.ts` | Asset CRUD, classification tier normalisation (`normaliseTier()`), snapshot management. |
| Database | `src/db/index.ts` | expo-sqlite connection, Drizzle migration runner (m0000–m0007), idempotency guards. |

### 2.2 Supporting Modules

| Module | File | Role |
|---|---|---|
| Custom Cycle Evaluator | `src/logic/customCoachEngine.ts` | Parameterised investment cycle projector. Requires explicit profile injection. |
| Scenario Comparator | `src/logic/scenarioComparator.ts` | Side-by-side projection comparison for two investment scenarios. |
| Zero-Drain Detector | `src/logic/zeroDrainEngine.ts` | Identifies conditioning operations that produce zero readiness drain at a given support level. |
| Zero-Drain Protocol | `src/logic/zeroDrainProtocol.ts` | Reports zero-drain cycles and generates scheduling advisories. |
| Fixture Engine | `src/logic/fixtureEngine.ts` | Operational scheduling logic. |
| Drill Preset Service | `src/services/drillPresetService.ts` | Persistence for saved conditioning operation schedules. |
| Squad Plan Service | `src/services/squadPlanService.ts` | Persistence for multi-asset deployment configurations. |

### 2.3 Verification Modules

| Module | File | Tool | Properties |
|---|---|---|---|
| Budget Model Proofs | `verification/dafny/budget_model.dfy` | Dafny 4.x + Z3 | P1–P4: geometric series budget convergence |
| Gain Loop Proofs | `verification/dafny/gain_engine.dfy` | Dafny 4.x + Z3 | P5–P6: gain loop termination and bounds; MetricValue newtype |
| Pure Engine Spec | `verification/engine_pure.py` | Crosshair + Hypothesis | Ground-truth specification layer for all Python-layer proofs |
| Pure Constants | `verification/constants_pure.py` | — | Loads `logistics_v1.json`; shared by all Python proofs |
| Multiplier Helpers | `verification/multipliers_pure.py` | Crosshair | Pure Python multiplier functions |
| Crosshair Contracts | `verification/crosshair_contracts.py` | Crosshair | PEP 316 contract functions for P5, P6, P8, P9, P16, P17, P20, P21 |
| TS Bridge | `verification/run_ts.ts` | Node.js subprocess | Persistent bridge called by Hypothesis equivalence tests |
| Z3 SMT Proofs | `tests/proofs/test_z3_properties.py` | Z3 SMT | P7, P10–P15, P18–P19, P18-param, P19-param, P22 |
| Crosshair Test Runner | `tests/proofs/test_crosshair_contracts.py` | pytest + Crosshair CLI | P5, P6, P8, P9, P16, P17, P20, P21 |
| Equivalence Tests | `tests/proofs/test_ts_equivalence.py` | Hypothesis | 7 functions × 200 examples, ε = 1×10⁻¹⁰ |

---

## 3. Production Dependencies

### 3.1 Runtime Libraries

| Library | Role |
|---|---|
| React Native 0.76.x | Cross-platform mobile UI rendering |
| Expo SDK 54 | Managed build pipeline, OTA delivery, device API abstraction |
| Expo Router 4.x | File-system-based screen routing |
| expo-sqlite | On-device relational storage (WAL mode) |
| Drizzle ORM | Type-safe SQL query builder and migration runner |
| ML Kit Vision (`@react-native-ml-kit/text-recognition`) | On-device OCR — processes investment cycle and asset profile documents; no image data leaves the device |
| NativeWind / Tailwind | Utility-first styling |
| Zod | Runtime schema validation at OCR ingest boundary |

### 3.2 Verification and CI Libraries

| Library | Version | Role |
|---|---|---|
| Dafny | 4.x (dotnet tool) | Machine-checked algorithmic proofs via Boogie + Z3 |
| Z3 | 4.12.1 | SMT solver backend for Dafny; also used directly for 15 named SMT proofs |
| Crosshair | crosshair-tool (latest) | Symbolic execution of PEP 316 docstring contracts over `engine_pure.py` |
| Hypothesis | latest | Property-based differential testing: Python spec vs TypeScript engine |
| pytest + pytest-timeout | — | Proof runner; `unknown` Z3 result is a hard failure |
| .NET SDK 8.0 | — | Required runtime for Dafny toolchain |
| z3-solver (Python) | — | Z3 Python bindings used in `test_z3_properties.py` |

### 3.3 Development Dependencies

| Library | Role |
|---|---|
| TypeScript | Static type checking |
| tsx | Direct TypeScript execution (used by `npm run test:*` scripts) |
| EAS CLI | Cloud build and OTA distribution |
| Drizzle Kit | Migration generation (`npm run db:generate`) |

---

## 4. Calibrated Constants

All constants live in `profiles/logistics_v1.json`. Both `src/engine/engineConstants.ts` and
`verification/constants_pure.py` load from this single file. A constant change propagates to
both the running engine and the proof layer simultaneously — any proof that breaks after a
constant change is a CI finding, not a merge blocker to silence.

Every constant carries a `_meta` sibling in `logistics_v1.json` recording source, observation
count, CV, confidence, and citation. `getConstantMeta(key)` (TypeScript) and
`load_constant_meta(key)` (Python) expose provenance at runtime.

| Constant | Key in JSON | Exported name | Value | Status |
|---|---|---|---|---|
| Cost curve base (C₀) | `costCurveBase` | `COST_CURVE_BASE` | 2.94 | ✅ Transferred — CV 3.2%, 5 source-domain observations |
| Cost curve decay (K) | `costCurveDecay` | `COST_CURVE_DECAY` | 47 | ✅ Transferred — CV 3.2%, 5 source-domain observations |
| Base resources per cycle | `baseResourcesPerCycle` | `BASE_RESOURCES_PER_CYCLE` | 676 | ⚠️ ASSUMED — back-calculate from first field observation |
| Cycle budget decay (δ) | `cycleBudgetDecay` | `CYCLE_BUDGET_DECAY` | 0.99 | ⚠️ Provisional — geometric shape confirmed in source domain |
| Secondary metric weight | `secondaryMetricWeight` | `SECONDARY_METRIC_WEIGHT` | 0.22 | ⚠️ ASSUMED |
| Maturity multipliers | `maturityMultipliers` | `MATURITY_MULTS` | Bracketed | ⚠️ ASSUMED — calibrate from asset age cohort data |
| Efficiency class multipliers | `efficiencyClassMultipliers` | `EFFICIENCY_CLASS_MULTS` | 3 tiers | ⚠️ ASSUMED — calibrate from asset spec data |
| Metric count (CCI divisor) | `metricCount` | `METRIC_COUNT` | 10 | Domain-configured |
| Capacity ceiling | `capacityCeiling` | `CAPACITY_CEILING` | 180 | ⚠️ ASSUMED — replace with domain-specific CeilingRule[] |
| Stage metric additions | `stageMetricAdditions` | `STAGE_METRIC_ADDITIONS` | Stage0–Stage4 | Domain-configured |
| Periodic degradation (flat) | `periodicDegradationPerStage` | `PERIODIC_DEGRADATION` | 20 pts | Source-domain confirmed; recalibrate from field data |
| Base drain per cycle | `baseDrainPerCycle` | `BASE_DRAIN_PER_CYCLE` | 0.75% | Source-domain confirmed |
| Intensity multipliers | `intensityMultipliers` | `INTENSITY_MULTS` | ×1–×5 | Source-domain confirmed |
| Support drain reduction | `supportDrainReduction` | `SUPPORT_DRAIN_REDUCTION` | 10–50% | Source-domain confirmed |
| Zero-drain threshold | `zeroDrainThreshold` | `ZERO_DRAIN_THRESHOLD` | 0.38% | Source-domain confirmed |
| Readiness per restoration | `readinessPerRestoration` | `READINESS_PER_RESTORATION` | 15% | Source-domain confirmed |
| Metric hard cap | `metricCap` | `METRIC_CAP` | 9999 | Engine ceiling |
| Conditioning resource factor | `conditioningResourceFactor` | `CONDITIONING_RESOURCE_FACTOR` | 0.3 | ⚠️ ASSUMED |
| Boost multiplier | `boostMultiplier` | `BOOST_MULTIPLIER` | 2.0 | Source-domain confirmed |
| Threshold decay factor | `thresholdDecayFactor` | `THRESHOLD_DECAY_FACTOR` | 0.85 | Source-domain confirmed |

---

## 5. Full Pipeline Flow

The engine executes as a linear, deterministic pipeline. Each stage is a pure function
that takes primitives and returns a value.

---

### Step 0 — System Initialisation

**Trigger:** Application cold start.

1. `src/db/index.ts` opens the on-device SQLite database in WAL mode.
2. Drizzle migration runner checks `_journal.json` and applies pending migrations (m0000–m0007) idempotently.
3. `profiles/logistics_v1.json` is imported at module load time by `engineConstants.ts`. The Python verification layer (`constants_pure.py`) reads the same file at import time.
4. Splash animation plays (`SplashAnimation.tsx` — ~3.2s sequence); main tab navigator mounts on `app/(tabs)/assets.tsx`.

---

### Step 1 — Data Ingestion (OCR)

**Trigger:** Operator initiates a scan from the investment cycle planner (`app/(tabs)/investment.tsx`) or asset intake screen (`app/player/new.tsx`).

1. `src/logic/pickImage.ts` invokes the device camera or gallery picker.
2. ML Kit Vision processes the image entirely on-device. No image data leaves the device.
3. ML Kit returns a flat token stream: `{ text, frame: { top, left, width, height } }[]`.

**Investment cycle document scan path (`documentScanner.ts`):**

4. Tokens sorted top-to-bottom, left-to-right.
5. Cycle type, operational category, and cycle count extracted independently from the header block.
6. For each metric row: locate the metric name token, then search **right of that token** within Y-tolerance (`t.left > tok.left`) for a baseline value and optional `+lo–hi` gain range. The right-filter prevents 3-column OCR bleed.
7. A `Map<metricName, StatCapture>` deduplicates captures: prefer non-zero baseline; prefer narrower gain span as tiebreaker.
8. A secondary embedded-stat pass handles OCR block merges. Candidates filtered to the active category before pattern matching.
9. Reward Cycle flag (`isRewardCycle`) bypasses category filter and full-category override.

**Asset profile document scan path (`assetProfileScanner.ts`):**

4. Role detection anchored to a `"Roles:"` label Y-band (±28 px tolerance).
5. Greedy left-to-right parser consumes concatenated role tokens (e.g. `"DLAML"` → `["DL","AML"]`).
6. Classification tier matched against the seven-tier vocabulary and normalised to internal Stage codes.

**Scan pipeline (`investmentPipeline.ts`):**

- Standard and Extensive cycles: override partial detections with the full known category metric list (ML Kit cannot read arrow icons on non-highlighted rows).
- Focused and Reward cycles: trust scanner output directly — metric count is variable.
- All OCR output validated at `investmentPipelineSchema.ts` (Zod boundary) before entering the engine. Invalid inputs throw `ZodError`.

---

### Step 2 — Asset Record Retrieval

1. `src/services/assetService.ts` queries the local SQLite registry for the selected asset.
2. Record provides: all metric values, deployment role configuration, maturity index, efficiency class, lifecycle stage, and operational condition.
3. `src/utils/metricWeights.ts` computes the **primary/secondary metric set** as the union of all assigned roles. Primary metrics train at full efficiency; secondary metrics cost ~4.5× more resource units per point (`SECONDARY_METRIC_WEIGHT = 0.22` divisor on combined multiplier).

---

### Step 3 — Investment Cycle Configuration

The operator confirms or overrides:
- Number of cycles (N)
- Metrics to invest in (from the scan, or manually selected for Focused cycles)

---

### Step 4 — Geometric Budget Calculation

**Function:** `investmentBudgetPerMetric(cycles, selectedMetrics)` in `engineMath.ts`

Each successive cycle delivers a geometrically decaying share of resources (δ = 0.99):

```
effectiveCycles  = (1 − δ^N) / (1 − δ)
budgetPerMetric  = effectiveCycles × BASE_RESOURCES_PER_CYCLE / |selectedMetrics|
```

This series plateaus rapidly: N = 114 cycles → 68.2 effective cycles (not 114). N = 40 → 33.1 effective cycles.

**Proved:** P1 (budget > 0 when cycles > 0), P2 (budget monotone in cycles), P3 (geometric ≤ linear), P4 (zero cycles → zero budget). See `verification/dafny/budget_model.dfy`.

---

### Step 5 — Efficiency Multiplier Composition

**Function:** `combinedMultiplier(params)` in `engineMath.ts`

All efficiency factors compose multiplicatively into a single divisor on resource cost:

```
η = maturityMultiplier(maturityIndex)
  × efficiencyClassMultiplier(efficiencyClass)
  × metricWeightMultiplier(isPrimary)
  × thresholdDecayMultiplier(thresholdsCrossed)
  × boostMultiplier (if active)
  × cycleIntensityMult
```

| Factor | Function | Description |
|---|---|---|
| Maturity | `maturityMultiplier(maturityIndex)` | Bracketed lookup table — efficiency decreases with asset age |
| Efficiency class | `efficiencyClassMultiplier(efficiencyClass)` | Three-tier lookup: Class-A / Standard / Degraded |
| Metric weight | `metricWeightMultiplier(isPrimary)` | 1.0 for primary metrics; 0.22 for secondary |
| Threshold decay | `thresholdDecayMultiplier(thresholdsCrossed)` | `THRESHOLD_DECAY_FACTOR^thresholdsCrossed` — decays as CCI accumulates within a cycle |

**Proved:** P10 (η > 0 for all valid inputs), P11 (secondary < primary efficiency), P12 (efficiency class tiers strictly ordered), P13 (maturity multiplier non-increasing with maturity index). See `tests/proofs/test_z3_properties.py`.

---

### Step 6 — Metric Gain Integral

**Function:** `metricGainFromBudget(startMetric, budget, η)` in `engineMath.ts`

Iterates one metric point at a time from `startMetric`. Each point costs:

```
costAtMetric(m) = COST_CURVE_BASE × exp(m / COST_CURVE_DECAY) / η
               = 2.94 × exp(m / 47) / η
```

Loop terminates when budget exhausted or metric hard cap (`METRIC_CAP` = 9999) reached. A fractional remainder is banked as sub-integer progress (partial point carry).

```
gain = 0
while remaining > 0 and current < METRIC_CAP:
    cost = costAtMetric(current) / η
    if cost > remaining:
        gain += remaining / cost    // fractional carry
        break
    remaining -= cost
    gain      += 1
    current   += 1
```

**Proved:** P5 (gain ≥ 0), P6 (gain ≤ METRIC_CAP − startMetric). See `verification/dafny/gain_engine.dfy`. Crosshair also discharges P5 and P6 via symbolic execution of `engine_pure.py`. The Dafny `MetricValue` newtype proves that Zod-validated inputs satisfy the gain loop's preconditions.

**Differential tested:** `metricGainFromBudget` is one of the 7 functions compared between `engine_pure.py` and `engineMath.ts` by Hypothesis (200 examples, ε = 1×10⁻¹⁰). See `tests/proofs/test_ts_equivalence.py`.

---

### Step 7 — Composite Capacity Index (CCI)

**Function:** `cciFromMetrics(metrics)` in `engineMath.ts`

```
CCI = floor( Σ(all metric values) / metricCount )
```

`metricCount` is a domain-configured constant (default 10). `floor` is the authoritative rounding — `ceil` and `round` are ruled out.

Lifecycle stage bonuses are baked into the metric values via `stageMetricAdditions`. `stageCciContrib(stage, primaryMetricCount)` and `baseCciFromTotal(totalCci, stage, primaryMetricCount)` expose the two-component decomposition shown in the UI.

**Proved:** P14 (CCI deterministic), P15 (CCI non-decreasing under metric increase). See `tests/proofs/test_z3_properties.py`.

**Differential tested:** `cciFromMetrics` is one of the 7 Hypothesis-tested functions.

---

### Step 8 — Capacity Ceiling Check

**Function:** `isInvestmentLocked(baseCci)` in `engineMath.ts`

```typescript
isInvestmentLocked(baseCci) →
  evaluateRuleSet(
    { '__base_cci__': baseCci },
    [{ parameter: '__base_cci__', operator: '>=', threshold: CAPACITY_CEILING,
       polarity: 'lock-when-good' }]
  ).locked
```

`evaluateRuleSet` supports parameterised `CeilingRule[]` with `lock-when-good` and `lock-when-bad` polarities, enabling domain-specific maintenance floor rules.

**Proved:** P18 (no false lockouts — baseCci < threshold → not locked), P19 (no missed lockouts — baseCci ≥ threshold → locked), P18-param/P19-param (parameterised threshold, both polarities). See `tests/proofs/test_z3_properties.py`.

**Differential tested:** `isInvestmentLocked` is one of the 7 Hypothesis-tested functions.

---

### Step 9 — Operational Readiness Update

**Function:** `readinessDrainPct(cycleIntensity, supportLevel)` in `engineMath.ts`

```
drain = BASE_DRAIN_PER_CYCLE × intensityMultiplier × (1 − supportReduction)
```

Zero-drain fires when `drain < ZERO_DRAIN_THRESHOLD` (0.38%). Only minimum-intensity at maximum support level qualifies.

Restoration units recover `READINESS_PER_RESTORATION` (15%) operational readiness per unit, capped at 100%.

**Proved:** P16 (drain ∈ [0, 1]), P17 (`readinessDrainPct` returns bool). See `tests/proofs/test_crosshair_contracts.py`.

**Differential tested:** `readinessDrainPct` is one of the 7 Hypothesis-tested functions.

---

### Step 10 — Maintenance Intervention (optional)

**Function:** `applyIntervention(metrics, type, targetPct, affectedMetrics, domainCap)` in `engineMath.ts`

Models maintenance resets — partial, full, or restore-to-fraction. Types: `partial-reset`, `full-reset`, `restore-to-fraction`.

**Proved:** P20 (`applyIntervention` monotone — result ≥ input for all affected metrics), P21 (`applyIntervention` bounded — result ≤ domain cap). See `tests/proofs/test_crosshair_contracts.py`.

---

### Step 11 — Periodic Degradation (optional)

**Function:** `applyPeriodicDegradation(metrics, periodCount)` in `engineMath.ts`

At each operational period boundary, all metrics drop by `PERIODIC_DEGRADATION × periodCount` points, floored at zero. Primary and secondary metrics degrade equally.

**Differential tested:** `applyPeriodicDegradation` is one of the 7 Hypothesis-tested functions.

---

### Step 12 — Uncertainty Propagation (optional)

**Function:** `propagateUncertainty(estimate, sensitivityC0, sensitivityK, varC0, varK)` in `engineMath.ts`

When constants are marked `assumed` or `provisional`, the engine computes a propagated variance band:

```
σ²_gain ≈ (∂gain/∂C₀)² × σ²_C₀ + (∂gain/∂K)² × σ²_K
```

Returns a `ProjectionBand` with `estimate`, `ci95Lo`, `ci95Hi`, and provenance flags.

**Proved:** P22 (propagated variance ≥ 0). See `tests/proofs/test_z3_properties.py`.

---

### Step 13 — Output

The UI receives projected gain per metric (fractional), projected CCI before and after, capacity ceiling status, and (when constants are `assumed`) a confidence band. No network call occurs at any point in the pipeline.

---

## 6. Formal Verification Summary

Thirty safety properties are machine-checked on every pull request to main. A proof failure blocks merge.

`verification/engine_pure.py` is a pure, side-effect-free Python re-expression of
`src/engine/engineMath.ts`. The two must remain in sync — a divergence caught by a failing
proof is a finding against the implementation, not a reason to weaken the property.

### 6.1 Dafny Machine-Checked Proofs (P1–P6 + MetricValue newtype)

| Property | ID | Statement | File |
|---|---|---|---|
| Positive budget | P1 | cycles > 0 ∧ \|metrics\| > 0 → budget > 0 | `budget_model.dfy` |
| Monotone budget | P2 | cycles₁ > cycles₂ → budget₁ > budget₂ | `budget_model.dfy` |
| Geometric ≤ linear | P3 | effectiveCycles ≤ N | `budget_model.dfy` |
| Zero cycles → zero budget | P4 | cycles = 0 → budget = 0 | `budget_model.dfy` |
| Gain non-negative | P5 | budget > 0 ∧ η > 0 → gain ≥ 0 | `gain_engine.dfy` |
| Gain bounded by cap | P6 | gain ≤ METRIC\_CAP − startMetric | `gain_engine.dfy` |
| Validated inputs satisfy preconditions | MetricValue | `0.0 ≤ r ≤ 9999.0` newtype proves Zod-validated inputs satisfy gain loop | `gain_engine.dfy` |

**CI:** `dafny verify --boogie /proverOpt:O:smt.arith.solver=6 verification/dafny/gain_engine.dfy`

---

### 6.2 Crosshair Symbolic Contract Verification (8 properties)

| Property | ID | Statement |
|---|---|---|
| Gain non-negative | P5 | `metric_gain_from_budget`: gain ≥ 0 |
| Gain bounded | P6 | `metric_gain_from_budget`: gain ≤ budget / costAtMetric(startMetric) |
| Combined multiplier positive | P8 | `combined_multiplier`: result > 0 |
| Maturity multiplier range | P9 | `maturity_multiplier`: result ∈ (0, 2] |
| Drain in range | P16 | `readiness_drain_pct`: result ∈ [0, 1] |
| Lock returns bool | P17 | `is_investment_locked`: returns bool |
| Intervention monotone | P20 | `apply_intervention`: result[i] ≥ input[i] for all affected metrics |
| Intervention bounded | P21 | `apply_intervention`: result[i] ≤ cap[i] for all affected metrics |

---

### 6.3 Z3 SMT Proofs (15 properties)

| Property | ID | Statement |
|---|---|---|
| Zero multiplier / budget → zero gain | P7 | η ≤ 0 → gain = 0; budget ≤ 0 → gain = 0 |
| Combined multiplier positive | P10 | η > 0 for all valid component values |
| Secondary < primary efficiency | P11 | metricWeightMultiplier(secondary) < metricWeightMultiplier(primary) |
| Efficiency class strict ordering | P12 | Degraded < Standard < Class-A (strictly) |
| Maturity multiplier non-increasing | P13 | higher maturity index → mult ≤ lower maturity index |
| CCI deterministic | P14 | same metric sum → same CCI |
| CCI non-decreasing | P15 | metric sum increases → CCI does not decrease |
| No false lockouts | P18 | baseCci < CAPACITY\_CEILING → not locked |
| No missed lockouts | P19 | baseCci ≥ CAPACITY\_CEILING → locked |
| Parameterised no false lockouts | P18-param | state < T → not locked (any T, both polarities) |
| Parameterised no missed lockouts | P19-param | state ≥ T → locked (any T, both polarities) |
| Variance non-negative | P22 | propagated variance ≥ 0 |
| Budget model (Z3 mirror) | P1–P4 | Non-negativity, step identity, zero-sessions |

---

### 6.4 Hypothesis Differential Tests (7 functions)

200 property-based examples comparing Python spec (`engine_pure.py`) against TypeScript engine (`engineMath.ts`) via persistent Node.js subprocess (`run_ts.ts`). Tolerance ε = 1×10⁻¹⁰.

Functions tested: `investmentBudgetPerMetric`, `metricGainFromBudget`, `cciFromMetrics`, `combinedMultiplier`, `applyPeriodicDegradation`, `isInvestmentLocked`, `readinessDrainPct`.

---

### 6.5 CI Gate

Both `z3-crosshair` and `dafny` jobs must pass before any pull request can merge to main. Main branch triggers EAS OTA to production devices — the proof gate runs first.

```yaml
# .github/workflows/proofs.yml (abridged)
jobs:
  z3-crosshair:
    steps:
      - run: pip install z3-solver crosshair-tool pytest pytest-timeout hypothesis
      - run: pytest tests/proofs/ -m proof -v --timeout=60

  dafny:
    steps:
      - run: dotnet tool install --global dafny
      - run: dafny verify verification/dafny/budget_model.dfy
      - run: dafny verify --boogie /proverOpt:O:smt.arith.solver=6 verification/dafny/gain_engine.dfy
```

---

### 6.6 Verification Status

**30/30 properties pass** as of Sprint 2 (2026-06-03).

| Gap | Description | Status |
|---|---|---|
| Equivalence testing | Python spec vs TypeScript engine — ε = 1×10⁻¹⁰ | ✅ Closed — `test_ts_equivalence.py` (Phase Gap-3) |
| Zod ingest boundary | OCR output enters engine without formally-bounded validation | ✅ Closed — `investmentPipelineSchema.ts` + MetricValue newtype (Phase B6) |
| Fractional gain branch | Conservative model in `gain_engine.dfy` (fractional carry modelled as 0.0) | Open — try `/proverOpt:O:smt.arith.solver=6`; fallback `{:axiom} DivLtOne` |
| Constant uncertainty | Assumed constants carry unquantified uncertainty | Partially closed — `propagateUncertainty` + P22; field calibration ongoing |

---

*Document maintained as the authoritative architecture reference. File paths, function names, constant keys, calibration status, and proof counts reflect the actual state of the codebase. Any discrepancy between this document and the source files is a documentation bug.*
