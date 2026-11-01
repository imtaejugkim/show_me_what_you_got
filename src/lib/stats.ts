// 연속 기록(스트릭)과 이번 주 현황 계산
import { getHistory } from './storage';
import { dayKey } from './utils';

export type WeekDay = { label: string; done: boolean; isToday: boolean };

const LABELS = ['월', '화', '수', '목', '금', '토', '일'];

export async function getStreakStats(): Promise<{ streak: number; week: WeekDay[] }> {
  const history = await getHistory();
  const doneDays = new Set(history.filter((s) => s.verified).map((s) => dayKey(new Date(s.startedAt))));

  // 연속 일수: 오늘 증명했으면 오늘부터, 아니면 어제부터 거꾸로 센다 (오늘은 아직 기회가 있으니까)
  const cursor = new Date();
  if (!doneDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (doneDays.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // 이번 주 (월요일 시작)
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const week = LABELS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { label, done: doneDays.has(dayKey(d)), isToday: dayKey(d) === dayKey(today) };
  });

  return { streak, week };
}
