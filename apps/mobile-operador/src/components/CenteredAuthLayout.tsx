import { ReactNode } from 'react';
import { View, ImageBackground, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/theme';

/** Shell das telas de auth secundárias: header + fundo floresta claro + conteúdo centralizado. */
export function CenteredAuthLayout({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenHeader title={title} onBack={onBack} />
      <ImageBackground
        source={require('../../assets/forest-light.jpg')}
        style={styles.bg}
        imageStyle={{ opacity: 0.6 }}
        resizeMode="cover"
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>{children}</View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bg: { flex: 1 },
  scroll: { flexGrow: 1, paddingTop: 36, paddingHorizontal: 24 },
  content: { alignItems: 'center' },
});
