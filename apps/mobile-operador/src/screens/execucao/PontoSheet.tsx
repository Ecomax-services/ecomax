import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, TextInput, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COMPORTAMENTO, erroDaLeitura, sanitizarContagem, type ServicoCodigo } from '@/lib/monitoramento';
import { colors, fonts, radius } from '@/theme';
import { RotuloSecao, Erro, estilos, tons } from '@/screens/execucao/componentes';
import type { FotoNoRascunho, LegendaDoPacote, LeituraNoRascunho, PontoDoPacote } from '@/lib/execucao/tipos';

/** Tom de uma legenda: fundo e texto da Planilha, borda derivada do texto. */
export function tomDaLegenda(l?: LegendaDoPacote): { bg: string; borda: string; fg: string } {
  if (!l) return { bg: colors.white, borda: '#dcdfe3', fg: colors.neutral400 };
  const fg = l.corFg ?? colors.neutral600;
  return { bg: l.corBg ?? '#eef0f2', borda: `${fg}55`, fg };
}

interface Props {
  visivel: boolean;
  servico: ServicoCodigo;
  ponto: PontoDoPacote;
  leitura: LeituraNoRascunho | undefined;
  legendas: LegendaDoPacote[];
  /** Colunas fixas da contagem (espécies da AL, pragas de grãos). */
  campos: string[];
  /** Outras pragas que a AL aceita além das colunas fixas; vazio = não aceita. */
  outrasPragas: string[];
  fotos: FotoNoRascunho[];
  onSalvar: (leitura: LeituraNoRascunho | null) => void;
  onAdicionarFoto: () => void;
  onRemoverFoto: (id: string) => void;
  onFechar: () => void;
}

/**
 * Folha do ponto: o que a grade não registra.
 *
 * No porta-isca e na placa o status é marcado na grade; aqui ele só se
 * complementa (observação, fotos) ou se troca. Na armadilha luminosa e de
 * grãos é aqui que se conta. Tudo é rascunho até "Salvar".
 */
export function PontoSheet(p: Props) {
  const insets = useSafeAreaInsets();
  const comportamento = COMPORTAMENTO[p.servico];
  const [status, setStatus] = useState<number | null>(null);
  const [alterar, setAlterar] = useState(false);
  const [contagem, setContagem] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<string[]>([]);
  const [escolhendoPraga, setEscolhendoPraga] = useState(false);
  const [outraAberta, setOutraAberta] = useState(false);
  const [outraNome, setOutraNome] = useState('');
  const [obs, setObs] = useState('');
  const [erro, setErro] = useState('');

  // Reabre com o que já estava salvo.
  useEffect(() => {
    if (!p.visivel) return;
    const l = p.leitura ?? {};
    setStatus(l.statusCodigo ?? null);
    setAlterar(false);
    const c = l.contagens ?? {};
    setContagem(Object.fromEntries(Object.entries(c).map(([k, v]) => [k, String(v)])));
    setExtras(Object.keys(c).filter((k) => !p.campos.includes(k)));
    setEscolhendoPraga(false);
    setOutraAberta(false);
    setOutraNome('');
    setObs(l.observacao ?? '');
    setErro('');
  }, [p.visivel, p.ponto.id]);

  const legendaAtual = p.legendas.find((l) => l.codigo === status);
  const linhas = [...p.campos, ...extras];
  const total = linhas.reduce((soma, k) => soma + (parseInt(contagem[k] ?? '', 10) || 0), 0);
  const temAvaliacao = !!p.leitura && (p.leitura.statusCodigo != null || p.leitura.contagens != null);

  const incluirPraga = (nome: string) => {
    const limpo = nome.trim();
    if (!limpo || linhas.includes(limpo)) return;
    setExtras([...extras, limpo]);
    setEscolhendoPraga(false);
    setOutraAberta(false);
    setOutraNome('');
  };

  const salvar = () => {
    const leitura: LeituraNoRascunho = { ...(p.leitura ?? {}), observacao: obs };
    if (comportamento === 'status') {
      leitura.statusCodigo = status;
    } else if (comportamento === 'contagem') {
      // Campo vazio conta como zero, como diz a folha.
      leitura.contagens = Object.fromEntries(linhas.map((k) => [k, parseInt(contagem[k] ?? '', 10) || 0]));
    }
    const e = erroDaLeitura(p.servico, leitura);
    if (e) return setErro(e);
    p.onSalvar(leitura);
  };

  const subtitulo = [p.ponto.area, p.ponto.fase ? `Fase ${p.ponto.fase}` : null, p.ponto.local].filter(Boolean).join(' · ');

  return (
    <Modal visible={p.visivel} transparent animationType="slide" onRequestClose={p.onFechar}>
      <Pressable style={estilos.fundoModal} onPress={p.onFechar} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.folha, { paddingBottom: insets.bottom + 16 }]}>
          <View style={estilos.puxador} />
          <View style={s.cabecalho}>
            <View style={{ flex: 1 }}>
              <Text style={s.titulo}>{p.servico}-{String(p.ponto.numero).padStart(2, '0')}</Text>
              <Text style={s.sub}>{subtitulo}</Text>
            </View>
            <Pressable onPress={p.onFechar} hitSlop={8}><MaterialIcons name="close" size={22} color={colors.neutral500} /></Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 560 }}>
            {comportamento === 'status' ? (
              <View>
                <View style={s.statusLinha}>
                  <View style={[s.statusPilula, { backgroundColor: tomDaLegenda(legendaAtual).bg, borderColor: tomDaLegenda(legendaAtual).borda }]}>
                    <Text style={[s.statusTexto, { color: tomDaLegenda(legendaAtual).fg }]}>
                      {legendaAtual ? `${legendaAtual.codigo} · ${legendaAtual.rotulo}` : 'Sem status'}
                    </Text>
                  </View>
                  <Pressable onPress={() => setAlterar(!alterar)}><Text style={s.link}>{alterar ? 'Fechar' : 'Alterar'}</Text></Pressable>
                </View>
                {alterar ? (
                  <View style={{ gap: 8, marginTop: 10 }}>
                    {p.legendas.map((l) => {
                      const tom = tomDaLegenda(l);
                      const on = status === l.codigo;
                      return (
                        <Pressable key={l.codigo} onPress={() => { setStatus(on ? null : l.codigo); setAlterar(false); }}
                          style={[s.opcaoStatus, on && { backgroundColor: tom.bg, borderColor: tom.borda }]}>
                          <View style={[s.numero, { backgroundColor: tom.bg, borderColor: tom.borda }]}>
                            <Text style={[s.numeroTexto, { color: tom.fg }]}>{l.codigo}</Text>
                          </View>
                          <Text style={s.opcaoTexto}>{l.rotulo}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
                <Text style={s.nota}>O status é marcado na grade de pontos. Aqui você só complementa.</Text>
              </View>
            ) : null}

            {comportamento === 'contagem' ? (
              <View>
                <RotuloSecao primeiro>Contagem</RotuloSecao>
                <View style={s.tabela}>
                  {linhas.map((k, i) => (
                    <View key={k} style={[s.linhaContagem, i > 0 && s.linhaBorda]}>
                      <Text style={s.nomeContagem} numberOfLines={2}>{k}</Text>
                      <TextInput
                        value={contagem[k] ?? ''} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.neutral400}
                        onChangeText={(v) => setContagem({ ...contagem, [k]: sanitizarContagem(v) })}
                        style={s.inputContagem}
                      />
                      {extras.includes(k) ? (
                        <Pressable hitSlop={6} onPress={() => setExtras(extras.filter((x) => x !== k))}>
                          <MaterialIcons name="close" size={18} color={colors.neutral400} />
                        </Pressable>
                      ) : null}
                    </View>
                  ))}

                  {p.outrasPragas.length > 0 ? (
                    <View style={[s.linhaBorda, { paddingVertical: 10 }]}>
                      {!escolhendoPraga ? (
                        <Pressable onPress={() => setEscolhendoPraga(true)} style={s.addPraga}>
                          <MaterialIcons name="add" size={18} color={colors.primary} />
                          <Text style={s.addPragaTexto}>Adicionar praga</Text>
                        </Pressable>
                      ) : (
                        <View>
                          <View style={s.pickerTopo}>
                            <Text style={s.pickerTitulo}>Escolha a praga</Text>
                            <Pressable onPress={() => setEscolhendoPraga(false)} hitSlop={6}><MaterialIcons name="close" size={18} color={colors.neutral500} /></Pressable>
                          </View>
                          <View style={s.chips}>
                            {[...p.outrasPragas.filter((x) => !linhas.includes(x)), 'Outra'].map((nome) => (
                              <Pressable key={nome} onPress={() => (nome === 'Outra' ? setOutraAberta(true) : incluirPraga(nome))} style={s.chip}>
                                <Text style={s.chipTexto}>{nome}</Text>
                              </Pressable>
                            ))}
                          </View>
                          {outraAberta ? (
                            <View style={s.outra}>
                              <TextInput value={outraNome} onChangeText={setOutraNome} placeholder="Nome da praga"
                                placeholderTextColor={colors.neutral400} style={[estilos.campo, { flex: 1, fontFamily: fonts.regular }]} />
                              <Pressable onPress={() => incluirPraga(outraNome)} style={s.incluir}><Text style={s.incluirTexto}>Incluir</Text></Pressable>
                            </View>
                          ) : null}
                        </View>
                      )}
                    </View>
                  ) : null}

                  <View style={[s.linhaContagem, s.linhaBorda]}>
                    <Text style={[s.nomeContagem, { fontFamily: fonts.bold }]}>Total</Text>
                    <Text style={s.total}>{total}</Text>
                  </View>
                </View>
                <Text style={s.nota}>Somente números inteiros. Campo vazio conta como zero.</Text>
              </View>
            ) : null}

            <RotuloSecao>Observação</RotuloSecao>
            <TextInput value={obs} onChangeText={setObs} multiline placeholder="Ex.: pallet em frente ao ponto"
              placeholderTextColor={colors.neutral400} style={s.textarea} />

            <RotuloSecao>Fotos</RotuloSecao>
            <View style={s.fotos}>
              {p.fotos.map((f, i) => (
                <View key={f.id} style={s.foto}>
                  <MaterialIcons name="image" size={18} color={colors.neutral500} />
                  <Text style={s.fotoTexto}>Foto {i + 1}</Text>
                  <Pressable hitSlop={6} onPress={() => p.onRemoverFoto(f.id)}><MaterialIcons name="close" size={16} color={colors.neutral400} /></Pressable>
                </View>
              ))}
              <Pressable onPress={p.onAdicionarFoto} style={s.addFoto}>
                <MaterialIcons name="photo-camera" size={18} color={colors.primary} />
                <Text style={s.addPragaTexto}>Adicionar</Text>
              </Pressable>
            </View>

            {erro ? <Erro>{erro}</Erro> : null}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              {temAvaliacao ? (
                <Pressable onPress={() => p.onSalvar(null)} style={s.limpar}><Text style={s.limparTexto}>Limpar</Text></Pressable>
              ) : null}
              <Pressable onPress={salvar} style={s.salvar}><Text style={s.salvarTexto}>Salvar</Text></Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  folha: { backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: 20, paddingTop: 10 },
  cabecalho: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  titulo: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 13, color: colors.neutral400, marginTop: 2 },
  statusLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPilula: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12, flexShrink: 1 },
  statusTexto: { fontFamily: fonts.bold, fontSize: 13.5 },
  link: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.primary },
  opcaoStatus: { flexDirection: 'row', alignItems: 'center', gap: 9, height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: '#e6e8e6', paddingHorizontal: 12 },
  numero: { width: 26, height: 26, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  numeroTexto: { fontFamily: fonts.bold, fontSize: 12.5 },
  opcaoTexto: { flex: 1, fontFamily: fonts.semibold, fontSize: 13.5, color: colors.ink },
  nota: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral400, marginTop: 10 },
  tabela: { borderWidth: 0.5, borderColor: tons.bordaCartao, borderRadius: 12, paddingHorizontal: 12 },
  linhaContagem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  linhaBorda: { borderTopWidth: 1, borderTopColor: tons.linha },
  nomeContagem: { flex: 1, fontFamily: fonts.medium, fontSize: 13.5, color: colors.neutral800 },
  inputContagem: {
    width: 76, height: 40, borderWidth: 1, borderColor: colors.border, borderRadius: 10, textAlign: 'center',
    fontFamily: fonts.bold, fontSize: 15, color: colors.ink, backgroundColor: '#fbfcfb',
  },
  total: { width: 76, textAlign: 'center', fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  addPraga: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addPragaTexto: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.primary },
  pickerTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  pickerTitulo: { fontFamily: fonts.semibold, fontSize: 13, color: colors.neutral800 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { height: 32, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#e6e8e6', justifyContent: 'center', backgroundColor: colors.white },
  chipTexto: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.neutral500 },
  outra: { flexDirection: 'row', gap: 8, marginTop: 10 },
  incluir: { height: 44, paddingHorizontal: 14, borderRadius: 11, backgroundColor: colors.primary, justifyContent: 'center' },
  incluirTexto: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.white },
  textarea: {
    minHeight: 80, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12,
    fontFamily: fonts.regular, fontSize: 14, color: colors.ink, textAlignVertical: 'top', backgroundColor: colors.white,
  },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  foto: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e6e8e6' },
  fotoTexto: { fontFamily: fonts.medium, fontSize: 13, color: colors.neutral800 },
  addFoto: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#bfe3c2', backgroundColor: '#f2fbf2' },
  limpar: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  limparTexto: { fontFamily: fonts.semibold, fontSize: 14, color: tons.texto2 },
  salvar: { flex: 2, height: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  salvarTexto: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
});
