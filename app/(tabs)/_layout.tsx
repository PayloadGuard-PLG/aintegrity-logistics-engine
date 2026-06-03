import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="assets" />
      <Tabs.Screen name="plan" />
      <Tabs.Screen name="drills" />
      <Tabs.Screen name="investment" />
      <Tabs.Screen name="results" />
      <Tabs.Screen name="squad-plan" />
    </Tabs>
  );
}
