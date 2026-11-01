// "그룹" 화면: 닉네임 설정, 그룹 만들기/참여, 내 그룹 목록
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import {
  Button,
  Card,
  colors,
  Divider,
  EmptyState,
  Input,
  Row,
  Screen,
  Section,
  Segmented,
  space,
  type,
} from '../../components/ui';
import { createGroup, getMyNickname, joinGroup, listMyGroups, setNickname, type Group } from '../../lib/groups';
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
  const [nickname, setNick] = useState<string | null>(null);
  const [nickInput, setNickInput] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [newName, setNewName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    Promise.all([getMyNickname(), listMyGroups()])
      .then(([n, g]) => {
        setNick(n);
        setGroups(g);
      })
      .catch((e) => Alert.alert('서버 오류', String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);
  useRefreshOnChange(load);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      load();
    } catch (e) {
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

  if (!nickname) {
    return (
      <Screen title="그룹">
        <Card style={{ gap: space.lg }}>
          <View style={{ gap: 4 }}>
            <Text style={type.title}>닉네임을 정해주세요</Text>
            <Text style={type.caption}>그룹원들에게 보여지는 이름이에요.</Text>
          </View>
          <Input icon="person-outline" placeholder="닉네임" value={nickInput} onChangeText={setNickInput} maxLength={20} />
          <Button
            title="시작하기"
            loading={busy}
            disabled={!nickInput.trim()}
            onPress={() => run(() => setNickname(nickInput.trim()))}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen eyebrow={`${nickname} 님`} title="그룹">
      <Section title="내 그룹">
        {groups.length === 0 ? (
          <EmptyState icon="people-outline" title="함께할 사람을 모아보세요" body="그룹을 만들고 초대코드를 공유하거나, 받은 코드로 참여하세요." />
        ) : (
          <Card style={{ paddingVertical: space.xs, gap: 0 }}>
            {groups.map((g, i) => (
              <View key={g.id}>
                {i > 0 && <Divider />}
                <Row
                  icon="people"
                  iconColor={colors.accent}
                  iconBg={colors.accentSoft}
                  title={g.name}
                  subtitle={`초대코드 ${g.invite_code}`}
                  onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id, name: g.name, code: g.invite_code } })}
                />
              </View>
            ))}
          </Card>
        )}
      </Section>

      <Section title="그룹 추가">
        <Card style={{ gap: space.md }}>
          <Segmented
            options={[
              { value: 'join', label: '코드로 참여', icon: 'enter-outline' },
              { value: 'create', label: '새로 만들기', icon: 'add-circle-outline' },
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
                style={{ letterSpacing: 4, fontWeight: '700' }}
              />
              <Button
                title="참여하기"
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
