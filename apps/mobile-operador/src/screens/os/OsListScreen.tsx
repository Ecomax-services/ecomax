import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Tag } from '@/components/Tag';
import { colors, fonts, radius } from '@/theme';
import { listMinhasOs, osTag, type OsListItem } from '@/lib/operacional';
import type { OsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<OsStackParamList, 'OsList'>;

/** Tela 1 do módulo OS: ordens de serviço atribuídas ao operador. */
export function OsListScreen({ navigation }: Props) {
  const [items, setItems] = useState<OsListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((isRefresh?: boolean) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    listMinhasOs()
      .then(setItems)
      .catch((e) => setError((e as Error).message))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenHeader title="Ordens de Serviço" />
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        >
          {error && <Text style={styles.error}>{error}</Text>}
          {!error && items.length === 0 && <Text style={styles.empty}>Nenhuma OS atribuída a você.</Text>}
          {items.map((os) => {
            const t = osTag[os.status];
            return (
              <Pressable key={os.id} style={styles.card} onPress={() => navigation.navigate('OsDetail', { id: os.id, codigo: os.codigo })}>
                <View style={styles.cardTop}>
                  <Text style={styles.codigo}>{os.codigo}</Text>
                  <Tag label={t.label} bg={t.bg} fg={t.fg} />
                </View>
                <Text style={styles.cliente}>{os.cliente}</Text>
                <Text style={styles.tipo}>{os.tipos}</Text>
                <View style={styles.metaRow}>
                  <MaterialIcons name="event" size={15} color={colors.neutral400} />
                  <Text style={styles.meta}>{os.data}{os.hora ? ` · ${os.hora}` : ''}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12 },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: 13, textAlign: 'center', marginTop: 20 },
  empty: { textAlign: 'center', color: colors.neutral500, fontFamily: fonts.regular, marginTop: 40 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codigo: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  cliente: { fontFamily: fonts.semibold, fontSize: 14, color: colors.neutral800 },
  tipo: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral500 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  meta: { fontFamily: fonts.medium, fontSize: 12, color: colors.neutral500 },
});
