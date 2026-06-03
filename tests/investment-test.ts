import { planPlayerInvestment } from '../src/logic/investmentEngine';
import { compareInvestmentScenarios } from '../src/logic/scenarioComparator';
import { xpBaseForStat, xpNeededFor1Pct, estimateStatGainPct, statsToQualityPct, qualityPctToOvr, applyTierBonusToStats, getAgeMultiplier } from '../src/logic/xpEngine';
import { ManagerProfile, DrillSession } from '../src/types/resources';
import { Player } from '../src/database/playerSchema';
import gameProfile from '../profiles/logistics_v1.json';

const profile = gameProfile as typeof gameProfile;

console.log("--- AIntegrity XP Engine Test Suite ---\n");

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

// ============================================================
// [Test Group 1] XP cost table + 180-rule
// ============================================================
console.log("[Test 1] XP cost table and 180-rule");

assert("stat=0   → 8 XP per 1%",  xpBaseForStat(0, profile) === 8);
assert("stat=60  → 10 XP per 1%", xpBaseForStat(60, profile) === 10);
assert("stat=100 → 30 XP per 1%", xpBaseForStat(100, profile) === 30);
assert("stat=150 → 50 XP per 1%", xpBaseForStat(150, profile) === 50);
assert("stat=180 → Infinity (180-rule)", xpBaseForStat(180, profile) === Infinity);
assert("stat=250 → Infinity (180-rule)", xpBaseForStat(250, profile) === Infinity);
assert("stat=339 → 0 gain (below cap but 180-rule if ≥180)", xpBaseForStat(339, profile) === Infinity);

// ============================================================
// [Test Group 2] Age multipliers
// ============================================================
console.log("\n[Test 2] Age multipliers");

const ageMult18 = getAgeMultiplier(18, profile);
const ageMult20 = getAgeMultiplier(20, profile);
const ageMult27 = getAgeMultiplier(27, profile);
assert("age 18 → 1.00",            Math.abs(ageMult18 - 1.00) < 0.001);
assert("age 20 → 0.55",            Math.abs(ageMult20 - 0.55) < 0.001);
assert("age 27 → 0.16",            Math.abs(ageMult27 - 0.16) < 0.001);
assert("age 20 < age 18 gains",    ageMult20 < ageMult18);
assert("age 40 clamps to min",     getAgeMultiplier(40, profile) === getAgeMultiplier(30, profile));

// ============================================================
// [Test Group 3] Grey weight
// ============================================================
console.log("\n[Test 3] Grey weight = 0.5");

const xpWhite = xpNeededFor1Pct(100, 18, 0, 'Normal', true, false, 1.0, profile);
const xpGrey  = xpNeededFor1Pct(100, 18, 0, 'Normal', false, false, 1.0, profile);
assert("grey costs 2× more XP than white (0.5 multiplier)", Math.abs(xpGrey / xpWhite - 2.0) < 0.001,
  `white=${xpWhite.toFixed(2)}, grey=${xpGrey.toFixed(2)}`);

// ============================================================
// [Test Group 4] Talent tier multipliers
// ============================================================
console.log("\n[Test 4] Talent tier multipliers");

const xpNormal = xpNeededFor1Pct(100, 18, 0, 'Normal', true, false, 1.0, profile);
const xpFT1    = xpNeededFor1Pct(100, 18, 0, 'Fastest',    true, false, 1.0, profile);
const xpSlow   = xpNeededFor1Pct(100, 18, 0, 'Slow',   true, false, 1.0, profile);
assert("Fastest costs less XP than Normal",  xpFT1 < xpNormal,    `Fastest=${xpFT1.toFixed(2)}, Normal=${xpNormal.toFixed(2)}`);
assert("Slow costs more XP than Normal", xpSlow > xpNormal,   `Slow=${xpSlow.toFixed(2)}, Normal=${xpNormal.toFixed(2)}`);
assert("Fastest/Normal ratio ≈ 1/1.5",       Math.abs(xpFT1 / xpNormal - 1/1.5) < 0.01);
assert("Slow/Normal ratio ≈ 1/0.7",      Math.abs(xpSlow / xpNormal - 1/0.7) < 0.01);

// ============================================================
// [Test Group 5] 2× Ad multiplier
// ============================================================
console.log("\n[Test 5] 2× Ad doubles efficiency");

const xpNoAd  = xpNeededFor1Pct(100, 18, 0, 'Normal', true, false, 1.0, profile);
const xpWithAd = xpNeededFor1Pct(100, 18, 0, 'Normal', true, true, 1.0, profile);
assert("2× Ad halves XP cost", Math.abs(xpWithAd / xpNoAd - 0.5) < 0.001,
  `noAd=${xpNoAd.toFixed(2)}, withAd=${xpWithAd.toFixed(2)}`);

// ============================================================
// [Test Group 6] Drill level multipliers
// ============================================================
console.log("\n[Test 6] Drill level multipliers");

const xpVeryEasy  = xpNeededFor1Pct(100, 18, 0, 'Normal', true, false, 1.0,  profile);
const xpMedium    = xpNeededFor1Pct(100, 18, 0, 'Normal', true, false, 1.3,  profile);
const xpVeryHard  = xpNeededFor1Pct(100, 18, 0, 'Normal', true, false, 1.7,  profile);
assert("Medium cheaper than Very Easy",   xpMedium < xpVeryEasy);
assert("Very Hard cheapest of all",       xpVeryHard < xpMedium);
assert("Medium/VeryEasy ratio ≈ 1/1.3",   Math.abs(xpMedium / xpVeryEasy - 1/1.3) < 0.01);

// ============================================================
// [Test Group 7] Quality% and OVR formula
// ============================================================
console.log("\n[Test 7] Quality% and OVR");

const stats15Even = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`S${i}`, 100]));
const qp100 = statsToQualityPct(stats15Even, profile);
assert("15 stats at 100 → Quality% = 100",  Math.abs(qp100 - 100) < 0.001, `got ${qp100}`);
assert("Quality% 100 → OVR 100 (divisor=1)", Math.abs(qualityPctToOvr(100, profile) - 100) < 0.001);
assert("Quality% 200 → OVR 200 (divisor=1)", Math.abs(qualityPctToOvr(200, profile) - 200) < 0.001);

// ============================================================
// [Test Group 8] Tier bonus as attribute addition
// ============================================================
console.log("\n[Test 8] Tier bonus = flat attribute addition, NOT OVR");

const baseStats = { FINISHING: 100, SHOOTING: 100, DRIBBLING: 100 };
const whiteKeys = ['FINISHING', 'SHOOTING', 'DRIBBLING'];
const afterRare = applyTierBonusToStats(baseStats, whiteKeys, 'T1', profile);
assert("T1 adds +10 to each white stat",   afterRare['FINISHING'] === 110 && afterRare['SHOOTING'] === 110);

const afterStellar = applyTierBonusToStats(baseStats, whiteKeys, 'T3', profile);
assert("T3 adds +50 to each white stat", afterStellar['FINISHING'] === 150);

// Cap enforcement
const highStats = { STAT_A: 320 };
const afterLegendary = applyTierBonusToStats(highStats, ['STAT_A'], 'T6', profile);
assert("Tier addition is capped at statCap (340)", afterLegendary['STAT_A'] === 340,
  `got ${afterLegendary['STAT_A']}`);

// ============================================================
// [Test Group 9] Stat gain projection
// ============================================================
console.log("\n[Test 9] Stat gain projection");

const gain10Sessions = estimateStatGainPct(10, 60, 18, 0, 'Normal', true, false, 1.0, profile);
const gain100Sessions = estimateStatGainPct(100, 60, 18, 0, 'Normal', true, false, 1.0, profile);
assert("10 sessions at stat=60 yields > 0% gain",    gain10Sessions > 0, `got ${gain10Sessions}`);
assert("100 sessions yields more than 10 sessions",  gain100Sessions > gain10Sessions);
assert("Stat at 180% yields 0 gain (180-rule)",      estimateStatGainPct(50, 180, 18, 0, 'Normal', true, false, 1.0, profile) === 0);

// ============================================================
// [Test Group 10] Restorers = condition restore, NOT OVR
// ============================================================
console.log("\n[Test 10] Restorers step produces zero OVR change");

const drillSessions: DrillSession[] = [
  { drillName: 'Touch Training', sessionCount: 5, drillLevel: 'Very Easy' }
];
const managerProfile: ManagerProfile = {
  style: 'PTW', tierPoints: {}, restorers: 50, isPremiumSponsor: false,
  twoxAdActive: false, talentTier: 'Normal', drillLevel: 'Very Easy', matchAdvisorActive: false,
};
const testPlayer: Player = {
  id: '1', name: 'Test Player', role: ['ST'],
  age: 18, overall: 100,   // consistent with stats at 100 and divisor=1
  stats: { FINISHING: 100, SHOOTING: 100, DRIBBLING: 100, PASSING: 100, POSITIONING: 100, HEADING: 100 },
  isMutantCandidate: false, tier: 'T0', talent: 'Normal',
};
const planWithGreens = planPlayerInvestment(testPlayer, managerProfile, drillSessions, profile, null);
const greensStep = planWithGreens.steps.find(s => s.action === 'condition');
assert("Restorers step exists when restorers > 0",          greensStep !== undefined);
assert("Restorers step OVR before === OVR after (no OVR gain)", greensStep ? greensStep.ovrBefore === greensStep.ovrAfter : false,
  greensStep ? `before=${greensStep.ovrBefore}, after=${greensStep.ovrAfter}` : 'no step found');

// ============================================================
// [Test Group 11] Investment plan end-to-end
// ============================================================
console.log("\n[Test 11] Investment plan — young striker, Touch Training ×20 → Stellar");

// All 15 stats at 100 → Quality% = 100 → OVR = 25
const striker: Player = {
  id: '1', name: 'Alpha Striker', role: ['ST', 'AMC'],
  age: 18, overall: 100,   // all 15 stats at 100 → computed OVR 100
  stats: {
    FINISHING: 100, SHOOTING: 100, DRIBBLING: 100, PASSING: 100, POSITIONING: 100,
    HEADING: 100, STRENGTH: 100, SPEED: 100, CREATIVITY: 100, BRAVERY: 100,
    AGILITY: 100, FITNESS: 100, STAMINA: 100, TACKLING: 100, MARKING: 100,
  },
  isMutantCandidate: true, tier: 'T0', talent: 'Normal',
};
const strikerProfile: ManagerProfile = {
  style: 'PTW', tierPoints: { T3: 650 }, restorers: 50, isPremiumSponsor: true,
  twoxAdActive: false, talentTier: 'Normal', drillLevel: 'Very Easy', matchAdvisorActive: false,
};
const strikerDrills: DrillSession[] = [
  { drillName: 'Touch Training', sessionCount: 50, drillLevel: 'Very Easy' },
];
const strikerPlan = planPlayerInvestment(striker, strikerProfile, strikerDrills, profile, 'T3');
console.log(`  Plan: ${strikerPlan.recommendation}`);
assert("Plan finalOvr > currentOvr",    (strikerPlan.finalOvr ?? strikerPlan.finalCci ?? 0) > (strikerPlan.player?.currentOvr ?? strikerPlan.asset?.currentCci ?? 0));
assert("Plan has drill step",           strikerPlan.steps.some(s => s.action === 'drill'));
assert("Plan has tier step",            strikerPlan.steps.some(s => s.action === 'tier'));
assert("Plan has condition step",       strikerPlan.steps.some(s => s.action === 'condition'));
assert("Total OVR gain > 0",            (strikerPlan.totalOvrGain ?? strikerPlan.totalCciGain ?? 0) > 0);

// ============================================================
// [Test Group 12] Scenario comparison — striker vs GK
// ============================================================
console.log("\n[Test 12] Scenario comparison — Striker vs GK");

// 15 stats; whites slightly lower to make comparison interesting
const youngGK: Player = {
  id: '2', name: 'Academy GK', role: ['GK'],
  age: 17, overall: 20,
  stats: {
    REFLEXES: 90, AGILITY: 88, ANTICIPATION: 82, 'RUSHING OUT': 75, COMMUNICATION: 70,
    THROWING: 80, KICKING: 80, PUNCHING: 80, 'AERIAL REACH': 80, FITNESS: 80,
    STRENGTH: 80, SPEED: 80, STAMINA: 80, BRAVERY: 80, CREATIVITY: 80,
  },
  isMutantCandidate: false, tier: 'T0', talent: 'Normal',
};
const compDrills: DrillSession[] = [
  { drillName: 'Touch Training', sessionCount: 20, drillLevel: 'Very Easy' },
];
const comparison = compareInvestmentScenarios([striker, youngGK], strikerProfile, compDrills, profile, null);
assert("Comparison has 2 results",            comparison.results.length === 2);
assert("Results are ranked 1 and 2",          comparison.results[0].rank === 1 && comparison.results[1].rank === 2);
assert("Recommended player is set",           !!comparison.recommendedPlayer);
console.log(`  → Recommended: ${comparison.recommendedPlayer ?? comparison.recommendedAsset} (+${(comparison.results[0].ovrGain ?? comparison.results[0].cciGain ?? 0).toFixed(2)} OVR)`);

// ============================================================
// Summary
// ============================================================
console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
if (failed > 0) process.exit(1);
