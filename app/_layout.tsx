import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useDbMigration, ensureSnapshotColumn, ensureNewRoleColumns, ensureCoachHistoryTable, ensureDrillPlanHistoryTable } from '../src/db';
import { ManagerProvider } from '../src/context/ManagerContext';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { SplashAnimation } from '../src/components/SplashAnimation';

export default function RootLayout() {
  const { success, error } = useDbMigration();
  const [animDone, setAnimDone] = useState(false);

  useEffect(() => {
    if (success) {
      ensureSnapshotColumn();
      ensureNewRoleColumns();
      ensureCoachHistoryTable();
      ensureDrillPlanHistoryTable();
    }
  }, [success]);

  if (!animDone) {
    return <SplashAnimation onComplete={() => setAnimDone(true)} />;
  }

  if (!success) {
    if (error) console.error('Migration error:', error);
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#cc1111" size="large" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ManagerProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0f1117' } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="compare"
            options={{ headerShown: true, title: 'Scenario Comparator', headerStyle: { backgroundColor: '#1a1d27' }, headerTintColor: '#e2e8f0' }}
          />
          <Stack.Screen
            name="player/new"
            options={{ presentation: 'modal', headerShown: true, title: 'Add Player', headerStyle: { backgroundColor: '#1a1d27' }, headerTintColor: '#e2e8f0' }}
          />
          <Stack.Screen
            name="player/[id]"
            options={{ presentation: 'modal', headerShown: true, title: 'Edit Player', headerStyle: { backgroundColor: '#1a1d27' }, headerTintColor: '#e2e8f0' }}
          />
          <Stack.Screen
            name="coach/capture"
            options={{ headerShown: false }}
          />
        </Stack>
      </ManagerProvider>
    </ErrorBoundary>
  );
}
