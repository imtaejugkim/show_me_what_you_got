// 최상위 레이아웃 (안드로이드의 Application + MainActivity 역할)
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { colors } from '../components/ui';
import { emitDataChanged } from '../lib/events';
import { requestNotificationPermission, setupNotifications } from '../lib/notifications';
import { handleNotificationResponse } from '../lib/responses';
import { syncSessions } from '../lib/sessions';

export default function RootLayout() {
  // 앱이 꺼진 상태에서 알림을 눌러 앱이 켜진 경우
  const lastResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (lastResponse) handleNotificationResponse(lastResponse);
  }, [lastResponse]);

  useEffect(() => {
    setupNotifications().then(requestNotificationPermission).catch(console.warn);

    // 앱이 켜져 있을 때 알림을 누른 경우
    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    // 백그라운드에서 돌아오면 (지오펜스로 세션이 바뀌었을 수 있으니) 새로고침 + 서버 동기화
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        emitDataChanged();
        syncSessions().catch(() => {});
      }
    });
    syncSessions().catch(() => {});

    return () => {
      sub.remove();
      appState.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="group/[id]" options={{ title: '그룹' }} />
      </Stack>
    </>
  );
}
