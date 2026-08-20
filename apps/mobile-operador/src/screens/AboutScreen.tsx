import { View, Text, Image, ScrollView, Pressable, Linking, Alert, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fonts, radius } from '@/theme';
import type { ConfigStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<ConfigStackParamList, 'Sobre'>;

/**
 * URLs dos documentos legais.
 *
 * Vazias enquanto o cliente não publica os textos. Ficam aqui, e não espalhadas
 * pela tela, para que publicar seja trocar duas strings — e para que a tela
 * saiba dizer "ainda não disponível" em vez de abrir um link quebrado.
 *
 * Loja de aplicativo exige as duas: sem elas a submissão é recusada.
 */
const LEGAL = {
  termos: '',
  privacidade: '',
};

/** Tela 3.3 - Sobre o aplicativo. */
export function AboutScreen({ navigation }: Props) {
  const versao = Constants.expoConfig?.version ?? '—';
  const sdk = Constants.expoConfig?.sdkVersion ?? '—';

  const abrir = async (url: string, titulo: string) => {
    if (!url) {
      Alert.alert(titulo, 'Este documento ainda não foi publicado. Fale com o administrador do sistema.');
      return;
    }
    const pode = await Linking.canOpenURL(url);
    if (!pode) {
      Alert.alert(titulo, 'Não foi possível abrir o documento neste aparelho.');
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenHeader title="Sobre o aplicativo" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={require('../../assets/ecomax-logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.appName}>Ecomax Operador</Text>
          <Text style={styles.versao}>Versão {versao}</Text>
        </View>

        <Text style={styles.section}>DOCUMENTOS</Text>
        <View style={styles.card}>
          <Row
            icon="description"
            label="Termos de uso"
            pendente={!LEGAL.termos}
            onPress={() => abrir(LEGAL.termos, 'Termos de uso')}
            divider
          />
          <Row
            icon="privacy-tip"
            label="Política de privacidade"
            pendente={!LEGAL.privacidade}
            onPress={() => abrir(LEGAL.privacidade, 'Política de privacidade')}
          />
        </View>

        <Text style={styles.section}>APLICATIVO</Text>
        <View style={styles.card}>
          <Info label="Versão" valor={versao} />
          <View style={styles.divider} />
          <Info label="Expo SDK" valor={sdk} />
          <View style={styles.divider} />
          <Info label="Identificador" valor={Constants.expoConfig?.ios?.bundleIdentifier ?? '—'} />
        </View>

        <Text style={styles.rodape}>© Ecomax Controle de Pragas</Text>
      </ScrollView>
    </View>
  );
}

function Row({
  icon, label, pendente, onPress, divider,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  pendente: boolean;
  onPress: () => void;
  divider?: boolean;
}) {
  return (
    <>
      <Pressable style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bg }]} onPress={onPress}>
        <MaterialIcons name={icon} size={20} color={colors.neutral500} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{label}</Text>
          {/* Diz que falta publicar, em vez de abrir um link vazio ou não fazer
              nada — que era o comportamento anterior da entrada inteira. */}
          {pendente && <Text style={styles.rowPendente}>Ainda não publicado</Text>}
        </View>
        <MaterialIcons name="chevron-right" size={20} color={colors.neutral400} />
      </Pressable>
      {divider && <View style={styles.divider} />}
    </>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  logo: { height: 44, width: 200 },
  appName: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, marginTop: 8 },
  versao: { fontFamily: fonts.regular, fontSize: 13, color: colors.neutral500 },
  section: { fontFamily: fonts.semibold, fontSize: 11, color: colors.neutral500, letterSpacing: 0.6, marginTop: 20, marginBottom: 8 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rowLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  rowPendente: { fontFamily: fonts.regular, fontSize: 12, color: colors.warnFg, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 48 },
  info: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
  infoLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.neutral500 },
  infoValor: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  rodape: { textAlign: 'center', fontFamily: fonts.regular, fontSize: 12, color: colors.neutral400, marginTop: 28 },
});
