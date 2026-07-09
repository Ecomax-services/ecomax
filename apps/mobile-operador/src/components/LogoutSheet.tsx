import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { colors, fonts, radius } from '@/theme';

/** Overlay "Confirmar Saída" como bottom sheet (Figma node 83:275). */
export function LogoutSheet({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.grab} />
        <View style={styles.titleRow}>
          <MaterialIcons name="logout" size={20} color={colors.danger} />
          <Text style={styles.title}>Sair da conta?</Text>
        </View>
        <Text style={styles.subtitle}>Você será desconectado do sistema.</Text>
        <View style={styles.actions}>
          <Button label="Cancelar" variant="outlineDanger" onPress={onCancel} style={{ flex: 1, borderColor: colors.border }} />
          <View style={{ width: 12 }} />
          <Pressable style={styles.confirm} onPress={onConfirm}>
            <Text style={styles.confirmText}>Sair</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.neutral500, marginTop: 8 },
  actions: { flexDirection: 'row', marginTop: 20 },
  confirm: { flex: 1, height: 52, borderRadius: radius.md, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
});
