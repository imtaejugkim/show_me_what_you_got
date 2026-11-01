// 사용자가 알림(또는 알림의 버튼)을 눌렀을 때 처리
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';
import { haptic } from './haptics';
import { ACTION_LATER } from './notifications';
import { checkNearPlace } from './places';
import { startSession } from './sessions';
import { getPlaces } from './storage';

/** 위치를 확인할 수 없을 때, 도착 알림을 이 시간 안에 눌렀으면 시작을 허용 */
const FRESH_MS = 30 * 60 * 1000;

const handled = new Set<string>();

export async function handleNotificationResponse(res: Notifications.NotificationResponse) {
  const id = res.notification.request.identifier;
  if (handled.has(id)) return; // 같은 응답이 두 번 들어오는 경우 방지
  handled.add(id);
  // 앱을 다시 켤 때마다 "마지막으로 누른 알림"이 다시 처리되지 않도록 지운다
  Notifications.clearLastNotificationResponse();

  const data = res.notification.request.content.data as { type?: string; placeId?: string };
  if (data?.type !== 'arrival' || !data.placeId) return;
  if (res.actionIdentifier === ACTION_LATER) return;

  // "시작하기" 버튼 또는 알림 본문 탭 → 지금도 그 장소에 있는지 확인한 뒤 세션 시작
  const place = (await getPlaces()).find((p) => p.id === data.placeId);
  if (!place) return;

  const check = await checkNearPlace(place);
  const fresh = Date.now() - res.notification.date < FRESH_MS;
  if (check ? !check.near : !fresh) {
    haptic.error();
    Alert.alert(
      '장소 밖이에요',
      check
        ? `"${place.name}"에서 약 ${Math.round(check.distance)}m 떨어져 있어서 시작할 수 없어요.`
        : '현재 위치를 확인할 수 없고 알림이 오래돼서 시작하지 않았어요. 장소에서 다시 시작해 주세요.',
    );
    return;
  }

  await startSession({ kind: place.kind, place });
  haptic.success();
  await Notifications.dismissNotificationAsync(id).catch(() => {});
}
