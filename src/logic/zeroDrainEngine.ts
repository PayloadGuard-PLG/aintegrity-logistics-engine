import { calculateDrillConditionCost, DRILL_BASE_COSTS, FAN_CLUB_LEVELS } from '../utils/modifiers';

/**
 * AIntegrity Zero-Drain Engine
 * Identifies training configurations that result in 0.00% condition loss.
 */
export const getZeroDrainDrills = (fanLevel: keyof typeof FAN_CLUB_LEVELS, chants: number) => {
  const intensities = Object.keys(DRILL_BASE_COSTS) as Array<keyof typeof DRILL_BASE_COSTS>;
  
  return intensities.map(intensity => {
    const cost = calculateDrillConditionCost(intensity, fanLevel, chants);
    return {
      intensity,
      cost,
      isZeroDrain: cost === 0.00
    };
  }).filter(d => d.isZeroDrain);
};
