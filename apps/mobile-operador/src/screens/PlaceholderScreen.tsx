import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fonts } from '@/theme';

/** Telas de aba ainda não detalhadas no escopo (OS, Agenda). */
export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenHeader title={title} />
      <View style={styles.center}>
        <Text style={styles.text}>Em breve.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.medium, fontSize: 15, color: colors.neutral400 },
});
