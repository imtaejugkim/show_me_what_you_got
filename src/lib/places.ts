// 장소 추가/삭제 + OS 지오펜스 갱신을 한곳에서 처리
import * as Location from 'expo-location';
import { emitDataChanged } from './events';
import { syncGeofences } from './geofence';
import { getPlaces, savePlaces } from './storage';
import type { Place } from './types';
import { distanceMeters, uuid } from './utils';

export async function addPlace(input: Omit<Place, 'id'>) {
  const places = await getPlaces();
  await savePlaces([...places, { ...input, id: uuid() }]);
  emitDataChanged();
  return syncGeofences();
}

export async function removePlace(id: string) {
  const places = await getPlaces();
  await savePlaces(places.filter((p) => p.id !== id));
  emitDataChanged();
  return syncGeofences();
}

/** GPS 오차를 감안해 반경에 더해주는 여유 (미터) */
export const GPS_MARGIN_M = 50;

/**
 * 지금 이 장소 반경 안에 있는지 확인.
 * 위치를 못 가져오면 null (판단 불가) 을 돌려준다.
 */
export async function checkNearPlace(place: Place): Promise<{ near: boolean; distance: number } | null> {
  try {
    const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const distance = distanceMeters(here.coords, place);
    return { near: distance <= place.radius + GPS_MARGIN_M, distance };
  } catch {
    return null;
  }
}
