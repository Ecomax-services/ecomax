import { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CenteredAuthLayout } from '@/components/CenteredAuthLayout';
import { PasswordInput } from '@/components/Input';
import { Button } from '@/components/Button';
import { colors, fonts } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

/** Política de senha (RF-004): 8–16 chars, 1 número, 1 letra, 1 especial. */
function evaluate(pw: string) {
  const checks = [
    pw.length >= 8 && pw.length <= 16,
    /\d/.test(pw),
    /[a-zA-Z]/.test(pw),
    /[^a-zA-Z0-9]/.test(pw),
  ];
  return checks.filter(Boolean).length;
}

const META = [
  { label: '', color: colors.border, width: '0%' },
  { label: 'Fraca', color: colors.danger, width: '33%' },
  { label: 'Fraca', color: colors.danger, width: '33%' },
  { label: 'Média', color: colors.strengthMed, width: '66%' },
  { label: 'Forte', color: colors.primary, width: '100%' },
] as const;

/** Tela 1.1.1 - Criar nova senha (node 30:475). */
export function ResetPasswordScreen({ navigation }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const score = useMemo(() => evaluate(password), [password]);
  const meta = META[score];

  return (
    <CenteredAuthLayout title="Criar nova senha" onBack={() => navigation.goBack()}>
      <View style={styles.iconCircle}>
        <MaterialIcons name="vpn-key" size={22} color={colors.primary} />
      </View>
      <Text style={styles.title}>Crie sua nova senha</Text>
      <Text style={styles.subtitle}>8–16 caracteres com letras, números e um símbolo especial.</Text>

      <View style={styles.form}>
        <View>
          <PasswordInput
            label="Nova senha"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
          />
          {password.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { backgroundColor: meta.color, width: meta.width as `${number}%` }]} />
              </View>
              <Text style={[styles.strength, { color: meta.color }]}>Força: {meta.label}</Text>
            </View>
          )}
        </View>
        <PasswordInput
          label="Confirmar senha"
          placeholder="••••••••"
          value={confirm}
          onChangeText={setConfirm}
        />
        <Button
          label="Salvar nova senha"
          onPress={() => {
            if (score === 4 && password === confirm) navigation.navigate('Login');
          }}
        />
      </View>
    </CenteredAuthLayout>
  );
}

const styles = StyleSheet.create({
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontFamily: fonts.semibold, fontSize: 20, color: colors.ink },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.neutral500,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 300,
  },
  form: { alignSelf: 'stretch', gap: 16, marginTop: 24 },
  barTrack: { height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  strength: { fontFamily: fonts.regular, fontSize: 11, marginTop: 4 },
});
