import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  message: string;
  ctaLabel: string;
  onCta: () => void;
}

export function EmptyState({ icon = 'people-outline', message, ctaLabel, onCta }: Props) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
      <Ionicons name={icon} size={64} color="#6b7280" />
      <Text style={{ color: '#6b7280', fontSize: 16, textAlign: 'center' }}>{message}</Text>
      <Pressable
        onPress={onCta}
        style={({ pressed }) => ({
          backgroundColor: pressed ? '#4f46e5' : '#6366f1',
          borderRadius: 10,
          paddingHorizontal: 24,
          paddingVertical: 12,
        })}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{ctaLabel}</Text>
      </Pressable>
    </View>
  );
}
