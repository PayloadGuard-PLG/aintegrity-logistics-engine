import { View, Text, ScrollView } from 'react-native';
import { InvestmentStep } from '../types/resources';

const ACTION_COLOURS: Record<string, string> = {
  coach:  '#6366f1',
  tier:   '#22d3ee',
  restorers: '#22c55e',
};

interface Props {
  steps: InvestmentStep[];
  finalOvr: number;
  totalOvrGain: number;
}

function ActionChip({ action }: { action: string }) {
  const color = ACTION_COLOURS[action] ?? '#6b7280';
  return (
    <View style={{ backgroundColor: color + '33', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ color, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{action}</Text>
    </View>
  );
}

export function InvestmentStepTable({ steps, finalOvr, totalOvrGain }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ minWidth: 420 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#2a2d3a', gap: 8 }}>
          {['Action', 'Description', 'Before', 'After', 'Gain', 'Resources'].map(h => (
            <Text key={h} style={{ color: '#6b7280', fontSize: 11, fontWeight: '600', width: h === 'Description' ? 140 : 60 }}>{h}</Text>
          ))}
        </View>

        {steps.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e2130', gap: 8, alignItems: 'center' }}>
            <View style={{ width: 60 }}><ActionChip action={s.action} /></View>
            <Text style={{ color: '#e2e8f0', fontSize: 12, width: 140 }} numberOfLines={2}>{s.description}</Text>
            <Text style={{ color: '#9ca3af', fontSize: 12, width: 60 }}>{s.ovrBefore.toFixed(1)}</Text>
            <Text style={{ color: '#e2e8f0', fontSize: 12, width: 60 }}>{s.ovrAfter.toFixed(1)}</Text>
            <Text style={{ color: '#22c55e', fontSize: 12, fontWeight: '700', width: 60 }}>+{(s.ovrAfter - s.ovrBefore).toFixed(1)}</Text>
            <Text style={{ color: '#6b7280', fontSize: 11, width: 100 }} numberOfLines={1}>{s.resourcesUsed}</Text>
          </View>
        ))}

        {/* Footer */}
        <View style={{ flexDirection: 'row', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#2a2d3a', gap: 8 }}>
          <Text style={{ color: '#e2e8f0', fontWeight: '700', fontSize: 13, width: 200 + 60 + 8 }}>Final OVR: {finalOvr.toFixed(1)}</Text>
          <Text style={{ color: '#22c55e', fontWeight: '800', fontSize: 13 }}>+{totalOvrGain.toFixed(1)} total</Text>
        </View>
      </View>
    </ScrollView>
  );
}
