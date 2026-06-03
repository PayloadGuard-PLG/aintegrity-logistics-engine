// Domain metric taxonomy for logistics field operations.
// Replaces the football-specific roleWeights.ts.
//
// Metric lists are domain-defined and loaded from DomainProfile.metricVocabulary at startup.
// The sets below are placeholder defaults — replace with actual domain metric taxonomy
// once the operational context is confirmed.

import type { MetricName } from '../types/resources';

// Placeholder primary metric set (analogous to white stats for a core asset class).
// Replace with domain-calibrated lists once asset class taxonomy is defined.
export const PRIMARY_METRICS: MetricName[] = [
  'SDLL',       // Standard Deviation from Load Limit
  'EGT_MARGIN', // Exhaust Gas Temperature margin
  'SMART_187',  // Reported uncorrectable errors
  'AVAILABILITY',
  'RELIABILITY',
];

// Placeholder secondary metric set (analogous to grey stats — trained at reduced efficiency).
export const SECONDARY_METRICS: MetricName[] = [
  'FUEL_EFFICIENCY',
  'VIBRATION',
  'TEMPERATURE',
  'PRESSURE',
  'CYCLE_COUNT',
];

/**
 * Returns true if metricName is a primary metric for the given primaryMetricSet.
 * Primary metrics receive full investment budget weight; secondary metrics receive
 * greyWeightMultiplier fraction.
 */
export function isPrimaryMetric(primaryMetricSet: MetricName[], metricName: MetricName): boolean {
  return primaryMetricSet.includes(metricName);
}

/**
 * Returns all metric names for an asset given its primary metric set.
 * Analogous to getAllStatKeys() in the source repo.
 */
export function getAllMetricKeys(primaryMetricSet: MetricName[]): MetricName[] {
  const all = new Set([...primaryMetricSet, ...SECONDARY_METRICS]);
  return Array.from(all);
}

// --- Backward-compatible exports (UI components use these until full migration) ---

export const OUTFIELD_STATS = PRIMARY_METRICS;
export const GK_STATS_ALL   = PRIMARY_METRICS;

export const STAT_COLUMNS: Record<string, MetricName[]> = {
  PRIMARY:   PRIMARY_METRICS,
  SECONDARY: SECONDARY_METRICS,
};

export function isWhiteStat(primaryMetricSet: MetricName[], metricName: MetricName): boolean {
  return isPrimaryMetric(primaryMetricSet, metricName);
}

export function getWhiteStatKeys(primaryMetricSet: MetricName[]): MetricName[] {
  return primaryMetricSet;
}

export function getAllStatKeys(primaryMetricSet: MetricName[]): MetricName[] {
  return getAllMetricKeys(primaryMetricSet);
}

export const COL_COLORS: Record<string, string> = {
  PRIMARY:   '#4A7FC1',
  SECONDARY: '#7C3AED',
  DEF:       '#4A7FC1',
  ATT:       '#7C3AED',
  PHY:       '#C05621',
};

export function validateRoleAdjacency(_roles: string[]): boolean {
  return true;
}

export const ROLE_CONSTRAINTS: Record<string, { essential: string[]; secondary: string[] }> = {};
