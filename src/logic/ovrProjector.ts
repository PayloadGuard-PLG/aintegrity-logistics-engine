import { getTierAttrAddition, getTierCost } from '../utils/math';
import { isWhiteStat, getWhiteStatKeys, getAllStatKeys } from '../utils/metricWeights';
import { estimateStatGainPct, applyTierBonusToStats, statsToQualityPct, qualityPctToOvr } from './xpEngine';
import { drillBudgetPerStat, ovrFromStatsWithPadding as engineOvrPadded, isTrainingLocked } from '../engine/engineMath';
import { DrillSession, GameProfile, TalentTier, DrillLevel, TierName, InvestmentStep } from '../types/resources';
import { Player } from '../database/playerSchema';
import { DRILL_LIST } from '../database/drillDatabase';

export { getTierAttrAddition as getTierBonus, getTierCost };

/**
 * Finds a drill by name (case-insensitive). Returns null if not found.
 */
function findDrill(drillName: string) {
  return DRILL_LIST.find(d => d.name.toLowerCase() === drillName.toLowerCase()) ?? null;
}

/**
 * OVR from a stats dict, padding any missing attributes with a baseline value.
 *
 * statsToQualityPct divides by totalAttributeCount (15) regardless of how many
 * stats are in the dict. If the player only entered their white stats (e.g. 7 out
 * of 15), the missing 8 would effectively count as 0 and drag the mean down.
 * Padding them with the known overall keeps the baseline accurate.
 */
export function computeOvrWithPadding(
  stats: Record<string, number>,
  playerOverall: number,
  profile: GameProfile
): number {
  const keys = Object.keys(stats);
  if (keys.length === 0) return playerOverall;
  const entered = Object.values(stats);
  const missingCount = Math.max(0, profile.totalAttributeCount - keys.length);
  const sum = entered.reduce((a, b) => a + b, 0) + playerOverall * missingCount;
  const qp = sum / profile.totalAttributeCount;
  return qualityPctToOvr(qp, profile);
}

/**
 * Returns current OVR from player.stats.
 * Falls back to player.overall when stats are empty.
 * Pads missing attributes with player.overall so partial stat entry
 * does not drag the computed OVR below the known baseline.
 */
export function computeOvrFromStats(player: Player, profile: GameProfile): number {
  return computeOvrWithPadding(player.stats, player.overall, profile);
}

/**
 * Applies a set of drill sessions to a mutable copy of the player's stats.
 * Returns the stat delta map, step log, and new OVR.
 *
 * Each session = 1 XP unit. Star decay is applied per-stat within the session.
 * (Cross-stat star decay interaction is a calibration TODO.)
 */
type SkippedDrillInfo = {
  name: string;
  missingStats: string[];    // role-valid but not entered by user
  irrelevantStats: string[]; // not a stat for this role at all
};

export function applyDrillSessionsToStats(
  player: Player,
  drillSessions: DrillSession[],
  talentTier: TalentTier,
  twoxAdActive: boolean,
  profile: GameProfile
): { steps: InvestmentStep[]; updatedStats: Record<string, number>; finalOvr: number; skippedDrills: SkippedDrillInfo[] } {
  const steps: InvestmentStep[] = [];
  const skippedDrills: SkippedDrillInfo[] = [];
  const updatedStats = { ...player.stats };
  const roleStats = new Set(getAllStatKeys(player.role));
  const ovrBefore = computeOvrFromStats(player, profile);
  let runningOvr = ovrBefore;

  for (const session of drillSessions) {
    const drill = findDrill(session.drillName);
    if (!drill) continue;

    const drillLevelMult = profile.drillLevelMultipliers[drill.intensity] ?? 1.0;
    const statDeltas: string[] = [];

    let drillHits = 0;
    const missingStats: string[] = [];
    const irrelevantStats: string[] = [];

    for (const statKey of drill.stats) {
      const normalized = statKey.toUpperCase();
      if (!(normalized in updatedStats)) {
        if (roleStats.has(normalized)) missingStats.push(normalized);
        else irrelevantStats.push(normalized);
        continue;
      }
      drillHits++;
      const currentVal = updatedStats[normalized];
      if (currentVal >= profile.statCap) continue;

      const isWhite = isWhiteStat(player.role, normalized);
      const starsGained = Math.floor((runningOvr - ovrBefore) / (profile.starOvrThreshold ?? 20));
      const gainPct = estimateStatGainPct(
        drillBudgetPerStat(session.sessionCount, drill.stats.length),
        currentVal,
        player.age,
        starsGained,
        talentTier,
        isWhite,
        twoxAdActive,
        drillLevelMult,
        profile
      );

      if (gainPct > 0) {
        updatedStats[normalized] = Math.min(currentVal + gainPct, profile.statCap);
        statDeltas.push(`${normalized} +${gainPct}%`);
      }
    }

    if (drillHits === 0) {
      skippedDrills.push({ name: session.drillName, missingStats, irrelevantStats });
    }

    if (statDeltas.length > 0) {
      const newOvr = computeOvrWithPadding(updatedStats, player.overall, profile);
      const ovrDelta = Number((newOvr - runningOvr).toFixed(1));
      steps.push({
        action: 'drill',
        description: `${session.drillName} ×${session.sessionCount} sessions (${drill.intensity})`,
        ovrBefore: runningOvr,
        ovrAfter: newOvr,
        resourcesUsed: `${session.sessionCount} sessions`,
      });
      runningOvr = newOvr;
      void ovrDelta; // tracked via ovrBefore/ovrAfter
    }
  }

  return { steps, updatedStats, finalOvr: runningOvr, skippedDrills };
}

/**
 * Full OVR projection chain:
 *   1. Drill sessions (always first — drills before tier)
 *   2. Tier upgrade (flat per-white-attr addition → recompute Quality% → OVR)
 *   3. Restorers (informational only — condition restore, NOT OVR)
 */
export function projectOvr(
  player: Player,
  drillSessions: DrillSession[],
  talentTier: TalentTier,
  drillLevel: DrillLevel,
  targetTier: TierName | null,
  restorers: number,
  twoxAdActive: boolean,
  profile: GameProfile
): { steps: InvestmentStep[]; finalOvr: number; warnings: string[] } {
  const steps: InvestmentStep[] = [];
  const warnings: string[] = [];

  // Promote all sessions to the specified drill level if not already set per-session
  const sessions: DrillSession[] = drillSessions.map(s => ({
    ...s,
    drillLevel: s.drillLevel ?? drillLevel,
  }));

  // When individual stats are absent, fall back to analytical tier-only projection.
  // Drill simulation requires per-stat baseline values; without them it would compute
  // from 0, producing a completely wrong OVR.
  if (Object.keys(player.stats).length === 0) {
    warnings.push('Enter individual stat values for drill-level OVR projection.');
    let currentOvr = player.overall;

    if (sessions.length > 0) {
      warnings.push('Drill gains skipped — individual stats required.');
    }

    if (player.age >= 20) {
      const ageMult = profile.ageTable[String(player.age)] ?? 0.10;
      warnings.push(`Age ${player.age} — training multiplier ${ageMult.toFixed(2)}×. Gains are reduced.`);
    }

    if (targetTier && targetTier !== player.tier && targetTier !== 'T0') {
      const ALL_TIERS: TierName[] = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
      const whiteKeys = getWhiteStatKeys(player.role);
      const fromIdx = Math.max(0, ALL_TIERS.indexOf((player.tier as TierName) || 'T0'));
      const toIdx   = ALL_TIERS.indexOf(targetTier);
      for (let i = fromIdx + 1; i <= toIdx; i++) {
        const stepTier = ALL_TIERS[i] as TierName;
        const prevTier = ALL_TIERS[i - 1] as TierName;
        const inc  = (profile.tierAttrAdditions[stepTier] ?? 0) - (profile.tierAttrAdditions[prevTier] ?? 0);
        const cost = profile.tierPointsRequired?.[stepTier] ?? getTierCost(stepTier);
        const tierOvrGain = (inc * whiteKeys.length) / (profile.totalAttributeCount * profile.qualityOvrDivisor);
        const ovrBefore = currentOvr;
        currentOvr += tierOvrGain;
        steps.push({
          action: 'tier',
          description: `Tier → ${stepTier} (+${inc} per white attr × ${whiteKeys.length} stats)`,
          ovrBefore,
          ovrAfter: currentOvr,
          resourcesUsed: `${cost} ${stepTier.toLowerCase()} tier points`,
        });
      }
    }

    if (restorers > 0) {
      const condPct = Math.min(restorers * 15, 100);
      steps.push({
        action: 'condition',
        description: `${restorers} restorers → +${condPct}% condition restored`,
        ovrBefore: currentOvr,
        ovrAfter: currentOvr,
        resourcesUsed: `${restorers} restorers`,
      });
    }

    return { steps, finalOvr: currentOvr, warnings };
  }

  // Step 1 — Drill sessions
  let currentStats = { ...player.stats };
  let currentOvr = computeOvrFromStats(player, profile);

  // Training lock: base OVR = total OVR minus the tier's OVR contribution.
  // When base OVR >= maxBaseOvr (180), drills and academy coaches have no effect.
  const tierBonus = profile.tierAttrAdditions[(player.tier as TierName) ?? 'T0'] ?? 0;
  const keyCount  = getWhiteStatKeys(player.role).length;
  const tierOvrContrib = Math.floor(tierBonus * keyCount / profile.totalAttributeCount);
  const baseOvr = currentOvr - tierOvrContrib;
  const trainingLocked = isTrainingLocked(baseOvr);

  if (trainingLocked && sessions.length > 0) {
    warnings.push(`Base OVR ${baseOvr} has reached the training cap (${profile.maxBaseOvr ?? 180}). Drills have no effect — tier upgrades and in-game bonuses still apply.`);
  }

  if (sessions.length > 0 && !trainingLocked) {
    const { steps: drillSteps, updatedStats, finalOvr: postDrillOvr, skippedDrills } =
      applyDrillSessionsToStats({ ...player, stats: currentStats }, sessions, talentTier, twoxAdActive, profile);
    steps.push(...drillSteps);
    currentStats = updatedStats;
    currentOvr = postDrillOvr;
    for (const skip of skippedDrills) {
      if (skip.missingStats.length > 0 && skip.irrelevantStats.length === 0) {
        warnings.push(`${skip.name}: enter ${skip.missingStats.join(', ')} to include drill gains.`);
      } else if (skip.missingStats.length > 0) {
        warnings.push(`${skip.name}: enter ${skip.missingStats.join(', ')} — ${skip.irrelevantStats.join(', ')} not used by this role.`);
      } else {
        warnings.push(`${skip.name}: no stats applicable to this role (${skip.irrelevantStats.join(', ')}).`);
      }
    }
  } else if (sessions.length === 0) {
    warnings.push('No drill sessions — add drills to project OVR growth.');
  }

  if (talentTier === 'Slow') {
    warnings.push('Slow talent tier — training XP multiplier 0.70×.');
  }
  if (player.age >= 20) {
    const ageMult = profile.ageTable[String(player.age)] ?? 0.10;
    warnings.push(`Age ${player.age} — training multiplier ${ageMult.toFixed(2)}×. Gains are reduced.`);
  }

  // Step 2 — Tier upgrade(s): one step per intermediate tier, each with its incremental stat addition
  if (targetTier && targetTier !== player.tier && targetTier !== 'T0') {
    const ALL_TIERS: TierName[] = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
    const whiteKeySet = new Set(getWhiteStatKeys(player.role));
    const fromIdx = Math.max(0, ALL_TIERS.indexOf((player.tier as TierName) || 'T0'));
    const toIdx   = ALL_TIERS.indexOf(targetTier);
    for (let i = fromIdx + 1; i <= toIdx; i++) {
      const stepTier = ALL_TIERS[i] as TierName;
      const prevTier = ALL_TIERS[i - 1] as TierName;
      const inc  = (profile.tierAttrAdditions[stepTier] ?? 0) - (profile.tierAttrAdditions[prevTier] ?? 0);
      const cost = profile.tierPointsRequired?.[stepTier] ?? getTierCost(stepTier);
      const ovrBefore = currentOvr;

      // White (essential) stats only get the tier increment; grey and off-role stats unchanged
      const newStats = { ...currentStats };
      for (const key of Object.keys(newStats)) {
        if (whiteKeySet.has(key)) {
          newStats[key] = Math.min(newStats[key] + inc, profile.statCap);
        }
      }
      currentStats = newStats;

      const newOvr = computeOvrWithPadding(currentStats, player.overall, profile);
      steps.push({
        action: 'tier',
        description: `Tier → ${stepTier} (+${inc} per white attr × ${whiteKeySet.size} stats)`,
        ovrBefore,
        ovrAfter: newOvr,
        resourcesUsed: `${cost} ${stepTier.toLowerCase()} tier points`,
      });
      currentOvr = newOvr;
    }
  }

  // Step 3 — Restorers (condition restore — no OVR change)
  if (restorers > 0) {
    const condPct = Math.min(restorers * 15, 100);
    steps.push({
      action: 'condition',
      description: `${restorers} restorers → +${condPct}% condition restored`,
      ovrBefore: currentOvr,
      ovrAfter: currentOvr,
      resourcesUsed: `${restorers} restorers`,
    });
  }

  return { steps, finalOvr: currentOvr, warnings };
}
