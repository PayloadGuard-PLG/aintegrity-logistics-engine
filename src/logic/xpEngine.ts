/**
 * xpEngine.ts — Thin adapter layer.
 *
 * All math is now in src/engine/engineMath.ts (pure functions, no profile objects).
 * This file keeps the GameProfile-typed signatures for backward compatibility with
 * existing callers (ovrProjector, investment tab, etc.) while delegating to engineMath.
 *
 * To tune a constant: update profiles/logistics_v1.json.
 * To understand a formula: read src/engine/engineMath.ts.
 * To see calibration evidence: read src/engine/engineConstants.ts.
 */

import { GameProfile, TalentTier, TierName } from '../types/resources';
import {
  costAtMetric,
  maturityMultiplier,
  combinedMultiplier,
  thresholdsCrossedFromCciGain,
  metricGainFromBudget,
  cciFromMetrics,
  cciFromMetricsWithPadding,
  applyPeriodicDegradation,
} from '../engine/engineMath';
import { PERIODIC_DEGRADATION } from '../engine/engineConstants';

// Re-export engineMath functions for callers that don't need GameProfile wrappers
export {
  costAtMetric,
  maturityMultiplier as getMaturityMultiplierDirect,
  combinedMultiplier,
  thresholdsCrossedFromCciGain,
  metricGainFromBudget,
  cciFromMetrics,
  cciFromMetricsWithPadding,
  estimateEfficiencyClassFromGain,
} from '../engine/engineMath';

// ─── GameProfile wrappers (backward compatibility) ───────────────────────────

/** Resource cost per metric point at a given metric value. Delegates to engineMath.costAtMetric. */
export function xpBaseForStat(statValue: number, _profile: GameProfile): number {
  return costAtMetric(statValue);
}

/** Maturity multiplier for a given maturity index. Delegates to engineMath.maturityMultiplier. */
export function getAgeMultiplier(maturityIndex: number, _profile: GameProfile): number {
  return maturityMultiplier(maturityIndex);
}

/**
 * Resources required to gain 1 metric point at the given value, with all multipliers applied.
 * Delegates to engineMath.combinedMultiplier + engineMath.costAtMetric.
 */
export function xpNeededFor1Pct(
  statValue: number,
  maturityIndex: number,
  thresholdsInSession: number,
  efficiencyClass: TalentTier,
  isPrimary: boolean,
  boostActive: boolean,
  cycleIntensityMult: number,
  _profile: GameProfile,
): number {
  const base = costAtMetric(statValue);
  if (!isFinite(base)) return Infinity;
  const mult = combinedMultiplier({
    maturityIndex,
    efficiencyClass,
    isPrimary,
    thresholdsCrossed: thresholdsInSession,
    boostActive,
    cycleIntensityMult,
  });
  if (mult === 0) return Infinity;
  return base / mult;
}

/**
 * Estimates fractional metric gain for a given resource budget.
 * Delegates to engineMath.metricGainFromBudget.
 */
export function estimateStatGainPct(
  xpBudget: number,
  statValue: number,
  maturityIndex: number,
  thresholdsInSession: number,
  efficiencyClass: TalentTier,
  isPrimary: boolean,
  boostActive: boolean,
  cycleIntensityMult: number,
  _profile: GameProfile,
): number {
  const mult = combinedMultiplier({
    maturityIndex,
    efficiencyClass,
    isPrimary,
    thresholdsCrossed: thresholdsInSession,
    boostActive,
    cycleIntensityMult,
  });
  return metricGainFromBudget(statValue, xpBudget, mult);
}

/**
 * Projects metrics after periodic degradation.
 * Delegates to engineMath.applyPeriodicDegradation.
 */
export function projectSeasonDecay(
  stats: Record<string, number>,
  levelsPromoted: number,
  profile: GameProfile,
): Record<string, number> {
  return applyPeriodicDegradation(stats, levelsPromoted, profile.periodicDegradationPerStage ?? PERIODIC_DEGRADATION);
}

/**
 * Quality% = sum of all metrics / metricCount (unweighted mean × metricCount).
 * Used as an intermediate before qualityPctToOvr.
 */
export function statsToQualityPct(
  stats: Record<string, number>,
  profile: GameProfile,
): number {
  const values = Object.values(stats);
  if (values.length === 0) return 0;
  return values.reduce((acc, v) => acc + v, 0) / profile.metricCount;
}

/** CCI = floor(qualityPct / cciDivisorScale). Delegates to cciFromMetrics. */
export function qualityPctToOvr(qualityPct: number, profile: GameProfile): number {
  const sum = qualityPct * profile.metricCount;
  return Math.floor(sum / (profile.metricCount * profile.cciDivisorScale));
}

/**
 * Applies a lifecycle stage upgrade by adding the incremental bonus to primary (essential) metrics only.
 * Secondary and off-category metrics receive NO change.
 * Returns a new metrics object (does not mutate input).
 */
export function applyTierBonusToStats(
  stats: Record<string, number>,
  primaryMetricKeys: string[],
  targetTier: TierName,
  profile: GameProfile,
  fromTier: TierName = 'T0',
): Record<string, number> {
  const totalAddition = profile.stageMetricAdditions[targetTier] ?? 0;
  const prevAddition  = profile.stageMetricAdditions[fromTier]   ?? 0;
  const increment = totalAddition - prevAddition;
  if (increment <= 0) return { ...stats };

  const roleSet = new Set(primaryMetricKeys);
  const updated = { ...stats };
  for (const key of Object.keys(updated)) {
    if (roleSet.has(key)) {
      updated[key] = Math.min(updated[key] + increment, profile.metricCap);
    }
  }
  return updated;
}
