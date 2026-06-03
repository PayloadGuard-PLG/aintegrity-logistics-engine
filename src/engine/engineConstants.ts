/**
 * engineConstants.ts — Single source of truth for all calibrated engine constants.
 *
 * Every constant is re-exported from profiles/logistics_v1.json (OTA-updatable).
 * Each export carries its calibration status and evidence chain in the JSDoc.
 * To tune a constant: update game_2025.json, add the evidence here.
 * To fine-tune one stage: only its constant(s) need touching — no other stage is coupled.
 */

import profile from '../../profiles/logistics_v1.json';

// ─── XP COST CURVE ────────────────────────────────────────────────────────────
// Formula: cost(stat) = C₀ × exp(stat / K)
// Confirmed ✅ C₀ = 2.94
//   Derived from Tackling-120 vs Positioning-228 gain ratio in the same coaching session
//   (same player, same budget). The ratio pins C₀ independently of bXPS.
// Confirmed ✅ K = 47
//   CV minimisation across 5 Ricky Grant ×40 Standard Defending observations (CV = 3.2%).
//   Proof: integral budget(5408 XP, K=47, C₀=2.94) → Tackling-120 gain = 65.7 (actual 59–73 ✓).
export const C0: number = profile.xpCostBase as number;    // 2.94
export const K: number  = profile.xpCostDecayK as number;  // 47

// ─── SESSION BUDGET ───────────────────────────────────────────────────────────
// Confirmed ✅ baseXpPerSession = 676
//   Back-calculated from Grant ×40 Standard Defending at K=47:
//   Budget per stat = 40 × 676 / 5 = 5408 XP → gain integral = 65.7 (actual 59–73 ✓).
//   Also consistent with Dallas ×4 Safeguard: 4 × 676 / 3 = 901 XP/stat →
//     MARKING-139: 11.9 (actual [11,16] ✓), POSITIONING-194: 4.1 (actual [4,6] ✓),
//     AGGRESSION-189: 4.5 (actual [4,6] ✓).
//   Do NOT change without ≥ 2 new independent data points.
export const BASE_XPS: number = profile.baseXpPerSession;  // 676

// Confirmed ✅ sessionBudgetDecay = 0.99
//   Each successive session of the same coach delivers slightly less XP than the previous.
//   Effective sessions = (1 - 0.99^N) / (1 - 0.99) = (1 - 0.99^N) × 100.
//   Derived from LJDark Leo ×114 Extensive GK (Normal, age 18):
//     Linear model:   budget = 114 × 676 / 11 = 7006 XP/stat → projects 182 OVR (actual 173, error +9 ✗)
//     Geometric 0.99: effective = 68.2 sessions, budget = 4191 XP/stat → projects 172 OVR (actual 173, error −1 ✓)
//   Also resolves the long-running ×N anomaly: ×40 vs ×114 give different but realistic results.
//   Impact on Grant ×40 Defending: linear gave 65.7 for TACKLING-120, geometric gives 59.2 (both within 59–73 ✓).
//   Impact on Dallas ×4: geometric ≈ linear (×4 decay factor is negligible: 3.94 vs 4.0).
export const SESSION_BUDGET_DECAY: number = profile.sessionBudgetDecay ?? 1.0;

// ⚠️ Uncalibrated — drillXpFactor = 0.3 is a provisional scaling factor.
//   Needs before/after stats from a controlled drill-only session to back-calculate.
//   Drill budget per stat = cycles × BASE_XPS × DRILL_XP_FACTOR / numStatsDrilled
export const DRILL_XP_FACTOR: number = profile.drillXpFactor ?? 0.3;

// ─── GREY STAT WEIGHT ────────────────────────────────────────────────────────
// Confirmed ✅ greyWeightMultiplier = 0.22
//   Back-calculated from Grant ×40 Standard Defending HEADING (grey stat, stat=155).
//   Actual gain +11–15. Engine at greyMult=0.22 → 12.4 ✓.
//   Grey stats cost ~4.5× more XP per point than white stats (divisor 0.22 vs 1.0).
//   This multiplier is the ONLY difference between white and grey stat training cost.
export const GREY_MULT: number = profile.greyWeightMultiplier;  // 0.22

// ─── AGE MULTIPLIERS ─────────────────────────────────────────────────────────
// Applied as a multiplier on training efficiency (higher = faster training).
// Confirmed ✅ 18–20 (1.0): Grant age 20 — multiple sessions match across all stat ranges.
// Confirmed ✅ 24–25 (0.72): McCluskey age 24 — Fitness actual +2–3, engine +3.5 ✓.
// Confirmed ✅ 26–28 (0.61): McGinty age 27 — projection matches controlled test.
// Partial ⚠️  21–23 (0.85): validated by use — Dallas (age 23) bXPS calibration consistent;
//   not a standalone controlled test. A deliberate age-22 session would confirm.
// Assumed ⚠️  17 (1.1), 29 (0.50), 30+ (0.0): no empirical data. Do not present as confirmed.
export const AGE_TABLE: Record<string, number> = profile.ageTable;

// ─── TALENT MULTIPLIERS ──────────────────────────────────────────────────────
// Applied as a multiplier on training efficiency (higher = faster = more gains per XP).
// Talent IS a confirmed formula variable — see calibration_data.json → cieran_morgan.
//
// Confirmed ✅ Normal (1.0): Grant, Rogers, McGinty, Dallas, McCluskey, Jables
//   Confirmed from intake form Training Rate / edit screen for each player.
//   Jables DB stores "Slow" — this is a mislabel. All 11 GK stat ranges fit Normal only.
//
// ⚠️ Slow (0.47): PROVISIONAL — re-confirmed from Cieran Morgan ×30 Standard ATK.
//   All 5 ATK stats within game range at mult=0.47. Normal (1.0) over-predicts by 1.48–1.95×.
//   Mean implied mult from back-calculation across 5 stats = 0.46 ≈ 0.47.
//   Edit screen not yet confirmed. If Cieran's talent shows "Slow" → confirmed.
//   Note: 0.47 was first derived in Sprint 33 from Jables ×114 using LINEAR budget (invalid).
//         Now re-derived independently under the correct GEOMETRIC budget model.
//
// ⚠️ Fast (1.25), Average (1.1), Fastest (1.5): community estimates, no empirical data.
export const TALENT_MULTS: Record<string, number> = profile.talentMultipliers;

// ─── STAR DECAY ──────────────────────────────────────────────────────────────
// ⚠️ starDecayPerSession = 0.85: model characteristic, empirical confirmation pending.
//   Applied per star threshold crossed within a session.
//   starsGained = floor(sessionOvrGain / STAR_OVR_THRESHOLD)
//   decay factor = STAR_DECAY ^ starsGained
//   The ×N anomaly (×20 ≈ ×40 gains) is consistent with geometric sum plateau at large N
//   but has not been confirmed with a controlled ×4 vs ×20 same-player test.
export const STAR_DECAY: number           = profile.starDecayPerSession;  // 0.85
export const STAR_OVR_THRESHOLD: number   = profile.starOvrThreshold;     // 20

// ─── 2× AD MULTIPLIER ────────────────────────────────────────────────────────
export const TWOX_AD_MULT: number = profile.twoxAdMultiplier;  // 2.0

// ─── OVR FORMULA ─────────────────────────────────────────────────────────────
// Confirmed ✅ OVR = floor(sum(all 15 stats) / 15)
//   Grant T2→T3 clean tier upgrade (no training between): sum=2615, game=174.
//   floor(2615/15) = floor(174.33) = 174 ✓. ceil = 175 ✗.
//   Sprint 27 "ceil confirmation" was artefact of fractional training accumulation
//   pushing internal sum above displayed sum. Clean integer-only tier upgrade is decisive.
export const TOTAL_ATTRS: number  = profile.totalAttributeCount;  // 15
export const OVR_DIVISOR: number  = profile.qualityOvrDivisor;    // 1

// ─── TIER ATTRIBUTE ADDITIONS ────────────────────────────────────────────────
// Confirmed ✅ Cumulative flat bonus added to WHITE STATS ONLY.
//   Grey and off-role stats receive no tier increment (confirmed from Grant T2→T3:
//   every white stat +20 exactly; HEADING and STRENGTH +0 tier, only +1 training).
// Confirmed ✅ T2→T3 = +20/white stat: exact per-stat inspection of Grant snapshots.
// Full table (cumulative from T0): T0=0, T1=10, T2=30, T3=50, T4=80, T5=120, T6=160.
export const TIER_ADDITIONS: Record<string, number>      = profile.tierAttrAdditions;
export const TIER_INCREMENTS: Record<string, number>     = profile.tierIncrements;
export const TIER_POINTS_REQUIRED: Record<string, number> = profile.tierPointsRequired;

// ─── TRAINING LOCK ───────────────────────────────────────────────────────────
// Confirmed ✅ maxBaseOvr = 180
//   Base OVR ≥ 180 → TRAIN button absent, MAX STARS displayed.
//   Base OVR = total OVR − tier contribution. Tier bonus (e.g. Neri T6 +138) is excluded
//   from the 180 cap. Individual stats CAN exceed 180 via tier bonuses.
export const MAX_BASE_OVR: number = profile.maxBaseOvr;  // 180

// ─── SEASON DECAY ────────────────────────────────────────────────────────────
// Confirmed ✅ seasonDecayPerLevel = 20 (flat, not proportional)
//   Grant T3 before/after season: every stat −17 to −19 (avg 17, ~3 pts training noise).
//   Flat model fits. 20%-proportional model would be off by 18–26 on high stats.
//   White and grey stats drop equally — tier bonus is NOT preserved.
export const SEASON_DECAY: number = profile.seasonDecayPerLevel ?? 20;

// ─── CONDITION SYSTEM ────────────────────────────────────────────────────────
// Confirmed ✅ conditionLoss = baseLoss × intensityMult × (1 − fanClubReduction/100)
// Confirmed ✅ condLevelMultipliers: ×1 (VE) → ×5 (VH) from game screenshots.
// Confirmed ✅ fanClubCondReduction: L0=10%, L1=15%, L2=20%, L3=25%, L4=50%.
// Confirmed ✅ zeroDrainThreshold: Very Easy + L4 = 0.375% rounds to 0.00% in-game.
// Confirmed ✅ conditionPerRestorer = 15%.
export const COND_LEVEL_MULTS: Record<string, number> = profile.condLevelMultipliers;
export const FAN_COND_REDUCTION: number[]             = profile.fanClubCondReduction;
export const BASE_LOSS_PER_DRILL: number              = profile.baseLossPerDrill;
export const ZERO_DRAIN_THRESHOLD: number             = profile.zeroDrainThreshold;
export const CONDITION_PER_RESTORER: number           = profile.conditionPerRestorer;

// ─── STAT CAP ────────────────────────────────────────────────────────────────
export const STAT_CAP: number = profile.statCap;

// ─── RAW PROFILE (for callers that still need the full GameProfile shape) ────
export { profile as GAME_PROFILE };

// ─── CONSTANT PROVENANCE ACCESSOR (Phase B5) ─────────────────────────────────
// Returns the _meta sibling for any constant key in logistics_v1.json, or undefined.
// Example: getConstantMeta('xpCostBase')?.confidence === 'high'
//          getConstantMeta('baseXpPerSession')?.confidence === 'assumed'
export function getConstantMeta(key: string): {
  source: string; n: number; cv?: number; confidence: string; citation?: string; variance?: number;
} | undefined {
  const raw = (profile as Record<string, unknown>)[`${key}_meta`];
  return raw as ReturnType<typeof getConstantMeta> | undefined;
}
