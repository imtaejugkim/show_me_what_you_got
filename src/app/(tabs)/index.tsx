// "오늘" 화면 (시안: 오늘 — 운동 중)
// 연속 기록 → 진행 중 세션(또는 시작 버튼) → 운동/공부 타일 → 그룹 요약 → 오늘 기록
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import {
  Avatar,
  Button,
  Card,
  colors,
  Divider,
  fonts,
  IconBadge,
  IconButton,
  ListCard,
  Pill,
  ProgressBar,
  Row,
  Screen,
  Section,
  space,
  type,
} from '../../components/ui';
import { requestLocationPermissions, syncGeofences } from '../../lib/geofence';
import { haptic } from '../../lib/haptics';
import { GPS_MARGIN_M } from '../../lib/places';
import { getGroupToday, listMyGroups, type Group } from '../../lib/groups';
import { endSession, getTodaySessions, startSession } from '../../lib/sessions';
import { useSession } from '../../lib/session';
import { getStreakStats, type WeekDay } from '../../lib/stats';
import { getActiveSession, getPlaces } from '../../lib/storage';
import { isServerEnabled } from '../../lib/supabase';
import { KIND_ICON, KIND_LABEL, KINDS, MIN_MINUTES, type Kind, type Place, type Session } from '../../lib/types';
import { useRefreshOnChange } from '../../lib/useRefreshOnChange';
import { distanceMeters, formatClock, formatDuration, formatTime, formatToday, minutesBetween } from '../../lib/utils';

type GroupSummary = { group: Group; done: number; total: number; members: { name: string; done: boolean }[] };

export default function TodayScreen() {
  const [active, setActive] = useState<Session | null>(null);
  const [activePlace, setActivePlace] = useState<Place | null>(null);
  const [today, setToday] = useState<Session[]>([]);
  const [streak, setStreak] = useState<{ streak: number; week: WeekDay[] }>({ streak: 0, week: [] });
  const [groupSummary, setGroupSummary] = useState<GroupSummary | null>(null);
  const { nickname } = useSession();
  const [bgGranted, setBgGranted] = useState(true);
  const [, tick] = useState(0);
  const [busy, setBusy] = useState<Kind | 'end' | null>(null);

  const load = useCallback(() => {
    Promise.all([getActiveSession(), getPlaces()]).then(([s, places]) => {
      setActive(s);
      setActivePlace(places.find((p) => p.id === s?.placeId) ?? null);
    });
    getTodaySessions().then(setToday);
    getStreakStats().then(setStreak);
    Location.getBackgroundPermissionsAsync().then((p) => setBgGranted(p.granted));
    if (isServerEnabled) loadGroupSummary().then(setGroupSummary).catch(() => {});
  }, []);
  useRefreshOnChange(load);

  // 진행 중 타이머를 위해 30초마다 다시 그리기
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  async function fixPermission() {
    const result = await requestLocationPermissions();
    if (result !== 'always') {
      Alert.alert('위치 권한', '설정 > 위치 > "항상 허용"을 선택해 주세요.', [
        { text: '취소', style: 'cancel' },
        { text: '설정 열기', onPress: () => Linking.openSettings() },
      ]);
    }
    await syncGeofences();
    load();
  }

  /** 수동 시작: 지금 등록한 장소 안에 있을 때만 허용 (그래야 "증명"이니까) */
  async function manualStart(kind: Kind) {
    setBusy(kind);
    try {
      const places = (await getPlaces()).filter((p) => p.kind === kind);
      if (places.length === 0) {
        Alert.alert('장소가 없어요', `${KIND_LABEL[kind]}할 장소를 먼저 등록해 주세요.`, [
          { text: '취소', style: 'cancel' },
          { text: '장소 등록', onPress: () => router.push('/place/new') },
        ]);
        return;
      }
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return;
      const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const near = places.map((p) => ({ p, d: distanceMeters(here.coords, p) })).sort((a, b) => a.d - b.d)[0];
      // GPS 오차를 감안해 반경 + 여유(GPS_MARGIN_M) 까지 허용
      if (near.d > near.p.radius + GPS_MARGIN_M) {
        haptic.error();
        Alert.alert('장소 밖이에요', `가장 가까운 "${near.p.name}"까지 약 ${Math.round(near.d)}m 남았어요.`);
        return;
      }
      await startSession({ kind, place: near.p });
      haptic.success();
    } catch (e) {
      Alert.alert('오류', String(e));
    } finally {
      setBusy(null);
    }
  }

  function confirmEnd() {
    if (!active) return;
    const mins = minutesBetween(active.startedAt, null);
    const need = MIN_MINUTES[active.kind];
    Alert.alert(
      '종료할까요?',
      mins >= need ? `${formatDuration(mins)} 했어요. 증명 완료!` : `아직 ${need - mins}분 더 해야 인증돼요. 그래도 종료할까요?`,
      [
        { text: '계속하기', style: 'cancel' },
        {
          text: '종료',
          style: 'destructive',
          onPress: async () => {
            setBusy('end');
            const finished = await endSession('manual');
            if (finished?.verified) haptic.success();
            else haptic.warning();
            setBusy(null);
          },
        },
      ],
    );
  }

  const doneMinutes = (k: Kind) =>
    today.filter((s) => s.kind === k && s.verified).reduce((sum, s) => sum + minutesBetween(s.startedAt, s.endedAt), 0);

  return (
    <Screen
      eyebrow={formatToday()}
      title="오늘의 증명"
      right={
        nickname ? (
          <Pressable accessibilityRole="button" accessibilityLabel="내 프로필" onPress={() => router.push('/profile')}>
            <Avatar name={nickname} size={44} ring={colors.borderStrong} />
          </Pressable>
        ) : (
          <IconButton name="person-outline" label="내 프로필" onPress={() => router.push('/profile')} />
        )
      }
    >
      {!bgGranted && (
        <Pressable accessibilityRole="button" onPress={fixPermission}>
          <Card tone="danger" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14 }}>
            <IconBadge name="location-outline" color={colors.danger} bg={colors.dangerSoft} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={type.rowTitle}>자동 감지가 꺼져 있어요</Text>
              <Text style={type.caption}>위치 권한을 ‘항상 허용’으로 바꿔주세요</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.sub} />
          </Card>
        </Pressable>
      )}

      <StreakCard streak={streak.streak} week={streak.week} />

      {active ? (
        <Card size="lg" tone="accent" style={{ gap: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pill label={`${KIND_LABEL[active.kind]} 중`} tone="accent" dot />
            <Text style={type.caption}>{formatTime(active.startedAt)} 시작</Text>
          </View>
          <ActiveTimer session={active} place={activePlace} />
          <Button title="종료하기" variant="secondary" icon="stop" onPress={confirmEnd} loading={busy === 'end'} />
        </Card>
      ) : (
        <Card size="lg" style={{ gap: space.lg }}>
          <View style={{ gap: 4 }}>
            <Text style={type.title}>오늘도 증명해 볼까요?</Text>
            <Text style={type.caption}>등록한 장소에 도착하면 알림이 와요. 이미 도착했다면 바로 시작하세요.</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            {KINDS.map((k) => (
              <Button
                key={k}
                title={KIND_LABEL[k]}
                icon={KIND_ICON[k]}
                variant={k === 'workout' ? 'primary' : 'secondary'}
                style={{ flex: 1, height: 50 }}
                loading={busy === k}
                onPress={() => manualStart(k)}
              />
            ))}
          </View>
        </Card>
      )}

      {/* 운동 / 공부 타일 */}
      <View style={{ flexDirection: 'row', gap: space.md }}>
        {KINDS.map((k) => {
          const mins = doneMinutes(k);
          const done = mins > 0;
          const live = active?.kind === k;
          return (
            <Card key={k} tone={done ? 'accent' : undefined} style={{ flex: 1, gap: 14, borderRadius: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <IconBadge name={KIND_ICON[k]} color={done ? colors.onAccent : colors.text} bg={done ? colors.accent : colors.surfaceHigh} />
                {done ? <Ionicons name="checkmark-circle-outline" size={24} color={colors.accent} accessibilityLabel="완료" /> : null}
              </View>
              <View style={{ gap: 2 }}>
                <Text style={type.caption}>{KIND_LABEL[k]}</Text>
                <Text style={type.title}>{done ? formatDuration(mins) : live ? '진행 중' : '아직'}</Text>
              </View>
            </Card>
          );
        })}
      </View>

      {groupSummary && (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/group/[id]',
              params: { id: groupSummary.group.id, name: groupSummary.group.name, code: groupSummary.group.invite_code },
            })
          }
          style={({ pressed }) => pressed && { opacity: 0.7 }}
        >
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14 }}>
            <View style={{ flexDirection: 'row' }}>
              {groupSummary.members.slice(0, 3).map((m, i) => (
                <View key={i} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                  <Avatar name={m.name} active={m.done} size={30} ring={colors.surface} />
                </View>
              ))}
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={type.rowTitle} numberOfLines={1}>
                {groupSummary.group.name}
              </Text>
              <Text style={type.caption}>
                오늘 {groupSummary.done}/{groupSummary.total}명 증명 완료
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.sub} />
          </Card>
        </Pressable>
      )}

      {today.length > 0 && (
        <Section title="오늘 기록">
          <ListCard>
            {today.map((s, i) => (
              <View key={s.id}>
                {i > 0 && <Divider />}
                <Row
                  icon={KIND_ICON[s.kind]}
                  iconColor={s.verified ? colors.accent : colors.sub}
                  iconBg={s.verified ? colors.accentSoft : colors.surfaceHigh}
                  title={s.placeName}
                  subtitle={`${formatTime(s.startedAt)} – ${s.endedAt ? formatTime(s.endedAt) : ''} · ${formatDuration(minutesBetween(s.startedAt, s.endedAt))}`}
                  right={s.verified ? <Pill label="완료" tone="ok" /> : <Pill label="시간 부족" tone="danger" />}
                />
              </View>
            ))}
          </ListCard>
        </Section>
      )}
    </Screen>
  );
}

async function loadGroupSummary(): Promise<GroupSummary | null> {
  const groups = await listMyGroups();
  if (groups.length === 0) return null;
  const group = groups[0];
  const rows = await getGroupToday(group.id);
  const byUser = new Map<string, { name: string; done: boolean }>();
  for (const r of rows) {
    const prev = byUser.get(r.user_id);
    byUser.set(r.user_id, { name: r.nickname, done: (prev?.done ?? false) || !!r.verified });
  }
  const members = [...byUser.values()].sort((a, b) => Number(b.done) - Number(a.done));
  return { group, members, done: members.filter((m) => m.done).length, total: members.length };
}

function StreakCard({ streak, week }: { streak: number; week: WeekDay[] }) {
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name="flame-outline" size={20} color={colors.accent} />
        <Text style={type.body}>
          <Text style={{ fontFamily: fonts.bold }}>{streak > 0 ? `${streak}일 연속` : '오늘 시작해 보세요'}</Text>
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel="이번 주 현황">
        {week.map((d) => (
          <View key={d.label} style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 10, fontFamily: fonts.semibold, color: d.isToday ? colors.text : colors.sub }}>{d.label}</Text>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: d.done ? colors.accent : 'transparent',
                borderWidth: d.done ? 0 : 1.5,
                borderColor: colors.accent,
              }}
            />
          </View>
        ))}
      </View>
    </Card>
  );
}

function ActiveTimer({ session, place }: { session: Session; place: Place | null }) {
  const mins = minutesBetween(session.startedAt, null);
  const need = MIN_MINUTES[session.kind];
  const ratio = Math.min(1, mins / need);
  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 4 }}>
        <Text style={type.display}>{formatClock(mins)}</Text>
        <Text style={[type.caption, { fontSize: 14 }]}>
          {session.placeName}
          {place ? ` · 반경 ${place.radius}m` : ''}
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        <ProgressBar value={ratio} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[type.caption, { fontFamily: fonts.semibold, color: ratio >= 1 ? colors.accent : colors.text }]}>
            {ratio >= 1 ? '인증 조건 달성' : `인증까지 ${need - mins}분`}
          </Text>
          <Text style={type.caption}>목표 {need}분</Text>
        </View>
      </View>
    </View>
  );
}
