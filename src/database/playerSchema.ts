import { TierName, TalentTier } from '../types/resources';

export interface PlayerSnapshot {
  stats: Record<string, number>;
  overall: number;
  tier: TierName;
}

export interface Player {
  id: string;
  name: string;
  role: string[];
  age: number;
  overall: number;
  tier: TierName;
  talent: TalentTier;
  stats: Record<string, number>;
  isMutantCandidate: boolean;
  snapshot?: PlayerSnapshot | null;
  newRole?: string | null;
  newRolePoints?: number;
}

export const INITIAL_PLAYER_STATE: Player = {
  id: '',
  name: '',
  role: ['ST'],
  age: 18,
  overall: 40,
  tier: 'T0',
  talent: 'Unknown',
  stats: {},
  isMutantCandidate: false,
  snapshot: null,
};
