// 기기 안에 저장하는 데이터 (안드로이드의 SharedPreferences 같은 역할).
// 백그라운드 작업에서도 읽어야 하므로 장소/세션의 "원본"은 여기에 둡니다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Place, Session } from './types';

const KEYS = {
  places: 'smwyg/places',
  active: 'smwyg/activeSession',
  history: 'smwyg/history',
  lastPrompt: 'smwyg/lastPrompt',
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// ---- 장소 ----
export const getPlaces = () => readJson<Place[]>(KEYS.places, []);
export const savePlaces = (places: Place[]) => writeJson(KEYS.places, places);

// ---- 진행 중 세션 ----
export const getActiveSession = () => readJson<Session | null>(KEYS.active, null);
export async function setActiveSession(s: Session | null) {
  if (s) await writeJson(KEYS.active, s);
  else await AsyncStorage.removeItem(KEYS.active);
}

// ---- 지난 기록 ----
export const getHistory = () => readJson<Session[]>(KEYS.history, []);
export const saveHistory = (list: Session[]) => writeJson(KEYS.history, list);

// ---- 같은 장소 알림이 반복해서 뜨지 않게 마지막 알림 시각 기록 ----
export const getLastPrompts = () => readJson<Record<string, number>>(KEYS.lastPrompt, {});
export const saveLastPrompts = (m: Record<string, number>) => writeJson(KEYS.lastPrompt, m);
