import { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSquad } from '../../src/hooks/useSquad';
import { useManager } from '../../src/context/ManagerContext';
import { AppHeader } from '../../src/components/AppHeader';
import { MonoLabel } from '../../src/components/atoms/MonoLabel';
import { Chip } from '../../src/components/atoms/Chip';
import { QualityMeter } from '../../src/components/atoms/QualityMeter';
import { OvrMovement } from '../../src/components/atoms/OvrMovement';
import { TabBackground } from '../../src/components/TabBackground';
import { planPlayerInvestment } from '../../src/logic/investmentEngine';
import { computeOvrFromStats } from '../../src/logic/ovrProjector';
import { calculateFixtureCycles, calculateTeamPlayPlan, calculateRestorersBridge } from '../../src/logic/fixtureEngine';
import { DRILL_LIST } from '../../src/database/drillDatabase';
import { DrillSession, DrillLevel, TalentTier, ManagerStyle, TierName, InvestmentPlan, InvestmentStep, TeamPlayPillar, GameProfile } from '../../src/types/resources';
import { theme, TIER_COLORS } from '../../src/constants/theme';
import { drillPresetService, DrillPreset } from '../../src/services/drillPresetService';
import gameProfile from '../../profiles/logistics_v1.json';

const TALENT_TIERS: TalentTier[] = ['Fastest', 'Fast', 'Average', 'Normal', 'Slow'];
const TALENT_LABEL: Record<TalentTier, string> = {
  Fastest: 'Fastest ×1.5', Fast: 'Fast ×1.25', Average: 'Average ×1.1', Normal: 'Normal ×1.0', Slow: 'Slow ×0.7',
};
const TALENT_INFO = 'Training rate multiplier — how quickly this player gains stats per session.\n\nFastest ×1.5 — learns 50% faster than normal\nFast ×1.25 — learns 25% faster\nAverage ×1.1 — learns 10% faster\nNormal ×1.0 — standard rate\nSlow ×0.7 — learns 30% slower\n\nDetected automatically from player card scan. Age reduces training rate separately.';
const DRILL_LEVELS: DrillLevel[] = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'];
const TIER_ORDER: TierName[] = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
const _profile = gameProfile as unknown as GameProfile;
const TIER_ADDITIONS: Record<TierName, number> = _profile.stageMetricAdditions as Record<TierName, number>;
const TIER_INCREMENTS: Record<TierName, number> = _profile.stageMetricIncrements as Record<TierName, number>;
const TIER_COSTS: Record<TierName, number> = _profile.stagePointsRequired as Record<TierName, number>;
const DRILL_NAMES = DRILL_LIST.map(d => d.name);

function drillTypeColor(name: string, t: typeof theme): string {
  const d = DRILL_LIST.find(dl => dl.name === name);
  if (d?.type === 'Attack')     return t.steelLight;
  if (d?.type === 'Defence')    return '#86c5d6';
  if (d?.type === 'Possession') return '#a78bfa';
  return t.hot; // Physical
}
const TEAM_PLAY_PILLARS: TeamPlayPillar[] = ['attack', 'defence', 'possession', 'condition'];

type Section = 'drills' | 'resources' | 'tier' | 'teamplay';

function newDrill(): DrillSession {
  return { drillName: 'Touch Training', sessionCount: 6, drillLevel: 'Very Easy' };
}

function StepRail({ steps }: { steps: InvestmentStep[] }) {
  return (
    <View style={{ paddingLeft: 22, position: 'relative' }}>
      <View style={{ position: 'absolute', left: 6, top: 8, bottom: 8, width: 1, backgroundColor: theme.hairline2 }} />
      {steps.map((s, i) => {
        const accent = s.action === 'drill' ? theme.steelLight : s.action === 'tier' ? theme.hot : theme.pos;
        const gain = s.ovrAfter - s.ovrBefore;
        return (
          <View key={i} style={{ position: 'relative', marginBottom: 8 }}>
            <View style={{ position: 'absolute', left: -19, top: 7, width: 13, height: 13, borderWidth: 1, borderColor: accent, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 5, height: 5, backgroundColor: accent }} />
            </View>
            <View style={{ borderWidth: 1, borderColor: theme.hairline2, backgroundColor: theme.surface, padding: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <MonoLabel size={9} color={accent}>{s.action.toUpperCase()}</MonoLabel>
                  <Text style={{ color: theme.inkGhost, fontSize: 11 }}>·</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.ink, fontFamily: theme.display, flex: 1 }} numberOfLines={1}>{s.description}</Text>
                </View>
                {s.resourcesUsed && <MonoLabel size={10} style={{ letterSpacing: 0.4 }}>{s.resourcesUsed}</MonoLabel>}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <MonoLabel size={10}>{s.ovrBefore.toFixed(1)} → {s.ovrAfter.toFixed(1)}</MonoLabel>
                <Text style={{ fontFamily: theme.display, fontSize: 16, fontWeight: '600', color: gain > 0 ? theme.pos : theme.inkMuted, marginTop: 2, letterSpacing: -0.3 }}>{gain > 0 ? '+' : ''}{gain.toFixed(1)}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function PlanScreen() {
  const { squad } = useSquad();
  const manager = useManager();
  const selectedId = manager.selectedPlayerId;
  const setSelectedId = (id: string | null) => { manager.setSelectedPlayerId(id); invalidate(); };
  const [drillRows, setDrillRows] = useState<DrillSession[]>([]);
  const [talent, setTalent] = useState<TalentTier>('Normal');
  const [drillLevel, setDrillLevel] = useState<DrillLevel>('Medium');
  const [twoxAd, setTwoxAd] = useState(false);
  const [style, setStyle] = useState<ManagerStyle>('FTP');
  const [restorers, setRestorers] = useState(0);
  const [isPremiumSponsor, setIsPremiumSponsor] = useState(false);
  const [matchAdvisorActive, setMatchAdvisorActive] = useState(false);
  const [targetTier, setTargetTier] = useState<TierName | null>(null);
  const [tierPointInputs, setTierPointInputs] = useState<Partial<Record<TierName, string>>>(() =>
    Object.fromEntries(TIER_ORDER.map(t => [t, manager.tierPoints[t] != null ? String(manager.tierPoints[t]) : '']))
  );
  const [section, setSection] = useState<Section>('drills');
  const [plan, setPlan] = useState<InvestmentPlan | null>(null);
  const [savedPresets, setSavedPresets] = useState<DrillPreset[]>([]);
  const [fixtureHours, setFixtureHours] = useState('');
  const [fixtureCooldown, setFixtureCooldown] = useState('');
  const [teamPlayInputs, setTeamPlayInputs] = useState<Partial<Record<TeamPlayPillar, string>>>({});

  const selectedPlayer = squad.find(p => p.id === selectedId) ?? (squad.length === 1 ? squad[0] : null);

  function invalidate() { setPlan(null); }

  // Sync talent from player card whenever the selected player changes
  useEffect(() => {
    if (selectedPlayer) setTalent(selectedPlayer.talent);
  }, [selectedPlayer?.id]);

  // Invalidate projection when player changes from another tab
  useEffect(() => { setPlan(null); }, [selectedId]);

  // Reload presets whenever this tab comes into focus (catches saves made on the Drills tab)
  useFocusEffect(useCallback(() => { setSavedPresets(drillPresetService.getAll()); }, []));

  const fixtureWindow = useMemo(() => {
    const h = parseFloat(fixtureHours);
    const c = parseInt(fixtureCooldown, 10);
    if (!h || !c || c <= 0) return null;
    return calculateFixtureCycles(h, c);
  }, [fixtureHours, fixtureCooldown]);

  const teamPlayPlan = useMemo(() => {
    const pillars = Object.fromEntries(
      TEAM_PLAY_PILLARS.map(p => [p, parseInt(teamPlayInputs[p] ?? '0', 10) || 0])
    ) as Partial<Record<TeamPlayPillar, number>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return calculateTeamPlayPlan(pillars, matchAdvisorActive, gameProfile as any);
  }, [teamPlayInputs, matchAdvisorActive]);

  const restorersBridge = useMemo(() => {
    if (!fixtureWindow || restorers === 0) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return calculateRestorersBridge(restorers, fixtureWindow.cycles, gameProfile as any);
  }, [fixtureWindow, restorers]);

  function applyFixtureCycles() {
    if (!fixtureWindow || fixtureWindow.cycles <= 0) return;
    setDrillRows(rows => rows.map(r => ({ ...r, sessionCount: fixtureWindow.cycles })));
    invalidate();
  }

  function getBestAffordableTier(currentTier: TierName | undefined): TierName | null {
    const ALL_TIERS: TierName[] = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
    const fromIdx = Math.max(0, ALL_TIERS.indexOf((currentTier ?? 'T0') as TierName));
    let best: TierName | null = null;
    for (let i = fromIdx + 1; i < ALL_TIERS.length; i++) {
      const t = ALL_TIERS[i];
      const have = parseInt(tierPointInputs[t] ?? '0', 10) || 0;
      if (have >= TIER_COSTS[t]) {
        best = t;
      } else {
        break; // tiers must be bought in sequence — stop at first unaffordable
      }
    }
    return best;
  }

  function project() {
    if (!selectedPlayer) return;
    const tierPoints = Object.fromEntries(Object.entries(tierPointInputs).map(([k, v]) => [k, parseInt(v ?? '0', 10) || 0])) as Partial<Record<TierName, number>>;
    const resolvedTier = targetTier ?? getBestAffordableTier(selectedPlayer.tier as TierName);
    const managerProfile = {
      style,
      tierPoints,
      restorers, isPremiumSponsor, twoxAdActive: twoxAd, talentTier: talent, drillLevel,
      matchAdvisorActive,
      teamPlayPillars: Object.fromEntries(
        TEAM_PLAY_PILLARS.map(p => [p, parseInt(teamPlayInputs[p] ?? '0', 10) || 0])
      ) as Partial<Record<TeamPlayPillar, number>>,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setPlan(planPlayerInvestment(selectedPlayer, managerProfile, drillRows, gameProfile as any, resolvedTier));
  }

  // When all stat boxes are filled, computed OVR takes precedence over stored overall.
  const baseOvr = useMemo(() => {
    if (!selectedPlayer || Object.keys(selectedPlayer.stats).length === 0) return selectedPlayer?.overall ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return computeOvrFromStats(selectedPlayer, gameProfile as any);
  }, [selectedPlayer]);

  const engineGain = plan ? Number(((plan.finalOvr ?? plan.finalCci ?? 0) - (plan.player?.currentOvr ?? plan.asset?.currentCci ?? 0)).toFixed(1)) : 0;
  const displayFrom = baseOvr;
  const displayTo = plan ? Number((baseOvr + engineGain).toFixed(1)) : baseOvr;

  if (squad.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <TabBackground tab="plan" />
        <AppHeader />
        <View style={{ padding: 60, alignItems: 'center' }}>
          <MonoLabel color={theme.steelLight} style={{ marginBottom: 12 }}>NO ASSET SELECTED</MonoLabel>
          <Text style={{ fontSize: 18, color: theme.ink, fontFamily: theme.display, marginBottom: 18 }}>Add a player to begin planning.</Text>
          <Pressable onPress={() => router.push('/player/new')} style={{ backgroundColor: theme.ink, paddingHorizontal: 22, paddingVertical: 12 }}>
            <Text style={{ fontFamily: theme.mono, fontSize: 11, letterSpacing: 2, fontWeight: '600', color: theme.bg }}>＋ ADD PLAYER</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <TabBackground tab="plan" />
      <AppHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {squad.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: theme.hairline }} contentContainerStyle={{ paddingLeft: 8 }}>
            {squad.map(p => {
              const sel = p.id === selectedId;
              return (
                <Pressable key={p.id} onPress={() => setSelectedId(p.id)} style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: sel ? theme.steelLight : 'transparent', marginBottom: -1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <QualityMeter ovr={p.overall} size="sm" />
                  <View>
                    <Text style={{ fontSize: 12, color: sel ? theme.ink : theme.inkMuted, fontWeight: sel ? '600' : '400', fontFamily: theme.display, marginBottom: 2 }}>{p.name}</Text>
                    <MonoLabel size={8}>{p.overall} · {p.role[0]}</MonoLabel>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={{ padding: 14, paddingBottom: 0 }}>
          {selectedPlayer ? (
            <OvrMovement from={displayFrom} to={displayTo} gain={engineGain} name={selectedPlayer.name} age={selectedPlayer.age} tier={selectedPlayer.tier ?? 'None'} />
          ) : (
            <View style={{ borderWidth: 1, borderColor: theme.hairline2, padding: 24, alignItems: 'center' }}>
              <MonoLabel color={theme.steelLight}>SELECT A SUBJECT ABOVE</MonoLabel>
            </View>
          )}
        </View>

        {plan && plan.steps.length > 0 && (
          <View style={{ padding: 18, paddingBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <MonoLabel color={theme.steelLight}>EXECUTION SEQUENCE</MonoLabel>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.hairline }} />
              <MonoLabel>{plan.steps.length} STEPS</MonoLabel>
            </View>
            <StepRail steps={plan.steps} />
            {plan.warnings?.map((w, i) => (
              <View key={i} style={{ marginTop: 6, padding: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.neg + '55', backgroundColor: 'rgba(196,117,106,0.08)', flexDirection: 'row', gap: 8 }}>
                <MonoLabel size={10} color={theme.neg}>WARN</MonoLabel>
                <Text style={{ fontSize: 11, color: theme.inkSec, lineHeight: 16, flex: 1 }}>{w}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ marginVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.hairline2 }} />
          <MonoLabel size={8} color={theme.inkGhost}>PROJECTION OUTPUT</MonoLabel>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.hairline2 }} />
        </View>

        <View style={{ padding: 16, paddingBottom: 0 }}>

          {/* Section tab bar — 4 tabs */}
          <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: theme.hairline2, marginBottom: 14 }}>
            {(['drills', 'resources', 'tier', 'teamplay'] as Section[]).map((s, i) => {
              const active = section === s;
              return (
                <Pressable key={s} onPress={() => setSection(s)} style={{
                  flex: 1, paddingVertical: 11, alignItems: 'center',
                  backgroundColor: active ? theme.ink : theme.surface,
                  borderRightWidth: i < 3 ? 1 : 0, borderRightColor: theme.hairline2,
                }}>
                  <Text style={{ fontFamily: theme.mono, fontSize: 10, letterSpacing: 1.4, fontWeight: '700', color: active ? theme.bg : theme.inkSec, textTransform: 'uppercase' }}>{s}</Text>
                </Pressable>
              );
            })}
          </View>

          {section === 'drills' && (
            <>
              {/* TALENT card */}
              <View style={{ borderWidth: 1, borderColor: theme.hairline2, marginBottom: 10 }}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.hairline2, backgroundColor: theme.surface2, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 3, height: 12, backgroundColor: theme.steelLight, marginRight: 8 }} />
                  <MonoLabel size={10} color={theme.steelLight}>TRAINING RATE</MonoLabel>
                  <Pressable onPress={() => Alert.alert('Training Rate', TALENT_INFO)} style={{ marginLeft: 8, width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: theme.steelLight, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: theme.mono, fontSize: 9, color: theme.steelLight }}>?</Text>
                  </Pressable>
                </View>
                <View style={{ padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {TALENT_TIERS.map(t => <Chip key={t} active={talent === t} onPress={() => { setTalent(t); invalidate(); }}>{TALENT_LABEL[t]}</Chip>)}
                </View>
              </View>

              {/* 2× AD toggle */}
              <Pressable onPress={() => { setTwoxAd(v => !v); invalidate(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: twoxAd ? theme.surface2 : theme.surface, borderWidth: 1, borderColor: twoxAd ? theme.hot : theme.hairline2, padding: 12, paddingHorizontal: 14, marginBottom: 10 }}>
                <View style={{ width: 16, height: 16, backgroundColor: twoxAd ? theme.hot : 'transparent', borderWidth: 1, borderColor: twoxAd ? theme.hot : theme.hairline3 }} />
                <Text style={{ fontFamily: theme.mono, fontSize: 11, letterSpacing: 1.4, fontWeight: '700', color: twoxAd ? theme.hot : theme.ink, flex: 1 }}>2× AD MULTIPLIER</Text>
                <Text style={{ fontFamily: theme.mono, fontSize: 11, fontWeight: '700', color: twoxAd ? theme.hot : theme.inkSec }}>×2.00 XP</Text>
              </Pressable>

              {/* SESSIONS card */}
              <View style={{ borderWidth: 1, borderColor: theme.hairline2, marginBottom: 10 }}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.hairline2, backgroundColor: theme.surface2, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 3, height: 12, backgroundColor: theme.steelLight, marginRight: 8 }} />
                  <MonoLabel size={10} color={theme.steelLight}>SESSIONS</MonoLabel>
                </View>
                {drillRows.map((row, idx) => (
                  <View key={idx} style={{ borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: theme.hairline2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.hairline }}>
                      <MonoLabel size={10} style={{ minWidth: 22 }}>{String(idx + 1).padStart(2, '0')}</MonoLabel>
                      <View style={{ width: 3, height: 14, backgroundColor: drillTypeColor(row.drillName, theme), marginRight: 2 }} />
                      <Text style={{ flex: 1, fontSize: 14, color: theme.ink, fontWeight: '700', fontFamily: theme.display }}>{row.drillName}</Text>
                      <Pressable onPress={() => setDrillRows(rows => rows.filter((_, i) => i !== idx))}>
                        <Text style={{ color: theme.neg, fontSize: 16, paddingHorizontal: 6 }}>×</Text>
                      </Pressable>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={{ flexDirection: 'row', gap: 5, padding: 8, paddingHorizontal: 10 }}>
                      {DRILL_NAMES.map(name => (
                        <Chip key={name} size="sm" active={row.drillName === name} onPress={() => { setDrillRows(rows => rows.map((r, i) => i === idx ? { ...r, drillName: name } : r)); invalidate(); }}>{name}</Chip>
                      ))}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.hairline2 }}>
                      <MonoLabel size={10}>SESSIONS</MonoLabel>
                      <TextInput
                        keyboardType="numeric"
                        value={row.sessionCount === 0 ? '' : String(row.sessionCount)}
                        onChangeText={v => { setDrillRows(rows => rows.map((r, i) => i === idx ? { ...r, sessionCount: parseInt(v, 10) || 0 } : r)); invalidate(); }}
                        placeholder="0"
                        placeholderTextColor={theme.inkGhost}
                        style={{ fontFamily: theme.mono, fontSize: 22, fontWeight: '700', color: theme.ink, minWidth: 60, textAlign: 'right' }}
                      />
                    </View>
                  </View>
                ))}
                <Pressable onPress={() => setDrillRows(rows => [...rows, newDrill()])} style={{ borderTopWidth: 1, borderTopColor: theme.hairline2, padding: 12, alignItems: 'center', backgroundColor: theme.surface }}>
                  <Text style={{ fontFamily: theme.mono, fontSize: 11, letterSpacing: 1.6, fontWeight: '700', color: theme.steelLight }}>＋  ADD DRILL</Text>
                </Pressable>
              </View>

              {/* SAVED PRESETS */}
              <View style={{ borderWidth: 1, borderColor: theme.hairline2, marginBottom: 10 }}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.hairline2, backgroundColor: theme.surface2, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 3, height: 12, backgroundColor: theme.hot, marginRight: 8 }} />
                  <MonoLabel size={10} color={theme.steelLight}>SAVED PRESETS</MonoLabel>
                  {savedPresets.length > 0 && <MonoLabel size={9} color={theme.inkGhost} style={{ marginLeft: 8 }}>{savedPresets.length}</MonoLabel>}
                </View>
                {savedPresets.length === 0 ? (
                  <View style={{ paddingVertical: 14, paddingHorizontal: 14 }}>
                    <MonoLabel size={10} color={theme.inkGhost}>NO SAVED PRESETS — CREATE FROM DRILLS TAB</MonoLabel>
                  </View>
                ) : (
                  savedPresets.map((preset, idx) => (
                    <View key={preset.id} style={{ borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: theme.hairline2, padding: 12, paddingHorizontal: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: theme.ink, fontFamily: theme.display }}>{preset.name}</Text>
                        <Pressable onPress={() => {
                          const newRows: DrillSession[] = preset.drillNames.map(name => {
                            const d = DRILL_LIST.find(dl => dl.name === name);
                            return { drillName: name, sessionCount: 6, drillLevel: (d?.intensity ?? 'Very Easy') as DrillLevel };
                          });
                          setDrillRows(newRows);
                          invalidate();
                        }} style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: theme.ink, marginRight: 6 }}>
                          <Text style={{ fontFamily: theme.mono, fontSize: 9, letterSpacing: 1.2, fontWeight: '700', color: theme.bg }}>LOAD</Text>
                        </Pressable>
                        <Pressable onPress={() => {
                          drillPresetService.delete(preset.id);
                          setSavedPresets(drillPresetService.getAll());
                        }} style={{ paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: theme.neg + '66' }}>
                          <Text style={{ fontFamily: theme.mono, fontSize: 10, color: theme.neg }}>×</Text>
                        </Pressable>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                        {preset.drillNames.map(n => (
                          <View key={n} style={{ paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: drillTypeColor(n, theme) + '88' }}>
                            <Text style={{ fontFamily: theme.mono, fontSize: 9, letterSpacing: 0.8, color: drillTypeColor(n, theme) }}>{n}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* FIXTURE WINDOW card */}
              <View style={{ borderWidth: 1, borderColor: fixtureWindow ? theme.steelLight + '88' : theme.hairline2, marginBottom: 10 }}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.hairline2, backgroundColor: theme.surface2, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 3, height: 12, backgroundColor: theme.steelLight, marginRight: 8 }} />
                  <MonoLabel size={10} color={theme.steelLight}>FIXTURE WINDOW</MonoLabel>
                  <View style={{ flex: 1 }} />
                  <MonoLabel size={9} color={theme.inkGhost}>UNTIL NEXT GAME</MonoLabel>
                </View>
                <View style={{ padding: 12, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <MonoLabel size={10} style={{ width: 88 }}>HOURS LEFT</MonoLabel>
                    <TextInput
                      keyboardType="numeric"
                      value={fixtureHours}
                      onChangeText={v => setFixtureHours(v)}
                      placeholder="24"
                      placeholderTextColor={theme.inkGhost}
                      style={{ flex: 1, backgroundColor: theme.surface3, color: theme.ink, fontFamily: theme.mono, fontSize: 13, fontWeight: '700', padding: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.hairline2 }}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <MonoLabel size={10} style={{ width: 88 }}>COOLDOWN</MonoLabel>
                    <TextInput
                      keyboardType="numeric"
                      value={fixtureCooldown}
                      onChangeText={v => setFixtureCooldown(v)}
                      placeholder="60"
                      placeholderTextColor={theme.inkGhost}
                      style={{ flex: 1, backgroundColor: theme.surface3, color: theme.ink, fontFamily: theme.mono, fontSize: 13, fontWeight: '700', padding: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.hairline2 }}
                    />
                    <MonoLabel size={9} style={{ width: 24 }}>MIN</MonoLabel>
                  </View>
                  {fixtureWindow && (
                    <View style={{ backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.hairline2, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <MonoLabel size={10}>CYCLES AVAILABLE</MonoLabel>
                      <Text style={{ fontFamily: theme.mono, fontSize: 24, fontWeight: '700', color: fixtureWindow.cycles > 0 ? theme.ink : theme.inkGhost }}>{fixtureWindow.cycles}</Text>
                    </View>
                  )}
                  {fixtureWindow && fixtureWindow.cycles > 0 && (
                    <Pressable onPress={applyFixtureCycles} style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.steelLight, padding: 10, alignItems: 'center' }}>
                      <Text style={{ fontFamily: theme.mono, fontSize: 11, letterSpacing: 1.4, fontWeight: '700', color: theme.steelLight }}>APPLY — SET {fixtureWindow.cycles} SESSIONS PER DRILL</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </>
          )}

          {section === 'resources' && (
            <>
              {/* STYLE card */}
              <View style={{ borderWidth: 1, borderColor: theme.hairline2, marginBottom: 10 }}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.hairline2, backgroundColor: theme.surface2, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 3, height: 12, backgroundColor: theme.steelLight, marginRight: 8 }} />
                  <MonoLabel size={10} color={theme.steelLight}>MANAGER STYLE</MonoLabel>
                </View>
                <View style={{ padding: 12, flexDirection: 'row', gap: 6 }}>
                  {(['FTP', 'Hybrid', 'PTW'] as ManagerStyle[]).map(s => <Chip key={s} active={style === s} onPress={() => { setStyle(s); invalidate(); }}>{s}</Chip>)}
                </View>
              </View>

              {/* RESTORERS card */}
              <View style={{ borderWidth: 1, borderColor: theme.hairline2, marginBottom: 10 }}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.hairline2, backgroundColor: theme.surface2, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 3, height: 12, backgroundColor: theme.pos, marginRight: 8 }} />
                  <MonoLabel size={10} color={theme.steelLight}>RESTORERS</MonoLabel>
                  <View style={{ flex: 1 }} />
                  <MonoLabel size={10} color={theme.pos}>+{Math.min(100, restorers * 15)}% COND</MonoLabel>
                </View>
                <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
                  <TextInput
                    keyboardType="numeric"
                    value={restorers === 0 ? '' : String(restorers)}
                    onChangeText={v => { setRestorers(parseInt(v, 10) || 0); invalidate(); }}
                    placeholder="0"
                    placeholderTextColor={theme.inkGhost}
                    style={{ fontFamily: theme.mono, fontSize: 28, fontWeight: '700', color: theme.ink, textAlign: 'center' }}
                  />
                </View>
              </View>

              {/* RESTORERS BRIDGE — shown when fixture window is set and restorers > 0 */}
              {restorersBridge && (
                <View style={{ borderWidth: 1, borderColor: restorersBridge.worthwhile ? theme.pos + '88' : theme.hairline2, marginBottom: 10 }}>
                  <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.hairline2, backgroundColor: theme.surface2, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 3, height: 12, backgroundColor: theme.pos, marginRight: 8 }} />
                    <MonoLabel size={10} color={theme.steelLight}>RESTORERS BRIDGE</MonoLabel>
                    <View style={{ flex: 1 }} />
                    {restorersBridge.worthwhile && <MonoLabel size={9} color={theme.pos}>+{restorersBridge.additionalCycles} CYCLES</MonoLabel>}
                  </View>
                  <View style={{ padding: 12 }}>
                    <Text style={{ fontSize: 12, color: theme.inkSec, lineHeight: 18 }}>{restorersBridge.note}</Text>
                  </View>
                </View>
              )}

              {/* PREMIUM SPONSOR toggle */}
              <Pressable onPress={() => { setIsPremiumSponsor(v => !v); invalidate(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: isPremiumSponsor ? theme.surface2 : theme.surface, borderWidth: 1, borderColor: isPremiumSponsor ? theme.hot : theme.hairline2, padding: 14, paddingHorizontal: 14, marginBottom: 8 }}>
                <View style={{ width: 16, height: 16, backgroundColor: isPremiumSponsor ? theme.hot : 'transparent', borderWidth: 1, borderColor: isPremiumSponsor ? theme.hot : theme.hairline3 }} />
                <Text style={{ fontFamily: theme.mono, fontSize: 11, letterSpacing: 1.4, fontWeight: '700', color: isPremiumSponsor ? theme.hot : theme.ink }}>PREMIUM SPONSOR</Text>
              </Pressable>

              {/* MATCH ADVISOR toggle */}
              <Pressable onPress={() => { setMatchAdvisorActive(v => !v); invalidate(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: matchAdvisorActive ? theme.surface2 : theme.surface, borderWidth: 1, borderColor: matchAdvisorActive ? theme.hot : theme.hairline2, padding: 14, paddingHorizontal: 14 }}>
                <View style={{ width: 16, height: 16, backgroundColor: matchAdvisorActive ? theme.hot : 'transparent', borderWidth: 1, borderColor: matchAdvisorActive ? theme.hot : theme.hairline3 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: theme.mono, fontSize: 11, letterSpacing: 1.4, fontWeight: '700', color: matchAdvisorActive ? theme.hot : theme.ink }}>MATCH ADVISOR</Text>
                  <Text style={{ fontFamily: theme.mono, fontSize: 9, color: theme.inkSec, marginTop: 2, letterSpacing: 0.5 }}>PREMIUM · ALL DRILLS ADVANCE TEAM PLAY</Text>
                </View>
              </Pressable>
            </>
          )}

          {section === 'tier' && (
            <>
              <View style={{ borderWidth: 1, borderColor: theme.hairline2, marginBottom: 10 }}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.hairline2, backgroundColor: theme.surface2, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 3, height: 12, backgroundColor: theme.hot, marginRight: 8 }} />
                  <MonoLabel size={10} color={theme.steelLight}>TIER UPGRADE</MonoLabel>
                </View>
                {TIER_ORDER.map((t, idx) => {
                  const cost = TIER_COSTS[t];
                  const have = parseInt(tierPointInputs[t] ?? '0', 10) || 0;
                  const canAfford = have >= cost;
                  const sel = targetTier === t;
                  const c = TIER_COLORS[t];
                  return (
                    <Pressable key={t} onPress={() => { setTargetTier(sel ? null : t); invalidate(); }} style={{ flexDirection: 'row', alignItems: 'stretch', backgroundColor: sel ? theme.surface2 : 'transparent', borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: theme.hairline2, borderLeftWidth: sel ? 3 : 0, borderLeftColor: c }}>
                      <View style={{ flex: 1, padding: 12, paddingHorizontal: 14 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <Text style={{ fontFamily: theme.display, fontSize: 15, fontWeight: '700', color: c, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t}</Text>
                          <MonoLabel size={9} color={theme.inkSec}>+{TIER_INCREMENTS[t]} / WHITE STAT</MonoLabel>
                          <View style={{ flex: 1 }} />
                          <Text style={{ fontSize: 20, fontWeight: '700', color: canAfford ? theme.pos : theme.inkGhost }}>{canAfford ? '✓' : '·'}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <MonoLabel size={9} color={theme.inkSec}>NEED {cost} · HAVE</MonoLabel>
                          <TextInput keyboardType="numeric" value={tierPointInputs[t] ?? ''} onChangeText={v => {
                              const clean = v.replace(/[^0-9]/g, '');
                              setTierPointInputs(prev => ({ ...prev, [t]: clean }));
                              manager.setTierPoints({ ...manager.tierPoints, [t]: parseInt(clean, 10) || 0 });
                              invalidate();
                            }} placeholder="0" placeholderTextColor={theme.inkGhost}
                            style={{ backgroundColor: theme.surface3, color: theme.ink, fontFamily: theme.mono, fontSize: 13, fontWeight: '700', padding: 5, paddingHorizontal: 10, minWidth: 60, borderWidth: 1, borderColor: theme.hairline2 }} />
                          {!canAfford && have > 0 && <MonoLabel size={9} color={theme.neg}>{cost - have} SHORT</MonoLabel>}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {section === 'teamplay' && (
            <>
              {/* PILLARS card */}
              <View style={{ borderWidth: 1, borderColor: theme.hairline2, marginBottom: 10 }}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.hairline2, backgroundColor: theme.surface2, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 3, height: 12, backgroundColor: theme.steelLight, marginRight: 8 }} />
                  <MonoLabel size={10} color={theme.steelLight}>TEAM PLAY PILLARS</MonoLabel>
                  <View style={{ flex: 1 }} />
                  <MonoLabel size={9} color={theme.inkGhost}>CURRENT SCORE</MonoLabel>
                </View>
                {TEAM_PLAY_PILLARS.map((pillar, idx) => (
                  <View key={pillar} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingHorizontal: 14, borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: theme.hairline }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.ink, fontFamily: theme.display, flex: 1, textTransform: 'capitalize' }}>{pillar}</Text>
                    <TextInput
                      keyboardType="numeric"
                      value={teamPlayInputs[pillar] ?? ''}
                      onChangeText={v => setTeamPlayInputs(prev => ({ ...prev, [pillar]: v }))}
                      placeholder="0"
                      placeholderTextColor={theme.inkGhost}
                      style={{ backgroundColor: theme.surface3, color: theme.ink, fontFamily: theme.mono, fontSize: 14, fontWeight: '700', padding: 8, paddingHorizontal: 12, minWidth: 72, borderWidth: 1, borderColor: theme.hairline2, textAlign: 'center' }}
                    />
                  </View>
                ))}
              </View>

              {/* TEAM PLAY PLAN card */}
              <View style={{ borderWidth: 1, borderColor: matchAdvisorActive ? theme.hot + '88' : theme.hairline2, marginBottom: 10 }}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.hairline2, backgroundColor: theme.surface2, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 3, height: 12, backgroundColor: matchAdvisorActive ? theme.hot : theme.steelLight, marginRight: 8 }} />
                  <MonoLabel size={10} color={theme.steelLight}>MAINTENANCE PLAN</MonoLabel>
                  {matchAdvisorActive && (
                    <>
                      <View style={{ flex: 1 }} />
                      <MonoLabel size={9} color={theme.hot}>COACH ACTIVE</MonoLabel>
                    </>
                  )}
                </View>
                <View style={{ padding: 12, gap: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <MonoLabel size={10}>DAILY DECAY</MonoLabel>
                    <MonoLabel size={11} color={theme.neg}>−{teamPlayPlan.decayPerDay} / PILLAR / DAY</MonoLabel>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <MonoLabel size={10}>FREE DRILLS NEEDED</MonoLabel>
                    <MonoLabel size={11} color={teamPlayPlan.freeDrillsNeeded === 0 ? theme.pos : theme.ink}>
                      {teamPlayPlan.freeDrillsNeeded === 0 ? 'COVERED BY COACH' : `${teamPlayPlan.freeDrillsNeeded} ADS / DAY`}
                    </MonoLabel>
                  </View>
                  <View style={{ height: 1, backgroundColor: theme.hairline }} />
                  <Text style={{ fontSize: 12, color: theme.inkSec, lineHeight: 18 }}>{teamPlayPlan.recommendation}</Text>
                </View>
              </View>

              {fixtureWindow && restorersBridge && (
                <View style={{ borderWidth: 1, borderColor: restorersBridge.worthwhile ? theme.pos + '88' : theme.hairline2, marginBottom: 10 }}>
                  <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.hairline2, backgroundColor: theme.surface2, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 3, height: 12, backgroundColor: theme.pos, marginRight: 8 }} />
                    <MonoLabel size={10} color={theme.steelLight}>RESTORERS BRIDGE</MonoLabel>
                    <View style={{ flex: 1 }} />
                    {restorersBridge.worthwhile && <MonoLabel size={9} color={theme.pos}>+{restorersBridge.additionalCycles} EXTRA CYCLES</MonoLabel>}
                  </View>
                  <View style={{ padding: 12 }}>
                    <Text style={{ fontSize: 12, color: theme.inkSec, lineHeight: 18 }}>{restorersBridge.note}</Text>
                  </View>
                </View>
              )}
            </>
          )}

          <Pressable onPress={project} disabled={!selectedPlayer} style={{ marginTop: 16, backgroundColor: selectedPlayer ? theme.ink : theme.surface2, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: selectedPlayer ? theme.ink : theme.hairline2 }}>
            <Text style={{ fontFamily: theme.mono, fontSize: 12, letterSpacing: 2.5, fontWeight: '700', color: selectedPlayer ? theme.bg : theme.inkGhost }}>
              {selectedPlayer ? 'RUN PROJECTION' : 'SELECT A SUBJECT'}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.push('/compare')} style={{ marginTop: 10, borderWidth: 1, borderColor: theme.hairline3, paddingVertical: 13, alignItems: 'center' }}>
            <Text style={{ fontFamily: theme.mono, fontSize: 11, letterSpacing: 2, fontWeight: '700', color: theme.steelLight }}>
              HEAD-TO-HEAD COMPARISON →
            </Text>
          </Pressable>
        </View>
      </ScrollView>

    </View>
  );
}
