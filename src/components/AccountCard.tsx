// 계정 카드: 익명이면 "카카오로 계정 연결", 연결돼 있으면 연결 상태 + 로그아웃
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { getAccount, linkKakao, signInWithKakao, signOut, type Account, type KakaoResult } from '../lib/auth';
import { emitDataChanged } from '../lib/events';
import { haptic } from '../lib/haptics';
import { Button, Card, fonts, Pill, space, type } from './ui';

/** 카카오 디자인 가이드: 노란 배경 #FEE500, 검정 85% 글자, 말풍선 심볼 */
export function KakaoButton({ title, onPress, loading }: { title: string; onPress: () => void; loading?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => ({
        height: 50,
        borderRadius: 12,
        backgroundColor: '#FEE500',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: pressed || loading ? 0.8 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color="rgba(0,0,0,0.85)" />
      ) : (
        <>
          <Ionicons name="chatbubble" size={18} color="#000" />
          <Text style={{ color: 'rgba(0,0,0,0.85)', fontFamily: fonts.bold, fontSize: 15 }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/** 결과에 맞게 진동/안내. 이미 다른 계정에 연결된 카카오면 그 계정으로 로그인할지 묻는다 */
export async function handleKakaoResult(result: KakaoResult, onDone: () => void) {
  if (result.status === 'cancelled') return;
  if (result.status === 'already_used') {
    haptic.warning();
    Alert.alert(
      '이미 사용 중인 카카오 계정',
      '이 카카오 계정은 다른 기기에서 이미 연결했어요. 그 계정으로 로그인할까요?\n지금 이 기기의 익명 계정으로 참여한 그룹은 보이지 않게 돼요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '그 계정으로 로그인',
          onPress: async () => {
            try {
              const r = await signInWithKakao();
              if (r.status === 'signed_in') {
                haptic.success();
                onDone();
              }
            } catch (e) {
              haptic.error();
              Alert.alert('로그인 실패', String((e as Error)?.message ?? e));
            }
          },
        },
      ],
    );
    return;
  }
  haptic.success();
  onDone();
}

export function AccountCard() {
  const [account, setAccount] = useState<Account | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getAccount().then(setAccount).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const done = () => {
    load();
    emitDataChanged();
  };

  async function connect() {
    setBusy(true);
    try {
      await handleKakaoResult(await linkKakao(), done);
    } catch (e) {
      haptic.error();
      Alert.alert('카카오 연결 실패', String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  function confirmSignOut() {
    Alert.alert('로그아웃할까요?', '이 기기는 새 익명 계정으로 시작해요. 카카오로 다시 로그인하면 기록과 그룹이 돌아와요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          done();
        },
      },
    ]);
  }

  if (!account) return null;

  if (account.anonymous) {
    return (
      <Card style={{ gap: space.md }}>
        <View style={{ gap: 4 }}>
          <Text style={type.rowTitle}>계정을 연결해 두세요</Text>
          <Text style={type.caption}>
            지금은 이 기기에만 저장된 임시 계정이에요. 카카오로 연결하면 폰을 바꾸거나 앱을 지워도 기록과 그룹이 유지돼요.
          </Text>
        </View>
        <KakaoButton title="카카오로 계정 연결" onPress={connect} loading={busy} />
      </Card>
    );
  }

  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14 }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#FEE500', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="chatbubble" size={16} color="#000" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.rowTitle}>카카오 계정 연결됨</Text>
        {account.displayName ? <Text style={type.caption}>{account.displayName}</Text> : null}
      </View>
      {account.providers.includes('kakao') ? <Pill label="연결됨" tone="ok" /> : null}
      <Button title="로그아웃" variant="ghost" onPress={confirmSignOut} style={{ height: 36, paddingHorizontal: 8 }} />
    </Card>
  );
}

