import { estimateStatGainPct } from './xpEngine';
import { GameProfile, TalentTier } from '../types/resources';

export interface PlayerStats {
  age: number;
  tier: string;
  ovr: number;
  roles: string[];
  statValue: number;
  talent: TalentTier;
}

/**
 * Predicts coaching gain for a single stat using the real XP engine.
 * coachMultiplier scales the XP budget (e.g. ×1.5 coaching intensity).
 */
export function predictCustomDrill(
  player: PlayerStats,
  coachMultiplier: number,
  sessions: number,
  targetSkillIsWhite: boolean,
  profile: GameProfile
) {
  const xpBudget = sessions * profile.baseResourcesPerCycle * coachMultiplier;
  const totalGain = estimateStatGainPct(
    xpBudget,
    player.statValue,
    player.age,
    0,
    player.talent,
    targetSkillIsWhite,
    false,
    1.0,
    profile
  );
  const gainPerSession = sessions > 0 ? totalGain / sessions : 0;

  return {
    gainPerSession: Number(gainPerSession.toFixed(4)),
    totalGain: Number(totalGain.toFixed(2)),
    projectedOvr: Number((player.ovr + totalGain).toFixed(2)),
    warning: player.age > 25 ? "Slow Trainer: Low Efficiency" : null
  };
}
