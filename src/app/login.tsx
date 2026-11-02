// 로그인: 카카오로 시작하기
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KakaoButton, Logo } from '../components/brand';
import { colors, type } from '../components/ui';
import { signInWithKakao } from '../lib/auth';
import { haptic } from '../lib/haptics';

export default function Login() {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  async function kakao() {
    setBusy(true);
    try {
      const ok = await signInWithKakao();
      if (ok) haptic.success(); // 로그인되면 화면은 자동으로 다음 단계로 넘어감
    } catch (e) {
      haptic.error();
      Alert.alert('카카오 로그인 실패', String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 }}>
        <Logo size={132} />
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text style={[type.largeTitle, { fontSize: 26 }]}>SHOW ME WHAT YOU GOT</Text>
          <Text style={[type.caption, { fontSize: 15 }]}>오늘도 증명해라.</Text>
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <KakaoButton title="카카오로 시작하기" onPress={kakao} loading={busy} />
      </View>
    </View>
  );
}
