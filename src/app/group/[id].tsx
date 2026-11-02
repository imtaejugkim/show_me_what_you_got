// 그룹 상세 (시안: 그룹 — 오늘 현황) — 그룹원들의 오늘 인증 현황
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import {
  Avatar,
  Button,
  Card,
  colors,
  Divider,
  fonts,
  IconButton,
  ListCard,
  Pill,
  type PillTone,
  ScreenHeader,
  Section,
  space,
  type,
} from '../../components/ui';
import { getGroupToday, leaveGroup, type FeedRow } from '../../lib/groups';
import { KIND_LABEL } from '../../lib/types';
import { useRefreshOnChange } from '../../lib/useRefreshOnChange';
import { formatDuration, formatToday, minutesBetween } from '../../lib/utils';

type Status = 'done' | 'live' | 'none';
type Member = { userId: string; nickname: string; sessions: FeedRow[]; status: Status; detail: string };

const STATUS: Record<Status, { label: string; tone: PillTone }> = {
  done: { label: '완료', tone: 'ok' },
  live: { label: '진행 중', tone: 'accent' },
  none: { label: '아직', tone: 'neutral' },
};

export default function GroupScreen() {
  const { id, name, code } = useLocalSearchParams<{ id: string; name?: string; code?: string }>();
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [, tick] = useState(0);

  const load = useCallback(() => {
    setRefreshing(true);
    getGroupToday(id)
      .then(setRows)
      .catch((e) => Alert.alert('오류', String(e?.message ?? e)))
      .finally(() => setRefreshing(false));
  }, [id]);
  useRefreshOnChange(load);

  // 진행 중인 사람의 "N분째" 갱신
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  // 행(멤버 x 세션) → 멤버별로 묶고, 완료 > 진행 중 > 아직 순으로 정렬
  const members = useMemo(() => {
    const map = new Map<string, FeedRow[]>();
    const names = new Map<string, string>();
    for (const r of rows) {
      names.set(r.user_id, r.nickname);
      const list = map.get(r.user_id) ?? [];
      if (r.session_id) list.push(r);
      map.set(r.user_id, list);
    }
    const order: Record<Status, number> = { done: 0, live: 1, none: 2 };
    return [...map.entries()]
      .map(([userId, sessions]): Member => {
        const live = sessions.find((s) => !s.ended_at);
        const status: Status = sessions.some((s) => s.verified) ? 'done' : live ? 'live' : 'none';
        const shown = live ?? sessions.filter((s) => s.verified).at(-1) ?? sessions.at(-1);
        const detail = shown
          ? [
              KIND_LABEL[shown.kind!],
              shown.place_name,
              shown.ended_at
                ? formatDuration(minutesBetween(shown.started_at!, shown.ended_at))
                : `${minutesBetween(shown.started_at!, null)}분째`,
            ].join(' · ')
          : '아직 아무것도 안 함';
        return { userId, nickname: names.get(userId) ?? '익명', sessions, status, detail };
      })
      .sort((a, b) => order[a.status] - order[b.status]);
  }, [rows]);

  const doneCount = members.filter((m) => m.status === 'done').length;
  const liveCount = members.filter((m) => m.status === 'live').length;

  function share() {
    if (code) Share.share({ message: `말로만 하지 말고 증명하자. Show Me What You Got 초대코드: ${code}` });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: 48, gap: space.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.text} />}
    >
      <ScreenHeader
        eyebrow={formatToday()}
        title={name ?? '그룹'}
        right={code ? <IconButton name="share-outline" label="초대코드 공유" onPress={share} /> : undefined}
      />

      <Card size="lg" style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={type.displaySm}>{doneCount}</Text>
          <Text style={{ color: colors.sub, fontFamily: fonts.semibold, fontSize: 18 }}>/ {members.length}명 증명 완료</Text>
        </View>
        {/* 멤버 한 명당 한 칸: 완료 = 라임, 진행 중 = 옅은 라임, 아직 = 회색 */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {members.map((m) => (
            <View
              key={m.userId}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                backgroundColor: m.status === 'done' ? colors.accent : m.status === 'live' ? colors.accentFaint : colors.track,
              }}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {code ? (
            <Text style={type.caption}>
              초대코드 <Text style={{ fontFamily: fonts.num, letterSpacing: 2, color: colors.text }}>{code}</Text>
            </Text>
          ) : (
            <View />
          )}
          <Text style={type.caption}>{liveCount > 0 ? `${liveCount}명 진행 중` : ''}</Text>
        </View>
      </Card>

      <Section title="멤버">
        <ListCard>
          {members.map((m, i) => (
            <View key={m.userId}>
              {i > 0 && <Divider inset={0} />}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12 }}>
                <Avatar name={m.nickname} active={m.status === 'done'} />
                <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                  <Text style={type.bodyStrong}>{m.nickname}</Text>
                  <Text style={[type.caption, { lineHeight: undefined }]} numberOfLines={1}>
                    {m.detail}
                  </Text>
                </View>
                <Pill label={STATUS[m.status].label} tone={STATUS[m.status].tone} />
              </View>
            </View>
          ))}
        </ListCard>
      </Section>

      <Button
        title="그룹 나가기"
        variant="ghost"
        onPress={() =>
          Alert.alert('진짜 나갈 거야?', '나가면 같이 한 약속도 여기서 끝이다.', [
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
