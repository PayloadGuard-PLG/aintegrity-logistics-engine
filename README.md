# AIntegrity Logistics Engine

![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-blue)
![Verified](https://img.shields.io/badge/engine-formally%20verified-green)
![Proofs](https://img.shields.io/badge/proofs-30%2F30%20pass-brightgreen)
![License](https://img.shields.io/badge/license-Non--Commercial-red)

A deterministic, offline-first maintenance investment engine. Given a tracked physical asset, a proposed investment cycle, and a calibrated cost model — the engine projects the outcome before any resource is committed. All computation is pure-functional and formally verified.

---

## What It Does

Field operators need to know the return on a maintenance investment cycle *before* committing it. Estimates based on averages or community data are unreliable when asset profiles vary. This engine applies a calibrated exponential cost model — back-calculated from controlled field observations — to project per-metric gains for any asset at any profile point.

The projection accounts for:
- Asset maturity index (efficiency degrades with age)
- Efficiency class (Class-A / Standard / Degraded)
- Primary vs secondary metric weighting
- Geometric budget decay over long investment runs
- Domain-configurable capacity ceiling rules

---

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+

### Install

```bash
git clone https://github.com/PayloadGuard-PLG/aintegrity-logistics-engine.git
cd aintegrity-logistics-engine
git checkout claude/squad-optimiservp-BQH8C
npm ci
```

### TypeScript check

```bash
npx tsc --noEmit
```

### Run formal proofs

```bash
pip install z3-solver crosshair-tool pytest pytest-timeout hypothesis
pytest tests/proofs/ -m proof -v
```

```bash
dotnet tool install --global dafny
dafny verify verification/dafny/budget_model.dfy
dafny verify --boogie /proverOpt:O:smt.arith.solver=6 verification/dafny/gain_engine.dfy
```

---

## Engine Architecture

```
OCR ingest → Zod validation
→ geometric budget calculation
→ efficiency multiplier composition  (maturity × efficiency class × metric weight × decay)
→ per-metric gain integral           (exponential cost curve: C₀ × exp(m / K))
→ CCI formula                        (floor(Σmetrics / totalAttributeCount))
→ ceiling check                      (evaluateRuleSet against CeilingRule[])
```

The Python verification layer (`verification/engine_pure.py`) is a parallel re-expression of the same mathematics, formally compared against the TypeScript engine by Hypothesis differential tests on every PR.

Full specification: [SYSTEM_BLUEPRINT.md](https://github.com/PayloadGuard-PLG/aintegrity-logistics-engine/blob/claude/squad-optimiservp-BQH8C/SYSTEM_BLUEPRINT.md) · [SPEC.md](https://github.com/PayloadGuard-PLG/aintegrity-logistics-engine/blob/claude/squad-optimiservp-BQH8C/SPEC.md)

---

## Formal Verification

30 safety properties are machine-checked on every pull request to main. A proof failure blocks the merge.

| Layer | Tool | Properties |
|---|---|---|
| Dafny machine-checked | Dafny 4.x + Z3 4.12.1 | P1–P6: budget geometry, gain loop bounds, MetricValue newtype |
| Z3 SMT proofs | z3-solver | P7, P10–P15, P18–P19, P18-param, P19-param, P22: multiplier ordering, CCI monotonicity, ceiling bijection, variance non-negativity |
| Crosshair symbolic | crosshair-tool | P5, P6, P8, P9, P16, P17, P20, P21: gain safety, decay safety, intervention monotonicity |
| Hypothesis differential | Python + Node.js | 7 functions, 200 examples each, ε = 1e-10: Python spec vs TypeScript engine |

---

## Calibration Policy

Every engine constant must be back-calculated from actual field observations (before/after metric readings from controlled interventions). Constants without empirical backing are labelled `⚠️ ASSUMED` and treated as placeholders.

All constants live in `profiles/logistics_v1.json`. Evidence is logged in `profiles/calibration_data.json`.

---

## Project Structure

```
src/engine/          Core deterministic math — no React, no I/O
src/logic/           OCR pipelines, Zod ingest boundary, orchestration
src/services/        Database access layer (Drizzle ORM + expo-sqlite)
src/types/           Canonical TypeScript interfaces
profiles/            Calibrated constants + empirical observation log
verification/        Python proof spec layer and Dafny sources
tests/proofs/        Formal proof test suite
.github/workflows/   CI: proof gate (proofs.yml) + OTA (eas-update.yml)
SYSTEM_BLUEPRINT.md  Full system architecture reference (dev branch)
SPEC.md              Full function-level specification (dev branch)
```

---

## Development

All active work is on branch `claude/squad-optimiservp-BQH8C`. Never push directly to `main` — main triggers EAS OTA to production devices. All changes go to the branch above; merge via PR so the proof gate runs first.

---

## Licence

Non-commercial. See `LICENSE` for terms.
