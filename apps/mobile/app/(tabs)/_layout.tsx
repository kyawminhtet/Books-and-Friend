import { Tabs } from 'expo-router';
import { palette } from '../../lib/theme';
import { Text } from 'react-native';

export default function TabLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: palette.sageDark, tabBarInactiveTintColor: '#9ba197', tabBarStyle: { backgroundColor: palette.paper, borderTopColor: palette.line, height: 62, paddingTop: 6, paddingBottom: 7 }, tabBarLabelStyle: { fontSize: 10, marginTop: 1 } }}>
    <Tabs.Screen name="index" options={{ title: 'Discover', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>⌕</Text> }} />
    <Tabs.Screen name="my-reading" options={{ title: 'My reading', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 17 }}>▤</Text> }} />
    <Tabs.Screen name="notifications" options={{ title: 'Notes', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 17 }}>♡</Text> }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 17 }}>◉</Text> }} />
  </Tabs>;
}
