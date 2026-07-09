import { useState } from 'react';
import { View, Text, Image, ImageBackground, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Input, PasswordInput } from '@/components/Input';
import { Button } from '@/components/Button';
import { useAuth } from '@/auth/AuthProvider';
import { colors, fonts, radius } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

/** Tela 1 - Login (App Operador, node 30:382). Autenticação via Supabase. */
export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    if (submitting) return;
    setError('');
    if (!email || !password) {
      setError('Informe e-mail e senha.');
      return;
    }
    setSubmitting(true);
    const res = await signIn(email.trim(), password);
    setSubmitting(false);
    // Em caso de sucesso, o navegador troca para a área logada automaticamente.
    if (res.error) setError(res.error);
  }

  return (
    <ImageBackground
      source={require('../../../assets/forest-dark.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Image
            source={require('../../../assets/ecomax-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.heroTitle}>App Operador</Text>
          <Text style={styles.heroSubtitle}>Gestão de campo na palma da mão.</Text>
        </View>

        {/* Card do formulário */}
        <View style={styles.card}>
          <Text style={styles.welcome}>Bem-vindo!</Text>
          <Text style={styles.welcomeSub}>Acesse sua conta para continuar.</Text>

          <View style={{ marginTop: 20 }}>
            <Input
              label="E-mail"
              placeholder="seu@email.com.br"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <View style={{ marginTop: 14 }}>
              <PasswordInput
                label="Senha"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
              />
            </View>
            <Text
              style={[styles.forgot, { marginTop: 10 }]}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              Esqueci minha senha
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              label={submitting ? 'Entrando…' : 'Entrar'}
              onPress={handleLogin}
              style={{ marginTop: 16 }}
            />
          </View>

          <Text style={styles.footnote}>Seu acesso é criado pelo administrador do sistema.</Text>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.heroGreen },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  hero: {
    backgroundColor: colors.heroGreen,
    borderBottomLeftRadius: 21,
    borderBottomRightRadius: 21,
    paddingTop: 72,
    paddingBottom: 52,
    alignItems: 'center',
  },
  logo: { width: 200, height: 56 },
  heroTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white, marginTop: 16 },
  heroSubtitle: { fontFamily: fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 6 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    marginHorizontal: 16,
    marginTop: -32,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 4,
  },
  welcome: { fontFamily: fonts.semibold, fontSize: 22, color: colors.ink, textAlign: 'center' },
  welcomeSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.neutral500, textAlign: 'center', marginTop: 6 },
  forgot: { fontFamily: fonts.medium, fontSize: 13, color: colors.primary },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger, marginTop: 12 },
  footnote: { fontFamily: fonts.regular, fontSize: 11, color: colors.neutral400, textAlign: 'center', marginTop: 20 },
});
