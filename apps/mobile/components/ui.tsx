import { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, Image } from 'react-native';
import { palette } from '../lib/theme';

export function Page({ children }: PropsWithChildren) { return <View style={styles.page}>{children}</View>; }
export function Eyebrow({ children }: PropsWithChildren) { return <Text style={styles.eyebrow}>{children}</Text>; }
export function Title({ children }: PropsWithChildren) { return <Text style={styles.title}>{children}</Text>; }
export function Field(props: React.ComponentProps<typeof TextInput>) { return <TextInput placeholderTextColor="#9ba197" {...props} style={[styles.field, props.style]} />; }
export function Button({ title, onPress, disabled, light }: { title: string; onPress: () => void; disabled?: boolean; light?: boolean }) {
  return <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, light && styles.buttonLight, (pressed || disabled) && { opacity: .68 }]}><Text style={[styles.buttonText, light && { color: palette.sageDark }]}>{title}</Text></Pressable>;
}
export function Message({ children, error }: PropsWithChildren<{ error?: boolean }>) { return children ? <Text accessibilityRole="alert" style={[styles.message, error && { color: '#a54f41' }]}>{children}</Text> : null; }
export function Loading() { return <ActivityIndicator color={palette.sageDark} style={{ margin: 28 }} />; }
export function Avatar({ name, uri, size = 40 }: { name?: string | null; uri?: string | null; size?: number }) {
  return uri ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: palette.soft }} /> : <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}><Text style={styles.avatarText}>{(name || 'R').trim().slice(0, 1).toUpperCase()}</Text></View>;
}
export function CircleCover({ title, author, color, uri }: { title: string; author: string; color: string; uri?: string | null }) {
  return <View style={[styles.cover, { backgroundColor: color }]}>{uri ? <Image source={{ uri }} resizeMode="cover" style={StyleSheet.absoluteFill} /> : <><Text style={styles.coverTitle}>{title}</Text><Text style={styles.coverAuthor}>{author}</Text></>}</View>;
}
export const commonStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper }, content: { padding: 22, paddingBottom: 42 },
  row: { flexDirection: 'row', alignItems: 'center' }, spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: { borderWidth: 1, borderColor: '#ebede6', backgroundColor: palette.white, borderRadius: 12, overflow: 'hidden', marginBottom: 14 },
  section: { fontFamily: 'Georgia', fontSize: 24, color: palette.ink, marginBottom: 12 },
  body: { color: palette.muted, fontSize: 14, lineHeight: 22 }, muted: { color: palette.muted, fontSize: 12, lineHeight: 18 },
});
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper }, eyebrow: { color: '#89927e', fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  title: { color: palette.ink, fontFamily: 'Georgia', fontSize: 34, lineHeight: 41, marginVertical: 9 },
  field: { backgroundColor: palette.white, borderColor: palette.line, borderWidth: 1, borderRadius: 9, paddingHorizontal: 13, paddingVertical: 12, color: palette.ink, fontSize: 14, marginTop: 6, marginBottom: 14 },
  button: { backgroundColor: palette.ink, borderRadius: 8, paddingVertical: 13, paddingHorizontal: 17, alignItems: 'center', marginTop: 7 }, buttonLight: { backgroundColor: '#edf0e8' }, buttonText: { color: palette.white, fontSize: 13, fontWeight: '700' },
  message: { color: palette.sageDark, fontSize: 13, lineHeight: 19, marginVertical: 9 }, avatar: { backgroundColor: '#e8ede4', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: palette.sageDark, fontFamily: 'Georgia', fontSize: 16 },
  cover: { height: 150, alignItems: 'center', justifyContent: 'center', padding: 20, overflow: 'hidden' }, coverTitle: { color: '#4f5e50', fontFamily: 'Georgia', fontWeight: '700', fontSize: 21, textAlign: 'center' }, coverAuthor: { color: '#69776a', fontSize: 11, marginTop: 8 },
});
