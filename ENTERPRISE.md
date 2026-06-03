# Squad Optimiser — Enterprise Overview

**Version 1.2 — Sprint 34**

---

## What It Is

Squad Optimiser is a mobile decision-support application for managers of football simulation games that use a stat-based player rating system. It turns three inputs — a player's current stats, a resource budget, and a target outcome — into a deterministic, step-by-step investment plan.

It is an offline-first, zero-API tool. No data leaves the device. No cloud subscription is required to run projections.

---

## The Problem It Solves

Football simulation games offer multiple resource types (training sessions, tier upgrade points, condition items) that each affect player ratings differently. Without tooling, managers must estimate outcomes by feel, often committing premium resources to suboptimal sequences.

The cost of a wrong choice compounds: applying a tier upgrade before training increases the baseline stat values the XP engine must work against, permanently raising the per-point cost of future training. The correct sequence — always drills before tier upgrade — is not obvious from in-game UI alone.

Squad Optimiser makes the correct sequence explicit and provides calibrated projections — based on empirically verified game mechanics — of how many sessions at what cost produce what rating.

---

## Core Features

### OVR Projection Engine

Given a player's 15 individual stat values, the engine computes:
- Per-stat XP cost at current value using a calibrated exponential cost curve
- Projected stat gain from a given training block (session count × drill type × intensity)
- New OVR after training, tier upgrade, or both — in the correct application order
- Warnings when training is locked (base OVR ≥ cap), when stats are missing, or when selected drills don't apply to the player's role

The OVR formula is verified empirically from device screenshots: `OVR = floor(mean of all 15 stats)`. Confirmed definitively from a clean integer-only tier upgrade (Grant T2→T3): displayed sum 2615, game OVR 174, `floor(174.33) = 174` ✓.

### Calibrated XP Model

The training cost model uses a continuous exponential curve derived from observed game data:

```
cost(stat) = 2.94 × exp(stat / 47)
```

K=47 fitted via calibration solver (minimises CV across 5 Grant ×40 observations, CV=3.2%). C₀=2.94 confirmed from the gain ratio between stats at values 120 and 228 in the same coaching session. Both constants are in `profiles/game_2025.json`.

Age, talent tier, stat whiteness (role-essential vs secondary), drill intensity, and ad multipliers are all factored in. The OVR formula, cost curve shape, and confirmed age/talent brackets are validated from real game screenshots. Some talent tiers (Fastest, Fast, Average) and age brackets (21–23, 25, 29–30) are community estimates pending empirical validation.

### Role-Aware Stat Classification

Each player position has a defined set of essential stats (white) and secondary stats (grey). Grey stats train at significantly reduced XP efficiency (approximately 4.5× more XP per point vs white stats — `greyWeightMultiplier = 0.22`, confirmed from game data). When a player holds multiple positions, the white set is the union of all positions' essential lists — this maximises projection accuracy and matches the in-game mechanic.

Stat whiteness is determined at projection time from the player's current role selection, not hardcoded per player.

### On-Device OCR — Player Card and Coach Preview

The app scans in-game screenshots using ML Kit text recognition (on-device, no network). Two scanner types:

**Player Card Scanner** — extracts player name, age, roles, tier, talent, OVR, and all 15 stat values from a screenshot of the player's profile card.

**Coach Preview Scanner** — extracts coach type (Standard / Focused / Extensive), category (Attacking / Defending / Physical / Safeguard), session multiplier, and the specific stats the coach boosts. Two states are handled: when a player is selected (gain ranges visible) and when no player is selected (arrow indicators only).

All extraction is performed on-device. No image data is transmitted. No AI or cloud inference is used at any point.

### Tier Upgrade Modelling

Tier upgrades add a flat bonus to each essential (white) stat. The bonus is role-specific — secondary stats and off-role stats receive nothing. The engine applies tier upgrades in the correct post-training position and recomputes OVR from the full updated stat set.

Tier progressions are modelled step by step (T0 → T1 → T2 → …) so multi-tier upgrade paths show incremental OVR gains and point costs at each step.

### Condition and Drill Drain Model

Each drill has a fixed condition cost per run:
```
conditionLoss = 0.75% × intensityMultiplier × (1 − fanClubReduction)
```

At the highest fan club level (50% reduction) combined with the lowest intensity, condition loss rounds to zero — enabling continuous drilling with no condition drain. The engine identifies this zero-drain state and flags it explicitly.

---

## Architecture

### Runtime Stack

| Layer | Technology |
|---|---|
| Framework | React Native (Expo SDK 53) |
| Routing | expo-router (file-based) |
| Local DB | SQLite via Drizzle ORM + expo-sqlite |
| OCR | ML Kit text recognition (on-device) |
| Language | TypeScript (strict) |

### Data Flow

```
Game screenshot
    ↓ ML Kit OCR (on-device)
    ↓ playerScanner.ts / coachScanner.ts
    ↓ extracted stat values + coach metadata
    ↓ ovrProjector.ts + xpEngine.ts
    ↓ per-step OVR projection
    ↓ UI display (coaches.tsx / results.tsx)
```

No step in this chain makes a network request. The profile parameters (`profiles/game_2025.json`) are bundled at build time.

### Key Modules

| Module | Role |
|---|---|
| `src/logic/xpEngine.ts` | XP cost model, OVR formula, tier bonus application, age/talent multipliers |
| `src/logic/ovrProjector.ts` | Full projection chain: drills → tier → condition |
| `src/logic/coachScanner.ts` | Coach preview OCR: type/category/multiplier, highlighted stat detection |
| `src/logic/playerScanner.ts` | Player card OCR: stats, roles, tier, talent, OVR |
| `src/logic/coachPipeline.ts` | Post-OCR consolidation: discards image values, resolves stat names, dispatches to projection engine |
| `src/database/drillDatabase.ts` | Drill catalogue: 40 drills across 4 types and 5 intensities |
| `profiles/game_2025.json` | Calibrated game parameters: XP curve, age table, tier additions, drill multipliers |

### Local Database (SQLite)

Player records, saved projection runs, and drill presets are stored in a device SQLite database managed by Drizzle ORM. Migrations are incremental and idempotent. No sync, no remote storage, no account required.

---

## Privacy and Security

- **Zero network calls during operation.** No API keys. No telemetry. No analytics.
- **All OCR runs on-device** via ML Kit. Images are processed in memory and never persisted or transmitted.
- **All player data stays on device.** The SQLite database is local only. No backup to cloud services is performed by the app.
- **No account, no login.** The app functions entirely without user authentication.

---

## Accuracy and Calibration

The projection engine is calibrated against observed in-game data, not theoretical models:

| Parameter | Status | Calibration source |
|---|---|---|
| OVR formula (`floor`) | ✅ Confirmed | Grant T2→T3 clean tier upgrade: sum 2615, game OVR 174, `floor(174.33)=174` ✓ |
| XP cost curve (K=47, C₀=2.94) | ✅ Confirmed | K fitted via CV minimisation across 5 sessions; C₀ from gain ratio at stat 120 vs 228 |
| baseXpPerSession (676) | ✅ Confirmed | Grant ×40 Standard Defending — all 5 stats within game ranges |
| greyWeightMultiplier (0.22) | ✅ Confirmed | Grant HEADING (grey, stat=155) — actual +11–15 matches model |
| Age 18–20 (×1.0) | ✅ Confirmed | Grant age 20 — multiple sessions match |
| Age 24–25 (×0.72) | ✅ Confirmed | Garry McCluskey age 24 — Fitness actual +2–3 vs engine +3.5 ✓ |
| Age 26–28 (×0.61) | ✅ Confirmed | McGinty age 27 — projection matches |
| Age 17, 21–23, 29, 30+ | ⚠️ Unconfirmed | Community estimates — no empirical validation yet |
| Normal talent (×1.0) | ✅ Confirmed | Grant, Rogers, McGinty — multiple sessions |
| Slow talent (×0.47) | ⚠️ Single data point | LJDark Leo ×114 GK — within game range but may be 0.49–0.52 |
| Fastest/Fast/Average talent | ⚠️ Unconfirmed | Community estimates — no calibration player identified |
| Condition formula | ✅ Confirmed | In-game screenshot verification across all intensity/fan club levels |
| Tier bonus (white stats only) | ✅ Confirmed | Grant T2→T3: every white stat +20, grey stats +0 |

Projections are estimates, not guarantees. The game has internal state (fractional stat accumulation, unobservable carryover XP) that is not visible from screenshots. Actual results will differ slightly from projections — typically by 1–3 stat points on individual stats.

Known limitations: Fastest/Fast/Average talent multipliers are unconfirmed community estimates. Age brackets 17, 21–23, and 29+ are assumed. The ×N anomaly (whether doubling session count scales proportionally) is under investigation. Drill XP factor (`drillXpFactor = 0.3`) is uncalibrated. Training Camp sessions are explicitly not projected — the app shows a warning when a Training Camp is detected.

---

## Deployment

The app is distributed via EAS (Expo Application Services) as an Android APK. OTA (over-the-air) updates are delivered on the `main` branch. Development and feature work is committed to a separate branch before merging.

The app does not require Play Store distribution — it can be installed directly from a build URL on any Android device.

---

## Development Status

| Feature | Status |
|---|---|
| OVR projection engine | Production — calibrated, verified |
| Player card OCR | Production — role anchoring, multi-role detection |
| Coach preview OCR | Production — handles player-selected and no-player states |
| Drill catalogue (40 drills) | Production |
| Tier upgrade modelling | Production |
| Condition drain model | Production |
| Drill preset saving | Production |
| New role training progress | Production |
| Team Play system modelling | Not modelled — documented only |
| Squad-wide aggregate projection | Not modelled — single-player projection only |
| ×N session scaling formula | Under investigation |
