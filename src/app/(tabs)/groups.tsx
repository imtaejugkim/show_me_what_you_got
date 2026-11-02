// "그룹" 화면: 그룹 만들기/참여, 내 그룹 목록 (닉네임은 로그인 직후 정함)
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import {
  Button,
  Card,
  colors,
  Divider,
  EmptyState,
  fonts,
  ListCard,
  Input,
  Row,
  Screen,
  Section,
  Segmented,
  space,
} from '../../components/ui';
import { createGroup, joinGroup, listMyGroups, type Group } from '../../lib/groups';
import { haptic } from '../../lib/haptics';
import { useSession } from '../../lib/session';
import { isServerEnabled } from '../../lib/supabase';
import { useRefreshOnChange } from '../../lib/useRefreshOnChange';

export default function GroupsScreen() {
  if (!isServerEnabled) {
    return (
      <Screen title="그룹">
        <EmptyState
          icon="cloud-offline-outline"
          title="혼자 모드로 실행 중"
          body={'그룹 기능은 서버(Supabase) 연결이 필요해요.\nREADME의 "Supabase 설정"을 따라 .env 를 만든 뒤 앱을 다시 시작하세요.'}
        />
      </Screen>
    );
  }
  return <GroupsOnline />;
}

function GroupsOnline() {
  const [loading, setLoading] = useState(true);
  const { nickname } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [newName, setNewName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listMyGroups()
      .then(setGroups)
      .catch((e) => Alert.alert('서버 오류', String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);
  useRefreshOnChange(load);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      haptic.success();
      load();
    } catch (e) {
      haptic.error();
      Alert.alert('오류', String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <Screen eyebrow={nickname ?? undefined} title="그룹">
      <Section title="내 그룹">
        {groups.length === 0 ? (
          <EmptyState icon="people-outline" title="혼자 하면 또 미룬다" body="그룹 만들고 초대코드 뿌려. 코드 받았으면 바로 들어와." />
        ) : (
          <ListCard>
            {groups.map((g, i) => (
              <View key={g.id}>
                {i > 0 && <Divider />}
                <Row
                  icon="people"
                  title={g.name}
                  subtitle={`초대코드 ${g.invite_code}`}
                  onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id, name: g.name, code: g.invite_code } })}
                />
              </View>
            ))}
          </ListCard>
        )}
      </Section>

      <Section title="그룹 추가">
        <Card size="lg" style={{ gap: space.md }}>
          <Segmented
            options={[
              { value: 'join', label: '코드로 참여' },
              { value: 'create', label: '새로 만들기' },
            ]}
            value={mode}
            onChange={setMode}
          />
          {mode === 'join' ? (
            <>
              <Input
                icon="key-outline"
                placeholder="초대코드 6자리"
                autoCapitalize="characters"
                value={code}
                onChangeText={setCode}
                maxLength={6}
                style={{ letterSpacing: 4, fontFamily: fonts.num }}
              />
              <Button
                title="들어간다"
                loading={busy}
                disabled={code.trim().length !== 6}
                onPress={() =>
                  run(async () => {
                    await joinGroup(code);
                    setCode('');
                  })
                }
              />
            </>
          ) : (
            <>
              <Input icon="flag-outline" placeholder="그룹 이름 (예: 오운완 크루)" value={newName} onChangeText={setNewName} maxLength={30} />
              <Button
                title="만들기"
                loading={busy}
                disabled={!newName.trim()}
                onPress={() =>
                  run(async () => {
                    await createGroup(newName.trim());
                    setNewName('');
                  })
                }
              />
            </>
          )}
        </Card>
      </Section>
    </Screen>
  );
}
