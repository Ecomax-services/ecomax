import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/Button';
import { LogoutSheet } from '@/components/LogoutSheet';
import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';
import type { ConfigStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<ConfigStackParamList, 'Perfil'>;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || 'U';
}

/** Tela 3.1 - Meu Perfil (node 30:600). */
export function ProfileScreen({ navigation }: Props) {
  const { profile, session, signOut } = useAuth();
  const [logout, setLogout] = useState(false);
  const nome = profile?.nome_completo ?? 'Operador';
  const email = session?.user.email ?? '—';

  async function handleChangePassword() {
    if (!session?.user.email) return;
    await supabase.auth.resetPasswordForEmail(session.user.email);
    Alert.alert('Alterar senha', `Enviamos um link de redefinição para ${session.user.email}. Verifique seu e-mail.`);
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenHeader title="Meu Perfil" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarBlock}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsOf(nome)}</Text>
          </View>
          <Text style={styles.editPhoto}>Editar foto</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.section}>DADOS DO USUÁRIO</Text>
          <View style={styles.card}>
            <Field label="Nome completo" value={nome} />
            <Divider />
            <Field label="E-mail (não editável)" value={email} />
            <Divider />
            <Field label="Nível de acesso" value="Técnico de Campo" />
            <Divider />
            <Field label="Tipo de usuário" value="Operador" last />
          </View>

          <Text style={styles.section}>DOCUMENTOS</Text>
          <DocRow icon="check-circle" color={colors.primary} title="CNH" sub="Válido até 15/08/2026" />
          <DocRow icon="warning" color={colors.danger} title="ASO" sub="Válido até 03/01/2025" subDanger />

          <Button label="Alterar senha" variant="outlineGreen" style={{ height: 48, marginTop: 24 }} onPress={handleChangePassword} />
          <Button
            label="Sair da conta"
            variant="outlineDanger"
            style={{ height: 48, marginTop: 12 }}
            onPress={() => setLogout(true)}
          />
        </View>
      </ScrollView>

      <LogoutSheet
        visible={logout}
        onCancel={() => setLogout(false)}
        onConfirm={async () => {
          setLogout(false);
          await signOut();
          // O RootNavigator volta para a pilha de login automaticamente.
        }}
      />
    </View>
  );
}

function Field({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={{ paddingTop: 20, paddingBottom: last ? 20 : 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.fieldDivider} />;
}

function DocRow({
  icon,
  color,
  title,
  sub,
  subDanger,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  title: string;
  sub: string;
  subDanger?: boolean;
}) {
  return (
    <View style={styles.docRow}>
      <MaterialIcons name={icon} size={18} color={color} />
      <View>
        <Text style={styles.docTitle}>{title}</Text>
        <Text style={[styles.docSub, subDanger && { color: colors.danger }]}>{sub}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 32 },
  avatarBlock: { backgroundColor: colors.white, alignItems: 'center', paddingVertical: 24, marginBottom: 4 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.semibold, fontSize: 26, color: colors.white },
  editPhoto: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary, marginTop: 10 },
  body: { paddingHorizontal: 16 },
  section: { fontFamily: fonts.semibold, fontSize: 11, color: colors.neutral400, marginTop: 24, marginBottom: 10, marginLeft: 16 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, paddingHorizontal: 16 },
  fieldLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.neutral500 },
  fieldValue: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink, marginTop: 4 },
  fieldDivider: { height: 1, backgroundColor: colors.border },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.white, borderRadius: radius.md, height: 56, paddingHorizontal: 16, marginBottom: 12 },
  docTitle: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  docSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral500, marginTop: 2 },
});
