// "그룹" 화면: 닉네임 설정, 그룹 만들기/참여, 내 그룹 목록
import { Link } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button, Card, colors, Sub, styles, Title } from '../../components/ui';
import { createGroup, getMyNickname, joinGroup, listMyGroups, setNickname, type Group } from '../../lib/groups';
import { isServerEnabled } from '../../lib/supabase';
import { useRefreshOnChange } from '../../lib/useRefreshOnChange';

export default function GroupsScreen() {
  if (!isServerEnabled) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Card>
          <Title>혼자 모드</Title>
          <Sub>
            그룹 기능은 서버(Supabase)가 필요해요. README의 "Supabase 설정"을 따라 .env 파일을 만든 뒤 앱을 다시
            시작하세요.
          </Sub>
        </Card>
      </ScrollView>
    );
  }
  return <GroupsOnline />;
}

function GroupsOnline() {
  const [loading, setLoading] = useState(true);
  const [nickname, setNick] = useState<string | null>(null);
  const [nickInput, setNickInput] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
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

  if (loading) return <ActivityIndicator style={{ flex: 1, backgroundColor: colors.bg }} color={colors.accent} />;

  if (!nickname) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Card>
          <Title>닉네임을 정해 주세요</Title>
          <Sub>그룹원들에게 보여지는 이름이에요.</Sub>
          <TextInput
            style={styles.input}
            placeholder="닉네임"
            placeholderTextColor={colors.sub}
            value={nickInput}
            onChangeText={setNickInput}
            maxLength={20}
          />
          <Button title="저장" loading={busy} onPress={() => nickInput.trim() && run(() => setNickname(nickInput.trim()))} />
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Sub>{nickname} 님</Sub>

      <Title>내 그룹</Title>
      {groups.length === 0 && <Sub>아직 그룹이 없어요. 만들거나 초대코드로 참여하세요.</Sub>}
      {groups.map((g) => (
        <Link key={g.id} href={{ pathname: '/group/[id]', params: { id: g.id, name: g.name, code: g.invite_code } }} asChild>
          <Pressable>
            <Card>
              <Text style={styles.text}>👥 {g.name}</Text>
              <Sub>초대코드 {g.invite_code}</Sub>
            </Card>
          </Pressable>
        </Link>
      ))}

      <Card>
        <Title>초대코드로 참여</Title>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, letterSpacing: 4 }]}
            placeholder="ABC123"
            placeholderTextColor={colors.sub}
            autoCapitalize="characters"
            value={code}
            onChangeText={setCode}
            maxLength={6}
          />
          <Button
            title="참여"
            loading={busy}
            disabled={code.trim().length !== 6}
            onPress={() => run(async () => { await joinGroup(code); setCode(''); })}
          />
        </View>
      </Card>

      <Card>
        <Title>새 그룹 만들기</Title>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="그룹 이름 (예: 오운완 크루)"
            placeholderTextColor={colors.sub}
            value={newName}
            onChangeText={setNewName}
            maxLength={30}
          />
          <Button
            title="만들기"
            loading={busy}
            disabled={!newName.trim()}
            onPress={() => run(async () => { await createGroup(newName.trim()); setNewName(''); })}
          />
        </View>
      </Card>
    </ScrollView>
  );
}
