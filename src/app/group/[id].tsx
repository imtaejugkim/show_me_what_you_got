// 그룹 상세: 그룹원들의 오늘 인증 현황
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import { Button, Card, colors, Divider, IconButton, Pill, ProgressBar, Section, space, type } from '../../components/ui';
import { getGroupToday, leaveGroup, type FeedRow } from '../../lib/groups';
import { KIND_LABEL } from '../../lib/types';
import { useRefreshOnChange } from '../../lib/useRefreshOnChange';
import { formatDuration, formatTime, formatToday, minutesBetween } from '../../lib/utils';

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

  // 행(멤버 x 세션) → 멤버별로 묶고, 완료 > 진행 중 > 아직 순으로 정렬
  const members = useMemo(() => {
    const map = new Map<string, Member>();
    for (const r of rows) {
      const m = map.get(r.user_id) ?? { userId: r.user_id, nickname: r.nickname, sessions: [] };
      if (r.session_id) m.sessions.push(r);
      map.set(r.user_id, m);
    }
    const rank = (m: Member) => (m.sessions.some((s) => s.verified) ? 0 : m.sessions.some((s) => !s.ended_at) ? 1 : 2);
    return [...map.values()].sort((a, b) => rank(a) - rank(b));
  }, [rows]);

  const doneCount = members.filter((m) => m.sessions.some((s) => s.verified)).length;

  function share() {
    if (code) Share.share({ message: `Show Me What You Got 에서 같이 증명하자! 초대코드: ${code}` });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.text} />}
    >
      <Stack.Screen options={{ headerRight: () => (code ? <IconButton name="share-outline" onPress={share} /> : null) }} />

      <View style={{ gap: 2 }}>
        <Text style={type.caption}>{formatToday()}</Text>
        <Text style={type.largeTitle}>{name ?? '그룹'}</Text>
      </View>

      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text style={type.display}>{doneCount}</Text>
          <Text style={[type.title, { color: colors.sub }]}>/ {members.length}명 증명 완료</Text>
        </View>
        <ProgressBar value={members.length ? doneCount / members.length : 0} />
        {code ? <Text style={type.caption}>초대코드 {code}</Text> : null}
      </Card>

      <Section title="멤버">
        <Card style={{ paddingVertical: space.xs, gap: 0 }}>
          {members.map((m, i) => {
            const live = m.sessions.find((s) => !s.ended_at);
            const verified = m.sessions.some((s) => s.verified);
            const last = m.sessions[m.sessions.length - 1];
            return (
              <View key={m.userId}>
                {i > 0 && <Divider />}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: verified ? colors.accent : colors.surfaceHigh,
                    }}
                  >
                    <Text style={{ color: verified ? colors.onAccent : colors.text, fontWeight: '800', fontSize: 16 }}>
                      {m.nickname.slice(0, 1)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={type.bodyStrong}>{m.nickname}</Text>
                    <Text style={type.caption} numberOfLines={1}>
                      {last
                        ? `${KIND_LABEL[last.kind!]} · ${last.place_name} · ${formatTime(last.started_at!)} · ${formatDuration(minutesBetween(last.started_at!, last.ended_at))}`
                        : '아직 기록이 없어요'}
                    </Text>
                  </View>
                  {live ? (
                    <Pill label="진행 중" tone="accent" />
                  ) : verified ? (
                    <Pill label="완료" tone="ok" icon="checkmark" />
                  ) : (
                    <Pill label="아직" />
                  )}
                </View>
              </View>
            );
          })}
        </Card>
      </Section>

      <Button
        title="그룹 나가기"
        variant="ghost"
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
