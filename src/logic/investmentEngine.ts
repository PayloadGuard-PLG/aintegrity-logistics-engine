import { projectOvr, getTierCost, computeOvrFromStats } from './ovrProjector';
import { Player } from '../database/playerSchema';
import { ManagerProfile, InvestmentPlan, TierName, DrillSession, GameProfile } from '../types/resources';

/**
 * Produces a full investment plan for a single player given the manager's profile
 * and a list of drill sessions to run.
 *
 * Drill sessions are always applied BEFORE tier upgrade (drills-first rule).
 */
export function planPlayerInvestment(
  player: Player,
  profile: ManagerProfile,
  drillSessions: DrillSession[],
  gameProfile: GameProfile,
  targetTier: TierName | null = null
): InvestmentPlan {
  const warnings: string[] = [];

  if (drillSessions.length === 0) {
    warnings.push('No drill sessions provided — add drills to generate a projection.');
  }

  if (targetTier) {
    const cost = getTierCost(targetTier);
    const have = profile.tierPoints?.[targetTier] ?? 0;
    if (have < cost) {
      warnings.push(`Not enough ${targetTier} points: need ${cost}, have ${have}.`);
    }
  }

  const { steps, finalOvr, warnings: projectionWarnings } = projectOvr(
    player,
    drillSessions,
    profile.talentTier,
    profile.drillLevel,
    targetTier,
    profile.restorers,
    profile.twoxAdActive,
    gameProfile
  );

  warnings.push(...projectionWarnings);

  // Use the stats-computed OVR as the baseline so the gain reflects real improvement.
  // Falls back to player.overall when no stats are entered (same behaviour as projectOvr).
  const currentOvr = computeOvrFromStats(player, gameProfile);
  const totalOvrGain = Number((finalOvr - currentOvr).toFixed(1));

  const drillSummary = drillSessions.length > 0
    ? drillSessions.map(s => `${s.drillName} ×${s.sessionCount}`).join(', ')
    : 'none';

  const tierSummary = targetTier ? ` → ${targetTier} tier` : '';
  const restorerSummary = profile.restorers > 0 ? ` + ${profile.restorers} restorers (condition)` : '';

  const recommendation =
    `Run drills first (${drillSummary})${tierSummary}${restorerSummary}. ` +
    `Projected OVR: ${currentOvr.toFixed(0)} → ${finalOvr} (+${totalOvrGain}).`;

  const resourceLines = [
    drillSessions.length > 0 ? `${drillSessions.reduce((s, d) => s + d.sessionCount, 0)} sessions` : null,
    targetTier ? `${profile.tierPoints?.[targetTier] ?? 0}/${getTierCost(targetTier)} ${targetTier} pts` : null,
    profile.restorers > 0 ? `${profile.restorers} restorers` : null,
  ].filter(Boolean);

  return {
    player: { name: player.name, currentOvr },
    steps,
    finalOvr,
    totalOvrGain,
    totalResourceCost: resourceLines.join(' + ') || 'No resources',
    recommendation,
    warnings,
  };
}

/**
 * Compares investment plans across multiple players using a shared drill set.
 * Returns players ranked by projected OVR gain in ScenarioComparison shape.
 */
export function compareInvestmentScenarios(
  players: Player[],
  profile: ManagerProfile,
  drillSessions: DrillSession[],
  gameProfile: GameProfile,
  targetTier: TierName | null = null
): import('../types/resources').ScenarioComparison {
  const ranked = players
    .map(player => {
      const plan = planPlayerInvestment(player, profile, drillSessions, gameProfile, targetTier);
      return { player, plan };
    })
    .sort((a, b) => (b.plan.totalOvrGain ?? b.plan.totalCciGain ?? 0) - (a.plan.totalOvrGain ?? a.plan.totalCciGain ?? 0));

  const results = ranked.map((r, i) => ({
    playerName: r.player.name,
    currentOvr: r.plan.player?.currentOvr ?? r.plan.asset?.currentCci ?? 0,
    projectedOvr: r.plan.finalOvr ?? r.plan.finalCci,
    ovrGain: r.plan.totalOvrGain ?? r.plan.totalCciGain ?? 0,
    plan: r.plan,
    rank: i + 1,
  }));

  const best = ranked[0];
  const second = ranked[1];
  const reasoning = best && second
    ? `${best.player.name} projects +${(best.plan.totalOvrGain ?? best.plan.totalCciGain ?? 0)} OVR vs ${second.player.name} +${(second.plan.totalOvrGain ?? second.plan.totalCciGain ?? 0)} under identical resources.`
    : '';

  return {
    results,
    recommendedPlayer: best?.player.name ?? '',
    reasoning,
  };
}
