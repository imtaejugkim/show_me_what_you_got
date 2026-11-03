export type Kind = 'workout' | 'study';

export const KINDS: Kind[] = ['workout', 'study'];

export const KIND_LABEL: Record<Kind, string> = {
  workout: '운동',
  study: '공부',
};

export const KIND_EMOJI: Record<Kind, string> = {
  workout: '💪',
  study: '📚',
};

/** Ionicons 아이콘 이름 */
export const KIND_ICON = {
  workout: 'barbell',
  study: 'book',
} as const satisfies Record<Kind, string>;

/**
 * 이 시간(분) 이상 머물러야 "증명 완료"로 인정합니다.
 * ⚠️ 서버(supabase/schema.sql 의 private.sessions_validate)도 같은 기준으로 다시 판정하므로, 바꿀 때는 둘 다 바꿔야 합니다.
 */
export const MIN_MINUTES: Record<Kind, number> = {
  workout: 30,
  study: 60,
};

/** 사용자가 등록한 장소 (헬스장, 독서실 등) */
export type Place = {
  id: string;
  name: string;
  kind: Kind;
  latitude: number;
  longitude: number;
  /** 지도에서 고를 때 변환한 주소 (표시용, 없을 수 있음) */
  address?: string;
  /** 지오펜스 반경 (미터). 너무 작으면 GPS 오차 때문에 인식이 잘 안 됩니다. 100m 이상 권장 */
  radius: number;
};

/** 한 번의 운동/공부 기록 */
export type Session = {
  id: string;
  kind: Kind;
  placeId: string | null;
  placeName: string;
  startedAt: string; // ISO
  endedAt: string | null; // ISO, 진행 중이면 null
  /** 최소 시간 이상 했는지 */
  verified: boolean;
  endReason?: 'left' | 'manual';
  /** 시작할 때의 장소 좌표·반경 (사진 인증 판정 기준. 직접 시작이면 없음) */
  placeLat?: number;
  placeLng?: number;
  placeRadius?: number;
  /** 사진 인증 */
  photo?: SessionPhoto;
  /** 서버(Supabase)에 올라갔는지 */
  synced: boolean;
};

export type SessionPhoto = {
  /** 이 기기에 저장된 압축 사진 (화면 표시용) */
  localUri: string;
  /** 서버 저장소 경로 {userId}/{sessionId}.jpg (업로드 전이면 없음) */
  path?: string;
  lat: number;
  lng: number;
  takenAt: string; // ISO
  /** 위치를 어디서 얻었는지: 사진 EXIF 또는 촬영 순간의 휴대폰 GPS */
  source: 'exif' | 'device';
  /** 장소 반경과의 거리 (미터) */
  distance: number;
  /** 앱에서 판정한 결과 (최종 판정은 서버가 다시 함) */
  verified: boolean;
};
