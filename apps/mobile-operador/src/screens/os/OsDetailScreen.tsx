import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Tag } from '@/components/Tag';
import { Button } from '@/components/Button';
import { colors, fonts, radius } from '@/theme';
import {
  getOs, listProdutos, listCronograma, tagDoStatus, isReadOnly,
  type OsDetail, type OsProdutoItem, type CronogramaItem,
} from '@/lib/operacional';
import { rascunhoGuardado } from '@/lib/execucao/rascunho';
import type { OsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<OsStackParamList, 'OsDetail'>;

export function OsDetailScreen({ route, navigation }: Props) {
  const { id, codigo } = route.params;
  const [os, setOs] = useState<OsDetail | null>(null);
  const [produtos, setProdutos] = useState<OsProdutoItem[]>([]);
  const [cronograma, setCronograma] = useState<CronogramaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [temRascunho, setTemRascunho] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getOs(id), listProdutos(id), listCronograma(id), rascunhoGuardado(id)])
      .then(([o, p, c, r]) => { setOs(o); setProdutos(p); setCronograma(c); setTemRascunho(!!r); })
      .catch((e) => Alert.alert('Erro', (e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !os) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScreenHeader title={codigo} onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  const t = tagDoStatus(os.status);
  const readOnly = isReadOnly(os.status);
  const podeExecutar = !readOnly && os.status !== 'executada';

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenHeader title={os.codigo} onBack={() => navigation.goBack()} right={<Tag label={t.label} bg={t.bg} fg={t.fg} />} />
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {/* Dados */}
        <Section title="Dados da visita">
          <Row label="Cliente" value={os.cliente} />
          <Row label="Endereço" value={os.endereco} icon="place" />
          <Row label="Tipo de serviço" value={os.tipos} />
          <Row label="Pragas-alvo" value={os.pragas} />
          <Row label="Data / hora" value={`${os.data}${os.hora !== '—' ? ` · ${os.hora}` : ''}`} />
          <Row label="Duração estimada" value={os.duracao} />
          <Row label="Descrição" value={os.descricao} />
        </Section>

        {readOnly && (
          <View style={styles.lockBanner}>
            <MaterialIcons name="lock" size={16} color={colors.neutral500} />
            <Text style={styles.lockText}>OS {t.label.toLowerCase()} — somente leitura.</Text>
          </View>
        )}

        {/* A execução acontece em ExecucaoScreen, em seis etapas, e é enviada
            de uma vez no fim. Esta tela é só de consulta: as ações avulsas que
            ficavam aqui (check-in, consumo, assinatura, "marcar como executada")
            gravavam direto no banco e brigavam com o envio único. */}
        {podeExecutar && (
          <Button
            label={temRascunho ? 'Continuar execução' : 'Executar serviço'}
            onPress={() => navigation.navigate('Execucao', { osId: id })}
          />
        )}
        {temRascunho && podeExecutar && (
          <Text style={styles.hint}>Há uma execução em andamento guardada neste aparelho.</Text>
        )}

        <Section title="Produtos previstos">
          {produtos.length === 0 && <Text style={styles.empty}>Nenhum produto previsto.</Text>}
          {produtos.map((p) => (
            <View key={p.id} style={styles.prod}>
              <View style={styles.prodInfo}>
                <Text style={styles.prodName}>{p.produto}</Text>
                <Text style={styles.prodMeta}>Recomendado: {p.recomendada} {p.unidade}</Text>
              </View>
              <Text style={styles.prodVal}>{p.utilizada == null ? '—' : `${p.utilizada} ${p.unidade}`}</Text>
            </View>
          ))}
        </Section>

        {/* Cronograma */}
        {cronograma.length > 0 && (
          <Section title="Cronograma">
            {cronograma.map((c) => (
              <View key={c.id} style={styles.cronoRow}>
                <MaterialIcons name="event-repeat" size={16} color={colors.neutral500} />
                <Text style={styles.cronoDate}>{c.data}</Text>
              </View>
            ))}
          </Section>
        )}

        {os.status === 'executada' && (
          <View style={styles.doneBanner}>
            <MaterialIcons name="verified" size={16} color={colors.primary} />
            <Text style={styles.doneText}>Executada — aguardando conclusão pelo back office.</Text>
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}
function Row({ label, value, icon }: { label: string; value: string; icon?: keyof typeof MaterialIcons.glyphMap }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValWrap}>
        {icon && <MaterialIcons name={icon} size={15} color={colors.neutral400} />}
        <Text style={styles.rowVal}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 16 },
  section: { gap: 8 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.neutral500, textTransform: 'uppercase', letterSpacing: 0.4 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12 },
  row: { gap: 2 },
  rowLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.neutral400, textTransform: 'uppercase' },
  rowValWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowVal: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink, flex: 1 },
  lockBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eef0f2', borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10 },
  lockText: { fontFamily: fonts.medium, fontSize: 13, color: colors.neutral500 },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral400 },
  empty: { fontFamily: fonts.regular, fontSize: 13, color: colors.neutral400 },
  prod: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prodInfo: { flex: 1 },
  prodName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  prodMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral500 },
  prodVal: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  cronoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cronoDate: { fontFamily: fonts.medium, fontSize: 14, color: colors.neutral800 },
  doneBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primaryTint, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 12 },
  doneText: { fontFamily: fonts.medium, fontSize: 13, color: colors.primary },
});
