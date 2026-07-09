import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, TextInputProps } from 'react-native';
import { colors, fonts, radius } from '@/theme';

interface Props extends TextInputProps {
  label?: string;
}

/** Campo de texto com label (altura 52, borda 1.5). */
export function Input({ label, style, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.neutral400}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

/** Campo de senha com toggle Mostrar/Ocultar. */
export function PasswordInput({ label, style, ...props }: Props) {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View>
        <TextInput
          secureTextEntry={!show}
          placeholderTextColor={colors.neutral300}
          style={[styles.input, { paddingRight: 72 }, style]}
          {...props}
        />
        <Pressable style={styles.toggle} onPress={() => setShow((v) => !v)} hitSlop={8}>
          <Text style={styles.toggleText}>{show ? 'Ocultar' : 'Mostrar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.neutral800 },
  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: 15,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
  },
  toggle: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  toggleText: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary },
});
