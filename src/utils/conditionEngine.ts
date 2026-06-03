import gameProfileJson from '../../profiles/logistics_v1.json';
import { GameProfile } from '../types/resources';

const profile = gameProfileJson as unknown as GameProfile;

// Condition drain multipliers per drill difficulty — loaded from profile.
// These are SEPARATE from profile.drillLevelMultipliers (which scale XP gain only).
// Formula: conditionLoss = baseLossPerDrill × condLevelMultipliers[level] × (1 − fanClubCondReduction[fanLevel])
export const COND_LEVEL_MULTIPLIERS: Record<string, number> = profile.condLevelMultipliers;

// Fan club condition retention fractions (1 − reduction) — loaded from profile.
// Index = fan club level (0–4). Values are fractions: 0.9, 0.85, 0.8, 0.75, 0.5.
const FAN_RETENTION: number[] = profile.fanClubCondReduction.map(r => 1 - r);

// Returns per-drill condition loss %.
// baseLoss = profile.baseLossPerDrill (0.75) × difficulty multiplier × fan club retention.
// Very Easy + L4 → 0.375% → below zeroDrainThreshold → isZeroDrain.
export function calculateActualLoss(baseLoss: number, fanLevel: number, drillLevel: string = 'Very Easy'): number {
    const retention = FAN_RETENTION[fanLevel] ?? 1;
    const diffMult  = COND_LEVEL_MULTIPLIERS[drillLevel] ?? 1;
    return baseLoss * diffMult * retention;
}
