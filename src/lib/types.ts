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

/** 이 시간(분) 이상 머물러야 "증명 완료"로 인정합니다. 나중에 그룹별 설정으로 바꿔도 됩니다. */
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
  /** 서버(Supabase)에 올라갔는지 */
  synced: boolean;
};
