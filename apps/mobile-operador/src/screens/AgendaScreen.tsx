import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Tag } from '@/components/Tag';
import { colors, fonts, radius } from '@/theme';
import { listAgenda, type AgendaItem } from '@/lib/operacional';
import type { MainTabParamList } from '@/navigation/types';

/** Tela Agenda: próximas datas (data programada + cronograma) das minhas OS. */
export function AgendaScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((isRefresh?: boolean) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    listAgenda().then(setItems).catch((e) => setError((e as Error).message)).finally(() => { setLoading(false); setRefreshing(false); });
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenHeader title="Agenda" />
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}>
          {error && <Text style={styles.error}>{error}</Text>}
          {!error && items.length === 0 && <Text style={styles.empty}>Nenhuma visita agendada.</Text>}
          {items.map((it) => (
            <Pressable
              key={it.key}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => navigation.navigate('OS', { screen: 'OsDetail', params: { id: it.osId, codigo: it.codigo } })}
            >
              <View style={styles.dateCol}>
                <MaterialIcons name="event" size={18} color={colors.primary} />
                <Text style={styles.date} numberOfLines={1}>{it.data}</Text>
              </View>
              <View style={styles.info}>
                <View style={styles.topRow}>
                  <Text style={styles.codigo}>{it.codigo}</Text>
                  {it.recorrente && <Tag label="Recorrente" bg={colors.infoBg} fg={colors.infoFg} />}
                </View>
                <Text style={styles.cliente}>{it.cliente}</Text>
                <Text style={styles.tipo}>{it.tipo}</Text>
              </View>
            </Pressable>
          ))}
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
  card: { flexDirection: 'row', gap: 12, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14 },
  cardPressed: { backgroundColor: colors.bg },
  dateCol: { alignItems: 'center', gap: 4, width: 92 },
  date: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink, textAlign: 'center' },
  info: { flex: 1, gap: 3 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codigo: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  cliente: { fontFamily: fonts.semibold, fontSize: 13, color: colors.neutral800 },
  tipo: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral500 },
});
