// 그룹 상세: 그룹원들의 오늘 인증 현황
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import { Button, Card, Sub, styles, Title } from '../../components/ui';
import { getGroupToday, leaveGroup, type FeedRow } from '../../lib/groups';
import { KIND_EMOJI, KIND_LABEL } from '../../lib/types';
import { useRefreshOnChange } from '../../lib/useRefreshOnChange';
import { formatDuration, formatTime, minutesBetween } from '../../lib/utils';

type Member = { userId: string; nickname: string; sessions: FeedRow[] };

export default function GroupScreen() {
  const { id, name, code } = useLocalSearchParams<{ id: string; name?: string; code?: string }>();
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setRefreshing(true);
    getGroupToday(id)
      .then(setRows)
      .catch((e) => Alert.alert('오류', String(e?.message ?? e)))
      .finally(() => setRefreshing(false));
  }, [id]);
  useRefreshOnChange(load);

  // 행(멤버 x 세션) → 멤버별로 묶기
  const members = useMemo(() => {
    const map = new Map<string, Member>();
    for (const r of rows) {
      const m = map.get(r.user_id) ?? { userId: r.user_id, nickname: r.nickname, sessions: [] };
      if (r.session_id) m.sessions.push(r);
      map.set(r.user_id, m);
    }
    return [...map.values()];
  }, [rows]);

  const doneCount = members.filter((m) => m.sessions.some((s) => s.verified)).length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#fff" />}
    >
      <Stack.Screen options={{ title: name ?? '그룹' }} />
      <Card>
        <Title>
          오늘 {doneCount}/{members.length}명 증명 완료
        </Title>
        {code && (
          <Button
            title={`초대코드 ${code} 공유하기`}
            variant="secondary"
            onPress={() => Share.share({ message: `Show Me What You Got 에서 같이 증명하자! 초대코드: ${code}` })}
          />
        )}
      </Card>

      {members.map((m) => {
        const live = m.sessions.find((s) => !s.ended_at);
        const verified = m.sessions.filter((s) => s.verified);
        return (
          <Card key={m.userId}>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <Text style={[styles.text, { fontWeight: '700' }]}>{m.nickname}</Text>
              <Text style={styles.text}>{live ? '🔥 진행 중' : verified.length > 0 ? '✅ 완료' : '😴 아직'}</Text>
            </View>
            {m.sessions.map((s) => (
              <Sub key={s.session_id}>
                {KIND_EMOJI[s.kind!]} {KIND_LABEL[s.kind!]} · {s.place_name} · {formatTime(s.started_at!)}
                {s.ended_at ? `~${formatTime(s.ended_at)}` : '~'} ({formatDuration(minutesBetween(s.started_at!, s.ended_at))})
                {s.ended_at && !s.verified ? ' ⚠️ 시간 부족' : ''}
              </Sub>
            ))}
          </Card>
        );
      })}

      <Button
        title="그룹 나가기"
        variant="danger"
        onPress={() =>
          Alert.alert('그룹을 나갈까요?', undefined, [
            { text: '취소', style: 'cancel' },
            {
              text: '나가기',
              style: 'destructive',
              onPress: async () => {
                await leaveGroup(id);
                router.back();
              },
            },
          ])
        }
      />
    </ScrollView>
  );
}
