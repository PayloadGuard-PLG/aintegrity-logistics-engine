import { View, ViewStyle } from 'react-native';
import { theme } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  color?: string;
  padding?: number;
  style?: ViewStyle;
}

export function CornerBrackets({ children, color, padding = 14, style }: Props) {
  const c = color ?? theme.hairline3;
  const s = 10;
  return (
    <View style={{ position: 'relative', padding, ...style }}>
      <View style={{ position: 'absolute', top: 0, left: 0, width: s, height: s, borderTopWidth: 1, borderLeftWidth: 1, borderColor: c }} />
      <View style={{ position: 'absolute', top: 0, right: 0, width: s, height: s, borderTopWidth: 1, borderRightWidth: 1, borderColor: c }} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, width: s, height: s, borderBottomWidth: 1, borderLeftWidth: 1, borderColor: c }} />
      <View style={{ position: 'absolute', bottom: 0, right: 0, width: s, height: s, borderBottomWidth: 1, borderRightWidth: 1, borderColor: c }} />
      {children}
    </View>
  );
}
