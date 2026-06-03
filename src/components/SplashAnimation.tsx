import { useEffect, useRef } from 'react';
import { Animated, View, Text, Dimensions, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Defs, RadialGradient, Stop, Mask, G } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');
const CX = W / 2;
const CY = H * 0.36;

const R_OUT  = Math.min(W, H) * 0.40;
const R_MID1 = R_OUT * 0.87;
const R_MID2 = R_OUT * 0.73;
const R_IN   = R_OUT * 0.50;

const RED       = '#cc1111';
const RED_TRACE = 'rgba(200,15,15,0.65)';
const RED_FAINT = 'rgba(200,15,15,0.07)';
const INK       = '#f4f4f5';

// Border background art for the splash screen.
// Uses the five tab accent colours. Radial mask fades art toward the
// centre ring — art is strong at the edges, invisible behind the rings.
function SplashBorderArt() {
  // Tab accent colours — same as TabBackground
  const BLUE   = '#4a9eff';
  const GREEN  = '#34d399';
  const AMBER  = '#fb923c';
  const PURPLE = '#a78bfa';
  const RED_T  = '#cc1111';

  // Bottom bar chart — each pair of bars takes a tab colour
  const baseY  = H * 0.93;
  const maxH   = H * 0.20;
  const barData: { h: number; color: string }[] = [
    { h: 0.30, color: BLUE   }, { h: 0.45, color: BLUE   },
    { h: 0.50, color: GREEN  }, { h: 0.65, color: GREEN  },
    { h: 0.60, color: AMBER  }, { h: 0.80, color: AMBER  },
    { h: 0.72, color: PURPLE }, { h: 0.88, color: PURPLE },
    { h: 0.85, color: RED_T  }, { h: 1.00, color: RED_T  },
  ];
  const slotW  = (W * 0.88) / barData.length;
  const barW   = slotW * 0.58;
  const startX = W * 0.06;

  const trendPts = barData.map(({ h }, i) => {
    const x = startX + i * slotW + slotW / 2;
    const y = baseY - maxH * h;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  // Top coloured grid lines — one per tab colour
  const topLines = [
    { y: H * 0.03, color: BLUE   },
    { y: H * 0.06, color: GREEN  },
    { y: H * 0.09, color: AMBER  },
    { y: H * 0.12, color: PURPLE },
    { y: H * 0.15, color: RED_T  },
  ];

  // Side vertical scan lines
  const leftLines  = [W * 0.03, W * 0.07];
  const rightLines = [W * 0.93, W * 0.97];

  return (
    <Svg width={W} height={H}>
      <Defs>
        {/* Black at centre → white at edges: hides art behind rings, shows it at border */}
        <RadialGradient id="splashMask" cx="50%" cy="36%" r="52%" fx="50%" fy="36%">
          <Stop offset="0%"   stopColor="black" stopOpacity={1}    />
          <Stop offset="38%"  stopColor="black" stopOpacity={0.95} />
          <Stop offset="58%"  stopColor="black" stopOpacity={0.50} />
          <Stop offset="75%"  stopColor="white" stopOpacity={0.80} />
          <Stop offset="100%" stopColor="white" stopOpacity={1}    />
        </RadialGradient>
        <Mask id="borderFade">
          <Rect x={0} y={0} width={W} height={H} fill="url(#splashMask)" />
        </Mask>
      </Defs>

      <G mask="url(#borderFade)">
        {/* Bottom bars — paired by tab colour */}
        {barData.map(({ h, color }, i) => (
          <Rect key={i}
            x={startX + i * slotW + (slotW - barW) / 2}
            y={baseY - maxH * h}
            width={barW} height={maxH * h}
            fill={color} opacity={0.35}
          />
        ))}
        {/* Bottom trend line */}
        <Path d={trendPts} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.4} />
        {/* Bottom nodes — coloured per bar */}
        {barData.map(({ h, color }, i) => (
          <Circle key={i}
            cx={startX + i * slotW + slotW / 2}
            cy={baseY - maxH * h}
            r={2.5} fill={color} opacity={0.8}
          />
        ))}
        {/* Bottom baseline */}
        <Line x1={W * 0.04} y1={baseY} x2={W * 0.96} y2={baseY}
          stroke="rgba(255,255,255,0.25)" strokeWidth={0.8} />

        {/* Top coloured horizontal lines */}
        {topLines.map(({ y, color }, i) => (
          <Line key={i} x1={W * 0.04} y1={y} x2={W * 0.96} y2={y}
            stroke={color} strokeWidth={0.9} opacity={0.55} strokeDasharray="8 12" />
        ))}
        {/* Top tick nodes */}
        {[BLUE, GREEN, AMBER, PURPLE, RED_T].map((color, i) => (
          <Circle key={i} cx={W * (0.15 + i * 0.175)} cy={H * 0.09}
            r={2.5} fill={color} opacity={0.7} />
        ))}

        {/* Left scan lines */}
        {leftLines.map((x, i) => (
          <Line key={i} x1={x} y1={H * 0.18} x2={x} y2={H * 0.82}
            stroke={i === 0 ? BLUE : GREEN} strokeWidth={0.9}
            opacity={0.45} strokeDasharray="5 14" />
        ))}
        {/* Right scan lines */}
        {rightLines.map((x, i) => (
          <Line key={i} x1={x} y1={H * 0.18} x2={x} y2={H * 0.82}
            stroke={i === 0 ? PURPLE : AMBER} strokeWidth={0.9}
            opacity={0.45} strokeDasharray="5 14" />
        ))}
      </G>
    </Svg>
  );
}

interface Props { onComplete: () => void }

export function SplashAnimation({ onComplete }: Props) {
  const fadeGrid  = useRef(new Animated.Value(0)).current;
  const scaleRing = useRef(new Animated.Value(0.65)).current;
  const fadeRing  = useRef(new Animated.Value(0)).current;
  const spin1     = useRef(new Animated.Value(0)).current;
  const spin2     = useRef(new Animated.Value(0)).current;
  const fadeInner = useRef(new Animated.Value(0)).current;
  const fadeText  = useRef(new Animated.Value(0)).current;
  const fadeOut   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin1, { toValue: 1, duration: 5000, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.timing(spin2, { toValue: 1, duration: 8000, useNativeDriver: true })
    ).start();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeGrid,  { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(fadeRing,  { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(scaleRing, { toValue: 1, duration: 550, useNativeDriver: true }),
      ]),
      Animated.timing(fadeInner, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(fadeText,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(fadeOut,   { toValue: 0, duration: 550, useNativeDriver: true }),
    ]).start(() => onComplete());
  }, []);

  const rotate1 = spin1.interpolate({ inputRange: [0, 1], outputRange: ['0deg',   '360deg'] });
  const rotate2 = spin2.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });

  const ang = (deg: number) => (deg * Math.PI) / 180;

  // Cardinal + diagonal tick helpers
  const cardinals = [0, 90, 180, 270];
  const diagonals = [45, 135, 225, 315];

  // Circuit traces extending beyond the ring
  const traces = [
    `M${CX} ${CY - R_OUT} v-28 h22 v-10`,
    `M${CX} ${CY + R_OUT} v28 h-22 v10`,
    `M${CX - R_OUT} ${CY} h-28 v-16`,
    `M${CX + R_OUT} ${CY} h28 v16`,
    `M${CX + R_OUT * 0.707} ${CY - R_OUT * 0.707} h16 v-16`,
    `M${CX - R_OUT * 0.707} ${CY + R_OUT * 0.707} h-16 v16`,
  ];

  const circ1 = 2 * Math.PI * R_MID1;
  const circ2 = 2 * Math.PI * R_MID2;
  const dash1 = `${(circ1 / 5) * 0.55} ${(circ1 / 5) * 0.45}`;
  const dash2 = `${(circ2 / 4) * 0.38} ${(circ2 / 4) * 0.62}`;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: fadeOut }]}>

      {/* Border background art — data-viz bars + grid, masked to fade toward centre */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeGrid }]}>
        <SplashBorderArt />
      </Animated.View>

      {/* Grid + corner brackets */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeGrid }]}>
        <Svg width={W} height={H}>
          {[15, 45, 75, 105, 135, 165].map(a => (
            <Line key={a}
              x1={CX - Math.cos(ang(a)) * W * 1.5} y1={CY - Math.sin(ang(a)) * H}
              x2={CX + Math.cos(ang(a)) * W * 1.5} y2={CY + Math.sin(ang(a)) * H}
              stroke={RED_FAINT} strokeWidth={0.5}
            />
          ))}
          <Line x1={0} y1={CY} x2={W} y2={CY} stroke={RED_FAINT} strokeWidth={0.5} />
          <Line x1={CX} y1={0} x2={CX} y2={H}  stroke={RED_FAINT} strokeWidth={0.5} />
          {/* Screen corner brackets */}
          <Path d={`M18 52 L18 18 L52 18`}                         fill="none" stroke={RED} strokeWidth={1.5} opacity={0.45} />
          <Path d={`M${W-18} 52 L${W-18} 18 L${W-52} 18`}         fill="none" stroke={RED} strokeWidth={1.5} opacity={0.45} />
          <Path d={`M18 ${H-52} L18 ${H-18} L52 ${H-18}`}         fill="none" stroke={RED} strokeWidth={1.5} opacity={0.45} />
          <Path d={`M${W-18} ${H-52} L${W-18} ${H-18} L${W-52} ${H-18}`} fill="none" stroke={RED} strokeWidth={1.5} opacity={0.45} />
        </Svg>
      </Animated.View>

      {/* Static rings + traces */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeRing, transform: [{ scale: scaleRing }] }]}>
        <Svg width={W} height={H}>
          {/* Outer glow */}
          <Circle cx={CX} cy={CY} r={R_OUT + 5} fill="none" stroke={RED} strokeWidth={14} opacity={0.07} />
          {/* Outer ring */}
          <Circle cx={CX} cy={CY} r={R_OUT} fill="none" stroke={RED} strokeWidth={1.5} />
          {/* Cardinal ticks */}
          {cardinals.map(a => (
            <Line key={a}
              x1={CX + Math.cos(ang(a)) * (R_OUT - 10)} y1={CY + Math.sin(ang(a)) * (R_OUT - 10)}
              x2={CX + Math.cos(ang(a)) * (R_OUT + 10)} y2={CY + Math.sin(ang(a)) * (R_OUT + 10)}
              stroke={RED} strokeWidth={2.5}
            />
          ))}
          {/* Cardinal nodes */}
          {cardinals.map(a => (
            <Circle key={a}
              cx={CX + Math.cos(ang(a)) * R_OUT}
              cy={CY + Math.sin(ang(a)) * R_OUT}
              r={3.5} fill={RED}
            />
          ))}
          {/* Diagonal small nodes */}
          {diagonals.map(a => (
            <Circle key={a}
              cx={CX + Math.cos(ang(a)) * R_OUT}
              cy={CY + Math.sin(ang(a)) * R_OUT}
              r={2} fill={RED} opacity={0.5}
            />
          ))}
          {/* Circuit traces */}
          {traces.map((d, i) => (
            <Path key={i} d={d} fill="none" stroke={RED_TRACE} strokeWidth={1} />
          ))}
        </Svg>
      </Animated.View>

      {/* Spinning dashed ring 1 — clockwise */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeRing, transform: [{ rotate: rotate1 }] }]}>
        <Svg width={W} height={H}>
          <Circle cx={CX} cy={CY} r={R_MID1}
            fill="none" stroke={RED} strokeWidth={1.5}
            strokeDasharray={dash1} opacity={0.65}
          />
        </Svg>
      </Animated.View>

      {/* Spinning dashed ring 2 — counter-clockwise */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeRing, transform: [{ rotate: rotate2 }] }]}>
        <Svg width={W} height={H}>
          <Circle cx={CX} cy={CY} r={R_MID2}
            fill="none" stroke={RED} strokeWidth={1}
            strokeDasharray={dash2} opacity={0.4}
          />
        </Svg>
      </Animated.View>

      {/* Inner ring + crosshair + target */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeInner }]}>
        <Svg width={W} height={H}>
          <Circle cx={CX} cy={CY} r={R_IN} fill="none" stroke={RED} strokeWidth={1} opacity={0.5} />
          <Line x1={CX - R_IN * 0.45} y1={CY} x2={CX - 12} y2={CY} stroke={RED} strokeWidth={0.8} opacity={0.5} />
          <Line x1={CX + 12} y1={CY} x2={CX + R_IN * 0.45} y2={CY} stroke={RED} strokeWidth={0.8} opacity={0.5} />
          <Line x1={CX} y1={CY - R_IN * 0.45} x2={CX} y2={CY - 12} stroke={RED} strokeWidth={0.8} opacity={0.5} />
          <Line x1={CX} y1={CY + 12} x2={CX} y2={CY + R_IN * 0.45} stroke={RED} strokeWidth={0.8} opacity={0.5} />
          <Circle cx={CX} cy={CY} r={11} fill="none" stroke={RED} strokeWidth={0.8} opacity={0.35} />
          <Circle cx={CX} cy={CY} r={5}  fill={RED} />
        </Svg>
      </Animated.View>

      {/* Title text */}
      <Animated.View style={{
        position: 'absolute',
        left: 0, right: 0,
        top: CY + R_OUT + 36,
        alignItems: 'center',
        opacity: fadeText,
      }}>
        {/* Primary wordmark */}
        <Text style={{
          fontFamily: 'sans-serif', fontSize: 42, fontWeight: '800',
          color: INK, letterSpacing: 1, textAlign: 'center', lineHeight: 44,
        }}>
          SQUAD
        </Text>
        <Text style={{
          fontFamily: 'monospace', fontSize: 13, fontWeight: '400',
          color: '#9eb0d4', letterSpacing: 9, textAlign: 'center', marginTop: 2,
        }}>
          OPTIMISER
        </Text>

        {/* Tier colour strip — T1→T6 */}
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 18 }}>
          {['#60a5fa','#34d399','#22d3ee','#a78bfa','#fb923c','#fbbf24'].map((c, i) => (
            <View key={i} style={{ width: 18, height: 2.5, backgroundColor: c, opacity: 0.75 }} />
          ))}
        </View>

        {/* Red separator */}
        <View style={{ width: 108, height: 1, backgroundColor: RED, marginTop: 10, opacity: 0.7 }} />

        {/* Sub-label */}
        <Text style={{
          fontFamily: 'monospace', fontSize: 8, color: '#9eb0d4',
          letterSpacing: 5, marginTop: 10, opacity: 0.7,
        }}>
          SESSION SIMULATOR
        </Text>
      </Animated.View>

    </Animated.View>
  );
}
