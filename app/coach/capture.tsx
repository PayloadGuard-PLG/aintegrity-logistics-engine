import { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSquad } from '../../src/hooks/useSquad';
import { AppHeader } from '../../src/components/AppHeader';
import { MonoLabel } from '../../src/components/atoms/MonoLabel';
import { Chip } from '../../src/components/atoms/Chip';
import { theme } from '../../src/constants/theme';
import { getWhiteStatKeys, getAllStatKeys } from '../../src/utils/metricWeights';
import { computeOvrWithPadding } from '../../src/logic/ovrProjector';
import gameProfileJson from '../../profiles/logistics_v1.json';
import { GameProfile, TalentTier } from '../../src/types/resources';
import { squadPlanService } from '../../src/services/squadPlanService';
import { scanCoachPreview } from '../../src/logic/documentScanner';
import { resolveCoachStats } from '../../src/logic/investmentPipeline';
import { Player } from '../../src/database/playerSchema';

const profile = gameProfileJson as unknown as GameProfile;

const STAT_COLS = {
  DEF: new Set(['TACKLING','MARKING','POSITIONING','HEADING','BRAVERY','REFLEXES','AGILITY','ANTICIPATION','RUSHING OUT','COMMUNICATION']),
  ATT: new Set(['PASSING','DRIBBLING','CROSSING','SHOOTING','FINISHING','THROWING','KICKING','PUNCHING','AERIAL REACH','CONCENTRATION']),
  PHY: new Set(['FITNESS','STRENGTH','AGGRESSION','SPEED','CREATIVITY']),
};
const COL_COLORS = { DEF: '#4A7FC1', ATT: '#7C3AED', PHY: '#C05621' } as const;
function statColor(stat: string): string {
  if (STAT_COLS.DEF.has(stat)) return COL_COLORS.DEF;
  if (STAT_COLS.ATT.has(stat)) return COL_COLORS.ATT;
  return COL_COLORS.PHY;
}

// Ordered stat lists per column for outfield vs GK (matches game 3-col layout)
const OUTFIELD_COL = {
  DEF: ['TACKLING','MARKING','POSITIONING','HEADING','BRAVERY'],
  ATT: ['PASSING','DRIBBLING','CROSSING','SHOOTING','FINISHING'],
  PHY: ['FITNESS','STRENGTH','AGGRESSION','SPEED','CREATIVITY'],
} as const;
const GK_COL = {
  DEF: ['REFLEXES','AGILITY','ANTICIPATION','RUSHING OUT','COMMUNICATION'],
  ATT: ['THROWING','KICKING','PUNCHING','AERIAL REACH','CONCENTRATION'],
  PHY: ['FITNESS','STRENGTH','AGGRESSION','SPEED','CREATIVITY'],
} as const;

const TALENT_TIERS: TalentTier[] = ['Fastest', 'Fast', 'Average', 'Normal', 'Slow'];
const TALENT_LABEL: Record<TalentTier, string> = { Fastest: '×1.5', Fast: '×1.25', Average: '×1.1', Normal: '×1.0', Slow: '×0.7' };

const COACH_TYPES = ['STANDARD', 'FOCUSED', 'EXTENSIVE'];
const COACH_CATEGORIES = ['ATTACKING', 'DEFENDING', 'PHYSICAL', 'SAFEGUARD'];

type GainEntry = { lo: string; hi: string };

export default function CoachCaptureScreen() {
  const { squad } = useSquad();

  const [coachType, setCoachType] = useState('STANDARD');
  const [coachCategory, setCoachCategory] = useState('ATTACKING');
  const [multiplier, setMultiplier] = useState('30');

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [ageInput, setAgeInput] = useState('');
  const [ovrInput, setOvrInput] = useState('');
  const [talent, setTalent] = useState<TalentTier>('Normal');

  // stat values and gain ranges — keyed by stat name
  const [statValues, setStatValues] = useState<Record<string, string>>({});
  const [gains, setGains] = useState<Record<string, GainEntry>>({});

  const [saved, setSaved] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [scannedUri, setScannedUri] = useState<string | null>(null);
  const [scanRejected, setScanRejected] = useState(false);
  const [expandedStats, setExpandedStats] = useState<Set<string>>(new Set());

  const player: Player | null = squad.find(p => p.id === selectedPlayerId) ?? null;

  const { white, grey } = useMemo(() => {
    if (!player) return { white: [] as string[], grey: [] as string[] };
    const w = getWhiteStatKeys(player.role);
    const all = getAllStatKeys(player.role);
    const g = all.filter(s => !w.includes(s));
    return { white: w, grey: g };
  }, [player]);

  // Stats detected by scan that aren't in this player's role (e.g. HEADING for DL/ML/AML)
  const detectedExtras = useMemo(() => {
    const detected = Object.keys(gains).filter(s => gains[s].lo || gains[s].hi);
    return detected.filter(s => !white.includes(s) && !grey.includes(s));
  }, [gains, white, grey]);

  async function scanFromUri(uri: string) {
    setScannedUri(uri);
    setScanRejected(false);
    setIsScanning(true);
    setScanStatus('SCANNING...');
    try {
      const scan = await scanCoachPreview(uri);
      const parts: string[] = [];
      if (scan.coachType)     { setCoachType(scan.coachType.toUpperCase());     parts.push(scan.coachType); }
      if (scan.coachCategory) { setCoachCategory(scan.coachCategory.toUpperCase()); parts.push(scan.coachCategory); }
      if (scan.multiplier)    { setMultiplier(String(scan.multiplier));          parts.push(`×${scan.multiplier}`); }

      const numericStats: Record<string, number> = {};
      for (const [k, v] of Object.entries(statValues)) {
        const n = parseFloat(v);
        if (!isNaN(n)) numericStats[k] = n;
      }
      const resolvedStats = resolveCoachStats(scan, numericStats, player?.role ?? []);
      const newGains: Record<string, GainEntry> = {};
      const newStatVals: Record<string, string> = {};
      for (const statName of resolvedStats) {
        const raw = scan.stats.find(s => s.statName === statName);
        if (raw) {
          newGains[statName] = { lo: String(raw.gainLo), hi: String(raw.gainHi) };
          if (raw.statBefore > 0) newStatVals[statName] = String(raw.statBefore);
        }
      }
      if (Object.keys(newGains).length > 0) {
        setGains(prev => ({ ...prev, ...newGains }));
        setStatValues(prev => ({ ...prev, ...newStatVals }));
        const n = Object.keys(newGains).length;
        parts.push(`${n} STAT${n !== 1 ? 'S' : ''}`);
      }

      if (!selectedPlayerId && scan.playerAge) setAgeInput(String(scan.playerAge));
      if (!selectedPlayerId && scan.ovrBefore)  setOvrInput(String(scan.ovrBefore));

      if (parts.length > 0) {
        setScannedUri(null);
        setScanStatus(`DETECTED: ${parts.join(' · ')}`);
      } else {
        setScanRejected(true);
        setScanStatus('SCAN REJECTED — IMAGE NOT RECOGNISED');
      }
    } catch (e) {
      setScanRejected(true);
      setScanStatus('SCAN FAILED — SET MANUALLY');
    } finally {
      setIsScanning(false);
    }
  }

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access in settings.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled && result.assets[0]) await scanFromUri(result.assets[0].uri);
  }

  async function pickFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required', 'Allow camera access in settings.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled && result.assets[0]) await scanFromUri(result.assets[0].uri);
  }

  function selectPlayer(p: Player) {
    setSelectedPlayerId(p.id);
    setPlayerName(p.name);
    setAgeInput(p.age.toString());
    setOvrInput(p.overall.toFixed(0));
    setTalent(p.talent ?? 'Normal');
    const vals: Record<string, string> = {};
    for (const [k, v] of Object.entries(p.stats)) {
      vals[k] = Math.round(v).toString();
    }
    setStatValues(vals);
    setExpandedStats(new Set());
    setSaved(false);
    // gains intentionally NOT cleared — preserves any pre-scanned coach gain ranges
  }

  const ovrBefore = parseFloat(ovrInput) || 0;

  const { ovrBoostLo, ovrBoostHi } = useMemo(() => {
    if (!player || ovrBefore === 0) return { ovrBoostLo: null, ovrBoostHi: null };
    const baseStats: Record<string, number> = {};
    for (const [k, v] of Object.entries(statValues)) {
      const n = parseFloat(v);
      if (!isNaN(n)) baseStats[k] = n;
    }

    let boostedLo = { ...baseStats };
    let boostedHi = { ...baseStats };
    for (const [stat, g] of Object.entries(gains)) {
      const lo = parseFloat(g.lo);
      const hi = parseFloat(g.hi);
      const cur = baseStats[stat] ?? 0;
      if (!isNaN(lo)) boostedLo[stat] = Math.min(cur + lo, profile.metricCap);
      if (!isNaN(hi)) boostedHi[stat] = Math.min(cur + hi, profile.metricCap);
    }

    const loOvr = computeOvrWithPadding(boostedLo, ovrBefore, profile);
    const hiOvr = computeOvrWithPadding(boostedHi, ovrBefore, profile);
    return {
      ovrBoostLo: Math.round(loOvr - ovrBefore),
      ovrBoostHi: Math.round(hiOvr - ovrBefore),
    };
  }, [gains, statValues, ovrBefore, player]);

  function saveToLog() {
    if (!player) { Alert.alert('Select a player first'); return; }
    const gainEntries = Object.entries(gains)
      .filter(([, g]) => g.lo || g.hi)
      .map(([stat, g]) => ({
        stat,
        from: parseFloat(statValues[stat] ?? '0') || 0,
        gain: ((parseFloat(g.hi) || 0) + (parseFloat(g.lo) || 0)) / 2,
        isWhite: white.includes(stat),
      }));

    squadPlanService.saveRun(player.id, {
      sessions: parseInt(multiplier, 10) || 30,
      selectedStats: Object.keys(gains).filter(k => gains[k].lo || gains[k].hi),
      ovrBefore,
      ovrAfter: ovrBefore + ((ovrBoostLo ?? 0) + (ovrBoostHi ?? 0)) / 2,
      gains: gainEntries,
      label: `${coachType} ${coachCategory}`,
    });
    setSaved(true);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingHorizontal: 16, paddingBottom: 40 }}>

        {/* 0. SCREENSHOT SCAN */}
        <View style={{ borderWidth: 1, borderColor: theme.hairline2, marginBottom: 14 }}>
          <Pressable onPress={pickFromGallery} disabled={isScanning}
            style={{ padding: 18, alignItems: 'center' }}>
            <Text style={{ fontFamily: theme.mono, fontSize: 22, color: theme.steelLight, marginBottom: 6 }}>⊞</Text>
            <MonoLabel size={10} color={theme.steelLight}>SCAN COACH SCREENSHOT</MonoLabel>
            <MonoLabel size={8} color={theme.inkGhost} style={{ marginTop: 3 }}>Select from photo library</MonoLabel>
          </Pressable>
          {isScanning && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderTopWidth: 1, borderTopColor: theme.hairline }}>
              <ActivityIndicator size="small" color={theme.steelLight} />
              <MonoLabel size={9} color={theme.steelLight}>SCANNING COACH SCREEN...</MonoLabel>
            </View>
          )}
          {!isScanning && scanStatus !== '' && !scanRejected && (
            <View style={{ padding: 10, borderTopWidth: 1, borderTopColor: theme.hairline }}>
              <MonoLabel size={9} color={scanStatus.startsWith('DETECTED') ? theme.pos : theme.inkMuted}>{scanStatus}</MonoLabel>
            </View>
          )}
        </View>

        {scannedUri && scanRejected && (
          <View style={{ width: '100%', aspectRatio: 16 / 9, position: 'relative', marginBottom: 14, backgroundColor: '#000' }}>
            <Image source={{ uri: scannedUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <Text style={{ fontFamily: theme.mono, fontSize: 13, letterSpacing: 2, fontWeight: '700', color: theme.hot, marginBottom: 8 }}>INVALID IMAGE</Text>
              <Text style={{ fontFamily: theme.mono, fontSize: 9, color: theme.inkMuted, textAlign: 'center', letterSpacing: 1 }}>UPLOAD A SCREEN RESOLUTION COACH PREVIEW</Text>
            </View>
          </View>
        )}

        {/* 1. COACH TYPE */}
        <View style={{ borderWidth: 1, borderColor: theme.hairline2, padding: 14, marginBottom: 14 }}>
          <MonoLabel color={theme.steelLight} style={{ marginBottom: 12 }}>COACH TYPE</MonoLabel>

          <MonoLabel size={9} color={theme.inkGhost} style={{ marginBottom: 6 }}>TYPE</MonoLabel>
          <View style={{ flexDirection: 'row', gap: 5, marginBottom: 12 }}>
            {COACH_TYPES.map(t => (
              <Pressable key={t} onPress={() => setCoachType(t)}
                style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: coachType === t ? theme.ink : theme.hairline2, backgroundColor: coachType === t ? theme.ink : 'transparent' }}>
                <Text style={{ fontFamily: theme.mono, fontSize: 8, letterSpacing: 0.8, color: coachType === t ? theme.bg : theme.inkSec }}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <MonoLabel size={9} color={theme.inkGhost} style={{ marginBottom: 6 }}>CATEGORY</MonoLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
            {COACH_CATEGORIES.map(c => (
              <Pressable key={c} onPress={() => setCoachCategory(c)}
                style={{ paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: coachCategory === c ? theme.steelLight : theme.hairline2, backgroundColor: coachCategory === c ? theme.steelLight + '18' : 'transparent' }}>
                <Text style={{ fontFamily: theme.mono, fontSize: 9, letterSpacing: 0.8, color: coachCategory === c ? theme.steelLight : theme.inkSec }}>{c}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MonoLabel style={{ flex: 1 }}>MULTIPLIER ×</MonoLabel>
            <View style={{ borderWidth: 1, borderColor: theme.hairline2, width: 80 }}>
              <TextInput
                keyboardType="numeric"
                value={multiplier}
                onChangeText={v => setMultiplier(v.replace(/[^0-9]/g, ''))}
                placeholder="30"
                placeholderTextColor={theme.inkGhost}
                style={{ fontFamily: theme.mono, fontSize: 16, fontWeight: '700', color: theme.ink, padding: 8, textAlign: 'center' }}
              />
            </View>
          </View>
        </View>

        {/* 2. PLAYER CARD */}
        <View style={{ borderWidth: 1, borderColor: theme.hairline2, padding: 14, marginBottom: 14 }}>
          <MonoLabel color={theme.steelLight} style={{ marginBottom: 12 }}>PLAYER CARD</MonoLabel>

          {squad.length > 0 && (
            <>
              <MonoLabel size={9} color={theme.inkGhost} style={{ marginBottom: 6 }}>AUTO-FILL FROM SQUAD</MonoLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ flexDirection: 'row', gap: 5, marginBottom: 14 }}>
                {squad.map(p => (
                  <Chip key={p.id} active={p.id === selectedPlayerId} onPress={() => selectPlayer(p)}>
                    {p.name}
                  </Chip>
                ))}
              </ScrollView>
            </>
          )}

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <View style={{ flex: 2 }}>
              <MonoLabel size={9} style={{ marginBottom: 4 }}>PLAYER NAME</MonoLabel>
              <TextInput
                value={playerName}
                onChangeText={setPlayerName}
                placeholder="Name"
                placeholderTextColor={theme.inkGhost}
                editable={!selectedPlayerId}
                style={{ fontFamily: theme.mono, fontSize: 13, color: theme.ink, borderWidth: 1, borderColor: theme.hairline2, padding: 8, opacity: selectedPlayerId ? 0.6 : 1 }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <MonoLabel size={9} style={{ marginBottom: 4 }}>AGE</MonoLabel>
              <TextInput
                keyboardType="numeric"
                value={ageInput}
                onChangeText={setAgeInput}
                placeholder="18"
                placeholderTextColor={theme.inkGhost}
                style={{ fontFamily: theme.mono, fontSize: 13, color: theme.ink, borderWidth: 1, borderColor: theme.hairline2, padding: 8, textAlign: 'center' }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <MonoLabel size={9} style={{ marginBottom: 4 }}>OVR BEFORE</MonoLabel>
              <TextInput
                keyboardType="numeric"
                value={ovrInput}
                onChangeText={setOvrInput}
                placeholder="100"
                placeholderTextColor={theme.inkGhost}
                style={{ fontFamily: theme.mono, fontSize: 13, color: theme.ink, borderWidth: 1, borderColor: theme.hairline2, padding: 8, textAlign: 'center' }}
              />
            </View>
          </View>

          {(ovrBoostLo != null || ovrBoostHi != null) && (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <View style={{ flex: 1, padding: 8, borderWidth: 1, borderColor: theme.pos + '55', backgroundColor: theme.pos + '0d', alignItems: 'center' }}>
                <MonoLabel size={8} color={theme.pos} style={{ marginBottom: 2 }}>OVR BOOST LO</MonoLabel>
                <Text style={{ fontFamily: theme.mono, fontSize: 16, fontWeight: '700', color: theme.pos }}>{ovrBoostLo != null ? `+${ovrBoostLo}` : '—'}</Text>
              </View>
              <View style={{ flex: 1, padding: 8, borderWidth: 1, borderColor: theme.pos + '55', backgroundColor: theme.pos + '0d', alignItems: 'center' }}>
                <MonoLabel size={8} color={theme.pos} style={{ marginBottom: 2 }}>OVR BOOST HI</MonoLabel>
                <Text style={{ fontFamily: theme.mono, fontSize: 16, fontWeight: '700', color: theme.pos }}>{ovrBoostHi != null ? `+${ovrBoostHi}` : '—'}</Text>
              </View>
            </View>
          )}

          <MonoLabel size={9} color={theme.inkGhost} style={{ marginBottom: 6 }}>TALENT TIER</MonoLabel>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {TALENT_TIERS.map(t => (
              <Pressable key={t} onPress={() => setTalent(t)}
                style={{ flex: 1, paddingVertical: 7, alignItems: 'center', borderWidth: 1, borderColor: talent === t ? theme.ink : theme.hairline2, backgroundColor: talent === t ? theme.ink : 'transparent' }}>
                <Text style={{ fontFamily: theme.mono, fontSize: 9, letterSpacing: 0.5, color: talent === t ? theme.bg : theme.inkSec }}>{TALENT_LABEL[t]}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 3. STAT COVERAGE — 3-col table (matches game layout) */}
        {player && (() => {
          const isGK = player.role.includes('GK');
          const colDef = isGK ? GK_COL : OUTFIELD_COL;
          return (
            <View style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <MonoLabel color={theme.steelLight}>STAT COVERAGE</MonoLabel>
                <MonoLabel size={8} color={theme.inkGhost}>HIGHLIGHTED = ESSENTIAL · DIM = SECONDARY</MonoLabel>
              </View>

              <View style={{ flexDirection: 'row', gap: 4 }}>
                {(['DEF', 'ATT', 'PHY'] as const).map(col => {
                  const cc = COL_COLORS[col];
                  const colStats = colDef[col] as readonly string[];
                  return (
                    <View key={col} style={{ flex: 1, borderWidth: 1, borderColor: cc + '55' }}>
                      <View style={{ paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: cc, backgroundColor: cc + '28' }}>
                        <MonoLabel size={8} color={cc}>{col}</MonoLabel>
                      </View>
                      {colStats.map(s => {
                        const isW = white.includes(s);
                        const isG = grey.includes(s);
                        const g = gains[s];
                        const hasGain = !!(g?.lo || g?.hi);
                        return (
                          <Pressable key={s}
                            onPress={() => setExpandedStats(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; })}
                            style={{
                              paddingHorizontal: 8, paddingVertical: 7,
                              borderBottomWidth: 1, borderBottomColor: theme.hairline,
                              borderLeftWidth: hasGain && isW ? 3 : 0,
                              borderLeftColor: cc,
                              backgroundColor: hasGain ? (isW ? cc + '1a' : cc + '0a') : 'transparent',
                            }}>
                            <Text style={{ fontFamily: theme.mono, fontSize: 7, letterSpacing: 0.5, color: hasGain ? (isW ? cc : isG ? theme.inkMuted : theme.inkGhost) : theme.hairline2 }} numberOfLines={1}>{s}</Text>
                            {hasGain ? (
                              <>
                                <Text style={{ fontFamily: theme.mono, fontSize: 11, fontWeight: isW ? '700' : '400', color: isW ? theme.ink : theme.inkMuted, marginTop: 1 }}>
                                  +{g?.lo}–{g?.hi}
                                </Text>
                                {!isW && (
                                  <Text style={{ fontFamily: theme.mono, fontSize: 7, color: theme.inkGhost, marginTop: 1 }}>×0.5</Text>
                                )}
                              </>
                            ) : (
                              <Text style={{ fontFamily: theme.mono, fontSize: 11, color: theme.hairline2, marginTop: 2 }}>—</Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  );
                })}
              </View>

              {/* Expanded manual-entry panel for tapped stat */}
              {expandedStats.size > 0 && (
                <View style={{ borderWidth: 1, borderColor: theme.hairline2, marginTop: 6, padding: 12, backgroundColor: theme.surface2 }}>
                  {[...expandedStats].map(stat => {
                    const g = gains[stat] ?? { lo: '', hi: '' };
                    const cc = statColor(stat);
                    return (
                      <View key={stat} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <MonoLabel size={9} color={cc}>{stat}</MonoLabel>
                          <Pressable onPress={() => setExpandedStats(prev => { const n = new Set(prev); n.delete(stat); return n; })}>
                            <MonoLabel size={9} color={theme.inkGhost}>✕</MonoLabel>
                          </Pressable>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <View style={{ flex: 1 }}>
                            <MonoLabel size={8} style={{ marginBottom: 4 }}>CURRENT</MonoLabel>
                            <TextInput keyboardType="numeric" value={statValues[stat] ?? ''} onChangeText={v => setStatValues(prev => ({ ...prev, [stat]: v }))} placeholder="0" placeholderTextColor={theme.inkGhost}
                              style={{ fontFamily: theme.mono, fontSize: 14, fontWeight: '700', color: theme.ink, borderWidth: 1, borderColor: theme.hairline2, padding: 8, textAlign: 'center' }} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <MonoLabel size={8} color={theme.pos} style={{ marginBottom: 4 }}>+LO</MonoLabel>
                            <TextInput keyboardType="numeric" value={g.lo} onChangeText={v => setGains(prev => ({ ...prev, [stat]: { ...(prev[stat] ?? { lo: '', hi: '' }), lo: v } }))} placeholder="0" placeholderTextColor={theme.inkGhost}
                              style={{ fontFamily: theme.mono, fontSize: 14, fontWeight: '700', color: theme.pos, borderWidth: 1, borderColor: theme.pos + '55', padding: 8, textAlign: 'center' }} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <MonoLabel size={8} color={theme.pos} style={{ marginBottom: 4 }}>+HI</MonoLabel>
                            <TextInput keyboardType="numeric" value={g.hi} onChangeText={v => setGains(prev => ({ ...prev, [stat]: { ...(prev[stat] ?? { lo: '', hi: '' }), hi: v } }))} placeholder="0" placeholderTextColor={theme.inkGhost}
                              style={{ fontFamily: theme.mono, fontSize: 14, fontWeight: '700', color: theme.pos, borderWidth: 1, borderColor: theme.pos + '55', padding: 8, textAlign: 'center' }} />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })()}

        {/* 4. ACTIONS */}
        <View style={{ gap: 8 }}>
          <Pressable onPress={saveToLog}
            style={{ borderWidth: 1, borderColor: saved ? theme.pos : theme.steelLight, padding: 14, alignItems: 'center', backgroundColor: saved ? theme.pos + '18' : 'transparent' }}>
            <Text style={{ fontFamily: theme.mono, fontSize: 11, letterSpacing: 2, color: saved ? theme.pos : theme.steelLight, fontWeight: '700' }}>
              {saved ? '✓ SAVED TO SQUAD PLAN' : '⊞ SAVE TO LOG'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/(tabs)/investment', params: { playerId: selectedPlayerId ?? '', sessions: multiplier } } as any)}
            style={{ borderWidth: 1, borderColor: theme.ink, padding: 14, alignItems: 'center', backgroundColor: theme.surface2 }}>
            <Text style={{ fontFamily: theme.mono, fontSize: 11, letterSpacing: 2, color: theme.ink, fontWeight: '700' }}>
              ▶ PROJECT
            </Text>
            <MonoLabel size={8} color={theme.inkGhost} style={{ marginTop: 3 }}>
              {selectedPlayerId ? `→ COACHES · ${playerName} · ×${multiplier}` : 'SELECT PLAYER FIRST'}
            </MonoLabel>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}
