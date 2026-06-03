import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { playerService } from '../../src/services/assetService';
import { validateRoleAdjacency, isWhiteStat, OUTFIELD_STATS, GK_STATS_ALL, STAT_COLUMNS, COL_COLORS } from '../../src/utils/metricWeights';
import { AppHeader } from '../../src/components/AppHeader';
import { MonoLabel } from '../../src/components/atoms/MonoLabel';
import { theme, TIER_COLORS } from '../../src/constants/theme';
import { TierName, TalentTier } from '../../src/types/resources';
import { useScanner } from '../../src/hooks/useScanner';
import { computeOvrFromStats } from '../../src/logic/ovrProjector';
import gameProfileJson from '../../profiles/logistics_v1.json';
import { GameProfile } from '../../src/types/resources';

const profile = gameProfileJson as unknown as GameProfile;

const TIERS: TierName[] = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
const TALENT_TIERS: TalentTier[] = ['Fastest', 'Fast', 'Average', 'Normal', 'Slow', 'Unknown'];
const TALENT_LABEL: Record<TalentTier, string> = { Fastest: 'Fastest', Fast: 'Fast', Average: 'Average', Normal: 'Normal', Slow: 'Slow', Unknown: 'Unknown' };
const TALENT_INFO = 'Training rate — how quickly this player gains stats per session. Detected automatically from player card scan.';

const ROLE_GRID = [
  [null,  'ST',  null ],
  ['AML', 'AMC', 'AMR'],
  ['ML',  'MC',  'MR' ],
  [null,  'DMC', null ],
  ['DL',  'DC',  'DR' ],
  [null,  'GK',  null ],
];

const inputStyle = {
  backgroundColor: theme.surface,
  borderWidth: 1,
  borderColor: theme.hairline2,
  color: theme.ink,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  fontFamily: theme.mono,
};

export default function EditPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [name, setName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['ST']);
  const [age, setAge] = useState('18');
  const [overall, setOverall] = useState('100');
  const [tier, setTier] = useState<TierName>('T0');
  const [talent, setTalent] = useState<TalentTier>('Unknown');
  const [mutant, setMutant] = useState(false);
  const [roleError, setRoleError] = useState('');
  const [statInputs, setStatInputs] = useState<Record<string, string>>({});
  const [snapshot, setSnapshot] = useState<import('../../src/database/playerSchema').PlayerSnapshot | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [scanMsg, setScanMsg] = useState('');
  const [scanOk, setScanOk] = useState(false);
  const [scannedUri, setScannedUri] = useState<string | null>(null);
  const [scanRejected, setScanRejected] = useState(false);

  const { scanPlayerScreenshot, isScanning } = useScanner();

  const isGK = selectedRoles.includes('GK');
  const statList = isGK ? GK_STATS_ALL : OUTFIELD_STATS;

  useEffect(() => {
    if (!id) return;
    const p = playerService.getById(id);
    if (!p) return;
    setName(p.name);
    setSelectedRoles(p.role);
    setAge(p.age.toString());
    setOverall(p.overall.toString());
    setTier(p.tier);
    setTalent(p.talent ?? 'Unknown');
    setMutant(p.isMutantCandidate);
    setSnapshot(p.snapshot ?? null);
    if (p.stats && Object.keys(p.stats).length > 0) {
      setStatInputs(Object.fromEntries(Object.entries(p.stats).map(([k, v]) => [k, v.toString()])));
    }
  }, [id, reloadKey]);

  function toggleRole(role: string | null) {
    if (!role) return;
    setRoleError('');
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role));
      return;
    }
    // GK is exclusively standalone
    if (role === 'GK') {
      if (selectedRoles.some(r => r !== 'GK')) {
        setRoleError('GK IS STANDALONE — DESELECT OTHER ROLES FIRST');
        return;
      }
      setSelectedRoles(['GK']);
      return;
    }
    // Outfield role: block if GK is selected
    if (selectedRoles.includes('GK')) {
      setRoleError('DESELECT GK FIRST');
      return;
    }
    const next = [...selectedRoles, role];
    if (next.length > 3) { setRoleError('MAX 3 ROLES'); return; }
    if (!validateRoleAdjacency(next)) { setRoleError('NOT ADJACENT'); return; }
    setSelectedRoles(next);
  }

  async function rescanStats(_from: 'gallery') {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access in settings.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      setScannedUri(result.assets[0].uri);
      setScanRejected(false);
      setScanOk(false);
      setScanMsg('');
      const data = await scanPlayerScreenshot(result.assets[0].uri);
      if (!data) return;

      if (data.stats && Object.keys(data.stats).length > 0) {
        const updated = { ...statInputs, ...Object.fromEntries(
          Object.entries(data.stats).map(([k, v]) => [k, Math.round(v).toString()])
        )};
        setStatInputs(updated);
        // Infer GK when role OCR fails (stripe background) but GK stats are clearly present
        if ((!data.roles || data.roles.length === 0) && updated['REFLEXES'] !== undefined && updated['TACKLING'] === undefined) {
          setSelectedRoles(['GK']);
        } else if (data.roles && data.roles.length > 0) {
          setSelectedRoles(data.roles);
        }
        // Auto-recompute OVR from merged stats
        const statsObj: Record<string, number> = {};
        for (const [k, v] of Object.entries(updated)) {
          const n = parseFloat(v);
          if (!isNaN(n) && n > 0) statsObj[k] = n;
        }
        if (Object.keys(statsObj).length >= 10) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fakePlayer = { stats: statsObj, overall: parseFloat(overall) || 100, role: selectedRoles.length > 0 ? selectedRoles : ['ST'] } as any;
          setOverall(computeOvrFromStats(fakePlayer, profile).toFixed(1));
        }
        setScannedUri(null);
        setScanMsg(`${Object.keys(data.stats).length} STATS UPDATED — REVIEW AND SAVE`);
        setScanOk(true);
      } else {
        setScanRejected(true);
        setScanMsg('SCAN REJECTED — IMAGE NOT RECOGNISED');
      }
    } catch {
      setScanMsg('SCAN ERROR — TRY AGAIN');
    }
  }

  function save() {
    if (!id || !name.trim()) { Alert.alert('NAME REQUIRED'); return; }
    const ageNum = parseInt(age, 10);
    const ovrNum = parseFloat(overall);
    if (isNaN(ageNum) || ageNum < 14 || ageNum > 40) { Alert.alert('Age 14–40'); return; }
    if (isNaN(ovrNum) || ovrNum <= 0) { Alert.alert('Enter a valid OVR'); return; }

    const statsObj: Record<string, number> = {};
    for (const stat of statList) {
      const v = parseFloat(statInputs[stat] ?? '');
      if (!isNaN(v) && v > 0) statsObj[stat] = v;
    }

    playerService.update({
      id,
      name: name.trim(),
      role: selectedRoles,
      age: ageNum,
      overall: ovrNum,
      tier,
      talent,
      stats: statsObj,
      isMutantCandidate: mutant,
      snapshot,
    });
    router.back();
  }

  function confirmRevert() {
    if (!id || !snapshot) return;
    Alert.alert(
      'REVERT CARD',
      `Restore pre-apply snapshot?\n\nOVR ${snapshot.overall.toFixed(1)} · ${snapshot.tier}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revert',
          style: 'destructive',
          onPress: () => {
            playerService.revertToSnapshot(id);
            setSnapshot(null);
            setReloadKey(k => k + 1);
          },
        },
      ]
    );
  }

  function confirmDelete() {
    Alert.alert('DELETE ASSET', `Remove ${name} from your squad?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { if (id) { playerService.delete(id); router.dismiss(); } } },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader title="EDIT ASSET" subtitle="PROFILE · MUTABLE" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingHorizontal: 16, paddingBottom: 40 }}>

        {/* REVERT SNAPSHOT BANNER */}
        {snapshot && (
          <Pressable
            onPress={confirmRevert}
            style={{ borderWidth: 1, borderColor: theme.hot, backgroundColor: theme.hot + '18', padding: 12, marginBottom: 16 }}>
            <MonoLabel size={9} color={theme.hot} style={{ marginBottom: 2 }}>PRE-APPLY SNAPSHOT AVAILABLE</MonoLabel>
            <Text style={{ fontFamily: theme.mono, fontSize: 10, color: theme.hot }}>
              OVR {snapshot.overall.toFixed(1)} · {snapshot.tier.toUpperCase()} — TAP TO REVERT
            </Text>
          </Pressable>
        )}

        {/* IDENTITY */}
        <MonoLabel color={theme.steelLight} style={{ marginBottom: 8 }}>IDENTITY</MonoLabel>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name"
          placeholderTextColor={theme.inkGhost}
          style={{ ...inputStyle, fontFamily: theme.display, fontSize: 15, marginBottom: 8 }}
        />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <MonoLabel size={9} style={{ marginBottom: 4 }}>AGE</MonoLabel>
            <TextInput
              keyboardType="numeric"
              value={age}
              onChangeText={setAge}
              style={inputStyle}
            />
          </View>
          <View style={{ flex: 1 }}>
            <MonoLabel size={9} style={{ marginBottom: 4 }}>OVR</MonoLabel>
            <TextInput
              keyboardType="decimal-pad"
              value={overall}
              onChangeText={setOverall}
              style={inputStyle}
            />
          </View>
        </View>

        {/* POSITION GRID */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <MonoLabel color={theme.steelLight}>POSITION GRID</MonoLabel>
          <MonoLabel size={9} color={theme.inkMuted}>· MAX 3</MonoLabel>
        </View>
        <View style={{ borderWidth: 1, borderColor: theme.hairline2, marginBottom: 4, backgroundColor: theme.surface }}>
          {ROLE_GRID.map((row, ri) => {
            const gkSelected = selectedRoles.includes('GK');
            const hasOutfield = selectedRoles.some(r => r !== 'GK');
            return (
              <View key={ri} style={{ flexDirection: 'row', borderBottomWidth: ri < ROLE_GRID.length - 1 ? 1 : 0, borderBottomColor: theme.hairline }}>
                {row.map((role, ci) => {
                  const sel = role !== null && selectedRoles.includes(role);
                  const locked = role !== null && (
                    (role === 'GK' && hasOutfield) ||
                    (role !== 'GK' && gkSelected)
                  );
                  return (
                    <Pressable
                      key={`${ri}-${ci}`}
                      onPress={() => toggleRole(role)}
                      disabled={role === null || locked}
                      style={{
                        flex: 1,
                        paddingVertical: 13,
                        alignItems: 'center',
                        backgroundColor: sel ? theme.ink : 'transparent',
                        borderRightWidth: ci < 2 ? 1 : 0,
                        borderRightColor: theme.hairline,
                        opacity: locked ? 0.25 : 1,
                      }}
                    >
                      <Text style={{
                        fontFamily: theme.mono, fontSize: 11, letterSpacing: 1,
                        color: role ? (sel ? theme.bg : theme.inkSec) : 'transparent',
                      }}>{role ?? '·'}</Text>
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </View>
        {roleError ? (
          <MonoLabel size={10} color={theme.neg} style={{ marginBottom: 6 }}>⚠ {roleError}</MonoLabel>
        ) : null}

        {/* TIER */}
        <View style={{ marginTop: 18 }}>
          <MonoLabel color={theme.steelLight} style={{ marginBottom: 8 }}>TIER</MonoLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
            {TIERS.map(t => {
              const c = TIER_COLORS[t] ?? theme.inkMuted;
              const sel = tier === t;
              return (
                <Pressable key={t} onPress={() => setTier(t)} style={{
                  paddingHorizontal: 11, paddingVertical: 7,
                  backgroundColor: sel ? c : 'transparent',
                  borderWidth: 1, borderColor: sel ? c : c + '55',
                }}>
                  <Text style={{ fontFamily: theme.mono, fontSize: 10, letterSpacing: 1, color: sel ? theme.bg : c }}>
                    {t.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* TALENT */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <MonoLabel color={theme.steelLight}>TRAINING RATE</MonoLabel>
            <Pressable onPress={() => Alert.alert('Training Rate', TALENT_INFO)} style={{ marginLeft: 8, width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: theme.steelLight, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: theme.mono, fontSize: 9, color: theme.steelLight }}>?</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {TALENT_TIERS.map(t => {
              const sel = talent === t;
              return (
                <Pressable key={t} onPress={() => setTalent(t)} style={{
                  flex: 1, paddingVertical: 9, alignItems: 'center',
                  borderWidth: 1, borderColor: sel ? theme.ink : theme.hairline2,
                  backgroundColor: sel ? theme.ink : 'transparent',
                }}>
                  <Text style={{ fontFamily: theme.mono, fontSize: 10, letterSpacing: 1, color: sel ? theme.bg : theme.inkSec }}>
                    {TALENT_LABEL[t]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* MUTANT TOGGLE */}
        <Pressable onPress={() => setMutant(v => !v)} style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          backgroundColor: mutant ? theme.surface2 : theme.surface,
          borderWidth: 1, borderColor: mutant ? theme.hot : theme.hairline2,
          padding: 12, marginBottom: 20,
        }}>
          <View style={{
            width: 14, height: 14,
            backgroundColor: mutant ? theme.hot : 'transparent',
            borderWidth: 1, borderColor: mutant ? theme.hot : theme.inkMuted,
          }} />
          <Text style={{ fontFamily: theme.mono, fontSize: 11, letterSpacing: 1.4, color: mutant ? theme.hot : theme.inkSec }}>
            ★ MUTANT CANDIDATE
          </Text>
        </Pressable>

        {/* RESCAN STATS */}
        <MonoLabel color={theme.steelLight} style={{ marginBottom: 8 }}>UPDATE STATS</MonoLabel>
        <Pressable onPress={() => rescanStats('gallery')} disabled={isScanning}
          style={{ borderWidth: 1, borderColor: theme.steelLight, padding: 12, alignItems: 'center', marginBottom: 6, backgroundColor: theme.surface2 }}>
          {isScanning
            ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><ActivityIndicator color={theme.steelLight} size="small" /><Text style={{ fontFamily: theme.mono, fontSize: 11, letterSpacing: 1.5, color: theme.steelLight }}>SCANNING...</Text></View>
            : <Text style={{ fontFamily: theme.mono, fontSize: 11, letterSpacing: 1.5, color: theme.steelLight }}>◎ SCAN UPDATED PLAYER CARD</Text>
          }
        </Pressable>
        {scannedUri && scanRejected && (
          <View style={{ width: '100%', aspectRatio: 16 / 9, position: 'relative', marginBottom: 8, backgroundColor: '#000' }}>
            <Image source={{ uri: scannedUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <Text style={{ fontFamily: theme.mono, fontSize: 13, letterSpacing: 2, fontWeight: '700', color: theme.hot, marginBottom: 8 }}>INVALID IMAGE</Text>
              <Text style={{ fontFamily: theme.mono, fontSize: 9, color: theme.inkMuted, textAlign: 'center', letterSpacing: 1 }}>UPLOAD A SCREEN RESOLUTION PLAYER CARD</Text>
            </View>
          </View>
        )}

        {scanMsg !== '' && !scanRejected && (
          <View style={{ padding: 10, borderWidth: 1, borderColor: (scanOk ? theme.pos : theme.neg) + '55', backgroundColor: (scanOk ? theme.pos : theme.neg) + '0d', marginBottom: 12 }}>
            <MonoLabel size={9} color={scanOk ? theme.pos : theme.neg}>{scanMsg}</MonoLabel>
          </View>
        )}

        {/* STATS GRID — PRIMARY / SECONDARY */}
        {selectedRoles.length > 0 && (
          <>
            <MonoLabel color={theme.steelLight} style={{ marginBottom: 8 }}>STATS</MonoLabel>
            <View style={{ flexDirection: 'row', gap: 4, marginBottom: 24 }}>
              {(['PRIMARY', 'SECONDARY'] as const).map(col => {
                const cc = COL_COLORS[col];
                const colStats = STAT_COLUMNS[col].filter(s => (statList as readonly string[]).includes(s));
                if (colStats.length === 0) return null;
                return (
                  <View key={col} style={{ flex: 1, borderWidth: 1, borderColor: cc + '55' }}>
                    <View style={{ paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: cc, backgroundColor: cc + '28' }}>
                      <MonoLabel size={8} color={cc}>{col}</MonoLabel>
                    </View>
                    {colStats.map(s => {
                      const w = isWhiteStat(selectedRoles, s);
                      return (
                        <View key={s} style={{
                          paddingHorizontal: 8, paddingVertical: 7,
                          borderBottomWidth: 1,
                          borderBottomColor: w ? cc + '44' : theme.hairline,
                          borderLeftWidth: w ? 3 : 1,
                          borderLeftColor: w ? cc : theme.hairline2,
                          backgroundColor: w ? cc + '1a' : cc + '0a',
                        }}>
                          <MonoLabel size={7} color={w ? cc : theme.inkMuted}>{s}</MonoLabel>
                          <TextInput
                            keyboardType="numeric"
                            value={statInputs[s] ?? ''}
                            onChangeText={v => setStatInputs(prev => ({ ...prev, [s]: v }))}
                            placeholder="—"
                            placeholderTextColor={theme.inkMuted}
                            style={{
                              padding: 0, marginTop: 2,
                              color: w ? theme.ink : theme.inkMuted,
                              fontSize: 14, fontFamily: theme.mono,
                              fontWeight: w ? '700' : '400',
                            }}
                          />
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* CTAs */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={save} style={{
            flex: 1, backgroundColor: theme.ink, paddingVertical: 13,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontFamily: theme.mono, fontSize: 11, letterSpacing: 2, fontWeight: '600', color: theme.bg }}>
              SAVE
            </Text>
          </Pressable>
          <Pressable onPress={confirmDelete} style={{
            width: 100, paddingVertical: 13,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: theme.neg + '55',
          }}>
            <Text style={{ fontFamily: theme.mono, fontSize: 11, letterSpacing: 2, fontWeight: '600', color: theme.neg }}>
              DELETE
            </Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}
