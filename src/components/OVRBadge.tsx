import { View, Text } from 'react-native';

export function OVRBadge({ ovr }: { ovr: number }) {
  const bg = ovr >= 150 ? '#22c55e' : ovr >= 100 ? '#6366f1' : '#f59e0b';
  return (
    <View style={{ backgroundColor: bg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>{ovr.toFixed(0)}</Text>
    </View>
  );
}
