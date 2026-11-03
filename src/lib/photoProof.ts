// 사진 인증: 진행 중인 세션에서 사진을 찍으면 → 찍은 위치가 장소 반경 안인지 확인 → 압축해서 비공개 저장소에 업로드
//
// 위치 판단 순서
//  1) 사진 EXIF 의 GPS (있으면 우선)
//  2) 없으면 촬영 직후 휴대폰 GPS
//     - iPhone 앱 내 카메라는 EXIF 에 GPS 를 안 넣는 경우가 많고,
//       안드로이드는 권한 없이 읽으면 사진 GPS 를 0 으로 가려서 보내기 때문
// 앨범 사진은 받지 않는다 (예전에 찍은 사진으로 인증하는 걸 막기 위해 앱 안에서 바로 촬영)
// 최종 판정은 서버(supabase/schema.sql 의 sessions_validate)가 거리·시간을 다시 계산해서 한다
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { emitDataChanged } from './events';
import { readExif } from './exif';
import { GPS_MARGIN_M } from './places';
import { syncSessions } from './sessions';
import * as store from './storage';
import { currentUserId, supabase } from './supabase';
import type { SessionPhoto } from './types';
import { distanceMeters } from './utils';

/** 세션 시간 앞뒤로 허용하는 여유 (서버와 같은 값) */
const TIME_MARGIN_MS = 5 * 60 * 1000;

export type ProofResult =
  | { status: 'cancelled' }
  | { status: 'no_permission' }
  | { status: 'no_location' }
  | { status: 'outside'; distance: number }
  | { status: 'too_old' }
  | { status: 'ok'; photo: SessionPhoto; uploaded: boolean };

export async function takeProofPhoto(): Promise<ProofResult> {
  const session = await store.getActiveSession();
  if (!session || session.placeLat == null || session.placeLng == null || session.placeRadius == null) {
    throw new Error('등록한 장소에서 진행 중인 기록이 있어야 사진 인증을 할 수 있어요.');
  }

  const cam = await ImagePicker.requestCameraPermissionsAsync();
  if (!cam.granted) return { status: 'no_permission' };

  const shot = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, exif: true });
  if (shot.canceled || !shot.assets?.[0]) return { status: 'cancelled' };
  const asset = shot.assets[0];
  const capturedAt = new Date();

  // 위치: EXIF → 없으면 촬영 직후 휴대폰 GPS
  const exif = readExif(asset.exif);
  let coords = exif.coords;
  let source: SessionPhoto['source'] = 'exif';
  if (!coords) {
    try {
      const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      coords = { latitude: here.coords.latitude, longitude: here.coords.longitude };
      source = 'device';
    } catch {
      return { status: 'no_location' };
    }
  }

  // 시각: EXIF 촬영 시각이 있으면 그걸, 없으면 지금. 세션 시간 안이어야 함
  const takenAt = exif.takenAt ?? capturedAt;
  if (takenAt.getTime() < new Date(session.startedAt).getTime() - TIME_MARGIN_MS) return { status: 'too_old' };

  const distance = distanceMeters(coords, { latitude: session.placeLat, longitude: session.placeLng });
  if (distance > session.placeRadius + GPS_MARGIN_M) return { status: 'outside', distance };

  // 압축 (긴 변 1280px, JPEG 70%) → 업로드 용량을 1MB 아래로
  const rendered = await ImageManipulator.manipulate(asset.uri).resize(asset.width >= asset.height ? { width: 1280 } : { height: 1280 }).renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });

  const photo: SessionPhoto = {
    localUri: saved.uri,
    lat: coords.latitude,
    lng: coords.longitude,
    takenAt: takenAt.toISOString(),
    source,
    distance: Math.round(distance),
    verified: true,
  };

  // 서버 업로드 (로그인 안 됐거나 실패하면 기기에만 저장하고, 결과로 알려줌)
  let uploaded = false;
  const uid = await currentUserId();
  if (supabase && uid) {
    const path = `${uid}/${session.id}.jpg`;
    const bytes = await new File(saved.uri).arrayBuffer();
    const { error } = await supabase.storage.from('proofs').upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
    if (!error) {
      photo.path = path;
      uploaded = true;
    }
  }

  // 진행 중 세션에 붙이고 서버 기록도 갱신 (서버가 사진 인증 여부를 다시 판정)
  const latest = await store.getActiveSession();
  if (latest?.id === session.id) {
    await store.setActiveSession({ ...latest, photo, synced: false });
    emitDataChanged();
    syncSessions().catch(() => {});
  }
  return { status: 'ok', photo, uploaded };
}

/** 회원 탈퇴 시 내 인증 사진 전부 삭제 */
export async function deleteMyPhotos(uid: string) {
  if (!supabase) return;
  const { data } = await supabase.storage.from('proofs').list(uid, { limit: 1000 });
  const paths = (data ?? []).map((f) => `${uid}/${f.name}`);
  if (paths.length > 0) await supabase.storage.from('proofs').remove(paths);
}
