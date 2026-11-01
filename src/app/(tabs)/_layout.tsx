// 하단 탭 3개: 오늘 / 장소 / 그룹
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { colors, type IconName } from '../../components/ui';

import type { ColorValue } from 'react-native';

function TabIcon({ active, inactive, focused, color }: { active: IconName; inactive: IconName; focused: boolean; color: ColorValue | null }) {
  return <Ionicons name={focused ? active : inactive} size={24} color={(color ?? colors.muted) as string} />;
}

const icon = (active: IconName, inactive: IconName) =>
  function Icon(props: { focused: boolean; color: ColorValue | null }) {
    return <TabIcon active={active} inactive={inactive} {...props} />;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '오늘', tabBarIcon: icon('flame', 'flame-outline') }} />
      <Tabs.Screen name="places" options={{ title: '장소', tabBarIcon: icon('location', 'location-outline') }} />
      <Tabs.Screen name="groups" options={{ title: '그룹', tabBarIcon: icon('people', 'people-outline') }} />
    </Tabs>
  );
}
