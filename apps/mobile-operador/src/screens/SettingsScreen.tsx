import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LogoutSheet } from '@/components/LogoutSheet';
import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';
import type { ConfigStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<ConfigStackParamList, 'Configuracoes'>;
type IconName = keyof typeof MaterialIcons.glyphMap;

function initialsOf(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || 'U';
}

/** Tela 3 - Configurações (node 30:554). */
export function SettingsScreen({ navigation }: Props) {
  const { profile, session, signOut } = useAuth();
  const [logout, setLogout] = useState(false);
  const nome = profile?.nome_completo ?? 'Operador';
  const email = session?.user.email;

  async function handleChangePassword() {
    if (!email) return;
    await supabase.auth.resetPasswordForEmail(email);
    Alert.alert('Alterar senha', `Enviamos um link de redefinição para ${email}. Verifique seu e-mail.`);
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenHeader
        title="Configurações"
        onBack={() => navigation.getParent()?.navigate('OS' as never)}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Card de perfil */}
        <Pressable style={styles.profileCard} onPress={() => navigation.navigate('Perfil')}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsOf(nome)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{nome}</Text>
            <Text style={styles.role}>Operador</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.neutral400} />
        </Pressable>

        <Text style={styles.section}>CONTA</Text>
        <View style={styles.group}>
          <Row icon="person" label="Meu Perfil" onPress={() => navigation.navigate('Perfil')} divider />
          <Row icon="lock" label="Alterar senha" onPress={handleChangePassword} />
        </View>

        <Text style={styles.section}>PREFERÊNCIAS</Text>
        <View style={styles.group}>
          <Row icon="notifications" label="Notificações" onPress={() => navigation.navigate('Preferencias')} divider />
          <Row icon="info" label="Sobre o aplicativo" onPress={() => {}} />
        </View>

        <Pressable style={styles.logoutRow} onPress={() => setLogout(true)}>
          <MaterialIcons name="logout" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </Pressable>

        <Text style={styles.version}>Ecomax Operador · v1.0.0</Text>
      </ScrollView>

      <LogoutSheet
        visible={logout}
        onCancel={() => setLogout(false)}
        onConfirm={async () => {
          setLogout(false);
          await signOut();
        }}
      />
    </View>
  );
}

function Row({
  icon,
  label,
  onPress,
  divider,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  divider?: boolean;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <MaterialIcons name={icon} size={20} color={colors.neutral600} />
      <Text style={styles.rowLabel}>{label}</Text>
      <MaterialIcons name="chevron-right" size={22} color={colors.neutral400} />
      {divider && <View style={styles.divider} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 32 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.semibold, fontSize: 20, color: colors.white },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  role: { fontFamily: fonts.regular, fontSize: 13, color: colors.neutral500, marginTop: 2 },
  section: { fontFamily: fonts.semibold, fontSize: 11, color: colors.neutral400, marginTop: 24, marginBottom: 10, marginLeft: 16 },
  group: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: colors.white, borderRadius: radius.md, height: 56, paddingHorizontal: 16 },
  rowLabel: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  divider: { position: 'absolute', left: 16, right: 16, bottom: 0, height: 1, backgroundColor: colors.border },
  logoutRow: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: colors.white, borderRadius: radius.md, height: 52, paddingHorizontal: 16, marginTop: 24 },
  logoutText: { fontFamily: fonts.regular, fontSize: 15, color: colors.danger },
  version: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral400, textAlign: 'center', marginTop: 24 },
});
