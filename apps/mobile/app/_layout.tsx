import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { palette } from '../lib/theme';

export default function RootLayout() {
  return <><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.paper } }}><Stack.Screen name="(tabs)" /><Stack.Screen name="sessions/[id]" options={{ presentation: 'card' }} /><Stack.Screen name="sessions/create" options={{ presentation: 'modal' }} /><Stack.Screen name="auth" options={{ presentation: 'modal' }} /></Stack></>;
}
