# Squad Optimiser — OCR + Math Handover

## Goal

Fix coach preview OCR accuracy and projection math interpretation in Squad Optimiser. The primary visible bug is duplicate `CONCENTRATION` in coach scan output, which causes React duplicate key warnings and unstable stat rows. The secondary issue is possible mismatch in age-based XP scaling if the game uses discrete age bands rather than interpolation.

## What I observed

From logs and screenshots:
- `CONCENTRATION` is emitted twice in the coach scan output.
- React throws: `Encountered two children with the same key, CONCENTRATION`.
- Coach preview rows sometimes show mismatched gain bands.
- The coach preview screen and projection screen are showing consistent baselines, but OCR parsing is still unstable.
- The XP engine appears structurally coherent, but the age multiplier implementation may be over-smoothing a banded table.

## Files reviewed

### `src/logic/xpEngine.ts`
Current math:
- `xpBaseForStat(statValue, profile)` uses either:
  - exponential formula `profile.xpCostBase * exp(statValue / profile.xpCostDecayK)`, or
  - table lookup fallback.
- `xpNeededFor1Pct(...)` applies:
  - age multiplier
  - star decay
  - talent multiplier
  - white/grey multiplier
  - ad multiplier
  - drill level multiplier
- `estimateStatGainPct(...)` spends XP until exhausted, adding 1% per full cost step and fractional remainder at the end.
- `getAgeMultiplier(...)` linearly interpolates between ages in `profile.ageTable`.

### `profiles/game_2025.json`
Important values:
- `xpCostBase: 2.94`
- `xpCostDecayK: 55`
- `ageTable` is discrete:
  - 17: 1.1
  - 18–20: 1.0
  - 21–23: 0.85
  - 24–25: 0.72
  - 26–28: 0.61
  - 29: 0.50
  - 30: 0
- `greyWeightMultiplier: 0.5`
- `starDecayPerSession: 0.85`
- `baseXpPerSession: 450`
- `qualityOvrDivisor: 1`
- `totalAttributeCount: 15`
- `maxBaseOvr: 180`

### `src/logic/coachScanner.ts`
This is the main bug source:
- It uses ML Kit text recognition.
- It detects stat names from OCR tokens.
- It filters right-side row tokens for gain ranges.
- It has a secondary embedded-stat scan for merged OCR text.
- It currently uses `rowNums[0]` as the baseline stat value, which is unsafe in merged rows.
- It currently pushes captures into an array, which allows duplicate stat names.
- It can emit duplicate `CONCENTRATION`.

### `src/logic/coachPipeline.ts`
Secondary risk:
- It trusts `scan.stats.map(s => s.statName)` directly.
- It can pass duplicates downstream unless deduped again.

## Root cause summary

The OCR path is the primary issue:
- The same stat can be captured once in the primary row pass and again in the embedded-stat pass.
- `rowNums[0]` can belong to the wrong stat or the wrong column when ML Kit merges adjacent text.
- Because the output is not canonicalized, the UI receives duplicate keys and unstable row data.

The math layer is likely fine except for age interpretation:
- The profile age table looks banded/discrete.
- The code interpolates between ages.
- If the real game uses stepwise age brackets, interpolation will introduce projection error.

## Required fix order

### 1) Fix OCR capture deduplication in `coachScanner.ts`
Use canonical stat normalization and a keyed map:
- Normalize all stat names to uppercase and trim spaces.
- Store captures in `Map<string, StatCapture>`.
- Add `upsertStat(next)` that keeps the best capture for each stat.
- Prefer:
  - real baseline over arrow-only rows,
  - narrower gain span,
  - then better row geometry if needed.
- Final return must be a unique sorted array.

### 2) Fix baseline selection in `coachScanner.ts`
Replace `rowNums[0]` with nearest-number selection:
- choose the numeric token closest to the stat token within the same row
- do not assume the first numeric token belongs to that stat

### 3) Keep the embedded-stat fallback, but make it safe
The embedded-stat scan exists because ML Kit merges adjacent columns.
Keep it, but ensure it cannot duplicate an already captured stat.

### 4) Add a pipeline dedupe guard in `coachPipeline.ts`
Before resolving stats for UI/projection:
- dedupe `scan.stats.map(s => s.statName)` with an order-preserving unique function or `Set`
- use the deduped list downstream

### 5) Do not touch XP math yet unless proven necessary
Leave these alone until OCR is fixed and retested:
- `xpNeededFor1Pct`
- `estimateStatGainPct`
- `applyTierBonusToStats`
- `qualityPctToOvr`
- `projectOvr`

## Math interpretation note

The one math function that may need adjustment is `getAgeMultiplier`.
Current behavior:
- It sorts `profile.ageTable` ages.
- It linearly interpolates between adjacent ages.
- This means age 21.5 can get a multiplier between 21 and 22.

Potential issue:
- The age table looks like discrete bands, not a continuous curve.
- If the game is stepwise by age, interpolation is the wrong interpretation.

Safer interpretation:
- Use exact age lookup if present.
- Otherwise fall back to the nearest lower bracket.
- Do not interpolate unless there is evidence the game smooths age decay.

## Expected outcome after OCR fix

- No duplicate `CONCENTRATION`.
- No duplicate React key warning.
- Coach preview rows become stable.
- Baseline values should attach to the correct stat.
- Projection outputs become more trustworthy because the inputs are cleaner.
- OVR math should remain unchanged unless previous OCR output was contaminating the projection.

## If the math still looks off after OCR fix

If coach row gains still disagree with expected ranges after OCR is stable:
1. Change `getAgeMultiplier` from interpolation to discrete bracket lookup.
2. Retest the same screenshots.
3. Compare the results to the current interpolation version.
4. Keep the version that best matches observed in-game behavior.

## Safety / rollout

This should be a JavaScript/TypeScript-only patch and is suitable for Expo OTA under the current setup:
- Expo SDK 53
- `expo-updates` enabled
- `runtimeVersion.policy = appVersion`
- preview and production channels already configured

## Decision rule

Fix OCR first. If the projection mismatch remains after OCR is stable, then adjust age multiplier handling. Do not change the core XP curve, talent multipliers, star decay, or tier math unless there is a separate confirmed bug.
