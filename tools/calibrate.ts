/**
 * Calibration solver — derives K, bXPS, greyMult from empirical game observations.
 * All inputs must come from confirmed before/after player card screenshots.
 *
 * Run: npx ts-node --compiler-options '{"module":"commonjs","resolveJsonModule":true,"esModuleInterop":true}' tools/calibrate.ts
 *
 * HOW IT WORKS
 * ============
 * The engine cost formula is:
 *   cost_per_point(s) = C0 * exp(s/K) / divisor
 *   divisor = ageMult * talentMult * greyMult (for coaching, no drill/ad modifier)
 *
 * For a budget B gained over N stat points starting at stat s:
 *   B = C0 * K * exp(s/K) * (exp(N/K) - 1) / divisor   [integral approximation]
 *
 * C0 and bXPS always appear as C0 * bXPS — they are degenerate.
 * Strategy: fix C0, solve for K from ratios, solve for bXPS from absolute values,
 * solve for greyMult from grey observations.
 *
 * STEP 1: Find K from ratios of white observations (eliminates C0 and bXPS).
 * STEP 2: Find bXPS from any one white observation using K and fixed C0.
 * STEP 3: Find greyMult from grey observation using K and bXPS.
 */

const C0 = 2.94; // fixed reference — if K changes, bXPS absorbs the scaling

// ─── Observations ────────────────────────────────────────────────────────────
// Add observations here as new before/after data is collected.
// All observations in a GROUP must share the same session conditions.

interface Obs {
  label:   string;
  stat:    number;   // stat value BEFORE the session
  gainLo:  number;   // actual game gain — low end
  gainHi:  number;   // actual game gain — high end
  isWhite: boolean;
  ageMult:    number; // from ageTable (confirmed)
  talentMult: number; // from talentMultipliers (confirmed)
  sessions:   number;
  numStats:   number;
}

const OBSERVATIONS: Obs[] = [
  // ── Grant ×40 Standard Defending ─────────────────────────────────────────
  // Age 20 (ageMult=1.0 confirmed), Normal (talentMult=1.0 confirmed), 5 stats, 40 sessions.
  // Source: game screenshots, Sprint 33.
  { label: 'Grant TACKLING',    stat: 122, gainLo: 57, gainHi: 71, isWhite: true,  ageMult: 1.0, talentMult: 1.0, sessions: 40, numStats: 5 },
  { label: 'Grant MARKING',     stat: 140, gainLo: 48, gainHi: 56, isWhite: true,  ageMult: 1.0, talentMult: 1.0, sessions: 40, numStats: 5 },
  { label: 'Grant POSITIONING', stat: 230, gainLo: 10, gainHi: 15, isWhite: true,  ageMult: 1.0, talentMult: 1.0, sessions: 40, numStats: 5 },
  { label: 'Grant BRAVERY',     stat: 216, gainLo: 12, gainHi: 18, isWhite: true,  ageMult: 1.0, talentMult: 1.0, sessions: 40, numStats: 5 },
  { label: 'Grant HEADING',     stat: 155, gainLo: 11, gainHi: 15, isWhite: false, ageMult: 1.0, talentMult: 1.0, sessions: 40, numStats: 5 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function f(s: number, N: number, K: number): number {
  return Math.exp(s / K) * (Math.exp(N / K) - 1);
}

function impliedBxps(o: Obs, N: number, K: number, greyMult: number): number {
  const divisor = o.ageMult * o.talentMult * (o.isWhite ? 1.0 : greyMult);
  const budget  = C0 * K * f(o.stat, N, K) / divisor;
  return budget * o.numStats / o.sessions;
}

// ─── Step 1: Find K from white observations ───────────────────────────────────

function findBestK(): { K: number; cv: number } {
  const whites = OBSERVATIONS.filter(o => o.isWhite);
  let bestK  = 55;
  let bestCV = Infinity;

  for (let K = 10; K <= 200; K += 0.25) {
    const vals = whites.map(o => {
      const N = (o.gainLo + o.gainHi) / 2;
      return f(o.stat, N, K);
    });
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (mean === 0) continue;
    const variance = vals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / vals.length;
    const cv = Math.sqrt(variance) / mean;
    if (cv < bestCV) { bestCV = cv; bestK = K; }
  }
  return { K: bestK, cv: bestCV };
}

// ─── Step 2: Find bXPS from white observations at a given K ──────────────────

function findBxps(K: number): { mean: number; lo: number; hi: number; perObs: string[] } {
  const whites = OBSERVATIONS.filter(o => o.isWhite);
  const mids = whites.map(o => impliedBxps(o, (o.gainLo + o.gainHi) / 2, K, 1.0));
  const los  = whites.map(o => impliedBxps(o, o.gainHi, K, 1.0)); // higher gain = lower implied bXPS
  const his  = whites.map(o => impliedBxps(o, o.gainLo, K, 1.0)); // lower gain = higher implied bXPS

  const mean = mids.reduce((a, b) => a + b, 0) / mids.length;
  const lo   = Math.min(...los);
  const hi   = Math.max(...his);

  const perObs = whites.map((o, i) =>
    `  ${o.label.padEnd(22)} bXPS: ${mids[i].toFixed(1).padStart(6)}  (range ${los[i].toFixed(1)}–${his[i].toFixed(1)})`
  );

  return { mean, lo, hi, perObs };
}

// ─── Step 3: Find greyMult from grey observations at a given K + bXPS ────────

function findGreyMult(K: number, bXPS: number): { mean: number; perObs: string[] } {
  const greys = OBSERVATIONS.filter(o => !o.isWhite);
  const results: number[] = [];
  const perObs: string[] = [];

  for (const o of greys) {
    const N_mid  = (o.gainLo + o.gainHi) / 2;
    const budget = o.sessions * bXPS / o.numStats;
    // budget = C0 * K * f(s, N, K) / (ageMult * talentMult * greyMult)
    const greyMult = C0 * K * f(o.stat, N_mid, K) / (budget * o.ageMult * o.talentMult);
    results.push(greyMult);
    perObs.push(`  ${o.label.padEnd(22)} greyMult: ${greyMult.toFixed(4)}  (grey costs ${(1/greyMult).toFixed(2)}× white)`);
  }

  const mean = results.reduce((a, b) => a + b, 0) / results.length;
  return { mean, perObs };
}

// ─── Run ─────────────────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║  CALIBRATION SOLVER — derived from game observations  ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

console.log('── Step 1: Find K (decay constant) ──────────────────────\n');
const { K: bestK, cv: bestCV } = findBestK();
console.log(`  Best-fit K = ${bestK.toFixed(2)}  (CV across white obs: ${(bestCV * 100).toFixed(2)}%)`);

// Also show K=55 for comparison
const whites = OBSERVATIONS.filter(o => o.isWhite);
const valsAt55 = whites.map(o => f(o.stat, (o.gainLo + o.gainHi) / 2, 55));
const mean55   = valsAt55.reduce((a, b) => a + b, 0) / valsAt55.length;
const cv55     = Math.sqrt(valsAt55.reduce((acc, v) => acc + (v - mean55) ** 2, 0) / valsAt55.length) / mean55;
console.log(`  Current  K = 55.00  (CV across white obs: ${(cv55 * 100).toFixed(2)}%)\n`);

console.log('── Step 2: Implied bXPS per observation ─────────────────\n');
const bxpsAtBestK = findBxps(bestK);
console.log(`  At best K=${bestK}:`);
bxpsAtBestK.perObs.forEach(s => console.log(s));
console.log(`  → Mean bXPS: ${bxpsAtBestK.mean.toFixed(1)}  (range ${bxpsAtBestK.lo.toFixed(1)}–${bxpsAtBestK.hi.toFixed(1)})\n`);

const bxpsAt55 = findBxps(55);
console.log(`  At current K=55:`);
bxpsAt55.perObs.forEach(s => console.log(s));
console.log(`  → Mean bXPS: ${bxpsAt55.mean.toFixed(1)}  (range ${bxpsAt55.lo.toFixed(1)}–${bxpsAt55.hi.toFixed(1)})\n`);

console.log('── Step 3: Implied greyMult ─────────────────────────────\n');
const greyAtBestK = findGreyMult(bestK, bxpsAtBestK.mean);
console.log(`  At best K=${bestK}, bXPS=${bxpsAtBestK.mean.toFixed(1)}:`);
greyAtBestK.perObs.forEach(s => console.log(s));
console.log(`  → Mean greyMult: ${greyAtBestK.mean.toFixed(4)}\n`);

const greyAt55 = findGreyMult(55, bxpsAt55.mean);
console.log(`  At current K=55, bXPS=${bxpsAt55.mean.toFixed(1)}:`);
greyAt55.perObs.forEach(s => console.log(s));
console.log(`  → Mean greyMult: ${greyAt55.mean.toFixed(4)}\n`);

console.log('── Summary ──────────────────────────────────────────────\n');
console.log('  Param        Current    Derived');
console.log('  ─────────────────────────────────');
console.log(`  K            55.00      ${bestK.toFixed(2)}`);
console.log(`  bXPS         450.0      ${bxpsAtBestK.mean.toFixed(1)}`);
console.log(`  greyMult     0.2000     ${greyAtBestK.mean.toFixed(4)}`);
console.log(`  C0           2.94       2.94 (fixed — absorb changes into bXPS)\n`);

const spread = bxpsAtBestK.hi - bxpsAtBestK.lo;
const spreadPct = (spread / bxpsAtBestK.mean * 100).toFixed(1);
console.log(`  bXPS spread at best K: ±${(spread/2).toFixed(1)} (${spreadPct}% of mean)`);
console.log(`  → This spread reflects model fit quality across the stat range.\n`);

if (bestCV > 0.1) {
  console.log('  ⚠  CV > 10% — single-K exponential does not fit all observations.');
  console.log('     The cost curve changes slope above ~180. Two-segment model may be needed.\n');
}
