// 브랜드 요소: 로고(SHOW ME.), 카카오 로그인 버튼
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Image, Pressable, Text } from 'react-native';
import { fonts } from './ui';

/**
 * 로고 = 앱 아이콘 이미지 그대로 (assets/icon.png).
 * 글자로 그리면 기기마다 글꼴 크기 계산이 달라 줄바꿈되거나 잘려서 이미지를 씀.
 */
export function Logo({ size = 120 }: { size?: number }) {
  return (
    <Image
      source={require('../../assets/icon.png')}
      accessibilityRole="image"
      accessibilityLabel="SHOW ME WHAT YOU GOT 로고"
      style={{ width: size, height: size, borderRadius: size * 0.2286 }}
    />
  );
}

/** 카카오 디자인 가이드: 노란 배경 #FEE500, 검정 85% 글자, 말풍선 심볼 */
export function KakaoButton({ title, onPress, loading }: { title: string; onPress: () => void; loading?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => ({
        height: 52,
        borderRadius: 12,
        backgroundColor: '#FEE500',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: pressed || loading ? 0.85 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color="rgba(0,0,0,0.85)" />
      ) : (
        <>
          <Ionicons name="chatbubble" size={18} color="#000" />
          <Text style={{ color: 'rgba(0,0,0,0.85)', fontFamily: fonts.bold, fontSize: 16 }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
