import { planPlayerInvestment } from './investmentEngine';
import { Player } from '../database/playerSchema';
import { ManagerProfile, ScenarioComparison, ScenarioResult, TierName, DrillSession, GameProfile } from '../types/resources';

/**
 * Compares multiple players competing for the SAME drill set and resource pool.
 * Each scenario is evaluated independently; ranks by projected OVR gain.
 * Returns the top recommendation with a human-readable reasoning string.
 */
export function compareInvestmentScenarios(
  players: Player[],
  profile: ManagerProfile,
  drillSessions: DrillSession[],
  gameProfile: GameProfile,
  targetTier: TierName | null = null
): ScenarioComparison {
  const results: ScenarioResult[] = players.map(player => {
    const plan = planPlayerInvestment(player, profile, drillSessions, gameProfile, targetTier);
    return {
      playerName: player.name,
      currentOvr: player.overall,
      projectedOvr: plan.finalOvr,
      ovrGain: plan.totalOvrGain ?? plan.totalCciGain ?? 0,
      plan,
      rank: 0,
    };
  });

  results.sort((a, b) => (b.ovrGain ?? b.cciGain ?? 0) - (a.ovrGain ?? a.cciGain ?? 0));
  results.forEach((r, i) => { r.rank = i + 1; });

  const best = results[0];
  const second = results[1];

  let reasoning = `${best.playerName} yields the highest OVR gain (+${best.ovrGain}) from these resources`;
  if (second) reasoning += `, vs +${(second.ovrGain ?? second.cciGain ?? 0)} for ${second.playerName}`;
  if (best.plan.warnings.length > 0) reasoning += `. Note: ${best.plan.warnings[0]}`;
  reasoning += '.';

  return {
    results,
    recommendedPlayer: best.playerName,
    reasoning,
  };
}
