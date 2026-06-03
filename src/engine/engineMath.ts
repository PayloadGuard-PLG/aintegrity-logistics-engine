/**
 * engineMath.ts — Pure, isolated math functions for every projection stage.
 *
 * Rules:
 *   - No React Native imports. No database. No full profile objects.
 *   - Each function takes primitives, returns a value.
 *   - Each stage can be tuned, tested, or replaced independently.
 *   - Compounding effects are explicit in combinedMultiplier().
 *
 * Pipeline order (enforced by domain mechanics):
 *   Conditioning → Investment → Lifecycle Stage Upgrade → Restoration (readiness only)
 *
 * Stage map:
 *   1. costAtMetric            — cost curve: how expensive each metric point is
 *   2. maturityMultiplier      — maturity efficiency factor
 *   3. efficiencyClassMultiplier — efficiency class factor
 *   4. metricWeightMultiplier  — primary vs secondary metric weight
 *   5. thresholdDecayMultiplier — in-cycle decay as CCI accumulates
 *   6. combinedMultiplier      — compounded efficiency (all factors in one place)
 *   7. investmentBudgetPerMetric — resources available per metric for an investment cycle
 *   8. conditioningBudgetPerMetric — resources per metric for a conditioning cycle
 *   9. metricGainFromBudget    — integral: how many metric points the budget buys
 *  10. cciFromMetrics          — CCI formula: floor(sum / metricCount)
 *  11. stageCciContrib         — lifecycle stage CCI contribution
 *  12. baseCciFromTotal        — base CCI (total minus stage contrib)
 *  13. isInvestmentLocked      — investment lock check (base CCI ≥ capacityCeiling)
 *  14. readinessDrainPct       — readiness lost per conditioning cycle
 *  15. isZeroDrain             — zero-drain detection
 *  16. readinessRestoredPct    — readiness from restoration units
 */

import {
  COST_CURVE_BASE, COST_CURVE_DECAY,
  BASE_RESOURCES_PER_CYCLE, CONDITIONING_RESOURCE_FACTOR, CYCLE_BUDGET_DECAY,
  SECONDARY_METRIC_WEIGHT,
  MATURITY_MULTS,
  EFFICIENCY_CLASS_MULTS,
  THRESHOLD_DECAY_FACTOR, THRESHOLD_CCI_INCREMENT,
  BOOST_MULTIPLIER,
  METRIC_COUNT, CCI_DIVISOR_SCALE,
  STAGE_METRIC_ADDITIONS,
  CAPACITY_CEILING,
  INTENSITY_MULTS, SUPPORT_DRAIN_REDUCTION, BASE_DRAIN_PER_CYCLE, ZERO_DRAIN_THRESHOLD,
  READINESS_PER_RESTORATION,
  METRIC_CAP,
} from './engineConstants';
import type { CeilingRule, RuleSetEvaluation, ProjectionBand } from '../types/resources';

// ─── STAGE 1: COST CURVE ─────────────────────────────────────────────────────
// cost(metric) = COST_CURVE_BASE × exp(metric / COST_CURVE_DECAY)
// Tune: adjust COST_CURVE_BASE and/or COST_CURVE_DECAY in logistics_v1.json.
export function costAtMetric(metric: number): number {
  return COST_CURVE_BASE * Math.exp(metric / COST_CURVE_DECAY);
}

// ─── STAGE 2a: MATURITY MULTIPLIER ───────────────────────────────────────────
// Lookup with linear interpolation between bracketed entries.
// Tune: update maturityMultipliers in logistics_v1.json.
export function maturityMultiplier(maturityIndex: number): number {
  const keys = Object.keys(MATURITY_MULTS).map(Number).sort((a, b) => a - b);
  if (maturityIndex <= keys[0]) return MATURITY_MULTS[keys[0].toString()];
  for (let i = 0; i < keys.length - 1; i++) {
    const k0 = keys[i];
    const k1 = keys[i + 1];
    if (maturityIndex >= k0 && maturityIndex <= k1) {
      const t  = (maturityIndex - k0) / (k1 - k0);
      const v0 = MATURITY_MULTS[k0.toString()];
      const v1 = MATURITY_MULTS[k1.toString()];
      return Number((v0 + t * (v1 - v0)).toFixed(4));
    }
  }
  return MATURITY_MULTS[keys[keys.length - 1].toString()];
}

// ─── STAGE 2b: EFFICIENCY CLASS MULTIPLIER ───────────────────────────────────
// Tune: update efficiencyClassMultipliers in logistics_v1.json.
export function efficiencyClassMultiplier(efficiencyClass: string): number {
  return EFFICIENCY_CLASS_MULTS[efficiencyClass] ?? 1.0;
}

// ─── STAGE 2c: METRIC WEIGHT MULTIPLIER ──────────────────────────────────────
// Primary metrics: 1.0. Secondary metrics: SECONDARY_METRIC_WEIGHT (~4.5× more expensive).
// Tune: update secondaryMetricWeight in logistics_v1.json.
export function metricWeightMultiplier(isPrimary: boolean): number {
  return isPrimary ? 1.0 : SECONDARY_METRIC_WEIGHT;
}

// ─── STAGE 2d: THRESHOLD DECAY ───────────────────────────────────────────────
// Efficiency decays as the asset crosses performance thresholds within a single cycle.
// thresholdsCrossed = floor(sessionCciGainSoFar / THRESHOLD_CCI_INCREMENT)
// Tune: update thresholdDecayFactor or thresholdCciIncrement in logistics_v1.json.
export function thresholdsCrossedFromCciGain(sessionCciGain: number): number {
  return Math.floor(sessionCciGain / THRESHOLD_CCI_INCREMENT);
}

export function thresholdDecayMultiplier(thresholdsCrossed: number): number {
  return Math.pow(THRESHOLD_DECAY_FACTOR, thresholdsCrossed);
}

// ─── STAGE 3: COMBINED MULTIPLIER ────────────────────────────────────────────
// Full compounding efficiency chain applied as a divisor on resource cost.
// Higher combinedMultiplier = cheaper intervention = more metric gain per resource.
//
// Formula: maturityMult × efficiencyClassMult × metricWeightMult × thresholdDecay × boostMult × cycleIntensityMult
//
// Each factor is independent — tuning one does not change any other.
export function combinedMultiplier(params: {
  maturityIndex: number;
  efficiencyClass: string;
  isPrimary: boolean;
  thresholdsCrossed: number;
  boostActive: boolean;
  cycleIntensityMult: number;
}): number {
  const { maturityIndex, efficiencyClass, isPrimary, thresholdsCrossed, boostActive, cycleIntensityMult } = params;
  const mm = maturityMultiplier(maturityIndex);
  const em = efficiencyClassMultiplier(efficiencyClass);
  const wm = metricWeightMultiplier(isPrimary);
  const td = thresholdDecayMultiplier(thresholdsCrossed);
  const bm = boostActive ? BOOST_MULTIPLIER : 1.0;
  return mm * em * wm * td * bm * cycleIntensityMult;
}

// ─── STAGE 4a: INVESTMENT BUDGET ─────────────────────────────────────────────
// Resources available per metric for an investment cycle.
// budget = effectiveCycles × BASE_RESOURCES_PER_CYCLE / detectedMetricCount
// Each successive cycle delivers CYCLE_BUDGET_DECAY × the previous cycle's resources.
// effectiveCycles = (1 - decay^N) / (1 - decay) — plateaus at 1/(1-decay) for large N.
export function investmentBudgetPerMetric(cycles: number, selectedMetrics: string[]): number {
  if (selectedMetrics.length === 0) return 0;
  const decay = CYCLE_BUDGET_DECAY;
  const effectiveCycles = (decay >= 1.0 || cycles <= 0)
    ? cycles
    : (1 - Math.pow(decay, cycles)) / (1 - decay);
  return (effectiveCycles * BASE_RESOURCES_PER_CYCLE) / selectedMetrics.length;
}

// ─── STAGE 4b: CONDITIONING BUDGET ───────────────────────────────────────────
// Resources available per metric for a conditioning cycle.
// ⚠️ CONDITIONING_RESOURCE_FACTOR = 0.3 is uncalibrated.
export function conditioningBudgetPerMetric(cycles: number, numMetrics: number): number {
  if (numMetrics <= 0) return 0;
  return (cycles * BASE_RESOURCES_PER_CYCLE * CONDITIONING_RESOURCE_FACTOR) / numMetrics;
}

// ─── STAGE 5: METRIC GAIN FROM BUDGET ────────────────────────────────────────
// Core intervention integral. Iterates 1 metric point at a time from startMetric.
// Each point costs: costAtMetric(current) / combinedMultiplier
// Fractional remainder banks as sub-integer progress.
//
// Tune cost curve (stage 1) or multiplier (stage 3) independently without changing this.
export function metricGainFromBudget(
  startMetric: number,
  budget: number,
  mult: number,
): number {
  if (mult <= 0 || budget <= 0) return 0;
  let remaining = budget;
  let gain      = 0;
  let current   = startMetric;

  while (remaining > 0 && current < METRIC_CAP) {
    const cost = costAtMetric(current) / mult;
    if (!isFinite(cost) || cost <= 0) break;
    if (cost > remaining) {
      gain += remaining / cost;
      break;
    }
    remaining -= cost;
    gain      += 1;
    current   += 1;
  }
  return gain;
}

// ─── STAGE 6: CCI FORMULA ────────────────────────────────────────────────────
// CCI = floor(sum(all metrics) / metricCount)
export function cciFromMetrics(metrics: Record<string, number>): number {
  if (Object.keys(metrics).length === 0) return 0;
  const sum = Object.values(metrics).reduce((a, b) => a + b, 0);
  return Math.floor(sum / (METRIC_COUNT * CCI_DIVISOR_SCALE));
}

// CCI from metrics map with padding for missing metrics (uses known CCI as baseline).
export function cciFromMetricsWithPadding(
  metrics: Record<string, number>,
  knownCci: number,
): number {
  const keys = Object.keys(metrics);
  if (keys.length === 0) return knownCci;
  const entered      = Object.values(metrics).reduce((a, b) => a + b, 0);
  const missingCount = Math.max(0, METRIC_COUNT - keys.length);
  const sum          = entered + knownCci * missingCount;
  return Math.floor(sum / (METRIC_COUNT * CCI_DIVISOR_SCALE));
}

// ─── STAGE 7: LIFECYCLE STAGE CONTRIBUTION ───────────────────────────────────
// Stage CCI contribution = floor(stageBonus × primaryMetricCount / metricCount)
export function stageCciContrib(stage: string, primaryMetricCount: number): number {
  const bonus = STAGE_METRIC_ADDITIONS[stage] ?? 0;
  return Math.floor((bonus * primaryMetricCount) / METRIC_COUNT);
}

// ─── STAGE 8: INVESTMENT LOCK ─────────────────────────────────────────────────
// Base CCI = total CCI − stage CCI contribution.
// Investment locks when base CCI ≥ CAPACITY_CEILING.
export function baseCciFromTotal(
  totalCci: number,
  stage: string,
  primaryMetricCount: number,
): number {
  return totalCci - stageCciContrib(stage, primaryMetricCount);
}

export function evaluateRuleSet(
  state: Record<string, number>,
  rules: CeilingRule[],
): RuleSetEvaluation {
  const triggered: CeilingRule[] = [];
  for (const rule of rules) {
    const value = state[rule.parameter] ?? 0;
    const fires =
      rule.operator === '>=' ? value >= rule.threshold :
      rule.operator === '<=' ? value <= rule.threshold :
      rule.operator === '>'  ? value >  rule.threshold :
                               value <  rule.threshold;
    if (fires) triggered.push(rule);
  }
  return { locked: triggered.length > 0, triggeredRules: triggered };
}

export function isInvestmentLocked(baseCci: number): boolean {
  return evaluateRuleSet(
    { '__base_cci__': baseCci },
    [{ parameter: '__base_cci__', operator: '>=', threshold: CAPACITY_CEILING,
       source: 'profile.capacityCeiling', polarity: 'lock-when-good' }],
  ).locked;
}

// ─── STAGE 9: READINESS DRAIN ────────────────────────────────────────────────
// readinessLoss = baseDrain × intensityMult × (1 − supportReduction / 100)
// Zero-drain fires when loss < ZERO_DRAIN_THRESHOLD.
export function readinessDrainPct(cycleIntensity: string, supportLevel: number): number {
  const intMult  = INTENSITY_MULTS[cycleIntensity] ?? 1;
  const suppRed  = SUPPORT_DRAIN_REDUCTION[supportLevel] ?? 0;
  return BASE_DRAIN_PER_CYCLE * intMult * (1 - suppRed / 100);
}

export function isZeroDrain(drainPct: number): boolean {
  return drainPct < ZERO_DRAIN_THRESHOLD;
}

// ─── STAGE 10: READINESS RESTORATION ─────────────────────────────────────────
// READINESS_PER_RESTORATION % readiness per restoration unit, capped at 100%.
export function readinessRestoredPct(restorationUnits: number): number {
  return Math.min(restorationUnits * READINESS_PER_RESTORATION, 100);
}

// ─── PERIODIC DEGRADATION ────────────────────────────────────────────────────
// Flat drop per lifecycle period. Primary and secondary metrics drop equally.
export function applyPeriodicDegradation(
  metrics: Record<string, number>,
  periodCount: number,
  degradationPerPeriod: number,
): Record<string, number> {
  const drop   = degradationPerPeriod * periodCount;
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(metrics)) {
    result[key] = Math.max(0, value - drop);
  }
  return result;
}

// ─── INTERVENTION (Phase B2) ─────────────────────────────────────────────────
// Applies a maintenance intervention to a metric snapshot.
// Contract P20: result[k] >= metrics[k] for all affected k (monotone — never makes worse)
// Contract P21: result[k] <= domainCap[k] for all affected k (bounded by ceiling)
export function applyIntervention(
  metrics: Record<string, number>,
  type: 'partial-reset' | 'full-reset' | 'restore-to-fraction',
  targetPct: number,
  affectedMetrics: string[],
  domainCap: Record<string, number>,
): Record<string, number> {
  const result: Record<string, number> = { ...metrics };
  for (const key of affectedMetrics) {
    const current = metrics[key] ?? 0;
    const cap     = domainCap[key] ?? current;
    const target  = type === 'full-reset' ? cap : Math.min(cap, current + (cap - current) * targetPct);
    result[key]   = Math.min(cap, Math.max(current, target));
  }
  return result;
}

// ─── EFFICIENCY CLASS BACK-CALCULATION ───────────────────────────────────────
// Given observed gain from an investment cycle scan, find which efficiency class best explains it.
export function estimateEfficiencyClassFromGain(params: {
  metricBefore: number;
  gainMid: number;
  cycles: number;
  metricNames: string[];
  categorySize: number;
  maturityIndex: number;
  isPrimary: boolean;
  boostActive: boolean;
  cycleIntensityMult: number;
}): { bestClass: string; confidence: 'high' | 'low'; candidateScores: Record<string, number> } {
  const { metricBefore, gainMid, cycles, categorySize, maturityIndex, isPrimary, boostActive, cycleIntensityMult } = params;
  const decay = CYCLE_BUDGET_DECAY;
  const effectiveCycles = (decay >= 1.0 || cycles <= 0)
    ? cycles
    : (1 - Math.pow(decay, cycles)) / (1 - decay);
  const budget = (effectiveCycles * BASE_RESOURCES_PER_CYCLE) / categorySize;
  const classes = Object.keys(EFFICIENCY_CLASS_MULTS);
  const candidateScores: Record<string, number> = {};

  let bestClass = 'Standard';
  let bestScore = Infinity;

  for (const cls of classes) {
    const mult = combinedMultiplier({ maturityIndex, efficiencyClass: cls, isPrimary, thresholdsCrossed: 0, boostActive, cycleIntensityMult });
    const predicted = metricGainFromBudget(metricBefore, budget, mult);
    const score = Math.abs(predicted - gainMid);
    candidateScores[cls] = Number(predicted.toFixed(2));
    if (score < bestScore) { bestScore = score; bestClass = cls; }
  }

  const confidence: 'high' | 'low' = gainMid > 0 && bestScore < gainMid * 0.2 ? 'high' : 'low';
  return { bestClass, confidence, candidateScores };
}

// ─── UNCERTAINTY PROPAGATION (Phase B4) ─────────────────────────────────────
// First-order error propagation: σ²_gain ≈ (∂gain/∂C0)² × σ²_C0 + (∂gain/∂K)² × σ²_K
// Contract P22: variance ≥ 0 for all valid inputs (var_c0 ≥ 0, var_k ≥ 0)
export function propagateUncertainty(
  estimate:       number,
  sensitivityC0:  number,  // ∂gain/∂C0 — caller computes via finite diff
  sensitivityK:   number,  // ∂gain/∂K
  varC0:          number,  // from ConstantMeta<number>.variance on COST_CURVE_BASE
  varK:           number,  // from ConstantMeta<number>.variance on COST_CURVE_DECAY
  provenanceFlags: ProjectionBand['provenanceFlags'],
): ProjectionBand {
  const variance = Math.pow(sensitivityC0, 2) * varC0 + Math.pow(sensitivityK, 2) * varK;
  const sd       = Math.sqrt(Math.max(0, variance));
  return {
    estimate,
    variance,
    ci95Lo: estimate - 1.96 * sd,
    ci95Hi: estimate + 1.96 * sd,
    provenanceFlags,
  };
}

// ─── FULL INVESTMENT PROJECTION ───────────────────────────────────────────────
// Composed pipeline for a single investment cycle.
// Input: cycle params + current metric values for the invested metrics.
// Output: projected gain (fractional) per metric name.
export function projectInvestmentGains(params: {
  cycles: number;
  metricValues: Record<string, number>;
  primaryMetrics: Set<string>;
  maturityIndex: number;
  efficiencyClass: string;
  sessionCciGainSoFar: number;
  boostActive: boolean;
  cycleIntensityMult: number;
}): Record<string, number> {
  const { cycles, metricValues, primaryMetrics, maturityIndex, efficiencyClass, sessionCciGainSoFar, boostActive, cycleIntensityMult } = params;
  const metricNames = Object.keys(metricValues);
  if (metricNames.length === 0) return {};

  const budget     = investmentBudgetPerMetric(cycles, metricNames);
  const thresholds = thresholdsCrossedFromCciGain(sessionCciGainSoFar);
  const result: Record<string, number> = {};

  for (const [metricName, startMetric] of Object.entries(metricValues)) {
    const isPrimary = primaryMetrics.has(metricName);
    const mult      = combinedMultiplier({ maturityIndex, efficiencyClass, isPrimary, thresholdsCrossed: thresholds, boostActive, cycleIntensityMult });
    result[metricName] = metricGainFromBudget(startMetric, budget, mult);
  }
  return result;
}
