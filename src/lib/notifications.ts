import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { KIND_EMOJI, KIND_LABEL, MIN_MINUTES, type Place, type Session } from './types';
import { formatDuration, minutesBetween } from './utils';

export const ARRIVAL_CATEGORY = 'ARRIVAL';
export const ACTION_START = 'START';
export const ACTION_LATER = 'LATER';
const CHANNEL_ID = 'proof';

/** 앱 시작 시 1번 호출 */
export async function setupNotifications() {
  // 앱이 켜져 있을 때(포그라운드)도 알림을 보여줌
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: '인증 알림',
      importance: AndroidImportance.HIGH,
    });
  }

  // "도착했어요" 알림에 붙는 버튼 2개
  await Notifications.setNotificationCategoryAsync(ARRIVAL_CATEGORY, [
    { identifier: ACTION_START, buttonTitle: '시작한다', options: { opensAppToForeground: true } },
    { identifier: ACTION_LATER, buttonTitle: '오늘은 패스', options: { opensAppToForeground: false } },
  ]);
}

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

function show(content: Notifications.NotificationContentInput) {
  return Notifications.scheduleNotificationAsync({
    content,
    trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
  });
}

export function notifyArrival(place: Place) {
  return show({
    title: `${KIND_EMOJI[place.kind]} ${place.name} 도착.`,
    body: `왔으면 ${KIND_LABEL[place.kind]} 시작해. 오늘도 증명해라.`,
    categoryIdentifier: ARRIVAL_CATEGORY,
    data: { type: 'arrival', placeId: place.id },
  });
}

export function notifyFinished(s: Session) {
  const minutes = minutesBetween(s.startedAt, s.endedAt);
  const need = MIN_MINUTES[s.kind];
  return show({
    title: s.verified ? `✅ 오늘 ${KIND_LABEL[s.kind]} 증명 완료. 잘했다.` : `⚠️ ${KIND_LABEL[s.kind]} 시간 부족. 인정 못 한다.`,
    body: s.verified
      ? `${s.placeName}에서 ${formatDuration(minutes)} 버텼다.`
      : `${formatDuration(minutes)} 했어. 최소 ${need}분은 채워야 인정.`,
    data: { type: 'finished', sessionId: s.id },
  });
}
