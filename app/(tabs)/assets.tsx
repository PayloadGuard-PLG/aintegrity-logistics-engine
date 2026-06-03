import { View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useMemo, useRef } from 'react';
import { useSquad } from '../../src/hooks/useSquad';
import { useManager } from '../../src/context/ManagerContext';
import { AppHeader } from '../../src/components/AppHeader';
import { MonoLabel } from '../../src/components/atoms/MonoLabel';
import { QualityMeter } from '../../src/components/atoms/QualityMeter';
import { NewRoleBar } from '../../src/components/atoms/NewRoleBar';
import { CornerBrackets } from '../../src/components/atoms/CornerBrackets';
import { TabBackground } from '../../src/components/TabBackground';
import { theme, TIER_COLORS, ovrColor } from '../../src/constants/theme';
import { Player } from '../../src/database/playerSchema';

const TIER_ORDER = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
const TALENT_TIERS = ['Fastest', 'Fast', 'Average', 'Normal', 'Slow'];
const TALENT_COLORS: Record<string, string> = { Fastest: '#9eb0d4', Fast: '#7d8ba8', Average: '#5b6b8a', Normal: '#3a3a40', Slow: '#c4756a' };

function OvrBadge({ ovr }: { ovr: number }) {
  const c = ovrColor(ovr);
  return (
    <View style={{
      width: 48, height: 48, borderWidth: 1,
      borderColor: c + '66', backgroundColor: c + '11',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontFamily: theme.display, fontWeight: '300', fontSize: 18, color: c, lineHeight: 20 }}>{ovr}</Text>
      <MonoLabel size={7} color={c + 'aa'} style={{ letterSpacing: 0.8, marginTop: 2 }}>OVR</MonoLabel>
    </View>
  );
}

function PlayerRow({ player, index }: { player: Player; index: number }) {
  const manager = useManager();
  const lastTapRef = useRef<number>(0);
  const isSelected = manager.selectedPlayerId === player.id;

  function handlePress() {
    const now = Date.now();
    if (now - lastTapRef.current < 350 && isSelected) {
      router.push(`/player/${player.id}`);
      lastTapRef.current = 0;
    } else {
      manager.setSelectedPlayerId(player.id);
      lastTapRef.current = now;
    }
  }

  return (
    <Pressable onPress={handlePress} style={{
      backgroundColor: isSelected ? theme.surface2 : theme.surface,
      borderWidth: 1, borderColor: isSelected ? theme.steelLight + '88' : theme.hairline,
      borderTopWidth: index > 0 ? 0 : 1,
      borderLeftWidth: isSelected ? 3 : 1,
      borderLeftColor: isSelected ? theme.steelLight : theme.hairline,
      padding: 12, paddingHorizontal: 14,
      flexDirection: 'row', alignItems: 'center', gap: 14,
    }}>
      <QualityMeter ovr={player.overall} />
      <OvrBadge ovr={player.overall} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.ink, fontFamily: theme.display, letterSpacing: -0.2, marginBottom: 4 }}>
          {player.name}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Text style={{ fontFamily: theme.mono, fontSize: 9, letterSpacing: 1.2, color: theme.steelLight }}>
            {player.role.join('·')}
          </Text>
          <Text style={{ color: theme.inkGhost }}>/</Text>
          <Text style={{ fontFamily: theme.mono, fontSize: 9, letterSpacing: 1.2, color: theme.inkMuted }}>
            {player.age}Y · {(player.tier ?? 'NONE').toUpperCase()}
          </Text>
          {player.isMutantCandidate && (
            <View style={{
              paddingHorizontal: 5, paddingVertical: 1,
              borderWidth: 1, borderColor: theme.hot + '55', marginLeft: 4,
            }}>
              <Text style={{ fontFamily: theme.mono, fontSize: 8, letterSpacing: 1, color: theme.hot }}>MUTANT</Text>
            </View>
          )}
        </View>
        {player.newRole && (
          <NewRoleBar roleName={player.newRole} points={player.newRolePoints ?? 0} />
        )}
      </View>
      <Text style={{ color: isSelected ? theme.steelLight : theme.inkMuted, fontFamily: theme.mono, fontSize: 14 }}>›</Text>
    </Pressable>
  );
}

export default function SquadScreen() {
  const { squad } = useSquad();

  const summary = useMemo(() => {
    if (!squad.length) return null;
    const talentCounts = squad.reduce((acc: Record<string, number>, p) => {
      const t = (p as any).talent ?? 'Normal';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
    const tierCounts = squad.reduce((acc: Record<string, number>, p) => {
      const k = p.tier ?? 'None';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    return {
      n: squad.length,
      avgOvr: Math.round(squad.reduce((a, p) => a + p.overall, 0) / squad.length),
      avgAge: (squad.reduce((a, p) => a + p.age, 0) / squad.length).toFixed(1),
      mutants: squad.filter(p => p.isMutantCandidate).length,
      fastest: (talentCounts.Fastest || 0) + (talentCounts.FT1 || 0),
      under20: squad.filter(p => p.age < 20).length,
      eliteUp: squad.filter(p => ['T3', 'T4', 'T5', 'T6'].includes(p.tier ?? '')).length,
      talentCounts, tierCounts,
    };
  }, [squad]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <TabBackground tab="squad" />
      <AppHeader />

      {squad.length === 0 ? (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <CornerBrackets padding={30}>
            <View style={{ alignItems: 'center' }}>
              <MonoLabel size={11} color={theme.steelLight} style={{ marginBottom: 16 }}>NO PERSONNEL ON FILE</MonoLabel>
              <Text style={{ fontSize: 24, color: theme.ink, fontFamily: theme.display, fontWeight: '600', letterSpacing: -0.6, marginBottom: 10 }}>
                Acquire your first asset.
              </Text>
              <Text style={{ fontSize: 13, color: theme.inkMuted, lineHeight: 20, textAlign: 'center', maxWidth: 260, marginBottom: 22 }}>
                Track personnel, project investment outcomes, rank scenarios with surgical precision.
              </Text>
              <Pressable onPress={() => router.push('/player/new')} style={{
                backgroundColor: theme.ink, paddingHorizontal: 26, paddingVertical: 13,
              }}>
                <Text style={{ fontFamily: theme.mono, fontSize: 11, letterSpacing: 2, fontWeight: '600', color: theme.bg }}>
                  ＋  ADD PLAYER
                </Text>
              </Pressable>
            </View>
          </CornerBrackets>

          <View style={{ marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[['01', 'PROJECT', 'Forecast OVR step-by-step.'], ['02', 'OPTIMISE', 'Find zero-drain drill paths.'], ['03', 'COMPARE', 'Rank players head-to-head.'], ['04', 'TIER', 'Plan upgrade investments.']].map(([n, t, d]) => (
              <View key={n} style={{ width: '47%', borderWidth: 1, borderColor: theme.hairline, padding: 12, backgroundColor: theme.surface }}>
                <MonoLabel size={9} color={theme.steelLight}>{n} / {t}</MonoLabel>
                <Text style={{ fontSize: 11.5, color: theme.inkSec, marginTop: 6, lineHeight: 16 }}>{d}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
            {summary && (
              <>
                {/* Summary strip */}
                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.hairline }}>
                  {[
                    ['ROSTER', summary.n, null],
                    ['AVG OVR', summary.avgOvr, ovrColor(summary.avgOvr)],
                    ['AVG AGE', summary.avgAge, null],
                    ['MUTANT', summary.mutants, summary.mutants > 0 ? theme.hot : null],
                  ].map(([l, v, c], i) => (
                    <View key={String(l)} style={{
                      flex: 1, padding: 14, paddingHorizontal: 10,
                      borderRightWidth: i < 3 ? 1 : 0, borderRightColor: theme.hairline,
                    }}>
                      <MonoLabel size={9}>{String(l)}</MonoLabel>
                      <Text style={{
                        fontFamily: theme.display, fontSize: 24, fontWeight: '300',
                        color: (c as string | null) ?? theme.ink,
                        letterSpacing: -0.5, marginTop: 4, lineHeight: 26,
                      }}>{String(v)}</Text>
                    </View>
                  ))}
                </View>

                {/* Squad DNA */}
                <View style={{
                  padding: 14, paddingHorizontal: 16, paddingBottom: 12,
                  borderBottomWidth: 1, borderBottomColor: theme.hairline,
                }}>
                  <MonoLabel size={9} color={theme.steelLight} style={{ marginBottom: 10 }}>
                    SQUAD DNA · STRATEGIC SIGNATURE
                  </MonoLabel>

                  {/* Talent bar */}
                  <View style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <MonoLabel size={8}>TALENT MIX</MonoLabel>
                      <MonoLabel size={8}>{summary.fastest} ×1.5 · {summary.under20} U20</MonoLabel>
                    </View>
                    <View style={{ flexDirection: 'row', height: 6, backgroundColor: theme.surface3, gap: 1 }}>
                      {TALENT_TIERS.map(t => {
                        const n = summary.talentCounts[t] || 0;
                        if (!n) return null;
                        const pct = (n / summary.n) * 100;
                        return (
                          <View key={t} style={{ width: `${pct}%` as any, backgroundColor: TALENT_COLORS[t] }} />
                        );
                      })}
                    </View>
                  </View>

                  {/* Tier ladder */}
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <MonoLabel size={8}>TIER LADDER</MonoLabel>
                      <MonoLabel size={8}>{summary.eliteUp}/{summary.n} ELITE+</MonoLabel>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {TIER_ORDER.map(t => {
                        const n = summary.tierCounts[t] || 0;
                        const c = TIER_COLORS[t];
                        return (
                          <View key={t} style={{
                            flex: 1, height: 24,
                            backgroundColor: n > 0 ? c + '33' : 'transparent',
                            borderWidth: 1, borderColor: n > 0 ? c + '66' : theme.hairline,
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Text style={{ fontFamily: theme.mono, fontSize: 10, fontWeight: '600', color: n > 0 ? c : theme.inkGhost, lineHeight: 12 }}>{n}</Text>
                            <Text style={{ fontFamily: theme.mono, fontSize: 6, letterSpacing: 0.5, color: n > 0 ? c : theme.inkGhost }}>{t.slice(0, 3).toUpperCase()}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>

                {/* Roster label */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 10 }}>
                  <MonoLabel size={10} color={theme.steelLight}>ROSTER · {squad.length} ON FILE</MonoLabel>
                  <MonoLabel size={9}>SORT: OVR ▼</MonoLabel>
                </View>
              </>
            )}

            {/* Player rows */}
            <View style={{ paddingHorizontal: 12 }}>
              {[...squad].sort((a, b) => b.overall - a.overall).map((player, i) => (
                <PlayerRow key={player.id} player={player} index={i} />
              ))}
            </View>
          </ScrollView>

          {/* Add player CTA */}
          <Pressable onPress={() => router.push('/player/new')} style={{
            position: 'absolute', bottom: 18, left: 16, right: 16,
            backgroundColor: theme.ink, paddingVertical: 14,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Text style={{ fontFamily: theme.mono, fontSize: 14, fontWeight: '300', color: theme.bg }}>＋</Text>
            <Text style={{ fontFamily: theme.mono, fontSize: 11, letterSpacing: 2.5, fontWeight: '600', color: theme.bg }}>
              ADD PLAYER
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
