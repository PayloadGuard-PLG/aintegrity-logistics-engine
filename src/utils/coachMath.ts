import { GameProfile, TalentTier, DrillLevel } from '../types/resources';
import { getAgeMultiplier, xpBaseForStat, xpNeededFor1Pct } from '../logic/xpEngine';

export { getAgeMultiplier };

/**
 * Returns the XP cost per 1% for a stat at the given value.
 * Returns Infinity when the 180-rule applies.
 */
export function getStatXpCost(statValue: number, profile: GameProfile): number {
  return xpBaseForStat(statValue, profile);
}

/**
 * Returns the grey (non-white) XP multiplier from the profile.
 * White stats use 1.0; grey stats use profile.secondaryMetricWeight (0.5).
 */
export function getGreyMultiplier(isWhite: boolean, profile: GameProfile): number {
  return isWhite ? 1.0 : profile.secondaryMetricWeight;
}

/**
 * Returns the drill level multiplier from the profile.
 */
export function getDrillLevelMult(drillLevel: DrillLevel, profile: GameProfile): number {
  return profile.cycleIntensityMultipliers[drillLevel] ?? 1.0;
}

/**
 * Returns the talent multiplier from the profile.
 */
export function getTalentMult(talent: TalentTier, profile: GameProfile): number {
  return profile.efficiencyClassMultipliers[talent] ?? 1.0;
}

// ---------------------------------------------------------------------------
// Legacy shim — kept so existing tests that import calculateDynamicGain compile.
// The coach-multiplier concept no longer exists in the engine.
// ---------------------------------------------------------------------------

/**
 * @deprecated Coach card multipliers do not exist in the current game model.
 * This shim approximates single-stat gain using the XP engine for backward
 * compatibility with old tests. Do not use in new code.
 */
export function calculateDynamicGain(
  multiplier: number,
  age: number,
  isWhiteSkill: boolean,
  currentAttribute: number,
  profile?: GameProfile
): number {
  if (!profile) {
    // Graceful degradation without a profile — return a rough approximation
    const ageFactor = age <= 19 ? 1.0 : age <= 21 ? 0.4 : 0.2;
    const skillMod = isWhiteSkill ? 1.0 : 0.5;
    const statFactor = currentAttribute >= 180 ? 0 : Math.max(0, 1 - currentAttribute / 340);
    return Number((multiplier * ageFactor * skillMod * statFactor * 0.05).toFixed(4));
  }
  const drillMult = getDrillLevelMult('Very Easy', profile);
  const xpCost = xpNeededFor1Pct(currentAttribute, age, 0, 'Normal', isWhiteSkill, false, drillMult, profile);
  if (!isFinite(xpCost) || xpCost === 0) return 0;
  // multiplier treated as an XP budget proxy (rough legacy approximation)
  return Number(Math.min(multiplier / xpCost, 10).toFixed(4));
}
