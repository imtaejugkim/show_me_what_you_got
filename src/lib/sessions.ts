// 운동/공부 "세션"의 시작·종료·동기화 로직. 앱의 핵심 비즈니스 로직입니다.
import { emitDataChanged } from './events';
import { notifyFinished } from './notifications';
import * as store from './storage';
import { ensureSignedIn, supabase } from './supabase';
import { MIN_MINUTES, type Kind, type Place, type Session } from './types';
import { minutesBetween, startOfToday, uuid } from './utils';

export async function startSession(input: { kind: Kind; place: Place | null }): Promise<Session> {
  const existing = await store.getActiveSession();
  if (existing) return existing; // 이미 진행 중이면 그대로

  const session: Session = {
    id: uuid(),
    kind: input.kind,
    placeId: input.place?.id ?? null,
    placeName: input.place?.name ?? '직접 시작',
    startedAt: new Date().toISOString(),
    endedAt: null,
    verified: false,
    synced: false,
  };
  await store.setActiveSession(session);
  emitDataChanged();
  syncSessions().catch(() => {}); // 그룹원에게 "운동 중" 표시
  return session;
}

export async function endSession(reason: 'left' | 'manual'): Promise<Session | null> {
  const active = await store.getActiveSession();
  if (!active) return null;

  const endedAt = new Date().toISOString();
  const minutes = minutesBetween(active.startedAt, endedAt);
  const finished: Session = {
    ...active,
    endedAt,
    endReason: reason,
    // "증명" 규칙: 최소 시간 이상 머물렀는가? (규칙은 여기서 계속 발전시키면 됩니다)
    verified: minutes >= MIN_MINUTES[active.kind],
    synced: false,
  };

  const history = await store.getHistory();
  await store.saveHistory([finished, ...history].slice(0, 500));
  await store.setActiveSession(null);
  await notifyFinished(finished);
  emitDataChanged();
  syncSessions().catch(() => {});
  return finished;
}

export async function getTodaySessions(): Promise<Session[]> {
  const since = startOfToday().getTime();
  const history = await store.getHistory();
  return history.filter((s) => new Date(s.startedAt).getTime() >= since);
}

/** 아직 서버에 안 올라간 기록들을 업로드 (네트워크 실패해도 다음에 다시 시도) */
export async function syncSessions() {
  if (!supabase) return;
  const userId = await ensureSignedIn();
  if (!userId) return;

  const active = await store.getActiveSession();
  const history = await store.getHistory();
  const pending = [...(active ? [active] : []), ...history.filter((s) => !s.synced)];
  if (pending.length === 0) return;

  const rows = pending.map((s) => ({
    id: s.id,
    user_id: userId,
    kind: s.kind,
    place_name: s.placeName,
    started_at: s.startedAt,
    ended_at: s.endedAt,
    verified: s.verified,
  }));
  const { error } = await supabase.from('sessions').upsert(rows);
  if (error) throw error;

  // 업로드하는 동안 새 기록이 추가됐을 수 있으니, 저장 직전에 다시 읽어서 표시만 바꾼다
  // (예전 목록으로 덮어쓰면 그 사이 끝난 세션이 사라짐)
  const syncedIds = new Set(pending.filter((s) => s.endedAt).map((s) => s.id));
  const latest = await store.getHistory();
  await store.saveHistory(latest.map((s) => (syncedIds.has(s.id) ? { ...s, synced: true } : s)));
}
