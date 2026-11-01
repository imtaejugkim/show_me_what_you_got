// "오늘" 화면: 진행 중인 세션, 오늘 증명 기록, 수동 시작
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, Text, View } from 'react-native';
import { Button, Card, colors, Sub, styles, Title } from '../../components/ui';
import { requestLocationPermissions, syncGeofences } from '../../lib/geofence';
import { endSession, getTodaySessions, startSession } from '../../lib/sessions';
import { getActiveSession, getPlaces } from '../../lib/storage';
import { KIND_EMOJI, KIND_LABEL, KINDS, MIN_MINUTES, type Kind, type Session } from '../../lib/types';
import { useRefreshOnChange } from '../../lib/useRefreshOnChange';
import { distanceMeters, formatDuration, formatTime, minutesBetween } from '../../lib/utils';

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
        Alert.alert('장소가 없어요', `"장소" 탭에서 ${KIND_LABEL[kind]} 장소를 먼저 등록해 주세요.`);
        return;
      }
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return;
      const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const near = places
        .map((p) => ({ p, d: distanceMeters(here.coords, p) }))
        .sort((a, b) => a.d - b.d)[0];
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

  const verifiedKinds = new Set(today.filter((s) => s.verified).map((s) => s.kind));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {!bgGranted && (
        <Card style={{ borderColor: colors.danger }}>
          <Text style={styles.text}>📍 자동 감지가 꺼져 있어요</Text>
          <Sub>장소 도착/이탈을 감지하려면 위치 권한을 "항상 허용"으로 설정해야 해요.</Sub>
          <Button title="권한 설정하기" onPress={fixPermission} />
        </Card>
      )}

      {active ? (
        <Card style={{ borderColor: colors.accent }}>
          <Sub>진행 중 · {active.placeName}</Sub>
          <Title>
            {KIND_EMOJI[active.kind]} {KIND_LABEL[active.kind]} 중
          </Title>
          <ActiveProgress session={active} />
          <Button title="종료하기" variant="danger" onPress={confirmEnd} loading={busy === 'end'} />
        </Card>
      ) : (
        <Card>
          <Title>오늘도 증명해 볼까요?</Title>
          <Sub>등록한 장소에 도착하면 알림이 와요. 이미 도착했다면 바로 시작하세요.</Sub>
          <View style={styles.row}>
            {KINDS.map((k) => (
              <Button
                key={k}
                title={`${KIND_EMOJI[k]} ${KIND_LABEL[k]} 시작`}
                variant="secondary"
                style={{ flex: 1 }}
                loading={busy === k}
                onPress={() => manualStart(k)}
              />
            ))}
          </View>
        </Card>
      )}

      <Card>
        <Title>오늘의 증명</Title>
        <View style={styles.row}>
          {KINDS.map((k) => (
            <Text key={k} style={[styles.text, { flex: 1 }]}>
              {KIND_EMOJI[k]} {KIND_LABEL[k]} {verifiedKinds.has(k) ? '✅' : '⬜️'}
            </Text>
          ))}
        </View>
        {today.length === 0 ? (
          <Sub>아직 기록이 없어요.</Sub>
        ) : (
          today.map((s) => (
            <View key={s.id} style={[styles.row, { justifyContent: 'space-between' }]}>
              <Text style={styles.text}>
                {s.verified ? '✅' : '⚠️'} {KIND_LABEL[s.kind]} · {s.placeName}
              </Text>
              <Sub>
                {formatTime(s.startedAt)}~{s.endedAt ? formatTime(s.endedAt) : ''} ({formatDuration(minutesBetween(s.startedAt, s.endedAt))})
              </Sub>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

function ActiveProgress({ session }: { session: Session }) {
  const mins = minutesBetween(session.startedAt, null);
  const need = MIN_MINUTES[session.kind];
  const ratio = Math.min(1, mins / need);
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.text, { fontSize: 32, fontWeight: '800' }]}>{formatDuration(mins)}</Text>
      <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ width: `${ratio * 100}%`, height: '100%', backgroundColor: colors.accent }} />
      </View>
      <Sub>
        {formatTime(session.startedAt)} 시작 · {ratio >= 1 ? '인증 조건 달성! 🎉' : `인증까지 ${need - mins}분`}
      </Sub>
      <Sub>장소를 벗어나면 자동으로 종료돼요.</Sub>
    </View>
  );
}
