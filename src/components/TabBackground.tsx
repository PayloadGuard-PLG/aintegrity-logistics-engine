import { StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

export type TabKey = 'squad' | 'plan' | 'drills' | 'coaches' | 'results';

// Each tab has a unique accent color replicated in its background art.
// Same data-viz aesthetic across all tabs — bars, lines, nodes — themed per function.
const C: Record<TabKey, { s: string; f: string; n: string }> = {
  squad:   { s: 'rgba(74,158,255,0.32)',  f: 'rgba(74,158,255,0.16)',  n: 'rgba(74,158,255,0.55)'  }, // steel blue  — roster
  plan:    { s: 'rgba(52,211,153,0.32)',  f: 'rgba(52,211,153,0.16)',  n: 'rgba(52,211,153,0.55)'  }, // green       — growth
  drills:  { s: 'rgba(251,146,60,0.32)',  f: 'rgba(251,146,60,0.16)',  n: 'rgba(251,146,60,0.55)'  }, // amber       — intensity
  coaches: { s: 'rgba(167,139,250,0.32)', f: 'rgba(167,139,250,0.10)', n: 'rgba(167,139,250,0.55)' }, // purple — lower fill to avoid bar bleed
  results: { s: 'rgba(200,17,17,0.32)',   f: 'rgba(200,17,17,0.16)',   n: 'rgba(200,17,17,0.55)'   }, // red         — projection
};

interface Props { tab: TabKey }

export function TabBackground({ tab }: Props) {
  const c = C[tab];
  switch (tab) {
    case 'squad':   return <SquadBg c={c} />;
    case 'plan':    return <PlanBg c={c} />;
    case 'drills':  return <DrillsBg c={c} />;
    case 'coaches': return <CoachesBg c={c} />;
    case 'results': return <ResultsBg c={c} />;
  }
}

const abs = StyleSheet.absoluteFill;
type Col = { s: string; f: string; n: string };

// ─── SQUAD ── sorted OVR roster bars (like the player list sorted by OVR desc) ──────────────
// 12 player bars descending left→right, formation dot cluster above
function SquadBg({ c }: { c: Col }) {
  const baseY  = H * 0.78;
  const maxH   = H * 0.30;
  // Simulate a sorted OVR distribution (high at left, tapering right)
  const ovrs   = [0.98, 0.95, 0.91, 0.87, 0.82, 0.78, 0.73, 0.68, 0.61, 0.54, 0.44, 0.34];
  const n      = ovrs.length;
  const slotW  = (W * 0.90) / n;
  const barW   = slotW * 0.58;
  const startX = W * 0.05;

  // 4-3-3 formation dots (rough screen positions)
  const formation: [number, number][] = [
    [W*0.50, H*0.10],
    [W*0.22, H*0.18], [W*0.38, H*0.17], [W*0.62, H*0.17], [W*0.78, H*0.18],
    [W*0.30, H*0.26], [W*0.50, H*0.25], [W*0.70, H*0.26],
    [W*0.24, H*0.34], [W*0.50, H*0.33], [W*0.76, H*0.34],
  ];

  const pts = ovrs.map((h, i) => {
    const x = startX + i * slotW + slotW / 2;
    const y = baseY - maxH * h;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  return (
    <Svg style={abs} width={W} height={H} pointerEvents="none">
      {/* Grid lines */}
      {[0.55, 0.65, 0.75].map((f, i) => (
        <Line key={i} x1={W*0.05} y1={H*f} x2={W*0.95} y2={H*f}
          stroke={c.s} strokeWidth={0.7} strokeDasharray="4 8" />
      ))}
      {/* OVR bars */}
      {ovrs.map((h, i) => {
        const x = startX + i * slotW + (slotW - barW) / 2;
        return <Rect key={i} x={x} y={baseY - maxH * h} width={barW} height={maxH * h} fill={c.f} />;
      })}
      {/* Trend line */}
      <Path d={pts} fill="none" stroke={c.s} strokeWidth={1.2} />
      {/* Baseline */}
      <Line x1={W*0.04} y1={baseY} x2={W*0.96} y2={baseY} stroke={c.s} strokeWidth={0.8} />
      {/* Formation dots */}
      {formation.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={i === 0 ? 4 : 3} fill={c.f} stroke={c.n} strokeWidth={0.8} />
      ))}
      {/* Corner bracket TL */}
      <Path d={`M${W*0.04} ${H*0.08} L${W*0.04} ${H*0.04} L${W*0.12} ${H*0.04}`}
        fill="none" stroke={c.s} strokeWidth={1} />
    </Svg>
  );
}

// ─── PLAN ── OVR projection stepped curve — tier milestones ───────────────────────────────
// Stepped ascending bars (T0→T6 tier milestones) + smooth projection curve over them
function PlanBg({ c }: { c: Col }) {
  const baseY  = H * 0.80;
  const maxH   = H * 0.46;
  // 7 steps = T0–T6, each tier adds more height (reflecting tier bonus jumps)
  const steps  = [0.18, 0.30, 0.43, 0.55, 0.68, 0.82, 1.00];
  const n      = steps.length;
  const slotW  = (W * 0.86) / n;
  const barW   = slotW * 0.70;
  const startX = W * 0.07;

  const pts = steps.map((h, i) => {
    const x = startX + i * slotW + slotW / 2;
    const y = baseY - maxH * h;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  return (
    <Svg style={abs} width={W} height={H} pointerEvents="none">
      {/* Horizontal grid */}
      {[0.46, 0.57, 0.68].map((f, i) => (
        <Line key={i} x1={W*0.06} y1={H*f} x2={W*0.94} y2={H*f}
          stroke={c.s} strokeWidth={0.7} strokeDasharray="5 9" />
      ))}
      {/* Tier bars */}
      {steps.map((h, i) => {
        const x = startX + i * slotW + (slotW - barW) / 2;
        return <Rect key={i} x={x} y={baseY - maxH * h} width={barW} height={maxH * h} fill={c.f} />;
      })}
      {/* Projection line */}
      <Path d={pts} fill="none" stroke={c.n} strokeWidth={1.4} />
      {/* Milestone dots */}
      {steps.map((h, i) => {
        const x = startX + i * slotW + slotW / 2;
        const y = baseY - maxH * h;
        return <Circle key={i} cx={x} cy={y} r={3} fill={c.n} />;
      })}
      {/* Baseline */}
      <Line x1={W*0.06} y1={baseY} x2={W*0.94} y2={baseY} stroke={c.s} strokeWidth={0.8} />
      {/* Corner bracket BR */}
      <Path d={`M${W*0.88} ${H*0.92} L${W*0.96} ${H*0.92} L${W*0.96} ${H*0.84}`}
        fill="none" stroke={c.s} strokeWidth={1} />
    </Svg>
  );
}

// ─── DRILLS ── intensity bars grouped by drill category, radial origin point ──────────────
// 5 drill intensity groups × 3 bars each, converging lines from focal origin
function DrillsBg({ c }: { c: Col }) {
  const baseY   = H * 0.82;
  const maxH    = H * 0.38;
  const focal   = { x: W / 2, y: H * 0.15 };

  // 5 groups (VE / E / M / H / VH intensity), 3 bars per group
  const groups  = [
    [0.28, 0.22, 0.32],
    [0.48, 0.55, 0.42],
    [0.62, 0.70, 0.58],
    [0.80, 0.75, 0.88],
    [0.95, 1.00, 0.90],
  ];
  const groupW  = (W * 0.82) / groups.length;
  const barW    = groupW * 0.18;
  const startX  = W * 0.09;

  const groupCentres = groups.map((_, gi) => startX + gi * groupW + groupW / 2);

  return (
    <Svg style={abs} width={W} height={H} pointerEvents="none">
      {/* Convergence lines from focal point to group centres */}
      {groupCentres.map((x, i) => (
        <Line key={i} x1={focal.x} y1={focal.y} x2={x} y2={baseY}
          stroke={c.s} strokeWidth={0.8} />
      ))}
      {/* Horizontal intensity markers */}
      {[0.52, 0.63, 0.73].map((f, i) => (
        <Line key={i} x1={W*0.07} y1={H*f} x2={W*0.93} y2={H*f}
          stroke={c.s} strokeWidth={0.7} strokeDasharray="4 8" />
      ))}
      {/* Drill bars */}
      {groups.map((bars, gi) =>
        bars.map((h, bi) => {
          const x = startX + gi * groupW + bi * (groupW * 0.30) + groupW * 0.08;
          return <Rect key={`${gi}-${bi}`} x={x} y={baseY - maxH * h} width={barW} height={maxH * h} fill={c.f} />;
        })
      )}
      {/* Focal point node */}
      <Circle cx={focal.x} cy={focal.y} r={4} fill={c.f} stroke={c.n} strokeWidth={1} />
      {/* Baseline */}
      <Line x1={W*0.07} y1={baseY} x2={W*0.93} y2={baseY} stroke={c.s} strokeWidth={0.8} />
    </Svg>
  );
}

// ─── COACHES ── DEF / ATT / PHY stat column bars (mirrors the 3-col stat grid) ───────────
// 3 groups of 3 bars each — wider gaps to prevent colour bleed
function CoachesBg({ c }: { c: Col }) {
  const baseY  = H * 0.76;
  const maxH   = H * 0.42;
  // 3 stat columns: DEF / ATT / PHY — 3 representative bars each
  const cols   = [
    [0.72, 0.88, 0.65],
    [0.96, 0.78, 1.00],
    [0.82, 0.95, 0.70],
  ];
  const colGroupW = (W * 0.82) / cols.length;
  const barW      = colGroupW * 0.14;
  const startX    = W * 0.09;

  return (
    <Svg style={abs} width={W} height={H} pointerEvents="none">
      {/* Stat bars */}
      {cols.map((bars, ci) =>
        bars.map((h, bi) => {
          const x = startX + ci * colGroupW + bi * (colGroupW * 0.30) + colGroupW * 0.06;
          return <Rect key={`${ci}-${bi}`} x={x} y={baseY - maxH * h} width={barW} height={maxH * h} fill={c.f} />;
        })
      )}
      {/* Column group dividers */}
      {[1, 2].map(i => {
        const x = startX + i * colGroupW;
        return <Line key={i} x1={x} y1={H*0.30} x2={x} y2={baseY + 4}
          stroke={c.s} strokeWidth={0.8} strokeDasharray="3 6" />;
      })}
      {/* Horizontal scan lines (analysis feel) */}
      {[0.84, 0.90, 0.96].map((f, i) => (
        <Line key={i} x1={W*0.07} y1={H*f} x2={W*0.93} y2={H*f}
          stroke={c.s} strokeWidth={0.7} />
      ))}
      {/* Grid lines */}
      {[0.44, 0.55, 0.65].map((f, i) => (
        <Line key={i} x1={W*0.07} y1={H*f} x2={W*0.93} y2={H*f}
          stroke={c.s} strokeWidth={0.6} strokeDasharray="4 10" />
      ))}
      {/* Baseline */}
      <Line x1={W*0.07} y1={baseY} x2={W*0.93} y2={baseY} stroke={c.s} strokeWidth={0.8} />
      {/* Top corner bracket */}
      <Path d={`M${W*0.04} ${H*0.28} L${W*0.04} ${H*0.24} L${W*0.14} ${H*0.24}`}
        fill="none" stroke={c.s} strokeWidth={1} />
    </Svg>
  );
}

// ─── RESULTS ── ascending projection bars + trend line (confirmed looks good) ────────────
function ResultsBg({ c }: { c: Col }) {
  const heights = [0.10, 0.17, 0.13, 0.22, 0.17, 0.28, 0.20, 0.35, 0.26, 0.42];
  const slotW   = (W * 0.88) / heights.length;
  const barW    = slotW * 0.55;
  const baseY   = H * 0.72;

  const pts = heights.map((h, i) => {
    const x = W * 0.06 + i * slotW + slotW / 2;
    const y = baseY - H * h;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  return (
    <Svg style={abs} width={W} height={H} pointerEvents="none">
      {/* Grid lines */}
      {[0.46, 0.55, 0.63].map((f, i) => (
        <Line key={i} x1={W*0.05} y1={H*f} x2={W*0.95} y2={H*f}
          stroke={c.s} strokeWidth={0.7} strokeDasharray="4 8" />
      ))}
      {/* Bars */}
      {heights.map((h, i) => {
        const x = W * 0.06 + i * slotW + (slotW - barW) / 2;
        return <Rect key={i} x={x} y={baseY - H * h} width={barW} height={H * h} fill={c.f} />;
      })}
      {/* Trend line */}
      <Path d={pts} fill="none" stroke={c.n} strokeWidth={1.4} />
      {/* Peak nodes */}
      {heights.map((h, i) => {
        const x = W * 0.06 + i * slotW + slotW / 2;
        const y = baseY - H * h;
        return <Circle key={i} cx={x} cy={y} r={2} fill={c.n} />;
      })}
      {/* Baseline */}
      <Line x1={W*0.05} y1={baseY} x2={W*0.95} y2={baseY} stroke={c.s} strokeWidth={0.8} />
    </Svg>
  );
}
