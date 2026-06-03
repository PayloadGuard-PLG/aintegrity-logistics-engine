import { useState, useMemo, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useSquad } from '../../src/hooks/useSquad';
import { useManager } from '../../src/context/ManagerContext';
import { AppHeader } from '../../src/components/AppHeader';
import { MonoLabel } from '../../src/components/atoms/MonoLabel';
import { Chip } from '../../src/components/atoms/Chip';
import { QualityMeter } from '../../src/components/atoms/QualityMeter';
import { NewRoleBar } from '../../src/components/atoms/NewRoleBar';
import { getDrillRecommendations } from '../../src/logic/controller';
import { drillPresetService } from '../../src/services/drillPresetService';
import { drillPlanHistoryService } from '../../src/services/drillPlanHistoryService';
import { DRILL_LIST } from '../../src/database/drillDatabase';
import { calculateActualLoss } from '../../src/utils/conditionEngine';
import { estimateStatGainPct } from '../../src/logic/xpEngine';
import { isWhiteStat } from '../../src/utils/metricWeights';
import { computeOvrWithPadding } from '../../src/logic/ovrProjector';
import { theme } from '../../src/constants/theme';
import { TabBackground } from '../../src/components/TabBackground';
import { FanLevel, GameProfile } from '../../src/types/resources';
import gameProfileJson from '../../profiles/logistics_v1.json';

const profile = gameProfileJson as unknown as GameProfile;

const INTENSITY_COLORS: Record<string, string> = {
  'Very Easy': '#34d399',
  'Easy':      '#60a5fa',
  'Medium':    '#fbbf24',
  'Hard':      '#fb923c',
  'Very Hard': '#f87171',
};

type Preset = { id: string; name: string; drillNames: string[] };
type DrillGain = { stat: string; from: number; gain: number; isWhite: boolean };
type DrillProjection = { gains: DrillGain[]; ovrBefore: number; ovrAfter: number; ovrGain: number };

export default function DrillsScreen() {
  const { squad } = useSquad();
  const manager = useManager();
  const [fanLevel, setFanLevel] = useState<FanLevel>(2);
  const [drillLevel, setDrillLevel] = useState<string>('Very Easy');

  // Preset build mode
  const [presetMode, setPresetMode] = useState(false);
  const [presetSelection, setPresetSelection] = useState<string[]>([]);
  const [presetName, setPresetName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Saved presets + plan state
  const [savedPresets, setSavedPresets] = useState<Preset[]>([]);
  const [presetCycles, setPresetCycles] = useState<Record<string, number>>({});
  const [selectedPresetIds, setSelectedPresetIds] = useState<Set<string>>(new Set());
  const [drillProjection, setDrillProjection] = useState<DrillProjection | null>(null);
  const [pushSuccess, setPushSuccess] = useState(false);

  const selectedPlayer = squad.find(p => p.id === manager.selectedPlayerId) ?? (squad.length === 1 ? squad[0] : null);

  useEffect(() => {
    if (selectedPlayer && !manager.selectedPlayerId) {
      manager.setSelectedPlayerId(selectedPlayer.id);
    }
  }, [selectedPlayer?.id]);

  // Reload presets whenever one is saved or deleted
  useEffect(() => {
    setSavedPresets(drillPresetService.getAll());
  }, [saveSuccess]);

  const drills = useMemo(() => {
    if (!selectedPlayer) return [];
    return getDrillRecommendations(selectedPlayer, fanLevel)
      .filter(d => d.intensity === drillLevel);
  }, [selectedPlayer, fanLevel, drillLevel]);

  function togglePresetDrill(name: string) {
    setPresetSelection(prev => {
      if (prev.includes(name)) return prev.filter(n => n !== name);
      if (prev.length >= 6) return [...prev.slice(0, 5), name];
      return [...prev, name];
    });
  }

  function savePreset() {
    if (!presetName.trim() || presetSelection.length === 0) return;
    drillPresetService.save(presetName.trim(), presetSelection);
    setSaveSuccess(true);
    setTimeout(() => {
      setPresetMode(false);
      setPresetSelection([]);
      setPresetName('');
      setSaveSuccess(false);
    }, 800);
  }

  function deletePreset(id: string) {
    drillPresetService.delete(id);
    setSavedPresets(drillPresetService.getAll());
    setSelectedPresetIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    setPresetCycles(prev => { const n = { ...prev }; delete n[id]; return n; });
    setDrillProjection(null);
  }

  function togglePresetSelect(id: string) {
    setSelectedPresetIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
    setDrillProjection(null);
  }

  function calcCondPerCycle(drillNames: string[]): number {
    return drillNames.reduce((sum, name) => {
      const drill = DRILL_LIST.find(d => d.name === name);
      if (!drill) return sum;
      return sum + calculateActualLoss(drill.baseLoss, fanLevel, drill.intensity);
    }, 0);
  }

  function projectDrillPlan() {
    if (!selectedPlayer) return;
    const selected = savedPresets.filter(p => selectedPresetIds.has(p.id));
    let currentStats = { ...selectedPlayer.stats };
    const gainMap: Record<string, { from: number; total: number; isWhite: boolean }> = {};

    for (const preset of selected) {
      const cycles = presetCycles[preset.id] ?? 0;
      if (cycles === 0) continue;

      for (const drillName of preset.drillNames) {
        const drill = DRILL_LIST.find(d => d.name === drillName);
        if (!drill) continue;
        const drillMult = (profile.cycleIntensityMultipliers as Record<string, number>)[drill.intensity] ?? 1.0;
        const budget = cycles * profile.baseResourcesPerCycle * (profile.conditioningResourceFactor ?? 1.0) / drill.stats.length;

        for (const stat of drill.stats) {
          const from = currentStats[stat];
          if (from === undefined) continue;
          const isWhite = isWhiteStat(selectedPlayer.role, stat);
          const gain = estimateStatGainPct(budget, from, selectedPlayer.age, 0, selectedPlayer.talent, isWhite, false, drillMult, profile);
          if (!gainMap[stat]) gainMap[stat] = { from: selectedPlayer.stats[stat] ?? from, total: 0, isWhite };
          currentStats[stat] = Math.min(from + gain, profile.metricCap);
          gainMap[stat].total += gain;
        }
      }
    }

    const gains = Object.entries(gainMap)
      .filter(([, v]) => v.total > 0.05)
      .map(([stat, v]) => ({ stat, from: v.from, gain: Number(v.total.toFixed(1)), isWhite: v.isWhite }))
      .sort((a, b) => b.gain - a.gain);

    const ovrBefore = Number(computeOvrWithPadding(selectedPlayer.stats, selectedPlayer.overall, profile).toFixed(1));
    const ovrAfter = Number(computeOvrWithPadding(currentStats, selectedPlayer.overall, profile).toFixed(1));
    setDrillProjection({ gains, ovrBefore, ovrAfter, ovrGain: Number((ovrAfter - ovrBefore).toFixed(1)) });
  }

  function pushToResults() {
    if (!selectedPlayer) return;
    const selected = savedPresets.filter(p => selectedPresetIds.has(p.id) && (presetCycles[p.id] ?? 0) > 0);
    for (const preset of selected) {
      drillPlanHistoryService.save({
        id: `${Date.now()}-${preset.id}`,
        playerId: selectedPlayer.id,
        timestamp: Date.now(),
        presetName: preset.name,
        drillNames: preset.drillNames,
        cycles: presetCycles[preset.id] ?? 1,
        fanLevel: fanLevel as number,
      });
    }
    setPushSuccess(true);
    setTimeout(() => { setPushSuccess(false); router.push('/(tabs)/results'); }, 600);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <TabBackground tab="drills" />
      <AppHeader />
      <ScrollView contentContainerStyle={{ padding: 14, paddingHorizontal: 16, paddingBottom: presetMode ? 120 : 30 }}>

        {squad.length > 0 && (
          <>
            <MonoLabel color={theme.steelLight} style={{ marginBottom: 8 }}>SUBJECT</MonoLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 5, paddingBottom: 14 }}>
              {[...squad].sort((a, b) => (a.id === manager.selectedPlayerId ? -1 : b.id === manager.selectedPlayerId ? 1 : 0)).map(p => (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <QualityMeter ovr={p.overall} size="sm" />
                  <Chip active={p.id === manager.selectedPlayerId} onPress={() => manager.setSelectedPlayerId(p.id)}>{p.name}</Chip>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {selectedPlayer?.newRole && (
          <View style={{ marginBottom: 8, paddingHorizontal: 2 }}>
            <NewRoleBar roleName={selectedPlayer.newRole} points={selectedPlayer.newRolePoints ?? 0} />
          </View>
        )}

        {/* Drill level selector */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <MonoLabel color={theme.steelLight}>DRILL LEVEL</MonoLabel>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 14, gap: 6, flexWrap: 'wrap' }}>
          {['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'].map(l => {
            const sel = drillLevel === l;
            return (
              <Pressable key={l} onPress={() => setDrillLevel(l)} style={{ paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: sel ? theme.ink : theme.hairline2, backgroundColor: sel ? theme.ink : 'transparent' }}>
                <Text style={{ fontFamily: theme.mono, fontSize: 10, letterSpacing: 1, color: sel ? theme.bg : theme.inkSec }}>{l.toUpperCase()}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Fan Club selector */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <MonoLabel color={theme.steelLight}>FAN CLUB</MonoLabel>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.hairline }} />
          {drills.some(d => d.isZeroDrain) && <MonoLabel size={9} color={theme.pos}>ZERO-DRAIN UNLOCKED</MonoLabel>}
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 18, borderWidth: 1, borderColor: theme.hairline2 }}>
          {([0, 1, 2, 3, 4] as FanLevel[]).map(l => {
            const sel = fanLevel === l;
            return (
              <Pressable key={l} onPress={() => setFanLevel(l)} style={{
                flex: 1, paddingVertical: 12, alignItems: 'center',
                backgroundColor: sel ? theme.ink : 'transparent',
                borderRightWidth: l < 4 ? 1 : 0, borderRightColor: theme.hairline2,
                position: 'relative',
              }}>
                {l === 4 && !sel && (
                  <View style={{ position: 'absolute', top: 3, right: 4, width: 5, height: 5, backgroundColor: theme.pos, borderRadius: 3 }} />
                )}
                <Text style={{ fontFamily: theme.mono, fontSize: 12, letterSpacing: 1, color: sel ? theme.bg : theme.inkSec }}>L{l}</Text>
              </Pressable>
            );
          })}
        </View>

        {!selectedPlayer ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <MonoLabel>SELECT A PLAYER</MonoLabel>
          </View>
        ) : (
          <>
            {/* Recommendations header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <MonoLabel color={theme.steelLight}>RECOMMENDATIONS</MonoLabel>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.hairline }} />
              {presetMode ? (
                <>
                  <MonoLabel size={9} color={theme.hot}>{presetSelection.length}/6 SELECTED</MonoLabel>
                  <Pressable onPress={() => { setPresetMode(false); setPresetSelection([]); setPresetName(''); }} style={{ paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: theme.hairline2 }}>
                    <Text style={{ fontFamily: theme.mono, fontSize: 9, letterSpacing: 1, color: theme.inkSec }}>CANCEL</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <MonoLabel size={9}>SORT ROI ▼</MonoLabel>
                  <Pressable onPress={() => setPresetMode(true)} style={{ paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: theme.steelLight + '88' }}>
                    <Text style={{ fontFamily: theme.mono, fontSize: 9, letterSpacing: 1, color: theme.steelLight }}>BUILD PRESET</Text>
                  </Pressable>
                </>
              )}
            </View>

            {drills.map((d, i) => {
              const tc = d.type === 'Attack' ? theme.steelLight : d.type === 'Defence' ? '#86c5d6' : d.type === 'Possession' ? '#a78bfa' : theme.hot;
              const isSelected = presetSelection.includes(d.name);
              const selRank = presetSelection.indexOf(d.name) + 1;

              return (
                <Pressable key={d.name} onPress={presetMode ? () => togglePresetDrill(d.name) : undefined} style={{
                  borderWidth: 1, borderColor: presetMode && isSelected ? theme.hot : theme.hairline2,
                  borderTopWidth: i > 0 ? 0 : 1,
                  backgroundColor: presetMode && isSelected ? 'rgba(251,146,60,0.08)' : theme.surface,
                  padding: 12, paddingHorizontal: 14,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {presetMode ? (
                      <View style={{ width: 22, height: 22, borderWidth: 1, borderColor: isSelected ? theme.hot : theme.hairline2, alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? theme.hot : 'transparent' }}>
                        <Text style={{ fontFamily: theme.mono, fontSize: isSelected ? 10 : 9, fontWeight: '700', color: isSelected ? theme.bg : theme.inkGhost }}>{isSelected ? selRank : i + 1}</Text>
                      </View>
                    ) : (
                      <MonoLabel size={9} style={{ minWidth: 18 }}>{String(i + 1).padStart(2, '0')}</MonoLabel>
                    )}
                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: tc + '55' }}>
                      <Text style={{ fontFamily: theme.mono, fontSize: 9, letterSpacing: 1.2, color: tc }}>{((d as any).type ?? 'DRILL').toUpperCase()}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 13, color: theme.ink, fontWeight: '600', fontFamily: theme.display }}>{d.name}</Text>
                    <Text style={{ fontFamily: theme.mono, fontSize: 13, fontWeight: '700', color: theme.pos }}>{Math.round(d.efficiency * 100)}%</Text>
                    <MonoLabel size={8} color={theme.inkGhost}>EFF</MonoLabel>
                    {d.isZeroDrain ? (
                      <View style={{ paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: theme.pos + '66', backgroundColor: theme.pos + '12' }}>
                        <Text style={{ fontFamily: theme.mono, fontSize: 8, letterSpacing: 1, color: theme.pos }}>0·DRAIN</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={{ fontFamily: theme.mono, fontSize: 13, fontWeight: '700', color: d.conditionCost < 2 ? theme.hot : theme.neg }}>{d.conditionCost.toFixed(2)}%</Text>
                        <MonoLabel size={8} color={theme.inkGhost}>COND</MonoLabel>
                      </>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                    {d.whiteHits.map(({ stat, white }) => (
                      <Text key={stat} style={{ fontFamily: theme.mono, fontSize: 8, letterSpacing: 0.6, color: white ? theme.steelLight : theme.inkGhost }}>
                        {white ? '●' : '○'} {stat}
                      </Text>
                    ))}
                    {isFinite((d as any).avgWhiteStatValue) && (
                      <Text style={{ fontFamily: theme.mono, fontSize: 8, color: theme.inkGhost, marginLeft: 4 }}>AVG {Math.round((d as any).avgWhiteStatValue)}</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}

            {/* ── SAVED PRESETS ── */}
            <View style={{ marginTop: 22 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{ width: 3, height: 12, backgroundColor: theme.hot }} />
                <MonoLabel size={10} color={theme.hot}>SAVED PRESETS</MonoLabel>
                <View style={{ flex: 1, height: 1, backgroundColor: theme.hairline }} />
                <MonoLabel size={9} color={theme.inkGhost}>{savedPresets.length} SAVED</MonoLabel>
              </View>

              {savedPresets.length === 0 && (
                <View style={{ padding: 16, borderWidth: 1, borderColor: theme.hairline2, alignItems: 'center' }}>
                  <MonoLabel size={9} color={theme.inkGhost}>BUILD A PRESET ABOVE TO SAVE IT HERE</MonoLabel>
                </View>
              )}

              {savedPresets.map(preset => {
                const cycles = presetCycles[preset.id] ?? 0;
                const isSelected = selectedPresetIds.has(preset.id);
                const condPerCycle = calcCondPerCycle(preset.drillNames);

                return (
                  <View key={preset.id} style={{
                    borderWidth: 1,
                    borderColor: isSelected ? '#ffffff' : theme.hairline2,
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.04)' : 'transparent',
                    marginBottom: 10, padding: 12,
                  }}>
                    {/* Name row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Text style={{ flex: 1, fontFamily: theme.mono, fontSize: 11, letterSpacing: 1, color: theme.ink, fontWeight: '700' }}>{preset.name}</Text>
                      <MonoLabel size={8} color={theme.inkGhost}>{condPerCycle.toFixed(2)}%/CYCLE</MonoLabel>
                      <Pressable onPress={() => deletePreset(preset.id)} style={{ paddingHorizontal: 6, paddingVertical: 2 }}>
                        <MonoLabel size={9} color={theme.neg}>✕</MonoLabel>
                      </Pressable>
                    </View>

                    {/* Drill chips — 3×2 grid */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                      {preset.drillNames.map((name, i) => {
                        const drill = DRILL_LIST.find(d => d.name === name);
                        const ic = drill ? (INTENSITY_COLORS[drill.intensity] ?? theme.inkGhost) : theme.inkGhost;
                        return (
                          <View key={i} style={{ paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: ic + '88', backgroundColor: ic + '14' }}>
                            <Text style={{ fontFamily: theme.mono, fontSize: 7, letterSpacing: 0.5, color: ic }}>{name.toUpperCase()}</Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Controls */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <MonoLabel size={9} color={theme.inkSec}>CYCLES</MonoLabel>
                      <View style={{ borderWidth: 1, borderColor: theme.hairline2, width: 64 }}>
                        <TextInput
                          keyboardType="numeric"
                          value={cycles > 0 ? String(cycles) : ''}
                          onChangeText={v => {
                            setPresetCycles(prev => ({ ...prev, [preset.id]: parseInt(v) || 0 }));
                            setDrillProjection(null);
                          }}
                          placeholder="0"
                          placeholderTextColor={theme.inkGhost}
                          style={{ fontFamily: theme.mono, fontSize: 15, fontWeight: '700', color: theme.ink, padding: 6, textAlign: 'center' }}
                        />
                      </View>
                      <View style={{ flex: 1 }} />
                      <Pressable onPress={() => togglePresetSelect(preset.id)}
                        style={{ paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1,
                          borderColor: isSelected ? '#ffffff' : theme.hairline2,
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.12)' : 'transparent' }}>
                        <MonoLabel size={9} color={isSelected ? '#ffffff' : theme.inkSec}>
                          {isSelected ? '✓ SELECTED' : 'SELECT'}
                        </MonoLabel>
                      </Pressable>
                    </View>
                  </View>
                );
              })}

              {/* Project button */}
              {selectedPresetIds.size > 0 && (
                <Pressable onPress={projectDrillPlan}
                  style={{ borderWidth: 1, borderColor: theme.hot, padding: 14, alignItems: 'center', marginTop: 4, marginBottom: 10 }}>
                  <Text style={{ fontFamily: theme.mono, fontSize: 11, letterSpacing: 2, color: theme.hot }}>▶ PROJECT DRILL PLAN</Text>
                </Pressable>
              )}

              {/* Projection results */}
              {drillProjection && (
                <View style={{ borderWidth: 1, borderColor: theme.pos + '55', padding: 14, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.hairline }}>
                    <View>
                      <MonoLabel size={8} color={theme.inkGhost} style={{ marginBottom: 2 }}>BEFORE</MonoLabel>
                      <Text style={{ fontFamily: theme.display, fontSize: 30, fontWeight: '700', color: theme.ink }}>{drillProjection.ovrBefore}</Text>
                    </View>
                    <Text style={{ fontFamily: theme.mono, fontSize: 16, color: theme.inkGhost }}>→</Text>
                    <View>
                      <MonoLabel size={8} color={theme.pos} style={{ marginBottom: 2 }}>AFTER DRILLS</MonoLabel>
                      <Text style={{ fontFamily: theme.display, fontSize: 30, fontWeight: '700', color: theme.pos }}>{drillProjection.ovrAfter}</Text>
                    </View>
                    <View style={{ flex: 1 }} />
                    <View style={{ borderWidth: 1, borderColor: theme.pos + '66', padding: 10, alignItems: 'center', minWidth: 56 }}>
                      <Text style={{ fontFamily: theme.mono, fontSize: 16, fontWeight: '700', color: theme.pos }}>+{drillProjection.ovrGain}</Text>
                      <MonoLabel size={8} color={theme.pos}>OVR</MonoLabel>
                    </View>
                  </View>

                  {drillProjection.gains.map(g => (
                    <View key={g.stat} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <MonoLabel size={9} color={g.isWhite ? theme.ink : theme.inkSec} style={{ flex: 1 }}>{g.stat}</MonoLabel>
                      <MonoLabel size={9} color={theme.inkGhost}>{g.from} → {(g.from + g.gain).toFixed(0)}</MonoLabel>
                      <MonoLabel size={9} color={theme.pos} style={{ marginLeft: 8, minWidth: 40, textAlign: 'right' }}>+{g.gain}</MonoLabel>
                    </View>
                  ))}

                  <Pressable onPress={pushToResults}
                    style={{ marginTop: 14, borderWidth: 1,
                      borderColor: pushSuccess ? theme.pos : theme.steelLight,
                      backgroundColor: pushSuccess ? theme.pos + '18' : 'transparent',
                      padding: 13, alignItems: 'center' }}>
                    <Text style={{ fontFamily: theme.mono, fontSize: 11, letterSpacing: 1.5,
                      color: pushSuccess ? theme.pos : theme.steelLight }}>
                      {pushSuccess ? '✓ PUSHED TO RESULTS' : 'PUSH TO RESULTS'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Preset save bar */}
      {presetMode && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.hairline2, padding: 14, paddingHorizontal: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MonoLabel size={9} color={theme.inkSec}>
              {presetSelection.length === 0 ? 'TAP DRILLS ABOVE TO SELECT (MAX 6)' : presetSelection.join('  ·  ')}
            </MonoLabel>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TextInput
              value={presetName}
              onChangeText={setPresetName}
              placeholder="PRESET NAME"
              placeholderTextColor={theme.inkGhost}
              style={{ flex: 1, backgroundColor: theme.surface3, borderWidth: 1, borderColor: theme.hairline2, fontFamily: theme.mono, fontSize: 12, letterSpacing: 1, color: theme.ink, paddingHorizontal: 12, paddingVertical: 10 }}
            />
            <Pressable
              onPress={savePreset}
              disabled={!presetName.trim() || presetSelection.length === 0}
              style={{ paddingHorizontal: 18, paddingVertical: 10, backgroundColor: saveSuccess ? theme.pos : (presetName.trim() && presetSelection.length > 0 ? theme.ink : theme.surface2), borderWidth: 1, borderColor: saveSuccess ? theme.pos : (presetName.trim() && presetSelection.length > 0 ? theme.ink : theme.hairline2) }}
            >
              <Text style={{ fontFamily: theme.mono, fontSize: 11, letterSpacing: 1.4, fontWeight: '700', color: saveSuccess ? theme.bg : (presetName.trim() && presetSelection.length > 0 ? theme.bg : theme.inkGhost) }}>
                {saveSuccess ? 'SAVED ✓' : 'SAVE'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
