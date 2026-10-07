import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  COMPORTAMENTO, NOME_LONGO_SERVICO, NOME_SERVICO, aplicacaoCompleta, alertaLampada, progressoDoServico,
  textoProgressoDaOs, textoProgressoDoServico, pontoAvaliado, sanitizarContagem, type ServicoNaOs,
} from '@/lib/monitoramento';
import { dataEmBrasilia, numeroDigitado } from '@/lib/execucao/regras';
import { capturarFoto } from '@/lib/execucao/fotos';
import { colors, fonts } from '@/theme';
import { Cartao, RotuloSecao, Aviso, CampoEscolha, BotaoContorno, estilos, tons } from '@/screens/execucao/componentes';
import { PontoSheet, tomDaLegenda } from '@/screens/execucao/PontoSheet';
import type { AplicacaoNoRascunho, LeituraNoRascunho, PacoteOs, PlanoDoPacote, RascunhoExecucao } from '@/lib/execucao/tipos';

export interface MonitoramentoRef {
  /** "Ir ao pendente": abre a aba e o ponto (ou setor) em aberto. */
  irAoPendente: () => void;
}

interface Props {
  pacote: PacoteOs;
  rascunho: RascunhoExecucao;
  atualizar: (fn: (r: RascunhoExecucao) => RascunhoExecucao) => void;
}

/** O serviço de um plano no formato das regras compartilhadas. */
function servicoNaOs(plano: PlanoDoPacote, r: RascunhoExecucao): ServicoNaOs {
  return {
    servico: plano.servico!,
    pontos: plano.pontos.map((pt) => r.pontos[pt.id] ?? {}),
    aplicacoes: r.aplicacoes.filter((a) => a.planoId === plano.id),
  };
}

/** AAAA-MM-DD → DD/MM/AAAA, e de volta. O campo de data do App é texto com máscara. */
const paraBr = (iso?: string | null) => (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : '');
const paraIso = (br: string) => (/^\d{2}\/\d{2}\/\d{4}$/.test(br) ? br.split('/').reverse().join('-') : null);
const mascaraData = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join('/');
};

/**
 * Etapa 3 — Monitoramento dos pontos.
 *
 * Uma aba por serviço do mapa. O comportamento de cada aba vem do código do
 * serviço (grade de status, contagem, ocorrência, aplicação), como no
 * protótipo aprovado; rótulo e cor das legendas vêm da Planilha.
 */
export const EtapaMonitoramento = forwardRef<MonitoramentoRef, Props>(function EtapaMonitoramento({ pacote, rascunho, atualizar }, ref) {
  const planos = useMemo(() => pacote.planos.filter((p) => p.servico != null), [pacote]);
  const [planoId, setPlanoId] = useState<string | null>(planos[0]?.id ?? null);
  const [area, setArea] = useState('todas');
  const [marcando, setMarcando] = useState<Record<string, number | null>>({});
  const [pontoAberto, setPontoAberto] = useState<string | null>(null);
  const [setorAberto, setSetorAberto] = useState<string | null>(null);

  const plano = planos.find((p) => p.id === planoId) ?? planos[0];

  useImperativeHandle(ref, () => ({
    irAoPendente() {
      const ordem = plano ? [plano, ...planos.filter((p) => p.id !== plano.id)] : planos;
      for (const pl of ordem) {
        const sv = servicoNaOs(pl, rascunho);
        if (progressoDoServico(sv).faltam === 0) continue;
        setPlanoId(pl.id);
        setArea('todas');
        const comp = COMPORTAMENTO[pl.servico!];
        if (comp === 'aplicacao') return;
        const pt = pl.pontos.find((x) => !pontoAvaliado(pl.servico!, rascunho.pontos[x.id] ?? {}));
        if (!pt) return;
        if (comp === 'ocorrencia') setSetorAberto(pt.id);
        else setPontoAberto(pt.id);
        return;
      }
    },
  }), [plano, planos, rascunho]);

  if (planos.length === 0 || !plano) {
    return (
      <Cartao>
        <Text style={s.semMonitoramento}>
          Esta OS não tem monitoramento pelo App: o cliente não tem mapa de pontos cadastrado para os serviços contratados.
        </Text>
      </Cartao>
    );
  }

  const servico = plano.servico!;
  const comp = COMPORTAMENTO[servico];
  const sv = servicoNaOs(plano, rascunho);
  const prog = progressoDoServico(sv);
  const todos = planos.map((p) => servicoNaOs(p, rascunho));
  const legendas = pacote.legendas[servico] ?? [];
  const areas = ['todas', ...new Set(plano.pontos.map((p) => p.area ?? '—'))];
  const pontosVisiveis = plano.pontos.filter((p) => area === 'todas' || (p.area ?? '—') === area);

  const salvarLeitura = (pontoId: string, l: LeituraNoRascunho | null) => {
    atualizar((r) => {
      const pontos = { ...r.pontos };
      if (l) pontos[pontoId] = l; else delete pontos[pontoId];
      return { ...r, pontos };
    });
  };

  // ---- grade de status
  const marcarNaGrade = (pontoId: string) => {
    const codigo = marcando[plano.id];
    if (codigo == null) return Alert.alert('Escolha um status acima', 'Depois toque nos pontos que estão nesse status.');
    const atual = rascunho.pontos[pontoId];
    // Tocar de novo no mesmo status desmarca, como no protótipo.
    if (atual?.statusCodigo === codigo) return salvarLeitura(pontoId, { ...atual, statusCodigo: null });
    salvarLeitura(pontoId, { ...(atual ?? {}), statusCodigo: codigo });
  };

  // ---- plano (observação, lâmpada)
  const planoNoRascunho = rascunho.planos[plano.id] ?? {};
  const atualizarPlano = (campos: Partial<RascunhoExecucao['planos'][string]>) =>
    atualizar((r) => ({ ...r, planos: { ...r.planos, [plano.id]: { ...(r.planos[plano.id] ?? {}), ...campos } } }));

  // ---- aplicações
  const aplicacoes = rascunho.aplicacoes.map((a, i) => ({ a, i })).filter(({ a }) => a.planoId === plano.id);
  const atualizarAplicacao = (indice: number, campos: Partial<AplicacaoNoRascunho>) =>
    atualizar((r) => ({ ...r, aplicacoes: r.aplicacoes.map((a, i) => (i === indice ? { ...a, ...campos } : a)) }));
  const novaAplicacao = () => {
    const primeiro = pacote.produtos[0];
    atualizar((r) => ({
      ...r,
      aplicacoes: [...r.aplicacoes, {
        planoId: plano.id, produtoId: null, tecnica: null, quantidade: '',
        unidade: primeiro?.unidadeAplicacao ?? primeiro?.unidade ?? 'mL', areas: [],
      }],
    }));
  };
  const unidadesDe = (produtoId: string | null) => {
    const p = pacote.produtos.find((x) => x.produtoId === produtoId);
    return p ? [...new Set([p.unidadeAplicacao, p.unidade].filter((u): u is string => !!u))] : ['mL', 'g'];
  };

  // ---- fotos
  const fotosDoPonto = (pontoId: string) => rascunho.fotos.filter((f) => f.pontoId === pontoId);
  const adicionarFoto = async (pontoId: string) => {
    try {
      const pt = plano.pontos.find((x) => x.id === pontoId);
      const foto = await capturarFoto(rascunho.osId, pontoId, `${servico}-${String(pt?.numero ?? 0).padStart(2, '0')}`);
      if (foto) atualizar((r) => ({ ...r, fotos: [...r.fotos, foto] }));
    } catch (e) {
      Alert.alert('Não foi possível guardar a foto', (e as Error).message);
    }
  };

  const pontoDaFolha = plano.pontos.find((p) => p.id === pontoAberto);

  return (
    <View>
      <Text style={s.intro}>Vistorie os pontos ponto a ponto. O que você registrar aqui alimenta o relatório técnico.</Text>

      {/* Abas por serviço */}
      <View style={s.abas}>
        {planos.map((p) => {
          const on = p.id === plano.id;
          const pr = progressoDoServico(servicoNaOs(p, rascunho));
          const completo = pr.faltam === 0;
          return (
            <Pressable key={p.id} onPress={() => { setPlanoId(p.id); setArea('todas'); }}
              style={[s.aba, on && s.abaOn]}>
              <Text style={[s.abaTexto, on && { color: colors.white }]} numberOfLines={2}>{NOME_SERVICO[p.servico!]}</Text>
              <View style={[s.abaBadge, { backgroundColor: on ? 'rgba(255,255,255,0.22)' : completo ? '#e7f6e7' : '#fbe7c8' }]}>
                <Text style={[s.abaBadgeTexto, { color: on ? colors.white : completo ? '#1d6b25' : tons.avisoTexto }]}>{pr.avaliados}/{pr.total}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Progresso */}
      <Cartao style={{ marginTop: 12 }}>
        <View style={s.progTopo}>
          <Text style={s.progNome}>{NOME_LONGO_SERVICO[servico]}</Text>
          <Text style={s.progRotulo}>{textoProgressoDoServico(sv)}</Text>
        </View>
        <View style={s.barra}><View style={[s.barraCheia, { width: `${prog.total ? Math.round((prog.avaliados / prog.total) * 100) : 0}%` }]} /></View>
        <Text style={s.progGeral}>{textoProgressoDaOs(todos)}</Text>
      </Cartao>

      {plano.pontos.length === 0 && comp !== 'aplicacao' ? (
        <Aviso icone="info-outline" style={{ marginTop: 12 }}>Nenhum ponto deste serviço no mapa do cliente.</Aviso>
      ) : null}

      {/* Grade de status */}
      {comp === 'status' && plano.pontos.length > 0 ? (
        <>
          <RotuloSecao>Marcar por status</RotuloSecao>
          <Cartao>
            <Text style={s.cartaoTitulo}>Marque o status de cada ponto.</Text>
            <Text style={s.cartaoSub}>Escolha o status e toque nos pontos. Tocar de novo desmarca.</Text>
            <View style={{ gap: 8, marginTop: 12 }}>
              {legendas.map((l) => {
                const on = marcando[plano.id] === l.codigo;
                const tom = tomDaLegenda(l);
                const qtd = plano.pontos.filter((p) => rascunho.pontos[p.id]?.statusCodigo === l.codigo).length;
                return (
                  <Pressable key={l.codigo} onPress={() => setMarcando({ ...marcando, [plano.id]: on ? null : l.codigo })}
                    style={[s.pick, on ? { backgroundColor: tom.bg, borderColor: tom.borda } : null]}>
                    <View style={[s.pickNumero, { backgroundColor: tom.bg, borderColor: tom.borda }]}>
                      <Text style={[s.pickNumeroTexto, { color: tom.fg }]}>{l.codigo}</Text>
                    </View>
                    <Text style={s.pickTexto}>{l.rotulo}</Text>
                    <Text style={s.pickQtd}>{qtd}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={s.gradeTopo}>
              <Text style={s.gradeRotulo}>Pontos do bloco</Text>
              <Text style={s.gradeRotulo}>{plano.pontos.length} {plano.pontos.length === 1 ? 'ponto' : 'pontos'}</Text>
            </View>
            <Text style={s.cartaoSub}>Toque nos pontos que estão no status selecionado.</Text>
            <View style={s.grade}>
              {plano.pontos.map((p) => {
                const leitura = rascunho.pontos[p.id];
                const l = legendas.find((x) => x.codigo === leitura?.statusCodigo);
                const tom = l ? tomDaLegenda(l) : null;
                return (
                  <Pressable key={p.id} onPress={() => marcarNaGrade(p.id)}
                    style={[s.celula, tom ? { backgroundColor: tom.bg, borderColor: tom.borda, borderStyle: 'solid' } : s.celulaPendente]}>
                    <Text style={[s.celulaTexto, { color: tom ? tom.fg : tons.avisoIcone }]}>{p.numero}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={s.gradeRodape}>
              <Text style={s.cartaoSub}>
                {marcando[plano.id] != null ? `Marcando: ${legendas.find((x) => x.codigo === marcando[plano.id])?.rotulo ?? ''}` : 'Escolha um status acima'}
              </Text>
              <View style={[s.badge, { backgroundColor: prog.faltam ? '#fbe7c8' : '#e7f6e7' }]}>
                <Text style={[s.badgeTexto, { color: prog.faltam ? tons.avisoTexto : '#1d6b25' }]}>
                  {prog.faltam ? `Faltam ${prog.faltam} de ${prog.total}` : 'Bloco completo'}
                </Text>
              </View>
            </View>
          </Cartao>
        </>
      ) : null}

      {/* Legenda da contagem */}
      {comp === 'contagem' && plano.pontos.length > 0 ? (
        <>
          <RotuloSecao>Legenda</RotuloSecao>
          <Cartao>
            <Text style={s.cartaoSub}>Contagem por equipamento. Some automático no total.</Text>
            <View style={[s.chips, { marginTop: 10 }]}>
              {(servico === 'AL' ? pacote.listas.especiesAl : pacote.listas.pragasPg).map((c) => (
                <View key={c} style={s.chipFixo}><Text style={s.chipTexto}>{c}</Text></View>
              ))}
            </View>
          </Cartao>
        </>
      ) : null}

      {/* Lâmpadas da armadilha luminosa: uma validade para o serviço todo */}
      {servico === 'AL' ? (
        <>
          <RotuloSecao>Lâmpadas</RotuloSecao>
          <Cartao>
            <Text style={s.cartaoSub}>Uma validade para todas as armadilhas deste serviço.</Text>
            {/* key: cada plano de armadilha tem a sua validade; trocar de aba recomeça os campos. */}
            <Lampadas key={plano.id} instalacao={planoNoRascunho.lampadaInstalacao} validade={planoNoRascunho.lampadaValidade}
              onChange={atualizarPlano} />
          </Cartao>
        </>
      ) : null}

      {/* Aplicações da Desinsetização */}
      {comp === 'aplicacao' ? (
        <>
          <RotuloSecao>Aplicações</RotuloSecao>
          <View style={{ gap: 10 }}>
            {aplicacoes.map(({ a, i }, n) => (
              <Cartao key={i} style={{ gap: 10 }}>
                <View style={s.aplTopo}>
                  <Text style={s.cartaoTitulo}>Aplicação {n + 1}</Text>
                  <View style={[s.badge, { backgroundColor: aplicacaoCompleta(a) ? '#e7f6e7' : '#fbe7c8' }]}>
                    <Text style={[s.badgeTexto, { color: aplicacaoCompleta(a) ? '#1d6b25' : tons.avisoTexto }]}>{aplicacaoCompleta(a) ? 'Completa' : 'Incompleta'}</Text>
                  </View>
                  <Pressable hitSlop={6} onPress={() => atualizar((r) => ({ ...r, aplicacoes: r.aplicacoes.filter((_, j) => j !== i) }))}>
                    <MaterialIcons name="delete-outline" size={20} color={colors.neutral500} />
                  </Pressable>
                </View>
                <CampoEscolha rotulo="Produto aplicado" valor={a.produtoId} vazio="Selecione o produto"
                  opcoes={pacote.produtos.map((p) => ({ valor: p.produtoId, rotulo: p.nome }))}
                  onChange={(v) => atualizarAplicacao(i, { produtoId: v, unidade: unidadesDe(v)[0] ?? a.unidade })} />
                <CampoEscolha rotulo="Técnica" valor={a.tecnica} vazio="Selecione a técnica"
                  opcoes={pacote.listas.tecnicasDi.map((t) => ({ valor: t, rotulo: t }))}
                  onChange={(v) => atualizarAplicacao(i, { tecnica: v })} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={estilos.campoRotulo}>Quantidade</Text>
                    <TextInput value={a.quantidade} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.neutral400}
                      onChangeText={(v) => atualizarAplicacao(i, { quantidade: v.replace(/[^0-9.,]/g, '') })}
                      style={[estilos.campo, s.input]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <CampoEscolha rotulo="Unidade" valor={a.unidade}
                      opcoes={unidadesDe(a.produtoId).map((u) => ({ valor: u, rotulo: u }))}
                      onChange={(v) => atualizarAplicacao(i, { unidade: v })} />
                  </View>
                </View>
                <Text style={estilos.campoRotulo}>Áreas de atuação</Text>
                <View style={s.chips}>
                  {pacote.areas.map((ar) => {
                    const on = a.areas.includes(ar);
                    return (
                      <Pressable key={ar} onPress={() => atualizarAplicacao(i, { areas: on ? a.areas.filter((x) => x !== ar) : [...a.areas, ar] })}
                        style={[s.chip, on && s.chipOn]}>
                        <Text style={[s.chipTexto, on && { color: colors.primary }]}>{ar}</Text>
                      </Pressable>
                    );
                  })}
                  {pacote.areas.length === 0 ? <Text style={s.cartaoSub}>O cliente não tem áreas cadastradas.</Text> : null}
                </View>
                {a.quantidade && !(numeroDigitado(a.quantidade) > 0) ? <Text style={s.erroCampo}>Quantidade inválida.</Text> : null}
              </Cartao>
            ))}
          </View>
          {aplicacoes.length === 0 ? (
            <View style={s.vazio}>
              <MaterialIcons name="sanitizer" size={28} color={tons.iconeApagado} />
              <Text style={s.vazioTexto}>Nenhuma aplicação registrada.</Text>
            </View>
          ) : null}
          <BotaoContorno verde icone="add" rotulo="Adicionar aplicação" onPress={novaAplicacao} style={{ marginTop: 12 }} />
          <Text style={[s.cartaoSub, { marginTop: 9, marginLeft: 2 }]}>{textoProgressoDoServico(sv)}</Text>
          <RotuloSecao>Observação</RotuloSecao>
          <TextInput value={planoNoRascunho.observacao ?? ''} onChangeText={(v) => atualizarPlano({ observacao: v })} multiline
            placeholder="Ex.: aplicação reforçada no rodapé da cozinha" placeholderTextColor={colors.neutral400} style={s.textarea} />
        </>
      ) : null}

      {/* Ocorrência Setorial */}
      {comp === 'ocorrencia' && plano.pontos.length > 0 ? (
        <>
          <RotuloSecao>Setores</RotuloSecao>
          <Text style={[s.cartaoSub, { marginTop: -4, marginBottom: 10, marginLeft: 2 }]}>
            Abra o setor, marque as pragas encontradas e informe a contagem. Sem praga, marque "Sem ocorrência".
          </Text>
          <FiltroAreas areas={areas} atual={area} onChange={setArea} />
          <View style={{ gap: 10 }}>
            {pontosVisiveis.map((pt) => {
              const l = rascunho.pontos[pt.id] ?? {};
              const marcadas = Object.keys(l.contagens ?? {});
              const aberto = setorAberto === pt.id;
              const badge = l.semOcorrencia ? 'Sem ocorrência' : marcadas.length ? `${marcadas.length} ${marcadas.length > 1 ? 'pragas' : 'praga'}` : 'Pendente';
              const badgeCor = l.semOcorrencia ? ['#e7f6e7', '#1d6b25'] : marcadas.length ? ['#fdf2e3', tons.avisoTexto] : ['#fff6e6', tons.avisoIcone];
              const atualizarSetor = (campos: LeituraNoRascunho) => salvarLeitura(pt.id, { ...l, ...campos });
              return (
                <Cartao key={pt.id} style={{ paddingVertical: 0, paddingHorizontal: 16 }}>
                  <Pressable onPress={() => setSetorAberto(aberto ? null : pt.id)} style={s.setorTopo}>
                    <View style={s.numeroPonto}><Text style={s.numeroPontoTexto}>{pt.numero}</Text></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.pontoLocal}>{pt.local}</Text>
                      <Text style={s.pontoSub}>Setor {pt.numero} · {pt.area ?? '—'}</Text>
                    </View>
                    <View style={[s.badge, { backgroundColor: badgeCor[0] }]}><Text style={[s.badgeTexto, { color: badgeCor[1] }]}>{badge}</Text></View>
                    <MaterialIcons name={aberto ? 'expand-less' : 'expand-more'} size={22} color={colors.neutral400} />
                  </Pressable>
                  {aberto ? (
                    <View style={{ paddingBottom: 16 }}>
                      <RotuloSecao primeiro>Pragas encontradas</RotuloSecao>
                      <View style={s.chips}>
                        {pacote.listas.pragasOc.map((pr) => {
                          const on = marcadas.includes(pr);
                          return (
                            <Pressable key={pr} style={[s.chip, on && s.chipOn]}
                              onPress={() => {
                                const c = { ...(l.contagens ?? {}) };
                                if (on) delete c[pr]; else c[pr] = 0;
                                atualizarSetor({ contagens: Object.keys(c).length ? c : null, semOcorrencia: false });
                              }}>
                              <Text style={[s.chipTexto, on && { color: colors.primary }]}>{pr}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <Pressable onPress={() => atualizarSetor({ semOcorrencia: !l.semOcorrencia, contagens: null })}
                        style={[s.semOcorrencia, l.semOcorrencia && s.semOcorrenciaOn]}>
                        <MaterialIcons name="check-circle" size={17} color={l.semOcorrencia ? colors.white : colors.primary} />
                        <Text style={[s.semOcorrenciaTexto, l.semOcorrencia && { color: colors.white }]}>Sem ocorrência no setor</Text>
                      </Pressable>
                      {marcadas.length ? (
                        <>
                          <RotuloSecao>Contagem</RotuloSecao>
                          <View style={s.tabela}>
                            {marcadas.map((pr, i) => (
                              <View key={pr} style={[s.linhaContagem, i > 0 && s.linhaBorda]}>
                                <Text style={s.nomeContagem}>{pr}</Text>
                                <TextInput value={String(l.contagens?.[pr] || '')} keyboardType="number-pad" placeholder="0"
                                  placeholderTextColor={colors.neutral400} style={s.inputContagem}
                                  onChangeText={(v) => atualizarSetor({ contagens: { ...(l.contagens ?? {}), [pr]: parseInt(sanitizarContagem(v), 10) || 0 } })} />
                                <Pressable hitSlop={6} onPress={() => {
                                  const c = { ...(l.contagens ?? {}) };
                                  delete c[pr];
                                  atualizarSetor({ contagens: Object.keys(c).length ? c : null });
                                }}><MaterialIcons name="close" size={18} color={colors.neutral400} /></Pressable>
                              </View>
                            ))}
                          </View>
                        </>
                      ) : null}
                      <RotuloSecao>Observação</RotuloSecao>
                      <TextInput value={l.observacao ?? ''} onChangeText={(v) => atualizarSetor({ observacao: v })} multiline
                        placeholder="Ex.: presença de barata no setor" placeholderTextColor={colors.neutral400} style={s.textarea} />
                      <RotuloSecao>Ação corretiva</RotuloSecao>
                      <TextInput value={l.acaoCorretiva ?? ''} onChangeText={(v) => atualizarSetor({ acaoCorretiva: v })} multiline
                        placeholder="Ex.: aplicação de gel e vedação do ponto" placeholderTextColor={colors.neutral400} style={s.textarea} />
                    </View>
                  ) : null}
                </Cartao>
              );
            })}
          </View>
        </>
      ) : null}

      {/* Lista de pontos (status e contagem) */}
      {(comp === 'status' || comp === 'contagem') && plano.pontos.length > 0 ? (
        <>
          <RotuloSecao>Pontos</RotuloSecao>
          {comp === 'status' ? (
            <Text style={[s.cartaoSub, { marginTop: -4, marginBottom: 10, marginLeft: 2 }]}>
              Mesmos pontos da grade. Abra um ponto para adicionar observação e fotos. São opcionais.
            </Text>
          ) : null}
          {areas.length > 2 ? <FiltroAreas areas={areas} atual={area} onChange={setArea} /> : null}
          <View style={{ gap: 8 }}>
            {pontosVisiveis.map((pt) => {
              const l = rascunho.pontos[pt.id];
              const ok = pontoAvaliado(servico, l ?? {});
              let tag = 'Pendente';
              let cor: [string, string] = ['#fbe7c8', tons.avisoTexto];
              if (ok && comp === 'status') {
                const leg = legendas.find((x) => x.codigo === l?.statusCodigo);
                tag = leg?.rotulo ?? '';
                cor = l?.statusCodigo === 3 ? ['#e7f6e7', '#1d6b25'] : l?.statusCodigo === 4 ? ['#eef0f2', '#515761'] : ['#fdf6e8', tons.avisoTexto];
              }
              if (ok && comp === 'contagem') {
                const total = Object.values(l?.contagens ?? {}).reduce((a, b) => a + b, 0);
                tag = `Total ${total}`;
                cor = total > 0 ? ['#fdf6e8', tons.avisoTexto] : ['#e7f6e7', '#1d6b25'];
              }
              const nFotos = fotosDoPonto(pt.id).length;
              const extras = [l?.observacao?.trim() ? 'obs' : '', nFotos ? `${nFotos} ${nFotos > 1 ? 'fotos' : 'foto'}` : ''].filter(Boolean).join(' · ');
              return (
                <Pressable key={pt.id} onPress={() => setPontoAberto(pt.id)} style={({ pressed }) => [s.ponto, pressed && { opacity: 0.9 }]}>
                  <View style={s.numeroPonto}><Text style={s.numeroPontoTexto}>{pt.numero}</Text></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.pontoLocal} numberOfLines={1}>{pt.local}</Text>
                    <Text style={s.pontoSub} numberOfLines={1}>{[pt.area, pt.fase ? `Fase ${pt.fase}` : null, extras].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: cor[0], maxWidth: 130 }]}><Text style={[s.badgeTexto, { color: cor[1] }]} numberOfLines={1}>{tag}</Text></View>
                  <MaterialIcons name="chevron-right" size={20} color={colors.neutral400} />
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {pontoDaFolha ? (
        <PontoSheet
          visivel
          servico={servico}
          ponto={pontoDaFolha}
          leitura={rascunho.pontos[pontoDaFolha.id]}
          legendas={legendas}
          campos={servico === 'AL' ? pacote.listas.especiesAl : servico === 'PG' ? pacote.listas.pragasPg : []}
          outrasPragas={servico === 'AL' ? pacote.listas.outrasPragasAl : []}
          fotos={fotosDoPonto(pontoDaFolha.id)}
          onSalvar={(l) => { salvarLeitura(pontoDaFolha.id, l); setPontoAberto(null); }}
          onAdicionarFoto={() => adicionarFoto(pontoDaFolha.id)}
          onRemoverFoto={(id) => atualizar((r) => ({ ...r, fotos: r.fotos.filter((f) => f.id !== id) }))}
          onFechar={() => setPontoAberto(null)}
        />
      ) : null}
    </View>
  );
});

/**
 * Datas da lâmpada. Componente à parte porque guarda o texto digitado (com a
 * máscara) enquanto a data não está completa — e hooks não podem ficar depois
 * dos retornos antecipados da etapa.
 */
function Lampadas({ instalacao, validade, onChange }: {
  instalacao?: string | null;
  validade?: string | null;
  onChange: (campos: { lampadaInstalacao?: string | null; lampadaValidade?: string | null }) => void;
}) {
  const [inst, setInst] = useState(paraBr(instalacao));
  const [val, setVal] = useState(paraBr(validade));
  const alerta = alertaLampada(validade, dataEmBrasilia(new Date().toISOString()));
  const campos = [
    { rotulo: 'Instalação', valor: inst, set: setInst, campo: 'lampadaInstalacao' as const },
    { rotulo: 'Validade', valor: val, set: setVal, campo: 'lampadaValidade' as const },
  ];
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        {campos.map(({ rotulo, valor, set, campo }) => (
          <View key={campo} style={{ flex: 1 }}>
            <Text style={estilos.campoRotulo}>{rotulo}</Text>
            <TextInput
              value={valor} keyboardType="number-pad" placeholder="dd/mm/aaaa" placeholderTextColor={colors.neutral400}
              onChangeText={(v) => {
                const m = mascaraData(v);
                set(m);
                const iso = paraIso(m);
                if (iso || m === '') onChange({ [campo]: iso });
              }}
              style={[estilos.campo, s.input, campo === 'lampadaValidade' && alerta ? { borderColor: alerta.nivel === 'vencida' ? '#e6a99e' : '#e8cd94' } : null]}
            />
          </View>
        ))}
      </View>
      {/* Avisa e não bloqueia: o protótipo pede a troca, mas deixa registrar. */}
      {alerta ? (
        <View style={[s.alertaLamp, alerta.nivel === 'vencida' ? s.alertaVencida : s.alertaBreve]}>
          <MaterialIcons name={alerta.nivel === 'vencida' ? 'error-outline' : 'schedule'} size={18}
            color={alerta.nivel === 'vencida' ? colors.danger : tons.avisoIcone} />
          <Text style={[s.alertaTexto, { color: alerta.nivel === 'vencida' ? tons.erroTexto : tons.avisoTexto }]}>{alerta.texto}</Text>
        </View>
      ) : null}
    </>
  );
}

function FiltroAreas({ areas, atual, onChange }: { areas: string[]; atual: string; onChange: (a: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
      {areas.map((a) => {
        const on = atual === a;
        return (
          <Pressable key={a} onPress={() => onChange(a)} style={[s.filtro, on && s.filtroOn]}>
            <Text style={[s.filtroTexto, on && { color: colors.primary }]}>{a === 'todas' ? 'Todas as áreas' : a}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  intro: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.neutral500, marginBottom: 14, lineHeight: 20 },
  semMonitoramento: { fontFamily: fonts.regular, fontSize: 14, color: colors.neutral500, lineHeight: 20 },
  abas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  aba: {
    flexBasis: '48%', flexGrow: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    paddingVertical: 8, paddingLeft: 13, paddingRight: 10, borderRadius: 13, borderWidth: 1, borderColor: tons.etapaPendente, backgroundColor: colors.white,
  },
  abaOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  abaTexto: { flex: 1, fontFamily: fonts.bold, fontSize: 12.5, color: tons.texto2 },
  abaBadge: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 7 },
  abaBadgeTexto: { fontFamily: fonts.bold, fontSize: 10.5 },
  progTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  progNome: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  progRotulo: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.neutral500 },
  barra: { height: 6, borderRadius: 999, backgroundColor: '#eef0ee', marginTop: 10, overflow: 'hidden' },
  barraCheia: { height: '100%', borderRadius: 999, backgroundColor: colors.primary },
  progGeral: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral400, marginTop: 8 },
  cartaoTitulo: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  cartaoSub: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.neutral400, marginTop: 3, lineHeight: 18 },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 9, height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: '#e6e8e6', paddingHorizontal: 12, backgroundColor: colors.white },
  pickNumero: { width: 26, height: 26, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pickNumeroTexto: { fontFamily: fonts.bold, fontSize: 12.5 },
  pickTexto: { flex: 1, fontFamily: fonts.semibold, fontSize: 13.5, color: colors.ink },
  pickQtd: { fontFamily: fonts.bold, fontSize: 13, color: colors.neutral500 },
  gradeTopo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  gradeRotulo: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.neutral800 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  celula: { width: '17.6%', height: 48, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  celulaPendente: { backgroundColor: '#fff6e6', borderColor: '#e8c489', borderStyle: 'dashed' },
  celulaTexto: { fontFamily: fonts.bold, fontSize: 15 },
  gradeRodape: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12 },
  badge: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  badgeTexto: { fontFamily: fonts.bold, fontSize: 11.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { height: 32, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#e6e8e6', justifyContent: 'center', backgroundColor: colors.white },
  chipOn: { borderColor: '#bfe3c2', backgroundColor: '#f2fbf2' },
  chipFixo: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: tons.fundo },
  chipTexto: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.neutral500 },
  input: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  alertaLamp: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 11, paddingVertical: 10, paddingHorizontal: 12, marginTop: 10, borderWidth: 0.5 },
  alertaBreve: { backgroundColor: tons.avisoBg, borderColor: tons.avisoBorda },
  alertaVencida: { backgroundColor: tons.erroBg, borderColor: tons.erroBorda },
  alertaTexto: { flex: 1, fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 18 },
  aplTopo: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  erroCampo: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.danger },
  vazio: { alignItems: 'center', paddingVertical: 22, gap: 8 },
  vazioTexto: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.neutral500 },
  textarea: {
    minHeight: 84, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12,
    fontFamily: fonts.regular, fontSize: 14, color: colors.ink, textAlignVertical: 'top', backgroundColor: colors.white,
  },
  setorTopo: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  numeroPonto: { width: 30, height: 30, borderRadius: 9, backgroundColor: tons.fundo, alignItems: 'center', justifyContent: 'center' },
  numeroPontoTexto: { fontFamily: fonts.bold, fontSize: 13, color: tons.texto2 },
  pontoLocal: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.ink },
  pontoSub: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.neutral400, marginTop: 2 },
  semOcorrencia: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: '#bfe3c2', backgroundColor: '#f2fbf2', marginTop: 12 },
  semOcorrenciaOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  semOcorrenciaTexto: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  tabela: { borderWidth: 0.5, borderColor: tons.bordaCartao, borderRadius: 12, paddingHorizontal: 12 },
  linhaContagem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  linhaBorda: { borderTopWidth: 1, borderTopColor: tons.linha },
  nomeContagem: { flex: 1, fontFamily: fonts.medium, fontSize: 13.5, color: colors.neutral800 },
  inputContagem: { width: 76, height: 40, borderWidth: 1, borderColor: colors.border, borderRadius: 10, textAlign: 'center', fontFamily: fonts.bold, fontSize: 15, color: colors.ink, backgroundColor: '#fbfcfb' },
  ponto: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderWidth: 0.5, borderColor: tons.bordaCartao,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12,
  },
  filtro: { height: 32, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#e6e8e6', backgroundColor: colors.white, justifyContent: 'center' },
  filtroOn: { borderColor: '#bfe3c2', backgroundColor: '#f2fbf2' },
  filtroTexto: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.neutral500 },
});
