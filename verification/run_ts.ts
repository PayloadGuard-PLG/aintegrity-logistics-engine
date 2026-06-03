/**
 * verification/run_ts.ts — TypeScript engine subprocess runner.
 * Called by tests/proofs/test_ts_equivalence.py as a persistent subprocess.
 *
 * Protocol: one JSON line per request on stdin → one JSON line result on stdout.
 *   in:  { "fn": "<name>", "args": <array or object> }
 *   out: { "result": <value> }
 *        { "error": "<message>" }   (on dispatch failure)
 *
 * Args schema per function (matches engine_pure.py calling convention):
 *   investmentBudgetPerMetric  [cycles: number, numMetrics: number]
 *   metricGainFromBudget       [startMetric: number, budget: number, mult: number]
 *   cciFromMetrics             [[...metricValues: number[]]]
 *   combinedMultiplier         [{ maturityIndex, efficiencyClass, isPrimary, thresholdsCrossed, boostActive, cycleIntensityMult }]
 *   applyPeriodicDegradation   [[...metricValues: number[]], periodCount: number, degradationPerPeriod: number]
 *   isInvestmentLocked         [baseCci: number]
 *   readinessDrainPct          [cycleIntensity: string, supportLevel: number]
 *
 * Run standalone: npx tsx verification/run_ts.ts
 * Stays alive reading lines until stdin closes.
 */

import * as readline from 'readline';
import {
  investmentBudgetPerMetric,
  metricGainFromBudget,
  cciFromMetrics,
  combinedMultiplier,
  applyPeriodicDegradation,
  isInvestmentLocked,
  readinessDrainPct,
} from '../src/engine/engineMath';

function dispatch(fn: string, args: unknown): unknown {
  const a = args as unknown[];
  switch (fn) {
    case 'investmentBudgetPerMetric': {
      const [cycles, numMetrics] = a as [number, number];
      return investmentBudgetPerMetric(cycles, Array.from({ length: numMetrics }, (_, i) => `m${i}`));
    }
    case 'metricGainFromBudget': {
      const [startMetric, budget, mult] = a as [number, number, number];
      return metricGainFromBudget(startMetric, budget, mult);
    }
    case 'cciFromMetrics': {
      const vals = a[0] as number[];
      const metrics: Record<string, number> = {};
      vals.forEach((v, i) => { metrics[`m${i}`] = v; });
      return cciFromMetrics(metrics);
    }
    case 'combinedMultiplier': {
      return combinedMultiplier(a[0] as Parameters<typeof combinedMultiplier>[0]);
    }
    case 'applyPeriodicDegradation': {
      const [vals, periodCount, degradationPerPeriod] = a as [number[], number, number];
      const metrics: Record<string, number> = {};
      vals.forEach((v, i) => { metrics[`m${i}`] = v; });
      return Object.values(applyPeriodicDegradation(metrics, periodCount, degradationPerPeriod));
    }
    case 'isInvestmentLocked': {
      return isInvestmentLocked(a[0] as number);
    }
    case 'readinessDrainPct': {
      return readinessDrainPct(a[0] as string, a[1] as number);
    }
    default:
      throw new Error(`Unknown function: ${fn}`);
  }
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const { fn, args } = JSON.parse(trimmed) as { fn: string; args: unknown };
    process.stdout.write(JSON.stringify({ result: dispatch(fn, args) }) + '\n');
  } catch (e) {
    process.stdout.write(JSON.stringify({ error: String(e) }) + '\n');
  }
});
