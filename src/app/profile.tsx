// 프로필: 닉네임 수정, 로그인 계정, 로그아웃
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Avatar, Button, Card, colors, Input, Section, space, type } from '../components/ui';
import { deleteAccount, getAccountInfo, signOut } from '../lib/auth';
import { setNickname } from '../lib/groups';
import { haptic } from '../lib/haptics';
import { useSession } from '../lib/session';

const PROVIDER_LABEL: Record<string, string> = { kakao: '카카오', apple: 'Apple' };

export default function Profile() {
  const { nickname, refresh } = useSession();
  const [name, setName] = useState(nickname ?? '');
  const [account, setAccount] = useState<Awaited<ReturnType<typeof getAccountInfo>> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getAccountInfo().then(setAccount).catch(() => {});
  }, []);

  const changed = name.trim() !== (nickname ?? '') && name.trim().length > 0;

  async function save() {
    setBusy(true);
    try {
      await setNickname(name.trim());
      await refresh();
      haptic.success();
    } catch (e) {
      haptic.error();
      Alert.alert('저장 실패', String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  function confirmSignOut() {
    Alert.alert('로그아웃할 거야?', '다시 로그인하면 기록이랑 그룹 그대로 돌아온다.', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut().catch(() => {}) },
    ]);
  }

  function confirmDelete() {
    haptic.warning();
    Alert.alert(
      '진짜 탈퇴할 거야?',
      '기록, 그룹 참여, 닉네임이 전부 지워지고 되돌릴 수 없다.\n내가 만든 그룹은 남은 멤버에게 넘어간다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴한다',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await deleteAccount(); // 끝나면 자동으로 로그인 화면으로 이동
            } catch (e) {
              setBusy(false);
              haptic.error();
              Alert.alert('탈퇴 실패', String((e as Error)?.message ?? e));
            }
          },
        },
      ],
    );
  }

  const providerLabel = account?.provider ? (PROVIDER_LABEL[account.provider] ?? account.provider) : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space.xl, gap: space.xl, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ alignItems: 'center', gap: 12, paddingVertical: space.sm }}>
        <Avatar name={name.trim() || nickname || '?'} active size={88} />
        <Text style={type.title}>{nickname}</Text>
      </View>

      <Section title="닉네임">
        <Card style={{ gap: space.md }}>
          <Input icon="person-outline" placeholder="닉네임" value={name} onChangeText={setName} maxLength={20} />
          <Button title="저장" onPress={save} loading={busy} disabled={!changed} />
        </Card>
      </Section>

      <Section title="계정">
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14 }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#FEE500', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chatbubble" size={16} color="#000" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={type.rowTitle}>{providerLabel ? `${providerLabel}로 로그인됨` : '로그인됨'}</Text>
            {account?.email || account?.providerName ? (
              <Text style={type.caption}>{account.email ?? account.providerName}</Text>
            ) : null}
          </View>
        </Card>
      </Section>

      <View style={{ gap: space.xs }}>
        <Button title="로그아웃" variant="ghost" onPress={confirmSignOut} />
        <Button title="회원 탈퇴" variant="ghost" onPress={confirmDelete} disabled={busy} />
      </View>
    </ScrollView>
  );
}
