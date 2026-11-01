// 최상위 레이아웃 (안드로이드의 Application + MainActivity 역할)
import { IBMPlexSansKR_400Regular } from '@expo-google-fonts/ibm-plex-sans-kr/400Regular';
import { IBMPlexSansKR_500Medium } from '@expo-google-fonts/ibm-plex-sans-kr/500Medium';
import { IBMPlexSansKR_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-kr/600SemiBold';
import { IBMPlexSansKR_700Bold } from '@expo-google-fonts/ibm-plex-sans-kr/700Bold';
import { SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk/500Medium';
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk/600SemiBold';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { colors, fonts } from '../components/ui';
import { emitDataChanged } from '../lib/events';
import { requestNotificationPermission, setupNotifications } from '../lib/notifications';
import { handleNotificationResponse } from '../lib/responses';
import { syncSessions } from '../lib/sessions';

SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // 시안 글꼴: 한글 IBM Plex Sans KR, 숫자 Space Grotesk
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSansKR_400Regular,
    IBMPlexSansKR_500Medium,
    IBMPlexSansKR_600SemiBold,
    IBMPlexSansKR_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
  });
  const ready = fontsLoaded || !!fontError;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

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

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fonts.bold },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="group/[id]" options={{ title: '', headerBackTitle: '그룹' }} />
        <Stack.Screen name="place/new" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>
    </>
  );
}
