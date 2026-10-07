import { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fonts } from '@/theme';
import { tons } from '@/screens/execucao/componentes';
import {
  assinarNaoLidas, contarNaoLidas, excluirNotificacao, listNotificacoes, marcarLida, marcarTodasLidas,
  type FiltroNotif, type NotifItem,
} from '@/lib/notificacoes/dados';
import { COR_ETIQUETA } from '@/lib/notificacoes/regras';
import { getOs } from '@/lib/operacional';
import type { MainTabParamList } from '@/navigation/types';

const ABAS: { chave: FiltroNotif; rotulo: string }[] = [
  { chave: 'todas', rotulo: 'Todas' },
  { chave: 'nao-lidas', rotulo: 'Não lidas' },
  { chave: 'lidas', rotulo: 'Lidas' },
];

/**
 * Notificações — protótipo aprovado ("Revisão tela de Monitoramento", 28/09).
 *
 * Abas Todas / Não lidas / Lidas, "Marcar como lidas" com o contador, menu de
 * cada notificação (marcar como lida, excluir), "Ver detalhes" que leva ao
 * assunto e "Carregar mais", paginado no servidor.
 */
export function NotificationsScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const [aba, setAba] = useState<FiltroNotif>('todas');
  const [itens, setItens] = useState<NotifItem[]>([]);
  const [pagina, setPagina] = useState(0);
  const [temMais, setTemMais] = useState(false);
  const [naoLidas, setNaoLidas] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [maisCarregando, setMaisCarregando] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  // Só a resposta do último pedido vale: trocar de aba rápido não pode deixar
  // a lista da aba anterior na tela.
  const pedido = useRef(0);
  const carregar = useCallback((filtro: FiltroNotif, refresh?: boolean) => {
    const n = ++pedido.current;
    if (refresh) setRefreshing(true); else setCarregando(true);
    setErro(null);
    setMenu(null);
    listNotificacoes(filtro, 0)
      .then((r) => { if (n === pedido.current) { setItens(r.itens); setTemMais(r.temMais); setPagina(0); } })
      .catch((e) => { if (n === pedido.current) setErro((e as Error).message); })
      .finally(() => { if (n === pedido.current) { setCarregando(false); setRefreshing(false); } });
    contarNaoLidas().catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => {
    carregar(aba);
    return assinarNaoLidas(setNaoLidas);
  }, [aba, carregar]));

  const carregarMais = async () => {
    setMaisCarregando(true);
    try {
      const r = await listNotificacoes(aba, pagina + 1);
      // Uma notificação nova no topo empurra a lista; sem filtrar, a última da
      // página anterior apareceria de novo.
      setItens((atual) => [...atual, ...r.itens.filter((x) => !atual.some((y) => y.id === x.id))]);
      setTemMais(r.temMais);
      setPagina(pagina + 1);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setMaisCarregando(false);
    }
  };

  /** Tira da lista o que deixou de pertencer à aba (lida na aba "Não lidas"). */
  const aplicarLida = (ids: string[]) => {
    setItens((atual) => (aba === 'nao-lidas'
      ? atual.filter((n) => !ids.includes(n.id))
      : atual.map((n) => (ids.includes(n.id) ? { ...n, lida: true } : n))));
  };

  const marcar = async (n: NotifItem) => {
    setMenu(null);
    try { await marcarLida(n.id); aplicarLida([n.id]); } catch (e) { Alert.alert('Notificações', (e as Error).message); }
  };

  const marcarTodas = async () => {
    try {
      await marcarTodasLidas();
      if (aba === 'nao-lidas') setItens([]); else setItens((atual) => atual.map((n) => ({ ...n, lida: true })));
    } catch (e) {
      Alert.alert('Notificações', (e as Error).message);
    }
  };

  const excluir = async (n: NotifItem) => {
    setMenu(null);
    try { await excluirNotificacao(n.id); setItens((atual) => atual.filter((x) => x.id !== n.id)); } catch (e) { Alert.alert('Notificações', (e as Error).message); }
  };

  const verDetalhes = async (n: NotifItem) => {
    setMenu(null);
    if (!n.lida) marcar(n);
    const d = n.destino;
    if (!d) return;
    if (d.tipo === 'agenda') return navigation.navigate('Agenda');
    if (d.tipo === 'perfil') return navigation.navigate('Config', { screen: 'Perfil', initial: false });
    try {
      // Lê a OS antes de navegar: ela pode ter saído do escopo do técnico
      // (desvinculado, ou virou rascunho), e aí a tela abriria vazia.
      const os = await getOs(d.osId);
      navigation.navigate('OS', { screen: 'OsDetail', params: { id: os.id, codigo: os.codigo }, initial: false });
    } catch {
      Alert.alert('Notificações', 'Esta OS não está mais disponível para você.');
    }
  };

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <ScreenHeader
        title="Notificações"
        right={naoLidas > 0 ? (
          <Pressable onPress={marcarTodas} hitSlop={8} style={s.marcarTodas}>
            <Text style={s.marcarTodasTexto}>Marcar como lidas</Text>
            <View style={s.contador}><Text style={s.contadorTexto}>{naoLidas > 99 ? '99+' : naoLidas}</Text></View>
          </Pressable>
        ) : undefined}
      />
      <View style={s.abas}>
        {ABAS.map((a) => {
          const on = aba === a.chave;
          return (
            <Pressable key={a.chave} onPress={() => setAba(a.chave)} style={[s.aba, on && s.abaOn]}>
              <Text style={[s.abaTexto, { fontFamily: on ? fonts.bold : fonts.medium, color: on ? colors.primary : colors.neutral400 }]}>{a.rotulo}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={s.lista}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => carregar(aba, true)} tintColor={colors.primary} />}
      >
        {erro ? <Text style={s.erro}>{erro}</Text> : null}
        {carregando && !refreshing ? (
          [1, 2, 3].map((k) => (
            <View key={k} style={[s.card, s.cardLida]}>
              <View style={[s.esqueleto, { width: 64, height: 18, marginBottom: 10 }]} />
              <View style={[s.esqueleto, { width: '70%', height: 14, marginBottom: 8 }]} />
              <View style={[s.esqueleto, { width: '90%', height: 12, backgroundColor: '#f3f5f3' }]} />
            </View>
          ))
        ) : itens.length === 0 ? (
          <View style={s.vazio}>
            <MaterialIcons name="notifications-none" size={34} color={tons.iconeApagado} />
            <Text style={s.vazioTexto}>Você não tem notificações.</Text>
          </View>
        ) : (
          <>
            {itens.map((n) => {
              const cor = COR_ETIQUETA[n.etiqueta];
              const aberto = menu === n.id;
              return (
                <View key={n.id} style={[s.card, n.lida ? s.cardLida : s.cardNaoLida, aberto && { zIndex: 20, elevation: 6 }]}>
                  <View style={s.cardTopo}>
                    <View style={s.cardTopoEsq}>
                      <Text style={[s.etiqueta, { backgroundColor: cor.bg, color: cor.fg }]}>{n.etiqueta}</Text>
                      <Text style={s.quando} numberOfLines={1}>{n.quando}</Text>
                    </View>
                    <Pressable onPress={() => setMenu(aberto ? null : n.id)} hitSlop={8} style={s.menuBtn}>
                      <MaterialIcons name="more-vert" size={19} color={colors.neutral400} />
                    </Pressable>
                    {aberto ? (
                      <View style={s.menu}>
                        {!n.lida ? (
                          <Pressable onPress={() => marcar(n)} style={({ pressed }) => [s.menuItem, pressed && { backgroundColor: tons.fundo }]}>
                            <MaterialIcons name="done-all" size={18} color={colors.neutral500} />
                            <Text style={s.menuTexto}>Marcar como lida</Text>
                          </Pressable>
                        ) : null}
                        <Pressable onPress={() => excluir(n)} style={({ pressed }) => [s.menuItem, !n.lida && s.menuItemBorda, pressed && { backgroundColor: tons.fundo }]}>
                          <MaterialIcons name="delete" size={18} color={colors.danger} />
                          <Text style={[s.menuTexto, { color: colors.danger }]}>Excluir</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                  <View style={s.tituloLinha}>
                    {!n.lida ? <View style={s.ponto} /> : null}
                    <Text style={s.titulo}>{n.titulo}</Text>
                  </View>
                  {n.texto ? <Text style={s.texto}>{n.texto}</Text> : null}
                  {n.destino ? (
                    <Pressable onPress={() => verDetalhes(n)} hitSlop={6} style={{ alignSelf: 'flex-start' }}>
                      <Text style={s.verDetalhes}>Ver detalhes</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
            {temMais ? (
              <Pressable onPress={carregarMais} disabled={maisCarregando} style={({ pressed }) => [s.mais, pressed && { opacity: 0.85 }]}>
                {maisCarregando ? <ActivityIndicator color={colors.primary} /> : <Text style={s.maisTexto}>Carregar mais</Text>}
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const sombra = {
  shadowColor: '#0b1b3a', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 6 }, shadowRadius: 18, elevation: 1,
} as const;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: tons.fundo },
  marcarTodas: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  marcarTodasTexto: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.primary },
  contador: { minWidth: 19, height: 19, paddingHorizontal: 5, borderRadius: 999, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  contadorTexto: { fontFamily: fonts.bold, fontSize: 11, color: colors.white },

  abas: { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: '#eeeff1' },
  aba: { flex: 1, paddingTop: 12, paddingBottom: 11, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  abaOn: { borderBottomColor: colors.primary },
  abaTexto: { fontSize: 14 },

  lista: { padding: 20, paddingBottom: 26, gap: 10 },
  erro: { color: colors.danger, fontFamily: fonts.medium, fontSize: 13, textAlign: 'center' },

  card: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16 },
  cardLida: { backgroundColor: colors.white, borderWidth: 0.5, borderColor: tons.bordaCartao, ...sombra },
  cardNaoLida: { backgroundColor: tons.okBg, borderWidth: 0.5, borderColor: '#dcefdc' },
  cardTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  cardTopoEsq: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1, minWidth: 0 },
  etiqueta: { fontFamily: fonts.bold, fontSize: 11.5, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 7, overflow: 'hidden' },
  quando: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.neutral500 },
  menuBtn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  menu: {
    position: 'absolute', top: 30, right: 0, width: 188, zIndex: 30,
    backgroundColor: colors.white, borderWidth: 1, borderColor: '#eeeff1', borderRadius: 12, overflow: 'hidden',
    shadowColor: '#0b1b3a', shadowOpacity: 0.16, shadowOffset: { width: 0, height: 12 }, shadowRadius: 30, elevation: 8,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14, backgroundColor: colors.white },
  menuItemBorda: { borderTopWidth: 1, borderTopColor: '#f4f4f5' },
  menuTexto: { fontFamily: fonts.regular, fontSize: 14, color: colors.neutral800 },
  tituloLinha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ponto: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  titulo: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.ink, lineHeight: 20 },
  texto: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.neutral500, marginTop: 5, lineHeight: 20 },
  verDetalhes: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.primary, marginTop: 10 },

  esqueleto: { borderRadius: 6, backgroundColor: '#eef0ee' },
  vazio: { backgroundColor: colors.white, borderWidth: 0.5, borderColor: tons.bordaCartao, borderRadius: 16, paddingVertical: 40, paddingHorizontal: 22, alignItems: 'center' },
  vazioTexto: { fontFamily: fonts.regular, fontSize: 14, color: colors.neutral500, marginTop: 10, textAlign: 'center' },
  mais: { height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  maisTexto: { fontFamily: fonts.semibold, fontSize: 14, color: tons.texto2 },
});
