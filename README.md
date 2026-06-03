# AIntegrity Resource Allocation Engine

![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-blue)
![Updates](https://img.shields.io/badge/updates-OTA%20via%20EAS-brightgreen)
![Verified](https://img.shields.io/badge/engine-formally%20verified-green)
![License](https://img.shields.io/badge/license-Non--Commercial-red)

**A deterministic, offline-first resource allocation and operational capacity projection engine.**

Given a pool of tracked assets, a set of proposed investment cycles, and a calibrated cost model — the engine projects the outcome of any allocation decision before it is committed. All computation is pure-functional and formally verified. No accounts, no servers, no API calls.

---

## What It Does

**The problem:** Field operators need to know the return on an investment cycle (time, resource units, or training budget) *before* committing it — not after. Estimates based on averages or community data are unreliable when asset profiles vary significantly.

**The solution:** A calibrated exponential cost model, empirically back-calculated from controlled field observations, projects per-metric gains for any asset at any profile point. The projection accounts for asset maturity, efficiency class, primary vs secondary metric weighting, and geometric budget decay over long investment runs.

### Core Capabilities

- **Calibrated Capacity Projections** — Projects the outcome of any proposed investment cycle for any tracked asset. The cost curve, budget decay, and efficiency multipliers are back-calculated from real observations, not estimates. Confirmed constants are validated; unconfirmed constants are clearly labelled.
- **OCR Data Ingestion** — Scan physical or digital field documents via the device camera. ML Kit Vision processes images entirely on-device — no data leaves the device.
- **Conditioning Operation Scheduling** — Ranks all available conditioning operations by return on operational readiness for the selected asset and support level. Zero-drain detection at maximum support.
- **Sequential Allocation Planning** — Chain investment cycles, conditioning operations, and classification upgrades into a single sequential plan with a per-step capacity index breakdown.
- **Formally Verified Engine** — Nineteen safety properties are machine-checked on every CI run via Dafny, Z3, and Crosshair. A proof failure blocks deployment.

---

## Architecture in One Paragraph

The engine is a linear, deterministic pipeline of pure functions in `src/engine/engineMath.ts`. It reads calibrated constants from `profiles/logistics_v1.json` at module load time. Data enters via ML Kit OCR, is validated, and flows through: geometric budget calculation → efficiency multiplier composition → per-metric gain integral → composite capacity index formula → ceiling check. The Python verification layer (`verification/engine_pure.py`) is a parallel re-expression of the same mathematics, formally compared against the TypeScript engine by Hypothesis differential tests on every PR.

Full specification: [`SYSTEM_BLUEPRINT.md`](./SYSTEM_BLUEPRINT.md) · [`SPEC.md`](./SPEC.md)

---

## Quick Start

### Prerequisites

- Node.js 20+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`) — for builds and OTA
- Android or iOS device with Expo Go, or a local simulator

### Install

```bash
git clone https://github.com/PayloadGuard-PLG/aintegrity-logistics-engine.git
cd aintegrity-logistics-engine
git checkout claude/squad-optimiservp-BQH8C
npm ci
```

### Run in development

```bash
npx expo start
```

Scan the QR code with Expo Go, or press `a` for Android emulator / `i` for iOS simulator.

### TypeScript check

```bash
npx tsc --noEmit
```

---

## Engine Verification

The formal proof stack runs on every pull request to main. Both jobs must pass before merge.

### Run proofs locally

```bash
pip install z3-solver crosshair-tool pytest pytest-timeout hypothesis
pytest tests/proofs/ -m proof -v --timeout=60
```

```bash
dotnet tool install --global dafny
dafny verify verification/dafny/budget_model.dfy
dafny verify --boogie /proverOpt:O:smt.arith.solver=6 verification/dafny/gain_engine.dfy
```

### What is proved

| Layer | Tool | Properties |
|---|---|---|
| Dafny machine-checked | Dafny 4.x + Z3 | P1–P6: budget geometry, gain loop bounds, MetricValue newtype |
| Z3 SMT proofs | z3-solver | P7, P10–P15, P18–P19, P18-param, P19-param, P22: multiplier ordering, CCI monotonicity, ceiling bijection, variance non-negativity |
| Crosshair symbolic | crosshair-tool | P5, P6, P8, P9, P16, P17, P20, P21: gain safety, decay safety, intervention monotonicity |
| Hypothesis differential | Python + Node.js | Python spec vs TypeScript engine, ε = 1e-10, 200 × 7 functions |

A proof failure means either a property was violated or a constant changed in a way that breaks a guaranteed bound. Neither is silenced — they are findings.

---

## Calibration

All engine constants live in `profiles/logistics_v1.json`. Each constant has a calibration status:

| Status | Meaning |
|---|---|
| ✅ Confirmed | Back-calculated from ≥ 2 independent controlled observations |
| ⚠️ Provisional | Back-calculated from a single observation; needs confirmation |
| ⚠️ Assumed | No empirical basis; placeholder pending controlled data |

When adding or changing any constant, record the evidence in `profiles/calibration_data.json`. The verification layer reads `game_2025.json` directly — a constant change that breaks a proof is a CI failure, not a merge blocker to paper over.

---

## OTA Deployment

```bash
eas update --branch production --message "describe the change"
```

Builds are managed via EAS. Pushes to `main` trigger an automatic OTA update. **Never push directly to `main`** — use a branch and merge via PR so the proof gate runs first.

---

## Project Structure (top level)

```
src/engine/          Core deterministic math — no React, no I/O
src/logic/           OCR pipelines and orchestration
src/services/        Database access layer (Drizzle ORM + expo-sqlite)
profiles/            Calibrated constants and empirical observation log
verification/        Python proof spec layer and Dafny sources
tests/proofs/        Formal proof test suite
.github/workflows/   CI: proof gate (proofs.yml) + OTA (eas-update.yml)
SYSTEM_BLUEPRINT.md  Full system architecture reference
SPEC.md              Full function-level specification
```

---

## Licence

Non-commercial. See `LICENSE` for terms.
