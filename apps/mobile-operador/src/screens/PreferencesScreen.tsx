import { useEffect, useState } from 'react';
import { View, Text, ImageBackground, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Toggle } from '@/components/Toggle';
import { colors, fonts, radius } from '@/theme';
import type { ConfigStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<ConfigStackParamList, 'Preferencias'>;

/** Tela 3.2 - Preferências (node 83:615). Persistidas no dispositivo (AsyncStorage). */
export function PreferencesScreen({ navigation }: Props) {
  const [inApp, setInApp] = useState(false);
  const [email, setEmail] = useState(false);

  useEffect(() => {
    (async () => {
      const [a, e] = await Promise.all([
        AsyncStorage.getItem('ecomax.pref.inApp'),
        AsyncStorage.getItem('ecomax.pref.email'),
      ]);
      if (a !== null) setInApp(a === 'true');
      if (e !== null) setEmail(e === 'true');
    })();
  }, []);

  const toggleInApp = () => {
    const v = !inApp;
    setInApp(v);
    AsyncStorage.setItem('ecomax.pref.inApp', String(v));
  };
  const toggleEmail = () => {
    const v = !email;
    setEmail(v);
    AsyncStorage.setItem('ecomax.pref.email', String(v));
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
            sub="Receber alertas dentro do aplicativo"
            value={inApp}
            onChange={toggleInApp}
          />
          <View style={styles.divider} />
          <Row
            title="Notificações por e-mail"
            sub="Receber cópia das notificações por e-mail"
            value={email}
            onChange={toggleEmail}
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
}: {
  title: string;
  sub: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <View style={styles.row}>
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
