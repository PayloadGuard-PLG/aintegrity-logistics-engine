# SYSTEM BLUEPRINT
**AIntegrity Resource Allocation Engine**
Version: 1.1 · Updated: 2026-06-01 · Classification: Internal Architecture Reference

---

> **Summary.** This system is a deterministic, offline-first resource allocation and
> operational capacity projection engine for managing a pool of tracked operational assets.
> It ingests structured data from physical or digital field documents via on-device optical
> character recognition, maintains a persistent local registry of assets and their
> performance parameters, and applies a formally-verified mathematical pipeline to project
> the outcome of any proposed investment cycle before it is committed. All computation is
> deterministic and pure-functional; given the same inputs the engine always produces the
> same outputs. The system carries no network dependency at runtime — it runs entirely
> on-device. A three-layer formal verification stack (Dafny · Z3 · Crosshair) proves
> nineteen named safety properties over the core pipeline and gates every change to the
> main branch via CI.

---

## 1. Repository Layout

```
.
├── app/                              # Expo Router screen tree — UI only, no engine logic
│   ├── _layout.tsx                   # Root: DB bootstrap, splash gate, tab navigator
│   ├── (tabs)/
│   │   ├── _layout.tsx               # Tab bar configuration
│   │   ├── index.tsx                 # Asset registry — list, search, quick-select
│   │   ├── coaches.tsx               # Investment cycle planner — scan → project → compare
│   │   ├── drills.tsx                # Conditioning operations — schedule, drain forecast
│   │   ├── plan.tsx                  # Deployment planning workspace
│   │   ├── results.tsx               # Historical outcomes log
│   │   └── squad-plan.tsx            # Multi-asset deployment configuration builder
│   ├── coach/
│   │   └── capture.tsx               # OCR capture flow for investment cycle documents
│   ├── player/
│   │   ├── [id].tsx                  # Asset detail / edit screen
│   │   └── new.tsx                   # Asset intake form (manual entry)
│   └── compare.tsx                   # Side-by-side asset comparison view
│
├── src/
│   ├── engine/                       # ★ Core deterministic math — no React, no I/O
│   │   ├── engineMath.ts             # All 16 projection stages (pure functions)
│   │   └── engineConstants.ts        # Typed re-exports from profiles/game_2025.json
│   │
│   ├── logic/                        # Orchestration and scanning pipelines
│   │   ├── coachScanner.ts           # OCR parser — investment cycle documents
│   │   ├── coachPipeline.ts          # Post-scan routing: category resolution, fallbacks
│   │   ├── playerScanner.ts          # OCR parser — asset profile documents
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
│   │   ├── playerService.ts          # Asset CRUD, tier normalisation, snapshot management
│   │   ├── playerService.web.ts      # Web stub for playerService
│   │   ├── coachService.ts           # Investment cycle record service
│   │   ├── coachHistoryService.ts    # Historical investment outcomes
│   │   ├── drillPresetService.ts     # Saved conditioning operation presets
│   │   ├── drillPlanHistoryService.ts# Conditioning plan history
│   │   ├── squadPlanService.ts       # Deployment configuration persistence
│   │   └── storageService.ts         # Generic key-value storage abstraction
│   │
│   ├── utils/                        # Stateless utility functions
│   │   ├── coachMath.ts              # Deprecated projection shim (backward compatibility)
│   │   ├── conditionEngine.ts        # Operational readiness calculation helpers
│   │   ├── optimiserMath.ts          # Allocation optimisation utilities
│   │   ├── roleWeights.ts            # Primary/secondary metric classification by role
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
│   │   ├── OVRBadge.tsx              # Composite capability index badge
│   │   ├── PlayerCard.tsx            # Asset summary card
│   │   ├── SplashAnimation.tsx       # Boot sequence animation
│   │   ├── StatGrid3Col.tsx          # Three-column metric grid
│   │   ├── TabBackground.tsx         # Per-tab ambient background art
│   │   └── TierBadge.tsx             # Classification tier badge
│   │
│   ├── database/                     # Legacy database helpers
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
│   ├── game_2025.json                # ★ Live calibrated constants (OTA-updatable)
│   │                                 #   Single source of truth for every engine parameter.
│   │                                 #   Read by both engineConstants.ts and constants_pure.py.
│   ├── calibration_data.json         # Empirical observation log — evidence for every constant
│   └── player_seeds.json             # Canonical asset records for registry re-population
│
├── verification/                     # Formal verification spec layer (Python)
│   ├── __init__.py
│   ├── constants_pure.py             # Python mirror of game_2025.json constants
│   ├── engine_pure.py                # Pure Python specification of engineMath.ts
│   ├── multipliers_pure.py           # Multiplier helper functions (pure Python)
│   ├── crosshair_contracts.py        # PEP 316 contract functions for Crosshair
│   └── dafny/
│       ├── budget_model.dfy          # Dafny proofs P1–P4 (geometric budget series)
│       └── gain_engine.dfy           # Dafny proofs P5–P6 (gain loop bounds)
│
├── tests/
│   ├── proofs/
│   │   ├── __init__.py
│   │   ├── test_z3_properties.py     # Z3 SMT proofs P7, P10–P15, P18–P19
│   │   └── test_crosshair_contracts.py # Crosshair symbolic contracts P5, P6, P8, P9, P16, P17
│   ├── engine-test.ts                # Engine unit tests
│   ├── investment-test.ts            # Investment cycle projection tests
│   ├── projection-test.ts            # End-to-end projection regression tests
│   ├── drill-logic-test.ts           # Conditioning operation logic tests
│   ├── logic-test.ts                 # Scanner and pipeline tests
│   ├── storage-test.ts               # Database layer tests
│   └── sim-ala.ts                    # Long-form simulation test
│
├── drizzle/
│   └── migrations.ts                 # Compiled migration bundle for expo-sqlite
│
├── tools/
│   └── calibrate.ts                  # Offline constant back-calculation utility
│
├── docs/
│   └── formal-verification-gap-analysis.md  # Research: four open determinism gaps
│
├── .github/workflows/
│   ├── proofs.yml                    # CI: z3-crosshair + dafny (blocks merge to main)
│   └── eas-update.yml                # CI: OTA build and distribution (main only)
│
├── CLAUDE.md                         # Developer notes, calibration policy, sprint log
├── SYSTEM_BLUEPRINT.md               # This document
└── tsconfig.json
```

---

## 2. Module Map

### 2.1 Production Runtime Chain

| Module | File | Role |
|---|---|---|
| Calibrated Constants | `profiles/game_2025.json` | Single source of truth for all engine parameters. OTA-updatable. Loaded at module init by both TypeScript and Python layers. |
| Engine Constants | `src/engine/engineConstants.ts` | Typed re-exports of every constant from `game_2025.json`, each with calibration status and evidence chain in JSDoc. |
| Core Math Engine | `src/engine/engineMath.ts` | Pure functions for all 16 projection stages. No I/O. No React. Each stage independently tunable. |
| OCR Scanner — Investment Cycle | `src/logic/coachScanner.ts` | Parses ML Kit token stream from investment cycle documents; extracts metric names, baseline values, and gain ranges. |
| OCR Scanner — Asset Profile | `src/logic/playerScanner.ts` | Parses ML Kit token stream from asset profile documents; extracts role configuration, maturity bracket, and metric values. |
| Scan Pipeline | `src/logic/coachPipeline.ts` | Routes scanner output: category resolution, full-category overrides for Standard/Extensive cycles, Reward cycle passthrough. |
| Investment Engine | `src/logic/investmentEngine.ts` | Orchestrates multi-cycle projections across an asset pool. |
| CCI Projector | `src/logic/ovrProjector.ts` | Projects composite capability index; applies capacity ceiling check before drill simulation. |
| Condition Engine | `src/utils/conditionEngine.ts` | Computes operational readiness drain per conditioning operation cycle. |
| Role Weights | `src/utils/roleWeights.ts` | Maps deployment role configuration to primary/secondary metric classification (union of all assigned roles). |
| Asset Service | `src/services/playerService.ts` | Asset CRUD, classification tier normalisation (`normaliseTier()`), snapshot management. |
| Database | `src/db/index.ts` | expo-sqlite connection, Drizzle migration runner (m0000–m0007), idempotency guards. |

### 2.2 Supporting Modules

| Module | File | Role |
|---|---|---|
| Custom Cycle Evaluator | `src/logic/customCoachEngine.ts` | Parameterised investment cycle projector. Requires explicit `GameProfile` injection; removed deprecated shim in Sprint 32. |
| Scenario Comparator | `src/logic/scenarioComparator.ts` | Side-by-side projection comparison for two investment scenarios. |
| Zero-Drain Detector | `src/logic/zeroDrainEngine.ts` | Identifies conditioning operations that produce zero readiness drain at a given support level. |
| Zero-Drain Protocol | `src/logic/zeroDrainProtocol.ts` | Reports zero-drain cycles and generates scheduling advisories. |
| Fixture Engine | `src/logic/fixtureEngine.ts` | Operational scheduling logic — fixture calendar integration. |
| Drill Preset Service | `src/services/drillPresetService.ts` | Persistence for saved conditioning operation schedules. |
| Squad Plan Service | `src/services/squadPlanService.ts` | Persistence for multi-asset deployment configurations. |
| Calibration Utility | `tools/calibrate.ts` | Offline tool for back-calculating engine constants from empirical game observations. |

### 2.3 Verification Modules

| Module | File | Tool | Properties |
|---|---|---|---|
| Budget Model Proofs | `verification/dafny/budget_model.dfy` | Dafny 4.x + Z3 | P1–P4: geometric series budget convergence |
| Gain Loop Proofs | `verification/dafny/gain_engine.dfy` | Dafny 4.x + Z3 | P5–P6: gain loop termination and bounds |
| Pure Engine Spec | `verification/engine_pure.py` | Crosshair + Z3 | Ground-truth specification layer for all Python-layer proofs |
| Pure Constants | `verification/constants_pure.py` | — | Loads `game_2025.json`; shared by all Python proofs |
| Crosshair Contracts | `verification/crosshair_contracts.py` | Crosshair | PEP 316 contract functions for P5, P6, P8, P9, P16, P17 |
| Z3 SMT Proofs | `tests/proofs/test_z3_properties.py` | Z3 SMT | P7, P10–P15, P18–P19 |
| Crosshair Test Runner | `tests/proofs/test_crosshair_contracts.py` | pytest + Crosshair CLI | P5, P6, P8, P9, P16, P17 |

---

## 3. Production Dependencies

### 3.1 Runtime Libraries

| Library | Role |
|---|---|
| React Native 0.76.x | Cross-platform mobile UI rendering |
| Expo SDK 52 | Managed build pipeline, OTA delivery, device API abstraction |
| Expo Router 4.x | File-system-based screen routing |
| expo-sqlite | On-device relational storage (WAL mode) |
| Drizzle ORM | Type-safe SQL query builder and migration runner |
| ML Kit Vision (`@react-native-ml-kit/text-recognition`) | On-device OCR — processes investment cycle and asset profile documents; no image data leaves the device |
| NativeWind / Tailwind | Utility-first styling |

### 3.2 Verification and CI Libraries

| Library | Version | Role |
|---|---|---|
| Dafny | 4.x (dotnet tool) | Machine-checked algorithmic proofs via Boogie + Z3 |
| Z3 | 4.12.1 | SMT solver backend for Dafny; also used directly for 11 named SMT proofs |
| Crosshair | crosshair-tool (latest) | Symbolic execution of PEP 316 docstring contracts over `engine_pure.py` |
| pytest + pytest-timeout | — | Proof runner; `unknown` Z3 result is a hard failure |
| .NET SDK 8.0 | — | Required runtime for Dafny toolchain |
| z3-solver (Python) | — | Z3 Python bindings used in `test_z3_properties.py` |

### 3.3 Development Dependencies

| Library | Role |
|---|---|
| TypeScript | Static type checking |
| tsx | Direct TypeScript execution (used by all `npm run test:*` scripts) |
| EAS CLI | Cloud build and OTA distribution |
| Drizzle Kit | Migration generation (`npm run db:generate`) |

---

## 4. Calibrated Constants

All constants live in `profiles/game_2025.json`. Both `src/engine/engineConstants.ts` and
`verification/constants_pure.py` load from this single file. A constant change in the JSON
propagates to both the running engine and the proof layer simultaneously — any proof that
breaks after a constant change is a CI finding, not a merge blocker to silence.

| Constant | Key in JSON | Value | Status |
|---|---|---|---|
| Cost curve base | `xpCostBase` | 2.94 | ✅ Confirmed — two-metric gain ratio, controlled observation |
| Cost curve decay | `xpCostDecayK` | 47 | ✅ Confirmed — CV minimisation, 5 independent observations (CV 3.2%) |
| Base resource units per cycle | `baseXpPerSession` | 676 | ✅ Confirmed — back-calculated across two independent asset/session datasets |
| Cycle budget decay | `sessionBudgetDecay` | 0.99 | ✅ Confirmed — geometric model matches ×114 cycle result to ±1 CCI unit; resolves ×N anomaly |
| Secondary metric weight | `greyWeightMultiplier` | 0.22 | ✅ Confirmed — controlled secondary metric observation |
| Maturity table | `ageTable` | Bracketed | ✅ Brackets 18–20, 24–25, 26–28 confirmed; 21–23 validated by use; 17, 29, 30+ assumed |
| Efficiency class multipliers | `talentMultipliers` | 5 tiers | ✅ Mid-tier (1.0) confirmed across 6 assets; lowest tier (0.47) provisional; upper tiers unconfirmed |
| CCI divisor | `totalAttributeCount` × `qualityOvrDivisor` | 15 | ✅ Confirmed — `floor(Σmetrics / 15)` matches all clean-integer test cases |
| Capacity ceiling | `maxBaseOvr` | 180 | ✅ Confirmed — investment lock activates at exactly this base CCI |
| Classification tier additions | `tierAttrAdditions` | T0–T6 | ✅ T2→T3 (+20/primary metric) confirmed from clean tier upgrade |
| Periodic degradation (flat) | `seasonDecayPerLevel` | 20 pts | ✅ Confirmed — flat model; proportional model diverges on high-value metrics |
| Readiness drain base | `baseLossPerDrill` | 0.75% | ✅ Confirmed |
| Intensity multipliers | `condLevelMultipliers` | ×1–×5 | ✅ Confirmed |
| Support reduction table | `fanClubCondReduction` | 10–50% | ✅ Confirmed |
| Zero-drain threshold | `zeroDrainThreshold` | 0.375% | ✅ Confirmed — minimum intensity + maximum support only |
| Restoration per unit | `conditionPerRestorer` | 15% | ✅ Confirmed |
| Metric hard cap | `statCap` | 9999 | Engine ceiling — no observed violation |
| Conditioning XP factor | `drillXpFactor` | 0.3 | ⚠️ Uncalibrated — requires controlled conditioning-only dataset |

---

## 5. Full Pipeline Flow

The engine executes as a linear, deterministic pipeline. Each stage is a pure function
that takes primitives and returns a value. Stage numbers match the inline documentation
in `src/engine/engineMath.ts`.

---

### Step 0 — System Initialisation

**Trigger:** Application cold start.

1. `src/db/index.ts` opens the on-device SQLite database in WAL mode.
2. Drizzle migration runner checks `_journal.json` and applies any pending migrations (m0000–m0007) idempotently. New-role columns (`new_role`, `new_role_points`) guarded by `ensureNewRoleColumns()`.
3. `profiles/game_2025.json` is imported at module load time by `engineConstants.ts`; constants are exported as typed primitives. The Python verification layer (`constants_pure.py`) reads the same file at import time.
4. Splash animation plays (`SplashAnimation.tsx` — ~3.2s sequence); main tab navigator mounts.

---

### Step 1 — Data Ingestion (OCR)

**Trigger:** Operator initiates a scan from the investment cycle planner (`coaches.tsx`) or asset intake screen (`app/player/new.tsx`).

1. `src/logic/pickImage.ts` invokes the device camera or gallery picker.
2. ML Kit Vision processes the image entirely on-device. No image data leaves the device.
3. ML Kit returns a flat token stream: `{ text, frame: { top, left, width, height } }[]`.

**Investment cycle document scan path (`coachScanner.ts`):**

4. Tokens sorted top-to-bottom, left-to-right.
5. Cycle type (Standard / Focused / Extensive / Reward), operational category, and cycle count extracted independently from the header block — no combined regex.
6. For each metric row: locate the metric name token, then search **right of that token** within Y-tolerance (`t.left > tok.left`) for a baseline value and optional `+lo–hi` gain range. The right-filter prevents 3-column OCR bleed.
7. A `Map<metricName, StatCapture>` deduplicates captures: prefer non-zero baseline; prefer narrower gain span as tiebreaker.
8. A secondary embedded-stat pass handles OCR block merges (adjacent columns collapsed — e.g. `"194 + 4-6 CROSSING"`). Candidates filtered to the active category before pattern matching.
9. Reward Cycle flag (`isRewardCoach`) bypasses category filter and full-category override.

**Asset profile document scan path (`playerScanner.ts`):**

4. Role detection anchored to a `"Roles:"` label Y-band (±28 px tolerance).
5. Greedy left-to-right parser consumes concatenated role tokens (e.g. `"DLAML"` → `["DL","AML"]`).
6. OCR correction map handles misrecognitions (e.g. `"TACKIING"` → `"TACKLING"`).
7. Classification tier matched against the seven-tier vocabulary and normalised to internal `T0–T6` codes.

**Scan pipeline (`coachPipeline.ts`):**

- Standard and Extensive cycles: override partial detections with the full known category metric list (ML Kit cannot read `↑` arrow icons on non-highlighted rows).
- Focused and Reward cycles: trust scanner output directly — metric count is variable.
- Safeguard category maps to the same metric set as Defending (not GK).

---

### Step 2 — Asset Record Retrieval

1. `src/services/playerService.ts` queries the local SQLite registry for the selected asset.
2. Record provides: all metric values, deployment role configuration, maturity index, efficiency class, classification tier, and operational condition.
3. `src/utils/roleWeights.ts` computes the **primary/secondary metric set** as the union of all assigned roles. Primary metrics train at full efficiency; secondary metrics cost ~4.5× more resource units per point (`GREY_MULT = 0.22` divisor on combined multiplier).

---

### Step 3 — Investment Cycle Configuration

The operator confirms or overrides:
- Number of cycles (N)
- Metrics to invest in (from the scan, or manually selected for Focused cycles)

---

### Step 4 — Geometric Budget Calculation

**Function:** `coachBudgetPerStat(sessions, selectedMetrics)` — Stage 4a in `engineMath.ts`

Each successive cycle delivers slightly less resource capacity than the prior (decay = 0.99):

```
effectiveCycles  = (1 − 0.99^N) / (1 − 0.99)
budgetPerMetric  = effectiveCycles × 676 / |selectedMetrics|
```

This series plateaus: ×114 cycles → 68.2 effective cycles (not 114). This is the confirmed
explanation for the ×N anomaly — ×20 and ×40 cycles produced similar gains because the
geometric sum plateaus, not because of any measurement error.

**Proved:** P1 (budget > 0 when cycles > 0), P2 (budget monotone in cycles), P3 (geometric ≤ linear), P4 (zero cycles → zero budget). See `verification/dafny/budget_model.dfy`.

---

### Step 5 — Efficiency Multiplier Composition

**Function:** `combinedMultiplier(params)` — Stage 3 in `engineMath.ts`

All efficiency factors compose into a single divisor on the XP cost. Higher multiplier = cheaper per-point cost = more metric gain per resource unit.

```
η = ageMultiplier(maturity)
  × talentMultiplier(efficiencyClass)
  × greyMultiplier(isPrimary)
  × starDecayMultiplier(starsEarnedThisCycle)
  × adMultiplier (if 2× boost active)
  × drillLevelMultiplier
```

| Stage | Function | Description |
|---|---|---|
| 2a | `ageMultiplier(maturity)` | Linear interpolation over bracketed maturity table (ages 17–30) |
| 2b | `talentMultiplier(class)` | Five-tier lookup table (0.47⚠️ → 1.0✅ → 1.1⚠️ → 1.25⚠️ → 1.5⚠️); mid-tier confirmed, others provisional |
| 2c | `greyMultiplier(isPrimary)` | 1.0 for primary metrics; 0.22 for secondary |
| 2d | `starDecayMultiplier(stars)` | `STAR_DECAY^stars` — decays as CCI accumulates within a cycle |

**Proved:** P10 (η > 0 for all valid inputs), P11 (secondary < primary efficiency), P12 (efficiency class tiers strictly ordered grade 1 < … < grade 5), P13 (maturity multiplier non-increasing with maturity index). See `tests/proofs/test_z3_properties.py`.

---

### Step 6 — Metric Gain Integral

**Function:** `statGainFromBudget(startMetric, budget, η)` — Stage 5 in `engineMath.ts`

Iterates one metric point at a time from `startMetric`. Each point costs:

```
cost(m) = C₀ × exp(m / K) / η     where C₀ = 2.94, K = 47
```

Loop terminates when budget exhausted or metric hard cap (9999) reached. A fractional
remainder is banked as sub-integer progress (partial point carry).

```
gain = 0
while remaining > 0 and current < STAT_CAP:
    cost = xpCostAtStat(current) / η
    if cost > remaining:
        gain += remaining / cost    // fractional carry
        break
    remaining -= cost
    gain      += 1
    current   += 1
```

**Proved:** P5 (gain ≥ 0), P6 (gain ≤ STAT_CAP − startMetric). See `verification/dafny/gain_engine.dfy`.

---

### Step 7 — Composite Capability Index (CCI)

**Function:** `ovrFromStats(stats)` — Stage 6 in `engineMath.ts`

```
CCI = floor( Σ(all 15 metrics) / 15 )
```

`floor` confirmed: `ceil` is ruled out by a clean integer-only tier upgrade (Grant T2→T3:
sum = 2615, `floor(2615/15)` = 174 ✅, `ceil` = 175 ✗). The earlier `ceil` hypothesis
was an artefact of fractional training accumulation.

Classification tier bonuses are baked into the metric values, so the same formula covers
both base CCI and total CCI. `tierOvrContrib()` and `baseOvrFromTotal()` expose the
two-component decomposition shown in the UI.

**Proved:** P14 (CCI deterministic), P15 (CCI non-decreasing under metric increase). See `tests/proofs/test_z3_properties.py`.

---

### Step 8 — Capacity Ceiling Check

**Function:** `isTrainingLocked(baseCCI)` — Stage 8 in `engineMath.ts`

```
locked = baseCCI ≥ 180
```

The ceiling applies to **base CCI only** (total CCI minus tier contribution). Classification
tier bonuses can push total CCI well above 180 without triggering a lock — individual metrics
can also exceed 180 via tier bonuses. When seasonal degradation drops base CCI below 180,
the lock clears and investment resumes.

**Proved:** P18 (no false lockouts), P19 (no missed lockouts), P18+P19 bijection. See `tests/proofs/test_z3_properties.py`.

---

### Step 9 — Operational Readiness Update

**Function:** `conditionDrainPct(intensity, supportLevel)` — Stage 9 in `engineMath.ts`

For conditioning operations:

```
drain = BASE_LOSS × intensityMultiplier × (1 − supportReduction / 100)
```

Zero-drain fires when `drain < 0.375%`. Only minimum-intensity (`Very Easy`) at maximum
support level (50% reduction) qualifies: `0.75 × 1 × 0.5 = 0.375%`.

Restoration units recover 15% operational readiness per unit, capped at 100%.

**Proved:** P16 (degradation non-negative), P17 (more levels → lower or equal metric values). See `tests/proofs/test_crosshair_contracts.py`.

---

### Step 10 — Periodic Degradation (Season Boundary)

**Function:** `applySeasonDecay(stats, levelsPromoted, decayPerLevel)` — Stage 16 in `engineMath.ts`

At each operational period boundary, all metrics drop by `20 × levelsPromoted` points,
floored at zero. Primary and secondary metrics degrade equally. Classification tier bonuses
are not preserved across the boundary.

The flat model is confirmed: a proportional model diverges by 18–26 points on high-value
metrics and is rejected by the empirical data.

---

### Step 11 — Output

The UI receives projected gain per metric (fractional), projected CCI before and after, and
capacity ceiling status. The operator can compare scenarios, save the plan, or trigger a new
scan. No network call occurs at any point in the pipeline.

---

## 6. Formal Verification Summary

The verification stack proves nineteen named safety properties over the core engine pipeline.
All proofs run in CI on every pull request to main; a proof failure blocks merge.

`verification/engine_pure.py` is a pure, side-effect-free Python re-expression of
`src/engine/engineMath.ts`. The two must remain in sync — a divergence caught by a failing
proof is a bug in the spec, not a reason to weaken the property.

### 6.1 Dafny Machine-Checked Proofs (P1–P6)

Dafny 4.x discharges verification conditions via Boogie + Z3 4.12.1.
`budget_model.dfy` uses a recursive geometric sum (division-free) because Z3 cannot
discharge symbolic real division equalities over quantifier-free nonlinear real arithmetic.
`gain_engine.dfy` models the allocation loop as a fuel-bounded recursive function with
loop invariants as postconditions.

| Property | ID | Statement | File | Status |
|---|---|---|---|---|
| Positive budget | P1 | cycles > 0 ∧ \|metrics\| > 0 → budget > 0 | `budget_model.dfy` | ✅ Verified |
| Monotone budget | P2 | cycles₁ > cycles₂ → budget₁ > budget₂ | `budget_model.dfy` | ✅ Verified |
| Geometric ≤ linear | P3 | effectiveCycles ≤ N | `budget_model.dfy` | ✅ Verified |
| Zero cycles → zero budget | P4 | cycles = 0 → budget = 0 | `budget_model.dfy` | ✅ Verified |
| Gain non-negative | P5 | budget > 0 ∧ η > 0 → gain ≥ 0 | `gain_engine.dfy` | ✅ Verified |
| Gain bounded by cap | P6 | gain ≤ STAT\_CAP − startMetric | `gain_engine.dfy` | ✅ Verified |

**CI command:** `dafny verify --solver-path "$Z3_EXE" verification/dafny/budget_model.dfy`
**CI command:** `dafny verify --solver-path "$Z3_EXE" verification/dafny/gain_engine.dfy`

---

### 6.2 Crosshair Symbolic Contract Verification (P5, P6, P8, P9, P16, P17)

Crosshair symbolically executes `engine_pure.py` against PEP 316 docstring contracts.
A counterexample prints the violating inputs before failing. The CLI subprocess interface
is used (internal Python API is unstable across releases).

| Property | ID | Statement |
|---|---|---|
| Gain non-negative | P5 | budget > 0 ∧ η > 0 → gain ≥ 0 |
| Gain bounded | P6 | gain ≤ STAT\_CAP − startMetric |
| Gain monotone in budget | P8 | budget₁ ≥ budget₂ → gain(budget₁) ≥ gain(budget₂) |
| Gain monotone in multiplier | P9 | η₁ ≥ η₂ > 0 → gain(η₁) ≥ gain(η₂) |
| Degradation non-negative | P16 | `applySeasonDecay` never produces metric < 0 |
| Degradation non-increasing | P17 | more levels → lower or equal metric values |

---

### 6.3 Z3 SMT Proofs (P7, P10–P15, P18–P19)

Each proof encodes the **negation** of the property and asserts `unsat`. A satisfiable
result means a counterexample was found. `unknown` (timeout) is a hard failure — never
treated as a pass. Constants are wired from `constants_pure.py` and always reflect the
live `game_2025.json` values.

| Property | ID | Test | Statement |
|---|---|---|---|
| Zero multiplier → zero gain | P7a | `test_p7_zero_mult_implies_zero_gain` | η ≤ 0 → gain = 0 |
| Zero budget → zero gain | P7b | `test_p7_zero_budget_implies_zero_gain` | budget ≤ 0 → gain = 0 |
| Combined multiplier positive | P10 | `test_p10_combined_multiplier_positive` | η > 0 for all valid component values |
| Secondary < primary efficiency | P11 | `test_p11_grey_less_than_white` | greyMult(secondary) < greyMult(primary) |
| Efficiency class strict ordering | P12 | `test_p12_talent_ordering_strict` | Grade 1 < Grade 2 < Grade 3 < Grade 4 < Grade 5 (five tiers, strictly increasing) |
| Maturity multiplier non-increasing | P13 | `test_p13_age_multipliers_non_increasing` | older maturity → mult ≤ younger |
| CCI deterministic | P14 | `test_p14_ovr_deterministic` | same metric sum → same CCI |
| CCI non-decreasing | P15 | `test_p15_ovr_non_decreasing_on_stat_increase` | metric sum increases → CCI does not decrease |
| No false lockouts | P18 | `test_p18_no_false_lockouts` | baseCCI < 180 → not locked |
| No missed lockouts | P19 | `test_p19_no_missed_lockouts` | baseCCI ≥ 180 → locked |
| Lock bijection | P18+P19 | `test_p18_p19_lock_bijection` | locked ↔ baseCCI ≥ 180 (exhaustive) |

**CI command:** `pytest tests/proofs/ -m proof -v --timeout=30`

---

### 6.4 CI Gate

Both `z3-crosshair` and `dafny` jobs must pass before any pull request can merge to main.
A failing proof is a finding against the engine as it exists — not a reason to weaken the
property or alter the engine to make it pass. Main branch triggers EAS OTA to production
devices; the proof gate is the last line of defence before field deployment.

```yaml
# .github/workflows/proofs.yml (abridged)
jobs:
  z3-crosshair:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: actions/setup-python@<sha>
        with: { python-version: '3.12' }
      - run: pip install z3-solver crosshair-tool pytest pytest-timeout
      - run: pytest tests/proofs/ -m proof -v --timeout=30

  dafny:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: actions/setup-dotnet@<sha>
        with: { dotnet-version: '8.0' }
      - run: dotnet tool install --global dafny
      - run: |
          curl -fsSL https://github.com/Z3Prover/z3/releases/download/z3-4.12.1/...
          echo "Z3_EXE=$PWD/.../bin/z3" >> "$GITHUB_ENV"
      - run: dafny verify --solver-path "$Z3_EXE" verification/dafny/budget_model.dfy
      - run: dafny verify --solver-path "$Z3_EXE" verification/dafny/gain_engine.dfy
```

---

### 6.5 Open Verification Gaps

Four gaps remain before full end-to-end mathematical determinism. Details in
`docs/formal-verification-gap-analysis.md`. Sequencing: Gap 3 → Gap 4 → Gap 1 → Gap 2.

| Gap | Description | Priority | Status |
|---|---|---|---|
| Gap 3 | No equivalence test between `engineMath.ts` and `engine_pure.py` — proofs cover the Python spec only | Highest | Open — `verification/run_ts.ts` + Hypothesis differential test needed |
| Gap 4 | Fractional gain branch (`remaining/cost`) conservatively modelled as `0.0` in `gain_engine.dfy` | High | Open — try `smt.arith.solver=6`; fallback `{:axiom} DivLtOne` |
| Gap 1 | OCR output enters engine without formally-bounded validation | Medium | Open — Zod schema + Dafny `newtype` boundary types |
| Gap 2 | Calibration constants carry unquantified uncertainty; 15–20 observations below ~88 needed for ±5% CI | Low | Ongoing — Bayesian inference (PyMC3) on existing data |

---

*Document maintained by the system architect. File paths, constant values, calibration
status, and proof counts are the authoritative record. Engine constant changes must be
accompanied by empirical evidence in `profiles/calibration_data.json`. Proof status must
reflect the latest CI run.*
