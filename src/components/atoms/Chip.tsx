import { Pressable, Text } from 'react-native';
import { theme } from '../../constants/theme';

interface Props {
  active?: boolean;
  onPress: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md';
}

export function Chip({ active, onPress, children, size = 'md' }: Props) {
  const pad = size === 'sm' ? { paddingHorizontal: 9, paddingVertical: 5 } : { paddingHorizontal: 11, paddingVertical: 7 };
  const fontSize = size === 'sm' ? 10 : 11;
  return (
    <Pressable onPress={onPress} style={{
      ...pad,
      backgroundColor: active ? theme.ink : theme.surface2,
      borderWidth: 1,
      borderColor: active ? theme.ink : theme.hairline3,
      borderRadius: 0,
    }}>
      <Text style={{
        fontFamily: theme.mono,
        fontSize,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: active ? theme.bg : theme.ink,
        fontWeight: '600',
      }}>
        {children}
      </Text>
    </Pressable>
  );
}
