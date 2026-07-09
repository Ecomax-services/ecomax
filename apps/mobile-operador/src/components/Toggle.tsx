import { Pressable, View, StyleSheet } from 'react-native';
import { colors } from '@/theme';

/** Switch on/off (track 44×26, knob 20). */
export function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={onChange}
      style={[styles.track, { backgroundColor: value ? colors.primary : colors.neutral300 }]}
    >
      <View style={[styles.knob, { left: value ? 21 : 3 }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 44, height: 26, borderRadius: 13, justifyContent: 'center' },
  knob: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
});
