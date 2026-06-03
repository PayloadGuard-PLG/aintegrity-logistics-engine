import { View, Text, TextInput, Pressable } from 'react-native';
import { Coach } from '../types/resources';

const COACH_TYPES: Coach['type'][] = ['Attacking', 'Defending', 'Physical', 'Mixed', 'Focused'];
const SOURCES: Coach['source'][] = ['Academy', 'PremiumChest', 'Store', 'Other'];

const DEFAULT_ATTRS: Record<string, string[]> = {
  Attacking: ['PASSING', 'DRIBBLING', 'CROSSING', 'SHOOTING', 'FINISHING'],
  Defending: ['BRAVERY', 'HEADING', 'MARKING', 'POSITIONING', 'TACKLING'],
  Physical:  ['AGGRESSION', 'CREATIVITY', 'FITNESS', 'SPEED', 'STRENGTH'],
  Mixed:     ['PASSING', 'DRIBBLING', 'TACKLING', 'MARKING'],
  Focused:   ['POSITIONING'],
};

interface Props {
  value: Partial<Coach>;
  onChange: (c: Partial<Coach>) => void;
  onRemove: () => void;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: active ? '#6366f1' : '#2a2d3a',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 4,
        marginBottom: 4,
      }}
    >
      <Text style={{ color: active ? '#fff' : '#9ca3af', fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function CoachInputRow({ value, onChange, onRemove }: Props) {
  const isFree = !value.source || value.source === 'Academy' || value.source === 'PremiumChest';

  function setType(type: Coach['type']) {
    onChange({ ...value, type, attributes: DEFAULT_ATTRS[type] ?? [] });
  }

  return (
    <View style={{ backgroundColor: '#1a1d27', borderRadius: 12, padding: 14, marginBottom: 10, gap: 10 }}>
      {/* Header row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '600' }}>COACH TYPE</Text>
        <Pressable onPress={onRemove}>
          <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: '700', paddingHorizontal: 8 }}>×</Text>
        </Pressable>
      </View>

      {/* Type chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {COACH_TYPES.map(t => (
          <Chip key={t} label={t} active={value.type === t} onPress={() => setType(t)} />
        ))}
      </View>

      {/* Multiplier + Session row */}
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>MULTIPLIER ×</Text>
          <TextInput
            keyboardType="numeric"
            value={value.multiplier?.toString() ?? ''}
            onChangeText={t => onChange({ ...value, multiplier: parseInt(t, 10) || 0 })}
            placeholder="30"
            placeholderTextColor="#4b5563"
            style={{ backgroundColor: '#0f1117', color: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>SESSION</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['Training', 'Seminar'] as Coach['sessionType'][]).map(s => (
              <Chip key={s} label={s} active={value.sessionType === s} onPress={() => onChange({ ...value, sessionType: s })} />
            ))}
          </View>
        </View>
      </View>

      {/* Source */}
      <View>
        <Text style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>SOURCE</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {SOURCES.map(s => (
            <Chip key={s} label={s} active={value.source === s} onPress={() => onChange({ ...value, source: s })} />
          ))}
        </View>
      </View>

      {/* Cost row — only when Store */}
      {value.source === 'Store' && (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>COST (TOKENS)</Text>
            <TextInput
              keyboardType="numeric"
              value={value.cost?.amount?.toString() ?? ''}
              onChangeText={t => onChange({ ...value, cost: { currency: 'tokens', amount: parseInt(t, 10) || 0 } })}
              placeholder="150"
              placeholderTextColor="#4b5563"
              style={{ backgroundColor: '#0f1117', color: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 }}
            />
          </View>
        </View>
      )}
    </View>
  );
}
