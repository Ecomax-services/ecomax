import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fonts } from '@/theme';
import { tons } from '@/screens/execucao/componentes';
import { PILULA, hojeEmBrasilia, situacaoNaAgenda } from '@/lib/agenda/regras';
import { passaNaBusca, passaNoPeriodo, periodos, type Periodo } from '@/lib/historico/regras';
import { listConcluidas, listOsDeHoje, type OsConcluida, type OsDoDia } from '@/lib/historico/dados';
import { brDate } from '@/lib/operacional';
import type { OsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<OsStackParamList, 'OsList'>;
type Segmento = 'executar' | 'concluidas';

/**
 * Aba OS — protótipo aprovado ("Revisão tela de Monitoramento", 28/09).
 *
 * "A executar": as OS de hoje, que abrem a execução. "Concluídas": o
 * histórico, com busca por cliente ou código e filtro de período, que abre o
 * "Detalhes do serviço". O protótipo não tem módulo de Histórico separado — é
 * este segmento.
 */
export function OsListScreen({ navigation }: Props) {
  const hoje = useMemo(() => hojeEmBrasilia(), []);
  const [segmento, setSegmento] = useState<Segmento>('executar');
  const [deHoje, setDeHoje] = useState<OsDoDia[]>([]);
  const [concluidas, setConcluidas] = useState<OsConcluida[]>([]);
  const [busca, setBusca] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>('todos');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((isRefresh?: boolean) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    Promise.all([listOsDeHoje(), listConcluidas()])
      .then(([h, c]) => { setDeHoje(h); setConcluidas(c); })
      .catch((e) => setError((e as Error).message))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtradas = concluidas.filter((o) => passaNaBusca(o, busca) && passaNoPeriodo(o.data, periodo, hoje));

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <ScreenHeader title="Ordens de Serviço" />
      <ScrollView
        contentContainerStyle={s.conteudo}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        <View style={s.segmento}>
          {([['executar', 'A executar'], ['concluidas', 'Concluídas']] as const).map(([chave, rotulo]) => {
            const on = segmento === chave;
            return (
              <Pressable key={chave} onPress={() => setSegmento(chave)} style={[s.segBtn, on && s.segBtnOn]}>
                <Text style={[s.segTexto, { fontFamily: on ? fonts.bold : fonts.medium, color: on ? '#1d6b25' : colors.neutral500 }]}>{rotulo}</Text>
              </Pressable>
            );
          })}
        </View>

        {error ? <Text style={s.erro}>{error}</Text> : null}

        {loading && !refreshing ? (
          <View style={s.carregando}><ActivityIndicator color={colors.primary} /></View>
        ) : segmento === 'executar' ? (
          <View>
            <Text style={s.resumo}>{deHoje.length} {deHoje.length === 1 ? 'OS programada para hoje' : 'OS programadas para hoje'}</Text>
            {deHoje.length === 0 ? (
              <Vazio icone="event-available" texto="Nenhuma OS programada para hoje." />
            ) : (
              <View style={{ gap: 10 }}>
                {deHoje.map((o) => {
                  const p = PILULA[situacaoNaAgenda(o.status)];
                  return (
                    <Pressable key={o.id} onPress={() => navigation.navigate('Execucao', { osId: o.id })} style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.99 }] }]}>
                      <View style={s.cardTopo}>
                        <View style={s.horaLinha}>
                          <MaterialIcons name="schedule" size={18} color={colors.primary} />
                          <Text style={s.hora}>{o.hora || '—'}</Text>
                        </View>
                        <Text style={[s.pilula, { backgroundColor: p.bg, color: p.fg }]}>{p.rotulo}</Text>
                      </View>
                      <Text style={s.cliente}>{o.cliente}</Text>
                      <Text style={s.endereco}>{o.endereco}</Text>
                      <View style={s.rodape}>
                        <View style={s.rodapeItem}>
                          <MaterialIcons name="pest-control" size={17} color={colors.neutral500} />
                          <Text style={s.rodapeTipo} numberOfLines={1}>{o.tipos}</Text>
                        </View>
                        {o.duracao ? (
                          <View style={s.rodapeItem}>
                            <MaterialIcons name="timer" size={17} color={colors.neutral500} />
                            <Text style={s.rodapeDuracao}>{o.duracao}</Text>
                          </View>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          <View>
            <View style={s.busca}>
              <MaterialIcons name="search" size={20} color={colors.neutral400} />
              <TextInput
                value={busca} onChangeText={setBusca} placeholder="Buscar por cliente ou código"
                placeholderTextColor={colors.neutral400} style={s.buscaInput} returnKeyType="search" autoCorrect={false}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginBottom: 14 }}>
              {periodos(hoje).map((p) => {
                const on = periodo === p.chave;
                return (
                  <Pressable key={p.chave} onPress={() => setPeriodo(p.chave)} style={[s.chip, on ? s.chipOn : s.chipOff]}>
                    <Text style={[s.chipTexto, { color: on ? '#1d6b25' : colors.neutral500 }]}>{p.rotulo}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {filtradas.length === 0 ? (
              <Vazio icone="history" texto="Nenhuma OS concluída no período." />
            ) : (
              <View style={{ gap: 10 }}>
                {filtradas.map((o) => (
                  <Pressable key={o.id} onPress={() => navigation.navigate('OsConcluida', { id: o.id, codigo: o.codigo })} style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.99 }] }]}>
                    <View style={s.cardTopo}>
                      <Text style={s.codigo}>{o.codigo}</Text>
                      <Text style={[s.pilula, { backgroundColor: PILULA.concluida.bg, color: PILULA.concluida.fg }]}>{PILULA.concluida.rotulo}</Text>
                    </View>
                    <Text style={s.cliente}>{o.cliente}</Text>
                    <View style={s.linhaConcluida}>
                      <Text style={s.tipoConcluida} numberOfLines={1}>{o.tipos}</Text>
                      <Text style={s.dataConcluida}>{brDate(o.data)}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Vazio({ icone, texto }: { icone: 'event-available' | 'history'; texto: string }) {
  return (
    <View style={s.vazio}>
      <MaterialIcons name={icone} size={34} color={tons.iconeApagado} />
      <Text style={s.vazioTexto}>{texto}</Text>
    </View>
  );
}

const sombra = {
  shadowColor: '#0b1b3a', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 6 }, shadowRadius: 18, elevation: 1,
} as const;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: tons.fundo },
  conteudo: { padding: 16, paddingBottom: 28 },
  carregando: { paddingVertical: 48, alignItems: 'center' },
  erro: { color: colors.danger, fontFamily: fonts.medium, fontSize: 13, textAlign: 'center', marginBottom: 12 },

  segmento: { flexDirection: 'row', gap: 4, backgroundColor: tons.botaoInativoBg, borderRadius: 12, padding: 4, marginBottom: 16 },
  segBtn: { flex: 1, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segBtnOn: {
    backgroundColor: colors.white,
    shadowColor: '#0b1b3a', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1,
  },
  segTexto: { fontSize: 14 },

  resumo: { fontFamily: fonts.regular, fontSize: 13, color: colors.neutral500, marginBottom: 12 },
  card: {
    backgroundColor: colors.white, borderWidth: 0.5, borderColor: tons.bordaCartao, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16, ...sombra,
  },
  cardTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  horaLinha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hora: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, fontVariant: ['tabular-nums'] },
  pilula: { fontFamily: fonts.bold, fontSize: 11.5, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 7, overflow: 'hidden' },
  cliente: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  endereco: { fontFamily: fonts.regular, fontSize: 13, color: colors.neutral400, marginTop: 2 },
  rodape: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: tons.linha },
  rodapeItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  rodapeTipo: { fontFamily: fonts.regular, fontSize: 13, color: tons.texto2, flexShrink: 1 },
  rodapeDuracao: { fontFamily: fonts.regular, fontSize: 13, color: colors.neutral500 },

  busca: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 14, marginBottom: 10,
    backgroundColor: colors.white, borderWidth: 1, borderColor: tons.etapaPendente, borderRadius: 12,
  },
  buscaInput: { flex: 1, minWidth: 0, fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  chipOn: { borderColor: colors.primary, backgroundColor: tons.okBg },
  chipOff: { borderColor: colors.border, backgroundColor: colors.white },
  chipTexto: { fontFamily: fonts.semibold, fontSize: 13 },

  codigo: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.neutral500, fontVariant: ['tabular-nums'] },
  linhaConcluida: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  tipoConcluida: { fontFamily: fonts.regular, fontSize: 13, color: tons.texto2, flexShrink: 1 },
  dataConcluida: { fontFamily: fonts.regular, fontSize: 13, color: colors.neutral400, fontVariant: ['tabular-nums'] },

  vazio: { backgroundColor: colors.white, borderWidth: 0.5, borderColor: tons.bordaCartao, borderRadius: 16, paddingVertical: 40, paddingHorizontal: 22, alignItems: 'center' },
  vazioTexto: { fontFamily: fonts.regular, fontSize: 14, color: colors.neutral500, marginTop: 10, textAlign: 'center' },
});
