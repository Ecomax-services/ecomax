import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '@/theme';

/** Etiqueta colorida (OS, Documento…). */
export function Tag({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { height: 22, borderRadius: 11, paddingHorizontal: 10, justifyContent: 'center', alignSelf: 'flex-start' },
  text: { fontFamily: fonts.medium, fontSize: 11 },
});
