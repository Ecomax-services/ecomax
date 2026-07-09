import { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@/theme';

interface Props {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}

/** Header branco com sombra. Com onBack: título centralizado + seta. Sem: título à esquerda. */
export function ScreenHeader({ title, onBack, right }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={8} style={styles.back}>
            <MaterialIcons name="arrow-back" size={22} color={colors.ink} />
          </Pressable>
        )}
        <Text style={[styles.title, onBack ? styles.titleCenter : styles.titleLeft]}>{title}</Text>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
    zIndex: 10,
  },
  row: { height: 56, justifyContent: 'center', paddingHorizontal: 16 },
  back: { position: 'absolute', left: 16, height: 56, justifyContent: 'center', zIndex: 2 },
  title: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  titleCenter: { textAlign: 'center' },
  titleLeft: { textAlign: 'left' },
  right: { position: 'absolute', right: 16, height: 56, justifyContent: 'center' },
});
