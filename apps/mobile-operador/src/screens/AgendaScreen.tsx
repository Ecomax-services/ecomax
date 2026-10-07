import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AvatarOperador } from '@/components/AvatarOperador';
import { colors, fonts } from '@/theme';
import { tons } from '@/screens/execucao/componentes';
import {
  CABECALHO_CALENDARIO, DIAS_DA_SEMANA, PILULA, casasDoMes, corDoOperador, ddmm, destinoDoItem, diaDaSemana,
  hojeEmBrasilia, iniciais, inicioDaSemana, limitesDoMes, mesDe, primeiroNome, rotuloDaSemana, rotuloDoDia,
  rotuloDoMes, situacaoNaAgenda, somarDias, somarMeses, type Mes,
} from '@/lib/agenda/regras';
import { listAgendaDaEquipe, listMinhaAgenda, minhaEquipe, type ItemAgenda, type MembroEquipe } from '@/lib/agenda/dados';
import type { MainTabParamList } from '@/navigation/types';

/**
 * Agenda — protótipo aprovado ("Revisão tela de Monitoramento", 28/09).
 *
 * Lista da semana (segunda a domingo) ou calendário do mês. Quem coordena
 * outros técnicos (`funcionarios.gestor_id`) vê também o botão "Ver agenda da
 * equipe": a agenda deles, somente leitura, com filtro e agrupamento por
 * operador.
 */

type Vista = 'lista' | 'cal';

/** Operador como a tela desenha: nome curto no chip, cor e iniciais. */
interface Operador {
  id: string;
  nome: string;
  chip: string;
  cor: string;
  fundo: string;
  iniciais: string;
}

function operadores(membros: MembroEquipe[]): Operador[] {
  return membros.map((m, i) => {
    const { cor, chip } = corDoOperador(i);
    return {
      id: m.funcionarioId,
      nome: m.souEu ? 'Você' : m.nome,
      chip: m.souEu ? 'Você' : primeiroNome(m.nome),
      cor, fundo: chip,
      iniciais: m.souEu ? 'VC' : iniciais(m.nome),
    };
  });
}

export function AgendaScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const hoje = useMemo(() => hojeEmBrasilia(), []);

  const [vista, setVista] = useState<Vista>('lista');
  const [semana, setSemana] = useState(() => inicioDaSemana(hoje));
  const [mes, setMes] = useState<Mes>(() => mesDe(hoje));
  const [diaSel, setDiaSel] = useState<string | null>(null);

  const [membros, setMembros] = useState<MembroEquipe[]>([]);
  const [equipe, setEquipe] = useState(false);
  const [filtro, setFiltro] = useState<string>('todos');
  const [agrupar, setAgrupar] = useState(false);

  const [itens, setItens] = useState<ItemAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ops = useMemo(() => operadores(membros), [membros]);
  const eu = ops.find((_, i) => membros[i]?.souEu);
  const gestor = membros.length > 1;
  const emEquipe = equipe && gestor;

  const { de, ate } = vista === 'lista' ? { de: semana, ate: somarDias(semana, 6) } : limitesDoMes(mes);

  // Só a resposta do último pedido vale: trocar de semana rápido não pode
  // deixar a semana anterior na tela.
  const pedido = useRef(0);
  const carregar = useCallback((isRefresh?: boolean) => {
    const n = ++pedido.current;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    (emEquipe ? listAgendaDaEquipe(de, ate) : listMinhaAgenda(de, ate))
      .then((r) => { if (n === pedido.current) setItens(r); })
      .catch((e) => { if (n === pedido.current) setError((e as Error).message); })
      .finally(() => { if (n === pedido.current) { setLoading(false); setRefreshing(false); } });
  }, [emEquipe, de, ate]);

  useEffect(() => { carregar(); }, [carregar]);

  // A equipe é relida a cada vez que a aba ganha foco: o escritório pode ter
  // mudado o gestor no cadastro. Erro aqui só esconde o botão da equipe.
  useFocusEffect(useCallback(() => {
    minhaEquipe().then(setMembros).catch(() => setMembros([]));
  }, []));

  const opDe = (item: ItemAgenda): Operador | undefined => {
    if (!emEquipe) return eu;
    if (eu && item.funcionarios.includes(eu.id)) return eu;
    return ops.find((o) => item.funcionarios.includes(o.id));
  };
  const minha = (item: ItemAgenda) => !emEquipe || (!!eu && item.funcionarios.includes(eu.id));
  const passa = (item: ItemAgenda) => !emEquipe || filtro === 'todos' || item.funcionarios.includes(filtro);
  const visiveis = itens.filter(passa);

  const abrir = (item: ItemAgenda) => {
    const destino = destinoDoItem({ status: item.status, minha: minha(item), cronogramaId: item.cronogramaId });
    if (destino === 'execucao') {
      navigation.navigate('OS', { screen: 'Execucao', params: { osId: item.osId }, initial: false });
    } else if (destino === 'detalhe') {
      navigation.navigate('OS', { screen: 'OsDetail', params: { id: item.osId, codigo: item.codigo }, initial: false });
    } else {
      const nomes = ops.filter((o) => item.funcionarios.includes(o.id)).map((o) => (o === eu ? 'Você' : o.nome));
      const op = opDe(item);
      navigation.navigate('OS', {
        screen: 'OsEquipe',
        params: { item, operador: { nome: op?.nome ?? '—', iniciais: op?.iniciais ?? '?', cor: op?.cor ?? colors.primary, fundo: op?.fundo ?? tons.okBg }, responsaveis: nomes },
        initial: false,
      });
    }
  };

  const alternarEquipe = () => {
    setEquipe((v) => !v);
    setFiltro('todos');
    setAgrupar(false);
  };

  const trocarMes = (n: number) => { setMes((m) => somarMeses(m, n)); setDiaSel(null); };

  /** Card do item. `linha2` muda com o modo; `quem` mostra o avatar. */
  const card = (item: ItemAgenda, linha2: string, quem: boolean) => {
    const pilula = PILULA[situacaoNaAgenda(item.status)];
    const op = opDe(item);
    return (
      <Pressable key={item.chave} onPress={() => abrir(item)} style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.99 }] }]}>
        <Text style={s.hora}>{item.hora || '—'}</Text>
        {quem && op ? <AvatarOperador op={op} tamanho={26} /> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.cliente} numberOfLines={1}>{item.cliente}</Text>
          <Text style={s.linha2} numberOfLines={1}>{linha2}</Text>
        </View>
        <Text style={[s.pilula, { backgroundColor: pilula.bg, color: pilula.fg }]}>{pilula.rotulo}</Text>
      </Pressable>
    );
  };

  const linhaPadrao = (item: ItemAgenda) => (emEquipe ? `${item.tipos} · ${opDe(item)?.nome ?? '—'}` : item.tipos);

  /** Agrupado por operador: um bloco por técnico da equipe que tem OS. */
  const grupos = (lista: ItemAgenda[], comData: boolean) => ops
    .filter((o) => filtro === 'todos' || o.id === filtro)
    .map((o) => ({ o, its: lista.filter((i) => i.funcionarios.includes(o.id)) }))
    .filter((g) => g.its.length > 0)
    .map(({ o, its }) => (
      <View key={o.id}>
        <View style={s.grupoTopo}>
          <AvatarOperador op={o} tamanho={30} />
          <Text style={s.grupoNome} numberOfLines={1}>{o.nome}</Text>
          <Text style={[s.pilula, { backgroundColor: o.fundo, color: o.cor }]}>{its.length} OS</Text>
        </View>
        <View style={{ gap: 8 }}>
          {its.map((i) => card(i, comData ? `${i.tipos} · ${DIAS_DA_SEMANA[diaDaSemana(i.data)]} ${ddmm(i.data)}` : i.tipos, false))}
        </View>
      </View>
    ));

  const agrupado = emEquipe && agrupar;

  // --- Lista da semana --------------------------------------------------
  const dias = Array.from({ length: 7 }, (_, k) => somarDias(semana, k))
    .map((d) => ({ d, its: visiveis.filter((i) => i.data === d) }))
    .filter((x) => x.its.length > 0);

  const lista = (
    <View>
      <Navegador rotulo={rotuloDaSemana(semana)} anterior={() => setSemana(somarDias(semana, -7))} seguinte={() => setSemana(somarDias(semana, 7))} />
      {visiveis.length === 0 ? (
        <Vazio icone="event-busy" texto="Nenhuma OS nesta semana." />
      ) : agrupado ? (
        <View style={{ gap: 16 }}>{grupos(visiveis, true)}</View>
      ) : (
        <View style={{ gap: 14 }}>
          {dias.map(({ d, its }) => (
            <View key={d}>
              <View style={s.diaTopo}>
                <Text style={s.diaNome}>{DIAS_DA_SEMANA[diaDaSemana(d)]}</Text>
                <Text style={s.diaData}>{ddmm(d)}</Text>
              </View>
              <View style={{ gap: 8 }}>{its.map((i) => card(i, linhaPadrao(i), emEquipe))}</View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  // --- Calendário do mês -----------------------------------------------
  const casas = casasDoMes(mes);
  while (casas.length % 7) casas.push(null);
  const semanasDoMes = Array.from({ length: casas.length / 7 }, (_, k) => casas.slice(k * 7, k * 7 + 7));
  const sel = diaSel && mesDe(diaSel) === mes ? diaSel : null;
  const doDia = sel ? visiveis.filter((i) => i.data === sel) : [];

  const calendario = (
    <View>
      <Navegador rotulo={rotuloDoMes(mes)} anterior={() => trocarMes(-1)} seguinte={() => trocarMes(1)} margem={12} />
      <View style={s.calCartao}>
        <View style={[s.calLinha, { marginBottom: 6 }]}>
          {CABECALHO_CALENDARIO.map((l, k) => <Text key={k} style={s.calCabecalho}>{l}</Text>)}
        </View>
        <View style={{ gap: 5 }}>
          {semanasDoMes.map((linha, k) => (
            <View key={k} style={s.calLinha}>
              {linha.map((d, j) => {
                if (!d) return <View key={j} style={s.calCasaVazia} />;
                const its = visiveis.filter((i) => i.data === d);
                const on = d === sel;
                const ehHoje = d === hoje;
                return (
                  <Pressable
                    key={d}
                    disabled={its.length === 0}
                    onPress={() => setDiaSel(d)}
                    style={[
                      s.calCasa,
                      on ? s.calCasaSel : its.length ? s.calCasaCom : s.calCasaSem,
                      ehHoje && !on && { borderWidth: 1, borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[s.calNum, { fontFamily: its.length ? fonts.bold : fonts.medium, color: on ? colors.white : its.length ? colors.ink : colors.neutral300 }]}>
                      {Number(d.slice(8, 10))}
                    </Text>
                    <View style={s.calPontos}>
                      {its.slice(0, 4).map((i) => (
                        <View key={i.chave} style={[s.calPonto, { backgroundColor: on ? colors.white : opDe(i)?.cor ?? colors.primary }]} />
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {doDia.length > 0 ? (
        <View style={{ marginTop: 16 }}>
          <View style={s.diaTopo}>
            <Text style={s.diaNome}>{rotuloDoDia(sel!)}</Text>
            <Text style={s.diaData}>{doDia.length} OS</Text>
          </View>
          {agrupado
            ? <View style={{ gap: 16 }}>{grupos(doDia, false)}</View>
            : <View style={{ gap: 8 }}>{doDia.map((i) => card(i, linhaPadrao(i), emEquipe))}</View>}
        </View>
      ) : visiveis.length > 0 ? (
        <Vazio icone="touch-app" texto={sel ? `Nenhuma OS em ${ddmm(sel)}.` : 'Toque num dia marcado para ver as OS.'} compacto />
      ) : (
        <Vazio icone="event-busy" texto={`Nenhuma OS em ${rotuloDoMes(mes).toLowerCase()}.`} margem />
      )}
    </View>
  );

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <ScreenHeader title="Agenda" />
      <ScrollView
        contentContainerStyle={s.conteudo}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => carregar(true)} tintColor={colors.primary} />}
      >
        <View style={s.segmento}>
          <BotaoSegmento icone="view-agenda" rotulo="Lista" on={vista === 'lista'} onPress={() => setVista('lista')} />
          <BotaoSegmento icone="calendar-month" rotulo="Calendário" on={vista === 'cal'} onPress={() => setVista('cal')} />
        </View>

        {emEquipe ? (
          <View style={s.equipe}>
            <View style={s.equipeTopo}>
              <MaterialIcons name="groups" size={19} color={colors.primary} />
              <Text style={s.equipeTexto}>Agenda da equipe, somente leitura.</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {[{ id: 'todos', chip: 'Todos', cor: colors.primary, fundo: '#e8f4e9' }, ...ops].map((o) => {
                const on = filtro === o.id;
                return (
                  <Pressable key={o.id} onPress={() => setFiltro(o.id)} style={[s.chip, on ? { backgroundColor: o.fundo, borderColor: o.cor, borderWidth: 1 } : s.chipOff]}>
                    <View style={[s.chipPonto, { backgroundColor: o.cor }]} />
                    <Text style={[s.chipTexto, { color: on ? o.cor : colors.neutral500 }]}>{o.chip}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable onPress={() => setAgrupar((v) => !v)} style={[s.agrupar, agrupar ? s.agruparOn : s.agruparOff]}>
              <MaterialIcons name={agrupar ? 'check-box' : 'check-box-outline-blank'} size={18} color={agrupar ? colors.primary : '#3f6b42'} />
              <Text style={[s.agruparTexto, { color: agrupar ? colors.primary : '#3f6b42' }]}>{agrupar ? 'Agrupado por operador' : 'Agrupar por operador'}</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={s.erro}>{error}</Text> : null}
        {loading && !refreshing ? (
          <View style={s.carregando}><ActivityIndicator color={colors.primary} /></View>
        ) : vista === 'lista' ? lista : calendario}

        {gestor ? (
          <Pressable onPress={alternarEquipe} style={({ pressed }) => [s.botaoEquipe, pressed && { transform: [{ scale: 0.99 }] }]}>
            <MaterialIcons name="groups" size={19} color={colors.primary} />
            <Text style={s.botaoEquipeTexto}>{emEquipe ? 'Ver só a minha agenda' : 'Ver agenda da equipe'}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function BotaoSegmento({ icone, rotulo, on, onPress }: { icone: 'view-agenda' | 'calendar-month'; rotulo: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.segBtn, on && s.segBtnOn]}>
      <MaterialIcons name={icone} size={17} color={on ? colors.primary : colors.neutral500} />
      <Text style={[s.segTexto, { color: on ? colors.primary : colors.neutral500 }]}>{rotulo}</Text>
    </Pressable>
  );
}

function Navegador({ rotulo, anterior, seguinte, margem = 14 }: { rotulo: string; anterior: () => void; seguinte: () => void; margem?: number }) {
  return (
    <View style={[s.nav, { marginBottom: margem }]}>
      <Pressable onPress={anterior} hitSlop={6} style={s.navBtn}><MaterialIcons name="chevron-left" size={20} color={tons.texto2} /></Pressable>
      <Text style={s.navRotulo}>{rotulo}</Text>
      <Pressable onPress={seguinte} hitSlop={6} style={s.navBtn}><MaterialIcons name="chevron-right" size={20} color={tons.texto2} /></Pressable>
    </View>
  );
}

function Vazio({ icone, texto, compacto, margem }: { icone: 'event-busy' | 'touch-app'; texto: string; compacto?: boolean; margem?: boolean }) {
  return (
    <View style={[s.vazio, compacto && { marginTop: 14, paddingVertical: 26 }, margem && { marginTop: 14, paddingVertical: 34 }]}>
      <MaterialIcons name={icone} size={compacto ? 30 : 34} color={tons.iconeApagado} />
      <Text style={[s.vazioTexto, compacto && { fontSize: 13.5, marginTop: 8 }]}>{texto}</Text>
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

  segmento: { flexDirection: 'row', gap: 4, backgroundColor: '#eceeec', borderRadius: 12, padding: 3, marginBottom: 12 },
  segBtn: { flex: 1, height: 36, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  segBtnOn: {
    backgroundColor: colors.white,
    shadowColor: '#0b1b3a', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1,
  },
  segTexto: { fontFamily: fonts.bold, fontSize: 13.5 },

  equipe: { gap: 9, backgroundColor: tons.okBg, borderWidth: 0.5, borderColor: '#dcefdc', borderRadius: 14, paddingVertical: 11, paddingHorizontal: 12, marginBottom: 14 },
  equipeTopo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  equipeTexto: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: tons.okTexto },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 999 },
  chipOff: { backgroundColor: colors.white, borderWidth: 0.5, borderColor: '#dbe3db' },
  chipPonto: { width: 7, height: 7, borderRadius: 4 },
  chipTexto: { fontFamily: fonts.bold, fontSize: 12.5 },
  agrupar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 36, borderRadius: 10, backgroundColor: colors.white },
  agruparOn: { borderWidth: 1, borderColor: colors.primary },
  agruparOff: { borderWidth: 0.5, borderColor: '#cfe4cf' },
  agruparTexto: { fontFamily: fonts.bold, fontSize: 13 },

  nav: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.white, borderWidth: 0.5, borderColor: tons.bordaCartao, borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 12, ...sombra,
  },
  navBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: tons.fundo, alignItems: 'center', justifyContent: 'center' },
  navRotulo: { flex: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 14, color: colors.ink },

  diaTopo: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 },
  diaNome: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.ink },
  diaData: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.neutral400 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: colors.white, borderWidth: 0.5, borderColor: tons.bordaCartao, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 13, ...sombra,
  },
  hora: { width: 44, fontFamily: fonts.bold, fontSize: 13.5, color: colors.primary, fontVariant: ['tabular-nums'] },
  cliente: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.ink },
  linha2: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.neutral400, marginTop: 2 },
  pilula: { fontFamily: fonts.bold, fontSize: 11.5, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 7, overflow: 'hidden' },

  grupoTopo: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  grupoNome: { flex: 1, minWidth: 0, fontFamily: fonts.bold, fontSize: 13.5, color: colors.ink },

  vazio: { backgroundColor: colors.white, borderWidth: 0.5, borderColor: tons.bordaCartao, borderRadius: 16, paddingVertical: 40, paddingHorizontal: 22, alignItems: 'center' },
  vazioTexto: { fontFamily: fonts.regular, fontSize: 14, color: colors.neutral500, marginTop: 10, textAlign: 'center' },

  calCartao: { backgroundColor: colors.white, borderWidth: 0.5, borderColor: tons.bordaCartao, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 11, ...sombra },
  calLinha: { flexDirection: 'row', gap: 5 },
  calCabecalho: { flex: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 10.5, letterSpacing: 0.5, color: colors.neutral400 },
  calCasaVazia: { flex: 1, aspectRatio: 1 },
  calCasa: { flex: 1, aspectRatio: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 3 },
  calCasaSel: { backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primary },
  calCasaCom: { backgroundColor: '#f2fbf2', borderWidth: 0.5, borderColor: '#dcefdc' },
  calCasaSem: { backgroundColor: colors.white, borderWidth: 0.5, borderColor: '#eceeec' },
  calNum: { fontSize: 13, fontVariant: ['tabular-nums'] },
  calPontos: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, height: 5 },
  calPonto: { width: 5, height: 5, borderRadius: 3 },

  botaoEquipe: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, marginTop: 16, borderWidth: 1, borderColor: '#bfe3c2', borderRadius: 12, backgroundColor: '#f2fbf2',
  },
  botaoEquipeTexto: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.primary },
});
