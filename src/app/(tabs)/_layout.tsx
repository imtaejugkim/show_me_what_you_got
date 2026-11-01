// 하단 탭 3개: 오늘 / 장소 / 그룹 (선택된 탭은 채워진 아이콘)
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { colors, fonts, type IconName } from '../../components/ui';

function TabIcon({ active, inactive, focused, color }: { active: IconName; inactive: IconName; focused: boolean; color: ColorValue | null }) {
  return <Ionicons name={focused ? active : inactive} size={24} color={(color ?? colors.sub) as string} />;
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
          backgroundColor: 'rgba(11,11,12,0.94)',
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.sub,
        tabBarLabelStyle: { fontSize: 11, fontFamily: fonts.bold },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '오늘', tabBarIcon: icon('flame', 'flame-outline') }} />
      <Tabs.Screen name="places" options={{ title: '장소', tabBarIcon: icon('location', 'location-outline') }} />
      <Tabs.Screen name="groups" options={{ title: '그룹', tabBarIcon: icon('people', 'people-outline') }} />
    </Tabs>
  );
}
