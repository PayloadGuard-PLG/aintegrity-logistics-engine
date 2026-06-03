import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { DrillSession, DrillLevel } from '../types/resources';
import { DRILL_LIST } from '../database/drillDatabase';

const DRILL_LEVELS: DrillLevel[] = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'];
const BASE_DRILLS = DRILL_LIST.filter(d => d.isBase);
const ALL_DRILLS = DRILL_LIST;

interface Props {
  value: DrillSession;
  onChange: (s: DrillSession) => void;
  onRemove: () => void;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{
      backgroundColor: active ? '#6366f1' : '#2a2d3a',
      borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5,
      marginRight: 4, marginBottom: 4,
    }}>
      <Text style={{ color: active ? '#fff' : '#9ca3af', fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function DrillSessionRow({ value, onChange, onRemove }: Props) {
  const [showAll, setShowAll] = useState(false);
  const drill = DRILL_LIST.find(d => d.name === value.drillName);
  const typeColor = drill?.type === 'Attack' ? '#6366f1' : drill?.type === 'Defence' ? '#22c55e' : '#f59e0b';
  const visibleDrills = showAll ? ALL_DRILLS : BASE_DRILLS;

  return (
    <View style={{ backgroundColor: '#1a1d27', borderRadius: 12, padding: 14, marginBottom: 10, gap: 10 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {drill && (
            <View style={{ backgroundColor: typeColor + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: typeColor, fontSize: 10, fontWeight: '700' }}>{drill.type.toUpperCase()}</Text>
            </View>
          )}
          <Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '600' }}>DRILL</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => setShowAll(v => !v)}>
            <Text style={{ color: showAll ? '#6366f1' : '#4b5563', fontSize: 11 }}>{showAll ? 'Base only' : '+ Lab/Event'}</Text>
          </Pressable>
          <Pressable onPress={onRemove}>
            <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: '700', paddingHorizontal: 8 }}>×</Text>
          </Pressable>
        </View>
      </View>

      {/* Drill name picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', flexWrap: 'nowrap' }}>
          {visibleDrills.map(d => (
            <Chip key={d.name} label={d.name} active={value.drillName === d.name}
              onPress={() => onChange({ ...value, drillName: d.name })} />
          ))}
        </View>
      </ScrollView>

      {/* Sessions + Level */}
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View style={{ width: 90 }}>
          <Text style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>SESSIONS</Text>
          <TextInput keyboardType="numeric" value={value.sessionCount.toString()}
            onChangeText={t => onChange({ ...value, sessionCount: Math.max(1, parseInt(t, 10) || 1) })}
            placeholder="1"
            placeholderTextColor="#4b5563"
            style={{ backgroundColor: '#0f1117', color: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 }} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>LEVEL</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {DRILL_LEVELS.map(level => (
              <Chip key={level} label={level} active={value.drillLevel === level}
                onPress={() => onChange({ ...value, drillLevel: level })} />
            ))}
          </View>
        </View>
      </View>

      {/* Trained stats */}
      {drill && (
        <Text style={{ color: '#4b5563', fontSize: 11 }}>
          Trains: {drill.stats.join(' · ')}
        </Text>
      )}
    </View>
  );
}
