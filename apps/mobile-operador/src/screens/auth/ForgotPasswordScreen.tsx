import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CenteredAuthLayout } from '@/components/CenteredAuthLayout';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

/** Tela 1.1 - Recuperação de senha (node 30:460). */
export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSend() {
    if (submitting) return;
    setError('');
    if (!email) {
      setError('Informe o e-mail cadastrado.');
      return;
    }
    setSubmitting(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());
    setSubmitting(false);
    if (err && err.status && err.status >= 500) {
      setError('Não foi possível enviar agora. Verifique sua conexão e tente novamente.');
      return;
    }
    navigation.navigate('EmailSent');
  }

  return (
    <CenteredAuthLayout title="Recuperar senha" onBack={() => navigation.goBack()}>
      <View style={styles.iconCircle}>
        <MaterialIcons name="mail-outline" size={24} color={colors.primary} />
      </View>
      <Text style={styles.title}>Esqueceu sua senha?</Text>
      <Text style={styles.subtitle}>
        Digite o e-mail cadastrado. Você receberá um link para criar uma nova senha.
      </Text>

      <View style={styles.form}>
        <Input
          label="E-mail cadastrado"
          placeholder="seu@email.com.br"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={submitting ? 'Enviando…' : 'Enviar link de recuperação'}
          onPress={handleSend}
        />
        <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
          Voltar ao login
        </Text>
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
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger, textAlign: 'center' },
  link: { fontFamily: fonts.medium, fontSize: 13, color: colors.primary, textAlign: 'center' },
});
