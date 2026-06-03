export const FAN_CLUB_LEVELS = { LEVEL_0: 0.90, LEVEL_1: 0.85, LEVEL_2: 0.80, LEVEL_3: 0.75, LEVEL_4: 0.50 };
export const DRILL_BASE_COSTS = { VERY_EASY: 0.75, EASY: 1.50, MEDIUM: 2.25, HARD: 3.00, VERY_HARD: 3.75 };

export function calculateDrillConditionCost(drillIntensity: keyof typeof DRILL_BASE_COSTS, fanLevel: keyof typeof FAN_CLUB_LEVELS, chants: number): number {
  const baseCost = DRILL_BASE_COSTS[drillIntensity];
  const fanModifier = FAN_CLUB_LEVELS[fanLevel];
  const chantModifier = 1 - (Math.min(chants, 5) * 0.03); // Max 15% reduction from 5 chants [cite: 35, 73]
  
  const rawCost = baseCost * fanModifier * chantModifier;
  // Zero-drain threshold: < 0.38 (only Very Easy at fan club L4 qualifies: 0.375%)
  return rawCost < 0.38 ? 0.00 : Number(rawCost.toFixed(2));
}
