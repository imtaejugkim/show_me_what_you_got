// 브랜드 요소: 로고(SHOW ME.), 카카오 로그인 버튼
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { colors, fonts } from './ui';

/** 앱 아이콘과 같은 로고. size = 한 변 길이 */
export function Logo({ size = 120 }: { size?: number }) {
  const k = size / 280; // Claude Design 시안(280px) 기준 비율
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="SHOW ME WHAT YOU GOT 로고"
      style={{
        width: size,
        height: size,
        borderRadius: 64 * k,
        backgroundColor: colors.accent,
        justifyContent: 'flex-end',
        paddingHorizontal: 34 * k,
        paddingBottom: 44 * k,
      }}
    >
      {['SHOW', 'ME.'].map((line) => (
        <Text
          key={line}
          style={{
            fontFamily: fonts.numBold,
            fontSize: 86 * k,
            lineHeight: 86 * k * 0.9,
            letterSpacing: -4.5 * k,
            color: colors.onAccent,
            includeFontPadding: false,
          }}
        >
          {line}
        </Text>
      ))}
    </View>
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
