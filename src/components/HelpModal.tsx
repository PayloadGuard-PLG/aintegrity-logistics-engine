import { useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { theme } from '../constants/theme';
import { MonoLabel } from './atoms/MonoLabel';

const FAQ: { q: string; a: string }[] = [
  {
    q: 'What are white stats?',
    a: 'White (essential) stats are the ones that directly matter for your player\'s role. They receive full XP from training. Grey stats cost 2× XP for the same gain — focus on whites.',
  },
  {
    q: 'How do I add a player?',
    a: 'Tap + on the Squad screen. Enter their name, role(s), and tier. Scan their card or type stats manually. OVR auto-calculates from entered stats.',
  },
  {
    q: 'What does Efficiency mean in Drills?',
    a: 'The fraction of a drill\'s trained stats that are white for your player. 100% = every stat the drill trains is a white stat. Prioritise high efficiency + low COND·LOSS.',
  },
  {
    q: 'What does COND·LOSS mean?',
    a: 'The % of condition drained per session at the drill\'s own intensity level, adjusted for your fan club level. L4 gives a 50% reduction. Very Easy drills at L4 reach zero drain.',
  },
  {
    q: 'What do fan club levels do?',
    a: 'They reduce condition drain. L0 = 10% reduction, L1 = 15%, L2 = 20%, L3 = 25%, L4 = 50%. At L4, the lightest drills (Very Easy) hit zero drain.',
  },
  {
    q: 'How does the Coach scanner work?',
    a: 'Go to Coaches → scan a coach preview image. The OCR reads the stat gains shown. Detected stats are auto-selected. Adjust the selection, then press Calculate to see projected gains.',
  },
  {
    q: 'What is a tier?',
    a: 'Tiers (T0–T6) represent quality levels for players. Higher tiers add a flat attribute bonus to all role-relevant stats. T0 = base quality, T6 = maximum quality.',
  },
  {
    q: 'What is ROI in the drill list?',
    a: 'Return on investment = efficiency ÷ condition cost. Drills at the top train the most of your white stats while draining the least condition.',
  },
  {
    q: 'How does the Plan tab work?',
    a: 'Add drill sessions for a player across a training period. The engine calculates projected stat gains and OVR change, accounting for fan club level, Match Advisor, and XP costs.',
  },
  {
    q: 'What is Match Advisor?',
    a: 'When active, it covers condition decay between sessions, letting you train more aggressively. Toggle it in the Plan tab.',
  },
];

function HelpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: theme.bg, borderTopWidth: 1, borderTopColor: theme.hairline, maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.hairline }}>
            <View style={{ flex: 1 }}>
              <MonoLabel size={9} color={theme.steelLight} style={{ marginBottom: 2 }}>USER GUIDE</MonoLabel>
              <Text style={{ fontFamily: theme.display, fontSize: 18, fontWeight: '600', color: theme.ink }}>FAQ</Text>
            </View>
            <Pressable onPress={onClose} style={{ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: theme.hairline2 }}>
              <Text style={{ fontFamily: theme.mono, fontSize: 11, color: theme.inkSec }}>CLOSE</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
            {FAQ.map((item, i) => (
              <View key={i} style={{ marginBottom: 18, paddingBottom: 18, borderBottomWidth: i < FAQ.length - 1 ? 1 : 0, borderBottomColor: theme.hairline }}>
                <MonoLabel size={9} color={theme.steelLight} style={{ marginBottom: 6 }}>{item.q}</MonoLabel>
                <Text style={{ fontFamily: theme.display, fontSize: 13, color: theme.inkSec, lineHeight: 20 }}>{item.a}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function useHelp() {
  const [visible, setVisible] = useState(false);
  return {
    helpButton: (
      <Pressable onPress={() => setVisible(true)} style={{
        width: 26, height: 26, borderWidth: 1, borderColor: theme.hairline2,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontFamily: theme.mono, fontSize: 12, color: theme.inkSec }}>?</Text>
      </Pressable>
    ),
    helpModal: <HelpModal visible={visible} onClose={() => setVisible(false)} />,
  };
}
