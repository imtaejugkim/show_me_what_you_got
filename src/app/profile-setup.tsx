// 첫 로그인 후 닉네임 정하기 (카카오 닉네임을 미리 채워둠)
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, colors, Input, type } from '../components/ui';
import { getAccountInfo } from '../lib/auth';
import { setNickname } from '../lib/groups';
import { haptic } from '../lib/haptics';
import { useSession } from '../lib/session';

export default function ProfileSetup() {
  const insets = useSafeAreaInsets();
  const { refresh } = useSession();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getAccountInfo()
      .then((a) => {
        if (a.providerName) setName((cur) => cur || a.providerName!.slice(0, 20));
      })
      .catch(() => {});
  }, []);

  async function save() {
    setBusy(true);
    try {
      await setNickname(name.trim());
      haptic.success();
      await refresh(); // 닉네임이 생기면 자동으로 메인 화면으로 이동
    } catch (e) {
      haptic.error();
      Alert.alert('저장 실패', String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }}
    >
      <View style={{ flex: 1, gap: 28 }}>
        <View style={{ gap: 8 }}>
          <Text style={type.largeTitle}>뭐라고 부를까</Text>
          <Text style={type.caption}>그룹원들한테 보이는 이름이다. 나중에 프로필에서 바꿀 수 있어.</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Avatar name={name.trim() || '?'} active size={88} />
        </View>
        <Input
          icon="person-outline"
          placeholder="닉네임 (최대 20자)"
          value={name}
          onChangeText={setName}
          maxLength={20}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => name.trim() && save()}
        />
      </View>
      <Button title="이걸로 간다" onPress={save} loading={busy} disabled={!name.trim()} />
    </KeyboardAvoidingView>
  );
}
