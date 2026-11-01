// "오늘" 화면: 진행 중인 세션, 오늘 증명 현황, 수동 시작
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import {
  Button,
  Card,
  colors,
  Divider,
  EmptyState,
  IconBadge,
  Pill,
  ProgressBar,
  Row,
  Screen,
  Section,
  space,
  type,
} from '../../components/ui';
import { requestLocationPermissions, syncGeofences } from '../../lib/geofence';
import { endSession, getTodaySessions, startSession } from '../../lib/sessions';
import { getActiveSession, getPlaces } from '../../lib/storage';
import { KIND_ICON, KIND_LABEL, KINDS, MIN_MINUTES, type Kind, type Session } from '../../lib/types';
import { useRefreshOnChange } from '../../lib/useRefreshOnChange';
import { distanceMeters, formatClock, formatDuration, formatTime, formatToday, minutesBetween } from '../../lib/utils';

export default function TodayScreen() {
  const [active, setActive] = useState<Session | null>(null);
  const [today, setToday] = useState<Session[]>([]);
  const [bgGranted, setBgGranted] = useState(true);
  const [, tick] = useState(0);
  const [busy, setBusy] = useState<Kind | 'end' | null>(null);

  const load = useCallback(() => {
    getActiveSession().then(setActive);
    getTodaySessions().then(setToday);
    Location.getBackgroundPermissionsAsync().then((p) => setBgGranted(p.granted));
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
      // GPS 오차를 감안해 반경 + 50m 까지 허용
      if (near.d > near.p.radius + 50) {
        Alert.alert('장소 밖이에요', `가장 가까운 "${near.p.name}"까지 약 ${Math.round(near.d)}m 남았어요.`);
        return;
      }
      await startSession({ kind, place: near.p });
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
            await endSession('manual');
            setBusy(null);
          },
        },
      ],
    );
  }

  const doneMinutes = (k: Kind) =>
    today.filter((s) => s.kind === k && s.verified).reduce((sum, s) => sum + minutesBetween(s.startedAt, s.endedAt), 0);

  return (
    <Screen eyebrow={formatToday()} title="오늘의 증명">
      {!bgGranted && (
        <Pressable onPress={fixPermission}>
          <Card tone="danger" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14 }}>
            <IconBadge name="location-outline" color={colors.danger} bg={colors.dangerSoft} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={type.bodyStrong}>자동 감지가 꺼져 있어요</Text>
              <Text style={type.caption}>위치 권한을 ‘항상 허용’으로 바꿔주세요</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Card>
        </Pressable>
      )}

      {/* 오늘 현황 타일 */}
      <View style={{ flexDirection: 'row', gap: space.md }}>
        {KINDS.map((k) => {
          const mins = doneMinutes(k);
          const done = mins > 0;
          const live = active?.kind === k;
          return (
            <Card key={k} tone={done ? 'accent' : undefined} style={{ flex: 1, gap: space.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <IconBadge
                  name={KIND_ICON[k]}
                  color={done ? colors.onAccent : colors.text}
                  bg={done ? colors.accent : colors.surfaceHigh}
                />
                {done ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                ) : live ? (
                  <Pill label="LIVE" tone="accent" />
                ) : null}
              </View>
              <View style={{ gap: 2 }}>
                <Text style={type.caption}>{KIND_LABEL[k]}</Text>
                <Text style={type.title}>{done ? formatDuration(mins) : live ? '진행 중' : '아직'}</Text>
              </View>
            </Card>
          );
        })}
      </View>

      {/* 진행 중 세션 or 시작 */}
      {active ? (
        <Card tone="accent" style={{ gap: space.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pill label={`${KIND_LABEL[active.kind]} 중`} tone="accent" icon={KIND_ICON[active.kind]} />
            <Text style={type.caption}>{formatTime(active.startedAt)} 시작</Text>
          </View>
          <ActiveTimer session={active} />
          <Button title="종료하기" variant="secondary" icon="stop" onPress={confirmEnd} loading={busy === 'end'} />
        </Card>
      ) : (
        <Section title="지금 시작">
          <View style={{ flexDirection: 'row', gap: space.md }}>
            {KINDS.map((k) => (
              <Button
                key={k}
                title={KIND_LABEL[k]}
                icon={KIND_ICON[k]}
                variant={k === 'workout' ? 'primary' : 'secondary'}
                style={{ flex: 1 }}
                loading={busy === k}
                onPress={() => manualStart(k)}
              />
            ))}
          </View>
          <Text style={[type.caption, { paddingHorizontal: 4 }]}>
            등록한 장소에 도착하면 알림이 와요. 이미 도착했다면 바로 시작하세요.
          </Text>
        </Section>
      )}

      {/* 오늘 기록 */}
      <Section title="기록">
        {today.length === 0 ? (
          <EmptyState icon="sparkles-outline" title="오늘의 첫 기록을 남겨보세요" body="최소 시간(운동 30분, 공부 60분)을 채우면 증명 완료!" />
        ) : (
          <Card style={{ paddingVertical: space.xs, gap: 0 }}>
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
          </Card>
        )}
      </Section>
    </Screen>
  );
}

function ActiveTimer({ session }: { session: Session }) {
  const mins = minutesBetween(session.startedAt, null);
  const need = MIN_MINUTES[session.kind];
  const ratio = Math.min(1, mins / need);
  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: 2 }}>
        <Text style={type.display}>{formatClock(mins)}</Text>
        <Text style={type.caption}>{session.placeName}</Text>
      </View>
      <ProgressBar value={ratio} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[type.caption, ratio >= 1 && { color: colors.accent }]}>
          {ratio >= 1 ? '인증 조건 달성' : `인증까지 ${need - mins}분`}
        </Text>
        <Text style={type.caption}>장소를 벗어나면 자동 종료</Text>
      </View>
    </View>
  );
}
