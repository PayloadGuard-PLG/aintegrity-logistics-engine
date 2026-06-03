import { View, Text } from 'react-native';
import { TierName } from '../types/resources';

const TIER_COLOURS: Record<string, string> = {
  T0: '#6b7280',
  T1: '#60a5fa',
  T2: '#34d399',
  T3: '#22d3ee',
  T4: '#a78bfa',
  T5: '#fb923c',
  T6: '#fbbf24',
};

export function TierBadge({ tier }: { tier: TierName }) {
  if (tier === 'T0') return null;
  return (
    <View style={{ backgroundColor: TIER_COLOURS[tier] + '33', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ color: TIER_COLOURS[tier], fontWeight: '600', fontSize: 11 }}>{tier}</Text>
    </View>
  );
}
