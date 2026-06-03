import { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSquad } from '../src/hooks/useSquad';
import { AppHeader } from '../src/components/AppHeader';
import { MonoLabel } from '../src/components/atoms/MonoLabel';
import { Chip } from '../src/components/atoms/Chip';
import { CornerBrackets } from '../src/components/atoms/CornerBrackets';
import { compareInvestmentScenarios } from '../src/logic/scenarioComparator';
import { DrillSession, TalentTier, TierName } from '../src/types/resources';
import { theme, ovrColor } from '../src/constants/theme';
import gameProfile from '../profiles/logistics_v1.json';

const TALENT_TIERS: TalentTier[] = ['Fastest', 'Fast', 'Average', 'Normal', 'Slow'];
const TIER_ORDER: TierName[] = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];

const DEFAULT_DRILLS: DrillSession[] = [
  { drillName: 'Touch Training', sessionCount: 5, drillLevel: 'Medium' },
  { drillName: 'Stamina Run', sessionCount: 3, drillLevel: 'Medium' },
];

export default function CompareScreen() {
  const { squad } = useSquad();
  const [selectedIds, setSelectedIds] = useState<string[]>(squad.slice(0, 2).map(p => p.id));
  const [talent, setTalent] = useState<TalentTier>('Fastest');
  const [targetTier, setTargetTier] = useState<TierName | null>('T4');

  function toggle(id: string) {
    setSelectedIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  const results = useMemo(() => {
    if (selectedIds.length < 2) return null;
    const players = squad.filter(p => selectedIds.includes(p.id));
    const profile = {
      style: 'FTP' as const,
      tierPoints: {} as Partial<Record<TierName, number>>,
      restorers: 0, isPremiumSponsor: false, twoxAdActive: false, talentTier: talent, drillLevel: 'Medium' as const, matchAdvisorActive: false,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return compareInvestmentScenarios(players, profile, DEFAULT_DRILLS, gameProfile as any, targetTier);
  }, [selectedIds, squad, talent, targetTier]);

  const maxGain = results ? Math.max(...results.results.map(r => r.ovrGain ?? 0), 0.1) : 0.1;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader title="HEAD-TO-HEAD" subtitle="COMPARATIVE ANALYSIS" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingHorizontal: 16, paddingBottom: 30 }}>

        <MonoLabel color={theme.steelLight} style={{ marginBottom: 8 }}>SUBJECTS</MonoLabel>
        <View style={{ marginBottom: 18 }}>
          {squad.map((p, i) => {
            const sel = selectedIds.includes(p.id);
            return (
              <Pressable key={p.id} onPress={() => toggle(p.id)} style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                backgroundColor: sel ? theme.surface2 : theme.surface,
                borderWidth: 1, borderColor: sel ? theme.steelLight : theme.hairline2,
                borderTopWidth: i > 0 ? 0 : 1,
                padding: 10, paddingHorizontal: 12,
              }}>
                <View style={{ width: 14, height: 14, backgroundColor: sel ? theme.steelLight : 'transparent', borderWidth: 1, borderColor: sel ? theme.steelLight : theme.inkMuted }} />
                <Text style={{ fontFamily: theme.mono, fontSize: 12, color: ovrColor(p.overall), minWidth: 30 }}>{p.overall}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.ink, fontFamily: theme.display }}>{p.name}</Text>
                  <MonoLabel size={9}>{p.role.join('·')} · {p.age}Y · {(p.tier ?? 'NONE').toUpperCase()}</MonoLabel>
                </View>
              </Pressable>
            );
          })}
        </View>

        <MonoLabel color={theme.steelLight} style={{ marginBottom: 8 }}>SHARED PARAMETERS</MonoLabel>
        <View style={{ marginBottom: 6 }}>
          <MonoLabel style={{ marginBottom: 6 }}>TALENT</MonoLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
            {TALENT_TIERS.map(t => <Chip key={t} active={talent === t} onPress={() => setTalent(t)}>{t}</Chip>)}
          </View>
        </View>
        <View style={{ marginTop: 14, marginBottom: 18 }}>
          <MonoLabel style={{ marginBottom: 6 }}>TARGET TIER</MonoLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
            {TIER_ORDER.map(t => (
              <Chip key={t} active={targetTier === t} onPress={() => setTargetTier(targetTier === t ? null : t)}>{t}</Chip>
            ))}
          </View>
        </View>

        {results && selectedIds.length >= 2 && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <MonoLabel color={theme.pos}>VERDICT</MonoLabel>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.hairline }} />
            </View>

            <CornerBrackets color={theme.pos + '88'} style={{ backgroundColor: 'rgba(126,184,154,0.05)', marginBottom: 14 }}>
              <MonoLabel size={10} color={theme.pos} style={{ marginBottom: 6 }}>RECOMMENDED ASSET</MonoLabel>
              <Text style={{ fontSize: 22, color: theme.ink, fontFamily: theme.display, fontWeight: '600', letterSpacing: -0.4, marginBottom: 6 }}>
                {results.recommendedPlayer ?? results.recommendedAsset ?? ''}
              </Text>
              <Text style={{ fontSize: 12, color: theme.inkSec, lineHeight: 18 }}>
                Projects highest yield ({' '}
                <Text style={{ color: theme.pos, fontFamily: theme.mono, fontWeight: '600' }}>
                  +{(results.results[0]?.ovrGain ?? results.results[0]?.cciGain ?? 0).toFixed(1)} OVR
                </Text>
                {' '}) under shared resources.
              </Text>
              {results.reasoning ? (
                <Text style={{ fontSize: 12, color: theme.inkMuted, marginTop: 6, lineHeight: 18 }}>{results.reasoning}</Text>
              ) : null}
            </CornerBrackets>

            <MonoLabel color={theme.steelLight} style={{ marginBottom: 8 }}>RANKED RESULTS</MonoLabel>
            {results.results.map((r, i) => (
              <View key={r.playerName} style={{
                borderWidth: 1, borderColor: theme.hairline2,
                borderTopWidth: i > 0 ? 0 : 1,
                backgroundColor: i === 0 ? theme.surface2 : theme.surface,
                padding: 12, paddingHorizontal: 14,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <View style={{
                    width: 24, height: 24, borderWidth: 1,
                    borderColor: i === 0 ? theme.pos : theme.hairline3,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontFamily: theme.mono, fontSize: 11, color: i === 0 ? theme.pos : theme.inkSec, fontWeight: '600' }}>#{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.ink, fontFamily: theme.display }}>{r.playerName}</Text>
                    <MonoLabel size={9}>OVR {(r.currentOvr ?? r.currentCci ?? 0).toFixed(0)} → {(r.projectedOvr ?? r.projectedCci ?? 0).toFixed(1)}</MonoLabel>
                  </View>
                  <Text style={{ fontFamily: theme.display, fontSize: 18, fontWeight: '600', color: theme.pos, letterSpacing: -0.3 }}>
                    +{(r.ovrGain ?? r.cciGain ?? 0).toFixed(1)}
                  </Text>
                </View>
                <View style={{ height: 3, backgroundColor: theme.surface3 }}>
                  <View style={{ width: `${((r.ovrGain ?? r.cciGain ?? 0) / maxGain) * 100}%` as any, height: '100%', backgroundColor: i === 0 ? theme.pos : theme.steel }} />
                </View>
              </View>
            ))}
          </>
        )}

        {selectedIds.length < 2 && (
          <View style={{ padding: 24, alignItems: 'center', borderWidth: 1, borderColor: theme.hairline }}>
            <MonoLabel color={theme.steelLight}>SELECT 2+ SUBJECTS TO COMPARE</MonoLabel>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
