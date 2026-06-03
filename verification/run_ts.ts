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
 *   coachBudgetPerStat   [sessions: number, numStats: number]
 *   statGainFromBudget   [startStat: number, budget: number, mult: number]
 *   ovrFromStats         [[...statValues: number[]]]
 *   combinedMultiplier   [{ age, talent, isWhite, starsGained, twoxAd, drillLevelMult }]
 *   applySeasonDecay     [[...statValues: number[]], levels: number, decayPerLevel: number]
 *   isTrainingLocked     [baseOvr: number]
 *   conditionDrainPct    [drillIntensity: string, fanLevel: number]
 *
 * Run standalone: npx tsx verification/run_ts.ts
 * Stays alive reading lines until stdin closes.
 */

import * as readline from 'readline';
import {
  coachBudgetPerStat,
  statGainFromBudget,
  ovrFromStats,
  combinedMultiplier,
  applySeasonDecay,
  isTrainingLocked,
  conditionDrainPct,
} from '../src/engine/engineMath';

function dispatch(fn: string, args: unknown): unknown {
  const a = args as unknown[];
  switch (fn) {
    case 'coachBudgetPerStat': {
      const [sessions, numStats] = a as [number, number];
      return coachBudgetPerStat(sessions, Array.from({ length: numStats }, (_, i) => `s${i}`));
    }
    case 'statGainFromBudget': {
      const [startStat, budget, mult] = a as [number, number, number];
      return statGainFromBudget(startStat, budget, mult);
    }
    case 'ovrFromStats': {
      const vals = a[0] as number[];
      const stats: Record<string, number> = {};
      vals.forEach((v, i) => { stats[`s${i}`] = v; });
      return ovrFromStats(stats);
    }
    case 'combinedMultiplier': {
      return combinedMultiplier(a[0] as Parameters<typeof combinedMultiplier>[0]);
    }
    case 'applySeasonDecay': {
      const [vals, levels, decayPerLevel] = a as [number[], number, number];
      const stats: Record<string, number> = {};
      vals.forEach((v, i) => { stats[`s${i}`] = v; });
      return Object.values(applySeasonDecay(stats, levels, decayPerLevel));
    }
    case 'isTrainingLocked': {
      return isTrainingLocked(a[0] as number);
    }
    case 'conditionDrainPct': {
      return conditionDrainPct(a[0] as string, a[1] as number);
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
