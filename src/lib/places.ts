// 장소 추가/삭제 + OS 지오펜스 갱신을 한곳에서 처리
import { emitDataChanged } from './events';
import { syncGeofences } from './geofence';
import { getPlaces, savePlaces } from './storage';
import type { Place } from './types';
import { uuid } from './utils';

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
