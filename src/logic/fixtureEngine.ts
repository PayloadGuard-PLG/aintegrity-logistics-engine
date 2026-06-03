import { GameProfile, TeamPlayPillar, TeamPlayPlan, FixtureWindow, GreensBridgeSuggestion } from '../types/resources';

export function calculateFixtureCycles(
  hoursUntilFixture: number,
  cooldownMins: number,
  sessionsPerCycle: number = 6
): FixtureWindow {
  const cycles = Math.floor((hoursUntilFixture * 60) / cooldownMins);
  return { cycles, totalSessions: cycles * sessionsPerCycle };
}

export function calculateTeamPlayPlan(
  pillars: Partial<Record<TeamPlayPillar, number>>,
  matchAdvisorActive: boolean,
  profile: GameProfile
): TeamPlayPlan {
  const freeDrillsNeeded = matchAdvisorActive ? 0 : profile.teamPlayFreeDrillsPerDay;
  const matchAdvisorCoversDecay = matchAdvisorActive;
  const recommendation = matchAdvisorActive
    ? 'Match Advisor active — all drill sessions advance team play. No separate maintenance drills needed.'
    : `Watch ${profile.teamPlayFreeDrillsPerDay} Reward Channel videos daily to run free team play drills and offset the ${profile.teamPlayDecayPerDay}-point daily decay per pillar.`;
  return {
    pillars,
    decayPerDay: profile.teamPlayDecayPerDay,
    freeDrillsNeeded,
    matchAdvisorCoversDecay,
    recommendation,
  };
}

export function calculateRestorersBridge(
  availableRestorers: number,
  naturalCycles: number,
  profile: GameProfile
): GreensBridgeSuggestion {
  // condition cost per drill at Very Easy + Fan Club L0 (reference scenario for restorer bridge)
  const costPerDrill = profile.baseLossPerDrill
    * (profile.condLevelMultipliers?.['Very Easy'] ?? 1)
    * (1 - (profile.fanClubCondReduction?.[0] ?? 0.1));
  const cyclesPerRestorer = costPerDrill > 0 ? Math.floor(profile.conditionPerRestorer / costPerDrill) : 0;
  const additionalCycles = availableRestorers * cyclesPerRestorer;
  const worthwhile = additionalCycles > 0 && naturalCycles > 0;
  const note = worthwhile
    ? `${availableRestorers} restorer${availableRestorers !== 1 ? 's' : ''} → +${additionalCycles} extra drills (${cyclesPerRestorer} per restorer · ${profile.conditionPerRestorer}% restored / ${costPerDrill.toFixed(3)}% per drill at Very Easy)`
    : availableRestorers === 0
      ? 'No restorers available — bridge not possible.'
      : 'Set fixture window to evaluate bridge value.';
  return {
    restorersNeeded: availableRestorers,
    additionalCycles,
    worthwhile,
    note,
  };
}
