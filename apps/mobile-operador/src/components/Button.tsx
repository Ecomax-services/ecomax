import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, fonts, radius } from '@/theme';

type Variant = 'primary' | 'outlineGreen' | 'outlineDanger';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  style?: ViewStyle;
}

/** Botão padrão (altura 52, raio 12). */
export function Button({ label, onPress, variant = 'primary', style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.base, styles[variant], pressed && { opacity: 0.85 }, style]}
    >
      <Text style={[styles.label, textStyles[variant]]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.primary },
  outlineGreen: { backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.primary },
  outlineDanger: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.dangerBorder },
  label: { fontFamily: fonts.semibold, fontSize: 15 },
});

const textStyles = StyleSheet.create({
  primary: { color: colors.white },
  outlineGreen: { color: colors.primary },
  outlineDanger: { color: colors.danger },
});
