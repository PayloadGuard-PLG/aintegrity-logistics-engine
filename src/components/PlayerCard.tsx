import { View, Text, Pressable } from 'react-native';
import { Player } from '../database/playerSchema';
import { OVRBadge } from './OVRBadge';
import { TierBadge } from './TierBadge';

interface Props {
  player: Player;
  selected?: boolean;
  onPress: () => void;
}

export function PlayerCard({ player, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: selected ? '#2a2d3a' : pressed ? '#1e2130' : '#1a1d27',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: selected ? 1 : 0,
        borderColor: '#6366f1',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      })}
    >
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ color: '#e2e8f0', fontWeight: '700', fontSize: 15 }}>{player.name}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {player.role.map(r => (
            <View key={r} style={{ backgroundColor: '#6366f133', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: '#6366f1', fontSize: 11, fontWeight: '600' }}>{r}</Text>
            </View>
          ))}
          <TierBadge tier={player.tier} />
          {player.isMutantCandidate && (
            <View style={{ backgroundColor: '#f59e0b33', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '700' }}>M</Text>
            </View>
          )}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <OVRBadge ovr={player.overall} />
        <Text style={{ color: '#6b7280', fontSize: 11 }}>Age {player.age}</Text>
      </View>
    </Pressable>
  );
}
