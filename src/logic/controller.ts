import { isWhiteStat, validateRoleAdjacency, getWhiteStatKeys } from '../utils/metricWeights';
import { DRILL_LIST } from '../database/drillDatabase';
import { calculateActualLoss } from '../utils/conditionEngine';
import { Player } from '../database/playerSchema';
import { FanLevel, GameProfile } from '../types/resources';
import gameProfileJson from '../../profiles/logistics_v1.json';

const profile = gameProfileJson as unknown as GameProfile;

export function getRecommendedDrills(player: Player, fanClubLevel: FanLevel = 4) {
    if (!validateRoleAdjacency(player.role)) {
        throw new Error(`Invalid combination: Roles must be adjacent.`);
    }

    const whiteStats = new Set(getWhiteStatKeys(player.role));

    return DRILL_LIST.map(drill => {
        const actualLoss = calculateActualLoss(drill.baseLoss, fanClubLevel, drill.intensity);
        const isZeroDrain = actualLoss < profile.zeroDrainThreshold;
        const whiteDrillStats = drill.stats.filter(s => whiteStats.has(s.toUpperCase()));
        const efficiency = drill.stats.length > 0 ? whiteDrillStats.length / drill.stats.length : 0;
        const conditionCost = isZeroDrain ? 0 : actualLoss;
        const roi = conditionCost === 0 ? efficiency * 1000 : efficiency / conditionCost;

        const vals = whiteDrillStats.map(s => player.stats[s]).filter((v): v is number => v !== undefined);
        const avgWhiteStatValue = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : Infinity;

        return {
            name: drill.name,
            type: drill.type,
            intensity: drill.intensity,
            efficiency,
            conditionCost,
            isZeroDrain,
            roi,
            avgWhiteStatValue,
            statsHit: drill.stats,
            whiteHits: drill.stats.map(stat => ({ stat, white: whiteStats.has(stat.toUpperCase()) })),
        };
    })
    .sort((a, b) => b.roi - a.roi);
}

// Aliases for backward compatibility with existing tests
export const getBestDrillSelections = getRecommendedDrills;
export const getDrillRecommendations = getRecommendedDrills;
