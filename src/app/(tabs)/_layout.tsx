// 하단 탭 3개: 오늘 / 장소 / 그룹
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../components/ui';

const icon = (emoji: string) => () => <Text style={{ fontSize: 20 }}>{emoji}</Text>;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.sub,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '오늘', headerTitle: 'SHOW ME WHAT YOU GOT', tabBarIcon: icon('🔥') }} />
      <Tabs.Screen name="places" options={{ title: '장소', tabBarIcon: icon('📍') }} />
      <Tabs.Screen name="groups" options={{ title: '그룹', tabBarIcon: icon('👥') }} />
    </Tabs>
  );
}
