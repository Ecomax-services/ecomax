import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TextInput, Pressable, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Tag } from '@/components/Tag';
import { Button } from '@/components/Button';
import { AssinaturaSheet } from '@/components/AssinaturaSheet';
import { colors, fonts, radius } from '@/theme';
import {
  getOs, listProdutos, listCronograma, registrarCheckIn, registrarCheckOut, salvarConsumo,
  confirmarAssinatura, registrarFoto, marcarExecutada, osTag, isReadOnly, brTime,
  type OsDetail, type OsProdutoItem, type CronogramaItem,
} from '@/lib/operacional';
import type { OsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<OsStackParamList, 'OsDetail'>;

export function OsDetailScreen({ route, navigation }: Props) {
  const { id, codigo } = route.params;
  const [os, setOs] = useState<OsDetail | null>(null);
  const [produtos, setProdutos] = useState<OsProdutoItem[]>([]);
  const [cronograma, setCronograma] = useState<CronogramaItem[]>([]);
  const [consumo, setConsumo] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [assinando, setAssinando] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getOs(id), listProdutos(id), listCronograma(id)])
      .then(([o, p, c]) => {
        setOs(o); setProdutos(p); setCronograma(c);
        setConsumo(Object.fromEntries(p.map((x) => [x.id, x.utilizada == null ? '' : String(x.utilizada)])));
      })
      .catch((e) => Alert.alert('Erro', (e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  /**
   * Anexa uma foto da execução.
   *
   * Câmera primeiro, galeria como alternativa: em campo o caso normal é
   * fotografar na hora, mas a pessoa pode ter fotografado antes de abrir a OS.
   */
  const anexarFoto = () => {
    Alert.alert('Anexar foto', 'De onde vem a foto?', [
      { text: 'Câmera', onPress: () => capturar('camera') },
      { text: 'Galeria', onPress: () => capturar('galeria') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const capturar = async (origem: 'camera' | 'galeria') => {
    const perm =
      origem === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permissão necessária',
        `Autorize o acesso ${origem === 'camera' ? 'à câmera' : 'às fotos'} nos ajustes do aparelho.`,
      );
      return;
    }
    const opcoes: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      // Reduz o arquivo antes de subir: em campo a rede costuma ser ruim, e a
      // foto serve de evidência, não de material publicitário.
      quality: 0.6,
      allowsEditing: false,
    };
    const r =
      origem === 'camera'
        ? await ImagePicker.launchCameraAsync(opcoes)
        : await ImagePicker.launchImageLibraryAsync(opcoes);
    if (r.canceled || !r.assets?.[0]) return;
    const asset = r.assets[0];
    const nome = asset.fileName ?? `foto-${Date.now()}.jpg`;
    await run(() => registrarFoto(id, asset.uri, nome), 'Foto anexada');
  };

  const run = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true);
    try { await fn(); if (ok) Alert.alert(ok); load(); }
    catch (e) { Alert.alert('Erro', (e as Error).message); }
    finally { setBusy(false); }
  };

  const salvarTodoConsumo = async () => {
    for (const p of produtos) {
      const raw = consumo[p.id] ?? '';
      const val = raw.trim() === '' ? null : Number(raw.replace(',', '.'));
      if (val != null && Number.isNaN(val)) return Alert.alert('Quantidade inválida', `Verifique o produto ${p.produto}.`);
      if (val !== p.utilizada) await salvarConsumo(id, p.id, val);
    }
    Alert.alert('Consumo registrado'); load();
  };

  const confirmarFinalizar = () => {
    Alert.alert('Marcar como executada', 'A assinatura do cliente é obrigatória. Confirmar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => run(() => marcarExecutada(id), 'OS marcada como executada') },
    ]);
  };

  if (loading || !os) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScreenHeader title={codigo} onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  const t = osTag[os.status];
  const readOnly = isReadOnly(os.status);

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

        {/* Check-in / out */}
        <Section title="Execução">
          <View style={styles.checkRow}>
            <CheckState label="Check-in" time={brTime(os.checkInAt)} done={!!os.checkInAt} />
            <CheckState label="Check-out" time={brTime(os.checkOutAt)} done={!!os.checkOutAt} />
          </View>
          {!readOnly && !os.checkInAt && <Button label="Registrar check-in" onPress={() => run(() => registrarCheckIn(id, os.status), 'Check-in registrado')} />}
          {!readOnly && os.checkInAt && !os.checkOutAt && <Button label="Registrar check-out" variant="outlineGreen" onPress={() => run(() => registrarCheckOut(id), 'Check-out registrado')} />}
          <Text style={styles.hint}>A localização (GPS) do check-in ainda não é registrada.</Text>
        </Section>

        {/* Produtos / consumo */}
        <Section title="Produtos — consumo">
          {produtos.length === 0 && <Text style={styles.empty}>Nenhum produto previsto.</Text>}
          {produtos.map((p) => (
            <View key={p.id} style={styles.prod}>
              <View style={styles.prodInfo}>
                <Text style={styles.prodName}>{p.produto}</Text>
                <Text style={styles.prodMeta}>Recomendado: {p.recomendada} {p.unidade}</Text>
              </View>
              {readOnly ? (
                <Text style={styles.prodVal}>{p.utilizada == null ? '—' : `${p.utilizada} ${p.unidade}`}</Text>
              ) : (
                <TextInput
                  value={consumo[p.id] ?? ''}
                  onChangeText={(v) => setConsumo((s) => ({ ...s, [p.id]: v }))}
                  keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.neutral400}
                  style={styles.input}
                />
              )}
            </View>
          ))}
          {!readOnly && produtos.length > 0 && <Button label="Salvar consumo" onPress={salvarTodoConsumo} style={{ marginTop: 4 }} />}
        </Section>

        {/* Assinatura e fotos */}
        <Section title="Comprovação">
          <View style={styles.compRow}>
            <MaterialIcons name={os.assinaturaUrl ? 'check-circle' : 'draw'} size={18} color={os.assinaturaUrl ? colors.primary : colors.neutral400} />
            <Text style={styles.compText}>{os.assinaturaUrl ? 'Assinatura do cliente coletada' : 'Assinatura pendente'}</Text>
          </View>
          {!readOnly && !os.assinaturaUrl && (
            <Button
              label="Coletar assinatura do cliente"
              variant="outlineGreen"
              onPress={() => setAssinando(true)}
            />
          )}
          {!readOnly && (
            <Pressable style={styles.photoBtn} onPress={anexarFoto}>
              <MaterialIcons name="photo-camera" size={18} color={colors.primary} />
              <Text style={styles.photoText}>Anexar foto da execução</Text>
            </Pressable>
          )}
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

        {/* Finalizar */}
        {!readOnly && os.status !== 'executada' && (
          <Button label="Marcar como executada" onPress={confirmarFinalizar} style={{ marginTop: 4, opacity: busy ? 0.7 : 1 }} />
        )}
        {os.status === 'executada' && (
          <View style={styles.doneBanner}>
            <MaterialIcons name="verified" size={16} color={colors.primary} />
            <Text style={styles.doneText}>Executada — aguardando conclusão pelo back office.</Text>
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      <AssinaturaSheet
        visible={assinando}
        onClose={() => setAssinando(false)}
        onConfirm={async (base64) => {
          await confirmarAssinatura(id, base64);
          load();
        }}
      />
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
function CheckState({ label, time, done }: { label: string; time: string; done: boolean }) {
  return (
    <View style={[styles.check, done && styles.checkDone]}>
      <Text style={styles.checkLabel}>{label}</Text>
      <Text style={[styles.checkTime, done && { color: colors.primary }]}>{done ? time : '—'}</Text>
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
  checkRow: { flexDirection: 'row', gap: 12 },
  check: { flex: 1, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 3 },
  checkDone: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  checkLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.neutral500, textTransform: 'uppercase' },
  checkTime: { fontFamily: fonts.semibold, fontSize: 16, color: colors.neutral400 },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral400 },
  empty: { fontFamily: fonts.regular, fontSize: 13, color: colors.neutral400 },
  prod: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prodInfo: { flex: 1 },
  prodName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  prodMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral500 },
  prodVal: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  input: { width: 84, height: 44, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bg, paddingHorizontal: 12, fontFamily: fonts.medium, fontSize: 15, color: colors.ink, textAlign: 'center' },
  compRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compText: { fontFamily: fonts.medium, fontSize: 14, color: colors.neutral800 },
  photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary },
  photoText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
  cronoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cronoDate: { fontFamily: fonts.medium, fontSize: 14, color: colors.neutral800 },
  doneBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primaryTint, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 12 },
  doneText: { fontFamily: fonts.medium, fontSize: 13, color: colors.primary },
});
