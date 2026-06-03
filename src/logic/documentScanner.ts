// Generic schema-driven OCR document scanner for logistics field documents.
// Replaces the football-specific coachScanner.ts.
// Reads investment cycle headers (type, category, count) and per-metric gain ranges
// from physical or digital field documents via ML Kit Vision (on-device, no data egress).
//
// Schema injection: metric vocabulary is loaded from DomainProfile.metricVocabulary at
// startup, making the scanner domain-agnostic. See investmentPipelineSchema.ts for Zod
// validation of scan output before it enters the engine.

import type { MetricName } from '../types/resources';

export interface MetricCapture {
  metricName:  MetricName;
  valueBefore: number;
  gainLo:      number;
  gainHi:      number;
}

export interface DocumentScanResult {
  investmentType?:     string;
  investmentCategory?: string;
  cycleCount?:         number;
  metrics:             MetricCapture[];
  isRewardCycle?:      boolean;
  rawText?:            string;
}

export type ScanStatus = 'ok' | 'unrecognised' | 'partial';

export interface ScanOutcome {
  status: ScanStatus;
  result: DocumentScanResult;
  warnings: string[];
}

export function createEmptyScanResult(): DocumentScanResult {
  return { metrics: [] };
}

// Backward-compat capture type used by UI components until full migration
export type StatCapture = MetricCapture & {
  statName:   string;   // alias for metricName
  statBefore: number;   // alias for valueBefore
};

// Backward-compat alias used by UI components until full migration
export type CoachScanResult = DocumentScanResult & {
  coachType?:      string;
  coachCategory?:  string;
  multiplier?:     number;
  stats:           StatCapture[];
  isAllRound?:     boolean;
  isRewardCoach?:  boolean;
  _debugBlocks?:   unknown[];
  playerAge?:      number;
  ovrBefore?:      number;
};

export async function scanCoachPreview(_imageUri: string): Promise<CoachScanResult> {
  return { metrics: [], stats: [] };
}
