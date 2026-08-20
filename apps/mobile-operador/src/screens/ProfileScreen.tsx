import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/Button';
import { LogoutSheet } from '@/components/LogoutSheet';
import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { enviarLinkDeRecuperacao } from '@/lib/recuperacaoSenha';
import { getMeuPerfil, type MeuPerfil, type DocState } from '@/lib/perfil';
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
  const [dados, setDados] = useState<MeuPerfil | null>(null);
  const nome = profile?.nome_completo ?? 'Operador';
  const email = session?.user.email ?? '—';

  useEffect(() => {
    getMeuPerfil().then(setDados).catch(() => setDados(null));
  }, []);

  async function handleChangePassword() {
    if (!session?.user.email) return;
    await enviarLinkDeRecuperacao(session.user.email);
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
            <Field label="Cargo" value={dados?.cargo ?? '—'} />
            <Divider />
            <Field label="Setor" value={dados?.setor ?? '—'} />
            <Divider />
            <Field label="Tipo de usuário" value={roleLabel(profile?.role)} last />
          </View>

          <Text style={styles.section}>DOCUMENTOS</Text>
          {dados === null && <Text style={styles.docEmpty}>Carregando…</Text>}
          {dados?.semCadastro && (
            <Text style={styles.docEmpty}>
              Seu login ainda não está vinculado a um cadastro de funcionário. Fale com o administrador.
            </Text>
          )}
          {dados?.documentos.map((d) => (
            <DocRow key={d.tipo} titulo={d.tipo} validade={d.validade} estado={d.estado} />
          ))}

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

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  operacional: 'Operacional',
  operador: 'Operador',
  almoxarifado: 'Almoxarifado',
  comercial: 'Comercial',
  financeiro: 'Financeiro',
  rh: 'RH',
  cliente: 'Cliente',
};
const roleLabel = (r?: string) => (r ? ROLE_LABEL[r] ?? r : '—');

/** Aparência de cada estado de documento. */
const DOC_META: Record<DocState, { icon: keyof typeof MaterialIcons.glyphMap; color: string; texto: (v: string) => string }> = {
  ok: { icon: 'check-circle', color: colors.primary, texto: (v) => `Válido até ${v}` },
  soon: { icon: 'schedule', color: colors.warnFg, texto: (v) => `Vence em ${v}` },
  expired: { icon: 'warning', color: colors.danger, texto: (v) => `Vencido em ${v}` },
  // Cinza e "Não se aplica" diziam ao operador que o documento era dispensável.
  // Falta de ASO ou CNH impede trabalhar em campo — o aviso tem que aparecer.
  ausente: { icon: 'error-outline', color: colors.warnFg, texto: () => 'Não enviado' },
};

function DocRow({ titulo, validade, estado }: { titulo: string; validade: string; estado: DocState }) {
  // Sem o fallback, um estado que não esteja no mapa derruba a tela inteira do
  // perfil com "Cannot read property 'icon' of undefined" — caro demais para
  // uma linha de documento.
  const meta = DOC_META[estado] ?? DOC_META.ausente;
  const alerta = estado === 'expired' || estado === 'soon' || estado === 'ausente';
  return (
    <View style={styles.docRow}>
      <MaterialIcons name={meta.icon} size={18} color={meta.color} />
      <View>
        <Text style={styles.docTitle}>{titulo}</Text>
        <Text style={[styles.docSub, alerta && { color: meta.color }]}>{meta.texto(validade)}</Text>
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
  docEmpty: { fontFamily: fonts.regular, fontSize: 13, color: colors.neutral500, paddingHorizontal: 16, paddingVertical: 12, lineHeight: 19 },
});
