// 사용자가 알림(또는 알림의 버튼)을 눌렀을 때 처리
import * as Notifications from 'expo-notifications';
import { ACTION_LATER } from './notifications';
import { startSession } from './sessions';
import { getPlaces } from './storage';

const handled = new Set<string>();

export async function handleNotificationResponse(res: Notifications.NotificationResponse) {
  const id = res.notification.request.identifier;
  if (handled.has(id)) return; // 같은 응답이 두 번 들어오는 경우 방지
  handled.add(id);

  const data = res.notification.request.content.data as { type?: string; placeId?: string };
  if (data?.type !== 'arrival' || !data.placeId) return;
  if (res.actionIdentifier === ACTION_LATER) return;

  // "시작하기" 버튼 또는 알림 본문 탭 → 세션 시작
  const place = (await getPlaces()).find((p) => p.id === data.placeId);
  if (!place) return;
  await startSession({ kind: place.kind, place });
  await Notifications.dismissNotificationAsync(id).catch(() => {});
}
