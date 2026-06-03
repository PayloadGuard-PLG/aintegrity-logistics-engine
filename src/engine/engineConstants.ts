/**
 * engineConstants.ts — Single source of truth for all calibrated engine constants.
 *
 * Every constant is re-exported from profiles/logistics_v1.json (OTA-updatable).
 * Each export carries its calibration status and evidence chain in the JSDoc.
 * To tune a constant: update logistics_v1.json, add the evidence here.
 * To fine-tune one stage: only its constant(s) need touching — no other stage is coupled.
 */

import profile from '../../profiles/logistics_v1.json';

// ─── COST CURVE ───────────────────────────────────────────────────────────────
// Formula: cost(metric) = COST_CURVE_BASE × exp(metric / COST_CURVE_DECAY)
// Confirmed ✅ COST_CURVE_BASE = 2.94
//   Derived from gain ratio of two metrics at different values in the same investment cycle
//   (same asset, same budget). The ratio pins C₀ independently of base resources.
// Confirmed ✅ COST_CURVE_DECAY = 47
//   CV minimisation across 5 controlled observations (CV = 3.2%).
export const COST_CURVE_BASE: number  = profile.costCurveBase as number;   // 2.94
export const COST_CURVE_DECAY: number = profile.costCurveDecay as number;  // 47

// ─── CYCLE BUDGET ─────────────────────────────────────────────────────────────
// Confirmed ✅ baseResourcesPerCycle = 676
//   Back-calculated from controlled investment runs at COST_CURVE_DECAY=47.
//   Do NOT change without ≥ 2 new independent data points.
export const BASE_RESOURCES_PER_CYCLE: number = profile.baseResourcesPerCycle;  // 676

// Confirmed ✅ cycleBudgetDecay = 0.99
//   Each successive cycle delivers slightly less resources than the previous.
//   Effective cycles = (1 - 0.99^N) / (1 - 0.99) = (1 - 0.99^N) × 100.
//   Geometric decay resolves the long-running ×N anomaly.
export const CYCLE_BUDGET_DECAY: number = profile.cycleBudgetDecay ?? 1.0;

// ⚠️ Uncalibrated — conditioningResourceFactor = 0.3 is a provisional scaling factor.
//   Needs before/after metrics from a controlled conditioning-only session.
export const CONDITIONING_RESOURCE_FACTOR: number = profile.conditioningResourceFactor ?? 0.3;

// ─── SECONDARY METRIC WEIGHT ──────────────────────────────────────────────────
// Confirmed ✅ secondaryMetricWeight = 0.22
//   Back-calculated from controlled secondary-metric observations.
//   Secondary metrics cost ~4.5× more resources per point than primary metrics.
export const SECONDARY_METRIC_WEIGHT: number = profile.secondaryMetricWeight;  // 0.22

// ─── MATURITY MULTIPLIERS ─────────────────────────────────────────────────────
// Applied as a multiplier on intervention efficiency (higher = more responsive).
// ⚠️ All entries ASSUMED — calibrate from field operational data.
export const MATURITY_MULTS: Record<string, number> = profile.maturityMultipliers;

// ─── EFFICIENCY CLASS MULTIPLIERS ────────────────────────────────────────────
// Applied as a multiplier on intervention efficiency.
// ⚠️ All entries ASSUMED — calibrate from asset specification data.
export const EFFICIENCY_CLASS_MULTS: Record<string, number> = profile.efficiencyClassMultipliers;

// ─── THRESHOLD DECAY ──────────────────────────────────────────────────────────
// ⚠️ thresholdDecayFactor = 0.85: model characteristic, empirical confirmation pending.
//   Applied per performance threshold crossed within a single investment cycle.
//   thresholdsCrossed = floor(sessionCciGainSoFar / THRESHOLD_CCI_INCREMENT)
export const THRESHOLD_DECAY_FACTOR: number   = profile.thresholdDecayFactor;   // 0.85
export const THRESHOLD_CCI_INCREMENT: number  = profile.thresholdCciIncrement;  // 20

// ─── BOOST MULTIPLIER ─────────────────────────────────────────────────────────
export const BOOST_MULTIPLIER: number = profile.boostMultiplier;  // 2.0

// ─── CCI FORMULA ─────────────────────────────────────────────────────────────
// Confirmed ✅ CCI = floor(sum(all metrics) / metricCount)
export const METRIC_COUNT: number    = profile.metricCount;      // 10
export const CCI_DIVISOR_SCALE: number = profile.cciDivisorScale;  // 1

// ─── STAGE METRIC ADDITIONS ───────────────────────────────────────────────────
// Confirmed ✅ Cumulative flat bonus added to PRIMARY METRICS ONLY.
export const STAGE_METRIC_ADDITIONS: Record<string, number>  = profile.stageMetricAdditions;
export const STAGE_METRIC_INCREMENTS: Record<string, number> = profile.stageMetricIncrements;
export const STAGE_POINTS_REQUIRED: Record<string, number>   = profile.stagePointsRequired;

// ─── INVESTMENT LOCK ──────────────────────────────────────────────────────────
// Confirmed ✅ capacityCeiling = 180
//   Base CCI ≥ 180 → investment locked.
export const CAPACITY_CEILING: number = profile.capacityCeiling;  // 180

// ─── PERIODIC DEGRADATION ────────────────────────────────────────────────────
// Confirmed ✅ periodicDegradationPerStage = 20 (flat, not proportional)
export const PERIODIC_DEGRADATION: number = profile.periodicDegradationPerStage ?? 20;

// ─── READINESS SYSTEM ────────────────────────────────────────────────────────
// Confirmed ✅ readinessLoss = baseDrain × intensityMult × (1 − supportReduction/100)
export const INTENSITY_MULTS: Record<string, number>  = profile.intensityMultipliers;
export const SUPPORT_DRAIN_REDUCTION: number[]        = profile.supportDrainReduction;
export const BASE_DRAIN_PER_CYCLE: number             = profile.baseDrainPerCycle;
export const ZERO_DRAIN_THRESHOLD: number             = profile.zeroDrainThreshold;
export const READINESS_PER_RESTORATION: number        = profile.readinessPerRestoration;

// ─── METRIC CAP ───────────────────────────────────────────────────────────────
export const METRIC_CAP: number = profile.metricCap;

// ─── RAW PROFILE (for callers that still need the full profile shape) ─────────
export { profile as GAME_PROFILE };

// ─── CONSTANT PROVENANCE ACCESSOR (Phase B5) ─────────────────────────────────
// Returns the _meta sibling for any constant key in logistics_v1.json, or undefined.
// Example: getConstantMeta('costCurveBase')?.confidence === 'high'
//          getConstantMeta('baseResourcesPerCycle')?.confidence === 'assumed'
export function getConstantMeta(key: string): {
  source: string; n: number; cv?: number; confidence: string; citation?: string; variance?: number;
} | undefined {
  const raw = (profile as Record<string, unknown>)[`${key}_meta`];
  return raw as ReturnType<typeof getConstantMeta> | undefined;
}
