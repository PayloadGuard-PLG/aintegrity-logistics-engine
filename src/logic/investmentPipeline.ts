import type { DocumentScanResult, MetricCapture, CoachScanResult } from './documentScanner';
import type { MetricName } from '../types/resources';
import { DocumentScanResultSchema } from './investmentPipelineSchema';

// Domain metric categories — analogous to coaching categories.
// Populated from DomainProfile.metricVocabulary at startup; this is the fallback set.
export const INVESTMENT_SENTINELS = {
  ALL_METRICS: '__ALL_METRICS__',
  REWARD_CYCLE: '__REWARD_CYCLE__',
} as const;

/**
 * Resolve the list of metrics affected by an investment cycle scan.
 *
 * For Standard/Extensive investment cycles the full category metric set is used
 * regardless of how many metrics OCR detected (partial detections are common when
 * on-screen indicators are not text-readable). Focused and Reward cycles use the
 * OCR-detected set directly.
 *
 * Returns metric names as strings. Callers validate against DomainProfile.metricVocabulary
 * via the Zod ingest boundary (investmentPipelineSchema.ts) before passing to the engine.
 */
export function resolveInvestmentMetrics(
  scan: DocumentScanResult,
  availableMetrics: MetricName[],
): MetricName[] {
  // Zod ingest boundary: validate structure before entering the engine.
  // Throws ZodError on invalid input — never lets malformed data reach engine math.
  DocumentScanResultSchema.parse({
    investmentType:     scan.investmentType,
    investmentCategory: scan.investmentCategory,
    cycleCount:         scan.cycleCount,
    metrics:            scan.metrics.map(m => ({
      metricName:  m.metricName,
      valueBefore: m.valueBefore,
      gainLo:      m.gainLo,
      gainHi:      m.gainHi,
    })),
    isRewardCycle: scan.isRewardCycle,
  });

  if (!scan.investmentType || !scan.investmentCategory) {
    // Unrecognised scan: return only what OCR detected
    return scan.metrics.map((m: MetricCapture) => m.metricName);
  }

  const type = scan.investmentType.toLowerCase();
  const isStandard  = type === 'standard';
  const isExtensive = type === 'extensive';

  if (!scan.isRewardCycle && (isStandard || isExtensive) && scan.investmentCategory) {
    // Return the full confirmed category metric set, not the OCR-partial detection.
    // availableMetrics is filtered by category at the call site.
    return availableMetrics;
  }

  return Array.from(new Set(scan.metrics.map((m: MetricCapture) => m.metricName)));
}

// Category metric sets for UI-driven investment cycle configuration.
export const CATEGORY_STATS: Record<string, string[]> = {
  Attacking:   ['PASSING', 'DRIBBLING', 'CROSSING', 'SHOOTING', 'FINISHING'],
  Defending:   ['TACKLING', 'MARKING', 'POSITIONING', 'HEADING', 'BRAVERY'],
  Physical:    ['FITNESS', 'STRENGTH', 'AGGRESSION', 'SPEED', 'CREATIVITY'],
  Safeguard:   ['TACKLING', 'MARKING', 'POSITIONING', 'HEADING', 'BRAVERY'],
  Goalkeeping: ['REFLEXES', 'AGILITY', 'ANTICIPATION', 'RUSHING OUT', 'COMMUNICATION',
                'THROWING', 'KICKING', 'PUNCHING', 'AERIAL REACH', 'CONCENTRATION', 'FITNESS'],
};

export const ALL_ROUND_SENTINEL = '__ALL_ROUND__';

export function resolveCoachStats(
  scan: CoachScanResult,
  _playerStats: Record<string, number>,
  _playerRole: string[],
): string[] {
  if (scan.isAllRound) return [ALL_ROUND_SENTINEL];
  if (
    !scan.isRewardCoach &&
    (scan.coachType === 'Standard' || scan.coachType === 'Extensive') &&
    scan.coachCategory
  ) {
    return CATEGORY_STATS[scan.coachCategory] ?? [];
  }
  return Array.from(new Set((scan.stats ?? []).map((s) => s.metricName)));
}

