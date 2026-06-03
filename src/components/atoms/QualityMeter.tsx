import { View } from 'react-native';

// 10 bars, max OVR = 180 (training cap), each bar = 18 OVR.
// Colors run red → amber → green so quality reads instantly at a glance.
const MAX_OVR = 180;
const N_BARS  = 10;
const COLORS  = [
  '#b91c1c', // bar 0  0–18   deep red
  '#dc2626', // bar 1  18–36  red
  '#f97316', // bar 2  36–54  orange
  '#f59e0b', // bar 3  54–72  amber
  '#eab308', // bar 4  72–90  yellow
  '#a3e635', // bar 5  90–108 lime
  '#4ade80', // bar 6  108–126 light green
  '#22c55e', // bar 7  126–144 green
  '#16a34a', // bar 8  144–162 deep green
  '#059669', // bar 9  162–180 emerald (elite)
];
const EMPTY = 'rgba(255,255,255,0.06)';

type Props = { ovr: number; size?: 'md' | 'sm' };

export function QualityMeter({ ovr, size = 'md' }: Props) {
  const w  = size === 'sm' ? 5 : 8;
  const bh = size === 'sm' ? 2 : 3;

  const filled  = (Math.min(ovr, MAX_OVR) / MAX_OVR) * N_BARS;
  const full    = Math.floor(filled);
  const partial = filled - full;

  return (
    <View style={{ width: w, gap: 1, flexDirection: 'column-reverse' }}>
      {Array.from({ length: N_BARS }, (_, i) => {
        const fillPct = i < full ? 1 : i === full ? partial : 0;
        return (
          <View key={i} style={{ width: w, height: bh, backgroundColor: EMPTY }}>
            {fillPct > 0 && (
              <View style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: COLORS[i],
                opacity: fillPct,
              }} />
            )}
          </View>
        );
      })}
    </View>
  );
}
