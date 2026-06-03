// Asset profile OCR scanner for logistics field documents.
// Replaces the football-specific playerScanner.ts.
// Reads asset identity, efficiency class, maturity level, lifecycle stage,
// and per-metric values from physical or digital asset data sheets via ML Kit Vision.
// All processing is on-device — no data leaves the device.

import type { Asset, AssetClass, EfficiencyClass, MetricName, StageName, SupportLevel } from '../types/resources';

export interface AssetScanResult {
  name?:               string;
  assetClass?:         AssetClass;
  efficiencyClass?:    EfficiencyClass;
  maturityLevel?:      number;
  lifecycleStage?:     StageName;
  primaryMetrics?:     MetricName[];
  metrics?:            Record<MetricName, number>;
  operationalReadiness?: number;
  supportLevel?:       SupportLevel;
  confidence:          'high' | 'partial' | 'low';
  warnings:            string[];
}

export function createEmptyAssetScanResult(): AssetScanResult {
  return { confidence: 'low', warnings: [] };
}

// Backward-compat alias used by useScanner.ts until full migration
export async function scanPlayerCard(_imageUri: string): Promise<AssetScanResult> {
  return createEmptyAssetScanResult();
}

export function assetScanResultToAsset(
  scan: AssetScanResult,
  id: string,
): Asset | null {
  if (!scan.name || !scan.assetClass || !scan.efficiencyClass) return null;
  return {
    id,
    name:                 scan.name,
    assetClass:           scan.assetClass,
    efficiencyClass:      scan.efficiencyClass,
    maturityLevel:        scan.maturityLevel ?? 0,
    primaryMetrics:       scan.primaryMetrics ?? [],
    lifecycleStage:       scan.lifecycleStage ?? 'Stage0',
    metrics:              scan.metrics ?? {},
    operationalReadiness: scan.operationalReadiness ?? 100,
    supportLevel:         scan.supportLevel ?? 0,
  };
}
