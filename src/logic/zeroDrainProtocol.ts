import { calculateDrillConditionCost } from '../utils/modifiers';

/**
 * AIntegrity Zero-Drain Protocol
 * Specifically monitors for the 0.00% condition loss exploit.
 */
export function validateZeroDrain(
  drillIntensity: 'VERY_EASY',
  fanLevel: 'LEVEL_4',
  activeChants: number
): boolean {
  const cost = calculateDrillConditionCost(drillIntensity, fanLevel, activeChants);
  return cost === 0.00;
}

export function getZeroDrainStrategy() {
  return {
    strategy: "Exploit 0% condition loss via repetitive Very Easy drills.",
    requirement: "Level 4 Fan Club + Active Chants",
    // Zero drain is only achievable with exactly ONE active drill per session
    limit: "Exactly ONE active drill per session"
  };
}
