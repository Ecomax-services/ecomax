import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Tag } from '@/components/Tag';
import { colors, fonts, radius } from '@/theme';
import { initialNotifications, tagColors, type NotificationItem } from '@/data/notifications';

type Tab = 'todas' | 'nao-lidas' | 'lidas';
const TABS: { key: Tab; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'nao-lidas', label: 'Não lidas' },
  { key: 'lidas', label: 'Lidas' },
];

/** Tela 2 - Notificações (nodes 30:497 e 83:483). */
export function NotificationsScreen() {
  const [items, setItems] = useState<NotificationItem[]>(initialNotifications);
  const [tab, setTab] = useState<Tab>('todas');

  const unread = items.filter((n) => !n.read).length;
  const visible = useMemo(() => {
    if (tab === 'nao-lidas') return items.filter((n) => !n.read);
    if (tab === 'lidas') return items.filter((n) => n.read);
    return items;
  }, [items, tab]);

  const markAll = () => setItems((p) => p.map((n) => ({ ...n, read: true })));

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenHeader
        title="Notificações"
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable onPress={markAll} disabled={unread === 0}>
              <Text style={[styles.markAll, unread === 0 && { opacity: 0.4 }]}>Marcar como lidas</Text>
            </Pressable>
            {unread > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.badgeText}>{unread}</Text>
              </View>
            )}
          </View>
        }
      />

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              {active && <View style={styles.tabIndicator} />}
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {visible.length === 0 ? (
          <Text style={styles.empty}>Nenhuma notificação.</Text>
        ) : (
          visible.map((n) => <Card key={n.id} item={n} />)
        )}
      </ScrollView>
    </View>
  );
}

function Card({ item }: { item: NotificationItem }) {
  const tc = tagColors[item.kind];
  return (
    <View style={[styles.card, item.read ? styles.cardRead : styles.cardUnread]}>
      {!item.read && <View style={styles.dot} />}
      <View style={[styles.cardInner, !item.read && { paddingLeft: 28 }]}>
        <View style={styles.cardTop}>
          <Tag label={item.tagLabel} bg={tc.bg} fg={tc.fg} />
          <Text style={styles.datetime}>{item.datetime}</Text>
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDesc}>{item.description}</Text>
        <Text style={styles.cardAction}>Ver detalhes</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  markAll: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary },
  headerBadge: { backgroundColor: colors.danger, borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.white },
  tabs: { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: '#eff3f6' },
  tab: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontFamily: fonts.regular, fontSize: 13, color: colors.neutral500 },
  tabTextActive: { fontFamily: fonts.semibold, color: colors.primary },
  tabIndicator: { position: 'absolute', bottom: 0, height: 2, width: '100%', backgroundColor: colors.primary },
  list: { padding: 16, gap: 16 },
  empty: { textAlign: 'center', color: colors.neutral500, fontFamily: fonts.regular, marginTop: 40 },
  card: { borderRadius: radius.md, minHeight: 113, justifyContent: 'center' },
  cardUnread: { backgroundColor: colors.primaryTint },
  cardRead: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  cardInner: { padding: 14, gap: 6 },
  dot: { position: 'absolute', left: 14, top: '50%', width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  datetime: { fontFamily: fonts.regular, fontSize: 11, color: colors.neutral400 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  cardDesc: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral500 },
  cardAction: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary, marginTop: 2 },
});
