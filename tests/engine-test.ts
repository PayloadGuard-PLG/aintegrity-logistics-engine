import { estimateStatGainPct, xpNeededFor1Pct, xpBaseForStat, getAgeMultiplier, projectSeasonDecay } from '../src/logic/xpEngine';
import { applyTierBonusToStats } from '../src/logic/xpEngine';
import { calculateActualLoss } from '../src/utils/conditionEngine';
import gameProfileJson from '../profiles/logistics_v1.json';
import { GameProfile } from '../src/types/resources';

const profile = gameProfileJson as unknown as GameProfile;

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}`);
    failed++;
  }
}

function assertClose(label: string, actual: number, expected: number, tolerance = 0.5) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) {
    console.log(`  ✓ ${label} (got ${actual.toFixed(3)}, expected ${expected})`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label} — got ${actual.toFixed(3)}, expected ${expected} ± ${tolerance}`);
    failed++;
  }
}

function assertInRange(label: string, actual: number, lo: number, hi: number) {
  const ok = actual >= lo && actual <= hi;
  if (ok) {
    console.log(`  ✓ ${label} (got ${actual.toFixed(2)}, range ${lo}–${hi})`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label} — got ${actual.toFixed(2)}, expected ${lo}–${hi}`);
    failed++;
  }
}

// ─── 1. xpBaseForStat — exponential model ───────────────────────────────────
{
  console.log('\n[1] xpBaseForStat: exponential cost curve (C₀=2.94, K=47)');
  // C₀ × exp(stat/K)
  const at0   = xpBaseForStat(0,   profile);
  const at47  = xpBaseForStat(47,  profile);
  const at94  = xpBaseForStat(94,  profile);
  assertClose('stat=0 → 2.94',           at0,  2.94,                 0.01);
  assertClose('stat=47 → 2.94×e ≈ 7.99', at47, 2.94 * Math.E,       0.02);
  assertClose('stat=94 → 2.94×e² ≈ 21.72', at94, 2.94 * Math.E * Math.E, 0.05);
  // Ratio derived from Grant ×40: exp((230-122)/47) — fits TACKLING vs POSITIONING
  const ratio = xpBaseForStat(230, profile) / xpBaseForStat(122, profile);
  assertClose('cost ratio stat230/stat122 = exp(108/47)', ratio, Math.exp(108 / 47), 0.05);
}

// ─── 2. getAgeMultiplier — table lookups ─────────────────────────────────────
{
  console.log('\n[2] getAgeMultiplier: confirmed and assumed brackets');
  // Confirmed from game data
  assertClose('age 18 → 1.00 (confirmed)',  getAgeMultiplier(18, profile), 1.00, 0.001);
  assertClose('age 20 → 1.00 (confirmed)',  getAgeMultiplier(20, profile), 1.00, 0.001);
  assertClose('age 27 → 0.61 (confirmed)',  getAgeMultiplier(27, profile), 0.61, 0.001);
  // Assumed — mark these so failures are visible
  assertClose('age 22 → 0.85 (ASSUMED — validate with Prentice run)', getAgeMultiplier(22, profile), 0.85, 0.001);
  assertClose('age 24 → 0.72 (ASSUMED — validate with age-24 DMC scan)', getAgeMultiplier(24, profile), 0.72, 0.001);
  assertClose('age 29 → 0.50 (ASSUMED)',    getAgeMultiplier(29, profile), 0.50, 0.001);
  assertClose('age 30 → 0.00 (ASSUMED)',    getAgeMultiplier(30, profile), 0.00, 0.001);
}

// ─── 3. xpNeededFor1Pct — formula: base / (ageMult × talentMult × greyMult) ─
{
  console.log('\n[3] xpNeededFor1Pct: divisor composition');
  const base120 = xpBaseForStat(120, profile);
  // Normal, age 20, white — divisor = 1.0 × 1.0 × 1.0 = 1.0
  const costWhite = xpNeededFor1Pct(120, 20, 0, 'Normal', true,  false, 1.0, profile);
  // Normal, age 20, grey  — divisor = 1.0 × 1.0 × 0.22 = 0.22 → cost is ~4.55× white
  const costGrey  = xpNeededFor1Pct(120, 20, 0, 'Normal', false, false, 1.0, profile);
  assertClose('white cost = base/1.0',           costWhite, base120,        0.01);
  assertClose('grey cost = base/0.22',           costGrey,  base120 / 0.22, 0.01);
  assert('grey costs ~4.55× white (1/0.22)', Math.abs(costGrey / costWhite - (1/0.22)) < 0.001);

  // Age multiplier: age 27 (0.61) costs more than age 20 (1.0)
  const cost27 = xpNeededFor1Pct(120, 27, 0, 'Normal', true, false, 1.0, profile);
  const cost20 = xpNeededFor1Pct(120, 20, 0, 'Normal', true, false, 1.0, profile);
  assertClose('age-27 cost / age-20 cost = 1.0/0.61 ≈ 1.639', cost27 / cost20, 1.0 / 0.61, 0.01);

  // Slow talent (0.47) costs more than Normal (1.0)
  const costSlow   = xpNeededFor1Pct(120, 20, 0, 'Slow',   true, false, 1.0, profile);
  const costNormal = xpNeededFor1Pct(120, 20, 0, 'Normal', true, false, 1.0, profile);
  assertClose('Slow cost / Normal cost = 1.0/0.47 ≈ 2.128', costSlow / costNormal, 1.0 / 0.47, 0.01);
}

// ─── 4. estimateStatGainPct — calibrated observations (player-agnostic) ──────
//
// Each case is stated as pure inputs (budget, statValue, age, talent, isWhite)
// and the observed game range from a real session. The engine must land inside
// or close to the observed range. No player name needed — only the numbers matter.
//
// Source: calibration_data.json (back-calculated from game screenshots).
{
  console.log('\n[4] estimateStatGainPct: calibrated game observations');

  // Observations A–D: Grant ×40 Standard Defending — derived K=47, bXPS=676
  // Age 20 (ageMult=1.0 confirmed), Normal (×1.0 confirmed), 5 stats, 40 sessions.
  // budget per stat = 40 × 676 / 5 = 5408. All confirmed from game screenshots.
  const budgetGrant = 40 * 676 / 5; // 5408

  const gainA = estimateStatGainPct(budgetGrant, 122, 20, 0, 'Normal', true,  false, 1.0, profile);
  assertInRange('Obs A: Grant TACKLING    stat=122 age=20 Normal white → +57–71', gainA, 57, 71);

  const gainB = estimateStatGainPct(budgetGrant, 140, 20, 0, 'Normal', true,  false, 1.0, profile);
  assertInRange('Obs B: Grant MARKING     stat=140 age=20 Normal white → +48–56', gainB, 48, 56);

  const gainC2 = estimateStatGainPct(budgetGrant, 230, 20, 0, 'Normal', true,  false, 1.0, profile);
  assertInRange('Obs C: Grant POSITIONING stat=230 age=20 Normal white → +10–15', gainC2, 10, 15);

  const gainD2 = estimateStatGainPct(budgetGrant, 216, 20, 0, 'Normal', true,  false, 1.0, profile);
  assertInRange('Obs D: Grant BRAVERY     stat=216 age=20 Normal white → +12–18', gainD2, 12, 18);

  const gainE2 = estimateStatGainPct(budgetGrant, 155, 20, 0, 'Normal', false, false, 1.0, profile);
  assertInRange('Obs E: Grant HEADING     stat=155 age=20 Normal GREY  → +11–15', gainE2, 11, 15);

  console.log('  [PENDING] Dallas ×4 Safeguard — age-23 observations inconsistent with current ageMult=0.85. Needs fresh before/after data.');

  // Observation C: grey stat costs 2× — same budget at same stat must give ~half the gain
  // grey at stat=139 age=23 Normal should be roughly half of white gain
  const gainC_white = estimateStatGainPct(360, 139, 23, 0, 'Normal', true,  false, 1.0, profile);
  const gainC_grey  = estimateStatGainPct(360, 139, 23, 0, 'Normal', false, false, 1.0, profile);
  assert('grey gain < white gain for same inputs', gainC_grey < gainC_white);
  assertClose('grey/white ratio ≈ 0.22 (not exact due to compounding)', gainC_grey / gainC_white, 0.22, 0.08);

  // Observation D: Slow talent must gain less than Normal from same inputs.
  // The ratio of GAINS is not equal to the ratio of multipliers (0.47) because
  // the cost curve compounds: Normal gains more points, reaching higher (costlier)
  // stat values, so the effective cost per point averaged over the session is higher.
  // Correct assertion: Slow gain < Normal gain, and ratio is > 0.47 (not equal to it).
  const gainD_normal = estimateStatGainPct(600, 120, 20, 0, 'Normal', true, false, 1.0, profile);
  const gainD_slow   = estimateStatGainPct(600, 120, 20, 0, 'Slow',   true, false, 1.0, profile);
  assert('Slow gains less than Normal (same inputs)',          gainD_slow < gainD_normal);
  assert('Slow/Normal ratio > 0.47 (cost curve compounds)',   gainD_slow / gainD_normal > 0.47);
  assert('Slow/Normal ratio < 0.65 (not too far above 0.47)', gainD_slow / gainD_normal < 0.65);

  // Observations E and F are pending real game data.
  // The app showed +15.4 MARKING and +11.6 AGGRESSION for Prentice's Reward Coach ×4,
  // but those are the engine's own output — not game-observed results. They cannot
  // validate bXPS or ageMult. Replace these once before/after player card screenshots
  // confirm actual stat gains from the session.
  console.log('  [PENDING] Obs E/F: Prentice Reward Coach ×4 — needs game before/after data');
}

// ─── 5. Tier bonus ───────────────────────────────────────────────────────────
{
  console.log('\n[5] applyTierBonusToStats');
  const roleKeys = ['TACKLING', 'MARKING'];
  const stats = { TACKLING: 100, MARKING: 80, HEADING: 40 };

  const result = applyTierBonusToStats(stats, roleKeys, 'T6', profile, 'T0');
  assert('T0→T6 adds 160 to TACKLING (role stat)',   result['TACKLING'] === 260);
  assert('T0→T6 adds 160 to MARKING (role stat)',    result['MARKING']  === 240);
  assert('T0→T6 leaves HEADING unchanged (off-role)', result['HEADING']  === 40);

  // Incremental: T2→T3 adds 20 (not 50)
  const incResult = applyTierBonusToStats(stats, roleKeys, 'T3', profile, 'T2');
  assert('T2→T3 adds 20 to TACKLING', incResult['TACKLING'] === 120);
  assert('T2→T3 leaves HEADING unchanged', incResult['HEADING'] === 40);
}

// ─── 6. Condition drain ──────────────────────────────────────────────────────
{
  console.log('\n[6] Condition drain (confirmed from screenshots)');
  const baseLoss = 0.75;
  assertClose('Very Easy L4 = 0.375 (zero-drain eligible)', calculateActualLoss(baseLoss, 4, 'Very Easy'), 0.375, 0.001);
  assertClose('Easy L4 = 0.750',       calculateActualLoss(baseLoss, 4, 'Easy'),     0.750, 0.001);
  assertClose('Very Hard L0 = 3.375',  calculateActualLoss(baseLoss, 0, 'Very Hard'), 3.375, 0.001);
  assert('Very Easy L4 < zero-drain threshold (0.38)', calculateActualLoss(baseLoss, 4, 'Very Easy') < 0.38);
  assert('Easy L4 >= zero-drain threshold',             calculateActualLoss(baseLoss, 4, 'Easy') >= 0.38);
}

// ─── 7. Seasonal decay ───────────────────────────────────────────────────────
//
// Confirmed from Grant T2→T3 upgrade screenshots + before/after season screenshots:
//   Each stat drops by exactly 20 points flat per promotion level.
//   White and grey stats drop equally — tier bonus provides no cushion.
//   Source: Grant T3 stats (Tackling 120, Marking 137, Heading 154, Strength 64)
//   After 1-level promotion: each drops by 20, matching T2 pre-upgrade values exactly.
{
  console.log('\n[7] projectSeasonDecay: flat −20 per stat per level promoted (confirmed)');

  // Grant's confirmed T3 stats (immediate post-upgrade screenshot)
  const stats = { TACKLING: 120, MARKING: 137, HEADING: 154, STRENGTH: 64 };

  // 1 level promoted: every stat −20, white and grey alike
  const decayed1 = projectSeasonDecay(stats, 1, profile);
  assert('TACKLING 1 level: 120−20 = 100 (white, T3)',  decayed1['TACKLING'] === 100);
  assert('MARKING  1 level: 137−20 = 117 (white, T3)',  decayed1['MARKING']  === 117);
  assert('HEADING  1 level: 154−20 = 134 (grey)',       decayed1['HEADING']  === 134);
  assert('STRENGTH 1 level:  64−20 =  44 (grey)',       decayed1['STRENGTH'] === 44);

  // 2 levels promoted: every stat −40
  const decayed2 = projectSeasonDecay(stats, 2, profile);
  assert('TACKLING 2 levels: 120−40 = 80',              decayed2['TACKLING'] === 80);
  assert('MARKING  2 levels: 137−40 = 97',              decayed2['MARKING']  === 97);

  // Stat cannot go below 0
  const lowStats = { STAT: 15 };
  const decayedLow = projectSeasonDecay(lowStats, 1, profile);
  assert('stat floor: 15−20 clamps to 0',               decayedLow['STAT']   === 0);

  // Cross-check: TACKLING after decay matches pre-upgrade T2 value (120−20 = 100 = T2 Tackling)
  assert('1-level decay returns T3 white stat to T2 baseline (tier gain wiped each season)',
    decayed1['TACKLING'] === 100);
}

console.log(`\n--- Results: ${passed} passed, ${failed} failed ---\n`);
if (failed > 0) process.exit(1);
