/**
 * Simulation fixture — Ala Turgeman (DR, Age 23)
 *
 * Stats captured from player card screenshot (2026-05-15).
 * Run with:  npx ts-node tests/sim-ala.ts
 *
 * Parameters:
 *   - Fan club level: 2
 *   - Sessions per drill: 50
 *   - Top-N drills by ROI (default 6)
 *   - Talent: Normal (update if card shows otherwise)
 */

import { getRecommendedDrills }          from '../src/logic/controller';
import { applyDrillSessionsToStats, computeOvrWithPadding } from '../src/logic/ovrProjector';
import gameProfileJson                    from '../profiles/logistics_v1.json';
import { GameProfile, DrillSession, TalentTier } from '../src/types/resources';

const profile = gameProfileJson as unknown as GameProfile;

// ─── Player fixture ───────────────────────────────────────────────────────────

const ALA = {
  id:      'ala-turgeman',
  name:    'Ala Turgeman',
  role:    ['DR'],
  age:     23,
  overall: 112,  // game display (formula gives 111 from integer stats; fractional carries explain delta)
  tier:    'T0' as const,
  talent:  'Normal' as TalentTier,
  stats: {
    // DEF
    TACKLING:   120,
    MARKING:    112,
    POSITIONING:137,
    HEADING:     95,
    BRAVERY:    132,
    // ATT
    PASSING:    110,
    DRIBBLING:   95,
    CROSSING:   124,
    SHOOTING:    95,
    FINISHING:   85,
    // PHY
    FITNESS:    131,
    STRENGTH:    95,
    AGGRESSION: 134,
    SPEED:      111,
    CREATIVITY:  97,
  },
};

// ─── Config ───────────────────────────────────────────────────────────────────

const FAN_LEVEL   = 2;   // L2
const SESSIONS    = 50;
const TOP_N       = 6;
const TWOX_AD     = false;

// ─── Pick top-N drills by ROI ─────────────────────────────────────────────────

const ranked = getRecommendedDrills(ALA as any, FAN_LEVEL as 0|1|2|3|4);
const topDrills = ranked.slice(0, TOP_N);

console.log('\n──────────────────────────────────────────────────────────────');
console.log(`  ${ALA.name} — DR · Age ${ALA.age} · OVR ${ALA.overall} · Fan L${FAN_LEVEL}`);
console.log('──────────────────────────────────────────────────────────────');
console.log(`\n  Top-${TOP_N} drills by ROI:\n`);
topDrills.forEach((d, i) => {
  console.log(
    `  ${i + 1}. ${d.name.padEnd(22)} [${d.intensity.padEnd(9)}]  ` +
    `eff=${d.efficiency.toFixed(2)}  cond=${d.conditionCost.toFixed(3)}%  ROI=${d.roi.toFixed(3)}`
  );
});

// ─── Build sessions ───────────────────────────────────────────────────────────

const sessions: DrillSession[] = topDrills.map(d => ({
  drillName:    d.name,
  sessionCount: SESSIONS,
  drillLevel:   d.intensity as any,
}));

// ─── Run projection ───────────────────────────────────────────────────────────

const { updatedStats, finalOvr } = applyDrillSessionsToStats(
  ALA as any,
  sessions,
  ALA.talent,
  TWOX_AD,
  profile
);

// ─── Report ───────────────────────────────────────────────────────────────────

const ovrBefore = computeOvrWithPadding(ALA.stats, ALA.overall, profile);

console.log(`\n  ── Stat gains (${SESSIONS} sessions each) ──────────────────────\n`);

const entries = Object.entries(ALA.stats).map(([k, before]) => {
  const after = updatedStats[k] ?? before;
  return { stat: k, before, after, gain: after - before };
}).sort((a, b) => b.gain - a.gain);

entries.forEach(({ stat, before, after, gain }) => {
  if (gain < 0.001) return;
  const bar = '█'.repeat(Math.min(Math.round(gain / 5), 20));
  console.log(
    `  ${stat.padEnd(14)} ${String(Math.round(before)).padStart(3)} → ${String(Math.floor(after)).padStart(3)}` +
    `  (+${gain.toFixed(1).padStart(5)})  ${bar}`
  );
});

console.log(`\n  ── OVR ─────────────────────────────────────────────────────\n`);
console.log(`  Before:  ${ovrBefore.toFixed(1)}`);
console.log(`  After:   ${finalOvr.toFixed(1)}`);
console.log(`  Gain:    +${(finalOvr - ovrBefore).toFixed(1)}\n`);
console.log('──────────────────────────────────────────────────────────────\n');
