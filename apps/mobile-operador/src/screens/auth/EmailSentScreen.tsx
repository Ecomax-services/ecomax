import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CenteredAuthLayout } from '@/components/CenteredAuthLayout';
import { Button } from '@/components/Button';
import { colors, fonts } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EmailSent'>;

/** Tela 1.1.2 - E-mail enviado (node 83:330). */
export function EmailSentScreen({ navigation }: Props) {
  return (
    <CenteredAuthLayout title="E-mail enviado" onBack={() => navigation.goBack()}>
      <View style={{ alignItems: 'center', marginTop: 48 }}>
        <MaterialIcons name="check-circle" size={56} color={colors.primary} />
        <Text style={styles.title}>E-mail enviado!</Text>
        <Text style={styles.subtitle}>Verifique sua caixa de entrada. O link expira em 15 minutos.</Text>
        <Button
          label="Voltar ao login"
          onPress={() => navigation.navigate('Login')}
          style={{ alignSelf: 'stretch', marginTop: 24 }}
        />
      </View>
    </CenteredAuthLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.semibold, fontSize: 20, color: colors.ink, marginTop: 16 },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.neutral500,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
});
