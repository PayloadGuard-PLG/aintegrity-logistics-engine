import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { useSquad } from '../../src/hooks/useSquad';
import { useManager } from '../../src/context/ManagerContext';
import { AppHeader } from '../../src/components/AppHeader';
import { MonoLabel } from '../../src/components/atoms/MonoLabel';
import { Chip } from '../../src/components/atoms/Chip';
import { QualityMeter } from '../../src/components/atoms/QualityMeter';
import { NewRoleBar } from '../../src/components/atoms/NewRoleBar';
import { theme, TIER_COLORS } from '../../src/constants/theme';
import { TabBackground } from '../../src/components/TabBackground';
import { isWhiteStat, getWhiteStatKeys } from '../../src/utils/metricWeights';
import { estimateStatGainPct, applyTierBonusToStats, projectSeasonDecay } from '../../src/logic/xpEngine';
import { playerService } from '../../src/services/assetService';
import { computeOvrFromStats, computeOvrWithPadding } from '../../src/logic/ovrProjector';
import gameProfileJson from '../../profiles/logistics_v1.json';
import { TalentTier, TierName, GameProfile } from '../../src/types/resources';
import { coachHistoryService, type CoachHistoryEntry } from '../../src/services/coachHistoryService';
import { drillPlanHistoryService, type DrillPlanEntry } from '../../src/services/drillPlanHistoryService';
import { DRILL_LIST } from '../../src/database/drillDatabase';

const profile = gameProfileJson as unknown as GameProfile;
const TALENT_LABEL: Record<TalentTier, string> = { Fastest: '×1.5', Fast: '×1.25', Average: '×1.1', Normal: '×1.0', Slow: '×0.7' };
const TIER_ORDER: TierName[] = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
const TIER_COSTS: Record<TierName, number> = profile.stagePointsRequired as Record<TierName, number>;
const TIER_ADDITIONS: Record<TierName, number> = profile.stageMetricAdditions as Record<TierName, number>;
const CONDITION_PER_RESTORER: number = profile.readinessPerRestoration;
const CONDITION_PER_RECOVERY = 25;

const DRILL_AMBER = '#D97706';

type StepResult = {
  label: string;
  ovrBefore: number;
  ovrAfter: number;
  detail?: string;
  color?: string;
};

export default function ResultsScreen() {
  const { squad } = useSquad();
  const manager = useManager();
  const [twoxAd, setTwoxAd] = useState(false);
  const [selectedCoachIds, setSelectedCoachIds] = useState<Set<string>>(new Set());
  const [selectedDrillPlanIds, setSelectedDrillPlanIds] = useState<Set<string>>(new Set());
  const [excludedTiers, setExcludedTiers] = useState<Set<TierName>>(new Set());
  const [restorers, setRestorers] = useState('');
  const [restPacks, setRestPacks] = useState('');
  const [result, setResult] = useState<StepResult[] | null>(null);
  const [finalStats, setFinalStats] = useState<Record<string, number> | null>(null);
  const [seasonReset, setSeasonReset] = useState(false);
  const [levelsPromoted, setLevelsPromoted] = useState('1');
  const [coachHistory, setCoachHistory] = useState<CoachHistoryEntry[]>([]);
  const [drillPlanHistory, setDrillPlanHistory] = useState<DrillPlanEntry[]>([]);

  const player = squad.find(p => p.id === manager.selectedPlayerId) ?? (squad.length === 1 ? squad[0] : null);

  useEffect(() => {
    if (player) {
      setCoachHistory(coachHistoryService.getForPlayer(player.id));
      setDrillPlanHistory(drillPlanHistoryService.getForPlayer(player.id));
    } else {
      setCoachHistory([]);
      setDrillPlanHistory([]);
    }
  }, [player?.id]);

  const upgradableTiers = useMemo(() => {
    if (!player) return TIER_ORDER;
    const idx = TIER_ORDER.indexOf(player.tier as TierName);
    return TIER_ORDER.filter((_, i) => i > idx);
  }, [player]);

  const tierIncluded = useCallback((t: TierName): boolean => {
    const have = manager.tierPoints[t] ?? 0;
    return have >= TIER_COSTS[t] && !excludedTiers.has(t);
  }, [manager.tierPoints, excludedTiers]);

  function selectPlayer(id: string) {
    manager.setSelectedPlayerId(id);
    setSelectedCoachIds(new Set());
    setSelectedDrillPlanIds(new Set());
    setExcludedTiers(new Set());
    setSeasonReset(false);
    setResult(null);
    setFinalStats(null);
  }

  function toggleCoachSession(id: string) {
    setSelectedCoachIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else if (next.size < 5) { next.add(id); }
      return next;
    });
    setResult(null);
  }

  function toggleDrillPlan(id: string) {
    setSelectedDrillPlanIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else if (next.size < 10) { next.add(id); }
      return next;
    });
    setResult(null);
  }

  function runProjection() {
    if (!player) return;
    const steps: StepResult[] = [];
    let currentStats = { ...player.stats };
    let currentOvr = computeOvrFromStats(player, profile);
    const ovrBase = currentOvr;

    // 1. Drill plans (pushed from drills tab)
    for (const planId of selectedDrillPlanIds) {
      const plan = drillPlanHistory.find(p => p.id === planId);
      if (!plan || plan.cycles === 0) continue;
      const gainParts: string[] = [];

      for (const drillName of plan.drillNames) {
        const drill = DRILL_LIST.find(d => d.name === drillName);
        if (!drill) continue;
        const drillMult = (profile.cycleIntensityMultipliers as Record<string, number>)[drill.intensity] ?? 1.0;
        const budget = plan.cycles * profile.baseResourcesPerCycle * (profile.conditioningResourceFactor ?? 1.0) / drill.stats.length;
        for (const stat of drill.stats) {
          const from = currentStats[stat];
          if (from === undefined) continue;
          const isWhite = isWhiteStat(player.role, stat);
          const starsGained = Math.floor((currentOvr - ovrBase) / (profile.thresholdCciIncrement ?? 20));
          const gain = estimateStatGainPct(budget, from, player.age, starsGained, player.talent, isWhite, twoxAd, drillMult, profile);
          if (gain > 0) {
            currentStats[stat] = Math.min(from + gain, profile.metricCap);
            gainParts.push(`${stat} +${gain.toFixed(1)}`);
          }
        }
      }

      const ovrAfter = Number(computeOvrWithPadding(currentStats, player.overall, profile).toFixed(1));
      steps.push({
        label: `DRILL: ${plan.label}`,
        ovrBefore: currentOvr,
        ovrAfter,
        detail: gainParts.length > 0 ? gainParts.join(' · ') : 'no stat gains',
        color: DRILL_AMBER,
      });
      currentOvr = ovrAfter;
    }

    // 2. Coach sessions
    for (const coachId of selectedCoachIds) {
      const entry = coachHistory.find(e => e.id === coachId);
      if (!entry || entry.stats.length === 0 || entry.sessions === 0) continue;
      const drillMult = 1.0;
      const budget = entry.sessions * profile.baseResourcesPerCycle / entry.stats.length;
      const gainParts: string[] = [];

      for (const stat of entry.stats) {
        const from = currentStats[stat];
        if (from === undefined) continue;
        const isWhite = isWhiteStat(player.role, stat);
        const starsGained = Math.floor((currentOvr - ovrBase) / (profile.thresholdCciIncrement ?? 20));
        const gain = estimateStatGainPct(budget, from, player.age, starsGained, player.talent, isWhite, twoxAd, drillMult, profile);
        if (gain > 0) {
          currentStats[stat] = Math.min(from + gain, profile.metricCap);
          gainParts.push(`${stat} +${gain.toFixed(1)}`);
        }
      }

      const ovrAfter = Number(computeOvrWithPadding(currentStats, player.overall, profile).toFixed(1));
      steps.push({
        label: `COACH ×${entry.sessions} — ${entry.label}`,
        ovrBefore: currentOvr,
        ovrAfter,
        detail: gainParts.length > 0 ? gainParts.join(' · ') : 'no stat gains',
        color: theme.steelLight,
      });
      currentOvr = ovrAfter;
    }

    // 3. Tier upgrades
    {
      const whiteKeys = getWhiteStatKeys(player.role);
      let currentTier = player.tier as TierName;
      for (const t of TIER_ORDER) {
        if (!upgradableTiers.includes(t) || !tierIncluded(t)) continue;
        const increment = TIER_ADDITIONS[t] - (TIER_ADDITIONS[currentTier] ?? 0);
        const afterTier = applyTierBonusToStats(currentStats, whiteKeys, t, profile, currentTier);
        const ovrAfter = Number(computeOvrWithPadding(afterTier, player.overall, profile).toFixed(1));
        steps.push({
          label: `TIER → ${t.toUpperCase()} (+${increment} / WHITE STAT)`,
          ovrBefore: currentOvr,
          ovrAfter,
          detail: `${whiteKeys.length} white stats +${increment}, grey +0`,
          color: TIER_COLORS[t] ?? theme.hot,
        });
        currentStats = afterTier;
        currentOvr = ovrAfter;
        currentTier = t;
      }
    }

    // 4. Restorers (informational)
    const restorerCount = parseInt(restorers, 10) || 0;
    if (restorerCount > 0) {
      const condPct = Math.min(restorerCount * CONDITION_PER_RESTORER, 100);
      steps.push({ label: `RESTORERS ×${restorerCount} → +${condPct}% CONDITION`, ovrBefore: currentOvr, ovrAfter: currentOvr, detail: 'condition restore — no OVR change', color: theme.pos });
    }

    // 5. Recovery kits (informational)
    const recoveryCount = parseInt(restPacks, 10) || 0;
    if (recoveryCount > 0) {
      const condPct = Math.min(recoveryCount * CONDITION_PER_RECOVERY, 100);
      steps.push({ label: `RECOVERY KITS ×${recoveryCount} → +${condPct}% CONDITION`, ovrBefore: currentOvr, ovrAfter: currentOvr, detail: 'enables additional training sessions', color: theme.inkSec });
    }

    // 6. Season reset — flat −20 per stat per level promoted (confirmed from Grant T3 data)
    if (seasonReset) {
      const levels = parseInt(levelsPromoted, 10) || 1;
      const afterDecay = projectSeasonDecay(currentStats, levels, profile);
      const ovrAfter = Number(computeOvrWithPadding(afterDecay, player.overall, profile).toFixed(1));
      const dropPerStat = levels * (profile.periodicDegradationPerStage ?? 20);
      steps.push({
        label: `SEASON RESET · ${levels > 0 ? `PROMOTED +${levels}` : levels < 0 ? `RELEGATED ${levels}` : 'STAYED'}`,
        ovrBefore: currentOvr,
        ovrAfter,
        detail: `every stat ${levels > 0 ? '−' : '+'}${Math.abs(dropPerStat)} · white and grey alike`,
        color: levels > 0 ? theme.neg : theme.pos,
      });
      currentStats = afterDecay;
      currentOvr = ovrAfter;
    }

    setResult(steps);
    setFinalStats(currentStats);
  }

  const finalOvr = result ? result[result.length - 1]?.ovrAfter ?? null : null;
  const baseOvr = result ? result[0]?.ovrBefore ?? null : null;
  const totalGain = finalOvr != null && baseOvr != null ? Number((finalOvr - baseOvr).toFixed(1)) : null;
  const tiersIncluded = player ? TIER_ORDER.some(t => upgradableTiers.includes(t) && tierIncluded(t)) : false;
  const ready = player && (selectedDrillPlanIds.size > 0 || selectedCoachIds.size > 0 || tiersIncluded || seasonReset);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <TabBackground tab="results" />
      <AppHeader />
      <ScrollView contentContainerStyle={{ padding: 14, paddingHorizontal: 16, paddingBottom: 60 }}>

        {/* Player selector */}
        {squad.length > 1 && (
          <>
            <MonoLabel color={theme.steelLight} style={{ marginBottom: 8 }}>SUBJECT</MonoLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexDirection: 'row', gap: 5, paddingBottom: 14 }}>
              {[...squad].sort((a, b) => (a.id === player?.id ? -1 : b.id === player?.id ? 1 : 0)).map(p => (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <QualityMeter ovr={p.overall} size="sm" />
                  <Chip active={p.id === player?.id} onPress={() => selectPlayer(p.id)}>
                    {p.name}
                  </Chip>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {!player ? (
          <View style={{ padding: 32, borderWidth: 1, borderColor: theme.hairline, alignItems: 'center' }}>
            <MonoLabel color={theme.inkGhost}>ADD A PLAYER TO BEGIN</MonoLabel>
          </View>
        ) : (
          <>
            {/* Player info strip — current card state */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.hairline }}>
              <QualityMeter ovr={player.overall} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: theme.display, fontSize: 17, fontWeight: '700', color: theme.ink }}>{player.name}</Text>
                <MonoLabel size={9} color={theme.inkSec}>AGE {player.age} · {player.role.join(' / ')} · {player.tier ?? 'NO TIER'}</MonoLabel>
                {player.newRole && (
                  <NewRoleBar roleName={player.newRole} points={player.newRolePoints ?? 0} />
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: theme.display, fontSize: 24, fontWeight: '700', color: theme.ink }}>{player.overall}</Text>
                <MonoLabel size={8} color={theme.inkGhost}>OVR NOW</MonoLabel>
              </View>
            </View>

            {/* Talent + 2× ad */}
            <View style={{ borderWidth: 1, borderColor: theme.hairline2, padding: 12, marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <MonoLabel style={{ width: 56 }}>TALENT</MonoLabel>
                <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: theme.steelLight }}>
                  <Text style={{ fontFamily: theme.mono, fontSize: 10, letterSpacing: 1, color: theme.steelLight }}>
                    {TALENT_LABEL[player.talent] ?? player.talent}
                  </Text>
                </View>
                <MonoLabel size={8} color={theme.inkGhost}>FROM CARD</MonoLabel>
              </View>
              <Pressable onPress={() => { setTwoxAd(v => !v); setResult(null); setFinalStats(null); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: twoxAd ? theme.hot : theme.hairline2, padding: 8, backgroundColor: twoxAd ? theme.surface2 : 'transparent' }}>
                <View style={{ width: 12, height: 12, backgroundColor: twoxAd ? theme.hot : 'transparent', borderWidth: 1, borderColor: twoxAd ? theme.hot : theme.hairline3 }} />
                <Text style={{ fontFamily: theme.mono, fontSize: 10, letterSpacing: 1.2, color: twoxAd ? theme.hot : theme.inkSec }}>2× AD ACTIVE</Text>
                {twoxAd && <Text style={{ fontFamily: theme.mono, fontSize: 10, color: theme.hot, marginLeft: 'auto' }}>×2.0</Text>}
              </Pressable>
            </View>

            {/* ── DRILL PLANS ── */}
            <View style={{ borderWidth: 1, borderColor: theme.hairline2, marginBottom: 14 }}>
              <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.hairline2, backgroundColor: theme.surface2, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 3, height: 12, backgroundColor: DRILL_AMBER, marginRight: 8 }} />
                <MonoLabel size={10} color={theme.steelLight} style={{ flex: 1 }}>DRILL PLANS</MonoLabel>
                <MonoLabel size={8} color={theme.inkGhost}>
                  {selectedDrillPlanIds.size > 0 ? `${selectedDrillPlanIds.size} SELECTED · ` : ''}MAX 10
                </MonoLabel>
              </View>

              {drillPlanHistory.length === 0 ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <MonoLabel size={9} color={theme.inkGhost}>PUSH DRILL PLANS FROM DRILLS TAB</MonoLabel>
                </View>
              ) : (
                drillPlanHistory.map((plan, idx) => {
                  const sel = selectedDrillPlanIds.has(plan.id);
                  return (
                    <Pressable key={plan.id} onPress={() => toggleDrillPlan(plan.id)}
                      style={{ borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: theme.hairline2, padding: 12,
                        flexDirection: 'row', alignItems: 'center', gap: 10,
                        borderLeftWidth: sel ? 3 : 0, borderLeftColor: DRILL_AMBER,
                        backgroundColor: sel ? DRILL_AMBER + '12' : 'transparent' }}>
                      <View style={{ flex: 1 }}>
                        <MonoLabel size={9} color={sel ? theme.ink : theme.inkSec}>{plan.label}</MonoLabel>
                        <MonoLabel size={8} color={theme.inkGhost}>
                          {new Date(plan.timestamp).toLocaleDateString()} · ×{plan.cycles} CYCLES
                        </MonoLabel>
                      </View>
                      <MonoLabel size={9} color={sel ? DRILL_AMBER : theme.inkGhost}>
                        {sel ? '✓ ADDED' : 'TAP TO ADD'}
                      </MonoLabel>
                    </Pressable>
                  );
                })
              )}
            </View>

            {/* ── COACHING SESSIONS ── */}
            <View style={{ borderWidth: 1, borderColor: theme.hairline2, marginBottom: 14 }}>
              <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.hairline2, backgroundColor: theme.surface2, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 3, height: 12, backgroundColor: theme.steelLight, marginRight: 8 }} />
                <MonoLabel size={10} color={theme.steelLight} style={{ flex: 1 }}>COACHING SESSIONS</MonoLabel>
                <MonoLabel size={8} color={theme.inkGhost}>
                  {selectedCoachIds.size > 0 ? `${selectedCoachIds.size} SELECTED · ` : ''}MAX 5
                </MonoLabel>
              </View>

              {coachHistory.length === 0 ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <MonoLabel size={9} color={theme.inkGhost}>SCAN A COACH IN COACHES TAB FIRST</MonoLabel>
                </View>
              ) : (
                coachHistory.map((entry, idx) => {
                  const sel = selectedCoachIds.has(entry.id);
                  return (
                    <Pressable key={entry.id} onPress={() => toggleCoachSession(entry.id)}
                      style={{ borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: theme.hairline2, padding: 12,
                        flexDirection: 'row', alignItems: 'center', gap: 10,
                        borderLeftWidth: sel ? 3 : 0, borderLeftColor: theme.steelLight,
                        backgroundColor: sel ? theme.steelLight + '12' : 'transparent' }}>
                      <View style={{ flex: 1 }}>
                        <MonoLabel size={9} color={sel ? theme.ink : theme.inkSec}>{entry.label}</MonoLabel>
                        <MonoLabel size={8} color={theme.inkGhost}>
                          {new Date(entry.timestamp).toLocaleDateString()} · {entry.isManual ? 'MANUAL' : 'SCANNED'}
                        </MonoLabel>
                      </View>
                      <MonoLabel size={9} color={sel ? theme.steelLight : theme.inkGhost}>
                        {sel ? '✓ ADDED' : 'TAP TO ADD'}
                      </MonoLabel>
                    </Pressable>
                  );
                })
              )}
            </View>

            {/* ── TIER UPGRADE ── */}
            <View style={{ borderWidth: 1, borderColor: theme.hairline2, marginBottom: 14 }}>
              <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.hairline2, backgroundColor: theme.surface2, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 3, height: 12, backgroundColor: theme.hot, marginRight: 8 }} />
                <MonoLabel size={10} color={theme.steelLight} style={{ flex: 1 }}>TIER UPGRADE</MonoLabel>
                {player.tier && player.tier !== 'T0' && (
                  <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: TIER_COLORS[player.tier] ?? theme.hairline2 }}>
                    <Text style={{ fontFamily: theme.mono, fontSize: 8, letterSpacing: 1, color: TIER_COLORS[player.tier] ?? theme.inkSec }}>
                      NOW: {player.tier.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              {upgradableTiers.length === 0 ? (
                <View style={{ padding: 14, alignItems: 'center' }}>
                  <MonoLabel color={theme.inkGhost}>LEGENDARY — MAXED</MonoLabel>
                </View>
              ) : (
                upgradableTiers.map((t, idx) => {
                  const cost = TIER_COSTS[t];
                  const have = manager.tierPoints[t] ?? 0;
                  const canAfford = have >= cost;
                  const included = tierIncluded(t);
                  const c = TIER_COLORS[t] ?? theme.inkSec;
                  return (
                    <Pressable key={t}
                      onPress={canAfford ? () => {
                        setExcludedTiers(prev => {
                          const next = new Set(prev);
                          if (next.has(t)) next.delete(t); else next.add(t);
                          return next;
                        });
                        setResult(null);
                      } : undefined}
                      style={{ borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: theme.hairline2, borderLeftWidth: included ? 3 : 0, borderLeftColor: c, backgroundColor: included ? theme.surface2 : 'transparent', padding: 11, paddingHorizontal: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontFamily: theme.display, fontSize: 13, fontWeight: '700', color: c, textTransform: 'uppercase', minWidth: 82 }}>{t}</Text>
                        <MonoLabel size={9} color={theme.inkSec} style={{ flex: 1 }}>NEED {cost} PTS</MonoLabel>
                        <TextInput
                          keyboardType="numeric"
                          value={have > 0 ? String(have) : ''}
                          onChangeText={v => {
                            const clean = v.replace(/[^0-9]/g, '');
                            manager.setTierPoints({ ...manager.tierPoints, [t]: parseInt(clean, 10) || 0 });
                            setResult(null); setFinalStats(null);
                          }}
                          placeholder="0"
                          placeholderTextColor={theme.inkGhost}
                          style={{ color: canAfford ? theme.pos : theme.ink, fontFamily: theme.mono, fontSize: 12, fontWeight: '700', padding: 5, paddingHorizontal: 8, minWidth: 52, borderWidth: 1, borderColor: canAfford ? theme.pos + '66' : theme.hairline2, backgroundColor: theme.surface2, textAlign: 'center' }}
                        />
                        <Text style={{ fontFamily: theme.mono, fontSize: 18, fontWeight: '700', color: canAfford ? theme.pos : theme.inkGhost, minWidth: 20, textAlign: 'center' }}>
                          {canAfford ? '✓' : '·'}
                        </Text>
                      </View>
                      {!canAfford && have > 0 && (
                        <MonoLabel size={8} color={theme.neg} style={{ marginTop: 4, marginLeft: 92 }}>
                          {cost - have} SHORT
                        </MonoLabel>
                      )}
                      {canAfford && (
                        <MonoLabel size={8} color={included ? theme.inkGhost : theme.neg} style={{ marginTop: 4, marginLeft: 92 }}>
                          {included ? 'TAP TO EXCLUDE' : 'TAP TO INCLUDE'}
                        </MonoLabel>
                      )}
                    </Pressable>
                  );
                })
              )}
            </View>

            {/* ── CONDITION ── */}
            <View style={{ borderWidth: 1, borderColor: theme.hairline2, marginBottom: 14 }}>
              <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.hairline2, backgroundColor: theme.surface2, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 3, height: 12, backgroundColor: theme.pos, marginRight: 8 }} />
                <MonoLabel size={10} color={theme.steelLight}>CONDITION RESTORE</MonoLabel>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, padding: 12, borderRightWidth: 1, borderRightColor: theme.hairline2 }}>
                  <MonoLabel size={9} color={theme.inkSec} style={{ marginBottom: 6 }}>RESTORERS (+{CONDITION_PER_RESTORER}% EA)</MonoLabel>
                  <TextInput
                    keyboardType="numeric"
                    value={restorers}
                    onChangeText={v => { setRestorers(v.replace(/[^0-9]/g, '')); setResult(null); }}
                    placeholder="0"
                    placeholderTextColor={theme.inkGhost}
                    style={{ fontFamily: theme.mono, fontSize: 20, fontWeight: '700', color: theme.ink, borderWidth: 1, borderColor: theme.hairline2, padding: 8, textAlign: 'center' }}
                  />
                </View>
                <View style={{ flex: 1, padding: 12 }}>
                  <MonoLabel size={9} color={theme.inkSec} style={{ marginBottom: 6 }}>RECOVERY KITS (+{CONDITION_PER_RECOVERY}% EA)</MonoLabel>
                  <TextInput
                    keyboardType="numeric"
                    value={restPacks}
                    onChangeText={v => { setRestPacks(v.replace(/[^0-9]/g, '')); setResult(null); }}
                    placeholder="0"
                    placeholderTextColor={theme.inkGhost}
                    style={{ fontFamily: theme.mono, fontSize: 20, fontWeight: '700', color: theme.ink, borderWidth: 1, borderColor: theme.hairline2, padding: 8, textAlign: 'center' }}
                  />
                </View>
              </View>
            </View>

            {/* ── SEASON RESET ── */}
            <View style={{ borderWidth: 1, borderColor: seasonReset ? theme.neg + '88' : theme.hairline2, marginBottom: 14 }}>
              <Pressable
                onPress={() => { setSeasonReset(v => !v); setResult(null); setFinalStats(null); }}
                style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: theme.surface2, flexDirection: 'row', alignItems: 'center', borderBottomWidth: seasonReset ? 1 : 0, borderBottomColor: theme.hairline2 }}>
                <View style={{ width: 3, height: 12, backgroundColor: theme.neg, marginRight: 8 }} />
                <MonoLabel size={10} color={theme.steelLight} style={{ flex: 1 }}>SEASON RESET</MonoLabel>
                <View style={{ width: 12, height: 12, backgroundColor: seasonReset ? theme.neg : 'transparent', borderWidth: 1, borderColor: seasonReset ? theme.neg : theme.hairline3 }} />
              </Pressable>
              {seasonReset && (
                <View style={{ padding: 12 }}>
                  <MonoLabel size={9} color={theme.inkSec} style={{ marginBottom: 6 }}>LEVELS PROMOTED THIS SEASON</MonoLabel>
                  <TextInput
                    keyboardType="numeric"
                    value={levelsPromoted}
                    onChangeText={v => { setLevelsPromoted(v.replace(/[^0-9]/g, '') || '1'); setResult(null); }}
                    placeholder="1"
                    placeholderTextColor={theme.inkGhost}
                    style={{ fontFamily: theme.mono, fontSize: 22, fontWeight: '700', color: theme.neg, borderWidth: 1, borderColor: theme.neg + '66', padding: 8, textAlign: 'center', marginBottom: 8 }}
                  />
                  <MonoLabel size={8} color={theme.inkGhost}>
                    {`EACH STAT −${(parseInt(levelsPromoted, 10) || 1) * (profile.periodicDegradationPerStage ?? 20)} PTS · WHITE AND GREY ALIKE · APPLIES LAST`}
                  </MonoLabel>
                </View>
              )}
            </View>

            {/* ── PROJECT button ── */}
            <Pressable onPress={runProjection}
              style={{ borderWidth: 1, borderColor: ready ? theme.ink : theme.hairline2, padding: 18, alignItems: 'center', marginBottom: 14, backgroundColor: ready ? theme.surface2 : 'transparent' }}>
              <Text style={{ fontFamily: theme.mono, fontSize: 13, letterSpacing: 2.5, color: ready ? theme.ink : theme.inkGhost }}>
                ▶ PROJECT FULL PLAN
              </Text>
              {!ready && (
                <MonoLabel size={8} color={theme.inkGhost} style={{ marginTop: 4 }}>
                  SELECT A DRILL PLAN, COACH SESSION, OR TIER TO ENABLE
                </MonoLabel>
              )}
            </Pressable>

            {/* ── RESULTS ── */}
            {result && result.length > 0 && (
              <View style={{ borderWidth: 1, borderColor: totalGain != null && totalGain > 0 ? theme.pos + '66' : theme.hairline2, marginBottom: 14 }}>
                {/* Final OVR banner */}
                <View style={{ padding: 16, backgroundColor: theme.surface2, borderBottomWidth: 1, borderBottomColor: theme.hairline2, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <MonoLabel size={8} color={theme.steelLight} style={{ marginBottom: 4 }}>FULL PLAN RESULT</MonoLabel>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                      <Text style={{ fontFamily: theme.display, fontSize: 34, fontWeight: '700', color: theme.inkGhost }}>{baseOvr?.toFixed(0)}</Text>
                      <Text style={{ fontFamily: theme.mono, fontSize: 20, color: theme.inkGhost }}>→</Text>
                      <Text style={{ fontFamily: theme.display, fontSize: 34, fontWeight: '700', color: theme.pos }}>{finalOvr?.toFixed(1)}</Text>
                    </View>
                  </View>
                  {totalGain != null && (
                    <View style={{ borderWidth: 1, borderColor: totalGain > 0 ? theme.pos + '66' : theme.hairline2, padding: 12, alignItems: 'center', minWidth: 72 }}>
                      <Text style={{ fontFamily: theme.mono, fontSize: 22, fontWeight: '700', color: totalGain > 0 ? theme.pos : theme.inkMuted }}>
                        {totalGain > 0 ? '+' : ''}{totalGain}
                      </Text>
                      <MonoLabel size={8} color={totalGain > 0 ? theme.pos : theme.inkMuted}>TOTAL</MonoLabel>
                    </View>
                  )}
                </View>

                {/* Step-by-step chain */}
                {result.map((step, i) => {
                  const stepGain = Number((step.ovrAfter - step.ovrBefore).toFixed(1));
                  return (
                    <View key={i} style={{ paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: i < result.length - 1 ? 1 : 0, borderBottomColor: theme.hairline, flexDirection: 'row', alignItems: 'flex-start', borderLeftWidth: 3, borderLeftColor: step.color ?? theme.hairline2 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: theme.mono, fontSize: 10, letterSpacing: 0.8, color: theme.inkSec, marginBottom: 3 }}>{step.label}</Text>
                        {step.detail && <MonoLabel size={8} color={theme.inkGhost}>{step.detail}</MonoLabel>}
                      </View>
                      <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                        <Text style={{ fontFamily: theme.display, fontSize: 14, fontWeight: '700', color: step.color ?? theme.ink }}>{step.ovrAfter.toFixed(1)}</Text>
                        {stepGain !== 0 && (
                          <MonoLabel size={8} color={stepGain > 0 ? theme.pos : theme.inkGhost}>
                            {stepGain > 0 ? '+' : ''}{stepGain}
                          </MonoLabel>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── APPLY FULL PLAN TO CARD (Add to Roster) ── */}
            {finalStats && finalOvr != null && (
              <Pressable
                onPress={() => {
                  if (!player || !finalStats) return;
                  const appliedTiers = TIER_ORDER.filter(t => upgradableTiers.includes(t) && tierIncluded(t));
                  const finalTier = appliedTiers[appliedTiers.length - 1] ?? player.tier;
                  playerService.applyAndSnapshot(player, {
                    stats: finalStats,
                    overall: Number(finalOvr.toFixed(1)),
                    tier: finalTier,
                  });
                  setResult(null);
                  setFinalStats(null);
                  setSelectedCoachIds(new Set());
                  setSelectedDrillPlanIds(new Set());
                  setExcludedTiers(new Set());
                }}
                style={{ borderWidth: 1, borderColor: theme.pos, padding: 16, alignItems: 'center', marginBottom: 14, backgroundColor: theme.pos + '18' }}>
                <Text style={{ fontFamily: theme.mono, fontSize: 12, letterSpacing: 2, color: theme.pos, fontWeight: '700' }}>
                  ✓ ADD TO ROSTER — APPLY FULL PLAN
                </Text>
                <MonoLabel size={8} color={theme.pos} style={{ marginTop: 4 }}>
                  {tiersIncluded
                    ? `STATS + OVR + TIER → ${(TIER_ORDER.filter(t => upgradableTiers.includes(t) && tierIncluded(t)).pop() ?? player?.tier ?? '').toUpperCase()}`
                    : 'UPDATES STATS + OVR'}
                </MonoLabel>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
