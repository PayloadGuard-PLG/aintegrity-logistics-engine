import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '../db';
import { players } from '../db/schema';
import { Player } from '../database/playerSchema';
import { TierName, TalentTier } from '../types/resources';

const LEGACY_TIER_MAP: Record<string, TierName> = {
  None: 'T0', Rare: 'T1', Elite: 'T2', Stellar: 'T3', Master: 'T4', Epic: 'T5', Legendary: 'T6',
};
const LEGACY_TALENT_MAP: Record<string, TalentTier> = {
  FT1: 'Fastest', FT2: 'Fast', FT3: 'Average',
};

function normaliseTier(t: string): TierName {
  return (LEGACY_TIER_MAP[t] ?? t) as TierName;
}
function normaliseTalent(t: string): TalentTier {
  return (LEGACY_TALENT_MAP[t] ?? t) as TalentTier;
}

export function useSquad(): { squad: Player[]; error: Error | undefined } {
  const { data: rows = [], error } = useLiveQuery(db.select().from(players));

  const squad: Player[] = rows.map(row => {
    try {
      return {
        id: row.id,
        name: row.name,
        role: JSON.parse(row.roles) as string[],
        age: row.age,
        overall: row.overall,
        tier: normaliseTier(row.tier),
        talent: normaliseTalent(row.talent ?? 'Normal'),
        stats: JSON.parse(row.stats) as Record<string, number>,
        isMutantCandidate: Boolean(row.isMutantCandidate),
      };
    } catch (e) {
      throw e;
    }
  });

  return { squad, error };
}
