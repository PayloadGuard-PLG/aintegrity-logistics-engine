/**
 * Mutant Projection Engine
 * Calculates player OVR from drill training and tier upgrade.
 * Restorers restore condition only — they do not affect OVR.
 */
export function calculateMutantProjection(
  baseOvr: number,
  drillOvrGain: number,
  tierOvrGain: number
): number {
  return Number((baseOvr + drillOvrGain + tierOvrGain).toFixed(1));
}
