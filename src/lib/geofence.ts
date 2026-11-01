// 지오펜스: 등록한 장소에 "들어감/나감"을 OS가 감지해서 알려주는 기능.
// 안드로이드의 GeofencingClient, iOS의 CLCircularRegion 을 expo-location 이 감싸고 있습니다.
// ⚠️ 이 파일은 index.ts 에서 가장 먼저 import 되어야 합니다 (앱이 꺼져 있을 때도 task 가 등록되도록).
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { notifyArrival } from './notifications';
import { endSession } from './sessions';
import * as store from './storage';

export const GEOFENCE_TASK = 'smwyg-geofence';

/** 같은 장소에 대해 알림을 다시 보내기까지 최소 간격 */
const PROMPT_COOLDOWN_MS = 3 * 60 * 60 * 1000; // 3시간

type GeofenceData = {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
};

TaskManager.defineTask<GeofenceData>(GEOFENCE_TASK, async ({ data, error }) => {
  if (error || !data?.region?.identifier) return;
  const type = data.eventType === Location.GeofencingEventType.Enter ? 'enter' : 'exit';
  await handleRegionEvent(type, data.region.identifier);
});

/** 장소 진입/이탈 처리. 테스트 버튼에서도 이 함수를 직접 호출합니다. */
export async function handleRegionEvent(
  type: 'enter' | 'exit',
  placeId: string,
  opts: { ignoreCooldown?: boolean } = {},
) {
  const place = (await store.getPlaces()).find((p) => p.id === placeId);
  if (!place) return;
  const active = await store.getActiveSession();

  if (type === 'enter') {
    if (active) return; // 이미 진행 중
    const last = await store.getLastPrompts();
    if (!opts.ignoreCooldown && Date.now() - (last[placeId] ?? 0) < PROMPT_COOLDOWN_MS) return;
    await store.saveLastPrompts({ ...last, [placeId]: Date.now() });
    await notifyArrival(place);
  } else {
    // 이 장소에서 진행 중인 세션이 있으면 자동 종료 → 증명 판정
    if (active && active.placeId === placeId) {
      await endSession('left');
    }
  }
}

/**
 * 위치 권한 요청. 백그라운드 감지를 위해 "항상 허용"이 필요합니다.
 * 안드로이드 11+ 는 앱 안에서 바로 "항상 허용"을 띄울 수 없어 설정 화면으로 이동합니다.
 */
export async function requestLocationPermissions(): Promise<'always' | 'foreground' | 'denied'> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return 'denied';
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.granted ? 'always' : 'foreground';
}

/** 저장된 장소 목록으로 OS 지오펜스를 다시 등록 (장소 추가/삭제 후 호출) */
export async function syncGeofences(): Promise<{ ok: boolean; reason?: string }> {
  const places = await store.getPlaces();
  const started = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK).catch(() => false);

  if (places.length === 0) {
    if (started) await Location.stopGeofencingAsync(GEOFENCE_TASK);
    return { ok: true };
  }

  const bg = await Location.getBackgroundPermissionsAsync();
  if (!bg.granted) return { ok: false, reason: '위치 권한을 "항상 허용"으로 바꿔야 자동 감지가 됩니다.' };

  await Location.startGeofencingAsync(
    GEOFENCE_TASK,
    places.map((p) => ({
      identifier: p.id,
      latitude: p.latitude,
      longitude: p.longitude,
      radius: p.radius,
      notifyOnEnter: true,
      notifyOnExit: true,
    })),
  );
  return { ok: true };
}
