import { View, Text } from 'react-native';

interface DrillRow {
  name: string;
  type: string;
  statsHit: string[];
  efficiency: number;
  conditionCost: number;
  isZeroDrain?: boolean;
}

const TYPE_COLOURS: Record<string, string> = {
  Attack:   '#6366f1',
  Defence:  '#22d3ee',
  Physical: '#f59e0b',
};

export function DrillTable({ drills }: { drills: DrillRow[] }) {
  if (!drills.length) {
    return <Text style={{ color: '#6b7280', textAlign: 'center', marginTop: 16 }}>No drills available.</Text>;
  }

  return (
    <View style={{ gap: 8 }}>
      {drills.map((d, i) => (
        <View
          key={i}
          style={{
            backgroundColor: d.isZeroDrain ? '#22c55e11' : '#1a1d27',
            borderRadius: 10,
            padding: 12,
            borderWidth: d.isZeroDrain ? 1 : 0,
            borderColor: '#22c55e44',
            gap: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ backgroundColor: (TYPE_COLOURS[d.type] ?? '#6b7280') + '33', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: TYPE_COLOURS[d.type] ?? '#6b7280', fontSize: 10, fontWeight: '700' }}>{d.type.toUpperCase()}</Text>
            </View>
            <Text style={{ color: '#e2e8f0', fontWeight: '700', fontSize: 14, flex: 1 }}>{d.name}</Text>
            {d.isZeroDrain && (
              <View style={{ backgroundColor: '#22c55e33', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: '#22c55e', fontSize: 10, fontWeight: '700' }}>ZERO DRAIN</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Text style={{ color: '#6b7280', fontSize: 12 }}>
              Stats: <Text style={{ color: '#9ca3af' }}>{d.statsHit.join(', ')}</Text>
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Text style={{ color: '#6b7280', fontSize: 12 }}>
              Efficiency <Text style={{ color: '#22c55e', fontWeight: '700' }}>{d.efficiency.toFixed(0)}%</Text>
            </Text>
            <Text style={{ color: '#6b7280', fontSize: 12 }}>
              Condition cost <Text style={{ color: d.conditionCost <= 0.5 ? '#22c55e' : '#f59e0b', fontWeight: '700' }}>{d.conditionCost.toFixed(2)}%</Text>
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
