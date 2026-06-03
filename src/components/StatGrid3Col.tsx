import { View, Text, Pressable } from 'react-native';
import { isWhiteStat } from '../utils/metricWeights';
import { MonoLabel } from './atoms/MonoLabel';
import { theme } from '../constants/theme';

export const COL_COLORS = { DEF: '#4A7FC1', ATT: '#7C3AED', PHY: '#C05621' } as const;

const COL_SETS: Record<string, Set<string>> = {
  DEF: new Set(['TACKLING','MARKING','POSITIONING','HEADING','BRAVERY',
                'REFLEXES','AGILITY','ANTICIPATION','RUSHING OUT','COMMUNICATION']),
  ATT: new Set(['PASSING','DRIBBLING','CROSSING','SHOOTING','FINISHING',
                'THROWING','KICKING','PUNCHING','AERIAL REACH','CONCENTRATION']),
  PHY: new Set(['FITNESS','STRENGTH','AGGRESSION','SPEED','CREATIVITY']),
};

type Props = {
  statKeys: string[];
  roles: string[];
  values?: Record<string, number>;
  gains?: Record<string, number>;
  selected?: Set<string>;
  onToggle?: (stat: string) => void;
};

export function StatGrid3Col({ statKeys, roles, values = {}, gains, selected, onToggle }: Props) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {(['DEF', 'ATT', 'PHY'] as const).map(col => {
        const cc = COL_COLORS[col];
        const colStats = statKeys.filter(s => COL_SETS[col].has(s));
        if (colStats.length === 0) return null;
        return (
          <View key={col} style={{ flex: 1, borderWidth: 1, borderColor: cc + '55' }}>
            {/* Column header */}
            <View style={{ paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: cc, backgroundColor: cc + '28' }}>
              <MonoLabel size={8} color={cc}>{col}</MonoLabel>
            </View>
            {/* Stat cells */}
            {colStats.map(stat => {
              const white = isWhiteStat(roles, stat);
              const val = values[stat];
              const hasVal = val !== undefined;
              const gain = gains?.[stat];
              const sel = selected?.has(stat) ?? false;

              const cellStyle = {
                paddingHorizontal: 8,
                paddingVertical: 7,
                borderBottomWidth: 1,
                borderBottomColor: white ? cc + '44' : theme.hairline,
                borderLeftWidth: white ? 3 : 1,
                borderLeftColor: white ? cc : theme.hairline2,
                backgroundColor: white
                  ? (sel ? cc + '2a' : cc + '1a')
                  : (sel ? (theme.inkMuted + '18') : 'transparent'),
              };

              const inner = (
                <>
                  <MonoLabel size={7} color={white ? cc : theme.inkMuted}>{stat}</MonoLabel>
                  {gain !== undefined ? (
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                      <Text style={{ fontFamily: theme.mono, fontSize: 11, color: theme.inkMuted }}>
                        {hasVal ? Math.round(val) : '—'}
                      </Text>
                      <Text style={{ fontFamily: theme.mono, fontSize: 12, fontWeight: '700', color: theme.pos }}>
                        +{gain}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{
                      fontFamily: theme.mono,
                      fontSize: 13,
                      fontWeight: white ? '700' : '400',
                      color: white ? (hasVal ? theme.ink : theme.inkMuted) : theme.inkMuted,
                      marginTop: 2,
                    }}>
                      {hasVal ? Math.round(val) : '—'}
                    </Text>
                  )}
                </>
              );

              return onToggle ? (
                <Pressable key={stat} onPress={() => onToggle(stat)} style={cellStyle}>
                  {inner}
                </Pressable>
              ) : (
                <View key={stat} style={cellStyle}>
                  {inner}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
