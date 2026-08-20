import { useEffect, useState } from 'react';
import { View, Text, ImageBackground, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { carregarPrefBadge, definirPrefBadge, carregarPrefEmail, definirPrefEmail } from '@/lib/preferencias';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Toggle } from '@/components/Toggle';
import { colors, fonts, radius } from '@/theme';
import type { ConfigStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<ConfigStackParamList, 'Preferencias'>;

/**
 * Tela 3.2 - Preferências (node 83:615).
 *
 * As duas chaves gravavam no aparelho e ninguém lia o valor: desligar não mudava
 * nada. Agora a do app comanda o badge de verdade, e a de e-mail vive no perfil
 * (por usuário, não por aparelho) — desabilitada enquanto nada no sistema envia
 * notificação por e-mail, para não prometer o que não existe.
 */
export function PreferencesScreen({ navigation }: Props) {
  const [inApp, setInApp] = useState(true);
  const [email, setEmail] = useState(false);

  useEffect(() => {
    carregarPrefBadge().then(setInApp).catch(() => {});
    carregarPrefEmail().then(setEmail).catch(() => {});
  }, []);

  const toggleInApp = () => {
    const v = !inApp;
    setInApp(v);
    definirPrefBadge(v).catch(() => {});
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenHeader title="Preferências" onBack={() => navigation.goBack()} />
      <ImageBackground
        source={require('../../assets/forest-light.jpg')}
        style={styles.bg}
        imageStyle={{ opacity: 0.55 }}
        resizeMode="cover"
      >
        <Text style={styles.section}>NOTIFICAÇÕES</Text>
        <View style={styles.card}>
          <Row
            title="Notificações no app"
            sub="Mostrar o contador de não lidas na aba Notificações"
            value={inApp}
            onChange={toggleInApp}
          />
          <View style={styles.divider} />
          {/* Guardada no perfil e desabilitada: a preferência é por usuário, não
              por aparelho, mas nada no sistema envia notificação por e-mail
              ainda — deixar clicável prometeria um recurso que não existe. */}
          <Row
            title="Notificações por e-mail"
            sub="Indisponível — o envio por e-mail ainda não foi liberado"
            value={email}
            onChange={() => {}}
            disabled
          />
        </View>
      </ImageBackground>
    </View>
  );
}

function Row({
  title,
  sub,
  value,
  onChange,
  disabled,
}: {
  title: string;
  sub: string;
  value: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, disabled && { opacity: 0.5 }]} pointerEvents={disabled ? 'none' : 'auto'}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Toggle value={value} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bg: { flex: 1, paddingHorizontal: 16 },
  section: { fontFamily: fonts.semibold, fontSize: 11, color: colors.neutral400, marginTop: 24, marginBottom: 10, marginLeft: 16 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowTitle: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  rowSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral500, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border },
});
