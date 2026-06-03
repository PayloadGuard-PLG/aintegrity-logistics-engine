import { View, Text } from 'react-native';
import { theme, ovrColor } from '../../constants/theme';
import { MonoLabel } from './MonoLabel';

interface Props {
  from: number;
  to: number;
  gain: number;
  name: string;
  age: number;
  tier: string;
}

export function OvrMovement({ from, to, gain, name, age, tier }: Props) {
  const c = ovrColor(to);
  return (
    <View style={{
      padding: 18,
      backgroundColor: '#050507',
      borderWidth: 1,
      borderColor: theme.hairline2,
    }}>
      <MonoLabel size={9} color={theme.steelLight} style={{ marginBottom: 14 }}>
        SUBJECT · {(tier ?? 'NONE').toUpperCase()} · AGE {age}
      </MonoLabel>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, color: theme.inkSec, fontFamily: theme.display, fontWeight: '500', marginBottom: 4 }}>{name}</Text>
          <MonoLabel size={9}>FINAL OVR</MonoLabel>
          <Text style={{
            fontSize: 62, fontWeight: '200', color: c, fontFamily: theme.display,
            letterSpacing: -3, lineHeight: 56, marginTop: 4,
          }}>{to.toFixed(1)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <MonoLabel size={9}>FROM</MonoLabel>
          <Text style={{ fontFamily: theme.mono, fontSize: 14, color: theme.inkSec, marginTop: 4 }}>{from.toFixed(1)}</Text>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8,
            paddingHorizontal: 8, paddingVertical: 4,
            backgroundColor: 'rgba(126,184,154,0.12)',
            borderWidth: 1, borderColor: theme.pos + '55',
          }}>
            <Text style={{ fontFamily: theme.mono, fontSize: 13, fontWeight: '600', color: theme.pos }}>+</Text>
            <Text style={{ fontFamily: theme.display, fontSize: 18, fontWeight: '600', color: theme.pos, letterSpacing: -0.5 }}>
              {gain.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
