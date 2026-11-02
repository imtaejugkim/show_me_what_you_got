// 온보딩: 처음 설치했을 때 앱 소개 3장 → 로그인
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '../components/brand';
import { Button, colors, type IconName, type } from '../components/ui';
import { haptic } from '../lib/haptics';
import { useSession } from '../lib/session';

type Slide = { visual: ReactNode; title: string; body: string };

function Badge({ name }: { name: IconName }) {
  return (
    <View style={{ width: 120, height: 120, borderRadius: 34, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={56} color={colors.accent} />
    </View>
  );
}

const SLIDES: Slide[] = [
  {
    visual: <Logo size={120} />,
    title: '말로만 하는 다짐 말고,\n증명해',
    body: '운동·공부를 정말 했는지\n위치로 증명하는 앱이에요.',
  },
  {
    visual: <Badge name="location" />,
    title: '도착하면 알려드려요',
    body: '헬스장·독서실을 등록해 두면 도착할 때 알림이 오고,\n떠나면 자동으로 기록을 마무리해요.',
  },
  {
    visual: <Badge name="people" />,
    title: '혼자 하면 또 미룬다',
    body: '초대코드로 그룹에 모여\n오늘 누가 증명했는지 서로 확인하세요.',
  },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { markOnboardingSeen } = useSession();
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const [page, setPage] = useState(0);
  const last = page === SLIDES.length - 1;

  function finish() {
    markOnboardingSeen();
    router.replace('/login');
  }

  function next() {
    if (last) return finish();
    haptic.selection();
    scroller.current?.scrollTo({ x: width * (page + 1), animated: true });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
      <View style={{ height: 48, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 20 }}>
        {!last && (
          <Pressable accessibilityRole="button" onPress={finish} hitSlop={12}>
            <Text style={[type.body, { color: colors.sub }]}>건너뛰기</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s) => (
          <View key={s.title} style={{ width, paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center', gap: 36 }}>
            {s.visual}
            <View style={{ gap: 12, alignItems: 'center' }}>
              <Text style={[type.largeTitle, { fontSize: 28, lineHeight: 38, textAlign: 'center' }]}>{s.title}</Text>
              <Text style={[type.caption, { fontSize: 15, lineHeight: 23, textAlign: 'center' }]}>{s.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, gap: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          {SLIDES.map((s, i) => (
            <View
              key={s.title}
              style={{ width: i === page ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i === page ? colors.accent : colors.track }}
            />
          ))}
        </View>
        <Button title={last ? '시작하기' : '다음'} onPress={next} />
      </View>
    </View>
  );
}

