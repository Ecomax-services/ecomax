import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, ImageBackground, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { podeAvancar, textoBloqueio } from '@/lib/monitoramento';
import { obterPacote } from '@/lib/execucao/pacote';
import { abrirRascunho, salvarRascunho, iniciarExecucao } from '@/lib/execucao/rascunho';
import { enviarExecucao, FalhaNoEnvio } from '@/lib/execucao/envio';
import { dataEmBrasilia, servicosDaOs } from '@/lib/execucao/regras';
import type { PacoteOs, RascunhoExecucao } from '@/lib/execucao/tipos';
import { colors, fonts } from '@/theme';
import { tons } from '@/screens/execucao/componentes';
import { EtapaDetalhes } from '@/screens/execucao/EtapaDetalhes';
import { EtapaProdutos } from '@/screens/execucao/EtapaProdutos';
import { EtapaMonitoramento, type MonitoramentoRef } from '@/screens/execucao/EtapaMonitoramento';
import { EtapaReposicao } from '@/screens/execucao/EtapaReposicao';
import { EtapaCliente } from '@/screens/execucao/EtapaCliente';
import { EtapaEmissao } from '@/screens/execucao/EtapaEmissao';
import type { OsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<OsStackParamList, 'Execucao'>;

const ETAPAS = [
  { n: 1, rotulo: 'Detalhes', flex: 1 },
  { n: 2, rotulo: 'Produtos', flex: 1 },
  { n: 3, rotulo: 'Monitoramento', flex: 1.7 },
  { n: 4, rotulo: 'Reposição', flex: 1 },
  { n: 5, rotulo: 'Cliente', flex: 1 },
  { n: 6, rotulo: 'Emissão', flex: 1 },
];
const TITULOS = ['Início da execução', 'Produtos utilizados', 'Monitoramento dos pontos', 'Solicitar reposição', 'Assinatura do cliente', 'Emissão de relatórios', 'Serviço concluído'];
const BOTOES = ['Iniciar serviço', 'Avançar para monitoramento', 'Avançar para reposição', 'Avançar para assinatura', 'Avançar para emissão', 'Concluir serviço'];

/**
 * Execução da OS em campo — as seis etapas do App aprovado (28/09).
 *
 * Trabalha sobre o pacote (o que foi baixado com rede) e o rascunho (o que o
 * técnico registrou), os dois guardados no aparelho. Cada mudança grava o
 * rascunho na hora; fechar o app no meio não perde nada. Só "Concluir
 * serviço" precisa de rede, e falhar ali também não perde nada.
 */
export function ExecucaoScreen({ route, navigation }: Props) {
  const { osId } = route.params;
  const insets = useSafeAreaInsets();
  const [pacote, setPacote] = useState<PacoteOs | null>(null);
  const [origem, setOrigem] = useState<'servidor' | 'aparelho'>('servidor');
  const [rascunho, setRascunho] = useState<RascunhoExecucao | null>(null);
  const [erroCarga, setErroCarga] = useState('');
  const [erroEtapa, setErroEtapa] = useState('');
  const [problemas, setProblemas] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [concluida, setConcluida] = useState(false);
  const monitoramento = useRef<MonitoramentoRef>(null);
  const rolagem = useRef<ScrollView>(null);

  useEffect(() => {
    Promise.all([obterPacote(osId), abrirRascunho(osId)])
      .then(([p, r]) => { setPacote(p.pacote); setOrigem(p.origem); setRascunho(r); })
      .catch((e) => setErroCarga((e as Error).message));
  }, [osId]);

  /** Toda mudança passa por aqui: estado e aparelho ao mesmo tempo. */
  const atualizar = useCallback((fn: (r: RascunhoExecucao) => RascunhoExecucao) => {
    setRascunho((atual) => {
      if (!atual) return atual;
      const novo = fn(atual);
      salvarRascunho(novo).catch(() => Alert.alert('Não foi possível salvar no aparelho', 'Verifique o espaço livre do aparelho.'));
      return novo;
    });
  }, []);

  const irPara = (etapa: number) => {
    setErroEtapa('');
    setProblemas([]);
    atualizar((r) => ({ ...r, etapa }));
    rolagem.current?.scrollTo({ y: 0, animated: false });
  };

  if (erroCarga) {
    return (
      <View style={[s.centro, { paddingTop: insets.top }]}>
        <MaterialIcons name="cloud-off" size={36} color={colors.neutral400} />
        <Text style={s.centroTexto}>{erroCarga}</Text>
        <Pressable onPress={() => navigation.goBack()} style={s.voltarBtn}><Text style={s.voltarTexto}>Voltar</Text></Pressable>
      </View>
    );
  }
  if (!pacote || !rascunho) {
    return <View style={s.centro}><ActivityIndicator color={colors.primary} /></View>;
  }

  const etapa = concluida ? 7 : rascunho.etapa;
  const hoje = dataEmBrasilia(new Date().toISOString());
  // Iniciar só na data programada. Quem já iniciou (rascunho com início) segue,
  // mesmo que a meia-noite tenha passado no meio da execução.
  const foraDaData = !rascunho.inicio && pacote.os.dataProgramada !== hoje;
  const servicos = servicosDaOs(pacote, rascunho);
  const bloqueioMonitoramento = etapa === 3 ? textoBloqueio(servicos) : null;
  const inativo = (etapa === 1 && foraDaData) || (etapa === 2 && rascunho.produtos.length === 0) || (etapa === 3 && !podeAvancar(servicos));

  const avancar = async () => {
    if (inativo) {
      if (etapa === 3 && bloqueioMonitoramento) setErroEtapa(bloqueioMonitoramento);
      return;
    }
    if (etapa === 1) {
      const r = await iniciarExecucao(rascunho);
      setRascunho(r);
      return irPara(2);
    }
    if (etapa === 5) {
      const a = rascunho.assinante;
      const erro = !a.nome.trim() ? 'Informe o nome de quem assina.'
        : a.cpf.replace(/\D/g, '').length !== 11 ? 'Informe o CPF de quem assina.'
          : !a.cargo.trim() ? 'Informe o cargo de quem assina.'
            : !a.assinaturaUri ? 'Colete a assinatura do cliente.' : '';
      if (erro) return setErroEtapa(erro);
      return irPara(6);
    }
    if (etapa === 6) {
      if (!rascunho.tecnicoAssinaturaUri) return setErroEtapa('Assine antes de concluir.');
      setEnviando(true);
      setErroEtapa('');
      setProblemas([]);
      try {
        await enviarExecucao(osId);
        setConcluida(true);
      } catch (e) {
        const f = e instanceof FalhaNoEnvio ? e : new FalhaNoEnvio('recusado', (e as Error).message);
        setErroEtapa(f.message);
        setProblemas(f.problemas);
      } finally {
        setEnviando(false);
      }
      return;
    }
    irPara(etapa + 1);
  };

  const voltar = () => {
    if (etapa > 1 && etapa < 7) return irPara(etapa - 1);
    navigation.goBack();
  };

  return (
    <View style={s.tela}>
      <StatusBar style="dark" />
      {/* Cabeçalho com a barra das etapas */}
      <View style={[s.cabecalho, { paddingTop: insets.top }]}>
        <View style={s.cabLinha}>
          {etapa < 7 ? (
            <Pressable onPress={voltar} hitSlop={8} style={s.cabVoltar}><MaterialIcons name="arrow-back" size={24} color={colors.ink} /></Pressable>
          ) : <View style={s.cabVoltar} />}
          <Text style={s.cabTitulo}>{TITULOS[etapa - 1]}</Text>
          <View style={s.cabVoltar} />
        </View>
        {etapa <= 6 ? (
          <View style={s.etapas}>
            {ETAPAS.map((e) => {
              const feita = e.n < etapa;
              const atual = e.n === etapa;
              return (
                <View key={e.n} style={{ flex: e.flex, minWidth: 0 }}>
                  <View style={[s.barra, { backgroundColor: feita ? tons.etapaFeita : atual ? colors.primary : tons.etapaPendente }]} />
                  <Text numberOfLines={1} style={[s.etapaRotulo, atual && { fontFamily: fonts.bold, color: colors.primary }]}>{e.rotulo}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      <ImageBackground source={require('../../../assets/forest-light.jpg')} style={{ flex: 1 }} imageStyle={{ resizeMode: 'cover' }}>
        <View style={s.veu} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView ref={rolagem} contentContainerStyle={s.conteudo} keyboardShouldPersistTaps="handled">
            {origem === 'aparelho' && etapa < 7 ? (
              <View style={s.offline}>
                <MaterialIcons name="cloud-off" size={16} color={colors.neutral500} />
                <Text style={s.offlineTexto}>Sem conexão: usando os dados guardados no aparelho.</Text>
              </View>
            ) : null}

            {etapa === 1 ? <EtapaDetalhes pacote={pacote} foraDaData={foraDaData} /> : null}
            {etapa === 2 ? (
              <EtapaProdutos pacote={pacote} produtos={rascunho.produtos} onChange={(produtos) => atualizar((r) => ({ ...r, produtos }))} />
            ) : null}
            {etapa === 3 ? <EtapaMonitoramento ref={monitoramento} pacote={pacote} rascunho={rascunho} atualizar={atualizar} /> : null}
            {etapa === 4 ? (
              <EtapaReposicao pacote={pacote} reposicao={rascunho.reposicao} onChange={(reposicao) => atualizar((r) => ({ ...r, reposicao }))} />
            ) : null}
            {etapa === 5 ? <EtapaCliente pacote={pacote} rascunho={rascunho} atualizar={atualizar} erro={erroEtapa} /> : null}
            {etapa === 6 ? <EtapaEmissao pacote={pacote} rascunho={rascunho} atualizar={atualizar} erro={erroEtapa} problemas={problemas} /> : null}

            {etapa === 7 ? (
              <View style={s.sucesso}>
                <View style={s.sucessoIcone}><MaterialIcons name="task-alt" size={44} color={colors.primary} /></View>
                <Text style={s.sucessoTitulo}>Serviço concluído</Text>
                <Text style={s.sucessoTexto}>A {pacote.os.codigo} foi enviada ao escritório e está no seu histórico.</Text>
                <Pressable onPress={() => navigation.popToTop()} style={s.sucessoBtn}><Text style={s.sucessoBtnTexto}>Voltar às OS</Text></Pressable>
              </View>
            ) : null}

            {etapa === 3 && erroEtapa ? (
              <View style={s.bloqueioErro}>
                <MaterialIcons name="error-outline" size={18} color={colors.danger} />
                <Text style={s.bloqueioErroTexto}>{erroEtapa}</Text>
              </View>
            ) : null}
          </ScrollView>

          {etapa <= 6 ? (
            <View style={[s.rodape, { paddingBottom: insets.bottom + 12 }]}>
              {etapa === 3 && bloqueioMonitoramento ? (
                <View style={s.faltam}>
                  <MaterialIcons name="pending-actions" size={18} color={tons.avisoIcone} />
                  <Text style={s.faltamTexto}>{bloqueioMonitoramento.replace('Avalie todos os pontos para avançar. ', '')}</Text>
                  <Pressable onPress={() => monitoramento.current?.irAoPendente()} style={s.irPendente}>
                    <Text style={s.irPendenteTexto}>Ir ao pendente</Text>
                  </Pressable>
                </View>
              ) : null}
              {etapa === 4 ? (
                <Pressable onPress={() => irPara(5)} style={s.pular}><Text style={s.pularTexto}>Pular etapa</Text></Pressable>
              ) : null}
              <Pressable onPress={avancar} disabled={enviando} style={[s.botao, (inativo || enviando) && s.botaoInativo]}>
                {enviando ? <ActivityIndicator color={colors.white} /> : (
                  <Text style={[s.botaoTexto, inativo && { color: tons.botaoInativoFg }]}>{BOTOES[etapa - 1]}</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: tons.fundo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: tons.fundo },
  centroTexto: { fontFamily: fonts.regular, fontSize: 14, color: colors.neutral500, textAlign: 'center', lineHeight: 20 },
  voltarBtn: { height: 44, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', backgroundColor: colors.white },
  voltarTexto: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  cabecalho: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: '#eeeff1' },
  cabLinha: { height: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  cabVoltar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  cabTitulo: { flex: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  etapas: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingBottom: 14 },
  barra: { height: 4, borderRadius: 999 },
  etapaRotulo: { fontFamily: fonts.medium, fontSize: 9, color: colors.neutral400, marginTop: 5, textAlign: 'center' },
  veu: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(244,246,244,0.82)' },
  conteudo: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 24 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  offlineTexto: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.neutral500 },
  rodape: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: '#eeeff1', paddingTop: 12, paddingHorizontal: 20 },
  faltam: {
    flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: tons.avisoBg, borderWidth: 0.5, borderColor: tons.avisoBorda,
    borderRadius: 12, paddingVertical: 9, paddingLeft: 12, paddingRight: 10, marginBottom: 10,
  },
  faltamTexto: { flex: 1, fontFamily: fonts.bold, fontSize: 12.5, color: tons.avisoTexto },
  irPendente: { height: 32, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#e8cd94', backgroundColor: colors.white, justifyContent: 'center' },
  irPendenteTexto: { fontFamily: fonts.bold, fontSize: 12, color: tons.avisoTexto },
  pular: { height: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  pularTexto: { fontFamily: fonts.semibold, fontSize: 14, color: colors.neutral500 },
  botao: { height: 52, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  botaoInativo: { backgroundColor: tons.botaoInativoBg },
  botaoTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  bloqueioErro: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: tons.erroBg, borderWidth: 0.5, borderColor: tons.erroBorda, borderRadius: 12, padding: 12, marginTop: 14 },
  bloqueioErroTexto: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: tons.erroTexto },
  sucesso: { alignItems: 'center', paddingTop: 48, gap: 10 },
  sucessoIcone: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#e7f6e7', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  sucessoTitulo: { fontFamily: fonts.bold, fontSize: 21, color: colors.ink },
  sucessoTexto: { fontFamily: fonts.regular, fontSize: 14.5, color: colors.neutral500, textAlign: 'center', lineHeight: 21, paddingHorizontal: 12 },
  sucessoBtn: { marginTop: 18, height: 52, alignSelf: 'stretch', borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sucessoBtnTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
});
