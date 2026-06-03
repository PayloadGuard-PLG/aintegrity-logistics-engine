import { Text, TextStyle } from 'react-native';
import { theme } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  size?: number;
  color?: string;
  style?: TextStyle;
}

export function MonoLabel({ children, size = 10, color, style }: Props) {
  return (
    <Text style={{
      fontFamily: theme.mono,
      fontSize: size,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: color ?? theme.inkSec,
      fontWeight: '600',
      ...style,
    }}>
      {children}
    </Text>
  );
}
