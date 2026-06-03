# AIntegrity Logistics Engine — Developer Notes

---

## For the Next Claude — Read This First

**Active branch:** `claude/squad-optimiservp-BQH8C`  ← pushed to `payloadguard-plg/aintegrity-logistics-engine`
**Never push to main directly** — main triggers EAS OTA to production devices. All work goes to the branch above; user merges via PR.

**Source repo:** Forked from `payloadguard-plg/aintegrity-squad-optimiser`. The engine mathematics and formal verification layer are carried over unchanged. All football-specific vocabulary has been replaced. Do not re-introduce any source-game IP.

**Sprint 1 status (2026-06-03): COMPLETE — branch pushed, 30/30 proofs pass, `npx tsc --noEmit` clean.**
- All football-derived symbol names renamed to domain-agnostic names throughout (see DEVLOG.md Sprint 1 for full mapping).
- CI workflow files (`eas-update.yml`, `proofs.yml`) are on the branch.
- Next: SPEC.md and CLAUDE.md documentation terminology pass (OVR→CCI, stat→metric, etc.) — deferred to Sprint 2.

---

## Domain Overview

This engine projects the outcome of any maintenance investment cycle (time, resource units, or intervention budget) for a tracked physical asset *before* it is committed. The cost model is a calibrated exponential function back-calculated from controlled field observations. All computation is pure-functional and formally verified.

**Key vocabulary mapping from source repo:**

| Source domain (football) | This domain (logistics) |
|---|---|
| player | asset |
| coach session | investment cycle |
| OVR / star quality | CCI (Composite Capacity Index) |
| talent tier | efficiency class |
| tier upgrade | lifecycle stage upgrade |
| condition / restorers | operational readiness |
| fan club level | support level |
| white/grey stat | primary/secondary metric |
| role | primary metric set |

---

## Formal Verification Layer

The three-layer proof stack (Dafny + Z3 + Crosshair) and Hypothesis differential tests are inherited unchanged from the source repo. All 19 original properties gate every PR to main via CI. Additional properties P18-param/P19-param/P20/P21/P22 are added in Phase B (see plan).

**Files:**
- `verification/constants_pure.py` — engine constants loaded from `profiles/logistics_v1.json`
- `verification/engine_pure.py` — pure Python spec of `src/engine/engineMath.ts` with PEP 316 contracts
- `verification/multipliers_pure.py` — multiplier helper functions
- `verification/run_ts.ts` — persistent Node.js subprocess runner for equivalence tests
- `verification/dafny/budget_model.dfy` — Dafny proofs P1–P4 (budget model)
- `verification/dafny/gain_engine.dfy` — Dafny proofs P5–P6 (gain loop)
- `tests/proofs/test_z3_properties.py` — Z3 SMT proofs P7, P10–P15, P18–P19
- `tests/proofs/test_crosshair_contracts.py` — Crosshair symbolic contracts P5, P6, P8, P9, P16, P17
- `tests/proofs/test_ts_equivalence.py` — Hypothesis differential tests: Python spec vs TS engine

**To run proofs locally:**
```bash
npm ci
pip install z3-solver crosshair-tool pytest pytest-timeout hypothesis
pytest tests/proofs/ -m proof -v --timeout=60
```
```bash
dotnet tool install --global dafny
dafny verify verification/dafny/budget_model.dfy
dafny verify --boogie /proverOpt:O:smt.arith.solver=6 verification/dafny/gain_engine.dfy
```

**Rules:**
- Do NOT modify `src/engine/engineMath.ts` or `profiles/logistics_v1.json` to make proofs pass — a failing proof is a finding to report, not a reason to weaken the property.
- The proof files verify the engine as it exists. If any tool cannot discharge a property, report it explicitly.

---

## Calibration Policy — Empirical Data Only

Every engine constant must be back-calculated from actual field observations (before/after metric readings from controlled interventions). If there is no empirical field observation backing a value, it is ASSUMED and must be labelled as such.

**Current status of all constants (new key names — see `profiles/logistics_v1.json`):**

| Constant (new name) | Value | Status | Evidence |
|---|---|---|---|
| `costCurveBase` (C₀) | 2.94 | ✅ Transferred (high) | Back-calculated in source domain (CV 3.2%). Structural constant — domain-agnostic. |
| `costCurveDecay` (K) | 47 | ✅ Transferred (high) | CV 3.2% across 5 source observations. Recalibrate from field data. |
| `baseResourcesPerCycle` | 676 | ⚠️ ASSUMED | Placeholder. Back-calculate from first controlled field observation. |
| `cycleBudgetDecay` | 0.99 | ⚠️ Provisional | Geometric shape confirmed in source domain. Recalibrate from repeated-intervention data. |
| `secondaryMetricWeight` | 0.22 | ⚠️ ASSUMED | Placeholder secondary metric cost penalty. |
| `capacityCeiling` | 180 | ⚠️ ASSUMED | Placeholder — replace with domain-specific CeilingRule[] (Phase B). |
| `maturityMultipliers` | see profile | ⚠️ ASSUMED | Maturity table placeholder — calibrate from asset age cohort data. |
| `efficiencyClassMultipliers` | Class-A/Standard/Degraded | ⚠️ ASSUMED | Efficiency class multipliers — calibrate from asset spec data. |

**When adding or changing any constant:** record the field observation in `profiles/calibration_data.json` and update the table above.

---

## Architecture

The engine is a linear, deterministic pipeline of pure functions in `src/engine/engineMath.ts`. It reads calibrated constants from `profiles/logistics_v1.json` at module load time. Data enters via OCR (document scanner or asset profile scanner), is validated at the Zod ingest boundary (`src/logic/investmentPipelineSchema.ts`), and flows through:

```
geometric budget calculation
→ efficiency multiplier composition
→ per-metric gain integral (metricGainFromBudget)
→ composite capacity index formula
→ ceiling check (evaluateRuleSet)
```

The Python verification layer (`verification/engine_pure.py`) is a parallel re-expression of the same mathematics, formally compared against the TypeScript engine by Hypothesis differential tests.

Full specification: `SYSTEM_BLUEPRINT.md`

---

## Phase B Architectural Extensions (in progress)

| Problem | Change | Status |
|---|---|---|
| B1 | DynamicsModel interface (`src/engine/dynamicsModel.ts`) | ✅ DONE |
| B2 | applyIntervention Stage 11 + P20/P21 Crosshair contracts | ✅ DONE |
| B3 | evaluateRuleSet + isTrainingLocked refactor + P18-param/P19-param + lock_when_bad Z3 | ✅ DONE |
| B6 | Zod ingest boundary (DocumentScanResultSchema) + MetricValue Dafny newtype | ✅ DONE |
| B4 | propagateUncertainty / ProjectionBand + P22 Z3 | ✅ DONE |
| B5 | getConstantMeta() accessor + load_constant_meta() Python mirror | ✅ DONE |

**Current proof count: 30/30 pass** (8 Crosshair + 7 equivalence + 15 Z3)

---

## Key Files

```
src/engine/engineMath.ts          Core deterministic math — no React, no I/O
src/engine/engineConstants.ts     Constants loaded from logistics_v1.json
src/engine/dynamicsModel.ts       DynamicsModel interface (Phase B1)
src/types/resources.ts            Domain types: Asset, DomainProfile, ConstantMeta, CeilingRule, etc.
src/logic/investmentPipeline.ts   Investment cycle orchestration (renamed from coachPipeline)
src/logic/investmentPipelineSchema.ts  Zod ingest boundary (Phase B6)
src/logic/documentScanner.ts      Generic OCR scanner (replaces coachScanner)
src/logic/assetProfileScanner.ts  Asset profile OCR scanner (replaces playerScanner)
src/services/assetService.ts      DB access layer for assets (renamed from playerService)
src/utils/metricWeights.ts        Domain metric taxonomy (replaces roleWeights)
profiles/logistics_v1.json        Calibrated constants + _meta provenance
profiles/calibration_data.json    Field observation log (not loaded at runtime)
verification/                     Python proof spec layer and Dafny sources
tests/proofs/                     Formal proof test suite
```

---

## Development Workflow

```bash
# TypeScript check:
npx tsc --noEmit

# Run all proofs:
pytest tests/proofs/ -m proof -v --timeout=60

# Push to dev branch (NEVER push to main — triggers EAS OTA):
git push -u origin claude/squad-optimiservp-BQH8C
```
