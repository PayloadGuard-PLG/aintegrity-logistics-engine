/**
 * xpEngine.ts — Thin adapter layer.
 *
 * All math is now in src/engine/engineMath.ts (pure functions, no profile objects).
 * This file keeps the GameProfile-typed signatures for backward compatibility with
 * existing callers (ovrProjector, coaches tab, etc.) while delegating to engineMath.
 *
 * To tune a constant: update profiles/logistics_v1.json.
 * To understand a formula: read src/engine/engineMath.ts.
 * To see calibration evidence: read src/engine/engineConstants.ts.
 */

import { GameProfile, TalentTier, TierName } from '../types/resources';
import {
  xpCostAtStat,
  ageMultiplier,
  combinedMultiplier,
  starsGainedFromOvrGain,
  statGainFromBudget,
  ovrFromStats,
  ovrFromStatsWithPadding,
  applySeasonDecay,
} from '../engine/engineMath';
import { SEASON_DECAY } from '../engine/engineConstants';

// Re-export engineMath functions for callers that don't need GameProfile wrappers
export {
  xpCostAtStat,
  ageMultiplier as getAgeMultiplierDirect,
  combinedMultiplier,
  starsGainedFromOvrGain,
  statGainFromBudget,
  ovrFromStats,
  ovrFromStatsWithPadding,
  estimateTalentFromGain,
} from '../engine/engineMath';

// ─── GameProfile wrappers (backward compatibility) ───────────────────────────

/** XP cost per stat point at a given stat value. Delegates to engineMath.xpCostAtStat. */
export function xpBaseForStat(statValue: number, _profile: GameProfile): number {
  return xpCostAtStat(statValue);
}

/** Age multiplier for a given age. Delegates to engineMath.ageMultiplier. */
export function getAgeMultiplier(age: number, _profile: GameProfile): number {
  return ageMultiplier(age);
}

/**
 * XP required to gain 1 stat point at the given value, with all multipliers applied.
 * Delegates to engineMath.combinedMultiplier + engineMath.xpCostAtStat.
 *
 * @param starsGainedInSession - cumulative stars earned in the current session so far
 */
export function xpNeededFor1Pct(
  statValue: number,
  age: number,
  starsGainedInSession: number,
  talent: TalentTier,
  isWhite: boolean,
  twoxAd: boolean,
  drillLevelMult: number,
  _profile: GameProfile,
): number {
  const base = xpCostAtStat(statValue);
  if (!isFinite(base)) return Infinity;
  const mult = combinedMultiplier({ age, talent, isWhite, starsGained: starsGainedInSession, twoxAd, drillLevelMult });
  if (mult === 0) return Infinity;
  return base / mult;
}

/**
 * Estimates fractional stat gain for a given XP budget.
 * Delegates to engineMath.statGainFromBudget.
 */
export function estimateStatGainPct(
  xpBudget: number,
  statValue: number,
  age: number,
  starsGainedInSession: number,
  talent: TalentTier,
  isWhite: boolean,
  twoxAd: boolean,
  drillLevelMult: number,
  _profile: GameProfile,
): number {
  const mult = combinedMultiplier({ age, talent, isWhite, starsGained: starsGainedInSession, twoxAd, drillLevelMult });
  return statGainFromBudget(statValue, xpBudget, mult);
}

/**
 * Projects stats after seasonal decay.
 * Delegates to engineMath.applySeasonDecay.
 */
export function projectSeasonDecay(
  stats: Record<string, number>,
  levelsPromoted: number,
  profile: GameProfile,
): Record<string, number> {
  return applySeasonDecay(stats, levelsPromoted, profile.seasonDecayPerLevel ?? SEASON_DECAY);
}

/**
 * Quality% = sum of all stats / totalAttributeCount (unweighted mean × 15).
 * Used as an intermediate before qualityPctToOvr.
 */
export function statsToQualityPct(
  stats: Record<string, number>,
  profile: GameProfile,
): number {
  const values = Object.values(stats);
  if (values.length === 0) return 0;
  return values.reduce((acc, v) => acc + v, 0) / profile.totalAttributeCount;
}

/** OVR = floor(qualityPct / qualityOvrDivisor). Delegates to ovrFromStats. */
export function qualityPctToOvr(qualityPct: number, profile: GameProfile): number {
  // qualityPct is already sum/15, so multiply back to sum then use ovrFromStats logic
  const sum = qualityPct * profile.totalAttributeCount;
  return Math.floor(sum / (profile.totalAttributeCount * profile.qualityOvrDivisor));
}

/**
 * Applies a tier upgrade by adding the incremental bonus to white (essential) stats only.
 * Grey role stats and off-role stats receive NO change — confirmed from direct game observation.
 * Returns a new stats object (does not mutate input).
 */
export function applyTierBonusToStats(
  stats: Record<string, number>,
  roleStatKeys: string[],
  targetTier: TierName,
  profile: GameProfile,
  fromTier: TierName = 'T0',
): Record<string, number> {
  const totalAddition = profile.tierAttrAdditions[targetTier] ?? 0;
  const prevAddition  = profile.tierAttrAdditions[fromTier]   ?? 0;
  const increment = totalAddition - prevAddition;
  if (increment <= 0) return { ...stats };

  const roleSet = new Set(roleStatKeys);
  const updated = { ...stats };
  for (const key of Object.keys(updated)) {
    if (roleSet.has(key)) {
      updated[key] = Math.min(updated[key] + increment, profile.statCap);
    }
  }
  return updated;
}
